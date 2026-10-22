import { useCallback, useEffect, useRef } from 'react'
import { useSpring } from 'motion/react'
import { magneticOffset, tiltOffset } from './hoverMath'

export function usePointerEffect(mode: 'magnetic' | 'tilt', limit = 5) {
  const surface = useRef<HTMLDivElement | HTMLAnchorElement>(null)
  const setSurface = useCallback((node: HTMLDivElement | HTMLAnchorElement | null) => { surface.current = node }, [])
  const x = useSpring(0, { stiffness: 240, damping: 24, mass: 0.7 })
  const y = useSpring(0, { stiffness: 240, damping: 24, mass: 0.7 })
  useEffect(() => {
    const node = surface.current
    if (!node) return
    const preference = window.matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)')
    const home = () => { x.set(0); y.set(0) }
    const stop = () => { x.jump(0); y.jump(0) }
    const move = (event: Event) => {
      const pointer = event as PointerEvent
      if (pointer.pointerType !== 'mouse' || !pointer.isPrimary) { stop(); return }
      if (node.contains(document.activeElement)) { home(); return }
      const box = node.getBoundingClientRect()
      const offset = mode === 'magnetic'
        ? magneticOffset(pointer.clientX, pointer.clientY, box)
        : tiltOffset(pointer.clientX, pointer.clientY, box, limit)
      x.set(offset.x); y.set(offset.y)
    }
    // Measurements always use the unmoving target, never the animated child.
    const target = mode === 'magnetic' ? document : node
    const options = { passive: true } as const
    let attached = false
    const detach = () => {
      if (!attached) return
      target.removeEventListener('pointermove', move)
      node.removeEventListener('pointerleave', home)
      node.removeEventListener('pointercancel', stop)
      node.removeEventListener('focusin', stop)
      window.removeEventListener('blur', stop)
      window.removeEventListener('scroll', stop, true)
      window.removeEventListener('resize', stop)
      document.removeEventListener('visibilitychange', stop)
      document.removeEventListener('pointerleave', home)
      attached = false
    }
    const sync = () => {
      detach(); stop()
      if (!preference.matches) return
      target.addEventListener('pointermove', move, options)
      node.addEventListener('pointerleave', home, options)
      node.addEventListener('pointercancel', stop, options)
      node.addEventListener('focusin', stop)
      window.addEventListener('blur', stop)
      window.addEventListener('scroll', stop, { passive: true, capture: true })
      window.addEventListener('resize', stop)
      document.addEventListener('visibilitychange', stop)
      document.addEventListener('pointerleave', home, options)
      attached = true
    }
    preference.addEventListener('change', sync)
    sync()
    return () => { detach(); stop(); preference.removeEventListener('change', sync) }
  }, [mode, limit, x, y])
  return { setSurface, x, y }
}
