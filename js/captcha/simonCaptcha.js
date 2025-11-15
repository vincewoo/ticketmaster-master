// Simon Says CAPTCHA - Memory sequence game
import { gameState } from '../gameState.js';
import { hasOverlappingSeats } from '../cartManagement.js';

// Module-level state
let simonState = null;
let playbackTimeout = null;

// Constants
const COLORS = ['red', 'green', 'blue', 'yellow'];
const SEQUENCE_LENGTH = 8; // Must repeat 8 colors correctly (starting at 4)
const STARTING_ROUND = 4; // Start with 4 colors to remember
const PLAYBACK_SPEED = 600; // ms per color flash

// Main export function - NO PARAMETERS!
export function showCAPTCHA() {
    // Get DOM elements
    const modal = document.getElementById('simon-captcha-modal');
    const feedbackEl = document.getElementById('simon-feedback');
    const cancelButton = document.getElementById('simon-cancel-btn');
    const levelDisplay = document.getElementById('simon-level');
    const startButton = document.getElementById('simon-start-btn');

    // Color buttons
    const redBtn = document.getElementById('simon-red');
    const greenBtn = document.getElementById('simon-green');
    const blueBtn = document.getElementById('simon-blue');
    const yellowBtn = document.getElementById('simon-yellow');

    // Check for multiplayer competition warning
    const warningEl = document.getElementById('simon-captcha-warning');
    if (gameState.isMultiplayer && hasOverlappingSeats()) {
        warningEl.classList.remove('hidden');
    } else {
        warningEl.classList.add('hidden');
    }

    // Initialize local game state
    simonState = {
        sequence: [],
        playerSequence: [],
        currentRound: STARTING_ROUND - 1, // Start at round 3 (4 colors to remember)
        isPlayback: false,
        isWaiting: true // Waiting for player to start
    };

    // Generate random sequence
    for (let i = 0; i < SEQUENCE_LENGTH; i++) {
        simonState.sequence.push(COLORS[Math.floor(Math.random() * COLORS.length)]);
    }

    // Set up event listeners
    const handleColorClick = (color) => {
        if (simonState.isPlayback || simonState.isWaiting) return;

        // Flash the button
        flashButton(color);

        // Add to player sequence
        simonState.playerSequence.push(color);

        // Check if correct so far
        const currentIndex = simonState.playerSequence.length - 1;
        if (simonState.playerSequence[currentIndex] !== simonState.sequence[currentIndex]) {
            // Wrong! CAPTCHA failed
            feedbackEl.textContent = '❌ Wrong sequence! Verification failed.';
            feedbackEl.style.color = '#dc2626';
            setTimeout(() => {
                cleanup();
            }, 2000);
            return;
        }

        // Check if round complete
        if (simonState.playerSequence.length === simonState.currentRound + 1) {
            simonState.currentRound++;

            if (simonState.currentRound === SEQUENCE_LENGTH) {
                // Won!
                handleSuccess();
            } else {
                // Next round - calculate display round number
                const nextDisplayRound = simonState.currentRound - STARTING_ROUND + 2;
                feedbackEl.textContent = `✓ Correct! Round ${nextDisplayRound}`;
                feedbackEl.style.color = '#16a34a';
                setTimeout(() => {
                    playSequence();
                }, 1000);
            }
        }
    };

    const handleStart = () => {
        simonState.isWaiting = false;
        startButton.classList.add('hidden');
        feedbackEl.textContent = 'Watch the pattern...';
        feedbackEl.style.color = '#3b82f6';
        playSequence();
    };

    const handleCancel = () => {
        cleanup();
    };

    // Attach listeners
    redBtn.addEventListener('click', () => handleColorClick('red'));
    greenBtn.addEventListener('click', () => handleColorClick('green'));
    blueBtn.addEventListener('click', () => handleColorClick('blue'));
    yellowBtn.addEventListener('click', () => handleColorClick('yellow'));
    startButton.addEventListener('click', handleStart);
    cancelButton.addEventListener('click', handleCancel);

    // Flash button helper
    function flashButton(color) {
        const btn = document.getElementById(`simon-${color}`);
        btn.classList.add('simon-active');
        setTimeout(() => {
            btn.classList.remove('simon-active');
        }, 300);
    }

    // Play sequence to player
    function playSequence() {
        simonState.isPlayback = true;
        simonState.playerSequence = [];
        // Display round number offset by starting round (so it shows "Round 1" when currentRound = 3)
        const displayRound = simonState.currentRound - STARTING_ROUND + 2;
        const totalRounds = SEQUENCE_LENGTH - STARTING_ROUND + 1;
        levelDisplay.textContent = `Round ${displayRound} of ${totalRounds}`;

        // Play each color in sequence
        let index = 0;
        function playNext() {
            if (index <= simonState.currentRound) {
                flashButton(simonState.sequence[index]);
                index++;
                playbackTimeout = setTimeout(playNext, PLAYBACK_SPEED);
            } else {
                simonState.isPlayback = false;
                feedbackEl.textContent = 'Your turn! Repeat the pattern.';
                feedbackEl.style.color = '#3b82f6';
            }
        }
        playNext();
    }

    // Cleanup function
    function cleanup() {
        if (playbackTimeout) {
            clearTimeout(playbackTimeout);
            playbackTimeout = null;
        }

        // Remove all event listeners
        redBtn.removeEventListener('click', handleColorClick);
        greenBtn.removeEventListener('click', handleColorClick);
        blueBtn.removeEventListener('click', handleColorClick);
        yellowBtn.removeEventListener('click', handleColorClick);
        startButton.removeEventListener('click', handleStart);
        cancelButton.removeEventListener('click', handleCancel);

        modal.classList.add('hidden');
        simonState = null;
    }

    // Success handler - call window.completeCheckout()
    function handleSuccess() {
        feedbackEl.textContent = '🎉 Perfect! Verification complete!';
        feedbackEl.style.color = '#16a34a';
        setTimeout(() => {
            cleanup();
            if (window.completeCheckout) window.completeCheckout();
        }, 1500);
    }

    // Show modal and initialize
    modal.classList.remove('hidden');
    feedbackEl.textContent = 'Click START to begin the pattern!';
    feedbackEl.style.color = '#3b82f6';
    levelDisplay.textContent = 'Ready';
}
