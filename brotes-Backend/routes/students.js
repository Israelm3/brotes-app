const express = require('express');
const router = express.Router();
const { admin, db } = require('../firebaseAdmin'); 
const { verifySession, requireRole } = require('./auth');  

const PLANTS_STATIC = [
  {
    id: 'lenteja',
    name: 'Lenteja',
    description: 'Semilla nutritiva y rápida de germinar. La lenteja es una planta pequeña pertenece a la familia de las legumbres.',
    cuidados: ['Riego cada 2-3 días', 'Luz indirecta o semisombra', 'Sustrato suelto y drenante']
  },
  {
    id: 'limon',
    name: 'Limón',
    description: 'Árbol cítrico que requiere sol y espacio. Produce frutos con varios meses de cuidado.',
    cuidados: ['Riego semanal profundo', 'Sol directo 6+ horas', 'Suelo con buen drenaje y fertilización']
  },
  {
    id: 'chile-piquin',
    name: 'Chile piquín',
    description: 'Planta pequeña que después de la flor, nacen chiles muy pequeños, redondos y muy picosos que cambian de color al madurar',
    cuidados: ['Riego moderado', 'Sol directo y calor', 'Protección de heladas']
  }
];

router.get('/dashboardData', verifySession, requireRole('estudiante'), async (req, res) => {
  try {
    const uid = req.user.uid;

    // → Progreso del usuario
    let progress = {};
    try {
      const doc = await db.collection('users').doc(uid).get();
      if (doc.exists) progress = doc.data().plants || {};
    } catch (e) {
      console.warn('Error leyendo progreso usuario:', e.message || e);
    }

    // → Lecturas reales de hc-05
    let humidity = null;
    let humidityHistory = [];

    try {
      const readingsRef = db
        .collection('hc-05')
        .doc('00-23-05-00-40-74')
        .collection('readings');

      // Traer todos los documentos dentro de readings
      const readingsSnapshot = await readingsRef.get();

      readingsSnapshot.forEach(doc => {
        const data = doc.data();

        if (data.s1 !== undefined && data.s2 !== undefined && data.createdAt) {
          // Promedio simple de s1 y s2 como humedad
          const value = Math.round((data.s1 + data.s2) / 2);

          humidityHistory.push({
            ts: data.createdAt.toDate ? data.createdAt.toDate().getTime() : Date.now(),
            value
          });
        }
      });

      // Tomar la lectura más reciente como humedad actual
      if (humidityHistory.length > 0) {
        // Ordenar por fecha
        humidityHistory.sort((a, b) => a.ts - b.ts);
        humidity = humidityHistory[humidityHistory.length - 1].value;
      }
    } catch (e) {
      console.warn('Error leyendo hc-05:', e.message || e);
    }

    // → Si no hay datos reales, simulamos
    if (humidity === null || humidity === undefined) {
      humidity = Math.floor(40 + Math.random() * 30); // 40-70%
    }
    if (!Array.isArray(humidityHistory) || humidityHistory.length === 0) {
      const now = Date.now();
      humidityHistory = Array.from({ length: 4 }).map((_, i) => {
        return {
          ts: now - (7 - i) * 60 * 60 * 1000,
          value: Math.floor(40 + Math.random() * 30)
        };
      });
    }

    res.json({
      plants: PLANTS_STATIC,
      progress,
      humidity,
      humidityHistory
    });
  } catch (err) {
    console.error('/dashboardData error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
