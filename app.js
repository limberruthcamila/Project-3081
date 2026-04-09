// ===== FIREBASE CONFIG =====
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
const isAppPage = window.location.pathname.includes('app.html');

auth.onAuthStateChanged(user => {
  hideLoading();
  if (user) {
    currentUser = user;
    if (isAppPage) { initApp(); }
    else {
      db.ref('privado/'+user.uid).once('value').then(snap => {
        const d = snap.val();
        if (d && d.email === user.email) { const b = document.getElementById('adminFloatBtn'); if(b) b.style.display='block'; }
        window.location.href = 'app.html';
      }).catch(() => { window.location.href = 'app.html'; });
    }
  } else {
    currentUser = null;
    if (isAppPage) window.location.href = 'index.html';
  }
});

function toggleAuthForm() {
  document.getElementById('loginForm').classList.toggle('hidden');
  document.getElementById('registerForm').classList.toggle('hidden');
}
function loginUser() {
  const email = document.getElementById('loginEmail').value.trim();
  const pass = document.getElementById('loginPassword').value;
  if (!email||!pass) return showToast('Completa todos los campos','error');
  showLoading();
  auth.signInWithEmailAndPassword(email,pass).catch(e=>{hideLoading();showToast(getErrorMsg(e.code),'error');});
}
function registerUser() {
  const name=document.getElementById('regName').value.trim();
  const email=document.getElementById('regEmail').value.trim();
  const pass=document.getElementById('regPassword').value;
  if (!name||!email||!pass) return showToast('Completa todos los campos','error');
  if (pass.length<6) return showToast('Contraseña mínimo 6 caracteres','error');
  showLoading();
  auth.createUserWithEmailAndPassword(email,pass)
    .then(cred=>db.ref('usuarios/'+cred.user.uid+'/perfil').set({nombre:name,email,plan:'gratuito',fechaRegistro:new Date().toISOString()}))
    .catch(e=>{hideLoading();showToast(getErrorMsg(e.code),'error');});
}
function loginWithGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider();
  showLoading();
  auth.signInWithPopup(provider).then(result=>{
    if (result.additionalUserInfo&&result.additionalUserInfo.isNewUser)
      return db.ref('usuarios/'+result.user.uid+'/perfil').set({nombre:result.user.displayName||'Usuario',email:result.user.email,plan:'gratuito',fechaRegistro:new Date().toISOString()});
  }).catch(e=>{
    hideLoading();
    if (e.code==='auth/popup-blocked') showToast('Permite popups para este sitio','error');
    else if (e.code==='auth/popup-closed-by-user') showToast('Cerraste la ventana de Google','info');
    else showToast(getErrorMsg(e.code),'error');
  });
}
function logoutUser() { auth.signOut(); }

let selectedPlanType='';
function selectPlan(plan) {
  if (plan==='gratuito'){showToast('Ya estás en el plan gratuito','info');return;}
  selectedPlanType=plan;
  const desc=plan==='mensual'?'Plan Mensual - $50/mes. Contacta por WhatsApp para obtener tu código.':'Plan Mantenimiento - $250 único. Contacta por WhatsApp.';
  const el=document.getElementById('codeModalDesc'); if(el) el.textContent=desc;
  document.getElementById('codeModal').classList.add('active');
}
function closeCodeModal(){document.getElementById('codeModal').classList.remove('active');}
function activateCode() {
  const code=document.getElementById('activationCode').value.trim();
  if(!code) return showToast('Ingresa un código','error');
  if(!currentUser) return showToast('Debes iniciar sesión','error');
  db.ref('codigos/'+code).once('value').then(snap=>{
    const data=snap.val();
    if(!data) return showToast('Código inválido','error');
    if(data.usado) return showToast('Este código ya fue utilizado','error');
    const updates={};
    updates['codigos/'+code+'/usado']=true;
    updates['codigos/'+code+'/usadoPor']=currentUser.uid;
    updates['codigos/'+code+'/fechaUso']=new Date().toISOString();
    updates['usuarios/'+currentUser.uid+'/perfil/plan']=data.tipo;
    db.ref().update(updates).then(()=>{userPlan=data.tipo;showToast('¡Plan activado!','success');closeCodeModal();if(isAppPage)updatePlanDisplay();});
  });
}

function initApp(){setCurrentDate();loadUserProfile();checkIfAdmin();showModule('dashboard');}
function setCurrentDate(){const el=document.getElementById('currentDate');if(el){const o={weekday:'long',year:'numeric',month:'long',day:'numeric'};el.textContent=new Date().toLocaleDateString('es-ES',o);}}
function checkIfAdmin(){
  const fc={apiKey:"AIzaSyBFu8Jrd2YrBTMuikiuCnOj7dyHMugHx-0",authDomain:"limber-rcl-3081.firebaseapp.com",projectId:"limber-rcl-3081",storageBucket:"limber-rcl-3081.firebasestorage.app",messagingSenderId:"258409264111",appId:"1:258409264111:web:08fa48d8bb10ab83c07c1a"};
  const fa=firebase.apps.find(a=>a.name==='adminCheck')||firebase.initializeApp(fc,'adminCheck');
  const fs=fa.firestore();
  fs.collection('privado').doc(currentUser.uid).get().then(doc=>{
    if(doc.exists) showAdminBtn();
    else return fs.collection('privado').where('email','==',currentUser.email).get().then(q=>{if(!q.empty)showAdminBtn();});
  }).catch(e=>console.log('Admin check:',e.message));
}
function showAdminBtn(){
  const footer=document.querySelector('.sidebar-footer');
  if(footer&&!document.getElementById('adminBtn')){
    const btn=document.createElement('button');
    btn.id='adminBtn';btn.className='nav-item';btn.style.cssText='color:#f59e0b;margin-bottom:6px;';
    btn.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> Panel Admin';
    btn.onclick=()=>window.location.href='admin.html';
    footer.insertBefore(btn,footer.firstChild);
  }
}
function loadUserProfile(){
  db.ref('usuarios/'+currentUser.uid+'/perfil').on('value',snap=>{
    const d=snap.val()||{};
    const ne=document.getElementById('userName');const ae=document.getElementById('userAvatar');const pe=document.getElementById('userPlan');
    if(ne) ne.textContent=d.nombre||currentUser.displayName||'Usuario';
    if(ae) ae.textContent=(d.nombre||'U')[0].toUpperCase();
    userPlan=d.plan||'gratuito';
    if(pe){const pn={gratuito:'Plan Gratuito',mensual:'Plan Mensual',mantenimiento:'Plan Mantenimiento'};pe.textContent=pn[userPlan]||'Plan Gratuito';}
  });
}
function updatePlanDisplay(){loadUserProfile();}

