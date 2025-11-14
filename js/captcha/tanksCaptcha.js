// tanksCaptcha.js - Tanks artillery game CAPTCHA
// Player must adjust angle and power to hit the opponent tank

import { gameState } from '../gameState.js';
import { hasOverlappingSeats } from '../cartManagement.js';

let animationId = null;
let tanksGameState = null;

const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 400;
const GRAVITY = 0.5;
const MAX_POWER = 20;
const TIMER_DURATION = 20; // 20 seconds

export function showCAPTCHA() {
    const modal = document.getElementById('tanks-captcha-modal');
    const canvas = document.getElementById('tanks-canvas');
    const ctx = canvas.getContext('2d');
    const angleSlider = document.getElementById('tank-angle');
    const angleValue = document.getElementById('angle-value');
    const powerValue = document.getElementById('power-value');
    const powerGaugeFill = document.getElementById('power-gauge-fill');
    const fireButton = document.getElementById('fire-tank-button');
    const timerDisplay = document.getElementById('tanks-timer');
    const feedbackDiv = document.getElementById('tanks-feedback');

    // Check if opponent has overlapping seats in multiplayer
    const warningEl = document.getElementById('tanks-captcha-warning');
    if (gameState.isMultiplayer && hasOverlappingSeats()) {
        warningEl.classList.remove('hidden');
    } else {
        warningEl.classList.add('hidden');
    }

    // Set canvas size
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;

    // Initialize game state with randomized tank positions
    const playerX = 40 + Math.floor(Math.random() * 100); // 40-140 (wider variance)
    const enemyX = 460 + Math.floor(Math.random() * 100); // 460-560 (wider variance)

    tanksGameState = {
        playerTank: { x: playerX, y: 0 },
        enemyTank: { x: enemyX, y: 0 },
        terrain: [],
        projectile: null,
        explosion: null,
        angle: 45,
        power: 0,
        timeRemaining: TIMER_DURATION,
        isAnimating: false,
        isCharging: false,
        chargeInterval: null
    };

    // Generate terrain
    generateTerrain();

    // Position tanks on terrain
    positionTanks();

    // Set up event listeners
    angleSlider.value = tanksGameState.angle;
    angleValue.textContent = tanksGameState.angle + '°';
    powerValue.textContent = tanksGameState.power + '%';
    powerGaugeFill.style.width = '0%';

    const handleAngleChange = (e) => {
        tanksGameState.angle = parseInt(e.target.value);
        angleValue.textContent = tanksGameState.angle + '°';
        render();
    };

    const handleFireStart = () => {
        if (tanksGameState.isAnimating || tanksGameState.isCharging) return;

        // Start charging power
        tanksGameState.isCharging = true;
        tanksGameState.power = 0;

        tanksGameState.chargeInterval = setInterval(() => {
            if (tanksGameState.power < 100) {
                tanksGameState.power += 2; // Increase by 2% per interval (50 intervals = 100%)
                powerValue.textContent = tanksGameState.power + '%';
                powerGaugeFill.style.width = tanksGameState.power + '%';
                render();
            } else {
                // Auto-fire at 100%
                handleFireRelease();
            }
        }, 40); // Update every 40ms (2 seconds to reach 100%)
    };

    const handleFireRelease = () => {
        if (!tanksGameState.isCharging) return;

        // Stop charging
        tanksGameState.isCharging = false;
        if (tanksGameState.chargeInterval) {
            clearInterval(tanksGameState.chargeInterval);
            tanksGameState.chargeInterval = null;
        }

        // Fire with current power
        fireTank();
    };

    const handleCancel = () => {
        cleanup();
    };

    angleSlider.addEventListener('input', handleAngleChange);
    fireButton.addEventListener('mousedown', handleFireStart);
    fireButton.addEventListener('mouseup', handleFireRelease);
    fireButton.addEventListener('mouseleave', handleFireRelease); // Release if mouse leaves button
    fireButton.addEventListener('touchstart', handleFireStart);
    fireButton.addEventListener('touchend', handleFireRelease);
    document.getElementById('cancel-tanks-button').addEventListener('click', handleCancel);

    // Timer
    const timerInterval = setInterval(() => {
        tanksGameState.timeRemaining--;
        timerDisplay.textContent = tanksGameState.timeRemaining;

        if (tanksGameState.timeRemaining <= 0) {
            clearInterval(timerInterval);
            showFeedback('Time\'s up! CAPTCHA failed.', false);
            setTimeout(() => {
                cleanup();
            }, 2000);
        }
    }, 1000);

    function cleanup() {
        clearInterval(timerInterval);
        if (tanksGameState && tanksGameState.chargeInterval) {
            clearInterval(tanksGameState.chargeInterval);
        }
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
        angleSlider.removeEventListener('input', handleAngleChange);
        fireButton.removeEventListener('mousedown', handleFireStart);
        fireButton.removeEventListener('mouseup', handleFireRelease);
        fireButton.removeEventListener('mouseleave', handleFireRelease);
        fireButton.removeEventListener('touchstart', handleFireStart);
        fireButton.removeEventListener('touchend', handleFireRelease);
        document.getElementById('cancel-tanks-button').removeEventListener('click', handleCancel);
        modal.classList.add('hidden');
        feedbackDiv.textContent = '';
        tanksGameState = null;
    }

    function generateTerrain() {
        tanksGameState.terrain = [];

        // Randomize hill heights for variety (30-70px base height)
        const leftHillHeight = 30 + Math.random() * 40;
        const rightHillHeight = 30 + Math.random() * 40;

        // Randomize hill slopes (10-20px variation)
        const leftHillVariation = 10 + Math.random() * 10;
        const rightHillVariation = 10 + Math.random() * 10;

        // Left hill (player tank) - randomized height
        for (let x = 0; x < 200; x++) {
            const height = leftHillHeight + Math.sin(x / 35) * leftHillVariation - (x / 200) * 15;
            tanksGameState.terrain.push({ x, y: CANVAS_HEIGHT - height });
        }

        // Center mountain - taller and more jagged
        for (let x = 200; x < 400; x++) {
            const progress = (x - 200) / 200; // 0 to 1

            // Create a peak in the middle (reduced from 180 to 120px)
            const peakHeight = Math.sin(progress * Math.PI) * 120;

            // Add jagged variations
            const jaggedness = Math.sin(x / 8) * 12 + Math.sin(x / 15) * 8 + Math.sin(x / 25) * 6;

            // Add some random peaks and valleys
            const randomVariation = Math.sin(x / 12) * 15;

            const height = 40 + peakHeight + jaggedness + randomVariation;
            tanksGameState.terrain.push({ x, y: CANVAS_HEIGHT - height });
        }

        // Right hill (enemy tank) - randomized height
        for (let x = 400; x < CANVAS_WIDTH; x++) {
            const height = rightHillHeight + Math.sin((CANVAS_WIDTH - x) / 35) * rightHillVariation - ((CANVAS_WIDTH - x) / 200) * 15;
            tanksGameState.terrain.push({ x, y: CANVAS_HEIGHT - height });
        }
    }

    function positionTanks() {
        // Position player tank at x=100
        const playerTerrainPoint = tanksGameState.terrain.find(p => p.x >= tanksGameState.playerTank.x);
        tanksGameState.playerTank.y = playerTerrainPoint.y;

        // Position enemy tank at x=500
        const enemyTerrainPoint = tanksGameState.terrain.find(p => p.x >= tanksGameState.enemyTank.x);
        tanksGameState.enemyTank.y = enemyTerrainPoint.y;
    }

    function fireTank() {
        // Don't fire if power is too low (less than 10%)
        if (tanksGameState.power < 10) {
            showFeedback('Hold the button longer to build up power!', false);
            return;
        }

        tanksGameState.isAnimating = true;
        feedbackDiv.textContent = '';

        // Calculate initial velocity from angle and power
        const angleRad = (tanksGameState.angle * Math.PI) / 180;
        const velocity = (tanksGameState.power / 100) * MAX_POWER;

        tanksGameState.projectile = {
            x: tanksGameState.playerTank.x,
            y: tanksGameState.playerTank.y - 10, // Start above tank
            vx: Math.cos(angleRad) * velocity,
            vy: -Math.sin(angleRad) * velocity,
            trail: []
        };

        animateProjectile();
    }

    function animateProjectile() {
        if (!tanksGameState.projectile) return;

        // Update projectile physics
        tanksGameState.projectile.vy += GRAVITY;
        tanksGameState.projectile.x += tanksGameState.projectile.vx;
        tanksGameState.projectile.y += tanksGameState.projectile.vy;

        // Add to trail
        tanksGameState.projectile.trail.push({
            x: tanksGameState.projectile.x,
            y: tanksGameState.projectile.y
        });

        // Keep trail limited
        if (tanksGameState.projectile.trail.length > 30) {
            tanksGameState.projectile.trail.shift();
        }

        // Check collision with enemy tank (hit box: 20x15)
        const hitEnemy =
            tanksGameState.projectile.x >= tanksGameState.enemyTank.x - 10 &&
            tanksGameState.projectile.x <= tanksGameState.enemyTank.x + 10 &&
            tanksGameState.projectile.y >= tanksGameState.enemyTank.y - 15 &&
            tanksGameState.projectile.y <= tanksGameState.enemyTank.y + 5;

        if (hitEnemy) {
            // Success! Create explosion
            tanksGameState.projectile = null;
            tanksGameState.isAnimating = false;
            createExplosion(tanksGameState.enemyTank.x, tanksGameState.enemyTank.y - 8);
            showFeedback('Direct hit! CAPTCHA passed!', true);

            // Animate explosion
            animateExplosion();
            return;
        }

        // Check collision with terrain
        const terrainPoint = tanksGameState.terrain.find(p =>
            Math.abs(p.x - tanksGameState.projectile.x) < 2
        );
        const hitTerrain = terrainPoint && tanksGameState.projectile.y >= terrainPoint.y;

        // Check if projectile is out of bounds
        const outOfBounds =
            tanksGameState.projectile.x < 0 ||
            tanksGameState.projectile.x > CANVAS_WIDTH ||
            tanksGameState.projectile.y > CANVAS_HEIGHT;

        if (hitTerrain || outOfBounds) {
            // Missed - reset for another shot
            tanksGameState.projectile = null;
            tanksGameState.isAnimating = false;
            tanksGameState.power = 0;
            powerValue.textContent = '0%';
            powerGaugeFill.style.width = '0%';
            showFeedback('Missed! Try adjusting your angle and power.', false);
            render();
            return;
        }

        render();
        animationId = requestAnimationFrame(animateProjectile);
    }

    function createExplosion(x, y) {
        // Create explosion particles
        const particles = [];
        const fireParticleCount = 25;
        const smokeParticleCount = 15;
        const debrisParticleCount = 10;

        // Fire particles (fast, bright)
        for (let i = 0; i < fireParticleCount; i++) {
            const angle = (Math.PI * 2 * i) / fireParticleCount + (Math.random() - 0.5) * 0.3;
            const speed = 2 + Math.random() * 3;
            particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1.0,
                size: 3 + Math.random() * 4,
                color: Math.random() > 0.5 ? '#ff6600' : '#ffaa00', // Orange/yellow
                type: 'fire'
            });
        }

        // Smoke particles (slow, dark, rise up)
        for (let i = 0; i < smokeParticleCount; i++) {
            const angle = (Math.PI * 2 * i) / smokeParticleCount + (Math.random() - 0.5) * 0.5;
            const speed = 0.5 + Math.random() * 1.5;
            particles.push({
                x: x + (Math.random() - 0.5) * 10,
                y: y + (Math.random() - 0.5) * 10,
                vx: Math.cos(angle) * speed * 0.5,
                vy: Math.sin(angle) * speed - 1, // Rise upward
                life: 1.0,
                size: 5 + Math.random() * 8,
                color: Math.random() > 0.5 ? '#555555' : '#333333', // Dark gray/black
                type: 'smoke'
            });
        }

        // Debris particles (tank pieces)
        for (let i = 0; i < debrisParticleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 3 + Math.random() * 4;
            particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 2, // Initial upward velocity
                life: 1.0,
                size: 2 + Math.random() * 3,
                color: '#8B0000', // Dark red (tank color debris)
                type: 'debris',
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 0.3
            });
        }

        tanksGameState.explosion = {
            x: x,
            y: y,
            particles: particles,
            frame: 0,
            maxFrames: 60 // 1 second at 60fps
        };
    }

    function animateExplosion() {
        if (!tanksGameState.explosion) return;

        tanksGameState.explosion.frame++;

        // Update particles
        tanksGameState.explosion.particles.forEach(particle => {
            particle.x += particle.vx;
            particle.y += particle.vy;

            if (particle.type === 'fire') {
                // Fire particles: affected by gravity, fade quickly
                particle.vy += 0.15; // Gravity
                particle.vx *= 0.96; // Friction
                particle.vy *= 0.96;
                particle.life = 1 - (tanksGameState.explosion.frame / (tanksGameState.explosion.maxFrames * 0.6));
            } else if (particle.type === 'smoke') {
                // Smoke particles: rise up, expand, fade slowly
                particle.vy -= 0.02; // Rise upward
                particle.vx *= 0.99; // Less friction
                particle.vy *= 0.99;
                particle.size += 0.1; // Expand
                particle.life = 1 - (tanksGameState.explosion.frame / tanksGameState.explosion.maxFrames);
            } else if (particle.type === 'debris') {
                // Debris particles: affected by gravity, spin
                particle.vy += 0.2; // Gravity
                particle.vx *= 0.98; // Air resistance
                particle.vy *= 0.98;
                particle.rotation += particle.rotationSpeed;
                particle.life = 1 - (tanksGameState.explosion.frame / (tanksGameState.explosion.maxFrames * 0.8));
            }
        });

        render();

        // Continue animation or finish
        if (tanksGameState.explosion.frame < tanksGameState.explosion.maxFrames) {
            animationId = requestAnimationFrame(animateExplosion);
        } else {
            // Explosion finished, complete checkout
            tanksGameState.explosion = null;
            setTimeout(() => {
                cleanup();
                if (window.completeCheckout) window.completeCheckout();
            }, 500);
        }
    }

    function render() {
        // Clear canvas
        ctx.fillStyle = '#87CEEB'; // Sky blue
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Draw terrain
        ctx.fillStyle = '#228B22'; // Forest green
        ctx.beginPath();
        ctx.moveTo(0, CANVAS_HEIGHT);
        tanksGameState.terrain.forEach(point => {
            ctx.lineTo(point.x, point.y);
        });
        ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.closePath();
        ctx.fill();

        // Draw terrain outline
        ctx.strokeStyle = '#1a6b1a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        tanksGameState.terrain.forEach((point, i) => {
            if (i === 0) {
                ctx.moveTo(point.x, point.y);
            } else {
                ctx.lineTo(point.x, point.y);
            }
        });
        ctx.stroke();

        // Draw player tank (blue)
        drawTank(tanksGameState.playerTank.x, tanksGameState.playerTank.y, '#2563eb', tanksGameState.angle);

        // Draw enemy tank (red) - only if not exploding
        if (!tanksGameState.explosion) {
            drawTank(tanksGameState.enemyTank.x, tanksGameState.enemyTank.y, '#dc2626', 135); // Facing left
        }

        // Draw projectile trail
        if (tanksGameState.projectile && tanksGameState.projectile.trail.length > 0) {
            ctx.strokeStyle = '#fbbf24';
            ctx.lineWidth = 2;
            ctx.beginPath();
            tanksGameState.projectile.trail.forEach((point, i) => {
                if (i === 0) {
                    ctx.moveTo(point.x, point.y);
                } else {
                    ctx.lineTo(point.x, point.y);
                }
            });
            ctx.stroke();
        }

        // Draw projectile
        if (tanksGameState.projectile) {
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.arc(tanksGameState.projectile.x, tanksGameState.projectile.y, 4, 0, Math.PI * 2);
            ctx.fill();
        }

        // Draw aim line (when not animating)
        if (!tanksGameState.isAnimating) {
            const angleRad = (tanksGameState.angle * Math.PI) / 180;
            const lineLength = (tanksGameState.power / 100) * 60 + 20;
            const endX = tanksGameState.playerTank.x + Math.cos(angleRad) * lineLength;
            const endY = tanksGameState.playerTank.y - Math.sin(angleRad) * lineLength - 10;

            // Make aim line more visible when charging
            const alpha = tanksGameState.isCharging ? 0.9 : 0.6;
            const lineWidth = tanksGameState.isCharging ? 3 : 2;

            ctx.strokeStyle = `rgba(37, 99, 235, ${alpha})`;
            ctx.lineWidth = lineWidth;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(tanksGameState.playerTank.x, tanksGameState.playerTank.y - 10);
            ctx.lineTo(endX, endY);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Draw explosion
        if (tanksGameState.explosion) {
            tanksGameState.explosion.particles.forEach(particle => {
                if (particle.life <= 0) return;

                ctx.save();
                ctx.globalAlpha = particle.life;

                if (particle.type === 'debris') {
                    // Draw debris as rotating rectangles
                    ctx.translate(particle.x, particle.y);
                    ctx.rotate(particle.rotation);
                    ctx.fillStyle = particle.color;
                    ctx.fillRect(-particle.size, -particle.size, particle.size * 2, particle.size * 2);
                } else {
                    // Draw fire and smoke as circles
                    ctx.fillStyle = particle.color;
                    ctx.beginPath();
                    ctx.arc(particle.x, particle.y, particle.size * particle.life, 0, Math.PI * 2);
                    ctx.fill();
                }

                ctx.restore();
            });

            // Add flash effect at explosion center
            if (tanksGameState.explosion.frame < 10) {
                ctx.save();
                const flashAlpha = (10 - tanksGameState.explosion.frame) / 10;
                ctx.globalAlpha = flashAlpha;
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(tanksGameState.explosion.x, tanksGameState.explosion.y, 30, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }
    }

    function drawTank(x, y, color, barrelAngle) {
        // Tank body (rectangle)
        ctx.fillStyle = color;
        ctx.fillRect(x - 10, y - 8, 20, 8);

        // Tank turret (circle)
        ctx.beginPath();
        ctx.arc(x, y - 8, 6, 0, Math.PI * 2);
        ctx.fill();

        // Tank barrel (line)
        const angleRad = (barrelAngle * Math.PI) / 180;
        const barrelLength = 15;
        const barrelEndX = x + Math.cos(angleRad) * barrelLength;
        const barrelEndY = y - 8 - Math.sin(angleRad) * barrelLength;

        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x, y - 8);
        ctx.lineTo(barrelEndX, barrelEndY);
        ctx.stroke();
    }

    function showFeedback(message, isSuccess) {
        feedbackDiv.textContent = message;
        feedbackDiv.style.color = isSuccess ? '#22c55e' : '#ef4444';
    }

    // Initial render
    modal.classList.remove('hidden');
    render();
}
