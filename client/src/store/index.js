import { create } from 'zustand';

export const useStore = create((set, get) => ({
  // Projects
  projects: [],
  currentProject: null,
  stats: null,

  // Agents
  agents: [],

  // UI
  sidebarOpen: true,
  toasts: [],

  // Actions
  setProjects: (projects) => set({ projects }),
  setCurrentProject: (project) => set({ currentProject: project }),
  setStats: (stats) => set({ stats }),
  setAgents: (agents) => set({ agents }),

  updateAgent: (agentId, update) => set((state) => ({
    agents: state.agents.map(a => a.id === agentId ? { ...a, ...update } : a),
  })),

  updateProject: (projectId, update) => set((state) => ({
    projects: state.projects.map(p => p.id === projectId ? { ...p, ...update } : p),
    currentProject: state.currentProject?.id === projectId
      ? { ...state.currentProject, ...update }
      : state.currentProject,
  })),

  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

  addToast: (toast) => {
    const id = Date.now();
    set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter(t => t.id !== id) }));
    }, 4000);
  },
}));
