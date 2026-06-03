# 🎨 Skribbl Clone

A full-stack real-time multiplayer drawing and guessing game — a clone of [skribbl.io](https://skribbl.io).

---

## ✨ Features

### 🏠 Room & Lobby

- Create public or private rooms with configurable settings
- Join by room code or invite link
- Lobby with player list and ready-up system
- Host controls (kick players, start game)
- Browse public open rooms

### 🎮 Gameplay

- Turn-based: one drawer per round, everyone else guesses
- Each drawer picks from N randomly selected words
- Auto-selects word if drawer doesn't pick within 15s
- Points for correct guesses (speed bonus + rank penalty)
- Drawer earns points based on how many guessed correctly
- Hints: letters reveal progressively over time
- Round and game end screens with leaderboard

### 🎨 Drawing Tools

- Brush with adjustable size (5 sizes)
- 20-color palette
- Eraser tool
- Undo last stroke
- Clear entire canvas
- Touch support for mobile drawing

### 💬 Chat & Guessing

- Guess input with close-guess detection (🔥 indicator)
- Case-insensitive, trimmed matching
- System messages for joins, guesses, round events
- Chat persists in room history

### ⚙️ Room Settings (host-configurable)

| Setting      | Range                         |
| ------------ | ----------------------------- |
| Max players  | 2–20                          |
| Rounds       | 1–10                          |
| Draw time    | 15–240 seconds                |
| Word choices | 1–5                           |
| Hints        | 0–5                           |
| Word mode    | Normal / Hidden / Combination |
| Private room | Invite-only link              |
| Custom words | Host can add custom words     |

---

## 🛠️ Tech Stack

| Layer      | Technology                   |
| ---------- | ---------------------------- |
| Frontend   | React 18 + TypeScript + Vite |
| Canvas     | HTML5 Canvas API             |
| Backend    | Node.js + Express            |
| WebSockets | Socket.IO                    |
| Database   | MongoDB + Mongoose           |
| Deployment | Docker / Render / Railway    |

---

## 📁 Project Structure

```
skribbl-clone/
├── backend/
│   ├── src/
│   │   ├── index.js              # Express + Socket.IO server
│   │   ├── models/Room.js        # MongoDB Room schema
│   │   ├── socket/socketHandler.js  # All WS events + game logic
│   │   ├── routes/rooms.js       # REST API routes
│   │   └── utils/
│   │       ├── words.js          # Word list, hints, scoring
│   │       └── gameState.js      # In-memory state (Player, GameRoom classes)
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── App.tsx               # Router + providers
│   │   ├── context/
│   │   │   ├── SocketContext.tsx # Socket.IO connection
│   │   │   └── GameContext.tsx   # Central game state + actions
│   │   ├── pages/
│   │   │   ├── HomePage.tsx      # Create/join/browse rooms
│   │   │   ├── LobbyPage.tsx     # Pre-game lobby
│   │   │   ├── GamePage.tsx      # Main game layout
│   │   │   └── GameOverPage.tsx  # Leaderboard + confetti
│   │   ├── components/
│   │   │   ├── Canvas/Canvas.tsx # Drawing canvas + toolbar
│   │   │   ├── Chat/Chat.tsx     # Chat + guessing panel
│   │   │   └── Game/             # PlayerList, GameHeader, RoundEnd
│   │   └── types/index.ts        # TypeScript interfaces
│   └── Dockerfile
├── docker-compose.yml
├── render.yaml
└── README.md
```

---

## 🚀 Local Development

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)

### Setup

```bash
# 1. Clone and install all dependencies
git clone <repo-url>
cd skribbl-clone
npm run install:all

# 2. Set up backend env
cp backend/.env.example backend/.env
# Edit backend/.env with your MongoDB URI

# 3. Set up frontend env
cp frontend/.env.example frontend/.env
# VITE_BACKEND_URL=http://localhost:3001

# 4. Run both servers concurrently
npm install          # install concurrently
npm run dev
```

**Backend** runs on `http://localhost:3001`  
**Frontend** runs on `http://localhost:5173`

### With Docker (includes MongoDB)

```bash
docker-compose up --build
```

Frontend → `http://localhost:5173`  
Backend → `http://localhost:3001`

---

## 🌐 Deployment

### Render (recommended — WebSocket support)

1. Push to GitHub
2. Create a new **Web Service** for backend:
   - Root: `backend/`
   - Build: `npm install`
   - Start: `node src/index.js`
   - Add env vars: `MONGODB_URI`, `FRONTEND_URL`, `PORT=3001`
3. Create a new **Static Site** for frontend:
   - Root: `frontend/`
   - Build: `npm install && npm run build`
   - Publish: `dist`
   - Add env var: `VITE_BACKEND_URL=<backend-url>`