function showModule(module,btn){
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  if(btn) btn.classList.add('active');
  else document.querySelector('[data-module="'+module+'"]')?.classList.add('active');
  const te=document.getElementById('moduleTitle');
  const titles={dashboard:'Dashboard',ventas:'Ventas',gastos:'Gastos',productos:'Productos',clientes:'Clientes',historial:'Historial',reportes:'Reportes'};
  if(te) te.textContent=titles[module]||module;
  const area=document.getElementById('contentArea');
  if(!area) return;
  switch(module){
    case 'dashboard':renderDashboard(area);break;
    case 'ventas':renderVentas(area);break;
    case 'gastos':renderGastos(area);break;
    case 'productos':renderProductos(area);break;
    case 'clientes':renderClientes(area);break;
    case 'historial':renderHistorial(area);break;
    case 'reportes':renderReportes(area);break;
  }
  document.getElementById('sidebar')?.classList.remove('open');
  document.getElementById('sidebarOverlay')?.classList.remove('active');
}

// ===== DASHBOARD =====
function renderDashboard(area){
  area.innerHTML=`
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-icon blue"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg></div><div class="stat-info"><div class="stat-label">Ventas Hoy</div><div class="stat-value" id="ventasHoy">$0.00</div></div></div>
      <div class="stat-card"><div class="stat-icon green"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg></div><div class="stat-info"><div class="stat-label">Ingresos del Mes</div><div class="stat-value" id="ingresosMes">$0.00</div></div></div>
      <div class="stat-card"><div class="stat-icon red"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg></div><div class="stat-info"><div class="stat-label">Gastos del Mes</div><div class="stat-value" id="gastosMes">$0.00</div></div></div>
      <div class="stat-card"><div class="stat-icon orange"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg></div><div class="stat-info"><div class="stat-label">Ganancia Neta</div><div class="stat-value green" id="gananciaNeta">$0.00</div></div></div>
    </div>
    <div class="content-grid">
      <div class="card"><div class="card-header"><div class="card-title"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>Últimas Ventas</div></div><div class="card-body"><table><thead><tr><th>Producto</th><th>Cant.</th><th>Total</th><th>Ganancia</th><th>Fecha</th></tr></thead><tbody id="ultimasVentas"><tr><td colspan="5" class="empty-state">Sin ventas</td></tr></tbody></table></div></div>
      <div class="card"><div class="card-header"><div class="card-title"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>Stock Bajo</div></div><div class="card-body" id="stockBajo"><div class="empty-state"><em>Inventario OK ✓</em></div></div></div>
    </div>`;
  loadDashboardData();
}
function loadDashboardData(){
  const uid=currentUser.uid;const now=new Date();
  const mes=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0');
  const hoy=now.toISOString().split('T')[0];
  db.ref('usuarios/'+uid+'/ventas').on('value',snap=>{
    let vh=0,im=0;const ul=[];
    snap.forEach(child=>{const v=child.val();if(v.fecha===hoy)vh+=(v.total||0);if(v.fecha&&v.fecha.startsWith(mes))im+=(v.total||0);ul.unshift({...v,key:child.key});});
    const vhE=document.getElementById('ventasHoy');const imE=document.getElementById('ingresosMes');
    if(vhE)vhE.textContent='$'+vh.toFixed(2);if(imE)imE.textContent='$'+im.toFixed(2);
    const tb=document.getElementById('ultimasVentas');
    if(tb){if(ul.length===0)tb.innerHTML='<tr><td colspan="5" class="empty-state">Sin ventas</td></tr>';
    else tb.innerHTML=ul.slice(0,5).map(v=>`<tr><td>${v.producto||''}</td><td>${v.cantidad||0}</td><td style="color:var(--primary);font-weight:700;">$${(v.total||0).toFixed(2)}</td><td style="color:var(--success);font-weight:700;">$${(v.ganancia||0).toFixed(2)}</td><td>${v.fecha||''}</td></tr>`).join('');}
    db.ref('usuarios/'+uid+'/gastos').on('value',gSnap=>{
      let gm=0;gSnap.forEach(child=>{const g=child.val();if(g.fecha&&g.fecha.startsWith(mes))gm+=(g.monto||0);});
      const gmE=document.getElementById('gastosMes');const gnE=document.getElementById('gananciaNeta');
      if(gmE)gmE.textContent='$'+gm.toFixed(2);if(gnE)gnE.textContent='$'+(im-gm).toFixed(2);
    });
  });
  db.ref('usuarios/'+uid+'/productos').on('value',snap=>{
    const bajo=[];snap.forEach(child=>{const p=child.val();if((p.stock||0)<=(p.stockMinimo||5))bajo.push(p);});
    const sb=document.getElementById('stockBajo');
    if(sb){if(bajo.length===0)sb.innerHTML='<div class="empty-state"><em>Inventario OK ✓</em></div>';
    else sb.innerHTML=bajo.map(p=>`<div style="display:flex;align-items:center;justify-content:space-between;padding:9px 0;border-bottom:1px solid var(--border-light);font-size:13px;"><span>${p.nombre}</span><span class="badge badge-danger">Stock: ${p.stock||0}</span></div>`).join('');}
  });
}

