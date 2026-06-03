const { v4: uuidv4 } = require('uuid');
const { nanoid } = require('nanoid');
const Room = require('../models/Room');
const {
  Player,
  createRoom,
  getRoom,
  deleteRoom,
  getAllPublicRooms,
  activeRooms,
} = require('../utils/gameState');
const {
  getRandomWords,
  generateHints,
  checkGuess,
  calculatePoints,
  calculateDrawerPoints,
} = require('../utils/words');

function setupSocketHandlers(io) {
  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // ─────────────────────────────────────────────────────
    // ROOM: Create
    // ─────────────────────────────────────────────────────
    socket.on('create_room', ({ playerName, settings = {} }, callback) => {
      try {
        const roomId = nanoid(6).toUpperCase();
        const playerId = uuidv4();

        const room = createRoom(roomId, playerId, settings);
        const player = new Player({ id: playerId, name: playerName, socketId: socket.id, isHost: true });
        room.addPlayer(player);

        socket.join(roomId);
        socket.data.playerId = playerId;
        socket.data.roomId = roomId;
        socket.data.playerName = playerName;

        // Persist to MongoDB
        persistRoom(room);

        callback?.({ success: true, roomId, playerId, player: player.toJSON() });
        io.to(roomId).emit('room_update', room.toPublicJSON());
        console.log(`🏠 Room created: ${roomId} by ${playerName}`);
      } catch (err) {
        console.error('create_room error:', err);
        callback?.({ success: false, error: err.message });
      }
    });

    // ─────────────────────────────────────────────────────
    // ROOM: Join
    // ─────────────────────────────────────────────────────
    socket.on('join_room', ({ roomId, playerName }, callback) => {
      try {
        const room = getRoom(roomId);
        if (!room) return callback?.({ success: false, error: 'Room not found' });
        if (room.players.size >= room.settings.maxPlayers)
          return callback?.({ success: false, error: 'Room is full' });
        if (room.phase !== 'lobby')
          return callback?.({ success: false, error: 'Game already in progress' });

        const playerId = uuidv4();
        const player = new Player({ id: playerId, name: playerName, socketId: socket.id });
        room.addPlayer(player);

        socket.join(roomId);
        socket.data.playerId = playerId;
        socket.data.roomId = roomId;
        socket.data.playerName = playerName;

        persistRoom(room);

        callback?.({ success: true, roomId, playerId, player: player.toJSON() });
        io.to(roomId).emit('player_joined', { player: player.toJSON(), players: room.toPublicJSON().players });
        io.to(roomId).emit('room_update', room.toPublicJSON());
        
        // System message
        broadcastSystemMessage(io, room, `${playerName} joined the room!`);
        console.log(`👤 ${playerName} joined room ${roomId}`);
      } catch (err) {
        console.error('join_room error:', err);
        callback?.({ success: false, error: err.message });
      }
    });

    // ─────────────────────────────────────────────────────
    // LOBBY: Get room state
    // ─────────────────────────────────────────────────────
    socket.on('get_room', ({ roomId }, callback) => {
      const room = getRoom(roomId);
      if (!room) return callback?.({ success: false, error: 'Room not found' });
      callback?.({ success: true, room: room.toPublicJSON() });
    });

    // ─────────────────────────────────────────────────────
    // LOBBY: Get public rooms
    // ─────────────────────────────────────────────────────
    socket.on('get_public_rooms', (callback) => {
      callback?.({ success: true, rooms: getAllPublicRooms() });
    });

    // ─────────────────────────────────────────────────────
    // LOBBY: Player ready
    // ─────────────────────────────────────────────────────
    socket.on('player_ready', ({ roomId, playerId, isReady }) => {
      const room = getRoom(roomId);
      if (!room) return;
      const player = room.getPlayer(playerId);
      if (!player) return;
      player.isReady = isReady;
      io.to(roomId).emit('room_update', room.toPublicJSON());
    });

    // ─────────────────────────────────────────────────────
    // LOBBY: Update settings (host only)
    // ─────────────────────────────────────────────────────
    socket.on('update_settings', ({ roomId, playerId, settings }) => {
      const room = getRoom(roomId);
      if (!room) return;
      if (room.hostId !== playerId) return;
      room.settings = { ...room.settings, ...settings };
      io.to(roomId).emit('room_update', room.toPublicJSON());
      persistRoom(room);
    });

    // ─────────────────────────────────────────────────────
    // GAME: Start (host only)
    // ─────────────────────────────────────────────────────
    socket.on('start_game', ({ roomId, playerId }) => {
      const room = getRoom(roomId);
      if (!room) return;
      if (room.hostId !== playerId) return;
      if (room.players.size < 2) {
        socket.emit('error_message', { message: 'Need at least 2 players to start' });
        return;
      }

      room.currentRound = 1;
      room.currentDrawerIndex = 0;
      room.drawerOrder = Array.from(room.players.keys());
      // Shuffle drawer order
      room.drawerOrder.sort(() => Math.random() - 0.5);

      startRound(io, room);
    });

    // ─────────────────────────────────────────────────────
    // GAME: Word chosen
    // ─────────────────────────────────────────────────────
    socket.on('word_chosen', ({ roomId, playerId, word }) => {
      const room = getRoom(roomId);
      if (!room) return;
      const drawer = room.getCurrentDrawer();
      if (!drawer || drawer.id !== playerId) return;
      if (room.phase !== 'word_selection') return;

      if (room.wordSelectionTimeout) {
        clearTimeout(room.wordSelectionTimeout);
        room.wordSelectionTimeout = null;
      }

      beginDrawingPhase(io, room, word);
    });

    // ─────────────────────────────────────────────────────
    // DRAWING: draw_start
    // ─────────────────────────────────────────────────────
    socket.on('draw_start', ({ roomId, playerId, x, y, color, size }) => {
      const room = getRoom(roomId);
      if (!room || room.phase !== 'drawing') return;
      const drawer = room.getCurrentDrawer();
      if (!drawer || drawer.id !== playerId) return;

      const stroke = { type: 'start', x, y, color, size, timestamp: Date.now() };
      room.canvasStrokes.push(stroke);
      socket.to(roomId).emit('draw_data', stroke);
    });

    socket.on('draw_move', ({ roomId, playerId, x, y }) => {
      const room = getRoom(roomId);
      if (!room || room.phase !== 'drawing') return;
      const drawer = room.getCurrentDrawer();
      if (!drawer || drawer.id !== playerId) return;

      const stroke = { type: 'move', x, y, timestamp: Date.now() };
      room.canvasStrokes.push(stroke);
      socket.to(roomId).emit('draw_data', stroke);
    });

    socket.on('draw_end', ({ roomId, playerId }) => {
      const room = getRoom(roomId);
      if (!room || room.phase !== 'drawing') return;
      const drawer = room.getCurrentDrawer();
      if (!drawer || drawer.id !== playerId) return;

      const stroke = { type: 'end', timestamp: Date.now() };
      room.canvasStrokes.push(stroke);
      socket.to(roomId).emit('draw_data', stroke);
    });

    // ─────────────────────────────────────────────────────
    // DRAWING: Clear canvas
    // ─────────────────────────────────────────────────────
    socket.on('canvas_clear', ({ roomId, playerId }) => {
      const room = getRoom(roomId);
      if (!room || room.phase !== 'drawing') return;
      const drawer = room.getCurrentDrawer();
      if (!drawer || drawer.id !== playerId) return;

      room.clearCanvas();
      io.to(roomId).emit('canvas_cleared');
    });

    // ─────────────────────────────────────────────────────
    // DRAWING: Undo
    // ─────────────────────────────────────────────────────
    socket.on('draw_undo', ({ roomId, playerId }) => {
      const room = getRoom(roomId);
      if (!room || room.phase !== 'drawing') return;
      const drawer = room.getCurrentDrawer();
      if (!drawer || drawer.id !== playerId) return;

      room.undoLastStroke();
      io.to(roomId).emit('canvas_undo', { strokes: room.canvasStrokes });
    });

    // ─────────────────────────────────────────────────────
    // CHAT: General message
    // ─────────────────────────────────────────────────────
    socket.on('chat', ({ roomId, playerId, text }) => {
      const room = getRoom(roomId);
      if (!room) return;
      const player = room.getPlayer(playerId);
      if (!player) return;

      const msg = {
        playerId,
        playerName: player.name,
        text: text.slice(0, 200),
        type: 'chat',
        timestamp: Date.now(),
      };
      room.chatMessages.push(msg);
      io.to(roomId).emit('chat_message', msg);
    });

    // ─────────────────────────────────────────────────────
    // CHAT: Guess
    // ─────────────────────────────────────────────────────
    socket.on('guess', ({ roomId, playerId, text }) => {
      const room = getRoom(roomId);
      if (!room || room.phase !== 'drawing') return;
      const player = room.getPlayer(playerId);
      if (!player) return;

      const drawer = room.getCurrentDrawer();
      // Drawer can't guess their own word
      if (drawer && drawer.id === playerId) return;
      // Already guessed correctly
      if (player.hasGuessedCorrectly) return;

      const isCorrect = checkGuess(text, room.currentWord);

      if (isCorrect) {
        // Calculate points
        const timeNow = Date.now();
        const timeRemaining = Math.max(0, (room.timerEnd - timeNow) / 1000);
        room.correctGuessCount++;
        const points = calculatePoints(timeRemaining, room.settings.drawTime, room.correctGuessCount);

        player.score += points;
        player.hasGuessedCorrectly = true;

        // Notify all
        io.to(roomId).emit('guess_result', {
          correct: true,
          playerId,
          playerName: player.name,
          points,
        });

        const systemMsg = {
          playerId: 'system',
          playerName: 'System',
          text: `🎉 ${player.name} guessed the word!`,
          type: 'correct',
          timestamp: Date.now(),
        };
        room.chatMessages.push(systemMsg);
        io.to(roomId).emit('chat_message', systemMsg);

        io.to(roomId).emit('score_update', { players: Array.from(room.players.values()).map((p) => p.toJSON()) });

        // Check if all non-drawer players guessed
        const nonDrawers = room.getActivePlayers().filter((p) => p.id !== drawer?.id);
        const allGuessed = nonDrawers.length > 0 && nonDrawers.every((p) => p.hasGuessedCorrectly);
        if (allGuessed) {
          endRound(io, room);
        }
      } else {
        // Check for close guess
        const isClose = isCloseGuess(text, room.currentWord);

        const msg = {
          playerId,
          playerName: player.name,
          text: text.slice(0, 100),
          type: 'guess',
          isClose,
          timestamp: Date.now(),
        };
        room.chatMessages.push(msg);

        // Only broadcast to the guesser and others, but NOT show the word
        io.to(roomId).emit('chat_message', msg);
        io.to(roomId).emit('guess_result', { correct: false, playerId, playerName: player.name, isClose });
      }
    });

    // ─────────────────────────────────────────────────────
    // KICK player (host only)
    // ─────────────────────────────────────────────────────
    socket.on('kick_player', ({ roomId, hostId, targetPlayerId }) => {
      const room = getRoom(roomId);
      if (!room || room.hostId !== hostId) return;
      const target = room.getPlayer(targetPlayerId);
      if (!target) return;

      // Find target socket
      io.in(roomId).fetchSockets().then((sockets) => {
        const targetSocket = sockets.find((s) => s.data.playerId === targetPlayerId);
        if (targetSocket) {
          targetSocket.emit('kicked', { message: 'You have been kicked from the room' });
          targetSocket.leave(roomId);
        }
      });

      room.removePlayer(targetPlayerId);
      broadcastSystemMessage(io, room, `${target.name} was kicked from the room.`);
      io.to(roomId).emit('player_left', { playerId: targetPlayerId, players: Array.from(room.players.values()).map((p) => p.toJSON()) });
      io.to(roomId).emit('room_update', room.toPublicJSON());
    });

    // ─────────────────────────────────────────────────────
    // DISCONNECT
    // ─────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      const { playerId, roomId, playerName } = socket.data;
      if (!roomId || !playerId) return;

      const room = getRoom(roomId);
      if (!room) return;

      const player = room.getPlayer(playerId);
      if (player) {
        player.disconnected = true;
        console.log(`👋 ${playerName} disconnected from room ${roomId}`);

        io.to(roomId).emit('player_left', {
          playerId,
          players: Array.from(room.players.values()).map((p) => p.toJSON()),
        });
        broadcastSystemMessage(io, room, `${playerName} left the room.`);

        // If drawer left during drawing, end round early
        const drawer = room.getCurrentDrawer();
        if (room.phase === 'drawing' && drawer?.id === playerId) {
          endRound(io, room);
        }

        // If host left, transfer host
        if (room.hostId === playerId) {
          const activePlayers = room.getActivePlayers();
          if (activePlayers.length > 0) {
            const newHost = activePlayers[0];
            newHost.isHost = true;
            room.hostId = newHost.id;
            broadcastSystemMessage(io, room, `${newHost.name} is now the host.`);
          }
        }

        // Clean up empty rooms after delay
        setTimeout(() => {
          const activePlayers = room.getActivePlayers();
          if (activePlayers.length === 0) {
            deleteRoom(roomId);
            console.log(`🗑️  Room ${roomId} deleted (empty)`);
          } else {
            room.removePlayer(playerId);
            io.to(roomId).emit('room_update', room.toPublicJSON());
          }
        }, 30000); // 30 second grace period for reconnection
      }
    });

    // ─────────────────────────────────────────────────────
    // RECONNECT
    // ─────────────────────────────────────────────────────
    socket.on('reconnect_player', ({ roomId, playerId }, callback) => {
      const room = getRoom(roomId);
      if (!room) return callback?.({ success: false, error: 'Room not found' });
      const player = room.getPlayer(playerId);
      if (!player) return callback?.({ success: false, error: 'Player not found' });

      player.disconnected = false;
      player.socketId = socket.id;
      socket.join(roomId);
      socket.data.playerId = playerId;
      socket.data.roomId = roomId;
      socket.data.playerName = player.name;

      callback?.({ success: true, room: room.toPublicJSON(), canvasStrokes: room.canvasStrokes });
      io.to(roomId).emit('room_update', room.toPublicJSON());
      broadcastSystemMessage(io, room, `${player.name} reconnected.`);
    });
  });

  // ─────────────────────────────────────────────────────
  // GAME LOGIC HELPERS
  // ─────────────────────────────────────────────────────

  async function startRound(io, room) {
    room.resetForNewRound();
    room.phase = 'word_selection';

    const drawer = room.getCurrentDrawer();
    if (!drawer) {
      endGame(io, room);
      return;
    }

    const wordOptions = getRandomWords(room.settings.wordCount, room.settings.customWords);
    room.wordOptions = wordOptions;

    // Send word options ONLY to drawer
    // findSocketByPlayerId is async — await it and emit via io.to(socketId)
    const drawerRemote = await findSocketByPlayerId(io, room.roomId, drawer.id);
    if (drawerRemote) {
      io.to(drawerRemote.id).emit('round_start', {
        drawerId: drawer.id,
        drawerName: drawer.name,
        wordOptions,
        drawTime: room.settings.drawTime,
        round: room.currentRound,
        totalRounds: room.settings.rounds,
      });
    }

    // Send round_start to everyone else (without word options)
    io.to(room.roomId).emit('game_state', {
      phase: 'word_selection',
      round: room.currentRound,
      totalRounds: room.settings.rounds,
      drawerId: drawer.id,
      drawerName: drawer.name,
      drawTime: room.settings.drawTime,
      wordLength: 0,
    });

    // Auto-pick word after 15s if drawer doesn't choose
    room.wordSelectionTimeout = setTimeout(() => {
      if (room.phase === 'word_selection') {
        const randomWord = wordOptions[Math.floor(Math.random() * wordOptions.length)];
        beginDrawingPhase(io, room, randomWord);
      }
    }, 15000);

    console.log(`🎮 Round ${room.currentRound} started in room ${room.roomId}, drawer: ${drawer.name}`);
  }

  async function beginDrawingPhase(io, room, word) {
    room.phase = 'drawing';
    room.currentWord = word;
    room.currentWordHints = generateHints(word, room.settings.hints);
    room.hintsRevealed = 0;
    room.timerEnd = Date.now() + room.settings.drawTime * 1000;

    const drawer = room.getCurrentDrawer();

    // Tell everyone the word length and first hint (blanks)
    io.to(room.roomId).emit('game_state', {
      phase: 'drawing',
      round: room.currentRound,
      totalRounds: room.settings.rounds,
      drawerId: drawer?.id,
      drawerName: drawer?.name,
      wordLength: word.length,
      hint: room.currentWordHints[0] || word.split('').map(() => '_').join(' '),
      timerEnd: room.timerEnd,
      drawTime: room.settings.drawTime,
    });

    // Send actual word to drawer
    const drawerRemote = await findSocketByPlayerId(io, room.roomId, drawer?.id);
    if (drawerRemote) {
      io.to(drawerRemote.id).emit('your_word', { word });
    }

    // Schedule hint reveals
    if (room.settings.hints > 0) {
      const hintInterval = Math.floor(room.settings.drawTime / (room.settings.hints + 1)) * 1000;
      let hintCount = 0;
      room.hintInterval = setInterval(() => {
        if (room.phase !== 'drawing' || hintCount >= room.settings.hints) {
          clearInterval(room.hintInterval);
          return;
        }
        hintCount++;
        room.hintsRevealed = hintCount;
        const hint = room.currentWordHints[hintCount] || room.currentWordHints[room.currentWordHints.length - 1];
        io.to(room.roomId).emit('hint_reveal', { hint, hintsRevealed: hintCount });
      }, hintInterval);
    }

    // Timer countdown
    room.timerInterval = setInterval(() => {
      const remaining = Math.ceil((room.timerEnd - Date.now()) / 1000);
      io.to(room.roomId).emit('timer_update', { remaining, timerEnd: room.timerEnd });

      if (remaining <= 0) {
        clearInterval(room.timerInterval);
        if (room.phase === 'drawing') {
          endRound(io, room);
        }
      }
    }, 1000);
  }

  function endRound(io, room) {
    if (room.phase === 'round_end' || room.phase === 'game_over' || room.phase === 'lobby') return;

    // Clear timers
    if (room.timerInterval) { clearInterval(room.timerInterval); room.timerInterval = null; }
    if (room.hintInterval) { clearInterval(room.hintInterval); room.hintInterval = null; }
    if (room.wordSelectionTimeout) { clearTimeout(room.wordSelectionTimeout); room.wordSelectionTimeout = null; }

    room.phase = 'round_end';

    // Drawer points
    const drawer = room.getCurrentDrawer();
    if (drawer) {
      const drawerPoints = calculateDrawerPoints(room.correctGuessCount, room.players.size - 1);
      drawer.score += drawerPoints;
    }

    io.to(room.roomId).emit('round_end', {
      word: room.currentWord,
      scores: Array.from(room.players.values()).map((p) => p.toJSON()),
      nextDrawerIndex: room.currentDrawerIndex + 1,
    });

    persistRoom(room);

    // Wait 5s then start next turn
    setTimeout(() => {
      advanceTurn(io, room);
    }, 5000);
  }

  function advanceTurn(io, room) {
    room.currentDrawerIndex++;
    const activePlayers = room.getActivePlayers();

    // Check if round completed (all players drew this round)
    if (room.currentDrawerIndex >= activePlayers.length) {
      room.currentDrawerIndex = 0;
      room.currentRound++;
    }

    // Check if game over
    if (room.currentRound > room.settings.rounds) {
      endGame(io, room);
      return;
    }

    // Rebuild drawer order with active players
    room.drawerOrder = activePlayers.map((p) => p.id);

    startRound(io, room);
  }

  function endGame(io, room) {
    if (room.timerInterval) { clearInterval(room.timerInterval); room.timerInterval = null; }
    if (room.hintInterval) { clearInterval(room.hintInterval); room.hintInterval = null; }

    room.phase = 'game_over';
    const leaderboard = room.getLeaderboard();
    const winner = leaderboard[0] || null;

    io.to(room.roomId).emit('game_over', {
      winner,
      leaderboard,
    });

    persistRoom(room);
    console.log(`🏆 Game over in room ${room.roomId}. Winner: ${winner?.name}`);
  }

  function broadcastSystemMessage(io, room, text) {
    const msg = {
      playerId: 'system',
      playerName: 'System',
      text,
      type: 'system',
      timestamp: Date.now(),
    };
    room.chatMessages.push(msg);
    io.to(room.roomId).emit('chat_message', msg);
  }

  function isCloseGuess(guess, word) {
    const g = guess.trim().toLowerCase();
    const w = word.trim().toLowerCase();
    if (g.length < 3) return false;
    // Simple check: starts with same letters or within 1 edit distance
    if (w.startsWith(g.slice(0, 3))) return true;
    return levenshtein(g, w) <= 1;
  }

  function levenshtein(a, b) {
    const matrix = Array.from({ length: b.length + 1 }, (_, i) => [i]);
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        matrix[i][j] =
          b[i - 1] === a[j - 1]
            ? matrix[i - 1][j - 1]
            : 1 + Math.min(matrix[i - 1][j], matrix[i][j - 1], matrix[i - 1][j - 1]);
      }
    }
    return matrix[b.length][a.length];
  }

  async function findSocketByPlayerId(io, roomId, playerId) {
    const sockets = await io.in(roomId).fetchSockets();
    return sockets.find((s) => s.data.playerId === playerId);
  }

  async function persistRoom(room) {
    try {
      await Room.findOneAndUpdate(
        { roomId: room.roomId },
        {
          roomId: room.roomId,
          players: Array.from(room.players.values()).map((p) => p.toJSON()),
          settings: room.settings,
          phase: room.phase,
          currentRound: room.currentRound,
          isActive: room.phase !== 'game_over',
        },
        { upsert: true, new: true }
      );
    } catch (err) {
      // MongoDB might not be connected; that's OK
    }
  }
}

module.exports = { setupSocketHandlers };
