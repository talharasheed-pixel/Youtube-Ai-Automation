const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const config = require('./config');

// Routes
const { router: authRouter } = require('./routes/auth');
const projectsRouter = require('./routes/projects');
const agentsRouter = require('./routes/agents');
const tasksRouter = require('./routes/tasks');
const assetsRouter = require('./routes/assets');
const workflowRouter = require('./routes/workflow');
const youtubeRouter = require('./routes/youtube');
const settingsRouter = require('./routes/settings');
const systemRouter = require('./routes/system');

function createApp() {
  const app = express();

  // Middleware
  app.use(helmet({ crossOriginResourcePolicy: false, contentSecurityPolicy: false }));
  app.use(cors({ origin: true, credentials: true })); // Allow all origins (desktop app, cloud, etc.)
  app.use(morgan('dev'));
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Serve static media files
  app.use('/media', express.static(path.join(config.paths.storage)));

  // API routes
  app.use('/api/auth', authRouter);
  app.use('/api/projects', projectsRouter);
  app.use('/api/agents', agentsRouter);
  app.use('/api/tasks', tasksRouter);
  app.use('/api/assets', assetsRouter);
  app.use('/api/workflow', workflowRouter);
  app.use('/api/youtube', youtubeRouter);
  app.use('/api/settings', settingsRouter);
  app.use('/api/system', systemRouter);

  // Health checks
  app.get(['/health', '/api/health'], (req, res) => {
    res.json({
      status: 'ONLINE',
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    });
  });

  // Serve frontend — check multiple possible locations
  const fs = require('fs');
  const possibleDistPaths = [
    path.join(__dirname, '../../client/dist'),
    path.join(__dirname, '../client/dist'),
    path.join(__dirname, '../dist'),
  ];
  const distPath = possibleDistPaths.find(p => fs.existsSync(p)) || possibleDistPaths[0];

  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    // Only serve index.html for non-API routes
    if (req.path.startsWith('/api/') || req.path.startsWith('/media/') || req.path.startsWith('/socket.io/')) {
      return next();
    }
    const indexPath = path.join(distPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      next();
    }
  });

  // Error handler
  app.use((err, req, res, next) => {
    console.error('[ERROR]', err.stack);
    res.status(err.status || 500).json({
      error: config.isDev ? err.message : 'Internal server error',
      ...(config.isDev && { stack: err.stack }),
    });
  });

  return app;
}

module.exports = { createApp };
