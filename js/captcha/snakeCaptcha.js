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
    document.getElementById('snake-start-btn').addEventListener('click', startGameLoop);
}

// End-game scenario: Snake has already grown long, need last 2 pieces of food
const snakeLayouts = [
    {
        direction: 'right',
        layout: [
            // Long winding snake - 42 segments
            { x: 7, y: 5 }, { x: 6, y: 5 }, { x: 5, y: 5 }, { x: 4, y: 5 },
            { x: 3, y: 5 }, { x: 2, y: 5 }, { x: 1, y: 5 }, { x: 1, y: 4 },
            { x: 1, y: 3 }, { x: 1, y: 2 }, { x: 1, y: 1 }, { x: 2, y: 1 },
            { x: 3, y: 1 }, { x: 4, y: 1 }, { x: 5, y: 1 }, { x: 6, y: 1 },
            { x: 7, y: 1 }, { x: 8, y: 1 }, { x: 9, y: 1 }, { x: 10, y: 1 },
            { x: 11, y: 1 }, { x: 11, y: 2 }, { x: 11, y: 3 }, { x: 11, y: 4 },
            { x: 11, y: 5 }, { x: 11, y: 6 }, { x: 11, y: 7 }, { x: 10, y: 7 },
            { x: 9, y: 7 }, { x: 8, y: 7 }, { x: 7, y: 7 }, { x: 6, y: 7 },
            { x: 5, y: 7 }, { x: 4, y: 7 }, { x: 3, y: 7 }, { x: 3, y: 6 },
            { x: 3, y: 5 }, { x: 3, y: 4 }, { x: 3, y: 3 }, { x: 4, y: 3 },
            { x: 5, y: 3 }, { x: 6, y: 3 }
        ]
    },
    {
        direction: 'down',
        layout: [
            // Maze-like pattern - 45 segments
            { x: 2, y: 2 }, { x: 2, y: 1 }, { x: 3, y: 1 }, { x: 4, y: 1 },
            { x: 5, y: 1 }, { x: 6, y: 1 }, { x: 7, y: 1 }, { x: 8, y: 1 },
            { x: 9, y: 1 }, { x: 10, y: 1 }, { x: 11, y: 1 }, { x: 12, y: 1 },
            { x: 13, y: 1 }, { x: 13, y: 2 }, { x: 13, y: 3 }, { x: 13, y: 4 },
            { x: 13, y: 5 }, { x: 13, y: 6 }, { x: 13, y: 7 }, { x: 13, y: 8 },
            { x: 12, y: 8 }, { x: 11, y: 8 }, { x: 10, y: 8 }, { x: 9, y: 8 },
            { x: 8, y: 8 }, { x: 7, y: 8 }, { x: 6, y: 8 }, { x: 5, y: 8 },
            { x: 4, y: 8 }, { x: 3, y: 8 }, { x: 2, y: 8 }, { x: 1, y: 8 },
            { x: 1, y: 7 }, { x: 1, y: 6 }, { x: 1, y: 5 }, { x: 1, y: 4 },
            { x: 1, y: 3 }, { x: 2, y: 3 }, { x: 3, y: 3 }, { x: 4, y: 3 },
            { x: 5, y: 3 }, { x: 6, y: 3 }, { x: 7, y: 3 }, { x: 8, y: 3 },
            { x: 9, y: 3 }
        ]
    },
    {
        direction: 'left',
        layout: [
            // Spiral pattern - 38 segments
            { x: 7, y: 4 }, { x: 8, y: 4 }, { x: 9, y: 4 }, { x: 10, y: 4 },
            { x: 11, y: 4 }, { x: 12, y: 4 }, { x: 12, y: 5 }, { x: 12, y: 6 },
            { x: 12, y: 7 }, { x: 11, y: 7 }, { x: 10, y: 7 }, { x: 9, y: 7 },
            { x: 8, y: 7 }, { x: 7, y: 7 }, { x: 6, y: 7 }, { x: 5, y: 7 },
            { x: 4, y: 7 }, { x: 3, y: 7 }, { x: 2, y: 7 }, { x: 2, y: 6 },
            { x: 2, y: 5 }, { x: 2, y: 4 }, { x: 2, y: 3 }, { x: 2, y: 2 },
            { x: 3, y: 2 }, { x: 4, y: 2 }, { x: 5, y: 2 }, { x: 6, y: 2 },
            { x: 7, y: 2 }, { x: 8, y: 2 }, { x: 9, y: 2 }, { x: 10, y: 2 },
            { x: 10, y: 3 }, { x: 10, y: 4 }, { x: 10, y: 5 }, { x: 9, y: 5 },
            { x: 8, y: 5 }, { x: 7, y: 5 }
        ]
    }
];

