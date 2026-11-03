import test from 'node:test'
import assert from 'node:assert/strict'
import { Group, PerspectiveCamera } from 'three'
import { advanceMochiGaze, createGazeMotion, createGazeProjection, createGazeTarget, createMochiPointer, observeMochiPointer, pointerCuriosity, projectMochiGaze, sampleMochiGaze } from '../src/components/mascot/mochiGaze.ts'
import { advanceMochiAnimation, createMochiAnimation } from '../src/components/mascot/mochiAnimation.ts'

function curiositySequence(fps = 120) {
  const animation = createMochiAnimation(), motion = createGazeMotion()
  const { projected } = scene(), target = createGazeTarget()
  let curious = false
  for (let i = 0; i < 6 * fps; i++) advanceMochiAnimation(animation, 1 / fps, false, 0, false)
  const step = (near: boolean, request = 0, keyboard = false, reduced = false) => {
    sampleMochiGaze(target, { x: projected.right.x, y: projected.center.y, valid: near }, projected)
    curious = pointerCuriosity(motion.weight, curious, reduced)
    advanceMochiAnimation(animation, 1 / fps, keyboard || curious, request, reduced)
    advanceMochiGaze(motion, target, 1 / fps, animation.phase, animation.pose.happyEyes, reduced)
  }
  return { animation, motion, step }
}

test('nearby pupils respond before the original curious head tilt, then both relax without a click', () => {
  for (const fps of [30, 60, 120]) {
    const { animation, motion, step } = curiositySequence(fps)
    for (let i = 0; i < Math.round(0.05 * fps); i++) step(true)
    assert.ok(motion.x > 0)
    assert.equal(animation.phase, 'idle', 'pupils notice the pointer before the head pose engages')
    for (let i = 0; i < fps; i++) step(true)
    assert.equal(animation.phase, 'curious')
    assert.ok(animation.pose.headZ > 0.12 && animation.pose.headX < -0.06, 'restore the original expressive side/up tilt')
    for (let i = 0; i < fps * 4; i++) {
      const previous = animation.pose.headZ
      step(false)
      assert.ok(Math.abs(animation.pose.headZ - previous) < 0.025, 'head recovers smoothly')
    }
    assert.equal(animation.phase, 'idle')
    assert.ok(Math.abs(animation.pose.headZ) < 0.03 && Math.abs(animation.pose.headX) < 0.03)
    assert.ok(Math.abs(motion.x) < 1e-9 && Math.abs(motion.headY) < 0.0001)
  }
})

test('proximity hysteresis prevents boundary chatter and cannot latch without proximity', () => {
  let curious = pointerCuriosity(0.9, false, false)
  assert.equal(curious, true)
  for (const weight of [0.64, 0.66, 0.63, 0.67, 0.4]) {
    curious = pointerCuriosity(weight, curious, false)
    assert.equal(curious, true)
  }
  curious = pointerCuriosity(0.1, curious, false)
  assert.equal(curious, false)
  for (const weight of [0.24, 0.26, 0.23, 0.27, 0]) assert.equal(pointerCuriosity(weight, false, false), false)
  assert.equal(pointerCuriosity(1, true, true), false)
})

test('hello reactions override proximity, resume it only when nearby, and retain keyboard curiosity', () => {
  for (const staysNear of [false, true]) for (const request of [1, 2]) {
    const { animation, step } = curiositySequence()
    for (let i = 0; i < 120; i++) step(true)
    step(staysNear, request)
    assert.equal(animation.phase, request === 1 ? 'happy' : 'shy')
    for (let i = 0; i < 600; i++) step(staysNear, request)
    assert.equal(animation.phase, staysNear ? 'curious' : 'idle')
    for (let input = 3; input < 10; input++) {
      for (let i = 0; i < 30; i++) step(input % 2 === 0, input, input % 3 === 0)
    }
    for (let i = 0; i < 600; i++) step(false, 9)
    assert.equal(animation.phase, 'idle', 'repeated reactions and focus changes do not leave a stuck pose')
    for (let i = 0; i < 120; i++) step(false, 9, true)
    assert.equal(animation.phase, 'curious')
  }
  const { animation, motion, step } = curiositySequence()
  for (let i = 0; i < 120; i++) step(true, 0, false, true)
  assert.equal(animation.phase, 'idle')
  assert.deepEqual(motion, createGazeMotion())
  step(false, 0, true, true)
  assert.equal(animation.phase, 'curious')
})

