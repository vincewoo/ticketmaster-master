// UI utilities and debug panel management
import { gameState } from './gameState.js';

/**
 * Setup debug panel
 * Provides in-game debug buttons for testing CAPTCHA types
 */
export function setupDebugPanel() {
    const debugPanel = document.getElementById('debug-panel');
    const debugCloseBtn = document.getElementById('debug-close-btn');

    if (!debugPanel || !debugCloseBtn) return;

    // Toggle debug panel with ` (back-tick) key (only when game is running)
    document.addEventListener('keydown', (e) => {
        if (e.key === '`' && gameState.isRunning) {
            debugPanel.classList.toggle('hidden');
        }
    });

    // Close button
    debugCloseBtn.addEventListener('click', () => {
        debugPanel.classList.add('hidden');
    });

    // Debug CAPTCHA buttons
    const debugTextCaptcha = document.getElementById('debug-text-captcha');
    if (debugTextCaptcha) {
        debugTextCaptcha.addEventListener('click', () => {
            if (gameState.isRunning && window.showCaptcha) {
                window.showCaptcha();
            }
        });
    }

    const debugGasCaptcha = document.getElementById('debug-gas-captcha');
    if (debugGasCaptcha) {
        debugGasCaptcha.addEventListener('click', () => {
            if (gameState.isRunning && window.showGasPumpCaptcha) {
                window.showGasPumpCaptcha();
            }
        });
    }

    const debugPuzzleCaptcha = document.getElementById('debug-puzzle-captcha');
    if (debugPuzzleCaptcha) {
        debugPuzzleCaptcha.addEventListener('click', () => {
            if (gameState.isRunning && window.showPuzzleCaptcha) {
                window.showPuzzleCaptcha();
            }
        });
    }

    const debugFishingCaptcha = document.getElementById('debug-fishing-captcha');
    if (debugFishingCaptcha) {
        debugFishingCaptcha.addEventListener('click', () => {
            if (gameState.isRunning && window.showFishingCaptcha) {
                window.showFishingCaptcha();
            }
        });
    }

    const debugNBACaptcha = document.getElementById('debug-nba-captcha');
    if (debugNBACaptcha) {
        debugNBACaptcha.addEventListener('click', () => {
            if (gameState.isRunning && window.showNBACaptcha) {
                window.showNBACaptcha();
            }
        });
    }

    const debugLunarLanderCaptcha = document.getElementById('debug-lunar-lander-captcha');
    if (debugLunarLanderCaptcha) {
        debugLunarLanderCaptcha.addEventListener('click', () => {
            if (gameState.isRunning && window.showLunarLanderCaptcha) {
                window.showLunarLanderCaptcha();
            }
        });
    }

    const debugTanksCaptcha = document.getElementById('debug-tanks-captcha');
    if (debugTanksCaptcha) {
        debugTanksCaptcha.addEventListener('click', () => {
            if (gameState.isRunning && window.showTanksCaptcha) {
                window.showTanksCaptcha();
            }
        });
    }
}
