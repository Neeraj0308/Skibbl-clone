import { useGame } from '../../context/GameContext';
import './GameHeader.css';

export default function GameHeader() {
  const { gameState, roomState, playerId, myWord, timeRemaining, isDrawer, chooseWord, wordOptions } = useGame();

  if (!roomState) return null;

  const phase = roomState.phase;
  const drawer = roomState.players.find((p) => p.id === roomState.currentDrawerId);
  const isWordSelection = phase === 'word_selection';
  const amISelectingWord = isWordSelection && isDrawer;

  const timerPercent = gameState?.drawTime
    ? Math.max(0, (timeRemaining / gameState.drawTime) * 100)
    : 100;

  const timerColor = timeRemaining > 20 ? 'var(--success)' : timeRemaining > 10 ? 'var(--warning)' : 'var(--error)';

  return (
    <div className="game-header">
      {/* Round info */}
      <div className="round-info">
        <span className="round-label">Round</span>
        <span className="round-num">{roomState.currentRound}</span>
        <span className="round-of">/ {roomState.settings.rounds}</span>
      </div>

      {/* Word / hint display */}
      <div className="word-display">
        {phase === 'word_selection' && !amISelectingWord && (
          <div className="word-waiting">
            <span className="drawer-name">{drawer?.name}</span>
            <span className="word-status">is choosing a word...</span>
            <span className="thinking-dots">
              <span>.</span><span>.</span><span>.</span>
            </span>
          </div>
        )}

        {phase === 'drawing' && isDrawer && myWord && (
          <div className="word-reveal drawer-word">
            <span className="word-label">Your word:</span>
            <span className="word-text">{myWord}</span>
          </div>
        )}

        {phase === 'drawing' && !isDrawer && (
          <div className="word-hint-display">
            <span className="hint-text">{roomState.currentWordHint || '_ '.repeat(roomState.wordLength).trim()}</span>
            <span className="word-length">({roomState.wordLength} letters)</span>
          </div>
        )}

        {phase === 'round_end' && (
          <div className="round-end-word fade-in">
            <span className="word-label">The word was:</span>
            <span className="round-end-word-text">
              {/* Word revealed by backend via chat/event */}
            </span>
          </div>
        )}
      </div>

      {/* Timer */}
      {phase === 'drawing' && (
        <div className="timer-section">
          <div className="timer-num" style={{ color: timerColor }}>
            {timeRemaining}
          </div>
          <div className="timer-bar-track">
            <div
              className="timer-bar-fill"
              style={{ width: `${timerPercent}%`, background: timerColor, transition: 'width 0.9s linear, background 0.3s' }}
            />
          </div>
        </div>
      )}

      {/* Word selection overlay */}
      {amISelectingWord && wordOptions && (
        <div className="word-selection-overlay">
          <div className="word-selection-card card fade-in">
            <h3>🎨 Choose your word!</h3>
            <p>You have 15 seconds to pick. If you don't choose, one will be picked for you.</p>
            <div className="word-options">
              {wordOptions.map((word) => (
                <button key={word} className="word-option-btn btn btn-primary" onClick={() => chooseWord(word)}>
                  {word}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
