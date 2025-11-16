let currentUser = null;

// Verificar sesión al cargar
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🔄 Admin: Verificando sesión...');
  const sessionValid = await checkSession();
  if (sessionValid) {
    console.log('✅ Admin: Sesión válida, cargando solicitudes...');
    loadPendingRequests();
  }
});

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
    
    // Mostrar tab de usuarios solo para admin_level2
    if (data.user.role === 'admin_level2') {
      document.getElementById('usersTab').style.display = 'block';
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
    case 'scanner':
      loadScanner();
      break;
    case 'usuarios':
      loadUsers();
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
            <div style="display: flex; gap: 15px;">
              ${req.vehicle_photo_path ? `
                <div style="flex-shrink: 0;">
                  <img src="${req.vehicle_photo_path}" alt="Foto del vehículo" style="width: 150px; height: 150px; object-fit: cover; border-radius: 5px; border: 1px solid #ddd;">
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
          <div style="display: flex; gap: 15px;">
            ${req.vehicle_photo_path ? `
              <div style="flex-shrink: 0;">
                <img src="${req.vehicle_photo_path}" alt="Foto del vehículo" style="width: 150px; height: 150px; object-fit: cover; border-radius: 5px; border: 1px solid #ddd;">
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
            <div style="display: flex; gap: 15px;">
              ${req.vehicle_photo_path ? `
                <div style="flex-shrink: 0;">
                  <img src="${req.vehicle_photo_path}" alt="Foto del vehículo" style="width: 150px; height: 150px; object-fit: cover; border-radius: 5px; border: 1px solid #ddd;">
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
        <div style="margin-bottom: 20px;">
          <button class="btn btn-primary" onclick="showCreateUserForm()">Crear Nuevo Usuario</button>
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
                <option value="student">Estudiante</option>
                <option value="admin_level1">Admin Nivel 1</option>
                <option value="admin_level2">Admin Nivel 2</option>
                <option value="scanner">Escáner</option>
              </select>
            </div>
            <button type="submit" class="btn btn-primary">Crear Usuario</button>
            <button type="button" class="btn btn-secondary" onclick="hideCreateUserForm()">Cancelar</button>
          </form>
          <div id="createUserMessage"></div>
        </div>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background: #f5f5f5;">
              <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">ID</th>
              <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Nombre</th>
              <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">RUT</th>
              <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Email</th>
              <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Rol</th>
              <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Estado</th>
              <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Fecha Creación</th>
            </tr>
          </thead>
          <tbody>
            ${data.users.map(user => `
              <tr>
                <td style="padding: 10px; border: 1px solid #ddd;">${user.id}</td>
                <td style="padding: 10px; border: 1px solid #ddd;">${user.name}</td>
                <td style="padding: 10px; border: 1px solid #ddd;">${user.rut || 'N/A'}</td>
                <td style="padding: 10px; border: 1px solid #ddd;">${user.email}</td>
                <td style="padding: 10px; border: 1px solid #ddd;">${getRoleText(user.role)}</td>
                <td style="padding: 10px; border: 1px solid #ddd;">${user.is_active ? '✅ Activo' : '❌ Inactivo'}</td>
                <td style="padding: 10px; border: 1px solid #ddd;">${new Date(user.created_at).toLocaleDateString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
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
        ${req.vehicle_photo_path ? `<p><img src="${req.vehicle_photo_path}" style="max-width: 300px;"></p>` : ''}
        
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

function downloadQR(requestId) {
  window.open(`/api/requests/${requestId}/qr`, '_blank');
}

function downloadForm(requestId) {
  window.open(`/api/requests/${requestId}/pdf`, '_blank');
}

function closeModal() {
  document.getElementById('requestModal').style.display = 'none';
}

async function logout() {
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/index.html';
  } catch (error) {
    console.error('Error al cerrar sesión:', error);
    window.location.href = '/index.html';
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
      // La foto viene directamente del endpoint de validación
      let vehiclePhoto = data.data.vehiclePhotoPath || null;
      
      // Asegurar que la ruta comience con /
      if (vehiclePhoto && !vehiclePhoto.startsWith('/')) {
        vehiclePhoto = '/' + vehiclePhoto;
      }
      
      console.log('Foto del vehículo:', vehiclePhoto);
      console.log('Datos completos:', data.data);
      
      scanResult.innerHTML = `
        <div style="padding: 20px; background: #d4edda; border: 2px solid #28a745; border-radius: 10px; margin-top: 20px;">
          <h2 style="color: #155724; margin-top: 0;">✅ ACCESO AUTORIZADO</h2>
          ${vehiclePhoto ? `
            <div style="text-align: center; margin: 20px 0;">
              <img src="${vehiclePhoto}" alt="Foto del vehículo" 
                   style="max-width: 100%; max-height: 400px; border-radius: 10px; border: 3px solid #28a745; display: block; margin: 0 auto;" 
                   onerror="console.error('Error cargando imagen:', this.src); this.parentElement.innerHTML='<p style=\\'color: #856404; background: #fff3cd; padding: 10px; border-radius: 5px;\\'>⚠️ Error al cargar la foto del vehículo</p>';">
            </div>
          ` : '<p style="color: #856404; background: #fff3cd; padding: 10px; border-radius: 5px;">⚠️ No hay foto del vehículo disponible</p>'}
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
