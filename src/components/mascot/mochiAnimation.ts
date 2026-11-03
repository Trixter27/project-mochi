export type MochiPhase = 'welcome' | 'idle' | 'curious' | 'happy' | 'shy'

export const WHEEL_RADIUS = 0.21

export interface MochiPose {
  x: number
  /** Actual airborne height only; suspension never moves the wheel. */
  bounce: number
  suspension: number
  torso: number
  headBob: number
  armSwing: number
  otherArmSwing: number
  otherShoulder: number
  otherElbow: number
  antenna: number
  yaw: number
  wheel: number
  lean: number
  balance: number
  breath: number
  headX: number
  headY: number
  headZ: number
  shoulder: number
  elbow: number
  eye: number
  happyEyes: number
  happySmile: number
  gazeX: number
  gazeY: number
  smile: number
  blush: number
}

export interface MochiAnimation {
  phase: MochiPhase
  age: number
  time: number
  request: number
  velocity: number
  travelAge: number
  hop: { phase: 'grounded' | 'anticipation' | 'airborne' | 'recovering'; age: number; velocity: number; pending: boolean }
  springVelocity: Record<SpringJoint, number>
  pose: MochiPose
}

const springJoints = ['suspension', 'lean', 'torso', 'headBob', 'armSwing', 'otherArmSwing', 'otherShoulder', 'otherElbow', 'antenna'] as const
type SpringJoint = typeof springJoints[number]

export function createMochiAnimation(): MochiAnimation {
  return {
    phase: 'welcome', age: 0, time: 0, request: 0, velocity: 0, travelAge: 0,
    hop: { phase: 'grounded', age: 0, velocity: 0, pending: false },
    springVelocity: { suspension: 0, lean: 0, torso: 0, headBob: 0, armSwing: 0, otherArmSwing: 0, otherShoulder: 0, otherElbow: 0, antenna: 0 },
    pose: {
      x: -2.6, bounce: 0, yaw: Math.PI / 2, wheel: 0,
      suspension: 0, torso: 0, headBob: 0, armSwing: 0, otherArmSwing: 0, otherShoulder: 0.14, otherElbow: 0.12, antenna: 0,
      lean: 0, balance: 0, breath: 0, headX: 0, headY: 0, headZ: 0,
      shoulder: -0.14, elbow: -0.12, eye: 1, happyEyes: 0, happySmile: 0,
      gazeX: 0, gazeY: 0, smile: 1, blush: 1,
    },
  }
}

const clamp = (n: number) => Math.max(0, Math.min(1, n))
const smooth = (n: number) => { const t = clamp(n); return t * t * (3 - 2 * t) }
const damp = (from: number, to: number, speed: number, dt: number) => to + (from - to) * Math.exp(-speed * dt)
const bound = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value))

/** Keep a blink from flattening the open-eye layer while it crossfades with crescents. */
export function visibleEyeScale(eye: number, happyEyes: number) {
  return eye + (Math.max(1, eye) - eye) * smooth(happyEyes / 0.15)
}

/** Semi-implicit spring integration, always called with steps <= 1/240 second. */
function spring(state: MochiAnimation, joint: SpringJoint, target: number, stiffness: number, damping: number, dt: number, low: number, high: number) {
  let velocity = state.springVelocity[joint]
  velocity += (stiffness * (target - state.pose[joint]) - damping * velocity) * dt
  const position = state.pose[joint] + velocity * dt
  state.pose[joint] = bound(position, low, high)
  state.springVelocity[joint] = position < low || position > high ? 0 : velocity
}

function advanceHop(state: MochiAnimation, dt: number) {
  const { hop, pose } = state
  if (hop.pending && state.travelAge === 1.5 && hop.phase === 'grounded') {
    hop.pending = false; hop.phase = 'anticipation'; hop.age = 0
  }
  hop.age += dt
  if (hop.phase === 'anticipation' && hop.age >= 0.32 - 1e-9) {
    hop.phase = 'airborne'; hop.age = 0; hop.velocity = 1.4
    state.springVelocity.suspension += 0.9
    state.springVelocity.antenna -= 0.28
  } else if (hop.phase === 'airborne') {
    // A single ballistic arc. Emotion changes never reset its height or momentum.
    pose.bounce += hop.velocity * dt - 0.5 * 5.6 * dt * dt
    hop.velocity -= 5.6 * dt
    if (pose.bounce <= 1e-9 && hop.velocity < 0) {
      pose.bounce = 0
      state.springVelocity.suspension += hop.velocity * 0.55
      state.springVelocity.headBob += hop.velocity * 0.05
      state.springVelocity.antenna -= hop.velocity * 0.3
      hop.phase = 'recovering'; hop.age = 0; hop.velocity = 0
    }
  } else if (hop.phase === 'recovering' && hop.age >= 1.2) {
    hop.phase = 'grounded'; hop.age = 0
  }
}

