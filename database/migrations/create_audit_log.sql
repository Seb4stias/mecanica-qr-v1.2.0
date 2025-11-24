-- Tabla de auditoría para registrar todas las acciones importantes del sistema
CREATE TABLE IF NOT EXISTS audit_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  action_type VARCHAR(50) NOT NULL,
  action_description TEXT NOT NULL,
  performed_by INT,
  target_user_id INT NULL,
  target_request_id INT NULL,
  metadata JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (target_request_id) REFERENCES requests(id) ON DELETE SET NULL,
  INDEX idx_action_type (action_type),
  INDEX idx_performed_by (performed_by),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
