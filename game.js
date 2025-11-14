// Game State
const GAME_DURATION = 120; // 2 minutes in seconds
const CAPTCHA_DURATION = 10; // seconds to solve CAPTCHA
const GAS_PUMP_CAPTCHA_DURATION = 20; // seconds to solve gas pump CAPTCHA (needs more time)
const SEAT_ROWS = 8;
const SEAT_COLS = 12;
const TOTAL_SEATS = SEAT_ROWS * SEAT_COLS;
const SKIP_PENALTY = 50; // Penalty for skipping a target

let gameState = {
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
    gasPumpActive: false
};

// Seat price tiers
const PRICE_TIERS = [
    { range: [50, 80], color: 'tier-cheap' },
    { range: [80, 120], color: 'tier-medium' },
    { range: [120, 200], color: 'tier-expensive' },
    { range: [200, 350], color: 'tier-premium' }
];

// Get grid configuration based on screen size
function getGridConfig() {
    const width = window.innerWidth;
    if (width <= 480) {
        return { columns: 4, rows: 8, total: 32 }; // Small phones: 4x8
    } else if (width <= 768) {
        return { columns: 6, rows: 8, total: 48 }; // Medium phones/tablets: 6x8
    } else {
        return { columns: 12, rows: 8, total: 96 }; // Desktop/large tablets: 12x8
    }
}

// Apply grid layout to seating chart
function applyGridLayout(config) {
    gameState.gridColumns = config.columns;
    gameState.totalSeats = config.total;
    const seatingChart = document.getElementById('seating-chart');
    // Use setProperty with priority to override CSS media queries
    seatingChart.style.setProperty('grid-template-columns', `repeat(${config.columns}, 1fr)`, 'important');
}

// Initialize game
function initGame() {
    // Set initial grid based on screen size (must be before generateSeats)
    if (!gameState.isMultiplayer) {
        const config = getGridConfig();
        applyGridLayout(config);
    }

    generateSeats();
    renderSeats();
    setupEventListeners();
}

// Generate random target ticket count
function generateTargetTicketCount() {
    // Max target is limited by grid columns (can't exceed row width)
    const maxTarget = Math.min(gameState.gridColumns, 6);
    const target = Math.floor(Math.random() * maxTarget) + 1; // 1 to maxTarget tickets

    // In multiplayer, host broadcasts the target to guest
    if (gameState.isMultiplayer && gameState.isHost) {
        sendMultiplayerMessage({
            type: 'targetUpdate',
            targetTicketCount: target
        });
    }

    return target;
}

// Generate random event times for sale and surge
function generateEventTimes() {
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

// Check if seats in cart are adjacent (same row, consecutive seats)
// For 4+ seats, allows 2 consecutive rows with touching blocks
function areSeatsAdjacent(cartItems) {
    if (cartItems.length === 0) return false;
    if (cartItems.length === 1) return true;

    // Get seat objects
    const seats = cartItems.map(item =>
        gameState.seats.find(s => s.id === item.seatId)
    );

    // Group by row
    const rowGroups = {};
    seats.forEach(seat => {
        if (!rowGroups[seat.row]) {
            rowGroups[seat.row] = [];
        }
        rowGroups[seat.row].push(seat.col);
    });

    const rows = Object.keys(rowGroups).map(Number).sort((a, b) => a - b);

    // For 1-3 seats: must be in same row
    if (cartItems.length <= 3) {
        if (rows.length !== 1) return false;

        // Check if seats are consecutive
        const cols = rowGroups[rows[0]].sort((a, b) => a - b);
        for (let i = 1; i < cols.length; i++) {
            if (cols[i] - cols[i - 1] !== 1) {
                return false;
            }
        }
        return true;
    }

    // For 4+ seats: allow 1 or 2 rows
    if (rows.length === 1) {
        // Single row: check consecutive
        const cols = rowGroups[rows[0]].sort((a, b) => a - b);
        for (let i = 1; i < cols.length; i++) {
            if (cols[i] - cols[i - 1] !== 1) {
                return false;
            }
        }
        return true;
    } else if (rows.length === 2) {
        // Two rows validation
        const row1 = rows[0];
        const row2 = rows[1];

        // Check rows are consecutive
        if (row2 - row1 !== 1) return false;

        // Check minimum 2 seats per row
        if (rowGroups[row1].length < 2 || rowGroups[row2].length < 2) return false;

        // Check each row has consecutive seats
        const cols1 = rowGroups[row1].sort((a, b) => a - b);
        const cols2 = rowGroups[row2].sort((a, b) => a - b);

        for (let i = 1; i < cols1.length; i++) {
            if (cols1[i] - cols1[i - 1] !== 1) return false;
        }
        for (let i = 1; i < cols2.length; i++) {
            if (cols2[i] - cols2[i - 1] !== 1) return false;
        }

        // Check rows "touch" (at least one overlapping column)
        const hasOverlap = cols1.some(col => cols2.includes(col));
        if (!hasOverlap) return false;

        return true;
    } else {
        // More than 2 rows not allowed
        return false;
    }
}

// Check if there are overlapping seats with opponent
function hasOverlappingSeats() {
    if (!gameState.isMultiplayer) return false;

    const mySeats = gameState.cart.map(item => item.seatId);
    const opponentSeats = gameState.opponentCart;

    // Check if any seats match
    return mySeats.some(seatId => opponentSeats.includes(seatId));
}

// Generate seat data
function generateSeats() {
    gameState.seats = [];
    const initialAvailability = [];

    // Use dynamic grid configuration
    const cols = gameState.gridColumns;
    const totalSeats = gameState.totalSeats;
    const rows = Math.ceil(totalSeats / cols);

    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const seatIndex = row * cols + col;
            if (seatIndex >= totalSeats) break; // Don't exceed total seats

            const isAvailable = Math.random() > 0.3; // 70% initially available
            const seat = {
                id: `${String.fromCharCode(65 + row)}${col + 1}`,
                row: row,
                col: col,
                basePrice: calculateSeatPrice(row, col),
                currentPrice: 0,
                isAvailable: isAvailable,
                inCart: false,
                isPurchased: false, // Track if seat has been bought
                ownedByOpponent: false, // Track if opponent bought this seat
                opponentClaimTime: null // Track when opponent claimed the seat
            };
            seat.currentPrice = seat.basePrice;
            gameState.seats.push(seat);

            // Track initial availability for multiplayer sync
            if (gameState.isMultiplayer && gameState.isHost) {
                initialAvailability.push({
                    seatId: seat.id,
                    isAvailable: isAvailable
                });
            }
        }
    }

    // Host broadcasts initial seat availability to guest
    if (gameState.isMultiplayer && gameState.isHost && initialAvailability.length > 0) {
        sendMultiplayerMessage({
            type: 'initialState',
            seats: initialAvailability
        });
    }
}

