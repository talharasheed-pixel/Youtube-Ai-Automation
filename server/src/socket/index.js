/**
 * WebSocket event handlers — real-time updates for the dashboard.
 */
function setupSocket(io) {
  io.on('connection', (socket) => {
    console.log(`[WS] Client connected: ${socket.id}`);

    // Join project room for real-time updates
    socket.on('project:join', (projectId) => {
      socket.join(`project:${projectId}`);
      console.log(`[WS] ${socket.id} joined project:${projectId}`);
    });

    socket.on('project:leave', (projectId) => {
      socket.leave(`project:${projectId}`);
    });

    // Join global room for dashboard updates
    socket.join('dashboard');

    socket.on('disconnect', () => {
      console.log(`[WS] Client disconnected: ${socket.id}`);
    });
  });

  return io;
}

module.exports = { setupSocket };
