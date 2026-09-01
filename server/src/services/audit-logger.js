const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db');

/**
 * Audit Logger — logs all significant actions without exposing secrets.
 */
class AuditLogger {
  static log(action, details = {}) {
    const db = getDb();
    const id = uuidv4();

    // Strip sensitive fields
    const safeDetails = { ...details };
    const sensitiveKeys = ['password', 'token', 'api_key', 'apiKey', 'secret', 'access_token', 'refresh_token'];
    for (const key of sensitiveKeys) {
      if (safeDetails[key]) safeDetails[key] = '[REDACTED]';
    }

    db.prepare(`
      INSERT INTO audit_logs (id, user_id, project_id, agent_id, action, entity_type, entity_id, details)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      details.userId || null,
      details.projectId || null,
      details.agentId || null,
      action,
      details.entityType || null,
      details.entityId || null,
      JSON.stringify(safeDetails)
    );

    if (details.severity === 'CRITICAL') {
      console.error(`[AUDIT][CRITICAL] ${action}:`, safeDetails);
    } else {
      console.log(`[AUDIT] ${action}:`, details.entityType || '', details.entityId || '');
    }

    return id;
  }

  static getRecent(limit = 50, projectId = null) {
    const db = getDb();
    if (projectId) {
      return db.prepare('SELECT * FROM audit_logs WHERE project_id = ? ORDER BY created_at DESC LIMIT ?').all(projectId, limit);
    }
    return db.prepare('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ?').all(limit);
  }
}

module.exports = AuditLogger;
