// Canvas setup
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// Game state
let gameState = 'loading';
let gameLoop;
let score = 0;
let level = 1;
let lives = 3;
let specialWeapons = 3;
let multiplier = 1;

// Game objects
let ship;
let enemies = [];
let bullets = [];
let powerUps = [];
let particles = [];
let stars = [];

// SVG definitions for game objects
const SVG = {
    ship: `<svg viewBox="0 0 50 50" width="50" height="50">
             <polygon points="25,0 0,50 50,50" fill="#00ffff"/>
           </svg>`,
    enemy: `<svg viewBox="0 0 40 40" width="40" height="40">
              <circle cx="20" cy="20" r="20" fill="#ff0000"/>
            </svg>`,
    boss: `<svg viewBox="0 0 60 60" width="60" height="60">
             <rect width="60" height="60" fill="#ff00ff"/>
           </svg>`
};

// Create image elements from SVG strings
function createImageFromSVG(svgString) {
    const img = new Image();
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);
    return img;
}

// Asset loading
const assets = {
    shipImage: createImageFromSVG(SVG.ship),
    enemyImage: createImageFromSVG(SVG.enemy),
    bossImage: createImageFromSVG(SVG.boss)
};

// Load assets
function loadAssets() {
    let assetsLoaded = 0;
    const totalAssets = Object.keys(assets).length;

    function assetLoaded() {
        assetsLoaded++;
        updateLoadingProgress(assetsLoaded / totalAssets);
        if (assetsLoaded === totalAssets) {
            initializeGame();
        }
    }

    // Load images
    for (let asset of Object.values(assets)) {
        asset.onload = assetLoaded;
    }
}

function updateLoadingProgress(progress) {
    const progressElement = document.querySelector('.progress');
    if (progressElement) {
        progressElement.style.width = `${progress * 100}%`;
    }
}

// Game objects
class Ship {
    constructor() {
        this.width = 50;
        this.height = 50;
        this.x = canvas.width / 2 - this.width / 2;
        this.y = canvas.height - this.height - 10;
        this.speed = 5;
        this.health = 100;
        this.shieldActive = false;
    }

    draw() {
        ctx.drawImage(assets.shipImage, this.x, this.y, this.width, this.height);
        if (this.shieldActive) {
            ctx.beginPath();
            ctx.arc(this.x + this.width / 2, this.y + this.height / 2, this.width / 2 + 10, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(0, 255, 255, 0.5)';
            ctx.lineWidth = 3;
            ctx.stroke();
        }
    }

    move(direction) {
        if (direction === 'left' && this.x > 0) {
            this.x -= this.speed;
        } else if (direction === 'right' && this.x < canvas.width - this.width) {
            this.x += this.speed;
        }
    }

    shoot() {
        bullets.push(new Bullet(this.x + this.width / 2, this.y));
    }
}

class Bullet {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 3;
        this.height = 10;
        this.speed = 7;
    }

    draw() {
        ctx.fillStyle = '#00ffff';
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }

    move() {
        this.y -= this.speed;
    }
}

class Enemy {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 40;
        this.height = 40;
        this.speed = Math.random() * 2 + 1;
    }

    draw() {
        ctx.drawImage(assets.enemyImage, this.x, this.y, this.width, this.height);
    }

    move() {
        this.y += this.speed;
    }
}

class PowerUp {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.width = 20;
        this.height = 20;
        this.type = type;
        this.speed = 2;
    }

    draw() {
        ctx.fillStyle = this.getColor();
        ctx.beginPath();
        ctx.arc(this.x + this.width / 2, this.y + this.height / 2, this.width / 2, 0, Math.PI * 2);
        ctx.fill();
    }

    move() {
        this.y += this.speed;
    }

    getColor() {
        switch (this.type) {
            case 'health': return 'green';
            case 'shield': return 'blue';
            case 'rapidFire': return 'yellow';
            case 'specialWeapon': return 'purple';
            default: return 'white';
        }
    }
}

// Game functions
function createEnemies() {
    for (let i = 0; i < 5 + level; i++) {
        const x = Math.random() * (canvas.width - 40);
        enemies.push(new Enemy(x, -50));
    }
}

function createStars() {
    for (let i = 0; i < 100; i++) {
        stars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 2 + 1,
            speed: Math.random() * 3 + 1
        });
    }
}

function updateGame() {
    ctx.fillStyle = '#000033';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    updateStars();
    updateShip();
    updateBullets();
    updateEnemies();
    updatePowerUps();
    updateParticles();
    
    checkCollisions();
    updateHUD();
    
    if (enemies.length === 0) {
        level++;
        createEnemies();
    }
    
    if (lives <= 0 || ship.health <= 0) {
        gameOver();
    }
}

