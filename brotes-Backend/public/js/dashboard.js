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
  const btnLogout = document.getElementById('btnLogout');
  if (btnLogout) {
    btnLogout.addEventListener('click', async () => {
      await fetchWithCred(`${AUTH_API}/logout`, { method: 'POST' });
      window.location.href = '/index.html';
    });
  } else console.warn('btnLogout no encontrado en el DOM');

  try {
    const profileRes = await fetchWithCred(`${AUTH_API}/profile`);
    if (!profileRes.ok) { window.location.href = '/login.html'; return; }
    const profile = await profileRes.json();
    if (profile.role !== 'estudiante') window.location.href = '/index.html';
  } catch (err) {
    console.error('Error verificando sesión', err);
    window.location.href = '/login.html';
    return;
  }

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

    // valor inicial de humedad
    let humidity = data.humidity || Math.floor(40 + Math.random() * 30);
    updateHumidity(humidity);

    // cada 1 minuto genera un valor aleatorio
    setInterval(() => {
      humidity = Math.floor(40 + Math.random() * 30);
      updateHumidity(humidity);
    }, 60 * 1000);

  } catch (err) {
    console.error('Error dashboardData', err);
    document.getElementById('plantsList').textContent = 'Error de red.';
  }
}

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
    const st = progress[key] || { stage: 'Germinacion', health: 'Regular', plantedAt: 'Huerto 1' };
    const node = document.createElement('div');
    node.className = 'plant-status';
    node.innerHTML = `
      <strong>${formatPlantName(key)}</strong>
      <div>Etapa: ${escapeHtml(String(st.stage || 'desconocida'))}</div>
      <div>Salud: ${escapeHtml(String(st.health || 'desconocida'))}</div>
      <div>Plantado en: ${formatTimestamp(st.plantedAt)}</div>
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

/* ---------------------------
   Función que actualiza humedad (valor y gráfica donut)
--------------------------- */
function updateHumidity(value) {
  // actualizar texto
  document.getElementById('humidityVal').textContent = `${value}%`;
  // actualizar gráfica
  renderHumidityChart(value, 'humidityChartContainer');
}

/* ---------------------------
   Gráfica de Humedad Circular (Donut)
--------------------------- */
function renderHumidityChart(value, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';

  const canvas = document.createElement('canvas');
  canvas.style.width = '100%';
  canvas.style.height = '220px';
  container.appendChild(canvas);

  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = 220 * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const W = canvas.width / dpr;
  const H = canvas.height / dpr;
  const cx = W / 2;
  const cy = H / 2;
  const radius = Math.min(W, H) / 3;

  // Fondo
  ctx.fillStyle = '#fbfff9';
  ctx.fillRect(0, 0, W, H);

  // Círculo de fondo
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fillStyle = '#e8f5e9';
  ctx.fill();

  // Círculo con progreso
  const startAngle = -Math.PI / 2;
  const endAngle = startAngle + (value / 100) * 2 * Math.PI;
  const grad = ctx.createLinearGradient(cx - radius, cy - radius, cx + radius, cy + radius);
  grad.addColorStop(0, '#4caf50');
  grad.addColorStop(1, '#81c784');

  ctx.beginPath();
  ctx.arc(cx, cy, radius, startAngle, endAngle);
  ctx.lineWidth = radius * 0.25;
  ctx.strokeStyle = grad;
  ctx.lineCap = 'round';
  ctx.stroke();

  // Texto central
  ctx.fillStyle = '#2e7d32';
  ctx.font = `bold ${radius * 0.5}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${value}%`, cx, cy);

  // Tooltip simple
  const tooltip = document.createElement('div');
  tooltip.style.position = 'absolute';
  tooltip.style.pointerEvents = 'none';
  tooltip.style.padding = '6px 10px';
  tooltip.style.borderRadius = '6px';
  tooltip.style.background = 'rgba(0,0,0,0.75)';
  tooltip.style.color = '#fff';
  tooltip.style.fontSize = '12px';
  tooltip.style.display = 'none';
  container.appendChild(tooltip);

  canvas.addEventListener('mousemove', (ev) => {
    const r = canvas.getBoundingClientRect();
    const dx = ev.clientX - r.left - cx;
    const dy = ev.clientY - r.top - cy;
    const dist = Math.sqrt(dx*dx + dy*dy);
    if (dist <= radius * 1.2) {
      tooltip.style.display = 'block';
      tooltip.innerHTML = `<strong>Humedad: ${value}%</strong>`;
      tooltip.style.left = `${ev.clientX - r.left}px`;
      tooltip.style.top = `${ev.clientY - r.top - 30}px`;
    } else tooltip.style.display = 'none';
  });

  canvas.addEventListener('mouseleave', () => { tooltip.style.display = 'none'; });

  window.addEventListener('resize', () => { updateHumidity(value); });
}
