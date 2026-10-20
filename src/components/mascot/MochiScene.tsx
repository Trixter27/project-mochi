import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { useReducedMotion } from 'motion/react'
import MochiRobot from './MochiRobot'
import { MochiBoundary, MochiFallback } from './MochiFallback'

/** Own the context listener alongside the renderer, including StrictMode cleanup. */
function ContextGuard({ onReady, onFailure }: { onReady: () => void; onFailure: () => void }) {
  const gl = useThree(state => state.gl)
  useEffect(() => {
    const canvas = gl.domElement
    const lost = (event: Event) => {
      event.preventDefault()
      if (import.meta.env.DEV) console.warn('[Mochi] WebGL context lost')
      onFailure()
    }
    canvas.addEventListener('webglcontextlost', lost)
    onReady()
    return () => canvas.removeEventListener('webglcontextlost', lost)
  }, [gl, onReady, onFailure])
  return null
}

function CanvasFallback() {
  // R3F mounts this as HTML inside <canvas>, even when WebGL works.
  // Mounting fallback content is not a renderer failure or capability check.
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.info('[Mochi] WebGL Canvas fallback', 'HTML fallback content mounted; this alone does not mean WebGL is unavailable.')
    }
  }, [])
  return <MochiFallback />
}

export default function MochiScene() {
  const root = useRef<HTMLDivElement>(null)
  const descriptionId = useId()
  const reducedMotion = !!useReducedMotion()
  const [entered, setEntered] = useState(false)
  const [inView, setInView] = useState(false)
  const [pageVisible, setPageVisible] = useState(true)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const [request, setRequest] = useState(0)
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  const onFailure = useCallback(() => { setFailed(true) }, [])
  const onReady = useCallback(() => { setReady(true) }, [])

  useEffect(() => {
    const visibility = () => setPageVisible(document.visibilityState === 'visible')
    visibility()
    document.addEventListener('visibilitychange', visibility)
    const element = root.current
    const observer = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(([entry]) => {
      setInView(entry.isIntersecting)
      if (entry.isIntersecting) setEntered(true)
    }, { threshold: 0.05 })
    if (element && observer) observer.observe(element)
    else { setInView(true); setEntered(true) }
    return () => {
      observer?.disconnect()
      document.removeEventListener('visibilitychange', visibility)
    }
  }, [])

  const active = inView && pageVisible
  const status = failed ? 'The 3D scene is unavailable.' : !ready ? 'Mochi is getting ready…'
    : request > 0 ? (request % 2 ? 'Mochi sends you a happy little wave!' : 'A shy wave, just for you.')
      : 'A tiny robot. A friendly hello.'

  return <div ref={root} className="mascot-root" onPointerEnter={event => { if (event.pointerType !== 'touch') setHovered(true) }} onPointerLeave={() => setHovered(false)}>
    <p id={descriptionId} className="mascot-sr-only">Mochi is a shy, pastel blue 3D robot with a big rounded head, expressive eyes, pink cheeks, a mint antenna, long waving arms, and exactly one small central wheel. Use Say hello to make him react.</p>
    <div className="mascot-viewport" aria-hidden="true">
      {failed ? <MochiFallback /> : entered ? <MochiBoundary label="3D Canvas" onFailure={onFailure}>
        <Canvas
          camera={{ position: [2.65, 2.2, 6.4], fov: 30, near: 0.1, far: 30 }}
          dpr={[1, 1.5]}
          frameloop={active && !reducedMotion ? 'always' : 'demand'}
          gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }}
          fallback={<CanvasFallback />}
          onCreated={({ camera, gl }) => {
            camera.lookAt(0, 1.3, 0)
            gl.setClearColor(0x000000, 0)
            if (import.meta.env.DEV) {
              const context = gl.getContext()
              console.info('[Mochi] Canvas initialized', {
                contextAttributes: context.getContextAttributes(),
                contextLost: context.isContextLost(),
              })
            }
          }}
        >
          <ambientLight intensity={1.5} />
          <directionalLight position={[-3, 5, 5]} intensity={2.5} />
          <directionalLight position={[4, 2, -2]} intensity={0.8} color="#DCCBF5" />
          <MochiRobot active={active} curious={hovered || focused} request={request} reducedMotion={reducedMotion} />
          <ContextGuard onReady={onReady} onFailure={onFailure} />
        </Canvas>
      </MochiBoundary> : <MochiFallback loading />}
    </div>
    <div className="mascot-interaction">
      <button type="button" className="mascot-hello" aria-describedby={descriptionId} disabled={!ready || failed} onClick={() => setRequest(value => value + 1)} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}>
        <span aria-hidden="true">✦</span> Say hello to Mochi
      </button>
      <span className="mascot-sr-only" role="status" aria-live="polite" aria-atomic="true">{status}</span>
    </div>
  </div>
}
