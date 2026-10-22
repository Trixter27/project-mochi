export const HERO_FLOATS = {
  star: { x: 5, y: -22, rotate: 9, duration: 4.8, phase: -1.2 },
  burst: { x: -8, y: 18, rotate: -10, duration: 6.2, phase: -3.1 },
  peach: { x: 6, y: -14, rotate: 0, duration: 3.8, phase: -0.7 },
  ring: { x: -10, y: -18, rotate: 6, duration: 5.5, phase: -2.4 },
  pebble: { x: 9, y: 24, rotate: 12, duration: 6.7, phase: -4.2 },
  mint: { x: -4, y: 16, rotate: -8, duration: 4.3, phase: -2.1 },
} as const

export function heroAmbientRunning(inView: boolean, pageVisible: boolean, reduced: boolean) {
  return inView && pageVisible && !reduced
}
