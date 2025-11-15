let currentUser = null;
let video = null;
let canvas = null;
let canvasContext = null;
let scanning = false;

// Verificar sesión al cargar
document.addEventListener('DOMContentLoaded', async () => {
  await checkSession();
  video = document.getElementById('video');
  canvas = document.getElementById('canvas');
  canvasContext = canvas.getContext('2d');
});

async function checkSession() {
  try {
    const response = await fetch('/api/auth/session');
    const data = await response.json();
    
    if (!data.success || data.user.role !== 'scanner') {
      window.location.href = '/index.html';
      return;
    }
    
    currentUser = data.user;
    document.getElementById('userName').textContent = data.user.name;
  } catch (error) {
    console.error('Error verificando sesión:', error);
    window.location.href = '/index.html';
  }
}

async function startScanner() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: { facingMode: 'environment' } 
    });
    
    video.srcObject = stream;
    video.play();
    
    document.getElementById('startBtn').style.display = 'none';
    document.getElementById('stopBtn').style.display = 'inline-block';
    document.getElementById('scanStatus').innerHTML = '<p style="color: blue;">📷 Cámara activa - Apunte al código QR</p>';
    
    scanning = true;
    requestAnimationFrame(scanFrame);
  } catch (error) {
    console.error('Error:', error);
    document.getElementById('scanStatus').innerHTML = '<p style="color: red;">❌ Error al acceder a la cámara</p>';
  }
}


function stopScanner() {
  scanning = false;
  
  if (video.srcObject) {
    video.srcObject.getTracks().forEach(track => track.stop());
  }
  
  document.getElementById('startBtn').style.display = 'inline-block';
  document.getElementById('stopBtn').style.display = 'none';
  document.getElementById('scanStatus').innerHTML = '<p>Cámara detenida</p>';
}

function scanFrame() {
  if (!scanning) return;
  
  if (video.readyState === video.HAVE_ENOUGH_DATA) {
    canvas.height = video.videoHeight;
    canvas.width = video.videoWidth;
    canvasContext.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const imageData = canvasContext.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height);
    
    if (code) {
      console.log('QR detectado:', code.data);
      validateQR(code.data);
      return;
    }
  }
  
  requestAnimationFrame(scanFrame);
}

async function validateQR(qrData) {
  stopScanner();
  document.getElementById('scanStatus').innerHTML = '<p style="color: orange;">⏳ Validando código QR...</p>';
  
  try {
    const response = await fetch('/api/scanner/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ qrData })
    });
    
    const data = await response.json();
    
    displayResult(data);
  } catch (error) {
    console.error('Error:', error);
    document.getElementById('scanStatus').innerHTML = '<p style="color: red;">❌ Error de conexión</p>';
  }
}


function displayResult(data) {
  const resultSection = document.getElementById('resultSection');
  const resultCard = document.getElementById('resultCard');
  
  if (data.valid) {
    // QR válido - Acceso autorizado
    resultCard.innerHTML = `
      <div style="background: #d4edda; border: 2px solid #28a745; padding: 20px; border-radius: 10px;">
        <h2 style="color: #155724; margin-top: 0;">✅ ACCESO AUTORIZADO</h2>
        <hr>
        <h3>Información del Estudiante</h3>
        <p><strong>Nombre:</strong> ${data.data.studentName}</p>
        <p><strong>RUT:</strong> ${data.data.studentRut}</p>
        
        <h3>Información del Vehículo</h3>
        <p><strong>Patente:</strong> ${data.data.vehiclePlate}</p>
        <p><strong>Modelo:</strong> ${data.data.vehicleModel}</p>
        <p><strong>Color:</strong> ${data.data.vehicleColor}</p>
        
        ${data.data.expiresAt ? `<p><strong>Válido hasta:</strong> ${new Date(data.data.expiresAt).toLocaleDateString()}</p>` : '<p><strong>Validez:</strong> Indefinida</p>'}
        
        <p style="margin-top: 20px; font-size: 0.9em; color: #666;">
          <strong>Escaneado por:</strong> ${currentUser.name}<br>
          <strong>Fecha y hora:</strong> ${new Date().toLocaleString()}
        </p>
      </div>
    `;
    document.getElementById('scanStatus').innerHTML = '<p style="color: green; font-size: 1.2em;">✅ Código QR válido</p>';
  } else {
    // QR inválido o expirado
    resultCard.innerHTML = `
      <div style="background: #f8d7da; border: 2px solid #dc3545; padding: 20px; border-radius: 10px;">
        <h2 style="color: #721c24; margin-top: 0;">❌ ACCESO DENEGADO</h2>
        <hr>
        <p style="font-size: 1.1em;"><strong>Razón:</strong> ${data.message}</p>
        
        ${data.data ? `
          <h3>Información del Vehículo</h3>
          <p><strong>Nombre:</strong> ${data.data.studentName || 'N/A'}</p>
          <p><strong>RUT:</strong> ${data.data.studentRut || 'N/A'}</p>
          <p><strong>Patente:</strong> ${data.data.vehiclePlate || 'N/A'}</p>
          ${data.data.expiresAt ? `<p><strong>Expiró:</strong> ${new Date(data.data.expiresAt).toLocaleDateString()}</p>` : ''}
          ${data.data.status ? `<p><strong>Estado:</strong> ${data.data.status}</p>` : ''}
        ` : ''}
        
        <p style="margin-top: 20px; font-size: 0.9em; color: #666;">
          <strong>Escaneado por:</strong> ${currentUser.name}<br>
          <strong>Fecha y hora:</strong> ${new Date().toLocaleString()}
        </p>
      </div>
    `;
    document.getElementById('scanStatus').innerHTML = '<p style="color: red; font-size: 1.2em;">❌ Código QR inválido</p>';
  }
  
  resultSection.style.display = 'block';
  
  // Botón para escanear otro
  resultCard.innerHTML += '<button class="btn btn-primary" onclick="resetScanner()" style="margin-top: 20px;">Escanear Otro QR</button>';
}

function resetScanner() {
  document.getElementById('resultSection').style.display = 'none';
  document.getElementById('scanStatus').innerHTML = '';
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
