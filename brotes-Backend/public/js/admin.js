const API = "/api/auth";

async function fetchWithCred(url, opts = {}) {
  opts.credentials = "include";
  opts.headers = opts.headers || {};
  return fetch(url, opts);
}

async function logout() {
  try {
    const res = await fetchWithCred(`${API}/logout`, { method: "POST" });
    if (res.ok) {
      window.location.href = "/index.html";
    } else {
      alert("Error al cerrar sesión");
    }
  } catch (err) {
    console.error(err);
    alert("Error de red al cerrar sesión");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("btnLogout").onclick = logout;
  document.getElementById("createRole").addEventListener("change", (e) => {
    document.getElementById("adminSecretRow").style.display =
      e.target.value === "admin" ? "block" : "none";
  });

  document.getElementById("btnRefresh").addEventListener("click", loadUsers);
  document.getElementById("filterRole").addEventListener("change", loadUsers);
  document.getElementById("createUserForm").addEventListener("submit", createUser);

  checkProfile();
});

async function checkProfile() {
  try {
    const res = await fetchWithCred(`${API}/profile`);
    if (!res.ok) {
      alert("No estás autenticado. Redirigiendo al login...");
      window.location.href = "/index.html";
      return;
    }

    const profile = await res.json();
    if (profile.role !== "admin") {
      alert("Acceso restringido: solo administradores.");
      window.location.href = "/index.html";
      return;
    }

    document.getElementById("adminEmail").textContent = profile.email;
    loadUsers();
  } catch (err) {
    console.error(err);
    alert("Error al verificar sesión. Backend puede no estar corriendo.");
  }
}
 
async function loadUsers() {
  const usersListEl = document.getElementById("usersList");
  usersListEl.innerHTML = "Cargando usuarios...";

  try {
    const res = await fetchWithCred(`${API}/users`);
    if (!res.ok) {
      usersListEl.innerHTML = "<p>Error al cargar usuarios.</p>";
      return;
    }

    const data = await res.json();
    const users = data.users || [];
    const filter = document.getElementById("filterRole").value; 
    const filtered = filter === "all" ? users : users.filter(u => u.role === filter);
    renderUsers(filtered);
  } catch (err) {
    console.error(err);
    usersListEl.innerHTML = "<p>Error de conexión.</p>";
  }
}

//Renderiza tabla de usuarios
function renderUsers(users) {
  const el = document.getElementById("usersList");
  if (!users.length) {
    el.innerHTML = "<p>No hay usuarios aún.</p>";
    return;
  }

  const rows = users.map(u => `
    <tr data-uid="${u.id}">
      <td>${u.email}</td>
      <td>${u.role}</td>
      <td><input class="displayName" data-uid="${u.id}" value="${u.displayName || ""}" /></td>
      <td><button class="saveBtn" data-uid="${u.id}">Guardar</button></td>
    </tr>
  `).join("");

  el.innerHTML = `
    <table class="usersTable">
      <thead><tr><th>Email</th><th>Rol</th><th>Nombre</th><th>Acción</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;

  el.querySelectorAll(".saveBtn").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      const uid = e.target.dataset.uid;
      const input = el.querySelector(`input.displayName[data-uid="${uid}"]`);
      await saveDisplayName(uid, input.value);
    });
  });
}

//Actualiza nombre visible
async function saveDisplayName(uid, displayName) {
  try {
    const res = await fetchWithCred(`${API}/users/${uid}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName })
    });
    const data = await res.json();
    if (!res.ok) {
      alert("Error: " + (data.error || "No se pudo guardar"));
      return;
    }
    alert("Nombre guardado correctamente");
    loadUsers();
  } catch (err) {
    alert("Error de red: " + err.message);
  }
}

//Crear usuario
async function createUser(e) {
  e.preventDefault();
  const email = document.getElementById("createEmail").value.trim();
  const password = document.getElementById("createPassword").value.trim();
  const role = document.getElementById("createRole").value;
  const adminSecret = document.getElementById("createAdminSecret").value.trim();
  const msg = document.getElementById("createMsg");

  msg.textContent = "";
  msg.style.color = "";

  if (!email || !password || !role) {
    msg.textContent = "Completa todos los campos";
    msg.style.color = "red";
    return;
  }

  try {
    const body = { email, password, role };
    if (role === "admin") body.adminSecret = adminSecret;

    const res = await fetch(`${API}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    const data = await res.json();
    if (!res.ok) {
      msg.textContent = data.error || res.statusText;
      msg.style.color = "red";
      return;
    }

    msg.style.color = "green";
    msg.textContent = `Usuario creado (uid: ${data.uid})`;
    e.target.reset();
    document.getElementById("adminSecretRow").style.display = "none";
    loadUsers();
  } catch (err) {
    msg.textContent = "Error de red: " + err.message;
    msg.style.color = "red";
  }
}
