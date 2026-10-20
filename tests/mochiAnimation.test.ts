import test from 'node:test'
import assert from 'node:assert/strict'
import {
  advanceMochiAnimation, createMochiAnimation, WHEEL_RADIUS,
  type MochiAnimation,
} from '../src/components/mascot/mochiAnimation.ts'

function tick(state: MochiAnimation, seconds: number, options: { request?: number; curious?: boolean; fps?: number } = {}) {
  const { request = 0, curious = false, fps = 60 } = options
  for (let i = 0; i < Math.round(seconds * fps); i++) {
    advanceMochiAnimation(state, 1 / fps, curious, request, false)
    assert.ok(Object.values(state.pose).every(Number.isFinite))
  }
}

test('welcome rolls one wheel by distance/radius, stops, waves, then enters idle', () => {
  const state = createMochiAnimation()
  tick(state, 1.6)
  assert.equal(Math.abs(state.pose.x), 0)
  assert.ok(Math.abs(state.pose.wheel - 2.6 / WHEEL_RADIUS) < 1e-9)
  tick(state, 1.4)
  assert.ok(state.pose.shoulder < -1.6, 'the arm is raised during the welcome')
  assert.ok(state.pose.elbow < -0.3, 'the elbow articulates during the wave')
  tick(state, 3)
  assert.equal(state.phase, 'idle')
  assert.ok(Math.abs(state.pose.shoulder + 0.14) < 0.01)
  assert.ok(Math.abs(state.pose.yaw) < 0.001)
})

test('idle balances and blinks without wheel spinning', () => {
  const state = createMochiAnimation()
  tick(state, 6)
  const wheel = state.pose.wheel
  let minEye = 1
  let maxBalance = 0
  for (let i = 0; i < 600; i++) {
    advanceMochiAnimation(state, 1 / 60, false, 0, false)
    minEye = Math.min(minEye, state.pose.eye)
    maxBalance = Math.max(maxBalance, Math.abs(state.pose.balance))
    assert.equal(state.pose.wheel, wheel)
    assert.ok(Math.abs(state.pose.breath) <= 0.008)
  }
  assert.ok(minEye < 0.4)
  assert.ok(maxBalance > 0.005 && maxBalance <= 0.012)
})

test('the axle balance leans forward to accelerate and backward to brake', () => {
  const state = createMochiAnimation()
  let forward = 0
  let backward = 0
  for (let i = 0; i < 110; i++) {
    advanceMochiAnimation(state, 1 / 60, false, 0, false)
    forward = Math.max(forward, state.pose.lean)
    backward = Math.min(backward, state.pose.lean)
  }
  assert.ok(forward > 0.02)
  assert.ok(backward < -0.01)
  assert.ok(forward <= 0.1 && backward >= -0.1)
})

test('hover/focus curiosity releases back to idle', () => {
  const state = createMochiAnimation()
  tick(state, 6)
  tick(state, 1, { curious: true })
  assert.equal(state.phase, 'curious')
  assert.ok(state.pose.headZ > 0.12)
  assert.ok(state.pose.eye > 1)
  tick(state, 1)
  assert.equal(state.phase, 'idle')
  assert.ok(Math.abs(state.pose.headZ) < 0.04)
})

test('input interrupts welcome and reactions blend instead of stacking', () => {
  const state = createMochiAnimation()
  tick(state, 0.5)
  const beforeX = state.pose.x
  tick(state, 1 / 60, { request: 1 })
  assert.equal(state.phase, 'happy')
  assert.ok(state.pose.x > beforeX && state.pose.x < 0)
  tick(state, 0.8, { request: 1 })
  assert.ok(state.pose.bounce > 0)
  const shoulder = state.pose.shoulder
  tick(state, 1 / 60, { request: 2 })
  assert.equal(state.phase, 'shy')
  assert.ok(Math.abs(state.pose.shoulder - shoulder) < 0.4)
  tick(state, 1, { request: 2 })
  assert.ok(state.pose.blush > 1.2)
  assert.ok(state.pose.gazeY < -0.025)
  tick(state, 4, { request: 2 })
  assert.equal(state.phase, 'idle')
  assert.ok(Math.abs(state.pose.shoulder + 0.14) < 0.01)
})

test('reduced motion is static, with useful input-driven expressions', () => {
  const state = createMochiAnimation()
  advanceMochiAnimation(state, 0, false, 0, true)
  const idle = { ...state.pose }
  for (let i = 0; i < 100; i++) advanceMochiAnimation(state, 100, false, 0, true)
  assert.deepEqual(state.pose, idle)
  assert.equal(state.pose.x, 0)
  assert.equal(state.pose.wheel, 0)
  advanceMochiAnimation(state, 0, true, 0, true)
  assert.equal(state.phase, 'curious')
  advanceMochiAnimation(state, 0, true, 1, true)
  assert.equal(state.phase, 'happy')
  assert.ok(state.pose.shoulder < -2)
  assert.equal(state.pose.bounce, 0)
  advanceMochiAnimation(state, 0, false, 2, true)
  assert.equal(state.phase, 'shy')
  assert.ok(state.pose.gazeY < 0)
})

test('entrance travel is consistent across frame rates and long deltas are bounded', () => {
  const a = createMochiAnimation()
  const b = createMochiAnimation()
  tick(a, 1, { fps: 30 })
  tick(b, 1, { fps: 120 })
  assert.ok(Math.abs(a.pose.x - b.pose.x) < 1e-9)
  assert.ok(Math.abs(a.pose.wheel - b.pose.wheel) < 1e-9)
  const state = createMochiAnimation()
  advanceMochiAnimation(state, 100, false, 0, false)
  assert.equal(state.time, 0.05)
  assert.ok(state.pose.x < -2.5)
})
