// Pool CAPTCHA - Sink the last two balls to win
import { gameState } from '../gameState.js';
import { hasOverlappingSeats } from '../cartManagement.js';

// Module-level state
let animationId = null;
let poolGameState = null;

// Constants
const TIMER_DURATION = 40;
const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 400;
const TABLE_PADDING = 40;
const TABLE_WIDTH = CANVAS_WIDTH - TABLE_PADDING * 2;
const TABLE_HEIGHT = CANVAS_HEIGHT - TABLE_PADDING * 2;
const BALL_RADIUS = 10;
const POCKET_RADIUS = 18;
const POCKET_CAPTURE_RADIUS = 22; // Slightly larger capture zone with beveled edge
const FRICTION = 0.98;
const MIN_VELOCITY = 0.05;
const MAX_POWER = 15;

// Pocket positions (6 pockets)
const POCKETS = [
    { x: TABLE_PADDING, y: TABLE_PADDING }, // Top-left
    { x: CANVAS_WIDTH / 2, y: TABLE_PADDING }, // Top-middle
    { x: CANVAS_WIDTH - TABLE_PADDING, y: TABLE_PADDING }, // Top-right
    { x: TABLE_PADDING, y: CANVAS_HEIGHT - TABLE_PADDING }, // Bottom-left
    { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT - TABLE_PADDING }, // Bottom-middle
    { x: CANVAS_WIDTH - TABLE_PADDING, y: CANVAS_HEIGHT - TABLE_PADDING } // Bottom-right
];

