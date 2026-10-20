import { Icon } from '../Icon'
import { Reveal } from '../Reveal'

export function Contact() {
  return <section id="contact" className="contact-section container" aria-label="Contact"><Reveal><div className="contact-card">
    <span className="contact-star" aria-hidden="true">✳</span><div className="contact-content"><p className="eyebrow"><span>04</span>THE NEXT LITTLE CONNECTION</p><h2>Good things start<br />with a simple hello.</h2><p>Have an idea, a question, or a shared curiosity?<br />This will be the place to connect.</p><div className="contact-status"><Icon name="mail" /><span>Contact details coming soon</span></div></div>
    <div className="contact-decoration" aria-hidden="true"><Icon name="mail" /><span>hello.</span></div><p className="contact-footnote">A little space for future conversations.</p>
  </div></Reveal></section>
}
