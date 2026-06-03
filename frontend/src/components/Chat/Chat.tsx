import { useState, useRef, useEffect } from 'react';
import { useGame } from '../../context/GameContext';
import type { ChatMessage } from '../../types';
import './Chat.css';

export default function Chat() {
  const { roomState, playerId, isDrawer, sendGuess, sendChat, gameState } = useGame();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const messages = roomState?.chatMessages || [];
  const isPlaying = gameState?.phase === 'drawing';
  const me = roomState?.players.find((p) => p.id === playerId);
  const alreadyGuessed = me?.hasGuessedCorrectly;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    setInput('');

    if (isPlaying && !isDrawer && !alreadyGuessed) {
      sendGuess(text);
    } else {
      sendChat(text);
    }
  };

  const getPlaceholder = () => {
    if (isDrawer && isPlaying) return 'You are drawing...';
    if (alreadyGuessed) return 'You guessed correctly! Chat freely...';
    if (isPlaying) return 'Type your guess here...';
    return 'Say something...';
  };

  return (
    <div className="chat-panel">
      <div className="chat-header">
        <span>💬 Chat & Guesses</span>
        <span className="chat-count">{messages.length}</span>
      </div>

      <div className="chat-messages">
        {messages.map((msg, i) => (
          <ChatBubble key={i} msg={msg} isMe={msg.playerId === playerId} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-row">
        <input
          ref={inputRef}
          className={`input chat-input ${isPlaying && !isDrawer && !alreadyGuessed ? 'guess-mode' : ''}`}
          placeholder={getPlaceholder()}
          value={input}
          onChange={(e) => setInput(e.target.value.slice(0, 100))}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          disabled={isDrawer && isPlaying}
        />
        <button className="btn btn-primary btn-sm" onClick={handleSend} disabled={!input.trim() || (isDrawer && isPlaying)}>
          ➤
        </button>
      </div>
    </div>
  );
}

function ChatBubble({ msg, isMe }: { msg: ChatMessage; isMe: boolean }) {
  const isSystem = msg.type === 'system';
  const isCorrect = msg.type === 'correct';

  if (isSystem || isCorrect) {
    return (
      <div className={`chat-system ${isCorrect ? 'correct-msg' : ''}`}>
        {isCorrect ? '🎉 ' : 'ℹ️ '}
        {msg.text}
      </div>
    );
  }

  return (
    <div className={`chat-bubble ${isMe ? 'mine' : ''} ${msg.isClose ? 'close-guess' : ''}`}>
      <div className="chat-bubble-header">
        <span className="chat-name">{msg.playerName}</span>
        {msg.isClose && <span className="close-badge">🔥 Close!</span>}
      </div>
      <div className="chat-text">{msg.text}</div>
    </div>
  );
}
