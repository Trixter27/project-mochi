import { useEffect, useMemo } from 'react'
import { IcosahedronGeometry } from 'three'
import { SMOKE_LIMIT } from './carAnimation'

export function CarSmoke() {
  const geometry = useMemo(() => new IcosahedronGeometry(1, 1), [])
  useEffect(() => () => geometry.dispose(), [geometry])
  return <group name="car-smoke-world-pool">
    {Array.from({ length: SMOKE_LIMIT }, (_, index) => <mesh key={index} name={`car-puff-${index}`} geometry={geometry} visible={false}>
      <meshBasicMaterial color={['#B59BD8', '#C7ACE3', '#D6ADD0'][index % 3]} transparent opacity={0} depthWrite={false} toneMapped={false} />
    </mesh>)}
  </group>
}
