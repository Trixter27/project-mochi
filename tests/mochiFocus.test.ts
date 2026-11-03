import test from 'node:test'
import assert from 'node:assert/strict'
import { observeMochiFocus } from '../src/components/mascot/mochiFocus.ts'
import { advanceMochiAnimation, createMochiAnimation } from '../src/components/mascot/mochiAnimation.ts'

class Events {
  listeners = new Map<string, Set<(event: Record<string, unknown>) => void>>()
  addEventListener(type: string, listener: (event: Record<string, unknown>) => void) {
    const set = this.listeners.get(type) ?? new Set()
    set.add(listener); this.listeners.set(type, set)
  }
  removeEventListener(type: string, listener: (event: Record<string, unknown>) => void) { this.listeners.get(type)?.delete(listener) }
  emit(type: string, event = {}) { this.listeners.get(type)?.forEach(listener => listener(event)) }
}

function fixture() {
  const frames = new Map<number, () => void>()
  let next = 0, curious = false
  const win = {
    requestAnimationFrame: (callback: () => void) => { frames.set(++next, callback); return next },
    cancelAnimationFrame: (id: number) => frames.delete(id),
  }
  const doc = Object.assign(new Events(), { defaultView: win, activeElement: null as unknown })
  const button = Object.assign(new Events(), { ownerDocument: doc, visible: false, matches: (selector: string) => {
    assert.equal(selector, ':focus-visible'); return button.visible
  } })
  const cleanup = observeMochiFocus(button as unknown as HTMLButtonElement, value => { curious = value })
  return {
    doc, button, frames, cleanup, curious: () => curious,
    focus: () => { doc.activeElement = button; button.emit('focus') },
    flush: () => { const pending = [...frames.values()]; frames.clear(); pending.forEach(callback => callback()) },
  }
}

test('pointer focus never latches curiosity, including touch and an already keyboard-focused button', () => {
  const f = fixture()
  for (const pointerType of ['mouse', 'touch', 'pen']) {
    f.doc.emit('keydown', { key: 'Tab' }); f.focus()
    assert.equal(f.curious(), true)
    f.doc.emit('pointerdown', { pointerType })
    f.button.visible = true // A stale focus-visible match cannot relatch pointer curiosity.
    f.focus(); f.button.emit('click'); f.flush()
    assert.equal(f.curious(), false)
    assert.equal(f.doc.activeElement, f.button, 'native focus is retained')
  }
  f.cleanup()
})

test('Tab, Enter and Space keep keyboard curiosity without relying on immediate focus styling', () => {
  const f = fixture()
  f.doc.emit('keydown', { key: 'Tab' }); f.focus()
  assert.equal(f.button.visible, false)
  assert.equal(f.curious(), true)
  for (const key of ['Enter', ' ']) {
    f.doc.emit('keydown', { key }); f.button.emit('click')
    assert.equal(f.curious(), true)
  }
  f.button.emit('blur')
  assert.equal(f.curious(), false)
  f.cleanup()
})

test('programmatic focus checks focus-visible after styling, with pending checks cancelled on pointer input and cleanup', () => {
  const f = fixture()
  f.focus(); assert.equal(f.curious(), false)
  f.button.visible = true; f.flush(); assert.equal(f.curious(), true)
  f.focus(); f.doc.emit('pointerdown'); f.flush(); assert.equal(f.curious(), false)
  f.cleanup()
  for (const target of [f.doc, f.button]) for (const listeners of target.listeners.values()) assert.equal(listeners.size, 0)
  const pending = fixture()
  pending.focus(); assert.equal(pending.frames.size, 1)
  pending.cleanup(); assert.equal(pending.frames.size, 0)
})

test('mouse-triggered happy and shy reactions settle without an outside click; keyboard reactions retain curiosity', () => {
  for (const keyboard of [false, true]) for (const request of [1, 2]) {
    const f = fixture(), state = createMochiAnimation()
    for (let i = 0; i < 360; i++) advanceMochiAnimation(state, 1 / 60, false, 0, false)
    if (keyboard) f.doc.emit('keydown', { key: 'Tab' })
    else f.doc.emit('pointerdown', { pointerType: 'mouse' })
    f.focus(); f.button.emit('click')
    advanceMochiAnimation(state, 1 / 60, f.curious(), request, false)
    assert.equal(state.phase, request === 1 ? 'happy' : 'shy')
    for (let i = 0; i < 300; i++) advanceMochiAnimation(state, 1 / 60, f.curious(), request, false)
    assert.equal(state.phase, keyboard ? 'curious' : 'idle')
    assert.ok(keyboard ? state.pose.headZ > 0.12 : Math.abs(state.pose.headZ) < 0.03)
    assert.ok(keyboard ? state.pose.headX < -0.06 : Math.abs(state.pose.headX) < 0.03)
    assert.equal(f.doc.activeElement, f.button)
    f.cleanup()
  }
})

test('reduced motion preserves static keyboard curiosity and both static hello reactions', () => {
  const f = fixture(), state = createMochiAnimation()
  f.doc.emit('keydown', { key: 'Tab' }); f.focus()
  advanceMochiAnimation(state, 0, f.curious(), 0, true)
  assert.equal(state.phase, 'curious')
  for (const request of [1, 2]) {
    advanceMochiAnimation(state, 0, f.curious(), request, true)
    const pose = { ...state.pose }
    for (let i = 0; i < 120; i++) advanceMochiAnimation(state, 1 / 60, f.curious(), request, true)
    assert.deepEqual(state.pose, pose)
    assert.equal(state.pose.bounce, 0)
  }
  f.cleanup()
})
