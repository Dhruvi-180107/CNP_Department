import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  DashAvatar,
  DashEmpty,
  DashEventsPanel,
  DashLoadError,
  DashNotifications,
  DashStat,
  fmtShortDay,
} from './StaffBits';

interface CoordinatorDashboardProps {
  clubs: any[];
  clubsError: string | null;
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
 * Faculty coordinator — the clubs they guide. Clubs are the object, join
 * requests are the queue, events are the operational surface.
 */
export function CoordinatorDashboard({
  clubs,
  clubsError,
  requests,
  upcomingEvents,
  pastEvents,
  unread,
  loadError,
  onReload,
  onDeleteEvent,
}: CoordinatorDashboardProps) {
  const [eventTab, setEventTab] = useState<'upcoming' | 'past'>('upcoming');
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);

  const members = useMemo(
    () => clubs.reduce((total, club) => total + (club.totalMembers ?? club.memberCount ?? 0), 0),
    [clubs],
  );
  const coreTeam = useMemo(
    () => clubs.reduce((total, club) => total + (club.coreTeamCount ?? 0), 0),
    [clubs],
  );

  // MOCK: pending counts per club are grouped in the browser; see docs/mocks/staff-dashboards.md
  const pendingByClub = useMemo(() => {
    const counts = new Map<string, number>();
    for (const request of requests) {
      const id = clubIdOf(request);
      if (!id) continue;
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    return counts;
  }, [requests]);

  // MOCK: the merged per-club queue is re-sorted by createdAt in the browser
  const queue = useMemo(
    () =>
      [...requests].sort(
        (a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime(),
      ),
    [requests],
  );

  const clubNameOf = (request: any) => {
    const id = clubIdOf(request);
    return (
      request.clubId?.name ||
      clubs.find((club) => club._id === id)?.name ||
      'Assigned club'
    );
  };

  const firstClubId = queue.length ? clubIdOf(queue[0]) || clubs[0]?._id : clubs[0]?._id;
  const nextEvent = upcomingEvents[0];
  const openForm = () => {
    setEditingEvent(null);
    setShowEventForm(true);
  };

  return (
    <div className="dash">
      <header className="ui-page-head">
        <div className="ui-page-head__text">
          <h1 className="ui-title">Clubs I guide</h1>
          <p className="ui-sub">
            {clubs.length
              ? `${clubs.length} club${clubs.length === 1 ? '' : 's'}, ${members} student${
                  members === 1 ? '' : 's'
                } in your charge. Requests and events are yours to clear.`
              : 'No clubs are assigned to you yet. A club admin assigns each faculty coordinator.'}
          </p>
        </div>
        <div className="ui-page-actions">
          <DashNotifications count={unread} />
          {queue.length > 0 && firstClubId ? (
            <Link
              to={`/clubs/${firstClubId}#join-requests`}
              className="ui-btn ui-btn--primary"
            >
              Review {queue.length} request{queue.length === 1 ? '' : 's'}
            </Link>
          ) : (
            <Link to="/events" className="ui-btn ui-btn--primary">
              Manage events
            </Link>
          )}
        </div>
      </header>

      {loadError ? <DashLoadError message={loadError} onRetry={onReload} /> : null}

      {clubsError ? (
        <DashLoadError message={clubsError} onRetry={onReload} />
      ) : (
        <div className="ui-stats">
          <DashStat value={clubs.length} label="Clubs guided" />
          <DashStat value={members} label="Members across clubs" />
          <DashStat
            value={queue.length}
            label="Requests waiting"
            tone={queue.length > 0 ? 'accent' : undefined}
          />
          <DashStat value={fmtShortDay(nextEvent?.eventDate || nextEvent?.date)} label="Next event" />
        </div>
      )}

      <div className="dash-split">
        <section className="ui-panel ui-panel--accent" aria-labelledby="fc-clubs-title">
          <header className="ui-panel__head">
            <div className="ui-panel__titles">
              <h2 className="ui-panel__title" id="fc-clubs-title">
                My clubs
              </h2>
              <span className="ui-panel__meta">
                {coreTeam} in core teams
              </span>
            </div>
            <Link to="/clubs" className="ui-btn ui-btn--quiet ui-btn--sm">
              Directory
            </Link>
          </header>

          <div className="ui-panel__body ui-panel__body--flush">
            {clubs.length ? (
              <ul className="ui-rows">
                {clubs.map((club) => {
                  const total = club.totalMembers ?? club.memberCount ?? 0;
                  const core = club.coreTeamCount ?? 0;
                  const pending = pendingByClub.get(club._id) ?? 0;
                  const share = total > 0 ? Math.min(core / total, 1) : 0;
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
                          {total ? `${total} member${total === 1 ? '' : 's'}` : 'No members yet'}
                        </p>
                        {total > 0 ? (
                          <span className="dash-meter">
                            <span className="ui-meter" aria-hidden="true">
                              <span
                                className="ui-meter__fill"
                                style={{ transform: `scaleX(${share})` }}
                              />
                            </span>
                            <span className="dash-meter__label">{core} in core</span>
                          </span>
                        ) : null}
                      </div>
                      <div className="ui-row__meta">
                        {pending > 0 ? (
                          <span className="ui-tag is-warning">
                            {pending} pending
                          </span>
                        ) : null}
                      </div>
                      <div className="ui-row__actions">
                        <Link
                          to={`/clubs/${club._id}#join-requests`}
                          className="ui-btn ui-btn--quiet ui-btn--sm"
                        >
                          Requests
                        </Link>
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
                  title="No clubs assigned yet"
                  text="A club appears here once a club admin assigns you as its faculty coordinator."
                />
              </div>
            )}
          </div>
        </section>

        <section className="ui-panel" aria-labelledby="fc-queue-title">
          <header className="ui-panel__head">
            <div className="ui-panel__titles">
              <h2 className="ui-panel__title" id="fc-queue-title">
                Requests to review
              </h2>
              <span className="ui-panel__meta">{queue.length}</span>
            </div>
            {queue.length > 0 && firstClubId ? (
              <Link
                to={`/clubs/${firstClubId}#join-requests`}
                className="ui-btn ui-btn--ghost ui-btn--sm"
              >
                Open queue
              </Link>
            ) : null}
          </header>

          <div className="ui-panel__body ui-panel__body--flush">
            {queue.length ? (
              <ul className="ui-rows">
                {queue.slice(0, 6).map((request) => {
                  const id = clubIdOf(request);
                  const student = request.studentId;
                  const sub = [
                    clubNameOf(request),
                    student?.department,
                    student?.semester ? `sem ${student.semester}` : null,
                  ]
                    .filter(Boolean)
                    .join(' · ');
                  return (
                    <li className="ui-row" key={request._id}>
                      <DashAvatar name={student?.name} src={student?.profileImage} size="sm" />
                      <div className="ui-row__main">
                        <p className="ui-row__title">{student?.name || 'Unknown student'}</p>
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
            ) : (
              <div className="ui-panel__body">
                <DashEmpty
                  icon="check"
                  title={clubs.length ? 'Nothing waiting' : 'Requests land here'}
                  text={
                    clubs.length
                      ? 'Every join request for your clubs has been answered.'
                      : 'Student requests for your clubs will queue here for review.'
                  }
                />
              </div>
            )}
          </div>

          {queue.length > 6 ? (
            <footer className="ui-panel__foot">
              <span className="dash-at">{queue.length - 6} more waiting</span>
              {firstClubId ? (
                <Link
                  to={`/clubs/${firstClubId}#join-requests`}
                  className="ui-btn ui-btn--ghost ui-btn--sm"
                >
                  Open queue
                </Link>
              ) : null}
            </footer>
          ) : null}
        </section>
      </div>

      <DashEventsPanel
        idPrefix="fc-events"
        upcoming={upcomingEvents}
        past={pastEvents}
        tab={eventTab}
        onTab={setEventTab}
        canAdd={clubs.length > 0}
        showForm={showEventForm}
        editing={editingEvent}
        formClubId={
          editingEvent && typeof editingEvent.clubId === 'object'
            ? editingEvent.clubId?._id
            : editingEvent?.clubId || clubs[0]?._id
        }
        onAdd={openForm}
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
