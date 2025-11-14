// NBA Live 2003 Free Throw CAPTCHA implementation
import { gameState } from '../gameState.js';
import { CAPTCHA_DURATION } from '../config.js';
import { hasOverlappingSeats } from '../cartManagement.js';

/**
 * Show NBA Free Throw CAPTCHA modal
 * Two-stage timing challenge: horizontal aim + vertical power
 */
export function showNBACaptcha() {
    // Reset NBA state
    gameState.nbaStage = 1;
    gameState.nbaIndicatorPosition = 50;
    // Random velocity between 8 and 12 for variety and challenge
    gameState.nbaIndicatorVelocity = 8 + Math.random() * 4;
    gameState.nbaIndicatorDirection = 1;
    gameState.nbaFirstStageResult = null;
    gameState.nbaActive = false;
    gameState.captchaTimeRemaining = CAPTCHA_DURATION;

    // Check if opponent has overlapping seats in multiplayer
    const warningEl = document.getElementById('nba-captcha-warning');
    if (gameState.isMultiplayer && hasOverlappingSeats()) {
        warningEl.classList.remove('hidden');
    } else {
        warningEl.classList.add('hidden');
    }

    // Update stage text
    document.getElementById('nba-stage-text').textContent = 'STAGE 1: AIM (Horizontal)';
    document.getElementById('nba-captcha-error').classList.add('hidden');

    const shootBtn = document.getElementById('nba-shoot-btn');
    shootBtn.disabled = false;

    // Remove any existing event listeners by cloning the button
    const newShootBtn = shootBtn.cloneNode(true);
    shootBtn.parentNode.replaceChild(newShootBtn, shootBtn);

    // Add fresh event listener
    newShootBtn.addEventListener('click', handleNBAShoot);
    console.log('NBA CAPTCHA: Event listener attached to button');

    if (window.showModal) window.showModal('nba-captcha-modal');

    // Start countdown timer
    updateNBATimer();
    gameState.captchaInterval = setInterval(() => {
        gameState.captchaTimeRemaining--;
        updateNBATimer();
        if (gameState.captchaTimeRemaining <= 0) {
            clearInterval(gameState.captchaInterval);
            stopNBAGame();
            showNBACaptchaError('Time expired! Try again.');
            setTimeout(() => {
                if (window.hideModal) window.hideModal('nba-captcha-modal');
            }, 1500);
        }
    }, 1000);

    // Auto-start NBA game after 500ms
    setTimeout(startNBAGame, 500);
}

/**
 * Start NBA free throw game loop
 * Animates indicator bouncing across meter
 */
export function startNBAGame() {
    console.log('NBA CAPTCHA: Starting game, stage:', gameState.nbaStage);
    gameState.nbaActive = true;

    // Game loop - updates every 50ms for smooth animation
    gameState.nbaInterval = setInterval(() => {
        // Move indicator in current direction
        gameState.nbaIndicatorPosition += gameState.nbaIndicatorDirection * gameState.nbaIndicatorVelocity;

        // Bounce at edges
        if (gameState.nbaIndicatorPosition >= 100) {
            gameState.nbaIndicatorPosition = 100;
            gameState.nbaIndicatorDirection = -1;
        } else if (gameState.nbaIndicatorPosition <= 0) {
            gameState.nbaIndicatorPosition = 0;
            gameState.nbaIndicatorDirection = 1;
        }

        // Draw the meter
        drawNBAMeter();
    }, 50);
}

/**
 * Stop NBA game loop
 */
export function stopNBAGame() {
    gameState.nbaActive = false;
    if (gameState.nbaInterval) {
        clearInterval(gameState.nbaInterval);
        gameState.nbaInterval = null;
    }
}

// Cache for the hardwood floor background
let cachedFloorCanvas = null;

/**
 * Generate hardwood floor background (only once, then cached)
 */
