const EventEmitter = require('events');
const { getDb } = require('../db');
const AuditLogger = require('./audit-logger');

/**
 * Workflow Engine — Core orchestration engine implementing the pipeline state machine.
 *
 * Pipeline stages in order:
 * CREATED → MARKET_RESEARCH → TOPIC_REVIEW → DEEP_RESEARCH → SCRIPT_WRITING →
 * FACT_CHECK → VOICE_VISUAL → VIDEO_GENERATION → VIDEO_EDITING →
 * SEO_PUBLISHING → FINAL_QA → HUMAN_APPROVAL → PUBLISHING → MONITORING → COMPLETED
 */
class WorkflowEngine extends EventEmitter {
  static STAGES = [
    'CREATED',
    'MARKET_RESEARCH',
    'TOPIC_REVIEW',
    'DEEP_RESEARCH',
    'SCRIPT_WRITING',
    'FACT_CHECK',
    'VOICE_VISUAL',
    'VIDEO_GENERATION',
    'VIDEO_EDITING',
    'SEO_PUBLISHING',
    'FINAL_QA',
    'HUMAN_APPROVAL',
    'PUBLISHING',
    'MONITORING',
    'COMPLETED',
  ];

  static STAGE_AGENTS = {
    MARKET_RESEARCH: ['agent-market-intel'],
    DEEP_RESEARCH: ['agent-deep-research'],
    SCRIPT_WRITING: ['agent-scriptwriter'],
    FACT_CHECK: ['agent-fact-checker'],
    VOICE_VISUAL: ['agent-voice', 'agent-visual'], // Parallel
    VIDEO_GENERATION: ['agent-video-gen'],
    VIDEO_EDITING: ['agent-editor'],
    SEO_PUBLISHING: ['agent-seo'],
    FINAL_QA: ['agent-manager'],
  };

  constructor(managerAgent, io = null) {
    super();
    this.manager = managerAgent;
    this.io = io;
    this.activeWorkflows = new Map();
  }

  /**
   * Start a full workflow for a project
   */
  async startWorkflow(projectId) {
    const db = getDb();
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
    if (!project) throw new Error(`Project ${projectId} not found`);

    this.activeWorkflows.set(projectId, {
      status: 'RUNNING',
      currentStage: 'MARKET_RESEARCH',
      startedAt: new Date().toISOString(),
    });

    db.prepare('UPDATE projects SET status = ?, current_stage = ?, updated_at = datetime(\'now\') WHERE id = ?')
      .run('ACTIVE', 'MARKET_RESEARCH', projectId);

    AuditLogger.log('WORKFLOW_STARTED', {
      projectId, entityType: 'project', entityId: projectId,
    });

    this.emit('workflow:started', { projectId });

    // Run automated stages sequentially
    try {
      await this._runAutomatedPipeline(projectId, project);
    } catch (error) {
      this.activeWorkflows.set(projectId, { status: 'FAILED', error: error.message });
      AuditLogger.log('WORKFLOW_FAILED', {
        projectId, error: error.message, severity: 'HIGH',
        entityType: 'project', entityId: projectId,
      });
    }
  }

  async _runAutomatedPipeline(projectId, project) {
    const db = getDb();
    let accumulated = {};

    // Stage 1: Market Research
    const research = await this.manager.runStage(projectId, 'MARKET_RESEARCH', {
      niche: project.niche || 'technology',
      targetAudience: project.target_audience,
      channelStyle: project.content_style,
    });
    accumulated.marketResearch = research.result?.result;

    // Stage: Topic Review — requires human approval
    db.prepare('UPDATE projects SET current_stage = ?, updated_at = datetime(\'now\') WHERE id = ?')
      .run('TOPIC_REVIEW', projectId);

    if (this.io) {
      this.io.to(`project:${projectId}`).emit('approval:required', {
        projectId, stage: 'TOPIC_REVIEW', type: 'topic_approval',
        message: 'Review topic recommendations and select a topic to proceed.',
        data: accumulated.marketResearch,
      });
    }

    // Workflow pauses here — human must approve topic
    this.activeWorkflows.set(projectId, {
      status: 'WAITING_APPROVAL',
      currentStage: 'TOPIC_REVIEW',
      accumulated,
    });
  }

