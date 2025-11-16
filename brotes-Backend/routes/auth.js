const express = require('express');
const router = express.Router();
const { admin, db } = require('../firebaseAdmin');
const rateLimit = require('express-rate-limit');
const validator = require('validator');
const bcrypt = require('bcrypt');

const USERS_COLLECTION = 'users';
const LOGIN_ATTEMPTS_COLLECTION = 'login_attempts';

// Middleware: verifica session cookie
async function verifySession(req, res, next) {
  const sessionCookie = req.cookies.session || '';
  if (!sessionCookie) return res.status(401).json({ error: 'Unauthorized: no cookie' });

  try {
    const decodedClaims = await admin.auth().verifySessionCookie(sessionCookie, true);
    req.user = decodedClaims;
    return next();
  } catch (err) {
    console.error('verifySession error:', err.message || err);
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

// Middleware: autoriza por rol
function requireRole(...roles) {
  return async (req, res, next) => {
    const claimRole = req.user && req.user.role;
    if (claimRole && roles.includes(claimRole)) return next();

    try {
      const uid = req.user.uid;
      const doc = await db.collection(USERS_COLLECTION).doc(uid).get();
      const data = doc.exists ? doc.data() : {};
      if (data.role && roles.includes(data.role)) {
        req.user.role = data.role;
        return next();
      }
    } catch (err) {
      console.error('requireRole lookup error:', err);
    }
    return res.status(403).json({ error: 'Forbidden' });
  };
}

// Limite de registro por IP (5/h)
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados registros desde esta IP, intenta más tarde.' }
});

// Registro
router.post('/register', registerLimiter, async (req, res) => {
  const { email, password, role } = req.body;
  const requestedRole = role || 'estudiante';

  if (!email || !password) return res.status(400).json({ error: 'Faltan campos email/password' });
  if (!validator.isEmail(email)) return res.status(400).json({ error: 'Correo inválido' });

  const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
  if (!strongPasswordRegex.test(password)) {
    return res.status(400).json({
      error: 'Contraseña débil. Debe tener mínimo 8 caracteres, mayúscula, minúscula, número y símbolo.'
    });
  }
  // permitir múltiples admins
  if (requestedRole === 'admin') {
    const { adminSecret } = req.body;

    if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET) {
      return res.status(403).json({ error: 'Admin secret requerido o incorrecto' });
    }
  }

  try {
    const userRecord = await admin.auth().createUser({ email, password });
    const uid = userRecord.uid;

    await admin.auth().setCustomUserClaims(uid, { role: requestedRole });

    await db.collection(USERS_COLLECTION).doc(uid).set({
      email,
      role: requestedRole,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.status(201).json({ uid });
  } catch (err) {
    console.error('Error en /register:', err.code || err.message);
    res.status(400).json({ error: err.message || 'Register failed' });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Faltan email/password' });

  try {
    const loginDocRef = db.collection(LOGIN_ATTEMPTS_COLLECTION).doc(email);
    const loginDoc = await loginDocRef.get();
    const data = loginDoc.exists ? loginDoc.data() : {};

    const lastAttempt = data.lastAttempt && data.lastAttempt.toDate ? data.lastAttempt.toDate() : null;
    let attempts = data.attempts || 0;

    if (lastAttempt && attempts >= 5) {
      const diffMs = Date.now() - lastAttempt.getTime();
      if (diffMs < 5 * 60 * 1000)
        return res.status(429).json({ error: 'Demasiados intentos. Intenta en 5 minutos.' });
      else attempts = 0;
    }

    const apiKey = process.env.FIREBASE_API_KEY;
    const signInUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`;
    const resp = await fetch(signInUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true })
    });
    const json = await resp.json();

    if (!resp.ok) {
      await loginDocRef.set({
        attempts: attempts + 1,
        lastAttempt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      return res.status(401).json({ error: json.error ? json.error.message : 'Auth failed' });
    }

    await loginDocRef.set({ attempts: 0 }, { merge: true });

    const idToken = json.idToken;
    const expiresIn = 60 * 60 * 24 * 5 * 1000;
    const sessionCookie = await admin.auth().createSessionCookie(idToken, { expiresIn });

    res.cookie('session', sessionCookie, {
      maxAge: expiresIn,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });

    res.json({ status: 'success' });
  } catch (err) {
    console.error('Error en /login:', err);
    res.status(500).json({ error: err.message || 'Login failed' });
  }
});

// Logout
router.post('/logout', (req, res) => {
  res.clearCookie('session');
  res.json({ status: 'logged_out' });
});

// Perfil
router.get('/profile', verifySession, async (req, res) => {
  const uid = req.user.uid;
  try {
    const doc = await db.collection(USERS_COLLECTION).doc(uid).get();
    if (!doc.exists) return res.status(404).json({ error: 'No profile' });

    const data = doc.data();
    const role = req.user.role || data.role;
    const createdAt = data.createdAt && data.createdAt.toDate ? data.createdAt.toDate() : null;

    res.json({ uid, email: data.email, role, createdAt, ...data.extraData });
  } catch (err) {
    console.error('/profile error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = {
  router,
  verifySession,
  requireRole
};
