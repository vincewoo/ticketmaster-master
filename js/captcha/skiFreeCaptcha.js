// SkiFree CAPTCHA - Survive the Yeti chase for 10 seconds!
import { gameState } from '../gameState.js';
import { hasOverlappingSeats } from '../cartManagement.js';

// Module-level state
let animationId = null;
let skiGameState = null;

// Constants
const TIMER_DURATION = 10;
const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 500;
const PLAYER_WIDTH = 20;
const PLAYER_HEIGHT = 30;
const SCROLL_SPEED = 6; // Speed of downhill skiing
const PLAYER_SPEED = 5; // Left/right movement speed
const YETI_SPEED = 0.5; // Yeti is slower than player - can only catch you if you slow down
const YETI_START_DELAY = 3000; // Yeti appears after 3 seconds
const ACCELERATION_RATE = 0.1; // How fast player moves down Y-axis (accelerates)
const MAX_Y_POSITION = 350; // Maximum Y position (lower = faster)
const MIN_Y_POSITION = 150; // Minimum Y position (higher = slower)
const OBSTACLE_PUSHBACK = 40; // How much Y position increases when hitting obstacle (slows down)
const INITIAL_Y_POSITION = 250; // Starting Y position (middle of screen)

// Obstacle types
const OBSTACLE_TYPES = {
    TREE: { width: 25, height: 40, color: '#228B22', emoji: '🌲' },
    ROCK: { width: 20, height: 20, color: '#808080', emoji: '🪨' },
    SKIER: { width: 18, height: 28, color: '#FF6B6B', emoji: '⛷️' },
    SNOWBOARDER: { width: 18, height: 28, color: '#4ECDC4', emoji: '🏂' }
};

