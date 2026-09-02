function createSchema(db) {
  db.exec(`
    -- ============================================================
    -- USERS
    -- ============================================================
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT,
      display_name TEXT,
      name TEXT,
      email TEXT,
      password_hash TEXT,
      role TEXT NOT NULL DEFAULT 'OWNER',
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      api_key_hash TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- ============================================================
    -- CHANNELS (YouTube)
    -- ============================================================
    CREATE TABLE IF NOT EXISTS channels (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      youtube_channel_id TEXT,
      channel_name TEXT,
      channel_url TEXT,
      access_token_encrypted TEXT,
      refresh_token_encrypted TEXT,
      token_expiry TEXT,
      scopes TEXT,
      connected_at TEXT,
      status TEXT NOT NULL DEFAULT 'disconnected',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- ============================================================
    -- PROJECTS
    -- ============================================================
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id),
      channel_id TEXT REFERENCES channels(id),
      title TEXT NOT NULL,
      topic TEXT,
      niche TEXT,
      target_audience TEXT,
      primary_language TEXT DEFAULT 'en',
      secondary_language TEXT,
      language TEXT DEFAULT 'en',
      format_type TEXT DEFAULT 'Long-form',
      video_format TEXT DEFAULT '16:9',
      target_duration TEXT DEFAULT '10-15 min',
      content_style TEXT,
      tone TEXT,
      upload_frequency TEXT,
      geographic_audience TEXT,
      content_restrictions TEXT,
      monetization_objective TEXT,
      quality_target TEXT DEFAULT 'PREMIUM',
      budget_limit REAL DEFAULT 10.0,
      provider_preferences TEXT,
      approval_requirements TEXT,
      current_stage TEXT NOT NULL DEFAULT 'CREATED',
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      overall_score REAL,
      score_breakdown TEXT,
      estimated_cost REAL DEFAULT 0,
      actual_cost REAL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT,
      published_at TEXT
    );

    -- ============================================================
    -- TASKS
    -- ============================================================
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id),
      agent_id TEXT NOT NULL REFERENCES agents(id),
      task_type TEXT NOT NULL,
      stage TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'QUEUED',
      priority INTEGER DEFAULT 5,
      input_data TEXT,
      output_data TEXT,
      input_version INTEGER DEFAULT 1,
      output_version INTEGER DEFAULT 1,
      confidence_score REAL,
      quality_score REAL,
      self_check_passed INTEGER DEFAULT 0,
      retry_count INTEGER DEFAULT 0,
      max_retries INTEGER DEFAULT 3,
      error_message TEXT,
      started_at TEXT,
      completed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- ============================================================
    -- AGENTS
    -- ============================================================
    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      agent_number INTEGER NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'IDLE',
      current_task_id TEXT,
      current_project_id TEXT,
      success_count INTEGER DEFAULT 0,
      failure_count INTEGER DEFAULT 0,
      last_activity TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- ============================================================
    -- AGENT RUNS (history of each agent execution)
    -- ============================================================
    CREATE TABLE IF NOT EXISTS agent_runs (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL REFERENCES agents(id),
      task_id TEXT NOT NULL REFERENCES tasks(id),
      project_id TEXT NOT NULL REFERENCES projects(id),
      status TEXT NOT NULL DEFAULT 'RUNNING',
      input_data TEXT,
      output_data TEXT,
      confidence_score REAL,
      quality_score REAL,
      duration_ms INTEGER,
      error_message TEXT,
      started_at TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT
    );

    -- ============================================================
    -- RESEARCH
    -- ============================================================
    CREATE TABLE IF NOT EXISTS research (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id),
      research_type TEXT NOT NULL,
      topic TEXT NOT NULL,
      research_question TEXT,
      verified_facts TEXT,
      important_context TEXT,
      interesting_angles TEXT,
      audience_questions TEXT,
      misinformation_risks TEXT,
      unverified_information TEXT,
      suggested_story_angle TEXT,
      market_evidence TEXT,
      competitor_analysis TEXT,
      topic_scores TEXT,
      total_score REAL,
      unique_angle TEXT,
      risks TEXT,
      recommendation TEXT,
      confidence_score REAL,
      version INTEGER DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'DRAFT',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- ============================================================
    -- SOURCES
    -- ============================================================
    CREATE TABLE IF NOT EXISTS sources (
      id TEXT PRIMARY KEY,
      research_id TEXT NOT NULL REFERENCES research(id),
      source_type TEXT NOT NULL,
      title TEXT,
      url TEXT,
      author TEXT,
      publication TEXT,
      date TEXT,
      reliability_score REAL,
      excerpt TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- ============================================================
    -- SCRIPTS
    -- ============================================================
    CREATE TABLE IF NOT EXISTS scripts (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id),
      title_concept TEXT,
      target_duration TEXT,
      full_script TEXT,
      scene_breakdown TEXT,
      visual_suggestions TEXT,
      retention_strategy TEXT,
      fact_references TEXT,
      self_review TEXT,
      confidence_score REAL,
      word_count INTEGER,
      estimated_duration TEXT,
      status TEXT NOT NULL DEFAULT 'DRAFT',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- ============================================================
    -- SCRIPT VERSIONS
    -- ============================================================
    CREATE TABLE IF NOT EXISTS script_versions (
      id TEXT PRIMARY KEY,
      script_id TEXT NOT NULL REFERENCES scripts(id),
      version_number INTEGER NOT NULL,
      full_script TEXT NOT NULL,
      scene_breakdown TEXT,
      change_summary TEXT,
      changed_by TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- ============================================================
    -- FACT CHECKS
    -- ============================================================
    CREATE TABLE IF NOT EXISTS fact_checks (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id),
      script_id TEXT NOT NULL REFERENCES scripts(id),
      total_claims INTEGER DEFAULT 0,
      verified_claims TEXT,
      unverified_claims TEXT,
      misleading_claims TEXT,
      false_claims TEXT,
      required_corrections TEXT,
      final_decision TEXT,
      confidence_score REAL,
      version INTEGER DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'PENDING',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- ============================================================
    -- MEDIA ASSETS
    -- ============================================================
    CREATE TABLE IF NOT EXISTS media_assets (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id),
      asset_type TEXT NOT NULL,
      scene_id TEXT,
      file_path TEXT,
      file_name TEXT,
      file_size INTEGER,
      mime_type TEXT,
      duration REAL,
      resolution TEXT,
      prompt TEXT,
      style TEXT,
      quality_score REAL,
      generation_provider TEXT,
      generation_cost REAL,
      license_type TEXT DEFAULT 'ai-generated',
      version INTEGER DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'PENDING',
      metadata TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- ============================================================
    -- VIDEOS (final rendered)
    -- ============================================================
    CREATE TABLE IF NOT EXISTS videos (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id),
      file_path TEXT,
      file_name TEXT,
      file_size INTEGER,
      duration REAL,
      resolution TEXT,
      fps INTEGER,
      format TEXT DEFAULT 'mp4',
      subtitle_file TEXT,
      audio_status TEXT,
      editing_quality_score REAL,
      issues_found TEXT,
      version INTEGER DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'RENDERING',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- ============================================================
    -- THUMBNAILS
    -- ============================================================
    CREATE TABLE IF NOT EXISTS thumbnails (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id),
      file_path TEXT,
      file_name TEXT,
      concept TEXT,
      prompt TEXT,
      curiosity_score REAL,
      clarity_score REAL,
      readability_score REAL,
      emotional_impact_score REAL,
      relevance_score REAL,
      mobile_visibility_score REAL,
      overall_score REAL,
      is_recommended INTEGER DEFAULT 0,
      version INTEGER DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'PENDING',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- ============================================================
    -- SEO PACKAGES
    -- ============================================================
    CREATE TABLE IF NOT EXISTS seo_packages (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id),
      title_options TEXT,
      recommended_title TEXT,
      description TEXT,
      keywords TEXT,
      hashtags TEXT,
      chapters TEXT,
      category_id TEXT DEFAULT '22',
      seo_score REAL,
      publishing_ready INTEGER DEFAULT 0,
      version INTEGER DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'DRAFT',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- ============================================================
    -- APPROVALS
    -- ============================================================
    CREATE TABLE IF NOT EXISTS approvals (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id),
      approval_type TEXT NOT NULL,
      stage TEXT NOT NULL,
      action TEXT NOT NULL,
      reviewer TEXT DEFAULT 'owner',
      notes TEXT,
      content_reference TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- ============================================================
    -- PUBLISHING JOBS
    -- ============================================================
    CREATE TABLE IF NOT EXISTS publishing_jobs (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id),
      channel_id TEXT REFERENCES channels(id),
      youtube_video_id TEXT,
      video_file TEXT,
      thumbnail_file TEXT,
      title TEXT,
      description TEXT,
      tags TEXT,
      category_id TEXT,
      privacy_status TEXT DEFAULT 'private',
      scheduled_at TEXT,
      upload_progress REAL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'PENDING',
      error_message TEXT,
      published_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- ============================================================
    -- ANALYTICS
    -- ============================================================
    CREATE TABLE IF NOT EXISTS analytics (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id),
      youtube_video_id TEXT,
      views INTEGER DEFAULT 0,
      watch_time_hours REAL DEFAULT 0,
      avg_view_duration REAL DEFAULT 0,
      ctr REAL,
      audience_retention REAL,
      subscribers_gained INTEGER DEFAULT 0,
      likes INTEGER DEFAULT 0,
      comments INTEGER DEFAULT 0,
      shares INTEGER DEFAULT 0,
      traffic_sources TEXT,
      insights TEXT,
      what_worked TEXT,
      what_failed TEXT,
      collected_at TEXT NOT NULL DEFAULT (datetime('now')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- ============================================================
    -- REVISION REQUESTS
    -- ============================================================
    CREATE TABLE IF NOT EXISTS revision_requests (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id),
      task_id TEXT REFERENCES tasks(id),
      from_agent TEXT NOT NULL,
      to_agent TEXT NOT NULL,
      problem TEXT NOT NULL,
      severity TEXT NOT NULL DEFAULT 'MEDIUM',
      evidence TEXT,
      required_fix TEXT,
      deadline TEXT,
      revision_status TEXT NOT NULL DEFAULT 'PENDING',
      resolved_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- ============================================================
    -- ERRORS
    -- ============================================================
    CREATE TABLE IF NOT EXISTS errors (
      id TEXT PRIMARY KEY,
      project_id TEXT REFERENCES projects(id),
      agent_id TEXT,
      task_id TEXT,
      error_type TEXT NOT NULL,
      severity TEXT NOT NULL DEFAULT 'MEDIUM',
      message TEXT NOT NULL,
      stack_trace TEXT,
      retry_count INTEGER DEFAULT 0,
      recommended_action TEXT,
      resolved INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- ============================================================
    -- AUDIT LOGS
    -- ============================================================
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      project_id TEXT,
      agent_id TEXT,
      action TEXT NOT NULL,
      entity_type TEXT,
      entity_id TEXT,
      details TEXT,
      ip_address TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- ============================================================
    -- PROVIDER CONFIGURATIONS
    -- ============================================================
    CREATE TABLE IF NOT EXISTS provider_configurations (
      id TEXT PRIMARY KEY,
      provider_type TEXT NOT NULL,
      provider_name TEXT NOT NULL,
      api_endpoint TEXT,
      model TEXT,
      priority INTEGER DEFAULT 1,
      fallback_priority INTEGER DEFAULT 99,
      rate_limit INTEGER,
      budget_limit REAL,
      is_enabled INTEGER DEFAULT 1,
      config_json TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- ============================================================
    -- HANDOFF MESSAGES
    -- ============================================================
    CREATE TABLE IF NOT EXISTS handoff_messages (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id),
      task_id TEXT REFERENCES tasks(id),
      from_agent TEXT NOT NULL,
      to_agent TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING',
      input_version INTEGER DEFAULT 1,
      output_version INTEGER DEFAULT 1,
      output_reference TEXT,
      confidence_score REAL,
      self_check_completed INTEGER DEFAULT 0,
      issues_found TEXT,
      review_required INTEGER DEFAULT 1,
      next_action TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- ============================================================
    -- COST TRACKING
    -- ============================================================
    CREATE TABLE IF NOT EXISTS cost_entries (
      id TEXT PRIMARY KEY,
      project_id TEXT REFERENCES projects(id),
      provider_type TEXT NOT NULL,
      provider_name TEXT NOT NULL,
      operation TEXT NOT NULL,
      estimated_cost REAL DEFAULT 0,
      actual_cost REAL DEFAULT 0,
      tokens_used INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- ============================================================
    -- INDEXES
    -- ============================================================
    CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
    CREATE INDEX IF NOT EXISTS idx_projects_stage ON projects(current_stage);
    CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
    CREATE INDEX IF NOT EXISTS idx_tasks_agent ON tasks(agent_id);
    CREATE INDEX IF NOT EXISTS idx_agent_runs_agent ON agent_runs(agent_id);
    CREATE INDEX IF NOT EXISTS idx_agent_runs_project ON agent_runs(project_id);
    CREATE INDEX IF NOT EXISTS idx_media_assets_project ON media_assets(project_id);
    CREATE INDEX IF NOT EXISTS idx_handoff_messages_project ON handoff_messages(project_id);
    CREATE INDEX IF NOT EXISTS idx_revision_requests_project ON revision_requests(project_id);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_project ON audit_logs(project_id);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
    CREATE INDEX IF NOT EXISTS idx_errors_project ON errors(project_id);
    CREATE INDEX IF NOT EXISTS idx_cost_entries_project ON cost_entries(project_id);
  `);

  // Safe dynamic migration for new projects columns
  const colsToAdd = [
    'primary_language TEXT DEFAULT "en"',
    'secondary_language TEXT',
    'format_type TEXT DEFAULT "Long-form"',
    'tone TEXT',
    'upload_frequency TEXT',
    'geographic_audience TEXT',
    'content_restrictions TEXT',
    'monetization_objective TEXT',
    'quality_target TEXT DEFAULT "PREMIUM"',
    'budget_limit REAL DEFAULT 10.0',
    'provider_preferences TEXT',
    'approval_requirements TEXT',
  ];

  for (const col of colsToAdd) {
    try {
      db.exec(`ALTER TABLE projects ADD COLUMN ${col};`);
    } catch (e) {
      // Column already exists, ignore
    }
  }

  // Add columns to projects table if missing
  try { db.exec("ALTER TABLE projects ADD COLUMN version INTEGER DEFAULT 1"); } catch (e) {}
  try { db.exec("ALTER TABLE projects ADD COLUMN priority TEXT DEFAULT 'MEDIUM'"); } catch (e) {}
  try { db.exec("ALTER TABLE projects ADD COLUMN budget_used REAL DEFAULT 0.0"); } catch (e) {}

  // Add columns to users table if missing
  try { db.exec("ALTER TABLE users ADD COLUMN email TEXT"); } catch (e) {}
  try { db.exec("ALTER TABLE users ADD COLUMN password_hash TEXT"); } catch (e) {}
  try { db.exec("ALTER TABLE users ADD COLUMN name TEXT"); } catch (e) {}
  try { db.exec("ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'ACTIVE'"); } catch (e) {}

  const scriptCols = [
    'version_number REAL DEFAULT 1.0',
    'hook TEXT',
  ];
  for (const col of scriptCols) {
    try {
      db.exec(`ALTER TABLE scripts ADD COLUMN ${col};`);
    } catch (e) {}
  }
}

