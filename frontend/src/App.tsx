import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SocketProvider } from './context/SocketContext';
import { GameProvider, useGame } from './context/GameContext';
import HomePage from './pages/HomePage';
import LobbyPage from './pages/LobbyPage';
import GamePage from './pages/GamePage';
import GameOverPage from './pages/GameOverPage';

function AppRoutes() {
  const { roomState } = useGame();

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route
        path="/room/:roomId"
        element={
          !roomState ? <Navigate to="/" replace /> :
          roomState.phase === 'game_over' ? <GameOverPage /> :
          roomState.phase === 'lobby' ? <LobbyPage /> :
          <GamePage />
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <SocketProvider>
        <GameProvider>
          <AppRoutes />
        </GameProvider>
      </SocketProvider>
    </BrowserRouter>
  );
}
