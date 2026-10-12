import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './logger.js';
import { closeDatabaseConnection } from './db/index.js';
import { BRAND_NAME } from '@prvo/shared';

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info(
    { port: env.PORT, nodeEnv: env.NODE_ENV, service: BRAND_NAME },
    `🚀 ${BRAND_NAME} API listening on port ${env.PORT}`,
  );
});

let isShuttingDown = false;

async function handleShutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info({ signal }, `Received ${signal}, initiating graceful shutdown...`);

  // Force shutdown after 10 seconds timeout
  const forceTimer = setTimeout(() => {
    logger.error('Graceful shutdown timeout exceeded, forcing exit.');
    process.exit(1);
  }, 10000);
  forceTimer.unref();

  server.close(async (err) => {
    if (err) {
      logger.error({ err }, 'Error occurred while closing HTTP server');
    } else {
      logger.info('HTTP server closed successfully');
    }

    await closeDatabaseConnection();
    logger.info('Graceful shutdown complete');
    process.exit(0);
  });
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('unhandledRejection', (reason) => {
  logger.error({ err: reason }, 'Unhandled Promise Rejection');
});
