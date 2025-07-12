const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Store connected users by project
const projectRooms = new Map();

io.on('connection', (socket) => {
  const { projectId, userId } = socket.handshake.query;

  console.log(`User ${userId} connected to project ${projectId}`);

  // Join project room
  socket.join(`project:${projectId}`);

  // Track user in project room
  if (!projectRooms.has(projectId)) {
    projectRooms.set(projectId, new Set());
  }
  projectRooms.get(projectId).add(userId);

  // Handle task updates
  socket.on('task:update', (data) => {
    console.log(`Task updated in project ${data.projectId}:`, data.taskData);
    socket.to(`project:${data.projectId}`).emit('task:updated', data.taskData);
  });

  // Handle task creation
  socket.on('task:created', (data) => {
    console.log(`Task created in project ${data.projectId}:`, data.taskData);
    socket.to(`project:${data.projectId}`).emit('task:created', data.taskData);
  });

  // Handle task deletion
  socket.on('task:deleted', (data) => {
    console.log(`Task deleted in project ${data.projectId}:`, data.taskId);
    socket.to(`project:${data.projectId}`).emit('task:deleted', data.taskId);
  });

  // Handle member updates
  socket.on('member:updated', (data) => {
    console.log(`Member updated in project ${data.projectId}:`, data.memberData);
    socket.to(`project:${data.projectId}`).emit('member:updated', data.memberData);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`User ${userId} disconnected from project ${projectId}`);

    // Remove user from project room tracking
    if (projectRooms.has(projectId)) {
      projectRooms.get(projectId).delete(userId);

      // Clean up empty project rooms
      if (projectRooms.get(projectId).size === 0) {
        projectRooms.delete(projectId);
      }
    }
  });
});

const PORT = process.env.WS_PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`WebSocket server running on port ${PORT}`);
});
