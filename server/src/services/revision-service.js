const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db');
const AuditLogger = require('./audit-logger');

/**
 * RevisionService — Manages structured correction loops and historical artifact versions.
 *
 * Exact revision format per Master Orchestrator:
 * {
 *   "revision_id": "",
 *   "responsible_agent": "",
 *   "problem": "",
 *   "severity": "LOW | MEDIUM | HIGH | CRITICAL",
 *   "evidence": [],
 *   "required_correction": "",
 *   "affected_section": "",
 *   "status": "OPEN | IN_PROGRESS | RESOLVED | REJECTED"
 * }
 */
class RevisionService {
  /**
   * Create a structured revision request.
   */
  static createRevision({
    projectId,
    taskId,
    fromAgent = 'agent-fact-checker',
    responsibleAgent,
    toAgent, // alias
    stage,
    problem,
    reason, // alias
    severity = 'HIGH',
    evidence = [],
    requiredCorrection = '',
    correctionInstructions, // alias
    affectedSection = '',
    targetSection, // alias
    currentVersion = '1.0',
  }) {
    const db = getDb();
    const revisionId = uuidv4();
    const agent = responsibleAgent || toAgent;
    const desc = problem || reason || 'Quality correction required';
    const instructions = requiredCorrection || correctionInstructions || '';
    const section = affectedSection || targetSection || 'General';

    // Calculate next version: e.g. 1.0 -> 1.1
    const nextVersion = this.getNextVersion(currentVersion);

    db.prepare(`
      INSERT INTO revision_requests (
        id, project_id, task_id, from_agent, to_agent,
        problem, severity, evidence, required_fix,
        revision_status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', datetime('now'), datetime('now'))
    `).run(
      revisionId,
      projectId,
      taskId,
      fromAgent,
      agent,
      desc,
      severity,
      JSON.stringify(evidence),
      instructions
    );

    const revisionObj = {
      revision_id: revisionId,
      project_id: projectId,
      task_id: taskId,
      responsible_agent: agent,
      problem: desc,
      severity,
      evidence: Array.isArray(evidence) ? evidence : [evidence],
      required_correction: instructions,
      affected_section: section,
      current_version: currentVersion,
      next_version: nextVersion,
      status: 'OPEN',
    };

    AuditLogger.log('REVISION_REQUESTED', {
      projectId,
      taskId,
      fromAgent,
      toAgent: agent,
      severity,
      nextVersion,
      entityType: 'revision',
      entityId: revisionId,
    });

    return revisionObj;
  }

  /**
   * Resolve a revision request with updated version info
   */
  static resolveRevision(revisionId, resolutionNotes = '', newVersion = null) {
    const db = getDb();
    db.prepare(`
      UPDATE revision_requests
      SET revision_status = 'RESOLVED', resolved_at = datetime('now'), updated_at = datetime('now')
      WHERE id = ?
    `).run(revisionId);

    AuditLogger.log('REVISION_RESOLVED', {
      revisionId,
      resolutionNotes,
      newVersion,
      entityType: 'revision',
      entityId: revisionId,
    });
  }

  /**
   * Calculate incremental semantic versioning: 1.0 -> 1.1 -> 1.2
   */
  static getNextVersion(currentVersion = '1.0') {
    if (!currentVersion || typeof currentVersion !== 'string') return '1.1';
    const parts = currentVersion.split('.');
    if (parts.length === 2) {
      const major = parseInt(parts[0], 10) || 1;
      const minor = (parseInt(parts[1], 10) || 0) + 1;
      return `${major}.${minor}`;
    }
    return `${currentVersion}.1`;
  }

  /**
   * Get pending revisions for a project
   */
  static getPendingRevisions(projectId) {
    const db = getDb();
    return db.prepare(`
      SELECT * FROM revision_requests
      WHERE project_id = ? AND revision_status IN ('PENDING', 'OPEN', 'IN_PROGRESS')
      ORDER BY created_at DESC
    `).all(projectId);
  }

  /**
   * Get full revision history for a project
   */
  static getRevisionHistory(projectId) {
    const db = getDb();
    return db.prepare(`
      SELECT * FROM revision_requests
      WHERE project_id = ?
      ORDER BY created_at ASC
    `).all(projectId);
  }
}

module.exports = RevisionService;
