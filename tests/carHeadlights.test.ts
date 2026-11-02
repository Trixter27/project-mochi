import test from 'node:test'
import assert from 'node:assert/strict'
import { Mesh, Sprite } from 'three'
import { createHeadlightGlows, headlightGlowOpacity, sampleHeadlightFlash } from '../src/components/car/carHeadlights.ts'
import { PARK_FLASH_START, sampleEntrance, sampleReaction } from '../src/components/car/carAnimation.ts'
import { pulse } from '../src/components/car/carMotionMath.ts'

test('parking and clicking share the exact approved V2 double flash at every elapsed time', () => {
  let pulses = 0, lit = false
  for (let elapsed = -0.1; elapsed < 1.1; elapsed += 0.002) {
    const v2Time = elapsed + 3.85
    const canonical = 0.25 + 1.25 * (pulse(v2Time, 3.85, 3.96, 4.1) + pulse(v2Time, 4.15, 4.27, 4.43))
    const parking = sampleEntrance(PARK_FLASH_START + elapsed).light
    const click = sampleReaction(elapsed, false).light
    for (const light of [sampleHeadlightFlash(elapsed), parking, click]) assert.ok(Math.abs(light - canonical) < 1e-12)
    assert.ok(Math.abs(headlightGlowOpacity(parking) - headlightGlowOpacity(click)) < 1e-12)
    const nextLit = click > 0.26
    if (nextLit && !lit) pulses++
    lit = nextLit
  }
  assert.equal(pulses, 2)
})

test('halos are off at rest, brighten on both flashes, and remain restrained for reduced-motion hello', () => {
  assert.equal(headlightGlowOpacity(0.25), 0)
  assert.equal(headlightGlowOpacity(1.5), 0.85)
  assert.ok(headlightGlowOpacity(0.8) > 0.6)
  assert.ok(headlightGlowOpacity(0.4) < 0.2)
})

test('both lens-attached halos share bounded resources and clean up on unmount', () => {
  const lenses = [new Mesh(), new Mesh()], glows = createHeadlightGlows(lenses)
  const sprites = lenses.map(lens => lens.children[0] as Sprite)
  const material = sprites[0].material, texture = material.map!
  let materialDisposed = false, textureDisposed = false
  material.addEventListener('dispose', () => { materialDisposed = true })
  texture.addEventListener('dispose', () => { textureDisposed = true })
  assert.equal(sprites[1].material, material)
  assert.equal(texture.image.width, 32)
  assert.equal(material.depthWrite, false)
  assert.equal(material.depthTest, true)
  for (const sprite of sprites) {
    assert.ok(sprite.position.z > 0 && sprite.scale.x < 1)
  }
  glows.update(1.5)
  assert.equal(material.opacity, 0.85)
  glows.update(0.25)
  assert.equal(material.opacity, 0)
  glows.dispose()
  assert.ok(materialDisposed && textureDisposed)
  assert.ok(lenses.every(lens => lens.children.length === 0))
  lenses.forEach(lens => { lens.geometry.dispose(); (lens.material as { dispose(): void }).dispose() })
})
