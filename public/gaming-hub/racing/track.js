class RacingTrack {
    constructor() {
        this.points = []; // Center points of the track
        this.width = RACING_CONSTANTS.TRACK.WIDTH;
        this.initTrack();
    }

    initTrack() {
        // Simple oval/circuit loop
        // Ensure it loops back to start
        this.points = [
            { x: 100, y: 100 },
            { x: 800, y: 100 },
            { x: 1200, y: 400 },
            { x: 1200, y: 1000 },
            { x: 800, y: 1400 },
            { x: 400, y: 1200 },
            { x: 100, y: 800 }
        ];

        // Smooth the track using Catmull-Rom splines or simply subdivisions
        this.generateSmoothPath();
    }

    generateSmoothPath() {
        let smoothPoints = [];
        for (let i = 0; i < this.points.length; i++) {
            const p0 = this.points[(i - 1 + this.points.length) % this.points.length];
            const p1 = this.points[i];
            const p2 = this.points[(i + 1) % this.points.length];
            const p3 = this.points[(i + 2) % this.points.length];

            for (let t = 0; t < 1; t += 0.1) {
                smoothPoints.push(this.catmullRom(p0, p1, p2, p3, t));
            }
        }
        this.points = smoothPoints;
    }

    catmullRom(p0, p1, p2, p3, t) {
        const t2 = t * t;
        const t3 = t2 * t;
        return {
            x: 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
            y: 0.5 * ((2 * p1.y) + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3)
        };
    }

    draw(ctx, camera) {
        ctx.save();
        ctx.translate(-camera.x, -camera.y);

        // Draw Grass/Offroad (Background is already drawn in Game loop, this is track specific if needed)

        // Draw Road Border
        ctx.beginPath();
        ctx.lineWidth = this.width + 10;
        ctx.strokeStyle = RACING_CONSTANTS.TRACK.BORDER_COLOR;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round'; // Smooth ends for non-looped, but we are looped
        this.drawPath(ctx);
        ctx.stroke();

        // Draw Road Asphalt
        ctx.beginPath();
        ctx.lineWidth = this.width;
        ctx.strokeStyle = RACING_CONSTANTS.TRACK.ROAD_COLOR;
        this.drawPath(ctx);
        ctx.stroke();

        // Draw Start/Finish Line
        if (this.points.length > 0) {
            const start = this.points[0];
            const next = this.points[1];
            const angle = Math.atan2(next.y - start.y, next.x - start.x);

            ctx.save();
            ctx.translate(start.x, start.y);
            ctx.rotate(angle);
            ctx.fillStyle = '#ffffff';
            // Checker pattern
            for (let i = -this.width / 2; i < this.width / 2; i += 20) {
                if ((i / 20) % 2 === 0) ctx.fillRect(0, i, 20, 20);
                else ctx.fillRect(20, i, 20, 20);
            }
            ctx.restore();
        }

        ctx.restore();
    }

    drawPath(ctx) {
        if (this.points.length < 2) return;
        ctx.moveTo(this.points[0].x, this.points[0].y);
        for (let i = 1; i < this.points.length; i++) {
            ctx.lineTo(this.points[i].x, this.points[i].y);
        }
        ctx.closePath();
    }

    // Check if point is on track
    isOnTrack(x, y) {
        // Brute force distance check to center line segments
        // Optimization: Quadtree or grid recommended for production, but this is simple enough for <1000 points
        let minDist = Infinity;
        for (let i = 0; i < this.points.length; i++) {
            const p1 = this.points[i];
            const p2 = this.points[(i + 1) % this.points.length];
            const d = RacingUtils.pDistance(x, y, p1.x, p1.y, p2.x, p2.y);
            if (d < minDist) minDist = d;
        }
        return minDist < (this.width / 2);
    }

    getNearestPointIndex(x, y) {
        let minD = Infinity;
        let idx = -1;
        for (let i = 0; i < this.points.length; i++) {
            const d = RacingUtils.dist({ x, y }, this.points[i]);
            if (d < minD) {
                minD = d;
                idx = i;
            }
        }
        return idx;
    }
}
