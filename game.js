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
    skipsCount: 0
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
    return Math.floor(Math.random() * 6) + 1; // 1-6 tickets
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
                isAvailable: Math.random() > 0.3, // 70% initially available
                inCart: false,
                isPurchased: false // Track if seat has been bought
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
    const randomFactor = 0.9 + (Math.random() * 0.2);

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
    gameState.isRunning = true;
    gameState.timeRemaining = GAME_DURATION;
    gameState.score = 0;
    gameState.cart = [];
    gameState.totalSaved = 0;
    gameState.ticketsPurchased = 0;
    gameState.targetTicketCount = generateTargetTicketCount();
    gameState.skipsCount = 0;

    generateSeats();
    renderSeats();
    updateCart();
    updateDisplay();

    // Start game timer
    gameState.timerInterval = setInterval(updateTimer, 1000);

    // Start dynamic seat updates
    setInterval(updateSeatAvailability, 2000); // Every 2 seconds
    setInterval(updateSeatPrices, 3000); // Every 3 seconds
}

// Update game timer
function updateTimer() {
    gameState.timeRemaining--;
    updateDisplay();

    if (gameState.timeRemaining <= 0) {
        endGame();
    }
}

// Update display
function updateDisplay() {
    const timerEl = document.getElementById('timer');
    const scoreEl = document.getElementById('score');
    const targetEl = document.getElementById('target-tickets');

    const minutes = Math.floor(gameState.timeRemaining / 60);
    const seconds = gameState.timeRemaining % 60;
    timerEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    scoreEl.textContent = Math.floor(gameState.score);
    targetEl.textContent = gameState.targetTicketCount;
}

// Update seat availability randomly
function updateSeatAvailability() {
    if (!gameState.isRunning) return;

    // Randomly change availability of 2-4 seats
    const numChanges = Math.floor(Math.random() * 3) + 2;

    for (let i = 0; i < numChanges; i++) {
        const randomSeat = gameState.seats[Math.floor(Math.random() * gameState.seats.length)];
        // Only toggle if not in cart and not already purchased
        if (!randomSeat.inCart && !randomSeat.isPurchased) {
            randomSeat.isAvailable = !randomSeat.isAvailable;
        }
    }

    renderSeats();
}

// Update seat prices randomly
function updateSeatPrices() {
    if (!gameState.isRunning) return;

    gameState.seats.forEach(seat => {
        if (!seat.inCart && seat.isAvailable && !seat.isPurchased) {
            // Fluctuate price by -30% to +30% of base price
            const fluctuation = (Math.random() - 0.5) * 0.6;
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
    if (Math.random() < 0.6) {
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
        }
    });

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

    // Show final stats
    document.getElementById('final-score').textContent = Math.floor(gameState.score);
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

// Setup event listeners
function setupEventListeners() {
    // Start button
    document.getElementById('start-btn').addEventListener('click', startGame);

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
        startGame();
    });
}

// Initialize on load
document.addEventListener('DOMContentLoaded', initGame);
