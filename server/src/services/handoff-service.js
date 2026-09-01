const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db');
const AuditLogger = require('./audit-logger');

/**
 * HandoffService — Enforces structured inter-agent communication.
 *
 * Required fields per specification:
 * - project_id
 * - task_id
 * - source_agent
 * - destination_agent
 * - task
 * - input_reference
 * - output_reference
 * - version
 * - status
 * - confidence_score
 * - self_check
 * - issues
 * - required_action
 */
class HandoffService {
  /**
   * Create and record a structured handoff message.
   */
  static createHandoff({
    projectId,
    taskId,
    sourceAgent,
    destinationAgent,
    fromAgent, // alias support
    toAgent,   // alias support
    task,
    inputReference = null,
    outputReference = null,
    version = '1.0',
    status = 'READY_FOR_REVIEW',
    confidenceScore = null,
    selfCheck = true,
    issues = [],
    issuesFound = [], // alias support
    requiredAction = '',
  }) {
    const db = getDb();
    const handoffId = uuidv4();
    const src = sourceAgent || fromAgent;
    const dest = destinationAgent || toAgent;
    const issueList = issues.length > 0 ? issues : issuesFound;

    const handoffData = {
      project_id: projectId,
      task_id: taskId,
      source_agent: src,
      destination_agent: dest,
      task: task || `Handoff from ${src} to ${dest}`,
      input_reference: inputReference,
      output_reference: outputReference,
      version: String(version),
      status: status || 'READY_FOR_REVIEW',
      confidence_score: typeof confidenceScore === 'number' ? confidenceScore : null,
      self_check: !!selfCheck,
      issues: issueList,
      required_action: requiredAction || `Review and process by ${dest}`,
    };

    db.prepare(`
      INSERT INTO handoff_messages (
        id, project_id, task_id, from_agent, to_agent,
        stage_from, stage_to, handoff_data, status,
        confidence_score, self_check_completed, issues_found,
        review_required, next_action, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, datetime('now'))
    `).run(
      handoffId,
      projectId,
      taskId,
      src,
      dest,
      src,
      dest,
      JSON.stringify(handoffData),
      status,
      handoffData.confidence_score,
      handoffData.self_check ? 1 : 0,
      JSON.stringify(issueList),
      handoffData.required_action
    );

    AuditLogger.log('AGENT_HANDOFF', {
      projectId,
      taskId,
      fromAgent: src,
      toAgent: dest,
      version: handoffData.version,
      confidenceScore: handoffData.confidence_score,
      status: handoffData.status,
      entityType: 'handoff',
      entityId: handoffId,
    });

    return { handoffId, ...handoffData };
  }

  /**
   * Get all handoffs for a project
   */
  static getProjectHandoffs(projectId) {
    const db = getDb();
    const rows = db.prepare(`
      SELECT * FROM handoff_messages WHERE project_id = ? ORDER BY created_at ASC
    `).all(projectId);

    return rows.map((r) => {
      let parsedData = {};
      try {
        parsedData = JSON.parse(r.handoff_data || '{}');
      } catch (e) {}
      return {
        id: r.id,
        projectId: r.project_id,
        taskId: r.task_id,
        sourceAgent: r.from_agent,
        destinationAgent: r.to_agent,
        task: parsedData.task || r.next_action,
        version: parsedData.version || '1.0',
        status: r.status,
        confidenceScore: r.confidence_score,
        selfCheck: !!r.self_check_completed,
        issues: JSON.parse(r.issues_found || '[]'),
        requiredAction: r.next_action,
        createdAt: r.created_at,
      };
    });
  }
}

module.exports = HandoffService;
