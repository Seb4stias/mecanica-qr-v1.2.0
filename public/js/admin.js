let currentUser = null;

// Función helper para normalizar rutas de imágenes
function normalizeImagePath(path) {
  if (!path) return null;
  
  // Limpiar la ruta
  let normalized = path.trim();
  
  // Quitar múltiples barras al inicio
  normalized = normalized.replace(/^\/+/, '');
  
  // Asegurar que comience con una sola barra
  normalized = '/' + normalized;
  
  // Quitar dobles barras
  normalized = normalized.replace(/\/\//g, '/');
  
  console.log('Normalizando imagen:', path, '→', normalized);
  
  return normalized;
}

// Verificar sesión al cargar
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🔄 Admin: Verificando sesión...');
  const sessionValid = await checkSession();
  if (sessionValid) {
    console.log('✅ Admin: Sesión válida, cargando solicitudes...');
    loadPendingRequests();
  }
});

// Funciones del Drawer (Menú Hamburguesa)
function toggleDrawer() {
  const drawer = document.querySelector('.drawer');
  const overlay = document.querySelector('.drawer-overlay');
  drawer.classList.toggle('open');
  overlay.classList.toggle('open');
}

function closeDrawer() {
  const drawer = document.querySelector('.drawer');
  const overlay = document.querySelector('.drawer-overlay');
  drawer.classList.remove('open');
  overlay.classList.remove('open');
}

function showTabFromDrawer(tabName) {
  // Cerrar el drawer
  closeDrawer();
  
  // Actualizar tabs del drawer
  document.querySelectorAll('.drawer-item').forEach(item => {
    item.classList.remove('active');
  });
  event.target.closest('.drawer-item').classList.add('active');
  
  // Mostrar el tab correspondiente
  showTab(tabName);
}

async function checkSession() {
  try {
    const response = await fetch('/api/auth/session');
    const data = await response.json();
    
    if (!data.success) {
      console.log('❌ No hay sesión, redirigiendo a login...');
      window.location.href = '/index.html';
      return false;
    }
    
    // Verificar que sea admin
    if (data.user.role !== 'admin_level1' && data.user.role !== 'admin_level2') {
      console.log('❌ Usuario no es admin, redirigiendo...');
      window.location.href = '/index.html';
      return false;
    }
    
    console.log('✅ Sesión válida:', data.user);
    currentUser = data.user;
    document.getElementById('userName').textContent = data.user.name;
    
    // Mostrar tab de usuarios y auditoría solo para admin_level2
    if (data.user.role === 'admin_level2') {
      document.getElementById('usersTab').style.display = 'block';
      document.getElementById('auditTab').style.display = 'block';
      const usersDrawerTab = document.getElementById('usersDrawerTab');
      const auditDrawerTab = document.getElementById('auditDrawerTab');
      if (usersDrawerTab) {
        usersDrawerTab.style.display = 'block';
      }
      if (auditDrawerTab) {
        auditDrawerTab.style.display = 'block';
      }
    }
    
    return true;
  } catch (error) {
    console.error('💥 Error verificando sesión:', error);
    window.location.href = '/index.html';
    return false;
  }
}

let html5QrCode = null;

function showTab(tabName) {
  // Ocultar todos los tabs
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.classList.remove('active');
  });
  
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  // Mostrar tab seleccionado
  document.getElementById(`${tabName}-tab`).classList.add('active');
  event.target.classList.add('active');
  
  // Cargar contenido según el tab
  switch(tabName) {
    case 'pendientes':
      loadPendingRequests();
      break;
    case 'aprobadas':
      loadApprovedRequests();
      break;
    case 'denegadas':
      loadRejectedRequests();
      break;
    case 'nueva-solicitud':
      // No necesita cargar nada, el formulario ya está en el HTML
      break;
    case 'scanner':
      loadScanner();
      break;
    case 'usuarios':
      loadUsers();
      break;
    case 'auditoria':
      loadAudit();
      break;
    case 'mi-cuenta':
      loadMyAccount();
      break;
  }
}

async function loadPendingRequests() {
  try {
    const response = await fetch('/api/admin/requests?status=pending,level1_approved,level2_approved');
    const data = await response.json();
    
    const container = document.getElementById('pendientesList');
    
    if (data.requests && data.requests.length > 0) {
      container.innerHTML = data.requests.map(req => {
        // Admin nivel 1: puede aprobar si no está aprobado nivel 1
        // Admin nivel 2: puede aprobar SIEMPRE (en cualquier momento)
        let canApprove = false;
        
        if (currentUser.role === 'admin_level1') {
          canApprove = req.level1_approved !== 1;
        } else if (currentUser.role === 'admin_level2') {
          // Nivel 2 puede aprobar si:
          // - No está aprobado nivel 1 (puede aprobar como nivel 1)
          // - O está aprobado nivel 1 pero no nivel 2 (aprobación final)
          canApprove = req.level1_approved !== 1 || (req.level1_approved === 1 && req.level2_approved !== 1);
        }
        
        console.log(`Solicitud ${req.id}: level1=${req.level1_approved}, level2=${req.level2_approved}, canApprove=${canApprove}, userRole=${currentUser.role}`);
        
        return `
          <div class="request-card" style="border: 1px solid #ddd; padding: 15px; margin-bottom: 15px; border-radius: 5px;">
            <div style="display: flex; gap: 15px; flex-wrap: wrap;">
              ${req.vehicle_photo_path || req.vehicle_id_photo_path ? `
                <div style="flex-shrink: 0; display: flex; gap: 10px; flex-wrap: wrap;">
                  ${req.vehicle_photo_path ? `
                    <div>
                      <p style="margin: 0 0 5px 0; font-size: 12px; font-weight: bold;">Foto Vehículo</p>
                      <img src="${normalizeImagePath(req.vehicle_photo_path)}" onerror="console.error('Error cargando imagen:', this.src); this.style.display='none'; this.insertAdjacentHTML('afterend', '<p style=\"color:red;font-size:11px;\">No disponible</p>')" alt="Foto del vehículo" style="width: 150px; height: 150px; object-fit: cover; border-radius: 5px; border: 1px solid #ddd;">
                    </div>
                  ` : ''}
                  ${req.vehicle_id_photo_path ? `
                    <div>
                      <p style="margin: 0 0 5px 0; font-size: 12px; font-weight: bold;">Foto Patr�n</p>
                      <img src="${normalizeImagePath(req.vehicle_id_photo_path)}" onerror="console.error('Error cargando imagen:', this.src); this.style.display='none'; this.insertAdjacentHTML('afterend', '<p style=\"color:red;font-size:11px;\">No disponible</p>')" alt="Foto Patr�n" style="width: 150px; height: 150px; object-fit: cover; border-radius: 5px; border: 1px solid #ddd;">
                    </div>
                  ` : ''}
                </div>
              ` : ''}
              <div style="flex-grow: 1;">
                <h3>${req.student_name}</h3>
                <p><strong>RUT:</strong> ${req.student_rut}</p>
                <p><strong>Patente:</strong> ${req.vehicle_plate}</p>
                <p><strong>Modelo:</strong> ${req.vehicle_model}</p>
                <p><strong>Color:</strong> ${req.vehicle_color}</p>
                <p><strong>Estado:</strong> ${getStatusBadge(req)}</p>
                ${req.level1_approved === 1 ? `
                  <p style="color: green;"><strong>✅ Aprobado Nivel 1:</strong> ${req.level1_admin_name || 'Admin'} - ${req.level1_date ? new Date(req.level1_date).toLocaleString() : 'N/A'}</p>
                ` : ''}
                ${req.level2_approved === 1 ? `
                  <p style="color: green;"><strong>✅ Aprobado Nivel 2:</strong> ${req.level2_admin_name || 'Admin'} - ${req.level2_date ? new Date(req.level2_date).toLocaleString() : 'N/A'}</p>
                ` : ''}
              </div>
            </div>
            <div style="margin-top: 10px;">
              <button class="btn btn-primary" onclick="viewRequestDetails(${req.id})">Ver Detalles</button>
              ${canApprove ? `<button class="btn btn-success" onclick="approveRequest(${req.id})">✅ Aprobar</button>` : ''}
              <button class="btn btn-danger" onclick="rejectRequest(${req.id})">❌ Rechazar</button>
              ${currentUser.role === 'admin_level2' ? `<button class="btn btn-secondary" onclick="deleteRequest(${req.id})" style="background: #6c757d;">🗑️ Eliminar</button>` : ''}
            </div>
          </div>
        `;
      }).join('');
    } else {
      container.innerHTML = '<p>No hay solicitudes pendientes</p>';
    }
  } catch (error) {
    console.error('Error cargando solicitudes:', error);
  }
}