function generateHardwoodFloor(width, height) {
    if (cachedFloorCanvas) {
        return cachedFloorCanvas;
    }

    // Create off-screen canvas for the floor
    cachedFloorCanvas = document.createElement('canvas');
    cachedFloorCanvas.width = width;
    cachedFloorCanvas.height = height;
    const ctx = cachedFloorCanvas.getContext('2d');

    // Base wood color
    ctx.fillStyle = '#d4824a';
    ctx.fillRect(0, 0, width, height);

    // Use seeded random for consistent pattern
    let seed = 12345;
    const seededRandom = () => {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
    };

    // Draw vertical wood planks with varying widths and colors
    let x = 0;
    while (x < width) {
        // Random plank width between 8-20px (thinner, more realistic)
        const plankWidth = 8 + seededRandom() * 12;

        // Slight color variation for each plank
        const colorVariation = seededRandom() * 20 - 10;
        const r = Math.min(255, Math.max(0, 212 + colorVariation));
        const g = Math.min(255, Math.max(0, 130 + colorVariation));
        const b = Math.min(255, Math.max(0, 74 + colorVariation));
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.fillRect(x, 0, plankWidth, height);

        // Draw plank edge (darker border)
        ctx.strokeStyle = 'rgba(139, 69, 19, 0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();

        // Add random wood grain lines within the plank (running vertically)
        const grainLines = Math.floor(seededRandom() * 2) + 1;
        for (let g = 0; g < grainLines; g++) {
            const grainY = seededRandom() * height * 0.3;
            const grainLength = height * (0.2 + seededRandom() * 0.6);
            const grainXPos = x + seededRandom() * plankWidth;
            ctx.strokeStyle = `rgba(139, 69, 19, ${0.08 + seededRandom() * 0.12})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(grainXPos, grainY);
            ctx.lineTo(grainXPos, grainY + grainLength);
            ctx.stroke();
        }

        x += plankWidth;
    }

    return cachedFloorCanvas;
}

/**
 * Draw NBA T-Meter on canvas
 * Shows T-shape with both horizontal and vertical bars
 */
export function drawNBAMeter() {
    const canvas = document.getElementById('nba-canvas');
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw cached hardwood floor
    const floorCanvas = generateHardwoodFloor(width, height);
    ctx.drawImage(floorCanvas, 0, 0);

    // Draw NBA logo in top right corner (taller and thinner like real logo)
    const logoWidth = 35;
    const logoHeight = 70;
    const logoX = width - logoWidth - 10;
    const logoY = 10;
    const cornerRadius = 8;

    // Draw rounded rectangle background with blue and red sections
    ctx.save();

    // Create rounded rectangle path
    ctx.beginPath();
    ctx.moveTo(logoX + cornerRadius, logoY);
    ctx.lineTo(logoX + logoWidth - cornerRadius, logoY);
    ctx.arcTo(logoX + logoWidth, logoY, logoX + logoWidth, logoY + cornerRadius, cornerRadius);
    ctx.lineTo(logoX + logoWidth, logoY + logoHeight - cornerRadius);
    ctx.arcTo(logoX + logoWidth, logoY + logoHeight, logoX + logoWidth - cornerRadius, logoY + logoHeight, cornerRadius);
    ctx.lineTo(logoX + cornerRadius, logoY + logoHeight);
    ctx.arcTo(logoX, logoY + logoHeight, logoX, logoY + logoHeight - cornerRadius, cornerRadius);
    ctx.lineTo(logoX, logoY + cornerRadius);
    ctx.arcTo(logoX, logoY, logoX + cornerRadius, logoY, cornerRadius);
    ctx.closePath();

    // Blue section (left half) - clip and fill
    ctx.save();
    ctx.clip();
    ctx.fillStyle = '#0046ad';
    ctx.fillRect(logoX, logoY, logoWidth / 2, logoHeight);
    ctx.restore();

    // Red section (right half) - clip and fill
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(logoX + cornerRadius, logoY);
    ctx.lineTo(logoX + logoWidth - cornerRadius, logoY);
    ctx.arcTo(logoX + logoWidth, logoY, logoX + logoWidth, logoY + cornerRadius, cornerRadius);
    ctx.lineTo(logoX + logoWidth, logoY + logoHeight - cornerRadius);
    ctx.arcTo(logoX + logoWidth, logoY + logoHeight, logoX + logoWidth - cornerRadius, logoY + logoHeight, cornerRadius);
    ctx.lineTo(logoX + cornerRadius, logoY + logoHeight);
    ctx.arcTo(logoX, logoY + logoHeight, logoX, logoY + logoHeight - cornerRadius, cornerRadius);
    ctx.lineTo(logoX, logoY + cornerRadius);
    ctx.arcTo(logoX, logoY, logoX + cornerRadius, logoY, cornerRadius);
    ctx.closePath();
    ctx.clip();
    ctx.fillStyle = '#c8102e';
    ctx.fillRect(logoX + logoWidth / 2, logoY, logoWidth / 2, logoHeight);
    ctx.restore();

    // White border
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(logoX + cornerRadius, logoY);
    ctx.lineTo(logoX + logoWidth - cornerRadius, logoY);
    ctx.arcTo(logoX + logoWidth, logoY, logoX + logoWidth, logoY + cornerRadius, cornerRadius);
    ctx.lineTo(logoX + logoWidth, logoY + logoHeight - cornerRadius);
    ctx.arcTo(logoX + logoWidth, logoY + logoHeight, logoX + logoWidth - cornerRadius, logoY + logoHeight, cornerRadius);
    ctx.lineTo(logoX + cornerRadius, logoY + logoHeight);
    ctx.arcTo(logoX, logoY + logoHeight, logoX, logoY + logoHeight - cornerRadius, cornerRadius);
    ctx.lineTo(logoX, logoY + cornerRadius);
    ctx.arcTo(logoX, logoY, logoX + cornerRadius, logoY, cornerRadius);
    ctx.closePath();
    ctx.stroke();

    ctx.restore();

    // Draw silhouette using emoji (person with basketball pose)
    // Use shadowColor/shadowBlur trick to make emoji appear white
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.shadowColor = 'white';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Draw emoji multiple times with white to create silhouette effect
    ctx.font = '48px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Create white silhouette by drawing emoji with filter
    ctx.filter = 'brightness(0) invert(1)';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('⛹', logoX + logoWidth / 2, logoY + logoHeight / 2 + 2);

    ctx.restore();

    // Calculate center zone bounds
    const centerStart = 50 - (gameState.nbaCenterZoneSize / 2);
    const centerEnd = 50 + (gameState.nbaCenterZoneSize / 2);

    // Define T-shape dimensions
    const hBarX = 50;
    const hBarY = height / 2 - 30;
    const hBarWidth = width - 100;
    const hBarHeight = 60;

    const vBarX = width / 2 - 30;
    const vBarY = 50;
    const vBarWidth = 60;
    const vBarHeight = height - 100;

    // HORIZONTAL BAR (Aim)
    // Draw track background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(hBarX, hBarY, hBarWidth, hBarHeight);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.lineWidth = 3;
    ctx.strokeRect(hBarX, hBarY, hBarWidth, hBarHeight);

    // Draw center success zone (green) - only the sides, not the center square
    const hZoneX = hBarX + (centerStart / 100) * hBarWidth;
    const hZoneWidth = (gameState.nbaCenterZoneSize / 100) * hBarWidth;
    ctx.fillStyle = 'rgba(34, 197, 94, 0.7)';
    // Draw left portion (before vertical bar)
    ctx.fillRect(hZoneX, hBarY, vBarX - hZoneX, hBarHeight);
    // Draw right portion (after vertical bar)
    ctx.fillRect(vBarX + vBarWidth, hBarY, (hZoneX + hZoneWidth) - (vBarX + vBarWidth), hBarHeight);

    ctx.strokeStyle = '#15803d';
    ctx.lineWidth = 2;
    ctx.strokeRect(hZoneX, hBarY, hZoneWidth, hBarHeight);

    // VERTICAL BAR (Power)
    // Draw track background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(vBarX, vBarY, vBarWidth, vBarHeight);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.lineWidth = 3;
    ctx.strokeRect(vBarX, vBarY, vBarWidth, vBarHeight);

    // Draw center success zone (green) - only the sides, not the center square
    const vZoneY = vBarY + (centerStart / 100) * vBarHeight;
    const vZoneHeight = (gameState.nbaCenterZoneSize / 100) * vBarHeight;
    ctx.fillStyle = 'rgba(34, 197, 94, 0.7)';
    // Draw top portion (before horizontal bar)
    ctx.fillRect(vBarX, vZoneY, vBarWidth, hBarY - vZoneY);
    // Draw bottom portion (after horizontal bar)
    ctx.fillRect(vBarX, hBarY + hBarHeight, vBarWidth, (vZoneY + vZoneHeight) - (hBarY + hBarHeight));

    ctx.strokeStyle = '#15803d';
    ctx.lineWidth = 2;
    ctx.strokeRect(vBarX, vZoneY, vBarWidth, vZoneHeight);

    // Draw center square (single green square at intersection)
    ctx.fillStyle = 'rgba(34, 197, 94, 0.7)';
    ctx.fillRect(vBarX, hBarY, vBarWidth, hBarHeight);
    ctx.strokeStyle = '#15803d';
    ctx.lineWidth = 2;
    ctx.strokeRect(vBarX, hBarY, vBarWidth, hBarHeight);

    // Draw the active indicator based on current stage
    const isHorizontal = gameState.nbaStage === 1;

    if (isHorizontal) {
        // STAGE 1: Draw basketball emoji on horizontal bar
        // Clamp position to keep ball within bar bounds (with padding for emoji size)
        const ballSize = 20; // Half of emoji visual size
        const minPos = (ballSize / hBarWidth) * 100;
        const maxPos = 100 - minPos;
        const clampedPos = Math.max(minPos, Math.min(maxPos, gameState.nbaIndicatorPosition));
        const indicatorX = hBarX + (clampedPos / 100) * hBarWidth;

        ctx.font = '40px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🏀', indicatorX, hBarY + hBarHeight / 2);

        // Draw label for active stage
        ctx.fillStyle = '#1e3c72';
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText('🎯 AIM', width / 2, 35);

    } else {
        // STAGE 2: Draw basketball emoji on vertical bar
        // Clamp position to keep ball within bar bounds (with padding for emoji size)
        const ballSize = 20; // Half of emoji visual size
        const minPos = (ballSize / vBarHeight) * 100;
        const maxPos = 100 - minPos;
        const clampedPos = Math.max(minPos, Math.min(maxPos, gameState.nbaIndicatorPosition));
        const indicatorY = vBarY + (clampedPos / 100) * vBarHeight;

        ctx.font = '40px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🏀', vBarX + vBarWidth / 2, indicatorY);

        // Draw label for active stage
        ctx.fillStyle = '#1e3c72';
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText('⚡ POWER', width / 2, 35);

        // Show stage 1 result if available
        if (gameState.nbaFirstStageResult !== null) {
            ctx.font = 'bold 16px Arial';
            ctx.fillStyle = gameState.nbaFirstStageResult ? '#15803d' : '#dc2626';
            ctx.fillText(
                gameState.nbaFirstStageResult ? '✓ Aim: Perfect!' : '✗ Aim: Miss',
                width / 2,
                height - 10
            );
        }
    }
}

/**
 * Update NBA timer display
 */
export function updateNBATimer() {
    document.getElementById('nba-timer').textContent = gameState.captchaTimeRemaining;
}

/**
 * Handle NBA shoot button click
 * Validates timing and progresses through stages
 */
export function handleNBAShoot() {
    if (!gameState.nbaActive) {
        console.log('NBA CAPTCHA: Game not active, cannot shoot');
        return;
    }

    console.log('NBA CAPTCHA: Shoot button clicked, position:', gameState.nbaIndicatorPosition);

    // Temporarily stop the game to freeze the indicator position
    stopNBAGame();

    // Calculate center zone bounds
    const centerStart = 50 - (gameState.nbaCenterZoneSize / 2);
    const centerEnd = 50 + (gameState.nbaCenterZoneSize / 2);

    // Check if indicator is in center zone
    const isInCenter = gameState.nbaIndicatorPosition >= centerStart &&
                       gameState.nbaIndicatorPosition <= centerEnd;

    if (gameState.nbaStage === 1) {
        // Stage 1: Horizontal/Aim
        gameState.nbaFirstStageResult = isInCenter;

        if (isInCenter) {
            // Success on stage 1 - move to stage 2
            gameState.nbaStage = 2;
            gameState.nbaIndicatorPosition = 50;
            gameState.nbaIndicatorDirection = 1;
            document.getElementById('nba-stage-text').textContent = 'STAGE 2: POWER (Vertical)';
            showNBACaptchaError('✓ Good aim! Now set the power!');
            // Restart game for stage 2 after brief delay
            setTimeout(() => {
                document.getElementById('nba-captcha-error').classList.add('hidden');
                startNBAGame();
            }, 1000);
        } else {
            // Failed stage 1
            showNBACaptchaError('✗ Missed! Try again.');
            setTimeout(() => {
                // Reset to stage 1
                gameState.nbaStage = 1;
                gameState.nbaIndicatorPosition = 50;
                gameState.nbaIndicatorDirection = 1;
                gameState.nbaFirstStageResult = null;
                document.getElementById('nba-stage-text').textContent = 'STAGE 1: AIM (Horizontal)';
                document.getElementById('nba-captcha-error').classList.add('hidden');
                // Restart game after failure
                startNBAGame();
            }, 1000);
        }
    } else {
        // Stage 2: Vertical/Power
        if (isInCenter && gameState.nbaFirstStageResult) {
            // SUCCESS - both stages completed!
            clearInterval(gameState.captchaInterval);
            showNBACaptchaError('🏀 SWISH! Perfect shot!');
            setTimeout(() => {
                if (window.hideModal) window.hideModal('nba-captcha-modal');
                if (window.completeCheckout) window.completeCheckout();
            }, 1000);
        } else {
            // Failed stage 2 or stage 1 was failed
            clearInterval(gameState.captchaInterval);
            showNBACaptchaError('✗ Brick! Free throw missed.');
            setTimeout(() => {
                if (window.hideModal) window.hideModal('nba-captcha-modal');
            }, 1500);
        }
    }
}

/**
 * Cancel NBA CAPTCHA and close modal
 */
export function cancelNBACaptcha() {
    stopNBAGame();
    clearInterval(gameState.captchaInterval);
    if (window.hideModal) window.hideModal('nba-captcha-modal');
}

/**
 * Show NBA CAPTCHA error or success message
 * @param {string} message - Message to display
 */
export function showNBACaptchaError(message) {
    const errorEl = document.getElementById('nba-captcha-error');
    errorEl.textContent = message;
    errorEl.classList.remove('hidden');

    // Change color based on message type
    if (message.includes('✓') || message.includes('🏀') || message.includes('Perfect')) {
        errorEl.style.color = '#28a745';
    } else {
        errorEl.style.color = '#dc3545';
    }
}

// Export functions globally for event handlers
if (typeof window !== 'undefined') {
    window.showNBACaptcha = showNBACaptcha;
    window.handleNBAShoot = handleNBAShoot;
    window.cancelNBACaptcha = cancelNBACaptcha;
}
