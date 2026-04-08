
// ===== FIREBASE CONFIG =====
const firebaseConfig = {
  apiKey: "AIzaSyBG_DjQQfroIKY3Fta2PgsfE9ArRYfqrh0",
  authDomain: "project-3081-limber.firebaseapp.com",
  projectId: "project-3081-limber",
  storageBucket: "project-3081-limber.firebasestorage.app",
  messagingSenderId: "174564084979",
  appId: "1:174564084979:web:d141d7ee968595f1d4bb86",
  measurementId: "G-K99Q5PX8W2"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();

let currentAdmin = null;

// ===== AUTH CHECK =====
// Muestra login si no hay sesión. Verifica nodo privado/{uid} en Firebase.
auth.onAuthStateChanged(user => {
  hideLoading();
  if (!user) {
    showAdminLogin();
    return;
  }
  db.ref('privado/' + user.uid).once('value').then(snap => {
    const datos = snap.val();
    if (datos && datos.email === user.email) {
      currentAdmin = user;
      showAdminPanel();
      initAdmin();
    } else {
      // Usuario no autorizado: mostrar login con mensaje
      auth.signOut();
      showAdminLogin('Tu cuenta no tiene permisos de administrador.');
    }
  }).catch(() => {
    showAdminLogin('Error al verificar permisos. Intenta de nuevo.');
  });
});

function showAdminLogin(errorMsg) {
  document.getElementById('adminLoginScreen').style.display = 'flex';
  document.getElementById('adminPanel').style.display = 'none';
  if (errorMsg) {
    const el = document.getElementById('adminErrorMsg');
    if (el) { el.textContent = errorMsg; el.style.display = 'block'; }
  }
}

function showAdminPanel() {
  document.getElementById('adminLoginScreen').style.display = 'none';
  document.getElementById('adminPanel').style.display = 'flex';
}

function adminLoginGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider();
  showLoading();
  auth.signInWithPopup(provider).catch(e => {
    hideLoading();
    showAdminLogin('Error al iniciar sesión. Intenta de nuevo.');
  });
}

function adminLogout() {
  auth.signOut().then(() => showAdminLogin());
}

// ===== INIT =====
function initAdmin() {
  setCurrentDate();
  showAdminSection('dashboard');
}

function setCurrentDate() {
  const el = document.getElementById('currentDate');
  if (el) {
    const opts = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    el.textContent = new Date().toLocaleDateString('es-ES', opts);
  }
}

// ===== NAVIGATION =====
function showAdminSection(section, btn) {
  document.querySelectorAll('.admin-nav .nav-item').forEach(n => n.classList.remove('active'));
  if (btn) btn.classList.add('active');

  const titleEl = document.getElementById('adminTitle');
  const titles = {
    dashboard: 'Panel de Administración',
    usuarios: 'Gestión de Usuarios',
    codigos: 'Códigos de Activación',
    planes: 'Planes y Precios',
    mensajes: 'Mensajes del Sistema',
    config: 'Configuración',
    errores: 'Errores y Reportes'
  };
  if (titleEl) titleEl.textContent = titles[section] || section;

  const area = document.getElementById('adminArea');
  switch(section) {
    case 'dashboard': renderAdminDashboard(area); break;
    case 'usuarios': renderUsuarios(area); break;
    case 'codigos': renderCodigos(area); break;
    case 'planes': renderPlanes(area); break;
    case 'mensajes': renderMensajes(area); break;
    case 'config': renderConfig(area); loadAdminsList(); break;
    case 'errores': renderErrores(area); break;
  }
}

