const admin = require('firebase-admin');
const path = require('path');
const serviceAccountPath = path.join(__dirname, 'firebaseServiceAccountKey.json');
const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DB_URL
});

const db = admin.firestore();
module.exports = { admin, db };
