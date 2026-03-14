import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Film, Users, Sparkles, ArrowRight, Copy, Check, Popcorn, Tv, Mic, Video, MessageSquare } from 'lucide-react';

function Particle({ delay, left, size }) {
  return (
    <div
      className="absolute rounded-full opacity-20"
      style={{
        left: `${left}%`,
        top: `${Math.random() * 100}%`,
        width: `${size}px`,
        height: `${size}px`,
        background: `hsl(${260 + Math.random() * 60}, 80%, 65%)`,
        animation: `float ${4 + Math.random() * 4}s ease-in-out infinite`,
        animationDelay: `${delay}s`,
      }}
    />
  );
}

export default function Landing() {
  const [roomName, setRoomName] = useState('');
  const [username, setUsername] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [createdRoom, setCreatedRoom] = useState(null);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('create');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const particles = Array.from({ length: 30 }, (_, i) => ({
    delay: Math.random() * 5,
    left: Math.random() * 100,
    size: 2 + Math.random() * 4,
  }));

  const handleCreateRoom = async () => {
    if (!roomName.trim() || !username.trim()) return;
    setIsLoading(true);
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || '';
      const res = await fetch(`${backendUrl}/api/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: roomName, username }),
      });
      const data = await res.json();
      setCreatedRoom(data);
      // Store user info
      sessionStorage.setItem('wp_username', username);
      sessionStorage.setItem('wp_user_id', data.host_id);
    } catch (e) {
      console.error('Failed to create room:', e);
    }
    setIsLoading(false);
  };

  const handleJoinRoom = () => {
    if (!joinCode.trim() || !username.trim()) return;
    sessionStorage.setItem('wp_username', username);
    sessionStorage.setItem('wp_user_id', Math.random().toString(36).substring(2, 14));
    navigate(`/room/${joinCode.trim()}`);
  };

  const handleEnterRoom = () => {
    if (createdRoom) {
      navigate(`/room/${createdRoom.room_id}`);
    }
  };

  const copyInvite = () => {
    if (createdRoom) {
      navigator.clipboard.writeText(`${window.location.origin}/room/${createdRoom.room_id}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const features = [
    { icon: <Tv size={24} />, title: 'Screen Share', desc: 'Share your screen with system audio' },
    { icon: <Mic size={24} />, title: 'Voice Chat', desc: 'Talk with friends in real-time' },
    { icon: <Video size={24} />, title: 'Video Chat', desc: 'See your friends via webcam' },
    { icon: <MessageSquare size={24} />, title: 'Live Chat', desc: 'Send text messages while watching' },
  ];

  return (
    <div className="min-h-screen w-full relative overflow-y-auto overflow-x-hidden" style={{ background: 'var(--bg-primary)' }}>
      {/* Animated Background */}
      <div className="particles-bg">
        {particles.map((p, i) => (
          <Particle key={i} {...p} />
        ))}
      </div>

      {/* Gradient Orbs */}
      <div className="fixed top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full opacity-20 blur-[120px] pointer-events-none"
        style={{ background: 'radial-gradient(circle, #8b5cf6, transparent)' }} />
      <div className="fixed bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full opacity-15 blur-[100px] pointer-events-none"
        style={{ background: 'radial-gradient(circle, #ec4899, transparent)' }} />
      <div className="fixed top-[40%] right-[20%] w-[300px] h-[300px] rounded-full opacity-10 blur-[80px] pointer-events-none"
        style={{ background: 'radial-gradient(circle, #06b6d4, transparent)' }} />

      <div className="relative z-10 flex flex-col items-center justify-start min-h-screen px-6 py-16">
        {/* Hero */}
        <div className="text-center mb-12 animate-slide-up">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="p-3 rounded-2xl neon-border animate-pulse-neon">
              <Film size={40} className="text-purple-400" />
            </div>
          </div>
          <h1 className="text-6xl md:text-7xl font-black mb-4" style={{ fontFamily: 'var(--font-primary)' }}>
            <span className="gradient-text">WatchParty</span>
            <span className="text-white"> 3D</span>
          </h1>
          <p className="text-lg md:text-xl max-w-2xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
            Watch movies together in an immersive 3D cinema.
            Share your screen, voice chat, and vibe with friends — anywhere in the world. 🍿
          </p>
        </div>

        {/* Room Creation / Join Card */}
        <div className="w-full max-w-lg mb-16 animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <div className="glass rounded-3xl p-8 neon-border">
            {/* Tabs */}
            <div className="flex gap-2 mb-8 p-1 rounded-xl" style={{ background: 'rgba(10, 10, 26, 0.5)' }}>
              <button
                onClick={() => setActiveTab('create')}
                className={`flex items-center justify-center flex-1 py-3 px-4 rounded-lg font-semibold text-sm transition-all duration-300 ${
                  activeTab === 'create'
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <span className="text-lg mr-3">🎬</span>
                <span>Create Room</span>
              </button>
              <button
                onClick={() => setActiveTab('join')}
                className={`flex items-center justify-center flex-1 py-3 px-4 rounded-lg font-semibold text-sm transition-all duration-300 ${
                  activeTab === 'join'
                    ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-lg'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <span className="text-lg mr-3">🔗</span>
                <span>Join Room</span>
              </button>
            </div>

            {/* Username (shared) */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                Your Name
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="Enter your display name..."
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                maxLength={20}
              />
            </div>

            {activeTab === 'create' ? (
              <>
                <div className="mb-6">
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                    Room Name
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. Friday Movie Night 🎬"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    maxLength={50}
                  />
                </div>

                {!createdRoom ? (
                  <button
                    onClick={handleCreateRoom}
                    disabled={!roomName.trim() || !username.trim() || isLoading}
                    className="btn-primary w-full flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Sparkles size={18} className="mr-3" />
                        <span>Create Cinema Room</span>
                      </>
                    )}
                  </button>
                ) : (
                  <div className="space-y-4 animate-fade-in">
                    <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                      <p className="flex items-center gap-2 text-green-400 font-semibold text-sm mb-2"><span>✅</span> <span>Room Created!</span></p>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          value={`${window.location.origin}/room/${createdRoom.room_id}`}
                          className="input-field text-sm flex-1"
                        />
                        <button onClick={copyInvite} className="btn-icon shrink-0">
                          {copied ? <Check size={18} className="text-green-400" /> : <Copy size={18} />}
                        </button>
                      </div>
                    </div>
                    <button
                      onClick={handleEnterRoom}
                      className="btn-primary w-full flex items-center justify-center"
                    >
                      <span className="mr-3">Enter Cinema</span>
                      <ArrowRight size={18} />
                    </button>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="mb-6">
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                    Room Code
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Enter room code (e.g. abc12345)"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value)}
                  />
                </div>
                <button
                  onClick={handleJoinRoom}
                  disabled={!joinCode.trim() || !username.trim()}
                  className="btn-primary w-full flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: 'linear-gradient(135deg, #ec4899, #f43f5e)' }}
                >
                  <Users size={18} className="mr-3" />
                  <span>Join Cinema Room</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Features Grid */}
        <div className="w-full max-w-4xl grid grid-cols-2 md:grid-cols-4 gap-4 mb-16 animate-slide-up" style={{ animationDelay: '0.4s' }}>
          {features.map((f, i) => (
            <div
              key={i}
              className="glass rounded-2xl p-6 text-center hover:scale-105 transition-transform duration-300 cursor-default group"
            >
              <div className="flex justify-center mb-5 mt-1 text-purple-400 group-hover:text-pink-400 transition-colors">
                {f.icon}
              </div>
              <h3 className="font-semibold text-base mb-2 mt-4" style={{ fontFamily: 'var(--font-primary)' }}>{f.title}</h3>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="text-center pb-8" style={{ color: 'var(--text-muted)' }}>
          <p className="flex justify-center items-center gap-1.5 text-sm">
            Built with <span>💜</span> <span className="mx-1">—</span> React • Three.js • WebRTC • FastAPI
          </p>
        </div>
      </div>
    </div>
  );
}