// Calculate seat price based on position
function calculateSeatPrice(row, col) {
    // Distance from stage (front row = 0, back row = SEAT_ROWS - 1)
    const rowDistance = row;
    const rowFactor = 1 - (rowDistance / SEAT_ROWS); // 1.0 for front, 0 for back

    // Distance from center of row
    const centerCol = (SEAT_COLS - 1) / 2; // Middle of the row
    const colDistance = Math.abs(col - centerCol);
    const colFactor = 1 - (colDistance / centerCol); // 1.0 for center, 0 for edges

    // Combine factors (row is more important than column)
    const rowWeight = 0.7; // 70% of price is determined by row
    const colWeight = 0.3; // 30% of price is determined by column position
    const combinedFactor = (rowFactor * rowWeight) + (colFactor * colWeight);

    // Price range: $60 (worst seats) to $300 (best seats)
    const minPrice = 60;
    const maxPrice = 300;
    const basePrice = minPrice + (combinedFactor * (maxPrice - minPrice));

    // Add some randomness (±10%) to make it less predictable
    const randomFactor = 0.9 + (Math.random() * 0.2);

    // Round to nearest $20
    return Math.round(basePrice * randomFactor / 20) * 20;
}

// Get random price based on tiers (DEPRECATED - kept for reference)
function getRandomPrice() {
    const tier = PRICE_TIERS[Math.floor(Math.random() * PRICE_TIERS.length)];
    return Math.floor(Math.random() * (tier.range[1] - tier.range[0]) + tier.range[0]);
}

// Get price color based on deal quality
function getPriceColor(currentPrice, basePrice) {
    const discount = ((basePrice - currentPrice) / basePrice) * 100; // Positive means discount, negative means markup

    if (discount >= 20) {
        // Great deal (20%+ discount) - dark green
        return '#0d6832';
    } else if (discount >= 10) {
        // Good deal (10-19% discount) - medium green
        return '#15803d';
    } else if (discount >= 5) {
        // Okay deal (5-9% discount) - light green
        return '#16a34a';
    } else if (discount >= 0) {
        // Slight deal (0-4% discount) - very light green
        return '#22c55e';
    } else if (discount >= -5) {
        // Slight markup (0-5%) - light red
        return '#ef4444';
    } else if (discount >= -10) {
        // Bad deal (5-10% markup) - medium red
        return '#dc2626';
    } else {
        // Very bad deal (10%+ markup) - dark red
        return '#b91c1c';
    }
}

