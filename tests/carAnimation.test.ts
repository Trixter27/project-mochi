import test from 'node:test'
import assert from 'node:assert/strict'
import { PerspectiveCamera, Vector3 } from 'three'
import { CAR, CAR_WHEELS } from '../src/components/car/carConfig.ts'
import { advanceCar, createCarAnimation, DRIVE_END, ENTRANCE_END, PARK_FLASH_START, parkedPose, sampleDrivingMotion, sampleEntrance, sampleReaction, SMOKE_LIMIT, type CarInput } from '../src/components/car/carAnimation.ts'
import { approachForAspect, drivingPath, forwardTravel, wheelPoint, wheelRollDelta, wheelSteering } from '../src/components/car/carMotionMath.ts'

const active: CarInput = { visible: true, pageVisible: true, skipped: false, reduced: false, request: 0 }
const close = (a: number, b: number, tolerance = 1e-8) => assert.ok(Math.abs(a - b) < tolerance, `${a} != ${b}`)
function run(state = createCarAnimation(), seconds = ENTRANCE_END + 0.5, input = active, fps = 60) {
  for (let i = 0; i < seconds * fps; i++) advanceCar(state, 1 / fps, input)
  return state
}

test('entrance starts behind the platform and ends at the exact approved parked transform', () => {
  const start = sampleEntrance(0)
  assert.ok(start.z < -8 && start.x > 0)
  assert.deepEqual(sampleEntrance(ENTRANCE_END), parkedPose())
  const camera = new Vector3(4, 2.8, 5)
  assert.ok(camera.distanceTo(new Vector3(start.x, 0.6, start.z)) > camera.distanceTo(new Vector3(0, 0.6, 0)))
  // Positive camera-space horizontal direction puts this world-space start upper-right.
  assert.ok(start.x * 5 - start.z * 4 > 0)
})

test('wheel travel uses the signed longitudinal component and the actual axle-X convention', () => {
  close(forwardTravel(4, 0, 0), 0)
  close(forwardTravel(0, 2, 0), 2)
  close(forwardTravel(0, -2, 0), -2)
  close(forwardTravel(2, 0, Math.PI / 2), 2)
  for (const wheel of CAR_WHEELS) {
    const start = { x: 0, z: 0, heading: 0 }
    close(wheelRollDelta(start, { ...start, z: 1 }, wheel.side * CAR.track, CAR.wheelbase, 0, CAR.wheelRadius), 1 / CAR.wheelRadius)
    close(wheelRollDelta(start, { ...start, x: 1 }, wheel.side * CAR.track, CAR.wheelbase, 0, CAR.wheelRadius), 0)
  }
  const bottom = new Vector3(0, -CAR.wheelRadius, 0)
  assert.ok(new Vector3(1, 0, 0).cross(bottom).z < 0, 'positive X spin cancels forward +Z translation at contact')
})

test('entrance accelerates then brakes, and all wheel angles remain fixed after parking', () => {
  const a = sampleEntrance(0.1), b = sampleEntrance(0.2), c = sampleEntrance(1.3), d = sampleEntrance(1.4), e = sampleEntrance(DRIVE_END - 0.15), f = sampleEntrance(DRIVE_END - 0.05)
  const distance = (p: typeof a, q: typeof a) => Math.hypot(q.x - p.x, q.z - p.z)
  assert.ok(distance(c, d) > distance(a, b) * 2)
  assert.ok(distance(e, f) < distance(c, d) / 4)
  const driving = createCarAnimation()
  for (let i = 0; i < ENTRANCE_END * 120; i++) {
    const previous = [...driving.wheels]
    advanceCar(driving, 1 / 120, active)
    driving.wheels.forEach((angle, index) => assert.ok(angle >= previous[index] - 1e-9, 'no wheel reverses during this forward entrance'))
  }
  const state = run(), wheels = [...state.wheels]
  assert.ok(wheels.every(angle => angle > 25))
  assert.equal(advanceCar(state, 0.1, active), false)
  run(state, 2)
  assert.deepEqual(state.wheels, wheels)
})

