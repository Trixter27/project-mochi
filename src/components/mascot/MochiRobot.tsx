import { useMemo } from 'react'
import { RoundedBox } from '@react-three/drei'
import { QuadraticBezierCurve3, Vector3 } from 'three'
import { WHEEL_RADIUS } from './mochiAnimation'
import { useMochiAnimation, type MochiBehavior } from './useMochiAnimation'

// Existing portfolio colors, reused for the character rather than new theme tokens.
const blue = '#B9D8FF'
const lavender = '#DCCBF5'
const pink = '#FAD7E7'
const mint = '#CCF3E2'
const ink = '#3D3B4E'
const cream = '#FAF9F6'
const sides = [-1, 1] as const

export default function MochiRobot(props: MochiBehavior) {
  const { root, balance, head, wheel, shoulder, elbow, eyes, gaze, mouth, cheeks } = useMochiAnimation(props)
  const smile = useMemo(() => new QuadraticBezierCurve3(
    new Vector3(-0.08, 0, 0), new Vector3(0, -0.075, 0), new Vector3(0.08, 0, 0),
  ), [])

  return <group ref={root} name="mochi" position={[-2.6, 0, 0]}>
    {/* One wheel assembly, one tire, one centered axle. Hub caps are on the same axle. */}
    <group ref={wheel} name="mochi-single-wheel" position={[0, 0.23, 0]}>
      <mesh name="mochi-tire" rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[WHEEL_RADIUS, WHEEL_RADIUS, 0.2, 24]} />
        <meshStandardMaterial color={ink} roughness={0.9} />
      </mesh>
      {sides.map(side => <group key={side} position={[side * 0.106, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <mesh><cylinderGeometry args={[0.115, 0.115, 0.018, 16]} /><meshStandardMaterial color={lavender} roughness={0.65} /></mesh>
        <mesh position={[0, side * -0.014, 0]}><sphereGeometry args={[0.042, 12, 8]} /><meshStandardMaterial color={cream} roughness={0.6} /></mesh>
      </group>)}
      {/* Small tread marks make rolling visible without extra wheels or textures. */}
      {Array.from({ length: 8 }, (_, i) => {
        const angle = i * Math.PI / 4
        return <mesh key={i} position={[0, Math.sin(angle) * WHEEL_RADIUS, Math.cos(angle) * WHEEL_RADIUS]} rotation={[-angle, 0, 0]}>
          <boxGeometry args={[0.14, 0.035, 0.012]} /><meshStandardMaterial color={lavender} roughness={0.85} />
        </mesh>
      })}
    </group>

    {/* Balance around the axle, not around the head or world origin. */}
    <group ref={balance} name="mochi-balance-pivot" position={[0, 0.23, 0]}>
      <RoundedBox name="wheel-stem" args={[0.14, 0.44, 0.14]} radius={0.04} smoothness={2} bevelSegments={2} position={[0, 0.19, -0.045]}>
        <meshStandardMaterial color={lavender} roughness={0.65} />
      </RoundedBox>
      <RoundedBox args={[0.83, 0.7, 0.61]} radius={0.16} smoothness={3} bevelSegments={2} position={[0, 0.74, 0]}>
        <meshStandardMaterial color={blue} roughness={0.55} />
      </RoundedBox>
      <RoundedBox args={[0.48, 0.065, 0.025]} radius={0.012} smoothness={2} bevelSegments={2} position={[0, 0.55, 0.304]}>
        <meshStandardMaterial color={lavender} roughness={0.7} />
      </RoundedBox>
      <mesh position={[0, 0.84, 0.315]} scale={[1, 1, 0.25]}>
        <sphereGeometry args={[0.065, 16, 10]} /><meshStandardMaterial color={mint} roughness={0.6} />
      </mesh>
      <mesh position={[0, 1.14, 0]}><capsuleGeometry args={[0.105, 0.15, 4, 12]} /><meshStandardMaterial color={lavender} roughness={0.65} /></mesh>

      <group ref={head} name="mochi-head" position={[0, 1.61, 0]}>
        <RoundedBox args={[1.44, 0.96, 0.9]} radius={0.21} smoothness={3} bevelSegments={2}>
          <meshStandardMaterial color={blue} roughness={0.48} />
        </RoundedBox>
        {sides.map(side => <RoundedBox key={side} args={[0.1, 0.29, 0.36]} radius={0.045} smoothness={2} bevelSegments={2} position={[side * 0.725, 0, -0.02]}>
          <meshStandardMaterial color={lavender} roughness={0.6} />
        </RoundedBox>)}
        <RoundedBox args={[1.18, 0.66, 0.36]} scale={[1, 1, 0.28]} radius={0.16} smoothness={3} bevelSegments={2} position={[0, -0.015, 0.43]}>
          <meshStandardMaterial color={ink} roughness={0.72} />
        </RoundedBox>

        <group ref={eyes} name="mochi-eyes" position={[0, 0.055, 0.494]}>
          {sides.map(side => <mesh key={side} position={[side * 0.265, 0, 0]} scale={[0.135, 0.18, 0.036]}>
            <sphereGeometry args={[1, 20, 14]} /><meshStandardMaterial color={cream} roughness={0.5} />
          </mesh>)}
          <group ref={gaze}>
            {sides.map(side => <group key={side} position={[side * 0.265, 0, 0.029]}>
              <mesh scale={[0.061, 0.102, 0.025]}><sphereGeometry args={[1, 16, 12]} /><meshStandardMaterial color={ink} roughness={0.5} /></mesh>
              <mesh position={[-0.019, 0.04, 0.021]} scale={[0.022, 0.029, 0.009]}><sphereGeometry args={[1, 10, 8]} /><meshBasicMaterial color={cream} /></mesh>
            </group>)}
          </group>
        </group>
        <group ref={cheeks} name="mochi-blush" position={[0, -0.17, 0.488]}>
          {sides.map(side => <mesh key={side} position={[side * 0.47, 0, 0]} scale={[0.084, 0.038, 0.012]}>
            <sphereGeometry args={[1, 16, 10]} /><meshBasicMaterial color={pink} />
          </mesh>)}
        </group>
        <group ref={mouth} position={[0, -0.13, 0.493]}>
          <mesh><tubeGeometry args={[smile, 12, 0.012, 6, false]} /><meshBasicMaterial color={pink} /></mesh>
        </group>
        <group name="mochi-antenna" position={[0.12, 0.52, -0.04]} rotation={[0, 0, -0.12]}>
          <mesh><sphereGeometry args={[0.09, 12, 8]} /><meshStandardMaterial color={lavender} /></mesh>
          <mesh position={[0, 0.095, 0]}><capsuleGeometry args={[0.025, 0.16, 4, 8]} /><meshStandardMaterial color={lavender} roughness={0.7} /></mesh>
          <mesh position={[0, 0.21, 0]}><sphereGeometry args={[0.085, 16, 12]} /><meshStandardMaterial color={mint} roughness={0.45} /></mesh>
        </group>
      </group>

      {sides.map(side => <group key={side} ref={side === -1 ? shoulder : undefined} name={side === -1 ? 'mochi-wave-shoulder' : 'mochi-resting-shoulder'} position={[side * 0.49, 0.94, 0]} rotation={[0, 0, side * 0.14]}>
        <mesh><sphereGeometry args={[0.125, 16, 12]} /><meshStandardMaterial color={lavender} roughness={0.6} /></mesh>
        <mesh position={[0, -0.19, 0]}><capsuleGeometry args={[0.075, 0.24, 4, 12]} /><meshStandardMaterial color={blue} roughness={0.6} /></mesh>
        <group ref={side === -1 ? elbow : undefined} name="mochi-elbow" position={[0, -0.38, 0]} rotation={[0, 0, side * 0.12]}>
          <mesh><sphereGeometry args={[0.095, 12, 10]} /><meshStandardMaterial color={lavender} roughness={0.65} /></mesh>
          <mesh position={[0, -0.18, 0]}><capsuleGeometry args={[0.078, 0.23, 4, 12]} /><meshStandardMaterial color={blue} roughness={0.6} /></mesh>
          <RoundedBox name="mochi-rounded-hand" args={[0.2, 0.21, 0.18]} radius={0.075} smoothness={2} bevelSegments={2} position={[0, -0.39, 0]}>
            <meshStandardMaterial color={lavender} roughness={0.55} />
          </RoundedBox>
        </group>
      </group>)}
    </group>
  </group>
}