// ===== VENTAS =====
function renderVentas(area){
  area.innerHTML=`
    <div class="card mb-4">
      <div class="card-header"><div class="card-title">Nueva Venta</div></div>
      <div class="card-body">
        <div class="form-row">
          <div class="form-group"><label>Producto</label><select id="ventaProducto"><option value="">Seleccionar...</option></select></div>
          <div class="form-group"><label>Cantidad</label><input type="number" id="ventaCantidad" value="1" min="1"></div>
          <div class="form-group"><label>Precio Unitario de Venta</label><input type="number" id="ventaPrecio" step="0.01" placeholder="0.00"></div>
          <div class="form-group"><label>Cliente (opcional)</label><select id="ventaCliente"><option value="">Sin cliente</option></select></div>
        </div>
        <div id="ventaResumen" style="display:none;background:rgba(99,102,241,0.07);border-radius:var(--radius-sm);padding:14px 18px;margin-bottom:16px;"></div>
        <button class="btn-save" onclick="guardarVenta()">Registrar Venta</button>
      </div>
    </div>
    <div class="card">
      <div class="card-header"><div class="card-title">Ventas Registradas</div></div>
      <div class="card-body"><table><thead><tr><th>Producto</th><th>Cant.</th><th>P.Unitario</th><th>Ingreso</th><th>Ganancia</th><th>Cliente</th><th>Fecha</th><th></th></tr></thead><tbody id="listaVentas"><tr><td colspan="8" class="empty-state">Cargando...</td></tr></tbody></table></div>
    </div>`;
  loadProductosParaVenta();loadClientesParaVenta();loadVentas();
}
function loadProductosParaVenta(){
  db.ref('usuarios/'+currentUser.uid+'/productos').once('value').then(snap=>{
    const sel=document.getElementById('ventaProducto');if(!sel)return;
    sel.innerHTML='<option value="">Seleccionar...</option>';
    snap.forEach(child=>{const p=child.val();const o=document.createElement('option');o.value=child.key;o.textContent=p.nombre;o.dataset.precio=p.precioVenta||p.precio||0;o.dataset.costo=p.precioCompra||0;sel.appendChild(o);});
    sel.onchange=()=>{const o=sel.options[sel.selectedIndex];const pi=document.getElementById('ventaPrecio');if(pi&&o.dataset.precio)pi.value=o.dataset.precio;calcResumenVenta();};
    document.getElementById('ventaCantidad')?.addEventListener('input',calcResumenVenta);
    document.getElementById('ventaPrecio')?.addEventListener('input',calcResumenVenta);
  });
}
function loadClientesParaVenta(){
  db.ref('usuarios/'+currentUser.uid+'/clientes').once('value').then(snap=>{
    const sel=document.getElementById('ventaCliente');if(!sel)return;
    sel.innerHTML='<option value="">Sin cliente</option>';
    snap.forEach(child=>{const c=child.val();const o=document.createElement('option');o.value=child.key;o.textContent=c.nombre;sel.appendChild(o);});
  });
}
function calcResumenVenta(){
  const sel=document.getElementById('ventaProducto');const cant=parseFloat(document.getElementById('ventaCantidad')?.value)||0;
  const precio=parseFloat(document.getElementById('ventaPrecio')?.value)||0;
  const o=sel?.options[sel.selectedIndex];const costo=parseFloat(o?.dataset?.costo||0);
  const re=document.getElementById('ventaResumen');if(!re)return;
  if(cant>0&&precio>0){
    const ingreso=cant*precio;const ganancia=ingreso-(cant*costo);
    re.style.display='block';
    re.innerHTML=`<div style="display:flex;gap:22px;flex-wrap:wrap;align-items:center;">
      <div><span style="font-size:11px;color:var(--text-muted);font-weight:800;text-transform:uppercase;letter-spacing:0.5px;">Ingreso Total</span><div style="font-size:20px;font-weight:800;color:var(--primary);">$${ingreso.toFixed(2)}</div></div>
      ${costo>0?`<div><span style="font-size:11px;color:var(--text-muted);font-weight:800;text-transform:uppercase;letter-spacing:0.5px;">Costo Total</span><div style="font-size:20px;font-weight:800;color:var(--danger);">$${(cant*costo).toFixed(2)}</div></div>
      <div><span style="font-size:11px;color:var(--text-muted);font-weight:800;text-transform:uppercase;letter-spacing:0.5px;">Ganancia Neta</span><div style="font-size:20px;font-weight:800;color:var(--success);">$${ganancia.toFixed(2)}</div></div>`:''}
    </div>`;
  }else{re.style.display='none';}
}
function guardarVenta(){
  const sel=document.getElementById('ventaProducto');const prodKey=sel.value;
  const prodName=sel.options[sel.selectedIndex].textContent;
  const cant=parseInt(document.getElementById('ventaCantidad').value)||0;
  const precio=parseFloat(document.getElementById('ventaPrecio').value)||0;
  const o=sel.options[sel.selectedIndex];const costo=parseFloat(o?.dataset?.costo||0);
  const cliSel=document.getElementById('ventaCliente');const clienteId=cliSel?.value||'';
  const clienteNombre=clienteId?cliSel.options[cliSel.selectedIndex].textContent:'';
  if(!prodKey||cant<=0||precio<=0)return showToast('Completa todos los campos','error');
  const ingreso=cant*precio;const ganancia=ingreso-(cant*costo);
  db.ref('usuarios/'+currentUser.uid+'/ventas').push({
    producto:prodName,productoId:prodKey,cantidad:cant,precio,total:ingreso,
    precioCompra:costo,ganancia,clienteId,clienteNombre,
    fecha:new Date().toISOString().split('T')[0],hora:new Date().toLocaleTimeString('es-ES')
  }).then(()=>{
    db.ref('usuarios/'+currentUser.uid+'/productos/'+prodKey+'/stock').transaction(c=>(c||0)-cant);
    showToast('Venta registrada','success');
    document.getElementById('ventaCantidad').value=1;document.getElementById('ventaPrecio').value='';sel.value='';document.getElementById('ventaResumen').style.display='none';
  });
}
function loadVentas(){
  db.ref('usuarios/'+currentUser.uid+'/ventas').orderByChild('fecha').on('value',snap=>{
    const tb=document.getElementById('listaVentas');if(!tb)return;
    const v=[];snap.forEach(child=>v.unshift({...child.val(),key:child.key}));
    if(v.length===0)tb.innerHTML='<tr><td colspan="8" class="empty-state">Sin ventas</td></tr>';
    else tb.innerHTML=v.map(x=>`<tr><td>${x.producto}</td><td>${x.cantidad}</td><td>$${(x.precio||0).toFixed(2)}</td><td style="color:var(--primary);font-weight:700;">$${(x.total||0).toFixed(2)}</td><td style="color:var(--success);font-weight:700;">$${(x.ganancia||0).toFixed(2)}</td><td>${x.clienteNombre||'-'}</td><td>${x.fecha}</td><td><button class="btn-delete" onclick="eliminarRegistro('ventas','${x.key}')">✕</button></td></tr>`).join('');
  });
}

