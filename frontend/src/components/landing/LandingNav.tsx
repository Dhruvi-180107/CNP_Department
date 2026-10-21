import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

interface LandingNavProps {
  signedIn: boolean;
}

const LINKS = [
  { href: '#about', label: 'About' },
  { href: '#clubs', label: 'Student Managed Clubs' },
  { href: '#projects', label: 'GUIITAR Projects' },
  { href: '#how', label: 'How we help' },
];

/** Sticky top bar. Log in sits top right; there is deliberately no sign-up button yet. */
export function LandingNav({ signedIn }: LandingNavProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className={`landing-nav${scrolled ? ' is-scrolled' : ''}`}>
      <a className="landing-brand" href="#top" aria-label="CNP Department home">
        <span className="landing-brand-mark" aria-hidden="true">C</span>
        <span>CNP Department</span>
      </a>
      <nav className="landing-nav-links" aria-label="Sections">
        {LINKS.map((l) => (
          <a key={l.href} href={l.href}>{l.label}</a>
        ))}
      </nav>
      <Link className="landing-login" to={signedIn ? '/dashboard' : '/login'}>
        {signedIn ? 'Open dashboard' : 'Log in'}
      </Link>
    </header>
  );
}
