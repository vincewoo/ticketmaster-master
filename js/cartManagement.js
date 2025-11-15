// Cart management and validation logic
import { gameState } from './gameState.js';
import { renderSeats } from './seatManagement.js';

/**
 * Check if seats are adjacent (side-by-side in same row)
 * For 4+ seats, allows 2 consecutive rows with touching blocks
 * @param {Array} cartItems - Array of cart items
 * @returns {boolean} True if seats are adjacent
 */
export function areSeatsAdjacent(cartItems) {
    if (cartItems.length === 0) return false;
    if (cartItems.length === 1) return true;

    // Get seat objects
    const seats = cartItems.map(item =>
        gameState.seats.find(s => s.id === item.seatId)
    );

    // Recalculate row/col based on current grid columns (responsive layout)
    const currentCols = gameState.currentGridColumns;
    const seatsWithCurrentPosition = seats.map(seat => {
        // Find seat index in the original seats array
        const seatIndex = gameState.seats.findIndex(s => s.id === seat.id);
        // Recalculate row and col based on current grid
        const currentRow = Math.floor(seatIndex / currentCols);
        const currentCol = seatIndex % currentCols;
        return {
            ...seat,
            currentRow,
            currentCol
        };
    });

    // Group by current row (not original row)
    const rowGroups = {};
    seatsWithCurrentPosition.forEach(seat => {
        if (!rowGroups[seat.currentRow]) {
            rowGroups[seat.currentRow] = [];
        }
        rowGroups[seat.currentRow].push(seat.currentCol);
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

/**
 * Check if there are overlapping seats with opponent
 * @returns {boolean} True if any seats overlap
 */
export function hasOverlappingSeats() {
    if (!gameState.isMultiplayer) return false;

    const mySeats = gameState.cart.map(item => item.seatId);
    const opponentSeats = gameState.opponentCart;

    // Check if any seats match
    return mySeats.some(seatId => opponentSeats.includes(seatId));
}

/**
 * Handle seat click event
 * @param {string} seatId - Seat ID
 */
export function handleSeatClick(seatId) {
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
    // Note: sendMultiplayerMessage will be called from multiplayer module
    if (gameState.isMultiplayer && window.sendMultiplayerMessage) {
        window.sendMultiplayerMessage({
            type: 'cartUpdate',
            cart: gameState.cart.map(item => item.seatId)
        });
    }

    renderSeats();
    updateCart();
}

/**
 * Remove seat from cart
 * @param {string} seatId - Seat ID
 */
export function removeSeatFromCart(seatId) {
    const seat = gameState.seats.find(s => s.id === seatId);
    if (seat) {
        seat.inCart = false;
    }

    gameState.cart = gameState.cart.filter(item => item.seatId !== seatId);

    // Send cart update to opponent in multiplayer
    if (gameState.isMultiplayer && window.sendMultiplayerMessage) {
        window.sendMultiplayerMessage({
            type: 'cartUpdate',
            cart: gameState.cart.map(item => item.seatId)
        });
    }

    renderSeats();
    updateCart();
}

/**
 * Update cart display
 * Shows cart items, total, and validation status
 */
export function updateCart() {
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

// Note: Window exports handled by main.js