  /**
   * Continue workflow after human approval at a given stage
   */
  async continueAfterApproval(projectId, stage, approvalData = {}) {
    const db = getDb();
    const workflow = this.activeWorkflows.get(projectId) || {};
    const accumulated = workflow.accumulated || {};
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);

    // Record approval
    db.prepare(`
      INSERT INTO approvals (id, project_id, approval_type, stage, action, notes)
      VALUES (?, ?, 'STAGE_APPROVAL', ?, ?, ?)
    `).run(require('uuid').v4(), projectId, stage, approvalData.action || 'APPROVE', approvalData.notes || '');

    AuditLogger.log('HUMAN_APPROVAL', {
      projectId, stage, action: approvalData.action,
      entityType: 'approval', entityId: projectId,
    });

    try {
      const pipelineStages = ['TOPIC_REVIEW', 'DEEP_RESEARCH', 'SCRIPT_WRITING', 'FACT_CHECK', 'VOICE_VISUAL', 'VIDEO_GENERATION', 'VIDEO_EDITING', 'SEO_PUBLISHING', 'FINAL_QA'];
      if (pipelineStages.includes(stage) || pipelineStages.includes(project.current_stage)) {
        // Update project with selected topic if provided
        const selectedTopic = approvalData.selectedTopic || project.topic || project.title;
        db.prepare('UPDATE projects SET topic = ?, updated_at = datetime(\'now\') WHERE id = ?')
          .run(selectedTopic, projectId);

        // Stage 2: Deep Research (if not already done)
        let research = accumulated.deepResearch;
        if (!research) {
          const res = await this.manager.runStage(projectId, 'DEEP_RESEARCH', {
            topic: selectedTopic,
            niche: project.niche,
            targetAudience: project.target_audience,
            uniqueAngle: approvalData.uniqueAngle || 'Deep analytical breakdown with verified evidence',
          });
          accumulated.deepResearch = res.result?.result;
        }

        // Stage 3: Script Writing
        const script = await this.manager.runStage(projectId, 'SCRIPT_WRITING', {
          topic: selectedTopic,
          research: accumulated.deepResearch,
          targetAudience: project.target_audience,
          channelStyle: project.content_style,
          targetDuration: project.target_duration,
          language: project.language,
        });
        accumulated.script = script.result?.result;

        // Stage 4: Fact Check
        const factCheck = await this.manager.runStage(projectId, 'FACT_CHECK', {
          scriptId: accumulated.script?.script_id,
          script: accumulated.script?.full_script,
          research: accumulated.deepResearch,
        });
        accumulated.factCheck = factCheck.result?.result;

        // Handle fact check decision
        if (factCheck.status === 'REVISION_REQUIRED') {
          // Revision loop — would re-run script with corrections
          if (this.io) {
            this.io.to(`project:${projectId}`).emit('workflow:revision', {
              projectId, stage: 'FACT_CHECK', corrections: accumulated.factCheck?.required_corrections,
            });
          }
        }

        // Stage 5: Voice + Visual (parallel)
        db.prepare('UPDATE projects SET current_stage = ?, updated_at = datetime(\'now\') WHERE id = ?')
          .run('VOICE_VISUAL', projectId);

        const [voice, visual] = await Promise.allSettled([
          this.manager.runStage(projectId, 'VOICE_PRODUCTION', {
            script: accumulated.script?.full_script,
            sceneBreakdown: accumulated.script?.scene_breakdown,
            language: project.language,
          }),
          this.manager.runStage(projectId, 'VISUAL_GENERATION', {
            sceneBreakdown: accumulated.script?.scene_breakdown,
            script: accumulated.script?.full_script,
            style: project.content_style,
          }),
        ]);

        accumulated.voice = voice.status === 'fulfilled' ? voice.value?.result?.result : null;
        accumulated.visual = visual.status === 'fulfilled' ? visual.value?.result?.result : null;

        // Stage 6: Video Generation
        const videoGen = await this.manager.runStage(projectId, 'VIDEO_GENERATION', {
          sceneBreakdown: accumulated.script?.scene_breakdown,
          visualAssets: accumulated.visual?.generated_assets,
        });
        accumulated.videoGen = videoGen.result?.result;

        // Stage 7: Video Editing
        const editing = await this.manager.runStage(projectId, 'VIDEO_EDITING', {
          script: accumulated.script,
          voiceover: accumulated.voice,
          images: accumulated.visual?.generated_assets,
          videoClips: accumulated.videoGen?.video_clips,
          sceneBreakdown: accumulated.script?.scene_breakdown,
        });
        accumulated.editing = editing.result?.result;

        // Stage 8: SEO & Thumbnails
        const seo = await this.manager.runStage(projectId, 'SEO_PUBLISHING', {
          topic: selectedTopic,
          script: accumulated.script?.full_script,
          titleConcept: accumulated.script?.title_concept,
          targetAudience: project.target_audience,
          niche: project.niche,
        });
        accumulated.seo = seo.result?.result;

        // Stage 9: Final QA
        const qa = await this.manager.runStage(projectId, 'FINAL_QA', {});
        accumulated.finalQA = qa.result?.result;

        // Stage 10: Human Approval
        db.prepare('UPDATE projects SET current_stage = ?, updated_at = datetime(\'now\') WHERE id = ?')
          .run('HUMAN_APPROVAL', projectId);

        this.activeWorkflows.set(projectId, {
          status: 'WAITING_APPROVAL',
          currentStage: 'HUMAN_APPROVAL',
          accumulated,
        });

        if (this.io) {
          this.io.to(`project:${projectId}`).emit('approval:required', {
            projectId, stage: 'HUMAN_APPROVAL', type: 'final_approval',
            message: 'Review the completed video package and approve for publishing.',
            data: this.manager.getApprovalPackage(projectId),
          });
        }

      } else if (stage === 'HUMAN_APPROVAL') {
        if (approvalData.action === 'APPROVE' || approvalData.action === 'PUBLISH_NOW') {
          db.prepare('UPDATE projects SET current_stage = ?, status = ?, updated_at = datetime(\'now\') WHERE id = ?')
            .run('PUBLISHING', 'PUBLISHING', projectId);
          this.activeWorkflows.set(projectId, { status: 'PUBLISHING', currentStage: 'PUBLISHING', accumulated });

          if (this.io) {
            this.io.to(`project:${projectId}`).emit('workflow:stage', {
              projectId, stage: 'PUBLISHING', status: 'READY',
              message: approvalData.action === 'PUBLISH_NOW' ? 'Publishing immediately...' : 'Ready for publishing/scheduling.',
            });
          }
        } else if (approvalData.action === 'REVISE') {
          db.prepare('UPDATE projects SET current_stage = ?, updated_at = datetime(\'now\') WHERE id = ?')
            .run(approvalData.reviseStage || 'SCRIPT_WRITING', projectId);
        } else if (approvalData.action === 'REJECT') {
          db.prepare('UPDATE projects SET status = ?, updated_at = datetime(\'now\') WHERE id = ?')
            .run('REJECTED', projectId);
        }
      }
    } catch (error) {
      AuditLogger.log('WORKFLOW_STAGE_ERROR', {
        projectId, stage, error: error.message, severity: 'HIGH',
        entityType: 'project', entityId: projectId,
      });
      throw error;
    }
  }

  /**
   * Get current workflow state
   */
  getWorkflowState(projectId) {
    return this.activeWorkflows.get(projectId) || { status: 'IDLE' };
  }

  getStageIndex(stage) {
    return WorkflowEngine.STAGES.indexOf(stage);
  }

  getNextStage(currentStage) {
    const idx = this.getStageIndex(currentStage);
    if (idx === -1 || idx >= WorkflowEngine.STAGES.length - 1) return null;
    return WorkflowEngine.STAGES[idx + 1];
  }
}

module.exports = WorkflowEngine;
