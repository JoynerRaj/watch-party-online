import uuid
import time
from typing import Dict, List, Optional
from dataclasses import dataclass, field


@dataclass
class User:
    id: str
    username: str
    sid: str  # socket.io session id
    is_host: bool = False
    has_video: bool = False
    has_audio: bool = False
    is_speaking: bool = False
    avatar_color: str = "#6366f1"


@dataclass
class PlaybackState:
    is_playing: bool = False
    current_time: float = 0.0
    last_updated: float = field(default_factory=time.time)
    is_screen_sharing: bool = False
    screen_sharer_id: Optional[str] = None


@dataclass
class Room:
    id: str
    name: str
    host_id: str
    users: Dict[str, User] = field(default_factory=dict)
    playback: PlaybackState = field(default_factory=PlaybackState)
    created_at: float = field(default_factory=time.time)


class RoomManager:
    def __init__(self):
        self.rooms: Dict[str, Room] = {}
        self.user_to_room: Dict[str, str] = {}  # sid -> room_id
        self.avatar_colors = [
            "#6366f1", "#8b5cf6", "#a855f7", "#d946ef",
            "#ec4899", "#f43f5e", "#ef4444", "#f97316",
            "#eab308", "#22c55e", "#14b8a6", "#06b6d4",
            "#3b82f6", "#6366f1", "#8b5cf6", "#a78bfa",
        ]

    def create_room(self, name: str, host_id: str) -> Room:
        room_id = str(uuid.uuid4())[:8]
        room = Room(id=room_id, name=name, host_id=host_id)
        self.rooms[room_id] = room
        return room

    def get_room(self, room_id: str) -> Optional[Room]:
        return self.rooms.get(room_id)

    def join_room(self, room_id: str, user_id: str, username: str, sid: str) -> Optional[User]:
        room = self.rooms.get(room_id)
        if not room:
            return None

        color_index = len(room.users) % len(self.avatar_colors)
        is_host = (user_id == room.host_id) or len(room.users) == 0

        user = User(
            id=user_id,
            username=username,
            sid=sid,
            is_host=is_host,
            avatar_color=self.avatar_colors[color_index]
        )
        room.users[sid] = user
        self.user_to_room[sid] = room_id

        if is_host and len(room.users) == 1:
            room.host_id = user_id

        return user

    def leave_room(self, sid: str) -> Optional[tuple]:
        room_id = self.user_to_room.get(sid)
        if not room_id:
            return None

        room = self.rooms.get(room_id)
        if not room:
            return None

        user = room.users.pop(sid, None)
        del self.user_to_room[sid]

        # If the room is empty, clean it up
        if not room.users:
            del self.rooms[room_id]
            return (room_id, user, True)

        # If the host left, assign a new host
        if user and user.is_host and room.users:
            new_host_sid = next(iter(room.users))
            room.users[new_host_sid].is_host = True
            room.host_id = room.users[new_host_sid].id

        return (room_id, user, False)

    def get_room_users(self, room_id: str) -> List[dict]:
        room = self.rooms.get(room_id)
        if not room:
            return []
        return [
            {
                "id": u.id,
                "username": u.username,
                "sid": u.sid,
                "is_host": u.is_host,
                "has_video": u.has_video,
                "has_audio": u.has_audio,
                "is_speaking": u.is_speaking,
                "avatar_color": u.avatar_color,
            }
            for u in room.users.values()
        ]

    def update_playback(self, room_id: str, is_playing: bool, current_time: float):
        room = self.rooms.get(room_id)
        if room:
            room.playback.is_playing = is_playing
            room.playback.current_time = current_time
            room.playback.last_updated = time.time()

    def get_playback_state(self, room_id: str) -> Optional[dict]:
        room = self.rooms.get(room_id)
        if not room:
            return None
        return {
            "is_playing": room.playback.is_playing,
            "current_time": room.playback.current_time,
            "last_updated": room.playback.last_updated,
            "is_screen_sharing": room.playback.is_screen_sharing,
            "screen_sharer_id": room.playback.screen_sharer_id,
        }


room_manager = RoomManager()
