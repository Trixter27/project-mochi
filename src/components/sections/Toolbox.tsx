import { Reveal } from '../Reveal'
import { SectionHeading } from '../SectionHeading'

const tools = [
  { name: 'React', description: 'Reusable little building blocks', mark: '⚛', className: 'blue' },
  { name: 'TypeScript', description: 'A little more clarity in every line', mark: 'TS', className: 'lavender' },
  { name: 'Vite', description: 'A speedy development companion', mark: 'ϟ', className: 'peach' },
  { name: 'Tailwind CSS', description: 'Bringing the soft details to life', mark: '≈', className: 'mint' },
  { name: 'Motion', description: 'Small movements, extra delight', mark: 'M', className: 'pink' },
]
export function Toolbox() {
  return <section id="toolbox" className="toolbox-section" aria-label="Toolbox"><div className="container section">
    <Reveal className="section-title-row"><SectionHeading number="02" eyebrow="THE TOOLBOX" title="A few of my building blocks." /><p className="section-side-note">The technologies bringing<br />this little corner to life.</p></Reveal>
    <ul className="tool-grid">{tools.map((tool, index) => <Reveal as="li" className="tool-reveal" variant="card" delay={index * 0.055} key={tool.name}><div className="tool-card"><span className={`tool-mark ${tool.className}`} aria-hidden="true">{tool.mark}</span><h3>{tool.name}</h3><p>{tool.description}</p></div></Reveal>)}</ul>
  </div></section>
}
