// Minesweeper CAPTCHA - End-game scenario with one mine remaining
import { gameState } from '../gameState.js';
import { hasOverlappingSeats } from '../cartManagement.js';

// Module-level state
let minesweeperState = null;

// Constants
const TIMER_DURATION = 15;
const GRID_SIZE = 5; // 5x5 grid
const CELL_SIZE = 60;

// Main export function - NO PARAMETERS!
export function showCAPTCHA() {
    // Get DOM elements
    const modal = document.getElementById('minesweeper-captcha-modal');
    const canvas = document.getElementById('minesweeper-canvas');
    const ctx = canvas.getContext('2d');
    const timerDisplay = document.getElementById('minesweeper-timer');
    const feedbackEl = document.getElementById('minesweeper-feedback');
    const cancelButton = document.getElementById('minesweeper-cancel-btn');

    // Check for multiplayer competition warning
    const warningEl = document.getElementById('minesweeper-captcha-warning');
    if (gameState.isMultiplayer && hasOverlappingSeats()) {
        warningEl.classList.remove('hidden');
    } else {
        warningEl.classList.add('hidden');
    }

    // Initialize local game state
    minesweeperState = {
        timeRemaining: TIMER_DURATION,
        grid: [],
        minePosition: null,
        revealedCells: new Set(),
        gameOver: false
    };

    // Generate end-game minesweeper scenario
    generateEndGameScenario();

    // Event listeners
    const handleCanvasClick = (e) => {
        if (minesweeperState.gameOver) return;

        const rect = canvas.getBoundingClientRect();
        const x = Math.floor((e.clientX - rect.left) / CELL_SIZE);
        const y = Math.floor((e.clientY - rect.top) / CELL_SIZE);

        if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE) {
            handleCellClick(x, y);
        }
    };

    const handleCancel = () => {
        cleanup();
    };

    canvas.addEventListener('click', handleCanvasClick);
    cancelButton.addEventListener('click', handleCancel);

    // Start timer
    const timerInterval = setInterval(() => {
        minesweeperState.timeRemaining--;
        timerDisplay.textContent = minesweeperState.timeRemaining;

        if (minesweeperState.timeRemaining <= 0) {
            clearInterval(timerInterval);
            handleFailure('Time\'s up!');
        }
    }, 1000);

    // Generate end-game scenario with one mine left
    function generateEndGameScenario() {
        // Initialize grid
        for (let y = 0; y < GRID_SIZE; y++) {
            minesweeperState.grid[y] = [];
            for (let x = 0; x < GRID_SIZE; x++) {
                minesweeperState.grid[y][x] = { mine: false, number: 0, revealed: false };
            }
        }

        // Place the hidden mine randomly (this is the one the player must find)
        const mineX = Math.floor(Math.random() * GRID_SIZE);
        const mineY = Math.floor(Math.random() * GRID_SIZE);
        minesweeperState.grid[mineY][mineX].mine = true;
        minesweeperState.minePosition = { x: mineX, y: mineY };

        // Place 2-4 additional "already found" mines randomly (these will be revealed)
        const numRevealedMines = Math.floor(Math.random() * 3) + 2; // 2-4 mines
        const revealedMines = [];

        for (let i = 0; i < numRevealedMines; i++) {
            let rx, ry;
            let attempts = 0;
            do {
                rx = Math.floor(Math.random() * GRID_SIZE);
                ry = Math.floor(Math.random() * GRID_SIZE);
                attempts++;
                // Make sure we don't place on the hidden mine or too close to it
                // Also avoid placing on already placed revealed mines
            } while (
                attempts < 50 && (
                    (rx === mineX && ry === mineY) || // Not on the hidden mine
                    revealedMines.some(m => m.x === rx && m.y === ry) || // Not on another revealed mine
                    (Math.abs(rx - mineX) <= 1 && Math.abs(ry - mineY) <= 1) // Not adjacent to hidden mine (makes puzzle too easy)
                )
            );

            if (attempts < 50) {
                minesweeperState.grid[ry][rx].mine = true;
                minesweeperState.grid[ry][rx].revealed = true; // Mark as already revealed
                revealedMines.push({ x: rx, y: ry });
            }
        }

        // Calculate numbers for all cells
        for (let y = 0; y < GRID_SIZE; y++) {
            for (let x = 0; x < GRID_SIZE; x++) {
                if (!minesweeperState.grid[y][x].mine) {
                    minesweeperState.grid[y][x].number = countAdjacentMines(x, y);
                }
            }
        }

        // Reveal all cells except the hidden mine and ONE adjacent cell
        // This creates a solvable end-game scenario with 2 choices
        const cellsToKeepHidden = new Set();
        cellsToKeepHidden.add(`${mineX},${mineY}`); // The hidden mine itself

        // Keep exactly 1 adjacent cell hidden (makes it a 50/50 deduction puzzle)
        const adjacentCells = getAdjacentCells(mineX, mineY);
        if (adjacentCells.length > 0) {
            const randomIndex = Math.floor(Math.random() * adjacentCells.length);
            const hiddenCell = adjacentCells[randomIndex];
            cellsToKeepHidden.add(`${hiddenCell.x},${hiddenCell.y}`);
        }

        // Reveal all other cells (including revealed mines)
        for (let y = 0; y < GRID_SIZE; y++) {
            for (let x = 0; x < GRID_SIZE; x++) {
                const key = `${x},${y}`;
                if (!cellsToKeepHidden.has(key)) {
                    minesweeperState.revealedCells.add(key);
                }
            }
        }

        drawGrid();
    }

    // Get adjacent cells
    function getAdjacentCells(x, y) {
        const adjacent = [];
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                const nx = x + dx;
                const ny = y + dy;
                if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE) {
                    adjacent.push({ x: nx, y: ny });
                }
            }
        }
        return adjacent;
    }

    // Count adjacent mines
    function countAdjacentMines(x, y) {
        let count = 0;
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                const nx = x + dx;
                const ny = y + dy;
                if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE) {
                    if (minesweeperState.grid[ny][nx].mine) {
                        count++;
                    }
                }
            }
        }
        return count;
    }

    // Handle cell click
    function handleCellClick(x, y) {
        const key = `${x},${y}`;

        // Ignore if already revealed
        if (minesweeperState.revealedCells.has(key)) return;

        const cell = minesweeperState.grid[y][x];

        if (cell.mine) {
            // Clicked on mine - SUCCESS!
            minesweeperState.revealedCells.add(key);
            minesweeperState.gameOver = true;
            drawGrid();
            handleSuccess();
        } else {
            // Clicked on safe cell - FAILURE!
            minesweeperState.revealedCells.add(key);
            minesweeperState.gameOver = true;
            // Also reveal the mine to show where it was
            minesweeperState.revealedCells.add(`${minesweeperState.minePosition.x},${minesweeperState.minePosition.y}`);
            drawGrid();
            handleFailure('Wrong! You needed to find the mine, not a safe cell!');
        }
    }

    // Draw the grid
    function drawGrid() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        for (let y = 0; y < GRID_SIZE; y++) {
            for (let x = 0; x < GRID_SIZE; x++) {
                const key = `${x},${y}`;
                const cell = minesweeperState.grid[y][x];
                const revealed = minesweeperState.revealedCells.has(key);

                const px = x * CELL_SIZE;
                const py = y * CELL_SIZE;

                if (revealed) {
                    // Draw revealed cell
                    ctx.fillStyle = '#ddd';
                    ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
                    ctx.strokeStyle = '#999';
                    ctx.strokeRect(px, py, CELL_SIZE, CELL_SIZE);

                    if (cell.mine) {
                        // Draw mine
                        ctx.fillStyle = '#000';
                        ctx.beginPath();
                        ctx.arc(px + CELL_SIZE / 2, py + CELL_SIZE / 2, 15, 0, Math.PI * 2);
                        ctx.fill();

                        // Draw spikes
                        ctx.strokeStyle = '#000';
                        ctx.lineWidth = 2;
                        for (let i = 0; i < 8; i++) {
                            const angle = (i * Math.PI) / 4;
                            const x1 = px + CELL_SIZE / 2 + Math.cos(angle) * 10;
                            const y1 = py + CELL_SIZE / 2 + Math.sin(angle) * 10;
                            const x2 = px + CELL_SIZE / 2 + Math.cos(angle) * 20;
                            const y2 = py + CELL_SIZE / 2 + Math.sin(angle) * 20;
                            ctx.beginPath();
                            ctx.moveTo(x1, y1);
                            ctx.lineTo(x2, y2);
                            ctx.stroke();
                        }
                    } else if (cell.number > 0) {
                        // Draw number
                        const colors = ['', '#0000ff', '#008000', '#ff0000', '#000080', '#800000', '#008080', '#000000', '#808080'];
                        ctx.fillStyle = colors[cell.number];
                        ctx.font = 'bold 24px Arial';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText(cell.number, px + CELL_SIZE / 2, py + CELL_SIZE / 2);
                    }
                } else {
                    // Draw unrevealed cell
                    ctx.fillStyle = '#bbb';
                    ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
                    ctx.strokeStyle = '#999';
                    ctx.strokeRect(px, py, CELL_SIZE, CELL_SIZE);

                    // Draw 3D effect
                    ctx.strokeStyle = '#fff';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(px, py + CELL_SIZE);
                    ctx.lineTo(px, py);
                    ctx.lineTo(px + CELL_SIZE, py);
                    ctx.stroke();

                    ctx.strokeStyle = '#888';
                    ctx.beginPath();
                    ctx.moveTo(px + CELL_SIZE, py);
                    ctx.lineTo(px + CELL_SIZE, py + CELL_SIZE);
                    ctx.lineTo(px, py + CELL_SIZE);
                    ctx.stroke();
                }
            }
        }
    }

    // Success handler
    function handleSuccess() {
        clearInterval(timerInterval);
        feedbackEl.textContent = '✓ Mine found! Verification complete!';
        feedbackEl.style.color = '#16a34a';
        setTimeout(() => {
            cleanup();
            if (window.completeCheckout) window.completeCheckout();
        }, 1500);
    }

    // Failure handler
    function handleFailure(message) {
        clearInterval(timerInterval);
        feedbackEl.textContent = message;
        feedbackEl.style.color = '#dc2626';
        setTimeout(() => {
            cleanup();
        }, 2500);
    }

    // Cleanup function
    function cleanup() {
        clearInterval(timerInterval);
        canvas.removeEventListener('click', handleCanvasClick);
        cancelButton.removeEventListener('click', handleCancel);
        modal.classList.add('hidden');
        feedbackEl.textContent = '';
        minesweeperState = null;
    }

    // Show modal and start
    modal.classList.remove('hidden');
    drawGrid();
}
