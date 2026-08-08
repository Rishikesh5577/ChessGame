# ChessBet: Online Chess Platform
ChessBet is an online chess platform where players can engage in player-versus-player (PvP) matches or compete against AI. The platform supports both rated games and friendly matches, catering to a wide audience ranging from complete beginners to seasoned chess veterans. ChessBet's goal is to make chess more accessible and enjoyable for everyone by eliminating the need for physical boards or in-person opponents. This web-based application is developed with Spring Boot for the backend and React for the frontend.

## Architectural Overview
### Technical Stack
- **Spring Boot** - Backend framework for building REST API applications
- **Spring Data MongoDB** - Provides repository support for MongoDB data access
- **Spring Websocket** - Synchronizes game state between players in real-time
- **MongoDB** - Document database to store game data
- **JUnit** - Facilitates unit testing in Java
- **React + Vite** - Frontend SPA (`client/`)
- **chess.js / react-chessboard** - Browser chess board and move validation

### Design Patterns
- Mode-View-Controller (MVC)
- Repository
- Inversion of Control / Dependency injection

### Implemented Features
- Chess board with drag-and-drop functionality
- Real-time game synchronization using Websockets
- Play against Stockfish at four strength levels, with the server enforcing move legality
- Anonymous and authenticated user support
- Responsive layout for phone, tablet and desktop

### Known Issues
- The Java port of [Chess.js](https://github.com/jhlywa/chess.js) under `backend/src/main/java/com/chessbet/engine`
  fails standard perft checks (see the disabled `ChessPerftTest`), so it is not used for game state.
  Human-vs-human games rely on chess.js in the browser; bot games are validated by Stockfish on the server.

### Future Enhancements
- Resign and draw game options
- Server-side validation for human-vs-human games
- Authenticated game rooms for private matches
- User registration and profile management
- Leaderboard and game history tracking
- Chat functionality between players

## Environment variables

Values are in the real files (gitignored — never commit):
- `backend/.env`
- `client/.env`

### Backend (`backend/.env`)

| Variable | Required | Description |
|---|---|---|
| `MONGODB_URI` | Yes | MongoDB Atlas connection string |
| `SERVER_PORT` | No | HTTP port (default `8000`; hosts may set `PORT`) |
| `APP_CORS_ORIGINS` | Yes for live | Frontend URL(s), comma-separated, no trailing slash |
| `APP_WS_ALLOWED_ORIGIN_PATTERNS` | Yes for live | Same frontend URL(s), or `*` for local |
| `APP_BOT_ENABLED` | No | `false` turns off games against the computer (default `true`) |
| `APP_BOT_ENGINE_PATH` | No | Path to the Stockfish binary. Blank auto-detects |
| `APP_BOT_POOL_SIZE` | No | Concurrent engine processes (default `2`) |
| `APP_BOT_THREADS` | No | Search threads per process (default `1`) |
| `APP_BOT_HASH_MB` | No | Hash table per process in MB (default `64`) |
| `APP_MATCHMAKING_TIMEOUT_MS` | No | Alone in queue → bot after this many ms (default `30000`) |

### Frontend (`client/.env`)

| Variable | Required | Description |
|---|---|---|
| `VITE_API_URL` | Yes | REST base including `/api` |
| `VITE_WS_URL` | Yes | STOMP WebSocket (`ws://` local, `wss://` live) |

Vite bakes `VITE_*` at build time — change URLs, then rebuild.

## Getting Started (local)
1. Install JDK 21+, Node.js, and use MongoDB Atlas (or local Mongo).

2. Backend: `backend/.env` already has local defaults. Keep/update `MONGODB_URI`.

3. Client:
    ```shell
    cd ./client
    npm install
    ```
    `client/.env` already points at local API.

4. Run:
    ```shell
    cd ./backend
    ./gradlew bootRun
    ```
    ```shell
    cd ./client
    npm run dev
    ```

5. URLs:
    - Backend API: http://localhost:8000
    - Frontend UI: http://localhost:8001

> Legacy Angular app remains under `frontend/` but the supported UI is `client/`.

## Matchmaking

Use **Find Match** (home page or PLAY menu). No manual create/join:

- If another player is already searching → instant PvP (random colours)
- If you wait alone for `APP_MATCHMAKING_TIMEOUT_MS` (default **30s**) → automatic game vs Stockfish at **Impossible** strength

Cancel before the timeout to leave the queue without starting a bot game. Disconnect also cancels.

## Playing the computer

The bot is [Stockfish](https://stockfishchess.org/) driven over UCI. The server keeps the move list
for each game, asks Stockfish which moves are legal before accepting one, and asks it for the reply,
so the browser cannot feed the engine an invented position.

Auto-match uses Impossible strength. The Docker image installs Stockfish already. For local development you need the binary yourself:

1. Download a build for your machine from the
   [Stockfish releases](https://github.com/official-stockfish/Stockfish/releases).
2. Put it at `backend/engine/stockfish.exe` (Windows) — that path is auto-detected and gitignored.
   On Linux/macOS, installing `stockfish` on your `PATH` is enough.
3. Anywhere else, point `APP_BOT_ENGINE_PATH` at it.

`GET /api/bot/status` reports whether the engine was found. If it is missing at timeout, matchmaking fails with a clear error instead of hanging.

Strength presets (used when creating a bot game directly via API):

| Level | Engine setting | Think time |
|---|---|---|
| Easy | `UCI_Elo` 1320 | 150 ms |
| Medium | `UCI_Elo` 1800 | 350 ms |
| Hard | `UCI_Elo` 2400 | 600 ms |
| Impossible | No limit, full strength | 1200 ms |

## Deploying (live)

### 1. Backend host
Set these on Railway / Render / Fly / VPS (do not commit secrets):
- `MONGODB_URI`
- `APP_CORS_ORIGINS` = live frontend URL (e.g. `https://your-app.vercel.app`)
- `APP_WS_ALLOWED_ORIGIN_PATTERNS` = same URL
- Port: host `PORT` is used automatically, or set `SERVER_PORT`

Build: `cd backend && ./gradlew bootJar` then run the JAR.

### 2. Frontend
In `client/.env`, set live URLs (`https://…/api` and `wss://…/ws`), then:
```shell
cd ./client
npm run build
```
Deploy `client/dist/`.

### 3. Checklist
- [ ] `.env` files are **not** in git
- [ ] Atlas network access allows your backend host
- [ ] CORS matches exact frontend URL (no trailing slash)
- [ ] Live client uses `https` + `wss`

## Screenshots
![Screenshot 1](./screenshots/screenshot-1.jpg)
![Screenshot 2](./screenshots/screenshot-2.jpg)
![Screenshot 3](./screenshots/screenshot-3.jpg)
