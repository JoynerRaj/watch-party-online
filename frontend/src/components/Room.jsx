import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Film, Loader } from 'lucide-react';
import Cinema3D from './Cinema3D';
import ChatPanel from './ChatPanel';
import VideoGrid from './VideoGrid';
import Controls from './Controls';
import ParticipantList from './ParticipantList';
import { useSocket } from '../hooks/useSocket';
import { useRoom } from '../hooks/useRoom';
import { useWebRTC } from '../hooks/useWebRTC';

export default function Room() {
  const { roomId: paramRoomId } = useParams();
  const navigate = useNavigate();
  const [isJoining, setIsJoining] = useState(true);
  const [joinError, setJoinError] = useState(null);
  const [showNameModal, setShowNameModal] = useState(false);
  const [tempUsername, setTempUsername] = useState('');

  const { socket, isConnected } = useSocket();
  const {
    roomId,
    roomName,
    users,
    currentUser,
    messages,
    playbackState,
    joinRoom,
    sendMessage,
    updatePlayback,
  } = useRoom(socket, isConnected);

  const {
    localStream,
    screenStream,
    remoteStreams,
    screenShareStream,
    isMicOn,
    isCamOn,
    isScreenSharing,
    toggleMic,
    toggleCam,
    toggleScreenShare,
    createPeer,
  } = useWebRTC(socket, paramRoomId, currentUser?.id);

  // Check if we have user identity
  useEffect(() => {
    const storedUsername = sessionStorage.getItem('wp_username');
    if (!storedUsername) {
      setShowNameModal(true);
      setIsJoining(false);
    }
  }, []);

  // Join room once connected
  useEffect(() => {
    if (!isConnected || showNameModal) return;

    const username = sessionStorage.getItem('wp_username');
    const userId = sessionStorage.getItem('wp_user_id') || Math.random().toString(36).substring(2, 14);

    if (username && paramRoomId) {
      joinRoom(paramRoomId, username, userId);
    }
  }, [isConnected, paramRoomId, joinRoom, showNameModal]);

  // Handle join result
  useEffect(() => {
    if (currentUser) {
      setIsJoining(false);
    }
  }, [currentUser]);

  // Establish peer connections with existing users
  useEffect(() => {
    if (!currentUser || !socket.current) return;

    const handleUserJoined = (data) => {
      // When a new user joins, initiate a peer connection
      const newUser = data.user;
      if (newUser.sid !== socket.current.id) {
        createPeer(newUser.sid, true);
      }
    };

    // Create peers for all existing users
    users.forEach((u) => {
      if (u.sid !== socket.current?.id) {
        createPeer(u.sid, true);
      }
    });

    socket.current.on('user_joined', handleUserJoined);

    return () => {
      socket.current?.off('user_joined', handleUserJoined);
    };
  }, [currentUser, users.length, socket, createPeer]);

  // Handle screen share events from others
  useEffect(() => {
    if (!socket.current) return;

    const handleScreenShareStarted = (data) => {
      // Another user started screen sharing
    };

    const handleScreenShareStopped = () => {
      // Screen sharing stopped
    };

    socket.current.on('screen_share_started', handleScreenShareStarted);
    socket.current.on('screen_share_stopped', handleScreenShareStopped);

    return () => {
      socket.current?.off('screen_share_started', handleScreenShareStarted);
      socket.current?.off('screen_share_stopped', handleScreenShareStopped);
    };
  }, [socket]);

  const handleNameSubmit = () => {
    if (!tempUsername.trim()) return;
    sessionStorage.setItem('wp_username', tempUsername.trim());
    sessionStorage.setItem('wp_user_id', Math.random().toString(36).substring(2, 14));
    setShowNameModal(false);
    setIsJoining(true);
  };

  const handleLeave = () => {
    navigate('/');
  };

  // Determine which stream to show on the cinema screen
  const activeScreenStream = screenStream || screenShareStream;
  const activeIsScreenSharing = isScreenSharing || !!screenShareStream;

  // Name modal
  if (showNameModal) {
    return (
      <div className="h-screen w-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="glass rounded-3xl p-8 max-w-sm w-full mx-4 neon-border animate-slide-up">
          <div className="flex items-center justify-center gap-2 mb-6">
            <Film size={28} className="text-purple-400" />
            <h2 className="text-xl font-bold gradient-text" style={{ fontFamily: 'var(--font-primary)' }}>
              Join WatchParty
            </h2>
          </div>
          <p className="text-sm text-center mb-6" style={{ color: 'var(--text-secondary)' }}>
            Enter your name to join the cinema room
          </p>
          <input
            type="text"
            className="input-field mb-4"
            placeholder="Your display name..."
            value={tempUsername}
            onChange={(e) => setTempUsername(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleNameSubmit()}
            maxLength={20}
            autoFocus
          />
          <button
            onClick={handleNameSubmit}
            disabled={!tempUsername.trim()}
            className="btn-primary w-full disabled:opacity-40"
          >
            Enter Cinema 🍿
          </button>
        </div>
      </div>
    );
  }

  // Loading state
  if (isJoining) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center gap-4" style={{ background: 'var(--bg-primary)' }}>
        <div className="animate-pulse-neon p-4 rounded-2xl">
          <Film size={48} className="text-purple-400" />
        </div>
        <div className="flex items-center gap-2">
          <Loader size={20} className="animate-spin text-purple-400" />
          <p className="text-lg" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-primary)' }}>
            Entering cinema...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="room-layout">
      {/* 3D Cinema Area */}
      <div className="cinema-area">
        <Cinema3D
          users={users}
          screenStream={activeScreenStream}
          isScreenSharing={activeIsScreenSharing}
        />

        {/* Room name overlay */}
        <div
          className="absolute top-4 left-4 glass rounded-xl px-4 py-2 flex items-center gap-2"
          style={{ zIndex: 10 }}
        >
          <Film size={16} className="text-purple-400" />
          <span className="text-sm font-semibold" style={{ fontFamily: 'var(--font-primary)' }}>
            {roomName || 'Cinema Room'}
          </span>
          <span
            className="text-xs px-2 py-0.5 rounded-full"
            style={{ background: 'var(--accent-purple)', color: 'white', fontSize: '0.65rem' }}
          >
            {users.length} watching
          </span>
        </div>

        {/* Video bubbles overlay */}
        <div className="absolute bottom-20 left-0 right-0" style={{ zIndex: 10 }}>
          <VideoGrid
            users={users}
            localStream={localStream}
            remoteStreams={remoteStreams}
            currentUser={currentUser}
          />
        </div>
      </div>

      {/* Controls Bar */}
      <div className="controls-bar">
        <Controls
          isMicOn={isMicOn}
          isCamOn={isCamOn}
          isScreenSharing={isScreenSharing}
          isHost={currentUser?.is_host || false}
          roomId={paramRoomId}
          onToggleMic={toggleMic}
          onToggleCam={toggleCam}
          onToggleScreenShare={toggleScreenShare}
          onLeave={handleLeave}
        />
      </div>

      {/* Sidebar */}
      <div className="sidebar">
        <ParticipantList users={users} currentUser={currentUser} />
        <div className="flex-1 min-h-0">
          <ChatPanel
            messages={messages}
            onSendMessage={sendMessage}
            currentUser={currentUser}
          />
        </div>
      </div>
    </div>
  );
}
