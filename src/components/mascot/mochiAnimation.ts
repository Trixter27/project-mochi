export type MochiPhase = 'welcome' | 'idle' | 'curious' | 'happy' | 'shy'

export const WHEEL_RADIUS = 0.21

export interface MochiPose {
  x: number
  bounce: number
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
  pose: MochiPose
}

export function createMochiAnimation(): MochiAnimation {
  return {
    phase: 'welcome', age: 0, time: 0, request: 0, velocity: 0,
    pose: {
      x: -2.6, bounce: 0, yaw: Math.PI / 2, wheel: 0,
      lean: 0, balance: 0, breath: 0, headX: 0, headY: 0, headZ: 0,
      shoulder: -0.14, elbow: -0.12, eye: 1,
      gazeX: 0, gazeY: 0, smile: 1, blush: 1,
    },
  }
}

const clamp = (n: number) => Math.max(0, Math.min(1, n))
const smooth = (n: number) => { const t = clamp(n); return t * t * (3 - 2 * t) }
const damp = (from: number, to: number, speed: number, dt: number) => to + (from - to) * Math.exp(-speed * dt)

/** Mutates one reusable pose. No React updates, allocations, timers, or physics per frame. */
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
    p.x = p.bounce = p.yaw = p.wheel = p.lean = p.balance = p.breath = 0
    p.headX = p.headY = p.gazeX = 0
    p.headZ = state.phase === 'shy' ? -0.12 : curious ? 0.12 : 0
    p.shoulder = request > 0 ? -2.1 : -0.14
    p.elbow = request > 0 ? -0.5 : -0.12
    p.eye = state.phase === 'happy' ? 0.7 : 1
    p.gazeY = state.phase === 'shy' ? -0.035 : 0
    p.smile = state.phase === 'happy' ? 1.25 : 1
    p.blush = state.phase === 'shy' ? 1.2 : 1
    return p
  }

  state.time += dt
  state.age += dt
  if (request !== state.request) {
    state.request = request
    state.phase = request % 2 ? 'happy' : 'shy'
    state.age = 0
  } else if ((state.phase === 'welcome' && state.age >= 4.8)
    || ((state.phase === 'happy' || state.phase === 'shy') && state.age >= 2.6)) {
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
  // Ease into the stop before turning to face the visitor.
  const targetX = welcome ? -2.6 * (1 - smooth(age / 1.5)) : 0
  p.x = welcome ? targetX : damp(oldX, 0, 8, dt)
  const distance = p.x - oldX
  const velocity = dt ? distance / dt : 0
  const acceleration = dt ? (velocity - state.velocity) / dt : 0
  state.velocity = velocity
  // The axle is the local X axis; the entrance heading points local +Z along world +X.
  // Integrating actual displacement keeps the tire still when the robot is still.
  p.wheel += distance / WHEEL_RADIUS
  p.yaw = damp(p.yaw, welcome && age < 1.5 ? Math.PI / 2 : 0, 6, dt)
  p.bounce = damp(p.bounce, happy ? Math.abs(Math.sin(age * 6)) * 0.065 * wave : 0, 13, dt)
  p.lean = damp(p.lean, Math.max(-0.1, Math.min(0.1, velocity * 0.025 + acceleration * 0.012)), 6, dt)
  p.balance = Math.sin(time * 1.3) * 0.012
  p.breath = Math.sin(time * 1.7) * 0.008
  p.headX = damp(p.headX, shy ? 0.09 : interested ? -0.07 : Math.sin(time * 0.7) * 0.025, 5, dt)
  p.headY = damp(p.headY, welcome && age < 1.5 ? -0.5 : interested ? 0.12 : Math.sin(time * 0.6) * 0.04, 5, dt)
  p.headZ = damp(p.headZ, shy ? -0.12 : interested ? 0.13 : 0.025 * Math.sin(time), 5, dt)
  p.shoulder = damp(p.shoulder, -0.14 - wave * (2.1 + Math.sin(waveAge * (happy ? 8 : 5)) * 0.16), 10, dt)
  p.elbow = damp(p.elbow, -0.12 - wave * (0.5 + Math.sin(waveAge * 6) * 0.16), 10, dt)
  const blinkTime = time % 4.9
  const blink = blinkTime > 4.5 && blinkTime < 4.7 ? 1 - 0.94 * Math.sin((blinkTime - 4.5) / 0.2 * Math.PI) : 1
  p.eye = damp(p.eye, blink * (happy ? 0.72 : interested ? 1.08 : 1), 38, dt)
  p.gazeX = damp(p.gazeX, interested ? 0.025 : shy ? -0.018 : 0, 6, dt)
  p.gazeY = damp(p.gazeY, shy ? -0.035 : interested ? 0.015 : 0, 6, dt)
  p.smile = damp(p.smile, happy ? 1.3 : shy ? 0.75 : 1, 6, dt)
  p.blush = damp(p.blush, shy ? 1.25 : happy ? 1.1 : 1, 6, dt)
  return p
}
