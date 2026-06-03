import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import './LobbyPage.css';

export default function LobbyPage() {
  const navigate = useNavigate();
  const { roomState, playerId, startGame, setReady, leaveRoom, kickPlayer } = useGame();

  if (!roomState) return null;

  const me = roomState.players.find((p) => p.id === playerId);
  const isHost = me?.isHost;
  const allReady = roomState.players.every((p) => p.isReady || p.isHost);
  const canStart = isHost && roomState.players.length >= 2;

  const shareLink = `${window.location.origin}?room=${roomState.roomId}`;

  const copyLink = () => {
    navigator.clipboard.writeText(shareLink);
  };

  const handleLeave = () => {
    leaveRoom();
    navigate('/');
  };

  return (
    <div className="lobby-page">
      <div className="lobby-bg">
        <div className="home-bg-blob blob1" style={{ opacity: 0.08 }} />
        <div className="home-bg-blob blob2" style={{ opacity: 0.08 }} />
      </div>

      <div className="lobby-container">
        {/* Header */}
        <div className="lobby-header card fade-in">
          <div className="lobby-title-row">
            <h1 className="lobby-title">🏠 Lobby</h1>
            <div className="room-id-badge">
              Room: <strong>{roomState.roomId}</strong>
              <button className="btn btn-sm btn-secondary" onClick={copyLink} title="Copy invite link">
                🔗 Copy Link
              </button>
            </div>
          </div>
          <div className="lobby-settings-row">
            <span>👥 {roomState.players.length}/{roomState.settings.maxPlayers}</span>
            <span>🔄 {roomState.settings.rounds} rounds</span>
            <span>⏱️ {roomState.settings.drawTime}s draw time</span>
            <span>💡 {roomState.settings.hints} hints</span>
            <span>📝 {roomState.settings.wordCount} word choices</span>
            {roomState.settings.isPrivate && <span className="badge badge-warning">🔒 Private</span>}
          </div>
        </div>

        {/* Players grid */}
        <div className="players-grid card fade-in">
          <h2 className="section-title">Players</h2>
          <div className="players-list">
            {roomState.players.map((player, i) => (
              <div key={player.id} className={`player-card ${player.disconnected ? 'disconnected' : ''}`}>
                <div className="player-avatar" style={{ background: getAvatarColor(i) }}>
                  {player.name.charAt(0).toUpperCase()}
                </div>
                <div className="player-info">
                  <span className="player-name">{player.name}</span>
                  <div className="player-badges">
                    {player.isHost && <span className="badge badge-warning">👑 Host</span>}
                    {player.id === playerId && <span className="badge badge-primary">You</span>}
                    {!player.isHost && (
                      <span className={`badge ${player.isReady ? 'badge-success' : 'badge-error'}`}>
                        {player.isReady ? '✓ Ready' : '○ Waiting'}
                      </span>
                    )}
                    {player.disconnected && <span className="badge badge-error">Disconnected</span>}
                  </div>
                </div>
                {isHost && player.id !== playerId && (
                  <button className="btn btn-sm btn-danger kick-btn" onClick={() => kickPlayer(player.id)}>
                    Kick
                  </button>
                )}
              </div>
            ))}
            {/* Empty slots */}
            {Array.from({ length: Math.max(0, roomState.settings.maxPlayers - roomState.players.length) }).slice(0, 4).map((_, i) => (
              <div key={`empty-${i}`} className="player-card empty">
                <div className="player-avatar empty-avatar">?</div>
                <span className="player-name" style={{ color: 'var(--text-dim)' }}>Waiting...</span>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="lobby-actions card fade-in">
          {!isHost && (
            <button
              className={`btn ${me?.isReady ? 'btn-secondary' : 'btn-success'} btn-lg`}
              onClick={() => setReady(!me?.isReady)}
            >
              {me?.isReady ? '✗ Not Ready' : '✓ Ready!'}
            </button>
          )}

          {isHost && (
            <button className="btn btn-primary btn-lg" onClick={startGame} disabled={!canStart}>
              {roomState.players.length < 2 ? '👥 Need 2+ players' : '🚀 Start Game!'}
            </button>
          )}

          <button className="btn btn-secondary" onClick={handleLeave}>
            ← Leave Room
          </button>
        </div>

        {/* How to play */}
        <div className="how-to-play card fade-in">
          <h3>🎮 How to Play</h3>
          <ul>
            <li>🎨 <strong>Drawing turn:</strong> Choose a word and draw it on the canvas</li>
            <li>💭 <strong>Guessing:</strong> Type your guess in the chat to win points</li>
            <li>⚡ <strong>Speed bonus:</strong> Faster correct guesses earn more points</li>
            <li>💡 <strong>Hints:</strong> Letters reveal over time if no one guesses</li>
            <li>🏆 <strong>Winner:</strong> Most points after all rounds wins!</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function getAvatarColor(index: number) {
  const colors = [
    '#6c63ff', '#ff6584', '#43e97b', '#ffd166', '#06d6a0',
    '#ef476f', '#118ab2', '#ffd60a', '#e63946', '#2ec4b6',
  ];
  return colors[index % colors.length];
}
