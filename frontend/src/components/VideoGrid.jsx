import { useRef, useEffect } from 'react';

export default function VideoGrid({ users, localStream, remoteStreams, currentUser }) {
  return (
    <div className="flex flex-wrap gap-2 p-3 justify-center items-start overflow-y-auto" style={{ maxHeight: '180px' }}>
      {/* Local video */}
      {localStream && localStream.getVideoTracks().length > 0 && (
        <VideoCircle
          stream={localStream}
          username={currentUser?.username || 'You'}
          avatarColor={currentUser?.avatar_color || '#8b5cf6'}
          isSpeaking={false}
          isLocal
          muted
        />
      )}

      {/* Remote videos */}
      {Object.entries(remoteStreams).map(([sid, stream]) => {
        const user = users.find((u) => u.sid === sid);
        if (!stream || !stream.getVideoTracks || stream.getVideoTracks().length === 0) return null;
        return (
          <VideoCircle
            key={sid}
            stream={stream}
            username={user?.username || 'Unknown'}
            avatarColor={user?.avatar_color || '#6366f1'}
            isSpeaking={user?.is_speaking || false}
          />
        );
      })}

      {/* Avatar placeholders for users without video */}
      {users
        .filter(
          (u) =>
            !u.has_video &&
            u.sid !== currentUser?.sid
        )
        .map((u) => (
          <AvatarCircle key={u.sid} user={u} />
        ))}
    </div>
  );
}

function VideoCircle({ stream, username, avatarColor, isSpeaking, isLocal, muted }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`video-bubble ${isSpeaking ? 'speaking' : ''}`}
        style={{
          width: 72,
          height: 72,
          borderColor: isSpeaking ? '#22c55e' : avatarColor,
        }}
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={muted || isLocal}
          style={{ width: '100%', height: '100%', objectFit: 'cover', transform: isLocal ? 'scaleX(-1)' : 'none' }}
        />
      </div>
      <span className="text-xs truncate max-w-[80px]" style={{ color: 'var(--text-secondary)' }}>
        {isLocal ? 'You' : username}
      </span>
    </div>
  );
}

function AvatarCircle({ user }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`flex items-center justify-center rounded-full text-lg font-bold ${
          user.is_speaking ? 'animate-speaking' : ''
        }`}
        style={{
          width: 72,
          height: 72,
          background: user.avatar_color + '33',
          border: `3px solid ${user.is_speaking ? '#22c55e' : user.avatar_color}`,
          color: user.avatar_color,
        }}
      >
        {user.username?.[0]?.toUpperCase() || '?'}
      </div>
      <span className="text-xs truncate max-w-[80px]" style={{ color: 'var(--text-secondary)' }}>
        {user.username}
      </span>
    </div>
  );
}
