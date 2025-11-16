import { openDB, createRecord, readRecords, deleteRecord } from '/js/indexedDB.js';

const API = "/api/auth";

async function fetchWithCred(url, opts = {}) {
  opts = opts || {};
  opts.credentials = 'include';
  opts.headers = opts.headers || {};
  return fetch(url, opts);
}

// Logout
export async function logout() {
  try {
    await fetchWithCred(`${API}/logout`, { method: 'POST' });
  } catch (e) {
    console.error('logout error', e);
  }
  window.location.href = '/index.html';
}

// Asegurarnos que la DB está abierta al cargar auth.js
openDB().then(() => console.log('[auth] IndexedDB lista'))
  .catch(err => console.warn('[auth] IndexedDB no disponible:', err));

// REGISTER
const regForm = document.getElementById('regForm');
if (regForm) {
  regForm.addEventListener('submit', async e => {
    e.preventDefault();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value.trim();
    const role = document.getElementById('regRole').value;
    const adminSecret = document.getElementById('adminSecret')?.value.trim() || '';
    const regMsg = document.getElementById('regMsg');

    const userObj = { email, password, role, createdAt: new Date().toISOString() };

    try {
      const body = { email, password, role };
      if (role === 'admin') body.adminSecret = adminSecret;

      const res = await fetch(`${API}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        regMsg.style.color = 'red';
        regMsg.textContent = data.error || res.statusText;
        return;
      }

      // Intentamos guardar una copia en IndexedDB (opcional, para historial/offline)
      try {
        await createRecord('users', { email, role, createdAt: new Date().toISOString() });
      } catch (e) {
        console.warn('[auth] No se pudo guardar copia local:', e);
      }

      regMsg.style.color = 'green';
      regMsg.textContent = 'Cuenta creada correctamente';
      regForm.reset();
    } catch (err) {
      // Falla la red: guardar local
      try {
        await createRecord('users', userObj);
        regMsg.style.color = 'orange';
        regMsg.textContent = 'Usuario guardado localmente; se sincronizará cuando haya conexión.';
      } catch (e2) {
        regMsg.style.color = 'red';
        regMsg.textContent = 'Error guardando localmente: ' + e2.message;
      }
    }
  });
}

// LOGIN 
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async e => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    const msg = document.getElementById('msg');

    try {
      const res = await fetch(`${API}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        msg.style.color = 'red';
        msg.textContent = data.error || res.statusText;
        return;
      }

      const profileRes = await fetch(`${API}/profile`, { credentials: 'include' });
      if (!profileRes.ok) {
        msg.style.color = 'red';
        msg.textContent = 'No autorizado';
        return;
      }

      const profile = await profileRes.json();

      // Guardamos sesión mínima en indexedDB (solo email+role)
      try {
        await createRecord('users', { email: profile.email, role: profile.role, createdAt: new Date().toISOString() });
      } catch (e) {
        console.warn('[auth] Error guardando sesión local:', e);
      }

      // Redirección según rol
      if (profile.role === 'estudiante') window.location.href = '/dashboard.html';
      else if (profile.role === 'maestro') window.location.href = '/maestro.html';
      else window.location.href = '/admin.html';

    } catch (err) {
      // No conexión: guardar intento/local
      msg.style.color = 'orange';
      msg.textContent = 'Error de red: datos guardados localmente.';
      try {
        await createRecord('users', { email, role: 'desconocido', createdAt: new Date().toISOString() });
      } catch (e) {
        console.warn('[auth] No se pudo guardar localmente al intentar login offline:', e);
      }
    }
  });
}

// =UNCIONES DE DEBUG 

export async function printLocalUsers() {
  try {
    const u = await readRecords('users');
    console.log('[auth] Usuarios en IndexedDB:', u);
    return u;
  } catch (e) {
    console.error('[auth] readRecords falló:', e);
    return [];
  }
}

export async function syncLocalUsers() {
  try {
    const users = await readRecords('users');
    for (let user of users) {
      try {
        const res = await fetch(`${API}/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(user)
        });
        if (res.ok) {
          await deleteRecord('users', user.email);
          console.log(`[auth] Usuario ${user.email} sincronizado`);
        } else {
          console.warn(`[auth] Falló sincronizar ${user.email}:`, res.status);
        }
      } catch (err) {
        console.warn(`[auth] Error net sincronizando ${user.email}:`, err);
      }
    }
  } catch (err) {
    console.error('[auth] syncLocalUsers error:', err);
  }
}
