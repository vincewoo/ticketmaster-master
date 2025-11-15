/**
 * Lunar Lander CAPTCHA
 * Player must safely land the lunar module by controlling thrust
 * Must land with velocity <= 4 m/s to succeed
 */

let animationId = null;
let gameInterval = null;

// Game state
let altitude = 60; // meters above surface (was 100)
let velocity = 0; // m/s (positive = falling down)
let fuel = 100; // percentage
let thrusting = false;

// Physics constants
const GRAVITY = 1.622; // Moon gravity in m/s²
const THRUST_ACCELERATION = 5; // Upward acceleration when thrusting m/s²
const FUEL_BURN_RATE = 6.5; // Percentage per second when thrusting (was 8)
const MAX_SAFE_VELOCITY = 5; // Max landing velocity in m/s (was 4)
const UPDATE_INTERVAL = 50; // ms (20 updates per second)
const GAME_TIME_LIMIT = 15; // seconds
const LANDER_LEG_HEIGHT = 3.33; // Height of landing legs in meters (20px in 60m scale)

export function showLunarLanderCAPTCHA() {
    const modal = document.getElementById('lunar-lander-captcha-modal');
    const canvas = document.getElementById('lunar-lander-canvas');
    const ctx = canvas.getContext('2d');
    const thrustButton = document.getElementById('lunar-thrust-btn');
    const timerDisplay = document.getElementById('lunar-lander-timer');
    const cancelButton = document.querySelector('#lunar-lander-captcha-modal .cancel-captcha');
    const warningDiv = document.getElementById('lunar-lander-captcha-warning');

    // Show warning if competing with opponent
    if (window.hasOverlappingSeats && window.hasOverlappingSeats()) {
        warningDiv.classList.remove('hidden');
    } else {
        warningDiv.classList.add('hidden');
    }

    // Reset game state
    altitude = 60;
    velocity = 0;
    fuel = 100;
    thrusting = false;
    let timeRemaining = GAME_TIME_LIMIT;
    let gameOver = false;

    if (window.showModal) window.showModal('lunar-lander-captcha-modal');

    // Timer countdown
    const timerInterval = setInterval(() => {
        timeRemaining--;
        timerDisplay.textContent = timeRemaining;

        if (timeRemaining <= 0 && !gameOver) {
            gameOver = true;
            cleanup();
            showFailureMessage(ctx, canvas, "OUT OF TIME!");
            setTimeout(() => {
                if (window.hideModal) window.hideModal('lunar-lander-captcha-modal');
            }, 2000);
        }
    }, 1000);

    // Game loop - update physics
    gameInterval = setInterval(() => {
        if (gameOver) return;

        const deltaTime = UPDATE_INTERVAL / 1000; // Convert to seconds

        // Apply gravity (increases velocity downward)
        velocity += GRAVITY * deltaTime;

        // Apply thrust if button pressed and fuel available
        if (thrusting && fuel > 0) {
            velocity -= THRUST_ACCELERATION * deltaTime;
            fuel -= FUEL_BURN_RATE * deltaTime;
            if (fuel < 0) fuel = 0;
        }

        // Update altitude
        altitude -= velocity * deltaTime;

        // Check for landing or crash
        if (altitude <= 0) {
            gameOver = true;
            altitude = 0;

            cleanup();

            if (velocity <= MAX_SAFE_VELOCITY) {
                // Successful landing!
                render(ctx, canvas); // Final render at landing position
                showSuccessMessage(ctx, canvas, velocity);
                setTimeout(() => {
                    if (window.hideModal) window.hideModal('lunar-lander-captcha-modal');
                    if (window.completeCheckout) window.completeCheckout();
                }, 2500);
            } else {
                // Crashed! Show explosion animation
                const landerX = canvas.width / 2;
                const landerY = canvas.height - 80;
                showExplosionAnimation(ctx, canvas, landerX, landerY, velocity);
            }
            return; // Don't render again after game over
        }

        // Render frame
        render(ctx, canvas);
    }, UPDATE_INTERVAL);

    // Thrust button controls (works on both mouse and touch)
    const startThrust = () => {
        if (!gameOver && fuel > 0) {
            thrusting = true;
        }
    };

    const stopThrust = () => {
        thrusting = false;
    };

    thrustButton.addEventListener('mousedown', startThrust);
    thrustButton.addEventListener('mouseup', stopThrust);
    thrustButton.addEventListener('mouseleave', stopThrust);
    thrustButton.addEventListener('touchstart', (e) => {
        e.preventDefault();
        startThrust();
    });
    thrustButton.addEventListener('touchend', (e) => {
        e.preventDefault();
        stopThrust();
    });

    // Cancel button
    const handleCancel = () => {
        cleanup();
        if (window.hideModal) window.hideModal('lunar-lander-captcha-modal');
    };
    cancelButton.addEventListener('click', handleCancel);

    // Cleanup function
    function cleanup() {
        if (gameInterval) {
            clearInterval(gameInterval);
            gameInterval = null;
        }
        if (timerInterval) {
            clearInterval(timerInterval);
        }
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
        // Remove event listeners
        thrustButton.removeEventListener('mousedown', startThrust);
        thrustButton.removeEventListener('mouseup', stopThrust);
        thrustButton.removeEventListener('mouseleave', stopThrust);
        thrustButton.removeEventListener('touchstart', startThrust);
        thrustButton.removeEventListener('touchend', stopThrust);
        cancelButton.removeEventListener('click', handleCancel);
    }

    // Initial render
    render(ctx, canvas);
}

