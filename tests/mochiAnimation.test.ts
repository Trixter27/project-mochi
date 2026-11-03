import test from 'node:test'
import assert from 'node:assert/strict'
import {
  advanceMochiAnimation, createMochiAnimation, visibleEyeScale, WHEEL_RADIUS,
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

test('braking balance has a small rebound and settles while the wheel stays grounded', () => {
  const state = createMochiAnimation()
  tick(state, 1.5)
  let rebound = 0
  assert.ok(state.pose.lean < -0.03)
  for (let i = 0; i < 3 * 120; i++) {
    advanceMochiAnimation(state, 1 / 120, false, 0, false)
    rebound = Math.max(rebound, state.pose.lean)
    assert.equal(state.pose.bounce, 0)
  }
  assert.ok(rebound > 0.0005 && rebound < 0.003)
  assert.ok(Math.abs(state.pose.lean) < 1e-6)
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
  assert.equal(state.pose.bounce, 0, 'a reaction waits for rolling to finish before taking off')
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
  assert.ok(Math.abs(state.time - 0.05) < 1e-12)
  assert.ok(state.pose.x < -2.5)
})

function idle() {
  const state = createMochiAnimation()
  tick(state, 6)
  return state
}

test('anticipation compresses only the upper body while the single wheel stays grounded', () => {
  const state = idle(), wheel = state.pose.wheel
  tick(state, 0.25, { request: 1, fps: 120 })
  assert.equal(state.hop.phase, 'anticipation')
  assert.equal(state.pose.bounce, 0)
  assert.equal(state.pose.wheel, wheel)
  assert.ok(state.pose.suspension < -0.05)
  assert.ok(state.pose.suspension + state.pose.headBob < -0.045, 'head lowers with the torso, with a small lag')
  assert.ok(state.pose.armSwing > 0.025, 'arms prepare before launch')
  assert.ok(state.pose.torso > 0)
})

test('one happy reaction has takeoff, an apex, descent, and precise wheel contact on landing', () => {
  const state = idle(), wheel = state.pose.wheel
  let previous = 0, apex = 0, ascended = false, descended = false, landed = false, takeoffs = 0
  for (let frame = 0; frame < 4 * 120; frame++) {
    advanceMochiAnimation(state, 1 / 120, false, 1, false)
    const height = state.pose.bounce
    if (previous === 0 && height > 0) takeoffs++
    if (height > previous) ascended = true
    if (height > 0 && height < previous) descended = true
    if (previous > 0 && height === 0) landed = true
    if (height > 0) assert.equal(state.hop.phase, 'airborne')
    assert.ok(height >= 0 && height <= 0.18)
    assert.equal(state.pose.wheel, wheel, 'a stationary hop never spins the wheel')
    apex = Math.max(apex, height); previous = height
  }
  assert.equal(takeoffs, 1)
  assert.ok(ascended && descended && landed && apex > 0.16)
  assert.equal(state.hop.phase, 'grounded')
  assert.equal(state.pose.bounce, 0)
  assert.ok(Math.abs((0.23 + state.pose.bounce - WHEEL_RADIUS) - 0.02) < 1e-12)
})

test('landing compresses the suspension, the head follows later, and the rebound decays', () => {
  const state = idle()
  tick(state, 0.8, { request: 1, fps: 120 })
  let bodyMin = 0, headMin = 0, bodyMinAt = 0, headMinAt = 0, rebound = 0, lateMovement = 0
  for (let frame = 0; frame < 180; frame++) {
    advanceMochiAnimation(state, 1 / 120, false, 1, false)
    const { suspension, headBob } = state.pose
    if (suspension < bodyMin) { bodyMin = suspension; bodyMinAt = frame }
    if (headBob < headMin) { headMin = headBob; headMinAt = frame }
    if (frame > 25) rebound = Math.max(rebound, suspension)
    if (frame > 130) lateMovement = Math.max(lateMovement, Math.abs(suspension), Math.abs(headBob))
    if (state.hop.phase !== 'airborne') assert.equal(state.pose.bounce, 0)
  }
  assert.ok(bodyMin < -0.018 && rebound > 0.002)
  assert.ok(headMin < -0.002 && headMinAt > bodyMinAt, 'head settles after the torso impact')
  assert.ok(lateMovement < 0.0005 && lateMovement < Math.abs(bodyMin) / 20)
})

test('both arms follow the hop independently while the original primary wave remains recognizable', () => {
  const state = idle()
  let wave = 0, elbow = 0, other = 0, secondaryElbow = 0, armDifference = 0
  let primaryLiftAt = -1, secondaryLiftAt = -1, secondaryPeakAt = 0, apexAt = 0, apex = 0
  for (let frame = 0; frame < 2 * 120; frame++) {
    advanceMochiAnimation(state, 1 / 120, false, 1, false)
    if (primaryLiftAt < 0 && -state.pose.shoulder - 0.14 > 0.3) primaryLiftAt = frame
    if (secondaryLiftAt < 0 && state.pose.otherShoulder - 0.14 > 0.3) secondaryLiftAt = frame
    if (state.pose.otherShoulder - 0.14 > other) secondaryPeakAt = frame
    if (state.pose.bounce > apex) { apex = state.pose.bounce; apexAt = frame }
    wave = Math.min(wave, state.pose.shoulder)
    elbow = Math.min(elbow, state.pose.elbow)
    other = Math.max(other, state.pose.otherShoulder - 0.14)
    secondaryElbow = Math.max(secondaryElbow, state.pose.otherElbow - 0.12)
    armDifference = Math.max(armDifference, Math.abs(state.pose.armSwing - state.pose.otherArmSwing))
  }
  assert.ok(wave < -2 && elbow < -0.5)
  assert.ok(primaryLiftAt >= 0 && secondaryLiftAt > primaryLiftAt, 'primary arm leads the noticeable lift')
  assert.ok(Math.abs(secondaryPeakAt - apexAt) / 120 < 0.15, 'secondary lift peaks near the hop apex')
  assert.ok(other > 0.5 && other < (-wave - 0.14) * 0.7, 'secondary lift is noticeable but smaller than the primary')
  assert.ok(secondaryElbow > 0.15 && secondaryElbow < -elbow - 0.12 && armDifference > 0.015)
  tick(state, 4, { request: 1 })
  assert.ok(Math.abs(state.pose.shoulder + 0.14) < 0.001)
  assert.ok(Math.abs(state.pose.elbow + 0.12) < 0.001)
  assert.ok(Math.abs(state.pose.otherShoulder - 0.14) < 0.001)
  assert.ok(Math.abs(state.pose.otherElbow - 0.12) < 0.001)
})

test('happy expression builds from anticipation to airborne cheer and settles after landing', () => {
  const state = idle()
  tick(state, 0.25, { request: 1, fps: 120 })
  const anticipation = { ...state.pose }
  assert.ok(anticipation.eye > 1.05 && anticipation.eye <= 1.08, 'anticipation widens the open eyes')
  assert.ok(anticipation.smile > 1 && anticipation.smile < 1.05)
  assert.ok(anticipation.gazeY > 0 && anticipation.happyEyes === 0)
  tick(state, 0.325, { request: 1, fps: 120 })
  assert.ok(state.pose.bounce > 0.16)
  assert.ok(state.pose.smile > anticipation.smile && state.pose.smile > 1.15)
  assert.ok(state.pose.eye < anticipation.eye && state.pose.blush > anticipation.blush)
  assert.ok(state.pose.happyEyes > 0.9 && state.pose.happySmile > 0.8)
  tick(state, 2.5, { request: 1, fps: 120 })
  assert.ok(Math.abs(state.pose.smile - 1) < 0.001 && Math.abs(state.pose.blush - 1) < 0.001)
  assert.ok(state.pose.happyEyes < 0.001 && state.pose.happySmile < 0.001)
})

test('curved happy eyes peak near the physical apex and reopen before the smile fades', () => {
  const state = idle()
  let apex = 0, apexAt = 0, eyePeak = 0, eyePeakAt = 0, landingChecked = false
  for (let frame = 0; frame < 240; frame++) {
    const before = { ...state.pose }
    advanceMochiAnimation(state, 1 / 120, false, 1, false)
    if (state.pose.bounce > apex) { apex = state.pose.bounce; apexAt = frame }
    if (state.pose.happyEyes > eyePeak) { eyePeak = state.pose.happyEyes; eyePeakAt = frame }
    assert.ok(Math.abs(state.pose.happyEyes - before.happyEyes) < 0.1)
    assert.ok(Math.abs(state.pose.happySmile - before.happySmile) < 0.09)
    if (before.bounce > 0 && state.pose.bounce === 0) {
      assert.ok(state.pose.happyEyes < 0.3 && state.pose.happySmile > 0.9)
      assert.ok(state.pose.eye > 0.95)
      landingChecked = true
    }
  }
  assert.ok(eyePeak > 0.95 && Math.abs(eyePeakAt - apexAt) / 120 < 0.12)
  assert.ok(landingChecked)
})

test('a blink coinciding with the apex cannot flatten the independent happy-eye curves', () => {
  const state = idle(), reference = idle()
  // Place the normal blink at the next hop apex.
  state.time = 4.6 - 0.575
  tick(state, 0.575, { request: 1, fps: 120 })
  tick(reference, 0.575, { request: 1, fps: 120 })
  assert.ok(state.pose.eye < 0.4 && reference.pose.eye > 0.95)
  assert.ok(visibleEyeScale(state.pose.eye, state.pose.happyEyes) >= 1)
  assert.equal(state.pose.happyEyes, reference.pose.happyEyes)
  assert.ok(state.pose.happyEyes > 0.9)
  tick(state, 3, { request: 1 })
  assert.ok(state.pose.eye > 0.99 && state.pose.happyEyes < 0.001)
})

test('joyful eyes hold readably and the reopening layer stays open even during a blink', () => {
  const state = idle()
  let held = 0, maximumStep = 0
  for (let frame = 0; frame < 240; frame++) {
    const before = state.pose.happyEyes
    advanceMochiAnimation(state, 1 / 120, false, 1, false)
    if (state.pose.happyEyes > 0.9) held += 1 / 120
    maximumStep = Math.max(maximumStep, Math.abs(state.pose.happyEyes - before))
    if (state.pose.happyEyes > 0.15) assert.equal(visibleEyeScale(0.06, state.pose.happyEyes), 1)
  }
  assert.ok(held >= 0.14 && held < 0.35, 'a brief readable hold, not a frozen face')
  assert.ok(maximumStep < 0.065)
  assert.ok(state.pose.happyEyes < 0.001)
  assert.equal(visibleEyeScale(0.06, 0), 0.06, 'ordinary blinking retains its full range')
  let previous = 0.06
  for (let i = 0; i <= 100; i++) {
    const scale = visibleEyeScale(0.06, i * 0.0015)
    assert.ok(scale >= previous && scale - previous < 0.015)
    previous = scale
  }
})

test('shy arms move inward with a brief glance, recover smoothly, and never leave the ground', () => {
  const state = idle()
  tick(state, 0.8, { request: 2, fps: 120 })
  const tucked = { ...state.pose }
  assert.ok(tucked.shoulder > -0.14 && tucked.otherShoulder < 0.14)
  assert.ok(tucked.headZ < -0.08 && tucked.gazeX < -0.015 && tucked.gazeY < -0.025)
  for (let frame = 0; frame < 4 * 120; frame++) {
    advanceMochiAnimation(state, 1 / 120, false, 2, false)
    assert.equal(state.pose.bounce, 0)
  }
  assert.ok(Math.abs(state.pose.gazeX) < 0.001 && Math.abs(state.pose.gazeY) < 0.001)
  assert.ok(Math.abs(state.pose.shoulder + 0.14) < 0.001 && Math.abs(state.pose.otherShoulder - 0.14) < 0.001)
})

test('expressions stay bounded and blend through repeated clicks; reduced reactions stay static', () => {
  const state = idle()
  for (let frame = 0; frame < 6 * 120; frame++) {
    const before = { ...state.pose }
    advanceMochiAnimation(state, 1 / 120, false, 1 + Math.floor(frame / 37), false)
    for (const key of ['eye', 'smile', 'blush', 'headX', 'headZ', 'gazeX', 'gazeY'] as const) {
      assert.ok(Math.abs(state.pose[key] - before[key]) < (key === 'eye' ? 0.2 : 0.03), `${key} blends without snapping`)
    }
    assert.ok(state.pose.eye > 0 && state.pose.eye <= 1.08)
    assert.ok(state.pose.smile >= 0.75 && state.pose.smile <= 1.25)
    assert.ok(state.pose.blush >= 1 && state.pose.blush <= 1.25)
    assert.ok(Math.abs(state.pose.headX) < 0.14 && Math.abs(state.pose.headZ) < 0.15)
    for (const key of ['happyEyes', 'happySmile'] as const) {
      assert.ok(state.pose[key] >= 0 && state.pose[key] <= 1)
      assert.ok(Math.abs(state.pose[key] - before[key]) < 0.17)
    }
  }
  for (const request of [1, 2]) {
    advanceMochiAnimation(state, 0, false, request, true)
    const pose = { ...state.pose }
    assert.equal(pose.happyEyes, request === 1 ? 1 : 0)
    assert.equal(pose.happySmile, request === 1 ? 1 : 0)
    for (let frame = 0; frame < 120; frame++) advanceMochiAnimation(state, 1 / 60, false, request, true)
    assert.deepEqual(state.pose, pose)
    assert.equal(state.pose.bounce, 0)
  }
})

test('antenna trails launch, overshoots on landing, then returns to its tiny idle sway', () => {
  const state = idle(), reference = idle()
  let launchLag = 0, landingOvershoot = 0, lateDifference = 0
  for (let frame = 0; frame < 3 * 120; frame++) {
    advanceMochiAnimation(state, 1 / 120, false, 1, false)
    advanceMochiAnimation(reference, 1 / 120, false, 0, false)
    const difference = state.pose.antenna - reference.pose.antenna
    if (frame > 45 && frame < 85) launchLag = Math.min(launchLag, difference)
    if (frame > 95 && frame < 130) landingOvershoot = Math.max(landingOvershoot, difference)
    if (frame > 300) lateDifference = Math.max(lateDifference, Math.abs(difference))
    assert.ok(Math.abs(state.pose.antenna) <= 0.18)
  }
  assert.ok(launchLag < -0.06 && landingOvershoot > 0.07)
  assert.ok(lateDifference < 0.001)
})

test('reaction during welcome retains the same travel and wheel speed without a sudden rush to center', () => {
  const interrupted = createMochiAnimation(), reference = createMochiAnimation()
  for (let frame = 0; frame < 1.5 * 120; frame++) {
    advanceMochiAnimation(interrupted, 1 / 120, false, frame >= 60 ? 1 : 0, false)
    advanceMochiAnimation(reference, 1 / 120, false, 0, false)
    assert.equal(interrupted.pose.x, reference.pose.x)
    assert.equal(interrupted.pose.wheel, reference.pose.wheel)
    assert.equal(interrupted.velocity, reference.velocity)
    assert.equal(interrupted.pose.bounce, 0)
    assert.ok(Math.abs(interrupted.pose.wheel - (interrupted.pose.x + 2.6) / WHEEL_RADIUS) < 1e-9)
  }
  assert.equal(interrupted.phase, 'happy')
  tick(interrupted, 0.55, { request: 1 })
  assert.ok(interrupted.pose.bounce > 0.1)
})

test('clicks during flight cannot reset height, add launch energy, or queue another hop', () => {
  const state = idle(), reference = idle()
  tick(state, 0.45, { request: 1, fps: 120 })
  tick(reference, 0.45, { request: 1, fps: 120 })
  assert.equal(state.hop.phase, 'airborne')
  for (let frame = 0; frame < 180; frame++) {
    const before = { ...state.pose }, input = 2 + Math.floor(frame / 12)
    advanceMochiAnimation(state, 1 / 120, true, input, false)
    advanceMochiAnimation(reference, 1 / 120, false, 1, false)
    assert.equal(state.pose.bounce, reference.pose.bounce)
    assert.equal(state.hop.velocity, reference.hop.velocity)
    assert.ok(Math.abs(state.pose.bounce - before.bounce) < 0.012)
    for (const key of ['suspension', 'headBob', 'torso', 'antenna', 'otherShoulder', 'otherElbow'] as const) {
      assert.ok(Math.abs(state.pose[key] - before[key]) < 0.04, `${key} must blend through interruptions`)
    }
    assert.ok(Math.abs(state.pose.shoulder - before.shoulder) < 0.2)
  }
  const lastRequest = state.request
  tick(state, 4, { request: lastRequest })
  assert.equal(state.phase, 'idle')
  assert.equal(state.pose.bounce, 0)
  assert.equal(state.hop.pending, false)
  assert.ok(Math.abs(state.pose.suspension) < 0.001)
})

test('a shy interruption can release anticipation without launching or snapping the joints', () => {
  const state = idle()
  tick(state, 0.25, { request: 1 })
  const before = { ...state.pose }
  advanceMochiAnimation(state, 0, false, 2, false)
  assert.deepEqual(state.pose, before)
  for (let frame = 0; frame < 180; frame++) {
    advanceMochiAnimation(state, 1 / 120, false, 2, false)
    assert.equal(state.pose.bounce, 0)
    if (frame === 119) assert.ok(state.pose.otherShoulder < 0.06 && state.pose.otherElbow > 0.2)
  }
  assert.equal(state.phase, 'shy')
  assert.ok(state.pose.suspension < -0.02 && state.pose.torso < 0)
  tick(state, 4, { request: 2 })
  tick(state, 1, { request: 2, curious: true })
  assert.equal(state.phase, 'curious')
  assert.ok(state.pose.torso > 0.02 && state.pose.otherShoulder > 0.2)
})

test('springs and hop traces agree at 30, 60 and 120 FPS, not just at their final rest pose', () => {
  const states = [idle(), idle(), idle()], rates = [30, 60, 120]
  for (let sample = 0; sample < 30; sample++) {
    states.forEach((state, index) => tick(state, 0.1, { fps: rates[index], request: sample < 7 ? 1 : 2 }))
    for (const state of states.slice(1)) {
      for (const key of Object.keys(state.pose) as (keyof typeof state.pose)[]) {
        assert.ok(Math.abs(state.pose[key] - states[0].pose[key]) < 1e-8, `${key} at sample ${sample}`)
      }
      assert.equal(state.hop.phase, states[0].hop.phase)
    }
  }
})

test('long frame stalls are bounded even in midair and never destabilize the articulation', () => {
  const delayed = idle(), reference = idle()
  tick(delayed, 0.45, { request: 1 }); tick(reference, 0.45, { request: 1 })
  advanceMochiAnimation(delayed, 1000, false, 1, false)
  advanceMochiAnimation(reference, 0.05, false, 1, false)
  assert.deepEqual(delayed.pose, reference.pose)
  for (let i = 0; i < 150; i++) {
    advanceMochiAnimation(delayed, 1000, i % 2 === 0, Math.floor(i / 15) + 1, false)
    assert.ok(Object.values(delayed.pose).every(Number.isFinite))
    assert.ok(delayed.pose.bounce >= 0 && delayed.pose.bounce <= 0.18)
    assert.ok(delayed.pose.suspension >= -0.09 && delayed.pose.suspension <= 0.04)
    assert.ok(Math.abs(delayed.pose.lean) <= 0.1 && Math.abs(delayed.pose.torso) <= 0.055)
    assert.ok(Math.abs(delayed.pose.headBob) <= 0.035 && Math.abs(delayed.pose.headX) < 0.14 && Math.abs(delayed.pose.headZ) < 0.15)
  }
})

test('enabling reduced motion mid-hop clears momentum and leaves a stable expressive pose', () => {
  const state = idle()
  tick(state, 0.5, { request: 1 })
  assert.ok(state.pose.bounce > 0)
  advanceMochiAnimation(state, 0, false, 1, true)
  const pose = { ...state.pose }
  assert.equal(state.hop.phase, 'grounded')
  assert.equal(state.pose.bounce, 0)
  assert.equal(state.pose.antenna, 0)
  assert.ok(Object.values(state.springVelocity).every(value => value === 0))
  for (let i = 0; i < 100; i++) advanceMochiAnimation(state, 1000, false, 1, true)
  assert.deepEqual(state.pose, pose)
  tick(state, 3, { request: 1 })
  assert.equal(state.pose.bounce, 0, 'disabling reduced motion cannot replay a consumed hop')
  assert.equal(state.pose.wheel, 0)
})