// ===== GASTOS =====
function renderGastos(area){
  area.innerHTML=`
    <div class="card mb-4"><div class="card-header"><div class="card-title">Nuevo Gasto</div></div><div class="card-body">
      <div class="form-row">
        <div class="form-group"><label>Descripción</label><input type="text" id="gastoDesc" placeholder="Ej: Compra de suministros"></div>
        <div class="form-group"><label>Categoría</label><select id="gastoCat"><option>Operativo</option><option>Suministros</option><option>Servicios</option><option>Personal</option><option>Otro</option></select></div>
        <div class="form-group"><label>Monto</label><input type="number" id="gastoMonto" step="0.01"></div>
      </div>
      <button class="btn-save" onclick="guardarGasto()">Registrar Gasto</button>
    </div></div>
    <div class="card"><div class="card-header"><div class="card-title">Gastos Registrados</div></div><div class="card-body"><table><thead><tr><th>Descripción</th><th>Categoría</th><th>Monto</th><th>Fecha</th><th></th></tr></thead><tbody id="listaGastos"><tr><td colspan="5" class="empty-state">Cargando...</td></tr></tbody></table></div></div>`;
  loadGastos();
}
function guardarGasto(){
  const desc=document.getElementById('gastoDesc').value.trim();const cat=document.getElementById('gastoCat').value;const monto=parseFloat(document.getElementById('gastoMonto').value)||0;
  if(!desc||monto<=0)return showToast('Completa todos los campos','error');
  db.ref('usuarios/'+currentUser.uid+'/gastos').push({descripcion:desc,categoria:cat,monto,fecha:new Date().toISOString().split('T')[0]})
    .then(()=>{showToast('Gasto registrado','success');document.getElementById('gastoDesc').value='';document.getElementById('gastoMonto').value='';});
}
function loadGastos(){
  db.ref('usuarios/'+currentUser.uid+'/gastos').on('value',snap=>{
    const tb=document.getElementById('listaGastos');if(!tb)return;
    const it=[];snap.forEach(child=>it.unshift({...child.val(),key:child.key}));
    if(it.length===0)tb.innerHTML='<tr><td colspan="5" class="empty-state">Sin gastos</td></tr>';
    else tb.innerHTML=it.map(g=>`<tr><td>${g.descripcion}</td><td><span class="badge badge-info">${g.categoria}</span></td><td style="color:var(--danger);font-weight:700;">$${(g.monto||0).toFixed(2)}</td><td>${g.fecha}</td><td><button class="btn-delete" onclick="eliminarRegistro('gastos','${g.key}')">✕</button></td></tr>`).join('');
  });
}