function render(ctx, canvas) {
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);

    // Draw stars
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 50; i++) {
        const x = (i * 37) % width;
        const y = (i * 59) % (height - 100);
        ctx.fillRect(x, y, 2, 2);
    }

    // Draw moon surface
    ctx.fillStyle = '#888';
    ctx.fillRect(0, height - 80, width, 80);

    // Draw landing pad
    const padX = width / 2 - 40;
    const padY = height - 80;
    ctx.fillStyle = '#4ade80';
    ctx.fillRect(padX, padY, 80, 5);

    // Calculate lander position (map altitude to canvas)
    // Legs extend 20px below body center, so body center should be 20px above ground when altitude=0
    // Ground is at y=height-80, so when altitude=0, landerY should be height-100
    const maxAltitude = 60;
    const maxCanvasHeight = height - 150; // Total vertical space for movement
    const groundBodyPosition = height - 100; // Where body is when feet touch ground
    const landerY = groundBodyPosition - (altitude / maxAltitude) * maxCanvasHeight;
    const landerX = width / 2;

    // Draw lander
    drawLander(ctx, landerX, landerY, thrusting);

    // Draw UI elements
    drawUI(ctx, width, height);
}

function drawLander(ctx, x, y, showThrust) {
    // Lander body (simple triangular shape)
    ctx.fillStyle = '#ddd';
    ctx.beginPath();
    ctx.moveTo(x, y - 20); // Top point
    ctx.lineTo(x - 15, y + 10); // Bottom left
    ctx.lineTo(x + 15, y + 10); // Bottom right
    ctx.closePath();
    ctx.fill();

    // Landing legs
    ctx.strokeStyle = '#aaa';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - 10, y + 5);
    ctx.lineTo(x - 20, y + 20);
    ctx.moveTo(x + 10, y + 5);
    ctx.lineTo(x + 20, y + 20);
    ctx.stroke();

    // Thrust flame
    if (showThrust && fuel > 0) {
        ctx.fillStyle = '#ff6b00';
        ctx.beginPath();
        ctx.moveTo(x - 8, y + 10);
        ctx.lineTo(x, y + 25);
        ctx.lineTo(x + 8, y + 10);
        ctx.closePath();
        ctx.fill();

        // Inner flame
        ctx.fillStyle = '#ffff00';
        ctx.beginPath();
        ctx.moveTo(x - 5, y + 10);
        ctx.lineTo(x, y + 20);
        ctx.lineTo(x + 5, y + 10);
        ctx.closePath();
        ctx.fill();
    }
}

function drawUI(ctx, width, height) {
    // Reset text alignment (may be changed by success/failure messages)
    ctx.textAlign = 'left';
    ctx.fillStyle = '#fff';
    ctx.font = '16px monospace';

    // Altitude
    ctx.fillText(`Altitude: ${altitude.toFixed(1)}m`, 10, 25);

    // Velocity (color-coded)
    const velocityColor = velocity <= MAX_SAFE_VELOCITY ? '#4ade80' : '#ef4444';
    ctx.fillStyle = velocityColor;
    ctx.fillText(`Velocity: ${velocity.toFixed(1)} m/s`, 10, 50);

    // Fuel bar
    ctx.fillStyle = '#fff';
    ctx.fillText(`Fuel: ${Math.max(0, fuel).toFixed(0)}%`, 10, 75);
    ctx.strokeStyle = '#fff';
    ctx.strokeRect(10, 85, 100, 15);
    ctx.fillStyle = fuel > 30 ? '#4ade80' : '#ef4444';
    ctx.fillRect(10, 85, fuel, 15);

    // Safe landing speed indicator
    ctx.fillStyle = '#888';
    ctx.font = '12px monospace';
    ctx.fillText(`Safe landing: ≤ ${MAX_SAFE_VELOCITY} m/s`, width - 170, 25);
}

