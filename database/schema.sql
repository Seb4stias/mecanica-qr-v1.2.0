-- Sistema de Gestión de Acceso Vehicular
-- Esquema de Base de Datos MariaDB

-- Tabla de Usuarios
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  rut VARCHAR(10) UNIQUE,
  carrera VARCHAR(255),
  phone VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INT,
  is_active BOOLEAN DEFAULT 1,
  FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de Solicitudes de Permiso
CREATE TABLE IF NOT EXISTS requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  student_name VARCHAR(255) NOT NULL,
  student_rut VARCHAR(10) NOT NULL,
  student_carrera VARCHAR(255) NOT NULL,
  student_email VARCHAR(255) NOT NULL,
  student_phone VARCHAR(20) NOT NULL,
  vehicle_plate VARCHAR(20) NOT NULL,
  vehicle_model VARCHAR(255) NOT NULL,
  vehicle_color VARCHAR(100) NOT NULL,
  vehicle_photo_path VARCHAR(500),
  garage_location VARCHAR(255),
  modifications_description TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  level1_approved BOOLEAN DEFAULT NULL,
  level1_admin_id INT,
  level1_date TIMESTAMP NULL,
  level1_comments TEXT,
  level2_approved BOOLEAN DEFAULT NULL,
  level2_admin_id INT,
  level2_date TIMESTAMP NULL,
  level2_comments TEXT,
  denial_reason TEXT,
  denied_by_level INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (level1_admin_id) REFERENCES users(id),
  FOREIGN KEY (level2_admin_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de Códigos QR
CREATE TABLE IF NOT EXISTS qr_codes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  request_id INT UNIQUE NOT NULL,
  qr_data TEXT NOT NULL,
  qr_image_path VARCHAR(500),
  pdf_path VARCHAR(500),
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NULL,
  is_active BOOLEAN DEFAULT 1,
  FOREIGN KEY (request_id) REFERENCES requests(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de Solicitudes de Cuentas
CREATE TABLE IF NOT EXISTS account_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  requested_email VARCHAR(255) NOT NULL,
  requested_name VARCHAR(255) NOT NULL,
  requested_role VARCHAR(50) NOT NULL,
  requested_by INT NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  reviewed_by INT,
  reviewed_at TIMESTAMP NULL,
  rejection_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (requested_by) REFERENCES users(id),
  FOREIGN KEY (reviewed_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de Auditoría
CREATE TABLE IF NOT EXISTS audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  action VARCHAR(255) NOT NULL,
  entity_type VARCHAR(100),
  entity_id INT,
  details TEXT,
  ip_address VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de Tokens de Verificación
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token VARCHAR(6) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Índices (sin IF NOT EXISTS porque MariaDB no lo soporta en CREATE INDEX)
CREATE INDEX idx_requests_user_id ON requests(user_id);
CREATE INDEX idx_requests_status ON requests(status);
CREATE INDEX idx_requests_created_at ON requests(created_at);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX idx_password_reset_tokens_token ON password_reset_tokens(token);
