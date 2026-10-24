import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

export interface LoadingScreenProps {
  /**
   * If true, signals that the destination's data has arrived: the fourth tick of
   * the progress hairline can close and the route is shown.
   */
  isReady?: boolean;
  /**
   * Callback fired once the loader has finished and may be unmounted.
   */
  onComplete?: () => void;
  /**
   * Caption text displayed below the progress hairline.
   */
  caption?: string;
  /**
   * Whether to render as fixed full-screen overlay (true by default).
   */
  fullScreen?: boolean;
}

const ROUTE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  clubs: 'Clubs',
  projects: 'Projects',
  events: 'Events',
  notifications: 'Notifications',
  inventory: 'Inventory',
  'material-requests': 'Material requests',
  profile: 'Profile',
  login: 'Sign in',
  register: 'Create account',
};

const TOTAL_STEPS = 4;

/** The route being loaded, taken from the URL rather than a prop. */
function routeLabel(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean);
  const root = segments[0];
  if (!root) return 'CNP Department';
  if (segments.length > 1) {
    if (root === 'clubs') return 'Club details';
    if (root === 'projects') return 'Project details';
  }
  return ROUTE_LABELS[root] ?? root.charAt(0).toUpperCase() + root.slice(1).replace(/-/g, ' ');
}

function prefersReducedMotionNow(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Route-transition loader. Four ticks of a hairline, the fourth held open until the
 * page reports it is ready, then the frame clears. Under reduced motion the ticks
 * are simply filled and the loader leaves as soon as the page is ready.
 */
export default function LoadingScreen({
  isReady = true,
  onComplete,
  caption,
  fullScreen = true,
}: LoadingScreenProps) {
  const location = useLocation();
  const [step, setStep] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(prefersReducedMotionNow);
  const [complete, setComplete] = useState(false);

  const isReadyRef = useRef(isReady);
  isReadyRef.current = isReady;
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const firedRef = useRef(false);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(media.matches);
    const listener = (event: MediaQueryListEvent) => setReducedMotion(event.matches);
    media.addEventListener?.('change', listener);
    return () => media.removeEventListener?.('change', listener);
  }, []);

  const finish = useCallback(() => {
    if (firedRef.current) return;
    firedRef.current = true;
    setComplete(true);
    onCompleteRef.current?.();
  }, []);

  /* Ticks one to three on a fixed cadence: snappy if the data is already there. */
  useEffect(() => {
    if (reducedMotion) return;
    const cadence = isReadyRef.current ? 70 : 200;
    const timers = [1, 2, 3].map((index) =>
      window.setTimeout(() => setStep((current) => Math.max(current, index)), cadence * index),
    );
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [reducedMotion]);

  /* The fourth tick is the honest one: it only closes when the page says it is ready. */
  useEffect(() => {
    if (reducedMotion) {
      setStep(TOTAL_STEPS);
      if (!isReady) return;
      const timer = window.setTimeout(finish, 220);
      return () => window.clearTimeout(timer);
    }

    if (step < 3) return;
    if (!isReady) return;

    if (step === 3) {
      const timer = window.setTimeout(() => setStep(TOTAL_STEPS), 110);
      return () => window.clearTimeout(timer);
    }

    const timer = window.setTimeout(finish, 280);
    return () => window.clearTimeout(timer);
  }, [step, isReady, reducedMotion, finish]);

  /* Never outstay the route. */
  useEffect(() => {
    if (complete) return;
    const timer = window.setTimeout(finish, 2600);
    return () => window.clearTimeout(timer);
  }, [complete, finish]);

  if (complete) return null;

  const label = routeLabel(location.pathname);
  // The fourth tick is held open while the page is still working: say so honestly.
  const progress = isReady ? step : Math.min(step, TOTAL_STEPS - 1);
  const resolvedCaption =
    caption ??
    (isReady && step >= TOTAL_STEPS
      ? 'Ready.'
      : step >= 3 && !isReady
        ? 'Waiting for this page to finish loading…'
        : `Loading ${label.toLowerCase()}…`);

  return (
    <div
      className={`shell-loader${fullScreen ? '' : ' shell-loader--inline'}`}
      role="status"
      aria-live="polite"
      aria-busy={!isReady}
      aria-label="Loading workspace"
    >
      <div className="shell-loader__inner">
        <span className="shell-mark shell-mark--lg" aria-hidden="true">C</span>

        <p className="shell-loader__route">{label}</p>

        <div
          className="shell-loader__track"
          role="progressbar"
          aria-label="Loading progress"
          aria-valuemin={0}
          aria-valuemax={TOTAL_STEPS}
          aria-valuenow={progress}
          aria-valuetext={`${progress} of ${TOTAL_STEPS}`}
        >
          {Array.from({ length: TOTAL_STEPS }, (_, index) => {
            const isOn = index < step;
            const isWaiting = index === 3 && step >= 3 && !isReady && !reducedMotion;
            return (
              <span
                key={index}
                className={`shell-loader__seg${isOn ? ' is-on' : ''}${isWaiting ? ' is-waiting' : ''}`}
              >
                <span className="shell-loader__fill" />
              </span>
            );
          })}
        </div>

        <p className="shell-loader__caption">{resolvedCaption}</p>
      </div>
    </div>
  );
}