test('front wheels steer into the right bend and countersteer during oversteer; rear wheels never steer', () => {
  assert.ok(drivingPath(0.35).direction > drivingPath(0.2).direction)
  assert.ok(sampleEntrance(1.3).steering > 0)
  assert.ok(sampleEntrance(2.05).steering < 0)
  for (let t = 0; t <= ENTRANCE_END; t += 0.02) {
    const pose = sampleEntrance(t)
    assert.ok(Math.abs(pose.steering) <= 25 * Math.PI / 180)
    for (const wheel of CAR_WHEELS) {
      const angle = wheelSteering(wheel.front, pose.steering, wheel.side, pose.ackermann)
      if (!wheel.front) assert.equal(angle, 0)
      else assert.ok(Math.abs(angle) <= 25 * Math.PI / 180)
    }
  }
})

test('drift has a meaningful heading offset, bounded chassis lean, and grounded axle height', () => {
  const p = sampleEntrance(2.35), before = sampleEntrance(2.349), after = sampleEntrance(2.351)
  const travelDirection = Math.atan2(after.x - before.x, after.z - before.z)
  const slip = p.heading - travelDirection
  assert.ok(slip > 25 * Math.PI / 180 && slip < 40 * Math.PI / 180)
  assert.ok(Math.hypot(after.x - before.x, after.z - before.z) / 0.002 > 3, 'drifting while still travelling, not turning in place')
  for (let t = 0; t <= ENTRANCE_END; t += 0.01) {
    const pose = sampleEntrance(t)
    assert.ok(Math.abs(pose.roll) < 0.04 && Math.abs(pose.pitch) < 0.03 && Math.abs(pose.lift) < 0.013)
    assert.ok(Math.abs(pose.heading) < Math.PI / 2)
    close(CAR.axleHeight - CAR.wheelRadius, CAR.platformTop)
  }
})

test('longer driving paths remain continuous and in frame with the unchanged camera', () => {
  // Wide desktop, laptop, intermediate layouts, and the inner stage on a 320px phone.
  for (const [width, height] of [[1100, 230], [920, 230], [850, 230], [680, 230], [600, 200], [340, 200], [256, 200]]) {
    const camera = new PerspectiveCamera(32, width / height, 0.1, 30)
    camera.position.set(4, 2.8, 5); camera.lookAt(0, 0.55, 0); camera.updateMatrixWorld()
    const approach = approachForAspect(width / height)
    let previous = sampleEntrance(0, approach)
    for (let t = 0; t <= ENTRANCE_END + 0.02; t += 0.02) {
      const pose = sampleEntrance(t, approach)
      const distance = Math.hypot(pose.x - previous.x, pose.z - previous.z)
      assert.ok(distance < 0.16, 'frame displacement stays below eight world units per second')
      assert.ok(Math.abs(pose.heading - previous.heading) < 0.1)
      for (const x of [-0.96, 0.96]) for (const y of [0, 1.24]) for (const z of [-1.7, 1.74]) {
        const point = wheelPoint(pose, x, z)
        const screen = new Vector3(point.x, y, point.z).project(camera)
        assert.ok(Math.abs(screen.x) < 1 && Math.abs(screen.y) < 1)
      }
      previous = pose
    }
    assert.deepEqual(previous, parkedPose())
  }
})

test('smoke is a bounded rear-contact pool, emitted only during slip, and expires in world space', () => {
  const state = createCarAnimation(), pool = state.smoke
  run(state, 1.8)
  assert.equal(state.cursor, 0)
  run(state, 0.4)
  assert.ok(state.cursor > 0)
  assert.equal(state.smoke, pool)
  assert.equal(pool.length, SMOKE_LIMIT)
  const puff = pool.find(item => item.opacity > 0)!, x = puff.x, z = puff.z
  advanceCar(state, 1 / 120, active)
  assert.ok(Math.hypot(puff.x - x, puff.z - z) < 0.01, 'existing puffs disperse independently, not with the car')
  run(state, 1.8)
  const emissions = state.cursor
  run(state, 2)
  assert.equal(state.cursor, emissions)
  assert.ok(pool.every(item => item.opacity === 0))
  assert.equal(advanceCar(state, 0.1, active), false)
})

