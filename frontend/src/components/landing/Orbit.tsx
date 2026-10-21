import type { CSSProperties, ReactNode } from 'react';

export interface OrbitItem {
  icon: ReactNode;
  /** Starting angle on the ring, in degrees. */
  angle: number;
  /** Neon colour of the icon (also drives its glow). */
  color: string;
}

interface OrbitProps {
  items: OrbitItem[];
  /** Seconds for one revolution. */
  duration: number;
  /** Spin the other way round, so the two orbits feel independent. */
  reverse?: boolean;
}

/**
 * Icons revolving around the centre of their scene.
 * The ring spins; each icon counter-rotates so it stays upright. All CSS, no JS per frame.
 * Radius comes from the scene size via CSS (`--orbit-r`).
 */
export function Orbit({ items, duration, reverse = false }: OrbitProps) {
  const style = {
    '--orbit-dur': `${duration}s`,
    '--orbit-dir': reverse ? 'reverse' : 'normal',
  } as CSSProperties;

  return (
    <div className="landing-orbit" style={style} aria-hidden="true">
      <div className="landing-orbit-ring" />
      <div className="landing-orbit-spin">
        {items.map((item, i) => (
          <div key={i} className="landing-orbit-item" style={{ '--a': `${item.angle}deg` } as CSSProperties}>
            <div className="landing-orbit-icon" style={{ color: item.color }}>
              {item.icon}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
