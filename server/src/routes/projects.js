const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db');
const AuditLogger = require('../services/audit-logger');

const router = express.Router();

// Get all projects
router.get('/', (req, res) => {
  const db = getDb();
  const projects = db.prepare(`
    SELECT p.*, ch.channel_name,
      (SELECT COUNT(*) FROM tasks WHERE project_id = p.id) as task_count,
      (SELECT COUNT(*) FROM tasks WHERE project_id = p.id AND status = 'COMPLETED') as completed_tasks,
      (SELECT COUNT(*) FROM revision_requests WHERE project_id = p.id) as revision_count
    FROM projects p
    LEFT JOIN channels ch ON ch.id = p.channel_id
    ORDER BY p.created_at DESC
  `).all();
  res.json({ projects });
});

// Get single project
router.get('/:id', (req, res) => {
  const db = getDb();
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const tasks = db.prepare('SELECT * FROM tasks WHERE project_id = ? ORDER BY created_at ASC').all(req.params.id);
  const research = db.prepare('SELECT * FROM research WHERE project_id = ? ORDER BY created_at DESC').all(req.params.id);
  const scripts = db.prepare('SELECT * FROM scripts WHERE project_id = ? ORDER BY created_at DESC').all(req.params.id);
  const factChecks = db.prepare('SELECT * FROM fact_checks WHERE project_id = ? ORDER BY created_at DESC').all(req.params.id);
  const assets = db.prepare('SELECT * FROM media_assets WHERE project_id = ? ORDER BY created_at ASC').all(req.params.id);
  const videos = db.prepare('SELECT * FROM videos WHERE project_id = ? ORDER BY created_at DESC').all(req.params.id);
  const thumbnails = db.prepare('SELECT * FROM thumbnails WHERE project_id = ?').all(req.params.id);
  const seo = db.prepare('SELECT * FROM seo_packages WHERE project_id = ? ORDER BY created_at DESC LIMIT 1').get(req.params.id);
  const revisions = db.prepare('SELECT * FROM revision_requests WHERE project_id = ? ORDER BY created_at ASC').all(req.params.id);
  const approvals = db.prepare('SELECT * FROM approvals WHERE project_id = ? ORDER BY created_at DESC').all(req.params.id);
  const publishingJobs = db.prepare('SELECT * FROM publishing_jobs WHERE project_id = ? ORDER BY created_at DESC').all(req.params.id);
  const analytics = db.prepare('SELECT * FROM analytics WHERE project_id = ? ORDER BY collected_at DESC').all(req.params.id);

  // Parse JSON fields
  const parseJson = (obj, fields) => {
    if (!obj) return obj;
    const result = { ...obj };
    fields.forEach(f => { if (result[f]) try { result[f] = JSON.parse(result[f]); } catch(e) {} });
    return result;
  };

  res.json({
    project,
    tasks,
    research: research.map(r => parseJson(r, ['verified_facts', 'important_context', 'interesting_angles', 'audience_questions', 'misinformation_risks', 'market_evidence', 'competitor_analysis', 'topic_scores', 'risks'])),
    scripts: scripts.map(s => parseJson(s, ['scene_breakdown', 'visual_suggestions', 'retention_strategy', 'fact_references', 'self_review'])),
    factChecks: factChecks.map(f => parseJson(f, ['verified_claims', 'unverified_claims', 'misleading_claims', 'false_claims', 'required_corrections'])),
    assets,
    videos: videos.map(v => parseJson(v, ['issues_found'])),
    thumbnails,
    seo: parseJson(seo, ['title_options', 'keywords', 'hashtags', 'chapters']),
    revisions,
    approvals,
    publishingJobs,
    analytics,
  });
});

// Helper to generate YT-YYYY-XXXX format ID
function generateProjectId(db) {
  const year = new Date().getFullYear();
  const countRow = db.prepare('SELECT COUNT(*) as count FROM projects').get();
  const nextNum = (countRow?.count || 0) + 1;
  const padded = String(nextNum).padStart(4, '0');
  return `YT-${year}-${padded}`;
}

