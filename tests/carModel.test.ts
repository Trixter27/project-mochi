import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { CAR, CAR_WHEELS, wheelPosition } from '../src/components/car/carConfig.ts'
import { createCarGeometry } from '../src/components/car/carGeometry.ts'
import { DoubleSide, Mesh, MeshBasicMaterial, Raycaster, Vector3 } from 'three'

test('four unique wheels form two centered axles and meet the platform', () => {
  assert.equal(CAR_WHEELS.length, 4)
  assert.equal(new Set(CAR_WHEELS.map(wheel => wheel.name)).size, 4)
  assert.equal(CAR_WHEELS.filter(wheel => wheel.front).length, 2)
  assert.equal(new Set(CAR_WHEELS.map(wheel => wheelPosition(wheel).join(','))).size, 4)
  for (const wheel of CAR_WHEELS) {
    const [x, y, z] = wheelPosition(wheel)
    assert.equal(Math.abs(x), CAR.track)
    assert.equal(Math.abs(z), CAR.wheelbase)
    assert.ok(Math.abs(y - CAR.wheelRadius - CAR.platformTop) < 1e-8)
  }
  assert.ok(CAR.leanHeight > CAR.axleHeight)
})

test('procedural body and cabin have finite vertices, volume and a low sports-car silhouette', () => {
  const geometries = createCarGeometry()
  try {
    for (const geometry of Object.values(geometries)) {
      assert.ok(geometry.getAttribute('position').count > 0)
      assert.ok(Array.from(geometry.getAttribute('position').array).every(Number.isFinite))
      assert.ok(Array.from(geometry.getAttribute('normal').array).every(Number.isFinite))
      geometry.computeBoundingBox()
    }
    const body = geometries.body.boundingBox!
    const cabin = geometries.cabin.boundingBox!
    assert.ok(body.max.z - body.min.z > 3)
    assert.ok(body.max.x - body.min.x > 1.3)
    assert.ok(body.max.y - body.min.y < 0.7)
    assert.ok(cabin.max.y > body.max.y)
    assert.ok(cabin.max.x < body.max.x && cabin.min.x > body.min.x)
    assert.ok(cabin.min.z > body.min.z && cabin.max.z < body.max.z)
  } finally { Object.values(geometries).forEach(geometry => geometry.dispose()) }
})

test('scene stays demand-rendered and its Canvas fallback is passive', () => {
  const source = readFileSync(new URL('../src/components/car/CarScene.tsx', import.meta.url), 'utf8')
  const stage = readFileSync(new URL('../src/components/car/CarStage.tsx', import.meta.url), 'utf8')
  assert.match(source, /frameloop="demand"/)
  assert.match(source, /fallback=\{<CarFallback \/>\}/)
  assert.doesNotMatch(source, /useFrame|setInterval|requestAnimationFrame/)
  assert.match(source, /removeEventListener\('webglcontextlost', lost\)/)
  assert.match(stage, /lazy\(\(\) => import\('\.\/CarScene'\)\)/)
  assert.match(stage, /entered \? <CarScene/)
})

test('open wheel wells clear the tires while the central body remains solid', () => {
  const geometry = createCarGeometry()
  const material = new MeshBasicMaterial({ side: DoubleSide })
  const body = new Mesh(geometry.body, material)
  const ray = new Raycaster()
  try {
    for (const z of [-CAR.wheelbase, CAR.wheelbase]) {
      ray.set(new Vector3(2, CAR.axleHeight + 0.18, z), new Vector3(-1, 0, 0))
      assert.equal(ray.intersectObject(body).length, 0, 'wheel opening must not be filled by the body')
    }
    ray.set(new Vector3(2, 0.55, 0), new Vector3(-1, 0, 0))
    assert.ok(ray.intersectObject(body).length > 0)
    assert.ok(CAR.archRadius - CAR.wheelRadius >= 0.05)
  } finally {
    Object.values(geometry).forEach(item => item.dispose())
    material.dispose()
  }
})
