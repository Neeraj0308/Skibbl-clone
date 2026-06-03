const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  score: { type: Number, default: 0 },
  isHost: { type: Boolean, default: false },
  isReady: { type: Boolean, default: false },
  hasGuessedCorrectly: { type: Boolean, default: false },
  avatar: { type: String, default: '' },
});

const strokeSchema = new mongoose.Schema({
  type: { type: String, enum: ['start', 'move', 'end', 'clear'] },
  x: Number,
  y: Number,
  color: String,
  size: Number,
  timestamp: { type: Date, default: Date.now },
});

const roundSchema = new mongoose.Schema({
  roundNumber: Number,
  drawerId: String,
  word: String,
  startTime: Date,
  endTime: Date,
  guessers: [{ playerId: String, timeToGuess: Number, points: Number }],
  strokes: [strokeSchema],
});

const settingsSchema = new mongoose.Schema({
  maxPlayers: { type: Number, default: 8, min: 2, max: 20 },
  rounds: { type: Number, default: 3, min: 1, max: 10 },
  drawTime: { type: Number, default: 80, min: 15, max: 240 },
  wordCount: { type: Number, default: 3, min: 1, max: 5 },
  hints: { type: Number, default: 2, min: 0, max: 5 },
  wordMode: { type: String, enum: ['normal', 'hidden', 'combination'], default: 'normal' },
  isPrivate: { type: Boolean, default: false },
  customWords: [String],
});

const roomSchema = new mongoose.Schema(
  {
    roomId: { type: String, required: true, unique: true },
    players: [playerSchema],
    settings: settingsSchema,
    phase: {
      type: String,
      enum: ['lobby', 'word_selection', 'drawing', 'round_end', 'game_over'],
      default: 'lobby',
    },
    currentRound: { type: Number, default: 0 },
    currentDrawerIndex: { type: Number, default: 0 },
    currentWord: { type: String, default: '' },
    currentWordHints: [String],
    hintsRevealed: { type: Number, default: 0 },
    rounds: [roundSchema],
    chatMessages: [
      {
        playerId: String,
        playerName: String,
        text: String,
        type: { type: String, enum: ['chat', 'guess', 'correct', 'system'], default: 'chat' },
        timestamp: { type: Date, default: Date.now },
      },
    ],
    canvasStrokes: [strokeSchema],
    timerEnd: Date,
    wordOptions: [String],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Room', roomSchema);
