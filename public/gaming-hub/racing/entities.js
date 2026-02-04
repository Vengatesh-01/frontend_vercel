class Car {
    constructor(x, y, color, type = 'ai') {
        this.x = x;
        this.y = y;
        this.angle = 0; // Radians
        this.speed = 0;
        this.color = color;
        this.type = type; // 'player', 'ai', 'police'

        this.width = RACING_CONSTANTS.CARS.WIDTH;
        this.height = RACING_CONSTANTS.CARS.HEIGHT;
        this.drift = 0;
        this.lap = 1;
        this.waypointIndex = 0;
        this.finishTime = 0;

        // Physics state
        this.vx = 0;
        this.vy = 0;
    }

    update(dt, track, otherCars) {
        // To be implemented by subclasses
        this.move(dt, track);
        this.checkCollisions(otherCars);
    }

    move(dt, track) {
        // Friction
        const onTrack = track.isOnTrack(this.x, this.y);
        const friction = onTrack ? RACING_CONSTANTS.PHYSICS.FRICTION : RACING_CONSTANTS.PHYSICS.OFF_ROAD_FRICTION;
        this.speed *= friction;

        // Velocity components based on angle and drift
        this.vx = Math.cos(this.angle) * this.speed;
        this.vy = Math.sin(this.angle) * this.speed;

        this.x += this.vx;
        this.y += this.vy;
    }

    checkCollisions(cars) {
        cars.forEach(other => {
            if (other === this) return;
            if (RacingUtils.checkCircleCollision(
                { x: this.x, y: this.y, radius: this.width / 2 },
                { x: other.x, y: other.y, radius: other.width / 2 }
            )) {
                // Elastic collision approximation
                const dx = this.x - other.x;
                const dy = this.y - other.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const nx = dx / dist;
                const ny = dy / dist;

                // Push apart
                const overlap = (this.width - dist) / 2;
                this.x += nx * overlap;
                this.y += ny * overlap;
                other.x -= nx * overlap;
                other.y -= ny * overlap;

                // Momentum transfer
                this.speed *= 0.8;

                // Audio
                if (window.RacingAudioSystem && (this.type === 'player' || other.type === 'player')) {
                    const impactForce = Math.min(Math.abs(this.speed - other.speed) / 5, 1);
                    if (impactForce > 0.1) window.RacingAudioSystem.playCrash(impactForce);
                }
            }
        });
    }

    draw(ctx, camera) {
        if (Math.abs(this.x - camera.x) > ctx.canvas.width || Math.abs(this.y - camera.y) > ctx.canvas.height) return;

        ctx.save();
        ctx.translate(this.x - camera.x, this.y - camera.y);
        ctx.rotate(this.angle + Math.PI / 2);

        const w = this.width;
        const h = this.height;

        // 1. Shadow
        ctx.shadowColor = 'rgba(0,0,0,0.4)';
        ctx.shadowBlur = 15;
        ctx.shadowOffsetY = 5;

        // 2. Main Body (Metallic Red Gradient)
        const bodyGrad = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
        bodyGrad.addColorStop(0, '#991b1b'); // Dark red side
        bodyGrad.addColorStop(0.5, '#ef4444'); // Bright red top
        bodyGrad.addColorStop(1, '#991b1b');

        ctx.fillStyle = bodyGrad;
        // Rounded car body shape
        ctx.beginPath();
        ctx.roundRect(-w / 2, -h / 2, w, h, 8);
        ctx.fill();
        ctx.shadowBlur = 0;

        // 3. Roof & Windows (Glossy Black)
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.roundRect(-w / 2 + 4, -h / 2 + 10, w - 8, h / 2 + 5, 4);
        ctx.fill();

        // 4. Windshield highlights
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-w / 2 + 8, -h / 2 + 15);
        ctx.lineTo(w / 2 - 8, -h / 2 + 15);
        ctx.stroke();

        // 5. Hood Vents
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(-w / 4, -h / 2 + 2, w / 2, 4);
        ctx.fillRect(-w / 4, -h / 2 + 8, w / 2, 2);

        // 6. Spoiler (Rear)
        ctx.fillStyle = '#7f1d1d';
        ctx.fillRect(-w / 2 - 2, h / 2 - 6, w + 4, 4);

        // 7. Taillights (Glow effect)
        const time = Date.now();
        const brakeActive = (this.type === 'player' && this.speed < 0); // Simplified braking visual

        ctx.fillStyle = brakeActive ? '#ff0000' : '#991b1b';
        if (brakeActive) {
            ctx.shadowColor = 'red';
            ctx.shadowBlur = 10;
        }
        ctx.fillRect(-w / 2 + 2, h / 2 - 2, 10, 3); // Left
        ctx.fillRect(w / 2 - 12, h / 2 - 2, 10, 3); // Right
        ctx.shadowBlur = 0;

        // 8. Headlights (White/Yellow)
        ctx.fillStyle = '#fef3c7';
        ctx.fillRect(-w / 2 + 4, -h / 2, 8, 3);
        ctx.fillRect(w / 2 - 12, -h / 2, 8, 3);

        // Siren for Police
        if (this.type === 'police') {
            ctx.fillStyle = Math.floor(time / 200) % 2 === 0 ? '#ef4444' : '#3b82f6';
            ctx.beginPath();
            ctx.arc(0, -5, 6, 0, Math.PI * 2);
            ctx.fill();
            // Light flare
            ctx.fillStyle = ctx.fillStyle + '44';
            ctx.beginPath();
            ctx.arc(0, -5, 15, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }
}

class PlayerCar extends Car {
    constructor(x, y) {
        super(x, y, RACING_CONSTANTS.CARS.COLORS.PLAYER, 'player');
    }

    update(dt, input, track, cars) {
        // Steering
        const steer = input.getSteer();
        if (Math.abs(this.speed) > 0.5) {
            this.angle += steer * RACING_CONSTANTS.PHYSICS.TURN_SPEED * (this.speed > 0 ? 1 : -1);
        }

        // Acceleration
        const throttle = input.getThrottle();
        const brake = input.getBrake();

        if (throttle > 0) this.speed += RACING_CONSTANTS.PHYSICS.ACCELERATION;
        else if (throttle < 0) this.speed -= RACING_CONSTANTS.PHYSICS.ACCELERATION * 0.5;

        if (brake) this.speed *= RACING_CONSTANTS.PHYSICS.BRAKING;

        // Cap speed
        const max = RACING_CONSTANTS.PHYSICS.MAX_SPEED;
        if (this.speed > max) this.speed = max;
        if (this.speed < -max / 3) this.speed = -max / 3;

        this.move(dt, track);
        this.checkCollisions(cars);

        // Update lap logic (simple check)
        const nearestIdx = track.getNearestPointIndex(this.x, this.y);
        if (nearestIdx > this.waypointIndex) this.waypointIndex = nearestIdx;

        // Lap completion check would need more robust gate logic, simplified here:
        if (this.waypointIndex > track.points.length - 10 && nearestIdx < 5) {
            this.lap++;
            this.waypointIndex = 0;
        }
    }
}

class AICar extends Car {
    constructor(x, y, color) {
        super(x, y, color, 'ai');
        this.targetSpeed = RACING_CONSTANTS.PHYSICS.MAX_SPEED * (0.8 + Math.random() * 0.2);
    }

    update(dt, track, cars) {
        // Find target point
        const targetIdx = (this.waypointIndex + 5) % track.points.length;
        const target = track.points[targetIdx];

        // Steer towards target
        const desiredAngle = RacingUtils.angleBetween({ x: this.x, y: this.y }, target);
        let diff = RacingUtils.normalizeAngle(desiredAngle - this.angle);

        if (Math.abs(diff) > 0.1) {
            this.angle += Math.sign(diff) * RACING_CONSTANTS.PHYSICS.TURN_SPEED;
        }

        // Speed control
        if (track.isOnTrack(this.x, this.y)) {
            if (this.speed < this.targetSpeed) this.speed += RACING_CONSTANTS.PHYSICS.ACCELERATION * 0.8;
        } else {
            this.speed *= 0.95; // Slow down offroad
        }

        this.waypointIndex = track.getNearestPointIndex(this.x, this.y);

        this.move(dt, track);
        this.checkCollisions(cars);
    }
}

class PoliceCar extends Car {
    constructor(x, y, targetCar) {
        super(x, y, RACING_CONSTANTS.CARS.COLORS.POLICE, 'police');
        this.targetCar = targetCar;
    }

    update(dt, track, cars) {
        // Target the player directly
        const desiredAngle = RacingUtils.angleBetween({ x: this.x, y: this.y }, { x: this.targetCar.x, y: this.targetCar.y });
        let diff = RacingUtils.normalizeAngle(desiredAngle - this.angle);
        this.angle += Math.sign(diff) * RACING_CONSTANTS.PHYSICS.TURN_SPEED * 1.1; // Better turning

        if (this.speed < RACING_CONSTANTS.PHYSICS.MAX_SPEED * 1.1) {
            this.speed += RACING_CONSTANTS.PHYSICS.ACCELERATION; // Faster accel
        }

        this.move(dt, track);
        this.checkCollisions(cars);
    }
}
