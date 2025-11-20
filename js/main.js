// Main entry point - imports and initializes all game modules

// Import core modules
import { gameState } from './gameState.js';
import { getGridConfig, applyGridLayout, getCurrentGridColumns } from './config.js';
import { generateSeats, renderSeats, updateSeatAvailability, updateSeatPrices, getPriceColor } from './seatManagement.js';
import { areSeatsAdjacent, hasOverlappingSeats, handleSeatClick, removeSeatFromCart, updateCart } from './cartManagement.js';
import { generateTargetTicketCount, generateShoppingList, getCurrentShoppingItem, generateEventTimes, initiateCheckout, completeCheckout, skipTarget } from './checkout.js';
import { initGame, startGame, updateTimer, updateDisplay, updateShoppingListDisplay, updateEventDisplay, endGame, showLoadingScreen, showModal, hideModal, setupEventListeners } from './gameFlow.js';
import { initMultiplayer, hostGame, joinGame, setupConnection, handleMultiplayerMessage, sendMultiplayerMessage, copyGameCode, cancelHost, cancelJoin } from './multiplayer.js';
import { setupDebugPanel } from './ui.js';

// Import CAPTCHA modules
import { showCaptcha, verifyCaptcha, cancelCaptcha } from './captcha/textCaptcha.js';
import { showGasPumpCaptcha, startGasPump, stopGasPump, cancelGasCaptcha } from './captcha/gasPumpCaptcha.js';
import { showPuzzleCaptcha, generatePuzzle, updatePuzzlePiecePosition, verifyPuzzle, cancelPuzzleCaptcha } from './captcha/puzzleCaptcha.js';
import { showFishingCaptcha, startFishingGame, stopFishingGame, startFishingAction, stopFishingAction, cancelFishingCaptcha } from './captcha/fishingCaptcha.js';
import { showNBACaptcha, handleNBAShoot, cancelNBACaptcha } from './captcha/nbaCaptcha.js';
import { showLunarLanderCAPTCHA } from './captcha/lunarLanderCaptcha.js';
import { showCAPTCHA as showTanksCaptcha } from './captcha/tanksCaptcha.js';
import { showCAPTCHA as showDartsCaptcha } from './captcha/dartsCaptcha.js';
import { showCAPTCHA as showChessCaptcha } from './captcha/chessCaptcha.js';
import { showCAPTCHA as showFlappyBirdCaptcha } from './captcha/flappyBirdCaptcha.js';
import { showCAPTCHA as showSkiFreeCaptcha } from './captcha/skiFreeCaptcha.js';
import { showCAPTCHA as showPoolCaptcha } from './captcha/poolCaptcha.js';
import { showCAPTCHA as showSimonCaptcha } from './captcha/simonCaptcha.js';
import { showCAPTCHA as showMinesweeperCaptcha } from './captcha/minesweeper.js';
import { showBlackjackCaptcha, handleBlackjackHit, handleBlackjackStand, cancelBlackjackCaptcha } from './captcha/blackjackCaptcha.js';
import { showCAPTCHA as showSnakeCaptcha } from './captcha/snakeCaptcha.js';

// Export all functions to window for global access
// Core game flow
window.initGame = initGame;
window.startGame = startGame;
window.updateTimer = updateTimer;
window.updateDisplay = updateDisplay;
window.updateEventDisplay = updateEventDisplay;
window.endGame = endGame;
window.showLoadingScreen = showLoadingScreen;
window.setupEventListeners = setupEventListeners;

// Modal utilities
window.showModal = showModal;
window.hideModal = hideModal;

// Seat management
window.generateSeats = generateSeats;
window.renderSeats = renderSeats;
window.updateSeatAvailability = updateSeatAvailability;
window.updateSeatPrices = updateSeatPrices;
window.getPriceColor = getPriceColor;

// Cart management
window.handleSeatClick = handleSeatClick;
window.removeSeatFromCart = removeSeatFromCart;
window.updateCart = updateCart;
window.areSeatsAdjacent = areSeatsAdjacent;
window.hasOverlappingSeats = hasOverlappingSeats;