function getStatusBadge(req) {
  if (req.status === 'approved') {
    return '<span style="color: green; font-weight: bold;">✅ Aprobada (Nivel 1 + Nivel 2)</span>';
  } else if (req.status === 'level1_approved') {
    return '<span style="color: orange; font-weight: bold;">⏳ Aprobada Nivel 1 (Falta Nivel 2)</span>';
  } else if (req.status === 'level2_approved') {
    return '<span style="color: orange; font-weight: bold;">⏳ Aprobada Nivel 2 (Falta Nivel 1)</span>';
  } else if (req.status === 'rejected') {
    return '<span style="color: red; font-weight: bold;">❌ Rechazada</span>';
  } else {
    return '<span style="color: gray; font-weight: bold;">⏳ Pendiente</span>';
  }
}

async function loadApprovedRequests() {
  try {
    const response = await fetch('/api/admin/requests?status=approved');
    const data = await response.json();
    
    const container = document.getElementById('aprobadasList');
    
    if (data.requests && data.requests.length > 0) {
      container.innerHTML = data.requests.map(req => `
        <div class="request-card" style="border: 1px solid #ddd; padding: 15px; margin-bottom: 15px; border-radius: 5px;">
          <div style="display: flex; gap: 15px; flex-wrap: wrap;">
            ${req.vehicle_photo_path || req.vehicle_id_photo_path ? `
              <div style="flex-shrink: 0; display: flex; gap: 10px; flex-wrap: wrap;">
                ${req.vehicle_photo_path ? `
                  <div>
                    <p style="margin: 0 0 5px 0; font-size: 12px; font-weight: bold;">Foto Vehículo</p>
                    <img src="${normalizeImagePath(req.vehicle_photo_path)}" onerror="console.error('Error cargando imagen:', this.src); this.style.display='none'; this.insertAdjacentHTML('afterend', '<p style=\"color:red;font-size:11px;\">No disponible</p>')" alt="Foto del vehículo" style="width: 150px; height: 150px; object-fit: cover; border-radius: 5px; border: 1px solid #ddd;">
                  </div>
                ` : ''}
                ${req.vehicle_id_photo_path ? `
                  <div>
                    <p style="margin: 0 0 5px 0; font-size: 12px; font-weight: bold;">Foto Patr�n</p>
                    <img src="${normalizeImagePath(req.vehicle_id_photo_path)}" onerror="console.error('Error cargando imagen:', this.src); this.style.display='none'; this.insertAdjacentHTML('afterend', '<p style=\"color:red;font-size:11px;\">No disponible</p>')" alt="Foto Patr�n" style="width: 150px; height: 150px; object-fit: cover; border-radius: 5px; border: 1px solid #ddd;">
                  </div>
                ` : ''}
              </div>
            ` : ''}
            <div style="flex-grow: 1;">
              <h3>${req.student_name}</h3>
              <p><strong>RUT:</strong> ${req.student_rut}</p>
              <p><strong>Patente:</strong> ${req.vehicle_plate}</p>
              <p><strong>Modelo:</strong> ${req.vehicle_model}</p>
              <p><strong>Color:</strong> ${req.vehicle_color}</p>
              <p style="color: green;"><strong>✅ Aprobado Nivel 1:</strong> ${req.level1_admin_name || 'Admin'} - ${req.level1_date ? new Date(req.level1_date).toLocaleString() : 'N/A'}</p>
              <p style="color: green;"><strong>✅ Aprobado Nivel 2:</strong> ${req.level2_admin_name || 'Admin'} - ${req.level2_date ? new Date(req.level2_date).toLocaleString() : 'N/A'}</p>
            </div>
          </div>
          <div style="margin-top: 10px;">
            <button class="btn btn-primary" onclick="viewRequestDetails(${req.id})">Ver Detalles</button>
            <button class="btn btn-success" onclick="downloadQR(${req.id})">📥 Ver QR</button>
            <button class="btn btn-success" onclick="downloadForm(${req.id})">📄 Descargar Formulario</button>
            <button class="btn btn-warning" onclick="regenerateQR(${req.id})" style="background: #ffc107; color: #000;">🔄 Regenerar QR</button>
            ${currentUser.role === 'admin_level2' ? `<button class="btn btn-secondary" onclick="deleteRequest(${req.id})" style="background: #6c757d;">🗑️ Eliminar</button>` : ''}
          </div>
        </div>
      `).join('');
    } else {
      container.innerHTML = '<p>No hay solicitudes aprobadas</p>';
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

async function loadRejectedRequests() {
  try {
    const response = await fetch('/api/admin/requests?status=rejected');
    const data = await response.json();
    
    const container = document.getElementById('denegadasList');
    
    if (data.requests && data.requests.length > 0) {
      container.innerHTML = data.requests.map(req => {
        // Determinar el nombre correcto según el nivel que rechazó
        let rejectedByName = 'Admin';
        if (req.denied_by_level === 1 && req.level1_admin_name) {
          rejectedByName = req.level1_admin_name;
        } else if (req.denied_by_level === 2 && req.level2_admin_name) {
          rejectedByName = req.level2_admin_name;
        } else if (req.rejected_by_name) {
          rejectedByName = req.rejected_by_name;
        }
        
        console.log(`Solicitud rechazada ${req.id}:`, {
          denied_by_level: req.denied_by_level,
          rejected_by_name: rejectedByName,
          level1_admin_name: req.level1_admin_name,
          level2_admin_name: req.level2_admin_name
        });
        
        return `
          <div class="request-card" style="border: 1px solid #ddd; padding: 15px; margin-bottom: 15px; border-radius: 5px;">
            <div style="display: flex; gap: 15px; flex-wrap: wrap;">
              ${req.vehicle_photo_path || req.vehicle_id_photo_path ? `
                <div style="flex-shrink: 0; display: flex; gap: 10px; flex-wrap: wrap;">
                  ${req.vehicle_photo_path ? `
                    <div>
                      <p style="margin: 0 0 5px 0; font-size: 12px; font-weight: bold;">Foto Vehículo</p>
                      <img src="${normalizeImagePath(req.vehicle_photo_path)}" onerror="console.error('Error cargando imagen:', this.src); this.style.display='none'; this.insertAdjacentHTML('afterend', '<p style=\"color:red;font-size:11px;\">No disponible</p>')" alt="Foto del vehículo" style="width: 150px; height: 150px; object-fit: cover; border-radius: 5px; border: 1px solid #ddd;">
                    </div>
                  ` : ''}
                  ${req.vehicle_id_photo_path ? `
                    <div>
                      <p style="margin: 0 0 5px 0; font-size: 12px; font-weight: bold;">Foto Patr�n</p>
                      <img src="${normalizeImagePath(req.vehicle_id_photo_path)}" onerror="console.error('Error cargando imagen:', this.src); this.style.display='none'; this.insertAdjacentHTML('afterend', '<p style=\"color:red;font-size:11px;\">No disponible</p>')" alt="Foto Patr�n" style="width: 150px; height: 150px; object-fit: cover; border-radius: 5px; border: 1px solid #ddd;">
                    </div>
                  ` : ''}
                </div>
              ` : ''}
              <div style="flex-grow: 1;">
                <h3>${req.student_name}</h3>
                <p><strong>RUT:</strong> ${req.student_rut}</p>
                <p><strong>Patente:</strong> ${req.vehicle_plate}</p>
                <p><strong>Modelo:</strong> ${req.vehicle_model}</p>
                <p><strong>Color:</strong> ${req.vehicle_color}</p>
                <p style="color: red;"><strong>❌ Rechazada por:</strong> ${rejectedByName}</p>
                <p><strong>Razón:</strong> ${req.denial_reason || 'No especificada'}</p>
              </div>
            </div>
            <div style="margin-top: 10px;">
              <button class="btn btn-primary" onclick="viewRequestDetails(${req.id})">Ver Detalles</button>
              ${currentUser.role === 'admin_level2' ? `<button class="btn btn-secondary" onclick="deleteRequest(${req.id})" style="background: #6c757d;">🗑️ Eliminar</button>` : ''}
            </div>
          </div>
        `;
      }).join('');
    } else {
      container.innerHTML = '<p>No hay solicitudes rechazadas</p>';
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

async function loadUsers() {
  try {
    const response = await fetch('/api/admin/users');
    const data = await response.json();
    
    const container = document.getElementById('userManagement');
    
    if (data.users && data.users.length > 0) {
      container.innerHTML = `
        <div style="margin-bottom: 20px; display: flex; gap: 1rem; flex-wrap: wrap; align-items: center;">
          <button class="btn btn-primary" onclick="showCreateUserForm()">Crear Nuevo Usuario</button>
          <div class="search-box" style="flex: 1; min-width: 250px;">
            <input type="text" id="userSearchInput" placeholder="🔍 Buscar por nombre o RUT..." onkeyup="filterUsers()" style="width: 100%; padding: 0.6rem; border: 1px solid #ddd; border-radius: 5px;">
          </div>
        </div>
        <div id="createUserFormContainer" style="display: none; margin-bottom: 20px; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
          <h3>Crear Nuevo Usuario</h3>
          <form id="createUserForm" onsubmit="createUser(event)">
            <div class="form-group">
              <label>Nombre</label>
              <input type="text" id="newUserName" required>
            </div>
            <div class="form-group">
              <label>RUT</label>
              <input type="text" id="newUserRut" required>
            </div>
            <div class="form-group">
              <label>Email</label>
              <input type="email" id="newUserEmail" required>
            </div>
            <div class="form-group">
              <label>Contraseña</label>
              <input type="password" id="newUserPassword" required minlength="6">
            </div>
            <div class="form-group">
              <label>Rol</label>
              <select id="newUserRole" required>
                <option value="student">1. Estudiante</option>
                <option value="scanner">2. Scanner</option>
                <option value="admin_level1">3. Admin Nivel 1</option>
                <option value="admin_level2">4. Admin Nivel 2</option>
              </select>
            </div>
            <button type="submit" class="btn btn-primary">Crear Usuario</button>
            <button type="button" class="btn btn-secondary" onclick="hideCreateUserForm()">Cancelar</button>
          </form>
          <div id="createUserMessage"></div>
        </div>
        <div class="users-list" id="usersListContainer">
              ${data.users.map(user => `
                <div class="user-card" data-user-name="${user.name.toLowerCase()}" data-user-rut="${(user.rut || '').toLowerCase()}">
                  <div class="user-card-header" onclick="toggleUserDetails(${user.id})">
                    <div class="user-card-info">
                      <strong>${user.name}</strong>
                      <span class="user-role-badge">${getRoleText(user.role)}</span>
                      <span class="user-status-badge ${user.is_active ? 'active' : 'inactive'}">${user.is_active ? '✅ Activo' : '❌ Inactivo'}</span>
                    </div>
                    <span class="toggle-icon" id="toggle-icon-${user.id}">▼</span>
                  </div>
                  <div class="user-card-details" id="user-details-${user.id}" style="display: none;">
                    <div class="user-detail-row">
                      <span class="detail-label">ID:</span>
                      <span class="detail-value">${user.id}</span>
                    </div>
                    <div class="user-detail-row">
                      <span class="detail-label">RUT:</span>
                      <span class="detail-value">${user.rut || 'No registrado'}</span>
                    </div>
                    <div class="user-detail-row">
                      <span class="detail-label">Email:</span>
                      <span class="detail-value">${user.email}</span>
                    </div>
                    <div class="user-detail-row">
                      <span class="detail-label">Fecha de Registro:</span>
                      <span class="detail-value">${new Date(user.created_at).toLocaleDateString('es-CL')}</span>
                    </div>
                    <div class="user-actions">
                      <button class="btn btn-primary btn-sm" onclick="changeUserRole(${user.id}, '${user.role}')">Cambiar Rol</button>
                      <button class="btn btn-primary btn-sm" onclick="changeUserPassword(${user.id})">Cambiar Contraseña</button>
                      <button class="btn btn-secondary btn-sm" onclick="toggleUserActive(${user.id}, ${user.is_active})">${user.is_active ? 'Desactivar' : 'Activar'}</button>
                      ${user.id !== currentUser.id ? `<button class="btn btn-danger btn-sm" onclick="deleteUser(${user.id})">Eliminar</button>` : ''}
                    </div>
                  </div>
                </div>
              `).join('')}
        </div>
      `;
    } else {
      container.innerHTML = '<p>No hay usuarios registrados</p>';
    }
  } catch (error) {
    console.error('Error cargando usuarios:', error);
    document.getElementById('userManagement').innerHTML = '<p style="color: red;">Error al cargar usuarios</p>';
  }
}

function showCreateUserForm() {
  document.getElementById('createUserFormContainer').style.display = 'block';
}

function hideCreateUserForm() {
  document.getElementById('createUserFormContainer').style.display = 'none';
  document.getElementById('createUserForm').reset();
}

async function createUser(event) {
  event.preventDefault();
  
  const name = document.getElementById('newUserName').value;
  const rut = document.getElementById('newUserRut').value;
  const email = document.getElementById('newUserEmail').value;
  const password = document.getElementById('newUserPassword').value;
  const role = document.getElementById('newUserRole').value;
  const messageDiv = document.getElementById('createUserMessage');
  
  try {
    const response = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, rut, email, password, role })
    });
    
    const data = await response.json();
    
    if (data.success) {
      messageDiv.innerHTML = '<p style="color: green;">✅ Usuario creado exitosamente</p>';
      setTimeout(() => {
        hideCreateUserForm();
        loadUsers();
      }, 1500);
    } else {
      messageDiv.innerHTML = `<p style="color: red;">❌ ${data.message}</p>`;
    }
  } catch (error) {
    console.error('Error:', error);
    messageDiv.innerHTML = '<p style="color: red;">Error de conexión</p>';
  }
}

async function loadMyAccount() {
  if (currentUser) {
    document.getElementById('myAccountContent').innerHTML = `
      <div class="account-info">
        <h3>Información de la Cuenta</h3>
        <p><strong>Nombre:</strong> ${currentUser.name}</p>
        <p><strong>Email:</strong> ${currentUser.email}</p>
        <p><strong>RUT:</strong> ${currentUser.rut || 'No configurado'}</p>
        <p><strong>Rol:</strong> ${getRoleText(currentUser.role)}</p>
        
        <hr style="margin: 20px 0;">
        
        <h3>Cambiar Contraseña</h3>
        <form id="changePasswordForm" onsubmit="changePassword(event)">
          <div class="form-group">
            <label>Contraseña Actual</label>
            <input type="password" id="currentPassword" required>
          </div>
          <div class="form-group">
            <label>Nueva Contraseña</label>
            <input type="password" id="newPassword" required minlength="6">
          </div>
          <div class="form-group">
            <label>Confirmar Nueva Contraseña</label>
            <input type="password" id="confirmPassword" required>
          </div>
          <button type="submit" class="btn btn-primary">Cambiar Contraseña</button>
        </form>
        <div id="passwordChangeMessage"></div>
      </div>
    `;
  }
}

function getRoleText(role) {
  const roles = {
    'admin_level1': 'Administrador Nivel 1',
    'admin_level2': 'Administrador Nivel 2',
    'student': 'Estudiante',
    'scanner': 'Escáner'
  };
  return roles[role] || role;
}

async function changePassword(event) {
  event.preventDefault();
  
  const currentPassword = document.getElementById('currentPassword').value;
  const newPassword = document.getElementById('newPassword').value;
  const confirmPassword = document.getElementById('confirmPassword').value;
  const messageDiv = document.getElementById('passwordChangeMessage');
  
  if (newPassword !== confirmPassword) {
    messageDiv.innerHTML = '<p style="color: red;">Las contraseñas no coinciden</p>';
    return;
  }
  
  if (newPassword.length < 6) {
    messageDiv.innerHTML = '<p style="color: red;">La contraseña debe tener al menos 6 caracteres</p>';
    return;
  }
  
  try {
    const response = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword })
    });
    
    const data = await response.json();
    
    if (data.success) {
      messageDiv.innerHTML = '<p style="color: green;">✅ Contraseña cambiada exitosamente</p>';
      document.getElementById('changePasswordForm').reset();
    } else {
      messageDiv.innerHTML = `<p style="color: red;">❌ ${data.message}</p>`;
    }
  } catch (error) {
    console.error('Error:', error);
    messageDiv.innerHTML = '<p style="color: red;">Error de conexión</p>';
  }
}