function seedAgents(db) {
  const agents = [
    { id: 'agent-market-intel', number: 1, name: 'Market Intelligence Agent', role: 'MARKET_RESEARCH', prompt: 'Discovers high-potential YouTube content opportunities, trend analysis, competitor evaluation, and topic demand scoring.' },
    { id: 'agent-deep-research', number: 2, name: 'Deep Research Agent', role: 'DEEP_RESEARCH', prompt: 'Performs multi-source factual research, separates verified claims from unverified speculation, and structures knowledge.' },
    { id: 'agent-scriptwriter', number: 3, name: 'YouTube Scriptwriter Agent', role: 'SCRIPT_WRITING', prompt: 'Creates high-retention, engaging scripts with narrative arcs, hook formulas, pattern interrupts, and visual cues.' },
    { id: 'agent-fact-checker', number: 4, name: 'Fact Checker & Script Reviewer', role: 'FACT_CHECK', prompt: 'Independent verification agent that challenges all factual claims, detects misinformation, and enforces accuracy.' },
    { id: 'agent-voice', number: 5, name: 'Voice & Audio Producer', role: 'VOICE_PRODUCTION', prompt: 'Generates natural voiceovers with emotional pacing, pronunciation accuracy, and audio mastering.' },
    { id: 'agent-visual', number: 6, name: 'Visual & Image Director', role: 'VISUAL_GENERATION', prompt: 'Story-driven visual planning and high-fidelity image asset generation with style consistency.' },
    { id: 'agent-video-gen', number: 7, name: 'AI Video Generator', role: 'VIDEO_GENERATION', prompt: 'Generates cinematic B-roll, motion animations, and scene video clips using AI video engines.' },
    { id: 'agent-editor', number: 8, name: 'Video Editor & Post-Production', role: 'VIDEO_EDITING', prompt: 'Timeline assembly, multi-track audio mixing, subtitle burning, transition pacing, and video rendering.' },
    { id: 'agent-seo', number: 9, name: 'Thumbnail, SEO & Publisher', role: 'SEO_PUBLISHING', prompt: 'YouTube packaging, high-CTR title variations, thumbnail design concepts, description, tags, and timestamps.' },
    { id: 'agent-manager', number: 10, name: 'AI Manager & Orchestrator', role: 'ORCHESTRATION', prompt: 'Chief Operating Agent: validates quality gates, routes revisions, enforces budgets, and prepares approval packages.' },
  ];

  const stmt = db.prepare(`
    INSERT OR IGNORE INTO agents (id, name, role, agent_number, description, status)
    VALUES (?, ?, ?, ?, ?, 'IDLE')
  `);

  for (const a of agents) {
    stmt.run(a.id, a.name, a.role, a.number, a.prompt);
  }
}

