const { initDb, getDb, saveDb } = require('./src/db');

async function clean() {
  await initDb();
  const db = getDb();

  console.log('Cleaning all test data...');

  const tables = [
    'projects', 'tasks', 'research', 'research_sources',
    'scripts', 'script_versions', 'fact_checks', 'media_assets',
    'videos', 'thumbnails', 'seo_packages', 'approvals',
    'publishing_jobs', 'analytics', 'agent_runs', 'handoff_messages',
    'revision_requests', 'audit_logs', 'errors', 'cost_entries'
  ];

  for (const table of tables) {
    try {
      db.exec(`DELETE FROM ${table};`);
    } catch (e) {
      // ignore if table doesn't exist
    }
  }

  try {
    db.exec("UPDATE agents SET status = 'IDLE';");
  } catch (e) {}

  saveDb();

  const count = db.prepare('SELECT COUNT(*) as count FROM projects').get();
  console.log('Projects count after cleanup:', count.count);
  console.log('All dummy test data cleared successfully!');
}

clean().catch(console.error);
