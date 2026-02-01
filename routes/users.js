const express = require('express');
const store = require('../db/store');

const router = express.Router();

// router.use(auth);

// GET /api/users — list all users
router.get('/', async (req, res) => {
  try {
    const users = await store.listUsers();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/users/:id — get one user
router.get('/:id', async (req, res) => {
  try {
    const user = await store.getUserById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/users/by-id/:idNumber — get by ID number (for RFID lookup)
router.get('/by-id/:idNumber', async (req, res) => {
  try {
    const user = await store.getUserByIdNumber(req.params.idNumber);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/users — create user
router.post('/', async (req, res) => {
  try {
    const { name, idNumber, role } = req.body;
    if (!name || !idNumber || !role) {
      return res.status(400).json({ error: 'Name, idNumber, and role are required.' });
    }
    const existing = await store.getUserByIdNumber(idNumber);
    if (existing) {
      return res.status(400).json({ error: 'User with this ID number already exists.' });
    }
    const user = await store.createUser({ name, idNumber, role });
    res.status(201).json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/users/:id — update user
router.patch('/:id', async (req, res) => {
  try {
    const { name, role, password } = req.body;
    const update = {};
    if (name !== undefined) update.name = name;
    if (role !== undefined) update.role = role;
    if (password !== undefined && password.length >= 6) update.password = password;

    const user = await store.updateUser(req.params.id, update);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/users/:id — delete user
router.delete('/:id', async (req, res) => {
  try {
    const user = await store.deleteUser(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json({ message: 'User deleted.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
