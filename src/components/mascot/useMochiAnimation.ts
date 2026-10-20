import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import type { Group } from 'three'
import { advanceMochiAnimation, createMochiAnimation } from './mochiAnimation'

export interface MochiBehavior {
  active: boolean
  curious: boolean
  request: number
  reducedMotion: boolean
}

export function useMochiAnimation({ active, curious, request, reducedMotion }: MochiBehavior) {
  const invalidate = useThree(state => state.invalidate)
  const root = useRef<Group>(null)
  const balance = useRef<Group>(null)
  const head = useRef<Group>(null)
  const wheel = useRef<Group>(null)
  const shoulder = useRef<Group>(null)
  const elbow = useRef<Group>(null)
  const eyes = useRef<Group>(null)
  const gaze = useRef<Group>(null)
  const mouth = useRef<Group>(null)
  const cheeks = useRef<Group>(null)
  const controller = useRef<ReturnType<typeof createMochiAnimation> | null>(null)

  // Hook-only input changes need an explicit frame when reduced motion uses demand mode.
  useEffect(() => {
    if (active) invalidate()
  }, [active, curious, request, reducedMotion, invalidate])

  useFrame((_, delta) => {
    if (!active || !root.current || !balance.current || !head.current || !wheel.current
      || !shoulder.current || !elbow.current || !eyes.current || !gaze.current
      || !mouth.current || !cheeks.current) return
    controller.current ??= createMochiAnimation()
    const pose = advanceMochiAnimation(controller.current, delta, curious, request, reducedMotion)
    root.current.position.set(pose.x, pose.bounce, 0)
    root.current.rotation.y = pose.yaw
    wheel.current.rotation.x = pose.wheel
    balance.current.rotation.set(pose.lean, 0, pose.balance)
    balance.current.position.y = 0.23 + pose.breath
    head.current.rotation.set(pose.headX, pose.headY, pose.headZ)
    shoulder.current.rotation.z = pose.shoulder
    elbow.current.rotation.z = pose.elbow
    eyes.current.scale.y = pose.eye
    gaze.current.position.set(pose.gazeX, pose.gazeY, 0)
    mouth.current.scale.set(pose.smile, pose.smile, 1)
    cheeks.current.scale.set(pose.blush, pose.blush, 1)
  })

  return { root, balance, head, wheel, shoulder, elbow, eyes, gaze, mouth, cheeks }
}
