require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { router: authRoutes } = require('./routes/auth');
const usersRoutes = require('./routes/users');
const studentsRoutes = require('./routes/students');
const maestroRoutes = require('./routes/maestro');

const app = express();

if (process.env.ALLOW_CORS === 'true') {
  const FRONTEND_ORIGINS = [
    'http://localhost:8080',
    'http://127.0.0.1:8080',
    'http://frontend:8080',
    'http://localhost:50812'
  ];
  app.use(cors({
    origin: (origin, callback) => {
      if (!origin || FRONTEND_ORIGINS.includes(origin)) return callback(null, true);
      return callback(new Error(`CORS bloqueado para origen: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
  }));
}

app.use(express.json());
app.use(cookieParser());

// API
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/students', studentsRoutes);
app.use('/api/maestro', maestroRoutes);

// FRONTEND ESTÁTICO
const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));

// Captura rutas del frontend (HTML5 routing) sin afectar /api
app.get(/^\/(?!api).*/, (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

// SERVIDOR
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor corriendo en http://localhost:${PORT}`));
