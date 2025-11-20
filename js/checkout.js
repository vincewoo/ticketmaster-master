// Checkout process and shopping list management
import { gameState } from './gameState.js';
import { SKIP_PENALTY, GAME_DURATION } from './config.js';
import { areSeatsAdjacent, hasOverlappingSeats } from './cartManagement.js';
import { renderSeats } from './seatManagement.js';

// Family member names for shopping list
const FAMILY_NAMES = [
    "Brother Tom", "Sister Sarah", "Mom", "Dad", "Cousin Mike",
    "Aunt Linda", "Uncle Bob", "Grandma", "Grandpa", "Friend Alex",
    "Coworker Jessica", "Neighbor Chris", "Roommate Sam", "Best Friend Taylor"
];

/**
 * Generate shopping list for the game
 * Creates 4-6 shopping items with random family members, quantities, and budgets
 * @returns {Array} Shopping list array
 */
export function generateShoppingList() {
    const numItems = Math.floor(Math.random() * 3) + 4; // 4-6 items
    const shoppingList = [];
    const usedNames = new Set();
    const maxTarget = Math.min(gameState.gridColumns, 6);

    for (let i = 0; i < numItems; i++) {
        // Pick a unique name
        let name;
        do {
            name = FAMILY_NAMES[Math.floor(Math.random() * FAMILY_NAMES.length)];
        } while (usedNames.has(name));
        usedNames.add(name);

        // Random quantity (1 to maxTarget)
        const quantity = Math.floor(Math.random() * maxTarget) + 1;

        // Budget based on quantity with some variability
        // Base budget per ticket: $80-$150
        const budgetPerTicket = Math.floor(Math.random() * 70) + 80;
        const budget = quantity * budgetPerTicket;

        shoppingList.push({
            name,
            quantity,
            budget,
            completed: false
        });
    }

    // In multiplayer, host broadcasts the shopping list to guest
    if (gameState.isMultiplayer && gameState.isHost && window.sendMultiplayerMessage) {
        window.sendMultiplayerMessage({
            type: 'shoppingListUpdate',
            shoppingList: shoppingList
        });
    }

    return shoppingList;
}

/**
 * Get selected shopping list item
 * @returns {Object|null} Selected item or null if list is complete
 */
export function getCurrentShoppingItem() {
    if (gameState.selectedShoppingIndex >= gameState.shoppingList.length) {
        return null;
    }
    return gameState.shoppingList[gameState.selectedShoppingIndex];
}

/**
 * Select a shopping list item by index
 * @param {number} index - Index of item to select
 */
export function selectShoppingItem(index) {
    if (index >= 0 && index < gameState.shoppingList.length) {
        gameState.selectedShoppingIndex = index;
        if (window.updateCart) window.updateCart();
        if (window.updateDisplay) window.updateDisplay();
    }
}

/**
 * DEPRECATED: Generate random target ticket count for next purchase
 * Kept for backwards compatibility
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

/**
 * Initiate checkout process
 * Decides whether to show CAPTCHA or complete directly
 */
export function initiateCheckout() {
    if (gameState.cart.length === 0) return;

    // Array of all available CAPTCHA functions, defined at call time
    // This ensures all functions have been attached to the window object
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
        window.showBlackjackCaptcha,
        window.showSnakeCaptcha
    ];

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
 * Calculate score based on budget, update state, and move to next shopping item
 */
export function completeCheckout() {
    const currentItem = getCurrentShoppingItem();
    if (!currentItem) {
        // Shopping list is complete, shouldn't happen
        return;
    }

    // Check if purchase is valid (correct count and adjacent)
    const isAdjacent = areSeatsAdjacent(gameState.cart);
    const isCorrectCount = gameState.cart.length === currentItem.quantity;
    const isValid = isAdjacent && isCorrectCount;

    let totalPaid = 0;
    let savings = 0; // Savings vs base price (for tracking)

    gameState.cart.forEach(item => {
        totalPaid += item.price;
        const saving = item.basePrice - item.price;
        savings += saving;
    });

    // Calculate score based on budget (NEW SCORING SYSTEM)
    // Points = budget - totalPaid (if within budget and valid purchase)
    // If over budget, you can still purchase but get 0 points
    let finalScore = 0;
    if (isValid) {
        const budgetSavings = currentItem.budget - totalPaid;
        if (budgetSavings > 0) {
            // Under budget - you earn points!
            finalScore = budgetSavings;
        } else {
            // Over budget - no points earned (but not penalized)
            finalScore = 0;
        }
    }

    // Only award points and update stats if purchase is valid
    if (isValid) {
        gameState.score += finalScore;
        gameState.totalSaved += savings; // Track savings vs base price for stats
        gameState.ticketsPurchased += gameState.cart.length;

        // Mark current shopping item as completed
        currentItem.completed = true;

        // Add to purchase history for end game review
        gameState.purchaseHistory.push({
            seats: gameState.cart.map(item => ({
                seatId: item.seatId,
                price: item.price,
                basePrice: item.basePrice
            })),
            shoppingItem: {
                name: currentItem.name,
                quantity: currentItem.quantity,
                budget: currentItem.budget,
                totalPaid: totalPaid,
                budgetSavings: currentItem.budget - totalPaid
            },
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

    // Auto-select next incomplete item (or stay on current if it was the last)
    const nextIncompleteIndex = gameState.shoppingList.findIndex((item, idx) => !item.completed);
    if (nextIncompleteIndex !== -1) {
        gameState.selectedShoppingIndex = nextIncompleteIndex;
    }

    // Check if shopping list is complete - end game if so
    const allComplete = gameState.shoppingList.every(item => item.completed);
    if (allComplete) {
        // Shopping list complete! End the game
        if (window.endGame) {
            window.endGame();
        }
        return;
    }

    // Continue to next item
    renderSeats();
    if (window.updateCart) window.updateCart();
    if (window.updateDisplay) window.updateDisplay();
}

/**
 * Skip current shopping list item with penalty
 * Clears cart and moves to next item
 */
export function skipTarget() {
    if (!gameState.isRunning) return;

    const currentItem = getCurrentShoppingItem();
    if (!currentItem) return;

    // Apply penalty
    gameState.score -= SKIP_PENALTY;

    // Increment skip counter
    gameState.skipsCount++;

    // Mark current item as completed (but skipped)
    currentItem.completed = true;

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

    // Auto-select next incomplete item
    const nextIncompleteIndex = gameState.shoppingList.findIndex((item, idx) => !item.completed);
    if (nextIncompleteIndex !== -1) {
        gameState.selectedShoppingIndex = nextIncompleteIndex;
    }

    // Check if shopping list is complete - end game if so
    const allComplete = gameState.shoppingList.every(item => item.completed);
    if (allComplete) {
        // Shopping list complete! End the game
        if (window.endGame) {
            window.endGame();
        }
        return;
    }

    // Update display
    renderSeats();
    if (window.updateCart) window.updateCart();
    if (window.updateDisplay) window.updateDisplay();
}
