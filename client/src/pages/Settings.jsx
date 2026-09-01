import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useStore } from '../store';

export default function Settings() {
  const addToast = useStore((s) => s.addToast);
  const [providers, setProviders] = useState([]);
  const [channels, setChannels] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [budget, setBudget] = useState(null);
  const [systemStatus, setSystemStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [provData, chanData, logsData, budData, sysData] = await Promise.allSettled([
        api.getProviders(),
        api.getChannels(),
        api.getAuditLogs(),
        api.getBudget(),
        api.getSystemStatus(),
      ]);

      if (provData.status === 'fulfilled') setProviders(provData.value.providers || []);
      if (chanData.status === 'fulfilled') setChannels(chanData.value.channels || []);
      if (logsData.status === 'fulfilled') setAuditLogs(logsData.value.logs || []);
      if (budData.status === 'fulfilled') setBudget(budData.value);
      if (sysData.status === 'fulfilled') setSystemStatus(sysData.value);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const [ytClientId, setYtClientId] = useState('');
  const [ytClientSecret, setYtClientSecret] = useState('');
  const [showConfig, setShowConfig] = useState(false);
  const [savingCreds, setSavingCreds] = useState(false);

  const redirectUri = window.location.origin + '/api/youtube/callback';

  useEffect(() => {
    api.getYouTubeCredentials().then((data) => {
      if (data?.clientId) setYtClientId(data.clientId);
    }).catch(() => {});
  }, []);

  const handleSaveCredentials = async (e) => {
    e.preventDefault();
    if (!ytClientId || !ytClientSecret) {
      addToast({ type: 'error', message: 'Please enter both Client ID and Client Secret' });
      return;
    }
    setSavingCreds(true);
    try {
      await api.saveYouTubeCredentials({
        clientId: ytClientId.trim(),
        clientSecret: ytClientSecret.trim(),
        redirectUri: redirectUri,
      });
      addToast({ type: 'success', message: 'Credentials saved! Now click Connect to authenticate.' });
      setShowConfig(false);
    } catch (err) {
      addToast({ type: 'error', message: err.message || 'Failed to save credentials' });
    } finally {
      setSavingCreds(false);
    }
  };

  const handleConnectYouTube = async () => {
    try {
      const { url } = await api.getYouTubeAuthUrl();
      if (url) {
        window.location.href = url;
      }
    } catch (err) {
      setShowConfig(true);
      addToast({ type: 'warning', message: 'Configure your Google Client ID & Secret below, then click Connect.' });
    }
  };

  return (
    <>
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h2>Platform Settings & Integrations</h2>
            <p>Provider routing, YouTube channel integration, budget guardrails, and audit logs</p>
          </div>
          <button className="btn btn-ghost" onClick={loadData}>🔄 Refresh</button>
        </div>
      </div>

      <div className="page-body">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 'var(--space-lg)' }}>
          {/* YouTube OAuth Connection */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">📺 YouTube Channel Integration</h3>
              <span className={`badge badge-${channels.length > 0 ? 'completed' : 'waiting'}`}>
                {channels.length > 0 ? `${channels.length} Connected` : 'Not Connected'}
              </span>
            </div>
            <p className="text-sm text-secondary" style={{ marginBottom: '16px' }}>
              Connect your YouTube channel securely via official Google OAuth2. Passwords are never collected or stored.
            </p>

            {channels.length > 0 ? (
              <div className="flex flex-col gap-sm" style={{ marginBottom: '16px' }}>
                {channels.map((ch) => (
                  <div key={ch.id} style={{ background: 'var(--bg-elevated)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)' }}>
                    <div className="flex items-center justify-between">
                      <strong>{ch.channel_name}</strong>
                      <span className="badge badge-active">{ch.status}</span>
                    </div>
                    <div className="text-sm text-secondary" style={{ marginTop: '4px' }}>
                      <a href={ch.channel_url} target="_blank" rel="noreferrer">Open Channel ↗</a>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="flex gap-sm" style={{ marginBottom: '16px' }}>
              <button className="btn btn-primary flex-1" onClick={handleConnectYouTube}>
                🔗 {channels.length > 0 ? 'Connect Another Channel' : 'Connect YouTube Channel (OAuth2)'}
              </button>
              <button className="btn btn-secondary" onClick={() => setShowConfig(!showConfig)} title="Configure Credentials">
                ⚙️ {showConfig ? 'Hide Config' : 'Configure Keys'}
              </button>
            </div>

            {/* In-App Credentials Form */}
            {showConfig && (
              <form onSubmit={handleSaveCredentials} style={{ background: '#080810', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-primary)', marginTop: '12px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '8px', color: '#60a5fa' }}>
                  🔑 Google Cloud OAuth Credentials
                </h4>
                
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>Client ID</label>
                  <input
                    type="text"
                    value={ytClientId}
                    onChange={(e) => setYtClientId(e.target.value)}
                    placeholder="xxxx.apps.googleusercontent.com"
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', background: '#111827', border: '1px solid #374151', color: '#fff', fontSize: '12px' }}
                  />
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>Client Secret</label>
                  <input
                    type="password"
                    value={ytClientSecret}
                    onChange={(e) => setYtClientSecret(e.target.value)}
                    placeholder="GOCSPX-xxxx"
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', background: '#111827', border: '1px solid #374151', color: '#fff', fontSize: '12px' }}
                  />
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>Authorized Redirect URI (Add in Google Console)</label>
                  <input
                    type="text"
                    readOnly
                    value={redirectUri}
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', background: '#1f2937', border: '1px solid #374151', color: '#9ca3af', fontSize: '11px' }}
                  />
                </div>

                <button type="submit" className="btn btn-sm btn-primary w-full" disabled={savingCreds}>
                  {savingCreds ? 'Saving...' : '💾 Save Credentials'}
                </button>
              </form>
            )}
          </div>

          {/* System & Cost Guardrails */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">💰 Budget & Cost Guardrails</h3>
              <span className="badge badge-active">Protected</span>
            </div>
            <div className="text-sm" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div><strong>Max Cost Per Video:</strong> ${budget?.config?.maxCostPerVideo || 5.0}</div>
              <div><strong>Monthly Budget Cap:</strong> ${budget?.config?.monthlyBudgetCap || 50.0}</div>
              <div><strong>Database Engine:</strong> SQLite WAL Mode (Zero-Config)</div>
              <div><strong>Uptime:</strong> {systemStatus ? `${Math.floor(systemStatus.uptime / 60)} minutes` : 'Active'}</div>
              <div><strong>Registered AI Agents:</strong> 10 Specialized Autonomous Units</div>
            </div>
          </div>
        </div>

        {/* AI Provider Router Configuration */}
        <div className="card mt-lg">
          <div className="card-header">
            <h3 className="card-title">🔌 AI Provider Router Matrix</h3>
            <span className="text-sm text-secondary">Dynamic failover & Multi-model fallback</span>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Provider</th>
                  <th>Model / Engine</th>
                  <th>Priority</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {providers.map((p) => (
                  <tr key={p.id}>
                    <td><strong className="text-sm">{p.provider_type?.toUpperCase()}</strong></td>
                    <td>{p.provider_name}</td>
                    <td className="text-mono text-sm">{p.model || 'Default'}</td>
                    <td><span className="badge badge-completed">Priority {p.priority}</span></td>
                    <td>
                      <span className={`badge badge-${p.is_enabled ? 'active' : 'idle'}`}>
                        {p.is_enabled ? 'ENABLED' : 'DISABLED'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Audit Log Stream */}
        <div className="card mt-lg">
          <div className="card-header">
            <h3 className="card-title">🛡️ Security & Action Audit Logs</h3>
            <span className="text-sm text-secondary">Immutable trace of all agent & human actions</span>
          </div>
          <div className="table-container" style={{ maxHeight: '350px', overflowY: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Action</th>
                  <th>Entity</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.slice(0, 30).map((log) => (
                  <tr key={log.id}>
                    <td><strong style={{ color: 'var(--accent-blue)' }}>{log.action}</strong></td>
                    <td className="text-sm text-secondary">{log.entity_type} ({log.entity_id || 'system'})</td>
                    <td className="text-sm text-secondary text-mono">{new Date(log.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