// Create project
router.post('/', (req, res) => {
  const {
    title,
    topic,
    channelId,
    niche,
    targetAudience,
    primaryLanguage,
    secondaryLanguage,
    formatType, // Long-form / Shorts
    targetDuration,
    contentStyle,
    tone,
    uploadFrequency,
    geographicAudience,
    contentRestrictions,
    monetizationObjective,
    qualityTarget,
    budgetConstraints,
    availableProviders,
    approvalRequirements,
  } = req.body;

  if (!title) return res.status(400).json({ error: 'Title is required' });

  const db = getDb();
  const id = generateProjectId(db);

  db.prepare(`
    INSERT INTO projects (
      id, title, topic, channel_id, niche, target_audience,
      primary_language, secondary_language, language, format_type,
      video_format, target_duration, content_style, tone,
      upload_frequency, geographic_audience, content_restrictions,
      monetization_objective, quality_target, budget_limit,
      provider_preferences, approval_requirements, current_stage, status
    ) VALUES (
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?,
      ?, ?, ?,
      ?, ?, 'CREATED', 'ACTIVE'
    )
  `).run(
    id,
    title,
    topic || title,
    channelId || null,
    niche || '',
    targetAudience || '',
    primaryLanguage || 'en',
    secondaryLanguage || null,
    primaryLanguage || 'en',
    formatType || 'Long-form',
    formatType === 'Shorts' ? '9:16' : '16:9',
    targetDuration || (formatType === 'Shorts' ? '< 60s' : '10-15 min'),
    contentStyle || '',
    tone || 'Engaging & Informative',
    uploadFrequency || 'Weekly',
    geographicAudience || 'Global',
    contentRestrictions || 'None',
    monetizationObjective || 'AdSense & Brand Value',
    qualityTarget || 'PREMIUM',
    typeof budgetConstraints === 'number' ? budgetConstraints : 10.0,
    typeof availableProviders === 'object' ? JSON.stringify(availableProviders) : (availableProviders || null),
    typeof approvalRequirements === 'object' ? JSON.stringify(approvalRequirements) : (approvalRequirements || 'Topic & Final Approval Required')
  );

  AuditLogger.log('PROJECT_INITIALIZED', {
    projectId: id,
    title,
    niche,
    formatType,
    entityType: 'project',
    entityId: id,
  });

  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
  res.status(201).json({ project });
});

// Update project
router.put('/:id', (req, res) => {
  const { title, topic, niche, targetAudience, language, contentStyle, videoFormat, targetDuration } = req.body;
  const db = getDb();

  db.prepare(`
    UPDATE projects SET title = COALESCE(?, title), topic = COALESCE(?, topic),
    niche = COALESCE(?, niche), target_audience = COALESCE(?, target_audience),
    language = COALESCE(?, language), content_style = COALESCE(?, content_style),
    video_format = COALESCE(?, video_format), target_duration = COALESCE(?, target_duration),
    updated_at = datetime('now') WHERE id = ?
  `).run(title, topic, niche, targetAudience, language, contentStyle, videoFormat, targetDuration, req.params.id);

  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  res.json({ project });
});

