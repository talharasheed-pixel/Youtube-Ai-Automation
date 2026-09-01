const express = require('express');
const router = express.Router();

// Get YouTube auth URL
router.get('/auth-url', (req, res) => {
  try {
    const ytService = req.app.get('youtubeService');
    const url = ytService.getAuthUrl();
    res.json({ url });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// OAuth callback (supports both /callback and /oauth2callback)
router.get(['/callback', '/oauth2callback'], async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) return res.status(400).json({ error: 'Authorization code missing' });

    const ytService = req.app.get('youtubeService');
    const result = await ytService.handleCallback(code, 'default');

    // Redirect back to dashboard
    const host = req.get('host');
    const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
    const baseUrl = process.env.RENDER_EXTERNAL_URL || `${protocol}://${host}`;
    res.redirect(`${baseUrl}/settings?youtube=connected&channel=${encodeURIComponent(result.channelName)}`);
  } catch (error) {
    const host = req.get('host');
    const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
    const baseUrl = process.env.RENDER_EXTERNAL_URL || `${protocol}://${host}`;
    res.redirect(`${baseUrl}/settings?youtube=error&message=${encodeURIComponent(error.message)}`);
  }
});

// Get connected channels
router.get('/channels', (req, res) => {
  const ytService = req.app.get('youtubeService');
  const channels = ytService.getChannels();
  res.json({ channels });
});

// Publish video
router.post('/publish/:jobId', async (req, res) => {
  try {
    const ytService = req.app.get('youtubeService');
    const result = await ytService.uploadVideo(req.params.jobId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Collect analytics
router.post('/analytics/:projectId', async (req, res) => {
  try {
    const ytService = req.app.get('youtubeService');
    const { youtubeVideoId } = req.body;
    const result = await ytService.collectAnalytics(req.params.projectId, youtubeVideoId);
    res.json(result || { message: 'No data available' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
