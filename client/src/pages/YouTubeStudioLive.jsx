import { useState, useEffect } from 'react';
import { useStore } from '../store';
import { getSocket } from '../services/socket';
import { api } from '../services/api';

export default function YouTubeStudioLive() {
  const { addToast } = useStore();
  const socket = getSocket();
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [projectDetails, setProjectDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [startingPipeline, setStartingPipeline] = useState(false);
  const [publishingAction, setPublishingAction] = useState('PUBLISH_NOW');

  // Fetch real projects
  const fetchProjects = async () => {
    try {
      const data = await api.getProjects();
      const list = data.projects || [];
      setProjects(list);
      if (list.length > 0 && !selectedProjectId) {
        setSelectedProjectId(list[0].id);
      }
    } catch (err) {
      console.error('Failed to load projects:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjectDetails = async (id) => {
    if (!id) return;
    try {
      const data = await api.getProject(id);
      setProjectDetails(data);
    } catch (err) {
      console.error('Failed to load project details:', err);
    }
  };

  useEffect(() => {
    fetchProjects();
    const interval = setInterval(fetchProjects, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      fetchProjectDetails(selectedProjectId);
    }
  }, [selectedProjectId]);

  // Listen to live socket events
  useEffect(() => {
    if (!socket) return;
    const handleStageUpdate = (data) => {
      if (data.projectId === selectedProjectId) {
        fetchProjectDetails(selectedProjectId);
        fetchProjects();
      }
    };
    socket.on('workflow:stage', handleStageUpdate);
    socket.on('task:status', handleStageUpdate);
    return () => {
      socket.off('workflow:stage', handleStageUpdate);
      socket.off('task:status', handleStageUpdate);
    };
  }, [socket, selectedProjectId]);

  // Calculate real progress percentage from current stage
  const getStageProgress = (stage) => {
    switch (stage) {
      case 'CREATED': return 5;
      case 'MARKET_RESEARCH': return 15;
      case 'TOPIC_REVIEW': return 25;
      case 'DEEP_RESEARCH': return 35;
      case 'SCRIPT_WRITING': return 50;
      case 'FACT_CHECK': return 65;
      case 'VOICE_VISUAL': return 80;
      case 'VIDEO_GENERATION': return 88;
      case 'VIDEO_EDITING': return 94;
      case 'SEO_PUBLISHING': return 97;
      case 'FINAL_QA':
      case 'HUMAN_APPROVAL':
      case 'PUBLISHING':
      case 'COMPLETED': return 100;
      default: return 0;
    }
  };

  // 1-Click Launch Autonomous Production
  const handleLaunchAutonomousRun = async () => {
    setStartingPipeline(true);
    try {
      const newProj = await api.createProject({
        title: 'The Future of Autonomous AI Multi-Agent Systems in 2026',
        topic: 'How autonomous AI agents are replacing traditional digital production teams',
        niche: 'Artificial Intelligence & Technology',
        targetAudience: 'Tech enthusiasts, developers, and creators',
        formatType: 'Long-form',
        primaryLanguage: 'en',
        contentStyle: 'Documentary Breakdown',
        tone: 'Authoritative, engaging, cinematic',
      });
      const projId = newProj.project.id;
      addToast({ type: 'success', message: `🚀 Project ${projId} created! Starting 10-Agent Pipeline...` });
      await api.projectCommand(projId, 'START');
      addToast({ type: 'success', message: '🤖 Central AI Orchestrator deployed all 10 agents!' });
      await fetchProjects();
      setSelectedProjectId(projId);
    } catch (err) {
      addToast({ type: 'error', message: `Failed to launch: ${err.message}` });
    } finally {
      setStartingPipeline(false);
    }
  };

  const handleStartExisting = async () => {
    if (!selectedProjectId) return;
    try {
      await api.projectCommand(selectedProjectId, 'START');
      addToast({ type: 'success', message: 'Pipeline started!' });
      fetchProjectDetails(selectedProjectId);
    } catch (err) {
      addToast({ type: 'error', message: err.message });
    }
  };

  const handleApprovePublish = async () => {
    if (!selectedProjectId) return;
    try {
      await api.projectCommand(selectedProjectId, publishingAction);
      addToast({ type: 'success', message: `Action "${publishingAction}" transmitted to YouTube Studio!` });
      fetchProjectDetails(selectedProjectId);
    } catch (err) {
      addToast({ type: 'error', message: err.message });
    }
  };

  const currentProject = projects.find((p) => p.id === selectedProjectId) || projects[0];
  const currentStage = currentProject?.current_stage || 'IDLE';
  const progressPercent = getStageProgress(currentStage);

  return (
    <div className="page-container animate-fade-in">
      <div className="flex justify-between items-center mb-xl">
        <div>
          <div className="flex items-center gap-sm">
            <span className="live-badge" style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.4)' }}>
              🔴 OFFICIAL YOUTUBE STUDIO LIVE
            </span>
            <span className="badge badge-primary">Real-Time Orchestration Hub</span>
          </div>
          <h1 className="text-2xl font-bold mt-xs">YouTube Studio Real-Time Execution Monitor</h1>
          <p className="text-secondary text-sm">
            Autonomous multi-agent execution tracking, video generation, and YouTube publishing.
          </p>
        </div>

        <div className="flex items-center gap-sm">
          <button
            onClick={handleLaunchAutonomousRun}
            disabled={startingPipeline}
            className="btn btn-primary"
            style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}
          >
            {startingPipeline ? '⏳ Launching AI Team...' : '🚀 Start Autonomous Video Task'}
          </button>
        </div>
      </div>

      {projects.length === 0 ? (
        /* Empty State: Clear prompt to start */
        <div
          className="card p-xl text-center"
          style={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.1)', padding: '60px 20px' }}
        >
          <div className="text-5xl mb-md">🎬</div>
          <h3 className="text-xl font-bold text-white mb-sm">Abhi Koi Video Task Active Nahi Hai</h3>
          <p className="text-secondary text-sm max-w-xl mx-auto mb-lg">
            Aapki AI Team bilkul ready hai! Video bananey ke liye neeche button dabayein — 10 AI Agents turant research, script, voiceover, images aur complete video editing start kar denge!
          </p>
          <button
            onClick={handleLaunchAutonomousRun}
            disabled={startingPipeline}
            className="btn btn-primary btn-lg"
            style={{ padding: '14px 28px', fontSize: '16px', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}
          >
            {startingPipeline ? '⏳ Starting Production...' : '🚀 Ek Click Mein Video Banana Shuru Karein'}
          </button>
        </div>
      ) : (
        <>
          {/* Project Selector Bar */}
          <div className="card p-md mb-lg flex justify-between items-center" style={{ background: 'var(--bg-elevated)' }}>
            <div className="flex items-center gap-md">
              <span className="text-xs font-bold text-tertiary">SELECT ACTIVE PROJECT:</span>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="input input-sm"
                style={{ minWidth: 280 }}
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.id} — {p.title} ({p.current_stage})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-sm">
              <span className="badge badge-sm badge-outline">Status: {currentProject?.status}</span>
              <span className="badge badge-sm badge-primary">Stage: {currentStage}</span>
              {currentStage === 'CREATED' && (
                <button onClick={handleStartExisting} className="btn btn-sm btn-success">
                  ▶ Start Pipeline
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-lg">
            {/* Live Studio Execution Frame */}
            <div className="col-span-2 card p-lg" style={{ background: '#0a0a0f', border: '1px solid var(--border-primary)', minHeight: 480 }}>
              <div className="flex justify-between items-center pb-sm mb-md border-b border-subtle">
                <div className="flex items-center gap-sm">
                  <span className={`w-3 h-3 rounded-full ${currentProject?.status === 'ACTIVE' ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
                  <span className="font-bold text-sm">Active Production Pipeline</span>
                </div>
                <span className="badge badge-sm badge-outline">ID: {currentProject?.id}</span>
              </div>

              <div
                style={{
                  background: '#030305',
                  padding: '24px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <div className="flex justify-between items-center mb-md">
                  <div>
                    <h4 className="font-bold text-base text-white">{currentProject?.title}</h4>
                    <span className="text-xs text-tertiary">Topic: {currentProject?.topic || currentProject?.title}</span>
                  </div>
                  <span className="badge badge-success">{currentStage}</span>
                </div>

                {/* Progress Bar */}
                <div className="mb-lg">
                  <div className="flex justify-between text-xs mb-xs">
                    <span className="text-tertiary">AI Multi-Agent Production Progress</span>
                    <span className="font-bold text-blue-400">{progressPercent}%</span>
                  </div>
                  <div style={{ height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${progressPercent}%`, height: '100%', background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)', borderRadius: '4px', transition: 'width 0.5s ease' }} />
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-md text-xs">
                  <div className="p-md rounded bg-black/40 border border-subtle">
                    <span className="text-tertiary font-bold block mb-xs">STAGE DETAILS</span>
                    <p className="text-secondary mb-xs">Current Agent: {currentStage}</p>
                    <p className="text-secondary mb-xs">Format: {currentProject?.format_type || '16:9 Long Form'}</p>
                    <p className="text-secondary">Niche: {currentProject?.niche || 'Technology'}</p>
                  </div>

                  <div className="p-md rounded bg-black/40 border border-subtle">
                    <span className="text-tertiary font-bold block mb-xs">ASSETS & DELIVERABLES</span>
                    <p className="text-secondary mb-xs">Scripts: {projectDetails?.scripts?.length || 0} Generated</p>
                    <p className="text-secondary mb-xs">Media Assets: {projectDetails?.assets?.length || 0} Created</p>
                    <p className="text-secondary">SEO Ready: {projectDetails?.seo ? '✓ Yes' : 'In Progress'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Human Approval Card */}
            <div className="space-y-md">
              <div className="card p-md" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-primary)' }}>
                <h4 className="text-xs font-bold uppercase tracking-wider text-tertiary mb-sm">Publishing Authorization</h4>
                <p className="text-xs text-secondary mb-md">
                  Choose how to publish this project to your YouTube channel:
                </p>

                <div className="space-y-sm">
                  <button
                    onClick={() => setPublishingAction('PUBLISH_NOW')}
                    className={`w-full text-left p-sm rounded border text-xs ${
                      publishingAction === 'PUBLISH_NOW' ? 'border-purple-500 bg-purple-500/10 font-bold' : 'border-subtle bg-black/20'
                    }`}
                  >
                    🚀 Public Immediate Publish
                  </button>

                  <button
                    onClick={() => setPublishingAction('SCHEDULE')}
                    className={`w-full text-left p-sm rounded border text-xs ${
                      publishingAction === 'SCHEDULE' ? 'border-purple-500 bg-purple-500/10 font-bold' : 'border-subtle bg-black/20'
                    }`}
                  >
                    ⏰ Schedule for Optimal Window
                  </button>

                  <button
                    onClick={() => setPublishingAction('DRAFT')}
                    className={`w-full text-left p-sm rounded border text-xs ${
                      publishingAction === 'DRAFT' ? 'border-purple-500 bg-purple-500/10 font-bold' : 'border-subtle bg-black/20'
                    }`}
                  >
                    💾 Save as Private Draft
                  </button>

                  <button onClick={handleApprovePublish} className="btn btn-primary w-full mt-md">
                    Execute YouTube Publish
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

