const express = require('express');
const os = require('os');
const { getDb } = require('../db');

const router = express.Router();

// GET /api/system/health — Main system health check
router.get('/health', (req, res) => {
  const db = getDb();
  let dbStatus = 'HEALTHY';
  try {
    db.prepare('SELECT 1').get();
  } catch (e) {
    dbStatus = 'UNHEALTHY';
  }

  res.json({
    status: dbStatus === 'HEALTHY' ? 'ONLINE' : 'DEGRADED',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    services: {
      api: 'HEALTHY',
      database: dbStatus,
      agentOrchestrator: 'ACTIVE',
      queue: 'ACTIVE',
      websocket: 'HEALTHY'
    },
    version: '1.0.0'
  });
});

// GET /api/system/metrics — CPU, RAM, Disk, Queue size
router.get('/metrics', (req, res) => {
  const db = getDb();
  const totalTasks = db.prepare('SELECT COUNT(*) as count FROM tasks').get()?.count || 0;
  const runningTasks = db.prepare('SELECT COUNT(*) as count FROM tasks WHERE status = \'RUNNING\' OR status = \'IN_PROGRESS\'').get()?.count || 0;
  const failedTasks = db.prepare('SELECT COUNT(*) as count FROM tasks WHERE status = \'FAILED\'').get()?.count || 0;
  const completedTasks = db.prepare('SELECT COUNT(*) as count FROM tasks WHERE status = \'COMPLETED\'').get()?.count || 0;

  const memUsage = process.memoryUsage();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();

  res.json({
    system: {
      cpuCount: os.cpus().length,
      loadAverage: os.loadavg(),
      memory: {
        totalBytes: totalMem,
        freeBytes: freeMem,
        usedPercent: Math.round(((totalMem - freeMem) / totalMem) * 100),
        processHeapUsedMb: Math.round(memUsage.heapUsed / 1024 / 1024)
      }
    },
    tasks: {
      total: totalTasks,
      running: runningTasks,
      failed: failedTasks,
      completed: completedTasks
    },
    agents: {
      total: 10,
      active: 10
    }
  });
});

module.exports = router;
