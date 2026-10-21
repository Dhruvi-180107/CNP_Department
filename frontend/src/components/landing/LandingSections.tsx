import type { ReactNode } from 'react';
import { Reveal } from './Reveal';

function Section({ id, eyebrow, title, children, tone = 'light' }: { id: string; eyebrow: string; title: string; children: ReactNode; tone?: 'light' | 'tint' | 'dark' }) {
  return (
    <section className={`landing-section landing-section-${tone}`} id={id}>
      <div className="landing-container">
        <Reveal>
          <p className="landing-eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
        </Reveal>
        {children}
      </div>
    </section>
  );
}

const SMC_POINTS = [
  { title: 'Learning beyond the syllabus', text: 'Clubs let students practise leadership, teamwork and creativity on things they care about.' },
  { title: 'Run by students', text: 'Members plan, organise and own their events, which builds real responsibility.' },
  { title: 'A community on campus', text: 'Shared interests, from dance and music to puzzles and tech, bring people together.' },
];

const GUIITAR_POINTS = [
  { title: 'Shared resources', text: 'Infrastructure, cutting-edge laboratories and equipment made available to teams.' },
  { title: 'Mentorship and networking', text: 'Tailored mentorship and an extended network to help ideas grow.' },
  { title: 'Business support', text: 'Co-working space, business support and Intellectual Property Protection.' },
];

const HELP_STEPS = [
  { title: 'Bring everything together', text: 'Clubs, projects, members and events live in one platform instead of scattered chats and sheets.' },
  { title: 'Coordinate people', text: 'Faculty coordinators, team leaders and members each see what they need to act on.' },
  { title: 'Handle requests and resources', text: 'Material requests and inventory are tracked so project teams are not left waiting.' },
  { title: 'Keep everyone informed', text: 'Events and notifications keep every club and project on the same page.' },
];

export function LandingSections() {
  return (
    <>
      <Section id="about" eyebrow="About the platform" title="What the CNP Department website is for">
        <Reveal delay={80}>
          <p className="landing-lead">
            The CNP Department website is the working home of two student communities at GSFC University: the Student Managed Clubs and the GUIITAR Projects. Students, faculty coordinators and project teams sign in to manage clubs, projects, events, notifications and material requests in one place.
          </p>
        </Reveal>
      </Section>

      <Section id="clubs" eyebrow="Student Managed Clubs" title="Clubs that students run themselves" tone="tint">
        <Reveal delay={80}>
          <p className="landing-lead">
            Student Managed Clubs (SMCs) are interest-based groups planned and led by students, with a faculty coordinator guiding them. They matter because they turn campus life into practice: students lead, organise and collaborate outside the classroom.
          </p>
        </Reveal>
        <div className="landing-cards">
          {SMC_POINTS.map((p, i) => (
            <Reveal key={p.title} delay={120 + i * 90} className="landing-card">
              <h3>{p.title}</h3>
              <p>{p.text}</p>
            </Reveal>
          ))}
        </div>
      </Section>

      <Section id="projects" eyebrow="GUIITAR Projects" title="Ideas with the backing to become real">
        <Reveal delay={80}>
          <p className="landing-lead">
            GU Incubation Innovation Technology and Applied Research (GUIITAR) Council has been established by GSFC University (GSFCU) at Vadodara, dedicated to promoting and supporting creativity, innovation and the spirit of enterprise among young minds and innovators. GUIITAR Council is registered under section 8 of the Companies Act, 2013.
          </p>
          <p className="landing-lead">
            GUIITAR Council is committed to nurturing and developing startups through shared resources, infrastructure, cutting-edge laboratories, tailored mentorship, extended networking and other standard services such as co-working space, equipment, business support, and Intellectual Property Protection.
          </p>
        </Reveal>
        <div className="landing-cards">
          {GUIITAR_POINTS.map((p, i) => (
            <Reveal key={p.title} delay={120 + i * 90} className="landing-card">
              <h3>{p.title}</h3>
              <p>{p.text}</p>
            </Reveal>
          ))}
        </div>
        <Reveal delay={200}>
          <blockquote className="landing-vision">
            <strong>Vision</strong>
            To nurture young minds by providing a platform to explore and showcase their potential, along with the generation of high added value, with a focus on innovation as well as marketing of technologies for the betterment of the Scientific, Engineering, Science &amp; Management Communities and the Society.
          </blockquote>
        </Reveal>
      </Section>

      <Section id="how" eyebrow="How the department helps" title="Managing clubs and projects, together" tone="dark">
        <ol className="landing-steps">
          {HELP_STEPS.map((s, i) => (
            <Reveal key={s.title} delay={i * 90} className="landing-step">
              <span className="landing-step-n">{i + 1}</span>
              <div>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </div>
            </Reveal>
          ))}
        </ol>
      </Section>
    </>
  );
}
