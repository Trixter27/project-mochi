import { Icon } from '../Icon'
import { Reveal } from '../Reveal'

export function Contact() {
  return <section id="contact" className="contact-section container" aria-label="Contact"><div className="contact-card">
    <Reveal as="span" className="contact-star" variant="fade" delay={0.3} aria-hidden={true}>✳</Reveal><div className="contact-content"><Reveal variant="heading"><p className="eyebrow"><span>04</span>THE NEXT LITTLE CONNECTION</p><h2>Good things start<br />with a simple hello.</h2></Reveal><Reveal as="p" variant="fade" delay={0.14}>Have an idea, a question, or a shared curiosity?<br />This will be the place to connect.</Reveal><Reveal className="contact-status" delay={0.26}><Icon name="mail" /><span>Contact details coming soon</span></Reveal></div>
    <div className="contact-decoration" aria-hidden="true"><Icon name="mail" /><span>hello.</span></div><Reveal as="p" className="contact-footnote" variant="fade" delay={0.38}>A little space for future conversations.</Reveal>
  </div></section>
}
