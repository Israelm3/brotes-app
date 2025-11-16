const AUTH_API = "/api/auth";
const STUDENTS_API = "/api/students";

async function fetchWithCred(url, opts = {}) {
  opts = opts || {};
  opts.credentials = 'include';
  opts.headers = opts.headers || {};
  return fetch(url, opts);
}

document.addEventListener('DOMContentLoaded', init);

async function init() {
  // Botón de cerrar sesión
  const btnLogout = document.getElementById('btnLogout');
  if (btnLogout) {
    btnLogout.addEventListener('click', async () => {
      await fetchWithCred(`${AUTH_API}/logout`, { method: 'POST' });
      window.location.href = '/index.html';
    });
  } else {
    console.warn('btnLogout no encontrado en el DOM');
  }

  // Validar sesión
  try {
    const profileRes = await fetchWithCred(`${AUTH_API}/profile`);
    if (!profileRes.ok) { 
      console.warn('Sesión no válida o expirada');
      window.location.href = '/login.html'; 
      return; 
    }

    const profile = await profileRes.json();
    if (profile.role !== 'estudiante') {
      window.location.href = '/index.html';
      return;
    }

    // SESIÓN VÁLIDA: usuario se queda logueado hasta cerrar sesión
    console.log(`Sesión activa para ${profile.email} (${profile.role})`);

  } catch (err) {
    console.error('Error verificando sesión', err);
    window.location.href = '/login.html';
    return;
  }

  // cargar datos del dashboard
  await loadDashboardData();
}

async function loadDashboardData() {
  try {
    const res = await fetchWithCred(`${STUDENTS_API}/dashboardData`);
    if (!res.ok) {
      document.getElementById('plantsList').textContent = 'Error cargando datos.';
      document.getElementById('progressArea').textContent = '';
      return;
    }
    const data = await res.json();

    if (Array.isArray(data.plants) && data.plants.length) renderPlants(data.plants);
    else document.getElementById('plantsList').textContent = 'No hay plantas definidas.';

    renderProgress(data.progress || {});
    document.getElementById('humidityVal').textContent = `${data.humidity}%`;
    renderHumidityChart(data.humidityHistory || [], 'humidityChartContainer');

  } catch (err) {
    console.error('Error dashboardData', err);
    document.getElementById('plantsList').textContent = 'Error de red.';
  }
}

// Funciones de renderizado (sin cambios)
function renderPlants(plants) {
  const el = document.getElementById('plantsList');
  el.innerHTML = '';
  plants.forEach(p => {
    const node = document.createElement('div');
    node.className = 'plant-card';
    node.innerHTML = `
      <h3>${escapeHtml(p.name)}</h3>
      <p>${escapeHtml(p.description)}</p>
      <div class="care"><strong>Cuidados:</strong> ${p.cuidados.map(c => `<span>${escapeHtml(c)}</span>`).join(' • ')}</div>
      <div style="margin-top:8px;"><button class="btn small" data-plant="${escapeHtml(p.id)}">Ver progreso</button></div>
    `;
    el.appendChild(node);
  });

  el.querySelectorAll('button[data-plant]').forEach(btn => {
    btn.addEventListener('click', () => {
      window.location.href = '/activities.html';
    });
  });
}

function renderProgress(progress) {
  const el = document.getElementById('progressArea');
  el.innerHTML = '';
  const keys = ['lenteja','limon','chile-piquin'];
  keys.forEach(key => {
    const st = progress[key] || { stage: 'Germinacion', health: 'Regular', plantedAt: null };
    const node = document.createElement('div');
    node.className = 'plant-status';
    node.innerHTML = `
      <strong>${formatPlantName(key)}</strong>
      <div>Etapa: ${escapeHtml(String(st.stage || 'desconocida'))}</div>
      <div>Salud: ${escapeHtml(String(st.health || 'desconocida'))}</div>
      <div>Plantado en: ${formatTimestamp(st.plantedAt) }</div>
    `;
    el.appendChild(node);
  });
}

function formatPlantName(key) {
  if (key === 'chile-piquin') return 'Chile piquín';
  return key.charAt(0).toUpperCase() + key.slice(1);
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

function formatTimestamp(ts) {
  if (!ts) return '—';
  if (ts._seconds) return new Date(ts._seconds * 1000).toLocaleString();
  if (typeof ts === 'number') return new Date(ts).toLocaleString();
  return String(ts);
}

function renderHumidityChart(history, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = '';
  const canvas = document.createElement('canvas');
  canvas.width = 600;
  canvas.height = 200;
  container.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  if (!Array.isArray(history) || history.length === 0) {
    ctx.fillStyle = '#666'; ctx.fillText('Sin histórico de humedad', 10, 20);
    return;
  }

  history.sort((a,b) => (a.ts || a.timestamp || 0) - (b.ts || b.timestamp || 0));
  const values = history.map(h => h.value || h.v || 0);
  const times = history.map(h => {
    const t = h.ts || h.timestamp || Date.now();
    return new Date(t).toLocaleTimeString();
  });

  const minV = Math.min(...values) - 5;
  const maxV = Math.max(...values) + 5;
  const pad = 20;

  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.strokeStyle = '#c8e6c9';
  ctx.lineWidth = 1;
  ctx.strokeRect(pad, pad, canvas.width - 2*pad, canvas.height - 2*pad);

  ctx.beginPath();
  values.forEach((v,i) => {
    const x = pad + (i/(values.length-1))*(canvas.width - 2*pad);
    const y = pad + (1 - (v - minV)/(maxV - minV))*(canvas.height - 2*pad);
    if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
  });
  ctx.strokeStyle = '#2e7d32';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#2e7d32';
  values.forEach((v,i) => {
    const x = pad + (i/(values.length-1))*(canvas.width - 2*pad);
    const y = pad + (1 - (v - minV)/(maxV - minV))*(canvas.height - 2*pad);
    ctx.beginPath();
    ctx.arc(x,y,4,0,Math.PI*2);
    ctx.fill();

    ctx.font = '10px sans-serif';
    ctx.fillText(`${v}%`, x-10, y-8);
    ctx.fillText(times[i], x-20, canvas.height - 2);
  });
}
