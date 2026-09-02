const express = require('express');
const router = express.Router();

/**
 * Automation Routes — Control & Monitor Real-Time YouTube Studio Browser Automation
 */
module.exports = function(browserTaskQueue) {
  // Get live queue & execution status
  router.get('/status', (req, res) => {
    if (!browserTaskQueue) {
      return res.status(503).json({ error: 'Browser task queue not initialized' });
    }
    res.json(browserTaskQueue.getQueueStatus());
  });

  // Launch browser and open YouTube Studio directly
  router.post('/open-studio', async (req, res) => {
    try {
      const task = browserTaskQueue.addTask('agent-manager', 'open_studio', 'youtube_studio', {
        channelUrl: req.body.channelUrl || 'https://studio.youtube.com'
      });
      res.json({ message: 'Studio opening queued', task });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Queue individual agent action (e.g. Test title, test description)
  router.post('/action', (req, res) => {
    try {
      const { agent, action, target, payload } = req.body;
      if (!action) return res.status(400).json({ error: 'Action is required' });

      const task = browserTaskQueue.addTask(agent || 'agent-manager', action, target || 'general', payload || {});
      res.json({ message: 'Action enqueued', task });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Trigger full visible publishing pipeline for a project
  router.post('/publish-project', (req, res) => {
    try {
      const {
        videoPath,
        title,
        description,
        thumbnailPath,
        tags,
        madeForKids,
        visibility,
        requireConfirmation,
        dryRun
      } = req.body;

      browserTaskQueue.queueFullPublishWorkflow({
        videoPath,
        title: title || 'Autonomous AI Breakthrough 2026',
        description: description || 'Generated autonomously by 10-Agent AI YouTube Automation OS.',
        thumbnailPath,
        tags: tags || ['AI', 'Tech', 'Automation', 'Future'],
        madeForKids: !!madeForKids,
        visibility: visibility || 'PUBLIC',
        requireConfirmation: requireConfirmation !== false,
        dryRun: !!dryRun
      });

      res.json({ message: 'Full visible publishing workflow initiated in browser' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Human publish confirmation endpoint
  router.post('/confirm-publish', (req, res) => {
    try {
      const { confirmed } = req.body;
      browserTaskQueue.confirmPublish(confirmed !== false);
      res.json({ message: confirmed !== false ? 'Publishing confirmed' : 'Publishing cancelled' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};
