import { useEffect, useState } from 'react';
import { useGame } from '../../context/GameContext';
import './RoundEnd.css';

export default function RoundEnd() {
  const { roomState } = useGame();
  const [show, setShow] = useState(true);

  useEffect(() => {
    setShow(true);
    const t = setTimeout(() => setShow(false), 4500);
    return () => clearTimeout(t);
  }, [roomState?.currentRound]);

  if (!show || roomState?.phase !== 'round_end') return null;

  const sorted = [...(roomState?.players || [])].sort((a, b) => b.score - a.score);

  return (
    <div className="round-end-overlay">
      <div className="round-end-card card fade-in">
        <div className="re-title">⏰ Round Over!</div>
        <div className="re-next">Next round starting soon...</div>
        <div className="re-scores">
          <div className="re-scores-title">Current Standings</div>
          {sorted.map((p, i) => (
            <div key={p.id} className="re-score-row">
              <span className="re-rank">#{i + 1}</span>
              <span className="re-pname">{p.name}</span>
              <span className="re-pts">{p.score} pts</span>
              {p.hasGuessedCorrectly && <span className="re-guessed">✓ Guessed</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
