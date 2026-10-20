import { Icon } from '../Icon'
import { Reveal } from '../Reveal'
import { SectionHeading } from '../SectionHeading'

export function About() {
  return <section id="about" className="section container" aria-label="About me"><Reveal>
    <div className="about-grid"><SectionHeading number="01" eyebrow="ABOUT ME · BEHIND THE PIXELS" title="Curious mind. Caring maker." />
      <div className="about-copy"><p>I’m Koustubh, a Computer Engineering student who enjoys connecting the dots between an idea and something you can actually use.</p><p>From the logic behind the scenes to the little details up front, I like creating things that feel thoughtful, useful, and a little delightful.</p><div className="about-tags"><span><Icon name="code" />Engineering student</span><span><Icon name="heart" />Thoughtful creations</span></div></div>
    </div>
    <div className="about-note"><Icon name="sparkle" /><p>Big ideas feel a little less big when you build them <strong>one little piece at a time.</strong></p><span aria-hidden="true">✧</span></div>
  </Reveal></section>
}
