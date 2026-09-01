const API_BASE = '/api';

async function request(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

export const api = {
  // Projects
  getProjects: () => request('/projects'),
  getProject: (id) => request(`/projects/${id}`),
  createProject: (data) => request('/projects', { method: 'POST', body: JSON.stringify(data) }),
  updateProject: (id, data) => request(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProject: (id) => request(`/projects/${id}`, { method: 'DELETE' }),
  projectCommand: (id, command, data = {}) => request(`/projects/${id}/command`, { method: 'POST', body: JSON.stringify({ command, data }) }),
  getStats: () => request('/projects/stats/overview'),

  // Agents
  getAgents: () => request('/agents'),
  getAgent: (id) => request(`/agents/${id}`),

  // Workflow
  getWorkflowStages: () => request('/workflow/stages'),
  getWorkflowState: (projectId) => request(`/workflow/${projectId}/state`),
  getHandoffs: (projectId) => request(`/workflow/${projectId}/handoffs`),
  getRevisions: (projectId) => request(`/workflow/${projectId}/revisions`),
  getQualityReport: (projectId) => request(`/workflow/${projectId}/quality`),
  getApprovalPackage: (projectId) => request(`/workflow/${projectId}/approval-package`),
  getErrors: (projectId) => request(`/workflow/${projectId}/errors`),
  getAuditLog: (projectId) => request(`/workflow/${projectId}/audit`),

  // YouTube
  getYouTubeAuthUrl: () => request('/youtube/auth-url'),
  getChannels: () => request('/youtube/channels'),

  // Settings
  getProviders: () => request('/settings/providers'),
  updateProvider: (id, data) => request(`/settings/providers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  getBudget: () => request('/settings/budget'),
  getInsights: () => request('/settings/analytics/insights'),
  getAuditLogs: () => request('/settings/audit-logs'),
  getSystemStatus: () => request('/settings/system-status'),

  // Health
  health: () => request('/health'),
};
