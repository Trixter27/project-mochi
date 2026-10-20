import { useEffect, useRef } from 'react'
import { installMagicCursor, RIPPLE_LIMIT, SPARKLE_COUNT } from './cursorController'
import './MagicCursor.css'

export function MagicCursor() {
  const layer = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (layer.current) return installMagicCursor(layer.current)
  }, [])

  return <div ref={layer} className="magic-cursor" aria-hidden="true">
    <span className="magic-cursor-aura" data-cursor-aura />
    <span className="magic-cursor-ring" data-cursor-ring />
    <span className="magic-cursor-dot" data-cursor-dot />
    {Array.from({ length: RIPPLE_LIMIT }, (_, index) => <span key={index} className="magic-cursor-burst" data-cursor-burst>
      <span className="magic-click-ripple" data-cursor-ripple />
      {Array.from({ length: SPARKLE_COUNT }, (_, sparkle) => <span key={sparkle} className="magic-click-sparkle" data-cursor-sparkle />)}
    </span>)}
  </div>
}
