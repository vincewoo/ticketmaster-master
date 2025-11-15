// Configuration constants and grid management

// Game timing constants
export const GAME_DURATION = 120; // 2 minutes in seconds
export const CAPTCHA_DURATION = 10; // seconds to solve CAPTCHA
export const FISHING_CAPTCHA_DURATION = 10; // seconds to solve fishing CAPTCHA

// Seat layout constants
export const SEAT_ROWS = 8;
export const SEAT_COLS = 12;
export const TOTAL_SEATS = SEAT_ROWS * SEAT_COLS;

// Game mechanics constants
export const SKIP_PENALTY = 50; // Penalty for skipping a target

// Seat price tiers
export const PRICE_TIERS = [
    { range: [50, 80], color: 'tier-cheap' },
    { range: [80, 120], color: 'tier-medium' },
    { range: [120, 200], color: 'tier-expensive' },
    { range: [200, 350], color: 'tier-premium' }
];

/**
 * Get grid configuration based on screen size
 * Matches CSS media query breakpoints
 * @returns {Object} Grid configuration { columns, rows, total }
 */
export function getGridConfig() {
    const width = window.innerWidth;
    if (width <= 480) {
        return { columns: 4, rows: 24, total: 96 }; // Small phones: 4 columns, wraps to 24 rows
    } else if (width <= 768) {
        return { columns: 6, rows: 16, total: 96 }; // Medium phones/tablets: 6 columns, wraps to 16 rows
    } else {
        return { columns: 12, rows: 8, total: 96 }; // Desktop/large tablets: 12x8
    }
}

/**
 * Get current display grid columns based on window width
 * @returns {number} Number of columns in current layout
 */
export function getCurrentGridColumns() {
    const width = window.innerWidth;
    if (width <= 480) {
        return 4;
    } else if (width <= 768) {
        return 6;
    } else {
        return 12;
    }
}

/**
 * Apply grid layout to seating chart
 * @param {Object} config - Grid configuration object
 */
export function applyGridLayout(config) {
    const seatingChart = document.getElementById('seating-chart');
    // Use setProperty with priority to override CSS media queries
    seatingChart.style.setProperty('grid-template-columns', `repeat(${config.columns}, 1fr)`, 'important');
}
