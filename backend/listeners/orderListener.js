const { createNotificationClient } = require('../config/db');
const logger = require('../utils/logger');
const { broadcastOrderChange } = require('../socket/socketManager');

const CHANNEL_NAME = 'order_changes';

async function startOrderChangeListener() {
  const client = createNotificationClient();

  client.on('notification', (message) => {
    try {
      const payload = JSON.parse(message.payload);

      logger.info('Notification received:', payload);
      broadcastOrderChange(payload);
    } catch (error) {
      logger.error('Failed to parse PostgreSQL notification payload', {
        payload: message.payload,
        error: error.message
      });
    }
  });

  client.on('error', (error) => {
    logger.error('PostgreSQL notification listener error', error);
  });

  await client.connect();
  logger.info('Connected notification listener to PostgreSQL');

  await client.query(`LISTEN ${CHANNEL_NAME}`);
  logger.info(`Listening on channel: ${CHANNEL_NAME}`);

  return client;
}

module.exports = {
  startOrderChangeListener,
  CHANNEL_NAME
};
