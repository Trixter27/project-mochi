import { useEffect, useState } from 'react'

const links = [['home', 'Home'], ['about', 'About'], ['toolbox', 'Toolbox'], ['projects', 'Projects'], ['contact', 'Contact']] as const

export function Navigation() {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState('home')
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) if (entry.isIntersecting) setActive(entry.target.id)
    }, { rootMargin: '-15% 0px -55% 0px', threshold: 0 })
    links.forEach(([id]) => { const section = document.getElementById(id); if (section) observer.observe(section) })
    return () => observer.disconnect()
  }, [])
  return <header className="nav-shell">
    <nav className="navigation" aria-label="Main navigation" onKeyDown={(event) => { if (event.key === 'Escape') { setOpen(false); document.getElementById('menu-toggle')?.focus() } }}>
      <a className="brand" href="#home" onClick={() => setOpen(false)}><span className="brand-mark" aria-hidden="true">m.</span>Project Mochi<span className="brand-star" aria-hidden="true">✦</span></a>
      <button id="menu-toggle" className="menu-toggle" aria-expanded={open} aria-controls="nav-links" onClick={() => setOpen(!open)} type="button">{open ? 'Close' : 'Menu'} <span aria-hidden="true">{open ? '×' : '☰'}</span></button>
      <ul id="nav-links" className={`nav-links ${open ? 'is-open' : ''}`}>
        {links.map(([id, label]) => <li key={id}><a href={`#${id}`} aria-current={active === id ? 'location' : undefined} className={id === 'contact' ? 'nav-contact' : ''} onClick={() => { setOpen(false); setActive(id) }}>{label}{id === 'contact' && <span aria-hidden="true">↗</span>}</a></li>)}
      </ul>
    </nav>
  </header>
}
