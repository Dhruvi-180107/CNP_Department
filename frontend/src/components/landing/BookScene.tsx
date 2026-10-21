import type { CSSProperties } from 'react';
import { DetectiveGlassesIcon, MusicNoteIcon, SneakerIcon } from './NeonIcons';
import { Orbit } from './Orbit';

/** Pages that flip, fast at first and then slower (timing lives in CSS via --i). */
const FLIP_PAGES = 8;

const CLUB_ORBIT = [
  { icon: <SneakerIcon size={30} />, angle: 0, color: '#ff4d5e' },
  { icon: <MusicNoteIcon size={30} />, angle: 120, color: '#ffc83d' },
  { icon: <DetectiveGlassesIcon size={30} />, angle: 240, color: '#b583ff' },
];

/** The open book (left of the hero) with the Student Managed Clubs icons revolving round it. */
export function BookScene() {
  return (
    <div className="landing-scene landing-scene-book">
      <Orbit items={CLUB_ORBIT} duration={14} />
      <div className="landing-rise">
        <div className="landing-book" role="img" aria-label="An open book with its pages turning">
          <div className="landing-book-cover" />
          <div className="landing-book-page landing-book-left" />
          <div className="landing-book-page landing-book-right" />
          {Array.from({ length: FLIP_PAGES }, (_, i) => (
            <div key={i} className="landing-book-flip" style={{ '--i': i } as CSSProperties}>
              <span />
            </div>
          ))}
          <div className="landing-book-spine" />
        </div>
      </div>
    </div>
  );
}
