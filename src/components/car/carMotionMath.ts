import { CAR } from './carConfig.ts'

export const clamp01 = (value: number) => Math.max(0, Math.min(1, value))
export const smooth = (value: number) => { const t = clamp01(value); return t * t * (3 - 2 * t) }
export function pulse(time: number, start: number, peak: number, end: number) {
  return time < peak ? smooth((time - start) / (peak - start)) : 1 - smooth((time - peak) / (end - peak))
}
export type PlanarPose = { x: number; z: number; heading: number }

// Positive yaw turns +Z toward +X. Positive axle-X rotation rolls forward +Z.
export function forwardTravel(dx: number, dz: number, heading: number) {
  return dx * Math.sin(heading) + dz * Math.cos(heading)
}
export function wheelPoint(pose: PlanarPose, side: number, axle: number) {
  return { x: pose.x + side * Math.cos(pose.heading) + axle * Math.sin(pose.heading), z: pose.z - side * Math.sin(pose.heading) + axle * Math.cos(pose.heading) }
}
export function wheelRollDelta(previous: PlanarPose, next: PlanarPose, side: number, axle: number, steering: number, radius: number) {
  const a = wheelPoint(previous, side, axle), b = wheelPoint(next, side, axle)
  return forwardTravel(b.x - a.x, b.z - a.z, (previous.heading + next.heading) / 2 + steering) / radius
}
export function wheelSteering(front: boolean, steering: number, side = 0, ackermann = 0) {
  if (!front) return 0
  // A small inner/outer difference in gripped corners; fade it out during a slide.
  const tangent = Math.tan(steering)
  const innerOuter = Math.atan(tangent / (1 - side * CAR.track / (2 * CAR.wheelbase) * tangent))
  return steering + clamp01(ackermann) * (innerOuter - steering)
}

// Narrow stages move the distant starting lane inward, without changing the camera
// or the final approach. Select this once at entrance start to avoid resize jumps.
export const approachForAspect = (aspect: number) => clamp01((aspect - 1.75) / 2.25)

// A broad sweep from camera-right/back meets the platform along its original +Z heading.
export function drivingPath(progress: number, approach = 1) {
  const u = clamp01(progress), v = 1 - u
  const lane = clamp01(approach), startX = -3 + 7.6 * lane, startZ = -8.5 - 2 * lane
  const bendX = -5 - 4 * lane, bendZ = -6 + 0.5 * lane, finalZ = -3.5
  const x = startX * v ** 3 + bendX * 3 * v * v * u
  const z = startZ * v ** 3 + bendZ * 3 * v * v * u + finalZ * 3 * v * u * u
  const dx = 3 * ((bendX - startX) * v * v - 2 * bendX * v * u)
  const dz = 3 * ((bendZ - startZ) * v * v + 2 * (finalZ - bendZ) * v * u - finalZ * u * u)
  return { x, z, direction: Math.atan2(dx, dz) }
}
