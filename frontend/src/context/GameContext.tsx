import React, { createContext, useContext, useEffect, useReducer, useCallback } from 'react';
import { useSocket } from './SocketContext';
import type { Player, RoomState, ChatMessage, GameState, DrawStroke, RoomSettings } from '../types';

interface GameContextValue {
  // State
  playerId: string | null;
  playerName: string | null;
  roomState: RoomState | null;
  gameState: GameState | null;
  myWord: string | null;
  wordOptions: string[] | null;
  canvasStrokes: DrawStroke[];
  timeRemaining: number;
  isDrawer: boolean;

  // Actions
  createRoom: (playerName: string, settings?: Partial<RoomSettings>) => void;
  joinRoom: (roomId: string, playerName: string) => void;
  startGame: () => void;
  chooseWord: (word: string) => void;
  sendGuess: (text: string) => void;
  sendChat: (text: string) => void;
  sendDrawStart: (x: number, y: number, color: string, size: number) => void;
  sendDrawMove: (x: number, y: number) => void;
  sendDrawEnd: () => void;
  sendClearCanvas: () => void;
  sendUndo: () => void;
  setReady: (ready: boolean) => void;
  updateSettings: (settings: Partial<RoomSettings>) => void;
  kickPlayer: (targetId: string) => void;
  leaveRoom: () => void;
}

const GameContext = createContext<GameContextValue | null>(null);

interface GameStore {
  playerId: string | null;
  playerName: string | null;
  roomState: RoomState | null;
  gameState: GameState | null;
  myWord: string | null;
  wordOptions: string[] | null;
  canvasStrokes: DrawStroke[];
  timeRemaining: number;
}

type Action =
  | { type: 'SET_PLAYER'; payload: { id: string; name: string } }
  | { type: 'SET_ROOM'; payload: RoomState }
  | { type: 'SET_GAME_STATE'; payload: GameState }
  | { type: 'SET_MY_WORD'; payload: string }
  | { type: 'SET_WORD_OPTIONS'; payload: string[] }
  | { type: 'CLEAR_WORD_OPTIONS' }
  | { type: 'ADD_CHAT'; payload: ChatMessage }
  | { type: 'UPDATE_PLAYERS'; payload: Player[] }
  | { type: 'ADD_STROKE'; payload: DrawStroke }
  | { type: 'CLEAR_CANVAS' }
  | { type: 'UNDO_CANVAS'; payload: DrawStroke[] }
  | { type: 'SET_TIMER'; payload: number }
  | { type: 'UPDATE_HINT'; payload: string }
  | { type: 'UPDATE_ROOM_FROM_GAME_STATE'; payload: GameState }
  | { type: 'RESET' };

function reducer(state: GameStore, action: Action): GameStore {
  switch (action.type) {
    case 'SET_PLAYER':
      return { ...state, playerId: action.payload.id, playerName: action.payload.name };
    case 'SET_ROOM':
      return { ...state, roomState: action.payload };
    case 'SET_GAME_STATE':
      return { ...state, gameState: action.payload, canvasStrokes: [] };
    case 'SET_MY_WORD':
      return { ...state, myWord: action.payload };
    case 'SET_WORD_OPTIONS':
      return { ...state, wordOptions: action.payload };
    case 'CLEAR_WORD_OPTIONS':
      return { ...state, wordOptions: null, myWord: null };
    case 'ADD_CHAT':
      return {
        ...state,
        roomState: state.roomState
          ? { ...state.roomState, chatMessages: [...state.roomState.chatMessages.slice(-99), action.payload] }
          : state.roomState,
      };
    case 'UPDATE_PLAYERS':
      return {
        ...state,
        roomState: state.roomState ? { ...state.roomState, players: action.payload } : state.roomState,
      };
    case 'ADD_STROKE':
      return { ...state, canvasStrokes: [...state.canvasStrokes, action.payload] };
    case 'CLEAR_CANVAS':
      return { ...state, canvasStrokes: [] };
    case 'UNDO_CANVAS':
      return { ...state, canvasStrokes: action.payload };
    case 'SET_TIMER':
      return { ...state, timeRemaining: action.payload };
    case 'UPDATE_HINT':
      return {
        ...state,
        gameState: state.gameState ? { ...state.gameState, hint: action.payload } : state.gameState,
        roomState: state.roomState ? { ...state.roomState, currentWordHint: action.payload } : state.roomState,
      };
    case 'UPDATE_ROOM_FROM_GAME_STATE':
      return state.roomState
        ? {
            ...state,
            roomState: {
              ...state.roomState,
              phase: action.payload.phase,
              currentRound: action.payload.round,
              currentDrawerId: action.payload.drawerId,
              wordLength: action.payload.wordLength,
              timerEnd: action.payload.timerEnd ?? state.roomState.timerEnd,
              currentWordHint: action.payload.hint ?? state.roomState.currentWordHint,
            },
          }
        : state;
    case 'RESET':
      return { ...initialState, playerId: state.playerId, playerName: state.playerName };
    default:
      return state;
  }
}

