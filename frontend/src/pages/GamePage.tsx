import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import DrawingCanvas from '../components/Canvas/Canvas';
import Chat from '../components/Chat/Chat';
import PlayerList from '../components/Game/PlayerList';
import GameHeader from '../components/Game/GameHeader';
import RoundEnd from '../components/Game/RoundEnd';
import './GamePage.css';

export default function GamePage() {
  const navigate = useNavigate();
  const { roomState, playerId, isDrawer, leaveRoom } = useGame();

  useEffect(() => {
    if (!roomState) navigate('/');
    if (roomState?.phase === 'game_over') navigate(`/room/${roomState.roomId}`);
  }, [roomState, navigate]);

  if (!roomState) return null;

  const handleLeave = () => { leaveRoom(); navigate('/'); };

  return (
    <div className="game-page">
      {/* Top bar */}
      <div className="game-topbar">
        <div className="game-logo">🎨 Skribbl</div>
        <GameHeader />
        <button className="btn btn-secondary btn-sm leave-btn" onClick={handleLeave}>✕ Leave</button>
      </div>

      {/* Main layout */}
      <div className="game-layout">
        {/* Left: Player list */}
        <aside className="game-sidebar left">
          <PlayerList />
        </aside>

        {/* Center: Canvas */}
        <main className="game-main">
          <DrawingCanvas isDrawer={isDrawer} />
        </main>

        {/* Right: Chat */}
        <aside className="game-sidebar right">
          <Chat />
        </aside>
      </div>

      {/* Overlays */}
      <RoundEnd />
    </div>
  );
}
