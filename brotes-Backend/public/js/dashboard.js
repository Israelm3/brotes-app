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

// Funciones de renderizado (sin cambios salvo pequeños ajustes)
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

/* ---------------------------
   Gráfica de humedad mejorada
   - Área con degradado
   - Línea suavizada (curvas)
   - Grid sutil
   - Puntos con sombra
   - Tooltip simple al pasar mouse
   - Responsive usando devicePixelRatio
   --------------------------- */
function renderHumidityChart(history, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // Limpia y prepara
  container.innerHTML = '';
  // crear wrapper para tooltip
  const wrapper = document.createElement('div');
  wrapper.style.position = 'relative';
  container.appendChild(wrapper);

  const canvas = document.createElement('canvas');
  canvas.style.width = '100%';
  canvas.style.height = '220px';
  wrapper.appendChild(canvas);

  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.max(600, rect.width * dpr);
  canvas.height = 220 * dpr;

  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr); // trabajamos en CSS pixels

  // Tooltip
  const tooltip = document.createElement('div');
  tooltip.style.position = 'absolute';
  tooltip.style.pointerEvents = 'none';
  tooltip.style.padding = '6px 8px';
  tooltip.style.borderRadius = '6px';
  tooltip.style.background = 'rgba(0,0,0,0.75)';
  tooltip.style.color = '#fff';
  tooltip.style.fontSize = '12px';
  tooltip.style.display = 'none';
  tooltip.style.transform = 'translate(-50%, -120%)';
  wrapper.appendChild(tooltip);

  if (!Array.isArray(history) || history.length === 0) {
    ctx.fillStyle = '#666';
    ctx.font = '14px sans-serif';
    ctx.fillText('Sin histórico de humedad', 10, 20);
    return;
  }

  // Ordenar y preparar valores
  history.sort((a,b) => (a.ts || a.timestamp || 0) - (b.ts || b.timestamp || 0));
  const values = history.map(h => h.value || h.v || 0);
  const times = history.map(h => {
    const t = h.ts || h.timestamp || Date.now();
    return new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  });

  // Dimensiones en CSS pixels
  const W = canvas.width / dpr;
  const H = canvas.height / dpr;
  const pad = 36;
  const chartW = W - pad * 2;
  const chartH = H - pad * 2;

  // Rango Y con pequeño padding
  const minV = Math.min(...values);
  const maxV = Math.max(...values);
  const yMin = Math.max(0, Math.floor(minV - 8));
  const yMax = Math.min(100, Math.ceil(maxV + 8));
  const yRange = (yMax - yMin) || 1;

  // Clear
  ctx.clearRect(0,0,W,H);

  // Fondo suave
  ctx.fillStyle = '#fbfff9';
  ctx.fillRect(0,0,W,H);

  // Grid horizontal sutil
  ctx.strokeStyle = 'rgba(34,139,34,0.08)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  const gridLines = 4;
  for (let i = 0; i <= gridLines; i++) {
    const y = pad + (i/gridLines)*chartH;
    ctx.moveTo(pad, y);
    ctx.lineTo(pad + chartW, y);
  }
  ctx.stroke();

  // Eje Y etiquetas (porcentajes)
  ctx.fillStyle = '#2e7d32';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let i = 0; i <= gridLines; i++) {
    const v = yMax - (i/gridLines)*yRange;
    const y = pad + (i/gridLines)*chartH;
    ctx.fillText(`${Math.round(v)}%`, pad - 8, y);
  }

  // Calcular puntos en coordenadas
  const pts = values.map((v,i) => {
    const x = pad + (i/(values.length - 1)) * chartW;
    const y = pad + (1 - (v - yMin)/yRange) * chartH;
    return { x, y, v, label: times[i] };
  });

  // Dibujar área con degradado (suave)
  const areaGrad = ctx.createLinearGradient(0, pad, 0, pad + chartH);
  areaGrad.addColorStop(0, 'rgba(46,125,50,0.18)');
  areaGrad.addColorStop(1, 'rgba(46,125,50,0.02)');

  ctx.beginPath();
  // punto inicial
  ctx.moveTo(pts[0].x, pts[0].y);
  // usar curva bezier simple para suavizar: iterar y crear curva cuadrática entre puntos
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i-1];
    const cur = pts[i];
    const cx = (prev.x + cur.x) / 2;
    const cy = (prev.y + cur.y) / 2;
    ctx.quadraticCurveTo(prev.x, prev.y, cx, cy);
  }
  // línea a último punto
  ctx.lineTo(pts[pts.length-1].x, pts[pts.length-1].y);
  // bajar hasta baseline y cerrar
  ctx.lineTo(pts[pts.length-1].x, pad + chartH);
  ctx.lineTo(pts[0].x, pad + chartH);
  ctx.closePath();
  ctx.fillStyle = areaGrad;
  ctx.fill();

  // Línea principal (más visible)
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i-1];
    const cur = pts[i];
    const cx = (prev.x + cur.x) / 2;
    const cy = (prev.y + cur.y) / 2;
    ctx.quadraticCurveTo(prev.x, prev.y, cx, cy);
  }
  ctx.strokeStyle = '#2e7d32';
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();

  // Dibujar puntos con sombra
  pts.forEach(p => {
    ctx.beginPath();
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#2e7d32';
    ctx.lineWidth = 1.5;
    // sombra
    ctx.save();
    ctx.shadowColor = 'rgba(46,125,50,0.2)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 2;
    ctx.arc(p.x, p.y, 5, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();
    ctx.stroke();

    // etiqueta valor pequeña encima del punto
    ctx.fillStyle = '#2e7d32';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${p.v}%`, p.x, p.y - 12);
  });

  // Etiquetas de tiempo en el eje X (solo algunos para no saturar)
  ctx.fillStyle = '#2e7d32';
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const maxLabels = Math.min(4, pts.length);
  for (let i = 0; i < pts.length; i++) {
    // mostrar según índice aproximado
    if (i % Math.max(1, Math.floor(pts.length / maxLabels)) === 0 || i === pts.length - 1) {
      ctx.fillText(pts[i].label, pts[i].x, pad + chartH + 6);
    }
  }

  // Interactividad básica: tooltip en hover
  canvas.addEventListener('mousemove', (ev) => {
    const r = canvas.getBoundingClientRect();
    const mx = (ev.clientX - r.left);
    const my = (ev.clientY - r.top);
    // encontrar punto cercano
    const hitRadius = 12;
    let found = null;
    for (let p of pts) {
      const dx = mx - p.x;
      const dy = my - p.y;
      if (Math.sqrt(dx*dx + dy*dy) <= hitRadius) {
        found = p;
        break;
      }
    }
    if (found) {
      tooltip.style.display = 'block';
      tooltip.innerHTML = `<strong>${found.v}%</strong><br><span style="font-size:11px">${found.label}</span>`;
      // posiciona Tooltip (evitar que salga del contenedor)
      const left = Math.max(8, Math.min(r.width - 8, found.x));
      tooltip.style.left = `${left}px`;
      tooltip.style.top = `${found.y}px`;
    } else {
      tooltip.style.display = 'none';
    }
  });

  canvas.addEventListener('mouseleave', () => {
    tooltip.style.display = 'none';
  });

  // Redibujar si cambia tamaño de ventana
  let resizeTimeout = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      // volver a ejecutar la función para ajustar canvas
      renderHumidityChart(history, containerId);
    }, 200);
  });
}