async function viewRequestDetails(id) {
  try {
    const response = await fetch(`/api/admin/requests/${id}`);
    const data = await response.json();
    
    if (data.success) {
      const req = data.request;
      const modalBody = document.getElementById('modalBody');
      
      modalBody.innerHTML = `
        <h2>Solicitud #${req.id}</h2>
        <hr>
        <h3>Datos del Estudiante</h3>
        <p><strong>Nombre:</strong> ${req.student_name}</p>
        <p><strong>RUT:</strong> ${req.student_rut}</p>
        <p><strong>Carrera:</strong> ${req.student_carrera}</p>
        <p><strong>Email:</strong> ${req.student_email}</p>
        <p><strong>Teléfono:</strong> ${req.student_phone}</p>
        
        <h3>Datos del Vehículo</h3>
        <p><strong>Patente:</strong> ${req.vehicle_plate}</p>
        <p><strong>Modelo:</strong> ${req.vehicle_model}</p>
        <p><strong>Color:</strong> ${req.vehicle_color}</p>
        <p><strong>Ubicación Garaje:</strong> ${req.garage_location || 'No especificada'}</p>
        <p><strong>Modificaciones:</strong> ${req.modifications_description || 'Ninguna'}</p>
        ${req.vehicle_photo_path ? `<p><img src="/${req.vehicle_photo_path}" style="max-width: 300px;" onerror="console.error('Error cargando imagen:', this.src); this.style.display='none'; this.insertAdjacentHTML('afterend', '<p style=\"color:red;font-size:11px;\">No disponible</p>')"></p>` : ''}
        
        <h3>Estado de Aprobación</h3>
        <p><strong>Estado:</strong> ${getStatusBadge(req)}</p>
        ${req.level1_approved ? `
          <p style="color: green;"><strong>✅ Aprobado Nivel 1 por:</strong> ${req.level1_admin_name || 'Admin ID ' + req.level1_admin_id}</p>
          <p><strong>Fecha:</strong> ${new Date(req.level1_date).toLocaleString()}</p>
          <p><strong>Comentarios:</strong> ${req.level1_comments || 'Sin comentarios'}</p>
        ` : ''}
        ${req.level2_approved ? `
          <p style="color: green;"><strong>✅ Aprobado Nivel 2 por:</strong> ${req.level2_admin_name || 'Admin ID ' + req.level2_admin_id}</p>
          <p><strong>Fecha:</strong> ${new Date(req.level2_date).toLocaleString()}</p>
          <p><strong>Comentarios:</strong> ${req.level2_comments || 'Sin comentarios'}</p>
        ` : ''}
        ${req.status === 'rejected' ? `
          <p style="color: red;"><strong>❌ Rechazada por:</strong> ${
            req.denied_by_level === 1 && req.level1_admin_name ? req.level1_admin_name :
            req.denied_by_level === 2 && req.level2_admin_name ? req.level2_admin_name :
            req.rejected_by_name || 'Admin'
          }</p>
          <p><strong>Razón:</strong> ${req.denial_reason}</p>
        ` : ''}
      `;
      
      document.getElementById('requestModal').style.display = 'block';
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Error al cargar detalles');
  }
}

async function approveRequest(id) {
  const comments = prompt('Comentarios (opcional):');
  
  try {
    const response = await fetch(`/api/admin/requests/${id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comments })
    });
    
    const data = await response.json();
    
    if (data.success) {
      alert('✅ Solicitud aprobada exitosamente');
      loadPendingRequests();
    } else {
      alert('❌ ' + data.message);
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Error al aprobar solicitud');
  }
}

async function rejectRequest(id) {
  const reason = prompt('Razón del rechazo (requerido):');
  
  if (!reason || reason.trim() === '') {
    alert('Debe proporcionar una razón para rechazar');
    return;
  }
  
  try {
    const response = await fetch(`/api/admin/requests/${id}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason })
    });
    
    const data = await response.json();
    
    if (data.success) {
      alert('❌ Solicitud rechazada');
      loadPendingRequests();
    } else {
      alert('❌ ' + data.message);
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Error al rechazar solicitud');
  }
}

