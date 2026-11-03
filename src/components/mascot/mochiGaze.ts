import { Vector3, type Camera, type Object3D } from 'three'

export interface MochiPointer { x: number; y: number; valid: boolean }
export const createMochiPointer = (): MochiPointer => ({ x: 0, y: 0, valid: false })

/** Passive observation only. The scene mounts this while visible and motion is allowed. */
export function observeMochiPointer(pointer: MochiPointer, doc: Document, win: Window) {
  const fine = win.matchMedia('(hover: hover) and (pointer: fine)')
  const clear = () => { pointer.valid = false }
  const move = (event: PointerEvent) => {
    pointer.valid = fine.matches && doc.visibilityState === 'visible' && event.pointerType === 'mouse'
    if (pointer.valid) { pointer.x = event.clientX; pointer.y = event.clientY }
  }
  const exit = (event: PointerEvent) => { if (!event.relatedTarget) clear() }
  const configure = () => {
    clear()
    doc.removeEventListener('pointermove', move)
    if (fine.matches && doc.visibilityState === 'visible') doc.addEventListener('pointermove', move, { passive: true })
  }
  fine.addEventListener('change', configure)
  doc.addEventListener('visibilitychange', configure)
  doc.addEventListener('pointerout', exit)
  doc.addEventListener('pointercancel', clear)
  win.addEventListener('blur', clear)
  configure()
  return () => {
    clear()
    doc.removeEventListener('pointermove', move)
    doc.removeEventListener('pointerout', exit)
    doc.removeEventListener('pointercancel', clear)
    doc.removeEventListener('visibilitychange', configure)
    fine.removeEventListener('change', configure)
    win.removeEventListener('blur', clear)
  }
}

export function createGazeProjection() {
  return { center: new Vector3(), left: new Vector3(), right: new Vector3(), up: new Vector3(), body: new Vector3(), valid: false }
}
type Projection = ReturnType<typeof createGazeProjection>
type Rect = { left: number; top: number; width: number; height: number }

function screen(point: Vector3, camera: Camera, rect: Rect) {
  point.project(camera)
  point.x = rect.left + (point.x + 1) * rect.width / 2
  point.y = rect.top + (1 - point.y) * rect.height / 2
}

/** Reuse vectors, and project the current world transforms rather than Canvas center. */
export function projectMochiGaze(out: Projection, head: Object3D, body: Object3D, camera: Camera, rect: Rect) {
  head.updateWorldMatrix(true, false)
  body.updateWorldMatrix(true, false)
  out.center.set(0, 0.055, 0.494).applyMatrix4(head.matrixWorld)
  out.left.set(-0.72, 0.055, 0.494).applyMatrix4(head.matrixWorld)
  out.right.set(0.72, 0.055, 0.494).applyMatrix4(head.matrixWorld)
  out.up.set(0, 0.775, 0.494).applyMatrix4(head.matrixWorld)
  out.body.setFromMatrixPosition(body.matrixWorld)
  screen(out.center, camera, rect); screen(out.left, camera, rect)
  screen(out.right, camera, rect); screen(out.up, camera, rect); screen(out.body, camera, rect)
  out.valid = rect.width > 0 && rect.height > 0 && out.center.z > -1 && out.center.z < 1
}

export const createGazeTarget = () => ({ x: 0, y: 0, weight: 0 })
type Target = ReturnType<typeof createGazeTarget>
const clamp = (value: number, low = 0, high = 1) => Math.max(low, Math.min(high, value))
const smooth = (value: number) => { const t = clamp(value); return t * t * (3 - 2 * t) }

/** A soft capsule around the projected head/upper body, radius 1.1 head widths. */
export function sampleMochiGaze(out: Target, pointer: MochiPointer, projected: Projection) {
  out.x = out.y = out.weight = 0
  if (!pointer.valid || !projected.valid) return
  const { center, left, right, up, body } = projected
  const width = Math.hypot(right.x - left.x, right.y - left.y)
  if (width < 2) return
  const dx = pointer.x - center.x, dy = pointer.y - center.y
  const bx = body.x - center.x, by = body.y - center.y
  const segment = bx * bx + by * by
  const along = segment > 0 ? clamp((dx * bx + dy * by) / segment) : 0
  const distance = Math.hypot(dx - bx * along, dy - by * along) / (width * 1.1)
  if (distance >= 1) return
  // Invert the projected face basis so a tilted head still looks toward the pointer.
  const ax = (right.x - left.x) / 2, ay = (right.y - left.y) / 2
  const ux = up.x - center.x, uy = up.y - center.y
  const determinant = ax * uy - ay * ux
  if (Math.abs(determinant) < 1) return
  let x = (dx * uy - dy * ux) / determinant
  let y = (ax * dy - ay * dx) / determinant
  const magnitude = Math.max(1, Math.hypot(x, y))
  x /= magnitude; y /= magnitude
  out.weight = 1 - smooth((distance - 0.55) / 0.45)
  out.x = x * 0.035 * out.weight
  out.y = y * 0.028 * out.weight
}

export const createGazeMotion = () => ({ x: 0, y: 0, weight: 0, headX: 0, headY: 0 })
type Motion = ReturnType<typeof createGazeMotion>

/** Pupils respond first; their smoothed proximity then engages the original tilt.
 * Separate entry/exit thresholds avoid toggling the pose at the zone boundary. */
export function pointerCuriosity(weight: number, wasCurious: boolean, reducedMotion: boolean) {
  return !reducedMotion && weight > (wasCurious ? 0.25 : 0.65)
}

export function advanceMochiGaze(state: Motion, target: Target, delta: number, phase: string, happyEyes: number, reducedMotion: boolean) {
  if (reducedMotion) { state.x = state.y = state.weight = state.headX = state.headY = 0; return }
  // Keep welcome and explicit reactions in charge. Input never changes the physics pose.
  const allowed = (phase === 'idle' || phase === 'curious') && happyEyes < 0.001
  let remaining = clamp(delta, 0, 0.05)
  while (remaining > 1e-10) {
    const dt = Math.min(remaining, 1 / 240), eyes = 1 - Math.exp(-9 * dt), head = 1 - Math.exp(-3 * dt)
    state.x += ((allowed ? target.x : 0) - state.x) * eyes
    state.y += ((allowed ? target.y : 0) - state.y) * eyes
    state.weight += ((allowed ? target.weight : 0) - state.weight) * eyes
    state.headY += (state.x - state.headY) * head
    state.headX += (-state.y * 0.7 - state.headX) * head
    remaining -= dt
  }
}