function seedProviders(db) {
  const providers = [
    { id: 'prov-openai', type: 'llm', name: 'OpenAI GPT-4o', endpoint: 'https://api.openai.com/v1', model: 'gpt-4o', priority: 1, enabled: 1 },
    { id: 'prov-gemini', type: 'llm', name: 'Google Gemini 2.5', endpoint: 'https://generativelanguage.googleapis.com/v1beta', model: 'gemini-2.5-flash', priority: 2, enabled: 1 },
    { id: 'prov-elevenlabs', type: 'voice', name: 'ElevenLabs', endpoint: 'https://api.elevenlabs.io/v1', model: 'eleven_multilingual_v2', priority: 1, enabled: 1 },
    { id: 'prov-googletts', type: 'voice', name: 'Google Cloud TTS', endpoint: 'https://texttospeech.googleapis.com/v1', model: 'Neural2', priority: 2, enabled: 1 },
    { id: 'prov-stability', type: 'image', name: 'Stability AI SD3', endpoint: 'https://api.stability.ai/v2beta', model: 'sd3.5-large', priority: 1, enabled: 1 },
    { id: 'prov-dalle', type: 'image', name: 'OpenAI DALL-E 3', endpoint: 'https://api.openai.com/v1', model: 'dall-e-3', priority: 2, enabled: 1 },
    { id: 'prov-runway', type: 'video', name: 'Runway Gen-3', endpoint: 'https://api.dev.runwayml.com/v1', model: 'gen3a_turbo', priority: 1, enabled: 1 },
  ];

  const stmt = db.prepare(`
    INSERT OR IGNORE INTO provider_configurations (id, provider_type, provider_name, api_endpoint, model, priority, is_enabled)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  for (const p of providers) {
    stmt.run(p.id, p.type, p.name, p.endpoint, p.model, p.priority, p.enabled);
  }
}

module.exports = {
  createSchema,
  initSchema: createSchema,
  seedAgents,
  seedProviders,
};

