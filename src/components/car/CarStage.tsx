import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { useInView } from 'motion/react'
import { CarBoundary, CarFallback } from './CarFallback'
import { useReducedMotionPreference } from '../useReducedMotionPreference'
import './CarScene.css'

const CarScene = lazy(() => import('./CarScene'))

export function CarStage() {
  const stage = useRef<HTMLDivElement>(null)
  const entered = useInView(stage, { once: true, margin: '160px 0px' })
  const reduced = useReducedMotionPreference()
  const [visible, setVisible] = useState(false)
  const [skipped, setSkipped] = useState(false)
  const [pageVisible, setPageVisible] = useState(() => document.visibilityState === 'visible')
  useEffect(() => {
    const visibility = () => setPageVisible(document.visibilityState === 'visible')
    document.addEventListener('visibilitychange', visibility)
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.intersectionRatio >= 0.6) setVisible(true)
      else if (!entry.isIntersecting) setVisible(false)
      // A rapid anchor jump can skip the activation threshold entirely.
      if (entry.boundingClientRect.bottom <= 0) setSkipped(true)
    }, { threshold: [0, 0.6] })
    if (stage.current) observer.observe(stage.current)
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', visibility) }
  }, [])
  return <div ref={stage} className="car-stage" role="group" aria-label="A coral-red toy sports coupe with an indigo cabin, bright headlights, mint details, and four chunky lavender-accented wheels. It makes a playful entrance and parks on the oval platform.">
    <div className="car-stage-viewport">
      <CarBoundary><Suspense fallback={<CarFallback loading />}>
        {entered ? <CarScene visible={visible} pageVisible={pageVisible} skipped={skipped} reduced={reduced} /> : <CarFallback loading />}
      </Suspense></CarBoundary>
    </div>
  </div>
}
