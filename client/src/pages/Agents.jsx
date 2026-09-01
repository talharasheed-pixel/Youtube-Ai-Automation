import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { getSocket } from '../services/socket';

const AGENT_ICONS = {
  'agent-market-intel': '📈',
  'agent-deep-research': '🔬',
  'agent-scriptwriter': '✍️',
  'agent-fact-checker': '🔍',
  'agent-voice': '🎙️',
  'agent-visual': '🎨',
  'agent-video-gen': '🎥',
  'agent-editor': '✂️',
  'agent-seo': '🏷️',
  'agent-manager': '👑',
};

export default function Agents() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadAgents = async () => {
    try {
      const data = await api.getAgents();
      setAgents(data.agents || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAgents();

    const socket = getSocket();
    const handleStatus = (data) => {
      setAgents((prev) =>
        prev.map((a) => (a.id === data.agentId ? { ...a, status: data.status } : a))
      );
    };

    socket.on('agent:status', handleStatus);
    return () => {
      socket.off('agent:status', handleStatus);
    };
  }, []);

  return (
    <>
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h2>AI Agent Organization</h2>
            <p>10 Specialized Autonomous Agents working under Human Supervision</p>
          </div>
          <button className="btn btn-ghost" onClick={loadAgents}>🔄 Refresh Status</button>
        </div>
      </div>

      <div className="page-body">
        {loading ? (
          <div className="empty-state">Loading agent registry...</div>
        ) : (
          <div className="agent-grid">
            {agents.map((agent) => (
              <div key={agent.id} className="agent-card">
                <div className="agent-number">#{agent.agent_number}</div>
                <div className="flex items-center gap-sm" style={{ marginBottom: '8px' }}>
                  <span style={{ fontSize: '1.8rem' }}>{AGENT_ICONS[agent.id] || '🤖'}</span>
                  <div>
                    <h4 className="agent-name">{agent.name}</h4>
                    <span className="agent-role">{agent.role}</span>
                  </div>
                </div>

                <div style={{ margin: '12px 0' }}>
                  <span
                    className={`badge badge-${
                      agent.status === 'ACTIVE'
                        ? 'active'
                        : agent.status === 'FAILED'
                        ? 'failed'
                        : 'idle'
                    }`}
                  >
                    {agent.status}
                  </span>
                </div>

                <p className="text-sm text-secondary" style={{ minHeight: '40px', lineHeight: '1.4' }}>
                  {agent.system_prompt ? agent.system_prompt.substring(0, 120) + '...' : 'Specialized agent in the production workflow pipeline.'}
                </p>

                <div className="agent-metrics">
                  <div className="metric">
                    <div className="metric-value">{agent.success_count || 0}</div>
                    <div className="metric-label">Completed</div>
                  </div>
                  <div className="metric">
                    <div className="metric-value">{agent.failure_count || 0}</div>
                    <div className="metric-label">Failed</div>
                  </div>
                  <div className="metric">
                    <div className="metric-value" style={{ color: agent.successRate >= 80 ? 'var(--accent-green)' : 'var(--text-primary)' }}>
                      {agent.successRate || 100}%
                    </div>
                    <div className="metric-label">Success Rate</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
