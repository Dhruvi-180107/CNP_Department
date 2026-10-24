import { LandingPoints, type LandingPoint } from './LandingPoints';

const SMC_POINTS: LandingPoint[] = [
  {
    title: 'Learning beyond the syllabus',
    text: 'Clubs let students practise leadership, teamwork and creativity on things they care about.',
  },
  {
    title: 'Run by students',
    text: 'Members plan, organise and own their events, which builds real responsibility.',
  },
  {
    title: 'A community on campus',
    text: 'Shared interests, from dance and music to puzzles and tech, bring people together.',
  },
];

const GUIITAR_POINTS: LandingPoint[] = [
  { title: 'Shared resources', text: 'Labs, equipment and infrastructure for teams.' },
  { title: 'Mentorship and networking', text: 'Tailored mentorship and an extended network.' },
  { title: 'Business support', text: 'Co-working space, business support and IP protection.' },
];

const HELP_ITEMS = [
  {
    title: 'Bring everything together',
    text: 'Clubs, projects, members and events live in one platform instead of scattered chats and sheets.',
  },
  {
    title: 'Coordinate people',
    text: 'Faculty coordinators, team leaders and members each see what they need to act on.',
  },
  {
    title: 'Handle requests and resources',
    text: 'Material requests and inventory are tracked so project teams are not left waiting.',
  },
  {
    title: 'Keep everyone informed',
    text: 'Events and notifications keep every club and project on the same page.',
  },
];

const ROLES = ['Students', 'Faculty coordinators', 'Faculty mentors', 'Club admins', 'Project admins'];

export function LandingSections() {
  return (
    <>
      {/* ── About · the statement ─────────────────────────────────────────── */}
      <section className="landing-about" id="about">
        <div className="landing-container">
          <h2 className="landing-statement">
            The CNP Department website is the working home of two student communities at GSFC University
            <span className="landing-stop" aria-hidden="true">.</span>
          </h2>

          <div className="landing-about-foot">
            <p className="landing-about-line">
              Students, faculty coordinators and project teams sign in to manage clubs, projects, events,
              notifications and material requests in one place.
            </p>
            <ul className="landing-roles" aria-label="Who signs in">
              {ROLES.map((role) => (
                <li key={role}>{role}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── Student Managed Clubs · head over the directory, full width ────── */}
      <section className="landing-clubs" id="clubs">
        <div className="landing-container landing-clubs-grid">
          <div className="landing-clubs-copy">
            <h2>Clubs that students run themselves</h2>
            <p className="landing-lead">
              Interest-based groups planned and led by students, with a faculty coordinator guiding
              them. Campus life becomes practice: students lead, organise and collaborate outside the
              classroom.
            </p>

            <LandingPoints points={SMC_POINTS} />
          </div>

          <figure className="landing-shot landing-shot--clubs">
            <div className="landing-shot-frame">
              <img
                src="/screens/clubs-detail.webp"
                alt="The clubs board: Photography Club as the lead club with its core-team split, then Coding Club and Robotics Club, each with its faculty coordinator."
                width={725}
                height={402}
                loading="lazy"
                decoding="async"
              />
            </div>
            <figcaption>
              The club board: your own membership and core-team split above every club and its faculty
              coordinator.
            </figcaption>
          </figure>
        </div>
      </section>

      {/* ── GUIITAR Projects · head, screen, supports, the vision panel ────── */}
      <section className="landing-projects" id="projects">
        <div className="landing-container">
          <div className="landing-projects-head">
            <div>
              <h2>Ideas with the backing to become real</h2>
            </div>
            <div className="landing-projects-prose">
              <p>
                GU Incubation Innovation Technology and Applied Research (GUIITAR) Council has been
                established by GSFC University (GSFCU) at Vadodara, dedicated to promoting and supporting
                creativity, innovation and the spirit of enterprise among young minds and innovators.
                GUIITAR Council is registered under section 8 of the Companies Act, 2013.
              </p>
            </div>
          </div>

          <div className="landing-projects-body">
            <figure className="landing-shot landing-shot--projects">
              <div className="landing-shot-frame">
                <img
                  src="/screens/projects-detail.webp"
                  alt="The projects ledger: Campus Energy Monitor, Autonomous Rover and Smart Irrigation System, each with its status, team and leader."
                  width={784}
                  height={352}
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <figcaption>Active projects, their status and the student leading each team.</figcaption>
            </figure>

            <ul className="landing-supports">
              {GUIITAR_POINTS.map((point) => (
                <li key={point.title}>
                  <span className="landing-supports-mark" aria-hidden="true" />
                  <h3>{point.title}</h3>
                  <p>{point.text}</p>
                </li>
              ))}
            </ul>
          </div>

          <figure className="landing-vision">
            <blockquote>
              <p>
                To nurture young minds by providing a platform to explore and showcase their potential,
                along with the generation of high added value, with a focus on innovation as well as
                marketing of technologies for the betterment of the Scientific, Engineering, Science &amp;
                Management Communities and the Society.
              </p>
            </blockquote>
            <figcaption>
              <span>GUIITAR Council vision</span>
              <span>Section 8, Companies Act, 2013</span>
            </figcaption>
          </figure>
        </div>
      </section>

      {/* ── How we help · the calendar, then four ruled answers ────────────── */}
      <section className="landing-how" id="how">
        <div className="landing-container">
          <div className="landing-how-top">
            <figure className="landing-shot landing-shot--events">
              <div className="landing-shot-frame">
                <img
                  src="/screens/events-detail.webp"
                  alt="The club events calendar for October 2026, with upcoming and past events marked and the next three events listed beside it."
                  width={725}
                  height={530}
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <figcaption>One calendar for every club, with upcoming and past events marked.</figcaption>
            </figure>

            <div className="landing-how-copy">
              <h2>Managing clubs and projects, together</h2>
              <p className="landing-lead">
                Clubs, projects, events, notifications and material requests, handled in one place.
              </p>
            </div>
          </div>

          <ul className="landing-helps">
            {HELP_ITEMS.map((item) => (
              <li key={item.title}>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
                <span className="landing-helps-tick" aria-hidden="true" />
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