/** One owner for all joints; bounded substeps and no per-frame object allocation. */
export function advanceMochiAnimation(
  state: MochiAnimation,
  delta: number,
  curious: boolean,
  request: number,
  reducedMotion: boolean,
): MochiPose {
  const p = state.pose
  const dt = Math.min(Math.max(delta, 0), 0.05)

  // Reduced motion is a static pose: no entrance, blink, balancing, roll, or bounce.
  // Input still changes the expression and held arm pose in a single demand frame.
  if (reducedMotion) {
    state.phase = request > 0 ? (request % 2 ? 'happy' : 'shy') : (curious ? 'curious' : 'idle')
    state.request = request
    state.age = 0
    state.velocity = 0
    state.travelAge = 1.5
    state.hop.phase = 'grounded'; state.hop.age = 0; state.hop.velocity = 0; state.hop.pending = false
    for (const joint of springJoints) state.springVelocity[joint] = 0
    p.x = p.bounce = p.yaw = p.wheel = p.lean = p.balance = p.breath = 0
    p.headBob = p.armSwing = p.otherArmSwing = p.antenna = 0
    p.suspension = state.phase === 'shy' ? -0.025 : 0
    p.torso = state.phase === 'shy' ? -0.02 : curious ? 0.025 : 0
    p.otherShoulder = state.phase === 'shy' ? 0.04 : state.phase === 'happy' ? 0.28 : 0.14
    p.otherElbow = request > 0 ? 0.24 : 0.12
    p.headX = p.headY = p.gazeX = 0
    p.headZ = state.phase === 'shy' ? -0.12 : curious ? 0.12 : 0
    p.shoulder = request > 0 ? -2.1 : -0.14
    p.elbow = request > 0 ? -0.5 : -0.12
    p.eye = state.phase === 'happy' ? 0.7 : 1
    p.happyEyes = p.happySmile = state.phase === 'happy' ? 1 : 0
    p.gazeY = state.phase === 'shy' ? -0.035 : 0
    p.smile = state.phase === 'happy' ? 1.25 : 1
    p.blush = state.phase === 'shy' ? 1.2 : 1
    return p
  }

  if (request !== state.request) {
    state.request = request
    state.phase = request % 2 ? 'happy' : 'shy'
    state.age = 0
    // At most one hop, with no queued launches or added energy on busy clicks.
    state.hop.pending = state.phase === 'happy' && state.hop.phase === 'grounded'
    if (state.phase === 'shy' && state.hop.phase === 'anticipation') {
      state.hop.phase = 'recovering'; state.hop.age = 0
    }
  }
  let remaining = dt
  while (remaining > 1e-10) {
    const step = Math.min(remaining, 1 / 240)
    stepMochi(state, step, curious)
    remaining -= step
  }
  return p
}

