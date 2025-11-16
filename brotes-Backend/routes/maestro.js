// routes/maestro.js
const express = require('express');
const router = express.Router();
const { db } = require('../firebaseAdmin');
const { verifySession, requireRole } = require('./auth');

const USERS_COLLECTION = 'users';
const PROGRESOS_COLLECTION = 'progresos'; // Para registrar actividades de los estudiantes

router.get('/estudiantes', verifySession, requireRole('maestro'), async (req, res) => {
  try {
    const snapshot = await db.collection(USERS_COLLECTION).where('role', '==', 'estudiante').get();
    const estudiantes = [];

    for (const doc of snapshot.docs) {
      const data = doc.data();
      let progreso = null;
      try {
        const progSnap = await db.collection(PROGRESOS_COLLECTION).doc(doc.id).get();
        progreso = progSnap.exists ? progSnap.data() : null;
      } catch (err) {
        console.warn('Error obteniendo progreso:', err.message || err);
      }

      estudiantes.push({
        uid: doc.id,
        email: data.email,
        actividad: progreso?.actividad || '—',
        progreso: progreso?.porcentaje || '0%',
        updatedAt: progreso?.updatedAt?.toDate?.() || null
      });
    }

    res.json(estudiantes);
  } catch (err) {
    console.error('/estudiantes error:', err);
    res.status(500).json({ error: 'Error al cargar estudiantes' });
  }
});

//  Registrar o actualizar progreso de un estudiante
router.post('/progreso', verifySession, requireRole('maestro'), async (req, res) => {
  const { uid, actividad, porcentaje } = req.body;
  if (!uid || !actividad) return res.status(400).json({ error: 'Faltan datos' });

  try {
    await db.collection(PROGRESOS_COLLECTION).doc(uid).set({
      actividad,
      porcentaje: porcentaje || '0%',
      updatedAt: new Date()
    }, { merge: true });

    res.json({ status: 'ok' });
  } catch (err) {
    console.error('/progreso error:', err);
    res.status(500).json({ error: 'No se pudo registrar el progreso' });
  }
});

module.exports = router;
