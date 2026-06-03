export interface Player {
  id: string;
  name: string;
  score: number;
  isHost: boolean;
  isReady: boolean;
  hasGuessedCorrectly: boolean;
  avatar?: string;
  disconnected?: boolean;
}

export interface RoomSettings {
  maxPlayers: number;
  rounds: number;
  drawTime: number;
  wordCount: number;
  hints: number;
  wordMode: 'normal' | 'hidden' | 'combination';
  isPrivate: boolean;
  customWords: string[];
}

export type GamePhase = 'lobby' | 'word_selection' | 'drawing' | 'round_end' | 'game_over';

export interface RoomState {
  roomId: string;
  players: Player[];
  settings: RoomSettings;
  phase: GamePhase;
  currentRound: number;
  currentDrawerId: string | null;
  hintsRevealed: number;
  currentWordHint: string;
  wordLength: number;
  timerEnd: number | null;
  chatMessages: ChatMessage[];
}

export interface ChatMessage {
  playerId: string;
  playerName: string;
  text: string;
  type: 'chat' | 'guess' | 'correct' | 'system';
  isClose?: boolean;
  timestamp: number;
}

export interface DrawStroke {
  type: 'start' | 'move' | 'end' | 'clear';
  x?: number;
  y?: number;
  color?: string;
  size?: number;
  timestamp?: number;
}

export interface GameState {
  phase: GamePhase;
  round: number;
  totalRounds: number;
  drawerId: string;
  drawerName: string;
  wordLength: number;
  hint?: string;
  timerEnd?: number;
  drawTime: number;
}

export interface PublicRoom {
  roomId: string;
  playerCount: number;
  maxPlayers: number;
  rounds: number;
  drawTime: number;
  phase: GamePhase;
}
