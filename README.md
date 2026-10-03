# Game-Hub

A gaming community where simple and group games are available.

Currently features **Online Chess** – create a room, share a short invite code with a friend, and play in real time.

## Features

- Create a private room with a 6-character invite code
- Join a room by entering the code
- Real-time multiplayer via WebSockets (Socket.IO)
- Standard chess rules (chess.js)
- Drag-and-drop board (chessboard.js)
- Resign & New Game options
- About page describing the community
- No accounts required

## Requirements

- Node.js 16+ (or any recent LTS)
- npm

## Setup

```bash
cd online-chess   # or Game-Hub folder after unzip

npm install
npm start
```

Open **http://localhost:3000**

- Chess game: http://localhost:3000/
- About page:  http://localhost:3000/about.html

## How to Play Chess

1. Click **Create Room** → receive a 6-character code.
2. Share the code with your friend.
3. Friend enters the code and clicks **Join Room**.
4. Game starts. White moves first.
5. Drag pieces to move. Only your color is playable on your turn.

You can test both sides by opening two browser tabs.

## Project Structure

```
online-chess/
├── package.json
├── server.js
├── public/
│   ├── index.html      # Chess lobby + board
│   └── about.html      # About Game-Hub
└── README.md
```

## Notes

- Rooms are stored in memory (reset when the server restarts).
- No user accounts or saved games yet.
- Pawn promotion always becomes a Queen.
- More games can be added later under the same Game-Hub brand.

## License

MIT – free to use and modify.