// Project commands: START, PAUSE, RESUME, APPROVE, REVISE, REJECT, CANCEL
router.post('/:id/command', async (req, res) => {
  const { command, data } = req.body;
  const db = getDb();
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  AuditLogger.log('PROJECT_COMMAND', {
    projectId: req.params.id, command,
    entityType: 'project', entityId: req.params.id,
  });

  try {
    switch (command) {
      case 'START':
        const workflowEngine = req.app.get('workflowEngine');
        if (!workflowEngine) return res.status(500).json({ error: 'Workflow engine not initialized' });
        // Don't await — run async
        workflowEngine.startWorkflow(req.params.id).catch(err => {
          console.error('Workflow error:', err);
        });
        res.json({ message: 'Workflow started', projectId: req.params.id });
        break;

      case 'PAUSE':
        db.prepare('UPDATE projects SET status = ?, updated_at = datetime(\'now\') WHERE id = ?').run('PAUSED', req.params.id);
        res.json({ message: 'Project paused' });
        break;

      case 'RESUME':
        db.prepare('UPDATE projects SET status = ?, updated_at = datetime(\'now\') WHERE id = ?').run('ACTIVE', req.params.id);
        res.json({ message: 'Project resumed' });
        break;

      case 'APPROVE':
        const we = req.app.get('workflowEngine');
        we?.continueAfterApproval(req.params.id, project.current_stage, {
          action: 'APPROVE',
          ...data,
        }).catch(err => console.error('Approval continuation error:', err));
        res.json({ message: 'Approved' });
        break;

      case 'REVISE':
        const mgr = req.app.get('managerAgent');
        if (mgr) {
          await mgr.handleHumanRevision(req.params.id, {
            component: data?.component || data?.reviseStage || 'General',
            notes: data?.notes || 'Revision requested by owner',
            severity: data?.severity || 'HIGH',
          });
        }
        res.json({ message: 'Revision requested and routed to agent' });
        break;

      case 'REJECT':
        db.prepare('UPDATE projects SET status = ?, updated_at = datetime(\'now\') WHERE id = ?').run('REJECTED', req.params.id);
        res.json({ message: 'Project rejected' });
        break;

      case 'CANCEL':
        db.prepare('UPDATE projects SET status = ?, updated_at = datetime(\'now\') WHERE id = ?').run('CANCELLED', req.params.id);
        res.json({ message: 'Project cancelled' });
        break;

      case 'PUBLISH_NOW':
        const we3 = req.app.get('workflowEngine');
        we3?.continueAfterApproval(req.params.id, 'HUMAN_APPROVAL', {
          action: 'PUBLISH_NOW',
          ...data,
        }).catch(err => console.error('Publish error:', err));
        res.json({ message: 'Publishing initiated' });
        break;

      case 'SCHEDULE':
        db.prepare('UPDATE projects SET status = ?, updated_at = datetime(\'now\') WHERE id = ?').run('SCHEDULED', req.params.id);
        res.json({ message: 'Scheduled' });
        break;

      case 'RETRY_TASK':
        if (data?.taskId) {
          db.prepare('UPDATE tasks SET status = ?, retry_count = retry_count + 1, updated_at = datetime(\'now\') WHERE id = ?')
            .run('QUEUED', data.taskId);
        }
        res.json({ message: 'Task retry queued' });
        break;

      default:
        res.status(400).json({ error: `Unknown command: ${command}` });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete project
router.delete('/:id', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);
  AuditLogger.log('PROJECT_DELETED', { projectId: req.params.id, entityType: 'project', entityId: req.params.id });
  res.json({ message: 'Project deleted' });
});

// Get dashboard stats
router.get('/stats/overview', (req, res) => {
  const db = getDb();
  const stats = {
    totalProjects: db.prepare('SELECT COUNT(*) as count FROM projects').get().count,
    activeProjects: db.prepare("SELECT COUNT(*) as count FROM projects WHERE status = 'ACTIVE'").get().count,
    completedProjects: db.prepare("SELECT COUNT(*) as count FROM projects WHERE status = 'COMPLETED'").get().count,
    publishedProjects: db.prepare("SELECT COUNT(*) as count FROM projects WHERE current_stage = 'COMPLETED' OR status = 'PUBLISHED'").get().count,
    failedTasks: db.prepare("SELECT COUNT(*) as count FROM tasks WHERE status = 'FAILED'").get().count,
    pendingApprovals: db.prepare("SELECT COUNT(*) as count FROM projects WHERE current_stage IN ('TOPIC_REVIEW', 'HUMAN_APPROVAL')").get().count,
    totalRevisions: db.prepare('SELECT COUNT(*) as count FROM revision_requests').get().count,
    recentProjects: db.prepare('SELECT * FROM projects ORDER BY created_at DESC LIMIT 5').all(),
  };
  res.json(stats);
});

module.exports = router;
