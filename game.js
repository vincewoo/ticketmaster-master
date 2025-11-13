// Game State
const GAME_DURATION = 120; // 2 minutes in seconds
const CAPTCHA_DURATION = 10; // seconds to solve CAPTCHA
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
    // Multiplayer state
    isMultiplayer: false,
    isHost: false,
    peer: null,
    connection: null,
    opponentScore: 0,
    gameSeed: null,
    // Additional intervals
    availabilityInterval: null,
    priceInterval: null
};

// Seat price tiers
const PRICE_TIERS = [
    { range: [50, 80], color: 'tier-cheap' },
    { range: [80, 120], color: 'tier-medium' },
    { range: [120, 200], color: 'tier-expensive' },
    { range: [200, 350], color: 'tier-premium' }
];

// Initialize game
function initGame() {
    generateSeats();
    renderSeats();
    setupEventListeners();
}

// Generate random target ticket count
function generateTargetTicketCount() {
    return Math.floor(getRandomValue() * 6) + 1; // 1-6 tickets
}

// Check if seats in cart are adjacent (same row, consecutive seats)
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

    // Check if all seats are in the same row
    const rows = Object.keys(rowGroups);
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

// Generate seat data
function generateSeats() {
    gameState.seats = [];
    for (let row = 0; row < SEAT_ROWS; row++) {
        for (let col = 0; col < SEAT_COLS; col++) {
            const seat = {
                id: `${String.fromCharCode(65 + row)}${col + 1}`,
                row: row,
                col: col,
                basePrice: calculateSeatPrice(row, col),
                currentPrice: 0,
                isAvailable: getRandomValue() > 0.3, // 70% initially available
                inCart: false,
                isPurchased: false, // Track if seat has been bought
                ownedByOpponent: false, // Track if opponent bought this seat
                opponentClaimTime: null // Track when opponent claimed the seat
            };
            seat.currentPrice = seat.basePrice;
            gameState.seats.push(seat);
        }
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

    // Price range: $50 (worst seats) to $300 (best seats)
    const minPrice = 50;
    const maxPrice = 300;
    const basePrice = minPrice + (combinedFactor * (maxPrice - minPrice));

    // Add some randomness (±10%) to make it less predictable
    const randomFactor = 0.9 + (getRandomValue() * 0.2);

    return Math.floor(basePrice * randomFactor);
}

// Get random price based on tiers (DEPRECATED - kept for reference)
function getRandomPrice() {
    const tier = PRICE_TIERS[Math.floor(Math.random() * PRICE_TIERS.length)];
    return Math.floor(Math.random() * (tier.range[1] - tier.range[0]) + tier.range[0]);
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
        statusDiv.textContent = '⚠️ Seats must be adjacent in same row';
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
    gameState.targetTicketCount = generateTargetTicketCount();
    gameState.skipsCount = 0;
    gameState.opponentScore = 0;

    // Initialize seeded random for multiplayer
    if (gameState.isMultiplayer && gameState.gameSeed) {
        seededRandom = new SeededRandom(gameState.gameSeed);
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

// Update seat availability randomly
function updateSeatAvailability() {
    if (!gameState.isRunning) return;

    // Randomly change availability of 2-4 seats
    const numChanges = Math.floor(getRandomValue() * 3) + 2;

    for (let i = 0; i < numChanges; i++) {
        const randomSeat = gameState.seats[Math.floor(getRandomValue() * gameState.seats.length)];
        // Only toggle if not in cart, not already purchased, and not owned by opponent
        if (!randomSeat.inCart && !randomSeat.isPurchased && !randomSeat.ownedByOpponent) {
            randomSeat.isAvailable = !randomSeat.isAvailable;
        }
    }

    renderSeats();
}

// Update seat prices randomly
function updateSeatPrices() {
    if (!gameState.isRunning) return;

    gameState.seats.forEach(seat => {
        if (!seat.inCart && seat.isAvailable && !seat.isPurchased && !seat.ownedByOpponent) {
            // Fluctuate price by -30% to +30% of base price
            const fluctuation = (getRandomValue() - 0.5) * 0.6;
            seat.currentPrice = Math.floor(seat.basePrice * (1 + fluctuation));
            // Ensure minimum price of $20
            seat.currentPrice = Math.max(20, seat.currentPrice);
        }
    });

    renderSeats();
}

// Checkout process
function initiateCheckout() {
    if (gameState.cart.length === 0) return;

    // 60% chance of CAPTCHA
    if (getRandomValue() < 0.6) {
        showCaptcha();
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
    document.getElementById('skip-penalty-total').textContent = `$${(gameState.skipsCount * SKIP_PENALTY).toFixed(2)}`;

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
        startGame();
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
    gameState.gameSeed = Date.now(); // Create seed for deterministic randomness

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
            // Send game seed to guest
            conn.send({
                type: 'init',
                gameSeed: gameState.gameSeed
            });

            setTimeout(() => {
                hideModal('host-modal');
                startGame();
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
            // Guest receives game seed from host
            gameState.gameSeed = data.gameSeed;
            hideModal('join-modal');
            startGame();
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

// Seeded random number generator for deterministic randomness
class SeededRandom {
    constructor(seed) {
        this.seed = seed;
    }

    next() {
        this.seed = (this.seed * 9301 + 49297) % 233280;
        return this.seed / 233280;
    }
}

let seededRandom = null;

// Get random value (uses seed in multiplayer, Math.random in single player)
function getRandomValue() {
    if (gameState.isMultiplayer && seededRandom) {
        return seededRandom.next();
    }
    return Math.random();
}

// ======================
// END MULTIPLAYER
// ======================

// Setup event listeners
function setupEventListeners() {
    // Multiplayer setup
    initMultiplayer();

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
        gameState.gameSeed = null;
        seededRandom = null;

        // Show start modal again
        showModal('start-modal');
    });
}

// Initialize on load
document.addEventListener('DOMContentLoaded', initGame);