async function regenerateQR(requestId) {
  if (!confirm('¿Desea regenerar el código QR y PDF para esta solicitud?')) {
    return;
  }
  
  try {
    const response = await fetch(`/api/admin/requests/${requestId}/regenerate-qr`, {
      method: 'POST'
    });
    
    const data = await response.json();
    
    if (data.success) {
      alert('✅ QR y PDF regenerados exitosamente');
      loadApprovedRequests();
    } else {
      alert('❌ ' + data.message);
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Error al regenerar QR');
  }
}

async function deleteRequest(requestId) {
  if (!confirm('¿Está seguro de que desea eliminar esta solicitud? Esta acción no se puede deshacer.')) {
    return;
  }
  
  try {
    const response = await fetch(`/api/admin/requests/${requestId}`, {
      method: 'DELETE'
    });
    
    const data = await response.json();
    
    if (data.success) {
      alert('✅ Solicitud eliminada exitosamente');
      // Recargar la lista actual
      const activeTab = document.querySelector('.tab-btn.active').textContent.toLowerCase();
      if (activeTab.includes('pendiente')) {
        loadPendingRequests();
      } else if (activeTab.includes('aprobada')) {
        loadApprovedRequests();
      } else if (activeTab.includes('denegada')) {
        loadRejectedRequests();
      }
    } else {
      alert('❌ ' + data.message);
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Error al eliminar solicitud');
  }
}

async function downloadQR(requestId) {
  try {
    // Obtener los datos de la solicitud
    const response = await fetch(`/api/admin/requests/${requestId}`);
    const data = await response.json();
    
    if (!data.success) {
      alert('Error al obtener datos de la solicitud');
      return;
    }
    
    const req = data.request;
    const qrModalBody = document.getElementById('qrModalBody');
    
    qrModalBody.innerHTML = `
      <h2>Código QR - Solicitud #${requestId}</h2>
      <hr>
      <div style="text-align: center; margin: 20px 0;">
        <p><strong>Estudiante:</strong> ${req.student_name}</p>
        <p><strong>Patente:</strong> ${req.vehicle_plate}</p>
        <p><strong>Modelo:</strong> ${req.vehicle_model}</p>
        <img src="/api/requests/${requestId}/qr" alt="Código QR" style="max-width: 400px; width: 100%; border: 2px solid #ED1C24; border-radius: 10px; padding: 10px; background: white;">
      </div>
      <div style="text-align: center; margin-top: 20px;">
        <a href="/api/requests/${requestId}/qr" download="QR-${req.vehicle_plate}.png" class="btn btn-primary">📥 Descargar QR</a>
        <a href="/api/requests/${requestId}/pdf" download="Permiso-${req.vehicle_plate}.pdf" class="btn btn-success">📄 Descargar PDF</a>
        <button onclick="closeQRModal()" class="btn btn-secondary">Cerrar</button>
      </div>
    `;
    
    document.getElementById('qrModal').style.display = 'block';
  } catch (error) {
    console.error('Error:', error);
    alert('Error al visualizar QR');
  }
}

function downloadForm(requestId) {
  window.open(`/api/requests/${requestId}/pdf`, '_blank');
}

function closeQRModal() {
  document.getElementById('qrModal').style.display = 'none';
}

function openAdminTermsModal() {
  document.getElementById('adminTermsModal').style.display = 'block';
}

function closeAdminTermsModal() {
  document.getElementById('adminTermsModal').style.display = 'none';
}

function openAdminClauseModal() {
  document.getElementById('adminClauseModal').style.display = 'block';
}

function closeAdminClauseModal() {
  document.getElementById('adminClauseModal').style.display = 'none';
}

function closeModal() {
  document.getElementById('requestModal').style.display = 'none';
}

async function logout() {
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
  } catch (error) {
    console.error('Error al cerrar sesión:', error);
  } finally {
    // Siempre redirigir al login
    window.location.href = '/';
  }
}

async function loadScanner() {
  const scanResult = document.getElementById('scanResult');
  scanResult.innerHTML = '<p>Iniciando cámara...</p>';
  
  // Detener scanner anterior si existe
  if (html5QrCode && html5QrCode.isScanning) {
    try {
      await html5QrCode.stop();
    } catch (e) {
      console.log('Scanner ya estaba detenido');
    }
  }
  
  // Crear nuevo scanner
  html5QrCode = new Html5Qrcode("reader");
  
  const config = { 
    fps: 10, 
    qrbox: { width: 250, height: 250 },
    aspectRatio: 1.0
  };
  
  try {
    await html5QrCode.start(
      { facingMode: "environment" },
      config,
      onScanSuccess,
      onScanError
    );
    scanResult.innerHTML = '<p style="color: blue;">📷 Cámara activa. Apunte al código QR...</p>';
  } catch (err) {
    console.error('Error iniciando scanner:', err);
    scanResult.innerHTML = `<p style="color: red;">❌ Error al iniciar cámara: ${err}</p>`;
  }
}

async function onScanSuccess(decodedText, decodedResult) {
  console.log('QR escaneado:', decodedText);
  
  // Detener el scanner temporalmente
  if (html5QrCode && html5QrCode.isScanning) {
    await html5QrCode.pause(true);
  }
  
  // Validar el QR
  try {
    const response = await fetch('/api/scanner/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ qrData: decodedText })
    });
    
    const data = await response.json();
    const scanResult = document.getElementById('scanResult');
    
    if (data.success && data.valid) {
      // Las fotos vienen directamente del endpoint de validación
      let vehiclePhoto = normalizeImagePath(data.data.vehiclePhotoPath);
      let vehicleIdPhoto = normalizeImagePath(data.data.vehicleIdPhotoPath);
      
      console.log('Foto del vehículo:', vehiclePhoto);
      console.log('Foto Patr�n:', vehicleIdPhoto);
      console.log('Datos completos:', data.data);
      
      scanResult.innerHTML = `
        <div style="padding: 20px; background: #d4edda; border: 2px solid #28a745; border-radius: 10px; margin-top: 20px;">
          <h2 style="color: #155724; margin-top: 0;">✅ ACCESO AUTORIZADO</h2>
          ${vehiclePhoto || vehicleIdPhoto ? `
            <div style="text-align: center; margin: 20px 0; display: flex; gap: 10px; flex-wrap: wrap; justify-content: center;">
              ${vehiclePhoto ? `
                <div style="flex: 1; min-width: 200px; max-width: 45%;">
                  <p style="font-weight: bold; margin-bottom: 5px;">Foto del Vehículo:</p>
                  <img src="${vehiclePhoto}" alt="Foto del vehículo" 
                       style="width: 100%; max-height: 300px; object-fit: cover; border-radius: 10px; border: 3px solid #28a745;" 
                       onerror="console.error('Error cargando imagen:', this.src); this.parentElement.innerHTML='<p style=\\'color: #856404;\\'>⚠️ Error al cargar</p>';">
                </div>
              ` : ''}
              ${vehicleIdPhoto ? `
                <div style="flex: 1; min-width: 200px; max-width: 45%;">
                  <p style="font-weight: bold; margin-bottom: 5px;">Foto Patr�n (ID):</p>
                  <img src="${vehicleIdPhoto}" alt="Foto Patr�n" 
                       style="width: 100%; max-height: 300px; object-fit: cover; border-radius: 10px; border: 3px solid #28a745;" 
                       onerror="console.error('Error cargando imagen:', this.src); this.parentElement.innerHTML='<p style=\\'color: #856404;\\'>⚠️ Error al cargar</p>';">
                </div>
              ` : ''}
            </div>
          ` : '<p style="color: #856404; background: #fff3cd; padding: 10px; border-radius: 5px;">⚠️ No hay fotos del vehículo disponibles</p>'}
          <div style="text-align: left; margin-top: 15px;">
            <p><strong>Estudiante:</strong> ${data.data.studentName}</p>
            <p><strong>RUT:</strong> ${data.data.studentRut}</p>
            <p><strong>Patente:</strong> ${data.data.vehiclePlate}</p>
            <p><strong>Modelo:</strong> ${data.data.vehicleModel}</p>
            <p><strong>Color:</strong> ${data.data.vehicleColor}</p>
            ${data.data.expiresAt ? `<p><strong>Válido hasta:</strong> ${new Date(data.data.expiresAt).toLocaleDateString('es-CL')}</p>` : ''}
          </div>
          <button class="btn btn-primary" onclick="resumeScanner()" style="margin-top: 15px; width: 100%;">Escanear Otro QR</button>
        </div>
      `;
    } else {
      scanResult.innerHTML = `
        <div style="padding: 20px; background: #f8d7da; border: 2px solid #dc3545; border-radius: 10px; margin-top: 20px;">
          <h2 style="color: #721c24; margin-top: 0;">❌ ACCESO DENEGADO</h2>
          <p><strong>Razón:</strong> ${data.message}</p>
          ${data.data ? `
            <p><strong>Estudiante:</strong> ${data.data.studentName || 'N/A'}</p>
            <p><strong>RUT:</strong> ${data.data.studentRut || 'N/A'}</p>
            <p><strong>Patente:</strong> ${data.data.vehiclePlate || 'N/A'}</p>
          ` : ''}
          <button class="btn btn-primary" onclick="resumeScanner()" style="margin-top: 15px;">Escanear Otro QR</button>
        </div>
      `;
    }
  } catch (error) {
    console.error('Error validando QR:', error);
    document.getElementById('scanResult').innerHTML = `
      <div style="padding: 20px; background: #f8d7da; border: 2px solid #dc3545; border-radius: 10px; margin-top: 20px;">
        <h2 style="color: #721c24; margin-top: 0;">❌ ERROR</h2>
        <p>Error al validar el código QR</p>
        <button class="btn btn-primary" onclick="resumeScanner()" style="margin-top: 15px;">Intentar de Nuevo</button>
      </div>
    `;
  }
}

