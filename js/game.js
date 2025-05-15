class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.score = 0;
        this.gravity = 0.5;
        this.friction = 0.8;
        this.gameLoop = this.gameLoop.bind(this);
        this.keys = {};
        this.currentLevel = 0;
        this.cameraX = 0;
        
        // Initialize game objects
        this.loadLevel(this.currentLevel);

        // Event listeners
        window.addEventListener('keydown', (e) => this.keys[e.code] = true);
        window.addEventListener('keyup', (e) => this.keys[e.code] = false);

        // Start the game loop
        requestAnimationFrame(this.gameLoop);
    }

    loadLevel(levelIndex) {
        const levels = [
            {
                platforms: [
                    new Platform(0, 350, 3200, 50), // Ground
                    new Platform(300, 250, 200, 20),
                    new Platform(600, 200, 200, 20),
                    new Platform(900, 150, 200, 20),
                    new Platform(1200, 250, 200, 20),
                    new Platform(1500, 200, 200, 20),
                    new Platform(1800, 150, 200, 20),
                    new Platform(2100, 250, 200, 20),
                    new Platform(2400, 200, 200, 20),
                    new Platform(2700, 150, 200, 20),
                ],
                coins: [
                    new Coin(350, 200),
                    new Coin(400, 200),
                    new Coin(950, 100),
                    new Coin(1000, 100),
                    new Coin(1550, 150),
                    new Coin(1600, 150),
                    new Coin(2150, 200),
                    new Coin(2200, 200),
                    new Coin(2750, 100),
                    new Coin(2800, 100),
                ],
                enemies: [
                    new Goomba(400, 310, 300, 500),
                    new Goomba(800, 310, 700, 900),
                    new Goomba(1200, 310, 1100, 1300),
                    new Goomba(1600, 310, 1500, 1700),
                    new Goomba(2000, 310, 1900, 2100),
                    new Goomba(2400, 310, 2300, 2500),
                ],
                finishFlag: new Flag(3000, 100),
                playerStart: { x: 50, y: 200 }
            }
            // Add more levels here
        ];

        const level = levels[levelIndex];
        this.player = new Mario(level.playerStart.x, level.playerStart.y);
        this.platforms = level.platforms;
        this.coins = level.coins;
        this.enemies = level.enemies;
        this.finishFlag = level.finishFlag;
        this.levelWidth = 3200;
    }

    gameLoop() {
        this.update();
        this.draw();
        requestAnimationFrame(this.gameLoop);
    }

    update() {
        // Update player
        this.player.update(this.keys, this.gravity, this.friction);

        // Update camera position
        this.cameraX = Math.max(0, Math.min(this.player.x - this.canvas.width/3, this.levelWidth - this.canvas.width));

        // Check platform collisions
        this.platforms.forEach(platform => {
            if (this.player.checkPlatformCollision(platform)) {
                this.player.handlePlatformCollision(platform);
            }
        });

        // Update and check coin collisions
        this.coins = this.coins.filter(coin => {
            if (this.player.checkCoinCollision(coin)) {
                this.score += 10;
                document.querySelector('#score span').textContent = this.score;
                return false;
            }
            return true;
        });

        // Update enemies and check collisions
        this.enemies.forEach(enemy => {
            enemy.update();
            if (this.player.checkEnemyCollision(enemy)) {
                if (this.player.vy > 0) {
                    // Player is falling onto enemy
                    enemy.die();
                    this.player.vy = -10; // Bounce
                } else {
                    // Player hits enemy from side or bottom
                    this.player.die();
                    this.reset();
                }
            }
        });

        // Check finish flag collision
        if (this.player.checkFlagCollision(this.finishFlag)) {
            this.completeLevel();
        }

        // Keep player in bounds
        if (this.player.x < 0) this.player.x = 0;
        if (this.player.x + this.player.width > this.levelWidth) {
            this.player.x = this.levelWidth - this.player.width;
        }
    }

    draw() {
        // Draw sky background
        this.ctx.fillStyle = '#5c94fc';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Save context before applying camera transform
        this.ctx.save();
        this.ctx.translate(-this.cameraX, 0);

        // Draw ground (brown)
        this.ctx.fillStyle = '#c84';
        this.ctx.fillRect(0, 350, this.levelWidth, this.canvas.height - 350);

        // Draw clouds (decorative)
        this.drawClouds();

        // Draw game objects
        this.platforms.forEach(platform => platform.draw(this.ctx));
        this.coins.forEach(coin => coin.draw(this.ctx));
        this.enemies.forEach(enemy => enemy.draw(this.ctx));
        this.finishFlag.draw(this.ctx);
        this.player.draw(this.ctx);

        // Restore context
        this.ctx.restore();
    }

    drawClouds() {
        this.ctx.fillStyle = '#fff';
        const cloudPositions = [100, 500, 900, 1300, 1700, 2100, 2500, 2900];
        cloudPositions.forEach(x => {
            this.ctx.beginPath();
            this.ctx.arc(x, 80, 30, 0, Math.PI * 2);
            this.ctx.arc(x + 25, 80, 25, 0, Math.PI * 2);
            this.ctx.arc(x - 25, 80, 25, 0, Math.PI * 2);
            this.ctx.fill();
        });
    }

    completeLevel() {
        this.currentLevel++;
        // For now, just reset to the same level
        this.loadLevel(0);
    }

    reset() {
        this.loadLevel(this.currentLevel);
        this.score = 0;
        document.querySelector('#score span').textContent = this.score;
    }
}

