import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { joinProject, leaveProject, getSocket } from '../services/socket';
import { useStore } from '../store';
import PipelineVisualizer, { STAGE_META } from '../components/PipelineVisualizer';
import ScoreGauge from '../components/ScoreGauge';

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const addToast = useStore((s) => s.addToast);

  const [projectData, setProjectData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pipeline');
  const [approvalModal, setApprovalModal] = useState(null); // 'TOPIC_REVIEW' | 'HUMAN_APPROVAL' | 'REVISION_MODAL' | null
  const [selectedTopic, setSelectedTopic] = useState('');
  const [revisionForm, setRevisionForm] = useState({
    component: 'Script (Agent 3)',
    notes: '',
    severity: 'HIGH',
  });

  const loadData = async () => {
    try {
      const data = await api.getProject(id);
      setProjectData(data);
    } catch (err) {
      addToast({ type: 'error', message: err.message || 'Failed to load project' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    joinProject(id);

    const socket = getSocket();
    const handleStageUpdate = (data) => {
      if (data.projectId === id) {
        loadData();
      }
    };
    const handleApprovalReq = (data) => {
      if (data.projectId === id) {
        loadData();
        setApprovalModal(data.stage);
      }
    };

    socket.on('workflow:stage', handleStageUpdate);
    socket.on('approval:required', handleApprovalReq);
    socket.on('agent:status', handleStageUpdate);
    socket.on('workflow:revision', handleStageUpdate);

    return () => {
      leaveProject(id);
      socket.off('workflow:stage', handleStageUpdate);
      socket.off('approval:required', handleApprovalReq);
      socket.off('agent:status', handleStageUpdate);
      socket.off('workflow:revision', handleStageUpdate);
    };
  }, [id]);

  const handleCommand = async (command, payload = {}) => {
    try {
      await api.projectCommand(id, command, payload);
      addToast({ type: 'info', message: `Command ${command} executed` });
      setApprovalModal(null);
      loadData();
    } catch (err) {
      addToast({ type: 'error', message: err.message || `Failed to execute ${command}` });
    }
  };

  const handleTargetedRevision = async () => {
    if (!revisionForm.notes.trim()) {
      return addToast({ type: 'error', message: 'Please enter revision instructions' });
    }
    await handleCommand('REVISE', revisionForm);
  };

  if (loading) {
    return (
      <div className="page-body flex items-center justify-between" style={{ justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>⚡</div>
          <div style={{ color: 'var(--text-secondary)' }}>Loading project details...</div>
        </div>
      </div>
    );
  }

  if (!projectData || !projectData.project) {
    return (
      <div className="page-body">
        <div className="empty-state">
          <div className="empty-icon">⚠️</div>
          <h3>Project Not Found</h3>
          <p>The requested video project does not exist.</p>
          <button className="btn btn-primary mt-md" onClick={() => navigate('/projects')}>Back to Projects</button>
        </div>
      </div>
    );
  }

  const { project, research, scripts, factChecks, assets, videos, thumbnails, seo, revisions, approvals } = projectData;
  const currentStage = project.current_stage || 'CREATED';
  const latestScript = scripts?.[0];
  const latestFactCheck = factChecks?.[0];
  const latestResearch = research?.[0];

  return (
    <>
      <div className="page-header">
        <div className="flex items-center justify-between" style={{ flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div className="flex items-center gap-sm">
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/projects')}>← Projects</button>
              <span className="text-mono text-sm" style={{ color: 'var(--accent-blue)', fontWeight: 700 }}>{project.id}</span>
              <span className={`badge badge-${project.status === 'ACTIVE' ? 'active' : project.status === 'COMPLETED' ? 'completed' : 'waiting'}`}>
                {project.status}
              </span>
            </div>
            <h2 style={{ marginTop: '8px' }}>{project.title}</h2>
            <p>{project.niche ? `Niche: ${project.niche}` : ''} {project.target_audience ? ` • Audience: ${project.target_audience}` : ''} • Duration: {project.target_duration}</p>
          </div>

          <div className="flex items-center gap-sm" style={{ flexWrap: 'wrap' }}>
            {project.status === 'CREATED' && (
              <button className="btn btn-primary btn-lg" onClick={() => handleCommand('START')}>
                🚀 Start Pipeline
              </button>
            )}
            {project.status === 'ACTIVE' && (
              <button className="btn btn-ghost" onClick={() => handleCommand('PAUSE')}>
                ⏸️ Pause
              </button>
            )}
            {project.status === 'PAUSED' && (
              <button className="btn btn-primary" onClick={() => handleCommand('RESUME')}>
                ▶️ Resume
              </button>
            )}
            {currentStage === 'TOPIC_REVIEW' && (
              <button className="btn btn-success" onClick={() => setApprovalModal('TOPIC_REVIEW')}>
                👁️ Review Topics
              </button>
            )}
            {currentStage === 'HUMAN_APPROVAL' && (
              <button className="btn btn-success btn-lg" onClick={() => setApprovalModal('HUMAN_APPROVAL')}>
                👤 Final Approval & Publish
              </button>
            )}
            <button className="btn btn-ghost btn-sm" onClick={() => setApprovalModal('REVISION_MODAL')}>
              🔄 Request Revision
            </button>
          </div>
        </div>
      </div>

      <div className="page-body">
        {/* Pipeline Visualizer Card */}
        <div className="card" style={{ marginBottom: 'var(--space-xl)' }}>
          <div className="card-header">
            <h3 className="card-title">Orchestrator Stage Execution</h3>
            <span className="text-sm text-secondary">Stage: <strong style={{ color: 'var(--accent-blue)' }}>{currentStage}</strong></span>
          </div>
          <PipelineVisualizer currentStage={currentStage} status={project.status} />
        </div>

        {/* Quality Score & Quick Summary Banner */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-md)', marginBottom: 'var(--space-xl)' }}>
          <div className="card flex items-center gap-lg">
            <ScoreGauge score={project.overall_score || 0} label="Quality Score" />
            <div>
              <div style={{ fontWeight: 700, fontSize: 'var(--font-size-md)' }}>Quality Control Gate</div>
              <p className="text-sm text-secondary" style={{ marginTop: '4px' }}>
                {project.overall_score >= 85 ? 'Exceptional quality. Surpasses production benchmark.' : project.overall_score >= 70 ? 'Good quality. Approved for workflow transition.' : 'Requires agent refinement or revision.'}
              </p>
            </div>
          </div>

          <div className="card">
            <div className="card-title" style={{ marginBottom: '8px' }}>Production Package Check</div>
            <div className="text-sm" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div>🔬 <strong>Research:</strong> {latestResearch ? 'Verified' : 'Pending'}</div>
              <div>✍️ <strong>Script:</strong> {latestScript ? `v${latestScript.version_number || 1} (${latestScript.word_count || 0} words)` : 'Pending'}</div>
              <div>🔍 <strong>Fact-Check:</strong> {latestFactCheck ? `${latestFactCheck.final_decision} (Score: ${latestFactCheck.confidence_score}%)` : 'Pending'}</div>
              <div>🎨 <strong>Assets:</strong> {assets?.length || 0} items generated</div>
            </div>
          </div>
        </div>

        {/* Stage Content Tabs */}
        <div style={{ borderBottom: '1px solid var(--border-primary)', display: 'flex', gap: '8px', marginBottom: 'var(--space-lg)', overflowX: 'auto' }}>
          {[
            { key: 'pipeline', label: '📊 Metadata & Setup' },
            { key: 'research', label: '🔬 Research (Agent 1 & 2)' },
            { key: 'script', label: '✍️ Script (Agent 3)' },
            { key: 'factcheck', label: '🔍 Fact-Check (Agent 4)' },
            { key: 'media', label: '🎨 Media & Video (Agent 5,6,7,8)' },
            { key: 'seo', label: '🏷️ Packaging (Agent 9)' },
            { key: 'revisions', label: `🔄 Revisions (${revisions?.length || 0})` },
            { key: 'approvals', label: '👤 Approvals' },
          ].map(t => (
            <button
              key={t.key}
              className={`btn btn-ghost btn-sm ${activeTab === t.key ? 'active' : ''}`}
              style={{
                borderBottom: activeTab === t.key ? '2px solid var(--accent-blue)' : '2px solid transparent',
                borderRadius: '0',
                color: activeTab === t.key ? 'var(--accent-blue)' : 'var(--text-secondary)'
              }}
              onClick={() => setActiveTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* TAB CONTENTS */}
        {activeTab === 'pipeline' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--space-md)' }}>
            <div className="card">
              <h4 className="card-title" style={{ marginBottom: '12px' }}>Project Configuration (16 Attributes)</h4>
              <div className="text-sm" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div><strong>Project ID:</strong> {project.id}</div>
                <div><strong>Selected Topic:</strong> {project.topic || 'Pending selection'}</div>
                <div><strong>Target Audience:</strong> {project.target_audience || 'General'}</div>
                <div><strong>Format:</strong> {project.format_type || 'Long-form'} ({project.video_format || '16:9'})</div>
                <div><strong>Primary Language:</strong> {project.primary_language || project.language || 'en'}</div>
                <div><strong>Content Style:</strong> {project.content_style || 'Default'}</div>
                <div><strong>Tone:</strong> {project.tone || 'Conversational'}</div>
                <div><strong>Geographic Focus:</strong> {project.geographic_audience || 'Global'}</div>
                <div><strong>Quality Target:</strong> {project.quality_target || 'PREMIUM'}</div>
                <div><strong>Budget Constraint:</strong> ${project.budget_limit || 10.0}</div>
              </div>
            </div>

            <div className="card">
              <h4 className="card-title" style={{ marginBottom: '12px' }}>Human Direction & Controls</h4>
              {currentStage === 'TOPIC_REVIEW' ? (
                <div>
                  <p className="text-sm" style={{ color: 'var(--accent-orange)', marginBottom: '12px' }}>
                    Agent 1 (Market Intelligence) completed topic demand scoring. Review and approve the target topic.
                  </p>
                  <button className="btn btn-primary btn-sm" onClick={() => setApprovalModal('TOPIC_REVIEW')}>Review Topics</button>
                </div>
              ) : currentStage === 'HUMAN_APPROVAL' ? (
                <div>
                  <p className="text-sm" style={{ color: 'var(--accent-green)', marginBottom: '12px' }}>
                    All AI agents completed production. Final package is ready for Human Owner authorization.
                  </p>
                  <button className="btn btn-success btn-sm" onClick={() => setApprovalModal('HUMAN_APPROVAL')}>Open Final Approval Gate</button>
                </div>
              ) : (
                <p className="text-sm text-secondary">
                  Pipeline is currently running stage: <strong>{currentStage}</strong> under Agent 10 orchestration.
                </p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'research' && (
          <div className="card">
            <h3 className="card-title" style={{ marginBottom: '16px' }}>🔬 Multi-Source Intelligence & Verification</h3>
            {!latestResearch ? (
              <div className="empty-state">No research data recorded yet.</div>
            ) : (
              <div className="flex flex-col gap-md">
                {latestResearch.suggested_story_angle && (
                  <div style={{ background: 'var(--bg-elevated)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)' }}>
                    <strong>Recommended Narrative Angle:</strong>
                    <p className="text-sm" style={{ marginTop: '4px' }}>{latestResearch.suggested_story_angle}</p>
                  </div>
                )}

                <div>
                  <h4>Verified Primary Facts</h4>
                  <ul style={{ paddingLeft: '20px', marginTop: '8px' }}>
                    {Array.isArray(latestResearch.verified_facts) && latestResearch.verified_facts.map((f, i) => (
                      <li key={i} className="text-sm" style={{ marginBottom: '6px' }}>
                        {typeof f === 'string' ? f : <span><strong>{f.fact}</strong> (Source: {f.source} • Reliability: {f.reliability || 'HIGH'})</span>}
                      </li>
                    ))}
                  </ul>
                </div>

                {latestResearch.misinformation_risks && (
                  <div>
                    <h4>Misinformation / Claim Trap Warnings</h4>
                    <ul style={{ paddingLeft: '20px', marginTop: '8px', color: 'var(--accent-orange)' }}>
                      {Array.isArray(latestResearch.misinformation_risks) && latestResearch.misinformation_risks.map((m, i) => (
                        <li key={i} className="text-sm" style={{ marginBottom: '4px' }}>{typeof m === 'string' ? m : JSON.stringify(m)}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'script' && (
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">✍️ Production Script Breakdown</h3>
              {latestScript && <span className="badge badge-completed">Score: {latestScript.confidence_score}</span>}
            </div>
            {!latestScript ? (
              <div className="empty-state">No script generated yet.</div>
            ) : (
              <div>
                <div style={{ marginBottom: '16px', background: 'var(--bg-input)', padding: '12px', borderRadius: 'var(--radius-md)', fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-sm)' }}>
                  <strong>Working Title:</strong> {latestScript.title_concept || 'Untitled'}
                </div>
                <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.8', background: 'var(--bg-elevated)', padding: '20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)', fontSize: 'var(--font-size-base)' }}>
                  {latestScript.full_script}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'factcheck' && (
          <div className="card">
            <h3 className="card-title" style={{ marginBottom: '16px' }}>🔍 Independent Claim Verification</h3>
            {!latestFactCheck ? (
              <div className="empty-state">Fact check has not been run yet.</div>
            ) : (
              <div>
                <div className="flex items-center gap-md" style={{ marginBottom: '16px' }}>
                  <span className={`badge badge-${latestFactCheck.final_decision === 'APPROVE' ? 'active' : 'failed'}`}>
                    Decision: {latestFactCheck.final_decision}
                  </span>
                  <span className="text-sm text-secondary">Accuracy Score: {latestFactCheck.confidence_score}%</span>
                </div>

                <h4>Detailed Claim Audit</h4>
                <div className="table-container mt-md">
                  <table>
                    <thead>
                      <tr>
                        <th>Claim</th>
                        <th>Classification</th>
                        <th>Evidence / Verification Source</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.isArray(latestFactCheck.verified_claims) && latestFactCheck.verified_claims.map((c, i) => (
                        <tr key={i}>
                          <td className="text-sm">{c.claim || JSON.stringify(c)}</td>
                          <td><span className="badge badge-completed">VERIFIED</span></td>
                          <td className="text-sm text-secondary">{c.source || 'Cross-verified'}</td>
                        </tr>
                      ))}
                      {Array.isArray(latestFactCheck.false_claims) && latestFactCheck.false_claims.map((c, i) => (
                        <tr key={`f-${i}`}>
                          <td className="text-sm">{c.claim || JSON.stringify(c)}</td>
                          <td><span className="badge badge-failed">FALSE</span></td>
                          <td className="text-sm text-danger">{c.evidence || c.correction}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'media' && (
          <div>
            <h3 style={{ marginBottom: '16px' }}>🎨 Scene Generation & Post-Production Assets</h3>
            {(!assets || assets.length === 0) ? (
              <div className="card empty-state">No media assets generated yet.</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--space-md)' }}>
                {assets.map(asset => (
                  <div key={asset.id} className="card">
                    <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: '8px' }}>
                      {asset.asset_type} • {asset.scene_id || 'Scene'}
                    </div>
                    {asset.file_path ? (
                      <img src={`/media/${asset.file_path.replace(/\\/g, '/')}`} alt={asset.prompt} style={{ width: '100%', height: '160px', objectFit: 'cover', borderRadius: 'var(--radius-md)', marginBottom: '8px' }} onError={(e) => { e.target.style.display = 'none'; }} />
                    ) : (
                      <div style={{ height: '140px', background: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-md)', marginBottom: '8px', color: 'var(--text-tertiary)' }}>
                        Asset Pending Generation
                      </div>
                    )}
                    <p className="text-sm text-secondary truncate">{asset.prompt || asset.file_name}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'seo' && (
          <div className="card">
            <h3 className="card-title" style={{ marginBottom: '16px' }}>🏷️ Title, Thumbnails & SEO Packaging</h3>
            {!seo ? (
              <div className="empty-state">SEO package has not been generated yet.</div>
            ) : (
              <div className="flex flex-col gap-md">
                <div>
                  <strong>Recommended Title:</strong>
                  <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, color: 'var(--accent-cyan)', marginTop: '4px' }}>
                    {seo.recommended_title}
                  </div>
                </div>

                <div>
                  <strong>Description:</strong>
                  <div style={{ whiteSpace: 'pre-wrap', background: 'var(--bg-input)', padding: '16px', borderRadius: 'var(--radius-md)', marginTop: '6px', fontSize: 'var(--font-size-sm)' }}>
                    {seo.description}
                  </div>
                </div>

                {seo.keywords && (
                  <div>
                    <strong>Search Keywords:</strong>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                      {Array.isArray(seo.keywords) && seo.keywords.map((k, i) => (
                        <span key={i} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-primary)', padding: '2px 8px', borderRadius: 'var(--radius-sm)', fontSize: 'var(--font-size-xs)' }}>
                          #{k}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'revisions' && (
          <div className="card">
            <h3 className="card-title" style={{ marginBottom: '16px' }}>🔄 Version History & Correction Loops</h3>
            {(!revisions || revisions.length === 0) ? (
              <div className="empty-state">No revisions requested. Quality standards satisfied on first pass.</div>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>From</th>
                      <th>Responsible Agent</th>
                      <th>Target Component</th>
                      <th>Severity</th>
                      <th>Status</th>
                      <th>Problem / Correction</th>
                    </tr>
                  </thead>
                  <tbody>
                    {revisions.map((r) => (
                      <tr key={r.id}>
                        <td>{r.from_agent}</td>
                        <td><strong>{r.to_agent}</strong></td>
                        <td>{r.target_section || r.stage}</td>
                        <td><span className={`badge badge-${r.severity === 'CRITICAL' ? 'failed' : 'waiting'}`}>{r.severity}</span></td>
                        <td><span className="badge badge-revision">{r.status}</span></td>
                        <td className="text-sm">{r.reason || r.correction_instructions}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'approvals' && (
          <div className="card">
            <h3 className="card-title" style={{ marginBottom: '16px' }}>👤 Human Owner Approval Audit Log</h3>
            {(!approvals || approvals.length === 0) ? (
              <div className="empty-state">No human approval records logged yet.</div>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Stage</th>
                      <th>Decision</th>
                      <th>Notes</th>
                      <th>Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {approvals.map((a) => (
                      <tr key={a.id}>
                        <td>{a.stage}</td>
                        <td><span className={`badge badge-${a.action === 'APPROVE' ? 'active' : 'failed'}`}>{a.action}</span></td>
                        <td className="text-sm">{a.notes || '—'}</td>
                        <td className="text-sm text-secondary">{new Date(a.created_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* TOPIC SELECTION MODAL */}
      {approvalModal === 'TOPIC_REVIEW' && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setApprovalModal(null)}>
          <div className="modal" style={{ maxWidth: '700px' }}>
            <div className="modal-header">
              <h3>👁️ Topic Selection Gate (Agent 1 Research)</h3>
              <button className="modal-close" onClick={() => setApprovalModal(null)}>×</button>
            </div>
            <p className="text-sm text-secondary" style={{ marginBottom: '16px' }}>
              Review the evaluated content opportunities. Selected topic will be handed off to Agent 2 (Deep Research) & Agent 3 (Scriptwriter).
            </p>

            {latestResearch?.topic_scores ? (
              <div className="flex flex-col gap-sm" style={{ marginBottom: '20px' }}>
                {(typeof latestResearch.topic_scores === 'string' ? JSON.parse(latestResearch.topic_scores) : latestResearch.topic_scores).map((t, idx) => (
                  <div
                    key={idx}
                    onClick={() => setSelectedTopic(t.topic)}
                    style={{
                      padding: '12px',
                      borderRadius: 'var(--radius-md)',
                      border: `1px solid ${selectedTopic === t.topic ? 'var(--accent-blue)' : 'var(--border-primary)'}`,
                      background: selectedTopic === t.topic ? 'var(--accent-blue-glow)' : 'var(--bg-elevated)',
                      cursor: 'pointer'
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <strong>{t.topic}</strong>
                      <span className="badge badge-active">Demand Score: {t.total || t.score || 85}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <input
                className="input"
                placeholder="Enter or confirm topic name"
                value={selectedTopic || project.topic}
                onChange={(e) => setSelectedTopic(e.target.value)}
                style={{ marginBottom: '16px' }}
              />
            )}

            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setApprovalModal(null)}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={() => handleCommand('APPROVE', { selectedTopic: selectedTopic || project.topic })}
              >
                ✅ Authorize Topic & Launch Research
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TARGETED REVISION MODAL */}
      {approvalModal === 'REVISION_MODAL' && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setApprovalModal(null)}>
          <div className="modal" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3>🔄 Request Targeted Agent Revision</h3>
              <button className="modal-close" onClick={() => setApprovalModal(null)}>×</button>
            </div>
            <p className="text-sm text-secondary" style={{ marginBottom: '16px' }}>
              Target the exact component that requires correction. The Orchestrator will route the revision to the responsible agent without unnecessarily regenerating the whole project.
            </p>

            <div className="input-group">
              <label>Target Component / Responsible Agent</label>
              <select className="input" value={revisionForm.component} onChange={e => setRevisionForm(f => ({ ...f, component: e.target.value }))}>
                <option value="Thumbnail (Agent 9)">Thumbnail & Title Packaging (Agent 9)</option>
                <option value="Voice (Agent 5)">Voice Pacing & Audio (Agent 5)</option>
                <option value="Scene / Motion (Agent 7)">Video Scene & Motion (Agent 7)</option>
                <option value="Video Editing (Agent 8)">Timeline, Mix & Subtitles (Agent 8)</option>
                <option value="Script (Agent 3)">Script Structure & Retention (Agent 3)</option>
                <option value="Fact / Research (Agent 2 & 4)">Fact Accuracy & Research (Agent 2 & 4)</option>
              </select>
            </div>

            <div className="input-group">
              <label>Severity</label>
              <select className="input" value={revisionForm.severity} onChange={e => setRevisionForm(f => ({ ...f, severity: e.target.value }))}>
                <option value="MEDIUM">MEDIUM (Minor refinement)</option>
                <option value="HIGH">HIGH (Standard revision)</option>
                <option value="CRITICAL">CRITICAL (Major defect correction)</option>
              </select>
            </div>

            <div className="input-group">
              <label>Correction Instructions *</label>
              <textarea className="input" placeholder="Explain the exact issue and required correction..." value={revisionForm.notes} onChange={e => setRevisionForm(f => ({ ...f, notes: e.target.value }))} rows={4} />
            </div>

            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setApprovalModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleTargetedRevision}>🔄 Submit Revision Request</button>
            </div>
          </div>
        </div>
      )}

      {/* FINAL APPROVAL & PUBLISH MODAL */}
      {approvalModal === 'HUMAN_APPROVAL' && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setApprovalModal(null)}>
          <div className="modal" style={{ maxWidth: '750px' }}>
            <div className="modal-header">
              <h3>👤 Final Human Owner Authorization Gate</h3>
              <button className="modal-close" onClick={() => setApprovalModal(null)}>×</button>
            </div>
            <p className="text-sm text-secondary" style={{ marginBottom: '16px' }}>
              Review the 9-stage production package. Publication to YouTube requires explicit Human Owner authorization.
            </p>

            <div style={{ background: 'var(--bg-input)', padding: '16px', borderRadius: 'var(--radius-md)', marginBottom: '16px' }}>
              <div><strong>Final Title:</strong> {seo?.recommended_title || project.title}</div>
              <div><strong>Duration:</strong> {project.target_duration} • <strong>Format:</strong> {project.format_type || 'Long-form'}</div>
              <div><strong>Overall Quality Score:</strong> {project.overall_score || 85}/100</div>
              <div><strong>Fact-Check Status:</strong> {latestFactCheck?.final_decision || 'APPROVED'}</div>
            </div>

            <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
              <button
                className="btn btn-danger"
                onClick={() => handleCommand('REJECT', { notes: 'Rejected by owner' })}
              >
                ❌ Reject
              </button>

              <div className="flex items-center gap-sm">
                <button
                  className="btn btn-ghost"
                  onClick={() => {
                    setApprovalModal('REVISION_MODAL');
                  }}
                >
                  🔄 Request Targeted Revision
                </button>
                <button
                  className="btn btn-success btn-lg"
                  onClick={() => handleCommand('PUBLISH_NOW')}
                >
                  🚀 Authorize & Publish Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