function onScanError(errorMessage) {
  // Ignorar errores de escaneo (son normales cuando no hay QR visible)
}

async function resumeScanner() {
  document.getElementById('scanResult').innerHTML = '<p style="color: blue;">📷 Cámara activa. Apunte al código QR...</p>';
  if (html5QrCode) {
    await html5QrCode.resume();
  }
}






// Funciones de gestión de usuarios

async function changeUserRole(userId, currentRole) {
  const roles = {
    'student': '1. Estudiante',
    'scanner': '2. Scanner',
    'admin_level1': '3. Admin Nivel 1',
    'admin_level2': '4. Admin Nivel 2'
  };
  
  const roleMapping = {
    '1': 'student',
    '2': 'scanner',
    '3': 'admin_level1',
    '4': 'admin_level2'
  };
  
  const currentRoleNumber = Object.keys(roleMapping).find(key => roleMapping[key] === currentRole);
  
  const input = prompt(`Selecciona el nuevo rol:\n\nOpciones:\n1. Estudiante\n2. Scanner\n3. Admin Nivel 1\n4. Admin Nivel 2\n\nRol actual: ${roles[currentRole]}\n\nIngresa el número (1-4):`);
  
  if (!input) return;
  
  const newRole = roleMapping[input.trim()];
  
  if (!newRole) {
    alert('Número inválido. Debes ingresar 1, 2, 3 o 4');
    return;
  }
  
  try {
    const response = await fetch(`/api/admin/users/${userId}/role`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: newRole })
    });
    
    const data = await response.json();
    
    if (data.success) {
      alert('✅ Rol actualizado exitosamente');
      loadUsers();
    } else {
      alert('❌ ' + data.message);
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Error al cambiar rol');
  }
}

