import { useCallback, useEffect, useMemo, useRef, type ReactNode } from 'react'
import { motion, useAnimationControls } from 'motion/react'
import { revealSettings, type RevealVariant } from './animationPresets'
import { useReducedMotionPreference } from './useReducedMotionPreference'
import { createRevealPlayback, shouldFinishAnchor } from './revealPlayback'

export function Reveal({ children, className = '', delay = 0, variant = 'rise', as = 'div', anchorArrival = 'immediate', 'aria-hidden': hidden }: {
  children: ReactNode
  className?: string
  delay?: number
  variant?: RevealVariant
  anchorArrival?: 'immediate' | 'viewport'
  as?: 'div' | 'span' | 'p' | 'li' | 'article' | 'h3' | 'h4' | 'ul'
  'aria-hidden'?: boolean
}) {
  const reduced = useReducedMotionPreference()
  const controls = useAnimationControls()
  const element = useRef<HTMLElement>(null)
  const settings = useMemo(() => revealSettings(variant, delay, reduced), [variant, delay, reduced])
  const playback = useMemo(() => createRevealPlayback(), [])
  const finish = useCallback(() => { controls.stop(); controls.set(settings.visible) }, [controls, settings])
  useEffect(() => {
    if (reduced) playback.show(finish)
  }, [reduced, playback, finish])
  useEffect(() => {
    const showAnchor = () => {
      // About waits for actual viewport arrival, including an initial #about load.
      // Do not start here: a smooth anchor scroll may still be far from its target.
      if (shouldFinishAnchor(window.location.hash, element.current?.closest('section')?.id, anchorArrival, reduced)) playback.show(finish)
    }
    showAnchor()
    window.addEventListener('hashchange', showAnchor)
    return () => window.removeEventListener('hashchange', showAnchor)
  }, [playback, finish, anchorArrival, reduced])
  const Element = { div: motion.div, span: motion.span, p: motion.p, li: motion.li, article: motion.article, h3: motion.h3, h4: motion.h4, ul: motion.ul }[as]

  return <Element
    ref={(node: HTMLElement | null) => { element.current = node }}
    className={`cinematic-reveal ${className}`}
    aria-hidden={hidden}
    initial={settings.initial}
    animate={reduced ? settings.visible : controls}
    // The latch prevents replays; keep exit notifications for fast-scroll settling.
    // Toolbox retains its original once-only observer behavior.
    viewport={{ once: variant === 'card', amount: 0.12 }}
    onViewportEnter={() => {
      if (!reduced) playback.enter(() => { void controls.start({ ...settings.visible, transition: settings.transition }) })
    }}
    onViewportLeave={() => { if (variant !== 'card') playback.leave(finish) }}
    onFocusCapture={() => {
      // Keyboard/anchor navigation must never land inside hidden, delayed content.
      playback.show(finish)
    }}
    transition={settings.transition}
  >{children}</Element>
}
