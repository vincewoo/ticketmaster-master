// Multiplayer mode and PeerJS connection management
import { gameState } from './gameState.js';
import { getGridConfig, applyGridLayout } from './config.js';
import { renderSeats } from './seatManagement.js';
import { updateDisplay } from './gameFlow.js';

/**
 * Initialize multiplayer mode selection
 * Sets up event listeners for multiplayer buttons
 */
export function initMultiplayer() {
    const singlePlayerBtn = document.getElementById('single-player-btn');
    if (singlePlayerBtn) {
        singlePlayerBtn.addEventListener('click', () => {
            gameState.isMultiplayer = false;
            window.hideModal('start-modal');
            if (window.showLoadingScreen) {
                window.showLoadingScreen(window.startGame);
            }
        });
    }

    const multiplayerBtn = document.getElementById('multiplayer-btn');
    if (multiplayerBtn) {
        multiplayerBtn.addEventListener('click', () => {
            window.hideModal('start-modal');
            window.showModal('multiplayer-modal');
        });
    }

    const backToStartBtn = document.getElementById('back-to-start-btn');
    if (backToStartBtn) {
        backToStartBtn.addEventListener('click', () => {
            window.hideModal('multiplayer-modal');
            window.showModal('start-modal');
        });
    }

    const hostGameBtn = document.getElementById('host-game-btn');
    if (hostGameBtn) {
        hostGameBtn.addEventListener('click', hostGame);
    }

    const joinGameBtn = document.getElementById('join-game-btn');
    if (joinGameBtn) {
        joinGameBtn.addEventListener('click', () => {
            window.hideModal('multiplayer-modal');
            window.showModal('join-modal');
        });
    }

    const cancelHostBtn = document.getElementById('cancel-host-btn');
    if (cancelHostBtn) {
        cancelHostBtn.addEventListener('click', cancelHost);
    }

    const cancelJoinBtn = document.getElementById('cancel-join-btn');
    if (cancelJoinBtn) {
        cancelJoinBtn.addEventListener('click', cancelJoin);
    }

    const connectBtn = document.getElementById('connect-btn');
    if (connectBtn) {
        connectBtn.addEventListener('click', joinGame);
    }

    const copyCodeBtn = document.getElementById('copy-code-btn');
    if (copyCodeBtn) {
        copyCodeBtn.addEventListener('click', copyGameCode);
    }
}

/**
 * Host a new game
 * Creates PeerJS peer and waits for guest connection
 */
export function hostGame() {
    window.hideModal('multiplayer-modal');
    window.showModal('host-modal');

    gameState.isMultiplayer = true;
    gameState.isHost = true;

    // Create peer with PeerJS
    gameState.peer = new Peer();

    gameState.peer.on('open', (id) => {
        const gameCodeEl = document.getElementById('game-code');
        if (gameCodeEl) {
            gameCodeEl.value = id;
        }
        const hostStatusEl = document.getElementById('host-status');
        if (hostStatusEl) {
            hostStatusEl.textContent = 'Waiting for player to join...';
        }
    });

    gameState.peer.on('connection', (conn) => {
        gameState.connection = conn;
        setupConnection(conn);
        const hostStatusEl = document.getElementById('host-status');
        if (hostStatusEl) {
            hostStatusEl.textContent = 'Player connected! Starting game...';
        }

        // Wait for connection to be fully established before sending data
        conn.on('open', () => {
            // Send init message and grid config to guest
            conn.send({
                type: 'init',
                gridConfig: getGridConfig()
            });

            setTimeout(() => {
                window.hideModal('host-modal');
                if (window.showLoadingScreen) {
                    window.showLoadingScreen(window.startGame);
                }
            }, 1000);
        });
    });

    gameState.peer.on('error', (err) => {
        console.error('Peer error:', err);
        const hostStatusEl = document.getElementById('host-status');
        if (hostStatusEl) {
            hostStatusEl.textContent = 'Connection error. Please try again.';
        }
    });
}

/**
 * Join an existing game
 * Connects to host using provided game code
 */
