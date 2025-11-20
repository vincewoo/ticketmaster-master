// Centralized game state management
import { GAME_DURATION, SEAT_COLS, TOTAL_SEATS } from './config.js';

/**
 * Global game state object
 * Single source of truth for all game data
 */
export const gameState = {
    isRunning: false,
    timeRemaining: GAME_DURATION,
    score: 0,
    cart: [],
    seats: [],
    timerInterval: null,
    captchaInterval: null,
    captchaTimeRemaining: 0,
    captchaCode: '',
    totalSaved: 0,
    ticketsPurchased: 0,
    targetTicketCount: 0, // DEPRECATED: Kept for backwards compatibility
    shoppingList: [], // Array of shopping list items {name, quantity, budget, completed}
    currentShoppingIndex: 0, // Current item being purchased
    skipsCount: 0,
    purchaseHistory: [], // Track all purchases for end game review

    // Price event state
    saleEventActive: false,
    surgeEventActive: false,
    saleStartTime: null,
    surgeStartTime: null,

    // Multiplayer state
    isMultiplayer: false,
    isHost: false,
    peer: null,
    connection: null,
    opponentScore: 0,
    opponentCart: [], // Track opponent's cart for competition warning

    // Screen size synchronization
    gridColumns: SEAT_COLS, // Default to 12 columns
    totalSeats: TOTAL_SEATS, // Default to 96 seats
    opponentGridConfig: null, // Opponent's grid configuration
    currentGridColumns: SEAT_COLS, // Current display grid columns (updates with responsive layout)

    // Gas pump CAPTCHA state
    gasPumpInterval: null,
    gasPumpTarget: 0,
    gasPumpCurrent: 0,
    gasPumpAttempts: 3,
    gasPumpActive: false,

    // Fishing CAPTCHA state
    fishingInterval: null,
    fishingBarPosition: 50, // Fish bar position (0-100)
    fishingZonePosition: 50, // Green zone position (0-100)
    fishingZoneSize: 18, // Size of green zone (reverted from 24 back to 18 for better balance)
    fishingZoneVelocity: 1.4, // Zone movement velocity (increased for more challenge)
    fishingZoneDirection: 1, // 1 = down, -1 = up
    fishingProgress: 0, // Catch progress (0-100)
    fishingButtonHeld: false,
    fishingActive: false,

    // NBA Free Throw CAPTCHA state
    nbaInterval: null,
    nbaStage: 1, // 1 = horizontal/aim, 2 = vertical/strength
    nbaIndicatorPosition: 50, // Current position (0-100)
    nbaIndicatorVelocity: 3, // Speed and direction
    nbaIndicatorDirection: 1, // 1 = forward, -1 = backward
    nbaFirstStageResult: null, // Store result from stage 1
    nbaActive: false,
    nbaCenterZoneSize: 18 // Size of success zone (percent)
};

/**
 * Reset game state to initial values
 * Used when starting a new game
 */
export function resetGameState() {
    gameState.isRunning = false;
    gameState.timeRemaining = GAME_DURATION;
    gameState.score = 0;
    gameState.cart = [];
    gameState.totalSaved = 0;
    gameState.ticketsPurchased = 0;
    gameState.shoppingList = [];
    gameState.currentShoppingIndex = 0;
    gameState.skipsCount = 0;
    gameState.purchaseHistory = [];
    gameState.saleEventActive = false;
    gameState.surgeEventActive = false;
    gameState.saleStartTime = null;
    gameState.surgeStartTime = null;

    // Clear intervals
    if (gameState.timerInterval) {
        clearInterval(gameState.timerInterval);
        gameState.timerInterval = null;
    }
    if (gameState.captchaInterval) {
        clearInterval(gameState.captchaInterval);
        gameState.captchaInterval = null;
    }
    if (gameState.gasPumpInterval) {
        clearInterval(gameState.gasPumpInterval);
        gameState.gasPumpInterval = null;
    }
    if (gameState.fishingInterval) {
        clearInterval(gameState.fishingInterval);
        gameState.fishingInterval = null;
    }
    if (gameState.nbaInterval) {
        clearInterval(gameState.nbaInterval);
        gameState.nbaInterval = null;
    }
}

/**
 * Reset multiplayer-specific state
 */
export function resetMultiplayerState() {
    gameState.isMultiplayer = false;
    gameState.isHost = false;
    gameState.peer = null;
    gameState.connection = null;
    gameState.opponentScore = 0;
    gameState.opponentCart = [];
    gameState.opponentGridConfig = null;
}
