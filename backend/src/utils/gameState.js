/**
 * In-memory game state for active rooms.
 * MongoDB is used for persistence; this is the live working state.
 */

const activeRooms = new Map(); // roomId -> GameRoom instance

class Player {
  constructor({ id, name, socketId, isHost = false }) {
    this.id = id;
    this.name = name;
    this.socketId = socketId;
    this.score = 0;
    this.isHost = isHost;
    this.isReady = false;
    this.hasGuessedCorrectly = false;
    this.avatar = '';
    this.disconnected = false;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      score: this.score,
      isHost: this.isHost,
      isReady: this.isReady,
      hasGuessedCorrectly: this.hasGuessedCorrectly,
      avatar: this.avatar,
      disconnected: this.disconnected,
    };
  }
}

class GameRoom {
  constructor({ roomId, hostId, settings }) {
    this.roomId = roomId;
    this.players = new Map(); // playerId -> Player
    this.settings = {
      maxPlayers: 8,
      rounds: 3,
      drawTime: 80,
      wordCount: 3,
      hints: 2,
      wordMode: 'normal',
      isPrivate: false,
      customWords: [],
      ...settings,
    };
    this.phase = 'lobby'; // lobby | word_selection | drawing | round_end | game_over
    this.currentRound = 0;
    this.currentDrawerIndex = 0;
    this.drawerOrder = []; // array of playerIds in drawer order
    this.currentWord = '';
    this.currentWordHints = [];
    this.hintsRevealed = 0;
    this.wordOptions = [];
    this.canvasStrokes = []; // [{type, x, y, color, size}]
    this.timerEnd = null;
    this.timerInterval = null;
    this.hintInterval = null;
    this.correctGuessCount = 0;
    this.chatMessages = [];
    this.hostId = hostId;
    this.createdAt = new Date();
    this.wordSelectionTimeout = null;
  }

  addPlayer(player) {
    this.players.set(player.id, player);
    if (this.drawerOrder.length === 0 || !this.drawerOrder.includes(player.id)) {
      this.drawerOrder.push(player.id);
    }
  }

  removePlayer(playerId) {
    this.players.delete(playerId);
    this.drawerOrder = this.drawerOrder.filter((id) => id !== playerId);
  }

  getPlayer(playerId) {
    return this.players.get(playerId);
  }

  getCurrentDrawer() {
    const drawerId = this.drawerOrder[this.currentDrawerIndex % this.drawerOrder.length];
    return this.players.get(drawerId);
  }

  getActivePlayers() {
    return Array.from(this.players.values()).filter((p) => !p.disconnected);
  }

  getLeaderboard() {
    return Array.from(this.players.values())
      .map((p) => p.toJSON())
      .sort((a, b) => b.score - a.score);
  }

  toPublicJSON() {
    return {
      roomId: this.roomId,
      players: Array.from(this.players.values()).map((p) => p.toJSON()),
      settings: this.settings,
      phase: this.phase,
      currentRound: this.currentRound,
      currentDrawerId: this.getCurrentDrawer()?.id || null,
      hintsRevealed: this.hintsRevealed,
      currentWordHint: this.currentWordHints[this.hintsRevealed] || '',
      wordLength: this.currentWord.length,
      timerEnd: this.timerEnd,
      chatMessages: this.chatMessages.slice(-50),
    };
  }

  clearCanvas() {
    this.canvasStrokes = [];
  }

  undoLastStroke() {
    // Find last draw_end index and remove strokes after last draw_start
    let lastStartIdx = -1;
    for (let i = this.canvasStrokes.length - 1; i >= 0; i--) {
      if (this.canvasStrokes[i].type === 'start') {
        lastStartIdx = i;
        break;
      }
    }
    if (lastStartIdx !== -1) {
      this.canvasStrokes = this.canvasStrokes.slice(0, lastStartIdx);
    }
  }

  resetForNewRound() {
    this.currentWord = '';
    this.currentWordHints = [];
    this.hintsRevealed = 0;
    this.wordOptions = [];
    this.canvasStrokes = [];
    this.correctGuessCount = 0;
    // Reset player guessing state
    this.players.forEach((p) => {
      p.hasGuessedCorrectly = false;
    });
  }
}

function createRoom(roomId, hostId, settings) {
  const room = new GameRoom({ roomId, hostId, settings });
  activeRooms.set(roomId, room);
  return room;
}

function getRoom(roomId) {
  return activeRooms.get(roomId);
}

function deleteRoom(roomId) {
  const room = activeRooms.get(roomId);
  if (room) {
    if (room.timerInterval) clearInterval(room.timerInterval);
    if (room.hintInterval) clearInterval(room.hintInterval);
    if (room.wordSelectionTimeout) clearTimeout(room.wordSelectionTimeout);
  }
  activeRooms.delete(roomId);
}

function getAllPublicRooms() {
  const rooms = [];
  activeRooms.forEach((room) => {
    if (!room.settings.isPrivate && room.phase === 'lobby') {
      rooms.push({
        roomId: room.roomId,
        playerCount: room.players.size,
        maxPlayers: room.settings.maxPlayers,
        rounds: room.settings.rounds,
        drawTime: room.settings.drawTime,
        phase: room.phase,
      });
    }
  });
  return rooms;
}

module.exports = {
  Player,
  GameRoom,
  createRoom,
  getRoom,
  deleteRoom,
  getAllPublicRooms,
  activeRooms,
};
