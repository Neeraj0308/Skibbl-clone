const express = require('express');
const router = express.Router();
const Room = require('../models/Room');
const { getAllPublicRooms, getRoom } = require('../utils/gameState');

// GET /api/rooms - list public active rooms
router.get('/', (req, res) => {
  const rooms = getAllPublicRooms();
  res.json({ success: true, rooms });
});

// GET /api/rooms/:roomId - check if room exists
router.get('/:roomId', (req, res) => {
  const room = getRoom(req.params.roomId);
  if (!room) return res.status(404).json({ success: false, error: 'Room not found' });
  res.json({
    success: true,
    room: {
      roomId: room.roomId,
      playerCount: room.players.size,
      maxPlayers: room.settings.maxPlayers,
      phase: room.phase,
      isPrivate: room.settings.isPrivate,
    },
  });
});

// GET /api/rooms/history - past games from MongoDB
router.get('/history/all', async (req, res) => {
  try {
    const rooms = await Room.find({ phase: 'game_over' })
      .sort({ updatedAt: -1 })
      .limit(20)
      .select('roomId players settings currentRound updatedAt');
    res.json({ success: true, rooms });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
