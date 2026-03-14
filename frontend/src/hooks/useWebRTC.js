import { useRef, useState, useCallback, useEffect } from 'react';
import { ICE_SERVERS } from '../utils/constants';

export function useWebRTC(socket, roomId, localUserId) {
  const [localStream, setLocalStream] = useState(null);
  const [screenStream, setScreenStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [screenShareStream, setScreenShareStream] = useState(null);
  const [isMicOn, setIsMicOn] = useState(false);
  const [isCamOn, setIsCamOn] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const peersRef = useRef({});
  const screenPeersRef = useRef({});
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const analyserRef = useRef(null);
  const speakingIntervalRef = useRef(null);

  // Setup speaking detection
  const setupSpeakingDetection = useCallback((stream) => {
    try {
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      microphone.connect(analyser);
      analyser.fftSize = 512;
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      speakingIntervalRef.current = setInterval(() => {
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        const speaking = average > 15;

        setIsSpeaking((prev) => {
          if (prev !== speaking && socket.current) {
            socket.current.emit('speaking_update', {
              room_id: roomId,
              is_speaking: speaking,
            });
          }
          return speaking;
        });
      }, 200);
    } catch (e) {
      console.error('Speaking detection error:', e);
    }
  }, [socket, roomId]);

  // Toggle microphone
  const toggleMic = useCallback(async () => {
    if (isMicOn) {
      // Turn off mic
      if (localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach((t) => t.stop());
        if (localStreamRef.current.getVideoTracks().length === 0) {
          localStreamRef.current = null;
          setLocalStream(null);
        }
      }
      if (speakingIntervalRef.current) {
        clearInterval(speakingIntervalRef.current);
      }
      setIsMicOn(false);
      setIsSpeaking(false);
      socket.current?.emit('toggle_audio', { room_id: roomId, has_audio: false });
    } else {
      // Turn on mic
      try {
        const stream = localStreamRef.current || new MediaStream();
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioStream.getAudioTracks().forEach((t) => stream.addTrack(t));
        localStreamRef.current = stream;
        setLocalStream(stream);
        setIsMicOn(true);
        setupSpeakingDetection(stream);
        socket.current?.emit('toggle_audio', { room_id: roomId, has_audio: true });

        // Add track to existing peers
        Object.values(peersRef.current).forEach((pc) => {
          audioStream.getAudioTracks().forEach((track) => {
            pc.addTrack(track, stream);
          });
        });
      } catch (e) {
        console.error('Mic access error:', e);
      }
    }
  }, [isMicOn, socket, roomId, setupSpeakingDetection]);

  // Toggle camera
  const toggleCam = useCallback(async () => {
    if (isCamOn) {
      if (localStreamRef.current) {
        localStreamRef.current.getVideoTracks().forEach((t) => t.stop());
        if (localStreamRef.current.getAudioTracks().length === 0) {
          localStreamRef.current = null;
          setLocalStream(null);
        }
      }
      setIsCamOn(false);
      socket.current?.emit('toggle_video', { room_id: roomId, has_video: false });
    } else {
      try {
        const stream = localStreamRef.current || new MediaStream();
        const videoStream = await navigator.mediaDevices.getUserMedia({
          video: { width: 320, height: 240, facingMode: 'user' },
        });
        videoStream.getVideoTracks().forEach((t) => stream.addTrack(t));
        localStreamRef.current = stream;
        setLocalStream(stream);
        setIsCamOn(true);
        socket.current?.emit('toggle_video', { room_id: roomId, has_video: true });

        Object.values(peersRef.current).forEach((pc) => {
          videoStream.getVideoTracks().forEach((track) => {
            pc.addTrack(track, stream);
          });
        });
      } catch (e) {
        console.error('Camera access error:', e);
      }
    }
  }, [isCamOn, socket, roomId]);

  // Screen sharing
  const toggleScreenShare = useCallback(async () => {
    if (isScreenSharing) {
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop());
        screenStreamRef.current = null;
        setScreenStream(null);
      }
      setIsScreenSharing(false);
      socket.current?.emit('screen_share_stopped', { room_id: roomId });
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: { cursor: 'always' },
          audio: true,
        });

        stream.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false);
          screenStreamRef.current = null;
          setScreenStream(null);
          socket.current?.emit('screen_share_stopped', { room_id: roomId });
        };

        screenStreamRef.current = stream;
        setScreenStream(stream);
        setIsScreenSharing(true);
        socket.current?.emit('screen_share_started', {
          room_id: roomId,
          user_id: localUserId,
        });

        // Send screen stream to all peers using screen peers
        Object.keys(peersRef.current).forEach((sid) => {
          createPeer(sid, true, 'screen');
        });
      } catch (e) {
        console.error('Screen share error:', e);
      }
    }
  }, [isScreenSharing, socket, roomId, localUserId]);

  // Create peer connection
  const createPeer = useCallback(
    (targetSid, initiator = false, type = 'media') => {
      const activePeersRef = type === 'media' ? peersRef : screenPeersRef;
      if (activePeersRef.current[targetSid]) return activePeersRef.current[targetSid];

      const pc = new RTCPeerConnection(ICE_SERVERS);
      activePeersRef.current[targetSid] = pc;

      // Add local tracks
      if (type === 'media' && localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current);
        });
      }
      if (type === 'screen' && screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, screenStreamRef.current);
        });
      }

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.current?.emit('webrtc_ice_candidate', {
            target_sid: targetSid,
            candidate: event.candidate,
            type,
          });
        }
      };

      pc.ontrack = (event) => {
        const [stream] = event.streams;
        if (stream) {
          if (type === 'screen') {
            setScreenShareStream(stream);
          } else {
            setRemoteStreams((prev) => ({ ...prev, [targetSid]: stream }));
          }
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
          pc.close();
          delete activePeersRef.current[targetSid];
          if (type === 'screen') {
            setScreenShareStream(null);
          } else {
            setRemoteStreams((prev) => {
              const next = { ...prev };
              delete next[targetSid];
              return next;
            });
          }
        }
      };

      if (initiator) {
        pc.onnegotiationneeded = async () => {
          try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socket.current?.emit('webrtc_offer', {
              target_sid: targetSid,
              sdp: pc.localDescription,
              type,
            });
          } catch (e) {
            console.error('Negotiation error:', e);
          }
        };
      }

      return pc;
    },
    [socket]
  );

  // Handle incoming WebRTC signaling
  useEffect(() => {
    if (!socket.current) return;

    const handleOffer = async (data) => {
      const { sdp, from_sid, type } = data;
      const pc = createPeer(from_sid, false, type);
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.current?.emit('webrtc_answer', {
          target_sid: from_sid,
          sdp: pc.localDescription,
          type,
        });
      } catch (e) {
        console.error('Handle offer error:', e);
      }
    };

    const handleAnswer = async (data) => {
      const { sdp, from_sid, type } = data;
      const activePeersRef = type === 'media' ? peersRef : screenPeersRef;
      const pc = activePeersRef.current[from_sid];
      if (pc) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        } catch (e) {
          console.error('Handle answer error:', e);
        }
      }
    };

    const handleIceCandidate = async (data) => {
      const { candidate, from_sid, type } = data;
      const activePeersRef = type === 'media' ? peersRef : screenPeersRef;
      const pc = activePeersRef.current[from_sid];
      if (pc) {
        try {
           await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.error('ICE candidate error:', e);
        }
      }
    };

    socket.current.on('webrtc_offer', handleOffer);
    socket.current.on('webrtc_answer', handleAnswer);
    socket.current.on('webrtc_ice_candidate', handleIceCandidate);

    return () => {
      socket.current?.off('webrtc_offer', handleOffer);
      socket.current?.off('webrtc_answer', handleAnswer);
      socket.current?.off('webrtc_ice_candidate', handleIceCandidate);
    };
  }, [socket, createPeer]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (speakingIntervalRef.current) {
        clearInterval(speakingIntervalRef.current);
      }
      Object.values(peersRef.current).forEach((pc) => pc.close());
      Object.values(screenPeersRef.current).forEach((pc) => pc.close());
    };
  }, []);

  return {
    localStream,
    screenStream,
    remoteStreams,
    screenShareStream,
    isMicOn,
    isCamOn,
    isScreenSharing,
    isSpeaking,
    toggleMic,
    toggleCam,
    toggleScreenShare,
    createPeer,
    peersRef,
  };
}
