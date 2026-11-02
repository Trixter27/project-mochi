export const CAR = { wheelRadius: 0.32, axleHeight: 0.34, track: 0.8, wheelbase: 0.96, leanHeight: 0.55, platformTop: 0.02, archRadius: 0.38 } as const
export const CAR_WHEELS = [
  { name: 'front-left', side: -1, front: true },
  { name: 'front-right', side: 1, front: true },
  { name: 'rear-left', side: -1, front: false },
  { name: 'rear-right', side: 1, front: false },
] as const
export function wheelPosition(wheel: typeof CAR_WHEELS[number]): [number, number, number] {
  return [wheel.side * CAR.track, CAR.axleHeight, wheel.front ? CAR.wheelbase : -CAR.wheelbase]
}