// ===== ADMIN DASHBOARD =====
function renderAdminDashboard(area) {
  area.innerHTML = `
    <div class="admin-stats">
      <div class="admin-stat-card"><div class="admin-stat-label">Total Usuarios</div><div class="admin-stat-value" id="totalUsuarios">0</div></div>
      <div class="admin-stat-card"><div class="admin-stat-label">Planes Activos</div><div class="admin-stat-value" id="planesActivos">0</div></div>
      <div class="admin-stat-card"><div class="admin-stat-label">Códigos Generados</div><div class="admin-stat-value" id="totalCodigos">0</div></div>
      <div class="admin-stat-card"><div class="admin-stat-label">Mensajes Pendientes</div><div class="admin-stat-value" id="totalMensajes">0</div></div>
    </div>
    <div class="content-grid">
      <div class="admin-card"><div class="admin-card-header"><h3>Últimos Usuarios Registrados</h3></div><div class="admin-card-body"><table><thead><tr><th>Nombre</th><th>Email</th><th>Plan</th><th>Fecha</th></tr></thead><tbody id="ultimosUsuarios"><tr><td colspan="4" class="empty-state">Cargando...</td></tr></tbody></table></div></div>
      <div class="admin-card"><div class="admin-card-header"><h3>Códigos Recientes</h3></div><div class="admin-card-body"><table><thead><tr><th>Código</th><th>Tipo</th><th>Estado</th></tr></thead><tbody id="codigosRecientes"><tr><td colspan="3" class="empty-state">Cargando...</td></tr></tbody></table></div></div>
    </div>`;
  loadAdminStats();
}

function loadAdminStats() {
  db.ref('usuarios').once('value').then(snap => {
    let total = 0, activos = 0;
    const ultimos = [];
    snap.forEach(child => {
      total++;
      const perfil = child.val().perfil || {};
      if (perfil.plan && perfil.plan !== 'gratuito') activos++;
      ultimos.unshift({ ...perfil, uid: child.key });
    });
    const tEl = document.getElementById('totalUsuarios');
    const aEl = document.getElementById('planesActivos');
    if (tEl) tEl.textContent = total;
    if (aEl) aEl.textContent = activos;

    const tbody = document.getElementById('ultimosUsuarios');
    if (tbody) {
      if (ultimos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="empty-state">Sin usuarios</td></tr>';
      } else {
        tbody.innerHTML = ultimos.slice(0,5).map(u => {
          const planBadge = u.plan === 'mensual' ? 'badge-paid' : u.plan === 'mantenimiento' ? 'badge-maint' : 'badge-free';
          return `<tr><td>${u.nombre||'Sin nombre'}</td><td>${u.email||'-'}</td><td><span class="badge ${planBadge}">${u.plan||'gratuito'}</span></td><td>${(u.fechaRegistro||'').split('T')[0]}</td></tr>`;
        }).join('');
      }
    }
  });

  db.ref('codigos').once('value').then(snap => {
    let total = 0;
    const recientes = [];
    snap.forEach(child => { total++; recientes.unshift({ codigo: child.key, ...child.val() }); });
    const cEl = document.getElementById('totalCodigos');
    if (cEl) cEl.textContent = total;
    const tbody = document.getElementById('codigosRecientes');
    if (tbody) {
      if (recientes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="empty-state">Sin códigos</td></tr>';
      } else {
        tbody.innerHTML = recientes.slice(0,5).map(c => {
          const estado = c.usado ? '<span class="badge badge-danger">Usado</span>' : '<span class="badge badge-success">Disponible</span>';
          return `<tr><td style="font-family:monospace;font-weight:700;letter-spacing:2px;">${c.codigo}</td><td><span class="badge badge-info">${c.tipo||'mensual'}</span></td><td>${estado}</td></tr>`;
        }).join('');
      }
    }
  });

  db.ref('mensajes').once('value').then(snap => {
    const mEl = document.getElementById('totalMensajes');
    if (mEl) mEl.textContent = snap.numChildren();
  });
}

// ===== USUARIOS =====
function renderUsuarios(area) {
  area.innerHTML = `
    <div class="admin-card">
      <div class="admin-card-header">
        <h3><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="var(--accent)" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg> Todos los Usuarios</h3>
        <div class="admin-search"><input type="text" id="searchUser" placeholder="Buscar usuario..." oninput="filterUsers()"></div>
      </div>
      <div class="admin-card-body">
        <table><thead><tr><th>Nombre</th><th>Email</th><th>UID</th><th>Plan</th><th>Fecha</th><th>Acciones</th></tr></thead><tbody id="todosUsuarios"><tr><td colspan="6" class="empty-state">Cargando...</td></tr></tbody></table>
      </div>
    </div>`;
  loadAllUsers();
}

let allUsersData = [];
function loadAllUsers() {
  db.ref('usuarios').on('value', snap => {
    allUsersData = [];
    snap.forEach(child => {
      allUsersData.push({ uid: child.key, ...(child.val().perfil || {}), data: child.val() });
    });
    renderUserList(allUsersData);
  });
}

