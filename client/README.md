# ChessBet Client (React)

Production-oriented React frontend for ChessBet. Talks to the Spring Boot backend over REST + STOMP WebSocket.

## Stack
- React 19 + TypeScript + Vite
- `react-router-dom`
- `@stomp/stompjs`
- `chess.js` + `react-chessboard`

## Setup (local)
```shell
cd client
npm install
npm run dev
```

App: http://localhost:8001

## Env (`client/.env`)
```env
VITE_API_URL=http://localhost:8000/api
VITE_WS_URL=ws://127.0.0.1:8000/ws
```

Live deploy adhi same file madhe `https://…/api` ani `wss://…/ws` set kara, then `npm run build`.
