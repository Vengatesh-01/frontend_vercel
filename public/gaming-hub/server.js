const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.use(express.static(path.join(__dirname, '/')));

// Game State Management (In-Memory)
const rooms = {};
const matchQueue = {
    chess: [],
    'car-racing': [],
    'bike-racing': [],
    'truck-racing': [],
    'carrom': []
};

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join-room', ({ gameType, playerName }) => {
        // Matchmaking logic
        let roomId;
        const queue = matchQueue[gameType];

        if (queue && queue.length > 0) {
            // Pair with waiting player
            roomId = queue.shift();
            socket.join(roomId);
        } else {
            // Create new room and wait
            roomId = uuidv4();
            matchQueue[gameType].push(roomId);
            socket.join(roomId);
        }

        if (!rooms[roomId]) {
            rooms[roomId] = {
                players: [],
                gameType: gameType,
                createdAt: Date.now()
            };
        }

        const player = {
            id: socket.id,
            name: playerName || `Player ${socket.id.substr(0, 4)}`,
            role: rooms[roomId].players.length === 0 ? 'white' :
                rooms[roomId].players.length === 1 ? 'black' : 'spectator'
        };

        rooms[roomId].players.push(player);

        // Notify room about joining player
        io.to(roomId).emit('room-update', {
            players: rooms[roomId].players,
            gameType: rooms[roomId].gameType,
            roomId: roomId
        });

        // Assign role specifically to this socket
        socket.emit('role-assignment', { role: player.role });

        console.log(`Socket ${socket.id} matched into ${roomId} as ${player.role}`);
    });

    // Chess Pro Sync
    socket.on('chess-move', ({ roomId, move, fen, timeData }) => {
        socket.to(roomId).emit('chess-move', { move, fen, timeData });
    });

    socket.on('chess-game-over', ({ roomId, result }) => {
        io.to(roomId).emit('chess-game-over', result);
    });

    // Racing Sync
    socket.on('racing-update', ({ roomId, position, score }) => {
        socket.to(roomId).emit('racing-update', { id: socket.id, position, score });
    });

    // Carrom Sync
    socket.on('carrom-move', ({ roomId, pocketData }) => {
        socket.to(roomId).emit('carrom-move', pocketData);
    });

    socket.on('disconnect', () => {
        // Cleanup queues
        for (const type in matchQueue) {
            matchQueue[type] = matchQueue[type].filter(id => {
                const room = rooms[id];
                return room && room.players.some(p => p.id === socket.id) ? false : true;
            });
        }

        // Cleanup rooms
        for (const roomId in rooms) {
            const playerIndex = rooms[roomId].players.findIndex(p => p.id === socket.id);
            if (playerIndex !== -1) {
                const player = rooms[roomId].players[playerIndex];
                rooms[roomId].players.splice(playerIndex, 1);

                if (rooms[roomId].players.length === 0) {
                    delete rooms[roomId];
                } else {
                    io.to(roomId).emit('player-disconnected', {
                        id: socket.id,
                        name: player.name
                    });
                    io.to(roomId).emit('room-update', {
                        players: rooms[roomId].players
                    });
                }
            }
        }
        console.log('User disconnected:', socket.id);
    });
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Multiplayer Game Hub Server running on http://localhost:${PORT}`);
});