function filterUsers() {
  const q = (document.getElementById('searchUser')?.value || '').toLowerCase();
  const filtered = allUsersData.filter(u => (u.nombre||'').toLowerCase().includes(q) || (u.email||'').toLowerCase().includes(q));
  renderUserList(filtered);
}

function renderUserList(users) {
  const tbody = document.getElementById('todosUsuarios');
  if (!tbody) return;
  if (users.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state">Sin resultados</td></tr>';
    return;
  }
  tbody.innerHTML = users.map(u => {
    const planBadge = u.plan === 'mensual' ? 'badge-paid' : u.plan === 'mantenimiento' ? 'badge-maint' : 'badge-free';
    return `<tr>
      <td>${u.nombre||'Sin nombre'}</td>
      <td>${u.email||'-'}</td>
      <td style="font-family:monospace;font-size:12px;color:var(--text-muted);">${u.uid.substring(0,12)}...</td>
      <td><span class="badge ${planBadge}">${u.plan||'gratuito'}</span></td>
      <td>${(u.fechaRegistro||'').split('T')[0]}</td>
      <td>
        <button class="btn-edit" onclick="editUserPlan('${u.uid}','${u.plan||'gratuito'}')">Cambiar Plan</button>
        <button class="btn-edit" onclick="viewUserData('${u.uid}')" style="background:#dcfce7;color:#166534;border-color:#bbf7d0;">Ver Datos</button>
      </td>
    </tr>`;
  }).join('');
}

function editUserPlan(uid, currentPlan) {
  const newPlan = prompt('Cambiar plan del usuario.\nOpciones: gratuito, mensual, mantenimiento\nPlan actual: ' + currentPlan, currentPlan);
  if (!newPlan || !['gratuito','mensual','mantenimiento'].includes(newPlan)) return;
  db.ref('usuarios/' + uid + '/perfil/plan').set(newPlan).then(() => showToast('Plan actualizado', 'success'));
}

function viewUserData(uid) {
  const user = allUsersData.find(u => u.uid === uid);
  if (!user) return;
  const data = user.data || {};
  let info = `Nombre: ${user.nombre}\nEmail: ${user.email}\nPlan: ${user.plan}\n\n`;
  info += `Ventas: ${Object.keys(data.ventas || {}).length}\n`;
  info += `Gastos: ${Object.keys(data.gastos || {}).length}\n`;
  info += `Productos: ${Object.keys(data.productos || {}).length}\n`;
  info += `Clientes: ${Object.keys(data.clientes || {}).length}`;
  alert(info);
}

// ===== CODIGOS =====
function renderCodigos(area) {
  area.innerHTML = `
    <div class="admin-card">
      <div class="admin-card-header"><h3><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="var(--accent)" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg> Generar Código de Activación</h3></div>
      <div class="admin-card-body padded">
        <div class="code-gen-area">
          <div class="form-group">
            <label>Tipo de Plan</label>
            <select id="codigoTipo">
              <option value="mensual">Mensual ($50/mes)</option>
              <option value="mantenimiento">Mantenimiento ($250)</option>
            </select>
          </div>
          <button class="btn-save" onclick="generarCodigo()" style="background:var(--accent);">Generar Código</button>
        </div>
        <div id="codigoGenerado"></div>
      </div>
    </div>
    <div class="admin-card">
      <div class="admin-card-header"><h3>Todos los Códigos</h3></div>
      <div class="admin-card-body">
        <table><thead><tr><th>Código</th><th>Tipo</th><th>Estado</th><th>Usado Por</th><th>Fecha Uso</th><th>Acciones</th></tr></thead><tbody id="listaCodigos"><tr><td colspan="6" class="empty-state">Cargando...</td></tr></tbody></table>
      </div>
    </div>`;
  loadCodigos();
}

function generarCodigo() {
  const tipo = document.getElementById('codigoTipo').value;
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];

  db.ref('codigos/' + code).set({
    tipo: tipo,
    usado: false,
    creadoPor: currentAdmin.email,
    fechaCreacion: new Date().toISOString()
  }).then(() => {
    document.getElementById('codigoGenerado').innerHTML = `
      <div class="generated-code">${code}<button class="copy-btn" onclick="navigator.clipboard.writeText('${code}');showToast('Copiado','success')">Copiar</button></div>
      <p style="margin-top:12px;color:var(--text-secondary);font-size:14px;">Código para plan <strong>${tipo}</strong> generado exitosamente.</p>`;
    showToast('Código generado: ' + code, 'success');
    loadCodigos();
  });
}

