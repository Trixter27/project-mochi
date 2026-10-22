import test from 'node:test'
import assert from 'node:assert/strict'
import { spring } from 'motion'
import { magneticOffset, tiltOffset } from '../src/components/effects/hoverMath.ts'

const box = { left: 100, top: 200, width: 200, height: 60 }

test('magnetic attraction stays within a 10px radius throughout and beyond the target', () => {
  for (let px = -100; px <= 500; px += 5) {
    for (let py = 0; py <= 450; py += 5) {
      const offset = magneticOffset(px, py, box)
      assert.ok(Math.hypot(offset.x, offset.y) <= 10 + 1e-10)
    }
  }
})

test('attraction points toward the pointer, increases on approach, and remains stable for repeated coordinates', () => {
  const far = magneticOffset(330, 230, box)
  const near = magneticOffset(280, 230, box)
  assert.ok(near.x > far.x && far.x > 0)
  assert.equal(near.y, 0)
  const opposite = magneticOffset(120, 230, box)
  assert.equal(opposite.x, -near.x)
  assert.deepEqual(magneticOffset(280, 230, box), near)
  assert.ok(magneticOffset(230, 250, box).y > 0)
})

test('magnetic movement returns home outside its reach and at the exact center', () => {
  assert.deepEqual(magneticOffset(1000, 1000, box), { x: 0, y: 0 })
  assert.deepEqual(magneticOffset(200, 230, box), { x: 0, y: 0 })
})

test('tilt axes follow pointer position and clamp to each card limit', () => {
  for (const limit of [5, 3.5]) {
    assert.deepEqual(tiltOffset(100, 200, box, limit), { x: limit, y: -limit })
    assert.deepEqual(tiltOffset(300, 260, box, limit), { x: -limit, y: limit })
    assert.deepEqual(tiltOffset(1000, 1000, box, limit), { x: -limit, y: limit })
    const center = tiltOffset(200, 230, box, limit)
    assert.equal(Math.abs(center.x) + Math.abs(center.y), 0)
  }
})

test('calculations remain correct after layout moves and for zero-sized targets', () => {
  const moved = { ...box, left: 450, top: 700 }
  assert.deepEqual(magneticOffset(280, 250, box), magneticOffset(630, 750, moved))
  assert.deepEqual(tiltOffset(280, 250, box, 5), tiltOffset(630, 750, moved, 5))
  const empty = { ...box, width: 0 }
  assert.deepEqual(magneticOffset(280, 250, empty), { x: 0, y: 0 })
  assert.deepEqual(tiltOffset(280, 250, empty, 5), { x: 0, y: 0 })
})

test('hover spring returns to rest promptly with negligible overshoot', () => {
  for (const start of [10, -10, 5, -3.5]) {
    const animation = spring({ keyframes: [start, 0], stiffness: 240, damping: 24, mass: 0.7 })
    let finished = false
    for (let ms = 0; ms <= 1500; ms += 16) {
      const frame = animation.next(ms)
      assert.ok(Math.abs(frame.value) <= Math.abs(start) + 0.1)
      if (frame.done) { assert.equal(frame.value, 0); finished = true; break }
    }
    assert.ok(finished)
  }
})
