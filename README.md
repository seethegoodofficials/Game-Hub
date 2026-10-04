# Game-Hub Chess

A real-time online chess community website for exactly two players per private room.

## Features

- Player chooses a display name before playing
- Create a private 6-character room code
- Share the code with one opponent
- Exactly two players per room: White and Black
- Real-time chess using Socket.IO
- Server-side chess move validation with `chess.js`
- Resign and New Game controls
- No accounts or registration
- Responsive mobile-friendly interface

## Run locally

```bash
npm install
npm start
```

Open `http://localhost:3000`.

To test two players locally, open the site in two browser tabs/windows, use different names, create a room in one and join it from the other.

## Project structure

```text
Game-Hub/
├── public/
│   ├── index.html
│   └── about.html
├── server.js
├── package.json
└── README.md
```

## Notes

Rooms and games are stored in server memory. Restarting the server closes all rooms. There are no accounts or saved games.

## License

MIT
