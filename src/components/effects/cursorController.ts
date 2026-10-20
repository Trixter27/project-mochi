export const RIPPLE_LIMIT = 4
export const SPARKLE_COUNT = 6

const CONTROLS = 'a[href], button, summary, input[type="button"], input[type="submit"], input[type="reset"], [role="button"], [role="link"]'
// Leave native editing, embedded documents, and top-layer UI cursors alone.
const NATIVE_CURSOR = 'input:not([type="button"]):not([type="submit"]):not([type="reset"]), textarea, select, [contenteditable]:not([contenteditable="false"]), iframe, dialog, [role="dialog"], [popover]'

function elementTarget(target: EventTarget | null): Element | null {
  return target && 'closest' in target && typeof target.closest === 'function' ? target as Element : null
}

function interactive(target: Element | null): boolean {
  const control = target?.closest(CONTROLS)
  return !!control && !control.matches(':disabled') && !control.closest('[inert], [aria-disabled="true"]')
}

/** One delegated controller and RAF loop; all click effects reuse the fixed DOM pool. */
export function installMagicCursor(layer: HTMLElement): () => void {
  const document = layer.ownerDocument
  const view = document.defaultView
  const dot = layer.querySelector<HTMLElement>('[data-cursor-dot]')
  const ring = layer.querySelector<HTMLElement>('[data-cursor-ring]')
  const aura = layer.querySelector<HTMLElement>('[data-cursor-aura]')
  if (!view || !dot || !ring || !aura) return () => {}
  // Non-null constants keep nested frame/event callbacks independent of React refs.
  const window = view, center = dot, circle = ring, glow = aura
  const html = document.documentElement
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
  const fine = window.matchMedia('(any-hover: hover) and (any-pointer: fine)')
  const forced = window.matchMedia('(forced-colors: active)')
  const bursts = Array.from(layer.querySelectorAll<HTMLElement>('[data-cursor-burst]'))
    .slice(0, RIPPLE_LIMIT).map((node, index) => ({
      node, index, start: -1,
      ripple: node.querySelector<HTMLElement>('[data-cursor-ripple]'),
      sparkles: Array.from(node.querySelectorAll<HTMLElement>('[data-cursor-sparkle]')).slice(0, SPARKLE_COUNT),
    }))
  let frame: number | null = null, previousTime: number | null = null
  let targetX = 0, targetY = 0, x = 0, y = 0
  let targetOpacity = 0, opacity = 0, targetScale = 1, scale = 1
  let hasPosition = false, disposed = false, failed = false
  let nextBurst = 0, pulseStart = -1

  const allowed = () => !failed && !reduced.matches && !forced.matches && document.visibilityState === 'visible'
  const restoreNative = () => { delete html.dataset.magicCursorActive }
  const place = (node: HTMLElement, px: number, py: number, size = 1) => {
    node.style.transform = `translate3d(${px}px, ${py}px, 0) translate(-50%, -50%) scale(${size})`
  }

  function reset() {
    // Restore native behavior before touching any optional visual nodes.
    restoreNative()
    if (frame !== null) window.cancelAnimationFrame(frame)
    frame = previousTime = null
    hasPosition = false
    opacity = targetOpacity = 0
    scale = targetScale = 1
    pulseStart = -1
    center.style.opacity = circle.style.opacity = glow.style.opacity = '0'
    for (const burst of bursts) { burst.start = -1; burst.node.style.opacity = '0' }
  }

  function failSafe() {
    failed = true
    restoreNative()
    // A detached/misbehaving visual must never leave the native cursor hidden.
    try { reset() } catch { /* Native cursor is already restored. */ }
  }

  function wake() {
    if (disposed || frame !== null || !allowed()) return
    previousTime = null
    try { frame = window.requestAnimationFrame(tick) } catch { failSafe() }
  }

  function tick(time: number) {
    frame = null
    if (disposed || !allowed()) { restoreNative(); return }
    try {
      const dt = previousTime === null ? 1 / 60 : Math.min((time - previousTime) / 1000, 0.05)
      previousTime = time
      const blend = 1 - Math.exp(-18 * dt)
      x += (targetX - x) * blend
      y += (targetY - y) * blend
      opacity += (targetOpacity - opacity) * blend
      scale += (targetScale - scale) * blend
      const pulseAge = pulseStart < 0 ? 1 : Math.max(0, (time - pulseStart) / 240)
      const pulsing = pulseAge < 1
      const contraction = pulsing ? Math.sin(pulseAge * Math.PI) * 0.3 : 0
      if (!pulsing) pulseStart = -1
      const settling = Math.abs(targetX - x) + Math.abs(targetY - y) > 0.1
        || Math.abs(targetOpacity - opacity) > 0.001 || Math.abs(targetScale - scale) > 0.001
      if (!settling) { x = targetX; y = targetY; opacity = targetOpacity; scale = targetScale }
      place(circle, x, y, scale - contraction)
      place(glow, x, y, scale)
      circle.style.opacity = String(opacity * 0.9)
      glow.style.opacity = String(opacity * (targetScale > 1 ? 0.8 : 0.6))

      // The dot was positioned synchronously by the pointer event. Hide the arrow
      // only after a successful frame and confirmation that cursor CSS is loaded.
      if (hasPosition && fine.matches && !html.dataset.magicCursorActive) {
        const style = window.getComputedStyle(layer)
        const dotStyle = window.getComputedStyle(center)
        if (style.getPropertyValue('--magic-cursor-ready').trim() === '1'
          && style.display !== 'none' && style.visibility !== 'hidden'
          && dotStyle.display !== 'none' && dotStyle.visibility !== 'hidden'
          && Number.parseFloat(dotStyle.width) > 0 && Number.parseFloat(dotStyle.height) > 0
          && Number.parseFloat(dotStyle.opacity) > 0) {
          html.dataset.magicCursorActive = 'true'
        }
      }

      let bursting = false
      for (const burst of bursts) {
        if (burst.start < 0) continue
        const progress = Math.max(0, Math.min((time - burst.start) / 620, 1))
        if (progress >= 1) { burst.start = -1; burst.node.style.opacity = '0'; continue }
        bursting = true
        burst.node.style.opacity = '1'
        if (burst.ripple) {
          const rippleFade = Math.max(0, (progress - 0.16) / 0.84)
          burst.ripple.style.opacity = String(0.9 * (1 - rippleFade) ** 1.2)
          place(burst.ripple, 0, 0, 0.55 + (1 - (1 - progress) ** 3) * 2.65)
        }
        const travel = 1 - (1 - progress) ** 3
        // Stay full-size and opaque for the first 260ms of outward travel.
        const fade = Math.max(0, (progress - 0.42) / 0.58)
        const sparkleOpacity = 1 - fade * fade * (3 - 2 * fade)
        burst.sparkles.forEach((sparkle, index) => {
          const angle = index * Math.PI * 2 / SPARKLE_COUNT + burst.index * 0.35
          const distance = 30 + travel * (index % 2 ? 38 : 28)
          sparkle.style.opacity = String(sparkleOpacity)
          sparkle.style.transform = `translate3d(${Math.cos(angle) * distance}px, ${Math.sin(angle) * distance}px, 0) translate(-50%, -50%) rotate(${angle + progress}rad) scale(${1 - fade * 0.6})`
        })
      }
      if (settling || pulsing || bursting) frame = window.requestAnimationFrame(tick)
    } catch { failSafe() }
  }

  function hideFollow() {
    restoreNative()
    hasPosition = false
    center.style.opacity = '0'
    targetOpacity = 0
    targetScale = 1
    if (opacity > 0) wake()
  }

  function pointer(event: PointerEvent) {
    if (!allowed()) return
    try {
      const target = elementTarget(event.target)
      if (!fine.matches || event.pointerType !== 'mouse' || target?.closest(NATIVE_CURSOR)) { hideFollow(); return }
      if (event.isPrimary === false) return
      targetX = event.clientX
      targetY = event.clientY
      // Exact hit point: the dot never waits for the trailing ring's RAF interpolation.
      place(center, targetX, targetY)
      center.style.opacity = '1'
      if (!hasPosition) { x = targetX; y = targetY; hasPosition = true }
      targetScale = interactive(target) ? 1.3 : 1
      targetOpacity = 1
      wake()
    } catch { failSafe() }
  }

  function leave(event: PointerEvent) { if (event.relatedTarget === null) hideFollow() }

  function click(event: MouseEvent) {
    // One click listener handles mouse and synthesized touch clicks exactly once.
    // No control-only filter: backgrounds, cards, decorations, and Canvas all qualify.
    // click uses PointerEvent defaults (including isPrimary=false). button, not
    // isPrimary, identifies the primary-button activation; keyboard clicks stay excluded.
    if (!allowed() || event.button !== 0) return
    if (event.detail === 0) { hideFollow(); return }
    try {
      if (!bursts.length) return
      const burst = bursts[nextBurst++ % bursts.length]
      if (!burst) return
      burst.node.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0)`
      burst.start = window.performance.now()
      if (hasPosition) pulseStart = burst.start
      wake()
    } catch { failSafe() }
  }

  function preferences() {
    reset()
    layer.dataset.followEnabled = String(fine.matches && !reduced.matches && !forced.matches)
  }

  // Passive capture observes input, including Mochi's button, without consuming it.
  const passive = { passive: true, capture: true }
  document.addEventListener('pointermove', pointer, passive)
  document.addEventListener('pointerover', pointer, passive)
  document.addEventListener('pointerdown', pointer, passive)
  document.addEventListener('pointerout', leave, passive)
  document.addEventListener('pointercancel', hideFollow, passive)
  document.addEventListener('click', click, passive)
  document.addEventListener('keydown', hideFollow, passive)
  document.addEventListener('visibilitychange', reset)
  window.addEventListener('blur', reset)
  reduced.addEventListener('change', preferences)
  fine.addEventListener('change', preferences)
  forced.addEventListener('change', preferences)
  preferences()

  return () => {
    disposed = true
    reset()
    document.removeEventListener('pointermove', pointer, true)
    document.removeEventListener('pointerover', pointer, true)
    document.removeEventListener('pointerdown', pointer, true)
    document.removeEventListener('pointerout', leave, true)
    document.removeEventListener('pointercancel', hideFollow, true)
    document.removeEventListener('click', click, true)
    document.removeEventListener('keydown', hideFollow, true)
    document.removeEventListener('visibilitychange', reset)
    window.removeEventListener('blur', reset)
    reduced.removeEventListener('change', preferences)
    fine.removeEventListener('change', preferences)
    forced.removeEventListener('change', preferences)
  }
}