// ===== PRODUCTOS =====
function renderProductos(area){
  area.innerHTML=`
    <div class="card mb-4"><div class="card-header"><div class="card-title">Nuevo Producto</div></div><div class="card-body">
      <div class="form-row">
        <div class="form-group"><label>Nombre</label><input type="text" id="prodNombre" placeholder="Nombre del producto"></div>
        <div class="form-group"><label>Precio de Compra</label><input type="number" id="prodPrecioCompra" step="0.01" placeholder="0.00" oninput="calcGananciaProducto()"></div>
        <div class="form-group"><label>Precio de Venta</label><input type="number" id="prodPrecioVenta" step="0.01" placeholder="0.00" oninput="calcGananciaProducto()"></div>
        <div class="form-group"><label>Stock Inicial</label><input type="number" id="prodStock" value="0"></div>
        <div class="form-group"><label>Stock Mínimo</label><input type="number" id="prodStockMin" value="5"></div>
        <div class="form-group"><label>Categoría</label><input type="text" id="prodCategoria" placeholder="Ej: Electrónicos"></div>
      </div>
      <div id="gananciaProducto" style="display:none;background:rgba(16,185,129,0.08);border-radius:var(--radius-sm);padding:12px 16px;margin-bottom:14px;"></div>
      <button class="btn-save" onclick="guardarProducto()">Guardar Producto</button>
    </div></div>
    <div class="card"><div class="card-header"><div class="card-title">Inventario</div></div><div class="card-body"><table><thead><tr><th>Nombre</th><th>P.Compra</th><th>P.Venta</th><th>Ganancia/u</th><th>Margen</th><th>Stock</th><th>Mín.</th><th>Categoría</th><th></th></tr></thead><tbody id="listaProductos"><tr><td colspan="9" class="empty-state">Cargando...</td></tr></tbody></table></div></div>`;
  loadProductos();
}
function calcGananciaProducto(){
  const c=parseFloat(document.getElementById('prodPrecioCompra')?.value)||0;
  const v=parseFloat(document.getElementById('prodPrecioVenta')?.value)||0;
  const el=document.getElementById('gananciaProducto');if(!el)return;
  if(c>0&&v>0){
    const g=v-c;const m=((g/c)*100).toFixed(1);
    el.style.display='block';
    el.innerHTML=`<div style="display:flex;gap:22px;flex-wrap:wrap;"><div><span style="font-size:11px;color:var(--text-muted);font-weight:800;text-transform:uppercase;">Ganancia por unidad</span><div style="font-size:20px;font-weight:800;color:${g>=0?'var(--success)':'var(--danger)'};">$${g.toFixed(2)}</div></div><div><span style="font-size:11px;color:var(--text-muted);font-weight:800;text-transform:uppercase;">Margen de ganancia</span><div style="font-size:20px;font-weight:800;color:${g>=0?'var(--success)':'var(--danger)'};">${m}%</div></div></div>`;
  }else{el.style.display='none';}
}
function guardarProducto(){
  const nombre=document.getElementById('prodNombre').value.trim();
  const pC=parseFloat(document.getElementById('prodPrecioCompra').value)||0;
  const pV=parseFloat(document.getElementById('prodPrecioVenta').value)||0;
  const stock=parseInt(document.getElementById('prodStock').value)||0;
  const stockMin=parseInt(document.getElementById('prodStockMin').value)||5;
  const cat=document.getElementById('prodCategoria').value.trim();
  if(!nombre||pV<=0)return showToast('Completa nombre y precio de venta','error');
  const save=()=>db.ref('usuarios/'+currentUser.uid+'/productos').push({
    nombre,precioCompra:pC,precioVenta:pV,precio:pV,gananciaUnidad:pV-pC,
    stock,stockMinimo:stockMin,categoria:cat||'General',fechaCreacion:new Date().toISOString().split('T')[0]
  }).then(()=>{
    showToast('Producto guardado','success');
    ['prodNombre','prodPrecioCompra','prodPrecioVenta','prodCategoria'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});
    document.getElementById('prodStock').value='0';document.getElementById('prodStockMin').value='5';document.getElementById('gananciaProducto').style.display='none';
  });
  if(userPlan==='gratuito'){
    db.ref('usuarios/'+currentUser.uid+'/productos').once('value').then(snap=>{if(snap.numChildren()>=50){showToast('Límite de 50 productos en plan gratuito','error');return;}save();});
  }else{save();}
}
function loadProductos(){
  db.ref('usuarios/'+currentUser.uid+'/productos').on('value',snap=>{
    const tb=document.getElementById('listaProductos');if(!tb)return;
    const it=[];snap.forEach(child=>it.push({...child.val(),key:child.key}));
    if(it.length===0)tb.innerHTML='<tr><td colspan="9" class="empty-state">Sin productos</td></tr>';
    else tb.innerHTML=it.map(p=>{
      const pV=p.precioVenta||p.precio||0;const pC=p.precioCompra||0;const g=pV-pC;const m=pC>0?((g/pC)*100).toFixed(1):'-';
      const sc=(p.stock||0)<=(p.stockMinimo||5)?'badge-danger':'badge-success';
      return `<tr><td><strong>${p.nombre}</strong></td><td>$${pC.toFixed(2)}</td><td>$${pV.toFixed(2)}</td><td style="color:${g>=0?'var(--success)':'var(--danger)'};font-weight:700;">$${g.toFixed(2)}</td><td style="color:${g>=0?'var(--success)':'var(--danger)'};">${m!=='-'?m+'%':'-'}</td><td><span class="badge ${sc}">${p.stock||0}</span></td><td>${p.stockMinimo||5}</td><td>${p.categoria||''}</td><td><button class="btn-delete" onclick="eliminarRegistro('productos','${p.key}')">✕</button></td></tr>`;
    }).join('');
  });
}

