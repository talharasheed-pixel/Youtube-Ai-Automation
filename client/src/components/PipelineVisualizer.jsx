const STAGE_META = {
  CREATED: { icon: '📝', label: 'Created', color: 'var(--text-tertiary)' },
  MARKET_RESEARCH: { icon: '📈', label: 'Market Research', color: 'var(--accent-cyan)' },
  TOPIC_REVIEW: { icon: '👁️', label: 'Topic Review', color: 'var(--accent-orange)' },
  DEEP_RESEARCH: { icon: '🔬', label: 'Deep Research', color: 'var(--accent-purple)' },
  SCRIPT_WRITING: { icon: '✍️', label: 'Script Writing', color: 'var(--accent-blue)' },
  FACT_CHECK: { icon: '🔍', label: 'Fact Check', color: 'var(--accent-red)' },
  VOICE_VISUAL: { icon: '🎙️', label: 'Voice & Visual', color: 'var(--accent-green)' },
  VOICE_PRODUCTION: { icon: '🎙️', label: 'Voice', color: 'var(--accent-green)' },
  VISUAL_GENERATION: { icon: '🎨', label: 'Visuals', color: 'var(--accent-pink)' },
  VIDEO_GENERATION: { icon: '🎥', label: 'Video Gen', color: 'var(--accent-purple)' },
  VIDEO_EDITING: { icon: '✂️', label: 'Editing', color: 'var(--accent-cyan)' },
  SEO_PUBLISHING: { icon: '🏷️', label: 'SEO & Packaging', color: 'var(--accent-orange)' },
  FINAL_QA: { icon: '✅', label: 'Final QA', color: 'var(--accent-green)' },
  HUMAN_APPROVAL: { icon: '👤', label: 'Your Approval', color: 'var(--accent-orange)' },
  PUBLISHING: { icon: '🚀', label: 'Publishing', color: 'var(--accent-blue)' },
  MONITORING: { icon: '📊', label: 'Monitoring', color: 'var(--accent-cyan)' },
  COMPLETED: { icon: '🏆', label: 'Completed', color: 'var(--accent-green)' },
};

const DISPLAY_STAGES = [
  'MARKET_RESEARCH', 'TOPIC_REVIEW', 'DEEP_RESEARCH', 'SCRIPT_WRITING',
  'FACT_CHECK', 'VOICE_VISUAL', 'VIDEO_GENERATION', 'VIDEO_EDITING',
  'SEO_PUBLISHING', 'FINAL_QA', 'HUMAN_APPROVAL', 'PUBLISHING', 'COMPLETED',
];

export default function PipelineVisualizer({ currentStage, status }) {
  const currentIdx = DISPLAY_STAGES.indexOf(currentStage);

  return (
    <div className="pipeline">
      {DISPLAY_STAGES.map((stage, idx) => {
        const meta = STAGE_META[stage] || { icon: '⬜', label: stage, color: 'var(--text-tertiary)' };
        let nodeClass = '';
        if (idx < currentIdx) nodeClass = 'completed';
        else if (idx === currentIdx) {
          if (status === 'FAILED') nodeClass = 'failed';
          else if (stage === 'TOPIC_REVIEW' || stage === 'HUMAN_APPROVAL') nodeClass = 'waiting';
          else nodeClass = 'active';
        }

        return (
          <div key={stage} style={{ display: 'flex', alignItems: 'center' }}>
            {idx > 0 && <div className={`pipeline-connector ${idx <= currentIdx ? (idx < currentIdx ? 'completed' : 'active') : ''}`} />}
            <div className="pipeline-stage">
              <div className={`pipeline-node ${nodeClass}`} title={meta.label}>
                {idx < currentIdx ? '✓' : meta.icon}
              </div>
              <span className="pipeline-label" style={idx === currentIdx ? { color: meta.color, fontWeight: 700 } : {}}>
                {meta.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export { STAGE_META };
