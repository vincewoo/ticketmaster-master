// Puzzle slider CAPTCHA implementation
import { gameState } from '../gameState.js';
import { CAPTCHA_DURATION } from '../config.js';
import { hasOverlappingSeats } from '../cartManagement.js';

/**
 * Show puzzle slider CAPTCHA modal
 * Player must slide puzzle piece to correct position
 */
export function showPuzzleCaptcha() {
    gameState.captchaTimeRemaining = CAPTCHA_DURATION;

    // Check if opponent has overlapping seats in multiplayer
    const warningEl = document.getElementById('puzzle-captcha-warning');
    if (gameState.isMultiplayer && hasOverlappingSeats()) {
        warningEl.classList.remove('hidden');
    } else {
        warningEl.classList.add('hidden');
    }

    document.getElementById('puzzle-captcha-error').classList.add('hidden');

    if (window.showModal) window.showModal('puzzle-captcha-modal');

    // Generate puzzle
    generatePuzzle();

    // Reset slider and puzzle piece position
    const slider = document.getElementById('puzzle-slider');
    const pieceContainer = document.getElementById('puzzle-piece-container');
    slider.value = 0;
    pieceContainer.style.left = '0px';

    // Start countdown
    updatePuzzleTimer();
    gameState.captchaInterval = setInterval(() => {
        gameState.captchaTimeRemaining--;
        updatePuzzleTimer();

        if (gameState.captchaTimeRemaining <= 0) {
            clearInterval(gameState.captchaInterval);
            showPuzzleCaptchaError('Time expired! Try again.');
            setTimeout(() => {
                if (window.hideModal) window.hideModal('puzzle-captcha-modal');
            }, 1500);
        }
    }, 1000);
}

/**
 * Generate puzzle image with cutout
 * Creates jigsaw piece and hole in random position
 */
export function generatePuzzle() {
    const canvas = document.getElementById('puzzle-canvas');
    const ctx = canvas.getContext('2d');
    const pieceCanvas = document.getElementById('puzzle-piece');
    const pieceCtx = pieceCanvas.getContext('2d');

    // Generate random gradient background
    const colors = [
        ['#667eea', '#764ba2'],
        ['#f093fb', '#f5576c'],
        ['#4facfe', '#00f2fe'],
        ['#43e97b', '#38f9d7'],
        ['#fa709a', '#fee140'],
        ['#30cfd0', '#330867']
    ];
    const colorPair = colors[Math.floor(Math.random() * colors.length)];

    // Draw background gradient
    const gradient = ctx.createLinearGradient(0, 0, 400, 250);
    gradient.addColorStop(0, colorPair[0]);
    gradient.addColorStop(1, colorPair[1]);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 400, 250);

    // Add some random shapes for visual interest
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    for (let i = 0; i < 10; i++) {
        ctx.beginPath();
        ctx.arc(Math.random() * 400, Math.random() * 250, Math.random() * 30 + 10, 0, Math.PI * 2);
        ctx.fill();
    }

    // Random position for the puzzle piece hole (with margins)
    const holeX = Math.floor(Math.random() * 280) + 60; // 60-340 range
    const holeY = 95; // Fixed Y position for simplicity
    const pieceSize = 60;
    const tabDepth = pieceSize * 0.12;

    // Store the correct position
    gameState.puzzleTargetX = holeX;
    gameState.puzzleTolerance = 15; // pixels of wiggle room

    // Create a temporary canvas to extract the puzzle piece properly
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 80;
    tempCanvas.height = 80;
    const tempCtx = tempCanvas.getContext('2d');

    // Draw the background section onto temp canvas
    const captureX = holeX - tabDepth;
    const captureY = holeY - tabDepth;
    tempCtx.drawImage(canvas, captureX, captureY, 80, 80, 0, 0, 80, 80);

    // Now use composite operation to cut out the jigsaw shape
    pieceCtx.clearRect(0, 0, pieceCanvas.width, pieceCanvas.height);

    // First, draw the jigsaw shape as a mask
    pieceCtx.fillStyle = '#000';
    drawJigsawPiece(pieceCtx, tabDepth, tabDepth, pieceSize);
    pieceCtx.fill();

    // Use composite operation to only show the background where the shape is
    pieceCtx.globalCompositeOperation = 'source-in';
    pieceCtx.drawImage(tempCanvas, 0, 0);
    pieceCtx.globalCompositeOperation = 'source-over';

    // Add outline to the piece
    pieceCtx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
    pieceCtx.lineWidth = 2;
    drawJigsawPiece(pieceCtx, tabDepth, tabDepth, pieceSize);
    pieceCtx.stroke();

    // Add subtle inner shadow for depth
    pieceCtx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    pieceCtx.lineWidth = 1;
    drawJigsawPiece(pieceCtx, tabDepth + 1, tabDepth + 1, pieceSize - 2);
    pieceCtx.stroke();

    // Cut out the hole in main canvas using composite operations
    ctx.save();

    // Draw the jigsaw shape to use as a mask
    drawJigsawPiece(ctx, holeX, holeY, pieceSize);
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';

    // Draw the hole background (no shadow)
    ctx.fillStyle = '#1a1a1a';
    drawJigsawPiece(ctx, holeX, holeY, pieceSize);
    ctx.fill();

    // Add subtle stroke around hole for definition
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.lineWidth = 1;
    drawJigsawPiece(ctx, holeX, holeY, pieceSize);
    ctx.stroke();

    ctx.restore();
}