// ===== CLIENTES =====
function renderClientes(area){
  area.innerHTML=`
    <div class="card mb-4"><div class="card-header"><div class="card-title">Nuevo Cliente</div></div><div class="card-body">
      <div class="form-row">
        <div class="form-group"><label>Nombre</label><input type="text" id="cliNombre" placeholder="Nombre completo"></div>
        <div class="form-group"><label>Teléfono</label><input type="text" id="cliTelefono" placeholder="Número"></div>
        <div class="form-group"><label>Email</label><input type="email" id="cliEmail" placeholder="correo@ejemplo.com"></div>
      </div>
      <button class="btn-save" onclick="guardarCliente()">Guardar Cliente</button>
    </div></div>
    <div class="content-grid" style="grid-template-columns:1fr 1fr;margin-bottom:16px;">
      <div class="card" style="margin-bottom:0;"><div class="card-header"><div class="card-title">🏆 Cliente que más Compra</div></div><div class="card-body" id="topCliente"><div class="empty-state">Calculando...</div></div></div>
      <div class="card" style="margin-bottom:0;"><div class="card-header"><div class="card-title">📦 Producto más Vendido</div></div><div class="card-body" id="topProducto"><div class="empty-state">Calculando...</div></div></div>
    </div>
    <div class="card"><div class="card-header"><div class="card-title">Clientes Registrados</div></div><div class="card-body"><table><thead><tr><th>Nombre</th><th>Teléfono</th><th>Email</th><th>Registro</th><th>Compras</th><th>Total Gastado</th><th></th></tr></thead><tbody id="listaClientes"><tr><td colspan="7" class="empty-state">Cargando...</td></tr></tbody></table></div></div>`;
  loadClientes();loadTopCliente();loadTopProducto();
}
function guardarCliente(){
  const n=document.getElementById('cliNombre').value.trim();const t=document.getElementById('cliTelefono').value.trim();const e=document.getElementById('cliEmail').value.trim();
  if(!n)return showToast('Ingresa el nombre','error');
  db.ref('usuarios/'+currentUser.uid+'/clientes').push({nombre:n,telefono:t,email:e,fechaRegistro:new Date().toISOString().split('T')[0]})
    .then(()=>{showToast('Cliente guardado','success');['cliNombre','cliTelefono','cliEmail'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});});
}
function loadClientes(){
  const uid=currentUser.uid;
  db.ref('usuarios/'+uid+'/clientes').on('value',cSnap=>{
    db.ref('usuarios/'+uid+'/ventas').once('value').then(vSnap=>{
      const cpc={};
      vSnap.forEach(child=>{const v=child.val();if(v.clienteId){if(!cpc[v.clienteId])cpc[v.clienteId]={cantidad:0,total:0};cpc[v.clienteId].cantidad++;cpc[v.clienteId].total+=(v.total||0);}});
      const tb=document.getElementById('listaClientes');if(!tb)return;
      const it=[];cSnap.forEach(child=>it.push({...child.val(),key:child.key}));
      if(it.length===0)tb.innerHTML='<tr><td colspan="7" class="empty-state">Sin clientes</td></tr>';
      else tb.innerHTML=it.map(c=>{
        const s=cpc[c.key]||{cantidad:0,total:0};
        return `<tr><td><strong>${c.nombre}</strong></td><td>${c.telefono||'-'}</td><td>${c.email||'-'}</td><td>${c.fechaRegistro||'-'}</td><td><span class="badge badge-info">${s.cantidad}</span></td><td style="color:var(--primary);font-weight:700;">$${s.total.toFixed(2)}</td><td><button class="btn-delete" onclick="eliminarRegistro('clientes','${c.key}')">✕</button></td></tr>`;
      }).join('');
    });
  });
}
function loadTopCliente(){
  db.ref('usuarios/'+currentUser.uid+'/ventas').once('value').then(snap=>{
    const cpc={};
    snap.forEach(child=>{const v=child.val();if(v.clienteId&&v.clienteNombre){if(!cpc[v.clienteId])cpc[v.clienteId]={nombre:v.clienteNombre,cantidad:0,total:0};cpc[v.clienteId].cantidad++;cpc[v.clienteId].total+=(v.total||0);}});
    const el=document.getElementById('topCliente');if(!el)return;
    const lista=Object.values(cpc).sort((a,b)=>b.total-a.total);
    if(lista.length===0){el.innerHTML='<div class="empty-state">Sin datos aún</div>';return;}
    const top=lista[0];
    el.innerHTML=`<div style="text-align:center;padding:16px 0;"><div style="width:56px;height:56px;border-radius:50%;background:var(--primary-glow);color:var(--primary);display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:800;margin:0 auto 10px;">${top.nombre[0].toUpperCase()}</div><div style="font-size:18px;font-weight:800;">${top.nombre}</div><div style="color:var(--text-muted);font-size:12px;margin-top:3px;">${top.cantidad} compras · <span style="color:var(--primary);font-weight:700;">$${top.total.toFixed(2)}</span></div></div><div style="border-top:1px solid var(--border-light);padding-top:10px;">${lista.slice(0,5).map((c,i)=>`<div style="display:flex;justify-content:space-between;padding:5px 0;font-size:13px;"><span>${i+1}. ${c.nombre}</span><span style="color:var(--primary);font-weight:700;">$${c.total.toFixed(2)}</span></div>`).join('')}</div>`;
  });
}
function loadTopProducto(){
  db.ref('usuarios/'+currentUser.uid+'/ventas').once('value').then(snap=>{
    const vpp={};
    snap.forEach(child=>{const v=child.val();if(v.producto){if(!vpp[v.producto])vpp[v.producto]={nombre:v.producto,cantidad:0,ingreso:0,ganancia:0};vpp[v.producto].cantidad+=(v.cantidad||1);vpp[v.producto].ingreso+=(v.total||0);vpp[v.producto].ganancia+=(v.ganancia||0);}});
    const el=document.getElementById('topProducto');if(!el)return;
    const lista=Object.values(vpp).sort((a,b)=>b.cantidad-a.cantidad);
    if(lista.length===0){el.innerHTML='<div class="empty-state">Sin datos aún</div>';return;}
    const top=lista[0];
    el.innerHTML=`<div style="text-align:center;padding:16px 0;"><div style="width:56px;height:56px;border-radius:50%;background:rgba(16,185,129,0.12);color:var(--success);display:flex;align-items:center;justify-content:center;font-size:22px;margin:0 auto 10px;">📦</div><div style="font-size:18px;font-weight:800;">${top.nombre}</div><div style="color:var(--text-muted);font-size:12px;margin-top:3px;">${top.cantidad} uds · <span style="color:var(--success);font-weight:700;">$${top.ganancia.toFixed(2)} ganancia</span></div></div><div style="border-top:1px solid var(--border-light);padding-top:10px;">${lista.slice(0,5).map((p,i)=>`<div style="display:flex;justify-content:space-between;padding:5px 0;font-size:13px;"><span>${i+1}. ${p.nombre}</span><span style="color:var(--success);font-weight:700;">${p.cantidad} uds</span></div>`).join('')}</div>`;
  });
}

