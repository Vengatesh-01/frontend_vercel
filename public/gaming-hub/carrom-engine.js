
class CarromEngine {
    constructor() {
        this.ctx = null;
        this.canvas = null;
        this.overlay = null;
        this.animationId = null;

        this.state = {
            striker: null,
            coins: [],
            activePlayer: 1,
            scores: { 1: 0, 2: 0 },
            isMoving: false,
            aiming: false,
            power: 0,
            aimAngle: 0,
            queenCapturedBy: null,
            pendingQueen: false,
            turnHasScore: false,
            turnHasFoul: false,
            strikerX: 0,
            dragStartX: 0,
            dragStartY: 0,
            hasHitCoin: false
        };

        // Constants
        this.FRICTION = 0.985;
        this.WALL_BOUNCINESS = 0.75;
        this.COIN_BOUNCINESS = 0.8;

        // Dimensions (calculated on start)
        this.centerX = 0;
        this.centerY = 0;
        this.boardRadius = 0;
        this.pocketRadius = 0;
        this.coinRadius = 0;
        this.pockets = [[-1, -1], [1, -1], [-1, 1], [1, 1]];

        // Bind methods
        this.gameLoop = this.gameLoop.bind(this);
        this.handleMouseDown = this.handleMouseDown.bind(this);
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleMouseUp = this.handleMouseUp.bind(this);
        this.handleKeyDown = this.handleKeyDown.bind(this);

        // Input state
        this.isDraggingStriker = false;
        this.isDrawingPower = false;
    }

