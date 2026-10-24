import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  DashAvatar,
  DashEmpty,
  DashEventsPanel,
  DashLoadError,
  DashNotifications,
  DashPerson,
  DashStat,
  fmtShortDay,
} from './StaffBits';

interface ClubAdminStats {
  totalClubs: number;
  withCoordinator: number;
  withoutCoordinator: number;
}

interface ClubAdminDashboardProps {
  clubs: any[];
  stats: ClubAdminStats | null;
  requests: any[];
  upcomingEvents: any[];
  pastEvents: any[];
  unread: number;
  loadError: string | null;
  onReload: () => void;
  onDeleteEvent: (id: string) => void;
}

const clubIdOf = (request: any) =>
  request.clubId && typeof request.clubId === 'object' ? request.clubId._id : request.clubId;

/**
 * Club admin — the health of the whole club programme: coordinator coverage,
 * member totals and the requests that are actually blocked or waiting.
 */
export function ClubAdminDashboard({
  clubs,
  stats,
  requests,
  upcomingEvents,
  pastEvents,
  unread,
  loadError,
  onReload,
  onDeleteEvent,
}: ClubAdminDashboardProps) {
  const [eventTab, setEventTab] = useState<'upcoming' | 'past'>('upcoming');
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);

  const total = stats?.totalClubs ?? clubs.length;
  const withCoordinator =
    stats?.withCoordinator ?? clubs.filter((club) => Boolean(club.facultyCoordinatorId)).length;
  const withoutCoordinator =
    stats?.withoutCoordinator ?? clubs.filter((club) => !club.facultyCoordinatorId).length;
  const members = useMemo(
    () => clubs.reduce((sum, club) => sum + (club.totalMembers ?? club.memberCount ?? 0), 0),
    [clubs],
  );
  const uncovered = useMemo(
    () => clubs.filter((club) => !club.facultyCoordinatorId),
    [clubs],
  );
  // MOCK: per-club request counts are grouped in the browser; see docs/mocks/staff-dashboards.md
  const pendingByClub = useMemo(() => {
    const counts = new Map<string, number>();
    for (const request of requests) {
      const id = clubIdOf(request);
      if (!id) continue;
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    return counts;
  }, [requests]);

  // MOCK: coverage is a client-side ratio of two values derived above
  const coverage = total > 0 ? Math.min(withCoordinator / total, 1) : 0;
  const attentionCount = uncovered.length + requests.length;

  return (
    <div className="dash">
      <header className="ui-page-head">
        <div className="ui-page-head__text">
          <h1 className="ui-title">Club programme</h1>
          <p className="ui-sub">
            {total === 0
              ? 'No clubs yet. Create the first club to start the programme.'
              : `${total} clubs, ${members} members. ${
                  withoutCoordinator > 0
                    ? `${withoutCoordinator} of ${total} still without a faculty coordinator.`
                    : 'Every club has a faculty coordinator.'
                }${
                  requests.length > 0
                    ? ` ${requests.length} join request${requests.length === 1 ? '' : 's'} waiting.`
                    : ''
                }`}
          </p>
        </div>
        <div className="ui-page-actions">
          <DashNotifications count={unread} />
          <Link to="/clubs" className="ui-btn ui-btn--primary">
            Manage clubs
          </Link>
        </div>
      </header>

      {loadError ? <DashLoadError message={loadError} onRetry={onReload} /> : null}

      <div className="ui-stats">
        <DashStat value={total} label="Clubs" />
        <DashStat value={withCoordinator} label="With a coordinator" />
        <DashStat
          value={withoutCoordinator}
          label="Without a coordinator"
          tone={withoutCoordinator > 0 ? 'warn' : undefined}
        />
        <DashStat value={members} label="Members across clubs" />
        <DashStat
          value={requests.length}
          label="Join requests waiting"
          tone={requests.length > 0 ? 'accent' : undefined}
        />
      </div>

      <div className="dash-split">
        <section className="ui-panel ui-panel--accent" aria-labelledby="ca-clubs-title">
          <header className="ui-panel__head">
            <div className="ui-panel__titles">
              <h2 className="ui-panel__title" id="ca-clubs-title">
                All clubs
              </h2>
              <span className="ui-panel__meta">{total}</span>
            </div>
            <Link to="/clubs" className="ui-btn ui-btn--quiet ui-btn--sm">
              Open directory
            </Link>
          </header>

          {total > 0 ? (
            <div className="dash-cover">
              <span className="dash-cover__label">Coordinator coverage</span>
              <span className="ui-meter" aria-hidden="true">
                <span className="ui-meter__fill" style={{ transform: `scaleX(${coverage})` }} />
              </span>
              <span className="dash-cover__value">
                {withCoordinator} / {total}
              </span>
            </div>
          ) : null}

          <div className="ui-panel__body ui-panel__body--flush">
            {clubs.length ? (
              <ul className="ui-rows">
                {clubs.map((club) => {
                  const clubMembers = club.totalMembers ?? club.memberCount ?? 0;
                  const core = club.coreTeamCount ?? 0;
                  const pending = pendingByClub.get(club._id) ?? 0;
                  const coordinator =
                    club.facultyCoordinatorId && typeof club.facultyCoordinatorId === 'object'
                      ? club.facultyCoordinatorId
                      : null;
                  return (
                    <li className="ui-row" key={club._id}>
                      <DashAvatar name={club.name} src={club.logo} />
                      <div className="ui-row__main">
                        <p className="ui-row__title">
                          <Link to={`/clubs/${club._id}`} className="dash-link">
                            {club.name}
                          </Link>
                        </p>
                        <p className="ui-row__sub">
                          {clubMembers
                            ? `${clubMembers} member${clubMembers === 1 ? '' : 's'} · ${core} in the core team`
                            : 'No members yet'}
                        </p>
                      </div>
                      <div className="ui-row__meta">
                        {coordinator ? (
                          <span className="dash-coordinator">
                            <DashPerson name={coordinator.name} src={coordinator.profileImage} />
                          </span>
                        ) : (
                          <span className="ui-tag is-warning">No coordinator</span>
                        )}
                      </div>
                      <div className="ui-row__actions">
                        {pending > 0 ? (
                          <Link
                            to={`/clubs/${club._id}#join-requests`}
                            className="ui-btn ui-btn--quiet ui-btn--sm"
                          >
                            Requests ({pending})
                          </Link>
                        ) : null}
                        <Link to={`/clubs/${club._id}`} className="ui-btn ui-btn--quiet ui-btn--sm">
                          Open club
                        </Link>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="ui-panel__body">
                <DashEmpty
                  icon="clubs"
                  title="No clubs yet"
                  text="Create the first club to start the programme."
                  action={
                    <Link to="/clubs" className="ui-btn ui-btn--quiet ui-btn--sm">
                      Manage clubs
                    </Link>
                  }
                />
              </div>
            )}
          </div>
        </section>

        <section className="ui-panel" aria-labelledby="ca-attention-title">
          <header className="ui-panel__head">
            <div className="ui-panel__titles">
              <h2 className="ui-panel__title" id="ca-attention-title">
                Needs attention
              </h2>
              <span className="ui-panel__meta">{attentionCount}</span>
            </div>
          </header>

          <div className="ui-panel__body ui-panel__body--flush">
            {attentionCount === 0 ? (
              <div className="ui-panel__body">
                <DashEmpty
                  icon="check"
                  title={total === 0 ? 'Nothing to watch yet' : 'Nothing is blocked'}
                  text={
                    total === 0
                      ? 'Coordinator coverage and join requests appear once clubs exist.'
                      : 'Every club has a faculty coordinator and no join request is waiting.'
                  }
                />
              </div>
            ) : (
              <>
                {uncovered.length > 0 ? (
                  <>
                    <p className="dash-group">
                      <span>Clubs without a coordinator</span>
                      <span className="dash-group__count">{uncovered.length}</span>
                    </p>
                    <ul className="ui-rows" aria-label="Clubs without a faculty coordinator">
                      {uncovered.map((club) => (
                        <li className="ui-row" key={club._id}>
                          <DashAvatar name={club.name} src={club.logo} size="sm" />
                          <div className="ui-row__main">
                            <p className="ui-row__title">{club.name}</p>
                            <p className="ui-row__sub">Join requests are blocked until assigned</p>
                          </div>
                          <div className="ui-row__meta">
                            <Link
                              to={`/clubs/${club._id}`}
                              className="ui-btn ui-btn--quiet ui-btn--sm"
                            >
                              Assign
                            </Link>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : null}

                {requests.length > 0 ? (
                  <>
                    <p className="dash-group">
                      <span>Join requests</span>
                      <span className="dash-group__count">{requests.length}</span>
                    </p>
                    <ul className="ui-rows" aria-label="Pending club join requests">
                      {requests.slice(0, 6).map((request) => {
                        const id = clubIdOf(request);
                        const student = request.studentId;
                        const sub = [
                          request.clubId?.name || 'Club',
                          student?.department,
                          student?.semester ? `sem ${student.semester}` : null,
                        ]
                          .filter(Boolean)
                          .join(' · ');
                        return (
                          <li className="ui-row" key={request._id}>
                            <DashAvatar
                              name={student?.name}
                              src={student?.profileImage}
                              size="sm"
                            />
                            <div className="ui-row__main">
                              <p className="ui-row__title">
                                {student?.name || 'Unknown student'}
                              </p>
                              <p className="ui-row__sub">{sub}</p>
                            </div>
                            <div className="ui-row__meta">
                              <span className="dash-at">{fmtShortDay(request.createdAt)}</span>
                              {id ? (
                                <Link
                                  to={`/clubs/${id}#join-requests`}
                                  className="ui-btn ui-btn--quiet ui-btn--sm"
                                >
                                  Review
                                </Link>
                              ) : null}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </>
                ) : null}
              </>
            )}
          </div>

          {requests.length > 6 ? (
            <footer className="ui-panel__foot">
              <span className="dash-at">{requests.length - 6} more requests</span>
              <Link to="/clubs" className="ui-btn ui-btn--ghost ui-btn--sm">
                Review via clubs
              </Link>
            </footer>
          ) : null}
        </section>
      </div>

      <DashEventsPanel
        idPrefix="ca-events"
        upcoming={upcomingEvents}
        past={pastEvents}
        tab={eventTab}
        onTab={setEventTab}
        canAdd={!showEventForm}
        showForm={showEventForm}
        editing={editingEvent}
        availableClubs={clubs}
        formClubId={
          editingEvent && typeof editingEvent.clubId === 'object'
            ? editingEvent.clubId?._id
            : editingEvent?.clubId
        }
        onAdd={() => {
          setEditingEvent(null);
          setShowEventForm(true);
        }}
        onEdit={(event) => {
          setEditingEvent(event);
          setShowEventForm(true);
        }}
        onDelete={onDeleteEvent}
        onSave={() => {
          setShowEventForm(false);
          setEditingEvent(null);
          onReload();
        }}
        onCancel={() => {
          setShowEventForm(false);
          setEditingEvent(null);
        }}
      />
    </div>
  );
}
