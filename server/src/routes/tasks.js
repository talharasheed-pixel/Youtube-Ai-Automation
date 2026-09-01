const express = require('express');
const { getDb } = require('../db');

const router = express.Router();

// GET /api/tasks — List all tasks across projects
router.get('/', (req, res) => {
  const db = getDb();
  const { projectId, status, agentId } = req.query;

  let query = 'SELECT * FROM tasks WHERE 1=1';
  const params = [];

  if (projectId) {
    query += ' AND project_id = ?';
    params.push(projectId);
  }
  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }
  if (agentId) {
    query += ' AND agent_id = ?';
    params.push(agentId);
  }

  query += ' ORDER BY created_at DESC LIMIT 100';

  const tasks = db.prepare(query).all(...params);
  res.json({ tasks });
});

// GET /api/tasks/:id — Get task by ID
router.get('/:id', (req, res) => {
  const db = getDb();
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.json({ task });
});

module.exports = router;
