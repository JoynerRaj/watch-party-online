import { useState, useEffect, useRef } from 'react'
import './App.css'

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://127.0.0.1:8000/ws'
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    // TURN Server example (Uncomment and replace for strict network firewalls)
    // {
    //   urls: 'turn:global.turn.twilio.com:3478?transport=tcp',
    //   username: 'TURN_USERNAME',
    //   credential: 'TURN_PASSWORD'
    // }
  ]
}

function App() {
  const [roomId, setRoomId] = useState('')
  const [userId, setUserId] = useState(() => 'user_' + Math.floor(Math.random() * 10000))
  const [joined, setJoined] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [messages, setMessages] = useState([])
  
  // Media states
  const [audioOn, setAudioOn] = useState(false)
  const [videoOn, setVideoOn] = useState(false)
  const [screenOn, setScreenOn] = useState(false)
  
  const [users, setUsers] = useState([])
  
  // WebRTC refs
  const ws = useRef(null)
  const peers = useRef({}) // uid -> RTCPeerConnection
  const makingOffer = useRef({}) // uid -> boolean

  // Local streams manually managed
  const localCameraStream = useRef(new MediaStream()) // holds video + audio tracks
  const localScreenStream = useRef(new MediaStream()) // holds screen share track
  
  // UI forced re-render on active streams
  const [, setRefreshLocal] = useState(0)

  // Remote streams: stream.id -> MediaStream
  const [remoteStreams, setRemoteStreams] = useState({})
  
  // Mapping of peer streams: uid -> { cameraStreamId, screenStreamId }
  const [peerMeta, setPeerMeta] = useState({})

  useEffect(() => {
    return () => {
      if (ws.current) ws.current.close()
      Object.values(peers.current).forEach(pc => pc.close())
    }
  }, [])

  const broadcastMeta = () => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        type: 'stream-meta',
        cameraStreamId: localCameraStream.current.id,
        screenStreamId: localScreenStream.current.getTracks().length > 0 ? localScreenStream.current.id : null
      }))
    }
  }

  const joinRoom = () => {
    if (!roomId) return alert("Enter a room ID")
    ws.current = new WebSocket(`${WS_URL}/${roomId}/${userId}`)
    
    ws.current.onopen = () => {
      setJoined(true)
      broadcastMeta()
    }

    ws.current.onmessage = async (event) => {
      const msg = JSON.parse(event.data)

      switch (msg.type) {
        case 'user-joined':
          if (msg.userId !== userId) {
            setUsers(prev => [...prev, msg.userId])
            getOrCreatePeerConnection(msg.userId)
            broadcastMeta() // Announce my stream meta to the new user
          }
          break;
          
        case 'room-users':
          setUsers(msg.users)
          msg.users.forEach(getOrCreatePeerConnection)
          break;
          
        case 'user-left':
          setUsers(prev => prev.filter(u => u !== msg.userId))
          setPeerMeta(prev => {
            const next = { ...prev }
            delete next[msg.userId]
            return next
          })
          if (peers.current[msg.userId]) {
            peers.current[msg.userId].close()
            delete peers.current[msg.userId]
            delete makingOffer.current[msg.userId]
          }
          break;
          
        case 'chat':
          setMessages(prev => [...prev, { sender: msg.sender, text: msg.text }])
          break;

        case 'stream-meta':
          if (msg.sender !== userId) {
            setPeerMeta(prev => ({
              ...prev,
              [msg.sender]: {
                cameraStreamId: msg.cameraStreamId,
                screenStreamId: msg.screenStreamId
              }
            }))
          }
          break;
          
        case 'offer': {
          const pc = getOrCreatePeerConnection(msg.sender)
          const isPolite = userId > msg.sender
          const offerCollision = makingOffer.current[msg.sender] || pc.signalingState !== 'stable'
          
          if (!isPolite && offerCollision) return // polite peer ignores offer collision
          
          await pc.setRemoteDescription(new RTCSessionDescription(msg.offer))
          const answer = await pc.createAnswer()
          await pc.setLocalDescription(answer)
          ws.current.send(JSON.stringify({
            type: 'answer', target: msg.sender, answer: pc.localDescription
          }))
          break;
        }
          
        case 'answer': {
          const pcAns = peers.current[msg.sender]
          if (pcAns && pcAns.signalingState !== 'stable') {
            await pcAns.setRemoteDescription(new RTCSessionDescription(msg.answer))
          }
          break;
        }
          
        case 'ice-candidate': {
          const pcIce = peers.current[msg.sender]
          if (pcIce && msg.candidate) {
            try { await pcIce.addIceCandidate(new RTCIceCandidate(msg.candidate)) }
            catch (e) { console.error('ICE Error:', e) }
          }
          break;
        }
          
        default: break;
      }
    }
  }

  const getOrCreatePeerConnection = (targetUserId) => {
    if (peers.current[targetUserId]) return peers.current[targetUserId]

    const pc = new RTCPeerConnection(ICE_SERVERS)
    peers.current[targetUserId] = pc
    makingOffer.current[targetUserId] = false

    // Initial attach of any existing local tracks
    localCameraStream.current.getTracks().forEach(track => pc.addTrack(track, localCameraStream.current))
    localScreenStream.current.getTracks().forEach(track => {
      const sender = pc.addTrack(track, localScreenStream.current);
      if (track.kind === 'video') {
         const params = sender.getParameters();
         if (!params.encodings) params.encodings = [{}];
         params.encodings[0].maxBitrate = 5000000;
         params.encodings[0].scaleResolutionDownBy = 1;
         sender.setParameters(params).catch(e => console.error("Bitrate config failed:", e));
      }
    })

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        ws.current.send(JSON.stringify({
          type: 'ice-candidate', target: targetUserId, candidate: event.candidate
        }))
      }
    }

    pc.ontrack = (event) => {
      const stream = event.streams[0]
      if (stream) {
        setRemoteStreams(prev => {
          if (prev[stream.id]) return prev
          return { ...prev, [stream.id]: stream }
        })
      }
    }

    pc.onnegotiationneeded = async () => {
      try {
        makingOffer.current[targetUserId] = true
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)
        ws.current.send(JSON.stringify({
          type: 'offer', target: targetUserId, offer: pc.localDescription
        }))
      } catch (err) {
        console.error(err)
      } finally {
        makingOffer.current[targetUserId] = false
      }
    }

    return pc
  }

  const sendMessage = () => {
    if (!chatInput) return;
    ws.current.send(JSON.stringify({ type: 'chat', text: chatInput }))
    setChatInput('')
  }

  // --- Media Controls ---

  const toggleVideo = async () => {
    let videoTrack = localCameraStream.current.getVideoTracks()[0]
    
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled
      setVideoOn(videoTrack.enabled)
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true })
        videoTrack = stream.getVideoTracks()[0]
        localCameraStream.current.addTrack(videoTrack)
        
        Object.values(peers.current).forEach(pc => pc.addTrack(videoTrack, localCameraStream.current))
        setVideoOn(true)
        broadcastMeta()
        setRefreshLocal(prev => prev + 1)
      } catch (e) { console.error("Failed to get video", e) }
    }
  }

  const toggleAudio = async () => {
    let audioTrack = localCameraStream.current.getAudioTracks()[0]
    
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled
      setAudioOn(audioTrack.enabled)
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        audioTrack = stream.getAudioTracks()[0]
        localCameraStream.current.addTrack(audioTrack)
        
        Object.values(peers.current).forEach(pc => pc.addTrack(audioTrack, localCameraStream.current))
        setAudioOn(true)
        broadcastMeta()
      } catch (e) { console.error("Failed to get audio", e) }
    }
  }

  const toggleScreen = async () => {
    let screenTrack = localScreenStream.current.getVideoTracks()[0]

    if (screenOn && screenTrack) { // Turn OFF screen share
      screenTrack.stop()
      localScreenStream.current.removeTrack(screenTrack)
      
      Object.values(peers.current).forEach(pc => {
        const sender = pc.getSenders().find(s => s.track === screenTrack)
        if (sender) pc.removeTrack(sender)
      })
      
      setScreenOn(false)
      broadcastMeta()
      setRefreshLocal(prev => prev + 1)
    } else { // Turn ON screen share
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ 
          video: {
            width: { ideal: 1920, max: 2560 },
            height: { ideal: 1080, max: 1440 },
            frameRate: { ideal: 30, max: 60 }
          }, 
          audio: true 
        })
        screenTrack = stream.getVideoTracks()[0]
        
        screenTrack.onended = () => {
          setScreenOn(false)
          localScreenStream.current.removeTrack(screenTrack)
          broadcastMeta()
          setRefreshLocal(prev => prev + 1)
        }

        localScreenStream.current.addTrack(screenTrack)
        const sysAudio = stream.getAudioTracks()[0]
        if (sysAudio) localScreenStream.current.addTrack(sysAudio)

        Object.values(peers.current).forEach(pc => {
          localScreenStream.current.getTracks().forEach(t => {
            const sender = pc.addTrack(t, localScreenStream.current);
            // Force high bandwidth and disable scaling down for screen shares
            if (t.kind === 'video') {
              const params = sender.getParameters();
              if (!params.encodings) params.encodings = [{}];
              params.encodings[0].maxBitrate = 5000000; // 5 Mbps
              // Keep original resolution
              params.encodings[0].scaleResolutionDownBy = 1;
              sender.setParameters(params).catch(e => console.error(e));
            }
          })
        })
        
        setScreenOn(true)
        broadcastMeta()
        setRefreshLocal(prev => prev + 1)
      } catch (e) { console.error("Failed to share screen", e) }
    }
  }


  // --- Render Logic ---

  if (!joined) {
    return (
      <div className="join-container">
        <div className="card">
          <h1>Watch Party 🎬</h1>
          <p>Watch movies together, sync screens, and chat!</p>
          <div className="input-group">
            <input 
              type="text" 
              placeholder="Username" 
              value={userId} 
              onChange={e => setUserId(e.target.value)} 
            />
            <input 
              type="text" 
              placeholder="Room ID (e.g., party123)" 
              value={roomId} 
              onChange={e => setRoomId(e.target.value)} 
              onKeyDown={e => e.key === 'Enter' && joinRoom()}
            />
            <button className="primary-btn" onClick={joinRoom}>Join Room</button>
          </div>
        </div>
      </div>
    )
  }

  // Figure out the current active screen share stream (local or remote)
  let activeDisplayStream = null;
  if (screenOn && localScreenStream.current.getVideoTracks().length > 0) {
    activeDisplayStream = localScreenStream.current
  } else {
    // If we're not sharing, find if anyone else is
    for (const [, meta] of Object.entries(peerMeta)) {
      if (meta.screenStreamId && remoteStreams[meta.screenStreamId]) {
        activeDisplayStream = remoteStreams[meta.screenStreamId]
        break; // Show the first active screen share found
      }
    }
  }

  // Get active remote camera streams for side bar
  const remoteCameras = Object.entries(peerMeta).map(([uid, meta]) => {
    const stream = remoteStreams[meta.cameraStreamId];
    return { uid, stream }
  }).filter(c => c.stream !== undefined)


  return (
    <div className="app-container">
      <header className="header">
        <h2>Room: <span>{roomId}</span></h2>
        <div className="controls">
          <button className={`media-btn outline ${audioOn ? 'on' : 'off'}`} onClick={toggleAudio}>
            {audioOn ? '🎙️ Audio ON' : '🔇 Audio OFF'}
          </button>
          <button className={`media-btn outline ${videoOn ? 'on' : 'off'}`} onClick={toggleVideo}>
            {videoOn ? '📸 Video ON' : '🚫 Video OFF'}
          </button>
          <button className={`media-btn ${screenOn ? 'on' : 'share'}`} onClick={toggleScreen}>
            {screenOn ? '🛑 Stop Sharing' : '📺 Share Screen'}
          </button>
        </div>
      </header>

      <div className="main-content">
        <div className="view-area">
          
          {/* Main Display: Full Screen Share View */}
          {activeDisplayStream ? (
            <div className="screen-share-container">
              <VideoPlayer 
                stream={activeDisplayStream} 
                autoPlay 
                playsInline 
                 // Mute if it's our own local screen share stream to prevent feedback loop
                muted={activeDisplayStream === localScreenStream.current} 
              />
              <div className="badge floating">
                Screen Share Active {activeDisplayStream === localScreenStream.current ? '(You)' : ''}
              </div>
              <button 
                className="fullscreen-btn"
                onClick={(e) => {
                  const video = e.target.parentElement.querySelector('video')
                  if (video) {
                    if (video.requestFullscreen) video.requestFullscreen();
                    else if (video.webkitRequestFullscreen) video.webkitRequestFullscreen();
                    else if (video.msRequestFullscreen) video.msRequestFullscreen();
                  }
                }}
              >
                ⛶ Fullscreen
              </button>
            </div>
          ) : (
            <div className="empty-screen">
               <div className="icon">🍿</div>
               <h3>Welcome to the Party!</h3>
               <p>Turn on Video or Share your Screen to start</p>
            </div>
          )}

          {/* Side Bar Cameras Row (at the bottom of the main view area) */}
          <div className="cameras-bar">
            {/* Local Camera */}
            <div className="camera-card local">
              <VideoPlayer stream={localCameraStream.current} autoPlay playsInline muted />
              <div className="badge">You ({userId})</div>
              <div className="status-icons">
                 {!audioOn && <span className="mic-off">🔇</span>}
                 {!videoOn && <span className="vid-off">🚫</span>}
              </div>
            </div>
            
            {/* Remote Cameras */}
            {remoteCameras.map(({uid, stream}) => (
              <div key={uid} className="camera-card remote">
                <VideoPlayer stream={stream} autoPlay playsInline />
                <div className="badge">{uid}</div>
              </div>
            ))}
          </div>

        </div>

        {/* Messaging Sidebar */}
        <div className="sidebar">
          <div className="users-list">
            <h3>Connected Users ({users.length + 1})</h3>
            <ul>
              <li>{userId} (You)</li>
              {users.map(u => <li key={u}>{u}</li>)}
            </ul>
          </div>

          <div className="chat-box">
            <h3>Live Chat</h3>
            <div className="messages">
              {messages.map((m, i) => (
                <div key={i} className={`message ${m.sender === userId ? 'self' : ''}`}>
                  <strong>{m.sender === userId ? 'You' : m.sender}: </strong>{m.text}
                </div>
              ))}
            </div>
            <div className="chat-input">
              <input 
                type="text" 
                placeholder="Type a message..." 
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendMessage()}
              />
              <button onClick={sendMessage}>Send</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// React wrapper to consistently update HTML5 video elements when Stream references change natively
function VideoPlayer({ stream, autoPlay, playsInline, muted }) {
  const videoRef = useRef(null)

  useEffect(() => {
    if (videoRef.current && stream) {
      if (videoRef.current.srcObject !== stream) {
        videoRef.current.srcObject = stream
      }
    }
  }, [stream])

  return <video ref={videoRef} autoPlay={autoPlay} playsInline={playsInline} muted={muted}></video>
}

export default App
