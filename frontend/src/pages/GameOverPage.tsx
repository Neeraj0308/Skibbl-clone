import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import './GameOverPage.css';

const AVATAR_COLORS = [
  '#6c63ff','#ff6584','#43e97b','#ffd166','#06d6a0',
  '#ef476f','#118ab2','#ffd60a','#e63946','#2ec4b6',
];

const MEDAL = ['🥇','🥈','🥉'];

export default function GameOverPage() {
  const navigate = useNavigate();
  const { roomState, playerId, leaveRoom } = useGame();
  const confettiRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    spawnConfetti();
  }, []);

  if (!roomState) { navigate('/'); return null; }

  const sorted = [...roomState.players].sort((a, b) => b.score - a.score);
  const winner = sorted[0];
  const isWinner = winner?.id === playerId;

  const handlePlayAgain = () => {
    // Return to lobby - in a real app you'd reset the room
    navigate('/');
  };

  return (
    <div className="game-over-page">
      <div ref={confettiRef} className="confetti-container" />

      <div className="go-container fade-in">
        {/* Winner announcement */}
        <div className="winner-section">
          <div className="trophy-icon">🏆</div>
          <h1 className="go-title">
            {isWinner ? (
              <span className="gradient-text">You Won!</span>
            ) : (
              <><span style={{ color: 'var(--warning)' }}>{winner?.name}</span> Wins!</>
            )}
          </h1>
          <p className="go-subtitle">
            {isWinner ? 'Congratulations, amazing drawing and guessing!' : `${winner?.name} is the ultimate artist!`}
          </p>
          {isWinner && <div className="winner-celebration">🎊 🎨 🎉</div>}
        </div>

        {/* Podium */}
        {sorted.length >= 3 && (
          <div className="podium">
            {[sorted[1], sorted[0], sorted[2]].map((player, podiumIdx) => {
              if (!player) return <div key={podiumIdx} />;
              const rank = podiumIdx === 0 ? 2 : podiumIdx === 1 ? 1 : 3;
              const heights = [80, 110, 60];
              const origIdx = roomState.players.findIndex(p => p.id === player.id);
              return (
                <div key={player.id} className={`podium-place rank-${rank}`} style={{ height: heights[podiumIdx] }}>
                  <div className="podium-avatar" style={{ background: AVATAR_COLORS[origIdx % AVATAR_COLORS.length] }}>
                    {player.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="podium-medal">{MEDAL[rank - 1]}</div>
                  <div className="podium-name">{player.name}</div>
                  <div className="podium-pts">{player.score}</div>
                </div>
              );
            })}
          </div>
        )}

        {/* Full leaderboard */}
        <div className="leaderboard card">
          <h2 className="lb-title">🏅 Final Standings</h2>
          <div className="lb-list">
            {sorted.map((player, i) => {
              const isMe = player.id === playerId;
              const origIdx = roomState.players.findIndex(p => p.id === player.id);
              return (
                <div key={player.id} className={`lb-row ${isMe ? 'me' : ''} ${i === 0 ? 'winner' : ''}`}>
                  <div className="lb-rank">
                    {i < 3 ? MEDAL[i] : `#${i + 1}`}
                  </div>
                  <div className="lb-avatar" style={{ background: AVATAR_COLORS[origIdx % AVATAR_COLORS.length] }}>
                    {player.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="lb-name">
                    {player.name}
                    {isMe && <span className="lb-you">you</span>}
                  </div>
                  <div className="lb-score">{player.score} pts</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="go-actions">
          <button className="btn btn-primary btn-lg" onClick={handlePlayAgain}>
            🎮 Play Again
          </button>
          <button className="btn btn-secondary" onClick={() => { leaveRoom(); navigate('/'); }}>
            🏠 Home
          </button>
        </div>
      </div>
    </div>
  );
}

function spawnConfetti() {
  const container = document.querySelector('.confetti-container');
  if (!container) return;

  const colors = ['#6c63ff','#ff6584','#43e97b','#ffd166','#06d6a0','#ef476f'];
  for (let i = 0; i < 80; i++) {
    const el = document.createElement('div');
    el.className = 'confetti-piece';
    el.style.cssText = `
      left: ${Math.random() * 100}%;
      width: ${Math.random() * 10 + 6}px;
      height: ${Math.random() * 10 + 6}px;
      background: ${colors[Math.floor(Math.random() * colors.length)]};
      animation-delay: ${Math.random() * 3}s;
      animation-duration: ${Math.random() * 2 + 2}s;
      border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
    `;
    container.appendChild(el);
    setTimeout(() => el.remove(), 5000);
  }
}