test('rear-tire clouds begin at readable scale, hold opacity, expand, and leave a lingering trail', () => {
  const state = createCarAnimation()
  while (state.cursor === 0) advanceCar(state, 1 / 120, active)
  for (const [index, side] of [[0, -1], [1, 1]]) {
    const puff = state.smoke[index]
    const rear = wheelPoint(state.pose, side * (CAR.track + 0.12), -CAR.wheelbase - 0.12)
    close(puff.x, rear.x); close(puff.z, rear.z)
    assert.ok(puff.y - puff.scale >= CAR.platformTop)
    assert.equal(puff.opacity, 0.72)
    assert.equal(puff.scale, 0.19)
    assert.ok(puff.life >= 1)
  }
  const puff = state.smoke[0], emitted = { x: puff.x, z: puff.z }
  run(state, 0.25)
  assert.equal(puff.opacity, 0.72)
  assert.ok(puff.scale > 0.19)
  assert.ok(Math.hypot(puff.x - emitted.x, puff.z - emitted.z) < 0.1)
  assert.ok(state.smoke.filter(item => item.opacity > 0.5).length >= 6, 'overlapping emissions make a trail')
  run(state, 0.5)
  assert.ok(puff.opacity > 0 && puff.opacity < 0.72)
  run(state, 0.4)
  assert.equal(puff.opacity, 0)
})

test('drift and exhaust cloud bounds stay inside desktop and mobile camera frustums', () => {
  for (const [width, height] of [[1100, 230], [680, 230], [256, 200]]) {
    const camera = new PerspectiveCamera(32, width / height, 0.1, 30)
    camera.position.set(4, 2.8, 5); camera.lookAt(0, 0.55, 0); camera.updateMatrixWorld()
    const state = createCarAnimation(), input = { ...active, approach: approachForAspect(width / height) }
    for (let frame = 0; frame < (ENTRANCE_END + 2) * 60; frame++) {
      advanceCar(state, 1 / 60, { ...input, request: frame > (ENTRANCE_END + 0.1) * 60 ? 1 : 0 })
      for (const puff of state.smoke.filter(item => item.opacity > 0.02)) {
        for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) {
          const screen = new Vector3(puff.x + x * puff.scale, puff.y + y * puff.scale, puff.z + z * puff.scale).project(camera)
          assert.ok(Math.abs(screen.x) < 1 && Math.abs(screen.y) < 1)
        }
      }
    }
  }
})

test('preloading cannot start the entrance; re-entry cannot replay it', () => {
  const state = createCarAnimation()
  run(state, 2, { ...active, visible: false })
  assert.equal(state.phase, 'waiting')
  assert.equal(state.time, 0)
  run(state)
  run(state, 1, { ...active, visible: false })
  const wheels = [...state.wheels]
  run(state)
  assert.deepEqual(state.pose, parkedPose())
  assert.deepEqual(state.wheels, wheels)
})

test('hidden tabs, offscreen departure, and skipped activation resolve deterministically', () => {
  for (const interruption of [{ pageVisible: false }, { visible: false }, { visible: false, skipped: true }]) {
    const state = run(createCarAnimation(), 1.8)
    assert.equal(advanceCar(state, 0, { ...active, ...interruption }), false)
    assert.deepEqual(state.pose, parkedPose())
    assert.equal(state.phase, 'parked')
    assert.ok(state.smoke.every(item => item.opacity === 0))
    run(state, 1)
    assert.equal(state.phase, 'parked')
  }
  const skipped = createCarAnimation()
  advanceCar(skipped, 0, { ...active, visible: false, skipped: true })
  run(skipped, 0.1, { ...active, skipped: true, request: 1 })
  assert.equal(skipped.phase, 'reaction', 'a skipped entrance must not disable later interaction')
})

