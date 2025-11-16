import { logout } from '/js/auth.js';
import { openDB, createRecord, readRecords } from '/js/indexedDB.js';

const API = "/api/auth";

// Botón cerrar sesión
document.getElementById('logoutBtn')?.addEventListener('click', logout);

// --- Cargar datos del huerto (simulados o desde backend) ---
async function cargarPanelHuerto() {
  try {
    // Aquí podrías conectar sensores reales vía API Firebase o backend
    const datos = {
      temperatura: (20 + Math.random() * 5).toFixed(1),
      humedad: (40 + Math.random() * 20).toFixed(1),
      luz: (500 + Math.random() * 300).toFixed(0)
    };
    document.getElementById('temp').textContent = `${datos.temperatura} °C`;
    document.getElementById('humedad').textContent = `${datos.humedad} %`;
    document.getElementById('luz').textContent = `${datos.luz} lux`;
  } catch (e) {
    console.warn('Error cargando sensores:', e);
  }
}

// --- Cargar progreso de estudiantes ---
async function cargarEstudiantes() {
  const tbody = document.getElementById('tbodyEstudiantes');
  tbody.innerHTML = '<tr><td colspan="4">Cargando...</td></tr>';

  try {
    const res = await fetch(`${API}/estudiantes`, { credentials: 'include' });
    if (!res.ok) throw new Error('Error en servidor');
    const lista = await res.json();

    // Guardar en IndexedDB para acceso offline
    const db = await openDB();
    lista.forEach(est => createRecord(db, 'users', est));

    mostrarTabla(lista);
  } catch (e) {
    console.warn('Fallo de red, leyendo cache:', e);
    const db = await openDB();
    const cache = await readRecords(db, 'users');
    mostrarTabla(cache);
  }
}

function mostrarTabla(lista) {
  const tbody = document.getElementById('tbodyEstudiantes');
  if (!lista || lista.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4">Sin datos</td></tr>';
    return;
  }
  tbody.innerHTML = lista.map(u => `
    <tr>
      <td>${u.email || '—'}</td>
      <td>${u.actividad || 'Mantenimiento del huerto'}</td>
      <td>${u.progreso || '0%'}</td>
      <td>${u.updatedAt || new Date().toLocaleString()}</td>
    </tr>
  `).join('');
}

// --- Inicialización ---
(async () => {
  await cargarPanelHuerto();
  await cargarEstudiantes();
})();
