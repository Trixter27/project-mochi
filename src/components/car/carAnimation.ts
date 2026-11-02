import { CAR, CAR_WHEELS } from './carConfig.ts'
import { clamp01, drivingPath, pulse, smooth, wheelPoint, wheelRollDelta, wheelSteering } from './carMotionMath.ts'
import { sampleHeadlightFlash } from './carHeadlights.ts'

export const DRIVE_END = 4.55, PARK_FLASH_START = 4.6, ENTRANCE_END = 5.25, REACTION_END = 0.95, SMOKE_LIMIT = 24
const REV_PUFF_TIMES = [0.12, 0.3, 0.48] as const
export type CarPose = { x: number; z: number; heading: number; steering: number; ackermann: number; roll: number; pitch: number; lift: number; light: number; smoke: boolean }
export function parkedPose(): CarPose { return { x: 0, z: 0, heading: 0, steering: 0, ackermann: 0, roll: 0, pitch: 0, lift: 0, light: 0.25, smoke: false } }

export function sampleDrivingMotion(time: number, approach = 1) {
  const t = Math.max(0, time), u = clamp01(t / DRIVE_END)
  const progress = u ** 3 * (10 - 15 * u + 6 * u * u)
  const path = drivingPath(progress, approach)
  // Break traction, sustain the slide, then regain grip before braking completes.
  const slide = smooth((t - 1.75) / 0.6) * (1 - smooth((t - 2.9) / 1.05))
  const slipAngle = 0.61 * slide, heading = path.direction + slipAngle
  const turnIn = pulse(t, 0.7, 1.5, 2.15)
  return {
    path, slipAngle, slide, turnIn, heading,
    // Anchor the front axle to the tangent's lane. Yaw sends the rear outward
    // rather than rotating the whole car in place around its center.
    x: path.x + CAR.wheelbase * (Math.sin(path.direction) - Math.sin(heading)),
    z: path.z + CAR.wheelbase * (Math.cos(path.direction) - Math.cos(heading)),
    steering: 0.3 * turnIn - 0.42 * smooth((t - 1.9) / 0.5) * (1 - smooth((t - 2.9) / 1.05))
      - 0.08 * pulse(t, 3.5, 4.05, 4.5),
  }
}

export function sampleEntrance(time: number, approach = 1): CarPose {
  if (time >= ENTRANCE_END) return parkedPose()
  const t = Math.max(0, time), motion = sampleDrivingMotion(t, approach)
  const settle = t >= 4.45 && t < 4.85 ? Math.sin((t - 4.45) / 0.4 * Math.PI * 2) * Math.sin((t - 4.45) / 0.4 * Math.PI) : 0
  return {
    x: motion.x, z: motion.z, heading: motion.heading, steering: motion.steering,
    ackermann: 0.6 * (1 - motion.slide) * pulse(t, 0.4, 1.5, DRIVE_END),
    roll: -0.012 * motion.turnIn - 0.023 * motion.slide,
    pitch: -0.018 * pulse(t, 0.35, 1.2, 1.85) + 0.025 * pulse(t, 3.15, 4, DRIVE_END),
    lift: 0.012 * settle,
    light: sampleHeadlightFlash(t - PARK_FLASH_START),
    smoke: motion.slipAngle > 0.2,
  }
}
export function sampleReaction(time: number, reduced: boolean): CarPose {
  if (time <= 0 || time >= REACTION_END) return parkedPose()
  const pose = parkedPose(), u = clamp01(time / REACTION_END), envelope = Math.sin(Math.PI * u) ** 2
  if (!reduced) {
    pose.roll = 0.035 * Math.sin(4 * Math.PI * u) * envelope
    pose.steering = 0.25 * Math.sin(2 * Math.PI * u)
  }
  pose.light = sampleHeadlightFlash(time, reduced)
  return pose
}
export type Puff = { kind: 'tire' | 'exhaust'; age: number; life: number; x: number; y: number; z: number; vx: number; vz: number; scale: number; opacity: number }
export function createCarAnimation() {
  return {
    phase: 'waiting' as 'waiting' | 'entrance' | 'parked' | 'reaction', time: 0, request: 0, replay: 0, approach: 1,
    pose: sampleEntrance(0), wheels: [0, 0, 0, 0], emission: 0, cursor: 0, revPuffs: 0,
    smoke: Array.from({ length: SMOKE_LIMIT }, (): Puff => ({ kind: 'tire', age: 1, life: 0.65, x: 0, y: 0, z: 0, vx: 0, vz: 0, scale: 0, opacity: 0 })),
  }
}
export type CarAnimation = ReturnType<typeof createCarAnimation>
export type CarInput = { visible: boolean; pageVisible: boolean; skipped: boolean; reduced: boolean; request: number; approach?: number; replay?: number }

