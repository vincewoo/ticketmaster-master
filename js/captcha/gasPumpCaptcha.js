// Gas pump CAPTCHA implementation
import { gameState } from '../gameState.js';
import { hasOverlappingSeats } from '../cartManagement.js';

/**
 * Show gas pump CAPTCHA modal
 * Player must stop the pump at the target amount
 */
export function showGasPumpCaptcha() {
    // Generate random target ($5, $10, $15, or $20)
    const targets = [5.00, 10.00, 15.00, 20.00];
    gameState.gasPumpTarget = targets[Math.floor(Math.random() * targets.length)];
    gameState.gasPumpCurrent = 0;
    gameState.gasPumpAttempts = 3;
    gameState.gasPumpActive = false;

    // Update display
    document.getElementById('gas-target').textContent = `$${gameState.gasPumpTarget.toFixed(2)}`;
    document.getElementById('gas-amount').textContent = `$${gameState.gasPumpCurrent.toFixed(2)}`;
    document.getElementById('gas-attempts').textContent = gameState.gasPumpAttempts;
    document.getElementById('gas-captcha-error').classList.add('hidden');
    document.getElementById('gas-stop-btn').disabled = true;

    // Check if opponent has overlapping seats in multiplayer
    const warningEl = document.getElementById('gas-captcha-warning');
    if (gameState.isMultiplayer && hasOverlappingSeats()) {
        warningEl.classList.remove('hidden');
    } else {
        warningEl.classList.add('hidden');
    }

    if (window.showModal) window.showModal('gas-captcha-modal');

    // Auto-start pump after 1 second
    setTimeout(startGasPump, 1000);
}

/**
 * Start gas pump animation
 * Increments amount at varying speeds
 */
export function startGasPump() {
    // Reset state
    gameState.gasPumpActive = true;
    gameState.gasPumpCurrent = 0;
    document.getElementById('gas-stop-btn').disabled = false;

    // Clear any existing interval first
    if (gameState.gasPumpInterval) {
        clearInterval(gameState.gasPumpInterval);
    }

    // Increment gas amount with dynamic speed based on distance from target
    gameState.gasPumpInterval = setInterval(() => {
        // Calculate distance from target
        const distanceFromTarget = Math.abs(gameState.gasPumpCurrent - gameState.gasPumpTarget);

        // Dynamic speed: very fast when far, slow when close
        let increment;
        if (distanceFromTarget > 3.0) {
            // Very far from target: very fast speed
            increment = 0.10 + Math.random() * 0.10; // 0.10-0.20 (super fast)
        } else if (distanceFromTarget > 2.0) {
            // Far from target: fast speed
            increment = 0.06 + Math.random() * 0.06; // 0.06-0.12
        } else if (distanceFromTarget > 1.0) {
            // Getting closer: moderate speed
            increment = 0.03 + Math.random() * 0.03; // 0.03-0.06
        } else if (distanceFromTarget > 0.5) {
            // Close to target: slow down
            increment = 0.02 + Math.random() * 0.01; // 0.02-0.03
        } else {
            // Very close to target: very slow
            increment = 0.01 + Math.random() * 0.01; // 0.01-0.02
        }

        gameState.gasPumpCurrent += increment;

        // Stop at $25 max and loop back
        if (gameState.gasPumpCurrent >= 25) {
            gameState.gasPumpCurrent = 0;
        }

        document.getElementById('gas-amount').textContent = `$${gameState.gasPumpCurrent.toFixed(2)}`;
    }, 30);
}

/**
 * Stop gas pump and check if target was hit
 * Allows 3 attempts with $0.10 tolerance
 */
export function stopGasPump() {
    if (gameState.gasPumpActive) {
        gameState.gasPumpActive = false;
        clearInterval(gameState.gasPumpInterval);
        document.getElementById('gas-stop-btn').disabled = true;

        // Check if player hit the target (within $0.10 tolerance)
        const difference = Math.abs(gameState.gasPumpCurrent - gameState.gasPumpTarget);
        const tolerance = 0.10;

        if (difference <= tolerance) {
            // Success!
            showGasCaptchaError('✅ Success! Processing your order...');
            setTimeout(() => {
                if (window.hideModal) window.hideModal('gas-captcha-modal');
                if (window.completeCheckout) window.completeCheckout();
            }, 1000);
        } else {
            // Failed attempt
            gameState.gasPumpAttempts--;
            document.getElementById('gas-attempts').textContent = gameState.gasPumpAttempts;

            if (gameState.gasPumpAttempts <= 0) {
                // Out of attempts - CAPTCHA failed
                showGasCaptchaError('You must be a robot! 🤖');
                setTimeout(() => {
                    if (window.hideModal) window.hideModal('gas-captcha-modal');
                }, 2000);
            } else {
                // Show error and restart pump
                const msg = difference < 1
                    ? `Close! Off by $${difference.toFixed(2)}. Try again!`
                    : `Missed by $${difference.toFixed(2)}. Try again!`;
                showGasCaptchaError(msg);
                setTimeout(() => {
                    document.getElementById('gas-captcha-error').classList.add('hidden');
                    startGasPump();
                }, 1500);
            }
        }
    }
}

/**
 * Show gas CAPTCHA error or success message
 * @param {string} message - Message to display
 */
export function showGasCaptchaError(message) {
    const errorEl = document.getElementById('gas-captcha-error');
    errorEl.textContent = message;
    errorEl.classList.remove('hidden');

    // Change color to green if it's a success message
    if (message.includes('✅') || message.includes('Success')) {
        errorEl.style.color = '#28a745';
    } else {
        errorEl.style.color = '#dc3545';
    }
}

/**
 * Cancel gas CAPTCHA and close modal
 */
export function cancelGasCaptcha() {
    clearInterval(gameState.gasPumpInterval);
    gameState.gasPumpActive = false;
    if (window.hideModal) window.hideModal('gas-captcha-modal');
}

// Export functions globally for event handlers
if (typeof window !== 'undefined') {
    window.showGasPumpCaptcha = showGasPumpCaptcha;
    window.stopGasPump = stopGasPump;
    window.cancelGasCaptcha = cancelGasCaptcha;
}