const initialState: GameStore = {
  playerId: null,
  playerName: null,
  roomState: null,
  gameState: null,
  myWord: null,
  wordOptions: null,
  canvasStrokes: [],
  timeRemaining: 0,
};

export function GameProvider({ children }: { children: React.ReactNode }) {
  const { socket } = useSocket();
  const [state, dispatch] = useReducer(reducer, initialState);

  const isDrawer = !!(state.playerId && state.roomState?.currentDrawerId === state.playerId);

  // ── Socket event listeners ──────────────────────────────
  useEffect(() => {
    if (!socket) return;

    socket.on('room_update', (room: RoomState) => dispatch({ type: 'SET_ROOM', payload: room }));
    socket.on('game_state', (gs: GameState) => {
      dispatch({ type: 'SET_GAME_STATE', payload: gs });
      dispatch({ type: 'UPDATE_ROOM_FROM_GAME_STATE', payload: gs });
      dispatch({ type: 'CLEAR_WORD_OPTIONS' });
    });
    socket.on('round_start', ({ wordOptions }: { wordOptions: string[] }) => {
      dispatch({ type: 'SET_WORD_OPTIONS', payload: wordOptions });
    });
    socket.on('your_word', ({ word }: { word: string }) => {
      dispatch({ type: 'SET_MY_WORD', payload: word });
    });
    socket.on('chat_message', (msg: ChatMessage) => dispatch({ type: 'ADD_CHAT', payload: msg }));
    socket.on('score_update', ({ players }: { players: Player[] }) => dispatch({ type: 'UPDATE_PLAYERS', payload: players }));
    socket.on('player_joined', ({ players }: { players: Player[] }) => dispatch({ type: 'UPDATE_PLAYERS', payload: players }));
    socket.on('player_left', ({ players }: { players: Player[] }) => dispatch({ type: 'UPDATE_PLAYERS', payload: players }));
    socket.on('draw_data', (stroke: DrawStroke) => dispatch({ type: 'ADD_STROKE', payload: stroke }));
    socket.on('canvas_cleared', () => dispatch({ type: 'CLEAR_CANVAS' }));
    socket.on('canvas_undo', ({ strokes }: { strokes: DrawStroke[] }) => dispatch({ type: 'UNDO_CANVAS', payload: strokes }));
    socket.on('timer_update', ({ remaining }: { remaining: number }) => dispatch({ type: 'SET_TIMER', payload: remaining }));
    socket.on('hint_reveal', ({ hint }: { hint: string }) => dispatch({ type: 'UPDATE_HINT', payload: hint }));
    socket.on('round_end', (data: any) => {
      dispatch({ type: 'SET_GAME_STATE', payload: { ...state.gameState!, phase: 'round_end' } });
      if (state.roomState) {
        dispatch({ type: 'SET_ROOM', payload: { ...state.roomState, phase: 'round_end', players: data.scores } });
      }
      dispatch({ type: 'CLEAR_WORD_OPTIONS' });
    });
    socket.on('game_over', (data: any) => {
      if (state.roomState) {
        dispatch({ type: 'SET_ROOM', payload: { ...state.roomState, phase: 'game_over', players: data.leaderboard } });
      }
    });
    socket.on('kicked', () => {
      alert('You have been kicked from the room.');
      dispatch({ type: 'RESET' });
    });

    return () => {
      socket.off('room_update');
      socket.off('game_state');
      socket.off('round_start');
      socket.off('your_word');
      socket.off('chat_message');
      socket.off('score_update');
      socket.off('player_joined');
      socket.off('player_left');
      socket.off('draw_data');
      socket.off('canvas_cleared');
      socket.off('canvas_undo');
      socket.off('timer_update');
      socket.off('hint_reveal');
      socket.off('round_end');
      socket.off('game_over');
      socket.off('kicked');
    };
  }, [socket, state.roomState, state.gameState]);

  // ── Actions ─────────────────────────────────────────────
  const createRoom = useCallback((playerName: string, settings: Partial<RoomSettings> = {}) => {
    socket?.emit('create_room', { playerName, settings }, (res: any) => {
      if (res.success) {
        dispatch({ type: 'SET_PLAYER', payload: { id: res.playerId, name: playerName } });
      }
    });
  }, [socket]);

  const joinRoom = useCallback((roomId: string, playerName: string) => {
    socket?.emit('join_room', { roomId, playerName }, (res: any) => {
      if (res.success) {
        dispatch({ type: 'SET_PLAYER', payload: { id: res.playerId, name: playerName } });
      }
    });
  }, [socket]);

  const startGame = useCallback(() => {
    if (!state.roomState || !state.playerId) return;
    socket?.emit('start_game', { roomId: state.roomState.roomId, playerId: state.playerId });
  }, [socket, state.roomState, state.playerId]);

  const chooseWord = useCallback((word: string) => {
    if (!state.roomState || !state.playerId) return;
    socket?.emit('word_chosen', { roomId: state.roomState.roomId, playerId: state.playerId, word });
  }, [socket, state.roomState, state.playerId]);

  const sendGuess = useCallback((text: string) => {
    if (!state.roomState || !state.playerId) return;
    socket?.emit('guess', { roomId: state.roomState.roomId, playerId: state.playerId, text });
  }, [socket, state.roomState, state.playerId]);

  const sendChat = useCallback((text: string) => {
    if (!state.roomState || !state.playerId) return;
    socket?.emit('chat', { roomId: state.roomState.roomId, playerId: state.playerId, text });
  }, [socket, state.roomState, state.playerId]);

  const sendDrawStart = useCallback((x: number, y: number, color: string, size: number) => {
    if (!state.roomState || !state.playerId) return;
    socket?.emit('draw_start', { roomId: state.roomState.roomId, playerId: state.playerId, x, y, color, size });
  }, [socket, state.roomState, state.playerId]);

  const sendDrawMove = useCallback((x: number, y: number) => {
    if (!state.roomState || !state.playerId) return;
    socket?.emit('draw_move', { roomId: state.roomState.roomId, playerId: state.playerId, x, y });
  }, [socket, state.roomState, state.playerId]);

  const sendDrawEnd = useCallback(() => {
    if (!state.roomState || !state.playerId) return;
    socket?.emit('draw_end', { roomId: state.roomState.roomId, playerId: state.playerId });
  }, [socket, state.roomState, state.playerId]);

  const sendClearCanvas = useCallback(() => {
    if (!state.roomState || !state.playerId) return;
    socket?.emit('canvas_clear', { roomId: state.roomState.roomId, playerId: state.playerId });
    dispatch({ type: 'CLEAR_CANVAS' });
  }, [socket, state.roomState, state.playerId]);

  const sendUndo = useCallback(() => {
    if (!state.roomState || !state.playerId) return;
    socket?.emit('draw_undo', { roomId: state.roomState.roomId, playerId: state.playerId });
  }, [socket, state.roomState, state.playerId]);

  const setReady = useCallback((ready: boolean) => {
    if (!state.roomState || !state.playerId) return;
    socket?.emit('player_ready', { roomId: state.roomState.roomId, playerId: state.playerId, isReady: ready });
  }, [socket, state.roomState, state.playerId]);

  const updateSettings = useCallback((settings: Partial<RoomSettings>) => {
    if (!state.roomState || !state.playerId) return;
    socket?.emit('update_settings', { roomId: state.roomState.roomId, playerId: state.playerId, settings });
  }, [socket, state.roomState, state.playerId]);

  const kickPlayer = useCallback((targetPlayerId: string) => {
    if (!state.roomState || !state.playerId) return;
    socket?.emit('kick_player', { roomId: state.roomState.roomId, hostId: state.playerId, targetPlayerId });
  }, [socket, state.roomState, state.playerId]);

  const leaveRoom = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  return (
    <GameContext.Provider
      value={{
        ...state,
        isDrawer,
        createRoom,
        joinRoom,
        startGame,
        chooseWord,
        sendGuess,
        sendChat,
        sendDrawStart,
        sendDrawMove,
        sendDrawEnd,
        sendClearCanvas,
        sendUndo,
        setReady,
        updateSettings,
        kickPlayer,
        leaveRoom,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}