test('reduced motion parks immediately, clears active drift, and permits only a restrained light response', () => {
  for (const state of [createCarAnimation(), run(createCarAnimation(), 1.8)]) {
    advanceCar(state, 0, { ...active, reduced: true })
    assert.deepEqual(state.pose, parkedPose())
    assert.ok(state.smoke.every(item => item.opacity === 0))
    run(state, 0.4, { ...active, reduced: true, request: 1 })
    assert.equal(state.pose.steering, 0); assert.equal(state.pose.roll, 0)
    assert.ok(state.pose.light > 0.25 && state.pose.light <= 0.4)
    run(state, 1, { ...active, reduced: true, request: 1 })
    assert.deepEqual(state.pose, parkedPose())
  }
})

test('two automated headlight flashes follow parking, and reaction returns without replay or wheel spin', () => {
  let pulses = 0, lit = false
  for (let t = 3.8; t <= ENTRANCE_END; t += 0.005) {
    const next = sampleEntrance(t).light > 0.26
    if (next && !lit) pulses++
    lit = next
  }
  assert.equal(pulses, 2)
  close(sampleEntrance(PARK_FLASH_START + 0.11).light, 1.5)
  close(sampleEntrance(PARK_FLASH_START + 0.42).light, 1.5)
  close(sampleEntrance(PARK_FLASH_START + 0.27).light, 0.25)
  const state = run(), wheels = [...state.wheels]
  run(state, 0.3, { ...active, request: 1 })
  assert.equal(state.phase, 'reaction')
  run(state, 0.8, { ...active, request: 30 })
  assert.equal(state.phase, 'parked')
  assert.deepEqual(state.wheels, wheels)
  assert.deepEqual(state.pose, parkedPose())
  assert.deepEqual(sampleReaction(1, false), parkedPose())
})

test('wheel integration is consistent across common frame rates', () => {
  const a = run(createCarAnimation(), 6, active, 30), b = run(createCarAnimation(), 6, active, 144)
  a.wheels.forEach((angle, index) => close(angle, b.wheels[index], 0.003))
  assert.deepEqual(a.pose, b.pose)
})

test('explicit replay resets the existing pool once; hidden and reduced-motion replay requests are consumed', () => {
  const state = run(), pool = state.smoke
  advanceCar(state, 0, { ...active, replay: 1, approach: 0, skipped: true })
  assert.equal(state.phase, 'entrance')
  assert.equal(state.time, 0)
  assert.equal(state.smoke, pool)
  assert.deepEqual(state.wheels, [0, 0, 0, 0])
  assert.deepEqual(state.pose, sampleEntrance(0, 0))
  run(state, 0.5, { ...active, replay: 1, approach: 1 })
  assert.ok(state.time > 0.49)
  assert.equal(state.approach, 0, 'a live resize cannot teleport the car onto another lane')
  run(state, 5, { ...active, replay: 1 })
  assert.equal(state.phase, 'parked')
  for (const interruption of [{ reduced: true }, { pageVisible: false }, { visible: false }]) {
    const parked = run()
    advanceCar(parked, 0, { ...active, ...interruption, replay: 1 })
    run(parked, 1, { ...active, replay: 1 })
    assert.deepEqual(parked.pose, parkedPose())
  }
})

test('approved 0.95-second click wiggle and both front wheel angles are preserved', () => {
  for (let time = 0; time < 0.95; time += 0.01) {
    const pose = sampleReaction(time, false), u = time / 0.95, envelope = Math.sin(Math.PI * u) ** 2
    close(pose.roll, 0.035 * Math.sin(4 * Math.PI * u) * envelope)
    close(pose.steering, 0.25 * Math.sin(2 * Math.PI * u))
    for (const side of [-1, 1]) close(wheelSteering(true, pose.steering, side, pose.ackermann), 0.25 * Math.sin(2 * Math.PI * u))
    close(pose.x, 0); close(pose.z, 0)
  }
  assert.deepEqual(sampleReaction(0.95, false), parkedPose())
})

