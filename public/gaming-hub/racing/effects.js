class WeatherSystem {
    constructor() {
        this.type = 'clear'; // clear, rain, fog, night
        this.drops = [];
        this.initRain();
    }

    setWeather(type) {
        this.type = type;
        if (type === 'rain') {
            RACING_CONSTANTS.PHYSICS.FRICTION = 0.96; // Slippery
        } else {
            RACING_CONSTANTS.PHYSICS.FRICTION = 0.98;
        }
    }

    initRain() {
        for (let i = 0; i < 100; i++) {
            this.drops.push({
                x: Math.random() * 2000, // Should cover screen
                y: Math.random() * 2000,
                l: Math.random() * 20 + 10,
                v: Math.random() * 10 + 20
            });
        }
    }

    update() {
        if (this.type === 'rain') {
            this.drops.forEach(d => {
                d.y += d.v;
                d.x -= 2; // Wind
                if (d.y > 1000) d.y = -50;
                if (d.x < -100) d.x = 2000;
            });
        }
    }

    draw(ctx, width, height) {
        ctx.save();
        ctx.resetTransform(); // Draw over everything in screen space

        if (this.type === 'rain') {
            ctx.strokeStyle = 'rgba(174, 194, 224, 0.5)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            this.drops.forEach(d => {
                // Map to screen coords approx
                const sx = d.x % width;
                const sy = d.y % height;
                ctx.moveTo(sx, sy);
                ctx.lineTo(sx - 2, sy + d.l);
            });
            ctx.stroke();

            // Darken
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.fillRect(0, 0, width, height);
        }

        if (this.type === 'fog') {
            ctx.fillStyle = 'rgba(200, 200, 200, 0.4)';
            ctx.fillRect(0, 0, width, height);
        }

        if (this.type === 'night') {
            ctx.fillStyle = 'rgba(0, 5, 20, 0.85)';
            ctx.fillRect(0, 0, width, height);
            // Composite operation for lights would be needed in Game render loop actually
        }

        ctx.restore();
    }
}
