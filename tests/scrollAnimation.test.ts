import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { HERO_FLOATS, heroAmbientRunning } from '../src/components/heroDecorations.ts'
import { spring, transform } from 'motion'
import { HERO_DEPTH, HERO_SCROLL_RANGE, revealSettings, type RevealVariant } from '../src/components/animationPresets.ts'
import { createRevealPlayback, isSectionAnchor, shouldFinishAnchor } from '../src/components/revealPlayback.ts'
import { reducedMotionPreference } from '../src/components/useReducedMotionPreference.ts'

const variants: RevealVariant[] = ['rise', 'fade', 'card', 'featured', 'heading', 'settle']

test('reduced motion shows all content immediately and disables decorative loops', () => {
  for (const variant of variants) {
    const settings = revealSettings(variant, 10, true)
    assert.equal(settings.initial, false)
    assert.deepEqual(settings.visible, { opacity: 1, y: 0, scale: 1 })
    assert.deepEqual(settings.transition, { duration: 0, delay: 0 })
  }
  assert.equal(heroAmbientRunning(true, true, true), false)
  assert.equal(heroAmbientRunning(false, true, false), false)
  assert.equal(heroAmbientRunning(true, false, false), false)
  assert.equal(heroAmbientRunning(true, true, false), true)
})

test('delays stay finite and short while allowing layered internal sequences', () => {
  for (const variant of variants) {
    for (const delay of [-10, 0, 0.1, 100, NaN, Infinity]) {
      const { transition } = revealSettings(variant, delay, false)
      assert.ok(Number.isFinite(transition.delay) && transition.delay >= 0 && transition.delay <= 0.4)
    }
  }
  assert.equal(revealSettings('fade', 0.38, false).transition.delay, 0.38)
})

test('Toolbox entrance and spring stay exactly unchanged at every stagger step', () => {
  for (let index = 0; index < 5; index++) {
    const settings = revealSettings('card', index * 0.055, false)
    assert.deepEqual(settings.initial, { opacity: 0, y: 14, scale: 1 })
    assert.deepEqual(settings.transition, { type: 'spring', stiffness: 180, damping: 20, mass: 0.85, delay: index * 0.055 })
  }
  assert.equal(revealSettings('card', 1, false).transition.delay, 0.24)
})

test('headings and featured entrances are perceptible and settle to readable content', () => {
  for (const variant of variants) {
    assert.deepEqual(revealSettings(variant, 0, false).visible, { opacity: 1, y: 0, scale: 1 })
  }
  const heading = revealSettings('heading', 0, false).initial
  const featured = revealSettings('featured', 0, false).initial
  assert.ok(heading && heading.y >= 30 && heading.y <= 50)
  assert.ok(featured && featured.y >= 40 && featured.y <= 60 && featured.scale >= 0.95 && featured.scale <= 0.97)
  const settle = revealSettings('settle', 0, false).transition
  assert.equal(settle.type, 'spring')
  if (settle.type === 'spring') {
    const ratio = settle.damping / (2 * Math.sqrt(settle.stiffness * settle.mass))
    assert.ok(ratio > 0.75 && ratio < 1)
  }
})

test('Hero layers have bounded, distinct depth and reverse through the same scroll positions', () => {
  assert.ok(Math.abs(HERO_DEPTH.starNear) >= 60 && Math.abs(HERO_DEPTH.starNear) <= 100)
  assert.ok(Math.abs(HERO_DEPTH.starFar) >= 60 && Math.abs(HERO_DEPTH.starFar) <= 100)
  assert.ok(HERO_DEPTH.starNear * HERO_DEPTH.starFar < 0)
  for (const distance of [HERO_DEPTH.orbit, HERO_DEPTH.outerOrbit]) {
    assert.ok(Math.abs(distance) >= 20 && Math.abs(distance) <= 45)
    assert.ok(Math.abs(HERO_DEPTH.starNear) - Math.abs(distance) >= 40)
  }
  assert.ok(Math.abs(HERO_DEPTH.copy) >= 25 && Math.abs(HERO_DEPTH.copy) <= 45)
  for (const distance of Object.values(HERO_DEPTH)) {
    const y = transform(HERO_SCROLL_RANGE, [0, distance])
    assert.equal(y(-1), 0)
    assert.equal(y(1), distance)
    const forward = [0, 0.175, 0.35, 0.525, 0.7].map(y)
    assert.deepEqual([0.7, 0.525, 0.35, 0.175, 0].map(y), forward.toReversed())
    assert.ok(forward.every(value => Math.abs(value) <= 100))
    assert.equal(y(0.35), distance / 2)
  }
  assert.equal('canvas' in HERO_DEPTH, false)
  assert.equal('platform' in HERO_DEPTH, false)
})

test('viewport playback runs once and fast departures settle pending entrances', () => {
  let starts = 0, finishes = 0
  const state = createRevealPlayback()
  const playback = {
    enter: () => state.enter(() => starts++),
    show: () => state.show(() => finishes++),
    leave: () => state.leave(() => finishes++),
  }
  playback.leave()
  assert.equal(finishes, 0)
  playback.enter(); playback.leave(); playback.enter()
  assert.equal(starts, 1)
  assert.equal(finishes, 1)
})

test('keyboard focus, anchor arrival, and reduced-motion changes finish without replay', () => {
  for (const started of [false, true]) {
    let starts = 0, finishes = 0
    const state = createRevealPlayback()
  const playback = {
    enter: () => state.enter(() => starts++),
    show: () => state.show(() => finishes++),
    leave: () => state.leave(() => finishes++),
  }
    if (started) playback.enter()
    playback.show(); playback.enter()
    assert.equal(starts, started ? 1 : 0)
    assert.equal(finishes, 1)
  }
  assert.equal(isSectionAnchor('#projects', 'projects'), true)
  assert.equal(isSectionAnchor('#about', 'projects'), false)
  assert.equal(isSectionAnchor('', undefined), false)
})

