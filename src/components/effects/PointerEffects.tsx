import type { ReactNode } from 'react'
import { motion, useMotionTemplate } from 'motion/react'
import { usePointerEffect } from './usePointerEffect'
import './PointerEffects.css'

export function MagneticButton({ href, className, children }: { href: string; className: string; children: ReactNode }) {
  const { setSurface, x, y } = usePointerEffect('magnetic')
  return <a ref={setSurface} href={href} className="magnetic-link">
    <motion.span className="magnetic-surface" style={{ x, y }}><span className={className}>{children}</span></motion.span>
  </a>
}

export function TiltCard({ children, limit = 5 }: { children: ReactNode; limit?: number }) {
  const { setSurface, x, y } = usePointerEffect('tilt', limit)
  const transform = useMotionTemplate`perspective(1100px) rotateX(${x}deg) rotateY(${y}deg)`
  return <div className="pointer-tilt" ref={setSurface}>
    <motion.div className="pointer-tilt-motion" style={{ transform }}>{children}</motion.div>
  </div>
}
