"""
WatchParty 3D - Backend Server
FastAPI + Socket.IO for real-time movie room synchronization
"""

import uuid
import asyncio
from datetime import datetime
from contextlib import asynccontextmanager

import socketio
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from database import database, rooms as rooms_table, messages as messages_table
from room_manager import room_manager


# ── Socket.IO Setup ──────────────────────────────────────────────────────────

sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins="*",
    logger=False,
    engineio_logger=False,
)


# ── FastAPI Lifespan ─────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    await database.connect()
    print("✅  WatchParty 3D backend started")
    yield
    await database.disconnect()
    print("🔴  WatchParty 3D backend stopped")


app = FastAPI(title="WatchParty 3D", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Pydantic Models ─────────────────────────────────────────────────────────

class CreateRoomRequest(BaseModel):
    name: str
    username: str


class CreateRoomResponse(BaseModel):
    room_id: str
    host_id: str
    invite_link: str


class RoomInfoResponse(BaseModel):
    room_id: str
    name: str
    host_id: str
    user_count: int
    is_active: bool


# ── REST API Endpoints ───────────────────────────────────────────────────────

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "service": "WatchParty 3D"}


@app.post("/api/rooms", response_model=CreateRoomResponse)
async def create_room(req: CreateRoomRequest):
    host_id = str(uuid.uuid4())[:12]
    room = room_manager.create_room(name=req.name, host_id=host_id)

    # Persist to DB
    await database.execute(
        rooms_table.insert().values(
            id=room.id,
            name=room.name,
            host_id=host_id,
            is_active=True,
        )
    )

    return CreateRoomResponse(
        room_id=room.id,
        host_id=host_id,
        invite_link=f"/room/{room.id}",
    )


