// Checkout process and target ticket management
import { gameState } from './gameState.js';
import { SKIP_PENALTY, GAME_DURATION } from './config.js';
import { areSeatsAdjacent, hasOverlappingSeats } from './cartManagement.js';
import { renderSeats } from './seatManagement.js';

/**
 * Generate random target ticket count for next purchase
 * @returns {number} Target ticket count (1 to max)
 */
export function generateTargetTicketCount() {
    // Max target is limited by grid columns (can't exceed row width)
    const maxTarget = Math.min(gameState.gridColumns, 6);
    const target = Math.floor(Math.random() * maxTarget) + 1; // 1 to maxTarget tickets

    // In multiplayer, host broadcasts the target to guest
    if (gameState.isMultiplayer && gameState.isHost && window.sendMultiplayerMessage) {
        window.sendMultiplayerMessage({
            type: 'targetUpdate',
            targetTicketCount: target
        });
    }

    return target;
}

/**
 * Generate random event times for sale and surge pricing
 * @returns {Object} Event times { saleStart, surgeStart }
 */
export function generateEventTimes() {
    // Events are 20 seconds long
    const EVENT_DURATION = 20;

    // Generate random start time for sale event (10-90 seconds into game)
    // This ensures the event can complete before game ends
    const saleStart = Math.floor(Math.random() * (GAME_DURATION - EVENT_DURATION - 30)) + 10;

    // Generate random start time for surge event, ensuring no overlap with sale
    let surgeStart;
    do {
        surgeStart = Math.floor(Math.random() * (GAME_DURATION - EVENT_DURATION - 30)) + 10;
    } while (Math.abs(surgeStart - saleStart) < EVENT_DURATION + 5); // Ensure 5 second buffer between events

    return {
        saleStart: GAME_DURATION - saleStart, // Convert to countdown timer format
        surgeStart: GAME_DURATION - surgeStart
    };
}

// Array of all available CAPTCHA functions
const captchaFunctions = [
    window.showCaptcha,
    window.showGasPumpCaptcha,
    window.showPuzzleCaptcha,
    window.showFishingCaptcha,
    window.showNBACaptcha,
    window.showLunarLanderCaptcha,
    window.showTanksCaptcha,
    window.showDartsCaptcha,
    window.showChessCaptcha,
    window.showFlappyBirdCaptcha,
    window.showSkiFreeCaptcha,
    window.showPoolCaptcha,
    window.showSimonCaptcha,
    window.showMinesweeperCaptcha,
    window.showBlackjackCaptcha
];

/**
 * Initiate checkout process
 * Decides whether to show CAPTCHA or complete directly
 */
export function initiateCheckout() {
    if (gameState.cart.length === 0) return;

    // Always show CAPTCHA if competing with opponent for same seats
    const hasCompetition = gameState.isMultiplayer && hasOverlappingSeats();

    // Otherwise 60% chance of CAPTCHA
    if (hasCompetition || Math.random() < 0.6) {
        // Filter out any undefined functions before selecting
        const availableCaptchas = captchaFunctions.filter(fn => typeof fn === 'function');
        if (availableCaptchas.length > 0) {
            // Randomly choose a CAPTCHA function from the array
            const randomIndex = Math.floor(Math.random() * availableCaptchas.length);
            const selectedCaptcha = availableCaptchas[randomIndex];
            selectedCaptcha();
        } else {
            // Fallback if no CAPTCHAs are available for some reason
            completeCheckout();
        }
    } else {
        completeCheckout();
    }
}

/**
 * Complete checkout process
 * Calculate score, update state, and generate new target
 */
export function completeCheckout() {
    // Check if purchase is valid (correct count and adjacent)
    const isAdjacent = areSeatsAdjacent(gameState.cart);
    const isCorrectCount = gameState.cart.length === gameState.targetTicketCount;
    const isValid = isAdjacent && isCorrectCount;

    let total = 0;
    let savings = 0;

    gameState.cart.forEach(item => {
        total += item.price;
        // Calculate savings (positive if below base price, negative if above)
        const saving = item.basePrice - item.price;
        savings += saving;
    });

    // Apply quantity multiplier bonus (only to positive savings, not penalties)
    // 1 ticket: 1x, 2 tickets: 1.2x, 3 tickets: 1.4x, 4 tickets: 1.6x, 5 tickets: 1.8x, 6 tickets: 2x
    let finalScore;
    if (savings > 0) {
        // Multiply positive savings by quantity bonus
        const quantityMultiplier = 1 + (gameState.cart.length - 1) * 0.2;
        finalScore = savings * quantityMultiplier;
    } else {
        // Penalties are not multiplied (flat deduction)
        finalScore = savings;
    }

    // Only award/deduct points if purchase is valid
    if (isValid) {
        gameState.score += finalScore;
        gameState.totalSaved += savings;
        gameState.ticketsPurchased += gameState.cart.length;

        // Add to purchase history for end game review
        gameState.purchaseHistory.push({
            seats: gameState.cart.map(item => ({
                seatId: item.seatId,
                price: item.price,
                basePrice: item.basePrice
            })),
            timestamp: Date.now()
        });
    }

    // Remove purchased seats from board permanently
    gameState.cart.forEach(item => {
        const seat = gameState.seats.find(s => s.id === item.seatId);
        if (seat) {
            seat.isAvailable = false;
            seat.inCart = false;
            seat.isPurchased = true; // Mark as permanently purchased

            // Notify opponent in multiplayer
            if (gameState.isMultiplayer && window.sendMultiplayerMessage) {
                window.sendMultiplayerMessage({
                    type: 'seatClaimed',
                    seatId: seat.id
                });
            }
        }
    });

    // Send score update in multiplayer
    if (gameState.isMultiplayer && window.sendMultiplayerMessage) {
        window.sendMultiplayerMessage({
            type: 'scoreUpdate',
            score: gameState.score
        });
    }

    // Clear cart
    gameState.cart = [];

    // Send cart update to opponent (now empty after checkout)
    if (gameState.isMultiplayer && window.sendMultiplayerMessage) {
        window.sendMultiplayerMessage({
            type: 'cartUpdate',
            cart: []
        });
    }

    // Generate new target for next purchase
    gameState.targetTicketCount = generateTargetTicketCount();

    renderSeats();
    if (window.updateCart) window.updateCart();
    if (window.updateDisplay) window.updateDisplay();
}

/**
 * Skip current target with penalty
 * Clears cart and generates new target
 */
export function skipTarget() {
    if (!gameState.isRunning) return;

    // Apply penalty
    gameState.score -= SKIP_PENALTY;

    // Increment skip counter
    gameState.skipsCount++;

    // Clear any items in cart
    gameState.cart.forEach(item => {
        const seat = gameState.seats.find(s => s.id === item.seatId);
        if (seat) {
            seat.inCart = false;
        }
    });
    gameState.cart = [];

    // Send cart update to opponent (now empty after skip)
    if (gameState.isMultiplayer && window.sendMultiplayerMessage) {
        window.sendMultiplayerMessage({
            type: 'cartUpdate',
            cart: []
        });
    }

    // Generate new target
    gameState.targetTicketCount = generateTargetTicketCount();

    // Update display
    renderSeats();
    if (window.updateCart) window.updateCart();
    if (window.updateDisplay) window.updateDisplay();
}
