const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

const rooms = new Map(); // roomId -> { players: [socketId], colors: {} }

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

io.on('connection', (socket) => {
  socket.on('createRoom', () => {
    let code;
    do { code = generateCode(); } while (rooms.has(code));
    rooms.set(code, { players: [socket.id], colors: { [socket.id]: 'w' } });
    socket.join(code);
    socket.emit('roomCreated', code);
  });

  socket.on('joinRoom', (code) => {
    const room = rooms.get(code);
    if (!room) return socket.emit('error', 'Room not found');
    if (room.players.length >= 2) return socket.emit('error', 'Room full');
    room.players.push(socket.id);
    room.colors[socket.id] = 'b';
    socket.join(code);

    const whiteId = room.players[0];
    const blackId = room.players[1];
    io.to(whiteId).emit('startGame', { roomId: code, color: 'w' });
    io.to(blackId).emit('startGame', { roomId: code, color: 'b' });
  });

  socket.on('move', ({ roomId, move }) => {
    socket.to(roomId).emit('move', move);
  });

  socket.on('resign', (roomId) => {
    const room = rooms.get(roomId);
    if (!room) return;
    const color = room.colors[socket.id] === 'w' ? 'White' : 'Black';
    io.to(roomId).emit('gameOver', color + ' resigned. Opponent wins!');
  });

  socket.on('disconnect', () => {
    for (const [code, room] of rooms) {
      if (room.players.includes(socket.id)) {
        io.to(code).emit('gameOver', 'Opponent disconnected');
        rooms.delete(code);
        break;
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
