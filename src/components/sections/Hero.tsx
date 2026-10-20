import { Icon } from '../Icon'
import { Reveal } from '../Reveal'

// The .mochi-scene placeholder is the future dedicated 3D mascot mount location.
export function Hero() {
  return <section id="home" className="hero-section" aria-label="Introduction">
    <div className="hero-grain" aria-hidden="true" />
    <div className="container hero-grid">
      <Reveal className="hero-copy">
        <p className="welcome-pill"><span aria-hidden="true">✦</span>Welcome to my little corner of the internet</p>
        <h1>Hi there!<br />I'm <span>Koustubh!</span><span className="heading-star" aria-hidden="true">✳</span></h1>
        <p className="hero-description">A Computer Engineering student who loves turning big ideas into neat little creations.</p>
        <div className="hero-actions flex flex-wrap gap-3"><a className="button button-dark" href="#projects">Explore my work<Icon name="arrow" /></a><a className="button button-light" href="#about">A little about me<span aria-hidden="true">↗</span></a></div>
        <p className="hero-note"><span className="little-line" aria-hidden="true" />Made with curiosity & a little bit of magic.</p>
      </Reveal>
      <Reveal className="scene-wrapper" delay={0.15}>
        <div className="scene-orbit orbit-one" aria-hidden="true" /><div className="scene-orbit orbit-two" aria-hidden="true" />
        <span className="scene-spark sparkle-one" aria-hidden="true">✦</span><span className="scene-spark sparkle-two" aria-hidden="true">✧</span><span className="scene-dot" aria-hidden="true" />
        <div className="scene-tag"><span className="status-dot" />A little friend, coming soon</div>
        <div className="mochi-scene" role="img" aria-label="Reserved space for the future interactive 3D Mochi robot scene. No mascot is rendered yet.">
          <div className="scene-coordinate coord-top" aria-hidden="true">+</div><div className="scene-coordinate coord-bottom" aria-hidden="true">+</div>
          <div className="scene-content"><span className="scene-symbol" aria-hidden="true">✳</span><p>Saving a spot<br />for <strong>Mochi.</strong></p><span className="scene-label">FUTURE 3D SCENE</span></div>
          <div className="scene-platform" aria-hidden="true" />
        </div>
        <p className="mochi-caption">Tiny wheels. Big personality.<span>Meet my shy robot companion in a future update.</span></p>
      </Reveal>
    </div>
    <div className="hero-bottom container"><span>IDEAS → CODE → LITTLE CREATIONS</span><a href="#about">A little more below<span aria-hidden="true">↓</span></a><span className="hero-bottom-star" aria-hidden="true">✦</span></div>
  </section>
}
