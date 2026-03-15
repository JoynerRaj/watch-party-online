# Watch Party 🎬

A full-stack Web Application that allows friends to watch movies together, sync screens, chat in real-time, and talk using WebRTC.

## Technology Stack
- **Backend**: Python, FastAPI, WebSockets
- **Frontend**: React (Vite), JavaScript, vanilla CSS
- **Real-Time Communication**: WebRTC for Audio/Video/Screen Sharing & WebSocket for Signaling/Chatting

## Project Structure
```text
WatchParty/
├── backend/
│   ├── main.py             # FastAPI Server & WebSocket Manager
│   └── requirements.txt    # Python Dependencies
└── frontend/
    ├── package.json        # Node.js Dependencies
    └── src/
        ├── App.jsx         # Main React Application & WebRTC Logic
        ├── App.css         # Beautiful styling for UI
        ├── main.jsx        # Application Entry Point
        └── index.css       # Clean styling reset
```

## How to Run

### 1. Setup Backend
1. Open a terminal and navigate to the project directory.
2. Create and activate a Virtual Environment:
   ```cmd
   python -m venv venv
   venv\Scripts\activate
   ```
3. Install the required Python dependencies:
   ```cmd
   pip install -r backend\requirements.txt
   ```
4. Start the FastAPI WebSocket server:
   ```cmd
   uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
   ```

### 2. Setup Frontend
1. Open a new, separate terminal and navigate to the `frontend` directory:
   ```cmd
   cd frontend
   ```
2. Install the necessary node modules:
   ```cmd
   npm install
   ```
3. Start the Vite React development server:
   ```cmd
   npm run dev
   ```

### 3. Usage & Testing
1. Visit `http://localhost:5173` in your browser.
2. Enter a **Username** and a **Room ID** (e.g., `movie-night-1`) and click **Join**.
3. Duplicate the tab or open a second browser window and join the SAME Room ID with a different Username.
4. Click **📹 Enable Video/Audio** to test your webcam and microphone.
5. Click **📺 Share Screen** to select the movie window or entire screen.
6. The screens and video streams will magically sync between all peers inside the room using a WebRTC Mesh Network.
7. Send text messages in the Live Chat to see instant communication!