/**
 * Draw a realistic jigsaw piece shape with tabs and blanks
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} size - Piece size
 */
export function drawJigsawPiece(ctx, x, y, size) {
    const tabSize = size * 0.15; // Size of the tab/blank
    const tabDepth = size * 0.12; // How far tab extends out
    const mid = size / 2;

    ctx.beginPath();

    // Start at top-left corner
    ctx.moveTo(x, y);

    // Top edge with tab (sticking out)
    ctx.lineTo(x + mid - tabSize, y);
    ctx.quadraticCurveTo(x + mid - tabSize, y - tabDepth, x + mid, y - tabDepth);
    ctx.quadraticCurveTo(x + mid + tabSize, y - tabDepth, x + mid + tabSize, y);
    ctx.lineTo(x + size, y);

    // Right edge with blank (indent)
    ctx.lineTo(x + size, y + mid - tabSize);
    ctx.quadraticCurveTo(x + size + tabDepth, y + mid - tabSize, x + size + tabDepth, y + mid);
    ctx.quadraticCurveTo(x + size + tabDepth, y + mid + tabSize, x + size, y + mid + tabSize);
    ctx.lineTo(x + size, y + size);

    // Bottom edge with blank (indent)
    ctx.lineTo(x + mid + tabSize, y + size);
    ctx.quadraticCurveTo(x + mid + tabSize, y + size + tabDepth, x + mid, y + size + tabDepth);
    ctx.quadraticCurveTo(x + mid - tabSize, y + size + tabDepth, x + mid - tabSize, y + size);
    ctx.lineTo(x, y + size);

    // Left edge (straight)
    ctx.lineTo(x, y);

    ctx.closePath();
}

/**
 * Update puzzle timer display
 */
export function updatePuzzleTimer() {
    document.getElementById('puzzle-timer').textContent = gameState.captchaTimeRemaining;
}

/**
 * Update puzzle piece position based on slider
 */
export function updatePuzzlePiecePosition() {
    const slider = document.getElementById('puzzle-slider');
    const pieceContainer = document.getElementById('puzzle-piece-container');
    pieceContainer.style.left = slider.value + 'px';
}

/**
 * Verify puzzle position
 * Checks if piece is within tolerance of target
 */
export function verifyPuzzle() {
    const slider = document.getElementById('puzzle-slider');
    const currentX = parseInt(slider.value);
    const targetX = gameState.puzzleTargetX;
    const tolerance = gameState.puzzleTolerance;

    // Check if within tolerance
    if (Math.abs(currentX - targetX) <= tolerance) {
        clearInterval(gameState.captchaInterval);
        if (window.hideModal) window.hideModal('puzzle-captcha-modal');
        if (window.completeCheckout) window.completeCheckout();
    } else {
        showPuzzleCaptchaError('Not quite right! Adjust the slider.');
    }
}

/**
 * Show puzzle CAPTCHA error
 * @param {string} message - Error message to display
 */
export function showPuzzleCaptchaError(message) {
    const errorEl = document.getElementById('puzzle-captcha-error');
    errorEl.textContent = message;
    errorEl.classList.remove('hidden');
}

/**
 * Cancel puzzle CAPTCHA and close modal
 */
export function cancelPuzzleCaptcha() {
    clearInterval(gameState.captchaInterval);
    if (window.hideModal) window.hideModal('puzzle-captcha-modal');
}

// Export functions globally for event handlers
if (typeof window !== 'undefined') {
    window.showPuzzleCaptcha = showPuzzleCaptcha;
    window.updatePuzzlePiecePosition = updatePuzzlePiecePosition;
    window.verifyPuzzle = verifyPuzzle;
    window.cancelPuzzleCaptcha = cancelPuzzleCaptcha;
}