// ===== HISTORIAL =====
function renderHistorial(area){
  area.innerHTML=`<div class="card"><div class="card-header"><div class="card-title">Historial de Actividad</div></div><div class="card-body"><table><thead><tr><th>Tipo</th><th>Detalle</th><th>Monto</th><th>Ganancia</th><th>Cliente</th><th>Fecha</th></tr></thead><tbody id="listaHistorial"><tr><td colspan="6" class="empty-state">Cargando...</td></tr></tbody></table></div></div>`;
  loadHistorial();
}
function loadHistorial(){
  const uid=currentUser.uid;const it=[];
  Promise.all([db.ref('usuarios/'+uid+'/ventas').once('value'),db.ref('usuarios/'+uid+'/gastos').once('value')]).then(([v,g])=>{
    v.forEach(child=>{const d=child.val();it.push({tipo:'Venta',detalle:d.producto,monto:'+$'+(d.total||0).toFixed(2),ganancia:d.ganancia?'$'+d.ganancia.toFixed(2):'-',cliente:d.clienteNombre||'-',fecha:d.fecha,ts:d.fecha});});
    g.forEach(child=>{const d=child.val();it.push({tipo:'Gasto',detalle:d.descripcion,monto:'-$'+(d.monto||0).toFixed(2),ganancia:'-',cliente:'-',fecha:d.fecha,ts:d.fecha});});
    it.sort((a,b)=>b.ts>a.ts?1:-1);
    const tb=document.getElementById('listaHistorial');if(!tb)return;
    if(it.length===0)tb.innerHTML='<tr><td colspan="6" class="empty-state">Sin actividad</td></tr>';
    else tb.innerHTML=it.map(i=>`<tr><td><span class="badge ${i.tipo==='Venta'?'badge-success':'badge-danger'}">${i.tipo}</span></td><td>${i.detalle}</td><td>${i.monto}</td><td style="color:var(--success);">${i.ganancia}</td><td>${i.cliente}</td><td>${i.fecha}</td></tr>`).join('');
  });
}

