// Event listeners setup
import { gameState } from './gameState.js';
import { getGridConfig, applyGridLayout } from './config.js';
import { generateSeats, renderSeats } from './seatManagement.js';

/**
 * Setup all event listeners for the game
 * Called once during initialization
 */
export function setupEventListeners() {
    // Multiplayer setup
    if (window.initMultiplayer) {
        window.initMultiplayer();
    }

    // Handle window resize for single-player mode
    let resizeTimeout;
    window.addEventListener('resize', () => {
        if (!gameState.isMultiplayer && !gameState.isRunning) {
            // Debounce resize and only apply before game starts
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                const config = getGridConfig();
                applyGridLayout(config);
                // Regenerate seats with new grid
                generateSeats();
                renderSeats();
            }, 300);
        }
    });

    // Checkout button
    document.getElementById('checkout-btn').addEventListener('click', () => {
        if (window.initiateCheckout) window.initiateCheckout();
    });

    // Skip button
    document.getElementById('skip-btn').addEventListener('click', () => {
        if (window.skipTarget) window.skipTarget();
    });

    // CAPTCHA buttons
    document.getElementById('captcha-submit').addEventListener('click', () => {
        if (window.verifyCaptcha) window.verifyCaptcha();
    });
    document.getElementById('captcha-cancel').addEventListener('click', () => {
        if (window.cancelCaptcha) window.cancelCaptcha();
    });

    // CAPTCHA input - submit on Enter
    document.getElementById('captcha-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && window.verifyCaptcha) {
            window.verifyCaptcha();
        }
    });

    // Gas pump CAPTCHA buttons
    document.getElementById('gas-stop-btn').addEventListener('click', () => {
        if (window.stopGasPump) window.stopGasPump();
    });
    document.getElementById('gas-cancel-btn').addEventListener('click', () => {
        if (window.cancelGasCaptcha) window.cancelGasCaptcha();
    });

    // Puzzle CAPTCHA buttons and slider
    document.getElementById('puzzle-submit').addEventListener('click', () => {
        if (window.verifyPuzzle) window.verifyPuzzle();
    });
    document.getElementById('puzzle-cancel').addEventListener('click', () => {
        if (window.cancelPuzzleCaptcha) window.cancelPuzzleCaptcha();
    });
    document.getElementById('puzzle-slider').addEventListener('input', () => {
        if (window.updatePuzzlePiecePosition) window.updatePuzzlePiecePosition();
    });

    // Fishing CAPTCHA buttons
    document.getElementById('fishing-action-btn').addEventListener('mousedown', () => {
        if (window.startFishingAction) window.startFishingAction();
    });
    document.getElementById('fishing-action-btn').addEventListener('mouseup', () => {
        if (window.stopFishingAction) window.stopFishingAction();
    });
    document.getElementById('fishing-action-btn').addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (window.startFishingAction) window.startFishingAction();
    });
    document.getElementById('fishing-action-btn').addEventListener('touchend', (e) => {
        e.preventDefault();
        if (window.stopFishingAction) window.stopFishingAction();
    });
    document.getElementById('fishing-cancel-btn').addEventListener('click', () => {
        if (window.cancelFishingCaptcha) window.cancelFishingCaptcha();
    });

    // NBA Free Throw CAPTCHA buttons
    document.getElementById('nba-shoot-btn').addEventListener('click', () => {
        console.log('NBA SHOOT BUTTON CLICKED - Event listener fired');
        if (window.handleNBAShoot) {
            console.log('Calling handleNBAShoot');
            window.handleNBAShoot();
        } else {
            console.log('ERROR: window.handleNBAShoot is not defined!');
        }
    });
    document.getElementById('nba-cancel-btn').addEventListener('click', () => {
        if (window.cancelNBACaptcha) window.cancelNBACaptcha();
    });

    // Debug panel
    if (window.setupDebugPanel) {
        window.setupDebugPanel();
    }

    // Play again button
    document.getElementById('play-again-btn').addEventListener('click', () => {
        if (window.hideModal) window.hideModal('gameover-modal');

        // Reset multiplayer state
        if (gameState.peer) {
            gameState.peer.destroy();
            gameState.peer = null;
        }
        gameState.isMultiplayer = false;
        gameState.isHost = false;
        gameState.connection = null;
        gameState.opponentScore = 0;

        // Show start modal again
        if (window.showModal) window.showModal('start-modal');
    });
}
