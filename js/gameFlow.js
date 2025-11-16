// Game flow management - initialization, game loop, and end game logic
import { gameState, resetGameState, resetMultiplayerState } from './gameState.js';
import { GAME_DURATION, getGridConfig, applyGridLayout } from './config.js';
import { generateSeats, renderSeats, updateSeatAvailability, updateSeatPrices } from './seatManagement.js';
import { updateCart } from './cartManagement.js';
import { generateTargetTicketCount, generateEventTimes } from './checkout.js';

/**
 * Initialize game
 * Sets up grid layout and prepares seats
 */
export function initGame() {
    // Set initial grid based on screen size (must be before generateSeats)
    if (!gameState.isMultiplayer) {
        const config = getGridConfig();
        applyGridLayout(config);
    }

    generateSeats();
    renderSeats();
    setupEventListeners();
}

/**
 * Start game
 * Resets state, generates initial game data, and begins game loop
 */
export function startGame() {
    hideModal('start-modal');
    hideModal('host-modal');
    hideModal('join-modal');

    gameState.isRunning = true;
    gameState.timeRemaining = GAME_DURATION;
    gameState.score = 0;
    gameState.cart = [];
    gameState.totalSaved = 0;
    gameState.ticketsPurchased = 0;
    gameState.skipsCount = 0;
    gameState.purchaseHistory = [];
    gameState.opponentScore = 0;
    gameState.opponentCart = [];
    gameState.targetTicketCount = generateTargetTicketCount();

    // Generate random event times (host only in multiplayer)
    if (!gameState.isMultiplayer || gameState.isHost) {
        const eventTimes = generateEventTimes();
        gameState.saleStartTime = eventTimes.saleStart;
        gameState.surgeStartTime = eventTimes.surgeStart;
        gameState.saleEventActive = false;
        gameState.surgeEventActive = false;

        // In multiplayer, host broadcasts event times to guest
        if (gameState.isMultiplayer && gameState.isHost) {
            if (window.sendMultiplayerMessage) {
                window.sendMultiplayerMessage({
                    type: 'eventTimes',
                    saleStartTime: gameState.saleStartTime,
                    surgeStartTime: gameState.surgeStartTime
                });
            }
        }
    }

    // Show/hide opponent score display
    const opponentScoreDisplay = document.getElementById('opponent-score-display');
    if (gameState.isMultiplayer) {
        opponentScoreDisplay.classList.remove('hidden');
    } else {
        opponentScoreDisplay.classList.add('hidden');
    }

    generateSeats();
    renderSeats();
    updateCart();
    updateDisplay();

    // Start game timer
    gameState.timerInterval = setInterval(updateTimer, 1000);
}

/**
 * Update game timer
 * Called every second - handles price events and dynamic updates
 */
export function updateTimer() {
    gameState.timeRemaining--;

    // Check for price event activations (20 seconds each)
    // Sale event (all discounts)
    if (gameState.timeRemaining === gameState.saleStartTime) {
        gameState.saleEventActive = true;
        updateEventDisplay();
    } else if (gameState.saleEventActive && gameState.timeRemaining === gameState.saleStartTime - 20) {
        gameState.saleEventActive = false;
        updateEventDisplay();
    }

    // Surge event (all premiums)
    if (gameState.timeRemaining === gameState.surgeStartTime) {
        gameState.surgeEventActive = true;
        updateEventDisplay();
    } else if (gameState.surgeEventActive && gameState.timeRemaining === gameState.surgeStartTime - 20) {
        gameState.surgeEventActive = false;
        updateEventDisplay();
    }

    updateDisplay();

    // Update seat availability every 2 seconds (on even seconds)
    if (gameState.timeRemaining % 2 === 0) {
        const changedSeats = updateSeatAvailability();

        // Broadcast changes to guest in multiplayer
        if (gameState.isMultiplayer && gameState.isHost && changedSeats && changedSeats.length > 0) {
            if (window.sendMultiplayerMessage) {
                window.sendMultiplayerMessage({
                    type: 'availabilityUpdate',
                    seats: changedSeats
                });
            }
        }
    }

    // Update seat prices every 3 seconds
    if (gameState.timeRemaining % 3 === 0) {
        const priceUpdates = updateSeatPrices();

        // Broadcast price changes to guest in multiplayer
        if (gameState.isMultiplayer && gameState.isHost && priceUpdates && priceUpdates.length > 0) {
            if (window.sendMultiplayerMessage) {
                window.sendMultiplayerMessage({
                    type: 'priceUpdate',
                    seats: priceUpdates
                });
            }
        }
    }

    if (gameState.timeRemaining <= 0) {
        endGame();
    }
}

