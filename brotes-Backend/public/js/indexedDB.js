const DB_NAME = 'brotes-app';
const DB_VERSION = 1;
const STORE_USERS = 'users';

let db = null;

function log(...args) {
  console.debug('[indexedDB]', ...args);
}

function ensureIndexedDBSupported() {
  if (!('indexedDB' in window)) {
    throw new Error('IndexedDB no está disponible en este navegador/origen.');
  }
}

// Abrir o crear DB
export function openDB() {
  return new Promise((resolve, reject) => {
    try {
      ensureIndexedDBSupported();
    } catch (e) {
      console.error(e.message);
      return reject(e);
    }

    if (db) {
      log('DB ya abierta');
      return resolve(db);
    }

    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (evt) => {
      db = evt.target.result;
      log('onupgradeneeded: crear stores si no existen');
      if (!db.objectStoreNames.contains(STORE_USERS)) {
        const userStore = db.createObjectStore(STORE_USERS, { keyPath: 'email' });
        userStore.createIndex('rol', 'role', { unique: false }); // nota: usamos 'role' / 'rol' según uso
        userStore.createIndex('createdAt', 'createdAt', { unique: false });
        log('Store users creado con indices rol y createdAt');
      }
    };
    req.onsuccess = (evt) => {
      db = evt.target.result;
      log('DB abierta correctamente:', DB_NAME, 'v' + DB_VERSION);
      resolve(db);
    };
    req.onerror = (evt) => {
      console.error('Error abriendo IndexedDB:', evt.target.error);
      reject(evt.target.error);
    };
    req.onblocked = () => console.warn('IndexedDB blocked: otra página está usando la db.');
  });
}

// Crear o actualizar un registro (put)
export async function createRecord(storeName, record) {
  await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.put(record);
    req.onsuccess = () => {
      log('createRecord success', storeName, record);
      resolve(true);
    };
    req.onerror = (e) => {
      console.error('createRecord error', e);
      reject(e);
    };
  });
}

// Leer todos los registros
export async function readRecords(storeName) {
  await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.getAll();
    req.onsuccess = () => {
      log('readRecords result', req.result);
      resolve(req.result);
    };
    req.onerror = (e) => {
      console.error('readRecords error', e);
      reject(e);
    };
  });
}

// Borrar registro por key
export async function deleteRecord(storeName, key) {
  await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.delete(key);
    req.onsuccess = () => {
      log('deleteRecord success', storeName, key);
      resolve(true);
    };
    req.onerror = (e) => {
      console.error('deleteRecord error', e);
      reject(e);
    };
  });
}

// DEBUG helpers expuestos en window para probar desde consola
openDB().then(() => {
  window._brotesIndexedDBReady = true;
  window._openBrotesDB = openDB;
  window._readBrotesUsers = () => readRecords(STORE_USERS);
  window._createBrotesUser = (u) => createRecord(STORE_USERS, u);
  window._deleteBrotesUser = (k) => deleteRecord(STORE_USERS, k);
  log('Helpers expuestos: _openBrotesDB, _readBrotesUsers, _createBrotesUser, _deleteBrotesUser');
}).catch(err => {
  console.warn('IndexedDB init failed (helpers not mounted):', err);
});
