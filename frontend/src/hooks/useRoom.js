import { useState, useCallback, useEffect, useRef } from 'react';

export function useRoom(socket, isConnected) {
  const [roomId, setRoomId] = useState(null);
  const [roomName, setRoomName] = useState('');
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [playbackState, setPlaybackState] = useState({
    is_playing: false,
    current_time: 0,
  });

  // Join room
  const joinRoom = useCallback(
    (rId, username, userId) => {
      if (!socket.current) return;
      socket.current.emit('join_room', {
        room_id: rId,
        username,
        user_id: userId,
      });
      setRoomId(rId);
    },
    [socket]
  );

  // Send chat message
  const sendMessage = useCallback(
    (content) => {
      if (!socket.current || !currentUser || !roomId) return;
      socket.current.emit('chat_message', {
        room_id: roomId,
        content,
        username: currentUser.username,
        user_id: currentUser.id,
      });
    },
    [socket, currentUser, roomId]
  );

  // Update playback
  const updatePlayback = useCallback(
    (isPlaying, currentTime) => {
      if (!socket.current || !roomId) return;
      socket.current.emit('playback_update', {
        room_id: roomId,
        is_playing: isPlaying,
        current_time: currentTime,
      });
      setPlaybackState({ is_playing: isPlaying, current_time: currentTime });
    },
    [socket, roomId]
  );

  // Listen for events
  useEffect(() => {
    if (!socket.current) return;

    const handleRoomJoined = (data) => {
      setCurrentUser(data.user);
      setUsers(data.users);
      setRoomName(data.room_name);
      if (data.playback) {
        setPlaybackState(data.playback);
      }
    };

    const handleUserJoined = (data) => {
      setUsers(data.users);
    };

    const handleUserLeft = (data) => {
      setUsers(data.users);
    };

    const handleUsersUpdated = (data) => {
      setUsers(data.users);
    };

    const handleChatMessage = (data) => {
      setMessages((prev) => [...prev, data]);
    };

    const handlePlaybackSync = (data) => {
      setPlaybackState(data);
    };

    const handleSpeakingUpdate = (data) => {
      setUsers((prev) =>
        prev.map((u) =>
          u.sid === data.sid ? { ...u, is_speaking: data.is_speaking } : u
        )
      );
    };

    const handleError = (data) => {
      console.error('Room error:', data.message);
    };

    socket.current.on('room_joined', handleRoomJoined);
    socket.current.on('user_joined', handleUserJoined);
    socket.current.on('user_left', handleUserLeft);
    socket.current.on('users_updated', handleUsersUpdated);
    socket.current.on('chat_message', handleChatMessage);
    socket.current.on('playback_sync', handlePlaybackSync);
    socket.current.on('speaking_update', handleSpeakingUpdate);
    socket.current.on('error', handleError);

    return () => {
      socket.current?.off('room_joined', handleRoomJoined);
      socket.current?.off('user_joined', handleUserJoined);
      socket.current?.off('user_left', handleUserLeft);
      socket.current?.off('users_updated', handleUsersUpdated);
      socket.current?.off('chat_message', handleChatMessage);
      socket.current?.off('playback_sync', handlePlaybackSync);
      socket.current?.off('speaking_update', handleSpeakingUpdate);
      socket.current?.off('error', handleError);
    };
  }, [socket]);

  return {
    roomId,
    roomName,
    users,
    currentUser,
    messages,
    playbackState,
    joinRoom,
    sendMessage,
    updatePlayback,
  };
}
