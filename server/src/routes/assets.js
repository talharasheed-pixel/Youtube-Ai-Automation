const express = require('express');
const { getDb } = require('../db');

const router = express.Router();

// GET /api/assets — Query media assets across projects
router.get('/', (req, res) => {
  const db = getDb();
  const { projectId, assetType } = req.query;

  let query = 'SELECT * FROM media_assets WHERE 1=1';
  const params = [];

  if (projectId) {
    query += ' AND project_id = ?';
    params.push(projectId);
  }
  if (assetType) {
    query += ' AND asset_type = ?';
    params.push(assetType);
  }

  query += ' ORDER BY created_at DESC LIMIT 100';

  const assets = db.prepare(query).all(...params);
  res.json({ assets });
});

// GET /api/assets/:id
router.get('/:id', (req, res) => {
  const db = getDb();
  const asset = db.prepare('SELECT * FROM media_assets WHERE id = ?').get(req.params.id);
  if (!asset) return res.status(404).json({ error: 'Asset not found' });
  res.json({ asset });
});

module.exports = router;
