class RacingGameEngine {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;

        this.input = new RacingInput();
        this.track = new RacingTrack();
        this.weather = new WeatherSystem();

        this.camera = { x: 0, y: 0 };
        this.cars = [];
        this.player = null;

        this.running = false;
        this.mode = 'normal'; // normal, police

        this.ui = {
            lap: document.createElement('div'),
            speed: document.createElement('div'),
            pos: document.createElement('div')
        };

        this.initUI();
    }

    initUI() {
        const hud = document.createElement('div');
        hud.id = 'racing-hud';
        hud.style.cssText = `
            position: absolute;
            top: 0; left: 0; width: 100%; height: 100%;
            pointer-events: none;
            font-family: 'Inter', system-ui, sans-serif;
            color: white;
            z-index: 1000;
        `;

        const style = document.createElement('style');
        style.id = 'racing-dashboard-styles';
        style.innerHTML = `
            .dashboard-panel {
                background: rgba(15, 23, 42, 0.7);
                backdrop-filter: blur(12px);
                border: 1px solid rgba(255,255,255,0.1);
                border-radius: 16px;
                padding: 15px;
                box-shadow: 0 8px 32px rgba(0,0,0,0.4);
            }
            .gauge-container {
                width: 180px;
                height: 180px;
                position: relative;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .gauge-svg {
                width: 100%;
                height: 100%;
                transform: rotate(-120deg);
            }
            .gauge-needle {
                width: 4px;
                height: 70px;
                background: #ef4444;
                position: absolute;
                bottom: 50%;
                left: calc(50% - 2px);
                transform-origin: bottom center;
                transition: transform 0.1s ease-out;
                box-shadow: 0 0 10px rgba(239, 68, 68, 0.5);
                border-radius: 2px;
            }
            .speed-text {
                position: absolute;
                bottom: 45px;
                width: 100%;
                text-align: center;
                font-size: 1.5rem;
                font-weight: 900;
                color: #fff;
            }
            .mini-map {
                width: 200px;
                height: 200px;
                background: rgba(0,0,0,0.4);
                border-radius: 50%;
                border: 4px solid #334155;
                position: relative;
                overflow: hidden;
            }
            .map-player {
                width: 8px;
                height: 8px;
                background: #60a5fa;
                border-radius: 50%;
                position: absolute;
                top: 50%; left: 50%;
                transform: translate(-50%, -50%);
                z-index: 10;
                box-shadow: 0 0 8px #60a5fa;
            }
            .pedal {
                width: 60px;
                height: 100px;
                background: #334155;
                border: 3px solid #475569;
                border-radius: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: 800;
                transition: all 0.1s;
                opacity: 0.8;
                pointer-events: auto; /* Enable touch/mouse events */
            }
            .pedal.active {
                transform: scale(0.9) translateY(5px);
                background: #ef4444;
                border-color: #f87171;
                box-shadow: 0 0 20px rgba(239, 68, 68, 0.4);
            }
            .steering-wheel {
                width: 150px;
                height: 150px;
                border: 12px solid #1e293b;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: transform 0.1s;
                background: radial-gradient(circle, #334155 20%, transparent 21%);
                pointer-events: auto; /* Enable touch/mouse events */
            }
            .wheel-hub {
                width: 40px; height: 40px;
                background: #475569;
                border-radius: 50%;
            }
            .side-icon {
                width: 40px; height: 40px;
                background: rgba(255,255,255,0.1);
                border: 1px solid rgba(255,255,255,0.3);
                border-radius: 50%;
                display: flex; align-items: center; justify-content: center;
                font-size: 1.2rem; margin-bottom: 10px;
                box-shadow: 0 4px 8px rgba(0,0,0,0.3);
            }
            .nitro-bottle {
                width: 40px; height: 70px;
                background: linear-gradient(to bottom, #3b82f6, #1d4ed8);
                border-radius: 4px;
                border: 2px solid #60a5fa;
                position: relative;
                box-shadow: 0 0 15px rgba(59, 130, 246, 0.5);
            }
            .nitro-cap {
                width: 15px; height: 10px; background: #60a5fa;
                position: absolute; top: -10px; left: calc(50% - 7.5px);
                border-radius: 2px;
            }
            .exit-btn {
                position: absolute;
                top: 10px;
                right: 10px;
                background: rgba(239, 68, 68, 0.4);
                border: 2px solid #ef4444;
                color: #fff;
                padding: 8px 16px;
                border-radius: 12px;
                font-weight: 800;
                cursor: pointer;
                pointer-events: auto;
                transition: all 0.2s;
                text-transform: uppercase;
                letter-spacing: 1px;
                z-index: 9999;
            }
            .exit-btn:hover { background: #ef4444; color: white; }
        `;
        document.head.appendChild(style);

        hud.innerHTML = `
            <!-- Mini-Map Removed -->

            <!-- Left Icons -->
            <div style="position: absolute; top: 150px; left: 30px;">
                <div class="side-icon" title="Ignition Key">🔑</div>
                <div class="side-icon" title="Handbrake">🅿️</div>
            </div>

            <!-- Timer -->
            <div class="dashboard-panel" style="position: absolute; top: 20px; left: 50%; transform: translateX(-50%); padding: 10px 30px;">
                <div style="font-size: 0.7rem; opacity: 0.7; text-align: center;">LAP TIME</div>
                <div id="race-timer" style="font-size: 1.5rem; font-weight: 900; color: #fbbf24;">00:00:00</div>
            </div>

            <!-- Speedometer -->
            <div class="dashboard-panel" style="position: absolute; top: 20px; right: 20px; padding: 10px;">
                <div style="text-align: right; position: absolute; left: -100px; top: 10px;">
                    <div style="font-size: 1.2rem; font-weight: 900;"><span style="font-size: 2rem;">5</span><small style="opacity:0.7; margin-left: 4px;">MT</small></div>
                </div>
                <div class="gauge-container">
                    <svg class="gauge-svg" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="8"/>
                        <circle id="speed-arc" cx="50" cy="50" r="45" fill="none" stroke="#ef4444" stroke-width="8" stroke-dasharray="0 283" stroke-linecap="round"/>
                    </svg>
                    <div id="speed-needle" class="gauge-needle"></div>
                    <div class="speed-text"><span id="speed-val" style="font-size: 2.2rem;">0</span></div>
                    <div style="position: absolute; bottom: 30px; font-size: 0.6rem; opacity: 0.6; font-weight: bold;">MPH</div>
                </div>
                <div style="display: flex; justify-content: space-between; margin-top: 5px;">
                    <div id="ui-lap" style="font-weight: 800; color: #60a5fa; font-size: 0.8rem;">1/3</div>
                    <div id="ui-pos" style="font-weight: 800; color: #fbbf24; font-size: 0.8rem;">1/4</div>
                </div>
            </div>

            <!-- Controls (Visual) -->
            <div style="position: absolute; bottom: 30px; left: 30px; display: flex; gap: 20px; align-items: center; pointer-events: auto;">
                <div id="btn-left" class="control-btn" style="width: 70px; height: 70px; background: rgba(255,255,255,0.1); border: 2px solid rgba(255,255,255,0.3); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">←</div>
                <div id="ui-wheel" class="steering-wheel" style="width: 100px; height: 100px;">
                    <div style="width: 100%; height: 6px; background: #1e293b; position: absolute;"></div>
                    <div style="width: 6px; height: 100%; background: #1e293b; position: absolute;"></div>
                    <div class="wheel-hub"></div>
                </div>
                <div id="btn-right" class="control-btn" style="width: 70px; height: 70px; background: rgba(255,255,255,0.1); border: 2px solid rgba(255,255,255,0.3); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">→</div>
            </div>

            <div style="position: absolute; bottom: 30px; right: 30px; display: flex; align-items: flex-end; gap: 20px; pointer-events: auto;">
                <div id="pedal-brake" class="pedal" style="width: 70px; height: 70px; font-size: 0.6rem;">BRAKE</div>
                <div id="pedal-gas" class="pedal" style="width: 70px; height: 100px; font-size: 0.7rem;">GAS</div>
            </div>

            <button class="exit-btn" onclick="RacingGame.instance.stop(); backToHub();">Exit Race</button>
        `;

        document.body.appendChild(hud);
        this.hudElement = hud;

        this.ui = {
            speed: document.getElementById('speed-val'),
            needle: document.getElementById('speed-needle'),
            arc: document.getElementById('speed-arc'),
            lap: document.getElementById('ui-lap'),
            pos: document.getElementById('ui-pos'),
            timer: document.getElementById('race-timer'),
            wheel: document.getElementById('ui-wheel'),
            gas: document.getElementById('pedal-gas'),
            brake: document.getElementById('pedal-brake')
        };
    }

    init(mode = 'normal') {
        try {
            console.log("RacingGame init started", mode);
            this.mode = mode;
            this.cars = [];

            // Audio Init (Requires user gesture usually, putting here for flow)
            // Ideally trigger on "Start Game" button or first keypress
            if (window.RacingAudioSystem) window.RacingAudioSystem.init();

            // Spawn Player
            const startPos = this.track.points[0];
            this.player = new PlayerCar(startPos.x, startPos.y);
            this.cars.push(this.player);

            // Spawn AI
            if (mode === 'normal') {
                for (let i = 0; i < 3; i++) {
                    this.cars.push(new AICar(startPos.x - (i + 1) * 50, startPos.y, RACING_CONSTANTS.CARS.COLORS.AI[i]));
                }
            } else if (mode === 'police') {
                // Police spawns later or behind
                setTimeout(() => {
                    this.cars.push(new PoliceCar(startPos.x - 300, startPos.y, this.player));
                    this.cars.push(new PoliceCar(startPos.x - 350, startPos.y, this.player));
                }, 2000);
            }

            this.running = true;
            this.startTime = Date.now();
            this.loop();
        } catch (e) {
            console.error("Init failed:", e);
            this.ctx.fillStyle = 'red';
            this.ctx.font = '20px sans-serif';
            this.ctx.fillText('Init Error: ' + e.message, 50, 100);
        }

        // Listen for user interaction to resume audio context if suspended
        const resumeAudio = () => {
            if (window.RacingAudioSystem) window.RacingAudioSystem.resume();
            window.removeEventListener('click', resumeAudio);
            window.removeEventListener('keydown', resumeAudio);
        };
        window.addEventListener('click', resumeAudio);
        window.addEventListener('keydown', resumeAudio);
    }

    toggleGyro() {
        this.input.toggleGyro(!this.input.gyro.active);
    }

    setWeather(w) {
        this.weather.setWeather(w);
        // Play weather change sound?
    }

    stop() {
        this.running = false;
        if (this.hudElement) this.hudElement.remove();
        const style = document.getElementById('racing-dashboard-styles');
        if (style) style.remove();
        this.hudElement = null;
    }

    handleOpponentUpdate(data) {
        if (!this.running) return;
        let opp = this.cars.find(c => c.id === data.id);
        if (!opp) {
            opp = new Car(data.position.x, data.position.y, '#3b82f6', 'opponent');
            opp.id = data.id;
            this.cars.push(opp);
        }
        opp.x = data.position.x;
        opp.y = data.position.y;
        opp.angle = data.position.angle;
        opp.speed = data.position.speed;
        opp.lap = data.score.lap;
        opp.waypointIndex = data.score.waypoint;
    }

    broadcastPos() {
        if (window.parent && window.parent.socket && window.parent.isMultiplayer) {
            window.parent.socket.emit('racing-update', {
                roomId: window.parent.currentRoomId,
                position: { x: this.player.x, y: this.player.y, angle: this.player.angle, speed: this.player.speed },
                score: { lap: this.player.lap, waypoint: this.player.waypointIndex }
            });
        }
    }

    update() {
        this.weather.update();

        // Update physics
        this.cars.forEach(car => {
            if (car.type === 'player') car.update(1, this.input, this.track, this.cars);
            else car.update(1, this.track, this.cars);
        });

        // Camera follow player
        this.camera.x = this.player.x - this.canvas.width / 2;
        this.camera.y = this.player.y - this.canvas.height / 2;

        // UI Updates
        const speedKmh = Math.floor(Math.abs(this.player.speed) * 10);
        this.ui.speed.innerText = speedKmh;

        // Needle Rotation (0-240 degrees mapped from 0-MAX_SPEED)
        const maxSpeed = RACING_CONSTANTS.PHYSICS.MAX_SPEED;
        const speedRatio = Math.abs(this.player.speed) / maxSpeed;
        const needleAngle = speedRatio * 240;
        this.ui.needle.style.transform = `rotate(${needleAngle}deg)`;

        // Speed Arc (SVG Dasharray)
        const arcMax = 283; // Circumference of radius 45
        this.ui.arc.style.strokeDasharray = `${speedRatio * arcMax} 283`;

        // Lap & Pos
        this.ui.lap.innerText = `LAP: ${this.player.lap}/${RACING_CONSTANTS.GAME.TOTAL_LAPS}`;
        const rank = this.cars.filter(c => c.type !== 'police').sort((a, b) => (b.lap * 1000 + b.waypointIndex) - (a.lap * 1000 + a.waypointIndex)).indexOf(this.player) + 1;
        this.ui.pos.innerText = `POS: ${rank}/${this.cars.filter(c => c.type !== 'police').length}`;

        // Timer
        const elapsed = Date.now() - this.startTime;
        const mins = Math.floor(elapsed / 60000);
        const secs = Math.floor((elapsed % 60000) / 1000);
        const ms = Math.floor((elapsed % 1000) / 10);
        this.ui.timer.innerText = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}:${ms.toString().padStart(2, '0')}`;

        // Controls Visuals
        const steer = this.input.getSteer();
        this.ui.wheel.style.transform = `rotate(${steer * 45}deg)`;

        this.ui.gas.classList.toggle('active', this.input.getThrottle() > 0);
        this.ui.brake.classList.toggle('active', this.input.getBrake());

        // Mini-Map
        // Mini-Map removed

        // --- Audio Updates ---
        if (window.RacingAudioSystem) {
            const audio = window.RacingAudioSystem;
            // 1. Engine Pitch based on player speed
            // Normalize speed 0..MAX
            const speedRatio = Math.abs(this.player.speed) / RACING_CONSTANTS.PHYSICS.MAX_SPEED;
            audio.updateEngine(speedRatio);

            // 2. Siren Logic (if police mode)
            if (this.mode === 'police') {
                const nearestPolice = this.cars.find(c => c.type === 'police' && Math.hypot(c.x - this.player.x, c.y - this.player.y) < 800);
                if (nearestPolice) {
                    const dist = Math.hypot(nearestPolice.x - this.player.x, nearestPolice.y - this.player.y);
                    // Volume 1 at 0 dist, 0 at 800 dist
                    const prox = Math.max(0, 1 - dist / 800);
                    audio.setSiren(true, prox);
                } else {
                    audio.setSiren(false);
                }
            } else {
                audio.setSiren(false);
            }
        }
    }

    draw() {
        // Clear
        this.ctx.fillStyle = '#1a472a'; // Grass
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.track.draw(this.ctx, this.camera);

        // Sort cars by Y for z-order
        this.cars.sort((a, b) => a.y - b.y).forEach(car => car.draw(this.ctx, this.camera));

        this.weather.draw(this.ctx, this.canvas.width, this.canvas.height);

        // Headlight overlay if night
        if (this.weather.type === 'night') {
            this.ctx.globalCompositeOperation = 'screen';
            this.ctx.fillStyle = 'rgba(255, 255, 200, 0.4)';
            // Draw cones from cars
            this.cars.forEach(c => {
                const cx = c.x - this.camera.x;
                const cy = c.y - this.camera.y;
                if (cx > -100 && cx < this.canvas.width + 100 && cy > -100 && cy < this.canvas.height + 100) {
                    this.ctx.save();
                    this.ctx.translate(cx, cy);
                    this.ctx.rotate(c.angle + Math.PI / 2);
                    this.ctx.beginPath();
                    this.ctx.moveTo(-10, -20);
                    this.ctx.lineTo(-60, -200);
                    this.ctx.lineTo(60, -200);
                    this.ctx.lineTo(10, -20);
                    this.ctx.fill();
                    this.ctx.restore();
                }
            });
            this.ctx.globalCompositeOperation = 'source-over';
        }
    }

    // Mini-Map logic removed

    loop() {
        if (!this.running) return;
        try {
            this.update();
            this.draw();
            if (window.parent && window.parent.isMultiplayer) {
                this.broadcastPos();
            }
            requestAnimationFrame(() => this.loop());
        } catch (e) {
            console.error(e);
            this.ctx.fillStyle = 'red';
            this.ctx.font = '20px sans-serif';
            this.ctx.fillText('Game Error: ' + e.message, 50, 50);
            this.running = false;
        }
    }
}

// Global Instance
window.RacingGame = {
    instance: null,
    init: function (mode) {
        if (this.instance) this.instance.stop();
        const canvas = document.getElementById('game-canvas');
        this.instance = new RacingGameEngine(canvas);
        this.instance.init(mode);
    },
    toggleGyro: function () { this.instance.toggleGyro(); },
    setWeather: function (w) { this.instance.setWeather(w); }
};
