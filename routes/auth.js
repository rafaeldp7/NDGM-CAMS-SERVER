const express = require('express');
const router = express.Router();

// Authentication endpoints disabled in this simplified server.
router.use((req, res) => {
  res.status(404).json({ error: 'Authentication endpoints are disabled in this build.' });
});

module.exports = router;
