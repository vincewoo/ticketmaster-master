
import { gameState } from '../gameState.js';
import { hasOverlappingSeats } from '../cartManagement.js';
import { completeCheckout } from '../checkout.js';
import { showModal, hideModal } from '../ui.js';

export function showBlackjackCaptcha() {
    // Check if opponent has overlapping seats in multiplayer
    const warningEl = document.getElementById('blackjack-captcha-warning');
    if (gameState.isMultiplayer && hasOverlappingSeats()) {
        warningEl.classList.remove('hidden');
    } else {
        warningEl.classList.add('hidden');
    }

    showModal('blackjack-captcha-modal');
    startBlackjackGame();
}

function createBlackjackDeck() {
    const suits = ['♥', '♦', '♣', '♠'];
    const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    const deck = [];
    for (const suit of suits) {
        for (const rank of ranks) {
            deck.push({ suit, rank });
        }
    }
    return deck;
}

function shuffleBlackjackDeck(deck) {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
}

function getBlackjackCardValue(card) {
    if (['J', 'Q', 'K'].includes(card.rank)) {
        return 10;
    }
    if (card.rank === 'A') {
        return 11; // Initially treat Ace as 11
    }
    return parseInt(card.rank);
}

function calculateBlackjackScore(hand) {
    let score = hand.reduce((sum, card) => sum + getBlackjackCardValue(card), 0);
    let aceCount = hand.filter(card => card.rank === 'A').length;

    // Adjust for Aces if score is over 21
    while (score > 21 && aceCount > 0) {
        score -= 10;
        aceCount--;
    }
    return score;
}

function renderBlackjackHand(hand, element, isDealer, isPlayerTurn) {
    element.innerHTML = '';
    hand.forEach((card, index) => {
        const cardDiv = document.createElement('div');
        cardDiv.className = 'blackjack-card';
        if (isDealer && index === 0 && isPlayerTurn) {
            cardDiv.classList.add('facedown');
            cardDiv.innerHTML = '<span>?</span>';
        } else {
            cardDiv.innerHTML = `<span class="rank">${card.rank}</span><span class="suit">${card.suit}</span>`;
            if (['♥', '♦'].includes(card.suit)) {
                cardDiv.classList.add('red');
            }
        }
        element.appendChild(cardDiv);
    });
}

function updateBlackjackScores() {
    gameState.blackjackPlayerScore = calculateBlackjackScore(gameState.blackjackPlayerHand);
    // For the dealer's score, only show the value of the up-card during the player's turn
    if (gameState.isBlackjackPlayerTurn) {
        gameState.blackjackDealerScore = getBlackjackCardValue(gameState.blackjackDealerHand[1]);
    } else {
        gameState.blackjackDealerScore = calculateBlackjackScore(gameState.blackjackDealerHand);
    }

    document.getElementById('blackjack-player-score').textContent = gameState.blackjackPlayerScore;
    document.getElementById('blackjack-dealer-score').textContent = gameState.blackjackDealerScore;
}


function startBlackjackGame() {
    gameState.blackjackDeck = createBlackjackDeck();
    shuffleBlackjackDeck(gameState.blackjackDeck);
    gameState.blackjackPlayerHand = [];
    gameState.blackjackDealerHand = [];
    gameState.isBlackjackPlayerTurn = true;

    // Deal initial cards
    gameState.blackjackPlayerHand.push(gameState.blackjackDeck.pop());
    gameState.blackjackDealerHand.push(gameState.blackjackDeck.pop());
    gameState.blackjackPlayerHand.push(gameState.blackjackDeck.pop());
    gameState.blackjackDealerHand.push(gameState.blackjackDeck.pop());

    document.getElementById('blackjack-feedback').textContent = '';
    document.getElementById('blackjack-hit-btn').disabled = false;
    document.getElementById('blackjack-stand-btn').disabled = false;

    renderBlackjackHands();
    updateBlackjackScores();

    if (gameState.blackjackPlayerScore === 21) {
        handleBlackjackStand(); // Auto-stand on Blackjack
    }
}

function renderBlackjackHands() {
    const playerHandEl = document.getElementById('blackjack-player-hand');
    const dealerHandEl = document.getElementById('blackjack-dealer-hand');
    renderBlackjackHand(gameState.blackjackPlayerHand, playerHandEl, false, gameState.isBlackjackPlayerTurn);
    renderBlackjackHand(gameState.blackjackDealerHand, dealerHandEl, true, gameState.isBlackjackPlayerTurn);
}

export function handleBlackjackHit() {
    if (!gameState.isBlackjackPlayerTurn) return;

    gameState.blackjackPlayerHand.push(gameState.blackjackDeck.pop());
    renderBlackjackHands();
    updateBlackjackScores();

    if (gameState.blackjackPlayerScore > 21) {
        endBlackjackGame('Bust! You lose.', false);
    }
}

export function handleBlackjackStand() {
    gameState.isBlackjackPlayerTurn = false;
    document.getElementById('blackjack-hit-btn').disabled = true;
    document.getElementById('blackjack-stand-btn').disabled = true;

    renderBlackjackHands(); // Reveal dealer's face-down card
    updateBlackjackScores();

    // Dealer's turn
    setTimeout(dealerBlackjackTurn, 1000);
}

function dealerBlackjackTurn() {
    if (calculateBlackjackScore(gameState.blackjackDealerHand) < 17) {
        gameState.blackjackDealerHand.push(gameState.blackjackDeck.pop());
        renderBlackjackHands();
        updateBlackjackScores();
        setTimeout(dealerBlackjackTurn, 1000); // Continue hitting
    } else {
        determineBlackjackWinner();
    }
}

function determineBlackjackWinner() {
    const playerScore = gameState.blackjackPlayerScore;
    const dealerScore = calculateBlackjackScore(gameState.blackjackDealerHand); // Final dealer score

    if (dealerScore > 21 || playerScore > dealerScore) {
        endBlackjackGame('You win!', true);
    } else if (dealerScore > playerScore) {
        endBlackjackGame('Dealer wins!', false);
    } else {
        endBlackjackGame('Push (Tie)! Try again.', false); // Treat push as a loss for CAPTCHA
    }
}

function endBlackjackGame(message, isWinner) {
    document.getElementById('blackjack-feedback').textContent = message;
    document.getElementById('blackjack-hit-btn').disabled = true;
    document.getElementById('blackjack-stand-btn').disabled = true;

    if (isWinner) {
        setTimeout(() => {
            hideModal('blackjack-captcha-modal');
            completeCheckout();
        }, 1500);
    } else {
        setTimeout(() => {
            hideModal('blackjack-captcha-modal');
        }, 2000);
    }
}

export function cancelBlackjackCaptcha() {
    hideModal('blackjack-captcha-modal');
}

if (typeof window !== 'undefined') {
    window.showBlackjackCaptcha = showBlackjackCaptcha;
    window.handleBlackjackHit = handleBlackjackHit;
    window.handleBlackjackStand = handleBlackjackStand;
    window.cancelBlackjackCaptcha = cancelBlackjackCaptcha;
}
