// Seat generation, pricing, and rendering logic
import { gameState } from './gameState.js';
import { SEAT_ROWS, SEAT_COLS } from './config.js';

/**
 * Generate seats based on grid configuration
 * Creates seat array with initial availability and pricing
 */
export function generateSeats() {
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
        // sendMultiplayerMessage will be called from multiplayer module
        return initialAvailability;
    }
}

/**
 * Calculate seat price based on position
 * Better seats (front, center) cost more
 * @param {number} row - Row number
 * @param {number} col - Column number
 * @returns {number} Price rounded to nearest $20
 */
export function calculateSeatPrice(row, col) {
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

/**
 * Get price color based on deal quality
 * @param {number} currentPrice - Current price
 * @param {number} basePrice - Base price
 * @returns {string} Hex color code
 */
export function getPriceColor(currentPrice, basePrice) {
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

/**
 * Render seats on the board
 * Updates DOM with current seat states
 */
export function renderSeats() {
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
        // Note: handleSeatClick will be imported and set by cartManagement module
        if ((seat.isAvailable || seat.inCart) && window.handleSeatClick) {
            seatElement.addEventListener('click', () => window.handleSeatClick(seat.id));
        }

        seatingChart.appendChild(seatElement);
    });
}

/**
 * Update seat availability randomly (host-driven in multiplayer)
 */
export function updateSeatAvailability() {
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

    renderSeats();

    // Return changed seats for multiplayer broadcasting
    return changedSeats;
}

/**
 * Update seat prices randomly (host-driven in multiplayer)
 */
export function updateSeatPrices() {
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

    renderSeats();

    // Return price updates for multiplayer broadcasting
    return priceUpdates;
}
