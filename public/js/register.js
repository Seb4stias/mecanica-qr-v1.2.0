document.getElementById('registerForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  // Limpiar errores previos
  document.querySelectorAll('.error-message').forEach(el => el.textContent = '');

  // Obtener valores del formulario
  const name = document.getElementById('name').value.trim();
  const rut = document.getElementById('rut').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirmPassword').value;

  // Validaciones del lado del cliente
  let hasError = false;

  if (!name) {
    document.getElementById('nameError').textContent = 'El nombre es requerido';
    hasError = true;
  }

  if (!rut) {
    document.getElementById('rutError').textContent = 'El RUT es requerido';
    hasError = true;
  }

  if (!email) {
    document.getElementById('emailError').textContent = 'El email es requerido';
    hasError = true;
  }

  if (password.length < 6) {
    document.getElementById('passwordError').textContent = 'La contraseña debe tener al menos 6 caracteres';
    hasError = true;
  }

  if (password !== confirmPassword) {
    document.getElementById('confirmPasswordError').textContent = 'Las contraseñas no coinciden';
    hasError = true;
  }

  if (hasError) return;

  // Deshabilitar botón
  const registerBtn = document.getElementById('registerBtn');
  registerBtn.disabled = true;
  registerBtn.textContent = 'Registrando...';

  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name,
        rut,
        email,
        password
      })
    });

    const data = await response.json();

    if (data.success) {
      showSuccessModal('¡Registro exitoso! Redirigiendo al panel...');
      setTimeout(() => {
        window.location.href = '/student.html';
      }, 2000);
    } else {
      showErrorModal(data.message || 'Error al registrar usuario');
    }
  } catch (error) {
    console.error('Error:', error);
    showErrorModal('Error de conexión. Intente nuevamente.');
  } finally {
    registerBtn.disabled = false;
    registerBtn.textContent = 'Registrarse';
  }
});

function showErrorModal(message) {
  document.getElementById('errorModalMessage').textContent = message;
  document.getElementById('errorModal').classList.add('active');
}

function closeErrorModal() {
  document.getElementById('errorModal').classList.remove('active');
}

function showSuccessModal(message) {
  document.getElementById('successModalMessage').textContent = message;
  document.getElementById('successModal').classList.add('active');
}

function closeSuccessModal() {
  document.getElementById('successModal').classList.remove('active');
}

function togglePassword(fieldId) {
  const field = document.getElementById(fieldId);
  field.type = field.type === 'password' ? 'text' : 'password';
}
