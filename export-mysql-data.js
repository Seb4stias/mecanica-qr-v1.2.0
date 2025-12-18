const mysql = require('mysql2/promise');
const fs = require('fs');

async function exportData() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'mecanicav2',
    port: 3306
  });

  try {
    console.log('📦 Exportando datos de MySQL...\n');
    
    const data = {};
    
    // Exportar usuarios
    const [users] = await connection.query('SELECT * FROM users');
    data.users = users;
    console.log(`✅ Usuarios exportados: ${users.length}`);
    
    // Exportar solicitudes
    const [requests] = await connection.query('SELECT * FROM requests');
    data.requests = requests;
    console.log(`✅ Solicitudes exportadas: ${requests.length}`);
    
    // Exportar auditoría
    const [auditLogs] = await connection.query('SELECT * FROM audit_log');
    data.auditLogs = auditLogs;
    console.log(`✅ Logs de auditoría exportados: ${auditLogs.length}`);
    
    // Guardar en archivo JSON
    fs.writeFileSync('mysql-backup.json', JSON.stringify(data, null, 2));
    console.log('\n💾 Datos guardados en mysql-backup.json');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

exportData();
