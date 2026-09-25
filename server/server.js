const app = require('./app');
const config = require('./src/config/env');
const { connectDatabase, disconnectDatabase } = require('./src/config/db');
const logger = require('./src/utils/logger');
const { freePort } = require('./src/utils/freePort');
const { isMailConfigured, getMailTransport } = require('./src/services/mailService');

let server;
let shuttingDown = false;

function listen(port) {
  return new Promise((resolve, reject) => {
    const httpServer = app.listen(port);
    const onError = (error) => {
      httpServer.removeListener('listening', onListening);
      reject(error);
    };
    const onListening = () => {
      httpServer.removeListener('error', onError);
      resolve(httpServer);
    };
    httpServer.once('error', onError);
    httpServer.once('listening', onListening);
  });
}

async function bindHttpServer() {
  const port = config.port;
  try {
    return await listen(port);
  } catch (error) {
    if (error.code !== 'EADDRINUSE') {
      throw error;
    }

    if (config.isProduction) {
      throw new Error(`Port ${port} is already in use`);
    }

    logger.warn(`Port ${port} is already in use. Freeing it and retrying once...`);
    freePort(port);
    await new Promise((resolve) => setTimeout(resolve, 400));
    return listen(port);
  }
}

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

    server = await bindHttpServer();
    const address = server.address();
    const port = typeof address === 'object' && address ? address.port : config.port;
    logger.info(`ERP API listening on port ${port} [${config.nodeEnv}]`);
    logger.info(`Health check: http://localhost:${port}/api/v1/health`);
    const mailTransport = getMailTransport();
    if (isMailConfigured()) {
      logger.info(`Mail delivery is enabled via ${mailTransport}`);
      if (mailTransport === 'smtp' && config.isProduction) {
        logger.warn(
          'Using SMTP in production. Render free web services block ports 25/465/587 — set BREVO_API_KEY or RESEND_API_KEY instead.'
        );
      }
    } else {
      logger.warn(
        'Mail is not configured. Set SMTP_* in server/.env for localhost, or BREVO_API_KEY / RESEND_API_KEY on Render.'
      );
    }
  } catch (error) {
    logger.error('Server failed to start', { message: error.message });
    process.exit(1);
  }
}

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
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
  if (error && error.code === 'EADDRINUSE') {
    logger.error(`Port ${config.port} is already in use. Stop the other server, then restart.`);
    process.exit(1);
  }
  logger.error('Uncaught exception', { message: error.message });
  process.exit(1);
});

start();
