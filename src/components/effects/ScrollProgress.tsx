import { motion, useScroll } from 'motion/react'
import { useReducedMotionPreference } from '../useReducedMotionPreference'
import './ScrollProgress.css'

export function ScrollProgress() {
  const reduced = useReducedMotionPreference()
  // Unmounting also releases Motion's scroll subscription when motion is disabled.
  return reduced ? null : <ProgressLine />
}

function ProgressLine() {
  const { scrollYProgress } = useScroll()
  return <div className="scroll-progress" aria-hidden="true">
    <motion.div className="scroll-progress-fill" style={{ scaleX: scrollYProgress }} />
  </div>
}