function showSuccessMessage(ctx, canvas, velocity) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#4ade80';
    ctx.font = 'bold 30px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('🎉PERFECT LANDING!🎉', canvas.width / 2, canvas.height / 2 - 30);

    ctx.fillStyle = '#fff';
    ctx.font = '22px Arial';
    ctx.fillText(`Landing velocity: ${velocity.toFixed(1)} m/s`, canvas.width / 2, canvas.height / 2 + 10);

    ctx.fillStyle = '#4ade80';
    ctx.font = '18px Arial';
    ctx.fillText('CAPTCHA Verified!', canvas.width / 2, canvas.height / 2 + 45);
}

function showFailureMessage(ctx, canvas, message) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(message, canvas.width / 2, canvas.height / 2);
}

function showExplosionAnimation(ctx, canvas, x, y, crashVelocity) {
    // Create debris particles
    const debrisParticles = [];
    const numParticles = 15;

    // Create different types of debris (body parts, legs, etc.)
    for (let i = 0; i < numParticles; i++) {
        const angle = (Math.PI * 2 * i) / numParticles + (Math.random() - 0.5) * 0.5;
        const speed = 2 + Math.random() * 3;

        debrisParticles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 2, // Initial upward velocity
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.3,
            size: 3 + Math.random() * 8,
            type: Math.floor(Math.random() * 3), // Different debris types
            alpha: 1
        });
    }

    // Explosion particles (fire/smoke)
    const explosionParticles = [];
    for (let i = 0; i < 20; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1 + Math.random() * 2;

        explosionParticles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 1,
            size: 5 + Math.random() * 15,
            alpha: 1,
            color: Math.random() > 0.5 ? '#ff6b00' : '#ffff00'
        });
    }

    let animationFrame = 0;
    const maxFrames = 100; // ~1.5 seconds at 60fps

    function animateExplosion() {
        // Clear and redraw background
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw stars
        ctx.fillStyle = '#fff';
        for (let i = 0; i < 50; i++) {
            const starX = (i * 37) % canvas.width;
            const starY = (i * 59) % (canvas.height - 100);
            ctx.fillRect(starX, starY, 2, 2);
        }

        // Draw moon surface
        ctx.fillStyle = '#888';
        ctx.fillRect(0, canvas.height - 80, canvas.width, 80);

        // Draw landing pad
        ctx.fillStyle = '#4ade80';
        ctx.fillRect(canvas.width / 2 - 40, canvas.height - 80, 80, 5);

        // Draw explosion particles (fire/smoke)
        explosionParticles.forEach(particle => {
            ctx.save();
            ctx.globalAlpha = particle.alpha;
            ctx.fillStyle = particle.color;
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            // Update particle
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.vy += 0.1; // Gravity
            particle.alpha -= 0.02;
            particle.size *= 0.98;
        });

        // Draw debris particles
        debrisParticles.forEach(particle => {
            ctx.save();
            ctx.translate(particle.x, particle.y);
            ctx.rotate(particle.rotation);
            ctx.globalAlpha = particle.alpha;

            // Draw different debris shapes
            if (particle.type === 0) {
                // Triangle piece (body)
                ctx.fillStyle = '#ddd';
                ctx.beginPath();
                ctx.moveTo(0, -particle.size);
                ctx.lineTo(-particle.size, particle.size);
                ctx.lineTo(particle.size, particle.size);
                ctx.closePath();
                ctx.fill();
            } else if (particle.type === 1) {
                // Rectangle piece (leg)
                ctx.fillStyle = '#aaa';
                ctx.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size);
            } else {
                // Circle piece (miscellaneous)
                ctx.fillStyle = '#ccc';
                ctx.beginPath();
                ctx.arc(0, 0, particle.size / 2, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.restore();

            // Update particle physics
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.vy += 0.08; // Moon gravity on debris
            particle.rotation += particle.rotationSpeed;

            // Bounce off ground
            if (particle.y > canvas.height - 80) {
                particle.y = canvas.height - 80;
                particle.vy *= -0.3; // Bounce with energy loss
                particle.vx *= 0.7; // Friction
            }

            // Fade out near end
            if (animationFrame > maxFrames - 30) {
                particle.alpha -= 0.03;
            }
        });

        animationFrame++;

        // Continue animation or show final message
        if (animationFrame < maxFrames) {
            animationId = requestAnimationFrame(animateExplosion);
        } else {
            // Show crash message after explosion
            showFailureMessage(ctx, canvas, `CRASHED! (${crashVelocity.toFixed(1)} m/s)`);
            setTimeout(() => {
                if (window.hideModal) window.hideModal('lunar-lander-captcha-modal');
            }, 2000);
        }
    }

    // Start the explosion animation
    animateExplosion();
}