/**
 * Update display
 * Updates timer, score, and target displays
 */
export function updateDisplay() {
    const timerEl = document.getElementById('timer');
    const scoreEl = document.getElementById('score');
    const targetEl = document.getElementById('target-tickets');
    const opponentScoreEl = document.getElementById('opponent-score');

    const minutes = Math.floor(gameState.timeRemaining / 60);
    const seconds = gameState.timeRemaining % 60;
    timerEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    scoreEl.textContent = Math.floor(gameState.score);
    targetEl.textContent = gameState.targetTicketCount;

    // Update opponent score in multiplayer
    if (gameState.isMultiplayer) {
        opponentScoreEl.textContent = Math.floor(gameState.opponentScore);
    }
}

/**
 * Update event banner display
 * Shows sale or surge event notifications
 */
export function updateEventDisplay() {
    let eventBanner = document.getElementById('event-banner');

    // Create banner if it doesn't exist
    if (!eventBanner) {
        eventBanner = document.createElement('div');
        eventBanner.id = 'event-banner';
        eventBanner.className = 'event-banner';
        document.getElementById('game-container').insertBefore(
            eventBanner,
            document.querySelector('.game-header')
        );
    }

    // Update banner based on active event
    if (gameState.saleEventActive) {
        eventBanner.textContent = '🎉 FLASH SALE! All prices discounted for 20 seconds! 🎉';
        eventBanner.className = 'event-banner sale-event';
        eventBanner.style.display = 'block';
    } else if (gameState.surgeEventActive) {
        eventBanner.textContent = '⚡ SURGE PRICING! High demand - prices increased for 20 seconds! ⚡';
        eventBanner.className = 'event-banner surge-event';
        eventBanner.style.display = 'block';
    } else {
        eventBanner.style.display = 'none';
    }
}

/**
 * Show loading screen with countdown animation
 * Simulates queue/waiting experience
 * @param {Function} callback - Function to call when animation completes
 */
export function showLoadingScreen(callback) {
    const LOADING_DURATION = 3000; // 3 seconds
    const UPDATE_INTERVAL = 100; // Update every 100ms for smooth animation

    // Generate random fan count between 500 and 2,000 (more realistic for a 3 second wait)
    const initialFanCount = Math.floor(Math.random() * 1500) + 500;

    // Show loading modal
    showModal('loading-modal');

    // Reset elements
    const fanCountEl = document.getElementById('fan-count');
    const progressBar = document.getElementById('progress-bar');
    const stickFigure = document.getElementById('stick-figure');
    const readyMessage = document.getElementById('ready-message');
    const loadingStatus = document.getElementById('loading-status');

    fanCountEl.textContent = `${initialFanCount.toLocaleString()} fans in front of you`;
    fanCountEl.style.display = 'block';
    progressBar.style.width = '75%';
    stickFigure.style.left = '25%';
    readyMessage.classList.add('hidden');
    loadingStatus.classList.remove('hidden');

    let elapsed = 0;
    const loadingInterval = setInterval(() => {
        elapsed += UPDATE_INTERVAL;
        const progress = Math.min(elapsed / LOADING_DURATION, 1); // 0 to 1

        // Update progress bar (shrinks from right, starts at 75%) and stick figure position (moves right from 25% to 100%)
        const percentage = progress * 100;
        const remainingPercentage = 75 - (percentage * 0.75); // Shrinks from 75% to 0%
        const stickPosition = 25 + (percentage * 0.75); // Moves from 25% to 100%
        progressBar.style.width = `${remainingPercentage}%`;
        stickFigure.style.left = `${stickPosition}%`;

        // Update fan count (count down to 0)
        const currentFanCount = Math.floor(initialFanCount * (1 - progress));
        fanCountEl.textContent = `${currentFanCount.toLocaleString()} fans in front of you`;

        // At 50% progress (1.5s), show ready message with flash animation
        if (progress >= 0.5 && readyMessage.classList.contains('hidden')) {
            // Immediately hide the fan count element completely
            fanCountEl.style.display = 'none';
            loadingStatus.classList.add('hidden');
            // Show ready message without delay
            readyMessage.classList.remove('hidden');
        }

        // When complete
        if (elapsed >= LOADING_DURATION) {
            clearInterval(loadingInterval);
            setTimeout(() => {
                hideModal('loading-modal');
                if (callback) callback();
            }, 200);
        }
    }, UPDATE_INTERVAL);
}