4. Update `FRONTEND_URL` in backend with the frontend URL
5. Update the live URL in this README

Or use the `render.yaml` Blueprint for one-click deploy.

### Railway

```bash
railway login
railway init
railway up
```

Set env vars in the Railway dashboard.

---

## 🔌 WebSocket Events

### Room & Lobby

| Event           | Direction      | Description               |
| --------------- | -------------- | ------------------------- |
| `create_room`   | Client→Server  | Create room with settings |
| `join_room`     | Client→Server  | Join by room ID + name    |
| `player_joined` | Server→Clients | Broadcast new player      |
| `player_left`   | Server→Clients | Broadcast disconnect      |
| `start_game`    | Client→Server  | Host starts game          |
| `room_update`   | Server→Clients | Full room state sync      |

### Game State

| Event         | Direction      | Description                 |
| ------------- | -------------- | --------------------------- |
| `game_state`  | Server→Clients | Phase, round, drawer info   |
| `round_start` | Server→Drawer  | Word options to choose from |
| `your_word`   | Server→Drawer  | Confirmed chosen word       |
| `word_chosen` | Client→Server  | Drawer selects word         |
| `round_end`   | Server→Clients | Word reveal + scores        |
| `game_over`   | Server→Clients | Winner + leaderboard        |

### Drawing

| Event          | Direction      | Description                  |
| -------------- | -------------- | ---------------------------- |
| `draw_start`   | Client→Server  | Start stroke with color/size |
| `draw_move`    | Client→Server  | Continue stroke              |
| `draw_end`     | Client→Server  | End stroke                   |
| `draw_data`    | Server→Clients | Broadcast stroke to all      |
| `canvas_clear` | Client→Server  | Drawer clears canvas         |
| `draw_undo`    | Client→Server  | Undo last stroke             |

### Chat & Guessing

| Event          | Direction      | Description              |
| -------------- | -------------- | ------------------------ |
| `guess`        | Client→Server  | Player submits guess     |
| `guess_result` | Server→Clients | Correct/incorrect result |
| `chat`         | Client→Server  | General chat message     |
| `chat_message` | Server→Clients | Broadcast message        |
| `hint_reveal`  | Server→Clients | New hint letter revealed |
| `timer_update` | Server→Clients | Countdown tick           |

---

## 🏗️ Architecture Overview

```
Browser (React)
    │
    ├── SocketContext      → manages Socket.IO connection
    ├── GameContext        → central state + dispatches events
    │
    ├── Canvas component   → captures mouse/touch → sendDraw*()
    ├── Chat component     → guess/chat input → sendGuess/sendChat()
    ├── PlayerList         → reactive player scores
    └── GameHeader         → timer, word hint, word selection overlay

Socket.IO Server (Node.js)
    │
    ├── socketHandler.js   → all event handlers
    │   ├── Room events    → create/join/leave
    │   ├── Game logic     → startRound, beginDrawingPhase, endRound, endGame
    │   ├── Drawing relay  → broadcast strokes to room
    │   └── Guess check    → levenshtein + exact match, point calculation
    │
    ├── gameState.js       → in-memory GameRoom + Player classes
    │   ├── GameRoom       → phase, players, strokes, timers
    │   └── Player         → score, guessState, socketId
    │
    └── Room.js (MongoDB)  → persistence for rooms, scores, history
```

### Drawing Sync Flow

1. Drawer `mousedown` → `draw_start` event sent with `{x, y, color, size}`
2. Server validates drawer identity, stores stroke, broadcasts `draw_data` to room
3. All viewer canvases receive `draw_data` and replay stroke
4. On disconnect/reconnect, full `canvasStrokes` array is sent to restore canvas

### Game State Machine

```
lobby → word_selection → drawing → round_end → (next turn or game_over)
```

### Scoring

- **Guesser:** `500 + (timeRemaining/totalTime * 300) - ((rank-1) * 50)`, min 50
- **Drawer:** `correctGuessers * 50`, max 300
- **Close guess:** detected by Levenshtein distance ≤ 1

---

## 🎁 Bonus Features Implemented

- ✅ OOP: `GameRoom` class, `Player` class, `MessageHandler` pattern in socket handler
- ✅ All room settings configurable (draw time, rounds, word count, hints)
- ✅ Custom word list by host
- ✅ Private rooms (invite link)
- ✅ Kick player (host moderation)
- ✅ Auto-select word if drawer is idle
- ✅ Reconnect support (30s grace period)
- ✅ Levenshtein close-guess detection
- ✅ Touch support for mobile drawing
- ✅ MongoDB persistence for room history
  > > > > > > > 170572e (Skibbl-clone)
