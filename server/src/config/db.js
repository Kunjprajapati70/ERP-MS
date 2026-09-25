const mongoose = require('mongoose');
const config = require('./env');
const logger = require('../utils/logger');

mongoose.set('strictQuery', true);

let isConnected = false;

async function connectDatabase() {
  if (!config.mongodbUri || config.mongodbUri.includes('<user>')) {
    throw new Error(
      'MONGODB_URI is not configured. Set a MongoDB Atlas connection string in server/.env'
    );
  }

  try {
    const connection = await mongoose.connect(config.mongodbUri, {
      serverSelectionTimeoutMS: 15000,
      maxPoolSize: 20,
      minPoolSize: 1,
    });

    isConnected = true;
    logger.info(`MongoDB Atlas connected: ${connection.connection.host}/${connection.connection.name}`);

    mongoose.connection.on('error', (err) => {
      isConnected = false;
      logger.error('MongoDB connection error', { message: err.message });
    });

    mongoose.connection.on('disconnected', () => {
      isConnected = false;
      logger.warn('MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      isConnected = true;
      logger.info('MongoDB reconnected');
    });

    return connection;
  } catch (error) {
    isConnected = false;
    logger.error('Failed to connect to MongoDB Atlas', {
      message: error.message,
    });
    throw error;
  }
}

function getDatabaseStatus() {
  const state = mongoose.connection.readyState;
  // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  return {
    connected: isConnected && state === 1,
    readyState: states[state] || 'unknown',
  };
}

async function disconnectDatabase() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    isConnected = false;
    logger.info('MongoDB disconnected gracefully');
  }
}

module.exports = {
  connectDatabase,
  disconnectDatabase,
  getDatabaseStatus,
};
