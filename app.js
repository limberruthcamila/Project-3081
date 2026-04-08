
// ===== FIREBASE CONFIG =====
// IMPORTANTE: Reemplaza con tu configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBG_DjQQfroIKY3Fta2PgsfE9ArRYfqrh0",
  authDomain: "project-3081-limber.firebaseapp.com",
  databaseURL: "https://project-3081-limber-default-rtdb.firebaseio.com",
  projectId: "project-3081-limber",
  storageBucket: "project-3081-limber.firebasestorage.app",
  messagingSenderId: "174564084979",
  appId: "1:174564084979:web:d141d7ee968595f1d4bb86"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();

let currentUser = null;
let userPlan = 'gratuito';

// ===== DETECT PAGE =====
const isAppPage = window.location.pathname.includes('app.html');
const isIndexPage = !isAppPage;

// ===== AUTH STATE =====
auth.onAuthStateChanged(user => {
  hideLoading();
  if (user) {
    currentUser = user;
    if (isAppPage) {
      initApp();
    } else {
      // En index: verificar si es admin antes de redirigir
      db.ref('privado/' + user.uid).once('value').then(snap => {
        const datos = snap.val();
        if (datos && datos.email === user.email) {
          // Es admin: mostrar botón flotante brevemente
          const btn = document.getElementById('adminFloatBtn');
          if (btn) btn.style.display = 'block';
        }
        window.location.href = 'app.html';
      }).catch(() => {
        window.location.href = 'app.html';
      });
    }
  } else {
    currentUser = null;
    if (isAppPage) {
      window.location.href = 'index.html';
    }
  }
});

// ===== AUTH FUNCTIONS =====
function toggleAuthForm() {
  document.getElementById('loginForm').classList.toggle('hidden');
  document.getElementById('registerForm').classList.toggle('hidden');
}

function loginUser() {
  const email = document.getElementById('loginEmail').value.trim();
  const pass = document.getElementById('loginPassword').value;
  if (!email || !pass) return showToast('Completa todos los campos', 'error');
  showLoading();
  auth.signInWithEmailAndPassword(email, pass)
    .catch(e => { hideLoading(); showToast(getErrorMsg(e.code), 'error'); });
}

function registerUser() {
  const name = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const pass = document.getElementById('regPassword').value;
  if (!name || !email || !pass) return showToast('Completa todos los campos', 'error');
  if (pass.length < 6) return showToast('La contraseña debe tener al menos 6 caracteres', 'error');
  showLoading();
  auth.createUserWithEmailAndPassword(email, pass)
    .then(cred => {
      return db.ref('usuarios/' + cred.user.uid + '/perfil').set({
        nombre: name,
        email: email,
        plan: 'gratuito',
        fechaRegistro: new Date().toISOString()
      });
    })
    .catch(e => { hideLoading(); showToast(getErrorMsg(e.code), 'error'); });
}

function loginWithGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider();
  showLoading();
  auth.signInWithPopup(provider)
    .then(result => {
      if (result.additionalUserInfo && result.additionalUserInfo.isNewUser) {
        return db.ref('usuarios/' + result.user.uid + '/perfil').set({
          nombre: result.user.displayName || 'Usuario',
          email: result.user.email,
          plan: 'gratuito',
          fechaRegistro: new Date().toISOString()
        });
      }
    })
    .catch(e => {
      hideLoading();
      if (e.code === 'auth/popup-blocked') {
        showToast('Navegador bloqueó la ventana emergente. Permite popups para este sitio.', 'error');
      } else if (e.code === 'auth/popup-closed-by-user') {
        showToast('Cerraste la ventana de Google.', 'info');
      } else {
        showToast(getErrorMsg(e.code), 'error');
      }
    });
}

function logoutUser() {
  auth.signOut();
}

