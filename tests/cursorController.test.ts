import test from 'node:test'
import assert from 'node:assert/strict'
import { installMagicCursor, RIPPLE_LIMIT, SPARKLE_COUNT } from '../src/components/effects/cursorController.ts'

// Exercises the production controller with a deterministic event/RAF clock, no DOM dependency.
class Events {
  listeners = new Map<string, Map<(event: unknown) => void, { passive?: boolean; capture?: boolean }>>()
  addEventListener(type: string, listener: (event: unknown) => void, options: { passive?: boolean; capture?: boolean } = {}) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Map())
    this.listeners.get(type)!.set(listener, options)
  }
  removeEventListener(type: string, listener: (event: unknown) => void) { this.listeners.get(type)?.delete(listener) }
  emit(type: string, event: Record<string, unknown> = {}) {
    for (const listener of this.listeners.get(type)?.keys() ?? []) listener(event)
  }
  get count() { return [...this.listeners.values()].reduce((sum, listeners) => sum + listeners.size, 0) }
}

class Media extends Events {
  matches: boolean
  constructor(matches: boolean) { super(); this.matches = matches }
  set(matches: boolean) { this.matches = matches; this.emit('change') }
}

class Target {
  control: Target | null = null
  native = false
  disabled = false
  inert = false
  closest(selector: string): Target | null {
    if (selector.includes('a[href]')) return this.control
    if (selector.includes('textarea')) return this.native ? this : null
    return this.inert ? this : null
  }
  matches() { return this.disabled }
}

const visual = () => ({ style: { opacity: '0', transform: '' } })

function setup({ reduced = false, fine = true, forced = false, styled = true, missingRing = false } = {}) {
  const document = Object.assign(new Events(), { visibilityState: 'visible', documentElement: { dataset: {} as Record<string, string> } })
  const motion = new Media(reduced), pointer = new Media(fine), contrast = new Media(forced)
  let now = 0, id = 0
  const frames = new Map<number, (time: number) => void>()
  const dot = visual(), ring = visual(), aura = visual()
  const bursts = Array.from({ length: RIPPLE_LIMIT }, () => {
    const node = visual(), ripple = visual(), sparkles = Array.from({ length: SPARKLE_COUNT }, visual)
    return Object.assign(node, { ripple, sparkles, querySelector: () => ripple, querySelectorAll: () => sparkles })
  })
  const window = Object.assign(new Events(), {
    matchMedia: (query: string) => query.includes('reduced-motion') ? motion : query.includes('forced-colors') ? contrast : pointer,
    performance: { now: () => now },
    requestAnimationFrame: (callback: (time: number) => void) => { frames.set(++id, callback); return id },
    cancelAnimationFrame: (key: number) => frames.delete(key),
    getComputedStyle: (node: unknown) => ({ display: 'block', visibility: 'visible', width: styled ? '6px' : '0px', height: '6px', opacity: node === dot ? dot.style.opacity : '1', getPropertyValue: () => styled ? '1' : '' }),
  })
  Object.assign(document, { defaultView: window })
  const layer = {
    ownerDocument: document, dataset: { followEnabled: '' },
    querySelector: (selector: string) => selector.includes('-dot') ? dot : selector.includes('-ring') ? (missingRing ? null : ring) : aura,
    querySelectorAll: () => bursts,
  }
  const attach = () => installMagicCursor(layer as unknown as HTMLElement)
  const cleanup = attach()
  const plain = new Target(), button = new Target()
  button.control = button
  const move = (target = plain, pointerType = 'mouse', x = 120, y = 80) => document.emit('pointermove', { target, pointerType, clientX: x, clientY: y, isPrimary: true })
  const click = (target = plain, options: { detail?: number; button?: number; x?: number; y?: number; isPrimary?: boolean } = {}) => {
    let cancelled = false
    // click PointerEvents use default isPrimary=false, unlike pointerdown/move.
    const event = { target, detail: 1, button: 0, clientX: 120, clientY: 80, isPrimary: false,
      ...options, preventDefault: () => { cancelled = true }, stopPropagation: () => { cancelled = true } }
    if (options.x !== undefined) event.clientX = options.x
    if (options.y !== undefined) event.clientY = options.y
    document.emit('click', event)
    assert.equal(cancelled, false, 'real clicks, navigation, selection, and Mochi input must not be cancelled')
  }
  const step = (elapsed = 1000 / 60) => {
    now += elapsed
    const callbacks = [...frames.values()]
    frames.clear()
    callbacks.forEach(callback => callback(now))
  }
  const flush = () => {
    let ticks = 0
    while (frames.size && ticks++ < 200) step()
    assert.equal(frames.size, 0, 'RAF must stop once the pointer and bursts settle')
  }
  const active = () => document.documentElement.dataset.magicCursorActive === 'true'
  return { document, window, motion, pointer, contrast, frames, dot, ring, aura, bursts, layer, button, plain, attach, cleanup, move, click, step, flush, active }
}

