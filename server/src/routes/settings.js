const express = require('express');
const { getDb } = require('../db');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

// Get all provider configurations
router.get('/providers', (req, res) => {
  const db = getDb();
  const providers = db.prepare('SELECT * FROM provider_configurations ORDER BY provider_type, priority').all();
  res.json({ providers });
});

// Update provider configuration
router.put('/providers/:id', (req, res) => {
  const { isEnabled, priority, model, budgetLimit } = req.body;
  const db = getDb();
  db.prepare(`
    UPDATE provider_configurations SET is_enabled = COALESCE(?, is_enabled),
    priority = COALESCE(?, priority), model = COALESCE(?, model),
    budget_limit = COALESCE(?, budget_limit), updated_at = datetime('now') WHERE id = ?
  `).run(isEnabled, priority, model, budgetLimit, req.params.id);
  res.json({ message: 'Updated' });
});

// Create provider configuration
router.post('/providers', (req, res) => {
  const { providerType, providerName, apiEndpoint, model, priority, isEnabled } = req.body;
  const db = getDb();
  const id = uuidv4();
  db.prepare(`
    INSERT INTO provider_configurations (id, provider_type, provider_name, api_endpoint, model, priority, is_enabled)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, providerType, providerName, apiEndpoint || '', model || '', priority || 1, isEnabled ? 1 : 0);
  res.status(201).json({ id });
});

// Get budget status
router.get('/budget', (req, res) => {
  const costTracker = req.app.get('costTracker');
  if (!costTracker) return res.json({ message: 'Cost tracker not available' });
  const db = getDb();
  const projects = db.prepare('SELECT id FROM projects WHERE status = ?').all('ACTIVE');
  const budgets = projects.map(p => ({ projectId: p.id, ...costTracker.checkBudget(p.id) }));
  res.json({ budgets, config: req.app.get('config')?.budget });
});

// Get analytics insights
router.get('/analytics/insights', (req, res) => {
  const analyticsService = req.app.get('analyticsService');
  if (!analyticsService) return res.json({ insights: [] });
  res.json(analyticsService.getInsights());
});

// Get recent audit logs
router.get('/audit-logs', (req, res) => {
  const AuditLogger = require('../services/audit-logger');
  const logs = AuditLogger.getRecent(parseInt(req.query.limit || '100'));
  res.json({ logs });
});

// Get system status
router.get('/system-status', (req, res) => {
  const db = getDb();
  res.json({
    database: 'connected',
    agents: db.prepare('SELECT COUNT(*) as count FROM agents').get().count,
    projects: db.prepare('SELECT COUNT(*) as count FROM projects').get().count,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
});

module.exports = router;
