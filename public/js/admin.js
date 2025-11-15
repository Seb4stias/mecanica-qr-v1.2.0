let currentUser = null;

// Verificar sesión al cargar
document.addEventListener('DOMContentLoaded', async () => {
  await checkSession();
  loadPendingRequests();
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
    
    // Mostrar tab de usuarios solo para admin_level2
    if (data.user.role === 'admin_level2') {
      document.getElementById('usersTab').style.display = 'block';
    }
  } catch (error) {
    console.error('Error verificando sesión:', error);
    window.location.href = '/index.html';
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
  document.getElementById('userManagement').innerHTML = '<p>Gestión de usuarios - En desarrollo</p>';
}

async function loadMyAccount() {
  if (currentUser) {
    document.getElementById('myAccountContent').innerHTML = `
      <div class="account-info">
        <p><strong>Nombre:</strong> ${currentUser.name}</p>
        <p><strong>Email:</strong> ${currentUser.email}</p>
        <p><strong>Rol:</strong> ${currentUser.role}</p>
      </div>
    `;
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