// Checkout
window.generateTargetTicketCount = generateTargetTicketCount;
window.generateShoppingList = generateShoppingList;
window.getCurrentShoppingItem = getCurrentShoppingItem;
window.generateEventTimes = generateEventTimes;
window.initiateCheckout = initiateCheckout;
window.completeCheckout = completeCheckout;
window.skipTarget = skipTarget;

// Multiplayer
window.initMultiplayer = initMultiplayer;
window.hostGame = hostGame;
window.joinGame = joinGame;
window.setupConnection = setupConnection;
window.handleMultiplayerMessage = handleMultiplayerMessage;
window.sendMultiplayerMessage = sendMultiplayerMessage;
window.copyGameCode = copyGameCode;
window.cancelHost = cancelHost;
window.cancelJoin = cancelJoin;

// UI utilities
window.setupDebugPanel = setupDebugPanel;

// Text CAPTCHA
window.showCaptcha = showCaptcha;
window.verifyCaptcha = verifyCaptcha;
window.cancelCaptcha = cancelCaptcha;

// Gas Pump CAPTCHA
window.showGasPumpCaptcha = showGasPumpCaptcha;
window.startGasPump = startGasPump;
window.stopGasPump = stopGasPump;
window.cancelGasCaptcha = cancelGasCaptcha;

// Puzzle CAPTCHA
window.showPuzzleCaptcha = showPuzzleCaptcha;
window.generatePuzzle = generatePuzzle;
window.updatePuzzlePiecePosition = updatePuzzlePiecePosition;
window.verifyPuzzle = verifyPuzzle;
window.cancelPuzzleCaptcha = cancelPuzzleCaptcha;

// Fishing CAPTCHA
window.showFishingCaptcha = showFishingCaptcha;
window.startFishingGame = startFishingGame;
window.stopFishingGame = stopFishingGame;
window.startFishingAction = startFishingAction;
window.stopFishingAction = stopFishingAction;
window.cancelFishingCaptcha = cancelFishingCaptcha;

// NBA Free Throw CAPTCHA
window.showNBACaptcha = showNBACaptcha;
window.handleNBAShoot = handleNBAShoot;
window.cancelNBACaptcha = cancelNBACaptcha;

// Lunar Lander CAPTCHA
window.showLunarLanderCaptcha = showLunarLanderCAPTCHA;

// Tanks CAPTCHA
window.showTanksCaptcha = showTanksCaptcha;

// Darts CAPTCHA
window.showDartsCaptcha = showDartsCaptcha;

// Chess CAPTCHA
window.showChessCaptcha = showChessCaptcha;

// Flappy Bird CAPTCHA
window.showFlappyBirdCaptcha = showFlappyBirdCaptcha;

// SkiFree CAPTCHA
window.showSkiFreeCaptcha = showSkiFreeCaptcha;

// Pool CAPTCHA
window.showPoolCaptcha = showPoolCaptcha;

// Simon CAPTCHA
window.showSimonCaptcha = showSimonCaptcha;

// Minesweeper CAPTCHA
window.showMinesweeperCaptcha = showMinesweeperCaptcha;

// Blackjack CAPTCHA
window.showBlackjackCaptcha = showBlackjackCaptcha;
window.handleBlackjackHit = handleBlackjackHit;
window.handleBlackjackStand = handleBlackjackStand;
window.cancelBlackjackCaptcha = cancelBlackjackCaptcha;

// Snake CAPTCHA
window.showSnakeCaptcha = showSnakeCaptcha;

// Export gameState for debugging
window.gameState = gameState;

/**
 * Update current grid columns based on window size
 * Called on resize to keep validation in sync with responsive layout
 */
function updateCurrentGridColumns() {
    gameState.currentGridColumns = getCurrentGridColumns();
    // Re-render cart validation if cart has items
    if (gameState.cart.length > 0 && window.updateCart) {
        window.updateCart();
    }
}

// Initialize game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initGame();
    // Set initial grid columns
    updateCurrentGridColumns();

    // Update grid columns on window resize
    let resizeTimeout;
    window.addEventListener('resize', () => {
        // Debounce resize events to avoid excessive recalculations
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(updateCurrentGridColumns, 100);
    });
});
