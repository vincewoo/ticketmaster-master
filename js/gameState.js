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
    targetTicketCount: 0,
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
    fishingActive: false
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
