// Fishing CAPTCHA implementation (Stardew Valley inspired)
import { gameState } from '../gameState.js';
import { FISHING_CAPTCHA_DURATION } from '../config.js';
import { hasOverlappingSeats } from '../cartManagement.js';

/**
 * Show fishing CAPTCHA modal
 * Player must keep bar in green zone to fill progress
 */
export function showFishingCaptcha() {
    // Reset fishing state
    gameState.fishingBarPosition = 50;
    gameState.fishingZonePosition = Math.random() * (100 - gameState.fishingZoneSize); // Randomize initial position
    gameState.fishingZoneVelocity = 1.4;
    gameState.fishingZoneDirection = Math.random() < 0.5 ? 1 : -1; // Randomize initial direction
    gameState.fishingProgress = 0;
    gameState.fishingButtonHeld = false;
    gameState.fishingActive = false;
    gameState.captchaTimeRemaining = FISHING_CAPTCHA_DURATION;

    // Check if opponent has overlapping seats in multiplayer
    const warningEl = document.getElementById('fishing-captcha-warning');
    if (gameState.isMultiplayer && hasOverlappingSeats()) {
        warningEl.classList.remove('hidden');
    } else {
        warningEl.classList.add('hidden');
    }

    document.getElementById('fishing-captcha-error').classList.add('hidden');
    if (window.showModal) window.showModal('fishing-captcha-modal');

    // Start countdown timer
    updateFishingTimer();
    gameState.captchaInterval = setInterval(() => {
        gameState.captchaTimeRemaining--;
        updateFishingTimer();
        if (gameState.captchaTimeRemaining <= 0) {
            clearInterval(gameState.captchaInterval);
            stopFishingGame();
            showFishingCaptchaError('Time expired! Try again.');
            setTimeout(() => {
                if (window.hideModal) window.hideModal('fishing-captcha-modal');
            }, 1500);
        }
    }, 1000);

    // Auto-start fishing game after 500ms
    setTimeout(startFishingGame, 500);
}

/**
 * Start fishing game loop
 * Updates bar position, zone movement, and progress
 */
export function startFishingGame() {
    gameState.fishingActive = true;
    gameState.fishingProgress = 0;
    updateFishingProgressBar();

    // Game loop - updates every 50ms
    gameState.fishingInterval = setInterval(() => {
        // Update fish bar position based on button held state
        if (gameState.fishingButtonHeld) {
            // Bar rises when button held (increased from 2.5 to 3.2 for better control)
            gameState.fishingBarPosition = Math.max(0, gameState.fishingBarPosition - 3.2);
        } else {
            // Bar falls when button not held (gravity)
            gameState.fishingBarPosition = Math.min(100, gameState.fishingBarPosition + 1.8);
        }

        // Smooth continuous zone movement (like Stardew Valley)
        // Speed increases gradually over time (reduced from 2.5x to 1.8x max for easier gameplay)
        const timeElapsed = FISHING_CAPTCHA_DURATION - gameState.captchaTimeRemaining;
        const speedMultiplier = 1 + (timeElapsed / FISHING_CAPTCHA_DURATION) * 0.8; // 1x to 1.8x speed

        // Move zone smoothly in current direction
        gameState.fishingZonePosition += gameState.fishingZoneDirection * gameState.fishingZoneVelocity * speedMultiplier;

        // Bounce at edges and occasionally change direction
        if (gameState.fishingZonePosition <= 0) {
            gameState.fishingZonePosition = 0;
            gameState.fishingZoneDirection = 1; // Move down
            // Randomize velocity slightly (increased range)
            gameState.fishingZoneVelocity = 1.0 + Math.random() * 0.8;
        } else if (gameState.fishingZonePosition >= 100 - gameState.fishingZoneSize) {
            gameState.fishingZonePosition = 100 - gameState.fishingZoneSize;
            gameState.fishingZoneDirection = -1; // Move up
            // Randomize velocity slightly (increased range)
            gameState.fishingZoneVelocity = 1.0 + Math.random() * 0.8;
        }

        // Occasionally change direction (adds unpredictability)
        if (Math.random() < 0.02) { // 2% chance per frame to change direction
            gameState.fishingZoneDirection *= -1;
            gameState.fishingZoneVelocity = 1.0 + Math.random() * 0.8;
        }

        // Check if bar is in green zone
        const barSize = 14; // Slightly larger bar
        const barTop = gameState.fishingBarPosition;
        const barBottom = gameState.fishingBarPosition + barSize;
        const zoneTop = gameState.fishingZonePosition;
        const zoneBottom = gameState.fishingZonePosition + gameState.fishingZoneSize;

        // Check for overlap
        const isInZone = !(barBottom < zoneTop || barTop > zoneBottom);

        if (isInZone) {
            // Increase progress when in zone (adjusted from 1.8 to 1.4 for better balance)
            gameState.fishingProgress = Math.min(100, gameState.fishingProgress + 1.4);
        } else {
            // Decrease progress when out of zone (decreased from 0.7 to 0.4 for slower loss)
            gameState.fishingProgress = Math.max(0, gameState.fishingProgress - 0.4);
        }

        // Update visual display
        drawFishingGame(isInZone);
        updateFishingProgressBar();

        // Check if caught fish (reached 100% progress)
        if (gameState.fishingProgress >= 100) {
            stopFishingGame();
            clearInterval(gameState.captchaInterval);
            showFishingCaptchaError('✅ Caught! Processing your order...');
            setTimeout(() => {
                if (window.hideModal) window.hideModal('fishing-captcha-modal');
                if (window.completeCheckout) window.completeCheckout();
            }, 1000);
        }
    }, 50);
}

