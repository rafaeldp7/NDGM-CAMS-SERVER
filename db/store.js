const mongoose = require('mongoose');
let UserModel = null;
let LogModel = null;
try {
  UserModel = require('../models/User');
  LogModel = require('../models/Log');
} catch (e) {
  // models may not be available in certain setups
}

// In-memory fallback data
const memory = {
  users: [
    { _id: 'u1', name: 'Alice Johnson', idNumber: 'A1001', role: 'user', dateCreated: new Date(Date.now() - 86400000 * 10).toISOString() },
    { _id: 'u2', name: 'Bob Santos', idNumber: 'B2002', role: 'staff', dateCreated: new Date(Date.now() - 86400000 * 5).toISOString() },
    { _id: 'u3', name: 'Guard Maria', idNumber: 'G3003', role: 'guard', dateCreated: new Date(Date.now() - 86400000 * 2).toISOString() },
  ],
  logs: [
    { _id: 'l1', timeIn: new Date(Date.now() - 3600 * 1000 * 5).toISOString(), timeOut: new Date(Date.now() - 3600 * 1000 * 2).toISOString(), userName: 'Alice Johnson', userIdNumber: 'A1001', rfidScannerId: 'SCANNER-1' },
    { _id: 'l2', timeIn: new Date(Date.now() - 3600 * 1000 * 26).toISOString(), timeOut: new Date(Date.now() - 3600 * 1000 * 20).toISOString(), userName: 'Bob Santos', userIdNumber: 'B2002', rfidScannerId: 'SCANNER-1' },
    { _id: 'l3', timeIn: new Date(Date.now() - 3600 * 1000 * 1).toISOString(), timeOut: null, userName: 'Guard Maria', userIdNumber: 'G3003', rfidScannerId: 'SCANNER-2' },
  ],
};

function usingMongo() {
  return mongoose && mongoose.connection && mongoose.connection.readyState === 1 && UserModel && LogModel;
}

// Users
async function listUsers() {
  if (usingMongo()) return UserModel.find().sort({ dateCreated: -1 }).lean();
  return memory.users.slice();
}

async function getUserById(id) {
  if (usingMongo()) return UserModel.findById(id).lean();
  return memory.users.find(u => u._id === id) || null;
}

async function getUserByIdNumber(idNumber) {
  if (usingMongo()) return UserModel.findOne({ idNumber }).lean();
  return memory.users.find(u => (u.idNumber || '').toLowerCase() === (idNumber || '').toLowerCase()) || null;
}

async function createUser(data) {
  if (usingMongo()) return UserModel.create(data);
  const id = 'u' + Date.now();
  const user = Object.assign({ _id: id, dateCreated: new Date().toISOString() }, data);
  memory.users.unshift(user);
  return user;
}

async function updateUser(id, update) {
  if (usingMongo()) return UserModel.findByIdAndUpdate(id, update, { new: true, runValidators: true }).lean();
  const idx = memory.users.findIndex(u => u._id === id);
  if (idx === -1) return null;
  memory.users[idx] = Object.assign({}, memory.users[idx], update);
  return memory.users[idx];
}

async function deleteUser(id) {
  if (usingMongo()) return UserModel.findByIdAndDelete(id);
  const idx = memory.users.findIndex(u => u._id === id);
  if (idx === -1) return null;
  const removed = memory.users.splice(idx, 1)[0];
  return removed;
}

// Logs
async function listLogs(filter = {}) {
  if (usingMongo()) {
    const q = {};
    if (filter.userIdNumber) q.userIdNumber = filter.userIdNumber;
    if (filter.rfidScannerId) q.rfidScannerId = filter.rfidScannerId;
    if (filter.from || filter.to) {
      q.timeIn = {};
      if (filter.from) q.timeIn.$gte = new Date(filter.from);
      if (filter.to) q.timeIn.$lte = new Date(filter.to);
    }
    return LogModel.find(q).sort({ timeIn: -1 }).limit(500).lean();
  }
  // simple filter for in-memory logs
  let out = memory.logs.slice();
  if (filter.userIdNumber) out = out.filter(l => l.userIdNumber === filter.userIdNumber);
  if (filter.rfidScannerId) out = out.filter(l => l.rfidScannerId === filter.rfidScannerId);
  return out.sort((a,b) => new Date(b.timeIn) - new Date(a.timeIn)).slice(0,500);
}

async function createLog(data) {
  if (usingMongo()) return LogModel.create(data);
  const id = 'l' + Date.now();
  const log = Object.assign({ _id: id }, data);
  memory.logs.unshift(log);
  return log;
}

async function findOpenLog(userIdNumber, rfidScannerId) {
  if (usingMongo()) return LogModel.findOne({ userIdNumber, rfidScannerId, timeOut: null }).sort({ timeIn: -1 });
  return memory.logs.find(l => l.userIdNumber === userIdNumber && l.rfidScannerId === rfidScannerId && !l.timeOut) || null;
}

async function saveLog(log) {
  if (usingMongo()) return log.save();
  // for memory, assume log is a reference to object in array and already updated
  return log;
}

async function closeOpenLogs(endOfDay) {
  if (usingMongo()) {
    // set timeOut to endOfDay for any open logs
    await LogModel.updateMany({ timeOut: null }, { $set: { timeOut: endOfDay } });
    return;
  }
  memory.logs.forEach(l => {
    if (!l.timeOut) l.timeOut = endOfDay instanceof Date ? endOfDay.toISOString() : endOfDay;
  });
}

module.exports = {
  // users
  listUsers,
  getUserById,
  getUserByIdNumber,
  createUser,
  updateUser,
  deleteUser,
  // logs
  listLogs,
  createLog,
  findOpenLog,
  saveLog,
};
