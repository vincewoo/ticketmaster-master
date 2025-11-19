// Pool CAPTCHA - Sink the last two balls to win
import { gameState } from '../gameState.js';
import { hasOverlappingSeats } from '../cartManagement.js';

// Module-level state
let animationId = null;
let poolGameState = null;

// --- DYNAMIC DIMENSIONS ---
let CANVAS_WIDTH, CANVAS_HEIGHT;
let TABLE_PADDING, TABLE_WIDTH, TABLE_HEIGHT;
let BALL_RADIUS, POCKET_RADIUS, POCKET_CAPTURE_RADIUS;
let POCKETS = [];

// Constants
const TIMER_DURATION = 40;
const FRICTION = 0.98;
const MIN_VELOCITY = 0.05;
const MAX_POWER = 15;

function setupDimensions(isPortrait) {
    if (isPortrait) {
        CANVAS_WIDTH = 400;
        CANVAS_HEIGHT = 600;
        TABLE_PADDING = 40;
    } else {
        CANVAS_WIDTH = 600;
        CANVAS_HEIGHT = 400;
        TABLE_PADDING = 40;
    }

    TABLE_WIDTH = CANVAS_WIDTH - TABLE_PADDING * 2;
    TABLE_HEIGHT = CANVAS_HEIGHT - TABLE_PADDING * 2;

    // Scale ball and pocket sizes based on table width
    const scaleFactor = isPortrait ? TABLE_HEIGHT / 520 : TABLE_WIDTH / 520;
    BALL_RADIUS = 10 * scaleFactor;
    POCKET_RADIUS = 18 * scaleFactor;
    POCKET_CAPTURE_RADIUS = 22 * scaleFactor;

    if (isPortrait) {
        POCKETS = [
            { x: TABLE_PADDING, y: TABLE_PADDING }, // Top-left
            { x: TABLE_PADDING, y: CANVAS_HEIGHT / 2 }, // Middle-left
            { x: TABLE_PADDING, y: CANVAS_HEIGHT - TABLE_PADDING }, // Bottom-left
            { x: CANVAS_WIDTH - TABLE_PADDING, y: TABLE_PADDING }, // Top-right
            { x: CANVAS_WIDTH - TABLE_PADDING, y: CANVAS_HEIGHT / 2 }, // Middle-right
            { x: CANVAS_WIDTH - TABLE_PADDING, y: CANVAS_HEIGHT - TABLE_PADDING } // Bottom-right
        ];
    } else {
        POCKETS = [
            { x: TABLE_PADDING, y: TABLE_PADDING }, // Top-left
            { x: CANVAS_WIDTH / 2, y: TABLE_PADDING }, // Top-middle
            { x: CANVAS_WIDTH - TABLE_PADDING, y: TABLE_PADDING }, // Top-right
            { x: TABLE_PADDING, y: CANVAS_HEIGHT - TABLE_PADDING }, // Bottom-left
            { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT - TABLE_PADDING }, // Bottom-middle
            { x: CANVAS_WIDTH - TABLE_PADDING, y: CANVAS_HEIGHT - TABLE_PADDING } // Bottom-right
        ];
    }
}

// Helper to generate shades for 3D effect
function LightenDarkenColor(col, amt) {
    var usePound = false;
    if (col[0] == "#") {
        col = col.slice(1);
        usePound = true;
    }
    var num = parseInt(col, 16);
    var r = (num >> 16) + amt;
    if (r > 255) r = 255;
    else if (r < 0) r = 0;
    var b = ((num >> 8) & 0x00FF) + amt;
    if (b > 255) b = 255;
    else if (b < 0) b = 0;
    var g = (num & 0x0000FF) + amt;
    if (g > 255) g = 255;
    else if (g < 0) g = 0;
    return (usePound ? "#" : "") + (g | (b << 8) | (r << 16)).toString(16).padStart(6, '0');
}


