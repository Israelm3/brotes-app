const express = require('express');
const router = express.Router();
const { db, admin } = require('../firebaseAdmin');
const { verifySession, requireRole } = require('./auth');
const USERS_COLLECTION = 'users';

router.get('/', verifySession, requireRole('admin'), async (req, res) => {
  try {
    const snapshot = await db.collection(USERS_COLLECTION).get();
    const users = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    res.json({ users });
  } catch (err) {
    console.error('GET /users error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Actualizar nombre visible del usuario
router.put('/:uid', verifySession, requireRole('admin'), async (req, res) => {
  const { uid } = req.params;
  const { displayName } = req.body;

  if (!displayName) return res.status(400).json({ error: 'Falta displayName' });

  try {
    await db.collection(USERS_COLLECTION).doc(uid).update({ displayName });
    res.json({ status: 'ok' });
  } catch (err) {
    console.error('PUT /users error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