// Render seats on the board
function renderSeats() {
    const seatingChart = document.getElementById('seating-chart');
    seatingChart.innerHTML = '';

    gameState.seats.forEach(seat => {
        const seatElement = document.createElement('div');
        seatElement.className = 'seat';
        seatElement.dataset.seatId = seat.id;

        if (seat.inCart) {
            seatElement.classList.add('in-cart');
        } else if (seat.ownedByOpponent) {
            // Check if animation should still be applied (within 3 seconds of claim)
            const timeSinceClaim = Date.now() - seat.opponentClaimTime;
            if (timeSinceClaim < 3000) {
                seatElement.classList.add('opponent-seat');
                // Use animation-delay to prevent restart - start animation from current position
                const animationProgress = (timeSinceClaim / 3000) * 3; // 0 to 3 seconds
                seatElement.style.animationDelay = `-${animationProgress}s`;
            } else {
                // After 3 seconds, just show as unavailable
                seatElement.classList.add('unavailable');
            }
        } else if (seat.isAvailable) {
            seatElement.classList.add('available');
        } else {
            seatElement.classList.add('unavailable');
        }

        if (seat.isAvailable || seat.inCart) {
            const priceSpan = document.createElement('span');
            priceSpan.className = 'seat-price';
            priceSpan.textContent = `$${seat.currentPrice}`;

            // Color code the price based on deal quality
            priceSpan.style.color = getPriceColor(seat.currentPrice, seat.basePrice);

            const labelSpan = document.createElement('span');
            labelSpan.className = 'seat-label';
            labelSpan.textContent = seat.id;

            seatElement.appendChild(priceSpan);
            seatElement.appendChild(labelSpan);
        } else {
            const labelSpan = document.createElement('span');
            labelSpan.className = 'seat-label';
            labelSpan.textContent = 'X';
            seatElement.appendChild(labelSpan);
        }

        // Make available seats and seats in cart clickable
        if (seat.isAvailable || seat.inCart) {
            seatElement.addEventListener('click', () => handleSeatClick(seat.id));
        }

        seatingChart.appendChild(seatElement);
    });
}

// Handle seat click
function handleSeatClick(seatId) {
    if (!gameState.isRunning) return;

    const seat = gameState.seats.find(s => s.id === seatId);
    if (!seat || !seat.isAvailable) return;

    // Toggle seat in cart
    if (seat.inCart) {
        // Remove from cart
        seat.inCart = false;
        gameState.cart = gameState.cart.filter(item => item.seatId !== seatId);
    } else {
        // Add to cart
        seat.inCart = true;
        gameState.cart.push({
            seatId: seat.id,
            price: seat.currentPrice,
            basePrice: seat.basePrice
        });
    }

    // Send cart update to opponent in multiplayer
    if (gameState.isMultiplayer) {
        sendMultiplayerMessage({
            type: 'cartUpdate',
            cart: gameState.cart.map(item => item.seatId)
        });
    }

    renderSeats();
    updateCart();
}

// Remove from cart
function removeSeatFromCart(seatId) {
    const seat = gameState.seats.find(s => s.id === seatId);
    if (seat) {
        seat.inCart = false;
    }

    gameState.cart = gameState.cart.filter(item => item.seatId !== seatId);

    // Send cart update to opponent in multiplayer
    if (gameState.isMultiplayer) {
        sendMultiplayerMessage({
            type: 'cartUpdate',
            cart: gameState.cart.map(item => item.seatId)
        });
    }

    renderSeats();
    updateCart();
}

// Update cart display
function updateCart() {
    const cartItems = document.getElementById('cart-items');
    const cartTotal = document.getElementById('cart-total');
    const checkoutBtn = document.getElementById('checkout-btn');

    if (gameState.cart.length === 0) {
        cartItems.innerHTML = '<p class="empty-cart">No tickets selected</p>';
        cartTotal.textContent = '$0.00';
        checkoutBtn.disabled = true;
        return;
    }

    // Check if seats are adjacent and match target count
    const isAdjacent = areSeatsAdjacent(gameState.cart);
    const isCorrectCount = gameState.cart.length === gameState.targetTicketCount;
    const isValid = isAdjacent && isCorrectCount;

    cartItems.innerHTML = '';

    // Add status message
    const statusDiv = document.createElement('div');
    statusDiv.className = 'cart-status';
    if (!isCorrectCount) {
        statusDiv.className += ' invalid';
        statusDiv.textContent = `Need ${gameState.targetTicketCount} tickets (have ${gameState.cart.length})`;
    } else if (!isAdjacent) {
        statusDiv.className += ' invalid';
        // Dynamic message based on target ticket count
        if (gameState.targetTicketCount <= 3) {
            statusDiv.textContent = '⚠️ Seats must be adjacent in same row';
        } else {
            statusDiv.textContent = '⚠️ Seats must be adjacent (1 row) or form a touching block (2 consecutive rows, min 2/row)';
        }
    } else {
        statusDiv.className += ' valid';
        statusDiv.textContent = '✓ Valid selection!';
    }
    cartItems.appendChild(statusDiv);

    let total = 0;

    gameState.cart.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'cart-item';

        const infoDiv = document.createElement('div');
        infoDiv.className = 'cart-item-info';

        const label = document.createElement('div');
        label.className = 'cart-item-label';
        label.textContent = `Seat ${item.seatId}`;

        const price = document.createElement('div');
        price.className = 'cart-item-price';
        price.textContent = `$${item.price}`;

        infoDiv.appendChild(label);
        infoDiv.appendChild(price);

        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-btn';
        removeBtn.textContent = 'Remove';
        removeBtn.addEventListener('click', () => removeSeatFromCart(item.seatId));

        itemDiv.appendChild(infoDiv);
        itemDiv.appendChild(removeBtn);
        cartItems.appendChild(itemDiv);

        total += item.price;
    });

    cartTotal.textContent = `$${total.toFixed(2)}`;

    // Only enable checkout if selection is valid
    checkoutBtn.disabled = !isValid;
}

