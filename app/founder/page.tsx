import Image from 'next/image'
import Link from 'next/link'

export const metadata = {
  title: 'Founder | Hardline Privacy',
  description: 'Meet the founder of Hardline Privacy. Learn why Hardline was built to fight data brokers, protect digital exposure, and restore personal privacy in the AI era.'
}

const personSchema = {
  "@context": "https://schema.org",
  "@type": "Person",
  "name": "Founder of Hardline Privacy",
  "jobTitle": "Founder",
  "worksFor": {
    "@type": "Organization",
    "name": "Hardline Privacy"
  }
}

export default function Page() {
  return (
    <main className="container mx-auto px-6 py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }}
      />

      <header className="mb-10">
        <h1 className="text-3xl font-semibold">Meet the Founder</h1>
      </header>

      {/* HERO */}
      <section aria-labelledby="hero-heading" className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center mb-12">
        <div>
          <Image
            src="/images/founder.jpg"
            alt="Founder of Hardline Privacy"
            width={1200}
            height={800}
            className="rounded-lg object-cover w-full h-auto"
            loading="lazy"
            priority={false}
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        </div>

        <div>
          <h2 id="hero-heading" className="sr-only">Authority positioning</h2>
          <p className="text-lg font-medium mb-4">Hardline Privacy was built to fight back against data brokers, exposure threats, and digital exploitation.</p>

          <p className="mb-2">We defend personal sovereignty by reducing unnecessary exposure and restoring control over how personal data is used. Exposure risk is amplified by AI systems that scrape and repurpose public and semi-public records; we refuse to accept surveillance as the default.</p>

          <p>Hardline focuses on practical, repeatable removal work — operational privacy that lowers risk rather than abstract promises.</p>
        </div>
      </section>

      {/* WHY HARDLINE EXISTS */}
      <section aria-labelledby="why-heading" className="prose max-w-none mb-12">
        <h2 id="why-heading" className="text-2xl font-semibold mb-4">Why Hardline Exists</h2>
        <p>Data brokers have industrialized the collection and resale of personal information. That infrastructure increases the surface for doxxing, stalking, and targeted harassment by making sensitive details widely available and searchable.</p>
        <p>Modern AI systems can scrape public records and compile profiles at speed, turning small exposures into large risks. Many people live with a false sense of online privacy — a belief that information is isolated or benign when in reality it is aggregated and amplified.</p>
        <p>Hardline exists to provide structured removal systems and operational processes that reduce exposure, limit downstream reuse of personal data, and make removal repeatable and auditable.</p>
      </section>

      {/* EXPERIENCE AND PHILOSOPHY */}
      <section aria-labelledby="experience-heading" className="mb-12">
        <h2 id="experience-heading" className="text-2xl font-semibold mb-4">Experience and Philosophy</h2>
        <p>As a privacy strategist and exposure mitigation specialist, the founder focuses on building systems that scale removal work and reduce ongoing risk. The emphasis is on operational privacy: clear frameworks, checklists, and measurable steps that turn removal into execution rather than theory.</p>
        <p>Work centers on structured removal frameworks, practical solutions for reducing digital visibility, and tools that prioritize safety and follow-through. The approach is analytical and execution-driven, oriented around reducing real-world harm through repeatable processes.</p>
      </section>

      {/* CORE BELIEFS */}
      <section aria-labelledby="beliefs-heading" className="mb-12">
        <h2 id="beliefs-heading" className="text-2xl font-semibold mb-4">Core Beliefs</h2>
        <ul className="list-disc ml-6 space-y-2">
          <li>Privacy is power</li>
          <li>Exposure equals risk</li>
          <li>Automation should protect people, not profile them</li>
          <li>Removal must be structured, not reactive</li>
          <li>Digital footprint control is a modern necessity</li>
        </ul>
      </section>

      {/* CALL TO ACTION */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-4">Take Back Control of Your Digital Footprint</h2>
        <Link href="/removal" className="inline-block bg-black text-white px-5 py-3 rounded-md hover:opacity-95">Start Your Removal</Link>
      </section>
    </main>
  )
}