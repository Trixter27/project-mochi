import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { motion, useInView, useScroll, useTransform } from 'motion/react'
import { HeroDecoration } from '../HeroDecoration'
import { heroAmbientRunning } from '../heroDecorations'
import { MagneticButton } from '../effects/PointerEffects'
import { Icon } from '../Icon'
import { Reveal } from '../Reveal'
import { HERO_DEPTH, HERO_SCROLL_RANGE } from '../animationPresets'
import { useReducedMotionPreference } from '../useReducedMotionPreference'
import { MochiBoundary, MochiFallback } from '../mascot/MochiFallback'
import '../mascot/MochiScene.css'

const MochiScene = lazy(() => import('../mascot/MochiScene').catch(error => {
  if (import.meta.env.DEV) console.error('[Mochi] Scene import failed', error)
  throw error
}))

export function Hero() {
  const hero = useRef<HTMLElement>(null)
  const reduced = useReducedMotionPreference()
  const inView = useInView(hero)
  const [pageVisible, setPageVisible] = useState(() => document.visibilityState === 'visible')
  useEffect(() => {
    const update = () => setPageVisible(document.visibilityState === 'visible')
    document.addEventListener('visibilitychange', update)
    return () => document.removeEventListener('visibilitychange', update)
  }, [])
  const { scrollYProgress } = useScroll({ target: hero, offset: ['start start', 'end start'] })
  const copyY = useTransform(scrollYProgress, HERO_SCROLL_RANGE, [0, HERO_DEPTH.copy])
  const nearY = useTransform(scrollYProgress, HERO_SCROLL_RANGE, [0, HERO_DEPTH.starNear])
  const farY = useTransform(scrollYProgress, HERO_SCROLL_RANGE, [0, HERO_DEPTH.starFar])
  const orbitY = useTransform(scrollYProgress, HERO_SCROLL_RANGE, [0, HERO_DEPTH.orbit])
  const outerY = useTransform(scrollYProgress, HERO_SCROLL_RANGE, [0, HERO_DEPTH.outerOrbit])
  const dotY = useTransform(scrollYProgress, HERO_SCROLL_RANGE, [0, HERO_DEPTH.dot])

  return <section ref={hero} id="home" className="hero-section" data-ambient-running={heroAmbientRunning(inView, pageVisible, reduced)} data-reduced-motion={reduced} aria-label="Introduction">
    <div className="hero-grain" aria-hidden="true" />
    <HeroDecoration kind="ring" className="hero-copy-ring" y={reduced ? 0 : orbitY} />
    <HeroDecoration kind="pebble" className="hero-copy-pebble" y={reduced ? 0 : outerY} />
    <HeroDecoration kind="mint" className="hero-edge-mint" y={reduced ? 0 : dotY} />
    <div className="container hero-grid">
      <motion.div className="hero-copy" style={{ y: reduced ? 0 : copyY }}><Reveal>
        <p className="welcome-pill"><span aria-hidden="true">✦</span>Welcome to my little corner of the internet</p>
        <h1>Hi there!<br />I'm <span>Koustubh!</span><span className="heading-star" aria-hidden="true"><span className="heading-star-float">✳</span></span></h1>
        <p className="hero-description">A Computer Engineering student who loves turning big ideas into neat little creations.</p>
        <div className="hero-actions flex flex-wrap gap-3"><MagneticButton className="button button-dark" href="#projects">Explore my work<Icon name="arrow" /></MagneticButton><MagneticButton className="button button-light" href="#about">A little about me<span aria-hidden="true">↗</span></MagneticButton></div>
        <p className="hero-note"><span className="little-line" aria-hidden="true" />Made with curiosity & a little bit of magic.</p>
      </Reveal></motion.div>
      <Reveal className="scene-wrapper" delay={0.15}>
        <motion.div className="scene-orbit orbit-one" style={{ y: reduced ? 0 : orbitY }} aria-hidden="true" /><motion.div className="scene-orbit orbit-two" style={{ y: reduced ? 0 : outerY }} aria-hidden="true" />
        <HeroDecoration kind="star" className="scene-spark sparkle-one" y={reduced ? 0 : nearY} />
        <HeroDecoration kind="burst" className="scene-spark sparkle-two" y={reduced ? 0 : farY} />
        <HeroDecoration kind="peach" className="scene-dot" y={reduced ? 0 : dotY} />
        <div className="scene-tag"><span className="status-dot" />A little friend, happy you’re here</div>
        <div className="mochi-scene" role="group" aria-label="Meet Mochi, your shy single-wheel robot companion">
          <div className="scene-coordinate coord-top" aria-hidden="true">+</div><div className="scene-coordinate coord-bottom" aria-hidden="true">+</div>
          <MochiBoundary label="Scene loader"><Suspense fallback={<MochiFallback loading />}><MochiScene /></Suspense></MochiBoundary>
          <div className="scene-platform" aria-hidden="true" />
        </div>
        <p className="mochi-caption">One tiny wheel. Big personality.<span>A little shy at first. Say hello and watch him warm up.</span></p>
      </Reveal>
    </div>
    <div className="hero-bottom container"><span>IDEAS → CODE → LITTLE CREATIONS</span><a href="#about">A little more below<span aria-hidden="true">↓</span></a><span className="hero-bottom-star" aria-hidden="true">✦</span></div>
  </section>
}
