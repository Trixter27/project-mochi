import { Icon, type IconName } from '../Icon'
import { Reveal } from '../Reveal'
import { SectionHeading } from '../SectionHeading'

const contributions: { icon: IconName; title: string }[] = [{ icon: 'code', title: 'Backend Development' }, { icon: 'layers', title: 'System Integration' }, { icon: 'window', title: 'End-to-End Testing' }]
export function Projects() {
  return <section id="projects" className="section container" aria-label="Projects"><Reveal>
    <div className="section-title-row"><SectionHeading number="03" eyebrow="SELECTED WORK" title="An idea turned into a creation." /><span className="handwritten">Built with purpose<span aria-hidden="true">↙</span></span></div>
    <article className="project-card">
      <div className="project-preview"><div className="preview-top"><span aria-hidden="true"><i /><i /><i /></span><span>QUESTORIAA / PREVIEW</span></div><div className="screenshot-placeholder"><span className="placeholder-icon"><Icon name="window" /></span><h3>A little window into Questoriaa</h3><p>Project screenshot coming soon</p><span className="placeholder-label">SCREENSHOT PLACEHOLDER</span></div><span className="preview-corner" aria-hidden="true">✦</span></div>
      <div className="project-content"><span className="project-badge"><span className="status-dot" />Latest Project</span><h3>Questoriaa<span aria-hidden="true">✧</span></h3><p>An adaptive, gamified learning platform that makes studying more engaging through XP, mastery tracking, and personalized learning.</p><div className="project-tags"><span>Adaptive learning</span><span>Gamification</span></div><h4>MY CONTRIBUTIONS</h4><ul className="contributions">{contributions.map(item => <li key={item.title}><Icon name={item.icon} />{item.title}<span aria-hidden="true">✓</span></li>)}</ul></div>
    </article>
  </Reveal></section>
}