function updateStars() {
    ctx.fillStyle = 'white';
    stars.forEach(star => {
        ctx.fillRect(star.x, star.y, star.size, star.size);
        star.y += star.speed;
        if (star.y > canvas.height) {
            star.y = 0;
            star.x = Math.random() * canvas.width;
        }
    });
}

function updateShip() {
    ship.draw();
}

function updateBullets() {
    bullets.forEach((bullet, index) => {
        bullet.move();
        bullet.draw();
        if (bullet.y < 0) bullets.splice(index, 1);
    });
}

function updateEnemies() {
    enemies.forEach((enemy, index) => {
        enemy.move();
        enemy.draw();
        if (enemy.y > canvas.height) {
            enemies.splice(index, 1);
            lives--;
        }
    });
}

function updatePowerUps() {
    powerUps.forEach((powerUp, index) => {
        powerUp.move();
        powerUp.draw();
        if (powerUp.y > canvas.height) {
            powerUps.splice(index, 1);
        }
    });
}

function updateParticles() {
    particles.forEach((particle, index) => {
        particle.x += particle.speedX;
        particle.y += particle.speedY;
        particle.life--;
        
        ctx.fillStyle = `rgba(255, 255, 255, ${particle.life / 50})`;
        ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
        
        if (particle.life <= 0) particles.splice(index, 1);
    });
}

