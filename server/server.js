const app = require('./app');
const config = require('./src/config/env');
const { connectDatabase, disconnectDatabase } = require('./src/config/db');
const logger = require('./src/utils/logger');

let server;

async function start() {
  try {
    try {
      await connectDatabase();
    } catch (dbError) {
      if (config.isProduction) {
        throw dbError;
      }
      logger.warn(
        'Starting without MongoDB Atlas connection. Configure MONGODB_URI in server/.env. Health will report degraded.'
      );
    }

    server = app.listen(config.port, () => {
      logger.info(`ERP API listening on port ${config.port} [${config.nodeEnv}]`);
      logger.info(`Health check: http://localhost:${config.port}/api/v1/health`);
    });
  } catch (error) {
    logger.error('Server failed to start', { message: error.message });
    process.exit(1);
  }
}

async function shutdown(signal) {
  logger.info(`${signal} received — shutting down gracefully`);

  if (server) {
    server.close(async () => {
      try {
        await disconnectDatabase();
      } catch (err) {
        logger.error('Error during database disconnect', { message: err.message });
      }
      process.exit(0);
    });

    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000).unref();
  } else {
    process.exit(0);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', {
    message: reason instanceof Error ? reason.message : String(reason),
  });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { message: error.message });
  process.exit(1);
});

start();
