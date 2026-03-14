import { Users, Crown } from 'lucide-react';

export default function ParticipantList({ users, currentUser }) {
  return (
    <div className="p-4 border-b" style={{ borderColor: 'var(--border-glass)' }}>
      <div className="flex items-center gap-2 mb-3">
        <Users size={16} className="text-purple-400" />
        <h3 className="font-semibold text-sm" style={{ fontFamily: 'var(--font-primary)' }}>
          Participants ({users.length})
        </h3>
      </div>

      <div className="space-y-2 max-h-[200px] overflow-y-auto">
        {users.map((user) => (
          <div
            key={user.sid}
            className="flex items-center gap-3 p-2 rounded-xl transition-all hover:bg-white/5"
          >
            {/* Avatar */}
            <div
              className={`flex items-center justify-center rounded-full text-xs font-bold shrink-0 ${
                user.is_speaking ? 'animate-speaking' : ''
              }`}
              style={{
                width: 36,
                height: 36,
                background: user.avatar_color + '33',
                border: `2px solid ${user.is_speaking ? '#22c55e' : user.avatar_color}`,
                color: user.avatar_color,
              }}
            >
              {user.username?.[0]?.toUpperCase() || '?'}
            </div>

            {/* Name + Status */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium truncate">
                  {user.username}
                  {user.sid === currentUser?.sid && (
                    <span className="text-xs ml-1" style={{ color: 'var(--text-muted)' }}>(you)</span>
                  )}
                </span>
                {user.is_host && <Crown size={13} className="text-yellow-400 shrink-0" />}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                {user.has_audio && (
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>🎤</span>
                )}
                {user.has_video && (
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>📹</span>
                )}
                {user.is_speaking && (
                  <div className="speaking-indicator">
                    <div className="bar" />
                    <div className="bar" />
                    <div className="bar" />
                    <div className="bar" />
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