/**
 * Stop fishing game loop
 */
export function stopFishingGame() {
    gameState.fishingActive = false;
    if (gameState.fishingInterval) {
        clearInterval(gameState.fishingInterval);
        gameState.fishingInterval = null;
    }
}

/**
 * Draw fishing game on canvas
 * @param {boolean} isInZone - Whether bar is in green zone
 */
export function drawFishingGame(isInZone) {
    const canvas = document.getElementById('fishing-canvas');
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw bubbles for ambiance
    const bubbleCount = 8;
    for (let i = 0; i < bubbleCount; i++) {
        const x = (i * width / bubbleCount) + (Date.now() / 20 % (width / bubbleCount));
        const y = height - ((Date.now() / 10 + i * 50) % height);
        const size = 3 + Math.sin(Date.now() / 200 + i) * 2;

        ctx.beginPath();
        ctx.arc(x % width, y, size, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    // Draw the fishing bar track (right side)
    const trackX = width - 60;
    const trackWidth = 40;
    const trackY = 80; // Increased from 20 to make room for fishing rod
    const trackHeight = height - 120; // Reduced to accommodate new trackY

    // Track background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(trackX, trackY, trackWidth, trackHeight);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.lineWidth = 2;
    ctx.strokeRect(trackX, trackY, trackWidth, trackHeight);

    // Draw green zone
    const zoneY = trackY + (gameState.fishingZonePosition / 100) * trackHeight;
    const zoneHeight = (gameState.fishingZoneSize / 100) * trackHeight;
    ctx.fillStyle = isInZone ? 'rgba(34, 197, 94, 0.9)' : 'rgba(34, 197, 94, 0.7)';
    ctx.fillRect(trackX, zoneY, trackWidth, zoneHeight);
    ctx.strokeStyle = '#15803d';
    ctx.lineWidth = 2;
    ctx.strokeRect(trackX, zoneY, trackWidth, zoneHeight);

    // Draw bent fishing rod at the top of the track (curved to show tension)
    const rodX = trackX + trackWidth / 2;
    const rodStartX = rodX + 40;
    const rodStartY = 50;
    const rodTipX = rodX - 50;
    const rodTipY = 10;

    // Calculate bend point (curved rod showing tension)
    const bendAmount = 25; // How much the rod bends
    const midX = (rodStartX + rodTipX) / 2;
    const midY = (rodStartY + rodTipY) / 2;
    const controlX = midX;
    const controlY = midY - bendAmount; // Bend upward (away from water)

    // Main rod (curved using quadratic curve for bend)
    ctx.strokeStyle = '#8b6f47';
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(rodStartX, rodStartY);
    ctx.quadraticCurveTo(controlX, controlY, rodTipX, rodTipY);
    ctx.stroke();

    // Rod segments (decorative lines along the curve)
    ctx.strokeStyle = '#654321';
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
        const t = (i + 1) / 4;
        // Calculate point on quadratic curve
        const segX = Math.pow(1 - t, 2) * rodStartX + 2 * (1 - t) * t * controlX + Math.pow(t, 2) * rodTipX;
        const segY = Math.pow(1 - t, 2) * rodStartY + 2 * (1 - t) * t * controlY + Math.pow(t, 2) * rodTipY;
        ctx.beginPath();
        ctx.arc(segX, segY, 1, 0, Math.PI * 2);
        ctx.stroke();
    }

    // Handle grip
    ctx.fillStyle = '#2c1810';
    ctx.strokeStyle = '#1a0f08';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(rodStartX - 5, rodStartY - 8, 30, 16, 4);
    ctx.fill();
    ctx.stroke();

    // Reel (circular)
    ctx.fillStyle = '#c0c0c0';
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(rodStartX + 8, rodStartY, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Reel center
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.arc(rodStartX + 8, rodStartY, 4, 0, Math.PI * 2);
    ctx.fill();

    // Draw fishing bobber (player controlled)
    const barSize = 14; // Match the size in game loop
    const barHeight = (barSize / 100) * trackHeight;
    // Constrain bar position so it doesn't go below track
    const maxBarPosition = 100 - barSize;
    const constrainedBarPosition = Math.min(gameState.fishingBarPosition, maxBarPosition);
    const barY = trackY + (constrainedBarPosition / 100) * trackHeight;

    // Draw bobber as a polished circle with red top and white bottom
    const bobberCenterX = trackX + trackWidth / 2;
    const bobberCenterY = barY + barHeight / 2;
    const bobberRadius = 16;

    // Draw fishing line from rod tip to bobber
    ctx.strokeStyle = 'rgba(60, 60, 60, 0.8)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(rodTipX, rodTipY);
    ctx.lineTo(bobberCenterX, bobberCenterY - bobberRadius);
    ctx.stroke();

    // Shadow for depth
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.beginPath();
    ctx.arc(bobberCenterX + 1, bobberCenterY + 2, bobberRadius, 0, Math.PI * 2);
    ctx.fill();

    // White bottom half with gradient effect
    const whiteGradient = ctx.createRadialGradient(
        bobberCenterX - 5, bobberCenterY + 5, 2,
        bobberCenterX, bobberCenterY, bobberRadius
    );
    whiteGradient.addColorStop(0, '#ffffff');
    whiteGradient.addColorStop(1, '#e5e5e5');
    ctx.fillStyle = whiteGradient;
    ctx.beginPath();
    ctx.arc(bobberCenterX, bobberCenterY, bobberRadius, 0, Math.PI * 2);
    ctx.fill();

    // Red top half with gradient effect
    const redGradient = ctx.createRadialGradient(
        bobberCenterX - 4, bobberCenterY - 5, 2,
        bobberCenterX, bobberCenterY - 5, bobberRadius
    );
    const redColor = gameState.fishingButtonHeld ? '#ff5555' : '#ee3333';
    const darkRedColor = gameState.fishingButtonHeld ? '#cc3333' : '#bb2222';
    redGradient.addColorStop(0, redColor);
    redGradient.addColorStop(1, darkRedColor);
    ctx.fillStyle = redGradient;
    ctx.beginPath();
    ctx.arc(bobberCenterX, bobberCenterY, bobberRadius, Math.PI, Math.PI * 2);
    ctx.fill();

    // Black outline
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(bobberCenterX, bobberCenterY, bobberRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Horizontal dividing line
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(bobberCenterX - bobberRadius, bobberCenterY);
    ctx.lineTo(bobberCenterX + bobberRadius, bobberCenterY);
    ctx.stroke();

    // Highlight for glossy effect
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.beginPath();
    ctx.arc(bobberCenterX - 5, bobberCenterY - 5, 4, 0, Math.PI * 2);
    ctx.fill();

    // Draw fish icon (left side)
    const fishX = 80 + Math.sin(Date.now() / 300) * 20;
    const fishY = height / 2 + Math.cos(Date.now() / 400) * 30;

    ctx.font = 'bold 48px Arial';
    ctx.fillStyle = isInZone ? '#fbbf24' : '#94a3b8';
    ctx.fillText('🐟', fishX, fishY);

    // Draw instruction text (left side near fish)
    ctx.font = 'bold 16px Arial';
    ctx.fillStyle = '#1e3a8a';
    ctx.textAlign = 'center';
    ctx.fillText('Keep the bobber', 100, height - 20);
    ctx.fillText('in the green zone!', 100, height - 5);
}

/**
 * Update fishing progress bar
 */
export function updateFishingProgressBar() {
    const progressFill = document.getElementById('fishing-progress-fill');
    progressFill.style.width = gameState.fishingProgress + '%';
}

/**
 * Update fishing timer display
 */
export function updateFishingTimer() {
    document.getElementById('fishing-timer').textContent = gameState.captchaTimeRemaining;
}

/**
 * Start fishing action (button pressed)
 */
export function startFishingAction() {
    if (gameState.fishingActive) {
        gameState.fishingButtonHeld = true;
    }
}

/**
 * Stop fishing action (button released)
 */
export function stopFishingAction() {
    gameState.fishingButtonHeld = false;
}

/**
 * Cancel fishing CAPTCHA and close modal
 */
export function cancelFishingCaptcha() {
    stopFishingGame();
    clearInterval(gameState.captchaInterval);
    if (window.hideModal) window.hideModal('fishing-captcha-modal');
}

/**
 * Show fishing CAPTCHA error or success message
 * @param {string} message - Message to display
 */
export function showFishingCaptchaError(message) {
    const errorEl = document.getElementById('fishing-captcha-error');
    errorEl.textContent = message;
    errorEl.classList.remove('hidden');
}

// Export functions globally for event handlers
if (typeof window !== 'undefined') {
    window.showFishingCaptcha = showFishingCaptcha;
    window.startFishingAction = startFishingAction;
    window.stopFishingAction = stopFishingAction;
    window.cancelFishingCaptcha = cancelFishingCaptcha;
}