function finish(state: CarAnimation) {
  state.phase = 'parked'; state.time = 0; state.pose = parkedPose()
  state.smoke.forEach(puff => { puff.age = puff.life; puff.opacity = 0 })
}
function tickSmoke(state: CarAnimation, dt: number, reduced: boolean) {
  for (const puff of state.smoke) {
    if (reduced) puff.age = puff.life
    puff.age += dt
    const u = clamp01(puff.age / puff.life)
    const exhaust = puff.kind === 'exhaust'
    puff.x += puff.vx * dt; puff.z += puff.vz * dt; puff.y += dt * (exhaust ? 0.24 : 0.16)
    puff.scale = exhaust ? 0.18 + 0.18 * smooth(u) : 0.19 + 0.23 * smooth(u)
    // Hold the initial cloud, then fade gently instead of disappearing at emission.
    puff.opacity = 0.72 * (1 - smooth((u - 0.3) / 0.7))
  }
  if (reduced) return
  // Three timed rev puffs use the same fixed pool, but leave from the rear bumper,
  // not the tire contact patches. Busy clicks never queue another burst.
  while (state.phase === 'reaction' && state.revPuffs < REV_PUFF_TIMES.length && state.time >= REV_PUFF_TIMES[state.revPuffs]) {
    const puff = state.smoke[state.cursor++ % SMOKE_LIMIT]
    const point = wheelPoint(state.pose, 0.65, -1.85), heading = state.pose.heading
    Object.assign(puff, { kind: 'exhaust', age: 0, life: 0.85, x: point.x, y: 0.38, z: point.z,
      vx: 0.12 * Math.cos(heading) - 0.65 * Math.sin(heading),
      vz: -0.12 * Math.sin(heading) - 0.65 * Math.cos(heading), scale: 0.18, opacity: 0.72 })
    state.revPuffs++
  }
  if (!state.pose.smoke) return
  state.emission += dt
  if (state.emission < 0.1) return
  state.emission %= 0.1
  for (const side of [-1, 1]) {
    const index = state.cursor++ % SMOKE_LIMIT, puff = state.smoke[index]
    const point = wheelPoint(state.pose, side * (CAR.track + 0.12), -CAR.wheelbase - 0.12)
    const heading = state.pose.heading
    Object.assign(puff, { kind: 'tire', age: 0, life: 1.05 + index % 3 * 0.06, x: point.x, y: CAR.platformTop + 0.21, z: point.z,
      vx: side * 0.22 * Math.cos(heading) - 0.12 * Math.sin(heading),
      vz: -side * 0.22 * Math.sin(heading) - 0.12 * Math.cos(heading), scale: 0.19, opacity: 0.72 })
  }
}

/** Mutates a fixed-size controller. No React updates or mesh creation per frame. */
export function advanceCar(state: CarAnimation, dt: number, input: CarInput) {
  const replayed = (input.replay ?? 0) !== state.replay && input.visible && input.pageVisible && !input.reduced
  state.replay = input.replay ?? 0
  if (replayed) {
    finish(state)
    state.phase = 'waiting'; state.emission = 0; state.cursor = 0; state.wheels.fill(0)
  }
  const clicked = input.request !== state.request
  state.request = input.request // Busy clicks are consumed, never queued.
  if ((input.skipped || input.reduced) && state.phase === 'waiting' && !replayed) finish(state)
  if (!input.visible || !input.pageVisible) {
    if (state.phase !== 'waiting') finish(state)
    return false
  }
  if (input.reduced && state.phase !== 'parked' && state.phase !== 'reaction') finish(state)
  if (state.phase === 'waiting') {
    state.phase = 'entrance'; state.time = 0; state.approach = input.approach ?? 1
    state.pose = sampleEntrance(0, state.approach)
  }
  if (clicked && state.phase === 'parked') { state.phase = 'reaction'; state.time = 0; state.revPuffs = 0 }
  // A long browser stall is bounded; visibility changes explicitly settle offscreen.
  let remaining = Math.max(0, Math.min(dt, 0.1))
  do {
    const step = Math.min(remaining, 1 / 120)
    const previous = state.pose
    if (state.phase === 'entrance') {
      state.time = Math.min(state.time + step, ENTRANCE_END)
      state.pose = sampleEntrance(state.time, state.approach)
      CAR_WHEELS.forEach((wheel, index) => {
        state.wheels[index] += wheelRollDelta(previous, state.pose, wheel.side * CAR.track, wheel.front ? CAR.wheelbase : -CAR.wheelbase,
          (wheelSteering(wheel.front, previous.steering, wheel.side, previous.ackermann)
            + wheelSteering(wheel.front, state.pose.steering, wheel.side, state.pose.ackermann)) / 2, CAR.wheelRadius)
      })
      if (state.time >= ENTRANCE_END) { state.phase = 'parked'; state.pose = parkedPose() }
    } else if (state.phase === 'reaction') {
      state.time += step; state.pose = sampleReaction(state.time, input.reduced)
      if (state.time >= REACTION_END) { state.phase = 'parked'; state.pose = parkedPose() }
    }
    tickSmoke(state, step, input.reduced)
    remaining -= step
  } while (remaining > 1e-9)
  return state.phase === 'entrance' || state.phase === 'reaction' || state.smoke.some(puff => puff.opacity > 0)
}