function stepMochi(state: MochiAnimation, dt: number, curious: boolean) {
  const p = state.pose
  state.time += dt
  state.age += dt
  if ((state.phase === 'welcome' && state.age >= 4.8 - 1e-9)
    || ((state.phase === 'happy' || state.phase === 'shy') && state.age >= 2.6 - 1e-9)) {
    state.phase = curious ? 'curious' : 'idle'
    state.age = 0
  } else if (state.phase === 'idle' || state.phase === 'curious') {
    state.phase = curious ? 'curious' : 'idle'
  }

  const { phase, age, time } = state
  const welcome = phase === 'welcome'
  const happy = phase === 'happy'
  const shy = phase === 'shy' || (welcome && age > 1.7)
  const interested = phase === 'curious'
  const waveAge = welcome ? age - 2 : age
  const waveDuration = welcome ? 2.6 : 2.4
  const wave = (welcome || happy || shy)
    ? smooth(waveAge / 0.5) * smooth((waveDuration - waveAge) / 0.5) : 0
  const oldX = p.x
  // Reactions can change the expression immediately without changing the rolling
  // trajectory or abruptly accelerating toward the parking point.
  state.travelAge = Math.min(1.5, state.travelAge + dt)
  if (state.travelAge > 1.5 - 1e-9) state.travelAge = 1.5
  p.x = -2.6 * (1 - smooth(state.travelAge / 1.5))
  const distance = p.x - oldX
  const velocity = dt ? distance / dt : 0
  const acceleration = dt ? (velocity - state.velocity) / dt : 0
  state.velocity = velocity
  // The axle is the local X axis; the entrance heading points local +Z along world +X.
  // Integrating actual displacement keeps the tire still when the robot is still.
  p.wheel += distance / WHEEL_RADIUS
  p.yaw = damp(p.yaw, state.travelAge < 1.5 ? Math.PI / 2 : 0, 6, dt)
  advanceHop(state, dt)
  const preparing = state.hop.phase === 'anticipation' ? smooth(state.hop.age / 0.22) : 0
  const airborne = state.hop.phase === 'airborne'
  // Personality envelopes follow the existing hop clock; they never drive its physics.
  // The second arm starts after takeoff and its existing spring delays the peak toward the apex.
  const celebration = happy && airborne ? smooth(state.hop.age / 0.08) * (1 - smooth((state.hop.age - 0.18) / 0.24)) : 0
  const cheer = happy ? (airborne ? smooth(state.hop.age / 0.12)
    : state.hop.phase === 'recovering' ? 1 - smooth(state.hop.age / 0.65) : 0) : 0
  const happyRelease = state.hop.phase === 'recovering' ? 1 - smooth(state.hop.age / 0.75)
    : state.hop.phase === 'grounded' && !state.hop.pending ? 0 : 1
  const gestureWave = happy ? wave * happyRelease : wave
  const shyGesture = phase === 'shy' ? smooth(age / 0.18) * (1 - smooth((age - 1.2) / 0.85)) : 0
  const shyExpression = phase === 'shy' ? shyGesture : shy ? 1 : 0
  spring(state, 'lean', bound(velocity * 0.025 + acceleration * 0.012, -0.085, 0.085), 80, 14, dt, -0.1, 0.1)
  spring(state, 'suspension', preparing ? -0.08 * preparing : airborne ? 0.018 : shy ? -0.025 : 0, 180, 14, dt, -0.09, 0.04)
  spring(state, 'torso', p.lean * 0.25 + (interested ? 0.025 : shy ? -0.02 : 0) + preparing * 0.025, 95, 15, dt, -0.055, 0.055)
  spring(state, 'headBob', bound(p.suspension * 0.18 - state.springVelocity.suspension * 0.025, -0.025, 0.025), 65, 10, dt, -0.035, 0.035)
  const armTarget = bound(preparing * 0.12 - state.springVelocity.suspension * 0.2 + state.hop.velocity * 0.045 + p.lean * 0.4, -0.16, 0.16)
  spring(state, 'armSwing', armTarget, 70, 11, dt, -0.18, 0.18)
  spring(state, 'otherArmSwing', armTarget * 0.7, 45, 9, dt, -0.14, 0.14)
  spring(state, 'otherShoulder', 0.14 + (interested ? 0.07 : -0.1 * shyExpression) + (airborne ? 0.13 : 0) - p.suspension * 0.7 + 1.1 * celebration, 65, 12, dt, -0.02, 1.5)
  spring(state, 'otherElbow', 0.12 + 0.1 * shyExpression + (airborne ? 0.12 : 0) - p.suspension * 0.7 + 0.32 * celebration, 55, 11, dt, 0.05, 0.7)
  spring(state, 'antenna', bound(-state.springVelocity.suspension * 0.18 - state.hop.velocity * 0.05 + p.lean * 0.22 + Math.sin(time * 0.8) * 0.006, -0.12, 0.12), 95, 9.5, dt, -0.18, 0.18)
  p.balance = Math.sin(time * 1.3) * 0.012
  p.breath = Math.sin(time * 1.7) * 0.008
  p.headX = damp(p.headX, (shy ? 0.09 * shyExpression : interested ? -0.07 : Math.sin(time * 0.7) * 0.025) - p.torso * 0.5 + (happy ? preparing * 0.02 - cheer * 0.025 : 0), 5, dt)
  p.headY = damp(p.headY, state.travelAge < 1.5 ? -0.5 : interested ? 0.12 : Math.sin(time * 0.6) * 0.04, 5, dt)
  p.headZ = damp(p.headZ, shy ? -0.12 * shyExpression : interested ? 0.13 : 0.025 * Math.sin(time), 5, dt)
  p.shoulder = damp(p.shoulder, phase === 'shy' ? -0.14 + 0.12 * shyGesture
    : -0.14 - gestureWave * (2.1 + Math.sin(waveAge * (happy ? 8 : 5)) * 0.16), 10, dt)
  p.elbow = damp(p.elbow, phase === 'shy' ? -0.12 - 0.12 * shyGesture
    : -0.12 - gestureWave * (0.5 + Math.sin(waveAge * 6) * 0.16), 10, dt)
  const blinkTime = time % 4.9
  const blink = blinkTime > 4.5 && blinkTime < 4.7 ? 1 - 0.94 * Math.sin((blinkTime - 4.5) / 0.2 * Math.PI) : 1
  // Close on takeoff, hold through the apex, then reopen over the descent.
  // This uses the existing airborne clock; interrupted expressions still damp to neutral.
  const joyfulEyes = happy && airborne
    ? smooth(state.hop.age / 0.18) * (1 - smooth((state.hop.age - 0.28) / 0.22)) : 0
  p.happyEyes = damp(p.happyEyes, joyfulEyes, 22, dt)
  p.happySmile = damp(p.happySmile, cheer, 10, dt)
  p.eye = damp(p.eye, blink * (happy ? 1 + 0.08 * preparing : interested ? 1.08 : 1), 38, dt)
  p.gazeX = damp(p.gazeX, interested ? 0.025 : phase === 'shy' ? -0.024 * shyGesture : shy ? -0.018 : 0, 6, dt)
  p.gazeY = damp(p.gazeY, shy ? -0.035 * shyExpression : interested ? 0.015 : happy ? 0.012 * preparing + 0.008 * cheer : 0, 6, dt)
  p.smile = damp(p.smile, happy ? 1 + 0.04 * preparing + 0.25 * cheer : phase === 'shy' ? 1 - 0.18 * shyGesture : shy ? 0.75 : 1, 6, dt)
  p.blush = damp(p.blush, shy ? 1 + 0.25 * shyExpression : happy ? 1 + 0.02 * preparing + 0.2 * cheer : 1, 6, dt)
}
