import { io } from 'socket.io-client';

let socket = null;

export function getSocket() {
  if (!socket) {
    socket = io('/', {
      transports: ['websocket', 'polling'],
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    });

    socket.on('connect', () => console.log('[WS] Connected:', socket.id));
    socket.on('disconnect', () => console.log('[WS] Disconnected'));
    socket.on('connect_error', (err) => console.warn('[WS] Connection error:', err.message));
  }
  return socket;
}

export function joinProject(projectId) {
  const s = getSocket();
  s.emit('project:join', projectId);
}

export function leaveProject(projectId) {
  const s = getSocket();
  s.emit('project:leave', projectId);
}
