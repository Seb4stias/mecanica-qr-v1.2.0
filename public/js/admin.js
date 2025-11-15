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
    const response = await fetch('/api/admin/requests?status=pending');
    const data = await response.json();
    
    const container = document.getElementById('pendientesList');
    
    if (data.requests && data.requests.length > 0) {
      container.innerHTML = data.requests.map(req => `
        <div class="request-card">
          <h3>${req.student_name}</h3>
          <p><strong>RUT:</strong> ${req.student_rut}</p>
          <p><strong>Patente:</strong> ${req.vehicle_plate}</p>
          <p><strong>Modelo:</strong> ${req.vehicle_model}</p>
          <button class="btn btn-primary" onclick="viewRequest(${req.id})">Ver Detalles</button>
        </div>
      `).join('');
    } else {
      container.innerHTML = '<p>No hay solicitudes pendientes</p>';
    }
  } catch (error) {
    console.error('Error cargando solicitudes:', error);
  }
}

async function loadApprovedRequests() {
  document.getElementById('aprobadasList').innerHTML = '<p>Cargando...</p>';
}

async function loadRejectedRequests() {
  document.getElementById('denegadasList').innerHTML = '<p>Cargando...</p>';
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

function viewRequest(id) {
  alert('Ver detalles de solicitud ' + id + ' - En desarrollo');
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
