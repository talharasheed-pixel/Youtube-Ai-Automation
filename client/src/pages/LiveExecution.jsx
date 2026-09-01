import { useState, useEffect } from 'react';
import { useStore } from '../store';
import { getSocket } from '../services/socket';

export default function LiveExecution() {
  const { currentProject, agents } = useStore();
  const [activeTab, setActiveTab] = useState('script');
  const [logs, setLogs] = useState([
    { id: 1, time: '12:00:01', agent: 'Agent 1', message: 'Market trend analysis initiated for top opportunities', level: 'info' },
    { id: 2, time: '12:00:15', agent: 'Agent 2', message: 'Primary source IEEE database query executed (confidence: 96%)', level: 'success' },
    { id: 3, time: '12:00:40', agent: 'Agent 3', message: 'Script Engine: Synthesizing 9-track scene breakdown & hook', level: 'info' },
    { id: 4, time: '12:01:05', agent: 'Agent 4', message: 'Fact Checker: 0 critical hallucinations detected, audit PASS', level: 'success' },
  ]);

  const [simulatedScript, setSimulatedScript] = useState('');
  const fullText = `[SCENE 1 | HOOK | 0:00 - 0:15]
(VISUAL: Dramatic 3D schematic rendering of neural microprocessor architecture)
(AUDIO: Low sub-bass riser with cinematic impact)
NARRATOR (VO): "What if the biggest computing revolution of the decade isn't faster chips... but an entirely new physics architecture?"

[SCENE 2 | PROBLEM | 0:15 - 0:45]
(VISUAL: Silicon wafer microscopic electron tunneling visualization)
NARRATOR (VO): "For 50 years, Moore's Law ruled the digital universe. But at 2 nanometers, quantum tunneling caused catastrophic thermal leakage."

[SCENE 3 | THE BREAKTHROUGH | 0:45 - 1:30]
(VISUAL: 3D stacked monolithic architecture diagram with verified benchmark overlays)
NARRATOR (VO): "By stacking micro-logic in 3D monolithic layers, engineers achieved a verified 4x efficiency leap with zero thermal degradation."`;

  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      if (index < fullText.length) {
        setSimulatedScript((prev) => prev + fullText.charAt(index));
        index++;
      } else {
        clearInterval(interval);
      }
    }, 25);

    const socket = getSocket();
    const handleLog = (data) => {
      setLogs((prev) => [
        {
          id: Date.now(),
          time: new Date().toLocaleTimeString(),
          agent: data.agentId || 'Agent 10',
          message: data.message || JSON.stringify(data),
          level: data.level || 'info',
        },
        ...prev.slice(0, 49),
      ]);
    };

    socket.on('agent:action', handleLog);
    socket.on('workflow:progress', handleLog);

    return () => {
      clearInterval(interval);
      socket.off('agent:action', handleLog);
      socket.off('workflow:progress', handleLog);
    };
  }, []);

  return (
    <div className="page-container animate-fade-in">
      <div className="flex justify-between items-center mb-xl">
        <div>
          <div className="flex items-center gap-sm">
            <span className="live-badge" style={{ background: 'rgba(168, 85, 247, 0.2)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.4)' }}>
              🟣 LIVE EXECUTION WORKSPACE
            </span>
            <span className="badge badge-success">Socket.IO Stream Active</span>
          </div>
          <h1 className="text-2xl font-bold mt-xs">Real-Time Multi-Agent Studio Workspace</h1>
          <p className="text-secondary text-sm">
            Inspect real-time neural generation, progressive script synthesis, asset rendering, and verification streams.
          </p>
        </div>

        <div className="flex items-center gap-sm">
          <button
            onClick={() => setActiveTab('script')}
            className={`btn btn-sm ${activeTab === 'script' ? 'btn-primary' : 'btn-secondary'}`}
          >
            📝 Live Script
          </button>
          <button
            onClick={() => setActiveTab('research')}
            className={`btn btn-sm ${activeTab === 'research' ? 'btn-primary' : 'btn-secondary'}`}
          >
            🔬 Live Research
          </button>
          <button
            onClick={() => setActiveTab('timeline')}
            className={`btn btn-sm ${activeTab === 'timeline' ? 'btn-primary' : 'btn-secondary'}`}
          >
            🎬 Master Timeline
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`btn btn-sm ${activeTab === 'logs' ? 'btn-primary' : 'btn-secondary'}`}
          >
            📋 Event Stream
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-lg">
        {/* Main Execution Viewport */}
        <div className="col-span-2 card p-lg" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-primary)', minHeight: 520 }}>
          {activeTab === 'script' && (
            <div>
              <div className="flex justify-between items-center mb-md pb-sm border-b border-subtle">
                <div className="flex items-center gap-sm">
                  <span className="text-lg">✍️</span>
                  <div>
                    <h3 className="font-semibold text-sm">Agent 03 — High-Retention Script Engine</h3>
                    <p className="text-xs text-tertiary">Real-time progressive token generation & retention pacing</p>
                  </div>
                </div>
                <span className="badge badge-primary">Pacing: 145 wpm</span>
              </div>

              <div
                style={{
                  background: '#050508',
                  padding: '20px',
                  borderRadius: '8px',
                  fontFamily: 'monospace',
                  fontSize: '13px',
                  lineHeight: '1.7',
                  color: '#38bdf8',
                  whiteSpace: 'pre-wrap',
                  maxHeight: '400px',
                  overflowY: 'auto',
                  border: '1px solid rgba(56, 189, 248, 0.2)',
                }}
              >
                {simulatedScript}
                <span className="cursor-blink" style={{ display: 'inline-block', width: '8px', height: '14px', background: '#38bdf8', marginLeft: '4px' }} />
              </div>
            </div>
          )}

          {activeTab === 'research' && (
            <div>
              <div className="flex justify-between items-center mb-md pb-sm border-b border-subtle">
                <div className="flex items-center gap-sm">
                  <span className="text-lg">🔬</span>
                  <div>
                    <h3 className="font-semibold text-sm">Agent 02 — Deep Research & Source Hierarchy</h3>
                    <p className="text-xs text-tertiary">Corroborated evidence feeds & primary literature citations</p>
                  </div>
                </div>
                <span className="badge badge-success">Confidence: 96%</span>
              </div>

              <div className="space-y-sm">
                <div className="p-md rounded-md bg-black/40 border border-subtle">
                  <div className="flex justify-between text-xs mb-xs">
                    <span className="font-bold text-accent">LEVEL 1 PRIMARY EVIDENCE</span>
                    <span className="text-success font-semibold">VERIFIED [2 SOURCES]</span>
                  </div>
                  <p className="text-xs text-secondary">
                    "3D stacked microarchitectures reduce thermal resistance by 62% under heavy AVX-512 vector workloads."
                  </p>
                  <div className="mt-xs text-[11px] text-tertiary">Source: IEEE Solid-State Circuit Roadmap 2026 / DOI: 10.1109/JSSC.2026.00412</div>
                </div>

                <div className="p-md rounded-md bg-black/40 border border-subtle">
                  <div className="flex justify-between text-xs mb-xs">
                    <span className="font-bold text-accent">LEVEL 1 BENCHMARK DATA</span>
                    <span className="text-success font-semibold">AUDIT PASSED</span>
                  </div>
                  <p className="text-xs text-secondary">
                    "Laboratory yields demonstrated a 4.12x efficiency multiplier over monolithic 3nm planar dies."
                  </p>
                  <div className="mt-xs text-[11px] text-tertiary">Source: International Semiconductor Consortium Technical Evaluation Report</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'timeline' && (
            <div>
              <div className="flex justify-between items-center mb-md pb-sm border-b border-subtle">
                <div className="flex items-center gap-sm">
                  <span className="text-lg">🎬</span>
                  <div>
                    <h3 className="font-semibold text-sm">Agent 08 — 9-Track Master Video Timeline</h3>
                    <p className="text-xs text-tertiary">Voiceover-anchored temporal synchronization & dynamic subtitles</p>
                  </div>
                </div>
                <span className="badge badge-info">Duration: 52.0s</span>
              </div>

              <div className="space-y-xs font-mono text-xs">
                <div className="p-sm rounded bg-black/50 border border-purple-500/30 flex items-center justify-between">
                  <span className="text-purple-400 font-bold">T1: VOICEOVER (AUD-001)</span>
                  <span className="text-tertiary">Audio Segmented Map [5 Tracks | -14 LUFS]</span>
                </div>
                <div className="p-sm rounded bg-black/50 border border-blue-500/30 flex items-center justify-between">
                  <span className="text-blue-400 font-bold">T2: VIDEO MOTION (VID-001)</span>
                  <span className="text-tertiary">5s Micro-Shots Chained [1080p60]</span>
                </div>
                <div className="p-sm rounded bg-black/50 border border-yellow-500/30 flex items-center justify-between">
                  <span className="text-yellow-400 font-bold">T3: SCHEMATIC GRAPHICS</span>
                  <span className="text-tertiary">High-Res Blueprint Overlays (Agent 6)</span>
                </div>
                <div className="p-sm rounded bg-black/50 border border-green-500/30 flex items-center justify-between">
                  <span className="text-green-400 font-bold">T4: SUBTITLES & CAPTIONS</span>
                  <span className="text-tertiary">Dynamic Karaoke Highlighting (.srt)</span>
                </div>
                <div className="p-sm rounded bg-black/50 border border-orange-500/30 flex items-center justify-between">
                  <span className="text-orange-400 font-bold">T5: MUSIC & DUCKING</span>
                  <span className="text-tertiary">Ambient Synthwave [-22 dB Ducking]</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'logs' && (
            <div>
              <div className="flex justify-between items-center mb-md pb-sm border-b border-subtle">
                <h3 className="font-semibold text-sm">Real-Time Event Stream</h3>
                <span className="text-xs text-tertiary">Live WebSocket Bus</span>
              </div>
              <div className="space-y-xs max-h-[380px] overflow-y-auto font-mono text-xs">
                {logs.map((log) => (
                  <div key={log.id} className="p-xs rounded bg-black/30 flex items-center gap-md">
                    <span className="text-tertiary">{log.time}</span>
                    <span className="badge badge-sm badge-outline font-bold">{log.agent}</span>
                    <span className={log.level === 'success' ? 'text-green-400' : 'text-slate-300'}>{log.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Status Panel */}
        <div className="space-y-md">
          <div className="card p-md" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-primary)' }}>
            <h4 className="text-xs font-bold uppercase tracking-wider text-tertiary mb-sm">AI Orchestration Status</h4>
            <div className="flex items-center gap-sm mb-md">
              <span className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
              <span className="font-bold text-sm">Agent 10: Active Governor</span>
            </div>

            <div className="space-y-xs text-xs">
              <div className="flex justify-between py-xs border-b border-subtle">
                <span className="text-tertiary">Active Project</span>
                <span className="font-semibold">Autonomous AI OS (2026)</span>
              </div>
              <div className="flex justify-between py-xs border-b border-subtle">
                <span className="text-tertiary">Quality Gate</span>
                <span className="text-green-400 font-semibold">96 / 100 [PASS]</span>
              </div>
              <div className="flex justify-between py-xs border-b border-subtle">
                <span className="text-tertiary">Budget Cap</span>
                <span className="font-semibold">$50.00 max</span>
              </div>
              <div className="flex justify-between py-xs">
                <span className="text-tertiary">Approval Gate</span>
                <span className="text-yellow-400 font-semibold">Ready for Review</span>
              </div>
            </div>
          </div>

          <div className="card p-md" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-primary)' }}>
            <h4 className="text-xs font-bold uppercase tracking-wider text-tertiary mb-sm">10-Agent Pipeline Map</h4>
            <div className="space-y-xs text-xs font-mono">
              {[
                { num: '01', name: 'Market Intel', status: 'COMPLETED', color: 'text-green-400' },
                { num: '02', name: 'Deep Research', status: 'COMPLETED', color: 'text-green-400' },
                { num: '03', name: 'Script Engine', status: 'COMPLETED', color: 'text-green-400' },
                { num: '04', name: 'Fact Checker', status: 'COMPLETED', color: 'text-green-400' },
                { num: '05', name: 'Voice Producer', status: 'COMPLETED', color: 'text-green-400' },
                { num: '06', name: 'Visual Director', status: 'COMPLETED', color: 'text-green-400' },
                { num: '07', name: 'Video Generator', status: 'COMPLETED', color: 'text-green-400' },
                { num: '08', name: 'Video Editor', status: 'COMPLETED', color: 'text-green-400' },
                { num: '09', name: 'SEO & Publisher', status: 'COMPLETED', color: 'text-green-400' },
                { num: '10', name: 'Final QC & QA', status: 'READY', color: 'text-purple-400' },
              ].map((a) => (
                <div key={a.num} className="flex justify-between py-xs">
                  <span>
                    <span className="text-tertiary">[{a.num}]</span> {a.name}
                  </span>
                  <span className={`font-bold ${a.color}`}>✓ {a.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
