const logger = require('../utils/logger');

let ioInstance;

function initializeSocket(io) {
  ioInstance = io;

  io.on('connection', (socket) => {
    logger.info(`Client connected: ${socket.id}`);

    socket.emit('connection_ack', {
      socketId: socket.id,
      connectedAt: new Date().toISOString()
    });

    socket.on('disconnect', (reason) => {
      logger.info(`Client disconnected: ${socket.id}`, { reason });
    });
  });

  return io;
}

function broadcastOrderChange(payload) {
  if (!ioInstance) {
    logger.warn('Socket.IO has not been initialized. Skipping broadcast.');
    return;
  }

  ioInstance.emit('order_change', {
    ...payload,
    receivedAt: new Date().toISOString()
  });
}

module.exports = {
  initializeSocket,
  broadcastOrderChange
};
