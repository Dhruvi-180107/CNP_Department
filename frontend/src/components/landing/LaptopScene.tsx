import { GearIcon, ScrewdriverIcon, SpannerIcon } from '../icons/ToolIcons';
import { Orbit } from './Orbit';

const CODE_LINES = [
  'const club = await smc.join();',
  'git commit -m "ship it"',
  'npm run build --prod',
  'if (idea) prototype(idea);',
  'deploy(project, "GUIITAR");',
  'while (learning) grow();',
  'import { future } from "gu";',
  'SELECT * FROM innovators;',
  'sudo make impact',
  'await team.collaborate();',
];

const PROJECT_ORBIT = [
  { icon: <GearIcon size={30} />, angle: 0, color: '#aeb8cc' },
  { icon: <SpannerIcon size={30} />, angle: 120, color: '#ffffff' },
  { icon: <ScrewdriverIcon size={30} />, angle: 240, color: '#46e08c' },
];

/** The laptop (right of the hero): code scrolls like a terminal, then settles on a smiley. */
export function LaptopScene() {
  return (
    <div className="landing-scene landing-scene-laptop">
      <Orbit items={PROJECT_ORBIT} duration={16} reverse />
      <div className="landing-rise landing-rise-late">
        <div className="landing-laptop" role="img" aria-label="A laptop running code that settles into a smiley face">
          <div className="landing-laptop-lid">
            <div className="landing-laptop-screen">
              <div className="landing-code">
                <div className="landing-code-track">
                  {[...CODE_LINES, ...CODE_LINES].map((line, i) => (
                    <div key={i}>{line}</div>
                  ))}
                </div>
              </div>
              <div className="landing-smiley" aria-hidden="true">
                <svg viewBox="0 0 64 64" width="64" height="64" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round">
                  <circle cx="32" cy="32" r="26" />
                  <circle cx="23" cy="26" r="1.5" fill="currentColor" />
                  <circle cx="41" cy="26" r="1.5" fill="currentColor" />
                  <path d="M20 38c3 6 8 9 12 9s9-3 12-9" />
                </svg>
              </div>
            </div>
          </div>
          <div className="landing-laptop-base" />
        </div>
      </div>
    </div>
  );
}
