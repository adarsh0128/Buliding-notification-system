const path = require('path');
const http = require('http');
const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');

const config = require('./config/env');
const logger = require('./utils/logger');
const apiRoutes = require('./routes/orderRoutes');
const { initializeSocket } = require('./socket/socketManager');
const { startOrderChangeListener } = require('./listeners/orderListener');
const { closePool } = require('./config/db');

async function bootstrap() {
  const app = express();
  const server = http.createServer(app);

  const io = new Server(server, {
    cors: {
      origin: config.corsOrigin,
      methods: ['GET']
    }
  });

  app.use(cors({ origin: config.corsOrigin }));
  app.use(express.json());
  app.use('/api', apiRoutes);
  app.use(express.static(path.resolve(process.cwd(), 'frontend')));

  app.get('*', (_req, res) => {
    res.sendFile(path.resolve(process.cwd(), 'frontend/index.html'));
  });

  initializeSocket(io);
  const listenerClient = await startOrderChangeListener();

  server.listen(config.port, () => {
    logger.info(`Server started on port ${config.port}`);
  });

  async function shutdown(signal) {
    logger.info(`${signal} received. Shutting down gracefully.`);

    server.close(async () => {
      await listenerClient.end();
      await closePool();
      logger.info('Shutdown complete.');
      process.exit(0);
    });
  }

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

bootstrap().catch((error) => {
  logger.error('Application failed to start', error);
  process.exit(1);
});
