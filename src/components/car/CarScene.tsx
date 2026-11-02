import { useCallback, useEffect, useState } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import DriftingCar from './DriftingCar'
import { CarBoundary, CarFallback } from './CarFallback'
import { CarSmoke } from './CarSmoke'
import { useCarAnimation, type CarPresentation } from './useCarAnimation'
import type { CarInput } from './carAnimation'

function AnimatedCar({ input, onPresentation }: { input: CarInput; onPresentation: (value: CarPresentation) => void }) {
  const root = useCarAnimation(input, onPresentation)
  return <group ref={root}>
    <group name="car-ground-shadow">
      {[0.1, 0.06].map((opacity, index) => <mesh key={opacity} position={[0, 0.024 + index * 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[0.84 + index * 0.14, 1.5 + index * 0.12, 1]}>
        <circleGeometry args={[1, 32]} /><meshBasicMaterial color="#3D3B4E" transparent opacity={opacity} depthWrite={false} />
      </mesh>)}
    </group>
    <DriftingCar />
    <CarSmoke />
  </group>
}

function ContextGuard({ onFailure }: { onFailure: () => void }) {
  const gl = useThree(state => state.gl)
  useEffect(() => {
    const lost = (event: Event) => {
      event.preventDefault()
      if (import.meta.env.DEV) console.warn('[Car] WebGL context lost')
      onFailure()
    }
    gl.domElement.addEventListener('webglcontextlost', lost)
    return () => gl.domElement.removeEventListener('webglcontextlost', lost)
  }, [gl, onFailure])
  return null
}

export default function CarScene(props: Omit<CarInput, 'request' | 'replay' | 'approach'>) {
  const [failed, setFailed] = useState(false)
  const [request, setRequest] = useState(0)
  const [replay, setReplay] = useState(0)
  const debug = import.meta.env.DEV && new URLSearchParams(window.location.search).get('carDebug') === '1'
  const [presentation, setPresentation] = useState<CarPresentation | null>(null)
  const onFailure = useCallback(() => setFailed(true), [])
  const onPresentation = useCallback((value: CarPresentation) => setPresentation(value), [])
  if (failed) return <CarFallback />
  return <><CarBoundary onFailure={onFailure}><Canvas
    camera={{ position: [4, 2.8, 5], fov: 32, near: 0.1, far: 30 }}
    dpr={[1, 1.5]}
    frameloop="demand"
    gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }}
    // Canvas HTML fallback may mount with working WebGL: it has no failure callback.
    fallback={<CarFallback />}
    onCreated={({ camera, gl }) => {
      camera.lookAt(0, 0.55, 0)
      gl.setClearColor(0x000000, 0)
      if (import.meta.env.DEV) console.info('[Car] Canvas initialized')
    }}
    style={{ pointerEvents: 'none' }}
    aria-hidden="true"
  >
    <ambientLight intensity={1.5} />
    <directionalLight position={[-3, 6, 5]} intensity={2.4} />
    <directionalLight position={[4, 3, -3]} intensity={0.8} color="#DCCBF5" />
    <mesh position={[0, -0.04, 0]} scale={[1.05, 1, 0.85]}>
      <cylinderGeometry args={[2.35, 2.4, 0.12, 48]} />
      <meshStandardMaterial color="#DCCBF5" roughness={1} />
    </mesh>
    <AnimatedCar input={{ ...props, request, replay }} onPresentation={onPresentation} />
    <ContextGuard onFailure={onFailure} />
  </Canvas></CarBoundary>
    {debug && <button type="button" className="car-debug-replay" disabled={!props.visible || !props.pageVisible || props.reduced}
      onClick={() => setReplay(value => value + 1)}>Replay car entrance</button>}
    {presentation && <button type="button" className="car-hello" style={presentation.bounds}
      disabled={(!presentation.parked && !presentation.reacting) || !props.visible || !props.pageVisible}
      aria-disabled={presentation.reacting}
      aria-label="Say hello to the little car" onClick={() => { if (presentation.parked) setRequest(value => value + 1) }}>
      <span className="car-hello-label">Say hello</span>
    </button>}
    <span className="car-sr-only" role="status" aria-live="polite">{presentation?.reacting ? 'The car sends a little headlight hello.' : presentation?.parked ? 'Parked and ready. Say hello to the little car.' : 'The little car is arriving.'}</span>
  </>
}
