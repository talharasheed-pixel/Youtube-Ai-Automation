const AuditLogger = require('./audit-logger');

/**
 * Quality Gate — enforces quality thresholds at each pipeline stage.
 * No important output moves through the pipeline without verification.
 */
class QualityGate {
  static THRESHOLDS = {
    MARKET_RESEARCH: { minScore: 55, requireSelfCheck: true },
    DEEP_RESEARCH: { minScore: 60, requireSelfCheck: true },
    SCRIPT_WRITING: { minScore: 65, requireSelfCheck: true },
    FACT_CHECK: { minScore: 70, requireSelfCheck: true, requireCrossCheck: true },
    VOICE_PRODUCTION: { minScore: 60, requireSelfCheck: true },
    VISUAL_GENERATION: { minScore: 55, requireSelfCheck: true },
    VIDEO_GENERATION: { minScore: 55, requireSelfCheck: true },
    VIDEO_EDITING: { minScore: 60, requireSelfCheck: true },
    SEO_PUBLISHING: { minScore: 65, requireSelfCheck: true },
    FINAL_QA: { minScore: 70, requireSelfCheck: true, requireCrossCheck: true },
  };

  /**
   * Validate output against quality gate for a given stage.
   * Returns { passed, score, issues, details }
   */
  static validate(stage, output) {
    const threshold = this.THRESHOLDS[stage];
    if (!threshold) {
      return { passed: true, score: 100, issues: [], details: 'No quality gate defined' };
    }

    const issues = [];
    let score = output.confidence_score || output.quality_score || 0;

    // Check self-check completion
    if (threshold.requireSelfCheck && !output.self_check_completed) {
      issues.push({ type: 'MISSING_SELF_CHECK', severity: 'HIGH', message: 'Self-check was not completed' });
      score = Math.min(score, 40);
    }

    // Check minimum score
    if (score < threshold.minScore) {
      issues.push({
        type: 'BELOW_THRESHOLD', severity: score < 30 ? 'CRITICAL' : 'HIGH',
        message: `Score ${score} is below minimum threshold ${threshold.minScore}`,
      });
    }

    // Check for critical issues in output
    if (output.issues_found && output.issues_found.length > 0) {
      const criticalIssues = output.issues_found.filter(i =>
        (typeof i === 'object' && i.severity === 'CRITICAL') ||
        (typeof i === 'string' && i.toLowerCase().includes('critical'))
      );
      if (criticalIssues.length > 0) {
        issues.push({ type: 'CRITICAL_ISSUES', severity: 'CRITICAL', message: `${criticalIssues.length} critical issues found` });
      }
    }

    // Fact check specific: check for false claims
    if (stage === 'FACT_CHECK' && output.false_claims && output.false_claims.length > 0) {
      issues.push({ type: 'FALSE_CLAIMS', severity: 'CRITICAL', message: `${output.false_claims.length} false claims detected` });
    }

    const passed = issues.filter(i => i.severity === 'CRITICAL').length === 0 && score >= threshold.minScore;

    AuditLogger.log('QUALITY_GATE_CHECK', {
      stage, passed, score, issueCount: issues.length,
      entityType: 'quality_gate',
    });

    return { passed, score, issues, details: passed ? 'Quality gate passed' : 'Quality gate failed' };
  }

  /**
   * Calculate final project score across all dimensions.
   */
  static calculateFinalScore(project) {
    const weights = {
      research: 0.10,
      factAccuracy: 0.15,
      script: 0.15,
      voice: 0.10,
      visual: 0.10,
      videoEditing: 0.15,
      thumbnail: 0.10,
      seo: 0.15,
    };

    const scores = {
      research: project.researchScore || 0,
      factAccuracy: project.factAccuracyScore || 0,
      script: project.scriptScore || 0,
      voice: project.voiceScore || 0,
      visual: project.visualScore || 0,
      videoEditing: project.videoEditingScore || 0,
      thumbnail: project.thumbnailScore || 0,
      seo: project.seoScore || 0,
    };

    let overallScore = 0;
    for (const [key, weight] of Object.entries(weights)) {
      overallScore += (scores[key] || 0) * weight;
    }

    return {
      overallScore: Math.round(overallScore),
      breakdown: scores,
      weights,
    };
  }
}

module.exports = QualityGate;
