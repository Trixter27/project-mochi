export type RevealVariant = 'rise' | 'fade' | 'card' | 'featured' | 'heading' | 'settle'

// Complete the departure while the Hero is still partly visible. Positive far-star
// movement separates the two foreground layers without horizontal mobile overflow.
export const HERO_SCROLL_RANGE = [0, 0.7]
export const HERO_DEPTH = { copy: -36, starNear: -90, starFar: 60, orbit: -32, outerOrbit: 22, dot: -44 } as const

export function revealSettings(variant: RevealVariant, delay: number, reduced: boolean) {
  const visible = { opacity: 1, y: 0, scale: 1 }
  const wait = Number.isFinite(delay) ? Math.max(0, Math.min(delay, variant === 'card' ? 0.24 : 0.4)) : 0
  const distance = variant === 'fade' ? 0 : variant === 'featured' ? 48 : variant === 'heading' ? 40 : variant === 'settle' ? 28 : variant === 'card' ? 14 : 16
  return {
    initial: reduced ? false as const : { opacity: 0, y: distance, scale: variant === 'featured' ? 0.96 : 1 },
    visible,
    transition: reduced ? { duration: 0, delay: 0 }
      : variant === 'card' ? { type: 'spring' as const, stiffness: 180, damping: 20, mass: 0.85, delay: wait }
        : variant === 'settle' ? { type: 'spring' as const, stiffness: 140, damping: 19, mass: 1, delay: wait }
        : { type: 'tween' as const, duration: variant === 'featured' ? 0.8 : variant === 'heading' ? 0.65 : variant === 'fade' ? 0.42 : 0.52, delay: wait, ease: [0.22, 1, 0.36, 1] as const },
  }
}