async function changeUserPassword(userId) {
  const newPassword = prompt('Ingresa la nueva contraseña (mínimo 6 caracteres):');
  
  if (!newPassword) return;
  
  if (newPassword.length < 6) {
    alert('La contraseña debe tener al menos 6 caracteres');
    return;
  }
  
  try {
    const response = await fetch(`/api/admin/users/${userId}/password`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newPassword })
    });
    
    const data = await response.json();
    
    if (data.success) {
      alert('✅ Contraseña actualizada exitosamente');
    } else {
      alert('❌ ' + data.message);
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Error al cambiar contraseña');
  }
}

async function toggleUserActive(userId, isActive) {
  const action = isActive ? 'desactivar' : 'activar';
  
  if (!confirm(`¿Estás seguro de que deseas ${action} este usuario?`)) {
    return;
  }
  
  try {
    const response = await fetch(`/api/admin/users/${userId}/toggle-active`, {
      method: 'PUT'
    });
    
    const data = await response.json();
    
    if (data.success) {
      alert('✅ ' + data.message);
      loadUsers();
    } else {
      alert('❌ ' + data.message);
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Error al cambiar estado del usuario');
  }
}

async function deleteUser(userId) {
  if (!confirm('¿Estás seguro de que deseas ELIMINAR este usuario? Esta acción no se puede deshacer.')) {
    return;
  }
  
  const confirmation = prompt('Escribe "ELIMINAR" para confirmar:');
  
  if (confirmation !== 'ELIMINAR') {
    alert('Eliminación cancelada');
    return;
  }
  
  try {
    const response = await fetch(`/api/admin/users/${userId}`, {
      method: 'DELETE'
    });
    
    const data = await response.json();
    
    if (data.success) {
      alert('✅ Usuario eliminado exitosamente');
      loadUsers();
    } else {
      alert('❌ ' + data.message);
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Error al eliminar usuario');
  }
}

function toggleUserDetails(userId) {
  const details = document.getElementById(`user-details-${userId}`);
  const icon = document.getElementById(`toggle-icon-${userId}`);
  
  if (details.style.display === 'none') {
    details.style.display = 'block';
    icon.textContent = '▲';
  } else {
    details.style.display = 'none';
    icon.textContent = '▼';
  }
}

function filterUsers() {
  const searchInput = document.getElementById('userSearchInput');
  const filter = searchInput.value.toLowerCase();
  const userCards = document.querySelectorAll('.user-card');
  
  userCards.forEach(card => {
    const name = card.getAttribute('data-user-name');
    const rut = card.getAttribute('data-user-rut');
    
    if (name.includes(filter) || rut.includes(filter)) {
      card.style.display = '';
    } else {
      card.style.display = 'none';
    }
  });
}


// Manejar el formulario de nueva solicitud del admin
document.addEventListener('DOMContentLoaded', () => {
  const adminForm = document.getElementById('adminRequestForm');
  if (adminForm) {
    adminForm.addEventListener('submit', handleAdminRequestSubmit);
  }
  
  // Preview de fotos
  const vehiclePhoto = document.getElementById('admin_vehiclePhoto');
  if (vehiclePhoto) {
    vehiclePhoto.addEventListener('change', (e) => previewAdminPhoto(e, 'admin_photoPreview'));
  }
  
  const vehicleIdPhoto = document.getElementById('admin_vehicleIdPhoto');
  if (vehicleIdPhoto) {
    vehicleIdPhoto.addEventListener('change', (e) => previewAdminPhoto(e, 'admin_idPhotoPreview'));
  }
});

function previewAdminPhoto(event, previewId) {
  const file = event.target.files[0];
  const preview = document.getElementById(previewId);
  
  if (file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      preview.innerHTML = `<img src="${e.target.result}" style="max-width: 200px; margin-top: 10px; border-radius: 5px;">`;
    };
    reader.readAsDataURL(file);
  } else {
    preview.innerHTML = '';
  }
}

async function handleAdminRequestSubmit(e) {
  e.preventDefault();
  
  // Limpiar mensajes de error previos
  document.querySelectorAll('.error-message').forEach(el => el.textContent = '');
  
  const formData = new FormData(e.target);
  
  // Validaciones básicas
  const rut = formData.get('studentRut');
  if (!validateRUT(rut)) {
    document.getElementById('admin_rutError').textContent = 'RUT inválido';
    return;
  }
  
  const email = formData.get('studentEmail');
  if (!email.endsWith('@inacapmail.cl')) {
    document.getElementById('admin_emailError').textContent = 'Debe ser un email institucional (@inacapmail.cl)';
    return;
  }
  
  try {
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Creando solicitud...';
    
    const response = await fetch('/api/admin/create-request', {
      method: 'POST',
      body: formData
    });
    
    const data = await response.json();
    
    if (data.success) {
      alert('✅ Solicitud creada exitosamente. La solicitud pasará por el proceso de verificación normal.');
      e.target.reset();
      document.getElementById('admin_photoPreview').innerHTML = '';
      document.getElementById('admin_idPhotoPreview').innerHTML = '';
      
      // Cambiar a la pestaña de pendientes
      showTab('pendientes');
    } else {
      alert('❌ Error: ' + data.message);
    }
    
    submitBtn.disabled = false;
    submitBtn.textContent = 'Crear Solicitud';
  } catch (error) {
    console.error('Error:', error);
    alert('Error al crear la solicitud');
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Crear Solicitud';
  }
}

function toggleAdminActivityDescription() {
  const activityType = document.getElementById('admin_activity_type').value;
  const descriptionGroup = document.getElementById('admin_activity_description_group');
  const descriptionInput = document.getElementById('admin_activity_description');
  
  if (activityType) {
    descriptionGroup.style.display = 'block';
    descriptionInput.required = true;
  } else {
    descriptionGroup.style.display = 'none';
    descriptionInput.required = false;
    descriptionInput.value = '';
  }
}

function validateRUT(rut) {
  // Eliminar puntos y guión
  rut = rut.replace(/\./g, '').replace(/-/g, '');
  
  if (rut.length < 2) return false;
  
  const body = rut.slice(0, -1);
  const dv = rut.slice(-1).toUpperCase();
  
  // Calcular dígito verificador
  let sum = 0;
  let multiplier = 2;
  
  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }
  
  const expectedDV = 11 - (sum % 11);
  const calculatedDV = expectedDV === 11 ? '0' : expectedDV === 10 ? 'K' : expectedDV.toString();
  
  return dv === calculatedDV;
}


