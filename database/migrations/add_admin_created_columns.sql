-- Agregar columnas para rastrear solicitudes creadas por administradores
ALTER TABLE requests 
ADD COLUMN created_by_admin BOOLEAN DEFAULT 0 AFTER updated_at,
ADD COLUMN created_by_admin_id INT AFTER created_by_admin,
ADD FOREIGN KEY (created_by_admin_id) REFERENCES users(id);
