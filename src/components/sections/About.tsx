import { Icon } from '../Icon'
import { Reveal } from '../Reveal'
import { SectionHeading } from '../SectionHeading'

export function About() {
  return <section id="about" className="section container" aria-label="About me">
    <div className="about-grid"><Reveal anchorArrival="viewport" variant="heading"><SectionHeading number="01" eyebrow="ABOUT ME · BEHIND THE PIXELS" title="Curious mind. Caring maker." /></Reveal>
      <div className="about-copy"><div><Reveal anchorArrival="viewport" as="p" delay={0.1}>I’m Koustubh, a Computer Engineering student who enjoys connecting the dots between an idea and something you can actually use.</Reveal><Reveal anchorArrival="viewport" as="p" delay={0.18}>From the logic behind the scenes to the little details up front, I like creating things that feel thoughtful, useful, and a little delightful.</Reveal></div><div className="about-tags"><Reveal anchorArrival="viewport" as="span" delay={0.26}><Icon name="code" />Engineering student</Reveal><Reveal anchorArrival="viewport" as="span" delay={0.34}><Icon name="heart" />Thoughtful creations</Reveal></div></div>
    </div>
    <Reveal anchorArrival="viewport" className="about-note" variant="settle" delay={0.36}><Icon name="sparkle" /><p>Big ideas feel a little less big when you build them <strong>one little piece at a time.</strong></p><span aria-hidden="true">✧</span></Reveal>
  </section>
}
