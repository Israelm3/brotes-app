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

// CORS
console.log("Iniciando servidor con CORS:", process.env.ALLOW_CORS);

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

// Middlewares
app.use(express.json());
app.use(cookieParser());

// STATIC FILES (SERVE FRONTEND)
const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));

// RUTAS HTML (MULTI-PÁGINA)
app.get('/', (req, res) => {
  res.sendFile(path.join(publicPath, 'login.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(publicPath, 'login.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(publicPath, 'register.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(publicPath, 'dashboard.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(publicPath, 'admin.html'));
});

app.get('/maestro', (req, res) => {
  res.sendFile(path.join(publicPath, 'maestro.html'));
});

// API
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/students', studentsRoutes);
app.use('/api/maestro', maestroRoutes);

// SERVER
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