/**
 * End game
 * Displays final stats and purchase history
 */
export function endGame() {
    gameState.isRunning = false;
    clearInterval(gameState.timerInterval);

    // Notify opponent in multiplayer
    if (gameState.isMultiplayer) {
        if (window.sendMultiplayerMessage) {
            window.sendMultiplayerMessage({
                type: 'gameEnd'
            });
        }
    }

    // Show final stats
    let finalScoreText = Math.floor(gameState.score);
    if (gameState.isMultiplayer) {
        const playerScore = Math.floor(gameState.score);
        const opponentScore = Math.floor(gameState.opponentScore);

        if (playerScore > opponentScore) {
            finalScoreText = `${playerScore} - You Win! 🎉`;
        } else if (playerScore < opponentScore) {
            finalScoreText = `${playerScore} - You Lose`;
        } else {
            finalScoreText = `${playerScore} - Tie!`;
        }
    }

    const SKIP_PENALTY = 50;
    document.getElementById('final-score').textContent = finalScoreText;
    document.getElementById('tickets-bought').textContent = gameState.ticketsPurchased;
    document.getElementById('total-saved').textContent = `$${gameState.totalSaved.toFixed(2)}`;
    document.getElementById('skips-count').textContent = gameState.skipsCount;
    document.getElementById('skip-penalty-total').textContent = `${gameState.skipsCount * SKIP_PENALTY} pts`;

    // Populate purchase history
    const purchaseHistoryContainer = document.getElementById('purchase-history');
    const purchaseHistorySection = document.getElementById('purchase-history-section');

    if (gameState.purchaseHistory.length > 0) {
        purchaseHistorySection.classList.remove('hidden');
        purchaseHistoryContainer.innerHTML = '';

        gameState.purchaseHistory.forEach((purchase, index) => {
            const purchaseDiv = document.createElement('div');
            purchaseDiv.className = 'purchase-group';

            // Calculate totals for this purchase
            let totalFaceValue = 0;
            let totalPaid = 0;
            purchase.seats.forEach(seat => {
                totalFaceValue += seat.basePrice;
                totalPaid += seat.price;
            });
            const totalSavings = totalFaceValue - totalPaid;
            const totalDiscountPercent = ((totalSavings / totalFaceValue) * 100).toFixed(1);

            const headerDiv = document.createElement('div');
            headerDiv.className = 'purchase-group-header';
            headerDiv.textContent = `Purchase ${index + 1}`;
            purchaseDiv.appendChild(headerDiv);

            // Sort seats by ID (e.g., A1, A2, B1, etc.)
            const sortedSeats = [...purchase.seats].sort((a, b) => {
                // Extract row letter and column number
                const rowA = a.seatId.charAt(0);
                const rowB = b.seatId.charAt(0);
                const colA = parseInt(a.seatId.substring(1));
                const colB = parseInt(b.seatId.substring(1));

                // Sort by row first, then by column
                if (rowA !== rowB) {
                    return rowA.localeCompare(rowB);
                }
                return colA - colB;
            });

            sortedSeats.forEach(seat => {
                const seatDiv = document.createElement('div');
                seatDiv.className = 'purchase-item';

                const discount = ((seat.basePrice - seat.price) / seat.basePrice) * 100;
                const discountText = discount >= 0
                    ? `${discount.toFixed(0)}% discount`
                    : `${Math.abs(discount).toFixed(0)}% premium`;

                const discountClass = discount >= 0 ? 'discount' : 'premium';

                seatDiv.innerHTML = `
                    <span class="seat-id">${seat.seatId}</span>
                    <span class="seat-prices">
                        <span class="face-value">Face: $${seat.basePrice}</span>
                        <span class="paid-price">Paid: $${seat.price}</span>
                    </span>
                    <span class="seat-discount ${discountClass}">${discountText}</span>
                `;

                purchaseDiv.appendChild(seatDiv);
            });

            // Add purchase summary
            const summaryDiv = document.createElement('div');
            summaryDiv.className = 'purchase-summary';

            const savingsClass = totalSavings >= 0 ? 'discount' : 'premium';
            const savingsText = totalSavings >= 0
                ? `$${totalSavings.toFixed(2)} saved (${totalDiscountPercent}%)`
                : `$${Math.abs(totalSavings).toFixed(2)} premium (${Math.abs(totalDiscountPercent)}%)`;

            summaryDiv.innerHTML = `
                <div class="summary-row">
                    <span class="summary-label">Total Face Value:</span>
                    <span class="summary-value">$${totalFaceValue}</span>
                </div>
                <div class="summary-row">
                    <span class="summary-label">Total Paid:</span>
                    <span class="summary-value">$${totalPaid}</span>
                </div>
                <div class="summary-row summary-savings ${savingsClass}">
                    <span class="summary-label">${totalSavings >= 0 ? 'Total Savings:' : 'Total Premium:'}</span>
                    <span class="summary-value">${savingsText}</span>
                </div>
            `;

            purchaseDiv.appendChild(summaryDiv);
            purchaseHistoryContainer.appendChild(purchaseDiv);
        });
    } else {
        purchaseHistorySection.classList.add('hidden');
    }

    showModal('gameover-modal');
}

