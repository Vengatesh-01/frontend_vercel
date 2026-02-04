
// Carrom Game Module
// Encapsulates all logic for the Carrom board game

const CarromGame = (function () {
    // --- Constants ---
    const CONFIG = {
        // Colors & Textures
        BOARD_COLOR_LIGHT: '#f3e5ab', // Beige wood
        BOARD_COLOR_DARK: '#e6cc8b',  // Slightly darker wood grain
        FRAME_COLOR_MAIN: '#3e2723',  // Dark Mahogany
        FRAME_COLOR_HIGHLIGHT: '#5d4037',
        FRAME_COLOR_SHADOW: '#281815',
        POCKET_COLOR: '#1a1a1a',

        // Physics
        FRICTION: 0.985, // Reduced friction for faster movement
        WALL_BOUNCE: 0.75, // More energetic bounces
        COIN_BOUNCE: 0.8,

        // Dimensions
        POCKET_RADIUS_RATIO: 0.065, // Standard size
        COIN_RADIUS_RATIO: 0.038,
        STRIKER_RADIUS_RATIO: 0.055,
        BASELINE_OFFSET: 0.76,
    };

    // --- Audio System (Web Audio API) ---
    const AudioEngine = (function () {
        let audioCtx = null;

        function initContext() {
            if (!audioCtx) {
                audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            }
            if (audioCtx.state === 'suspended') {
                audioCtx.resume();
            }
        }

        function createNoiseBuffer() {
            const bufferSize = audioCtx.sampleRate * 0.1;
            const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }
            return buffer;
        }

        function playClack(volume = 1) {
            initContext();
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(800 + Math.random() * 400, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.05);

            gain.gain.setValueAtTime(volume * 0.2, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.05);

            osc.connect(gain);
            gain.connect(audioCtx.destination);

            osc.start();
            osc.stop(audioCtx.currentTime + 0.05);

            // Add a short noise burst for the impact
            const noise = audioCtx.createBufferSource();
            noise.buffer = createNoiseBuffer();
            const noiseGain = audioCtx.createGain();
            noiseGain.gain.setValueAtTime(volume * 0.1, audioCtx.currentTime);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.02);
            noise.connect(noiseGain);
            noiseGain.connect(audioCtx.destination);
            noise.start();
        }

        function playPocket() {
            initContext();
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(200, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.3);

            gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
            gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.3);

            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.3);
        }

        function playWall(volume = 1) {
            initContext();
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(150, audioCtx.currentTime);

            gain.gain.setValueAtTime(volume * 0.15, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);

            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.1);
        }

        return {
            clack: playClack,
            pocket: playPocket,
            wall: playWall
        };
    })();

    // --- State ---
    let state = {
        canvas: null,
        ctx: null,
        active: false,
        width: 0,
        height: 0,
        scale: 1,
        centerX: 0,
        centerY: 0,
        boardRadius: 0,

        // Game Objects
        coins: [],
        striker: null,
        pockets: [],

        // Game Status
        currentPlayer: 1, // 1: Human, 2: AI
        scores: { 1: 0, 2: 0 },
        isMoving: false,
        isAiming: false,
        turnPhase: 'place', // 'place' | 'aim' | 'shoot' | 'watch'

        // Turn Specifics
        turnHasScore: false,
        turnHasFoul: false,
        queenPending: false,
        queenCapturer: null,
        coinsPottedThisTurn: [],

        // Input
        dragStart: { x: 0, y: 0 },
        power: 0,
        aimAngle: -Math.PI / 2,

        // AI
        aiThinking: false,
        aiShotTimer: 0,
        aiShotDelay: 300, // Reduced from 1500 for faster play

        // Performance
        lastTime: 0,
        accumulator: 0
    };

    // --- Helper for Touch ---
    function getTouchPos(e) {
        const touch = e.touches[0] || e.changedTouches[0];
        return {
            clientX: touch.clientX,
            clientY: touch.clientY,
            buttons: 1 // Simulate left mouse button
        };
    }

    // --- API Public Methods ---

    function init(canvasElement) {
        state.canvas = canvasElement;
        state.ctx = canvasElement.getContext('2d');
        resize();
        resetGame();

        // Input Listeners
        state.canvas.addEventListener('mousedown', handleInputStart);
        state.canvas.addEventListener('mousemove', handleInputMove);
        window.addEventListener('mouseup', handleInputEnd);

        // Touch Listeners
        state.canvas.addEventListener('touchstart', (e) => { e.preventDefault(); handleInputStart(getTouchPos(e)); }, { passive: false });
        state.canvas.addEventListener('touchmove', (e) => { e.preventDefault(); handleInputMove(getTouchPos(e)); }, { passive: false });
        window.addEventListener('touchend', handleInputEnd);

        // Check for AI turn on start if needed
        // Start Loop
        state.active = true;
        state.lastTime = performance.now();
        requestAnimationFrame(loop);
    }

    function setupSlider(knob, container) {
        let isDragging = false;

        knob.addEventListener('mousedown', (e) => {
            isDragging = true;
            e.stopPropagation(); // Prevent canvas click
        });

        window.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const rect = container.getBoundingClientRect();
            let x = e.clientX - rect.left;
            x = Math.max(0, Math.min(x, rect.width));

            // Visual Update
            knob.style.left = `${x}px`;
            knob.style.transform = `translate(-50%, -50%)`;

            // Logic Update
            if (state.striker && state.turnPhase === 'place') {
                const percent = x / rect.width;
                const boardWidth = state.boardRadius * 2 * 0.72; // Baseline width roughly
                const minX = state.centerX - (boardWidth / 2);
                const maxX = state.centerX + (boardWidth / 2);
                state.striker.x = minX + (maxX - minX) * percent;
            }
        });

        window.addEventListener('mouseup', () => {
            isDragging = false;
        });
    }

    function stop() {
        state.active = false;
        if (state.canvas) {
            state.canvas.removeEventListener('mousedown', handleInputStart);
            state.canvas.removeEventListener('mousemove', handleInputMove);
            window.removeEventListener('mouseup', handleInputEnd);
            state.canvas.removeEventListener('touchstart', handleInputStart);
            state.canvas.removeEventListener('touchmove', handleInputMove);
            window.removeEventListener('touchend', handleInputEnd);
        }
        const ui = document.getElementById('carrom-ui-layer');
        if (ui) ui.style.display = 'none';
    }

    function resize() {
        if (!state.canvas) return;
        state.width = state.canvas.width;
        state.height = state.canvas.height;
        state.centerX = state.width / 2;
        state.centerY = state.height / 2;

        // Calculate board size based on smallest dimension
        const minDim = Math.min(state.width, state.height);
        state.boardRadius = minDim * 0.45;
        state.scale = minDim / 1000; // Normalization scale

        definePockets();
    }

    // --- Core Logic ---

    function resetGame() {
        state.scores = { 1: 0, 2: 0 };
        state.currentPlayer = 1;
        state.queenPending = false;
        setupBoard();
        resetTurn();
    }

    function setupBoard() {
        const r = state.boardRadius * CONFIG.COIN_RADIUS_RATIO;
        state.coins = [];

        // Queen
        state.coins.push(createCoin(0, 0, 'queen', '#ef4444'));

        // Inner Circle (6 coins)
        for (let i = 0; i < 6; i++) {
            const angle = (i * 60) * Math.PI / 180;
            const d = r * 2.1;
            const type = i % 2 === 0 ? 'white' : 'black';
            const color = type === 'white' ? '#fff' : '#111';
            state.coins.push(createCoin(Math.cos(angle) * d, Math.sin(angle) * d, type, color));
        }

        // Outer Circle (12 coins)
        for (let i = 0; i < 12; i++) {
            const angle = (i * 30 + 15) * Math.PI / 180;
            const d = r * 3.8;
            // Pattern: W, W, B, W, B, B... adjusted for standard arrangement
            // Standard: Align with inner circle gaps
            // Alternating W/B is standard enough for casual play
            const type = i % 2 === 0 ? 'white' : 'black';
            const color = type === 'white' ? '#fff' : '#111';
            state.coins.push(createCoin(Math.cos(angle) * d, Math.sin(angle) * d, type, color));
        }

        resetStriker();
    }

    function createCoin(x, y, type, color) {
        return {
            x: state.centerX + x,
            y: state.centerY + y,
            vx: 0, vy: 0,
            radius: state.boardRadius * CONFIG.COIN_RADIUS_RATIO,
            type: type, // 'white', 'black', 'queen'
            color: color,
            mass: 1
        };
    }

    function resetStriker() {
        const r = state.boardRadius * CONFIG.STRIKER_RADIUS_RATIO;
        const baselineY = state.boardRadius * CONFIG.BASELINE_OFFSET;

        // Allow AI to position on top, Human on bottom
        const yPos = state.currentPlayer === 1 ? state.centerY + baselineY : state.centerY - baselineY;

        state.striker = {
            x: state.centerX,
            y: yPos,
            vx: 0, vy: 0,
            radius: r,
            color: '#fbbf24', // Gold
            mass: 2,
            isStriker: true
        };
        state.aimAngle = state.currentPlayer === 1 ? -Math.PI / 2 : Math.PI / 2;
        state.turnPhase = 'place';
        console.log('Striker reset for player', state.currentPlayer, 'at y:', yPos.toFixed(1));
    }

    function definePockets() {
        const d = state.boardRadius * 0.94; // Pockets slightly inset
        state.pockets = [
            { x: state.centerX - d, y: state.centerY - d },
            { x: state.centerX + d, y: state.centerY - d },
            { x: state.centerX - d, y: state.centerY + d },
            { x: state.centerX + d, y: state.centerY + d }
        ];
    }

    // --- Game Loop ---

    function loop(now) {
        if (!state.active) return;

        const dt = Math.min(now - state.lastTime, 100); // Cap DT to prevent spiral of death
        state.lastTime = now;

        update(dt);
        render();

        requestAnimationFrame(loop);
    }

    function update(dt) {
        if (state.isMoving) {
            // Physics Sub-stepping (8 detailed calculations per frame)
            const SUB_STEPS = 8;
            const subDt = dt / SUB_STEPS;

            for (let i = 0; i < SUB_STEPS; i++) {
                updatePhysics(subDt);
                if (!state.isMoving) break; // Optimization if settled
            }
        } else if (state.currentPlayer === 2 && !state.aiThinking && state.turnPhase === 'place') {
            // Start AI Turn Logic with Delay
            state.aiThinking = true;
            state.aiShotTimer = performance.now();
        } else if (state.currentPlayer === 2 && state.aiThinking && state.turnPhase === 'place') {
            if (performance.now() - state.aiShotTimer > state.aiShotDelay) {
                aiStartTurn();
            }
        }
    }

    function updatePhysics(dt) {
        let movingCount = 0;
        const allObjects = [...state.coins];
        if (state.striker) allObjects.push(state.striker);

        // Physics Constants mapping for DT
        const timeScale = dt / 16.67; // Normalize to 60FPS
        const friction = Math.pow(CONFIG.FRICTION, timeScale);

        // 1. Movement & Friction
        allObjects.forEach(obj => {
            if (obj.vx === 0 && obj.vy === 0) return;

            obj.x += obj.vx * timeScale;
            obj.y += obj.vy * timeScale;
            obj.vx *= friction;
            obj.vy *= friction;

            // Aggressive settling
            if (Math.abs(obj.vx) < 0.1) obj.vx = 0;
            if (Math.abs(obj.vy) < 0.1) obj.vy = 0;

            if (obj.vx !== 0 || obj.vy !== 0) movingCount++;
        });

        // 2. Wall Collisions
        const bounds = state.boardRadius * 0.95;
        const left = state.centerX - bounds;
        const right = state.centerX + bounds;
        const top = state.centerY - bounds;
        const bottom = state.centerY + bounds;

        allObjects.forEach(obj => {
            if (obj.x - obj.radius < left) {
                obj.x = left + obj.radius;
                obj.vx = -obj.vx * CONFIG.WALL_BOUNCE;
            } else if (obj.x + obj.radius > right) {
                obj.x = right - obj.radius;
                obj.vx = -obj.vx * CONFIG.WALL_BOUNCE;
            }

            if (obj.y - obj.radius < top) {
                obj.y = top + obj.radius;
                obj.vy = -obj.vy * CONFIG.WALL_BOUNCE;
            } else if (obj.y + obj.radius > bottom) {
                obj.y = bottom - obj.radius;
                obj.vy = -obj.vy * CONFIG.WALL_BOUNCE;
            }

            // Play wall sound if significant impact
            if (Math.abs(obj.vx) > 0.5 || Math.abs(obj.vy) > 0.5) {
                const speed = Math.hypot(obj.vx, obj.vy);
                if (speed > 1) AudioEngine.wall(Math.min(speed / 10, 1));
            }
        });

        // 3. Object Collisions (Circle-Circle)
        for (let i = 0; i < allObjects.length; i++) {
            for (let j = i + 1; j < allObjects.length; j++) {
                resolveCollision(allObjects[i], allObjects[j]);
            }
        }

        // 4. Pocket Detection
        const pocketR = state.boardRadius * CONFIG.POCKET_RADIUS_RATIO;
        for (let i = state.coins.length - 1; i >= 0; i--) {
            if (checkPocket(state.coins[i], pocketR)) {
                handlePocketCoin(state.coins[i]);
                state.coins.splice(i, 1);
            }
        }

        if (state.striker && checkPocket(state.striker, pocketR)) {
            handlePocketStriker();
            state.striker = null; // Remove for now, will reset later
        }

        // 5. Check Moving State - Slightly more tolerant for faster turn switching
        const movingObjects = allObjects.filter(obj => Math.abs(obj.vx) > 0.05 || Math.abs(obj.vy) > 0.05);
        if (movingObjects.length === 0) {
            state.isMoving = false;
            // Immediate stop for all physics objects
            allObjects.forEach(obj => { obj.vx = 0; obj.vy = 0; });
            endTurn();
        }
    }

    function resolveCollision(b1, b2) {
        const dx = b2.x - b1.x;
        const dy = b2.y - b1.y;
        const dist = Math.hypot(dx, dy);

        if (dist < b1.radius + b2.radius) {
            const angle = Math.atan2(dy, dx);
            const sin = Math.sin(angle);
            const cos = Math.cos(angle);

            // Rotate velocity
            const v1 = { x: 0, y: 0 };
            const v2 = { x: 0, y: 0 };

            // Velocity in rotated frame
            const vx1 = b1.vx * cos + b1.vy * sin;
            const vy1 = b1.vy * cos - b1.vx * sin;
            const vx2 = b2.vx * cos + b2.vy * sin;
            const vy2 = b2.vy * cos - b2.vx * sin;

            // Elastic collision (1D)
            const v1Final = ((b1.mass - b2.mass) * vx1 + 2 * b2.mass * vx2) / (b1.mass + b2.mass);
            const v2Final = ((b2.mass - b1.mass) * vx2 + 2 * b1.mass * vx1) / (b1.mass + b2.mass);

            // Rotate back
            b1.vx = v1Final * cos - vy1 * sin;
            b1.vy = v1Final * sin + vy1 * cos;
            b2.vx = v2Final * cos - vy2 * sin;
            b2.vy = v2Final * sin + vy2 * cos;

            // Separate circles to avoid overlap
            const overlap = (b1.radius + b2.radius - dist) / 2;
            b1.x -= overlap * Math.cos(angle);
            b1.y -= overlap * Math.sin(angle);
            b2.x += overlap * Math.cos(angle);
            b2.y += overlap * Math.sin(angle);

            // Energy loss
            b1.vx *= CONFIG.COIN_BOUNCE;
            b1.vy *= CONFIG.COIN_BOUNCE;
            b2.vx *= CONFIG.COIN_BOUNCE;
            b2.vy *= CONFIG.COIN_BOUNCE;

            // Play collision sound
            const totalSpeed = Math.hypot(b1.vx - b2.vx, b1.vy - b2.vy);
            if (totalSpeed > 0.5) {
                AudioEngine.clack(Math.min(totalSpeed / 12, 1));
            }
        }
    }

    function checkPocket(obj, pocketRadius) {
        for (let p of state.pockets) {
            if (Math.hypot(obj.x - p.x, obj.y - p.y) < pocketRadius) {
                return true;
            }
        }
        return false;
    }

    // --- Rules & Scoring ---

    function handlePocketCoin(coin) {
        AudioEngine.pocket();
        state.coinsPottedThisTurn.push(coin);
        const isPlayerWhite = state.currentPlayer === 1;
        const targetColor = isPlayerWhite ? 'white' : 'black';

        if (coin.type === targetColor) {
            state.scores[state.currentPlayer] += 10;
            state.turnHasScore = true;

            // Check Queen Cover
            if (state.queenPending && state.queenCapturer === state.currentPlayer) {
                state.scores[state.currentPlayer] += 50; // Queen Bonus
                state.queenPending = false;
                state.queenCapturer = null;
                playAnnounce("Queen Covered!");
            }
        } else if (coin.type === 'queen') {
            state.queenPending = true;
            state.queenCapturer = state.currentPlayer;
            state.turnHasScore = true; // Technically a score event, but needs cover
        } else {
            // Potted Opponent Coin
            state.scores[state.currentPlayer === 1 ? 2 : 1] += 10;
            state.turnHasScore = true; // Still counts as a successful shot generally, but maybe lose turn?
            // Standard rules: potting opponent coin -> lose turn? Or just points given? 
            // Simplified: Points given, turn ends unless own coin also potted.
        }
    }

    function handlePocketStriker() {
        AudioEngine.pocket();
        state.turnHasFoul = true;
        state.scores[state.currentPlayer] -= 10;
        // Return coin if one was potted? Or just penalty?
        // Standard: Penalty + return one of own coins if available.
        // Simplified: Just penalty.
    }

    function endTurn() {
        // Queen Logic: Return if not covered
        if (state.queenPending && !state.turnHasScore) {
            // If queen was potted previously but not covered this turn? 
            // Logic: Queen potted -> marks pending. Next shot MUST pot own coin.
            // If this turn potted queen but NO own coin -> check next turn?
            // Actually: Queen must be covered in SAME or NEXT turn depending on rule variation.
            // Let's implement strict same-turn cover for simplicity or "Queen returns if turn ends without cover"

            // If turn ends and Queen is still pending (and not covered this specific turn logic)
            // We need to check if Queen was potted THIS turn.
            const queenInPot = state.coinsPottedThisTurn.find(c => c.type === 'queen');

            if (queenInPot) {
                // Queen just potted. If NO own coin potted, return it.
                const ownCoin = state.coinsPottedThisTurn.find(c => c.type === (state.currentPlayer === 1 ? 'white' : 'black'));
                if (!ownCoin) {
                    // Failed to cover
                    returnQueen();
                    state.turnHasScore = false; // Negate the queen "score"
                } else {
                    // Covered immediately
                    state.scores[state.currentPlayer] += 50;
                    state.queenPending = false;
                }
            } else if (state.queenPending) {
                // Queen was pending from PREVIOUS turn? (Not supported in this simple flow, usually strict)
            }
        }

        // Switch Turn Logic
        if (state.turnHasFoul || !state.turnHasScore) {
            state.currentPlayer = state.currentPlayer === 1 ? 2 : 1;
        }

        state.coinsPottedThisTurn = [];
        state.turnHasScore = false;
        state.turnHasFoul = false;

        // Check Win
        checkWinCondition();

        if (!state.active) return; // Game Over

        resetStriker();
        console.log('Turn ended. New player:', state.currentPlayer, 'Phase:', state.turnPhase);
        requestAnimationFrame(() => updateHUD()); // Trigger UI update via external if needed
    }

    function returnQueen() {
        state.coins.push(createCoin(0, 0, 'queen', '#ef4444'));
        state.queenPending = false;
        state.queenCapturer = null;
    }

    function checkWinCondition() {
        const whiteCoins = state.coins.filter(c => c.type === 'white').length;
        const blackCoins = state.coins.filter(c => c.type === 'black').length;
        const queenOnBoard = state.coins.find(c => c.type === 'queen');

        let winner = null;
        if (whiteCoins === 0 && (queenOnBoard === undefined || !state.queenPending)) winner = 1;
        if (blackCoins === 0 && (queenOnBoard === undefined || !state.queenPending)) winner = 2; // AI

        if (winner) {
            alert(`Player ${winner === 1 ? 'Human' : 'AI'} Wins! Score: ${state.scores[winner]}`);
            resetGame();
        }
    }

    // --- AI Logic ---

    function aiStartTurn() {
        if (!state.active || state.currentPlayer !== 2) return;

        const targetColor = 'black';
        const myCoins = state.coins.filter(c => c.type === targetColor);
        const queen = state.coins.find(c => c.type === 'queen');

        let possibleShots = [];
        let targets = [...myCoins];
        if (queen && !state.queenPending) targets.push(queen);

        const strikerY = state.striker.y;
        const baselineBounds = state.boardRadius * 0.65;
        const baselineMin = state.centerX - baselineBounds;
        const baselineMax = state.centerX + baselineBounds;

        // Iterate all targets and all 4 pockets
        targets.forEach(coin => {
            state.pockets.forEach(pocket => {
                // 1. Direct Shot Calculation
                const angleToPocket = Math.atan2(pocket.y - coin.y, pocket.x - coin.x);
                const hitDist = (state.striker.radius + coin.radius);
                const idealX = coin.x - Math.cos(angleToPocket) * hitDist;
                const idealY = coin.y - Math.sin(angleToPocket) * hitDist;

                const dx = idealX - coin.x;
                const dy = idealY - coin.y;

                // Solve for striker position on baseline
                let strikerX = idealX + (strikerY - idealY) * (dx / dy);

                if (strikerX >= baselineMin && strikerX <= baselineMax) {
                    // Check if path is clear (no other coins blocking striker -> target)
                    const isBlocked = checkPathBlocked(strikerX, strikerY, idealX, idealY, coin);

                    if (!isBlocked) {
                        const distToCoin = Math.hypot(strikerX - coin.x, strikerY - coin.y);
                        const distToPocket = Math.hypot(coin.x - pocket.x, coin.y - pocket.y);

                        let score = 1000 - distToPocket - (distToCoin * 0.1);
                        if (coin.type === 'queen') score += 500;
                        if (coin.type === targetColor) score += 100;

                        possibleShots.push({
                            x: strikerX,
                            angle: Math.atan2(coin.y - strikerY, coin.x - strikerX),
                            power: 30 + (distToCoin + distToPocket) / 5,
                            score,
                            type: 'direct'
                        });
                    }
                }
            });
        });

        if (possibleShots.length > 0) {
            possibleShots.sort((a, b) => b.score - a.score);
            const best = possibleShots[0];

            // "Human-like" movement: Snap striker but add a bit of randomness to accuracy
            state.striker.x = best.x;
            const error = (Math.random() - 0.5) * 0.02; // Small accuracy error
            state.aimAngle = best.angle + error;
            state.power = Math.min(best.power * 1.3, 100);
        } else {
            // Break shot if start of game or no good shots
            state.striker.x = state.centerX + (Math.random() - 0.5) * baselineBounds;
            state.aimAngle = state.currentPlayer === 1 ? -Math.PI / 2 : Math.PI / 2;
            state.power = 70;
        }

        executeShot();
        state.aiThinking = false;
    }

    function checkPathBlocked(x1, y1, x2, y2, targetCoin) {
        const dist = Math.hypot(x2 - x1, y2 - y1);
        const dir = { x: (x2 - x1) / dist, y: (y2 - y1) / dist };

        for (let c of state.coins) {
            if (c === targetCoin) continue;
            // Distance from point to line segment
            const fx = c.x - x1;
            const fy = c.y - y1;
            const t = fx * dir.x + fy * dir.y;

            if (t > 0 && t < dist) {
                const px = x1 + dir.x * t;
                const py = y1 + dir.y * t;
                const d = Math.hypot(c.x - px, c.y - py);
                if (d < c.radius + state.striker.radius) return true;
            }
        }
        return false;
    }

    function getNearestPocket(coin) {
        return state.pockets.slice().sort((a, b) =>
            Math.hypot(a.x - coin.x, a.y - coin.y) - Math.hypot(b.x - coin.x, b.y - coin.y)
        )[0];
    }

    function getNearestPocketDist(coin) {
        const p = getNearestPocket(coin);
        return Math.hypot(p.x - coin.x, p.y - coin.y);
    }

    // --- Input Handling ---

    function handleInputStart(e) {
        if (state.currentPlayer !== 1 || state.isMoving) return;

        const rect = state.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Check if clicking striker
        const dist = Math.hypot(x - state.striker.x, y - state.striker.y);

        if (state.turnPhase === 'place' && dist < state.striker.radius * 2) {
            state.turnPhase = 'aim';
            state.dragStart = { x, y };
        }
    }

    function handleInputMove(e) {
        if (state.currentPlayer !== 1 || state.isMoving) return;

        const rect = state.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (state.turnPhase === 'aim' && e.buttons === 1) {
            // Dragging to aim/power
            const dx = state.dragStart.x - x;
            const dy = state.dragStart.y - y;
            const pullDist = Math.hypot(dx, dy);

            state.aimAngle = Math.atan2(dy, dx); // Pull back to shoot forward? Or point? 
            // Better UX: Drag back like a slingshot
            state.aimAngle = Math.atan2(state.striker.y - y, state.striker.x - x);

            state.power = Math.min(pullDist / 2, 100);
            state.isAiming = true;
        } else if (state.turnPhase === 'place' && e.buttons === 1) {
            // Dragging striker along baseline
            const bounds = state.boardRadius * 0.65;
            state.striker.x = Math.max(state.centerX - bounds, Math.min(state.centerX + bounds, x));

            // Force Y back to baseline in case of drift during placing
            const baselineY = state.boardRadius * CONFIG.BASELINE_OFFSET;
            state.striker.y = state.currentPlayer === 1 ? state.centerY + baselineY : state.centerY - baselineY;
        }
    }

    function handleInputEnd(e) {
        if (state.turnPhase === 'aim' && state.isAiming) {
            if (state.power > 5) {
                executeShot();
            } else {
                state.turnPhase = 'place'; // Cancel
                state.isAiming = false;
            }
        }
    }

    function executeShot() {
        if (!state.striker) return;
        const speed = state.power * 0.55; // Increased speed factor (0.4 -> 0.55)
        state.striker.vx = Math.cos(state.aimAngle) * speed;
        state.striker.vy = Math.sin(state.aimAngle) * speed;
        state.isMoving = true;
        state.isAiming = false;
        state.turnPhase = 'watch';
        state.power = 0;

        playHitSound();
    }

    // --- Rendering ---

    function render() {
        if (!state.ctx) return;
        const ctx = state.ctx;

        // Clear
        ctx.clearRect(0, 0, state.width, state.height);

        // Board Background
        ctx.fillStyle = CONFIG.BOARD_COLOR;
        ctx.fillRect(0, 0, state.width, state.height);

        // Board Surface (Wood)
        drawWoodSurface(ctx);

        // Markings
        drawMarkings(ctx);

        // Pockets
        state.pockets.forEach(p => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, state.boardRadius * CONFIG.POCKET_RADIUS_RATIO, 0, Math.PI * 2);
            ctx.fillStyle = '#000';
            ctx.fill();
        });

        // Coins
        state.coins.forEach(c => drawCoin(ctx, c));

        // Striker
        if (state.striker) {
            drawCoin(ctx, state.striker);

            // Aim Line (Human)
            if (state.currentPlayer === 1 && (state.turnPhase === 'aim' || state.turnPhase === 'place')) {
                drawAimGuide(ctx);
            }
        }

        // HUD
        drawHUD(ctx);
    }

    function drawWoodSurface(ctx) {
        // 1. Frame (Dark Wood with bevel)
        const frameSize = state.boardRadius * 1.25;
        const cornerRadius = 50;

        // Outer Frame Gradient
        const cx = state.centerX;
        const cy = state.centerY;

        ctx.save();

        // Main Frame Body
        ctx.fillStyle = CONFIG.FRAME_COLOR_MAIN;
        ctx.fillRect(0, 0, state.width, state.height);

        // 2. Playing Surface (Light Wood)
        const boardSize = state.boardRadius;

        // Inner shadow of the frame cast onto the board
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 30;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        // Board Background Pattern (High-Contrast Premium Wood)
        const woodPat = ctx.createRadialGradient(cx, cy, 0, cx, cy, boardSize * 1.5);
        woodPat.addColorStop(0, '#fde68a'); // Warm center
        woodPat.addColorStop(0.5, '#f59e0b'); // Rich honey wood
        woodPat.addColorStop(1, '#92400e');   // Dark burnt edges

        drawRoundedRect(ctx, cx - boardSize, cy - boardSize, boardSize * 2, boardSize * 2, 10, woodPat);
        ctx.shadowBlur = 0;

        // Refine Board Surface with procedural grain lines
        ctx.save();
        ctx.beginPath();
        drawRoundedRectPath(ctx, cx - boardSize, cy - boardSize, boardSize * 2, boardSize * 2, 10);
        ctx.clip();

        // Layered Grain for realism
        ctx.globalAlpha = 0.1;
        ctx.strokeStyle = "#451a03";
        for (let i = -state.width; i < state.width; i += 12) {
            ctx.lineWidth = 1 + Math.random() * 2;
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.bezierCurveTo(i + 50, state.height / 2, i - 50, state.height / 2, i + 20, state.height);
            ctx.stroke();
        }
        ctx.restore();

        // 3. Gold Accents on Frame Corners (The yellow pads)
        const dist = boardSize + 20;

        // Draw 4 Corner Bumpers
        [
            { x: cx - dist, y: cy - dist },
            { x: cx + dist, y: cy - dist },
            { x: cx - dist, y: cy + dist },
            { x: cx + dist, y: cy + dist }
        ].forEach(pos => {
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, 40, 0, Math.PI * 2);
            const grad = ctx.createRadialGradient(pos.x, pos.y, 10, pos.x, pos.y, 40);
            grad.addColorStop(0, '#fbbf24');
            grad.addColorStop(1, '#d97706');
            ctx.fillStyle = grad;
            ctx.fill();
            // inner screw?
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, 5, 0, Math.PI * 2);
            ctx.fill();
        });

        ctx.restore();
    }

    function drawRoundedRect(ctx, x, y, w, h, r, fill) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y - r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
        ctx.fillStyle = fill;
        ctx.fill();
    }

    function drawMarkings(ctx) {
        ctx.save();

        // 1. Center Pattern (Mandala)
        const centerR = state.boardRadius * 0.17;

        // Outer decorative ring
        ctx.beginPath();
        ctx.arc(state.centerX, state.centerY, centerR + 5, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(0,0,0,0.4)";
        ctx.lineWidth = 1;
        ctx.stroke();

        // Complex geometric pattern
        ctx.translate(state.centerX, state.centerY);
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
            ctx.rotate(Math.PI / 4);
            ctx.moveTo(0, 0);
            ctx.bezierCurveTo(centerR / 2, centerR / 2, centerR / 2, -centerR / 2, centerR, 0);
            ctx.bezierCurveTo(centerR / 2, -centerR / 2, centerR / 2, centerR / 2, 0, 0);
        }
        ctx.strokeStyle = "rgba(100, 50, 50, 0.15)";
        ctx.fillStyle = "rgba(100, 50, 50, 0.05)";
        ctx.lineWidth = 1.5;
        ctx.fill();
        ctx.stroke();

        // Highlight center dot
        ctx.beginPath();
        ctx.arc(0, 0, 10, 0, Math.PI * 2);
        ctx.fillStyle = "#ef4444";
        ctx.fill();
        ctx.restore();

        // 2. Baselines & Arrows
        const gap = state.boardRadius * CONFIG.BASELINE_OFFSET;
        const len = state.boardRadius * 0.68;

        const drawBaseline = (angle) => {
            ctx.save();
            ctx.translate(state.centerX, state.centerY);
            ctx.rotate(angle);

            // Double Line
            ctx.lineWidth = 1.5;
            ctx.strokeStyle = "#111"; // Black crisp lines

            ctx.beginPath();
            ctx.moveTo(-len, gap); ctx.lineTo(len, gap);
            ctx.moveTo(-len, gap * 0.92); ctx.lineTo(len, gap * 0.92);
            ctx.stroke();

            // End Circles (Red holes/filled circles with white borders)
            const circleR = 14;
            const drawEndCircle = (x, y) => {
                // Outer ring
                ctx.beginPath();
                ctx.arc(x, y, circleR, 0, Math.PI * 2);
                ctx.strokeStyle = "#333";
                ctx.fillStyle = "#fff";
                ctx.fill();
                ctx.stroke();

                // Inner red fill
                ctx.beginPath();
                ctx.arc(x, y, circleR * 0.7, 0, Math.PI * 2);
                ctx.fillStyle = "#dc2626";
                ctx.fill();

                // Shine
                ctx.beginPath();
                ctx.arc(x - 3, y - 3, 3, 0, Math.PI * 2);
                ctx.fillStyle = "rgba(255,255,255,0.6)";
                ctx.fill();
            };

            // Calculate precise end positions accounting for gap distance
            // Actually, the circles are usually AT the ends of the line segment
            drawEndCircle(-len, gap * 0.96);
            drawEndCircle(len, gap * 0.96);

            // Diagonal Arrows
            ctx.restore();

            // Draw diagonal arrows separately to handle coordinates easier
            ctx.save();
            ctx.translate(state.centerX, state.centerY);
            ctx.rotate(angle + Math.PI / 4); // Rotate to corner

            // Arrow pointing to pocket
            const arrowStart = state.boardRadius * 0.6;
            const arrowEnd = state.boardRadius * 0.85;

            ctx.beginPath();
            ctx.moveTo(arrowStart, 0);
            ctx.lineTo(arrowEnd, 0);
            ctx.strokeStyle = "#333";
            ctx.lineWidth = 2;
            ctx.stroke();

            // Arrow Head
            ctx.beginPath();
            ctx.moveTo(arrowEnd - 10, -5);
            ctx.lineTo(arrowEnd, 0);
            ctx.lineTo(arrowEnd - 10, 5);
            ctx.stroke();

            ctx.restore();
        };

        drawBaseline(0);
        drawBaseline(Math.PI / 2);
        drawBaseline(Math.PI);
        drawBaseline(-Math.PI / 2);
    }

    function drawCoin(ctx, c) {
        ctx.shadowColor = "rgba(0,0,0,0.4)";
        ctx.shadowBlur = 6;
        ctx.shadowOffsetX = 3;
        ctx.shadowOffsetY = 3;

        ctx.beginPath();
        ctx.arc(c.x, c.y, c.radius, 0, Math.PI * 2);

        // Base Color with Gradient for 3D look
        const grad = ctx.createRadialGradient(c.x - c.radius * 0.3, c.y - c.radius * 0.3, 0, c.x, c.y, c.radius);

        if (c.type === 'white') {
            grad.addColorStop(0, '#ffffff');
            grad.addColorStop(1, '#d1d5db'); // Light grey shading
        } else if (c.type === 'black') {
            grad.addColorStop(0, '#374151');
            grad.addColorStop(1, '#111827'); // Deep black
        } else if (c.type === 'queen') {
            grad.addColorStop(0, '#fca5a5');
            grad.addColorStop(1, '#b91c1c'); // Deep Red
        } else if (c.isStriker) {
            grad.addColorStop(0, '#fde68a'); // Light yellow
            grad.addColorStop(1, '#b45309'); // Amber/Brown
        }

        ctx.fillStyle = grad;
        ctx.fill();
        ctx.shadowBlur = 0; // Reset shadow for details
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        // Visual Ridge / Bevel
        ctx.strokeStyle = "rgba(0,0,0,0.2)";
        ctx.lineWidth = 1;
        ctx.stroke();

        // Inner Rings Pattern
        ctx.save();
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.radius * 0.7, 0, Math.PI * 2);
        ctx.strokeStyle = c.type === 'black' ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)";
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(c.x, c.y, c.radius * 0.4, 0, Math.PI * 2);
        ctx.stroke();

        // Center dot
        ctx.beginPath();
        ctx.arc(c.x, c.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = c.type === 'black' ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)";
        ctx.fill();

        // Striker Special Detail
        if (c.isStriker) {
            ctx.beginPath();
            ctx.arc(c.x, c.y, c.radius * 0.8, 0, Math.PI * 2);
            ctx.strokeStyle = "#fff";
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        ctx.restore();

        // Specular Highlight
        ctx.beginPath();
        ctx.arc(c.x - c.radius * 0.35, c.y - c.radius * 0.35, c.radius * 0.15, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.4)";
        ctx.fill();

        // 3. Realistic Glow/Highlight (Targeted or Selected)
        if (c.targetHighlighted || (c.isStriker && state.turnPhase !== 'watch')) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(c.x, c.y, c.radius + 3, 0, Math.PI * 2);
            ctx.strokeStyle = c.isStriker ? "rgba(34, 197, 94, 0.8)" : "rgba(255, 255, 255, 0.8)";
            ctx.lineWidth = 3;
            ctx.shadowColor = c.isStriker ? "#22c55e" : "#fff";
            ctx.shadowBlur = 10;
            ctx.stroke();
            ctx.restore();
        }
    }

    function drawAimGuide(ctx) {
        if (!state.striker) return;

        if (state.turnPhase !== 'aim' && state.turnPhase !== 'place') return;

        const s = state.striker;
        const rayDir = { x: Math.cos(state.aimAngle), y: Math.sin(state.aimAngle) };

        // Raycast to find impact
        const hit = findFirstHit(s, rayDir);

        // Reset all target highlights first
        state.coins.forEach(c => c.targetHighlighted = false);

        // Length of arrow
        let len = Math.max(80, state.power * 5);
        if (hit) {
            len = hit.dist;
            hit.obj.targetHighlighted = true;
        }

        const endX = s.x + rayDir.x * len;
        const endY = s.y + rayDir.y * len;

        // 1. Draw Dotted Aiming Path
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(endX, endY);
        ctx.setLineDash([5, 5]);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();

        // 2. Draw Solid Arrow (Shortened segment at the end of path)
        const arrowLen = Math.min(len, 60);
        const arrowStartX = endX - rayDir.x * arrowLen;
        const arrowStartY = endY - rayDir.y * arrowLen;

        ctx.save();
        const arrowGrad = ctx.createLinearGradient(arrowStartX, arrowStartY, endX, endY);
        arrowGrad.addColorStop(0, "rgba(255, 255, 255, 0)");
        arrowGrad.addColorStop(1, "rgba(255, 255, 255, 0.8)");

        ctx.beginPath();
        ctx.moveTo(arrowStartX, arrowStartY);
        ctx.lineTo(endX, endY);
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.strokeStyle = arrowGrad;
        ctx.stroke();

        // Arrow Head
        const headLen = 12;
        const headAngle = Math.PI / 6;
        ctx.beginPath();
        ctx.moveTo(endX, endY);
        ctx.lineTo(endX - headLen * Math.cos(state.aimAngle - headAngle), endY - headLen * Math.sin(state.aimAngle - headAngle));
        ctx.moveTo(endX, endY);
        ctx.lineTo(endX - headLen * Math.cos(state.aimAngle + headAngle), endY - headLen * Math.sin(state.aimAngle + headAngle));
        ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.restore();

        // 3. Ghost Striker / Hit Marker
        if (hit && hit.obj) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(endX, endY, s.radius, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
            ctx.fill();
            ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.stroke();
            ctx.restore();

            // 4. Prediction Line
            const obj = hit.obj;
            const pushAngle = Math.atan2(obj.y - endY, obj.x - endX);

            const predictLen = 120;
            const pEndX = obj.x + Math.cos(pushAngle) * predictLen;
            const pEndY = obj.y + Math.sin(pushAngle) * predictLen;

            ctx.save();
            ctx.beginPath();
            ctx.moveTo(obj.x, obj.y);
            ctx.lineTo(pEndX, pEndY);
            ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
            ctx.lineWidth = 2;
            ctx.setLineDash([3, 6]);
            ctx.stroke();
            ctx.restore();
        }
    }

    function findFirstHit(striker, dir) {
        let closest = null;
        let minDesc = Infinity;

        // Check against Board Walls (Simple Box)
        // ... (Optional: add wall raycast if needed, but coins are priority)

        // Check Coins
        for (let c of state.coins) {
            // Vector from striker to coin
            const fx = c.x - striker.x;
            const fy = c.y - striker.y;

            // Project onto ray direction
            const t = fx * dir.x + fy * dir.y;
            if (t <= 0) continue; // Behind striker

            // Closest dist from circle centers
            // Point on ray closest to coin center
            const cpX = striker.x + dir.x * t;
            const cpY = striker.y + dir.y * t;

            const distSq = (c.x - cpX) ** 2 + (c.y - cpY) ** 2;
            const minDist = striker.radius + c.radius;

            if (distSq < minDist * minDist) {
                // Intersection found
                // Calculate back-off distance 'b'
                const b = Math.sqrt(minDist * minDist - distSq);
                const hitDist = t - b;

                if (hitDist < minDesc && hitDist > 0) {
                    minDesc = hitDist;
                    closest = { dist: hitDist, obj: c };
                }
            }
        }
        return closest;
    }

    function drawHUD(ctx) {
        // UI is now handled by DOM, but we update values here every frame or on change
        const p1ScoreEl = document.getElementById('p1-score');
        const p2ScoreEl = document.getElementById('p2-score');
        const turnPill = document.getElementById('turn-pill');

        if (p1ScoreEl) p1ScoreEl.innerText = `SCORE: ${state.scores[1]}`;
        if (p2ScoreEl) p2ScoreEl.innerText = `SCORE: ${state.scores[2]}`;

        if (turnPill) {
            if (state.currentPlayer === 1) {
                turnPill.innerText = "YOUR TURN";
                turnPill.style.color = "#fbbf24";
                turnPill.style.border = "1px solid rgba(251, 191, 36, 0.4)";
                turnPill.classList.add('active');
            } else {
                turnPill.innerText = "AI TURN";
                turnPill.style.color = "#60a5fa";
                turnPill.style.border = "1px solid rgba(96, 165, 250, 0.4)";
                // Optional: Pulse effect for AI
            }
        }
    }

    // --- Utils ---
    function playAnnounce(msg) {
        console.log(msg); // Placeholder
    }

    function playHitSound() {
        // Handled by physics Engine now
    }

    function resetTurn() {
        state.isMoving = false;
        state.isAiming = false;
    }

    return {
        init: init,
        stop: stop,
        reset: resetGame
    };

})();
