import { Icon, type IconName } from '../Icon'
import { TiltCard } from '../effects/PointerEffects'
import { Reveal } from '../Reveal'
import { SectionHeading } from '../SectionHeading'

const contributions: { icon: IconName; title: string }[] = [{ icon: 'code', title: 'Backend Development' }, { icon: 'layers', title: 'System Integration' }, { icon: 'window', title: 'End-to-End Testing' }]
export function Projects() {
  return <section id="projects" className="section container" aria-label="Projects">
    <Reveal className="section-title-row" variant="heading"><SectionHeading number="03" eyebrow="SELECTED WORK" title="An idea turned into a creation." /><span className="handwritten">Built with purpose<span aria-hidden="true">↙</span></span></Reveal>
    <Reveal as="article" variant="featured"><TiltCard limit={3.5}><div className="project-card">
      <div className="project-preview"><div className="preview-top"><span aria-hidden="true"><i /><i /><i /></span><span>QUESTORIAA / PREVIEW</span></div><div className="screenshot-placeholder"><span className="placeholder-icon"><Icon name="window" /></span><h3>A little window into Questoriaa</h3><p>Project screenshot coming soon</p><span className="placeholder-label">SCREENSHOT PLACEHOLDER</span></div><span className="preview-corner" aria-hidden="true">✦</span></div>
      <div className="project-content"><Reveal as="span" className="project-badge" variant="fade" delay={0.1}><span className="status-dot" />Latest Project</Reveal><Reveal as="h3" delay={0.16}>Questoriaa<span aria-hidden="true">✧</span></Reveal><Reveal as="p" variant="fade" delay={0.22}>An adaptive, gamified learning platform that makes studying more engaging through XP, mastery tracking, and personalized learning.</Reveal><Reveal className="project-tags" variant="fade" delay={0.28}><span>Adaptive learning</span><span>Gamification</span></Reveal><Reveal as="h4" variant="fade" delay={0.32}>MY CONTRIBUTIONS</Reveal><Reveal as="ul" className="contributions" variant="fade" delay={0.38}>{contributions.map(item => <li key={item.title}><Icon name={item.icon} />{item.title}<span aria-hidden="true">✓</span></li>)}</Reveal></div>
    </div></TiltCard></Reveal>
  </section>
}