    start(canvas, overlay, ctx) {
        this.canvas = canvas;
        this.overlay = overlay;
        this.ctx = ctx;
        this.active = true;

        // Calculate dimensions
        const size = Math.min(canvas.width, canvas.height) * 0.75;
        this.centerX = canvas.width / 2;
        this.centerY = canvas.height / 2; // Perfect center
        this.boardRadius = size / 2;
        this.pocketRadius = this.boardRadius * 0.12;
        this.coinRadius = this.boardRadius * 0.045;
        this.strikerRadius = this.coinRadius * 1.4;

        this.setupUI();
        this.initGame();

        // Attach listeners
        this.canvas.addEventListener('mousedown', this.handleMouseDown);
        window.addEventListener('mousemove', this.handleMouseMove);
        window.addEventListener('mouseup', this.handleMouseUp);
        window.addEventListener('keydown', this.handleKeyDown);

        // Touch Support (Map to Mouse Events)
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousedown', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            this.handleMouseDown(mouseEvent);
        }, { passive: false });

        window.addEventListener('touchmove', (e) => {
            e.preventDefault(); // Prevent scrolling
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousemove', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            this.handleMouseMove(mouseEvent);
        }, { passive: false });

        window.addEventListener('touchend', (e) => {
            const mouseEvent = new MouseEvent('mouseup', {});
            this.handleMouseUp(mouseEvent);
        }, { passive: false });

        // Start Loop
        this.gameLoop();
    }

    stop() {
        this.active = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }

        // Clean up listeners
        if (this.canvas) {
            this.canvas.removeEventListener('mousedown', this.handleMouseDown);
            this.canvas.removeEventListener('touchstart', this.handleMouseDown);
        }
        window.removeEventListener('mousemove', this.handleMouseMove);
        window.removeEventListener('mouseup', this.handleMouseUp);
        window.removeEventListener('keydown', this.handleKeyDown);
        window.removeEventListener('touchmove', this.handleMouseMove);
        window.removeEventListener('touchend', this.handleMouseUp);

        if (this.overlay) {
            this.overlay.innerHTML = '';
            this.overlay.style.pointerEvents = "none";
            // Do NOT remove overlay here, parent handles it
        }

        if (this.audioCtx) {
            // Suspended/Close context if needed
        }
    }

    handleMoveFromServer(data) {
        if (!this.active) return;
        this.state.striker.x = data.strikerX;
        this.state.striker.y = data.strikerY;
        this.state.aimAngle = data.aimAngle;
        this.state.power = data.power;
        this.shootStriker();
    }

    broadcastMove() {
        if (window.parent && window.parent.socket && window.parent.isMultiplayer) {
            window.parent.socket.emit('carrom-move', {
                roomId: window.parent.currentRoomId,
                strikerX: this.state.striker.x,
                strikerY: this.state.striker.y,
                aimAngle: this.state.aimAngle,
                power: this.state.power
            });
        }
    }

    setupUI() {
        console.log("CarromEngine: Setting up UI...");

        // Move Exit Button down below the P1 Widget & Style it small/unique
        const backBtns = document.querySelectorAll('.back-btn');
        backBtns.forEach(btn => {
            btn.dataset.originalTop = btn.style.top || '20px';
            btn.dataset.originalTransform = btn.style.transform || '';
            btn.dataset.originalPadding = btn.style.padding || '';
            btn.dataset.originalBackground = btn.style.background || '';
            btn.dataset.originalBorder = btn.style.border || '';

            btn.style.top = '145px';
            btn.style.transform = 'scale(0.85)';
            btn.style.transformOrigin = 'left top';
            btn.style.padding = '8px 16px';
            btn.style.background = 'linear-gradient(to bottom, #78350f, #451a03)';
            btn.style.border = '2px solid #f59e0b';
            btn.style.borderRadius = '20px';
            btn.style.boxShadow = '0 4px 10px rgba(0,0,0,0.5)';
            btn.style.zIndex = '2147483648'; // Above HUD if needed
        });

        // Remove any existing HUD to prevent duplicates
        const existingHud = document.getElementById('carrom-score-hud-root');
        if (existingHud) existingHud.remove();

        // Create a direct root for the HUD
        const hudRoot = document.createElement('div');
        hudRoot.id = 'carrom-score-hud-root';
        hudRoot.style.position = 'fixed';
        hudRoot.style.top = '0';
        hudRoot.style.left = '0';
        hudRoot.style.width = '100%';
        hudRoot.style.height = '0'; // Wrapper doesn't block clicks
        hudRoot.style.zIndex = '2147483647'; // Max Z-Index
        hudRoot.style.pointerEvents = 'none'; // Pass-through clicks
        document.body.appendChild(hudRoot);

        // Random Cartoon Avatars (DiceBear)
        const seeds = ['Felix', 'Aneka', 'Zack', 'Midnight', 'Tiger', 'Bear', 'Cuddles', 'Bandit'];
        const shuffled = seeds.sort(() => 0.5 - Math.random());
        const p1Avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${shuffled[0]}`;
        const p2Avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${shuffled[1]}`;

        hudRoot.innerHTML = `
            <!-- Top Scoreboard (Floating Corners Theme) -->
            <div id="carrom-score-hud" style="position: fixed; top: 0; left: 0; width: 100%; height: 0; display: flex !important; justify-content: space-between; align-items: flex-start; padding: 50px 20px 20px; z-index: 2147483647; pointer-events: none;">
                
                <!-- Player 1 (Left: Alex) -->
                <div style="display: flex; align-items: center; gap: 12px; background: linear-gradient(to bottom, #451a03, #2a0a00); padding: 10px 20px; border-radius: 16px; border: 2px solid #facc15; box-shadow: 0 6px 12px rgba(0,0,0,0.6); pointer-events: auto;">
                    <!-- Avatar Block -->
                    <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
                        <div style="width: 50px; height: 50px; border: 2px solid #facc15; border-radius: 10px; overflow: hidden; box-shadow: 0 0 8px rgba(250, 204, 21, 0.8); background: #1f2937;">
                            <img src="${p1Avatar}" style="width: 100%; height: 100%; object-fit: cover;">
                        </div>
                    </div>
                    
                    <!-- White Coin Icon -->
                    <div style="width: 32px; height: 32px; border-radius: 50%; background: radial-gradient(circle at 30% 30%, #f5f5f5, #d4d4d4); border: 1px solid #a3a3a3; box-shadow: 0 2px 4px rgba(0,0,0,0.4); position: relative;">
                        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 20px; height: 20px; border-radius: 50%; border: 1px solid #d4d4d4;"></div>
                    </div>

                    <!-- Score -->
                    <div id="s1" style="color: #fff; font-weight: 900; font-size: 2.2rem; font-family: sans-serif; text-shadow: 0 0 10px #facc15;">0</div>
                </div>

                <!-- Player 2 (Right: Carry) -->
                <div style="display: flex; align-items: center; gap: 12px; background: linear-gradient(to bottom, #451a03, #2a0a00); padding: 10px 20px; border-radius: 16px; border: 2px solid #facc15; box-shadow: 0 6px 12px rgba(0,0,0,0.6); pointer-events: auto;">
                    <!-- Score -->
                    <div id="s2" style="color: #fff; font-weight: 900; font-size: 2.2rem; font-family: sans-serif; text-shadow: 0 0 10px #facc15;">0</div>

                    <!-- Black Coin Icon -->
                    <div style="width: 32px; height: 32px; border-radius: 50%; background: radial-gradient(circle at 30% 30%, #404040, #171717); border: 1px solid #525252; box-shadow: 0 2px 4px rgba(0,0,0,0.4); position: relative;">
                        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 20px; height: 20px; border-radius: 50%; border: 1px solid #404040;"></div>
                    </div>

                    <!-- Avatar Block -->
                    <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
                        <div style="width: 50px; height: 50px; border: 2px solid #facc15; border-radius: 10px; overflow: hidden; box-shadow: 0 0 8px rgba(250, 204, 21, 0.8); background: #1f2937;">
                            <img src="${p2Avatar}" style="width: 100%; height: 100%; object-fit: cover;">
                        </div>
                    </div>
                </div>

            <!-- Power Bar (Right Side) -->
            <div id="power-bar-container" style="position: absolute; right: 40px; top: 50%; transform: translateY(-50%); height: 300px; width: 24px; background: rgba(0,0,0,0.4); border-radius: 12px; border: 1px solid rgba(255,255,255,0.15); display: none; overflow: hidden; backdrop-filter: blur(4px);" >
                <div id="power-level" style="position: absolute; bottom: 0; width: 100%; background: linear-gradient(to top, #22c55e, #eab308, #ef4444); transition: height 0.05s; box-shadow: 0 0 10px rgba(255,255,255,0.2);" ></div>
            </div>
        `;
    }

    initGame() {
        this.state.isMoving = false;
        this.state.aiming = false;
        this.state.activePlayer = 1;
        this.state.scores = { 1: 0, 2: 0 };
        this.state.coins = [];
        this.state.hasHitCoin = false;

        // Queen
        this.state.coins.push({
            x: this.centerX, y: this.centerY, vx: 0, vy: 0,
            radius: this.coinRadius, color: "#ef4444", type: 'queen'
        });

        // Layer 1
        for (let i = 0; i < 6; i++) {
            const angle = (i * 60) * Math.PI / 180;
            const dist = this.coinRadius * 2.3;
            const color = i % 2 === 0 ? "#ffffff" : "#222222";
            this.state.coins.push({
                x: this.centerX + Math.cos(angle) * dist,
                y: this.centerY + Math.sin(angle) * dist,
                vx: 0, vy: 0, radius: this.coinRadius, color,
                type: color === "#ffffff" ? 'white' : 'black'
            });
        }

        // Layer 2
        for (let i = 0; i < 12; i++) {
            const angle = (i * 30) * Math.PI / 180;
            const dist = this.coinRadius * 4.5;
            const color = i % 2 === 0 ? "#222222" : "#ffffff";
            this.state.coins.push({
                x: this.centerX + Math.cos(angle) * dist,
                y: this.centerY + Math.sin(angle) * dist,
                vx: 0, vy: 0, radius: this.coinRadius, color,
                type: color === "#ffffff" ? 'white' : 'black'
            });
        }

        // Striker
        const baselineY = this.boardRadius * 0.72;
        this.state.striker = {
            x: this.centerX,
            y: this.centerY + baselineY,
            vx: 0, vy: 0, radius: this.strikerRadius, color: "#06b6d4", type: 'striker'
        };

        this.state.strikerX = this.centerX;
        this.updateStrikerSliderPosition();
        this.updateHUD();
    }

    updateStrikerSliderPosition() {
        const minX = this.centerX - this.boardRadius * 0.65;
        const maxX = this.centerX + this.boardRadius * 0.65;
        let percent = (this.state.striker.x - minX) / (maxX - minX);
        percent = Math.max(0, Math.min(1, percent));

        const handle = document.getElementById('striker-handle');
        if (handle) handle.style.left = (percent * 100) + '%';
    }

    updateHUD() {
        const s1 = document.getElementById('s1');
        const s2 = document.getElementById('s2');
        // We can also update center score or coins if needed, but for now 1000 is static in template
        if (s1 && s2) {
            s1.innerText = this.state.scores[1];
            s2.innerText = this.state.scores[2];
        }
    }

    handleMouseDown(e) {
        if (this.state.isMoving || this.state.activePlayer === 2) return;

        const rect = this.canvas.getBoundingClientRect();
        const mouseX = (e.clientX - rect.left) * (this.canvas.width / rect.width);
        const mouseY = (e.clientY - rect.top) * (this.canvas.height / rect.height);

        const dist = Math.hypot(mouseX - this.state.striker.x, mouseY - this.state.striker.y);

        if (dist < this.state.striker.radius * 3) {
            this.isDraggingStriker = true;
        } else if (Math.abs(mouseY - this.state.striker.y) < 100) {
            this.isDrawingPower = true;
            this.state.aiming = true;
            this.state.dragStartX = mouseX;
            this.state.dragStartY = mouseY;
        }
    }

    handleMouseMove(e) {
        if (this.state.isMoving || this.state.activePlayer === 2) return;

        const rect = this.canvas.getBoundingClientRect();
        const mouseX = (e.clientX - rect.left) * (this.canvas.width / rect.width);
        const mouseY = (e.clientY - rect.top) * (this.canvas.height / rect.height);

        if (this.isDraggingStriker) {
            const minX = this.centerX - this.boardRadius * 0.65;
            const maxX = this.centerX + this.boardRadius * 0.65;
            this.state.striker.x = Math.max(minX, Math.min(maxX, mouseX));
            this.state.strikerX = this.state.striker.x;
            this.updateStrikerSliderPosition();
        } else if (this.isDrawingPower) {
            const dx = this.state.dragStartX - mouseX;
            const dy = this.state.dragStartY - mouseY;
            this.state.power = Math.min(Math.hypot(dx, dy) / 2.5, 100);
            this.state.aimAngle = Math.atan2(dy, dx);

            const pb = document.getElementById('power-bar-container');
            const pl = document.getElementById('power-level');
            if (pb) pb.style.display = 'block';
            if (pl) pl.style.height = this.state.power + '%';
        }
    }

    handleMouseUp() {
        if (this.isDraggingStriker) {
            this.isDraggingStriker = false;
        } else if (this.isDrawingPower) {
            this.isDrawingPower = false;
            this.shootStriker();
            const pb = document.getElementById('power-bar-container');
            if (pb) pb.style.display = 'none';
        }
    }

    handleKeyDown(e) {
        if (this.state.isMoving || this.state.activePlayer === 2) return;
        const step = 10;
        const minX = this.centerX - this.boardRadius * 0.65;
        const maxX = this.centerX + this.boardRadius * 0.65;

        if (e.key === 'ArrowLeft') {
            this.state.striker.x = Math.max(minX, this.state.striker.x - step);
            this.state.strikerX = this.state.striker.x;
            this.updateStrikerSliderPosition();
        } else if (e.key === 'ArrowRight') {
            this.state.striker.x = Math.min(maxX, this.state.striker.x + step);
            this.state.strikerX = this.state.striker.x;
            this.updateStrikerSliderPosition();
        } else if (e.key === ' ' && !this.state.aiming) {
            this.state.aimAngle = this.state.activePlayer === 1 ? -Math.PI / 2 : Math.PI / 2;
            this.state.power = 50;
            this.shootStriker();
        }
    }

    shootStriker() {
        if (this.state.power < 5) {
            this.state.aiming = false;
            return;
        }

        // Broadcast if multiplayer
        if (this.active && this.state.activePlayer === 1 && window.parent && window.parent.isMultiplayer) {
            this.broadcastMove();
        }

        const force = this.state.power / 1.8;
        this.state.striker.vx = Math.cos(this.state.aimAngle) * force;
        this.state.striker.vy = Math.sin(this.state.aimAngle) * force;
        this.state.isMoving = true;
        this.state.aiming = false;
        this.state.power = 0;
        this.state.turnHasScore = false;
        this.state.turnHasFoul = false;
    }

    gameLoop() {
        this.draw();
        this.update();
        this.animationId = requestAnimationFrame(this.gameLoop);
    }

    update() {
        const subSteps = 4;
        if (this.state.isMoving) {
            for (let s = 0; s < subSteps; s++) {
                let stillMoving = false;
                const allObjs = [this.state.striker, ...this.state.coins];

                allObjs.forEach(obj => {
                    obj.x += obj.vx / subSteps;
                    obj.y += obj.vy / subSteps;
                    obj.vx *= Math.pow(this.FRICTION, 1 / subSteps);
                    obj.vy *= Math.pow(this.FRICTION, 1 / subSteps);

                    if (Math.abs(obj.vx) < 0.1) obj.vx = 0;
                    if (Math.abs(obj.vy) < 0.1) obj.vy = 0;
                    if (obj.vx !== 0 || obj.vy !== 0) stillMoving = true;

                    // Wall Collisions
                    const minX = this.centerX - this.boardRadius + obj.radius;
                    const maxX = this.centerX + this.boardRadius - obj.radius;
                    const minY = this.centerY - this.boardRadius + obj.radius;
                    const maxY = this.centerY + this.boardRadius - obj.radius;

                    if (obj.x < minX) { obj.x = minX; obj.vx *= -this.WALL_BOUNCINESS; this.playHitSound(); }
                    if (obj.x > maxX) { obj.x = maxX; obj.vx *= -this.WALL_BOUNCINESS; this.playHitSound(); }
                    if (obj.y < minY) { obj.y = minY; obj.vy *= -this.WALL_BOUNCINESS; this.playHitSound(); }
                    if (obj.y > maxY) { obj.y = maxY; obj.vy *= -this.WALL_BOUNCINESS; this.playHitSound(); }

                    // Pocket Detection
                    this.pockets.forEach(p => {
                        const px = this.centerX + p[0] * (this.boardRadius - 20);
                        const py = this.centerY + p[1] * (this.boardRadius - 20);
                        if (Math.hypot(obj.x - px, obj.y - py) < this.pocketRadius) this.handlePocket(obj);
                    });
                });

                // Collisions
                for (let i = 0; i < allObjs.length; i++) {
                    for (let j = i + 1; j < allObjs.length; j++) {
                        const o1 = allObjs[i];
                        const o2 = allObjs[j];
                        const dx = o2.x - o1.x;
                        const dy = o2.y - o1.y;
                        const dist = Math.hypot(dx, dy);

                        if (dist < o1.radius + o2.radius) {
                            this.resolveCollision(o1, o2);
                            if (o1.type === 'striker' || o2.type === 'striker') this.state.hasHitCoin = true;
                            this.playHitSound();
                        }
                    }
                }

                if (!stillMoving && s === subSteps - 1) {
                    this.state.isMoving = false;
                    setTimeout(() => this.endTurn(), 100);
                }
            }
        }
    }

    resolveCollision(o1, o2) {
        const dx = o2.x - o1.x;
        const dy = o2.y - o1.y;
        const dist = Math.hypot(dx, dy);
        const nx = dx / dist;
        const ny = dy / dist;

        const vrelx = o1.vx - o2.vx;
        const vrely = o1.vy - o2.vy;
        const vrelDotN = vrelx * nx + vrely * ny;

        if (vrelDotN < 0) return;

        const impulse = (1 + this.COIN_BOUNCINESS) * vrelDotN / 2;
        o1.vx -= impulse * nx;
        o1.vy -= impulse * ny;
        o2.vx += impulse * nx;
        o2.vy += impulse * ny;

        const overlap = (o1.radius + o2.radius - dist) / 2;
        o1.x -= overlap * nx;
        o1.y -= overlap * ny;
        o2.x += overlap * nx;
        o2.y += overlap * ny;
    }

    handlePocket(obj) {
        this.playHitSound('pocket');
        if (obj.type === 'striker') {
            this.state.scores[this.state.activePlayer] -= 10;
            this.state.turnHasFoul = true;
            obj.vx = 0; obj.vy = 0;
            obj.x = this.centerX;
            // CORRECTED Y ALIGNMENT (0.72)
            obj.y = (this.state.activePlayer === 1 ? this.centerY + this.boardRadius * 0.72 : this.centerY - this.boardRadius * 0.72);
        } else {
            this.state.coins = this.state.coins.filter(c => c !== obj);

            if (obj.type === 'queen') {
                this.state.pendingQueen = true;
                this.state.scores[this.state.activePlayer] += 50;
                this.state.turnHasScore = true;
            } else {
                const playerColor = this.state.activePlayer === 1 ? 'white' : 'black';
                if (obj.type === playerColor) {
                    this.state.scores[this.state.activePlayer] += 10;
                    this.state.turnHasScore = true;
                    if (this.state.pendingQueen) {
                        this.state.queenCapturedBy = this.state.activePlayer;
                        this.state.pendingQueen = false;
                    }
                } else {
                    this.state.scores[this.state.activePlayer === 1 ? 2 : 1] += 10;
                }
            }
            this.updateHUD();
        }
    }

    endTurn() {
        if (this.state.pendingQueen) {
            this.state.coins.push({
                x: this.centerX, y: this.centerY, vx: 0, vy: 0, radius: this.coinRadius, color: "#ef4444", type: 'queen'
            });
            this.state.scores[this.state.activePlayer] -= 50;
            this.state.pendingQueen = false;
        }

        if (!this.state.hasHitCoin && !this.state.turnHasFoul) {
            this.state.scores[this.state.activePlayer] -= 5;
            this.state.turnHasFoul = true;
            this.playHitSound('foul');
        }

        const turnSwitched = (!this.state.turnHasScore || this.state.turnHasFoul);
        if (turnSwitched) {
            this.state.activePlayer = this.state.activePlayer === 1 ? 2 : 1;
        }

        // Always reset striker Y to the active player's baseline
        this.state.striker.y = (this.state.activePlayer === 1 ? this.centerY + this.boardRadius * 0.72 : this.centerY - this.boardRadius * 0.72);

        this.state.isMoving = false;
        this.state.hasHitCoin = false;
        this.state.turnHasScore = false;
        this.state.turnHasFoul = false;
        this.state.striker.vx = 0;
        this.state.striker.vy = 0;
        this.state.striker.x = this.state.strikerX;
        this.updateStrikerSliderPosition();

        this.updateHUD();
        this.checkGameOver();

        if (this.state.activePlayer === 2 && !(window.parent && window.parent.isMultiplayer)) {
            setTimeout(() => this.aiTurn(), 1000);
        }
    }

    aiTurn() {
        console.log("AI Turn: Start", this.state.activePlayer, this.state.isMoving);
        if (this.state.isMoving || this.state.activePlayer !== 2) return;

        const myColor = 'black';
        const myCoins = this.state.coins.filter(c => c.type === myColor || c.type === 'queen');
        console.log("AI Coins:", myCoins.length);

        if (myCoins.length === 0) {
            // Pass turn if no coins? Or keep shooting?
            // Just shoot at random if no coins (shouldn't happen if game not over)
            // But if only Queen left?
        }

        // Fallback target if no myCoins (unlikely unless game over)
        const target = myCoins.length > 0 ? myCoins[Math.floor(Math.random() * myCoins.length)] : { x: this.centerX, y: this.centerY, radius: 10 };

        const pocketIdx = Math.floor(Math.random() * 4);
        const px = this.centerX + this.pockets[pocketIdx][0] * (this.boardRadius - 20);
        const py = this.centerY + this.pockets[pocketIdx][1] * (this.boardRadius - 20);

        const angleToPocket = Math.atan2(py - target.y, px - target.x);
        const backOff = target.radius + this.state.striker.radius;
        const hitX = target.x - Math.cos(angleToPocket) * backOff;
        const hitY = target.y - Math.sin(angleToPocket) * backOff;

        // Position striker
        const minX = this.centerX - this.boardRadius * 0.65;
        const maxX = this.centerX + this.boardRadius * 0.65;
        this.state.striker.x = Math.max(minX, Math.min(maxX, hitX));
        this.state.strikerX = this.state.striker.x; // Ensure visual update

        setTimeout(() => {
            const dx = hitX - this.state.striker.x;
            const dy = hitY - this.state.striker.y;
            this.state.aimAngle = Math.atan2(dy, dx);
            this.state.power = 60 + Math.random() * 30; // Random power
            console.log("AI Shooting...", this.state.power);
            this.shootStriker();
        }, 500);
    }

    checkGameOver() {
        // ... (Simple check, can remain same as in monolithic)
    }

    // --- Audio System (Web Audio API) ---
    initAudio() {
        if (!this.audioCtx) {
            this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }
    }

    createNoiseBuffer() {
        const bufferSize = this.audioCtx.sampleRate * 0.1;
        const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        return buffer;
    }

    playHitSound(type = 'hit', volume = 1) {
        try {
            this.initAudio();
            const ctx = this.audioCtx;
            if (!ctx) return;

            const gain = ctx.createGain();
            gain.connect(ctx.destination);

            if (type === 'hit') {
                const osc = ctx.createOscillator();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(800 + Math.random() * 400, ctx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.05);
                gain.gain.setValueAtTime(volume * 0.6, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
                osc.connect(gain);
                osc.start();
                osc.stop(ctx.currentTime + 0.05);

                const noise = ctx.createBufferSource();
                noise.buffer = this.createNoiseBuffer();
                const noiseGain = ctx.createGain();
                noiseGain.gain.setValueAtTime(volume * 0.4, ctx.currentTime);
                noiseGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.02);
                noise.connect(noiseGain);
                noiseGain.connect(ctx.destination);
                noise.start();
            } else if (type === 'pocket') {
                const osc = ctx.createOscillator();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(200, ctx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.3);
                gain.gain.setValueAtTime(0.8, ctx.currentTime);
                gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
                osc.connect(gain);
                osc.start();
                osc.stop(ctx.currentTime + 0.3);
            } else if (type === 'wall') {
                const osc = ctx.createOscillator();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(150, ctx.currentTime);
                gain.gain.setValueAtTime(volume * 0.5, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
                osc.connect(gain);
                osc.start();
                osc.stop(ctx.currentTime + 0.1);
            }
        } catch (e) {
            console.error("Audio error:", e);
        }
    }

    draw() {
        const ctx = this.ctx;
        const canvas = this.canvas;
        const centerX = this.centerX;
        const centerY = this.centerY;
        const boardRadius = this.boardRadius;

        // Background
        const bgGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, canvas.width);
        bgGrad.addColorStop(0, "#7f1d1d");
        bgGrad.addColorStop(1, "#310a0a");
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Frame
        const outerFrame = boardRadius + 40;
        ctx.fillStyle = "#1e1e1e";
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(centerX - outerFrame, centerY - outerFrame, outerFrame * 2, outerFrame * 2, 50);
        else ctx.rect(centerX - outerFrame, centerY - outerFrame, outerFrame * 2, outerFrame * 2);
        ctx.fill();

        // Board
        const fSize = boardRadius + 30;
        ctx.fillStyle = "#8b4513";
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(-fSize + centerX, -fSize + centerY, fSize * 2, fSize * 2, 45); // Adjust coords if translating
        else ctx.rect(-fSize + centerX, -fSize + centerY, fSize * 2, fSize * 2);
        ctx.fill();

        ctx.fillStyle = "#dcb084";
        ctx.beginPath();
        ctx.fillRect(centerX - boardRadius, centerY - boardRadius, boardRadius * 2, boardRadius * 2);

        // Pockets
        ctx.fillStyle = "#111";
        this.pockets.forEach(p => {
            ctx.beginPath();
            ctx.arc(centerX + p[0] * (boardRadius - 20), centerY + p[1] * (boardRadius - 20), this.pocketRadius, 0, Math.PI * 2);
            ctx.fill();
        });

        // Baselines
        ctx.save();
        ctx.translate(centerX, centerY);
        const lineColor = "#57534e";
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = 1.5;

        // Center circles
        ctx.beginPath(); ctx.arc(0, 0, this.coinRadius * 5.2, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(0, 0, this.coinRadius * 3.5, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = "#dc2626"; ctx.beginPath(); ctx.arc(0, 0, this.coinRadius * 0.8, 0, Math.PI * 2); ctx.fill();

        const bDist = boardRadius * 0.72;
        const bLen = boardRadius * 0.55;

        for (let i = 0; i < 4; i++) {
            ctx.save();
            ctx.rotate(i * Math.PI / 2);
            ctx.beginPath(); ctx.moveTo(-bLen, -bDist); ctx.lineTo(bLen, -bDist); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(-bLen, -bDist + 15); ctx.lineTo(bLen, -bDist + 15); ctx.stroke();

            ctx.fillStyle = "#f97316";
            ctx.beginPath(); ctx.arc(-bLen, -bDist + 7.5, 12, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            ctx.beginPath(); ctx.arc(bLen, -bDist + 7.5, 12, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            ctx.restore();
        }
        ctx.restore();

        // Coins & Striker
        [...this.state.coins, this.state.striker].forEach(obj => {
            if (!obj) return;
            ctx.save();
            ctx.translate(obj.x, obj.y);
            ctx.beginPath();
            ctx.arc(0, 0, obj.radius, 0, Math.PI * 2);
            ctx.fillStyle = obj.color;
            ctx.fill();

            // Details
            if (obj.type === 'striker') {
                ctx.fillStyle = "#155e75";
                ctx.beginPath(); ctx.arc(0, 0, obj.radius * 0.5, 0, Math.PI * 2); ctx.fill();
                if (this.state.aiming) {
                    const arrowLen = this.state.power * 4 + 50;
                    ctx.rotate(this.state.aimAngle);
                    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
                    ctx.fillRect(0, -2, arrowLen, 4);
                }
            } else {
                ctx.strokeStyle = "rgba(0,0,0,0.2)";
                ctx.beginPath(); ctx.arc(0, 0, obj.radius * 0.7, 0, Math.PI * 2); ctx.stroke();
            }
            ctx.restore();
        });
    }
}