// Show loading screen with countdown animation
function showLoadingScreen(callback) {
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

// Start game
function startGame() {
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
            sendMultiplayerMessage({
                type: 'eventTimes',
                saleStartTime: gameState.saleStartTime,
                surgeStartTime: gameState.surgeStartTime
            });
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

// Update game timer
function updateTimer() {
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
        updateSeatAvailability();
    }

    // Update seat prices every 3 seconds
    if (gameState.timeRemaining % 3 === 0) {
        updateSeatPrices();
    }

    if (gameState.timeRemaining <= 0) {
        endGame();
    }
}

// Update display
function updateDisplay() {
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

// Update event banner display
function updateEventDisplay() {
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

// Update seat availability randomly
function updateSeatAvailability() {
    if (!gameState.isRunning) return;

    // In multiplayer, only host generates updates
    if (gameState.isMultiplayer && !gameState.isHost) {
        return; // Guest waits for host's updates
    }

    // Randomly change availability of 2-4 seats
    const numChanges = Math.floor(Math.random() * 3) + 2;
    const changedSeats = [];

    for (let i = 0; i < numChanges; i++) {
        const randomSeat = gameState.seats[Math.floor(Math.random() * gameState.seats.length)];

        // Check if seat is in opponent's cart (protected from changes)
        const isInOpponentCart = gameState.opponentCart.includes(randomSeat.id);

        // Only toggle if not in any cart, not already purchased, and not owned by opponent
        if (!randomSeat.inCart && !randomSeat.isPurchased && !randomSeat.ownedByOpponent && !isInOpponentCart) {
            randomSeat.isAvailable = !randomSeat.isAvailable;
            changedSeats.push({
                seatId: randomSeat.id,
                isAvailable: randomSeat.isAvailable
            });
        }
    }

    // Broadcast changes to guest in multiplayer
    if (gameState.isMultiplayer && changedSeats.length > 0) {
        sendMultiplayerMessage({
            type: 'availabilityUpdate',
            seats: changedSeats
        });
    }

    renderSeats();
}

// Update seat prices randomly
function updateSeatPrices() {
    if (!gameState.isRunning) return;

    // In multiplayer, only host generates updates
    if (gameState.isMultiplayer && !gameState.isHost) {
        return; // Guest waits for host's updates
    }

    const priceUpdates = [];

    gameState.seats.forEach(seat => {
        // Check if seat is in opponent's cart (protected from price changes)
        const isInOpponentCart = gameState.opponentCart.includes(seat.id);

        // Don't update prices for seats in any cart, purchased, or opponent-owned
        if (!seat.inCart && seat.isAvailable && !seat.isPurchased && !seat.ownedByOpponent && !isInOpponentCart) {
            let fluctuation;

            // During sale event, all prices are discounts (negative fluctuation)
            if (gameState.saleEventActive) {
                fluctuation = -Math.random() * 0.3; // 0% to -30% discount
            }
            // During surge event, all prices are premiums (positive fluctuation)
            else if (gameState.surgeEventActive) {
                fluctuation = Math.random() * 0.3; // 0% to +30% premium
            }
            // Normal pricing: fluctuate by -30% to +30% of base price
            else {
                fluctuation = (Math.random() - 0.5) * 0.6;
            }

            seat.currentPrice = Math.floor(seat.basePrice * (1 + fluctuation));
            // Ensure minimum price of $20
            seat.currentPrice = Math.max(20, seat.currentPrice);

            priceUpdates.push({
                seatId: seat.id,
                currentPrice: seat.currentPrice
            });
        }
    });

    // Broadcast price changes to guest in multiplayer
    if (gameState.isMultiplayer && priceUpdates.length > 0) {
        sendMultiplayerMessage({
            type: 'priceUpdate',
            seats: priceUpdates
        });
    }

    renderSeats();
}

// Checkout process
function initiateCheckout() {
    if (gameState.cart.length === 0) return;

    // Always show CAPTCHA if competing with opponent for same seats
    const hasCompetition = gameState.isMultiplayer && hasOverlappingSeats();

    // Otherwise 60% chance of CAPTCHA
    if (hasCompetition || Math.random() < 0.6) {
        // Randomly choose between text CAPTCHA and gas pump CAPTCHA
        if (Math.random() < 0.5) {
            showCaptcha();
        } else {
            showGasPumpCaptcha();
        }
    } else {
        completeCheckout();
    }
}

// Show CAPTCHA
function showCaptcha() {
    gameState.captchaCode = generateCaptchaCode();
    gameState.captchaTimeRemaining = CAPTCHA_DURATION;

    const captchaChallenge = document.getElementById('captcha-challenge');
    captchaChallenge.textContent = gameState.captchaCode;

    document.getElementById('captcha-input').value = '';
    document.getElementById('captcha-error').classList.add('hidden');

    // Check if opponent has overlapping seats in multiplayer
    const warningEl = document.getElementById('captcha-warning');
    if (gameState.isMultiplayer && hasOverlappingSeats()) {
        warningEl.classList.remove('hidden');
    } else {
        warningEl.classList.add('hidden');
    }

    showModal('captcha-modal');

    // Focus input
    document.getElementById('captcha-input').focus();

    // Start countdown
    updateCaptchaTimer();
    gameState.captchaInterval = setInterval(() => {
        gameState.captchaTimeRemaining--;
        updateCaptchaTimer();

        if (gameState.captchaTimeRemaining <= 0) {
            clearInterval(gameState.captchaInterval);
            showCaptchaError('Time expired! Try again.');
            setTimeout(() => {
                hideModal('captcha-modal');
            }, 1500);
        }
    }, 1000);
}

// Generate CAPTCHA code
function generateCaptchaCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing characters
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// Update CAPTCHA timer
function updateCaptchaTimer() {
    document.getElementById('captcha-timer').textContent = gameState.captchaTimeRemaining;
}

// Verify CAPTCHA
function verifyCaptcha() {
    const input = document.getElementById('captcha-input').value.toUpperCase();

    if (input === gameState.captchaCode) {
        clearInterval(gameState.captchaInterval);
        hideModal('captcha-modal');
        completeCheckout();
    } else {
        showCaptchaError('Incorrect code! Try again.');
        document.getElementById('captcha-input').value = '';
        document.getElementById('captcha-input').focus();
    }
}

// Show CAPTCHA error
function showCaptchaError(message) {
    const errorEl = document.getElementById('captcha-error');
    errorEl.textContent = message;
    errorEl.classList.remove('hidden');
}

// Cancel CAPTCHA
function cancelCaptcha() {
    clearInterval(gameState.captchaInterval);
    hideModal('captcha-modal');
}

// ======================
// GAS PUMP CAPTCHA
// ======================

// Show Gas Pump CAPTCHA
function showGasPumpCaptcha() {
    // Generate random target ($5, $10, $15, or $20)
    const targets = [5.00, 10.00, 15.00, 20.00];
    gameState.gasPumpTarget = targets[Math.floor(Math.random() * targets.length)];
    gameState.gasPumpCurrent = 0;
    gameState.gasPumpAttempts = 3;
    gameState.gasPumpActive = false;

    // Update display
    document.getElementById('gas-target').textContent = `$${gameState.gasPumpTarget.toFixed(2)}`;
    document.getElementById('gas-amount').textContent = `$${gameState.gasPumpCurrent.toFixed(2)}`;
    document.getElementById('gas-attempts').textContent = gameState.gasPumpAttempts;
    document.getElementById('gas-captcha-error').classList.add('hidden');
    document.getElementById('gas-stop-btn').disabled = true;

    // Check if opponent has overlapping seats in multiplayer
    const warningEl = document.getElementById('gas-captcha-warning');
    if (gameState.isMultiplayer && hasOverlappingSeats()) {
        warningEl.classList.remove('hidden');
    } else {
        warningEl.classList.add('hidden');
    }

    showModal('gas-captcha-modal');

    // Auto-start pump after 1 second
    setTimeout(startGasPump, 1000);
}

// Start gas pump animation
function startGasPump() {
    // Reset state
    gameState.gasPumpActive = true;
    gameState.gasPumpCurrent = 0;
    document.getElementById('gas-stop-btn').disabled = false;

    // Clear any existing interval first
    if (gameState.gasPumpInterval) {
        clearInterval(gameState.gasPumpInterval);
    }

    // Increment gas amount with dynamic speed based on distance from target
    gameState.gasPumpInterval = setInterval(() => {
        // Calculate distance from target
        const distanceFromTarget = Math.abs(gameState.gasPumpCurrent - gameState.gasPumpTarget);

        // Dynamic speed: very fast when far, slow when close
        let increment;
        if (distanceFromTarget > 3.0) {
            // Very far from target: very fast speed
            increment = 0.10 + Math.random() * 0.10; // 0.10-0.20 (super fast)
        } else if (distanceFromTarget > 2.0) {
            // Far from target: fast speed
            increment = 0.06 + Math.random() * 0.06; // 0.06-0.12
        } else if (distanceFromTarget > 1.0) {
            // Getting closer: moderate speed
            increment = 0.03 + Math.random() * 0.03; // 0.03-0.06
        } else if (distanceFromTarget > 0.5) {
            // Close to target: slow down
            increment = 0.02 + Math.random() * 0.01; // 0.02-0.03
        } else {
            // Very close to target: very slow
            increment = 0.01 + Math.random() * 0.01; // 0.01-0.02
        }

        gameState.gasPumpCurrent += increment;

        // Stop at $25 max and loop back
        if (gameState.gasPumpCurrent >= 25) {
            gameState.gasPumpCurrent = 0;
        }

        document.getElementById('gas-amount').textContent = `$${gameState.gasPumpCurrent.toFixed(2)}`;
    }, 30);
}

// Stop gas pump
function stopGasPump() {
    if (gameState.gasPumpActive) {
        gameState.gasPumpActive = false;
        clearInterval(gameState.gasPumpInterval);
        document.getElementById('gas-stop-btn').disabled = true;

        // Check if player hit the target (within $0.10 tolerance)
        const difference = Math.abs(gameState.gasPumpCurrent - gameState.gasPumpTarget);
        const tolerance = 0.10;

        if (difference <= tolerance) {
            // Success!
            hideModal('gas-captcha-modal');
            completeCheckout();
        } else {
            // Failed attempt
            gameState.gasPumpAttempts--;
            document.getElementById('gas-attempts').textContent = gameState.gasPumpAttempts;

            if (gameState.gasPumpAttempts <= 0) {
                // Out of attempts - CAPTCHA failed
                showGasCaptchaError('You must be a robot! 🤖');
                setTimeout(() => {
                    hideModal('gas-captcha-modal');
                }, 2000);
            } else {
                // Show error and restart pump
                const msg = difference < 1
                    ? `Close! Off by $${difference.toFixed(2)}. Try again!`
                    : `Missed by $${difference.toFixed(2)}. Try again!`;
                showGasCaptchaError(msg);
                setTimeout(() => {
                    document.getElementById('gas-captcha-error').classList.add('hidden');
                    startGasPump();
                }, 1500);
            }
        }
    }
}

// Show gas CAPTCHA error
function showGasCaptchaError(message) {
    const errorEl = document.getElementById('gas-captcha-error');
    errorEl.textContent = message;
    errorEl.classList.remove('hidden');
}

// Cancel gas CAPTCHA
function cancelGasCaptcha() {
    clearInterval(gameState.gasPumpInterval);
    gameState.gasPumpActive = false;
    hideModal('gas-captcha-modal');
}

// ======================
// END GAS PUMP CAPTCHA
// ======================

// Complete checkout
function completeCheckout() {
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
            if (gameState.isMultiplayer) {
                sendMultiplayerMessage({
                    type: 'seatClaimed',
                    seatId: seat.id
                });
            }
        }
    });

    // Send score update in multiplayer
    if (gameState.isMultiplayer) {
        sendMultiplayerMessage({
            type: 'scoreUpdate',
            score: gameState.score
        });
    }

    // Clear cart
    gameState.cart = [];

    // Send cart update to opponent (now empty after checkout)
    if (gameState.isMultiplayer) {
        sendMultiplayerMessage({
            type: 'cartUpdate',
            cart: []
        });
    }

    // Generate new target for next purchase
    gameState.targetTicketCount = generateTargetTicketCount();

    renderSeats();
    updateCart();
    updateDisplay();
}