function loadCodigos() {
  db.ref('codigos').on('value', snap => {
    const tbody = document.getElementById('listaCodigos');
    if (!tbody) return;
    const items = [];
    snap.forEach(child => items.unshift({ codigo: child.key, ...child.val() }));
    if (items.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="empty-state">Sin códigos</td></tr>';
    } else {
      tbody.innerHTML = items.map(c => {
        const estado = c.usado ? '<span class="badge badge-danger">Usado</span>' : '<span class="badge badge-success">Disponible</span>';
        return `<tr>
          <td style="font-family:monospace;font-weight:700;letter-spacing:2px;">${c.codigo}</td>
          <td><span class="badge badge-info">${c.tipo}</span></td>
          <td>${estado}</td>
          <td style="font-size:13px;">${c.usadoPor || '-'}</td>
          <td>${c.fechaUso ? c.fechaUso.split('T')[0] : '-'}</td>
          <td><button class="btn-delete" onclick="eliminarCodigo('${c.codigo}')">Eliminar</button></td>
        </tr>`;
      }).join('');
    }
  });
}

function eliminarCodigo(code) {
  if (!confirm('¿Eliminar el código ' + code + '?')) return;
  db.ref('codigos/' + code).remove().then(() => showToast('Código eliminado', 'success'));
}

// ===== PLANES Y PRECIOS =====
function renderPlanes(area) {
  area.innerHTML = `
    <div class="admin-card">
      <div class="admin-card-header"><h3>Configuración de Precios</h3></div>
      <div class="admin-card-body padded">
        <p style="color:var(--text-secondary);margin-bottom:20px;">Modifica los precios predeterminados de cada plan.</p>
        <div class="form-row">
          <div class="form-group">
            <label>Plan Mensual ($/mes)</label>
            <input type="number" id="precioMensual" value="50" step="1">
          </div>
          <div class="form-group">
            <label>Plan Mantenimiento ($)</label>
            <input type="number" id="precioMant" value="250" step="1">
          </div>
        </div>
        <button class="btn-save" onclick="guardarPrecios()">Guardar Precios</button>
        <p style="color:var(--text-muted);font-size:13px;margin-top:12px;">Nota: Los precios se actualizarán en la página de inicio.</p>
      </div>
    </div>
    <div class="admin-card">
      <div class="admin-card-header"><h3>Límites del Sistema</h3></div>
      <div class="admin-card-body padded">
        <div class="form-row">
          <div class="form-group">
            <label>Máximo Usuarios (0 = ilimitado)</label>
            <input type="number" id="maxUsuarios" value="0">
          </div>
          <div class="form-group">
            <label>Productos en Plan Gratuito</label>
            <input type="number" id="maxProdGratis" value="50">
          </div>
        </div>
        <button class="btn-save" onclick="guardarLimites()">Guardar Límites</button>
      </div>
    </div>`;
  loadPrecios();
}

function loadPrecios() {
  db.ref('config/precios').once('value').then(snap => {
    const d = snap.val() || {};
    const m = document.getElementById('precioMensual');
    const mt = document.getElementById('precioMant');
    if (m && d.mensual) m.value = d.mensual;
    if (mt && d.mantenimiento) mt.value = d.mantenimiento;
  });
  db.ref('config/limites').once('value').then(snap => {
    const d = snap.val() || {};
    const mu = document.getElementById('maxUsuarios');
    const mp = document.getElementById('maxProdGratis');
    if (mu && d.maxUsuarios !== undefined) mu.value = d.maxUsuarios;
    if (mp && d.maxProdGratis !== undefined) mp.value = d.maxProdGratis;
  });
}

function guardarPrecios() {
  db.ref('config/precios').set({
    mensual: parseFloat(document.getElementById('precioMensual').value) || 50,
    mantenimiento: parseFloat(document.getElementById('precioMant').value) || 250
  }).then(() => showToast('Precios actualizados', 'success'));
}

function guardarLimites() {
  db.ref('config/limites').set({
    maxUsuarios: parseInt(document.getElementById('maxUsuarios').value) || 0,
    maxProdGratis: parseInt(document.getElementById('maxProdGratis').value) || 50
  }).then(() => showToast('Límites actualizados', 'success'));
}