class Mario {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 40;
        this.vx = 0;
        this.vy = 0;
        this.jumping = false;
        this.facing = 1; // 1 for right, -1 for left
    }

    update(keys, gravity, friction) {
        // Horizontal movement
        if (keys['ArrowLeft']) {
            this.vx -= 1;
            this.facing = -1;
        }
        if (keys['ArrowRight']) {
            this.vx += 1;
            this.facing = 1;
        }

        // Apply friction
        this.vx *= friction;

        // Jumping
        if (keys['Space'] && !this.jumping) {
            this.vy = -15;
            this.jumping = true;
        }

        // Apply gravity
        this.vy += gravity;

        // Update position
        this.x += this.vx;
        this.y += this.vy;
    }

    draw(ctx) {
        // Draw Mario's body (red overalls)
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Draw shirt (blue)
        ctx.fillStyle = '#0000ff';
        ctx.fillRect(this.x, this.y, this.width, this.height/2);
        
        // Draw face (peach color)
        ctx.fillStyle = '#ffb6c1';
        ctx.fillRect(this.x + (this.facing === 1 ? this.width/2 : 0), this.y, this.width/2, this.height/2);
        
        // Draw hat (red)
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(this.x, this.y, this.width, 10);
        
        // Draw eyes
        ctx.fillStyle = '#000000';
        const eyeX = this.x + (this.facing === 1 ? this.width * 3/4 : this.width/4);
        ctx.fillRect(eyeX, this.y + 10, 4, 4);
    }

    checkPlatformCollision(platform) {
        return this.x < platform.x + platform.width &&
               this.x + this.width > platform.x &&
               this.y < platform.y + platform.height &&
               this.y + this.height > platform.y;
    }

    handlePlatformCollision(platform) {
        // Bottom collision
        if (this.vy > 0 && this.y + this.height > platform.y && this.y < platform.y) {
            this.y = platform.y - this.height;
            this.vy = 0;
            this.jumping = false;
        }
        // Top collision
        else if (this.vy < 0 && this.y < platform.y + platform.height) {
            this.y = platform.y + platform.height;
            this.vy = 0;
        }
    }

    checkCoinCollision(coin) {
        return this.x < coin.x + coin.size &&
               this.x + this.width > coin.x &&
               this.y < coin.y + coin.size &&
               this.y + this.height > coin.y;
    }

    checkEnemyCollision(enemy) {
        return this.x < enemy.x + enemy.width &&
               this.x + this.width > enemy.x &&
               this.y < enemy.y + enemy.height &&
               this.y + this.height > enemy.y;
    }

    checkFlagCollision(flag) {
        return this.x < flag.x + flag.width &&
               this.x + this.width > flag.x &&
               this.y < flag.y + flag.height &&
               this.y + this.height > flag.y;
    }

    die() {
        this.x = 50;
        this.y = 200;
        this.vx = 0;
        this.vy = 0;
    }
}

class Platform {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }

    draw(ctx) {
        ctx.fillStyle = '#c84';
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Draw brick pattern
        ctx.strokeStyle = '#a63';
        ctx.lineWidth = 2;
        for (let x = this.x; x < this.x + this.width; x += 20) {
            ctx.beginPath();
            ctx.moveTo(x, this.y);
            ctx.lineTo(x, this.y + this.height);
            ctx.stroke();
        }
        for (let y = this.y; y < this.y + this.height; y += 10) {
            ctx.beginPath();
            ctx.moveTo(this.x, y);
            ctx.lineTo(this.x + this.width, y);
            ctx.stroke();
        }
    }
}

class Coin {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = 20;
        this.rotation = 0;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x + this.size/2, this.y + this.size/2);
        this.rotation += 0.1;
        ctx.rotate(this.rotation);
        
        // Draw coin
        ctx.fillStyle = '#ffd700';
        ctx.beginPath();
        ctx.ellipse(0, 0, this.size/2, this.size/3, 0, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
}

class Goomba {
    constructor(x, y, leftBound, rightBound) {
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 30;
        this.speed = 2;
        this.leftBound = leftBound;
        this.rightBound = rightBound;
        this.direction = 1;
    }

    update() {
        this.x += this.speed * this.direction;
        if (this.x <= this.leftBound || this.x >= this.rightBound - this.width) {
            this.direction *= -1;
        }
    }

    draw(ctx) {
        // Draw Goomba body (brown)
        ctx.fillStyle = '#8b4513';
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Draw feet (darker brown)
        ctx.fillStyle = '#654321';
        ctx.fillRect(this.x, this.y + this.height - 10, this.width/2, 10);
        ctx.fillRect(this.x + this.width/2, this.y + this.height - 10, this.width/2, 10);
        
        // Draw eyes
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(this.x + 5, this.y + 5, 8, 8);
        ctx.fillRect(this.x + this.width - 13, this.y + 5, 8, 8);
        
        ctx.fillStyle = '#000000';
        ctx.fillRect(this.x + 7, this.y + 7, 4, 4);
        ctx.fillRect(this.x + this.width - 11, this.y + 7, 4, 4);
    }

    die() {
        this.y = 1000; // Move enemy off screen
    }
}

class Flag {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 20;
        this.height = 250;
        this.flagHeight = 40;
    }

    draw(ctx) {
        // Draw pole
        ctx.fillStyle = '#c0c0c0';
        ctx.fillRect(this.x, this.y, this.width/2, this.height);

        // Draw flag
        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.moveTo(this.x + this.width/2, this.y);
        ctx.lineTo(this.x + this.width/2, this.y + this.flagHeight);
        ctx.lineTo(this.x + this.width * 2, this.y + this.flagHeight/2);
        ctx.closePath();
        ctx.fill();
    }
}

// Start the game
new Game(); 