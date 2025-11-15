// chessCaptcha.js - Chess Checkmate CAPTCHA Challenge
import { gameState } from '../gameState.js';
import { hasOverlappingSeats } from '../cartManagement.js';

// Module-level state
let animationId = null;
let chessGameState = null;
let timerInterval = null;

// Constants
const TIMER_DURATION = 15;
const CANVAS_SIZE = 400;
const SQUARE_SIZE = 50; // 400 / 8 = 50px per square

// Colors
const LIGHT_SQUARE = '#f0d9b5';
const DARK_SQUARE = '#b58863';
const SELECTED_COLOR = '#ffeb3b';
const VALID_MOVE_COLOR = '#4caf50';

// Chess piece Unicode symbols
const PIECES = {
    'K': '♔', 'Q': '♕', 'R': '♖', 'B': '♗', 'N': '♘', 'P': '♙', // White pieces
    'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟'  // Black pieces
};

// Mate-in-1 puzzles based on classic checkmate patterns
// Format: { board: 8x8 array, playerColor: 'white'|'black', solution: {from: [row,col], to: [row,col]}, description }
// Board coordinates: [0,0] = a8 (top-left), [7,7] = h1 (bottom-right)
const PUZZLES = [
    {
        // Back Rank Mate - Classic back rank checkmate
        // Black king trapped by own pawns on back rank, white rook delivers mate
        board: [
            [null, null, null, null, null, null, 'k', null],  // a8-h8: king on g8
            [null, null, null, null, null, 'p', 'p', 'p'],     // a7-h7: pawns trap king
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            ['P', 'P', 'P', null, null, 'P', 'P', 'P'],
            [null, null, null, null, 'R', null, 'K', null]     // a1-h1: White rook on e1
        ],
        playerColor: 'white',
        solution: { from: [7, 4], to: [0, 4] }, // Rook e1 to e8#
        description: 'Back Rank Mate'
    },
    {
        // Smothered Mate - Knight delivers mate, king smothered by own pieces
        // King on h8, rook on g7, pawns on f7/g7/h7, knight delivers mate on f7
        board: [
            [null, null, null, null, null, null, 'r', 'k'],    // Rook on g8, King on h8
            [null, null, null, null, null, 'p', 'p', 'p'],    // Pawns on f7, g7, h7
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, 'N', null, null, null],   // Knight on e5
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            ['P', 'P', 'P', null, null, 'P', 'P', 'P'],
            ['R', null, null, 'Q', null, null, 'K', null]      // Queen on d1
        ],
        playerColor: 'white',
        solution: { from: [3, 4], to: [1, 5] }, // Knight e5 to f7#
        description: 'Smothered Mate'
    },
    {
        // Anastasia's Mate - Rook and knight trap king on edge
        // King on h8, pawn on g7, knight on f6 controls escape, rook delivers mate on h-file
        board: [
            [null, null, null, null, null, null, null, 'k'],    // King on h8
            [null, null, null, null, null, null, 'p', null],    // Pawn on g7 (blocks king escape)
            [null, null, null, null, null, 'N', null, null],    // White knight on f6 (controls g8, h7)
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            ['P', 'P', null, null, null, 'P', 'P', null],
            [null, null, null, null, null, 'K', 'R', null]      // King on f1, Rook on g1
        ],
        playerColor: 'white',
        solution: { from: [7, 6], to: [7, 7] }, // Rook g1 to h1#
        description: "Anastasia's Mate"
    },
    {
        // Epaulette Mate - Queen delivers mate, king's own rooks block escape
        // King trapped between own rooks on back rank
        board: [
            [null, null, null, null, 'r', 'k', 'r', null],     // Rooks on e8 and g8, king on f8
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            [null, null, 'Q', null, null, null, null, null],   // White queen on c3
            ['P', 'P', 'P', null, null, 'P', 'P', 'P'],
            ['R', null, null, null, 'K', null, null, 'R']
        ],
        playerColor: 'white',
        solution: { from: [5, 2], to: [2, 5] }, // Queen c3 to f6#
        description: "Epaulette Mate"
    },
    {
        // Arabian Mate - Rook and knight corner the king
        // Rook on a8 delivers mate on h-file, knight on f6 protects and controls escape squares
        board: [
            [null, null, null, null, null, null, null, 'k'],    // King on h8
            ['R', null, null, null, null, null, null, null],    // Rook on a8
            [null, null, null, null, null, 'N', null, null],    // White knight on f6 (protects g8, controls g7/h7)
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            ['P', 'P', 'P', null, null, 'P', 'P', 'P'],
            [null, null, null, null, null, null, 'R', 'K']
        ],
        playerColor: 'white',
        solution: { from: [1, 0], to: [1, 7] }, // Rook a8 to h8#
        description: 'Arabian Mate'
    },
    {
        // Queen and King Mate - Simple queen checkmate in endgame
        // White king on f6 controls escape squares, queen delivers mate on g7
        board: [
            [null, null, null, null, null, null, null, 'k'],   // Black king on h8
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, 'K', null, null],   // White king on f6 (controls g7/h7/g8)
            [null, null, null, null, null, null, 'Q', null],   // White queen on g5 (clear path to g7)
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            ['P', 'P', 'P', null, null, 'P', 'P', 'P'],
            ['R', null, null, null, null, null, null, 'R']
        ],
        playerColor: 'white',
        solution: { from: [3, 6], to: [1, 6] }, // Queen g5 to g7#
        description: 'Queen Mate'
    },
    {
        // Scholar's Mate - Classic beginner trap
        // Bishop on c4 supports queen, black king exposed after pawn moved
        board: [
            ['r', 'n', 'b', 'q', 'k', null, null, 'r'],        // Black back rank
            ['p', 'p', 'p', 'p', null, 'p', 'p', 'p'],         // e7 pawn moved
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, 'p', null, null, null],   // Black pawn on e5
            [null, null, 'B', null, null, null, null, null],   // White bishop on c4
            [null, null, null, null, null, 'Q', null, null],   // White queen on f3
            ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
            ['R', 'N', 'B', null, 'K', null, 'N', 'R']
        ],
        playerColor: 'white',
        solution: { from: [5, 5], to: [1, 5] }, // Queen f3 to f7#
        description: "Scholar's Mate"
    },
    {
        // Ladder Mate - Two rooks drive king to edge
        // One rook on b7 cuts off 7th rank, other delivers mate on g8
        board: [
            [null, null, null, null, 'k', null, null, null],   // Black king on e8
            [null, 'R', null, null, null, null, null, null],   // White rook on b7 (cuts off 7th rank, prevents king moving to e7)
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            [null, null, 'K', null, null, null, 'R', null]     // White king on c1, Rook on g1 (will deliver mate)
        ],
        playerColor: 'white',
        solution: { from: [7, 6], to: [0, 6] }, // Rook g1 to g8#
        description: 'Ladder Mate'
    }
];

