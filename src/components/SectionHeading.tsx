export function SectionHeading({ number, eyebrow, title }: { number: string; eyebrow: string; title: string }) {
  return <div className="section-heading"><p className="eyebrow"><span>{number}</span>{eyebrow}</p><h2>{title}</h2></div>
}