async function loadAudit() {
  const container = document.getElementById('auditContent');
  
  container.innerHTML = `
    <div class="audit-filters" style="background: #f8f9fa; padding: 1.5rem; border-radius: 8px; margin-bottom: 1.5rem;">
      <h3 style="margin-top: 0;">Filtros</h3>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
        <div class="form-group">
          <label>Tipo de Acción</label>
          <select id="auditActionType" onchange="applyAuditFilters()">
            <option value="">Todos</option>
            <option value="user_registered">Usuario Registrado</option>
            <option value="user_created">Usuario Creado</option>
            <option value="user_role_changed">Cambio de Rol</option>
            <option value="user_password_changed">Cambio de Contraseña</option>
            <option value="user_status_changed">Cambio de Estado</option>
            <option value="user_deleted">Usuario Eliminado</option>
            <option value="request_approved_level1">Aprobación Nivel 1</option>
            <option value="request_approved_level2">Aprobación Nivel 2</option>
            <option value="request_rejected">Solicitud Rechazada</option>
          </select>
        </div>
        <div class="form-group">
          <label>Fecha Inicio</label>
          <input type="date" id="auditStartDate" onchange="applyAuditFilters()">
        </div>
        <div class="form-group">
          <label>Hora Inicio</label>
          <input type="time" id="auditStartTime" onchange="applyAuditFilters()">
        </div>
        <div class="form-group">
          <label>Fecha Fin</label>
          <input type="date" id="auditEndDate" onchange="applyAuditFilters()">
        </div>
        <div class="form-group">
          <label>Hora Fin</label>
          <input type="time" id="auditEndTime" onchange="applyAuditFilters()">
        </div>
      </div>
      <div style="margin-top: 1rem;">
        <button class="btn btn-primary" onclick="applyAuditFilters()">Aplicar Filtros</button>
        <button class="btn btn-secondary" onclick="clearAuditFilters()">Limpiar</button>
      </div>
    </div>
    <div id="auditLogs">
      <p style="text-align: center; color: #666;">Cargando registros...</p>
    </div>
  `;
  
  await fetchAuditLogs();
}

