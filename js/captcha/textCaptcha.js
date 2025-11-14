// Text CAPTCHA implementation
import { gameState } from '../gameState.js';
import { CAPTCHA_DURATION } from '../config.js';
import { hasOverlappingSeats } from '../cartManagement.js';

/**
 * Show text CAPTCHA modal
 * Displays alphanumeric code for user to type
 */
export function showCaptcha() {
    gameState.captchaCode = generateCaptchaCode();
    gameState.captchaTimeRemaining = CAPTCHA_DURATION;

    const captchaChallenge = document.getElementById('captcha-challenge');
    captchaChallenge.textContent = gameState.captchaCode;

    document.getElementById('captcha-input').value = '';
    document.getElementById('captcha-error').classList.add('hidden');

    // Check if opponent has overlapping seats in multiplayer
    const warningEl = document.getElementById('captcha-warning');
    if (gameState.isMultiplayer && hasOverlappingSeats()) {
        warningEl.classList.remove('hidden');
    } else {
        warningEl.classList.add('hidden');
    }

    if (window.showModal) window.showModal('captcha-modal');

    // Focus input
    document.getElementById('captcha-input').focus();

    // Start countdown
    updateCaptchaTimer();
    gameState.captchaInterval = setInterval(() => {
        gameState.captchaTimeRemaining--;
        updateCaptchaTimer();

        if (gameState.captchaTimeRemaining <= 0) {
            clearInterval(gameState.captchaInterval);
            showCaptchaError('Time expired! Try again.');
            setTimeout(() => {
                if (window.hideModal) window.hideModal('captcha-modal');
            }, 1500);
        }
    }, 1000);
}

/**
 * Generate random CAPTCHA code
 * @returns {string} 6-character alphanumeric code
 */
export function generateCaptchaCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing characters
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

/**
 * Update CAPTCHA timer display
 */
export function updateCaptchaTimer() {
    document.getElementById('captcha-timer').textContent = gameState.captchaTimeRemaining;
}

/**
 * Verify CAPTCHA input
 * Completes checkout if correct, shows error if wrong
 */
export function verifyCaptcha() {
    const input = document.getElementById('captcha-input').value.toUpperCase();

    if (input === gameState.captchaCode) {
        clearInterval(gameState.captchaInterval);
        if (window.hideModal) window.hideModal('captcha-modal');
        if (window.completeCheckout) window.completeCheckout();
    } else {
        showCaptchaError('Incorrect code! Try again.');
        document.getElementById('captcha-input').value = '';
        document.getElementById('captcha-input').focus();
    }
}

/**
 * Show CAPTCHA error message
 * @param {string} message - Error message to display
 */
export function showCaptchaError(message) {
    const errorEl = document.getElementById('captcha-error');
    errorEl.textContent = message;
    errorEl.classList.remove('hidden');
}

/**
 * Cancel CAPTCHA and close modal
 */
export function cancelCaptcha() {
    clearInterval(gameState.captchaInterval);
    if (window.hideModal) window.hideModal('captcha-modal');
}

// Export functions globally for event handlers
if (typeof window !== 'undefined') {
    window.showCaptcha = showCaptcha;
    window.verifyCaptcha = verifyCaptcha;
    window.cancelCaptcha = cancelCaptcha;
}
