require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { connectMongo } = require('./db/mongo');

// Authentication removed for development — auth routes not mounted
const userRoutes = require('./routes/users');
const logRoutes = require('./routes/logs');

const isProduction = process.env.NODE_ENV === 'production';

// Validate required env (fail fast in production)
if (isProduction) {
  const hasMongo = process.env.MONGO_URI || process.env.MONGODB_URI || process.env.ATLAS_URL || process.env.atlas_URL;
  if (!hasMongo) throw new Error('MONGO_URI (or ATLAS_URL) is required in production');
}

const app = express();

const corsOptions = process.env.CORS_ORIGIN
  ? { origin: process.env.CORS_ORIGIN.split(',').map((o) => o.trim()) }
  : {};
app.use(cors(corsOptions));
app.use(express.json({ limit: '1mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({ ok: true, message: 'RFID Server running' });
});

// API routes (authentication endpoints disabled for development)
app.use('/api/users', userRoutes);
app.use('/api/logs', logRoutes);

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Not founds' });
});

// Error handler (no stack/details in production)
app.use((err, req, res, next) => {
  console.error(err);
  const message = isProduction ? 'Internal server error' : (err.message || 'Internal server error');
  res.status(500).json({ error: message });
});

const PORT = process.env.PORT || 3000;
let server;

async function start() {
  await connectMongo();
  server = app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT} (NODE_ENV=${process.env.NODE_ENV || 'development'})`);
  });
}

function gracefulShutdown(signal) {
  console.log(`${signal} received, shutting down gracefully`);
  if (server) server.close(() => console.log('HTTP server closed'));
  mongoose.connection.close(false, () => {
    console.log('MongoDB connection closed');
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

start().catch((err) => {
  console.error('Failed to start:', err);
  process.exit(1);
});