// ===== REPORTES =====
function renderReportes(area){
  if(userPlan==='gratuito'){
    area.innerHTML=`<div class="card"><div class="card-body" style="text-align:center;padding:60px 20px;"><svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="1.5" style="margin:0 auto 20px;display:block;"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg><h3 style="margin-bottom:8px;">Función Premium</h3><p style="color:var(--text-secondary);margin-bottom:24px;">Los reportes avanzados están disponibles en los planes de pago.</p><button class="btn-save" onclick="selectPlan('mensual')">Activar Plan</button></div></div>`;
    return;
  }
  area.innerHTML=`<div id="reporteContent"><div class="empty-state">Generando reporte...</div></div>`;
  generateReport();
}
function generateReport(){
  const uid=currentUser.uid;const now=new Date();
  const mes=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0');
  Promise.all([db.ref('usuarios/'+uid+'/ventas').once('value'),db.ref('usuarios/'+uid+'/gastos').once('value'),db.ref('usuarios/'+uid+'/productos').once('value'),db.ref('usuarios/'+uid+'/clientes').once('value')]).then(([v,g,p,c])=>{
    let tv=0,nv=0,tg=0,ng=0,tgan=0;const vpm={},gpp={};
    v.forEach(ch=>{const d=ch.val();const ing=d.total||0;const gan=d.ganancia||0;
      if(d.fecha&&d.fecha.startsWith(mes)){tv+=ing;tgan+=gan;nv++;}
      if(d.fecha){const m=d.fecha.substring(0,7);vpm[m]=(vpm[m]||0)+ing;}
      if(d.producto){if(!gpp[d.producto])gpp[d.producto]={ingreso:0,ganancia:0,cantidad:0};gpp[d.producto].ingreso+=ing;gpp[d.producto].ganancia+=gan;gpp[d.producto].cantidad+=(d.cantidad||1);}
    });
    g.forEach(ch=>{const d=ch.val();if(d.fecha&&d.fecha.startsWith(mes)){tg+=(d.monto||0);ng++;}});
    let np=0,nbl=0,nc=0;
    p.forEach(ch=>{np++;const d=ch.val();if((d.stock||0)<=(d.stockMinimo||5))nbl++;});
    c.forEach(()=>nc++);
    const gn=tv-tg;
    const u6m=[];
    for(let i=5;i>=0;i--){const d=new Date(now.getFullYear(),now.getMonth()-i,1);const k=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');const mn=['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];u6m.push({k,label:mn[d.getMonth()],v:vpm[k]||0});}
    const maxV=Math.max(...u6m.map(m=>m.v),1);
    const topP=Object.entries(gpp).sort((a,b)=>b[1].ganancia-a[1].ganancia).slice(0,5);
    const el=document.getElementById('reporteContent');if(!el)return;
    el.innerHTML=`
      <div class="stats-grid" style="margin-bottom:20px;">
        <div class="stat-card"><div class="stat-icon blue"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg></div><div class="stat-info"><div class="stat-label">Ingresos del Mes</div><div class="stat-value">$${tv.toFixed(2)}</div><div style="color:var(--text-muted);font-size:11px;margin-top:2px;">${nv} ventas</div></div></div>
        <div class="stat-card"><div class="stat-icon green"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/></svg></div><div class="stat-info"><div class="stat-label">Ganancia Neta del Mes</div><div class="stat-value ${gn>=0?'green':''}">$${gn.toFixed(2)}</div><div style="color:var(--text-muted);font-size:11px;margin-top:2px;">Ingresos - Gastos</div></div></div>
        <div class="stat-card"><div class="stat-icon red"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg></div><div class="stat-info"><div class="stat-label">Gastos del Mes</div><div class="stat-value">$${tg.toFixed(2)}</div><div style="color:var(--text-muted);font-size:11px;margin-top:2px;">${ng} registros</div></div></div>
        <div class="stat-card"><div class="stat-icon orange"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8"/></svg></div><div class="stat-info"><div class="stat-label">Ganancia Bruta Ventas</div><div class="stat-value">$${tgan.toFixed(2)}</div><div style="color:var(--text-muted);font-size:11px;margin-top:2px;">Sin gastos operativos</div></div></div>
      </div>
      <div class="content-grid" style="margin-bottom:20px;">
        <div class="card" style="margin-bottom:0;"><div class="card-header"><div class="card-title">📈 Ventas Últimos 6 Meses</div></div><div class="card-body" style="padding-bottom:22px;">
          <div style="display:flex;align-items:flex-end;gap:10px;height:150px;padding:0 4px;">
            ${u6m.map(m=>{const h=maxV>0?Math.max((m.v/maxV)*130,4):4;return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:5px;"><span style="font-size:10px;color:var(--text-muted);">${m.v>0?'$'+(m.v/1000).toFixed(1)+'k':''}</span><div style="width:100%;height:${h}px;background:linear-gradient(180deg,var(--primary),var(--primary-light));border-radius:6px 6px 0 0;transition:height 0.5s;" title="$${m.v.toFixed(2)}"></div><span style="font-size:11px;font-weight:700;color:var(--text-secondary);">${m.label}</span></div>`}).join('')}
          </div>
        </div></div>
        <div class="card" style="margin-bottom:0;"><div class="card-header"><div class="card-title">📊 Balance del Mes</div></div><div class="card-body">
          <div style="margin-bottom:14px;"><div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:5px;"><span>Ingresos</span><span style="font-weight:800;color:var(--primary);">$${tv.toFixed(2)}</span></div><div style="background:rgba(0,0,0,0.06);border-radius:8px;overflow:hidden;height:10px;"><div style="height:100%;background:var(--primary);border-radius:8px;width:100%;"></div></div></div>
          <div style="margin-bottom:14px;"><div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:5px;"><span>Gastos</span><span style="font-weight:800;color:var(--danger);">$${tg.toFixed(2)}</span></div><div style="background:rgba(0,0,0,0.06);border-radius:8px;overflow:hidden;height:10px;"><div style="height:100%;background:var(--danger);border-radius:8px;width:${tv>0?Math.min((tg/tv)*100,100):0}%;"></div></div></div>
          <div style="margin-bottom:14px;"><div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:5px;"><span>Ganancia Neta</span><span style="font-weight:800;color:${gn>=0?'var(--success)':'var(--danger)'};">$${gn.toFixed(2)}</span></div><div style="background:rgba(0,0,0,0.06);border-radius:8px;overflow:hidden;height:10px;"><div style="height:100%;background:var(--success);border-radius:8px;width:${tv>0?Math.min(Math.max((gn/tv)*100,0),100):0}%;"></div></div></div>
          <hr style="border:none;border-top:1px solid var(--border-light);margin:14px 0;">
          <div style="display:flex;justify-content:space-between;font-size:12px;padding:4px 0;"><span style="color:var(--text-muted);">Productos en inventario</span><strong>${np}</strong></div>
          <div style="display:flex;justify-content:space-between;font-size:12px;padding:4px 0;"><span style="color:var(--text-muted);">Productos stock bajo</span><strong style="color:${nbl>0?'var(--danger)':'var(--success)'};">${nbl}</strong></div>
          <div style="display:flex;justify-content:space-between;font-size:12px;padding:4px 0;"><span style="color:var(--text-muted);">Clientes registrados</span><strong>${nc}</strong></div>
        </div></div>
      </div>
      <div class="card"><div class="card-header"><div class="card-title">🏆 Productos por Rentabilidad</div></div><div class="card-body">
        ${topP.length===0?'<div class="empty-state">Sin ventas registradas</div>':`<table><thead><tr><th>#</th><th>Producto</th><th>Unidades</th><th>Ingreso Total</th><th>Ganancia Total</th></tr></thead><tbody>${topP.map(([n,d],i)=>`<tr><td><span class="badge ${i===0?'badge-paid':'badge-info'}">${i+1}</span></td><td><strong>${n}</strong></td><td>${d.cantidad}</td><td style="color:var(--primary);font-weight:700;">$${d.ingreso.toFixed(2)}</td><td style="color:var(--success);font-weight:800;">$${d.ganancia.toFixed(2)}</td></tr>`).join('')}</tbody></table>`}
      </div></div>`;
  });
}

// ===== HELPERS =====
function eliminarRegistro(col,key){if(!confirm('¿Eliminar este registro?'))return;db.ref('usuarios/'+currentUser.uid+'/'+col+'/'+key).remove().then(()=>showToast('Eliminado','success'));}
function toggleMobileSidebar(){document.getElementById('sidebar')?.classList.toggle('open');document.getElementById('sidebarOverlay')?.classList.toggle('active');}
function showToast(msg,type='info'){const c=document.getElementById('toastContainer');if(!c)return;const t=document.createElement('div');t.className='toast '+type;t.innerHTML=`<span>${msg}</span><button class="toast-close" onclick="this.parentElement.remove()">&times;</button>`;c.appendChild(t);setTimeout(()=>t.remove(),4000);}
function showLoading(){const e=document.getElementById('loadingOverlay');if(e)e.style.display='flex';}
function hideLoading(){const e=document.getElementById('loadingOverlay');if(e)e.style.display='none';}
function getErrorMsg(code){const m={'auth/user-not-found':'Usuario no encontrado','auth/wrong-password':'Contraseña incorrecta','auth/email-already-in-use':'Este correo ya está registrado','auth/weak-password':'Contraseña muy débil','auth/invalid-email':'Correo inválido','auth/popup-closed-by-user':'Login cancelado','auth/invalid-credential':'Credenciales inválidas'};return m[code]||'Error: '+code;}
