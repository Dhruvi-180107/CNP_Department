import { useEffect, useState, useRef } from 'react';
import { ToolEmblem } from './icons/ToolIcons';

export interface LoadingScreenProps {
  /**
   * If true, signals that data has arrived and the final screw can tighten
   * and the panel swing open.
   */
  isReady?: boolean;
  /**
   * Callback fired once the panel finishes swinging open and exits.
   */
  onComplete?: () => void;
  /**
   * Caption text displayed below the panel.
   */
  caption?: string;
  /**
   * Whether to render as fixed full-screen overlay (true by default).
   */
  fullScreen?: boolean;
}

type Stage = 'screw1' | 'screw2' | 'screw3' | 'ratchet' | 'tightenFinal' | 'swingOpen' | 'complete';

export default function LoadingScreen({
  isReady = true,
  onComplete,
  caption,
  fullScreen = true,
}: LoadingScreenProps) {
  const [stage, setStage] = useState<Stage>('screw1');
  const [tightened, setTightened] = useState({
    screw1: false,
    screw2: false,
    screw3: false,
    screw4: false,
  });

  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const isReadyRef = useRef(isReady);
  isReadyRef.current = isReady;

  // Check reduced motion preference
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(media.matches);

    const listener = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    media.addEventListener?.('change', listener);
    return () => media.removeEventListener?.('change', listener);
  }, []);

  // Main animation sequencing
  useEffect(() => {
    let cancelled = false;

    // Reduced motion mode: static panel with gentle pulse until isReady
    if (prefersReducedMotion) {
      setTightened({ screw1: true, screw2: true, screw3: true, screw4: true });
      if (isReady) {
        const timer = window.setTimeout(() => {
          if (!cancelled) {
            setStage('complete');
            onComplete?.();
          }
        }, 250);
        return () => {
          cancelled = true;
          window.clearTimeout(timer);
        };
      }
      return;
    }

    // Normal motion mode:
    // Determine pacing: if isReady is already true from the start, run a snappy cadence (~70ms each).
    // Otherwise, run comfortable cadence (~220ms each) until reaching the 4th screw.
    const isFast = isReadyRef.current;
    const stepTime = isFast ? 65 : 220;

    // Step 1: Tighten Screw 1 (Top-Left)
    const t1 = window.setTimeout(() => {
      if (cancelled) return;
      setTightened((prev) => ({ ...prev, screw1: true }));
      setStage('screw2');

      // Step 2: Tighten Screw 2 (Top-Right)
      const t2 = window.setTimeout(() => {
        if (cancelled) return;
        setTightened((prev) => ({ ...prev, screw2: true }));
        setStage('screw3');

        // Step 3: Tighten Screw 3 (Bottom-Left)
        const t3 = window.setTimeout(() => {
          if (cancelled) return;
          setTightened((prev) => ({ ...prev, screw3: true }));

          // Step 4: Move to Screw 4 (Bottom-Right)
          if (isReadyRef.current) {
            // Data is already ready! Tighten screw 4 immediately
            finishFinalScrew();
          } else {
            // Data not ready yet: Enter ratchet loop on screw 4
            setStage('ratchet');
          }
        }, stepTime);

        return () => window.clearTimeout(t3);
      }, stepTime);

      return () => window.clearTimeout(t2);
    }, stepTime);

    const finishFinalScrew = () => {
      if (cancelled) return;
      setStage('tightenFinal');
      setTightened({ screw1: true, screw2: true, screw3: true, screw4: true });

      // After final screw tightens, swing panel open
      const tFinal = window.setTimeout(() => {
        if (cancelled) return;
        setStage('swingOpen');

        // Panel swings open over 450ms, then completes
        const tSwing = window.setTimeout(() => {
          if (cancelled) return;
          setStage('complete');
          onComplete?.();
        }, 460);

        return () => window.clearTimeout(tSwing);
      }, 260);

      return () => window.clearTimeout(tFinal);
    };

    return () => {
      cancelled = true;
      window.clearTimeout(t1);
    };
  }, [prefersReducedMotion]);

  // When stage is currently ratcheting and isReady becomes true:
  useEffect(() => {
    if (stage === 'ratchet' && isReady) {
      setStage('tightenFinal');
      setTightened({ screw1: true, screw2: true, screw3: true, screw4: true });

      const tSwing = window.setTimeout(() => {
        setStage('swingOpen');
        const tDone = window.setTimeout(() => {
          setStage('complete');
          onComplete?.();
        }, 460);
        return () => window.clearTimeout(tDone);
      }, 260);

      return () => window.clearTimeout(tSwing);
    }
  }, [stage, isReady, onComplete]);

  if (stage === 'complete') {
    return null;
  }

  // Screwdriver active position target
  const getToolTarget = () => {
    switch (stage) {
      case 'screw1':
        return { x: 44, y: 42, angle: -15 };
      case 'screw2':
        return { x: 398, y: 42, angle: 15 };
      case 'screw3':
        return { x: 44, y: 238, angle: -25 };
      case 'ratchet':
      case 'tightenFinal':
      case 'swingOpen':
      default:
        return { x: 398, y: 238, angle: 25 };
    }
  };

  const toolTarget = getToolTarget();

  const getDynamicCaption = () => {
    if (caption) return caption;
    if (prefersReducedMotion) return 'Loading your campus workspace…';
    if (stage === 'screw1' || stage === 'screw2' || stage === 'screw3') {
      return 'Securing access hatch…';
    }
    if (stage === 'ratchet') {
      return 'Connecting to workspace data…';
    }
    if (stage === 'tightenFinal' || stage === 'swingOpen') {
      return 'Access verified. Welcome.';
    }
    return 'Loading your campus workspace…';
  };

  return (
    <div
      className={`cnp-steel-loader-backdrop ${fullScreen ? 'fullscreen' : 'inline'} ${
        stage === 'swingOpen' ? 'stage-swing-open' : ''
      } ${prefersReducedMotion ? 'reduced-motion' : ''}`}
      role="status"
      aria-label="Loading workspace"
    >
      <div className="cnp-steel-loader-stage">
        {/* Wall Access Hatch Assembly */}
        <div className={`cnp-steel-hatch-wrapper ${stage === 'swingOpen' ? 'hatch-open' : ''}`}>
          {/* Recessed Wall Frame */}
          <div className="cnp-steel-wall-frame" />

          {/* Hinged Steel Door Panel */}
          <div className={`cnp-steel-door ${stage === 'swingOpen' ? 'door-swinging' : ''}`}>
            {/* Left Industrial Hinges */}
            <div className="cnp-steel-hinge cnp-steel-hinge-top">
              <span className="cnp-hinge-pin" />
            </div>
            <div className="cnp-steel-hinge cnp-steel-hinge-bottom">
              <span className="cnp-hinge-pin" />
            </div>

            {/* Brushed Steel Door Face */}
            <div className="cnp-steel-door-face">
              {/* Technical perimeter rivets */}
              <div className="cnp-door-rivets-top" />
              <div className="cnp-door-rivets-bottom" />

              {/* Stamped technical header & footer markings */}
              <div className="cnp-door-header">
                <span className="cnp-door-tag">CEC • SMC & GUIITAR</span>
                <span className="cnp-door-serial">ACCESS MOD-04</span>
              </div>

              {/* Central Stamped Emblem featuring Gear, Spanner, and Screwdriver */}
              <div className="cnp-door-emblem-container">
                <ToolEmblem size={96} />
              </div>

              <div className="cnp-door-footer">
                <span className="cnp-door-status">
                  {stage === 'ratchet' ? (
                    <span className="cnp-status-pulse">● SYNCING</span>
                  ) : stage === 'tightenFinal' || stage === 'swingOpen' ? (
                    <span className="cnp-status-locked">● SECURE</span>
                  ) : (
                    <span>● INITIALIZING</span>
                  )}
                </span>
                <span className="cnp-door-subtag">ENGINEERING DIVISION</span>
              </div>

              {/* Four Corner Screws */}
              {/* Screw 1: Top-Left */}
              <div
                className={`cnp-corner-screw screw-top-left ${
                  tightened.screw1 ? 'is-tight' : 'is-loose'
                }`}
                style={{ left: 24, top: 22 }}
              >
                <div className="cnp-screw-bevel">
                  <div className="cnp-screw-head">
                    <span className="cnp-screw-slot-h" />
                    <span className="cnp-screw-slot-v" />
                  </div>
                </div>
              </div>

              {/* Screw 2: Top-Right */}
              <div
                className={`cnp-corner-screw screw-top-right ${
                  tightened.screw2 ? 'is-tight' : 'is-loose'
                }`}
                style={{ right: 24, top: 22 }}
              >
                <div className="cnp-screw-bevel">
                  <div className="cnp-screw-head">
                    <span className="cnp-screw-slot-h" />
                    <span className="cnp-screw-slot-v" />
                  </div>
                </div>
              </div>

              {/* Screw 3: Bottom-Left */}
              <div
                className={`cnp-corner-screw screw-bottom-left ${
                  tightened.screw3 ? 'is-tight' : 'is-loose'
                }`}
                style={{ left: 24, bottom: 22 }}
              >
                <div className="cnp-screw-bevel">
                  <div className="cnp-screw-head">
                    <span className="cnp-screw-slot-h" />
                    <span className="cnp-screw-slot-v" />
                  </div>
                </div>
              </div>

              {/* Screw 4: Bottom-Right (Loose & Ratcheting until data arrives!) */}
              <div
                className={`cnp-corner-screw screw-bottom-right ${
                  tightened.screw4
                    ? 'is-tight'
                    : stage === 'ratchet'
                    ? 'is-ratcheting'
                    : 'is-loose'
                }`}
                style={{ right: 24, bottom: 22 }}
              >
                <div className="cnp-screw-bevel">
                  <div className="cnp-screw-head">
                    <span className="cnp-screw-slot-h" />
                    <span className="cnp-screw-slot-v" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Animated Screwdriver Tool (Hidden in reduced motion or after door swings open) */}
          {!prefersReducedMotion && stage !== 'swingOpen' && (
            <div
              className={`cnp-screwdriver-tool stage-${stage}`}
              style={{
                transform: `translate(${toolTarget.x}px, ${toolTarget.y}px) rotate(${toolTarget.angle}deg)`,
              }}
              aria-hidden="true"
            >
              <div className="cnp-screwdriver-body">
                {/* Cross-head tip fitting right into screw head at (0,0) */}
                <div className="cnp-tool-tip" />
                {/* Chrome steel blade / shank */}
                <div className="cnp-tool-shank" />
                {/* Gold / Brass Accent Bolster Collar */}
                <div className="cnp-tool-collar" />
                {/* Navy Blue Ergonomic Gripped Handle */}
                <div className="cnp-tool-handle">
                  <span className="cnp-handle-flute flute-1" />
                  <span className="cnp-handle-flute flute-2" />
                  <span className="cnp-handle-flute flute-gold" />
                </div>
                {/* Striking Cap */}
                <div className="cnp-tool-cap" />
              </div>
            </div>
          )}
        </div>

        {/* Dynamic Caption */}
        <div className="cnp-steel-caption-wrap">
          <span className="cnp-steel-caption">{getDynamicCaption()}</span>
        </div>
      </div>
    </div>
  );
}
