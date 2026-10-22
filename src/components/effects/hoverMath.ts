export type Bounds = { left: number; top: number; width: number; height: number }
const zero = { x: 0, y: 0 }
const clamp = (value: number) => Math.max(-1, Math.min(1, value))

export function magneticOffset(px: number, py: number, box: Bounds) {
  if (box.width <= 0 || box.height <= 0) return zero
  const dx = px - box.left - box.width / 2
  const dy = py - box.top - box.height / 2
  const distance = Math.hypot(dx, dy)
  const reach = Math.hypot(box.width / 2, box.height / 2) + 32
  if (!distance || distance >= reach) return zero
  // Smooth attraction envelope; displacement vanishes both far away and at center.
  const proximity = 1 - distance / reach
  const strength = 10 * Math.sin(Math.PI * proximity)
  return { x: dx / distance * strength, y: dy / distance * strength }
}

export function tiltOffset(px: number, py: number, box: Bounds, limit: number) {
  if (box.width <= 0 || box.height <= 0) return zero
  return {
    x: -clamp((py - box.top) / box.height * 2 - 1) * limit,
    y: clamp((px - box.left) / box.width * 2 - 1) * limit,
  }
}
