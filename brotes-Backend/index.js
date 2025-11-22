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

console.log(" Iniciando servidor con CORS:", process.env.ALLOW_CORS);

// config cors
if (process.env.ALLOW_CORS === 'true') {
  const FRONTEND_ORIGINS = [
    'http://localhost:3000',
    'http://127.0.0.1:8080',
    'http://localhost:8080',
  ];
  if (process.env.PROD_ORIGIN?.trim()) {
    FRONTEND_ORIGINS.push(process.env.PROD_ORIGIN.trim());
  }

  app.use(cors({
    origin: (origin, callback) => {
      if (!origin || FRONTEND_ORIGINS.includes(origin)) {
        return callback(null, true);
      }
      console.warn("CORS BLOQUEADO:", origin);
      return callback(new Error(`CORS bloqueado para: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
  }));
}

// middlewares
app.use(express.json());
app.use(cookieParser());

// rutas api
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/students', studentsRoutes);
app.use('/api/maestro', maestroRoutes);

// ftd
const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));

// HTML5 ROUTING (SPA)
app.get(/^\/(?!api).*/, (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

// server
const PORT = process.env.PORT ||  3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});