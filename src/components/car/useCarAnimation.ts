import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Box3, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, Vector3 } from 'three'
import { advanceCar, createCarAnimation, type CarInput } from './carAnimation'
import { CAR, CAR_WHEELS } from './carConfig'
import { approachForAspect, wheelSteering } from './carMotionMath'
import { createHeadlightGlows } from './carHeadlights'

export type CarBounds = { left: number; top: number; width: number; height: number }
export type CarPresentation = { parked: boolean; reacting: boolean; bounds: CarBounds }
type Bindings = { vehicle: Group; chassis: Group; steering: Group[]; wheels: Group[]; lights: MeshStandardMaterial[]; puffs: Mesh[]; shadow: Group; glows: ReturnType<typeof createHeadlightGlows> }

export function useCarAnimation(input: CarInput, onPresentation: (value: CarPresentation) => void) {
  const root = useRef<Group>(null)
  const controller = useRef(createCarAnimation())
  const bindings = useRef<Bindings | null>(null)
  const { invalidate, camera, size } = useThree()
  const wake = useRef(true)
  const reported = useRef('')
  const bounds = useRef<CarBounds>({ left: 0, top: 0, width: 0, height: 0 })
  const approach = approachForAspect(size.width / size.height)
  const animationInput = useMemo(() => ({ ...input, approach }), [input, approach])

  useLayoutEffect(() => {
    const scene = root.current
    if (!scene) return
    const vehicle = scene.getObjectByName('car-vehicle-pivot') as Group
    // Measure before attaching decorative halos; keep the approved interaction area.
    vehicle.updateWorldMatrix(true, true)
    vehicle.userData.parkedBox = new Box3().setFromObject(vehicle)
    const lenses = [-1, 1].map(side => scene.getObjectByName(`headlight-lens-${side}`) as Mesh)
    const glows = createHeadlightGlows(lenses)
    bindings.current = {
      vehicle, chassis: scene.getObjectByName('car-chassis-lean-pivot') as Group,
      steering: CAR_WHEELS.map(wheel => scene.getObjectByName(`car-${wheel.name}-steering`) as Group),
      wheels: CAR_WHEELS.map(wheel => scene.getObjectByName(`car-${wheel.name}-roll`) as Group),
      lights: lenses.map(lens => lens.material as MeshStandardMaterial), glows,
      puffs: controller.current.smoke.map((_, index) => scene.getObjectByName(`car-puff-${index}`) as Mesh),
      shadow: scene.getObjectByName('car-ground-shadow') as Group,
    }
    return () => { glows.dispose(); bindings.current = null }
  }, [])

  useEffect(() => {
    const box = bindings.current?.vehicle.userData.parkedBox as Box3 | undefined
    if (!box) return
    camera.updateMatrixWorld()
    let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity
    for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
      const point = new Vector3(x, y, z).project(camera)
      const px = (point.x + 1) * size.width / 2, py = (1 - point.y) * size.height / 2
      left = Math.min(left, px); right = Math.max(right, px); top = Math.min(top, py); bottom = Math.max(bottom, py)
    }
    bounds.current = { left, top, width: right - left, height: bottom - top }
    reported.current = ''; wake.current = true; invalidate()
  }, [camera, size.width, size.height, invalidate])

  useEffect(() => {
    // Seed the lifecycle without consuming wall time accumulated while demand-rendered.
    advanceCar(controller.current, 0, animationInput)
    wake.current = true; invalidate()
  }, [animationInput, invalidate])

  useFrame((_, delta) => {
    const rig = bindings.current
    if (!rig) return
    const running = advanceCar(controller.current, wake.current ? 0 : delta, animationInput)
    wake.current = false
    const state = controller.current, pose = state.pose
    rig.vehicle.position.set(pose.x, 0, pose.z)
    rig.vehicle.rotation.y = pose.heading
    rig.chassis.position.y = CAR.leanHeight + pose.lift
    rig.chassis.rotation.set(pose.pitch, 0, pose.roll)
    rig.shadow.position.set(pose.x, 0, pose.z); rig.shadow.rotation.y = pose.heading
    CAR_WHEELS.forEach((wheel, index) => {
      rig.steering[index].rotation.y = wheelSteering(wheel.front, pose.steering, wheel.side, pose.ackermann)
      rig.wheels[index].rotation.x = state.wheels[index]
    })
    rig.lights.forEach(material => { material.emissiveIntensity = pose.light })
    rig.glows.update(pose.light)
    state.smoke.forEach((puff, index) => {
      const mesh = rig.puffs[index]
      mesh.visible = puff.opacity > 0
      if (!mesh.visible) return
      mesh.position.set(puff.x, puff.y, puff.z); mesh.scale.setScalar(puff.scale)
      ;(mesh.material as MeshBasicMaterial).opacity = puff.opacity
    })
    if (reported.current !== state.phase) {
      reported.current = state.phase
      onPresentation({ parked: state.phase === 'parked', reacting: state.phase === 'reaction', bounds: bounds.current })
    }
    if (running) invalidate()
  })
  return root
}