/**
 * Main entry point - shows the chess CAPTCHA
 */
export function showCAPTCHA() {
    // Get DOM elements
    const modal = document.getElementById('chess-captcha-modal');
    const canvas = document.getElementById('chess-canvas');
    const ctx = canvas.getContext('2d');
    const timerDisplay = document.getElementById('chess-timer');
    const feedbackEl = document.getElementById('chess-feedback');
    const cancelButton = document.getElementById('cancel-chess-button');
    const resetButton = document.getElementById('reset-chess-button');

    // Check for multiplayer competition warning
    const warningEl = document.getElementById('chess-captcha-warning');
    if (gameState.isMultiplayer && hasOverlappingSeats()) {
        warningEl.classList.remove('hidden');
    } else {
        warningEl.classList.add('hidden');
    }

    // Initialize chess game state
    const randomPuzzle = PUZZLES[Math.floor(Math.random() * PUZZLES.length)];
    chessGameState = {
        timeRemaining: TIMER_DURATION,
        puzzle: randomPuzzle,
        board: JSON.parse(JSON.stringify(randomPuzzle.board)), // Deep copy
        selectedSquare: null,
        validMoves: [],
        moveHistory: []
    };

    // Show feedback
    function showFeedback(message, isSuccess) {
        feedbackEl.textContent = message;
        feedbackEl.style.color = isSuccess ? '#4caf50' : '#ef4444';
    }

    // Clear feedback
    feedbackEl.textContent = '';

    // Draw the chess board
    function drawBoard() {
        ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

        // Draw squares
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const isLight = (row + col) % 2 === 0;
                ctx.fillStyle = isLight ? LIGHT_SQUARE : DARK_SQUARE;
                ctx.fillRect(col * SQUARE_SIZE, row * SQUARE_SIZE, SQUARE_SIZE, SQUARE_SIZE);

                // Highlight selected square
                if (chessGameState.selectedSquare &&
                    chessGameState.selectedSquare.row === row &&
                    chessGameState.selectedSquare.col === col) {
                    ctx.fillStyle = SELECTED_COLOR;
                    ctx.globalAlpha = 0.5;
                    ctx.fillRect(col * SQUARE_SIZE, row * SQUARE_SIZE, SQUARE_SIZE, SQUARE_SIZE);
                    ctx.globalAlpha = 1;
                }

                // Draw pieces
                const piece = chessGameState.board[row][col];
                if (piece) {
                    ctx.font = '40px serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillStyle = '#000';
                    ctx.fillText(
                        PIECES[piece],
                        col * SQUARE_SIZE + SQUARE_SIZE / 2,
                        row * SQUARE_SIZE + SQUARE_SIZE / 2
                    );
                }
            }
        }

        // Draw valid move indicators
        chessGameState.validMoves.forEach(([row, col]) => {
            ctx.fillStyle = VALID_MOVE_COLOR;
            ctx.globalAlpha = 0.3;
            ctx.beginPath();
            ctx.arc(
                col * SQUARE_SIZE + SQUARE_SIZE / 2,
                row * SQUARE_SIZE + SQUARE_SIZE / 2,
                12,
                0,
                Math.PI * 2
            );
            ctx.fill();
            ctx.globalAlpha = 1;
        });
    }

    // Get valid moves for a piece (simplified - just for mate-in-1 puzzles)
    function getValidMoves(row, col) {
        const piece = chessGameState.board[row][col];
        if (!piece) return [];

        const isWhite = piece === piece.toUpperCase();
        const playerIsWhite = chessGameState.puzzle.playerColor === 'white';

        // Only allow player's pieces
        if (isWhite !== playerIsWhite) return [];

        const moves = [];
        const pieceType = piece.toLowerCase();

        switch (pieceType) {
            case 'r': // Rook
                // Horizontal and vertical
                for (let i = 0; i < 8; i++) {
                    if (i !== col) moves.push([row, i]); // Horizontal
                    if (i !== row) moves.push([i, col]); // Vertical
                }
                break;
            case 'n': // Knight
                const knightMoves = [
                    [-2, -1], [-2, 1], [-1, -2], [-1, 2],
                    [1, -2], [1, 2], [2, -1], [2, 1]
                ];
                knightMoves.forEach(([dr, dc]) => {
                    const newRow = row + dr;
                    const newCol = col + dc;
                    if (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
                        moves.push([newRow, newCol]);
                    }
                });
                break;
            case 'b': // Bishop
                // Diagonals
                for (let i = 1; i < 8; i++) {
                    if (row + i < 8 && col + i < 8) moves.push([row + i, col + i]);
                    if (row + i < 8 && col - i >= 0) moves.push([row + i, col - i]);
                    if (row - i >= 0 && col + i < 8) moves.push([row - i, col + i]);
                    if (row - i >= 0 && col - i >= 0) moves.push([row - i, col - i]);
                }
                break;
            case 'q': // Queen
                // Combination of rook and bishop
                for (let i = 0; i < 8; i++) {
                    if (i !== col) moves.push([row, i]);
                    if (i !== row) moves.push([i, col]);
                }
                for (let i = 1; i < 8; i++) {
                    if (row + i < 8 && col + i < 8) moves.push([row + i, col + i]);
                    if (row + i < 8 && col - i >= 0) moves.push([row + i, col - i]);
                    if (row - i >= 0 && col + i < 8) moves.push([row - i, col + i]);
                    if (row - i >= 0 && col - i >= 0) moves.push([row - i, col - i]);
                }
                break;
            case 'k': // King
                for (let dr = -1; dr <= 1; dr++) {
                    for (let dc = -1; dc <= 1; dc++) {
                        if (dr === 0 && dc === 0) continue;
                        const newRow = row + dr;
                        const newCol = col + dc;
                        if (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
                            moves.push([newRow, newCol]);
                        }
                    }
                }
                break;
            case 'p': // Pawn
                const direction = isWhite ? -1 : 1;
                const newRow = row + direction;
                if (newRow >= 0 && newRow < 8) {
                    // Forward move
                    if (!chessGameState.board[newRow][col]) {
                        moves.push([newRow, col]);
                    }
                    // Diagonal captures
                    if (col > 0 && chessGameState.board[newRow][col - 1]) {
                        moves.push([newRow, col - 1]);
                    }
                    if (col < 7 && chessGameState.board[newRow][col + 1]) {
                        moves.push([newRow, col + 1]);
                    }
                }
                break;
        }

        // Filter out moves that capture own pieces
        return moves.filter(([r, c]) => {
            const targetPiece = chessGameState.board[r][c];
            if (!targetPiece) return true;
            const targetIsWhite = targetPiece === targetPiece.toUpperCase();
            return targetIsWhite !== isWhite;
        });
    }

    // Check if the move is the correct solution
    function isCorrectMove(fromRow, fromCol, toRow, toCol) {
        const solution = chessGameState.puzzle.solution;
        return fromRow === solution.from[0] &&
               fromCol === solution.from[1] &&
               toRow === solution.to[0] &&
               toCol === solution.to[1];
    }

    // Make a move
    function makeMove(fromRow, fromCol, toRow, toCol) {
        const piece = chessGameState.board[fromRow][fromCol];
        chessGameState.board[toRow][toCol] = piece;
        chessGameState.board[fromRow][fromCol] = null;
        chessGameState.moveHistory.push({ from: [fromRow, fromCol], to: [toRow, toCol] });
    }

    // Handle canvas click
    function handleCanvasClick(e) {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const col = Math.floor(x / SQUARE_SIZE);
        const row = Math.floor(y / SQUARE_SIZE);

        if (row < 0 || row >= 8 || col < 0 || col >= 8) return;

        const piece = chessGameState.board[row][col];

        // If no piece selected, select this piece
        if (!chessGameState.selectedSquare) {
            if (piece) {
                const isWhite = piece === piece.toUpperCase();
                const playerIsWhite = chessGameState.puzzle.playerColor === 'white';

                if (isWhite === playerIsWhite) {
                    chessGameState.selectedSquare = { row, col };
                    chessGameState.validMoves = getValidMoves(row, col);
                    drawBoard();
                } else {
                    showFeedback('Select your own piece!', false);
                }
            }
        } else {
            // Try to move to this square
            const fromRow = chessGameState.selectedSquare.row;
            const fromCol = chessGameState.selectedSquare.col;

            // Check if this is a valid move
            const isValid = chessGameState.validMoves.some(([r, c]) => r === row && c === col);

            if (isValid) {
                // Check if it's the correct solution
                if (isCorrectMove(fromRow, fromCol, row, col)) {
                    makeMove(fromRow, fromCol, row, col);
                    drawBoard();
                    showFeedback('Checkmate! ✓', true);
                    setTimeout(() => {
                        handleSuccess();
                    }, 1000);
                } else {
                    showFeedback('Not the checkmate move! Try again.', false);
                    chessGameState.selectedSquare = null;
                    chessGameState.validMoves = [];
                    drawBoard();
                }
            } else {
                // Deselect or select new piece
                if (piece) {
                    const isWhite = piece === piece.toUpperCase();
                    const playerIsWhite = chessGameState.puzzle.playerColor === 'white';

                    if (isWhite === playerIsWhite) {
                        chessGameState.selectedSquare = { row, col };
                        chessGameState.validMoves = getValidMoves(row, col);
                        drawBoard();
                        showFeedback('', false);
                    }
                } else {
                    chessGameState.selectedSquare = null;
                    chessGameState.validMoves = [];
                    drawBoard();
                }
            }
        }
    }

    // Handle reset button
    function handleReset() {
        chessGameState.board = JSON.parse(JSON.stringify(chessGameState.puzzle.board));
        chessGameState.selectedSquare = null;
        chessGameState.validMoves = [];
        chessGameState.moveHistory = [];
        showFeedback('', false);
        drawBoard();
    }

    // Handle cancel
    function handleCancel() {
        cleanup();
    }

    // Success handler
    function handleSuccess() {
        cleanup();
        if (window.completeCheckout) window.completeCheckout();
    }

    // Cleanup function
    function cleanup() {
        clearInterval(timerInterval);
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
        canvas.removeEventListener('click', handleCanvasClick);
        cancelButton.removeEventListener('click', handleCancel);
        resetButton.removeEventListener('click', handleReset);
        modal.classList.add('hidden');
        chessGameState = null;
    }

    // Set up event listeners
    canvas.addEventListener('click', handleCanvasClick);
    cancelButton.addEventListener('click', handleCancel);
    resetButton.addEventListener('click', handleReset);

    // Start timer
    timerInterval = setInterval(() => {
        chessGameState.timeRemaining--;
        timerDisplay.textContent = chessGameState.timeRemaining;

        if (chessGameState.timeRemaining <= 0) {
            clearInterval(timerInterval);
            timerInterval = null;
            showFeedback('Time expired! Try again.', false);
            setTimeout(() => {
                cleanup();
            }, 2000);
        }
    }, 1000);

    // Initial draw
    drawBoard();

    // Show modal
    modal.classList.remove('hidden');
}
