import { useState } from 'react';
import { useStore } from '../store';

export default function YouTubeStudioLive() {
  const { addToast } = useStore();
  const [currentStep, setCurrentStep] = useState(4);
  const [uploadProgress, setUploadProgress] = useState(78);
  const [publishingAction, setPublishingAction] = useState('SCHEDULE');

  const steps = [
    { id: 1, name: 'Studio Auth', icon: '🔑', status: 'COMPLETED', detail: 'OAuth2 session verified with Google' },
    { id: 2, name: 'Video Upload', icon: '📤', status: 'IN_PROGRESS', detail: 'Master 4K render stream upload (78%)' },
    { id: 3, name: 'Metadata & Title', icon: '📝', status: 'WAITING', detail: 'Title, chapters & tags insertion' },
    { id: 4, name: 'HD Thumbnail', icon: '🖼️', status: 'WAITING', detail: '1280x720 0-5 word concept application' },
    { id: 5, name: 'Copyright & Policy', icon: '🛡️', status: 'WAITING', detail: 'Automated YouTube Studio checks' },
    { id: 6, name: 'Visibility & Publish', icon: '🚀', status: 'WAITING', detail: 'Scheduled publication' },
  ];

  const handleApprovePublish = () => {
    addToast({ type: 'success', message: 'Publishing authorization token generated and transmitted to YouTube Data API.' });
  };

  return (
    <div className="page-container animate-fade-in">
      <div className="flex justify-between items-center mb-xl">
        <div>
          <div className="flex items-center gap-sm">
            <span className="live-badge" style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.4)' }}>
              🔴 OFFICIAL YOUTUBE STUDIO LIVE
            </span>
            <span className="badge badge-primary">API v3 + Studio Session</span>
          </div>
          <h1 className="text-2xl font-bold mt-xs">YouTube Studio Real-Time Execution Monitor</h1>
          <p className="text-secondary text-sm">
            Live observation layer for official YouTube upload, automated policy checks, and human publishing gates.
          </p>
        </div>

        <div className="flex items-center gap-sm">
          <button onClick={handleApprovePublish} className="btn btn-primary">
            ✓ Approve & Authorize Upload
          </button>
        </div>
      </div>

      {/* Progress Stepper */}
      <div className="card p-lg mb-lg" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-primary)' }}>
        <div className="grid grid-cols-6 gap-sm text-center">
          {steps.map((step) => (
            <div
              key={step.id}
              className={`p-md rounded-md border ${
                step.status === 'COMPLETED'
                  ? 'border-green-500/40 bg-green-500/10 text-green-400'
                  : step.status === 'IN_PROGRESS'
                  ? 'border-blue-500/40 bg-blue-500/10 text-blue-400 animate-pulse'
                  : 'border-subtle bg-black/20 text-tertiary'
              }`}
            >
              <div className="text-xl mb-xs">{step.icon}</div>
              <div className="font-bold text-xs">{step.name}</div>
              <div className="text-[10px] mt-xs text-secondary">{step.detail}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-lg">
        {/* Live Studio Execution Frame */}
        <div className="col-span-2 card p-lg" style={{ background: '#0a0a0f', border: '1px solid var(--border-primary)', minHeight: 480 }}>
          <div className="flex justify-between items-center pb-sm mb-md border-b border-subtle">
            <div className="flex items-center gap-sm">
              <span className="w-3 h-3 rounded-full bg-red-500" />
              <span className="font-bold text-sm">YouTube Studio Live Session (Channel: Primary)</span>
            </div>
            <span className="badge badge-sm badge-outline">Video ID: studio_session_2026_01</span>
          </div>

          <div
            style={{
              background: '#030305',
              padding: '24px',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.08)',
              minHeight: '340px',
            }}
          >
            <div className="flex justify-between items-center mb-md">
              <div>
                <h4 className="font-bold text-sm text-white">How The Architecture of Autonomous Multi-Agent AI Systems Works</h4>
                <span className="text-xs text-tertiary">Filename: YT-2026-0004_final.mp4 (4K 60fps | 52.0s)</span>
              </div>
              <span className="badge badge-success">Quality: 4K Ultra HD</span>
            </div>

            {/* Upload Progress Bar */}
            <div className="mb-lg">
              <div className="flex justify-between text-xs mb-xs">
                <span className="text-tertiary">Uploading to YouTube CDN...</span>
                <span className="font-bold text-blue-400">{uploadProgress}%</span>
              </div>
              <div style={{ height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${uploadProgress}%`, height: '100%', background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)', borderRadius: '4px' }} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-md text-xs">
              <div className="p-md rounded bg-black/40 border border-subtle">
                <span className="text-tertiary font-bold block mb-xs">DETAILS & SEO METADATA</span>
                <p className="text-secondary mb-xs">Title: Scored #1 candidate (CTR Potential: 96)</p>
                <p className="text-secondary">Chapters: 5 Timestamps synchronized with final timeline</p>
              </div>

              <div className="p-md rounded bg-black/40 border border-subtle">
                <span className="text-tertiary font-bold block mb-xs">CHECKS & COMPLIANCE</span>
                <p className="text-green-400 font-semibold mb-xs">✓ Copyright: No copyright issues found</p>
                <p className="text-green-400 font-semibold">✓ Community Guidelines: 100% compliant</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Human Approval Card */}
        <div className="space-y-md">
          <div className="card p-md" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-primary)' }}>
            <h4 className="text-xs font-bold uppercase tracking-wider text-tertiary mb-sm">Human Approval Gate (Required)</h4>
            <p className="text-xs text-secondary mb-md">
              Under strict safety governance rules, no video can be made publicly available without explicit human signoff.
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
                ⏰ Schedule for Optimal Audience Window
              </button>

              <button
                onClick={() => setPublishingAction('DRAFT')}
                className={`w-full text-left p-sm rounded border text-xs ${
                  publishingAction === 'DRAFT' ? 'border-purple-500 bg-purple-500/10 font-bold' : 'border-subtle bg-black/20'
                }`}
              >
                💾 Save as Private Draft in Studio
              </button>

              <button onClick={handleApprovePublish} className="btn btn-primary w-full mt-md">
                Confirm Approval
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
