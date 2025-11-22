const admin = require('firebase-admin');
const path = require('path');

function loadCredential() {
  // Si estamos en Cloud Run (o en GCP) usar credenciales por defecto
  if (process.env.K_SERVICE) {
    console.log("Usando Application Default Credentials (Cloud Run/GCP)");
    return admin.credential.applicationDefault();
  }

  // Si se proporciona JSON en variable de entorno (opcional)
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    try {
      const json = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
      console.log("Usando FIREBASE_SERVICE_ACCOUNT_JSON (env)");
      return admin.credential.cert(json);
    } catch (err) {
      console.error("FIREBASE_SERVICE_ACCOUNT_JSON inválido:", err);
      throw err;
    }
  }

  // Fallback local: archivo (solo en desarrollo)
  try {
    const serviceAccountPath = path.join(__dirname, 'firebaseServiceAccountKey.json');
    console.log("Usando firebaseServiceAccountKey.json (local)");
    return admin.credential.cert(require(serviceAccountPath));
  } catch (err) {
    console.error('No se encontró firebaseServiceAccountKey.json y no hay env FIREBASE_SERVICE_ACCOUNT_JSON');
    throw err;
  }
}

const credential = loadCredential();

admin.initializeApp({
  credential,
  databaseURL: process.env.FIREBASE_DB_URL || undefined
});

const db = admin.firestore();
module.exports = { admin, db };
