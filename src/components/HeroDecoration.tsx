import type { CSSProperties } from 'react'
import { motion, type MotionValue } from 'motion/react'
import { HERO_FLOATS } from './heroDecorations'
import './HeroDecoration.css'

export function HeroDecoration({ kind, className, y }: {
  kind: keyof typeof HERO_FLOATS
  className: string
  y: MotionValue<number> | number
}) {
  const float = HERO_FLOATS[kind]
  const variables = {
    '--float-x': `${float.x}px`, '--float-y': `${float.y}px`,
    '--float-turn': `${float.rotate}deg`, '--float-duration': `${float.duration}s`,
    '--float-phase': `${float.phase}s`,
  } as CSSProperties
  // Motion owns only the outer transform; CSS owns only the inner transform.
  return <motion.span className={`hero-decoration ${className}`} style={{ y }} aria-hidden="true">
    <span className={`hero-float hero-shape-${kind}`} style={variables}>
      {kind === 'star' && <svg viewBox="0 0 48 48" focusable="false"><path d="M24 3 30 16 45 19 34 29 37 44 24 37 11 44 14 29 3 19 18 16Z" /></svg>}
      {kind === 'burst' && <svg viewBox="0 0 48 48" focusable="false"><path d="m24 2 5 12 11-6-6 11 12 5-12 5 6 11-11-6-5 12-5-12-11 6 6-11-12-5 12-5-6-11 11 6Z" /></svg>}
    </span>
  </motion.span>
}
