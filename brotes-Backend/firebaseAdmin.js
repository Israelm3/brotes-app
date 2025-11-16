const admin = require('firebase-admin');
const path = require('path');

function loadServiceAccount() {
  // 1) Si existe variable de entorno con JSON (recomendado en Cloud Run)
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    try {
      return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    } catch (err) {
      console.error('FIREBASE_SERVICE_ACCOUNT_JSON inválido:', err);
      throw err;
    }
  }

  // 2) Fallback local (desarrollo)
  try {
    const serviceAccountPath = path.join(__dirname, 'firebaseServiceAccountKey.json');
    // eslint-disable-next-line global-require
    return require(serviceAccountPath);
  } catch (err) {
    console.error('No se encontró firebaseServiceAccountKey.json y no hay env FIREBASE_SERVICE_ACCOUNT_JSON');
    throw err;
  }
}

const serviceAccount = loadServiceAccount();

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DB_URL
});

const db = admin.firestore();
module.exports = { admin, db };
