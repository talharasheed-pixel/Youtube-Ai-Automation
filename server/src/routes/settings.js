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
// Get YouTube Credentials
router.get('/youtube-credentials', (req, res) => {
  const db = getDb();
  try {
    const row = db.prepare("SELECT * FROM system_settings WHERE key = 'youtube_oauth'").get();
    if (row && row.value) {
      const data = JSON.parse(row.value);
      return res.json({
        clientId: data.clientId || '',
        hasSecret: Boolean(data.clientSecret),
        redirectUri: data.redirectUri || '',
      });
    }
  } catch (e) {}

  res.json({
    clientId: process.env.GOOGLE_CLIENT_ID || process.env.YOUTUBE_CLIENT_ID || '',
    hasSecret: Boolean(process.env.GOOGLE_CLIENT_SECRET || process.env.YOUTUBE_CLIENT_SECRET),
    redirectUri: process.env.GOOGLE_REDIRECT_URI || process.env.YOUTUBE_REDIRECT_URI || 'https://youtube-ai-automation-h7wx.onrender.com/api/youtube/callback',
  });
});

// Save YouTube Credentials
router.post('/youtube-credentials', (req, res) => {
  const { clientId, clientSecret, redirectUri } = req.body;
  if (!clientId || !clientSecret) {
    return res.status(400).json({ error: 'Client ID and Client Secret are required' });
  }

  const db = getDb();
  try {
    db.exec("CREATE TABLE IF NOT EXISTS system_settings (key TEXT PRIMARY KEY, value TEXT, updated_at TEXT);");
    const value = JSON.stringify({ clientId, clientSecret, redirectUri });
    db.prepare(`
      INSERT INTO system_settings (key, value, updated_at) VALUES ('youtube_oauth', ?, datetime('now'))
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
    `).run(value);

    // Update in process.env so YouTubeService picks it up immediately
    process.env.GOOGLE_CLIENT_ID = clientId;
    process.env.GOOGLE_CLIENT_SECRET = clientSecret;
    process.env.GOOGLE_REDIRECT_URI = redirectUri || 'https://youtube-ai-automation-h7wx.onrender.com/api/youtube/callback';

    const ytService = req.app.get('youtubeService');
    if (ytService) {
      ytService.oauth2Client = null; // force reload with new credentials
    }

    res.json({ message: 'YouTube credentials saved successfully!' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