test('dot is exact immediately; ring trails responsively and expands over nested controls', () => {
  const env = setup()
  env.move()
  assert.ok(env.dot.style.transform.startsWith('translate3d(120px, 80px,'))
  assert.equal(env.active(), false, 'native cursor stays until a styled frame is drawn')
  env.flush()
  assert.equal(env.active(), true)
  const child = new Target(); child.control = env.button
  env.move(child, 'mouse', 220, 180)
  assert.ok(env.dot.style.transform.startsWith('translate3d(220px, 180px,'))
  env.step()
  const x = Number(env.ring.style.transform.match(/translate3d\(([^p]+)/)![1])
  assert.ok(x > 120 && x < 220)
  env.flush()
  assert.ok(env.ring.style.transform.endsWith('scale(1.3)'))
  assert.ok(Number(env.aura.style.opacity) > 0.7)
  env.move(); env.flush()
  assert.ok(env.ring.style.transform.endsWith('scale(1)'))
  env.cleanup()
})

test('ordinary page background clicks produce a ripple plus six sparkles at viewport coordinates', () => {
  const env = setup()
  env.click(env.plain, { x: 340, y: 210 })
  assert.equal(env.frames.size, 1)
  env.step()
  const burst = env.bursts[0]
  assert.equal(burst.style.transform, 'translate3d(340px, 210px, 0)')
  assert.equal(burst.style.opacity, '1')
  assert.ok(Number(burst.ripple.style.opacity) > 0.7)
  assert.equal(burst.sparkles.length, 6)
  assert.ok(burst.sparkles.every(sparkle => Number(sparkle.style.opacity) > 0.9))
  env.flush()
  assert.equal(burst.style.opacity, '0')
  env.cleanup()
})

test('browser click with default isPrimary=false still creates a primary-button burst', () => {
  const env = setup()
  env.click(env.plain, { isPrimary: false, x: 260, y: 190 })
  env.step()
  assert.equal(env.bursts[0].style.opacity, '1')
  assert.equal(env.bursts[0].style.transform, 'translate3d(260px, 190px, 0)')
  env.cleanup()
})

test('sparkles stay visible outside the hover ring, travel outward, and fade near the end', () => {
  const env = setup()
  env.move(env.button); env.flush(); env.click(env.button)
  const burst = env.bursts[0]
  const distance = (transform: string) => {
    const match = transform.match(/translate3d\(([-\d.e+]+)px, ([-\d.e+]+)px/)
    assert.ok(match, 'each sparkle has a finite viewport-relative translation')
    return Math.hypot(Number(match[1]), Number(match[2]))
  }
  env.step(20)
  const initialDistances = burst.sparkles.map(sparkle => distance(sparkle.style.transform))
  for (const sparkle of burst.sparkles) {
    assert.equal(sparkle.style.opacity, '1')
    assert.ok(sparkle.style.transform.endsWith('scale(1)'))
    assert.ok(distance(sparkle.style.transform) > 26, 'starts outside the expanded 40px cursor ring')
  }
  assert.equal(burst.ripple.style.opacity, '0.9')
  env.step(180) // 200ms: substantial travel before any fade or shrink.
  burst.sparkles.forEach((sparkle, index) => {
    assert.equal(sparkle.style.opacity, '1')
    assert.ok(sparkle.style.transform.endsWith('scale(1)'))
    assert.ok(distance(sparkle.style.transform) > initialDistances[index] + 15)
  })
  env.step(100) // 300ms: fade has just begun.
  assert.ok(burst.sparkles.every(sparkle => Number(sparkle.style.opacity) > 0.9 && Number(sparkle.style.opacity) < 1))
  env.step(220) // 520ms: late fade, not abrupt disappearance.
  assert.equal(burst.style.opacity, '1')
  assert.ok(burst.sparkles.every(sparkle => Number(sparkle.style.opacity) > 0 && Number(sparkle.style.opacity) < 0.4))
  env.step(101) // 621ms: completion removes the visible burst and ends its work.
  assert.equal(burst.style.opacity, '0')
  assert.equal(env.frames.size, 0)
  env.cleanup()
})

test('button and Mochi clicks pass through; click handlers are passive observers', () => {
  const env = setup()
  let mochiReactions = 0
  const reactToClick = () => { mochiReactions++ }
  env.document.addEventListener('click', reactToClick)
  env.click(env.button)
  env.step()
  assert.equal(mochiReactions, 1)
  assert.equal(env.bursts[0].style.opacity, '1')
  env.document.removeEventListener('click', reactToClick)
  const options = [...env.document.listeners.get('click')!.values()][0]
  assert.deepEqual(options, { passive: true, capture: true })
  env.cleanup()
})

test('primary click briefly contracts the ring and then returns it to normal', () => {
  const env = setup()
  env.move(); env.flush(); env.click(); env.step()
  const scale = Number(env.ring.style.transform.match(/scale\(([^)]+)/)![1])
  assert.ok(scale < 1 && scale > 0.65)
  env.flush()
  assert.ok(env.ring.style.transform.endsWith('scale(1)'))
  env.cleanup()
})

test('right clicks and auxiliary clicks produce no bursts', () => {
  const env = setup()
  env.click(env.plain, { button: 2 })
  env.click(env.button, { button: 1 })
  env.document.emit('contextmenu', { target: env.plain })
  assert.equal(env.frames.size, 0)
  assert.ok(env.bursts.every(burst => burst.style.opacity === '0'))
  env.cleanup()
})

test('keyboard input restores native cursor, preserves focus, and does not sparkle', () => {
  const env = setup()
  env.move(); env.flush()
  assert.equal(env.active(), true)
  const focused = env.button
  Object.assign(env.document, { activeElement: focused })
  env.document.emit('keydown', { key: 'Tab' })
  assert.equal(env.active(), false)
  assert.equal(env.dot.style.opacity, '0')
  env.click(env.button, { detail: 0 }); env.flush()
  assert.ok(env.bursts.every(burst => burst.style.opacity === '0'))
  assert.equal((env.document as typeof env.document & { activeElement: Target }).activeElement, focused)
  env.cleanup()
})

test('editable/native UI keeps the native cursor, while ordinary pointer clicks still get feedback', () => {
  const env = setup()
  env.move(); env.flush()
  env.plain.native = true
  env.move()
  assert.equal(env.active(), false)
  assert.equal(env.dot.style.opacity, '0')
  env.click(); env.step()
  assert.equal(env.bursts[0].style.opacity, '1')
  env.flush()
  env.cleanup()
})

test('rapid clicks recycle four bounded bursts and complete without perpetual frames', () => {
  const env = setup()
  for (let i = 0; i < 50; i++) env.click(env.plain, { x: i, y: i + 10 })
  assert.equal(env.frames.size, 1)
  assert.equal(env.bursts.length, RIPPLE_LIMIT)
  assert.ok(env.bursts.every(burst => burst.sparkles.length === SPARKLE_COUNT))
  env.step()
  assert.ok(env.bursts.some(burst => burst.style.transform === 'translate3d(49px, 59px, 0)'))
  env.flush()
  assert.ok(env.bursts.every(burst => burst.style.opacity === '0'))
  env.cleanup()
})

test('reduced motion and forced colors disable motion and native replacement, including live changes', () => {
  for (const preference of ['reduced', 'forced'] as const) {
    const env = setup({ [preference]: true })
    env.move(); env.click()
    assert.equal(env.frames.size, 0)
    assert.equal(env.active(), false)
    const media = preference === 'reduced' ? env.motion : env.contrast
    media.set(false); env.move(); env.flush(); env.click()
    assert.equal(env.active(), true)
    media.set(true)
    assert.equal(env.active(), false)
    assert.equal(env.frames.size, 0)
    assert.ok(env.bursts.every(burst => burst.style.opacity === '0'))
    env.cleanup()
  }
})

test('touch/coarse pointer gets one tap burst and never a persistent custom pointer', () => {
  const env = setup({ fine: false })
  env.move(env.plain, 'touch')
  env.document.emit('pointerdown', { target: env.plain, pointerType: 'touch' })
  assert.equal(env.frames.size, 0)
  env.click(); env.step()
  assert.equal(env.bursts.filter(burst => burst.style.opacity === '1').length, 1)
  assert.equal(env.active(), false)
  assert.equal(env.dot.style.opacity, '0')
  env.flush()
  env.pointer.set(true); env.move(); env.flush()
  assert.equal(env.active(), true)
  env.move(env.plain, 'touch'); env.flush()
  assert.equal(env.active(), false)
  env.cleanup()
})

test('native pointer remains usable without cursor styles, required nodes, or a working RAF', () => {
  for (const options of [{ styled: false }, { missingRing: true }]) {
    const env = setup(options)
    env.move(); env.flush()
    assert.equal(env.active(), false)
    env.cleanup()
  }
  const env = setup()
  env.move(); env.flush()
  assert.equal(env.active(), true)
  env.window.requestAnimationFrame = () => { throw new Error('RAF unavailable') }
  env.move(env.plain, 'mouse', 300, 240)
  assert.equal(env.active(), false)
  assert.equal(env.frames.size, 0)
  env.cleanup()
})

test('pointer exit, tab visibility, and blur restore native cursor and clear animation', () => {
  const env = setup()
  env.move(); env.flush()
  env.document.emit('pointerout', { relatedTarget: null })
  assert.equal(env.active(), false)
  env.flush()
  env.move(); env.flush(); env.click()
  env.document.visibilityState = 'hidden'; env.document.emit('visibilitychange')
  assert.equal(env.frames.size, 0)
  assert.equal(env.active(), false)
  env.move(); env.click()
  assert.equal(env.frames.size, 0)
  env.document.visibilityState = 'visible'; env.document.emit('visibilitychange')
  env.move(); env.flush(); env.window.emit('blur')
  assert.equal(env.active(), false)
  assert.equal(env.frames.size, 0)
  env.cleanup()
})

test('cleanup restores native cursor and removes all listeners/frames across a remount', () => {
  const env = setup()
  const count = env.document.count
  env.move(); env.flush(); env.click(); env.step(); env.cleanup()
  assert.equal(env.active(), false)
  assert.equal(env.frames.size, 0)
  for (const target of [env.document, env.window, env.motion, env.pointer, env.contrast]) assert.equal(target.count, 0)
  const cleanupAgain = env.attach()
  assert.equal(env.document.count, count)
  env.move(); env.flush(); cleanupAgain()
  assert.equal(env.active(), false)
  assert.equal(env.frames.size, 0)
  for (const target of [env.document, env.window, env.motion, env.pointer, env.contrast]) assert.equal(target.count, 0)
  env.move(); env.click()
  assert.equal(env.frames.size, 0)
})
