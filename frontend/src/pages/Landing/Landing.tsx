import { useAuth } from '../../context/AuthContext';
import { LandingNav } from '../../components/landing/LandingNav';
import { LandingHero } from '../../components/landing/LandingHero';
import { LandingSections } from '../../components/landing/LandingSections';
import { LandingFooter } from '../../components/landing/LandingFooter';

/**
 * Public front page at "/". Everyone, signed in or not, sees the hero animation; only the
 * buttons differ (Log in vs Open dashboard). Reduced-motion users get the static scene via CSS.
 */
export default function Landing() {
  const { user } = useAuth();
  const signedIn = !!user;

  return (
    <div className="landing">
      <LandingNav signedIn={signedIn} />
      <div className="landing-main">
        <LandingHero signedIn={signedIn} />
        <LandingSections />
      </div>
      <LandingFooter />
    </div>
  );
}
