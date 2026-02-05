class RacingInput {
    constructor() {
        this.keys = {
            up: false,
            down: false,
            left: false,
            right: false,
            brake: false
        };
        this.gyro = {
            active: false,
            tilt: 0 // -1 to 1
        };
        this.touch = {
            active: false,
            throttle: false,
            brake: false,
            left: false,
            right: false
        };

        this.initListeners();
    }

    initListeners() {
        // Keyboard
        window.addEventListener('keydown', (e) => this.handleKey(e, true));
        window.addEventListener('keyup', (e) => this.handleKey(e, false));

        // Gyroscope
        if (window.DeviceOrientationEvent) {
            window.addEventListener('deviceorientation', (e) => this.handleGyro(e));
        }

        // Touch (We will attach these to UI elements in Game.js, but global reset here)
        // Actually, let's expose methods to be called by UI buttons
    }

    handleKey(e, isDown) {
        switch (e.key) {
            case 'ArrowUp':
            case 'w':
            case 'W':
                this.keys.up = isDown; break;
            case 'ArrowDown':
            case 's':
            case 'S':
                this.keys.down = isDown; break;
            case 'ArrowLeft':
            case 'a':
            case 'A':
                this.keys.left = isDown; break;
            case 'ArrowRight':
            case 'd':
            case 'D':
                this.keys.right = isDown; break;
            case ' ':
                this.keys.brake = isDown; break;
        }
    }

    handleGyro(e) {
        if (!this.gyro.active) return;

        // Gamma is usually left-to-right tilt (-90 to 90)
        // We clamp it to -30 to 30 for gameplay
        let tilt = e.gamma;
        if (tilt === null) return;

        if (window.orientation === 90) tilt = -e.beta; // Landscape
        else if (window.orientation === -90) tilt = e.beta;

        // Smoothing
        const maxTilt = 20;
        let val = Math.max(-maxTilt, Math.min(maxTilt, tilt));
        this.gyro.tilt = val / maxTilt;
    }

    toggleGyro(enabled) {
        this.gyro.active = enabled;
        // Request permission on iOS 13+
        if (enabled && typeof DeviceOrientationEvent.requestPermission === 'function') {
            DeviceOrientationEvent.requestPermission()
                .then(response => {
                    if (response !== 'granted') this.gyro.active = false;
                })
                .catch(console.error);
        }
    }

    setTouchControl(control, isActive) {
        switch (control) {
            case 'throttle':
                this.touch.throttle = isActive;
                break;
            case 'left':
                this.touch.left = isActive;
                break;
            case 'right':
                this.touch.right = isActive;
                break;
            case 'brake':
                this.touch.brake = isActive;
                break;
        }
    }

    getSteer() {
        if (this.gyro.active && Math.abs(this.gyro.tilt) > 0.1) {
            return this.gyro.tilt;
        }
        if (this.keys.left || this.touch.left) return -1;
        if (this.keys.right || this.touch.right) return 1;
        return 0;
    }

    getThrottle() {
        if (this.keys.up || this.touch.throttle) return 1;
        if (this.keys.down) return -1; // Reverse
        return 0;
    }

    getBrake() {
        return this.keys.brake || this.touch.brake;
    }
}
