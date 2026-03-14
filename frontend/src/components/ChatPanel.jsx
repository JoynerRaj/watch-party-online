import { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';

export default function ChatPanel({ messages, onSendMessage, currentUser }) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    onSendMessage(input.trim());
    setInput('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const d = new Date(timestamp);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="chat-panel h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border-glass)' }}>
        <h3 className="font-semibold text-sm" style={{ fontFamily: 'var(--font-primary)' }}>
          💬 Live Chat
        </h3>
      </div>

      {/* Messages */}
      <div className="chat-messages flex-1 overflow-y-auto">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              No messages yet. Say hello! 👋
            </p>
          </div>
        )}
        {messages.map((msg, i) => {
          const isMe = msg.user_id === currentUser?.id;
          return (
            <div
              key={i}
              className={`chat-message flex flex-col mb-2 ${isMe ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`rounded-2xl px-4 py-2 max-w-[85%] ${
                  isMe
                    ? 'bg-gradient-to-r from-purple-600/40 to-indigo-600/40 border border-purple-500/20'
                    : 'glass-light'
                }`}
              >
                {!isMe && (
                  <p className="text-xs font-semibold mb-0.5" style={{ color: 'var(--accent-purple)' }}>
                    {msg.username}
                  </p>
                )}
                <p className="text-sm break-words" style={{ color: 'var(--text-primary)' }}>
                  {msg.content}
                </p>
              </div>
              <span className="text-xs mt-1 px-2" style={{ color: 'var(--text-muted)' }}>
                {formatTime(msg.timestamp)}
              </span>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t" style={{ borderColor: 'var(--border-glass)' }}>
        <div className="flex gap-2">
          <input
            type="text"
            className="input-field flex-1 text-sm"
            placeholder="Type a message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            maxLength={500}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="btn-icon shrink-0 disabled:opacity-30"
            style={input.trim() ? { background: 'var(--accent-purple)', borderColor: 'var(--accent-purple)' } : {}}
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
