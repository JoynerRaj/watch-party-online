import { Mic, MicOff, Video, VideoOff, MonitorUp, MonitorOff, PhoneOff, Copy, Check } from 'lucide-react';
import { useState } from 'react';

export default function Controls({
  isMicOn,
  isCamOn,
  isScreenSharing,
  isHost,
  roomId,
  onToggleMic,
  onToggleCam,
  onToggleScreenShare,
  onLeave,
}) {
  const [copied, setCopied] = useState(false);

  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/room/${roomId}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="glass flex items-center justify-center gap-3 px-6 py-4"
      style={{ borderTop: '1px solid var(--border-glass)' }}
    >
      {/* Mic Toggle */}
      <button
        onClick={onToggleMic}
        className={`btn-icon tooltip ${isMicOn ? 'active' : ''}`}
        data-tooltip={isMicOn ? 'Mute' : 'Unmute'}
      >
        {isMicOn ? <Mic size={20} /> : <MicOff size={20} className="text-red-400" />}
      </button>

      {/* Camera Toggle */}
      <button
        onClick={onToggleCam}
        className={`btn-icon tooltip ${isCamOn ? 'active' : ''}`}
        data-tooltip={isCamOn ? 'Stop Video' : 'Start Video'}
      >
        {isCamOn ? <Video size={20} /> : <VideoOff size={20} className="text-red-400" />}
      </button>

      {/* Screen Share */}
      <button
        onClick={onToggleScreenShare}
        className={`btn-icon tooltip ${isScreenSharing ? 'active' : ''}`}
        data-tooltip={isScreenSharing ? 'Stop Sharing' : 'Share Screen'}
        style={
          isScreenSharing
            ? { background: 'rgba(34,197,94,0.3)', borderColor: 'rgba(34,197,94,0.5)' }
            : {}
        }
      >
        {isScreenSharing ? (
          <MonitorOff size={20} className="text-green-400" />
        ) : (
          <MonitorUp size={20} />
        )}
      </button>

      {/* Divider */}
      <div className="w-px h-8 mx-1" style={{ background: 'var(--border-glass)' }} />

      {/* Copy Invite */}
      <button onClick={copyLink} className="btn-icon tooltip" data-tooltip="Copy Invite Link">
        {copied ? <Check size={20} className="text-green-400" /> : <Copy size={20} />}
      </button>

      {/* Leave */}
      <button onClick={onLeave} className="btn-icon danger tooltip" data-tooltip="Leave Room">
        <PhoneOff size={20} className="text-red-400" />
      </button>
    </div>
  );
}
