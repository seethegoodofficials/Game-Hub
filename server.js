const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { Chess } = require('chess.js');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir));

// Room state lives in memory. A room always has at most two players.
// room = { players: [socketId], names: {}, colors: {}, game: Chess, gameOver: false }
const rooms = new Map();

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function cleanName(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').slice(0, 20);
}

function cleanCode(value) {
  return String(value || '').trim().toUpperCase();
}

function getRoomForSocket(socketId) {
  for (const [code, room] of rooms) {
    if (room.players.includes(socketId)) return [code, room];
  }
  return [null, null];
}

function publicRoomState(room) {
  return {
    players: room.players.map(id => ({
      color: room.colors[id],
      name: room.names[id]
    })),
    fen: room.game.fen(),
    turn: room.game.turn(),
    gameOver: room.gameOver
  };
}

function sendGameState(code) {
  const room = rooms.get(code);
  if (!room) return;
  io.to(code).emit('gameState', publicRoomState(room));
}

io.on('connection', (socket) => {
  socket.on('createRoom', (rawName) => {
    const name = cleanName(rawName);
    if (!name) return socket.emit('serverError', 'Enter your name first.');

    const [oldCode] = getRoomForSocket(socket.id);
    if (oldCode) return socket.emit('serverError', 'You are already in a room.');

    let code;
    do { code = generateCode(); } while (rooms.has(code));

    const game = new Chess();
    rooms.set(code, {
      players: [socket.id],
      names: { [socket.id]: name },
      colors: { [socket.id]: 'w' },
      game,
      gameOver: false
    });

    socket.join(code);
    socket.emit('roomCreated', { code, name });
    socket.emit('waiting', { message: 'Waiting for another player to join.' });
  });

  socket.on('joinRoom', (payload = {}) => {
    const code = cleanCode(payload.code);
    const name = cleanName(payload.name);

    if (!name) return socket.emit('serverError', 'Enter your name first.');
    if (!/^[A-Z0-9]{6}$/.test(code)) return socket.emit('serverError', 'Enter a valid 6-character room code.');

    const room = rooms.get(code);
    if (!room) return socket.emit('serverError', 'Room not found. Check the code and try again.');
    if (room.players.length >= 2) return socket.emit('serverError', 'This room already has two players.');

    room.players.push(socket.id);
    room.names[socket.id] = name;
    room.colors[socket.id] = 'b';
    socket.join(code);

    const whiteId = room.players[0];
    const blackId = room.players[1];

    io.to(whiteId).emit('gameReady', {
      roomId: code,
      myColor: 'w',
      opponentName: room.names[blackId],
      myName: room.names[whiteId]
    });
    io.to(blackId).emit('gameReady', {
      roomId: code,
      myColor: 'b',
      opponentName: room.names[whiteId],
      myName: room.names[blackId]
    });

    sendGameState(code);
  });

  socket.on('move', (payload = {}) => {
    const code = cleanCode(payload.roomId);
    const room = rooms.get(code);
    if (!room || !room.players.includes(socket.id)) return socket.emit('serverError', 'You are not in this game.');
    if (room.players.length !== 2) return socket.emit('serverError', 'Waiting for your opponent.');
    if (room.gameOver || room.game.isGameOver()) return socket.emit('serverError', 'The game is already over.');

    const playerColor = room.colors[socket.id];
    if (playerColor !== room.game.turn()) return socket.emit('serverError', 'It is not your turn.');

    const move = payload.move || {};
    try {
      const result = room.game.move({
        from: move.from,
        to: move.to,
        promotion: move.promotion || 'q'
      });
      if (!result) return socket.emit('serverError', 'That move is not legal.');
    } catch {
      return socket.emit('serverError', 'That move is not legal.');
    }

    if (room.game.isGameOver()) room.gameOver = true;
    io.to(code).emit('moveAccepted', {
      move,
      fen: room.game.fen(),
      turn: room.game.turn(),
      status: getGameStatus(room.game)
    });
  });

  socket.on('resign', (rawRoomId) => {
    const code = cleanCode(rawRoomId);
    const room = rooms.get(code);
    if (!room || !room.players.includes(socket.id) || room.gameOver) return;

    const winner = room.colors[socket.id] === 'w' ? room.names[room.players[1]] : room.names[room.players[0]];
    room.gameOver = true;
    io.to(code).emit('gameOver', `${room.names[socket.id]} resigned. ${winner} wins!`);
  });

  socket.on('newGame', (rawRoomId) => {
    const code = cleanCode(rawRoomId);
    const room = rooms.get(code);
    if (!room || !room.players.includes(socket.id) || room.players.length !== 2) return;

    room.game = new Chess();
    room.gameOver = false;
    io.to(code).emit('newGameStarted');
    sendGameState(code);
  });

  socket.on('disconnect', () => {
    const [code, room] = getRoomForSocket(socket.id);
    if (!room) return;

    room.players = room.players.filter(id => id !== socket.id);
    delete room.names[socket.id];
    delete room.colors[socket.id];

    if (room.players.length === 0) {
      rooms.delete(code);
      return;
    }

    io.to(code).emit('opponentLeft', 'Your opponent left. This room has been closed.');
    rooms.delete(code);
  });
});

function getGameStatus(game) {
  if (game.isCheckmate()) return `Checkmate — ${game.turn() === 'w' ? 'Black' : 'White'} wins`;
  if (game.isDraw()) return 'Draw';
  if (game.isStalemate()) return 'Draw by stalemate';
  if (game.isThreefoldRepetition()) return 'Draw by threefold repetition';
  if (game.isInsufficientMaterial()) return 'Draw by insufficient material';
  return game.inCheck() ? `${game.turn() === 'w' ? 'White' : 'Black'} is in check` : '';
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Game-Hub running on http://localhost:${PORT}`));