function checkCollisions() {
    // Ship-Enemy collision
    enemies.forEach((enemy, eIndex) => {
        if (checkCollision(ship, enemy)) {
            enemies.splice(eIndex, 1);
            if (!ship.shieldActive) {
                ship.health -= 20;
                createParticles(ship.x + ship.width / 2, ship.y + ship.height / 2);
            }
        }
    });

    // Bullet-Enemy collision
    bullets.forEach((bullet, bIndex) => {
        enemies.forEach((enemy, eIndex) => {
            if (checkCollision(bullet, enemy)) {
                enemies.splice(eIndex, 1);
                bullets.splice(bIndex, 1);
                score += 10 * multiplier;
                createParticles(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
                if (Math.random() < 0.1) spawnPowerUp(enemy.x, enemy.y);
            }
        });
    });

    // Ship-PowerUp collision
    powerUps.forEach((powerUp, index) => {
        if (checkCollision(ship, powerUp)) {
            applyPowerUp(powerUp.type);
            powerUps.splice(index, 1);
        }
    });
}

function checkCollision(obj1, obj2) {
    return obj1.x < obj2.x + obj2.width &&
           obj1.x + obj1.width > obj2.x &&
           obj1.y < obj2.y + obj2.height &&
           obj1.y + obj1.height > obj2.y;
}

function createParticles(x, y) {
    for (let i = 0; i < 20; i++) {
        particles.push({
            x: x,
            y: y,
            size: Math.random() * 3 + 1,
            speedX: Math.random() * 4 - 2,
            speedY: Math.random() * 4 - 2,
            life: Math.random() * 30 + 20
        });
    }
}

function spawnPowerUp(x, y) {
    const types = ['health', 'shield', 'rapidFire', 'specialWeapon'];
    const type = types[Math.floor(Math.random() * types.length)];
    powerUps.push(new PowerUp(x, y, type));
}

function applyPowerUp(type) {
    switch (type) {
        case 'health':
            ship.health = Math.min(ship.health + 20, 100);
            break;
        case 'shield':
            ship.shieldActive = true;
            setTimeout(() => ship.shieldActive = false, 5000);
            break;
        case 'rapidFire':
            const originalFireRate = ship.fireRate;
            ship.fireRate = 5;
            setTimeout(() => ship.fireRate = originalFireRate, 5000);
            break;
        case 'specialWeapon':
            specialWeapons++;
            break;
    }
}

function updateHUD() {
    const scoreElement = document.getElementById('score');
    const levelElement = document.getElementById('level');
    const specialWeaponElement = document.getElementById('special-weapon');
    const multiplierElement = document.getElementById('multiplier');
    const healthBarElement = document.getElementById('health-bar');

    if (scoreElement) scoreElement.querySelector('span').textContent = score;
    if (levelElement) levelElement.querySelector('span').textContent = level;
    if (specialWeaponElement) specialWeaponElement.querySelector('span').textContent = specialWeapons;
    if (multiplierElement) multiplierElement.querySelector('span').textContent = `x${multiplier}`;
    if (healthBarElement) healthBarElement.style.width = `${ship.health}%`;
}

function showScreen(screenId) {
    document.querySelectorAll('.game-screen').forEach(screen => screen.classList.remove('active'));
    const screenElement = document.getElementById(screenId);
    if (screenElement) screenElement.classList.add('active');
    gameState = screenId.replace('-screen', '');
}

function startGame() {
    showScreen('game-screen');
    ship = new Ship();
    createEnemies();
    createStars();
    gameLoop = setInterval(updateGame, 1000 / 60);
}

function gameOver() {
    clearInterval(gameLoop);
    showScreen('end-screen');
    const finalScoreElement = document.getElementById('final-score');
    if (finalScoreElement) finalScoreElement.textContent = `Final Score: ${score}`;
    checkHighScore();
}

function restartGame() {
    score = 0;
    level = 1;
    lives = 3;
    specialWeapons = 3;
    multiplier = 1;
    ship = new Ship();
    enemies = [];
    bullets = [];
    powerUps = [];
    particles = [];
    startGame();
}

function setDifficulty(e) {
    document.querySelectorAll('.difficulty-button').forEach(btn => btn.classList.remove('selected'));
    e.target.classList.add('selected');
    switch (e.target.dataset.difficulty) {
        case 'easy':
            ship.speed = 6;
            break;
        case 'medium':
            ship.speed = 5;
            break;
        case 'hard':
            ship.speed = 4;
            break;
    }
}

function checkHighScore() {
    const highScores = JSON.parse(localStorage.getItem('highScores')) || [];
    const lowestHighScore = highScores.length < 5 ? 0 : highScores[highScores.length - 1].score;
    
    if (score > lowestHighScore) {
        const highScoreInputElement = document.getElementById('high-score-input');
        if (highScoreInputElement) highScoreInputElement.classList.remove('hidden');
    }
}

function submitHighScore() {
    const initialsElement = document.getElementById('initials');
    const initials = initialsElement ? initialsElement.value.toUpperCase() : '';
    const highScores = JSON.parse(localStorage.getItem('highScores')) || [];
    highScores.push({ initials, score });
    highScores.sort((a, b) => b.score - a.score);
    if (highScores.length > 5) highScores.pop();
    localStorage.setItem('highScores', JSON.stringify(highScores));
    const highScoreInputElement = document.getElementById('high-score-input');
    if (highScoreInputElement) highScoreInputElement.classList.add('hidden');
}

function drawMiniMap() {
    const miniMap = document.getElementById('mini-map');
    if (!miniMap) return;

    const miniCtx = miniMap.getContext('2d');
    const mapWidth = miniMap.width;
    const mapHeight = miniMap.height;
    
    miniCtx.clearRect(0, 0, mapWidth, mapHeight);
    
    // Draw player
    miniCtx.fillStyle = '#00ffff';
    miniCtx.fillRect(
        (ship.x / canvas.width) * mapWidth,
        (ship.y / canvas.height) * mapHeight,
        3, 3
    );
    
    // Draw enemies
    miniCtx.fillStyle = '#ff0000';
    enemies.forEach(enemy => {
        miniCtx.fillRect(
            (enemy.x / canvas.width) * mapWidth,
            (enemy.y / canvas.height) * mapHeight,
            2, 2
        );
    });
}

function useSpecialWeapon() {
    if (specialWeapons > 0) {
        enemies.forEach(enemy => {
            createParticles(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
        });
        enemies = [];
        specialWeapons--;
    }
}

// Event listeners
document.addEventListener('keydown', (e) => {
    if (gameState === 'game') {
        if (e.key === 'ArrowLeft') ship.move('left');
        if (e.key === 'ArrowRight') ship.move('right');
        if (e.key === ' ') ship.shoot();
        if (e.key === 'Shift' && specialWeapons > 0) useSpecialWeapon();
    }
});

const startButton = document.getElementById('start-button');
if (startButton) startButton.addEventListener('click', startGame);

const restartButton = document.getElementById('restart-button');
if (restartButton) restartButton.addEventListener('click', restartGame);

document.querySelectorAll('.difficulty-button').forEach(button => {
    button.addEventListener('click', setDifficulty);
});

const submitScoreButton = document.getElementById('submit-score');
if (submitScoreButton) submitScoreButton.addEventListener('click', submitHighScore);

// Initialize game
function initializeGame() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    createStars();
    showScreen('start-screen');
    
    // Set default difficulty
    const mediumDifficultyButton = document.querySelector('.difficulty-button[data-difficulty="medium"]');
    if (mediumDifficultyButton) {
        setDifficulty({ target: mediumDifficultyButton });
    }
    
    // Add resize event listener
    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        if (ship) {
            ship.x = Math.min(ship.x, canvas.width - ship.width);
            ship.y = canvas.height - ship.height - 10;
        }
    });
}

// Start the game
document.addEventListener('DOMContentLoaded', () => {
    loadAssets();
});