// End game
function endGame() {
    gameState.isRunning = false;
    clearInterval(gameState.timerInterval);

    // Notify opponent in multiplayer
    if (gameState.isMultiplayer) {
        sendMultiplayerMessage({
            type: 'gameEnd'
        });
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

// Skip current target
function skipTarget() {
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
    if (gameState.isMultiplayer) {
        sendMultiplayerMessage({
            type: 'cartUpdate',
            cart: []
        });
    }

    // Generate new target
    gameState.targetTicketCount = generateTargetTicketCount();

    // Update display
    renderSeats();
    updateCart();
    updateDisplay();
}

// Modal functions
function showModal(modalId) {
    document.getElementById(modalId).classList.remove('hidden');
}

function hideModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
}

// ======================
// MULTIPLAYER FUNCTIONS
// ======================

// Initialize multiplayer mode selection
function initMultiplayer() {
    document.getElementById('single-player-btn').addEventListener('click', () => {
        gameState.isMultiplayer = false;
        hideModal('start-modal');
        showLoadingScreen(startGame);
    });

    document.getElementById('multiplayer-btn').addEventListener('click', () => {
        hideModal('start-modal');
        showModal('multiplayer-modal');
    });

    document.getElementById('back-to-start-btn').addEventListener('click', () => {
        hideModal('multiplayer-modal');
        showModal('start-modal');
    });

    document.getElementById('host-game-btn').addEventListener('click', hostGame);
    document.getElementById('join-game-btn').addEventListener('click', () => {
        hideModal('multiplayer-modal');
        showModal('join-modal');
    });

    document.getElementById('cancel-host-btn').addEventListener('click', cancelHost);
    document.getElementById('cancel-join-btn').addEventListener('click', cancelJoin);
    document.getElementById('connect-btn').addEventListener('click', joinGame);
    document.getElementById('copy-code-btn').addEventListener('click', copyGameCode);
}

// Host a new game
function hostGame() {
    hideModal('multiplayer-modal');
    showModal('host-modal');

    gameState.isMultiplayer = true;
    gameState.isHost = true;

    // Create peer with PeerJS
    gameState.peer = new Peer();

    gameState.peer.on('open', (id) => {
        document.getElementById('game-code').value = id;
        document.getElementById('host-status').textContent = 'Waiting for player to join...';
    });

    gameState.peer.on('connection', (conn) => {
        gameState.connection = conn;
        setupConnection(conn);
        document.getElementById('host-status').textContent = 'Player connected! Starting game...';

        // Wait for connection to be fully established before sending data
        conn.on('open', () => {
            // Send init message and grid config to guest
            conn.send({
                type: 'init',
                gridConfig: getGridConfig()
            });

            setTimeout(() => {
                hideModal('host-modal');
                showLoadingScreen(startGame);
            }, 1000);
        });
    });

    gameState.peer.on('error', (err) => {
        console.error('Peer error:', err);
        document.getElementById('host-status').textContent = 'Connection error. Please try again.';
    });
}

// Join an existing game
function joinGame() {
    const code = document.getElementById('join-code-input').value.trim();

    if (!code) {
        document.getElementById('join-status').textContent = 'Please enter a game code.';
        return;
    }

    gameState.isMultiplayer = true;
    gameState.isHost = false;

    document.getElementById('join-status').textContent = 'Connecting...';

    // Create peer
    gameState.peer = new Peer();

    gameState.peer.on('open', () => {
        // Connect to host
        const conn = gameState.peer.connect(code);
        gameState.connection = conn;
        setupConnection(conn);

        conn.on('open', () => {
            document.getElementById('join-status').textContent = 'Connected! Waiting for host...';

            // Send grid config to host
            conn.send({
                type: 'screenSize',
                gridConfig: getGridConfig()
            });
        });
    });

    gameState.peer.on('error', (err) => {
        console.error('Peer error:', err);
        document.getElementById('join-status').textContent = 'Failed to connect. Check the code and try again.';
    });
}

// Setup connection event handlers
function setupConnection(conn) {
    conn.on('data', (data) => {
        handleMultiplayerMessage(data);
    });

    conn.on('close', () => {
        console.log('Connection closed');
        if (gameState.isRunning) {
            alert('Opponent disconnected!');
            endGame();
        }
    });
}

// Handle incoming multiplayer messages
function handleMultiplayerMessage(data) {
    switch (data.type) {
        case 'init':
            // Guest receives init message from host
            gameState.opponentGridConfig = data.gridConfig;
            // Use the smaller grid (more restrictive by total seats)
            const guestConfig = getGridConfig();
            const syncedConfig = guestConfig.total <= data.gridConfig.total ? guestConfig : data.gridConfig;
            applyGridLayout(syncedConfig);

            // Send back grid layout confirmation
            sendMultiplayerMessage({
                type: 'gridLayoutSync',
                gridConfig: syncedConfig
            });

            hideModal('join-modal');
            showLoadingScreen(startGame);
            break;

        case 'screenSize':
            // Host receives screen size from guest
            gameState.opponentGridConfig = data.gridConfig;
            // Use the smaller grid (more restrictive by total seats)
            const hostConfig = getGridConfig();
            const finalConfig = hostConfig.total <= data.gridConfig.total ? hostConfig : data.gridConfig;
            applyGridLayout(finalConfig);

            // Confirm grid layout to guest
            sendMultiplayerMessage({
                type: 'gridLayoutSync',
                gridConfig: finalConfig
            });
            break;

        case 'gridLayoutSync':
            // Both players receive final grid layout
            applyGridLayout(data.gridConfig);
            break;

        case 'initialState':
            // Guest receives initial seat availability from host
            data.seats.forEach(seatData => {
                const seat = gameState.seats.find(s => s.id === seatData.seatId);
                if (seat) {
                    seat.isAvailable = seatData.isAvailable;
                }
            });
            renderSeats();
            break;

        case 'targetUpdate':
            // Guest receives new target from host
            gameState.targetTicketCount = data.targetTicketCount;
            updateDisplay();
            break;

        case 'eventTimes':
            // Guest receives event timing from host
            gameState.saleStartTime = data.saleStartTime;
            gameState.surgeStartTime = data.surgeStartTime;
            break;

        case 'availabilityUpdate':
            // Guest receives seat availability changes from host
            data.seats.forEach(seatData => {
                const seat = gameState.seats.find(s => s.id === seatData.seatId);
                if (seat) {
                    seat.isAvailable = seatData.isAvailable;
                }
            });
            renderSeats();
            break;

        case 'priceUpdate':
            // Guest receives price updates from host
            data.seats.forEach(seatData => {
                const seat = gameState.seats.find(s => s.id === seatData.seatId);
                if (seat) {
                    seat.currentPrice = seatData.currentPrice;
                }
            });
            renderSeats();
            break;

        case 'cartUpdate':
            // Update opponent's cart for competition detection
            gameState.opponentCart = data.cart;
            break;

        case 'seatClaimed':
            // Mark seat as taken by opponent
            const seat = gameState.seats.find(s => s.id === data.seatId);
            if (seat) {
                seat.isAvailable = false;
                seat.isPurchased = true;
                seat.ownedByOpponent = true;
                seat.opponentClaimTime = Date.now(); // Record when opponent claimed it
            }
            renderSeats();
            break;

        case 'scoreUpdate':
            // Update opponent's score
            gameState.opponentScore = data.score;
            updateDisplay();
            break;

        case 'gameEnd':
            // Opponent finished
            if (gameState.isRunning) {
                endGame();
            }
            break;
    }
}

// Send multiplayer message
function sendMultiplayerMessage(data) {
    if (gameState.isMultiplayer && gameState.connection && gameState.connection.open) {
        gameState.connection.send(data);
    }
}

// Copy game code to clipboard
function copyGameCode() {
    const codeInput = document.getElementById('game-code');
    codeInput.select();
    document.execCommand('copy');

    const btn = document.getElementById('copy-code-btn');
    const originalText = btn.textContent;
    btn.textContent = 'Copied!';
    setTimeout(() => {
        btn.textContent = originalText;
    }, 2000);
}

// Cancel hosting
function cancelHost() {
    if (gameState.peer) {
        gameState.peer.destroy();
        gameState.peer = null;
    }
    gameState.isMultiplayer = false;
    gameState.isHost = false;
    hideModal('host-modal');
    showModal('multiplayer-modal');
}

// Cancel joining
function cancelJoin() {
    if (gameState.peer) {
        gameState.peer.destroy();
        gameState.peer = null;
    }
    gameState.isMultiplayer = false;
    hideModal('join-modal');
    showModal('multiplayer-modal');
}

// No longer needed - host-authoritative architecture handles all randomness

// ======================
// END MULTIPLAYER
// ======================

// Setup event listeners
function setupEventListeners() {
    // Multiplayer setup
    initMultiplayer();

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
    document.getElementById('checkout-btn').addEventListener('click', initiateCheckout);

    // Skip button
    document.getElementById('skip-btn').addEventListener('click', skipTarget);

    // CAPTCHA buttons
    document.getElementById('captcha-submit').addEventListener('click', verifyCaptcha);
    document.getElementById('captcha-cancel').addEventListener('click', cancelCaptcha);

    // CAPTCHA input - submit on Enter
    document.getElementById('captcha-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            verifyCaptcha();
        }
    });

    // Gas pump CAPTCHA buttons
    document.getElementById('gas-stop-btn').addEventListener('click', stopGasPump);
    document.getElementById('gas-cancel-btn').addEventListener('click', cancelGasCaptcha);

    // Play again button
    document.getElementById('play-again-btn').addEventListener('click', () => {
        hideModal('gameover-modal');

        // Reset multiplayer state
        if (gameState.peer) {
            gameState.peer.destroy();
            gameState.peer = null;
        }
        gameState.isMultiplayer = false;
        gameState.isHost = false;
        gameState.connection = null;
        gameState.opponentScore = 0;

        // Show start modal again
        showModal('start-modal');
    });
}

// Initialize on load
document.addEventListener('DOMContentLoaded', initGame);
