<<<<<<< HEAD
# 🎬 WatchParty 3D

**Watch movies together in an immersive 3D cinema environment.**

WatchParty 3D lets friends create virtual movie rooms, share screens with audio, and communicate through voice, video, and chat — all inside a stunning 3D cinema built with Three.js.

![WatchParty 3D](https://img.shields.io/badge/WatchParty-3D-8b5cf6?style=for-the-badge)

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🎥 **Screen Sharing** | Share your screen with system audio so everyone hears the movie |
| 🎤 **Voice Chat** | Talk with friends in real-time with speaking indicators |
| 📹 **Video Chat** | Optional webcam video displayed as bubbles |
| 💬 **Live Chat** | Text messaging while watching |
| 🎭 **3D Cinema** | Immersive Three.js cinema with neon lighting and avatars |
| 🔗 **Invite Links** | Share a unique URL to invite friends |
| 👥 **User Presence** | See who's in the room with speaking indicators |
| 🎮 **Host Controls** | Host can control playback for everyone |

---

## 🛠️ Tech Stack

### Frontend
- **React 18** + **Vite 8**
- **Three.js** + **React Three Fiber** + **Drei**
- **TailwindCSS v4**
- **Socket.IO Client**
- **WebRTC** (native browser APIs)
- **Lucide React** (icons)

### Backend
- **FastAPI** (Python)
- **python-socketio** (real-time events)
- **SQLite** + **databases** (async DB access)
- **SQLAlchemy** (schema)

---

## 📁 Project Structure

```
Movie/
├── backend/
│   ├── main.py              # FastAPI + Socket.IO server
│   ├── database.py          # SQLite schema
│   ├── room_manager.py      # Room/user management
│   └── requirements.txt     # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── App.jsx          # Router
│   │   ├── main.jsx         # Entry point
│   │   ├── index.css        # Design system
│   │   ├── components/
│   │   │   ├── Landing.jsx       # Home page
│   │   │   ├── Room.jsx          # Main room view
│   │   │   ├── Cinema3D.jsx      # 3D cinema scene
│   │   │   ├── ChatPanel.jsx     # Text chat
│   │   │   ├── VideoGrid.jsx     # Video bubbles
│   │   │   ├── Controls.jsx      # Media controls
│   │   │   └── ParticipantList.jsx
│   │   ├── hooks/
│   │   │   ├── useSocket.js      # Socket.IO
│   │   │   ├── useRoom.js        # Room state
│   │   │   └── useWebRTC.js      # WebRTC
│   │   └── utils/
│   │       └── constants.js
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
└── README.md
```

---

## 🚀 Setup Instructions

### Prerequisites
- **Node.js** ≥ 18
- **Python** ≥ 3.9
- **pip**

### 1. Backend Setup

```bash
# Navigate to backend
cd backend

# Create virtual environment (recommended)
python -m venv venv
venv\Scripts\activate      # Windows
# source venv/bin/activate  # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Start the server
python main.py
```

The backend will start on **http://localhost:8000**

### 2. Frontend Setup

```bash
# Navigate to frontend (in a new terminal)
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

The frontend will start on **http://localhost:5173**

---

## 🎮 How to Use

1. **Create a Room**: Enter your name and room name, click "Create Cinema Room"
2. **Copy Invite Link**: Share the generated link with friends
3. **Join**: Friends open the link, enter their name, and join
4. **Share Screen**: Click the screen share button to share your movie
5. **Communicate**: Use mic, camera, or text chat during the movie

---

## 🌐 How It Works

```
┌──────────┐     WebSocket     ┌──────────┐
│ Browser  │ ◄───────────────► │ FastAPI  │
│ (React)  │   Socket.IO      │ Server   │
│          │                   │          │
│ Three.js │     WebRTC        │ SQLite   │
│ Cinema   │ ◄──────────────►  │ Database │
└──────────┘  Peer-to-Peer     └──────────┘
```

- **Socket.IO**: Room management, chat, playback sync, signaling
- **WebRTC**: Direct peer-to-peer audio/video/screen streaming
- **Three.js**: 3D cinema rendering with avatars

---

## 📝 License

MIT — build, share, and watch movies together! 🍿