/**
 * Setup event listeners
 * Attaches event handlers to UI elements
 */
export function setupEventListeners() {
    // Multiplayer setup
    if (window.initMultiplayer) {
        window.initMultiplayer();
    }

    // Handle window resize for single-player mode
    let resizeTimeout;
    window.addEventListener('resize', () => {
        if (!gameState.isMultiplayer && !gameState.isRunning) {
            // Debounce resize and only apply before game starts
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                const config = getGridConfig();
                applyGridLayout(config);
                // Regenerate seats with new grid
                generateSeats();
                renderSeats();
            }, 300);
        }
    });

    // Checkout button
    const checkoutBtn = document.getElementById('checkout-btn');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', () => {
            if (window.initiateCheckout) {
                window.initiateCheckout();
            }
        });
    }

    // Skip button
    const skipBtn = document.getElementById('skip-btn');
    if (skipBtn) {
        skipBtn.addEventListener('click', () => {
            if (window.skipTarget) {
                window.skipTarget();
            }
        });
    }

    // CAPTCHA buttons
    const captchaSubmit = document.getElementById('captcha-submit');
    if (captchaSubmit) {
        captchaSubmit.addEventListener('click', () => {
            if (window.verifyCaptcha) {
                window.verifyCaptcha();
            }
        });
    }

    const captchaCancel = document.getElementById('captcha-cancel');
    if (captchaCancel) {
        captchaCancel.addEventListener('click', () => {
            if (window.cancelCaptcha) {
                window.cancelCaptcha();
            }
        });
    }

    // CAPTCHA input - submit on Enter
    const captchaInput = document.getElementById('captcha-input');
    if (captchaInput) {
        captchaInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && window.verifyCaptcha) {
                window.verifyCaptcha();
            }
        });
    }

    // Gas pump CAPTCHA buttons
    const gasStopBtn = document.getElementById('gas-stop-btn');
    if (gasStopBtn) {
        gasStopBtn.addEventListener('click', () => {
            if (window.stopGasPump) {
                window.stopGasPump();
            }
        });
    }

    const gasCancelBtn = document.getElementById('gas-cancel-btn');
    if (gasCancelBtn) {
        gasCancelBtn.addEventListener('click', () => {
            if (window.cancelGasCaptcha) {
                window.cancelGasCaptcha();
            }
        });
    }

    // Puzzle CAPTCHA buttons and slider
    const puzzleSubmit = document.getElementById('puzzle-submit');
    if (puzzleSubmit) {
        puzzleSubmit.addEventListener('click', () => {
            if (window.verifyPuzzle) {
                window.verifyPuzzle();
            }
        });
    }

    const puzzleCancel = document.getElementById('puzzle-cancel');
    if (puzzleCancel) {
        puzzleCancel.addEventListener('click', () => {
            if (window.cancelPuzzleCaptcha) {
                window.cancelPuzzleCaptcha();
            }
        });
    }

    const puzzleSlider = document.getElementById('puzzle-slider');
    if (puzzleSlider) {
        puzzleSlider.addEventListener('input', () => {
            if (window.updatePuzzlePiecePosition) {
                window.updatePuzzlePiecePosition();
            }
        });
    }

    // Fishing CAPTCHA buttons
    const fishingActionBtn = document.getElementById('fishing-action-btn');
    if (fishingActionBtn) {
        fishingActionBtn.addEventListener('mousedown', () => {
            if (window.startFishingAction) {
                window.startFishingAction();
            }
        });
        fishingActionBtn.addEventListener('mouseup', () => {
            if (window.stopFishingAction) {
                window.stopFishingAction();
            }
        });
        fishingActionBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (window.startFishingAction) {
                window.startFishingAction();
            }
        });
        fishingActionBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            if (window.stopFishingAction) {
                window.stopFishingAction();
            }
        });
    }

    const fishingCancelBtn = document.getElementById('fishing-cancel-btn');
    if (fishingCancelBtn) {
        fishingCancelBtn.addEventListener('click', () => {
            if (window.cancelFishingCaptcha) {
                window.cancelFishingCaptcha();
            }
        });
    }

    // Blackjack CAPTCHA buttons
    const blackjackHitBtn = document.getElementById('blackjack-hit-btn');
    if (blackjackHitBtn) {
        blackjackHitBtn.addEventListener('click', () => {
            if (window.handleBlackjackHit) {
                window.handleBlackjackHit();
            }
        });
    }

    const blackjackStandBtn = document.getElementById('blackjack-stand-btn');
    if (blackjackStandBtn) {
        blackjackStandBtn.addEventListener('click', () => {
            if (window.handleBlackjackStand) {
                window.handleBlackjackStand();
            }
        });
    }

    const blackjackCancelBtn = document.getElementById('blackjack-cancel-btn');
    if (blackjackCancelBtn) {
        blackjackCancelBtn.addEventListener('click', () => {
            if (window.cancelBlackjackCaptcha) {
                window.cancelBlackjackCaptcha();
            }
        });
    }

    // Debug panel
    if (window.setupDebugPanel) {
        window.setupDebugPanel();
    }

    // Play again button
    const playAgainBtn = document.getElementById('play-again-btn');
    if (playAgainBtn) {
        playAgainBtn.addEventListener('click', () => {
            hideModal('gameover-modal');

            // Reset multiplayer state
            if (gameState.peer) {
                gameState.peer.destroy();
                gameState.peer = null;
            }
            resetMultiplayerState();
            resetGameState();

            // Show start modal again
            showModal('start-modal');
        });
    }
}

/**
 * Show modal dialog
 * @param {string} modalId - ID of modal to show
 */
export function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('hidden');
    }
}

/**
 * Hide modal dialog
 * @param {string} modalId - ID of modal to hide
 */
export function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('hidden');
    }
}

// Note: Window exports and DOMContentLoaded handled by main.js
