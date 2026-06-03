import { useGame } from '../../context/GameContext';
import './PlayerList.css';

const AVATAR_COLORS = [
  '#6c63ff','#ff6584','#43e97b','#ffd166','#06d6a0',
  '#ef476f','#118ab2','#ffd60a','#e63946','#2ec4b6',
];

export default function PlayerList() {
  const { roomState, playerId, gameState } = useGame();
  if (!roomState) return null;

  const sorted = [...roomState.players].sort((a, b) => b.score - a.score);
  const drawerId = roomState.currentDrawerId;

  return (
    <div className="player-list-panel">
      <div className="pl-header">
        <span>🏆 Players</span>
        <span className="pl-count">{roomState.players.length}</span>
      </div>
      <div className="pl-list">
        {sorted.map((player, i) => {
          const isMe = player.id === playerId;
          const isDrawing = player.id === drawerId;
          const idx = roomState.players.indexOf(player);

          return (
            <div
              key={player.id}
              className={`pl-item ${isMe ? 'me' : ''} ${isDrawing ? 'drawing' : ''} ${player.hasGuessedCorrectly ? 'guessed' : ''} ${player.disconnected ? 'disconnected' : ''}`}
            >
              <div className="pl-rank">#{i + 1}</div>
              <div className="pl-avatar" style={{ background: AVATAR_COLORS[idx % AVATAR_COLORS.length] }}>
                {player.name.charAt(0).toUpperCase()}
              </div>
              <div className="pl-info">
                <div className="pl-name-row">
                  <span className="pl-name">{player.name}</span>
                  {isMe && <span className="pl-you">you</span>}
                  {player.isHost && <span className="pl-host">👑</span>}
                </div>
                <div className="pl-score">{player.score} pts</div>
              </div>
              <div className="pl-status">
                {isDrawing && <span className="status-drawing">✏️</span>}
                {!isDrawing && player.hasGuessedCorrectly && <span className="status-guessed">✓</span>}
                {player.disconnected && <span className="status-dc">✗</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
