import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import { useSocket } from '../context/SocketContext';
import type { PublicRoom, RoomSettings } from '../types';
import './HomePage.css';

const DEFAULT_SETTINGS: RoomSettings = {
  maxPlayers: 8,
  rounds: 3,
  drawTime: 80,
  wordCount: 3,
  hints: 2,
  wordMode: 'normal',
  isPrivate: false,
  customWords: [],
};

export default function HomePage() {
  const navigate = useNavigate();
  const { socket, connected } = useSocket();
  const { createRoom, joinRoom, roomState } = useGame();

  const [tab, setTab] = useState<'create' | 'join' | 'public'>('create');
  const [playerName, setPlayerName] = useState('');
  const [joinRoomId, setJoinRoomId] = useState('');
  const [settings, setSettings] = useState<RoomSettings>(DEFAULT_SETTINGS);
  const [publicRooms, setPublicRooms] = useState<PublicRoom[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [customWordInput, setCustomWordInput] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Navigate when room is set
  useEffect(() => {
    if (roomState) {
      navigate(`/room/${roomState.roomId}`);
    }
  }, [roomState, navigate]);

  // Load from URL params (join via link)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const rid = params.get('room');
    if (rid) { setJoinRoomId(rid); setTab('join'); }
  }, []);

  // Fetch public rooms
  useEffect(() => {
    if (tab === 'public') {
      socket?.emit('get_public_rooms', (res: any) => {
        if (res.success) setPublicRooms(res.rooms);
      });
    }
  }, [tab, socket]);

  const handleCreate = async () => {
    if (!playerName.trim()) return setError('Please enter your name');
    setLoading(true); setError('');
    createRoom(playerName.trim(), settings);
    setTimeout(() => setLoading(false), 2000);
  };

  const handleJoin = async () => {
    if (!playerName.trim()) return setError('Please enter your name');
    if (!joinRoomId.trim()) return setError('Please enter a room code');
    setLoading(true); setError('');
    joinRoom(joinRoomId.trim().toUpperCase(), playerName.trim());
    setTimeout(() => setLoading(false), 2000);
  };

  const handleJoinPublic = (roomId: string) => {
    if (!playerName.trim()) return setError('Please enter your name first');
    setLoading(true); setError('');
    joinRoom(roomId, playerName.trim());
    setTimeout(() => setLoading(false), 2000);
  };

  const addCustomWord = () => {
    const w = customWordInput.trim();
    if (w && !settings.customWords.includes(w)) {
      setSettings({ ...settings, customWords: [...settings.customWords, w] });
    }
    setCustomWordInput('');
  };

  return (
    <div className="home-page">
      <div className="home-bg">
        <div className="home-bg-blob blob1" />
        <div className="home-bg-blob blob2" />
        <div className="home-bg-blob blob3" />
      </div>

      <div className="home-container">
        {/* Header */}
        <div className="home-header fade-in">
          <div className="home-logo">🎨</div>
          <h1 className="home-title">
            <span className="gradient-text">Skribbl</span>
            <span className="home-title-dot">.</span>clone
          </h1>
          <p className="home-subtitle">Draw, Guess &amp; Have Fun with Friends!</p>
          <div className={`conn-badge ${connected ? 'conn-ok' : 'conn-bad'}`}>
            <span className="conn-dot" />
            {connected ? 'Connected' : 'Connecting...'}
          </div>
        </div>

        {/* Name input (always visible) */}
        <div className="name-section card fade-in">
          <label className="form-label">Your Name</label>
          <input
            className="input"
            placeholder="Enter your nickname..."
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value.slice(0, 20))}
            maxLength={20}
            onKeyDown={(e) => e.key === 'Enter' && (tab === 'join' ? handleJoin() : handleCreate())}
          />
        </div>

        {/* Tabs */}
        <div className="tabs card fade-in">
          <div className="tab-buttons">
            {(['create', 'join', 'public'] as const).map((t) => (
              <button key={t} className={`tab-btn ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
                {t === 'create' ? '🏠 Create Room' : t === 'join' ? '🔑 Join Room' : '🌐 Public Rooms'}
              </button>
            ))}
          </div>

          {/* CREATE */}
          {tab === 'create' && (
            <div className="tab-content slide-in">
              <div className="settings-grid">
                <SettingSlider label="Max Players" min={2} max={20} value={settings.maxPlayers} icon="👥"
                  onChange={(v) => setSettings({ ...settings, maxPlayers: v })} />
                <SettingSlider label="Rounds" min={1} max={10} value={settings.rounds} icon="🔄"
                  onChange={(v) => setSettings({ ...settings, rounds: v })} />
                <SettingSlider label="Draw Time (s)" min={15} max={240} value={settings.drawTime} icon="⏱️"
                  onChange={(v) => setSettings({ ...settings, drawTime: v })} />
                <SettingSlider label="Word Choices" min={1} max={5} value={settings.wordCount} icon="📝"
                  onChange={(v) => setSettings({ ...settings, wordCount: v })} />
                <SettingSlider label="Hints" min={0} max={5} value={settings.hints} icon="💡"
                  onChange={(v) => setSettings({ ...settings, hints: v })} />
              </div>

              <div className="settings-row">
                <label className="form-label">Word Mode</label>
                <select className="input" value={settings.wordMode}
                  onChange={(e) => setSettings({ ...settings, wordMode: e.target.value as any })}>
                  <option value="normal">Normal</option>
                  <option value="hidden">Hidden (no word shown)</option>
                  <option value="combination">Combination</option>
                </select>
              </div>

              <div className="settings-row">
                <label className="toggle-label">
                  <input type="checkbox" checked={settings.isPrivate}
                    onChange={(e) => setSettings({ ...settings, isPrivate: e.target.checked })} />
                  <span>🔒 Private Room (invite only)</span>
                </label>
              </div>

              <button className="btn btn-sm btn-secondary" onClick={() => setShowAdvanced(!showAdvanced)}>
                {showAdvanced ? '▲ Hide' : '▼ Show'} Custom Words
              </button>

              {showAdvanced && (
                <div className="custom-words fade-in">
                  <div className="custom-words-input">
                    <input className="input" placeholder="Add custom word..." value={customWordInput}
                      onChange={(e) => setCustomWordInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addCustomWord()} />
                    <button className="btn btn-secondary btn-sm" onClick={addCustomWord}>Add</button>
                  </div>
                  <div className="custom-words-list">
                    {settings.customWords.map((w) => (
                      <span key={w} className="word-chip">
                        {w}
                        <button onClick={() => setSettings({ ...settings, customWords: settings.customWords.filter((x) => x !== w) })}>×</button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {error && <p className="error-msg">{error}</p>}
              <button className="btn btn-primary btn-lg" onClick={handleCreate} disabled={loading || !connected}>
                {loading ? <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> : '🚀 Create Room'}
              </button>
            </div>
          )}

          {/* JOIN */}
          {tab === 'join' && (
            <div className="tab-content slide-in">
              <label className="form-label">Room Code</label>
              <input className="input" placeholder="Enter room code (e.g. ABC123)" value={joinRoomId}
                onChange={(e) => setJoinRoomId(e.target.value.toUpperCase().slice(0, 6))}
                onKeyDown={(e) => e.key === 'Enter' && handleJoin()} maxLength={6} style={{ letterSpacing: '0.2em', fontSize: 20, textAlign: 'center' }} />
              {error && <p className="error-msg">{error}</p>}
              <button className="btn btn-primary btn-lg" onClick={handleJoin} disabled={loading || !connected}>
                {loading ? <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> : '🎮 Join Room'}
              </button>
            </div>
          )}

          {/* PUBLIC */}
          {tab === 'public' && (
            <div className="tab-content slide-in">
              {publicRooms.length === 0 ? (
                <div className="no-rooms">
                  <div style={{ fontSize: 48 }}>🏜️</div>
                  <p>No public rooms available. Create one!</p>
                </div>
              ) : (
                <div className="public-rooms-list">
                  {publicRooms.map((room) => (
                    <div key={room.roomId} className="public-room-card">
                      <div className="pr-info">
                        <span className="pr-id">#{room.roomId}</span>
                        <span className="pr-players">👥 {room.playerCount}/{room.maxPlayers}</span>
                        <span className="pr-rounds">🔄 {room.rounds} rounds</span>
                        <span className="pr-time">⏱️ {room.drawTime}s</span>
                      </div>
                      <button className="btn btn-primary btn-sm" onClick={() => handleJoinPublic(room.roomId)}>
                        Join
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {error && <p className="error-msg">{error}</p>}
            </div>
          )}
        </div>

        <p className="home-footer">Draw 🎨 · Guess 💭 · Laugh 😂 · Repeat 🔄</p>
      </div>
    </div>
  );
}

function SettingSlider({ label, min, max, value, icon, onChange }: {
  label: string; min: number; max: number; value: number; icon: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="setting-item">
      <div className="setting-header">
        <span>{icon} {label}</span>
        <span className="setting-value">{value}</span>
      </div>
      <input type="range" min={min} max={max} value={value}
        onChange={(e) => onChange(Number(e.target.value))} className="range-input" />
    </div>
  );
}