function startSnakeGame() {
    let layout;
    let direction = 'right'; // Default direction
    let validLayoutFound = false;

    // Shuffle layouts to try a random one first
    const shuffledLayouts = [...snakeLayouts].sort(() => 0.5 - Math.random());

    for (const layoutConfig of shuffledLayouts) {
        if (isValidStartPosition(layoutConfig.layout, layoutConfig.direction)) {
            layout = layoutConfig.layout;
            direction = layoutConfig.direction;
            validLayoutFound = true;
            break;
        }
    }

    if (!validLayoutFound) {
        // Fallback: Generate a new random, valid snake if no predefined layout works
        let newSnake, newDirection;
        do {
            newDirection = ['up', 'down', 'left', 'right'][Math.floor(Math.random() * 4)];
            const head = {
                x: Math.floor(Math.random() * (CANVAS_WIDTH / GRID_SIZE)),
                y: Math.floor(Math.random() * (CANVAS_HEIGHT / GRID_SIZE))
            };
            newSnake = [head];
            let dx = 0, dy = 0;
            if (newDirection === 'up') dy = 1;
            else if (newDirection === 'down') dy = -1;
            else if (newDirection === 'left') dx = 1;
            else if (newDirection === 'right') dx = -1;

            for (let i = 1; i < 4; i++) {
                newSnake.push({ x: head.x + i * dx, y: head.y + i * dy });
            }
        } while (!isValidStartPosition(newSnake, newDirection));

        layout = newSnake;
        direction = newDirection;
    }

    snakeGameState = {
        snake: JSON.parse(JSON.stringify(layout)),
        food: {},
        direction: direction,
        nextDirection: direction,
        score: 0,
        gameOver: false,
        gameLoop: null,
    };

    generateFood();
    updateScore();

    draw(); // Draw initial state
}

function startGameLoop() {
    if (snakeGameState.gameLoop) return; // Prevent multiple starts
    document.getElementById('snake-start-btn').disabled = true;
    // Faster speed for end-game difficulty
    snakeGameState.gameLoop = setInterval(gameLoop, 100);
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
    } while (isPositionOnSnake(foodPosition) || !isWinnable(foodPosition));
    snakeGameState.food = foodPosition;
}

function isPositionOnSnake(position, snake = snakeGameState.snake) {
    return snake.some(segment => segment.x === position.x && segment.y === position.y);
}

function isValidStartPosition(snake, direction) {
    const head = snake[0];
    let dx = 0, dy = 0;

    if (direction === 'up') dy = -1;
    else if (direction === 'down') dy = 1;
    else if (direction === 'left') dx = -1;
    else if (direction === 'right') dx = 1;

    for (let i = 1; i <= 6; i++) {
        const nextPos = { x: head.x + i * dx, y: head.y + i * dy };

        if (nextPos.x < 0 || nextPos.x >= CANVAS_WIDTH / GRID_SIZE || nextPos.y < 0 || nextPos.y >= CANVAS_HEIGHT / GRID_SIZE) {
            return false;
        }

        if (isPositionOnSnake(nextPos, snake)) {
            return false;
        }
    }
    return true;
}

function isWinnable(foodPosition) {
    const head = snakeGameState.snake[0];
    const queue = [[head]];
    const visited = new Set([`${head.x},${head.y}`]);
    const directions = [{ x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 }];

    while (queue.length > 0) {
        const path = queue.shift();
        const { x, y } = path[path.length - 1];

        if (x === foodPosition.x && y === foodPosition.y) {
            return true;
        }

        for (const direction of directions) {
            const newX = x + direction.x;
            const newY = y + direction.y;
            const newPos = { x: newX, y: newY };

            if (
                newX >= 0 && newX < CANVAS_WIDTH / GRID_SIZE &&
                newY >= 0 && newY < CANVAS_HEIGHT / GRID_SIZE &&
                !isPositionOnSnake(newPos) &&
                !visited.has(`${newX},${newY}`)
            ) {
                visited.add(`${newX},${newY}`);
                const newPath = [...path, newPos];
                queue.push(newPath);
            }
        }
    }

    return false;
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
    document.removeEventListener('keydown', handleKeyPress);
    snakeGameState = {};

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
    document.removeEventListener('keydown', handleKeyPress);
    snakeGameState = {};
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
    document.getElementById('snake-start-btn').disabled = false;
    document.addEventListener('keydown', handleKeyPress);
    showModal('snake-captcha-modal');
    startSnakeGame();
}

document.addEventListener('DOMContentLoaded', initSnake);