function scene(width = 360, height = 280) {
  const camera = new PerspectiveCamera(30, width / height, 0.1, 30)
  camera.position.set(2.65, 2.2, 6.4); camera.lookAt(0, 1.3, 0); camera.updateMatrixWorld()
  const root = new Group(), head = new Group(), body = new Group()
  head.position.set(0, 1.84, 0); body.position.set(0, 0.97, 0)
  root.add(head, body)
  const rect = { left: 420, top: 120, width, height }, projected = createGazeProjection()
  const project = () => projectMochiGaze(projected, head, body, camera, rect)
  project()
  return { root, head, body, camera, rect, projected, project }
}

test('proximity follows the projected head and upper body, with a soft edge and no distant tracking', () => {
  const { projected: p } = scene(), target = createGazeTarget()
  const width = Math.hypot(p.right.x - p.left.x, p.right.y - p.left.y)
  sampleMochiGaze(target, { x: p.center.x + width * 0.3, y: p.center.y, valid: true }, p)
  assert.ok(target.weight > 0.9 && target.x > 0)
  sampleMochiGaze(target, { x: p.body.x, y: p.body.y, valid: true }, p)
  assert.ok(target.weight > 0.9 && target.y < 0)
  sampleMochiGaze(target, { x: p.center.x, y: p.center.y - width * 1.09, valid: true }, p)
  assert.ok(target.weight < 0.01)
  for (const pointer of [{ x: 0, y: 0, valid: true }, { x: p.center.x, y: p.center.y, valid: false }]) {
    sampleMochiGaze(target, pointer, p)
    assert.deepEqual(target, { x: 0, y: 0, weight: 0 })
  }
})

test('projection handles desktop/mobile sizes, scroll offsets, hopping and head tilt in local eye axes', () => {
  for (const [width, height] of [[360, 280], [330, 250], [660, 500]]) {
    const s = scene(width, height), target = createGazeTarget()
    const oldY = s.projected.center.y
    s.root.position.y = 0.17; s.head.rotation.set(0.08, 0.12, -0.12); s.project()
    assert.ok(s.projected.center.y < oldY)
    const beforeX = s.projected.center.x, beforeY = s.projected.center.y
    s.rect.top -= 80; s.rect.left += 35; s.project()
    assert.ok(Math.abs(s.projected.center.x - beforeX - 35) < 1e-9)
    assert.ok(Math.abs(s.projected.center.y - beforeY + 80) < 1e-9)
    const p = s.projected
    sampleMochiGaze(target, {
      x: p.center.x + (p.right.x - p.left.x) * 0.2 + (p.up.x - p.center.x) * 0.4,
      y: p.center.y + (p.right.y - p.left.y) * 0.2 + (p.up.y - p.center.y) * 0.4, valid: true,
    }, p)
    assert.ok(target.x > 0 && target.y > 0)
    assert.ok(Math.abs(target.x / 0.035 - target.y / 0.028) < 1e-9)
    s.rect.width = 0; s.project()
    sampleMochiGaze(target, { x: 0, y: 0, valid: true }, s.projected)
    assert.equal(target.weight, 0)
  }
})

test('all tracked pupil outlines remain inside the white eye ellipse', () => {
  const { projected: p } = scene(), target = createGazeTarget()
  for (let x = -150; x <= 150; x += 15) for (let y = -150; y <= 150; y += 15) {
    sampleMochiGaze(target, { x: p.center.x + x, y: p.center.y + y, valid: true }, p)
    for (const base of [{ x: 0, y: 0 }, { x: 0.025, y: 0.015 }]) {
      const gx = base.x * (1 - target.weight) + target.x
      const gy = base.y * (1 - target.weight) + target.y
      for (let i = 0; i < 64; i++) {
        const angle = i * Math.PI / 32
        const px = (gx + Math.cos(angle) * 0.061) / 0.135
        const py = (gy + Math.sin(angle) * 0.102) / 0.18
        assert.ok(px * px + py * py < 1, 'the entire pupil, not just its center, stays in the eye')
      }
    }
  }
})

