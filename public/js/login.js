document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const rut = document.getElementById('rut').value.trim();
  const password = document.getElementById('password').value;
  const loginBtn = document.getElementById('loginBtn');

  console.log('🔍 Intentando login con RUT:', rut);

  if (!rut || !password) {
    showErrorModal('Por favor complete todos los campos');
    return;
  }

  // Deshabilitar botón
  loginBtn.disabled = true;
  loginBtn.textContent = 'Iniciando sesión...';

  try {
    console.log('📡 Enviando petición a /api/auth/login...');
    
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ rut, password })
    });

    console.log('📥 Respuesta recibida:', response.status);

    const data = await response.json();
    console.log('📦 Datos:', data);

    if (data.success) {
      console.log('✅ Login exitoso, redirigiendo...');
      // Redirigir según el rol
      switch (data.user.role) {
        case 'student':
          window.location.href = '/student-dashboard.html';
          break;
        case 'admin_level1':
          window.location.href = '/admin-level1-dashboard.html';
          break;
        case 'admin_level2':
          window.location.href = '/admin-level2-dashboard.html';
          break;
        case 'scanner':
          window.location.href = '/scanner-dashboard.html';
          break;
        default:
          window.location.href = '/dashboard.html';
      }
    } else {
      console.log('❌ Login fallido:', data.message);
      showErrorModal(data.message || 'Usuario o contraseña incorrectos');
    }
  } catch (error) {
    console.error('💥 Error de conexión:', error);
    showErrorModal('Error de conexión. Verifique su internet e intente nuevamente.');
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = 'Iniciar Sesión';
  }
});

function showErrorModal(message) {
  document.getElementById('errorModalMessage').textContent = message;
  document.getElementById('errorModal').classList.add('active');
}

function closeErrorModal() {
  document.getElementById('errorModal').classList.remove('active');
}

function togglePasswordVisibility() {
  const passwordField = document.getElementById('password');
  passwordField.type = passwordField.type === 'password' ? 'text' : 'password';
}
