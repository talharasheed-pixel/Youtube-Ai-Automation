import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useStore } from '../store';

const STATUS_BADGE = {
  CREATED: 'idle', ACTIVE: 'active', COMPLETED: 'completed', FAILED: 'failed',
  PAUSED: 'waiting', REJECTED: 'failed', CANCELLED: 'idle',
  PUBLISHED: 'completed', SCHEDULED: 'waiting', PUBLISHING: 'active',
};

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.getStats()
      .then(setStats)
      .catch(() => setStats({ totalProjects: 0, activeProjects: 0, completedProjects: 0, publishedProjects: 0, failedTasks: 0, pendingApprovals: 0, totalRevisions: 0, recentProjects: [] }))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="page-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: '16px', animation: 'pulse-ring 2s infinite' }}>🎬</div>
        <div style={{ color: 'var(--text-secondary)' }}>Loading dashboard...</div>
      </div>
    </div>
  );

  return (
    <>
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h2>Command Center</h2>
            <p>AI YouTube Automation OS — Multi-Agent Production Platform</p>
          </div>
          <button className="btn btn-primary btn-lg" onClick={() => navigate('/projects')}>
            ➕ New Project
          </button>
        </div>
      </div>

      <div className="page-body">
        {/* Stats Grid */}
        <div className="stats-grid" style={{ marginBottom: 'var(--space-xl)' }}>
          <div className="stat-card" style={{ '--stat-accent': 'var(--gradient-primary)' }}>
            <div className="stat-icon">🎬</div>
            <div className="stat-value">{stats?.totalProjects || 0}</div>
            <div className="stat-label">Total Projects</div>
          </div>
          <div className="stat-card" style={{ '--stat-accent': 'var(--gradient-success)' }}>
            <div className="stat-icon">⚡</div>
            <div className="stat-value">{stats?.activeProjects || 0}</div>
            <div className="stat-label">Active Pipelines</div>
          </div>
          <div className="stat-card" style={{ '--stat-accent': 'linear-gradient(135deg, #f59e0b, #ef4444)' }}>
            <div className="stat-icon">⏳</div>
            <div className="stat-value">{stats?.pendingApprovals || 0}</div>
            <div className="stat-label">Pending Approvals</div>
          </div>
          <div className="stat-card" style={{ '--stat-accent': 'linear-gradient(135deg, #22d3ee, #10b981)' }}>
            <div className="stat-icon">🚀</div>
            <div className="stat-value">{stats?.publishedProjects || 0}</div>
            <div className="stat-label">Published</div>
          </div>
          <div className="stat-card" style={{ '--stat-accent': 'linear-gradient(135deg, #8b5cf6, #ec4899)' }}>
            <div className="stat-icon">🔄</div>
            <div className="stat-value">{stats?.totalRevisions || 0}</div>
            <div className="stat-label">Total Revisions</div>
          </div>
          <div className="stat-card" style={{ '--stat-accent': 'var(--gradient-danger)' }}>
            <div className="stat-icon">⚠️</div>
            <div className="stat-value">{stats?.failedTasks || 0}</div>
            <div className="stat-label">Failed Tasks</div>
          </div>
        </div>

        {/* Recent Projects */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Recent Projects</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/projects')}>View All →</button>
          </div>

          {(!stats?.recentProjects || stats.recentProjects.length === 0) ? (
            <div className="empty-state">
              <div className="empty-icon">🎬</div>
              <h3>No projects yet</h3>
              <p>Create your first AI-powered video project to get started.</p>
              <button className="btn btn-primary mt-md" onClick={() => navigate('/projects')}>Create Project</button>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Stage</th>
                    <th>Status</th>
                    <th>Score</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentProjects.map(p => (
                    <tr key={p.id} onClick={() => navigate(`/projects/${p.id}`)} style={{ cursor: 'pointer' }}>
                      <td style={{ fontWeight: 600 }}>{p.title}</td>
                      <td><span className="text-sm text-secondary">{p.current_stage || 'CREATED'}</span></td>
                      <td><span className={`badge badge-${STATUS_BADGE[p.status] || 'idle'}`}>{p.status || 'CREATED'}</span></td>
                      <td><span className="text-mono">{p.overall_score || '—'}</span></td>
                      <td className="text-sm text-secondary">{new Date(p.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
