// dartsCaptcha.js - Steady hand darts CAPTCHA challenge
import { gameState } from '../gameState.js';
import { hasOverlappingSeats } from '../cartManagement.js';

// Module-level state
let animationId = null;
let timerInterval = null;
let dartsCaptchaState = null;

// Constants
const TIMER_DURATION = 15;
const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 400;
const DARTBOARD_X = 300;
const DARTBOARD_Y = 200;
const DARTBOARD_RADIUS = 120;
const BULLSEYE_RADIUS = 25;
const CROSSHAIR_ORBIT_RADIUS = 100;
const CROSSHAIR_SIZE = 20;

// Dartboard colors
const COLORS = {
    background: '#2a2a2a',
    board: '#1a1a1a',
    bullseye: '#dc2626',
    ring25: '#ef4444',
    ring50: '#fbbf24',
    ring75: '#22c55e',
    ring100: '#3b82f6',
    crosshair: '#ffffff',
    crosshairGood: '#22c55e',
    dart: '#8b4513',
    dartTip: '#c0c0c0'
};

/**
 * Main export function - shows the Darts CAPTCHA
 */
export function showCAPTCHA() {
    // Get DOM elements
    const modal = document.getElementById('darts-captcha-modal');
    const canvas = document.getElementById('darts-canvas');
    const ctx = canvas.getContext('2d');
    const throwButton = document.getElementById('darts-throw-btn');
    const cancelButton = document.getElementById('darts-cancel-btn');
    const timerDisplay = document.getElementById('darts-timer');
    const feedbackEl = document.getElementById('darts-feedback');
    const warningEl = document.getElementById('darts-captcha-warning');

    // Check for multiplayer competition warning
    if (gameState.isMultiplayer && hasOverlappingSeats()) {
        warningEl.classList.remove('hidden');
    } else {
        warningEl.classList.add('hidden');
    }

    // Initialize local game state with random motion parameters
    dartsCaptchaState = {
        timeRemaining: TIMER_DURATION,
        angle1: Math.random() * Math.PI * 2, // First oscillation angle
        angle2: Math.random() * Math.PI * 2, // Second oscillation angle
        speed1: 0.03 + Math.random() * 0.02, // Speed of first oscillation
        speed2: 0.025 + Math.random() * 0.015, // Speed of second oscillation
        radius1: 40 + Math.random() * 30, // Radius of first oscillation (40-70px)
        radius2: 30 + Math.random() * 20, // Radius of second oscillation (30-50px)
        crosshairX: DARTBOARD_X,
        crosshairY: DARTBOARD_Y,
        dart: null, // { x, y, targetX, targetY, progress }
        isFlying: false,
        hasThrown: false
    };

    // Clear feedback
    feedbackEl.textContent = '';
    feedbackEl.className = 'captcha-error';

    // Set up canvas
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;

    /**
     * Renders the dartboard, crosshair, and dart
     */
    function render() {
        // Clear canvas
        ctx.fillStyle = COLORS.background;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Draw dartboard
        drawDartboard(ctx);

        // Draw crosshair (if not thrown yet)
        if (!dartsCaptchaState.hasThrown) {
            drawCrosshair(ctx);
        }

        // Draw dart if flying or landed
        if (dartsCaptchaState.dart) {
            drawDart(ctx, dartsCaptchaState.dart);
        }
    }

    /**
     * Draws a traditional dartboard with alternating black/cream segments
     */
    function drawDartboard(ctx) {
        const x = DARTBOARD_X;
        const y = DARTBOARD_Y;
        const numSegments = 20;
        const segmentAngle = (Math.PI * 2) / numSegments;

        // Draw outer black background
        ctx.fillStyle = '#1a1a1a';
        ctx.beginPath();
        ctx.arc(x, y, DARTBOARD_RADIUS + 10, 0, Math.PI * 2);
        ctx.fill();

        // Draw the 20 segments with alternating colors
        for (let i = 0; i < numSegments; i++) {
            const startAngle = i * segmentAngle - Math.PI / 2; // Start from top
            const endAngle = startAngle + segmentAngle;

            // Alternate between black and cream for segments
            const isBlack = i % 2 === 0;
            const segmentColor = isBlack ? '#000000' : '#f5f5dc';

            // Draw main segment (outer area)
            ctx.fillStyle = segmentColor;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.arc(x, y, DARTBOARD_RADIUS, startAngle, endAngle);
            ctx.closePath();
            ctx.fill();
        }

        // Draw double ring (outer green/red ring)
        for (let i = 0; i < numSegments; i++) {
            const startAngle = i * segmentAngle - Math.PI / 2;
            const endAngle = startAngle + segmentAngle;
            const color = i % 2 === 0 ? '#dc2626' : '#16a34a'; // Red/Green alternating

            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(x, y, DARTBOARD_RADIUS, startAngle, endAngle);
            ctx.arc(x, y, DARTBOARD_RADIUS * 0.88, endAngle, startAngle, true);
            ctx.closePath();
            ctx.fill();
        }

        // Draw outer scoring area (black/cream segments continue)
        for (let i = 0; i < numSegments; i++) {
            const startAngle = i * segmentAngle - Math.PI / 2;
            const endAngle = startAngle + segmentAngle;
            const isBlack = i % 2 === 0;
            const segmentColor = isBlack ? '#000000' : '#f5f5dc';

            ctx.fillStyle = segmentColor;
            ctx.beginPath();
            ctx.arc(x, y, DARTBOARD_RADIUS * 0.88, startAngle, endAngle);
            ctx.arc(x, y, DARTBOARD_RADIUS * 0.58, endAngle, startAngle, true);
            ctx.closePath();
            ctx.fill();
        }

        // Draw triple ring (inner green/red ring)
        for (let i = 0; i < numSegments; i++) {
            const startAngle = i * segmentAngle - Math.PI / 2;
            const endAngle = startAngle + segmentAngle;
            const color = i % 2 === 0 ? '#dc2626' : '#16a34a'; // Red/Green alternating

            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(x, y, DARTBOARD_RADIUS * 0.58, startAngle, endAngle);
            ctx.arc(x, y, DARTBOARD_RADIUS * 0.46, endAngle, startAngle, true);
            ctx.closePath();
            ctx.fill();
        }

        // Draw inner scoring area (black/cream segments)
        for (let i = 0; i < numSegments; i++) {
            const startAngle = i * segmentAngle - Math.PI / 2;
            const endAngle = startAngle + segmentAngle;
            const isBlack = i % 2 === 0;
            const segmentColor = isBlack ? '#000000' : '#f5f5dc';

            ctx.fillStyle = segmentColor;
            ctx.beginPath();
            ctx.arc(x, y, DARTBOARD_RADIUS * 0.46, startAngle, endAngle);
            ctx.arc(x, y, BULLSEYE_RADIUS * 1.5, endAngle, startAngle, true);
            ctx.closePath();
            ctx.fill();
        }

        // Draw outer bull (green ring around bullseye)
        ctx.fillStyle = '#16a34a';
        ctx.beginPath();
        ctx.arc(x, y, BULLSEYE_RADIUS * 1.5, 0, Math.PI * 2);
        ctx.fill();

        // Draw bullseye (red center)
        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        ctx.arc(x, y, BULLSEYE_RADIUS, 0, Math.PI * 2);
        ctx.fill();

        // Draw separator lines between segments
        ctx.strokeStyle = '#d4af37'; // Gold wire color
        ctx.lineWidth = 1;
        for (let i = 0; i < numSegments; i++) {
            const angle = i * segmentAngle - Math.PI / 2;
            const outerX = x + Math.cos(angle) * DARTBOARD_RADIUS;
            const outerY = y + Math.sin(angle) * DARTBOARD_RADIUS;

            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(outerX, outerY);
            ctx.stroke();
        }

        // Draw outer border
        ctx.strokeStyle = '#d4af37';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x, y, DARTBOARD_RADIUS, 0, Math.PI * 2);
        ctx.stroke();
    }

    /**
     * Draws the moving crosshair with enhanced visibility
     */
    function drawCrosshair(ctx) {
        const x = dartsCaptchaState.crosshairX;
        const y = dartsCaptchaState.crosshairY;

        // Check if over bullseye
        const distanceFromCenter = Math.sqrt(
            Math.pow(x - DARTBOARD_X, 2) + Math.pow(y - DARTBOARD_Y, 2)
        );
        const isOverBullseye = distanceFromCenter <= BULLSEYE_RADIUS;

        const color = isOverBullseye ? COLORS.crosshairGood : COLORS.crosshair;

        // Draw outer glow/outline for visibility
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(x - CROSSHAIR_SIZE, y);
        ctx.lineTo(x + CROSSHAIR_SIZE, y);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(x, y - CROSSHAIR_SIZE);
        ctx.lineTo(x, y + CROSSHAIR_SIZE);
        ctx.stroke();

        // Draw main crosshair lines (bright color on top)
        ctx.strokeStyle = color;
        ctx.lineWidth = 4;
        ctx.shadowBlur = 15;
        ctx.shadowColor = color;

        ctx.beginPath();
        ctx.moveTo(x - CROSSHAIR_SIZE, y);
        ctx.lineTo(x + CROSSHAIR_SIZE, y);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(x, y - CROSSHAIR_SIZE);
        ctx.lineTo(x, y + CROSSHAIR_SIZE);
        ctx.stroke();

        // Draw center circle with outline
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.arc(x, y, 7, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.shadowBlur = 10;
        ctx.shadowColor = color;
        ctx.beginPath();
        ctx.arc(x, y, 7, 0, Math.PI * 2);
        ctx.stroke();

        ctx.shadowBlur = 0;
    }

    /**
     * Draws a larger, more visible dart
     */
    function drawDart(ctx, dart) {
        const x = dart.x;
        const y = dart.y;
        const scale = 2; // Make dart 2x larger

        // Dart body (brown) with black outline
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.fillStyle = COLORS.dart;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - 3 * scale, y + 15 * scale);
        ctx.lineTo(x + 3 * scale, y + 15 * scale);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Dart tip (silver) with black outline
        ctx.fillStyle = COLORS.dartTip;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - 2 * scale, y + 8 * scale);
        ctx.lineTo(x + 2 * scale, y + 8 * scale);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Dart flights (red) with black outline
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.moveTo(x - 4 * scale, y + 15 * scale);
        ctx.lineTo(x - 6 * scale, y + 20 * scale);
        ctx.lineTo(x, y + 18 * scale);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(x + 4 * scale, y + 15 * scale);
        ctx.lineTo(x + 6 * scale, y + 20 * scale);
        ctx.lineTo(x, y + 18 * scale);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Add a small white dot at the tip for extra visibility
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
    }

    /**
     * Updates crosshair position (Lissajous curve - combining two oscillations)
     * This creates organic, figure-8 like patterns that pass through the bullseye
     */
    function updateCrosshair() {
        if (dartsCaptchaState.hasThrown) return;

        // Update both angles at different speeds
        dartsCaptchaState.angle1 += dartsCaptchaState.speed1;
        dartsCaptchaState.angle2 += dartsCaptchaState.speed2;

        // Combine two circular motions with different radii and speeds
        // This creates a Lissajous curve pattern that moves through the bullseye
        const offsetX1 = Math.cos(dartsCaptchaState.angle1) * dartsCaptchaState.radius1;
        const offsetX2 = Math.cos(dartsCaptchaState.angle2 * 1.3) * dartsCaptchaState.radius2;

        const offsetY1 = Math.sin(dartsCaptchaState.angle1 * 1.2) * dartsCaptchaState.radius1;
        const offsetY2 = Math.sin(dartsCaptchaState.angle2) * dartsCaptchaState.radius2;

        dartsCaptchaState.crosshairX = DARTBOARD_X + offsetX1 + offsetX2;
        dartsCaptchaState.crosshairY = DARTBOARD_Y + offsetY1 + offsetY2;
    }

    /**
     * Updates dart flight animation with easing
     */
    function updateDart() {
        if (!dartsCaptchaState.dart || !dartsCaptchaState.isFlying) return;

        const dart = dartsCaptchaState.dart;
        dart.progress += 0.08; // Faster flight speed

        if (dart.progress >= 1) {
            // Dart has landed
            dart.progress = 1;
            dartsCaptchaState.isFlying = false;
            dart.x = dart.targetX;
            dart.y = dart.targetY;

            // Check if hit bullseye
            checkHit();
        } else {
            // Use easing function for more realistic dart flight
            // Ease-out cubic: starts fast, slows down as it approaches target
            const eased = 1 - Math.pow(1 - dart.progress, 3);

            // Interpolate position with easing
            dart.x = dart.startX + (dart.targetX - dart.startX) * eased;
            dart.y = dart.startY + (dart.targetY - dart.startY) * eased;
        }
    }

    /**
     * Checks if dart hit the bullseye
     */
    function checkHit() {
        const dart = dartsCaptchaState.dart;
        const distance = Math.sqrt(
            Math.pow(dart.x - DARTBOARD_X, 2) + Math.pow(dart.y - DARTBOARD_Y, 2)
        );

        if (distance <= BULLSEYE_RADIUS) {
            // Success!
            showFeedback('🎯 Bullseye! Verification complete!', true);
            setTimeout(() => {
                handleSuccess();
            }, 1500);
        } else {
            // Miss - show distance and allow retry
            const distanceFromEdge = Math.floor(distance - BULLSEYE_RADIUS);
            showFeedback(`Miss! ${distanceFromEdge}px from bullseye. Try again!`, false);

            // Reset for next attempt
            setTimeout(() => {
                dartsCaptchaState.hasThrown = false;
                dartsCaptchaState.dart = null;
                feedbackEl.textContent = '';
            }, 1500);
        }
    }

    /**
     * Animation loop
     */
    function animate() {
        updateCrosshair();
        updateDart();
        render();
        animationId = requestAnimationFrame(animate);
    }

    /**
     * Handles throw button click
     */
    function handleThrow() {
        if (dartsCaptchaState.hasThrown || dartsCaptchaState.isFlying) return;

        // Create dart starting from bottom center of canvas, flying to crosshair position
        const startX = DARTBOARD_X; // Bottom center horizontally
        const startY = CANVAS_HEIGHT + 20; // Just below canvas (off-screen)

        dartsCaptchaState.dart = {
            startX: startX,
            startY: startY,
            targetX: dartsCaptchaState.crosshairX,
            targetY: dartsCaptchaState.crosshairY,
            x: startX,
            y: startY,
            progress: 0
        };

        dartsCaptchaState.hasThrown = true;
        dartsCaptchaState.isFlying = true;
    }

    /**
     * Shows feedback message
     */
    function showFeedback(message, isSuccess) {
        feedbackEl.textContent = message;
        feedbackEl.className = isSuccess ? 'captcha-success' : 'captcha-error';
    }

    /**
     * Handles successful completion
     */
    function handleSuccess() {
        cleanup();
        if (window.completeCheckout) window.completeCheckout();
    }

    /**
     * Cleanup function
     */
    function cleanup() {
        // Clear intervals
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }

        // Cancel animation
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }

        // Remove event listeners
        throwButton.removeEventListener('click', handleThrow);
        cancelButton.removeEventListener('click', handleCancel);

        // Clear state
        dartsCaptchaState = null;

        // Hide modal
        modal.classList.add('hidden');
    }

    /**
     * Handles cancel button
     */
    function handleCancel() {
        cleanup();
    }

    // Set up event listeners
    throwButton.addEventListener('click', handleThrow);
    cancelButton.addEventListener('click', handleCancel);

    // Start timer
    timerDisplay.textContent = TIMER_DURATION;
    timerInterval = setInterval(() => {
        dartsCaptchaState.timeRemaining--;
        timerDisplay.textContent = dartsCaptchaState.timeRemaining;

        if (dartsCaptchaState.timeRemaining <= 0) {
            clearInterval(timerInterval);
            showFeedback('⏱ Time expired! Purchase canceled.', false);
            setTimeout(() => {
                cleanup();
            }, 2000);
        }
    }, 1000);

    // Show modal and start animation
    modal.classList.remove('hidden');
    animate();
}
