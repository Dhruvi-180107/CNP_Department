import type { User } from '../../../types';
import { formatLongDate } from './studentUtils';
import { ArrowRightIcon } from './StudentIcons';

interface StudentDashboardHeaderProps {
  user: User;
  onExploreClubs: () => void;
  onExploreProjects: () => void;
  /** Calendar days to the next event, derived from the upcoming-events fetch. */
  nextEventInDays?: number | null;
  /** `null` when the calendar fetch failed — the line then says so. */
  upcomingCount?: number | null;
}

function greetingFor(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function contextLine(user: User): string {
  const parts: string[] = [];
  if (user.department?.trim()) parts.push(user.department.trim());
  if (user.semester) parts.push(`Semester ${user.semester}`);
  return parts.length ? parts.join(', ') : 'Student Managed Clubs and GUIITAR';
}

function stateLine(upcomingCount: number | null, nextEventInDays: number | null): string {
  if (upcomingCount === null) return 'Calendar unavailable';
  if (upcomingCount === 0) return 'No events on the calendar';
  if (nextEventInDays === null) return `${upcomingCount} upcoming`;
  if (nextEventInDays <= 0) return 'Next event today';
  if (nextEventInDays === 1) return 'Next event tomorrow';
  return `Next event in ${nextEventInDays} days`;
}

export function StudentDashboardHeader({
  user,
  onExploreClubs,
  onExploreProjects,
  nextEventInDays = null,
  upcomingCount = 0,
}: StudentDashboardHeaderProps) {
  const firstName = user.name.trim().split(/\s+/)[0] || user.name;
  const now = new Date();

  return (
    <header className="ui-page-head sd-head">
      <div className="ui-page-head__text sd-head__text">
        <h1 className="ui-title">
          {greetingFor(now.getHours())}, {firstName}
        </h1>
        <p className="sd-head__meta">
          <span className="sd-head__seg">{formatLongDate(now)}</span>
          <span className="sd-head__seg">{contextLine(user)}</span>
          <span className="sd-head__seg sd-head__state">{stateLine(upcomingCount, nextEventInDays)}</span>
        </p>
      </div>

      <div className="ui-page-actions sd-head__actions">
        <button type="button" className="ui-btn ui-btn--quiet" onClick={onExploreProjects}>
          Browse projects
        </button>
        <button type="button" className="ui-btn ui-btn--primary" onClick={onExploreClubs}>
          Browse clubs
          <ArrowRightIcon className="sd-icon sd-icon--sm sd-arrow" />
        </button>
      </div>
    </header>
  );
}
