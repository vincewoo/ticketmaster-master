// Import dependencies
import { gameState } from '../gameState.js';
import { hasOverlappingSeats } from '../cartManagement.js';

// Module-level state
let animationId = null;
let flappyGameState = null;

// Constants
const TIMER_DURATION = 30;
const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 500;
const BIRD_SIZE = 25;
const GRAVITY = 0.4;
const FLAP_STRENGTH = -7;
const PIPE_WIDTH = 60;
const PIPE_GAP = 180;
const PIPE_SPEED = 1.5;
const MIN_PIPE_HEIGHT = 80;
const SCORE_TO_WIN = 3; // Must pass through 3 pipes to win

// Main export function - NO PARAMETERS!
export function showCAPTCHA() {
    // Get DOM elements
    const modal = document.getElementById('flappy-bird-captcha-modal');
    const canvas = document.getElementById('flappy-bird-canvas');
    const ctx = canvas.getContext('2d');
    const timerDisplay = document.getElementById('flappy-bird-timer');
    const flapButton = document.getElementById('flappy-bird-flap-btn');
    const cancelButton = document.getElementById('flappy-bird-cancel-btn');
    const feedbackDiv = document.getElementById('flappy-bird-feedback');
    const scoreDisplay = document.getElementById('flappy-bird-score');

    // Check for multiplayer competition warning
    const warningEl = document.getElementById('flappy-bird-warning');
    if (gameState.isMultiplayer && hasOverlappingSeats()) {
        warningEl.classList.remove('hidden');
    } else {
        warningEl.classList.add('hidden');
    }

    // Initialize local game state
    flappyGameState = {
        timeRemaining: TIMER_DURATION,
        bird: {
            y: CANVAS_HEIGHT / 2,
            velocity: 0
        },
        pipes: [],
        score: 0,
        gameOver: false,
        started: false
    };

    // Add first pipe
    addPipe();

    // Event listeners
    const handleFlap = () => {
        if (!flappyGameState.gameOver) {
            flappyGameState.started = true;
            flappyGameState.bird.velocity = FLAP_STRENGTH;
        }
    };

    const handleCancel = () => {
        cleanup();
    };

    const handleKeyPress = (e) => {
        if (e.code === 'Space') {
            e.preventDefault();
            handleFlap();
        }
    };

    canvas.addEventListener('click', handleFlap);
    flapButton.addEventListener('click', handleFlap);
    cancelButton.addEventListener('click', handleCancel);
    document.addEventListener('keydown', handleKeyPress);

    // Timer interval
    const timerInterval = setInterval(() => {
        flappyGameState.timeRemaining--;
        timerDisplay.textContent = flappyGameState.timeRemaining;

        if (flappyGameState.timeRemaining <= 0) {
            clearInterval(timerInterval);
            flappyGameState.gameOver = true;
            feedbackDiv.textContent = '❌ Time\'s up! Verification failed.';
            feedbackDiv.style.color = '#dc2626';
            setTimeout(() => {
                cleanup();
            }, 2000);
        }
    }, 1000);

    // Helper function to add a new pipe
    function addPipe() {
        const maxHeight = CANVAS_HEIGHT - PIPE_GAP - MIN_PIPE_HEIGHT * 2;
        const topHeight = MIN_PIPE_HEIGHT + Math.random() * maxHeight;

        flappyGameState.pipes.push({
            x: CANVAS_WIDTH,
            topHeight: topHeight,
            scored: false
        });
    }

    // Game update logic
    function update() {
        if (flappyGameState.gameOver || !flappyGameState.started) return;

        // Update bird
        flappyGameState.bird.velocity += GRAVITY;
        flappyGameState.bird.y += flappyGameState.bird.velocity;

        // Check ceiling and floor collision
        if (flappyGameState.bird.y <= 0 || flappyGameState.bird.y + BIRD_SIZE >= CANVAS_HEIGHT) {
            handleGameOver();
            return;
        }

        // Update pipes
        for (let i = flappyGameState.pipes.length - 1; i >= 0; i--) {
            const pipe = flappyGameState.pipes[i];
            pipe.x -= PIPE_SPEED;

            // Remove off-screen pipes
            if (pipe.x + PIPE_WIDTH < 0) {
                flappyGameState.pipes.splice(i, 1);
                continue;
            }

            // Check collision with pipe
            const birdX = 50; // Bird is always at x=50
            if (
                birdX + BIRD_SIZE > pipe.x &&
                birdX < pipe.x + PIPE_WIDTH &&
                (flappyGameState.bird.y < pipe.topHeight ||
                 flappyGameState.bird.y + BIRD_SIZE > pipe.topHeight + PIPE_GAP)
            ) {
                handleGameOver();
                return;
            }

            // Score when passing pipe
            if (!pipe.scored && pipe.x + PIPE_WIDTH < birdX) {
                pipe.scored = true;
                flappyGameState.score++;
                scoreDisplay.textContent = flappyGameState.score;

                // Check for win
                if (flappyGameState.score >= SCORE_TO_WIN) {
                    handleSuccess();
                    return;
                }
            }
        }

        // Add new pipe when last pipe is at 200px
        const lastPipe = flappyGameState.pipes[flappyGameState.pipes.length - 1];
        if (lastPipe && lastPipe.x < CANVAS_WIDTH - 200) {
            addPipe();
        }
    }

    // Render function
    function render() {
        // Clear canvas
        ctx.fillStyle = '#87CEEB'; // Sky blue background
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Draw pipes
        const PIPE_CAP_HEIGHT = 25;
        const PIPE_CAP_EXTRA = 5; // Extra width on each side for the cap

        ctx.fillStyle = '#22c55e'; // Green pipes
        for (const pipe of flappyGameState.pipes) {
            // Top pipe body
            ctx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.topHeight - PIPE_CAP_HEIGHT);
            // Top pipe cap (wider rectangle at bottom)
            ctx.fillRect(pipe.x - PIPE_CAP_EXTRA, pipe.topHeight - PIPE_CAP_HEIGHT, PIPE_WIDTH + PIPE_CAP_EXTRA * 2, PIPE_CAP_HEIGHT);

            // Bottom pipe body
            ctx.fillRect(pipe.x, pipe.topHeight + PIPE_GAP + PIPE_CAP_HEIGHT, PIPE_WIDTH, CANVAS_HEIGHT - pipe.topHeight - PIPE_GAP - PIPE_CAP_HEIGHT);
            // Bottom pipe cap (wider rectangle at top)
            ctx.fillRect(pipe.x - PIPE_CAP_EXTRA, pipe.topHeight + PIPE_GAP, PIPE_WIDTH + PIPE_CAP_EXTRA * 2, PIPE_CAP_HEIGHT);

            // Pipe borders
            ctx.strokeStyle = '#16a34a';
            ctx.lineWidth = 3;
            // Top pipe borders
            ctx.strokeRect(pipe.x, 0, PIPE_WIDTH, pipe.topHeight - PIPE_CAP_HEIGHT);
            ctx.strokeRect(pipe.x - PIPE_CAP_EXTRA, pipe.topHeight - PIPE_CAP_HEIGHT, PIPE_WIDTH + PIPE_CAP_EXTRA * 2, PIPE_CAP_HEIGHT);
            // Bottom pipe borders
            ctx.strokeRect(pipe.x, pipe.topHeight + PIPE_GAP + PIPE_CAP_HEIGHT, PIPE_WIDTH, CANVAS_HEIGHT - pipe.topHeight - PIPE_GAP - PIPE_CAP_HEIGHT);
            ctx.strokeRect(pipe.x - PIPE_CAP_EXTRA, pipe.topHeight + PIPE_GAP, PIPE_WIDTH + PIPE_CAP_EXTRA * 2, PIPE_CAP_HEIGHT);
        }

        // Draw bird emoji (flipped to face right)
        const birdX = 50;
        ctx.save();
        ctx.translate(birdX + BIRD_SIZE/2, flappyGameState.bird.y + BIRD_SIZE/2);
        ctx.scale(-1, 1); // Flip horizontally
        ctx.font = `${BIRD_SIZE * 1.5}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🐦', 0, 0);
        ctx.restore();

        // Draw instruction text if not started
        if (!flappyGameState.started) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(0, CANVAS_HEIGHT/2 - 40, CANVAS_WIDTH, 80);
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 24px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Click or Press SPACE to Flap', CANVAS_WIDTH/2, CANVAS_HEIGHT/2 - 5);
            ctx.font = '18px Arial';
            ctx.fillText(`Pass ${SCORE_TO_WIN} pipes to verify!`, CANVAS_WIDTH/2, CANVAS_HEIGHT/2 + 25);
        }
    }

    // Game loop
    function gameLoop() {
        update();
        render();
        animationId = requestAnimationFrame(gameLoop);
    }

    // Game over handler
    function handleGameOver() {
        flappyGameState.gameOver = true;
        feedbackDiv.textContent = '💥 Crashed! Verification failed.';
        feedbackDiv.style.color = '#dc2626';
        setTimeout(() => {
            cleanup();
        }, 2000);
    }

    // Success handler
    function handleSuccess() {
        flappyGameState.gameOver = true;
        feedbackDiv.textContent = `✅ Success! You passed ${SCORE_TO_WIN} pipes!`;
        feedbackDiv.style.color = '#22c55e';
        setTimeout(() => {
            cleanup();
            if (window.completeCheckout) window.completeCheckout();
        }, 1500);
    }

    // Cleanup function
    function cleanup() {
        clearInterval(timerInterval);
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
        canvas.removeEventListener('click', handleFlap);
        flapButton.removeEventListener('click', handleFlap);
        cancelButton.removeEventListener('click', handleCancel);
        document.removeEventListener('keydown', handleKeyPress);
        modal.classList.add('hidden');
        feedbackDiv.textContent = '';
        flappyGameState = null;
    }

    // Show modal and start game loop
    modal.classList.remove('hidden');
    scoreDisplay.textContent = '0';
    feedbackDiv.textContent = '';
    gameLoop();
}
