import { DataTexture, LinearFilter, Mesh, RGBAFormat, Sprite, SpriteMaterial } from 'three'
import { clamp01, pulse } from './carMotionMath.ts'

/** The approved V2 parking flash, expressed relative to its first pulse.
 * Both arrival and hello use these exact timings, peaks, and idle brightness. */
export function sampleHeadlightFlash(time: number, reduced = false) {
  if (reduced) {
    // Preserve the existing quiet, input-driven response for reduced motion.
    return 0.25 + 0.15 * Math.sin(Math.PI * clamp01(time / 0.95)) ** 2
  }
  return 0.25 + 1.25 * (pulse(time, 0, 0.11, 0.25) + pulse(time, 0.3, 0.42, 0.58))
}

export const headlightGlowOpacity = (light: number) => 0.85 * clamp01((light - 0.25) / 0.7)

/** Two small camera-facing halos share one procedural texture and material.
 * Attached to the existing lenses, so chassis lean and click wiggles stay in sync. */
export function createHeadlightGlows(lenses: Mesh[]) {
  const size = 32, pixels = new Uint8Array(size * size * 4)
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const radius = Math.hypot((x + 0.5) / size * 2 - 1, (y + 0.5) / size * 2 - 1)
    const offset = (y * size + x) * 4
    pixels[offset] = pixels[offset + 1] = pixels[offset + 2] = 255
    pixels[offset + 3] = Math.round(255 * Math.max(0, 1 - radius) ** 1.6)
  }
  const texture = new DataTexture(pixels, size, size, RGBAFormat)
  texture.minFilter = texture.magFilter = LinearFilter
  texture.needsUpdate = true
  const material = new SpriteMaterial({ map: texture, color: '#FFE7A0', transparent: true, opacity: 0, depthWrite: false, toneMapped: false })
  const sprites = lenses.map(lens => {
    const sprite = new Sprite(material)
    sprite.name = 'car-headlight-halo'
    sprite.position.z = 0.06
    sprite.scale.set(0.85, 0.48, 1)
    lens.add(sprite)
    return sprite
  })
  return {
    update(light: number) { material.opacity = headlightGlowOpacity(light) },
    dispose() { sprites.forEach(sprite => sprite.removeFromParent()); material.dispose(); texture.dispose() },
  }
}
