const RACING_CONSTANTS = {
    PHYSICS: {
        ACCELERATION: 0.2, // Increased for snappier feel
        BRAKING: 0.4,
        MAX_SPEED: 12, // Base max speed
        FRICTION: 0.98,
        TURN_SPEED: 0.05, // Radians per frame
        DRIFT_FACTOR: 0.96, // Lower = more drift
        COLLISION_BOUNCE: 0.5,
        OFF_ROAD_FRICTION: 0.92
    },
    TRACK: {
        WIDTH: 140, // Road width
        BORDER_COLOR: '#ffffff',
        ROAD_COLOR: '#333333',
        GRASS_COLOR: '#1a472a',
        LANE_COUNT: 3
    },
    GAME: {
        TOTAL_LAPS: 3,
        AI_COUNT: 3,
        POLICE_COUNT: 2,
        POLICE_SPAWN_DELAY: 5000 // ms
    },
    CARS: {
        WIDTH: 24,
        HEIGHT: 44,
        COLORS: {
            PLAYER: '#ef4444', // Red
            AI: ['#3b82f6', '#10b981', '#f59e0b'], // Blue, Green, Yellow
            POLICE: '#1f2937' // Dark Grey
        }
    }
};