test('live reduced-motion store shares one listener and releases it across remounts', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'window')
  const callbacks = new Set<() => void>()
  const media = {
    matches: false,
    addEventListener: (_: string, listener: () => void) => callbacks.add(listener),
    removeEventListener: (_: string, listener: () => void) => callbacks.delete(listener),
  }
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { matchMedia: () => media } })
  const cleanups: (() => void)[] = []
  try {
    let notices = 0
    cleanups.push(reducedMotionPreference.subscribe(() => notices++))
    cleanups.push(reducedMotionPreference.subscribe(() => notices++))
    assert.equal(callbacks.size, 1)
    assert.equal(reducedMotionPreference.getSnapshot(), false)
    media.matches = true
    callbacks.forEach(callback => callback())
    assert.equal(reducedMotionPreference.getSnapshot(), true)
    assert.equal(notices, 2)
    cleanups.pop()!()
    assert.equal(callbacks.size, 1)
    cleanups.pop()!()
    assert.equal(callbacks.size, 0)
    cleanups.push(reducedMotionPreference.subscribe(() => notices++))
    assert.equal(callbacks.size, 1)
  } finally {
    cleanups.forEach(cleanup => cleanup())
    if (original) Object.defineProperty(globalThis, 'window', original)
    else Reflect.deleteProperty(globalThis, 'window')
  }
  assert.equal(callbacks.size, 0)
})


test('About anchors defer to viewport arrival, while other sections retain immediate visibility', () => {
  for (const arrival of ['nav link', 'hero button', 'initial URL', 'ordinary scrolling']) {
    let starts = 0, finishes = 0
    const playback = createRevealPlayback()
    const hash = arrival === 'ordinary scrolling' ? '' : '#about'
    if (shouldFinishAnchor(hash, 'about', 'viewport', false)) playback.show(() => finishes++)
    assert.equal(finishes, 0, arrival)
    playback.enter(() => starts++)
    playback.leave(() => finishes++)
    playback.enter(() => starts++)
    assert.equal(starts, 1, arrival)
    assert.equal(finishes, 1, 'fast departure finishes the entrance')
  }
  assert.equal(shouldFinishAnchor('#about', 'about', 'viewport', true), true)
  assert.equal(shouldFinishAnchor('#projects', 'projects', 'immediate', false), true)
  assert.equal(shouldFinishAnchor('#about', 'projects', 'immediate', false), false)
})

test('Hero floats vary in direction, phase and duration within lightweight bounds', () => {
  const floats = Object.values(HERO_FLOATS)
  assert.equal(floats.length, 6)
  assert.ok(floats.some(float => float.y > 0) && floats.some(float => float.y < 0))
  assert.equal(new Set(floats.map(float => float.duration)).size, floats.length)
  assert.equal(new Set(floats.map(float => float.phase)).size, floats.length)
  for (const float of floats) {
    assert.ok(Math.abs(float.y) >= 12 && Math.abs(float.y) <= 26)
    assert.ok(Math.abs(float.x) <= 12 && Math.abs(float.rotate) <= 12)
    assert.ok(float.duration >= 3.5 && float.duration <= 7)
    assert.ok(float.phase < 0 && float.phase > -float.duration)
  }
})

test('decoration markup separates parallax from pausable CSS floating and static reduced motion', () => {
  const component = readFileSync(new URL('../src/components/HeroDecoration.tsx', import.meta.url), 'utf8')
  const css = readFileSync(new URL('../src/components/HeroDecoration.css', import.meta.url), 'utf8')
  assert.match(component, /<motion.span[^>]*style=\{\{ y \}\}[^>]*aria-hidden="true">/)
  assert.match(component, /<span className=\{`hero-float/)
  assert.match(css, /0%, 100% \{ transform: translate3d\(0, 0, 0\) rotate\(0deg\)/)
  assert.match(css, /animation-play-state: paused/)
  assert.match(css, /data-ambient-running="true".*animation-play-state: running/)
  assert.match(css, /data-reduced-motion="true".*animation: none/)
  assert.match(css, /prefers-reduced-motion: reduce/)
})


test('About opts into viewport arrival throughout and completes its staged movement promptly', () => {
  const about = readFileSync(new URL('../src/components/sections/About.tsx', import.meta.url), 'utf8')
  const reveals = [...about.matchAll(/<Reveal\s[^>]+>/g)]
  assert.equal(reveals.length, 6)
  assert.ok(reveals.every(([tag]) => tag.includes('anchorArrival="viewport"')))
  assert.equal(reveals.filter(([tag]) => tag.includes('as="p"')).length, 2)
  const settings = revealSettings('settle', 0.36, false)
  if (settings.initial === false || settings.transition.type !== 'spring') throw new Error('Expected note spring')
  const settle = spring({ keyframes: [settings.initial.y, 0], ...settings.transition })
  let milliseconds = 0
  while (!settle.next(milliseconds).done && milliseconds < 2000) milliseconds += 10
  const lastTag = revealSettings('rise', 0.34, false).transition
  if (lastTag.type !== 'tween') throw new Error('Expected tag tween')
  const sequenceEnd = Math.max(milliseconds / 1000 + settings.transition.delay, lastTag.duration + lastTag.delay)
  assert.ok(sequenceEnd >= 0.8 && sequenceEnd <= 1.2)
})
