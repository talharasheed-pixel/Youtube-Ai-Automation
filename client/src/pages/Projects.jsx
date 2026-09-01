import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useStore } from '../store';

const STATUS_BADGE = {
  CREATED: 'idle', ACTIVE: 'active', COMPLETED: 'completed', FAILED: 'failed',
  PAUSED: 'waiting', REJECTED: 'failed', CANCELLED: 'idle', PUBLISHED: 'completed',
  SCHEDULED: 'waiting', PUBLISHING: 'active',
};

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [channels, setChannels] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    title: '',
    channelId: '',
    niche: '',
    targetAudience: '',
    primaryLanguage: 'en',
    secondaryLanguage: '',
    formatType: 'Long-form',
    targetDuration: '10-15 min',
    contentStyle: 'Educational & Engaging',
    tone: 'Engaging, Authoritative & Conversational',
    uploadFrequency: 'Weekly',
    geographicAudience: 'Global',
    contentRestrictions: 'PG / Brand-Safe / No Misinformation',
    monetizationObjective: 'AdSense & High Audience Retention',
    qualityTarget: 'PREMIUM',
    budgetConstraints: 10.0,
    approvalRequirements: 'Topic Review & Final Packaging Gate',
  });

  const navigate = useNavigate();
  const addToast = useStore(s => s.addToast);

  const load = () => {
    api.getProjects().then(d => setProjects(d.projects || [])).catch(() => {});
    api.getChannels().then(d => setChannels(d.channels || [])).catch(() => {});
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!form.title.trim()) return addToast({ type: 'error', message: 'Project Title is required' });
    try {
      const { project } = await api.createProject(form);
      addToast({ type: 'success', message: `Project ${project.id} initialized` });
      setShowCreate(false);
      load();
      navigate(`/projects/${project.id}`);
    } catch (e) {
      addToast({ type: 'error', message: e.message });
    }
  };

  return (
    <>
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h2>YouTube Production Projects</h2>
            <p>Autonomous multi-agent content pipelines under human control</p>
          </div>
          <button className="btn btn-primary btn-lg" onClick={() => setShowCreate(true)}>➕ Initialize New Project</button>
        </div>
      </div>

      <div className="page-body">
        {projects.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🎬</div>
            <h3>No Active Projects</h3>
            <p>Initialize a project to activate the 10-agent YouTube production team.</p>
            <button className="btn btn-primary mt-md" onClick={() => setShowCreate(true)}>Initialize Project</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 'var(--space-md)' }}>
            {projects.map(p => (
              <div key={p.id} className="card" onClick={() => navigate(`/projects/${p.id}`)} style={{ cursor: 'pointer' }}>
                <div className="card-header">
                  <div>
                    <span className="text-mono text-sm" style={{ color: 'var(--accent-blue)', fontWeight: 700 }}>{p.id}</span>
                    <h3 className="card-title truncate" style={{ maxWidth: '240px', marginTop: '2px' }}>{p.title}</h3>
                  </div>
                  <span className={`badge badge-${STATUS_BADGE[p.status] || 'idle'}`}>{p.status}</span>
                </div>
                <div className="text-sm text-secondary" style={{ marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div>📌 <strong>Niche:</strong> {p.niche || 'General'} • <strong>Format:</strong> {p.format_type || 'Long-form'}</div>
                  <div>👥 <strong>Audience:</strong> {p.target_audience || 'General'}</div>
                  <div>⏱️ <strong>Duration:</strong> {p.target_duration} • <strong>Quality:</strong> {p.quality_target || 'PREMIUM'}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '12px', borderTop: '1px solid var(--border-primary)' }}>
                  <span className="text-sm" style={{ color: 'var(--accent-cyan)' }}>📍 Stage: <strong>{p.current_stage || 'CREATED'}</strong></span>
                  <div className="flex items-center gap-sm">
                    {p.overall_score > 0 && <span className="text-mono text-sm" style={{ color: p.overall_score >= 70 ? 'var(--accent-green)' : 'var(--accent-orange)' }}>Score: {p.overall_score}</span>}
                    <span className="text-sm text-secondary">{p.task_count || 0} tasks</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Comprehensive Project Initialization Modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowCreate(false)}>
          <div className="modal" style={{ maxWidth: '720px' }}>
            <div className="modal-header">
              <h3>🎬 Project Initialization (Master Specification)</h3>
              <button className="modal-close" onClick={() => setShowCreate(false)}>×</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="input-group" style={{ gridColumn: 'span 2' }}>
                <label>1. Project Title *</label>
                <input className="input" placeholder="e.g., The Untold Story of AI Supercomputers" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
              </div>

              <div className="input-group">
                <label>2. Channel Destination</label>
                <select className="input" value={form.channelId} onChange={e => setForm(f => ({ ...f, channelId: e.target.value }))}>
                  <option value="">Default Connected Channel</option>
                  {channels.map(ch => (
                    <option key={ch.id} value={ch.id}>{ch.channel_name}</option>
                  ))}
                </select>
              </div>

              <div className="input-group">
                <label>3. Content Niche</label>
                <input className="input" placeholder="e.g., Science, Technology, Business" value={form.niche} onChange={e => setForm(f => ({ ...f, niche: e.target.value }))} />
              </div>

              <div className="input-group">
                <label>4. Target Audience</label>
                <input className="input" placeholder="e.g., Tech professionals, 18-35" value={form.targetAudience} onChange={e => setForm(f => ({ ...f, targetAudience: e.target.value }))} />
              </div>

              <div className="input-group">
                <label>5. Format Type</label>
                <select className="input" value={form.formatType} onChange={e => setForm(f => ({ ...f, formatType: e.target.value, targetDuration: e.target.value === 'Shorts' ? '< 60s' : '10-15 min' }))}>
                  <option value="Long-form">Long-form Video (16:9)</option>
                  <option value="Shorts">YouTube Shorts (9:16)</option>
                </select>
              </div>

              <div className="input-group">
                <label>6. Desired Video Duration</label>
                <select className="input" value={form.targetDuration} onChange={e => setForm(f => ({ ...f, targetDuration: e.target.value }))}>
                  {form.formatType === 'Shorts' ? (
                    <>
                      <option value="30s">30 Seconds</option>
                      <option value="45s">45 Seconds</option>
                      <option value="< 60s">60 Seconds (Full Short)</option>
                    </>
                  ) : (
                    <>
                      <option value="3-5 min">Short (3-5 min)</option>
                      <option value="8-12 min">Standard (8-12 min)</option>
                      <option value="10-15 min">Optimal (10-15 min)</option>
                      <option value="20-30 min">Deep Dive (20-30 min)</option>
                    </>
                  )}
                </select>
              </div>

              <div className="input-group">
                <label>7. Primary Language</label>
                <select className="input" value={form.primaryLanguage} onChange={e => setForm(f => ({ ...f, primaryLanguage: e.target.value }))}>
                  <option value="en">English (US/UK)</option>
                  <option value="es">Spanish</option>
                  <option value="de">German</option>
                  <option value="fr">French</option>
                  <option value="hi">Hindi</option>
                  <option value="ur">Urdu</option>
                </select>
              </div>

              <div className="input-group">
                <label>8. Content Style</label>
                <input className="input" placeholder="e.g., Documentary, High-Paced, Storytelling" value={form.contentStyle} onChange={e => setForm(f => ({ ...f, contentStyle: e.target.value }))} />
              </div>

              <div className="input-group">
                <label>9. Tone & Voice Character</label>
                <input className="input" placeholder="e.g., Authoritative, Mysterious, Inspiring" value={form.tone} onChange={e => setForm(f => ({ ...f, tone: e.target.value }))} />
              </div>

              <div className="input-group">
                <label>10. Geographic Audience</label>
                <input className="input" placeholder="e.g., Tier 1 (US, UK, CA, AU)" value={form.geographicAudience} onChange={e => setForm(f => ({ ...f, geographicAudience: e.target.value }))} />
              </div>

              <div className="input-group">
                <label>11. Content Restrictions</label>
                <input className="input" placeholder="e.g., Brand-safe, No copyright music" value={form.contentRestrictions} onChange={e => setForm(f => ({ ...f, contentRestrictions: e.target.value }))} />
              </div>

              <div className="input-group">
                <label>12. Monetization Objective</label>
                <input className="input" placeholder="e.g., Maximizing AdSense & Watch Time" value={form.monetizationObjective} onChange={e => setForm(f => ({ ...f, monetizationObjective: e.target.value }))} />
              </div>

              <div className="input-group">
                <label>13. Quality Target</label>
                <select className="input" value={form.qualityTarget} onChange={e => setForm(f => ({ ...f, qualityTarget: e.target.value }))}>
                  <option value="PREMIUM">PREMIUM (Highest rigor & multi-pass check)</option>
                  <option value="HIGH">HIGH (Standard production standard)</option>
                  <option value="RAPID">RAPID (Fast turnaround)</option>
                </select>
              </div>

              <div className="input-group">
                <label>14. Budget Cap per Video ($ USD)</label>
                <input className="input" type="number" step="0.5" value={form.budgetConstraints} onChange={e => setForm(f => ({ ...f, budgetConstraints: parseFloat(e.target.value) || 5 }))} />
              </div>

              <div className="input-group">
                <label>15. Human Approval Gates</label>
                <select className="input" value={form.approvalRequirements} onChange={e => setForm(f => ({ ...f, approvalRequirements: e.target.value }))}>
                  <option value="Topic & Final Approval Required">Topic Review + Final Approval Required</option>
                  <option value="All Stages Manual Approval">Manual Approval at Every Stage</option>
                  <option value="Final Approval Only">Final Approval Only</option>
                </select>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowCreate(false)}>Cancel</button>
              <button className="btn btn-primary btn-lg" onClick={handleCreate}>🚀 Initialize Project & Activate Team</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
