export const SOCKET_URL = '';  // Same origin, proxied by Vite

export const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export const AVATAR_EMOJIS = ['🎬', '🍿', '🎥', '🎞️', '📽️', '🎭', '🎪', '🎨'];

export const SEAT_POSITIONS = [
  { x: -3,   y: 0, z: 2 },
  { x: -1.5, y: 0, z: 2 },
  { x: 0,    y: 0, z: 2 },
  { x: 1.5,  y: 0, z: 2 },
  { x: 3,    y: 0, z: 2 },
  { x: -2.5, y: 0, z: 4 },
  { x: -1,   y: 0, z: 4 },
  { x: 1,    y: 0, z: 4 },
  { x: 2.5,  y: 0, z: 4 },
  { x: -3.5, y: 0, z: 6 },
  { x: -2,   y: 0, z: 6 },
  { x: 0,    y: 0, z: 6 },
  { x: 2,    y: 0, z: 6 },
  { x: 3.5,  y: 0, z: 6 },
];
