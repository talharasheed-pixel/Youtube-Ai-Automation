const express = require('express');
const { getDb } = require('../db');
const router = express.Router();

// Get all agents with their current status
router.get('/', (req, res) => {
  const db = getDb();
  const agents = db.prepare(`
    SELECT a.*,
      (SELECT COUNT(*) FROM tasks WHERE agent_id = a.id AND status = 'COMPLETED') as total_completed,
      (SELECT COUNT(*) FROM tasks WHERE agent_id = a.id AND status = 'FAILED') as total_failed,
      (SELECT COUNT(*) FROM tasks WHERE agent_id = a.id) as total_tasks
    FROM agents a ORDER BY a.agent_number ASC
  `).all();

  const enriched = agents.map(a => ({
    ...a,
    successRate: a.total_tasks > 0 ? Math.round((a.total_completed / a.total_tasks) * 100) : 0,
  }));

  res.json({ agents: enriched });
});

// Get single agent details
router.get('/:id', (req, res) => {
  const db = getDb();
  const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(req.params.id);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });

  const recentRuns = db.prepare(`
    SELECT ar.*, t.task_type, t.stage, p.title as project_title
    FROM agent_runs ar
    JOIN tasks t ON t.id = ar.task_id
    JOIN projects p ON p.id = ar.project_id
    WHERE ar.agent_id = ?
    ORDER BY ar.started_at DESC LIMIT 20
  `).all(req.params.id);

  res.json({ agent, recentRuns });
});

// Get agent activity timeline
router.get('/:id/activity', (req, res) => {
  const db = getDb();
  const activity = db.prepare(`
    SELECT al.* FROM audit_logs al
    WHERE al.agent_id = ?
    ORDER BY al.created_at DESC LIMIT 50
  `).all(req.params.id);
  res.json({ activity });
});

module.exports = router;
