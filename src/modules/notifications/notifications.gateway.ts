export class NotificationsGateway {
  server: any = null;

  attach(serverInstance: any) {
    this.server = serverInstance;
  }

  emitNotification(userId: number, payload: any) {
    try {
      if (!this.server) return;
      this.server.emit && this.server.emit('notification:new', { userId, ...payload });

      if (this.server.to) this.server.to(`user:${userId}`).emit('notification:new', { userId, ...payload });
    } catch (e) {}
  }

  emitNotificationRead(userId: number, notificationId: number) {
    try {
      if (!this.server) return;
      this.server.emit && this.server.emit('notification:read', { userId, notificationId });
      if (this.server.to) this.server.to(`user:${userId}`).emit('notification:read', { userId, notificationId });
    } catch (e) {}
  }
}
