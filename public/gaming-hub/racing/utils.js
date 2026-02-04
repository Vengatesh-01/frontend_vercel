const RacingUtils = {
    // Distance between two points
    dist: (p1, p2) => Math.hypot(p2.x - p1.x, p2.y - p1.y),

    // Angle between two points
    angleBetween: (p1, p2) => Math.atan2(p2.y - p1.y, p2.x - p1.x),

    // Normalize angle to -PI to PI
    normalizeAngle: (angle) => {
        while (angle > Math.PI) angle -= Math.PI * 2;
        while (angle < -Math.PI) angle += Math.PI * 2;
        return angle;
    },

    // Linear interpolation
    lerp: (start, end, amt) => (1 - amt) * start + amt * end,

    // Check collision between two rotated rectangles (Separating Axis Theorem - Simplified)
    // For this game, circle collision might be enough or simple bounding box
    // But for cars, rotated rect is better.
    // Using simple circle collision for performance in JS loop usually suffices for arcade drift
    checkCircleCollision: (c1, c2) => {
        const d = RacingUtils.dist(c1, c2);
        return d < (c1.radius + c2.radius);
    },

    // Project point onto line segment (for track boundary checks)
    pDistance: (x, y, x1, y1, x2, y2) => {
        var A = x - x1;
        var B = y - y1;
        var C = x2 - x1;
        var D = y2 - y1;

        var dot = A * C + B * D;
        var len_sq = C * C + D * D;
        var param = -1;
        if (len_sq != 0) //in case of 0 length line
            param = dot / len_sq;

        var xx, yy;

        if (param < 0) {
            xx = x1;
            yy = y1;
        }
        else if (param > 1) {
            xx = x2;
            yy = y2;
        }
        else {
            xx = x1 + param * C;
            yy = y1 + param * D;
        }

        var dx = x - xx;
        var dy = y - yy;
        return Math.sqrt(dx * dx + dy * dy);
    }
};