@app.get("/api/rooms/{room_id}", response_model=RoomInfoResponse)
async def get_room_info(room_id: str):
    room = room_manager.get_room(room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    return RoomInfoResponse(
        room_id=room.id,
        name=room.name,
        host_id=room.host_id,
        user_count=len(room.users),
        is_active=True,
    )


@app.get("/api/rooms/{room_id}/messages")
async def get_messages(room_id: str, limit: int = 50):
    query = (
        messages_table.select()
        .where(messages_table.c.room_id == room_id)
        .order_by(messages_table.c.timestamp.desc())
        .limit(limit)
    )
    rows = await database.fetch_all(query)
    return [
        {
            "id": row["id"],
            "user_id": row["user_id"],
            "username": row["username"],
            "content": row["content"],
            "timestamp": str(row["timestamp"]),
        }
        for row in reversed(rows)
    ]


# ── Socket.IO Event Handlers ────────────────────────────────────────────────

@sio.event
async def connect(sid, environ):
    print(f"🔌 Client connected: {sid}")


@sio.event
async def disconnect(sid):
    print(f"🔌 Client disconnected: {sid}")
    result = room_manager.leave_room(sid)
    if result:
        room_id, user, room_deleted = result
        if not room_deleted:
            users = room_manager.get_room_users(room_id)
            await sio.emit("user_left", {
                "user_id": user.id,
                "username": user.username,
                "users": users,
            }, room=room_id)


@sio.event
async def join_room(sid, data):
    room_id = data.get("room_id")
    username = data.get("username")
    user_id = data.get("user_id", str(uuid.uuid4())[:12])

    room = room_manager.get_room(room_id)
    if not room:
        await sio.emit("error", {"message": "Room not found"}, to=sid)
        return

    user = room_manager.join_room(room_id, user_id, username, sid)
    if not user:
        await sio.emit("error", {"message": "Could not join room"}, to=sid)
        return

    sio.enter_room(sid, room_id)

    users = room_manager.get_room_users(room_id)
    playback = room_manager.get_playback_state(room_id)

    # Send room state to the joining user
    await sio.emit("room_joined", {
        "user": {
            "id": user.id,
            "username": user.username,
            "sid": user.sid,
            "is_host": user.is_host,
            "avatar_color": user.avatar_color,
        },
        "users": users,
        "playback": playback,
        "room_name": room.name,
    }, to=sid)

    # Notify others
    await sio.emit("user_joined", {
        "user": {
            "id": user.id,
            "username": user.username,
            "sid": user.sid,
            "is_host": user.is_host,
            "avatar_color": user.avatar_color,
        },
        "users": users,
    }, room=room_id, skip_sid=sid)


@sio.event
async def chat_message(sid, data):
    room_id = data.get("room_id")
    content = data.get("content")
    username = data.get("username")
    user_id = data.get("user_id")

    # Persist to DB
    await database.execute(
        messages_table.insert().values(
            room_id=room_id,
            user_id=user_id,
            username=username,
            content=content,
        )
    )

    await sio.emit("chat_message", {
        "user_id": user_id,
        "username": username,
        "content": content,
        "timestamp": datetime.now().isoformat(),
    }, room=room_id)


@sio.event
async def playback_update(sid, data):
    """Host controls playback (play/pause/seek)"""
    room_id = data.get("room_id")
    is_playing = data.get("is_playing")
    current_time = data.get("current_time", 0)

    room_manager.update_playback(room_id, is_playing, current_time)

    await sio.emit("playback_sync", {
        "is_playing": is_playing,
        "current_time": current_time,
    }, room=room_id, skip_sid=sid)


@sio.event
async def screen_share_started(sid, data):
    room_id = data.get("room_id")
    user_id = data.get("user_id")

    room = room_manager.get_room(room_id)
    if room:
        room.playback.is_screen_sharing = True
        room.playback.screen_sharer_id = user_id

    await sio.emit("screen_share_started", {
        "user_id": user_id,
    }, room=room_id, skip_sid=sid)


@sio.event
async def screen_share_stopped(sid, data):
    room_id = data.get("room_id")

    room = room_manager.get_room(room_id)
    if room:
        room.playback.is_screen_sharing = False
        room.playback.screen_sharer_id = None

    await sio.emit("screen_share_stopped", {}, room=room_id, skip_sid=sid)


@sio.event
async def toggle_audio(sid, data):
    room_id = data.get("room_id")
    has_audio = data.get("has_audio")

    room = room_manager.get_room(room_id)
    if room and sid in room.users:
        room.users[sid].has_audio = has_audio

    users = room_manager.get_room_users(room_id)
    await sio.emit("users_updated", {"users": users}, room=room_id)


@sio.event
async def toggle_video(sid, data):
    room_id = data.get("room_id")
    has_video = data.get("has_video")

    room = room_manager.get_room(room_id)
    if room and sid in room.users:
        room.users[sid].has_video = has_video

    users = room_manager.get_room_users(room_id)
    await sio.emit("users_updated", {"users": users}, room=room_id)


@sio.event
async def speaking_update(sid, data):
    room_id = data.get("room_id")
    is_speaking = data.get("is_speaking")

    room = room_manager.get_room(room_id)
    if room and sid in room.users:
        room.users[sid].is_speaking = is_speaking

    await sio.emit("speaking_update", {
        "sid": sid,
        "is_speaking": is_speaking,
    }, room=room_id, skip_sid=sid)


# ── WebRTC Signaling ────────────────────────────────────────────────────────

@sio.event
async def webrtc_offer(sid, data):
    target_sid = data.get("target_sid")
    await sio.emit("webrtc_offer", {
        "sdp": data.get("sdp"),
        "from_sid": sid,
        "type": data.get("type", "media"),  # 'media' or 'screen'
    }, to=target_sid)


@sio.event
async def webrtc_answer(sid, data):
    target_sid = data.get("target_sid")
    await sio.emit("webrtc_answer", {
        "sdp": data.get("sdp"),
        "from_sid": sid,
        "type": data.get("type", "media"),
    }, to=target_sid)


@sio.event
async def webrtc_ice_candidate(sid, data):
    target_sid = data.get("target_sid")
    await sio.emit("webrtc_ice_candidate", {
        "candidate": data.get("candidate"),
        "from_sid": sid,
        "type": data.get("type", "media"),
    }, to=target_sid)


# ── Mount Socket.IO on FastAPI ───────────────────────────────────────────────

socket_app = socketio.ASGIApp(sio, other_asgi_app=app)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(socket_app, host="0.0.0.0", port=8000, log_level="info")