// ===== MENSAJES =====
function renderMensajes(area) {
  area.innerHTML = `
    <div class="admin-card">
      <div class="admin-card-header"><h3><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="var(--accent)" stroke-width="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg> Mensajes de Usuarios</h3></div>
      <div class="admin-card-body" id="listaMensajes"><div class="empty-state" style="padding:40px;">Cargando...</div></div>
    </div>`;
  loadMensajes();
}

function loadMensajes() {
  db.ref('mensajes').on('value', snap => {
    const el = document.getElementById('listaMensajes');
    if (!el) return;
    const items = [];
    snap.forEach(child => items.unshift({ key: child.key, ...child.val() }));
    if (items.length === 0) {
      el.innerHTML = '<div class="empty-state" style="padding:40px;">No hay mensajes</div>';
    } else {
      el.innerHTML = items.map(m => `
        <div class="message-item">
          <div class="message-avatar">${(m.nombre||'U')[0].toUpperCase()}</div>
          <div class="message-content">
            <div class="message-sender">${m.nombre||'Anónimo'} <span style="color:var(--text-muted);font-weight:400;font-size:13px;">${m.email||''}</span></div>
            <div class="message-text">${m.mensaje||''}</div>
            <div class="message-time">${m.fecha||''}</div>
          </div>
          <button class="btn-delete" onclick="eliminarMensaje('${m.key}')">Eliminar</button>
        </div>`).join('');
    }
  });
}

function eliminarMensaje(key) {
  db.ref('mensajes/' + key).remove().then(() => showToast('Mensaje eliminado', 'success'));
}

// ===== CONFIGURACION =====
function renderConfig(area) {
  area.innerHTML = `
    <div class="admin-card">
      <div class="admin-card-header"><h3>Configuración General</h3></div>
      <div class="admin-card-body padded">
        <div class="form-group">
          <label>Administradores autorizados (Firebase: privado/{uid})</label>
          <div id="adminsList" style="font-family:monospace;font-size:13px;padding:10px;border:1.5px solid var(--border);border-radius:var(--radius-sm);min-height:60px;background:var(--bg-secondary);">Cargando...</div>
        </div>
        <p style="color:var(--text-muted);font-size:13px;margin-bottom:16px;">ℹ️ Los admins se gestionan en Firebase → nodo <strong>privado/{uid}</strong> con campos: email, uid, name</p>
        <div class="form-group">
          <label>WhatsApp de Contacto</label>
          <input type="text" id="whatsappNum" value="59173265343" style="width:100%;padding:12px;border:1.5px solid var(--border);border-radius:var(--radius-sm);">
        </div>
        <button class="btn-save" onclick="guardarConfig()">Guardar Configuración</button>
      </div>
    </div>
    <div class="admin-card">
      <div class="admin-card-header"><h3>Agregar Opciones al Sistema</h3></div>
      <div class="admin-card-body padded">
        <p style="color:var(--text-secondary);margin-bottom:16px;">Agrega categorías de productos o tipos de gastos disponibles para los usuarios.</p>
        <div class="form-row">
          <div class="form-group">
            <label>Nueva Categoría de Producto</label>
            <input type="text" id="nuevaCategoria" placeholder="Ej: Alimentos">
          </div>
          <div class="form-group">
            <label>Nuevo Tipo de Gasto</label>
            <input type="text" id="nuevoTipoGasto" placeholder="Ej: Marketing">
          </div>
        </div>
        <button class="btn-save" onclick="agregarOpciones()" style="background:var(--info)">Agregar Opciones</button>
        <div id="opcionesActuales" style="margin-top:20px;"></div>
      </div>
    </div>`;
  loadConfig();
}

function loadConfig() {
  db.ref('config/contacto').once('value').then(snap => {
    const d = snap.val() || {};
    const w = document.getElementById('whatsappNum');
    if (w && d.whatsapp) w.value = d.whatsapp;
  });
  loadOpciones();
}

function loadAdminsList() {
  db.ref('privado').once('value').then(snap => {
    const el = document.getElementById('adminsList');
    if (!el) return;
    if (!snap.exists()) { el.innerHTML = '<em>No hay administradores registrados.</em>'; return; }
    let html = '';
    snap.forEach(child => {
      const d = child.val();
      html += `<div style="margin-bottom:6px;">• <strong>${d.name||'Sin nombre'}</strong> — ${d.email||'-'} <span style="color:var(--text-muted);font-size:11px;">(uid: ${child.key})</span></div>`;
    });
    el.innerHTML = html;
  });
}

