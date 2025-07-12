import { io, Socket } from 'socket.io-client';

class RealtimeService {
  private socket: Socket | null = null;
  private projectId: string | null = null;
  private userId: string | null = null;

  connect(projectId: string, userId: string) {
    this.projectId = projectId;
    this.userId = userId;

    // Connect to WebSocket server
    this.socket = io(process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001', {
      query: {
        projectId,
        userId,
      },
    });

    this.socket.on('connect', () => {
      console.log('Connected to real-time service');
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from real-time service');
    });

    this.socket.on('error', (error: any) => {
      console.error('WebSocket error:', error);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.projectId = null;
    this.userId = null;
  }

  // Subscribe to task updates
  onTaskUpdate(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('task:updated', callback);
    }
  }

  // Subscribe to task creation
  onTaskCreated(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('task:created', callback);
    }
  }

  // Subscribe to task deletion
  onTaskDeleted(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('task:deleted', callback);
    }
  }

  // Subscribe to member updates
  onMemberUpdate(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('member:updated', callback);
    }
  }

  // Emit task update
  emitTaskUpdate(taskData: any) {
    if (this.socket) {
      this.socket.emit('task:update', {
        projectId: this.projectId,
        taskData,
      });
    }
  }

  // Emit task creation
  emitTaskCreated(taskData: any) {
    if (this.socket) {
      this.socket.emit('task:created', {
        projectId: this.projectId,
        taskData,
      });
    }
  }

  // Emit task deletion
  emitTaskDeleted(taskId: string) {
    if (this.socket) {
      this.socket.emit('task:deleted', {
        projectId: this.projectId,
        taskId,
      });
    }
  }

  // Emit member update
  emitMemberUpdate(memberData: any) {
    if (this.socket) {
      this.socket.emit('member:updated', {
        projectId: this.projectId,
        memberData,
      });
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

export const realtimeService = new RealtimeService();
