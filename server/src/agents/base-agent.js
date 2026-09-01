const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db');
const AuditLogger = require('../services/audit-logger');
const HandoffService = require('../services/handoff-service');

/**
 * BaseAgent — Abstract base class for all 10 specialized agents.
 *
 * Every agent must:
 * 1. Perform its assigned task
 * 2. Perform a self-check
 * 3. Produce structured output
 * 4. Pass output to the assigned next agent via handoff
 */
class BaseAgent {
  constructor(agentId, role, providerRouter) {
    this.agentId = agentId;
    this.role = role;
    this.providerRouter = providerRouter;
    this.maxRetries = 3;
  }

  /**
   * Execute the agent's primary task. Subclasses must implement _execute().
   */
  async run(projectId, input, io = null) {
    const db = getDb();
    const taskId = uuidv4();
    const runId = uuidv4();

    // Create task record
    db.prepare(`
      INSERT INTO tasks (id, project_id, agent_id, task_type, stage, status, input_data, input_version)
      VALUES (?, ?, ?, ?, ?, 'ACTIVE', ?, 1)
    `).run(taskId, projectId, this.agentId, this.role, this.role, JSON.stringify(input));

    // Create agent run record
    db.prepare(`
      INSERT INTO agent_runs (id, agent_id, task_id, project_id, status, input_data, started_at)
      VALUES (?, ?, ?, ?, 'RUNNING', ?, datetime('now'))
    `).run(runId, this.agentId, taskId, projectId, JSON.stringify(input));

    // Update agent status
    db.prepare(`
      UPDATE agents SET status = 'ACTIVE', current_task_id = ?, current_project_id = ?,
      last_activity = datetime('now'), updated_at = datetime('now') WHERE id = ?
    `).run(taskId, projectId, this.agentId);

    // Emit real-time update
    if (io) {
      io.to(`project:${projectId}`).emit('agent:status', {
        agentId: this.agentId, status: 'ACTIVE', taskId, projectId,
      });
    }

    AuditLogger.log('AGENT_STARTED', {
      agentId: this.agentId, projectId, taskId,
      entityType: 'task', entityId: taskId,
    });

    const startTime = Date.now();

    try {
      // 1. Execute the task
      const output = await this._execute(projectId, input);

      // 2. Self-check
      const selfCheck = await this._selfCheck(output);

      // 3. Package result
      const result = {
        ...output,
        self_check_completed: true,
        self_check: selfCheck,
        confidence_score: output.confidence_score || selfCheck.score || 70,
        quality_score: output.quality_score || selfCheck.score || 70,
      };

      const duration = Date.now() - startTime;

      // Update task
      db.prepare(`
        UPDATE tasks SET status = 'COMPLETED', output_data = ?, confidence_score = ?,
        quality_score = ?, self_check_passed = 1, completed_at = datetime('now'),
        updated_at = datetime('now') WHERE id = ?
      `).run(JSON.stringify(result), result.confidence_score, result.quality_score, taskId);

      // Update agent run
      db.prepare(`
        UPDATE agent_runs SET status = 'COMPLETED', output_data = ?, confidence_score = ?,
        quality_score = ?, duration_ms = ?, completed_at = datetime('now') WHERE id = ?
      `).run(JSON.stringify(result), result.confidence_score, result.quality_score, duration, runId);

      // Update agent
      db.prepare(`
        UPDATE agents SET status = 'IDLE', current_task_id = NULL,
        success_count = success_count + 1, last_activity = datetime('now'),
        updated_at = datetime('now') WHERE id = ?
      `).run(this.agentId);

      AuditLogger.log('AGENT_COMPLETED', {
        agentId: this.agentId, projectId, taskId, duration,
        confidenceScore: result.confidence_score,
        entityType: 'task', entityId: taskId,
      });

      if (io) {
        io.to(`project:${projectId}`).emit('agent:status', {
          agentId: this.agentId, status: 'COMPLETED', taskId, projectId, result,
        });
        io.to(`project:${projectId}`).emit('task:completed', {
          taskId, agentId: this.agentId, stage: this.role, result,
        });
      }

      return { taskId, runId, result };

    } catch (error) {
      const duration = Date.now() - startTime;

      // Update task as failed
      db.prepare(`
        UPDATE tasks SET status = 'FAILED', error_message = ?, updated_at = datetime('now') WHERE id = ?
      `).run(error.message, taskId);

      // Update agent run
      db.prepare(`
        UPDATE agent_runs SET status = 'FAILED', error_message = ?, duration_ms = ?,
        completed_at = datetime('now') WHERE id = ?
      `).run(error.message, duration, runId);

      // Update agent
      db.prepare(`
        UPDATE agents SET status = 'FAILED', failure_count = failure_count + 1,
        last_activity = datetime('now'), updated_at = datetime('now') WHERE id = ?
      `).run(this.agentId);

      // Record error
      db.prepare(`
        INSERT INTO errors (id, project_id, agent_id, task_id, error_type, severity, message, recommended_action)
        VALUES (?, ?, ?, ?, 'AGENT_FAILURE', 'HIGH', ?, 'Retry or escalate to manager')
      `).run(uuidv4(), projectId, this.agentId, taskId, error.message);

      AuditLogger.log('AGENT_FAILED', {
        agentId: this.agentId, projectId, taskId, error: error.message,
        severity: 'HIGH', entityType: 'task', entityId: taskId,
      });

      if (io) {
        io.to(`project:${projectId}`).emit('agent:status', {
          agentId: this.agentId, status: 'FAILED', taskId, error: error.message,
        });
      }

      throw error;
    }
  }

