const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db');

/**
 * Cost Tracker — monitors and enforces budget limits across providers.
 */
class CostTracker {
  constructor(budgetConfig) {
    this.budget = budgetConfig;
  }

  trackCost(projectId, providerType, providerName, operation, estimatedCost, actualCost = 0, tokensUsed = 0) {
    const db = getDb();
    db.prepare(`
      INSERT INTO cost_entries (id, project_id, provider_type, provider_name, operation, estimated_cost, actual_cost, tokens_used)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(uuidv4(), projectId, providerType, providerName, operation, estimatedCost, actualCost || estimatedCost, tokensUsed);

    // Update project actual cost
    db.prepare(`
      UPDATE projects SET actual_cost = actual_cost + ?, updated_at = datetime('now') WHERE id = ?
    `).run(actualCost || estimatedCost, projectId);
  }

  checkBudget(projectId) {
    const db = getDb();
    const project = db.prepare('SELECT actual_cost FROM projects WHERE id = ?').get(projectId);
    const dailyTotal = db.prepare(`
      SELECT COALESCE(SUM(actual_cost), 0) as total FROM cost_entries
      WHERE date(created_at) = date('now')
    `).get();
    const monthlyTotal = db.prepare(`
      SELECT COALESCE(SUM(actual_cost), 0) as total FROM cost_entries
      WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')
    `).get();

    return {
      projectCost: project?.actual_cost || 0,
      projectBudget: this.budget.projectUsd,
      projectOverBudget: (project?.actual_cost || 0) >= this.budget.projectUsd,
      dailyCost: dailyTotal.total,
      dailyBudget: this.budget.dailyUsd,
      dailyOverBudget: dailyTotal.total >= this.budget.dailyUsd,
      monthlyCost: monthlyTotal.total,
      monthlyBudget: this.budget.monthlyUsd,
      monthlyOverBudget: monthlyTotal.total >= this.budget.monthlyUsd,
    };
  }

  canSpend(projectId, estimatedCost) {
    const budget = this.checkBudget(projectId);
    if (budget.projectOverBudget || budget.dailyOverBudget || budget.monthlyOverBudget) {
      return { allowed: false, reason: budget.projectOverBudget ? 'Project budget exceeded' : budget.dailyOverBudget ? 'Daily budget exceeded' : 'Monthly budget exceeded', budget };
    }
    return { allowed: true, budget };
  }

  getProjectCosts(projectId) {
    const db = getDb();
    return db.prepare('SELECT * FROM cost_entries WHERE project_id = ? ORDER BY created_at DESC').all(projectId);
  }
}

module.exports = CostTracker;
