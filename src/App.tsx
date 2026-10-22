import { MotionConfig } from 'motion/react'
import { Navigation } from './components/Navigation'
import { Hero } from './components/sections/Hero'
import { About } from './components/sections/About'
import { Toolbox } from './components/sections/Toolbox'
import { Projects } from './components/sections/Projects'
import { Contact } from './components/sections/Contact'
import { MagicCursor } from './components/effects/MagicCursor'
import { ScrollProgress } from './components/effects/ScrollProgress'
import './App.css'

export default function App() {
  return <MotionConfig reducedMotion="user">
    <MagicCursor />
    <ScrollProgress />
    <a className="skip-link" href="#main">Skip to content</a>
    <Navigation />
    <main id="main"><Hero /><About /><Toolbox /><Projects /><Contact /></main>
    <footer className="site-footer container">
      <a className="brand" href="#home"><span className="brand-mark" aria-hidden="true">m.</span>Project Mochi<span className="footer-dot" aria-hidden="true">✦</span></a>
      <p>A little curiosity. A lot of care.</p>
      <a href="#home">Back to top <span aria-hidden="true">↑</span></a>
    </footer>
  </MotionConfig>
}
