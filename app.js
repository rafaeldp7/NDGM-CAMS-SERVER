require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { connectMongo } = require('./db/mongo');




// Authentication removed for development — auth routes not mounted
const userRoutes = require('./routes/users');
const logRoutes = require('./routes/logs');

const isProduction = process.env.NODE_ENV === 'production';

// In production prefer a Mongo URI, but allow the in-memory fallback when absent
if (isProduction) {
  const hasMongo = process.env.MONGO_URI || process.env.MONGODB_URI || process.env.ATLAS_URL || process.env.atlas_URL;
  if (!hasMongo) {
    console.warn('Warning: no MongoDB URI provided; starting with in-memory fallback. Set MONGO_URI or ATLAS_URL for persistent storage.');
  }
}

const app = express();

app.use(cors({ origin: true, credentials: true }));

// Body parsers: accept JSON and URL-encoded bodies
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ ok: true, message: 'RFID Server running' });
});

// Root - friendly message so hitting the domain root doesn't return 404
app.get('/', (req, res) => {
  res.json({ ok: true, message: 'NDGM RFID API - see /api/* endpoints' });
});

// API routes (authentication endpoints disabled for development)
app.use('/api/users', userRoutes);
app.use('/api/logs', logRoutes);

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler (no stack/details in production)
app.use((err, req, res) => {
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