async function fetchAuditLogs(filters = {}) {
  try {
    const params = new URLSearchParams(filters);
    const response = await fetch(`/api/audit?${params}`);
    const data = await response.json();
    
    const container = document.getElementById('auditLogs');
    
    if (data.logs && data.logs.length > 0) {
      container.innerHTML = `
        <div class="audit-logs-list">
          ${data.logs.map(log => `
            <div class="audit-log-card">
              <div class="audit-log-header">
                <span class="audit-action-badge ${getActionTypeClass(log.action_type)}">${getActionTypeText(log.action_type)}</span>
                <span class="audit-date">${new Date(log.created_at).toLocaleString('es-CL')}</span>
              </div>
              <div class="audit-log-body">
                <p class="audit-description">${log.action_description}</p>
                <div class="audit-details">
                  <div><strong>Realizado por:</strong> ${log.performed_by_name || 'Sistema'} (${log.performed_by_email || 'N/A'})</div>
                  ${log.target_user_name ? `<div><strong>Usuario afectado:</strong> ${log.target_user_name} (${log.target_user_email})</div>` : ''}
                  ${log.request_student_name ? `<div><strong>Solicitud de:</strong> ${log.request_student_name}</div>` : ''}
                  ${log.metadata ? `<div class="audit-metadata"><strong>Detalles:</strong> <pre>${JSON.stringify(JSON.parse(log.metadata), null, 2)}</pre></div>` : ''}
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    } else {
      container.innerHTML = '<p style="text-align: center; color: #666;">No se encontraron registros con los filtros aplicados</p>';
    }
  } catch (error) {
    console.error('Error cargando auditoría:', error);
    document.getElementById('auditLogs').innerHTML = '<p style="color: red;">Error al cargar registros de auditoría</p>';
  }
}

function applyAuditFilters() {
  const filters = {};
  
  const actionType = document.getElementById('auditActionType').value;
  const startDate = document.getElementById('auditStartDate').value;
  const startTime = document.getElementById('auditStartTime').value;
  const endDate = document.getElementById('auditEndDate').value;
  const endTime = document.getElementById('auditEndTime').value;
  
  if (actionType) filters.actionType = actionType;
  if (startDate) filters.startDate = startDate;
  if (startTime) filters.startTime = startTime;
  if (endDate) filters.endDate = endDate;
  if (endTime) filters.endTime = endTime;
  
  fetchAuditLogs(filters);
}

function clearAuditFilters() {
  document.getElementById('auditActionType').value = '';
  document.getElementById('auditStartDate').value = '';
  document.getElementById('auditStartTime').value = '';
  document.getElementById('auditEndDate').value = '';
  document.getElementById('auditEndTime').value = '';
  fetchAuditLogs();
}

function getActionTypeClass(actionType) {
  const classes = {
    'user_registered': 'action-user',
    'user_created': 'action-user',
    'user_role_changed': 'action-warning',
    'user_password_changed': 'action-warning',
    'user_status_changed': 'action-warning',
    'user_deleted': 'action-danger',
    'request_approved_level1': 'action-success',
    'request_approved_level2': 'action-success',
    'request_rejected': 'action-danger'
  };
  return classes[actionType] || 'action-default';
}

function getActionTypeText(actionType) {
  const texts = {
    'user_registered': '👤 Usuario Registrado',
    'user_created': '👤 Usuario Creado',
    'user_role_changed': '🔄 Cambio de Rol',
    'user_password_changed': '🔑 Cambio de Contraseña',
    'user_status_changed': '⚡ Cambio de Estado',
    'user_deleted': '🗑️ Usuario Eliminado',
    'request_approved_level1': '✅ Aprobación Nivel 1',
    'request_approved_level2': '✅ Aprobación Nivel 2',
    'request_rejected': '❌ Solicitud Rechazada'
  };
  return texts[actionType] || actionType;
}
