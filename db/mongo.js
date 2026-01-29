const mongoose = require('mongoose');

async function connectMongo() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI || process.env.ATLAS_URL || process.env.atlas_URL;
  if (!uri) {
    console.log('⚠️ No MongoDB URI provided — running with in-memory store');
    return;
  }
  try {
    await mongoose.connect(uri);
    console.log('✅ MongoDB connected');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message || err);
    throw err;
  }
}

module.exports = { connectMongo };
