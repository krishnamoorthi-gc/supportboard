const db = require('./db');

async function migrate() {
  console.log('🔄 Starting user isolation migration...');

  try {
    // Initialize database connection
    await db.init();
    console.log('✅ Database connected');

    // Get first agent ID to assign existing data
    const firstAgent = await db.prepare('SELECT id FROM agents ORDER BY created_at ASC LIMIT 1').get();
    const defaultAgentId = firstAgent?.id || 'system';

    console.log('📋 Default agent ID:', defaultAgentId);

    // Add agent_id to tables that need user isolation
    const tables = [
      'contacts',
      'conversations',
      'companies',
      'campaigns',
      'segments',
      'campaign_templates',
      'leads',
      'deals',
      'tasks',
      'meetings',
      'labels',
      'inboxes',
      'teams',
      'canned_responses',
      'automations',
      'custom_fields'
    ];

    for (const table of tables) {
      try {
        // Check if column exists
        const columns = await db.prepare(`SHOW COLUMNS FROM ${table}`).all();
        const hasAgentId = columns.some(c => c.Field === 'agent_id');

        if (!hasAgentId) {
          console.log(`  ➕ Adding agent_id to ${table}...`);
          await db.run(`ALTER TABLE ${table} ADD COLUMN agent_id VARCHAR(255) DEFAULT NULL`);
          // Update existing rows to assign to the first agent
          await db.run(`UPDATE ${table} SET agent_id = ? WHERE agent_id IS NULL`, [defaultAgentId]);
          console.log(`  ✅ ${table} updated with agent_id = ${defaultAgentId}`);
        } else {
          console.log(`  ✅ ${table} already has agent_id`);
          // Still update any NULL agent_id rows
          await db.run(`UPDATE ${table} SET agent_id = ? WHERE agent_id IS NULL`, [defaultAgentId]);
        }
      } catch (e) {
        if (e.message.includes("doesn't exist")) {
          console.log(`  ⚠️  Table ${table} doesn't exist, skipping`);
        } else {
          console.error(`  ❌ Error with ${table}:`, e.message);
        }
      }
    }

    console.log('✅ Migration complete!');
    process.exit(0);
  } catch (e) {
    console.error('❌ Migration failed:', e.message);
    process.exit(1);
  }
}

migrate();