export function joinGame() {
    const codeInput = document.getElementById('join-code-input');
    const code = codeInput ? codeInput.value.trim() : '';

    if (!code) {
        const joinStatusEl = document.getElementById('join-status');
        if (joinStatusEl) {
            joinStatusEl.textContent = 'Please enter a game code.';
        }
        return;
    }

    gameState.isMultiplayer = true;
    gameState.isHost = false;

    const joinStatusEl = document.getElementById('join-status');
    if (joinStatusEl) {
        joinStatusEl.textContent = 'Connecting...';
    }

    // Create peer
    gameState.peer = new Peer();

    gameState.peer.on('open', () => {
        // Connect to host
        const conn = gameState.peer.connect(code);
        gameState.connection = conn;
        setupConnection(conn);

        conn.on('open', () => {
            if (joinStatusEl) {
                joinStatusEl.textContent = 'Connected! Waiting for host...';
            }

            // Send grid config to host
            conn.send({
                type: 'screenSize',
                gridConfig: getGridConfig()
            });
        });
    });

    gameState.peer.on('error', (err) => {
        console.error('Peer error:', err);
        if (joinStatusEl) {
            joinStatusEl.textContent = 'Failed to connect. Check the code and try again.';
        }
    });
}

/**
 * Setup connection event handlers
 * @param {Object} conn - PeerJS connection object
 */
export function setupConnection(conn) {
    conn.on('data', (data) => {
        handleMultiplayerMessage(data);
    });

    conn.on('close', () => {
        console.log('Connection closed');
        if (gameState.isRunning) {
            alert('Opponent disconnected!');
            if (window.endGame) {
                window.endGame();
            }
        }
    });
}

/**
 * Handle incoming multiplayer messages
 * @param {Object} data - Message data from peer
 */
export function handleMultiplayerMessage(data) {
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

            window.hideModal('join-modal');
            if (window.showLoadingScreen) {
                window.showLoadingScreen(window.startGame);
            }
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
            if (data.seats) {
                data.seats.forEach(seatData => {
                    const seat = gameState.seats.find(s => s.id === seatData.seatId);
                    if (seat) {
                        seat.isAvailable = seatData.isAvailable;
                    }
                });
                renderSeats();
            }
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
            if (data.seats) {
                data.seats.forEach(seatData => {
                    const seat = gameState.seats.find(s => s.id === seatData.seatId);
                    if (seat) {
                        seat.isAvailable = seatData.isAvailable;
                    }
                });
                renderSeats();
            }
            break;

        case 'priceUpdate':
            // Guest receives price updates from host
            if (data.seats) {
                data.seats.forEach(seatData => {
                    const seat = gameState.seats.find(s => s.id === seatData.seatId);
                    if (seat) {
                        seat.currentPrice = seatData.currentPrice;
                    }
                });
                renderSeats();
            }
            break;

        case 'cartUpdate':
            // Update opponent's cart for competition detection
            gameState.opponentCart = data.cart || [];
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
                if (window.endGame) {
                    window.endGame();
                }
            }
            break;
    }
}

/**
 * Send multiplayer message to opponent
 * @param {Object} data - Message data to send
 */
export function sendMultiplayerMessage(data) {
    if (gameState.isMultiplayer && gameState.connection && gameState.connection.open) {
        gameState.connection.send(data);
    }
}

/**
 * Copy game code to clipboard
 * Shows feedback to user
 */
export function copyGameCode() {
    const codeInput = document.getElementById('game-code');
    if (!codeInput) return;

    codeInput.select();
    document.execCommand('copy');

    const btn = document.getElementById('copy-code-btn');
    if (btn) {
        const originalText = btn.textContent;
        btn.textContent = 'Copied!';
        setTimeout(() => {
            btn.textContent = originalText;
        }, 2000);
    }
}

/**
 * Cancel hosting
 * Cleans up peer connection and returns to multiplayer menu
 */
export function cancelHost() {
    if (gameState.peer) {
        gameState.peer.destroy();
        gameState.peer = null;
    }
    gameState.isMultiplayer = false;
    gameState.isHost = false;
    window.hideModal('host-modal');
    window.showModal('multiplayer-modal');
}

/**
 * Cancel joining
 * Cleans up peer connection and returns to multiplayer menu
 */
export function cancelJoin() {
    if (gameState.peer) {
        gameState.peer.destroy();
        gameState.peer = null;
    }
    gameState.isMultiplayer = false;
    window.hideModal('join-modal');
    window.showModal('multiplayer-modal');
}

// Note: Window exports handled by main.js