// ===== PLAN SELECTION =====
let selectedPlanType = '';
function selectPlan(plan) {
  if (plan === 'gratuito') {
    showToast('Ya estás en el plan gratuito', 'info');
    return;
  }
  selectedPlanType = plan;
  const desc = plan === 'mensual'
    ? 'Plan Mensual - $50/mes. Contacta por WhatsApp para obtener tu código.'
    : 'Plan Mantenimiento - $250 único. Contacta por WhatsApp para obtener tu código.';
  const descEl = document.getElementById('codeModalDesc');
  if (descEl) descEl.textContent = desc;
  document.getElementById('codeModal').classList.add('active');
}

function closeCodeModal() {
  document.getElementById('codeModal').classList.remove('active');
}

function activateCode() {
  const code = document.getElementById('activationCode').value.trim();
  if (!code) return showToast('Ingresa un código', 'error');
  if (!currentUser) return showToast('Debes iniciar sesión primero', 'error');

  // Check code in Firebase
  db.ref('codigos/' + code).once('value').then(snap => {
    const data = snap.val();
    if (!data) return showToast('Código inválido', 'error');
    if (data.usado) return showToast('Este código ya fue utilizado', 'error');

    // Activate
    const updates = {};
    updates['codigos/' + code + '/usado'] = true;
    updates['codigos/' + code + '/usadoPor'] = currentUser.uid;
    updates['codigos/' + code + '/fechaUso'] = new Date().toISOString();
    updates['usuarios/' + currentUser.uid + '/perfil/plan'] = data.tipo;

    db.ref().update(updates).then(() => {
      userPlan = data.tipo;
      showToast('¡Plan activado exitosamente!', 'success');
      closeCodeModal();
      if (isAppPage) updatePlanDisplay();
    });
  });
}

// ===== APP INITIALIZATION =====
function initApp() {
  setCurrentDate();
  loadUserProfile();
  checkIfAdmin();
  showModule('dashboard');
}

function setCurrentDate() {
  const el = document.getElementById('currentDate');
  if (el) {
    const opts = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    el.textContent = new Date().toLocaleDateString('es-ES', opts);
  }
}

function checkIfAdmin() {
  // Verificar en Firestore colección privado
  const fsConfig = {
    apiKey: "AIzaSyBFu8Jrd2YrBTMuikiuCnOj7dyHMugHx-0",
    authDomain: "limber-rcl-3081.firebaseapp.com",
    projectId: "limber-rcl-3081",
    storageBucket: "limber-rcl-3081.firebasestorage.app",
    messagingSenderId: "258409264111",
    appId: "1:258409264111:web:08fa48d8bb10ab83c07c1a"
  };
  const fsApp = firebase.apps.find(a => a.name === 'adminCheck')
    || firebase.initializeApp(fsConfig, 'adminCheck');
  const fs = fsApp.firestore();

  fs.collection('privado').doc(currentUser.uid).get().then(doc => {
    let isAdmin = doc.exists;
    if (!isAdmin) {
      return fs.collection('privado').where('email', '==', currentUser.email).get().then(q => {
        if (!q.empty) showAdminBtn();
      });
    } else {
      showAdminBtn();
    }
  }).catch(e => console.log('Admin check:', e.message));
}

