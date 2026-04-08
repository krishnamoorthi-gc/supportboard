const mysql = require('mysql2/promise');
require('dotenv').config();

async function check() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'supportboard'
  });
  const [rows] = await connection.query('SHOW TABLES');
  console.log('Tables:', rows);
  const [agents] = await connection.query('SELECT COUNT(*) as c FROM agents');
  console.log('Agents count:', agents[0].c);
  await connection.end();
}

check().catch(console.error);