test('projected travel grows over the V2 baseline, without merely extending distant world coordinates', () => {
  // Capture V2's centerline as a regression baseline, independent of the V3 sampler.
  function v2Position(u: number, aspect: number) {
    const lane = Math.max(0, Math.min(1, (aspect - 1.75) / 1.75)), v = 1 - u
    return { x: (-3 + 6 * lane) * v ** 3 - 15 * v * v * u, z: -8.5 * v ** 3 - 18 * v * v * u - 10.5 * v * u * u }
  }
  for (const [width, height, minimumGain] of [[1100, 230, 1.25], [850, 230, 1.2], [680, 230, 1.1], [256, 200, 0.95]]) {
    const camera = new PerspectiveCamera(32, width / height, 0.1, 30)
    camera.position.set(4, 2.8, 5); camera.lookAt(0, 0.55, 0); camera.updateMatrixWorld()
    const measure = (sample: (u: number) => { x: number; z: number }) => {
      let world = 0, pixels = 0, previous = sample(0)
      const project = (p: { x: number; z: number }) => {
        const screen = new Vector3(p.x, 0.5, p.z).project(camera)
        return { x: screen.x * width / 2, y: screen.y * height / 2 }
      }
      let previousScreen = project(previous)
      for (let i = 1; i <= 1000; i++) {
        const point = sample(i / 1000), screen = project(point)
        world += Math.hypot(point.x - previous.x, point.z - previous.z)
        pixels += Math.hypot(screen.x - previousScreen.x, screen.y - previousScreen.y)
        previous = point; previousScreen = screen
      }
      return { world, pixels }
    }
    const old = measure(u => v2Position(u, width / height))
    const next = measure(u => sampleEntrance(u * DRIVE_END, approachForAspect(width / height)))
    assert.ok(next.pixels > old.pixels * minimumGain, `${width}px stage: ${next.pixels} vs ${old.pixels}`)
    if (width === 1100) {
      assert.ok(next.pixels < old.pixels * 1.4)
      assert.ok(next.world > old.world * 1.25)
    }
  }
})

test('position, velocity, yaw and steering stay continuous through every driving phase', () => {
  const epsilon = 0.0001
  for (const approach of [0, 0.5, 1]) {
    for (const t of [0.7, 1.5, 1.75, 1.9, 2.15, 2.35, 2.4, 2.9, 3.5, 3.95, 4.05, 4.45, 4.5, DRIVE_END, 4.85, ENTRANCE_END]) {
      const before = sampleEntrance(t - epsilon, approach), center = sampleEntrance(t, approach), after = sampleEntrance(t + epsilon, approach)
      for (const key of ['x', 'z', 'heading', 'steering'] as const) {
        assert.ok(Math.abs(after[key] - before[key]) < 0.002)
        const leftVelocity = (center[key] - before[key]) / epsilon, rightVelocity = (after[key] - center[key]) / epsilon
        close(leftVelocity, rightVelocity, 0.03)
      }
    }
  }
})

test('turn-in uses subtle Ackermann, the front axle leads the rear swing, and countersteer sustains the drift', () => {
  const turn = sampleEntrance(1.5)
  const inner = wheelSteering(true, turn.steering, 1, turn.ackermann), outer = wheelSteering(true, turn.steering, -1, turn.ackermann)
  assert.ok(inner > outer && outer > 0 && inner - outer < 0.06)
  close(sampleEntrance(0).steering, 0)
  for (const approach of [0, 1]) {
    for (const t of [2.4, 2.6, 2.85]) {
      const pose = sampleEntrance(t, approach), motion = sampleDrivingMotion(t, approach)
      const front = wheelPoint(pose, 0, CAR.wheelbase)
      const nominal = { ...motion.path, heading: motion.path.direction }
      const laneFront = wheelPoint(nominal, 0, CAR.wheelbase), laneRear = wheelPoint(nominal, 0, -CAR.wheelbase)
      const rear = wheelPoint(pose, 0, -CAR.wheelbase)
      close(front.x, laneFront.x); close(front.z, laneFront.z)
      assert.ok(Math.hypot(rear.x - laneRear.x, rear.z - laneRear.z) > 1, 'rear swings beyond the reference lane')
      const before = sampleEntrance(t - 0.001, approach), after = sampleEntrance(t + 0.001, approach)
      const direction = Math.atan2(after.x - before.x, after.z - before.z)
      const angle = (pose.heading - direction) * 180 / Math.PI
      assert.ok(angle > 30 && angle < 40)
      assert.ok(Math.hypot(after.x - before.x, after.z - before.z) / 0.002 > 1)
      assert.ok(pose.steering < -0.4)
    }
  }
  const recovering = sampleEntrance(4.05), almostParked = sampleEntrance(4.4)
  assert.equal(sampleDrivingMotion(4.05).slipAngle, 0)
  assert.ok(Math.abs(recovering.steering) < 0.09)
  assert.ok(Math.abs(almostParked.steering) < Math.abs(recovering.steering))
  close(sampleEntrance(DRIVE_END).steering, 0)
})

