// Snake CAPTCHA logic

let snakeCanvas, ctx;
let snakeGameState = {};

const GRID_SIZE = 20;
const CANVAS_WIDTH = 300;
const CANVAS_HEIGHT = 200;

function initSnake() {
    snakeCanvas = document.getElementById('snake-canvas');
    if (!snakeCanvas) return;
    ctx = snakeCanvas.getContext('2d');

    document.getElementById('snake-up-btn').addEventListener('click', () => setDirection('up'));
    document.getElementById('snake-down-btn').addEventListener('click', () => setDirection('down'));
    document.getElementById('snake-left-btn').addEventListener('click', () => setDirection('left'));
    document.getElementById('snake-right-btn').addEventListener('click', () => setDirection('right'));
    document.getElementById('snake-cancel-btn').addEventListener('click', cancelSnakeCaptcha);

    document.addEventListener('keydown', handleKeyPress);
}

function startSnakeGame() {
    snakeGameState = {
        snake: [
            { x: 11, y: 3 }, { x: 10, y: 3 }, { x: 9, y: 3 }, { x: 8, y: 3 },
            { x: 7, y: 3 }, { x: 7, y: 4 }, { x: 7, y: 5 }, { x: 6, y: 6 },
            { x: 5, y: 6 }, { x: 4, y: 6 }, { x: 3, y: 6 }, { x: 2, y: 6 },
            { x: 2, y: 5 }, { x: 2, y: 4 }, { x: 2, y: 3 }, { x: 2, y: 2 }
        ],
        food: {},
        direction: 'right',
        nextDirection: 'right',
        score: 0,
        gameOver: false,
        gameLoop: null,
    };

    generateFood();
    updateScore();

    snakeGameState.gameLoop = setInterval(gameLoop, 150);
}

function gameLoop() {
    if (snakeGameState.gameOver) {
        clearInterval(snakeGameState.gameLoop);
        return;
    }

    update();
    draw();
}

function update() {
    snakeGameState.direction = snakeGameState.nextDirection;
    const head = { ...snakeGameState.snake[0] };

    switch (snakeGameState.direction) {
        case 'up': head.y--; break;
        case 'down': head.y++; break;
        case 'left': head.x--; break;
        case 'right': head.x++; break;
    }

    if (checkCollision(head)) {
        endSnakeGame(false);
        return;
    }

    snakeGameState.snake.unshift(head);

    if (head.x === snakeGameState.food.x && head.y === snakeGameState.food.y) {
        snakeGameState.score++;
        updateScore();
        if (snakeGameState.score >= 2) {
            endSnakeGame(true);
        } else {
            generateFood();
        }
    } else {
        snakeGameState.snake.pop();
    }
}

function draw() {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw snake
    ctx.fillStyle = '#333';
    snakeGameState.snake.forEach(segment => {
        ctx.fillRect(segment.x * GRID_SIZE, segment.y * GRID_SIZE, GRID_SIZE, GRID_SIZE);
    });

    // Draw food
    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(snakeGameState.food.x * GRID_SIZE, snakeGameState.food.y * GRID_SIZE, GRID_SIZE, GRID_SIZE);
}

function generateFood() {
    let foodPosition;
    do {
        foodPosition = {
            x: Math.floor(Math.random() * (CANVAS_WIDTH / GRID_SIZE)),
            y: Math.floor(Math.random() * (CANVAS_HEIGHT / GRID_SIZE)),
        };
    } while (isPositionOnSnake(foodPosition));
    snakeGameState.food = foodPosition;
}

function isPositionOnSnake(position) {
    return snakeGameState.snake.some(segment => segment.x === position.x && segment.y === position.y);
}

function checkCollision(head) {
    // Wall collision
    if (head.x < 0 || head.x >= CANVAS_WIDTH / GRID_SIZE || head.y < 0 || head.y >= CANVAS_HEIGHT / GRID_SIZE) {
        return true;
    }
    // Self collision
    for (let i = 1; i < snakeGameState.snake.length; i++) {
        if (head.x === snakeGameState.snake[i].x && head.y === snakeGameState.snake[i].y) {
            return true;
        }
    }
    return false;
}

function setDirection(newDirection) {
    const oppositeDirections = {
        up: 'down',
        down: 'up',
        left: 'right',
        right: 'left',
    };
    if (snakeGameState.direction !== oppositeDirections[newDirection]) {
        snakeGameState.nextDirection = newDirection;
    }
}

function handleKeyPress(e) {
    if (document.getElementById('snake-captcha-modal').classList.contains('hidden')) {
        return;
    }

    switch (e.key) {
        case 'ArrowUp':
        case 'w':
            setDirection('up');
            break;
        case 'ArrowDown':
        case 's':
            setDirection('down');
            break;
        case 'ArrowLeft':
        case 'a':
            setDirection('left');
            break;
        case 'ArrowRight':
        case 'd':
            setDirection('right');
            break;
    }
}

function updateScore() {
    document.getElementById('snake-score').textContent = `Score: ${snakeGameState.score} / 2`;
}

function endSnakeGame(isSuccess) {
    snakeGameState.gameOver = true;
    clearInterval(snakeGameState.gameLoop);

    const feedback = document.getElementById('snake-feedback');
    if (isSuccess) {
        feedback.textContent = 'Success!';
        feedback.style.color = 'green';
        setTimeout(() => {
            hideModal('snake-captcha-modal');
            completeCheckout();
        }, 1000);
    } else {
        feedback.textContent = 'Game Over!';
        feedback.style.color = 'red';
        setTimeout(() => {
            hideModal('snake-captcha-modal');
        }, 2000);
    }
}

function cancelSnakeCaptcha() {
    snakeGameState.gameOver = true;
    clearInterval(snakeGameState.gameLoop);
    hideModal('snake-captcha-modal');
}

function showSnakeCaptcha() {
    const warningEl = document.getElementById('snake-captcha-warning');
    if (gameState.isMultiplayer && hasOverlappingSeats()) {
        warningEl.classList.remove('hidden');
    } else {
        warningEl.classList.add('hidden');
    }

    document.getElementById('snake-feedback').textContent = '';
    showModal('snake-captcha-modal');
    startSnakeGame();
}

document.addEventListener('DOMContentLoaded', initSnake);