  /**
   * Subclasses must implement the actual task logic.
   */
  async _execute(projectId, input) {
    throw new Error('_execute() must be implemented by subclass');
  }

  /**
   * Default self-check — subclasses should override with specific validation.
   */
  async _selfCheck(output) {
    const issues = [];

    if (!output || typeof output !== 'object') {
      issues.push({ type: 'INVALID_OUTPUT', message: 'Output is not a valid object' });
    }

    if (output && output.confidence_score !== undefined && output.confidence_score < 30) {
      issues.push({ type: 'LOW_CONFIDENCE', message: `Confidence score ${output.confidence_score} is very low` });
    }

    return {
      passed: issues.length === 0,
      score: issues.length === 0 ? 80 : 40,
      issues,
    };
  }

  /**
   * Create a handoff message to the next agent.
   */
  createHandoff(projectId, taskId, toAgent, output) {
    return HandoffService.createHandoff({
      projectId,
      taskId,
      fromAgent: this.agentId,
      toAgent,
      status: 'COMPLETED',
      confidenceScore: output.confidence_score || 70,
      selfCheckCompleted: true,
      issuesFound: output.self_check?.issues || [],
      reviewRequired: true,
      nextAction: `Review by ${toAgent}`,
    });
  }

  /**
   * Helper to call LLM provider with structured prompt.
   */
  async callLLM(systemPrompt, userPrompt, options = {}) {
    if (!this.providerRouter) {
      return null;
    }

    try {
      return await this.providerRouter.generate({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: options.temperature ?? 0.7,
        maxTokens: options.maxTokens || 4096,
        responseFormat: options.jsonMode ? { type: 'json_object' } : undefined,
      }, options);
    } catch (err) {
      console.warn(`[${this.agentId}] Provider generation failed:`, err.message);
      return null;
    }
  }

  /**
   * Parse JSON from LLM response, with fallback.
   */
  parseJsonResponse(content) {
    try {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1].trim());
      }
      return JSON.parse(content);
    } catch (e) {
      // Return content as a wrapped object
      return { raw_content: content, parse_error: true };
    }
  }
}

module.exports = BaseAgent;
