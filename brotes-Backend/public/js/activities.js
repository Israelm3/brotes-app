import { logout } from '/js/auth.js';

const API = "/api/auth";

// Actividades estáticas
const ACTIVITIES = [
  { id: 'riego', title: 'Riego', freq: '2-3 días', desc: 'Regar de forma uniforme, evitar encharcar.' },
  { id: 'abono', title: 'Fertilización', freq: 'Cada 30 días', desc: 'Añadir compost o fertilizante suave.' },
  { id: 'deshierbe', title: 'Deshierbe', freq: 'Semanal', desc: 'Eliminar malas hierbas para evitar competencia.' },
  { id: 'recoleccion', title: 'Recolección', freq: 'Según madurez', desc: 'Cosechar cuando los frutos estén listos.' },
  { id: 'inspeccion', title: 'Inspección de plagas', freq: '2 semanas', desc: 'Revisar hojas y tallos por plagas.' }
];

// Retos estáticos
const CHALLENGES = [
  { id: 'reto1', title: 'Germina una lenteja', target: 'Germinar 10 semillas', reward: '10 XP' },
  { id: 'reto2', title: 'Fertiliza correctamente', target: 'Usar compost casero', reward: '15 XP' },
  { id: 'reto3', title: 'Registro de humedad', target: 'Registrar humedad 7 días seguidos', reward: '20 XP' }
];

// Helper: obtener key en localStorage por usuario
async function getUserKey() {
  // intentamos obtener uid desde profile endpoint; si falla, usar 'anon'
  try {
    const res = await fetch(`${API}/profile`, { credentials: 'include' });
    if (!res.ok) return 'anon';
    const profile = await res.json();
    return `activities_${profile.uid}`;
  } catch (e) {
    return 'anon';
  }
}

async function loadState() {
  const key = await getUserKey();
  const raw = localStorage.getItem(key);
  return raw ? JSON.parse(raw) : { activities: {}, challenges: {} };
}

async function saveState(state) {
  const key = await getUserKey();
  localStorage.setItem(key, JSON.stringify(state));
}

// Render tabla de actividades
async function renderActivities() {
  const tbody = document.querySelector('#activitiesTable tbody');
  const state = await loadState();
  tbody.innerHTML = '';
  ACTIVITIES.forEach(a => {
    const checked = state.activities[a.id] === true ? 'checked' : '';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${a.title}</td>
      <td>${a.freq}</td>
      <td>${a.desc}</td>
      <td>
        <label class="switch">
          <input type="checkbox" data-id="${a.id}" ${checked}>
          <span class="slider round"></span>
        </label>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // adicionar listeners
  tbody.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', async (e) => {
      const id = e.target.dataset.id;
      const s = await loadState();
      s.activities[id] = e.target.checked;
      await saveState(s);
      // opcional: mostrar notificación visual
      showTempMessage(e.target.checked ? 'Actividad marcada como completada' : 'Actividad pendiente', 1500);
    });
  });
}

// Render retos
async function renderChallenges() {
  const container = document.getElementById('challengesList');
  const state = await loadState();
  container.innerHTML = '';
  CHALLENGES.forEach(c => {
    const status = state.challenges[c.id] || 'pending'; // pending | almost | done
    container.appendChild(createChallengeCard(c, status));
  });
}

function createChallengeCard(challenge, status) {
  const div = document.createElement('div');
  div.className = `challenge-card status-${status}`;
  div.innerHTML = `
    <h3>${challenge.title}</h3>
    <p class="muted">${challenge.target}</p>
    <p class="reward">Recompensa: ${challenge.reward}</p>
    <div class="challenge-actions">
      <select data-id="${challenge.id}" class="challenge-select">
        <option value="pending" ${status==='pending'?'selected':''}>Pendiente</option>
        <option value="almost" ${status==='almost'?'selected':''}>Casi listo</option>
        <option value="done" ${status==='done'?'selected':''}>Completado</option>
      </select>
    </div>
  `;
  // listener
  div.querySelector('.challenge-select').addEventListener('change', async (e) => {
    const id = e.target.dataset.id;
    const val = e.target.value;
    const s = await loadState();
    s.challenges[id] = val;
    await saveState(s);
    // actualizar clase
    div.className = `challenge-card status-${val}`;
    showTempMessage('Estado del reto actualizado', 1200);
  });
  return div;
}

function showTempMessage(text, time = 1200) {
  const el = document.createElement('div');
  el.className = 'temp-msg';
  el.textContent = text;
  document.body.appendChild(el);
  setTimeout(()=> el.remove(), time);
}

async function initPage() {
  document.getElementById('btnGoDashboard')?.addEventListener('click', () => window.location.href = '/dashboard.html');
  document.getElementById('btnLogout')?.addEventListener('click', async () => await logout());

  await renderActivities();
  await renderChallenges();
}

document.addEventListener('DOMContentLoaded', initPage);