test('every tire emission happens during traction loss and never during stationary click revs', () => {
  const state = createCarAnimation()
  for (let frame = 0; frame < ENTRANCE_END * 120; frame++) {
    const count = state.cursor
    advanceCar(state, 1 / 120, active)
    if (state.cursor !== count) {
      assert.ok(state.pose.smoke && sampleDrivingMotion(state.time).slipAngle > 0.2)
      assert.equal(state.cursor - count, 2)
      for (let i = count; i < state.cursor; i++) assert.equal(state.smoke[i % SMOKE_LIMIT].kind, 'tire')
    }
  }
})

test('click rev emits exactly three rear-exhaust puffs, retains world positions and renders until expiry', () => {
  const state = run(), pool = state.smoke, wheels = [...state.wheels], start = state.cursor
  const input = { ...active, request: 1 }
  run(state, 0.1, input)
  assert.equal(state.cursor, start)
  while (state.cursor === start) advanceCar(state, 1 / 120, input)
  const puff = pool[start % SMOKE_LIMIT]
  assert.equal(puff.kind, 'exhaust')
  close(puff.x, 0.65); close(puff.z, -1.85)
  assert.ok(puff.y > CAR.platformTop + puff.scale && puff.opacity > 0.5)
  const emitted = { x: puff.x, y: puff.y, z: puff.z }, initialScale = puff.scale
  run(state, 0.15, input)
  assert.ok(puff.z < emitted.z && puff.y > emitted.y && puff.scale > initialScale)
  close(puff.x, emitted.x + puff.vx * puff.age)
  close(puff.z, emitted.z + puff.vz * puff.age)
  run(state, 0.35, { ...input, request: 20 }) // Busy activations cannot queue more puffs.
  assert.equal(state.cursor - start, 3)
  while (state.phase === 'reaction') advanceCar(state, 1 / 120, { ...input, request: 20 })
  assert.deepEqual(state.pose, parkedPose())
  assert.deepEqual(state.wheels, wheels)
  assert.equal(advanceCar(state, 0, { ...input, request: 20 }), true, 'smoke outlives the jiggle and keeps demand frames alive')
  run(state, 0.5, { ...input, request: 20 })
  assert.equal(state.smoke, pool)
  assert.ok(pool.every(item => item.opacity === 0))
  assert.equal(state.cursor - start, 3)
  assert.equal(advanceCar(state, 0, { ...input, request: 20 }), false)
})

test('repeated revs recycle the fixed pool and visibility or reduced-motion changes clear exhaust', () => {
  const state = run(), pool = state.smoke, count = state.cursor
  for (let request = 1; request <= 12; request++) {
    run(state, 1, { ...active, request })
    assert.deepEqual(state.pose, parkedPose())
    assert.equal(state.cursor, count + request * 3)
    assert.equal(state.smoke, pool)
    assert.ok(pool.filter(puff => puff.opacity > 0).length <= 3)
  }
  for (const interruption of [{ reduced: true }, { visible: false }, { pageVisible: false }]) {
    const rev = run()
    run(rev, 0.35, { ...active, request: 1 })
    assert.ok(rev.smoke.some(puff => puff.kind === 'exhaust' && puff.opacity > 0))
    advanceCar(rev, 0, { ...active, request: 1, ...interruption })
    assert.ok(rev.smoke.every(puff => puff.opacity === 0))
    run(rev, 1, { ...active, request: 1, ...interruption })
    assert.deepEqual(rev.pose, parkedPose())
  }
  const reduced = createCarAnimation()
  run(reduced, 1, { ...active, reduced: true, request: 1 })
  assert.equal(reduced.cursor, 0)
})
