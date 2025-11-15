let currentUser = null;

// Verificar sesión al cargar
document.addEventListener('DOMContentLoaded', async () => {
  await checkSession();
  loadMyRequests();
});

async function checkSession() {
  try {
    const response = await fetch('/api/auth/session');
    const data = await response.json();
    
    if (!data.success) {
      window.location.href = '/index.html';
      return;
    }
    
    currentUser = data.user;
    document.getElementById('userName').textContent = data.user.name;
    
    // Pre-llenar datos del estudiante
    document.getElementById('student_name').value = data.user.name || '';
    document.getElementById('student_rut').value = data.user.rut || '';
    document.getElementById('student_email').value = data.user.email || '';
    document.getElementById('student_phone').value = data.user.phone || '';
    document.getElementById('student_carrera').value = data.user.carrera || '';
  } catch (error) {
    console.error('Error verificando sesión:', error);
    window.location.href = '/index.html';
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
