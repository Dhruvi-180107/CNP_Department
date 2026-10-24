import type { StudentJoinRequest } from '../../../types/studentDashboard';

interface StudentOverviewProps {
  /** `null` means the fetch failed — the strip says so instead of showing a zero. */
  clubCount: number | null;
  projectCount: number | null;
  upcomingEventCount: number | null;
  unreadNotifications: number | null;
  pendingRequestCount: number | null;
  coreTeamCount?: number;
  teamLeadCount?: number;
  nextEventInDays?: number | null;
}

function StatValue({ value }: { value: number | null }) {
  if (value === null) {
    return (
      <p className="ui-stat__value">
        <span aria-hidden="true">&mdash;</span>
        <span className="ui-visually-hidden">Unavailable</span>
      </p>
    );
  }
  return <p className="ui-stat__value">{value}</p>;
}

export function StudentOverview({
  clubCount,
  projectCount,
  upcomingEventCount,
  unreadNotifications,
  pendingRequestCount,
  coreTeamCount = 0,
  teamLeadCount = 0,
  nextEventInDays = null,
}: StudentOverviewProps) {
  const clubSub =
    clubCount === null ? 'Not available' : coreTeamCount > 0 ? `${coreTeamCount} core team` : null;

  const projectSub =
    projectCount === null ? 'Not available' : teamLeadCount > 0 ? `${teamLeadCount} as team lead` : null;

  const eventSub =
    upcomingEventCount === null
      ? 'Not available'
      : upcomingEventCount === 0
        ? 'Nothing scheduled'
        : nextEventInDays === null
          ? null
          : nextEventInDays <= 0
            ? 'Next event today'
            : nextEventInDays === 1
              ? 'Next event tomorrow'
              : `Next in ${nextEventInDays} days`;

  return (
    <section className="ui-stats sd-stats" aria-label="Your activity at a glance">
      <div className="ui-stat">
        <StatValue value={clubCount} />
        <p className="ui-stat__label">Clubs joined</p>
        {clubSub ? <p className="sd-stat__sub">{clubSub}</p> : null}
      </div>

      <div className="ui-stat">
        <StatValue value={projectCount} />
        <p className="ui-stat__label">Projects joined</p>
        {projectSub ? <p className="sd-stat__sub">{projectSub}</p> : null}
      </div>

      <div className="ui-stat">
        <StatValue value={upcomingEventCount} />
        <p className="ui-stat__label">Events ahead</p>
        {eventSub ? <p className="sd-stat__sub">{eventSub}</p> : null}
      </div>

      <div className="ui-stat">
        <StatValue value={unreadNotifications} />
        <p className="ui-stat__label">Unread notices</p>
        {unreadNotifications === 0 ? <p className="sd-stat__sub">All read</p> : null}
      </div>

      {pendingRequestCount !== null && pendingRequestCount > 0 ? (
        <div className="ui-stat ui-stat--accent">
          <p className="ui-stat__value">{pendingRequestCount}</p>
          <p className="ui-stat__label">Requests waiting</p>
          <p className="sd-stat__sub">With a reviewer</p>
        </div>
      ) : null}
    </section>
  );
}

export function countPendingRequests(requests: StudentJoinRequest[]): number {
  return requests.filter((request) => request.status === 'pending').length;
}
