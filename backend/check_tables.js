const mysql = require('mysql2/promise');

async function checkDB() {
  try {
    const conn = await mysql.createConnection({
      host: '127.0.0.1',
      user: 'root',
      password: '',
      database: 'supportboard'
    });

    console.log('✅ Connected to MySQL\n');

    // Check tables
    const [tables] = await conn.query('SHOW TABLES');
    console.log('📋 Tables in database:');
    tables.forEach(t => {
      const tableName = Object.values(t)[0];
      console.log(`  - ${tableName}`);
    });

    // Check contacts
    const [contacts] = await conn.query('SELECT id, name, email, created_at FROM contacts ORDER BY created_at DESC LIMIT 10');
    console.log(`\n👥 Contacts count: ${contacts.length}`);
    if (contacts.length > 0) {
      console.log('Recent contacts:');
      contacts.forEach(c => {
        console.log(`  - ${c.name} (${c.email}) - ${c.created_at}`);
      });
    }

    // Check teams table structure
    try {
      const [teams] = await conn.query('SELECT COUNT(*) as count FROM teams');
      console.log(`\n👥 Teams count: ${teams[0].count}`);
    } catch (e) {
      console.log(`\n❌ Teams table error: ${e.message}`);
    }

    // Check automations table
    try {
      const [autos] = await conn.query('SELECT COUNT(*) as count FROM automations');
      console.log(`\n🤖 Automations count: ${autos[0].count}`);
    } catch (e) {
      console.log(`\n❌ Automations table error: ${e.message}`);
    }

    // Check custom_fields table
    try {
      const [fields] = await conn.query('SELECT COUNT(*) as count FROM custom_fields');
      console.log(`\n📝 Custom fields count: ${fields[0].count}`);
    } catch (e) {
      console.log(`\n❌ Custom fields table error: ${e.message}`);
    }

    await conn.end();
  } catch (e) {
    console.error('❌ Database error:', e.message);
  }
}

checkDB();
