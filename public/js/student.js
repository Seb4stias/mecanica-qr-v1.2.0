let currentUser = null;

// Verificar sesión al cargar
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🔄 Student: Verificando sesión...');
  const sessionValid = await checkSession();
  if (sessionValid) {
    console.log('✅ Student: Sesión válida, cargando solicitudes...');
    loadMyRequests();
  }
});

async function checkSession() {
  try {
    console.log('📡 Student: Consultando /api/auth/session...');
    const response = await fetch('/api/auth/session');
    console.log('📥 Student: Respuesta recibida:', response.status);
    const data = await response.json();
    console.log('📦 Student: Datos:', data);
    
    if (!data.success) {
      console.log('❌ Student: Sesión inválida, redirigiendo...');
      window.location.href = '/index.html';
      return false;
    }
    
    console.log('✅ Student: Sesión válida para:', data.user.name);
    currentUser = data.user;
    document.getElementById('userName').textContent = data.user.name;
    
    // Pre-llenar datos del estudiante
    document.getElementById('student_name').value = data.user.name || '';
    document.getElementById('student_rut').value = data.user.rut || '';
    document.getElementById('student_email').value = data.user.email || '';
    document.getElementById('student_phone').value = data.user.phone || '';
    document.getElementById('student_carrera').value = data.user.carrera || '';
    
    return true;
  } catch (error) {
    console.error('💥 Student: Error verificando sesión:', error);
    window.location.href = '/index.html';
    return false;
  }
}

function showTab(tabName) {
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.classList.remove('active');
  });
  
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  document.getElementById(`${tabName}-tab`).classList.add('active');
  event.target.classList.add('active');
  
  if (tabName === 'mis-solicitudes') {
    loadMyRequests();
  } else if (tabName === 'mi-cuenta') {
    loadMyAccount();
  }
}

// Enviar solicitud
document.getElementById('requestForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const formData = new FormData(e.target);
  const submitBtn = document.querySelector('#requestForm button[type="submit"]');
  
  submitBtn.disabled = true;
  submitBtn.textContent = 'Enviando...';
  
  try {
    const response = await fetch('/api/requests', {
      method: 'POST',
      body: formData
    });
    
    const data = await response.json();
    
    if (data.success) {
      showSuccessModal('¡Solicitud enviada exitosamente!');
      e.target.reset();
      // Pre-llenar datos nuevamente
      document.getElementById('student_name').value = currentUser.name || '';
      document.getElementById('student_rut').value = currentUser.rut || '';
      document.getElementById('student_email').value = currentUser.email || '';
      document.getElementById('student_phone').value = currentUser.phone || '';
      document.getElementById('student_carrera').value = currentUser.carrera || '';
    } else {
      showErrorModal(data.message || 'Error al enviar solicitud');
    }
  } catch (error) {
    console.error('Error:', error);
    showErrorModal('Error de conexión. Intente nuevamente.');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Enviar Solicitud';
  }
});

async function loadMyRequests() {
  try {
    const response = await fetch('/api/requests');
    const data = await response.json();
    
    const container = document.getElementById('requestsList');
    
    if (data.requests && data.requests.length > 0) {
      container.innerHTML = data.requests.map(req => `
        <div class="request-card">
          <h3>Solicitud #${req.id}</h3>
          <p><strong>Patente:</strong> ${req.vehicle_plate}</p>
          <p><strong>Modelo:</strong> ${req.vehicle_model}</p>
          <p><strong>Estado:</strong> <span class="status-${req.status}">${getStatusText(req.status)}</span></p>
          <p><strong>Fecha:</strong> ${new Date(req.created_at).toLocaleDateString()}</p>
        </div>
      `).join('');
    } else {
      container.innerHTML = '<p>No tienes solicitudes aún</p>';
    }
  } catch (error) {
    console.error('Error cargando solicitudes:', error);
  }
}

function getStatusText(status) {
  const statusMap = {
    'pending': 'Pendiente',
    'level1_approved': 'Aprobada Nivel 1',
    'approved': 'Aprobada',
    'rejected': 'Rechazada'
  };
  return statusMap[status] || status;
}

async function loadMyAccount() {
  if (currentUser) {
    document.getElementById('myAccountContent').innerHTML = `
      <div class="account-info">
        <h3>Información de la Cuenta</h3>
        <p><strong>Nombre:</strong> ${currentUser.name}</p>
        <p><strong>Email:</strong> ${currentUser.email}</p>
        <p><strong>RUT:</strong> ${currentUser.rut || 'No configurado'}</p>
        <p><strong>Carrera:</strong> ${currentUser.carrera || 'No configurada'}</p>
        <p><strong>Teléfono:</strong> ${currentUser.phone || 'No configurado'}</p>
        
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

function showErrorModal(message) {
  alert(message); // Temporal, puedes agregar modal después
}

function showSuccessModal(message) {
  alert(message); // Temporal
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