export function showCAPTCHA() {
    const modal = document.getElementById('skifree-captcha-modal');
    const canvas = document.getElementById('skifree-canvas');
    const ctx = canvas.getContext('2d');
    const timerDisplay = document.getElementById('skifree-timer');
    const feedbackEl = document.getElementById('skifree-feedback');
    const cancelBtn = document.getElementById('skifree-cancel-btn');
    const warningEl = document.getElementById('skifree-captcha-warning');

    // Check for multiplayer competition warning
    if (gameState.isMultiplayer && hasOverlappingSeats()) {
        warningEl.classList.remove('hidden');
    } else {
        warningEl.classList.add('hidden');
    }

    // Initialize game state
    skiGameState = {
        timeRemaining: TIMER_DURATION,
        player: {
            x: CANVAS_WIDTH / 2 - PLAYER_WIDTH / 2,
            y: INITIAL_Y_POSITION, // Start in middle of screen
            targetX: CANVAS_WIDTH / 2 - PLAYER_WIDTH / 2,
            vx: 0
        },
        obstacles: [],
        yeti: null,
        scrollOffset: 0,
        mouseX: CANVAS_WIDTH / 2,
        gameOver: false,
        victory: false, // Track if player won
        startTime: Date.now(),
        currentSpeed: SCROLL_SPEED // Current scroll speed
    };

    feedbackEl.textContent = '';
    feedbackEl.className = 'captcha-error';

    // Generate initial obstacles
    generateObstacles();

    // Spawn Yeti after delay - starts above player
    setTimeout(() => {
        if (skiGameState && !skiGameState.gameOver) {
            skiGameState.yeti = {
                x: CANVAS_WIDTH / 2 - 30,
                y: -100, // Yeti starts above screen, chasing from behind
                width: 60,
                height: 80
            };
        }
    }, YETI_START_DELAY);

    // Event listeners - mouse and touch movement
    const handleMouseMove = (e) => {
        const rect = canvas.getBoundingClientRect();
        skiGameState.mouseX = e.clientX - rect.left;
    };

    const handleTouchMove = (e) => {
        e.preventDefault(); // Prevent scrolling while playing
        const rect = canvas.getBoundingClientRect();
        const touch = e.touches[0];
        skiGameState.mouseX = touch.clientX - rect.left;
    };

    const handleTouchStart = (e) => {
        e.preventDefault(); // Prevent scrolling while playing
        const rect = canvas.getBoundingClientRect();
        const touch = e.touches[0];
        skiGameState.mouseX = touch.clientX - rect.left;
    };

    const handleCancel = () => {
        cleanup();
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    cancelBtn.addEventListener('click', handleCancel);

    // Timer
    const timerInterval = setInterval(() => {
        if (skiGameState.gameOver) {
            clearInterval(timerInterval);
            return;
        }

        skiGameState.timeRemaining--;
        timerDisplay.textContent = skiGameState.timeRemaining;

        if (skiGameState.timeRemaining <= 0) {
            clearInterval(timerInterval);
            handleSuccess();
        }
    }, 1000);

    // Generate obstacles procedurally
    function generateObstacles() {
        // Create obstacles ahead of player (downhill = below player on screen)
        for (let i = 0; i < 20; i++) {
            const types = Object.keys(OBSTACLE_TYPES);
            const type = types[Math.floor(Math.random() * types.length)];
            const config = OBSTACLE_TYPES[type];

            skiGameState.obstacles.push({
                type,
                x: Math.random() * (CANVAS_WIDTH - config.width),
                y: skiGameState.player.y + 100 + (i * 80) + Math.random() * 100, // Spawn below player
                width: config.width,
                height: config.height
            });
        }
    }

    // Game loop
    function gameLoop() {
        if (!skiGameState) return;
        if (skiGameState.gameOver && !skiGameState.victory) return; // Stop loop only if lost, not if won

        // Only update game state if not in victory mode
        if (!skiGameState.victory) {
            // Update player position - follow mouse X position smoothly
            const targetX = skiGameState.mouseX - PLAYER_WIDTH / 2;
            const dx = targetX - skiGameState.player.x;

            // Smooth movement towards mouse position
            skiGameState.player.x += dx * 0.15; // Lerp factor for smooth following

            // Keep player in bounds
            if (skiGameState.player.x < 0) skiGameState.player.x = 0;
            if (skiGameState.player.x > CANVAS_WIDTH - PLAYER_WIDTH) {
                skiGameState.player.x = CANVAS_WIDTH - PLAYER_WIDTH;
            }

            // Accelerate player by moving down Y-axis (unless at max)
            if (skiGameState.player.y < MAX_Y_POSITION) {
                skiGameState.player.y += ACCELERATION_RATE;
            }

            // Keep player Y in bounds
            if (skiGameState.player.y < MIN_Y_POSITION) skiGameState.player.y = MIN_Y_POSITION;
            if (skiGameState.player.y > MAX_Y_POSITION) skiGameState.player.y = MAX_Y_POSITION;

            // Calculate speed based on Y position (lower Y = faster)
            // Speed ranges from SCROLL_SPEED * 0.5 (at MIN_Y) to SCROLL_SPEED * 1.5 (at MAX_Y)
            const yProgress = (skiGameState.player.y - MIN_Y_POSITION) / (MAX_Y_POSITION - MIN_Y_POSITION);
            skiGameState.currentSpeed = SCROLL_SPEED * (0.5 + yProgress);

            // Update scroll offset (for visual effects)
            skiGameState.scrollOffset += skiGameState.currentSpeed;

            // Update obstacles - move upward (simulating downhill skiing)
            skiGameState.obstacles.forEach(obstacle => {
                obstacle.y -= skiGameState.currentSpeed;
            });

            // Remove obstacles that scrolled off top, add new ones at bottom
            skiGameState.obstacles = skiGameState.obstacles.filter(o => o.y > -100);
            while (skiGameState.obstacles.length < 20) {
                const types = Object.keys(OBSTACLE_TYPES);
                const type = types[Math.floor(Math.random() * types.length)];
                const config = OBSTACLE_TYPES[type];

                skiGameState.obstacles.push({
                    type,
                    x: Math.random() * (CANVAS_WIDTH - config.width),
                    y: CANVAS_HEIGHT + Math.random() * 100, // Spawn at bottom
                    width: config.width,
                    height: config.height
                });
            }

            // Update Yeti - actively chases player from above
            if (skiGameState.yeti) {
                // Calculate direction to player
                const dx = (skiGameState.player.x + PLAYER_WIDTH / 2) - (skiGameState.yeti.x + skiGameState.yeti.width / 2);
                const dy = (skiGameState.player.y + PLAYER_HEIGHT / 2) - (skiGameState.yeti.y + skiGameState.yeti.height / 2);
                const distance = Math.sqrt(dx * dx + dy * dy);

                // Normalize and apply chase speed
                if (distance > 0) {
                    // Yeti moves slower than player's normal speed, can only catch when you're slowed down
                    skiGameState.yeti.x += (dx / distance) * YETI_SPEED;
                    skiGameState.yeti.y += (dy / distance) * YETI_SPEED;
                }
            }

            // Collision detection
            checkCollisions();
        }

        // Always render (even during victory to show the overlay)
        render(ctx);

        animationId = requestAnimationFrame(gameLoop);
    }

    function checkCollisions() {
        const playerRect = {
            x: skiGameState.player.x,
            y: skiGameState.player.y,
            width: PLAYER_WIDTH,
            height: PLAYER_HEIGHT
        };

        // Check obstacle collisions - hitting obstacles slows you down
        for (const obstacle of skiGameState.obstacles) {
            if (rectsCollide(playerRect, obstacle) && !obstacle.hit) {
                obstacle.hit = true; // Mark as hit to avoid multiple slowdowns
                handleObstacleHit();
            }
        }

        // Check Yeti collision - this ends the game
        if (skiGameState.yeti && rectsCollide(playerRect, skiGameState.yeti)) {
            handleYetiCaught();
        }
    }

    function rectsCollide(rect1, rect2) {
        return rect1.x < rect2.x + rect2.width &&
               rect1.x + rect1.width > rect2.x &&
               rect1.y < rect2.y + rect2.height &&
               rect1.y + rect1.height > rect2.y;
    }

    function handleObstacleHit() {
        // Push player back up on Y-axis (slows them down)
        skiGameState.player.y -= OBSTACLE_PUSHBACK;

        // Clamp to minimum position
        if (skiGameState.player.y < MIN_Y_POSITION) {
            skiGameState.player.y = MIN_Y_POSITION;
        }
    }

    function handleYetiCaught() {
        skiGameState.gameOver = true;
        feedbackEl.textContent = '👹 The Yeti got you! Try again.';
        feedbackEl.className = 'captcha-error';
        setTimeout(() => {
            cleanup();
        }, 2000);
    }

    function render(ctx) {
        // Clear canvas with snow background
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Draw snow pattern (subtle dots)
        ctx.fillStyle = '#E8F4F8';
        for (let i = 0; i < 50; i++) {
            const x = (i * 37 + skiGameState.scrollOffset) % CANVAS_WIDTH;
            const y = (i * 53 + skiGameState.scrollOffset * 2) % CANVAS_HEIGHT;
            ctx.fillRect(x, y, 2, 2);
        }

        // Show victory overlay if game is won
        if (skiGameState.victory) {
            // Semi-transparent overlay
            ctx.fillStyle = 'rgba(0, 255, 0, 0.3)';
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

            // Victory message box
            ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
            ctx.fillRect(CANVAS_WIDTH / 2 - 150, CANVAS_HEIGHT / 2 - 60, 300, 120);

            // Border
            ctx.strokeStyle = '#00AA00';
            ctx.lineWidth = 4;
            ctx.strokeRect(CANVAS_WIDTH / 2 - 150, CANVAS_HEIGHT / 2 - 60, 300, 120);

            // Victory text
            ctx.fillStyle = '#00AA00';
            ctx.font = 'bold 32px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🎉 YOU WIN! 🎉', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);

            ctx.fillStyle = '#333';
            ctx.font = 'bold 18px Arial';
            ctx.fillText('You survived the Yeti!', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20);

            return; // Don't draw game elements
        }

        // Draw obstacles
        skiGameState.obstacles.forEach(obstacle => {
            const config = OBSTACLE_TYPES[obstacle.type];

            // Draw emoji or fallback to colored rectangle
            ctx.font = `${obstacle.height}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(
                config.emoji,
                obstacle.x + obstacle.width / 2,
                obstacle.y + obstacle.height / 2
            );
        });

        // Draw player (skier)
        ctx.font = '30px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
            '⛷️',
            skiGameState.player.x + PLAYER_WIDTH / 2,
            skiGameState.player.y + PLAYER_HEIGHT / 2
        );

        // Draw Yeti (chasing from below)
        if (skiGameState.yeti && skiGameState.yeti.y < CANVAS_HEIGHT) {
            ctx.font = '60px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(
                '👹',
                skiGameState.yeti.x + skiGameState.yeti.width / 2,
                skiGameState.yeti.y + skiGameState.yeti.height / 2
            );

            // Draw Yeti warning text when Yeti is getting close
            const yetiDistanceX = Math.abs((skiGameState.yeti.x + skiGameState.yeti.width / 2) - (skiGameState.player.x + PLAYER_WIDTH / 2));
            const yetiDistanceY = Math.abs((skiGameState.yeti.y + skiGameState.yeti.height / 2) - (skiGameState.player.y + PLAYER_HEIGHT / 2));
            const totalDistance = Math.sqrt(yetiDistanceX * yetiDistanceX + yetiDistanceY * yetiDistanceY);

            if (totalDistance < 150) {
                ctx.font = 'bold 18px Arial';
                ctx.fillStyle = '#FF0000';
                ctx.textAlign = 'center';
                ctx.fillText('⚠️ THE YETI IS CHASING YOU! ⚠️', CANVAS_WIDTH / 2, 30);
            }
        }

        // Draw distance indicator
        const distance = Math.floor(skiGameState.scrollOffset / 10);
        ctx.font = '14px monospace';
        ctx.fillStyle = '#333';
        ctx.textAlign = 'left';
        ctx.fillText(`Distance: ${distance}m`, 10, 20);

        // Draw speed indicator
        const speedPercent = Math.floor((skiGameState.currentSpeed / (SCROLL_SPEED * 1.5)) * 100);
        ctx.font = '14px monospace';
        ctx.fillStyle = speedPercent > 66 ? '#00AA00' : speedPercent > 33 ? '#FFA500' : '#FF0000';
        ctx.textAlign = 'right';
        ctx.fillText(`Speed: ${speedPercent}%`, CANVAS_WIDTH - 10, 20);

        // Draw speed bar
        const barWidth = 100;
        const barHeight = 8;
        const barX = CANVAS_WIDTH - 10 - barWidth;
        const barY = 30;

        // Background
        ctx.fillStyle = '#333';
        ctx.fillRect(barX, barY, barWidth, barHeight);

        // Speed fill
        ctx.fillStyle = speedPercent > 66 ? '#00AA00' : speedPercent > 33 ? '#FFA500' : '#FF0000';
        ctx.fillRect(barX, barY, (barWidth * speedPercent) / 100, barHeight);
    }

    function cleanup() {
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
        clearInterval(timerInterval);
        canvas.removeEventListener('mousemove', handleMouseMove);
        canvas.removeEventListener('touchmove', handleTouchMove);
        canvas.removeEventListener('touchstart', handleTouchStart);
        cancelBtn.removeEventListener('click', handleCancel);
        modal.classList.add('hidden');
        skiGameState = null;
    }

    function handleSuccess() {
        skiGameState.gameOver = true;
        skiGameState.victory = true; // Mark as victory
        feedbackEl.textContent = '✅ You survived the Yeti!';
        feedbackEl.className = 'captcha-success';
        setTimeout(() => {
            cleanup();
            if (window.completeCheckout) window.completeCheckout();
        }, 1500);
    }

    // Show modal and start game
    modal.classList.remove('hidden');
    gameLoop();
}
