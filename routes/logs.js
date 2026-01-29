const express = require('express');
const { optionalAuth } = require('../middleware/auth');
const store = require('../db/store');

const router = express.Router();

// cooldown tracking (per process)
const lastTaps = {}; // key: idNumber.toLowerCase() => epoch ms
const COOLDOWN_MS = parseInt(process.env.COOLDOWN_MS, 10) || 3000; // default 3s

// Helper: schedule daily reset (auto time-out for open logs at end of day)
function scheduleDailyReset() {
  const now = new Date();
  const next = new Date(now);
  next.setHours(24, 0, 5, 0); // shortly after midnight
  const ms = next.getTime() - now.getTime();
  setTimeout(async () => {
    try {
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
      await store.closeOpenLogs(endOfDay);
      console.log('Closed open logs at end of day');
    } catch (e) {
      console.error('Failed to close open logs:', e);
    }
    // schedule subsequent runs every 24h
    setInterval(async () => {
      try {
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);
        await store.closeOpenLogs(endOfDay);
        console.log('Daily close open logs completed');
      } catch (e) {
        console.error('Daily close failed:', e);
      }
    }, 24 * 60 * 60 * 1000);
  }, ms);
}

scheduleDailyReset();

// POST /api/logs/scan — record scan (time in or time out). No auth so RFID scanner can call.
// If user not in DB, returns userFound: false and no log is created.
router.post('/scan', optionalAuth, async (req, res) => {
  try {
    const { userIdNumber, rfidScannerId } = req.body;
    if (!userIdNumber || !rfidScannerId) {
      return res.status(400).json({ error: 'userIdNumber and rfidScannerId are required.' });
    }

    const user = await store.getUserByIdNumber(userIdNumber);
    if (!user) {
      return res.status(200).json({ userFound: false, user: null, message: 'No user found.' });
    }

    const key = (userIdNumber || '').toLowerCase();
    const now = Date.now();
    const last = lastTaps[key] || 0;
    if (now - last < COOLDOWN_MS) {
      return res.status(200).json({ userFound: true, user: { name: user.name, idNumber: user.idNumber }, action: 'ignored', log: null, message: 'Ignored duplicate tap (cooldown)' });
    }

    // find an open log (timeIn without timeOut) for this user+scanner
    const openLog = await store.findOpenLog(userIdNumber, rfidScannerId);
    if (openLog) {
      openLog.timeOut = new Date();
      await store.saveLog(openLog);
      lastTaps[key] = now;
      return res.status(200).json({ userFound: true, user: { name: user.name, idNumber: user.idNumber }, action: 'timeOut', log: openLog, message: `Time out recorded for ${user.name}.` });
    }

    // otherwise create timeIn
    const log = await store.createLog({ timeIn: new Date(), timeOut: null, userName: user.name, userIdNumber, rfidScannerId });
    lastTaps[key] = now;
    return res.status(201).json({ userFound: true, user: { name: user.name, idNumber: user.idNumber }, action: 'timeIn', log, message: `Time in recorded for ${user.name}.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// No auth required — endpoints are public in simplified mode

// GET /api/logs — list logs (optional query: userIdNumber, rfidScannerId, from, to)
router.get('/', async (req, res) => {
  try {
    const { userIdNumber, rfidScannerId, from, to } = req.query;
    const filter = {};
    if (userIdNumber) filter.userIdNumber = userIdNumber;
    if (rfidScannerId) filter.rfidScannerId = rfidScannerId;
    if (from || to) {
      filter.from = from;
      filter.to = to;
    }
    const logs = await store.listLogs(filter);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/logs/:id — get one log
router.get('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const logs = await store.listLogs();
    const log = logs.find(l => l._id === id || (l.id && l.id === id));
    if (!log) return res.status(404).json({ error: 'Log not found.' });
    res.json(log);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
