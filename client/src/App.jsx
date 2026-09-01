import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useStore } from './store';
import { getSocket } from './services/socket';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import Agents from './pages/Agents';
import Settings from './pages/Settings';
import LiveExecution from './pages/LiveExecution';
import YouTubeStudioLive from './pages/YouTubeStudioLive';
import Toasts from './components/Toasts';

const NAV_ITEMS = [
  { path: '/', icon: '📊', label: 'Dashboard' },
  { path: '/projects', icon: '🎬', label: 'Projects' },
  { path: '/execution', icon: '🟣', label: 'Live Execution' },
  { path: '/studio-live', icon: '📺', label: 'YouTube Studio' },
  { path: '/agents', icon: '🤖', label: 'Agent Team' },
  { path: '/settings', icon: '⚙️', label: 'Settings' },
];

function App() {
  const location = useLocation();
  const { addToast } = useStore();

  useEffect(() => {
    const socket = getSocket();

    socket.on('agent:status', (data) => {
      useStore.getState().updateAgent(data.agentId, { status: data.status });
      if (data.status === 'COMPLETED') {
        addToast({ type: 'success', message: `Agent ${data.agentId} completed task` });
      } else if (data.status === 'FAILED') {
        addToast({ type: 'error', message: `Agent ${data.agentId} failed: ${data.error}` });
      }
    });

    socket.on('workflow:stage', (data) => {
      addToast({ type: 'info', message: `Stage ${data.stage}: ${data.status}` });
    });

    socket.on('approval:required', (data) => {
      addToast({ type: 'warning', message: `⚠️ Approval needed: ${data.message}` });
    });

    return () => {
      socket.off('agent:status');
      socket.off('workflow:stage');
      socket.off('approval:required');
    };
  }, []);

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <span className="logo-icon">🎬</span>
          <h1>YouTube AI OS</h1>
        </div>

        <nav className="sidebar-nav">
          <div style={{ padding: '0 8px', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Navigation
            </span>
          </div>
          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div style={{
            padding: '12px',
            background: 'var(--bg-elevated)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-primary)',
          }}>
            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>System Status</div>
            <div className="flex items-center gap-sm">
              <span style={{
                width: 8, height: 8, borderRadius: '50%',
                background: 'var(--accent-green)',
                boxShadow: '0 0 8px var(--accent-green)',
              }} />
              <span style={{ fontSize: '13px', fontWeight: 600 }}>Online</span>
            </div>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/:id" element={<ProjectDetail />} />
          <Route path="/execution" element={<LiveExecution />} />
          <Route path="/studio-live" element={<YouTubeStudioLive />} />
          <Route path="/agents" element={<Agents />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>

      <Toasts />
    </div>
  );
}

export default App;
