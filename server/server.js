const http = require('http');
const { Server } = require('socket.io');
const { createApp } = require('./src/app');
const config = require('./src/config');
const { initDb, getDb } = require('./src/db');
const { setupSocket } = require('./src/socket');

// Services
const { ProviderRouter } = require('./src/providers/provider-router');
const { OpenAIAdapter, GeminiAdapter } = require('./src/providers/llm');
const { ElevenLabsAdapter, GoogleTTSAdapter } = require('./src/providers/voice');
const { StabilityAdapter, DalleAdapter } = require('./src/providers/image');
const { RunwayAdapter } = require('./src/providers/video');
const WorkflowEngine = require('./src/services/workflow-engine');
const TaskQueue = require('./src/services/task-queue');
const CostTracker = require('./src/services/cost-tracker');
const YouTubeService = require('./src/services/youtube-service');
const AnalyticsService = require('./src/services/analytics-service');
const MediaPipeline = require('./src/services/media-pipeline');

// Agents
const MarketIntelligenceAgent = require('./src/agents/market-intelligence');
const DeepResearchAgent = require('./src/agents/deep-research');
const ScriptwriterAgent = require('./src/agents/scriptwriter');
const FactCheckerAgent = require('./src/agents/fact-checker');
const VoiceProducerAgent = require('./src/agents/voice-producer');
const VisualDirectorAgent = require('./src/agents/visual-director');
const VideoGeneratorAgent = require('./src/agents/video-generator');
const VideoEditorAgent = require('./src/agents/video-editor');
const SEOPublisherAgent = require('./src/agents/seo-publisher');
const ManagerAgent = require('./src/agents/manager');

async function start() {
  console.log('🚀 Starting AI YouTube Automation OS...');

  // Initialize database
  const db = await initDb();
  console.log('✅ Database initialized');

  // Create Express app
  const app = createApp();

  // Create HTTP server and Socket.IO
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: { origin: ['http://localhost:5173', 'http://localhost:3000'], credentials: true },
  });
  setupSocket(io);
  console.log('✅ WebSocket server ready');

  // Initialize provider routers
  const llmRouter = new ProviderRouter('llm');
  llmRouter.register('openai', new OpenAIAdapter(config.providers.llm.openai));
  llmRouter.register('gemini', new GeminiAdapter(config.providers.llm.gemini));

  const voiceRouter = new ProviderRouter('voice');
  voiceRouter.register('elevenlabs', new ElevenLabsAdapter(config.providers.voice.elevenlabs));
  voiceRouter.register('google-tts', new GoogleTTSAdapter(config.providers.voice.googleTts));

  const imageRouter = new ProviderRouter('image');
  imageRouter.register('stability', new StabilityAdapter(config.providers.image.stability));
  imageRouter.register('dalle', new DalleAdapter({ apiKey: config.providers.llm.openai.apiKey }));

  const videoRouter = new ProviderRouter('video');
  videoRouter.register('runway', new RunwayAdapter(config.providers.video.runway));

  console.log('✅ Provider routers initialized');

  // Initialize agents
  const agents = new Map();
  agents.set('agent-market-intel', new MarketIntelligenceAgent(llmRouter));
  agents.set('agent-deep-research', new DeepResearchAgent(llmRouter));
  agents.set('agent-scriptwriter', new ScriptwriterAgent(llmRouter));
  agents.set('agent-fact-checker', new FactCheckerAgent(llmRouter));
  agents.set('agent-voice', new VoiceProducerAgent(llmRouter, voiceRouter));
  agents.set('agent-visual', new VisualDirectorAgent(llmRouter, imageRouter));
  agents.set('agent-video-gen', new VideoGeneratorAgent(llmRouter, videoRouter));
  agents.set('agent-editor', new VideoEditorAgent(llmRouter));
  agents.set('agent-seo', new SEOPublisherAgent(llmRouter, imageRouter));
  console.log('✅ 10 Agents initialized');

  // Initialize Manager
  const managerAgent = new ManagerAgent(agents, io);
  agents.set('agent-manager', managerAgent);

  // Initialize services
  const taskQueue = new TaskQueue({ concurrency: 3, maxRetries: config.budget.maxRetries });
  const costTracker = new CostTracker(config.budget);
  const youtubeService = new YouTubeService();
  const analyticsService = new AnalyticsService(youtubeService);
  const mediaPipeline = new MediaPipeline();
  const workflowEngine = new WorkflowEngine(managerAgent, io);

  console.log('✅ Services initialized');

  // Store references on app for route access
  app.set('io', io);
  app.set('workflowEngine', workflowEngine);
  app.set('managerAgent', managerAgent);
  app.set('taskQueue', taskQueue);
  app.set('costTracker', costTracker);
  app.set('youtubeService', youtubeService);
  app.set('analyticsService', analyticsService);
  app.set('mediaPipeline', mediaPipeline);
  app.set('config', config);

  // Ensure default user exists
  const userExists = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (userExists === 0) {
    const { v4: uuidv4 } = require('uuid');
    db.prepare('INSERT INTO users (id, username, display_name, role) VALUES (?, ?, ?, ?)').run(
      uuidv4(), 'owner', 'Channel Owner', 'owner'
    );
    console.log('✅ Default owner user created');
  }

  // Start server
  const PORT = process.env.PORT || config.port || 3001;
  const HOST = '0.0.0.0';
  server.listen(PORT, HOST, () => {
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`  🎬 AI YOUTUBE AUTOMATION OS`);
    console.log(`  ⚡ Server running on http://${HOST}:${PORT}`);
    console.log(`  📊 Dashboard: Online & Serving Static Dist`);
    console.log(`  🔌 API: http://${HOST}:${PORT}/api`);
    console.log(`  🧠 Agents: 10 specialized AI agents ready`);
    console.log(`  📦 Database: SQLite (Zero-Config)`);
    console.log(`${'═'.repeat(60)}\n`);
  });
}

start().catch(err => {
  console.error('❌ Failed to start server:', err);
  if (err.stack) console.error(err.stack);
  process.exit(1);
});
