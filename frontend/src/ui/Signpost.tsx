import type { CSSProperties } from 'react'

/**
 * Wooden stage signpost stuck in the ground beside the road (level path and the in-game
 * "papunta na sa Stage 2" run). Board on a post, with a little grass at its foot.
 */
export function Signpost({
  stage,
  task,
  className = '',
  style,
}: {
  stage: 1 | 2
  task?: string
  className?: string
  style?: CSSProperties
}) {
  return (
    <div className={`signpost is-stage-${stage} ${className}`} style={style} aria-label={`Stage ${stage}${task ? `: ${task}` : ''}`}>
      <div className="signpost-board">
        <span className="signpost-title">STAGE {stage}</span>
        {task && <small className="signpost-task">{task}</small>}
      </div>
      <div className="signpost-post" />
      <div className="signpost-grass" />
    </div>
  )
}