export function showCAPTCHA() {
    const modal = document.getElementById('pool-captcha-modal');
    const canvas = document.getElementById('pool-canvas');
    const ctx = canvas.getContext('2d');
    const timerDisplay = document.getElementById('pool-timer');
    const feedbackEl = document.getElementById('pool-feedback');
    const cancelBtn = document.getElementById('pool-cancel-btn');
    const powerFill = document.getElementById('pool-power-fill');
    const statusEl = document.getElementById('pool-status');

    // --- RESPONSIVE SETUP ---
    const isPortrait = window.innerHeight > window.innerWidth;
    setupDimensions(isPortrait);
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;


    // Check for multiplayer competition warning
    const warningEl = document.getElementById('pool-captcha-warning');
    if (gameState.isMultiplayer && hasOverlappingSeats()) {
        warningEl.classList.remove('hidden');
    } else {
        warningEl.classList.add('hidden');
    }

    // Initialize game state
    poolGameState = {
        timeRemaining: TIMER_DURATION,
        cueAiming: false,
        cueAngle: 0,
        cuePower: 0,
        powerCharging: false,
        shooting: false,
        shotAnimationFrame: 0,
        balls: [],
        cueBall: null,
        threeBallSunk: false,
        eightBallSunk: false
    };

    // Create 3-ball, 8-ball, and cue ball at positions relative to table size
    const cueBallInitialX = TABLE_PADDING + TABLE_WIDTH * 0.25;
    const cueBallInitialY = CANVAS_HEIGHT / 2;

    poolGameState.balls = [
        // 3-ball - solid red
        {
            x: TABLE_PADDING + TABLE_WIDTH * 0.65,
            y: CANVAS_HEIGHT / 2 - TABLE_HEIGHT * 0.1,
            vx: 0, vy: 0, radius: BALL_RADIUS, color: '#dc2626',
            number: 3, isCueBall: false, isEightBall: false, sunk: false
        },
        // 8-ball - black
        {
            x: TABLE_PADDING + TABLE_WIDTH * 0.65,
            y: CANVAS_HEIGHT / 2 + TABLE_HEIGHT * 0.1,
            vx: 0, vy: 0, radius: BALL_RADIUS, color: '#000000',
            number: 8, isCueBall: false, isEightBall: true, sunk: false
        },
        // Cue ball - white
        {
            x: cueBallInitialX,
            y: cueBallInitialY,
            vx: 0, vy: 0, radius: BALL_RADIUS, color: '#ffffff',
            number: 0, isCueBall: true, isEightBall: false, sunk: false
        }
    ];


    poolGameState.cueBall = poolGameState.balls[2];

    // Event handlers
    const handleMouseMove = (e) => {
        if (!poolGameState || poolGameState.powerCharging || poolGameState.shooting) return;
        if (!areBallsStationary()) return;

        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Mouse position represents where the cue is (behind the ball)
        // Aim from the mouse position THROUGH the cue ball
        const dx = poolGameState.cueBall.x - mouseX;
        const dy = poolGameState.cueBall.y - mouseY;
        poolGameState.cueAngle = Math.atan2(dy, dx);
        poolGameState.cueAiming = true;
    };

    const handleMouseDown = () => {
        if (!poolGameState || poolGameState.powerCharging || poolGameState.shooting) return;
        if (!areBallsStationary()) return;

        // Allow clicking anywhere to start charging shot
        poolGameState.powerCharging = true;
        poolGameState.cuePower = 0;
    };

    const handleMouseUp = () => {
        if (!poolGameState || !poolGameState.powerCharging) return;

        poolGameState.powerCharging = false;

        if (poolGameState.cuePower > 0) {
            // Start the shooting animation
            poolGameState.shooting = true;
            poolGameState.shotAnimationFrame = 0;
        }
    };

    const handleCancel = () => {
        cleanup();
    };

    // Touch event handlers
    const handleTouchStart = (e) => {
        e.preventDefault();
        handleMouseDown();
    };

    const handleTouchEnd = (e) => {
        e.preventDefault();
        handleMouseUp();
    };

    const handleTouchMove = (e) => {
        e.preventDefault();
        if (!e.touches[0]) return;
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        const touchX = touch.clientX - rect.left;
        const touchY = touch.clientY - rect.top;

        if (!poolGameState || poolGameState.powerCharging || poolGameState.shooting) return;
        if (!areBallsStationary()) return;

        // Touch position represents where the cue is (behind the ball)
        // Aim from the touch position THROUGH the cue ball
        const dx = poolGameState.cueBall.x - touchX;
        const dy = poolGameState.cueBall.y - touchY;
        poolGameState.cueAngle = Math.atan2(dy, dx);
        poolGameState.cueAiming = true;
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('touchstart', handleTouchStart);
    canvas.addEventListener('touchend', handleTouchEnd);
    canvas.addEventListener('touchmove', handleTouchMove);
    cancelBtn.addEventListener('click', handleCancel);

    // Timer
    const timerInterval = setInterval(() => {
        if (!poolGameState) return;

        poolGameState.timeRemaining--;
        timerDisplay.textContent = poolGameState.timeRemaining;

        if (poolGameState.timeRemaining <= 0) {
            clearInterval(timerInterval);
            feedbackEl.textContent = '❌ Time\'s up!';
            feedbackEl.style.color = '#dc2626';
            setTimeout(() => { cleanup(); }, 2000);
        }
    }, 1000);

    // Helper functions
    function areBallsStationary() {
        return poolGameState.balls
            .filter(ball => !ball.sunk)
            .every(ball => Math.abs(ball.vx) < MIN_VELOCITY && Math.abs(ball.vy) < MIN_VELOCITY);
    }

    function calculateAimingPath() {
        // Trace the path of the cue ball to find first collision
        const maxDistance = 1000; // Max trace distance
        const step = 2; // Step size for raycast

        const dx = Math.cos(poolGameState.cueAngle);
        const dy = Math.sin(poolGameState.cueAngle);

        let currentX = poolGameState.cueBall.x;
        let currentY = poolGameState.cueBall.y;

        // Check for ball collision
        const activeBalls = poolGameState.balls.filter(b => !b.sunk && !b.isCueBall);

        for (let distance = 0; distance < maxDistance; distance += step) {
            currentX += dx * step;
            currentY += dy * step;

            // Check collision with other balls
            for (const ball of activeBalls) {
                const distToBall = Math.sqrt(
                    Math.pow(currentX - ball.x, 2) +
                    Math.pow(currentY - ball.y, 2)
                );

                if (distToBall <= BALL_RADIUS * 2) {
                    return { type: 'ball', x: currentX, y: currentY, target: ball };
                }
            }

            // Check collision with cushions
            const minX = TABLE_PADDING + BALL_RADIUS;
            const maxX = CANVAS_WIDTH - TABLE_PADDING - BALL_RADIUS;
            const minY = TABLE_PADDING + BALL_RADIUS;
            const maxY = CANVAS_HEIGHT - TABLE_PADDING - BALL_RADIUS;

            if (currentX <= minX) {
                return { type: 'cushion', x: minX, y: currentY };
            }
            if (currentX >= maxX) {
                return { type: 'cushion', x: maxX, y: currentY };
            }
            if (currentY <= minY) {
                return { type: 'cushion', x: currentX, y: minY };
            }
            if (currentY >= maxY) {
                return { type: 'cushion', x: currentX, y: maxY };
            }
        }

        return null;
    }

    function checkBallCollisions() {
        const balls = poolGameState.balls.filter(b => !b.sunk);

        for (let i = 0; i < balls.length; i++) {
            for (let j = i + 1; j < balls.length; j++) {
                const b1 = balls[i];
                const b2 = balls[j];

                const dx = b2.x - b1.x;
                const dy = b2.y - b1.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < b1.radius + b2.radius) {
                    // Collision detected - elastic collision physics
                    const angle = Math.atan2(dy, dx);
                    const sin = Math.sin(angle);
                    const cos = Math.cos(angle);

                    // Rotate velocities
                    const vx1 = b1.vx * cos + b1.vy * sin;
                    const vy1 = b1.vy * cos - b1.vx * sin;
                    const vx2 = b2.vx * cos + b2.vy * sin;
                    const vy2 = b2.vy * cos - b2.vx * sin;

                    // Swap velocities (elastic collision, equal mass)
                    const temp = vx1;
                    const newVx1 = vx2;
                    const newVx2 = temp;

                    // Rotate back
                    b1.vx = newVx1 * cos - vy1 * sin;
                    b1.vy = vy1 * cos + newVx1 * sin;
                    b2.vx = newVx2 * cos - vy2 * sin;
                    b2.vy = vy2 * cos + newVx2 * sin;

                    // Separate balls to prevent overlap
                    const overlap = b1.radius + b2.radius - dist;
                    const separationX = (overlap / 2) * cos;
                    const separationY = (overlap / 2) * sin;

                    b1.x -= separationX;
                    b1.y -= separationY;
                    b2.x += separationX;
                    b2.y += separationY;
                }
            }
        }
    }

    function checkPockets() {
        poolGameState.balls.forEach(ball => {
            if (ball.sunk) return;

            POCKETS.forEach(pocket => {
                const dx = ball.x - pocket.x;
                const dy = ball.y - pocket.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < POCKET_CAPTURE_RADIUS) {
                    ball.sunk = true;

                    if (ball.isCueBall) {
                        // Cue ball sunk - scratch
                        feedbackEl.textContent = '❌ Scratch! Cue ball sunk.';
                        feedbackEl.style.color = '#dc2626';

                        // Reset cue ball after a moment
                        setTimeout(() => {
                            ball.sunk = false;
                            ball.x = TABLE_PADDING + TABLE_WIDTH * 0.25;
                            ball.y = CANVAS_HEIGHT / 2;
                            ball.vx = 0;
                            ball.vy = 0;
                            feedbackEl.textContent = '';
                        }, 1500);
                    } else if (ball.isEightBall) {
                        // 8-ball sunk
                        if (!poolGameState.threeBallSunk) {
                            // 8-ball sunk before 3-ball - put it back
                            feedbackEl.textContent = '❌ Must sink 3-ball first!';
                            feedbackEl.style.color = '#dc2626';

                            setTimeout(() => {
                                ball.sunk = false;
                                ball.x = TABLE_PADDING + TABLE_WIDTH * 0.65,
                                ball.y = CANVAS_HEIGHT / 2 + TABLE_HEIGHT * 0.1,
                                ball.vx = 0;
                                ball.vy = 0;
                                feedbackEl.textContent = '';
                            }, 1500);
                        } else {
                            // 8-ball sunk after 3-ball - win!
                            poolGameState.eightBallSunk = true;
                            handleSuccess();
                        }
                    } else {
                        // 3-ball sunk
                        poolGameState.threeBallSunk = true;
                        feedbackEl.textContent = '✓ 3-ball sunk! Now sink the 8-ball.';
                        feedbackEl.style.color = '#15803d';
                        setTimeout(() => {
                            feedbackEl.textContent = '';
                        }, 2000);
                    }
                }
            });
        });
    }

    function updatePhysics() {
        poolGameState.balls.forEach(ball => {
            if (ball.sunk) return;

            // Apply friction
            ball.vx *= FRICTION;
            ball.vy *= FRICTION;

            // Stop if too slow
            if (Math.abs(ball.vx) < MIN_VELOCITY) ball.vx = 0;
            if (Math.abs(ball.vy) < MIN_VELOCITY) ball.vy = 0;

            // Update position
            ball.x += ball.vx;
            ball.y += ball.vy;

            // Bounce off cushions (table edges)
            const minX = TABLE_PADDING + ball.radius;
            const maxX = CANVAS_WIDTH - TABLE_PADDING - ball.radius;
            const minY = TABLE_PADDING + ball.radius;
            const maxY = CANVAS_HEIGHT - TABLE_PADDING - ball.radius;

            if (ball.x < minX) {
                ball.x = minX;
                ball.vx = -ball.vx * 0.8; // Some energy loss on bounce
            } else if (ball.x > maxX) {
                ball.x = maxX;
                ball.vx = -ball.vx * 0.8;
            }

            if (ball.y < minY) {
                ball.y = minY;
                ball.vy = -ball.vy * 0.8;
            } else if (ball.y > maxY) {
                ball.y = maxY;
                ball.vy = -ball.vy * 0.8;
            }
        });

        // Check collisions
        checkBallCollisions();
        checkPockets();
    }

    function drawRailDiamonds() {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        const diamondSize = BALL_RADIUS * 0.3;
        const isPortrait = CANVAS_HEIGHT > CANVAS_WIDTH;

        if (isPortrait) {
            // Diamonds on the long (left/right) rails
            const verticalSpacing = TABLE_HEIGHT / 4;
            for (let i = 1; i <= 3; i++) {
                const y = TABLE_PADDING + verticalSpacing * i;
                // Left rail
                ctx.beginPath();
                ctx.arc(TABLE_PADDING / 2, y, diamondSize, 0, Math.PI * 2);
                ctx.fill();
                // Right rail
                ctx.beginPath();
                ctx.arc(CANVAS_WIDTH - TABLE_PADDING / 2, y, diamondSize, 0, Math.PI * 2);
                ctx.fill();
            }
             // Diamonds on the short (top/bottom) rails
            const horizontalSpacing = TABLE_WIDTH / 2;
            ctx.beginPath();
            ctx.arc(TABLE_PADDING + horizontalSpacing, TABLE_PADDING / 2, diamondSize, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(TABLE_PADDING + horizontalSpacing, CANVAS_HEIGHT - TABLE_PADDING / 2, diamondSize, 0, Math.PI * 2);
            ctx.fill();

        } else {
            // Original landscape diamond placement
            const horizontalSpacing = TABLE_WIDTH / 4;
            for (let i = 1; i <= 3; i++) {
                const x = TABLE_PADDING + horizontalSpacing * i;
                ctx.beginPath();
                ctx.arc(x, TABLE_PADDING / 2, diamondSize, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(x, CANVAS_HEIGHT - TABLE_PADDING / 2, diamondSize, 0, Math.PI * 2);
                ctx.fill();
            }
            const verticalSpacing = TABLE_HEIGHT / 2;
            ctx.beginPath();
            ctx.arc(TABLE_PADDING / 2, TABLE_PADDING + verticalSpacing, diamondSize, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(CANVAS_WIDTH - TABLE_PADDING / 2, TABLE_PADDING + verticalSpacing, diamondSize, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function drawCue() {
        const isAiming = poolGameState && poolGameState.cueAiming && areBallsStationary();
        const isShooting = poolGameState && poolGameState.shooting;

        if (!isAiming && !isShooting) {
            return;
        }

        ctx.save();
        ctx.translate(poolGameState.cueBall.x, poolGameState.cueBall.y);
        ctx.rotate(poolGameState.cueAngle);

        // --- CUE DIMENSIONS ---
        const cueLength = 350;
        const cueButtWidth = 8;
        const cueTipWidth = 4;
        const gripLength = 80;
        const ferruleLength = 10;
        const tipLength = 5;

        // --- CUE COLORS ---
        const shaftColor = '#D2B48C'; // Light wood (tan)
        const gripColor = '#3A2D2C';  // Dark brown/black
        const ferruleColor = '#FFFFFF';
        const tipColor = '#4A3B31';   // Dark leather brown
        const buttCapColor = '#222222';

        // --- ANIMATION LOGIC ---
        let pullBack = 0;
        const maxPullBack = (poolGameState.cuePower / MAX_POWER) * 60;

        if (poolGameState.powerCharging) {
            pullBack = maxPullBack;
        } else if (poolGameState.shooting) {
            const animationDuration = 20; // Slower animation
            const strikeFrame = 5;
            const recoilFrame = 8;
            const frame = poolGameState.shotAnimationFrame;

            if (frame <= strikeFrame) {
                const progress = frame / strikeFrame;
                pullBack = maxPullBack * (1 - progress);
            } else if (frame <= recoilFrame) {
                const progress = (frame - strikeFrame) / (recoilFrame - strikeFrame);
                pullBack = -5 * progress;
            } else {
                const progress = (frame - recoilFrame) / (animationDuration - recoilFrame);
                pullBack = -5 * (1 - progress);
            }
        }

        // Draw behind the cue ball's origin using negative coordinates
        const startX = -BALL_RADIUS - 5 - pullBack;

        // Add a shadow for the cue for depth
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetX = 2; // Shadow should be behind the cue
        ctx.shadowOffsetY = 2;

        // --- DRAW CUE (from tip to butt, using negative coords) ---

        // 1. Tip (closest to the ball, but still negative)
        const tipStartX = startX - tipLength;
        ctx.fillStyle = tipColor;
        ctx.fillRect(tipStartX, -cueTipWidth / 2, tipLength, cueTipWidth);

        // 2. Ferrule
        const ferruleStartX = tipStartX - ferruleLength;
        ctx.fillStyle = ferruleColor;
        ctx.fillRect(ferruleStartX, -cueTipWidth / 2, ferruleLength, cueTipWidth);

        // 3. Main Shaft (tapered)
        const shaftStartX = ferruleStartX;
        const shaftLength = cueLength - (10 + gripLength + ferruleLength + tipLength);
        const shaftEndX = shaftStartX - shaftLength;

        const gradient = ctx.createLinearGradient(shaftStartX, 0, shaftEndX, 0);
        gradient.addColorStop(0, LightenDarkenColor(shaftColor, -10));
        gradient.addColorStop(0.5, LightenDarkenColor(shaftColor, 20));
        gradient.addColorStop(1, LightenDarkenColor(shaftColor, -20));
        ctx.fillStyle = gradient;

        ctx.beginPath();
        ctx.moveTo(shaftStartX, -cueTipWidth / 2);
        ctx.lineTo(shaftEndX, -cueButtWidth / 2);
        ctx.lineTo(shaftEndX, cueButtWidth / 2);
        ctx.lineTo(shaftStartX, cueTipWidth / 2);
        ctx.closePath();
        ctx.fill();

        // 4. Grip
        const gripStartX = shaftEndX;
        ctx.fillStyle = gripColor;
        ctx.fillRect(gripStartX - gripLength, -cueButtWidth / 2, gripLength, cueButtWidth);

        // 5. Butt Cap
        const buttCapStartX = gripStartX - gripLength;
        ctx.fillStyle = buttCapColor;
        ctx.fillRect(buttCapStartX - 10, -cueButtWidth / 2, 10, cueButtWidth);

        // Reset shadow for other drawings
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        ctx.restore();
    }


    function draw() {
        // Clear canvas
        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // --- Draw Enhanced Table ---

        // 1. Wood Frame with Texture
        const woodDark = '#6B4226';
        const woodLight = '#8A5A38';
        ctx.fillStyle = woodDark;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        // Simple procedural wood grain
        for (let i = 0; i < CANVAS_WIDTH; i += 2) {
            ctx.fillStyle = `rgba(138, 90, 56, ${Math.random() * 0.2})`;
            ctx.fillRect(i, 0, 1, CANVAS_HEIGHT);
        }
        for (let i = 0; i < CANVAS_HEIGHT; i += 2) {
            ctx.fillStyle = `rgba(138, 90, 56, ${Math.random() * 0.2})`;
            ctx.fillRect(0, i, CANVAS_WIDTH, 1);
        }

        // 2. Table Felt (Classic Green)
        const feltColor = '#006442';
        ctx.fillStyle = feltColor;
        ctx.fillRect(TABLE_PADDING, TABLE_PADDING, TABLE_WIDTH, TABLE_HEIGHT);

        // Add subtle gradient to felt for depth
        const feltGradient = ctx.createLinearGradient(0, TABLE_PADDING, 0, CANVAS_HEIGHT - TABLE_PADDING);
        feltGradient.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
        feltGradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.05)');
        feltGradient.addColorStop(1, 'rgba(0, 0, 0, 0.15)');
        ctx.fillStyle = feltGradient;
        ctx.fillRect(TABLE_PADDING, TABLE_PADDING, TABLE_WIDTH, TABLE_HEIGHT);


        // 3. Cushions (Rails)
        const cushionColor = '#004D31';
        ctx.fillStyle = cushionColor;
        // Top and bottom cushions
        ctx.fillRect(TABLE_PADDING, 0, TABLE_WIDTH, TABLE_PADDING);
        ctx.fillRect(TABLE_PADDING, CANVAS_HEIGHT - TABLE_PADDING, TABLE_WIDTH, TABLE_PADDING);
        // Left and right cushions
        ctx.fillRect(0, TABLE_PADDING, TABLE_PADDING, TABLE_HEIGHT);
        ctx.fillRect(CANVAS_WIDTH - TABLE_PADDING, TABLE_PADDING, TABLE_PADDING, TABLE_HEIGHT);

        // Add inner shadow to cushions for depth
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.lineWidth = 3;
        ctx.strokeRect(TABLE_PADDING, TABLE_PADDING, TABLE_WIDTH, TABLE_HEIGHT);

        // 4. Rail Diamonds
        drawRailDiamonds();

        // 5. Pockets
        POCKETS.forEach(pocket => {
            const gradient = ctx.createRadialGradient(pocket.x, pocket.y, POCKET_RADIUS * 0.5, pocket.x, pocket.y, POCKET_CAPTURE_RADIUS);
            gradient.addColorStop(0, '#111');
            gradient.addColorStop(0.7, '#000');
            gradient.addColorStop(0.9, cushionColor);
            gradient.addColorStop(1, 'transparent');

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(pocket.x, pocket.y, POCKET_CAPTURE_RADIUS, 0, Math.PI * 2);
            ctx.fill();
        });


        // Draw aiming line and collision indicator
        if (poolGameState.cueAiming && areBallsStationary() && !poolGameState.shooting) {
            const collision = calculateAimingPath();

            if (collision) {
                // Draw dashed line to collision point
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
                ctx.lineWidth = 2;
                ctx.setLineDash([5, 5]);
                ctx.beginPath();
                ctx.moveTo(poolGameState.cueBall.x, poolGameState.cueBall.y);
                ctx.lineTo(collision.x, collision.y);
                ctx.stroke();
                ctx.setLineDash([]);

                // Draw collision indicator
                if (collision.type === 'ball') {
                    // Draw a circle around the collision point
                    ctx.strokeStyle = 'rgba(255, 255, 0, 0.8)';
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.arc(collision.x, collision.y, BALL_RADIUS + 5, 0, Math.PI * 2);
                    ctx.stroke();

                    // Draw highlight on target ball
                    ctx.strokeStyle = 'rgba(255, 255, 0, 0.6)';
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.arc(collision.target.x, collision.target.y, BALL_RADIUS + 3, 0, Math.PI * 2);
                    ctx.stroke();
                } else if (collision.type === 'cushion') {
                    // Draw ghost cue ball at cushion collision point
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
                    ctx.lineWidth = 2;
                    ctx.setLineDash([3, 3]);
                    ctx.beginPath();
                    ctx.arc(collision.x, collision.y, BALL_RADIUS, 0, Math.PI * 2);
                    ctx.stroke();
                    ctx.setLineDash([]);
                }
            }
        }

        // --- Draw Balls with Enhanced Shading ---
        poolGameState.balls.forEach(ball => {
            if (ball.sunk) return;

            const highlightX = ball.x - ball.radius * 0.3;
            const highlightY = ball.y - ball.radius * 0.3;

            // 1. Ball shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.beginPath();
            ctx.arc(ball.x + ball.radius * 0.1, ball.y + ball.radius * 0.1, ball.radius * 1.05, 0, Math.PI * 2);
            ctx.fill();

            // 2. Main ball color with gradient for 3D effect
            const gradient = ctx.createRadialGradient(
                highlightX, highlightY, ball.radius * 0.1,
                ball.x, ball.y, ball.radius
            );

            if (ball.isCueBall) {
                gradient.addColorStop(0, '#ffffff');
                gradient.addColorStop(1, '#e0e0e0');
            } else {
                gradient.addColorStop(0, LightenDarkenColor(ball.color, 40));
                gradient.addColorStop(1, ball.color);
            }

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
            ctx.fill();


            // 3. Number circle (for non-cue balls)
            if (!ball.isCueBall) {
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(ball.x, ball.y, ball.radius * 0.6, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = ball.isEightBall ? '#ffffff' : ball.color;

                // Invert color for 8-ball number
                ctx.fillStyle = ball.isEightBall ? ball.color : '#000000';
                ctx.font = `bold ${ball.radius * 0.9}px Arial`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(ball.number, ball.x, ball.y);
            }
        });

        // --- Draw Cue ---
        drawCue();

        // Update power bar
        if (poolGameState.powerCharging) {
            poolGameState.cuePower = Math.min(poolGameState.cuePower + 0.3, MAX_POWER);
            const powerPercent = (poolGameState.cuePower / MAX_POWER) * 100;
            powerFill.style.width = powerPercent + '%';
        } else {
            powerFill.style.width = '0%';
        }

        // Update status
        if (!poolGameState.threeBallSunk) {
            statusEl.textContent = 'Sink the 3-ball first';
        } else if (!poolGameState.eightBallSunk) {
            statusEl.textContent = 'Now sink the 8-ball';
        } else {
            statusEl.textContent = 'Complete!';
        }
    }

    function gameLoop() {
        if (!poolGameState) return;

        if (poolGameState.shooting) {
            poolGameState.shotAnimationFrame++;
            const animationDuration = 20; // Match the drawCue animation
            const strikeFrame = 5; // Match the drawCue animation

            // Apply physics at the "strike" frame
            if (poolGameState.shotAnimationFrame === strikeFrame) {
                const power = poolGameState.cuePower;
                poolGameState.cueBall.vx = Math.cos(poolGameState.cueAngle) * power;
                poolGameState.cueBall.vy = Math.sin(poolGameState.cueAngle) * power;
                poolGameState.cueAiming = false; // Stop drawing aiming line
            }

            if (poolGameState.shotAnimationFrame >= animationDuration) {
                // Animation finished
                poolGameState.shooting = false;
                poolGameState.cuePower = 0; // Reset power
            }
        }

        updatePhysics();
        draw();

        animationId = requestAnimationFrame(gameLoop);
    }

    function cleanup() {
        clearInterval(timerInterval);
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
        canvas.removeEventListener('mousemove', handleMouseMove);
        canvas.removeEventListener('mousedown', handleMouseDown);
        canvas.removeEventListener('mouseup', handleMouseUp);
        canvas.removeEventListener('touchstart', handleTouchStart);
        canvas.removeEventListener('touchend', handleTouchEnd);
        canvas.removeEventListener('touchmove', handleTouchMove);
        cancelBtn.removeEventListener('click', handleCancel);
        modal.classList.add('hidden');
        poolGameState = null;
    }

    function handleSuccess() {
        feedbackEl.textContent = '✓ All balls sunk!';
        feedbackEl.style.color = '#15803d';

        setTimeout(() => {
            cleanup();
            if (window.completeCheckout) window.completeCheckout();
        }, 1500);
    }

    // Show modal and start
    modal.classList.remove('hidden');
    feedbackEl.textContent = '';
    gameLoop();
}