export function showCAPTCHA() {
    const modal = document.getElementById('pool-captcha-modal');
    const canvas = document.getElementById('pool-canvas');
    const ctx = canvas.getContext('2d');
    const timerDisplay = document.getElementById('pool-timer');
    const feedbackEl = document.getElementById('pool-feedback');
    const cancelBtn = document.getElementById('pool-cancel-btn');
    const powerFill = document.getElementById('pool-power-fill');
    const statusEl = document.getElementById('pool-status');

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
        balls: [],
        cueBall: null,
        threeBallSunk: false,
        eightBallSunk: false
    };

    // Create 3-ball, 8-ball, and cue ball
    poolGameState.balls = [
        // 3-ball - solid red
        {
            x: CANVAS_WIDTH / 2 - 60,
            y: CANVAS_HEIGHT / 2 - 40,
            vx: 0,
            vy: 0,
            radius: BALL_RADIUS,
            color: '#dc2626',
            number: 3,
            isCueBall: false,
            isEightBall: false,
            sunk: false
        },
        // 8-ball - black
        {
            x: CANVAS_WIDTH / 2 + 60,
            y: CANVAS_HEIGHT / 2 + 40,
            vx: 0,
            vy: 0,
            radius: BALL_RADIUS,
            color: '#000000',
            number: 8,
            isCueBall: false,
            isEightBall: true,
            sunk: false
        },
        // Cue ball - white
        {
            x: CANVAS_WIDTH / 2 - 150,
            y: CANVAS_HEIGHT / 2,
            vx: 0,
            vy: 0,
            radius: BALL_RADIUS,
            color: '#ffffff',
            number: 0,
            isCueBall: true,
            isEightBall: false,
            sunk: false
        }
    ];

    poolGameState.cueBall = poolGameState.balls[2];

    // Event handlers
    const handleMouseMove = (e) => {
        if (!poolGameState || poolGameState.powerCharging) return;
        if (!areBallsStationary()) return;

        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const dx = mouseX - poolGameState.cueBall.x;
        const dy = mouseY - poolGameState.cueBall.y;
        poolGameState.cueAngle = Math.atan2(dy, dx);
        poolGameState.cueAiming = true;
    };

    const handleMouseDown = () => {
        if (!poolGameState || poolGameState.powerCharging) return;
        if (!areBallsStationary()) return;

        // Allow clicking anywhere to start charging shot
        poolGameState.powerCharging = true;
        poolGameState.cuePower = 0;
    };

    const handleMouseUp = () => {
        if (!poolGameState || !poolGameState.powerCharging) return;

        poolGameState.powerCharging = false;

        if (poolGameState.cuePower > 0) {
            // Shoot the cue ball
            const power = poolGameState.cuePower;
            poolGameState.cueBall.vx = Math.cos(poolGameState.cueAngle) * power;
            poolGameState.cueBall.vy = Math.sin(poolGameState.cueAngle) * power;
            poolGameState.cueAiming = false;
        }
    };

    const handleCancel = () => {
        cleanup();
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mouseup', handleMouseUp);
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
                            ball.x = CANVAS_WIDTH / 2 - 150;
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
                                ball.x = CANVAS_WIDTH / 2 + 60;
                                ball.y = CANVAS_HEIGHT / 2 + 40;
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

    function draw() {
        // Clear canvas
        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Draw outer table frame (wood)
        ctx.fillStyle = '#4a2511';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Draw cushions (rails) - darker blue/teal with gradient
        const cushionSize = TABLE_PADDING;

        // Top cushion
        const topGradient = ctx.createLinearGradient(0, 0, 0, cushionSize);
        topGradient.addColorStop(0, '#2a5a6a');
        topGradient.addColorStop(1, '#1a3a4a');
        ctx.fillStyle = topGradient;
        ctx.fillRect(0, 0, CANVAS_WIDTH, cushionSize);

        // Bottom cushion
        const bottomGradient = ctx.createLinearGradient(0, CANVAS_HEIGHT - cushionSize, 0, CANVAS_HEIGHT);
        bottomGradient.addColorStop(0, '#1a3a4a');
        bottomGradient.addColorStop(1, '#2a5a6a');
        ctx.fillStyle = bottomGradient;
        ctx.fillRect(0, CANVAS_HEIGHT - cushionSize, CANVAS_WIDTH, cushionSize);

        // Left cushion
        const leftGradient = ctx.createLinearGradient(0, 0, cushionSize, 0);
        leftGradient.addColorStop(0, '#2a5a6a');
        leftGradient.addColorStop(1, '#1a3a4a');
        ctx.fillStyle = leftGradient;
        ctx.fillRect(0, 0, cushionSize, CANVAS_HEIGHT);

        // Right cushion
        const rightGradient = ctx.createLinearGradient(CANVAS_WIDTH - cushionSize, 0, CANVAS_WIDTH, 0);
        rightGradient.addColorStop(0, '#1a3a4a');
        rightGradient.addColorStop(1, '#2a5a6a');
        ctx.fillStyle = rightGradient;
        ctx.fillRect(CANVAS_WIDTH - cushionSize, 0, cushionSize, CANVAS_HEIGHT);

        // Draw table felt (playing surface)
        ctx.fillStyle = '#0a7a42';
        ctx.fillRect(TABLE_PADDING, TABLE_PADDING, TABLE_WIDTH, TABLE_HEIGHT);

        // Draw cushion rail edges (lighter blue border)
        ctx.strokeStyle = '#3a6a7a';
        ctx.lineWidth = 3;
        ctx.strokeRect(TABLE_PADDING, TABLE_PADDING, TABLE_WIDTH, TABLE_HEIGHT);

        // Draw pockets with flared edges
        POCKETS.forEach(pocket => {
            // Draw outer flared ring (lighter)
            const gradient = ctx.createRadialGradient(pocket.x, pocket.y, POCKET_RADIUS - 5, pocket.x, pocket.y, POCKET_CAPTURE_RADIUS);
            gradient.addColorStop(0, '#000000');
            gradient.addColorStop(0.6, '#1a1a1a');
            gradient.addColorStop(1, '#0a7a42'); // Blend with felt color

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(pocket.x, pocket.y, POCKET_CAPTURE_RADIUS, 0, Math.PI * 2);
            ctx.fill();

            // Draw inner pocket (very dark)
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.arc(pocket.x, pocket.y, POCKET_RADIUS - 3, 0, Math.PI * 2);
            ctx.fill();

            // Draw leather pocket rim
            ctx.strokeStyle = '#2a2a2a';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(pocket.x, pocket.y, POCKET_RADIUS, 0, Math.PI * 2);
            ctx.stroke();
        });

        // Draw aiming line and collision indicator
        if (poolGameState.cueAiming && areBallsStationary() && !poolGameState.powerCharging) {
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

        // Draw balls
        poolGameState.balls.forEach(ball => {
            if (ball.sunk) return;

            // Draw ball shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
            ctx.beginPath();
            ctx.arc(ball.x + 2, ball.y + 2, ball.radius, 0, Math.PI * 2);
            ctx.fill();

            // Draw ball
            ctx.fillStyle = ball.color;
            ctx.beginPath();
            ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
            ctx.fill();

            // Draw ball outline
            if (!ball.isEightBall) {
                ctx.strokeStyle = ball.isCueBall ? '#ddd' : '#333';
                ctx.lineWidth = 2;
                ctx.stroke();
            }

            // Draw ball number/design
            if (!ball.isCueBall) {
                if (ball.isEightBall) {
                    // Draw white circle for 8-ball
                    ctx.fillStyle = '#ffffff';
                    ctx.beginPath();
                    ctx.arc(ball.x, ball.y, ball.radius * 0.6, 0, Math.PI * 2);
                    ctx.fill();
                }
                // Draw number
                ctx.fillStyle = ball.isEightBall ? '#000000' : '#ffffff';
                ctx.font = 'bold 10px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(ball.number, ball.x, ball.y);
            }

            // Add highlight for cue ball
            if (ball.isCueBall) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
                ctx.beginPath();
                ctx.arc(ball.x - 3, ball.y - 3, 3, 0, Math.PI * 2);
                ctx.fill();
            }
        });

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
