const express = require('express');
const { getDb } = require('../db');
const WorkflowEngine = require('../services/workflow-engine');
const router = express.Router();

// Get workflow stages
router.get('/stages', (req, res) => {
  res.json({ stages: WorkflowEngine.STAGES, stageAgents: WorkflowEngine.STAGE_AGENTS });
});

// Get workflow state for a project
router.get('/:projectId/state', (req, res) => {
  const workflowEngine = req.app.get('workflowEngine');
  const state = workflowEngine?.getWorkflowState(req.params.projectId) || { status: 'IDLE' };
  const db = getDb();
  const project = db.prepare('SELECT current_stage, status FROM projects WHERE id = ?').get(req.params.projectId);

  res.json({
    ...state,
    currentStage: project?.current_stage || 'CREATED',
    projectStatus: project?.status || 'UNKNOWN',
    stageIndex: workflowEngine?.getStageIndex(project?.current_stage) || 0,
    totalStages: WorkflowEngine.STAGES.length,
  });
});

// Get handoff history
router.get('/:projectId/handoffs', (req, res) => {
  const HandoffService = require('../services/handoff-service');
  const handoffs = HandoffService.getProjectHandoffs(req.params.projectId);
  res.json({ handoffs });
});

// Get revision history
router.get('/:projectId/revisions', (req, res) => {
  const RevisionService = require('../services/revision-service');
  const revisions = RevisionService.getRevisionHistory(req.params.projectId);
  res.json({ revisions });
});

// Get quality report
router.get('/:projectId/quality', (req, res) => {
  const db = getDb();
  const project = db.prepare('SELECT overall_score, score_breakdown FROM projects WHERE id = ?').get(req.params.projectId);
  res.json({
    overallScore: project?.overall_score || 0,
    breakdown: project?.score_breakdown ? JSON.parse(project.score_breakdown) : null,
  });
});

// Get approval package
router.get('/:projectId/approval-package', (req, res) => {
  const managerAgent = req.app.get('managerAgent');
  if (!managerAgent) return res.status(500).json({ error: 'Manager not initialized' });
  const pkg = managerAgent.getApprovalPackage(req.params.projectId);
  res.json(pkg);
});

// Get errors for a project
router.get('/:projectId/errors', (req, res) => {
  const db = getDb();
  const errors = db.prepare('SELECT * FROM errors WHERE project_id = ? ORDER BY created_at DESC').all(req.params.projectId);
  res.json({ errors });
});

// Get audit logs for a project
router.get('/:projectId/audit', (req, res) => {
  const AuditLogger = require('../services/audit-logger');
  const logs = AuditLogger.getRecent(100, req.params.projectId);
  res.json({ logs });
});

module.exports = router;
