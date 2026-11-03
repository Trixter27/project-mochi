import { useEffect, useRef, type RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Mesh, type Group, type Object3D } from 'three'
import { advanceMochiAnimation, createMochiAnimation, visibleEyeScale } from './mochiAnimation'
import { advanceMochiGaze, createGazeMotion, createGazeProjection, createGazeTarget, pointerCuriosity, projectMochiGaze, sampleMochiGaze, type MochiPointer } from './mochiGaze'

export interface MochiBehavior {
  active: boolean
  curious: boolean
  request: number
  reducedMotion: boolean
  pointer: RefObject<MochiPointer>
}

// Reuse mounted meshes/materials: only opacity changes, never geometry or React state.
function fadeFace(object: Object3D, opacity: number) {
  object.visible = opacity > 0.001
  if (object instanceof Mesh && !Array.isArray(object.material)) object.material.opacity = opacity
  for (const child of object.children) fadeFace(child, opacity)
}

export function useMochiAnimation({ active, curious, request, reducedMotion, pointer }: MochiBehavior) {
  const invalidate = useThree(state => state.invalidate)
  const root = useRef<Group>(null)
  const balance = useRef<Group>(null)
  const suspension = useRef<Group>(null)
  const torso = useRef<Group>(null)
  const head = useRef<Group>(null)
  const wheel = useRef<Group>(null)
  const shoulder = useRef<Group>(null)
  const elbow = useRef<Group>(null)
  const otherShoulder = useRef<Group>(null)
  const otherElbow = useRef<Group>(null)
  const antenna = useRef<Group>(null)
  const eyes = useRef<Group>(null)
  const happyEyes = useRef<Group>(null)
  const gaze = useRef<Group>(null)
  const mouth = useRef<Group>(null)
  const happyMouth = useRef<Group>(null)
  const cheeks = useRef<Group>(null)
  const controller = useRef<ReturnType<typeof createMochiAnimation> | null>(null)
  const wake = useRef(true)
  const trackingRef = useRef<{
    projection: ReturnType<typeof createGazeProjection>
    target: ReturnType<typeof createGazeTarget>
    motion: ReturnType<typeof createGazeMotion>
    curious: boolean
  } | null>(null)

  useEffect(() => {
    wake.current = true
    const tracking = trackingRef.current
    if (tracking && (!active || reducedMotion)) {
      advanceMochiGaze(tracking.motion, tracking.target, 0, 'idle', 0, true)
      tracking.curious = false
    }
  }, [active, reducedMotion])

  // Hook-only input changes need an explicit frame when reduced motion uses demand mode.
  useEffect(() => {
    if (active) invalidate()
  }, [active, curious, request, reducedMotion, invalidate])

  useFrame(({ camera, gl }, delta) => {
    if (!active || !root.current || !balance.current || !head.current || !wheel.current
      || !shoulder.current || !elbow.current || !eyes.current || !gaze.current
      || !suspension.current || !torso.current || !otherShoulder.current || !otherElbow.current || !antenna.current
      || !mouth.current || !cheeks.current || !happyEyes.current || !happyMouth.current) return
    controller.current ??= createMochiAnimation()
    const tracking = trackingRef.current ??= { projection: createGazeProjection(), target: createGazeTarget(), motion: createGazeMotion(), curious: false }
    const dt = wake.current ? 0 : delta
    tracking.curious = pointerCuriosity(tracking.motion.weight, tracking.curious, reducedMotion)
    const pose = advanceMochiAnimation(controller.current, dt, curious || tracking.curious, request, reducedMotion)
    wake.current = false
    root.current.position.set(pose.x, pose.bounce, 0)
    root.current.rotation.y = pose.yaw
    wheel.current.rotation.x = pose.wheel
    balance.current.rotation.set(pose.lean, 0, pose.balance)
    balance.current.position.y = 0.23
    suspension.current.position.y = pose.suspension + pose.breath
    torso.current.rotation.x = pose.torso
    head.current.position.y = 1.61 + pose.headBob
    head.current.rotation.set(pose.headX + tracking.motion.headX, pose.headY + tracking.motion.headY, pose.headZ)
    shoulder.current.rotation.set(pose.armSwing, 0, pose.shoulder)
    elbow.current.rotation.z = pose.elbow
    otherShoulder.current.rotation.set(pose.otherArmSwing, 0, pose.otherShoulder)
    otherElbow.current.rotation.z = pose.otherElbow
    antenna.current.rotation.z = -0.12 + pose.antenna
    tracking.target.x = tracking.target.y = tracking.target.weight = 0
    if (pointer.current.valid && !reducedMotion) {
      projectMochiGaze(tracking.projection, head.current, torso.current, camera, gl.domElement.getBoundingClientRect())
      sampleMochiGaze(tracking.target, pointer.current, tracking.projection)
    }
    advanceMochiGaze(tracking.motion, tracking.target, dt, controller.current.phase, pose.happyEyes, reducedMotion)
    head.current.rotation.set(pose.headX + tracking.motion.headX, pose.headY + tracking.motion.headY, pose.headZ)
    eyes.current.scale.y = visibleEyeScale(pose.eye, pose.happyEyes)
    fadeFace(eyes.current, 1 - pose.happyEyes)
    fadeFace(happyEyes.current, pose.happyEyes)
    // Fade pointer influence completely before the crescents close; the normal
    // shy/curious gaze remains owned by the expression controller.
    const trackingVisibility = Math.max(0, 1 - pose.happyEyes / 0.3)
    const weight = tracking.motion.weight * trackingVisibility
    gaze.current.position.set(
      pose.gazeX * (1 - weight) + tracking.motion.x * trackingVisibility,
      pose.gazeY * (1 - weight) + tracking.motion.y * trackingVisibility, 0,
    )
    const smileScale = 1 + (pose.smile - 1) * (1 - pose.happySmile)
    mouth.current.scale.set(smileScale, smileScale, 1)
    fadeFace(mouth.current, 1 - pose.happySmile)
    fadeFace(happyMouth.current, pose.happySmile)
    cheeks.current.scale.set(pose.blush, pose.blush, 1)
  })

  return { root, balance, suspension, torso, head, wheel, shoulder, elbow, otherShoulder, otherElbow, antenna, eyes, happyEyes, gaze, mouth, happyMouth, cheeks }
}