function guardarConfig() {
  db.ref('config/contacto').set({
    whatsapp: document.getElementById('whatsappNum').value.trim()
  }).then(() => showToast('Configuración guardada', 'success'));
}

function agregarOpciones() {
  const cat = document.getElementById('nuevaCategoria').value.trim();
  const tipo = document.getElementById('nuevoTipoGasto').value.trim();
  const promises = [];
  if (cat) promises.push(db.ref('config/categorias').push(cat));
  if (tipo) promises.push(db.ref('config/tiposGasto').push(tipo));
  if (promises.length === 0) return showToast('Ingresa al menos una opción', 'error');
  Promise.all(promises).then(() => {
    showToast('Opciones agregadas', 'success');
    document.getElementById('nuevaCategoria').value = '';
    document.getElementById('nuevoTipoGasto').value = '';
    loadOpciones();
  });
}

function loadOpciones() {
  Promise.all([
    db.ref('config/categorias').once('value'),
    db.ref('config/tiposGasto').once('value')
  ]).then(([catSnap, tipoSnap]) => {
    const el = document.getElementById('opcionesActuales');
    if (!el) return;
    let html = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">';
    html += '<div><h4 style="font-size:14px;margin-bottom:8px;">Categorías de Producto</h4>';
    catSnap.forEach(child => {
      html += `<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:var(--bg);border-radius:6px;margin-bottom:4px;font-size:14px;"><span>${child.val()}</span><button class="btn-delete" onclick="db.ref('config/categorias/${child.key}').remove().then(()=>{showToast('Eliminado','success');loadOpciones();})" style="padding:4px 8px;font-size:11px;">×</button></div>`;
    });
    html += '</div><div><h4 style="font-size:14px;margin-bottom:8px;">Tipos de Gasto</h4>';
    tipoSnap.forEach(child => {
      html += `<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:var(--bg);border-radius:6px;margin-bottom:4px;font-size:14px;"><span>${child.val()}</span><button class="btn-delete" onclick="db.ref('config/tiposGasto/${child.key}').remove().then(()=>{showToast('Eliminado','success');loadOpciones();})" style="padding:4px 8px;font-size:11px;">×</button></div>`;
    });
    html += '</div></div>';
    el.innerHTML = html;
  });
}

// ===== ERRORES =====
function renderErrores(area) {
  area.innerHTML = `
    <div class="admin-card">
      <div class="admin-card-header"><h3><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="var(--danger)" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> Errores y Reportes de Usuarios</h3></div>
      <div class="admin-card-body" id="listaErrores"><div class="empty-state" style="padding:40px;">Cargando...</div></div>
    </div>`;
  db.ref('errores').on('value', snap => {
    const el = document.getElementById('listaErrores');
    if (!el) return;
    const items = [];
    snap.forEach(child => items.unshift({ key: child.key, ...child.val() }));
    if (items.length === 0) {
      el.innerHTML = '<div class="empty-state" style="padding:40px;">No hay errores reportados 🎉</div>';
    } else {
      el.innerHTML = '<table><thead><tr><th>Usuario</th><th>Descripción</th><th>Fecha</th><th>Acciones</th></tr></thead><tbody>' +
        items.map(e => `<tr><td>${e.usuario||'Anónimo'}</td><td>${e.descripcion||''}</td><td>${(e.fecha||'').split('T')[0]}</td><td><button class="btn-delete" onclick="db.ref('errores/${e.key}').remove().then(()=>showToast('Eliminado','success'))">Resolver</button></td></tr>`).join('') +
        '</tbody></table>';
    }
  });
}

// ===== HELPERS =====
function showToast(msg, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'toast ' + type;
  toast.innerHTML = `<span>${msg}</span><button class="toast-close" onclick="this.parentElement.remove()">&times;</button>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

function showLoading() { const el = document.getElementById('loadingOverlay'); if (el) el.style.display = 'flex'; }
function hideLoading() { const el = document.getElementById('loadingOverlay'); if (el) el.style.display = 'none'; }

function toggleMobileSidebar() {
  document.getElementById('sidebar')?.classList.toggle('open');
}
