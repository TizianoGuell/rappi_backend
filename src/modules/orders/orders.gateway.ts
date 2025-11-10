export class OrdersGateway {
  server: any = null;

  attach(serverInstance: any) {
    this.server = serverInstance;
  }

  emitOrderUpdate(orderId: number, payload: any) {
    try {
      if (!this.server) return;
      this.server.emit &&
        this.server.emit('order:update', { orderId, ...payload });
      if (this.server.to)
        this.server
          .to(`order:${orderId}`)
          .emit('order:update', { orderId, ...payload });
    } catch (e) {}
  }
}