test('gaze damps without jitter, the head follows later, and both recover across frame rates', () => {
  const states = [30, 60, 120].map(fps => {
    const state = createGazeMotion(), target = { x: 0.035, y: 0.028, weight: 1 }
    let previous = 0
    for (let i = 0; i < fps; i++) {
      advanceMochiGaze(state, target, 1 / fps, 'curious', 0, false)
      assert.ok(state.x >= previous && state.x <= target.x)
      assert.ok(state.headY < state.x)
      previous = state.x
    }
    const before = state.x
    for (let i = 0; i < fps * 3; i++) advanceMochiGaze(state, createGazeTarget(), 1 / fps, 'idle', 0, false)
    assert.ok(before > 0.03 && Math.abs(state.x) < 1e-9 && Math.abs(state.headY) < 0.0001)
    return state
  })
  for (const state of states.slice(1)) for (const key of Object.keys(state) as (keyof typeof state)[]) {
    assert.ok(Math.abs(state[key] - states[0][key]) < 1e-10)
  }
})

test('happy, shy, welcome and reduced motion have priority, including repeated interruptions', () => {
  const target = { x: 0.035, y: -0.028, weight: 1 }
  for (const phase of ['happy', 'shy', 'welcome']) {
    const state = createGazeMotion()
    for (let i = 0; i < 120; i++) advanceMochiGaze(state, target, 1 / 60, phase, 0, false)
    assert.deepEqual(state, createGazeMotion())
  }
  const state = createGazeMotion()
  for (let i = 0; i < 120; i++) advanceMochiGaze(state, target, 1 / 60, 'idle', 1, false)
  assert.deepEqual(state, createGazeMotion())
  for (let i = 0; i < 360; i++) {
    const before = { ...state }
    advanceMochiGaze(state, target, 1 / 120, ['idle', 'happy', 'shy'][Math.floor(i / 20) % 3], 0, false)
    assert.ok(Math.abs(state.x - before.x) < 0.003)
    assert.ok(Math.abs(state.headY - before.headY) < 0.001)
  }
  for (let i = 0; i < 120; i++) advanceMochiGaze(state, target, 1, 'idle', 0, true)
  assert.deepEqual(state, createGazeMotion())
})

class TrackedEvents extends EventTarget {
  listeners = new Map<string, Set<EventListenerOrEventListenerObject>>()
  override addEventListener(type: string, listener: EventListenerOrEventListenerObject | null, options?: AddEventListenerOptions | boolean) {
    if (listener) { const set = this.listeners.get(type) ?? new Set(); set.add(listener); this.listeners.set(type, set) }
    super.addEventListener(type, listener, options)
  }
  override removeEventListener(type: string, listener: EventListenerOrEventListenerObject | null, options?: EventListenerOptions | boolean) {
    if (listener) this.listeners.get(type)?.delete(listener)
    super.removeEventListener(type, listener, options)
  }
  emit(type: string, values = {}) { this.dispatchEvent(Object.assign(new Event(type), values)) }
}

test('passive mouse observation rejects coarse/touch input and cleans up on hide, blur and unmount', () => {
  const doc = Object.assign(new TrackedEvents(), { visibilityState: 'visible' })
  const media = Object.assign(new TrackedEvents(), { matches: false })
  const win = Object.assign(new TrackedEvents(), { matchMedia: () => media })
  const pointer = createMochiPointer()
  const cleanup = observeMochiPointer(pointer, doc as unknown as Document, win as unknown as Window)
  const move = (pointerType = 'mouse') => doc.emit('pointermove', { pointerType, clientX: 200, clientY: 100 })
  assert.equal(doc.listeners.get('pointermove')?.size ?? 0, 0)
  move(); assert.equal(pointer.valid, false)
  media.matches = true; media.emit('change'); move()
  assert.deepEqual(pointer, { x: 200, y: 100, valid: true })
  move('touch'); assert.equal(pointer.valid, false)
  move(); win.emit('blur'); assert.equal(pointer.valid, false)
  move(); doc.emit('pointerout', { relatedTarget: null }); assert.equal(pointer.valid, false)
  move(); doc.visibilityState = 'hidden'; doc.emit('visibilitychange')
  assert.equal(pointer.valid, false); assert.equal(doc.listeners.get('pointermove')?.size, 0)
  doc.visibilityState = 'visible'; doc.emit('visibilitychange'); assert.equal(pointer.valid, false)
  move(); assert.equal(pointer.valid, true)
  cleanup()
  assert.equal(pointer.valid, false)
  for (const target of [doc, media, win]) for (const listeners of target.listeners.values()) assert.equal(listeners.size, 0)
})
