from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import json

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ConnectionManager:
    def __init__(self):
        # Maps room_id -> { user_id -> WebSocket }
        self.active_rooms = {}

    async def connect(self, room_id: str, user_id: str, websocket: WebSocket):
        await websocket.accept()
        if room_id not in self.active_rooms:
            self.active_rooms[room_id] = {}
        self.active_rooms[room_id][user_id] = websocket
        
        # Notify others in the room
        await self.broadcast(room_id, {
            "type": "user-joined",
            "userId": user_id
        }, exclude=user_id)
        
        # Send current users to the newly joined user
        other_users = [uid for uid in self.active_rooms[room_id].keys() if uid != user_id]
        await websocket.send_json({
            "type": "room-users",
            "users": other_users
        })

    def disconnect(self, room_id: str, user_id: str):
        if room_id in self.active_rooms and user_id in self.active_rooms[room_id]:
            del self.active_rooms[room_id][user_id]
            if not self.active_rooms[room_id]:
                del self.active_rooms[room_id]
            else:
                return True
        return False

    async def broadcast(self, room_id: str, message: dict, exclude: str = None):
        if room_id in self.active_rooms:
            for uid, ws in self.active_rooms[room_id].items():
                if uid != exclude:
                    await ws.send_json(message)

    async def send_personal_message(self, room_id: str, to_user_id: str, message: dict):
        if room_id in self.active_rooms and to_user_id in self.active_rooms[room_id]:
            await self.active_rooms[room_id][to_user_id].send_json(message)

manager = ConnectionManager()

@app.websocket("/ws/{room_id}/{user_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str, user_id: str):
    await manager.connect(room_id, user_id, websocket)
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            msg_type = message.get("type")
            
            if msg_type in ["offer", "answer", "ice-candidate"]:
                target = message.get("target")
                if target:
                    message["sender"] = user_id
                    await manager.send_personal_message(room_id, target, message)
            
            elif msg_type in ["chat", "stream-meta"]:
                message["sender"] = user_id
                await manager.broadcast(room_id, message)
                
    except WebSocketDisconnect:
        should_notify = manager.disconnect(room_id, user_id)
        if should_notify:
            await manager.broadcast(room_id, {
                "type": "user-left",
                "userId": user_id
            })

@app.get("/")
def read_root():
    return {"message": "Watch Party Signaling Server Running"}
