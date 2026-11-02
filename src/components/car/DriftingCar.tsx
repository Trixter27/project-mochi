import { useEffect, useMemo } from 'react'
import { RoundedBox } from '@react-three/drei'
import { DoubleSide } from 'three'
import { createCarGeometry } from './carGeometry'
import { CAR, CAR_WHEELS, wheelPosition } from './carConfig'

// Local car colors: the portfolio's global theme stays unchanged.
const coral = '#E9573F', indigo = '#302C4D', glass = '#555B7B'
const mint = '#CCF3E2', ink = '#3D3B4E', cream = '#FAF9F6', lavender = '#DCCBF5'

export default function DriftingCar() {
  const geometry = useMemo(() => createCarGeometry(), [])
  useEffect(() => () => { Object.values(geometry).forEach(item => item.dispose()) }, [geometry])
  return <group name="car-vehicle-pivot">
    {/* Wheels stay on the road while the chassis can lean independently. */}
    {CAR_WHEELS.map(wheel => <group key={wheel.name} name={`car-${wheel.name}-steering`} position={wheelPosition(wheel)}>
      {/* Rotate this group around X for rolling, its parent around Y for steering. */}
      <group name={`car-${wheel.name}-roll`}>
        <mesh name={`car-${wheel.name}-tire`} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[CAR.wheelRadius, CAR.wheelRadius, 0.24, 16]} />
          <meshStandardMaterial color={ink} roughness={0.95} />
        </mesh>
        <mesh position={[wheel.side * 0.132, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.195, 0.195, 0.025, 12]} />
          <meshStandardMaterial color={lavender} roughness={0.65} />
        </mesh>
        <mesh position={[wheel.side * 0.15, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.065, 0.065, 0.027, 10]} />
          <meshStandardMaterial color={mint} roughness={0.6} />
        </mesh>
      </group>
    </group>)}
    <group name="car-chassis-lean-pivot" position={[0, CAR.leanHeight, 0]}>
      <group position={[0, -CAR.leanHeight, 0]}>
        <mesh geometry={geometry.body}><meshStandardMaterial color={coral} roughness={0.55} /></mesh>
        <mesh geometry={geometry.cabin}><meshStandardMaterial color={indigo} roughness={0.5} /></mesh>
        {([-1, 1] as const).map(side => <group key={side}>
          <mesh geometry={geometry.window} position={[side * 0.556, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
            <meshStandardMaterial color={glass} roughness={0.65} side={DoubleSide} />
          </mesh>
          <RoundedBox args={[0.035, 0.25, 0.055]} radius={0.01} smoothness={2} bevelSegments={2} position={[side * 0.565, 1.005, -0.3]}>
            <meshStandardMaterial color={indigo} />
          </RoundedBox>
          <RoundedBox name={`headlight-housing-${side}`} args={[0.43, 0.23, 0.12]} radius={0.045} smoothness={2} bevelSegments={2} position={[side * 0.45, 0.62, 1.62]}>
            <meshStandardMaterial color={indigo} roughness={0.8} />
          </RoundedBox>
          <RoundedBox name={`headlight-lens-${side}`} args={[0.33, 0.14, 0.045]} radius={0.02} smoothness={2} bevelSegments={2} position={[side * 0.45, 0.63, 1.695]}>
            <meshStandardMaterial color={cream} emissive={cream} emissiveIntensity={0.25} roughness={0.5} toneMapped={false} />
          </RoundedBox>
          {[-CAR.wheelbase, CAR.wheelbase].map(axle => <mesh key={axle} name={`fender-trim-${side}-${axle}`} position={[side * 0.72, CAR.axleHeight, axle]} rotation={[0, Math.PI / 2, 0]}>
            <torusGeometry args={[CAR.archRadius, 0.025, 4, 16, Math.PI]} />
            <meshStandardMaterial color={indigo} roughness={0.8} />
          </mesh>)}
          <RoundedBox args={[0.23, 0.09, 0.07]} radius={0.025} smoothness={2} bevelSegments={2} position={[side * 0.48, 0.65, -1.57]}>
            <meshStandardMaterial color="#FAD7E7" />
          </RoundedBox>
          <RoundedBox args={[0.12, 0.15, 0.2]} radius={0.04} smoothness={2} bevelSegments={2} position={[side * 0.65, 0.91, 0.2]}>
            <meshStandardMaterial color={mint} />
          </RoundedBox>
          <RoundedBox args={[0.07, 0.19, 0.08]} radius={0.02} smoothness={2} bevelSegments={2} position={[side * 0.45, 0.84, -1.3]}>
            <meshStandardMaterial color={indigo} />
          </RoundedBox>
        </group>)}
        <RoundedBox name="car-windshield" args={[0.91, 0.5, 0.05]} radius={0.018} smoothness={2} bevelSegments={2} position={[0, 0.985, 0.335]} rotation={[-0.93, 0, 0]}>
          <meshStandardMaterial color={glass} roughness={0.65} />
        </RoundedBox>
        <RoundedBox name="car-rear-window" args={[0.85, 0.32, 0.05]} radius={0.018} smoothness={2} bevelSegments={2} position={[0, 0.975, -0.88]} rotation={[0.76, 0, 0]}>
          <meshStandardMaterial color={glass} roughness={0.65} />
        </RoundedBox>
        <RoundedBox name="car-smile-bumper" args={[1.03, 0.13, 0.13]} radius={0.05} smoothness={2} bevelSegments={2} position={[0, 0.4, 1.66]}>
          <meshStandardMaterial color={mint} roughness={0.7} />
        </RoundedBox>
        <RoundedBox name="car-spoiler" args={[1.5, 0.08, 0.24]} radius={0.035} smoothness={2} bevelSegments={2} position={[0, 0.95, -1.3]}>
          <meshStandardMaterial color={mint} roughness={0.6} />
        </RoundedBox>
      </group>
    </group>
  </group>
}
