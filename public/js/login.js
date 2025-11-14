document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const rut = document.getElementById('rut').value.trim();
  const password = document.getElementById('password').value;
  const errorDiv = document.getElementById('formError');
  const loginBtn = document.getElementById('loginBtn');

  // Limpiar error previo
  errorDiv.textContent = '';

  if (!rut || !password) {
    errorDiv.textContent = 'Por favor complete todos los campos';
    return;
  }

  // Deshabilitar botón
  loginBtn.disabled = true;
  loginBtn.textContent = 'Iniciando sesión...';

  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ rut, password })
    });

    const data = await response.json();

    if (data.success) {
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
      errorDiv.textContent = data.message || 'Credenciales inválidas';
    }
  } catch (error) {
    console.error('Error:', error);
    errorDiv.textContent = 'Error de conexión. Intente nuevamente.';
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = 'Iniciar Sesión';
  }
});

function togglePasswordVisibility() {
  const passwordField = document.getElementById('password');
  passwordField.type = passwordField.type === 'password' ? 'text' : 'password';
}