function showAdminBtn() {
  const footer = document.querySelector('.sidebar-footer');
  if (footer && !document.getElementById('adminBtn')) {
    const btn = document.createElement('button');
    btn.id = 'adminBtn';
    btn.className = 'nav-item';
    btn.style.cssText = 'color:#f59e0b;margin-bottom:6px;';
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> Panel Admin`;
    btn.onclick = () => window.location.href = 'admin.html';
    footer.insertBefore(btn, footer.firstChild);
  }
}

function loadUserProfile() {
  db.ref('usuarios/' + currentUser.uid + '/perfil').on('value', snap => {
    const data = snap.val() || {};
    const nameEl = document.getElementById('userName');
    const avatarEl = document.getElementById('userAvatar');
    const planEl = document.getElementById('userPlan');
    if (nameEl) nameEl.textContent = data.nombre || currentUser.displayName || 'Usuario';
    if (avatarEl) avatarEl.textContent = (data.nombre || 'U')[0].toUpperCase();
    userPlan = data.plan || 'gratuito';
    if (planEl) {
      const planNames = { gratuito: 'Plan Gratuito', mensual: 'Plan Mensual', mantenimiento: 'Plan Mantenimiento' };
      planEl.textContent = planNames[userPlan] || 'Plan Gratuito';
    }
  });
}

function updatePlanDisplay() {
  loadUserProfile();
}

// ===== MODULE NAVIGATION =====
function showModule(module, btn) {
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  if (btn) btn.classList.add('active');
  else document.querySelector(`[data-module="${module}"]`)?.classList.add('active');

  const titleEl = document.getElementById('moduleTitle');
  const titles = {
    dashboard: 'Dashboard', ventas: 'Ventas', gastos: 'Gastos',
    productos: 'Productos', clientes: 'Clientes', historial: 'Historial', reportes: 'Reportes'
  };
  if (titleEl) titleEl.textContent = titles[module] || module;

  const area = document.getElementById('contentArea');
  if (!area) return;

  switch(module) {
    case 'dashboard': renderDashboard(area); break;
    case 'ventas': renderVentas(area); break;
    case 'gastos': renderGastos(area); break;
    case 'productos': renderProductos(area); break;
    case 'clientes': renderClientes(area); break;
    case 'historial': renderHistorial(area); break;
    case 'reportes': renderReportes(area); break;
  }
  // Close mobile sidebar
  const sb = document.getElementById('sidebar');
  if (sb) sb.classList.remove('open');
  const ov = document.getElementById('sidebarOverlay');
  if (ov) ov.classList.remove('active');
}

// ===== DASHBOARD =====
function renderDashboard(area) {
  area.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon blue"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg></div>
        <div class="stat-info"><div class="stat-label">Ventas Hoy</div><div class="stat-value" id="ventasHoy">$0.00</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon green"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg></div>
        <div class="stat-info"><div class="stat-label">Ingresos del Mes</div><div class="stat-value" id="ingresosMes">$0.00</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon red"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg></div>
        <div class="stat-info"><div class="stat-label">Gastos del Mes</div><div class="stat-value" id="gastosMes">$0.00</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon orange"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg></div>
        <div class="stat-info"><div class="stat-label">Ganancia Neta</div><div class="stat-value green" id="gananciaNeta">$0.00</div></div>
      </div>
    </div>
    <div class="content-grid">
      <div class="card">
        <div class="card-header"><div class="card-title"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> Últimas Ventas</div></div>
        <div class="card-body"><table><thead><tr><th>Producto</th><th>Cantidad</th><th>Total</th><th>Fecha</th></tr></thead><tbody id="ultimasVentas"><tr><td colspan="4" class="empty-state">No hay ventas registradas</td></tr></tbody></table></div>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> Stock Bajo</div></div>
        <div class="card-body" id="stockBajo"><div class="empty-state"><em>Todo el inventario está bien</em></div></div>
      </div>
    </div>
  `;
  loadDashboardData();
}

function loadDashboardData() {
  const uid = currentUser.uid;
  const now = new Date();
  const mesActual = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0');
  const hoy = now.toISOString().split('T')[0];

  db.ref('usuarios/' + uid + '/ventas').on('value', snap => {
    let ventasHoy = 0, ingresosMes = 0;
    const ultimas = [];
    snap.forEach(child => {
      const v = child.val();
      if (v.fecha === hoy) ventasHoy += (v.total || 0);
      if (v.fecha && v.fecha.startsWith(mesActual)) ingresosMes += (v.total || 0);
      ultimas.unshift({ ...v, key: child.key });
    });
    const vhEl = document.getElementById('ventasHoy');
    const imEl = document.getElementById('ingresosMes');
    if (vhEl) vhEl.textContent = '$' + ventasHoy.toFixed(2);
    if (imEl) imEl.textContent = '$' + ingresosMes.toFixed(2);

    const tbody = document.getElementById('ultimasVentas');
    if (tbody) {
      if (ultimas.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="empty-state">No hay ventas registradas</td></tr>';
      } else {
        tbody.innerHTML = ultimas.slice(0,5).map(v => `<tr><td>${v.producto||''}</td><td>${v.cantidad||0}</td><td>$${(v.total||0).toFixed(2)}</td><td>${v.fecha||''}</td></tr>`).join('');
      }
    }

    db.ref('usuarios/' + uid + '/gastos').on('value', gSnap => {
      let gastosMes = 0;
      gSnap.forEach(child => {
        const g = child.val();
        if (g.fecha && g.fecha.startsWith(mesActual)) gastosMes += (g.monto || 0);
      });
      const gmEl = document.getElementById('gastosMes');
      const gnEl = document.getElementById('gananciaNeta');
      if (gmEl) gmEl.textContent = '$' + gastosMes.toFixed(2);
      if (gnEl) gnEl.textContent = '$' + (ingresosMes - gastosMes).toFixed(2);
    });
  });

  // Stock bajo
  db.ref('usuarios/' + uid + '/productos').on('value', snap => {
    const bajo = [];
    snap.forEach(child => {
      const p = child.val();
      if ((p.stock || 0) <= (p.stockMinimo || 5)) bajo.push(p);
    });
    const el = document.getElementById('stockBajo');
    if (el) {
      if (bajo.length === 0) {
        el.innerHTML = '<div class="empty-state"><em>Todo el inventario está bien</em></div>';
      } else {
        el.innerHTML = bajo.map(p => `<div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border-light)"><span>${p.nombre}</span><span class="badge badge-danger">${p.stock} uds</span></div>`).join('');
      }
    }
  });
}

// ===== VENTAS MODULE =====
function renderVentas(area) {
  area.innerHTML = `
    <div class="card mb-4">
      <div class="card-header"><div class="card-title">Nueva Venta</div></div>
      <div class="card-body">
        <div class="form-row">
          <div class="form-group"><label>Producto</label><select id="ventaProducto"><option value="">Seleccionar...</option></select></div>
          <div class="form-group"><label>Cantidad</label><input type="number" id="ventaCantidad" value="1" min="1"></div>
          <div class="form-group"><label>Precio Unitario</label><input type="number" id="ventaPrecio" step="0.01"></div>
        </div>
        <button class="btn-save" onclick="guardarVenta()">Registrar Venta</button>
      </div>
    </div>
    <div class="card">
      <div class="card-header"><div class="card-title">Ventas Registradas</div></div>
      <div class="card-body"><table><thead><tr><th>Producto</th><th>Cantidad</th><th>Precio</th><th>Total</th><th>Fecha</th><th>Acciones</th></tr></thead><tbody id="listaVentas"><tr><td colspan="6" class="empty-state">Cargando...</td></tr></tbody></table></div>
    </div>`;
  loadProductosSelect();
  loadVentas();
}

function loadProductosSelect() {
  db.ref('usuarios/' + currentUser.uid + '/productos').once('value').then(snap => {
    const sel = document.getElementById('ventaProducto');
    if (!sel) return;
    sel.innerHTML = '<option value="">Seleccionar...</option>';
    snap.forEach(child => {
      const p = child.val();
      const opt = document.createElement('option');
      opt.value = child.key;
      opt.textContent = p.nombre;
      opt.dataset.precio = p.precio || 0;
      sel.appendChild(opt);
    });
    sel.onchange = function() {
      const opt = this.options[this.selectedIndex];
      const precioInput = document.getElementById('ventaPrecio');
      if (precioInput && opt.dataset.precio) precioInput.value = opt.dataset.precio;
    };
  });
}

function guardarVenta() {
  const prodKey = document.getElementById('ventaProducto').value;
  const prodName = document.getElementById('ventaProducto').options[document.getElementById('ventaProducto').selectedIndex].textContent;
  const cant = parseInt(document.getElementById('ventaCantidad').value) || 0;
  const precio = parseFloat(document.getElementById('ventaPrecio').value) || 0;
  if (!prodKey || cant <= 0 || precio <= 0) return showToast('Completa todos los campos', 'error');

  const venta = {
    producto: prodName,
    productoId: prodKey,
    cantidad: cant,
    precio: precio,
    total: cant * precio,
    fecha: new Date().toISOString().split('T')[0],
    hora: new Date().toLocaleTimeString('es-ES')
  };
  db.ref('usuarios/' + currentUser.uid + '/ventas').push(venta).then(() => {
    // Reduce stock
    db.ref('usuarios/' + currentUser.uid + '/productos/' + prodKey + '/stock').transaction(current => (current || 0) - cant);
    showToast('Venta registrada', 'success');
    document.getElementById('ventaCantidad').value = 1;
    document.getElementById('ventaPrecio').value = '';
    document.getElementById('ventaProducto').value = '';
  });
}

function loadVentas() {
  db.ref('usuarios/' + currentUser.uid + '/ventas').orderByChild('fecha').on('value', snap => {
    const tbody = document.getElementById('listaVentas');
    if (!tbody) return;
    const ventas = [];
    snap.forEach(child => ventas.unshift({ ...child.val(), key: child.key }));
    if (ventas.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No hay ventas</td></tr>';
    } else {
      tbody.innerHTML = ventas.map(v => `<tr><td>${v.producto}</td><td>${v.cantidad}</td><td>$${(v.precio||0).toFixed(2)}</td><td>$${(v.total||0).toFixed(2)}</td><td>${v.fecha}</td><td><button class="btn-delete" onclick="eliminarRegistro('ventas','${v.key}')">Eliminar</button></td></tr>`).join('');
    }
  });
}

// ===== GASTOS MODULE =====
function renderGastos(area) {
  area.innerHTML = `
    <div class="card mb-4">
      <div class="card-header"><div class="card-title">Nuevo Gasto</div></div>
      <div class="card-body">
        <div class="form-row">
          <div class="form-group"><label>Descripción</label><input type="text" id="gastoDesc" placeholder="Ej: Compra de suministros"></div>
          <div class="form-group"><label>Categoría</label><select id="gastoCat"><option>Operativo</option><option>Suministros</option><option>Servicios</option><option>Personal</option><option>Otro</option></select></div>
          <div class="form-group"><label>Monto</label><input type="number" id="gastoMonto" step="0.01"></div>
        </div>
        <button class="btn-save" onclick="guardarGasto()">Registrar Gasto</button>
      </div>
    </div>
    <div class="card">
      <div class="card-header"><div class="card-title">Gastos Registrados</div></div>
      <div class="card-body"><table><thead><tr><th>Descripción</th><th>Categoría</th><th>Monto</th><th>Fecha</th><th>Acciones</th></tr></thead><tbody id="listaGastos"><tr><td colspan="5" class="empty-state">Cargando...</td></tr></tbody></table></div>
    </div>`;
  loadGastos();
}

function guardarGasto() {
  const desc = document.getElementById('gastoDesc').value.trim();
  const cat = document.getElementById('gastoCat').value;
  const monto = parseFloat(document.getElementById('gastoMonto').value) || 0;
  if (!desc || monto <= 0) return showToast('Completa todos los campos', 'error');
  db.ref('usuarios/' + currentUser.uid + '/gastos').push({
    descripcion: desc, categoria: cat, monto: monto,
    fecha: new Date().toISOString().split('T')[0],
  }).then(() => {
    showToast('Gasto registrado', 'success');
    document.getElementById('gastoDesc').value = '';
    document.getElementById('gastoMonto').value = '';
  });
}

function loadGastos() {
  db.ref('usuarios/' + currentUser.uid + '/gastos').on('value', snap => {
    const tbody = document.getElementById('listaGastos');
    if (!tbody) return;
    const items = [];
    snap.forEach(child => items.unshift({ ...child.val(), key: child.key }));
    if (items.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No hay gastos</td></tr>';
    } else {
      tbody.innerHTML = items.map(g => `<tr><td>${g.descripcion}</td><td><span class="badge badge-info">${g.categoria}</span></td><td>$${(g.monto||0).toFixed(2)}</td><td>${g.fecha}</td><td><button class="btn-delete" onclick="eliminarRegistro('gastos','${g.key}')">Eliminar</button></td></tr>`).join('');
    }
  });
}

// ===== PRODUCTOS MODULE =====
function renderProductos(area) {
  area.innerHTML = `
    <div class="card mb-4">
      <div class="card-header"><div class="card-title">Nuevo Producto</div></div>
      <div class="card-body">
        <div class="form-row">
          <div class="form-group"><label>Nombre</label><input type="text" id="prodNombre" placeholder="Nombre del producto"></div>
          <div class="form-group"><label>Precio</label><input type="number" id="prodPrecio" step="0.01"></div>
          <div class="form-group"><label>Stock</label><input type="number" id="prodStock" value="0"></div>
          <div class="form-group"><label>Stock Mínimo</label><input type="number" id="prodStockMin" value="5"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Categoría</label><input type="text" id="prodCategoria" placeholder="Ej: Electrónicos"></div>
        </div>
        <button class="btn-save" onclick="guardarProducto()">Guardar Producto</button>
      </div>
    </div>
    <div class="card">
      <div class="card-header"><div class="card-title">Inventario</div></div>
      <div class="card-body"><table><thead><tr><th>Nombre</th><th>Precio</th><th>Stock</th><th>Categoría</th><th>Acciones</th></tr></thead><tbody id="listaProductos"><tr><td colspan="5" class="empty-state">Cargando...</td></tr></tbody></table></div>
    </div>`;
  loadProductos();
}

function guardarProducto() {
  const nombre = document.getElementById('prodNombre').value.trim();
  const precio = parseFloat(document.getElementById('prodPrecio').value) || 0;
  const stock = parseInt(document.getElementById('prodStock').value) || 0;
  const stockMin = parseInt(document.getElementById('prodStockMin').value) || 5;
  const cat = document.getElementById('prodCategoria').value.trim();
  if (!nombre || precio <= 0) return showToast('Completa nombre y precio', 'error');

  // Check plan limits
  if (userPlan === 'gratuito') {
    db.ref('usuarios/' + currentUser.uid + '/productos').once('value').then(snap => {
      if (snap.numChildren() >= 50) {
        showToast('Límite de 50 productos en plan gratuito. Actualiza tu plan.', 'error');
        return;
      }
      saveProduct();
    });
  } else {
    saveProduct();
  }

  function saveProduct() {
    db.ref('usuarios/' + currentUser.uid + '/productos').push({
      nombre, precio, stock, stockMinimo: stockMin, categoria: cat || 'General',
      fechaCreacion: new Date().toISOString().split('T')[0]
    }).then(() => {
      showToast('Producto guardado', 'success');
      ['prodNombre','prodPrecio','prodStock','prodCategoria'].forEach(id => { const el = document.getElementById(id); if(el) el.value = ''; });
      document.getElementById('prodStockMin').value = '5';
    });
  }
}

function loadProductos() {
  db.ref('usuarios/' + currentUser.uid + '/productos').on('value', snap => {
    const tbody = document.getElementById('listaProductos');
    if (!tbody) return;
    const items = [];
    snap.forEach(child => items.push({ ...child.val(), key: child.key }));
    if (items.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No hay productos</td></tr>';
    } else {
      tbody.innerHTML = items.map(p => {
        const stockClass = (p.stock||0) <= (p.stockMinimo||5) ? 'badge-danger' : 'badge-success';
        return `<tr><td>${p.nombre}</td><td>$${(p.precio||0).toFixed(2)}</td><td><span class="badge ${stockClass}">${p.stock||0}</span></td><td>${p.categoria||''}</td><td><button class="btn-delete" onclick="eliminarRegistro('productos','${p.key}')">Eliminar</button></td></tr>`;
      }).join('');
    }
  });
}

// ===== CLIENTES MODULE =====
function renderClientes(area) {
  area.innerHTML = `
    <div class="card mb-4">
      <div class="card-header"><div class="card-title">Nuevo Cliente</div></div>
      <div class="card-body">
        <div class="form-row">
          <div class="form-group"><label>Nombre</label><input type="text" id="cliNombre" placeholder="Nombre completo"></div>
          <div class="form-group"><label>Teléfono</label><input type="text" id="cliTelefono" placeholder="Número de contacto"></div>
          <div class="form-group"><label>Email</label><input type="email" id="cliEmail" placeholder="correo@ejemplo.com"></div>
        </div>
        <button class="btn-save" onclick="guardarCliente()">Guardar Cliente</button>
      </div>
    </div>
    <div class="card">
      <div class="card-header"><div class="card-title">Lista de Clientes</div></div>
      <div class="card-body"><table><thead><tr><th>Nombre</th><th>Teléfono</th><th>Email</th><th>Acciones</th></tr></thead><tbody id="listaClientes"><tr><td colspan="4" class="empty-state">Cargando...</td></tr></tbody></table></div>
    </div>`;
  loadClientes();
}

function guardarCliente() {
  const nombre = document.getElementById('cliNombre').value.trim();
  const tel = document.getElementById('cliTelefono').value.trim();
  const email = document.getElementById('cliEmail').value.trim();
  if (!nombre) return showToast('Ingresa el nombre del cliente', 'error');
  db.ref('usuarios/' + currentUser.uid + '/clientes').push({
    nombre, telefono: tel, email, fechaRegistro: new Date().toISOString().split('T')[0]
  }).then(() => {
    showToast('Cliente guardado', 'success');
    ['cliNombre','cliTelefono','cliEmail'].forEach(id => { const el = document.getElementById(id); if(el) el.value = ''; });
  });
}

function loadClientes() {
  db.ref('usuarios/' + currentUser.uid + '/clientes').on('value', snap => {
    const tbody = document.getElementById('listaClientes');
    if (!tbody) return;
    const items = [];
    snap.forEach(child => items.push({ ...child.val(), key: child.key }));
    if (items.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="empty-state">No hay clientes</td></tr>';
    } else {
      tbody.innerHTML = items.map(c => `<tr><td>${c.nombre}</td><td>${c.telefono||'-'}</td><td>${c.email||'-'}</td><td><button class="btn-delete" onclick="eliminarRegistro('clientes','${c.key}')">Eliminar</button></td></tr>`).join('');
    }
  });
}

// ===== HISTORIAL =====
function renderHistorial(area) {
  area.innerHTML = `
    <div class="card">
      <div class="card-header"><div class="card-title">Historial de Actividad</div></div>
      <div class="card-body"><table><thead><tr><th>Tipo</th><th>Detalle</th><th>Monto</th><th>Fecha</th></tr></thead><tbody id="listaHistorial"><tr><td colspan="4" class="empty-state">Cargando...</td></tr></tbody></table></div>
    </div>`;
  loadHistorial();
}

function loadHistorial() {
  const uid = currentUser.uid;
  const items = [];
  Promise.all([
    db.ref('usuarios/' + uid + '/ventas').once('value'),
    db.ref('usuarios/' + uid + '/gastos').once('value')
  ]).then(([vSnap, gSnap]) => {
    vSnap.forEach(child => { const v = child.val(); items.push({ tipo: 'Venta', detalle: v.producto, monto: '+$' + (v.total||0).toFixed(2), fecha: v.fecha, ts: v.fecha }); });
    gSnap.forEach(child => { const g = child.val(); items.push({ tipo: 'Gasto', detalle: g.descripcion, monto: '-$' + (g.monto||0).toFixed(2), fecha: g.fecha, ts: g.fecha }); });
    items.sort((a,b) => b.ts > a.ts ? 1 : -1);
    const tbody = document.getElementById('listaHistorial');
    if (!tbody) return;
    if (items.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="empty-state">Sin actividad</td></tr>';
    } else {
      tbody.innerHTML = items.map(i => {
        const badge = i.tipo === 'Venta' ? 'badge-success' : 'badge-danger';
        return `<tr><td><span class="badge ${badge}">${i.tipo}</span></td><td>${i.detalle}</td><td>${i.monto}</td><td>${i.fecha}</td></tr>`;
      }).join('');
    }
  });
}

// ===== REPORTES =====
function renderReportes(area) {
  if (userPlan === 'gratuito') {
    area.innerHTML = `
      <div class="card">
        <div class="card-body" style="text-align:center;padding:60px 20px;">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="1.5" style="margin:0 auto 20px;display:block;"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
          <h3 style="margin-bottom:8px;">Función Premium</h3>
          <p style="color:var(--text-secondary);margin-bottom:24px;">Los reportes avanzados están disponibles en los planes de pago.</p>
          <button class="btn-save" onclick="selectPlan('mensual')" style="background:var(--accent)">Activar Plan</button>
        </div>
      </div>`;
    return;
  }
  area.innerHTML = `
    <div class="card">
      <div class="card-header"><div class="card-title">Resumen del Mes</div></div>
      <div class="card-body" id="reporteContent"><div class="empty-state">Generando reporte...</div></div>
    </div>`;
  generateReport();
}

function generateReport() {
  const uid = currentUser.uid;
  const now = new Date();
  const mes = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0');
  Promise.all([
    db.ref('usuarios/' + uid + '/ventas').once('value'),
    db.ref('usuarios/' + uid + '/gastos').once('value'),
    db.ref('usuarios/' + uid + '/productos').once('value')
  ]).then(([v, g, p]) => {
    let totalVentas = 0, numVentas = 0, totalGastos = 0, numGastos = 0, numProductos = 0;
    v.forEach(c => { const d = c.val(); if (d.fecha && d.fecha.startsWith(mes)) { totalVentas += d.total || 0; numVentas++; } });
    g.forEach(c => { const d = c.val(); if (d.fecha && d.fecha.startsWith(mes)) { totalGastos += d.monto || 0; numGastos++; } });
    p.forEach(() => numProductos++);
    const el = document.getElementById('reporteContent');
    if (el) el.innerHTML = `
      <div class="stats-grid" style="margin-bottom:0">
        <div class="stat-card"><div class="stat-info"><div class="stat-label">Total Ventas</div><div class="stat-value">$${totalVentas.toFixed(2)}</div><div style="color:var(--text-muted);font-size:13px;margin-top:4px;">${numVentas} transacciones</div></div></div>
        <div class="stat-card"><div class="stat-info"><div class="stat-label">Total Gastos</div><div class="stat-value">$${totalGastos.toFixed(2)}</div><div style="color:var(--text-muted);font-size:13px;margin-top:4px;">${numGastos} registros</div></div></div>
        <div class="stat-card"><div class="stat-info"><div class="stat-label">Ganancia Neta</div><div class="stat-value green">$${(totalVentas - totalGastos).toFixed(2)}</div></div></div>
        <div class="stat-card"><div class="stat-info"><div class="stat-label">Productos</div><div class="stat-value">${numProductos}</div></div></div>
      </div>`;
  });
}

// ===== HELPERS =====
function eliminarRegistro(coleccion, key) {
  if (!confirm('¿Eliminar este registro?')) return;
  db.ref('usuarios/' + currentUser.uid + '/' + coleccion + '/' + key).remove()
    .then(() => showToast('Eliminado', 'success'));
}

function toggleMobileSidebar() {
  const sb = document.getElementById('sidebar');
  const ov = document.getElementById('sidebarOverlay');
  if (sb) sb.classList.toggle('open');
  if (ov) ov.classList.toggle('active');
}

// ===== TOAST =====
function showToast(msg, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'toast ' + type;
  toast.innerHTML = `<span>${msg}</span><button class="toast-close" onclick="this.parentElement.remove()">&times;</button>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

// ===== LOADING =====
function showLoading() { const el = document.getElementById('loadingOverlay'); if (el) el.style.display = 'flex'; }
function hideLoading() { const el = document.getElementById('loadingOverlay'); if (el) el.style.display = 'none'; }

// ===== ERROR MESSAGES =====
function getErrorMsg(code) {
  const msgs = {
    'auth/user-not-found': 'Usuario no encontrado',
    'auth/wrong-password': 'Contraseña incorrecta',
    'auth/email-already-in-use': 'Este correo ya está registrado',
    'auth/weak-password': 'La contraseña es muy débil',
    'auth/invalid-email': 'Correo electrónico inválido',
    'auth/popup-closed-by-user': 'Inicio de sesión cancelado',
    'auth/invalid-credential': 'Credenciales inválidas'
  };
  return msgs[code] || 'Error: ' + code;
}
