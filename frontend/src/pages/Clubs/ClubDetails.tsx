import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { ClubManagement } from '../../components/clubs/ClubManagement';
import { MemberItem } from '../../components/clubs/MemberItem';
import { EventCard } from '../../components/events/EventCard';
import { EventForm } from '../../components/events/EventForm';
import { partitionEvents, useLocalDay } from '../../eventDate';
import { usePageLoading } from '../../context/LoadingContext';
import './clubs.css';

const ArrowLeft = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M20 12H5M11 6l-6 6 6 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const UsersIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="9" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.7" />
    <path d="M3.5 19c.6-3 2.9-4.8 5.5-4.8s4.9 1.8 5.5 4.8M16 5.4a3 3 0 0 1 0 5.6M17.4 14.6c1.8.4 3 1.9 3.4 4.4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
  </svg>
);
const CalendarIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect x="3.5" y="5" width="17" height="15" rx="2.5" stroke="currentColor" strokeWidth="1.7" />
    <path d="M3.5 10h17M8 3.5v3M16 3.5v3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
  </svg>
);
const CenterIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M12 3.5 20 8v8l-8 4.5L4 16V8l8-4.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    <path d="M12 12v8.5M12 12 4 8M12 12l8-4" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
  </svg>
);
const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
  </svg>
);
const MailIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect x="3.5" y="5.5" width="17" height="13" rx="2" stroke="currentColor" strokeWidth="1.7" />
    <path d="m4.5 7 7.5 6 7.5-6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
  </svg>
);

function monogram(name: string) {
  const cleaned = name
    .replace(/\b(club|society|committee|association|collective|group|cell)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const words = cleaned.split(' ').filter(Boolean);
  if (!words.length) return name.trim().slice(0, 2).toUpperCase();
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

function initials(name?: string) {
  if (!name) return '?';
  return name.replace(/^Dr\.\s*/i, '').trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
}

const monthShort = (value?: string) =>
  value ? new Date(value).toLocaleString('en-US', { month: 'short' }) : '';
const dayOf = (value?: string) => (value ? new Date(value).getDate() : '');
const timeOf = (value?: string) =>
  value ? new Date(value).toLocaleString('en-US', { hour: 'numeric', minute: '2-digit' }) : '';
const fullDate = (value?: string) =>
  value ? new Date(value).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export default function ClubDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { setPageLoading } = usePageLoading();
  const today = useLocalDay();

  const [club, setClub] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [pastEvents, setPastEvents] = useState<any[]>([]);
  const [clubEventTab, setClubEventTab] = useState<'upcoming' | 'past'>('upcoming');
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [joinStatus, setJoinStatus] = useState<string>('none');
  const [loading, setLoading] = useState(true);
  const [memberQuery, setMemberQuery] = useState('');
  const [deletingEvent, setDeletingEvent] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);

  const loadClubAndMembers = async () => {
    setPageLoading(true);
    try {
      const c = await api<any>('GET', `/clubs`).then(res => res.data.find((x: any) => x._id === id));
      if (!c) throw new Error("Not found");
      setClub(c);

      const mems = await api<any>('GET', `/clubs/${id}/members`).then(res => res.data);
      setMembers(mems);

      const evts = await api<any>('GET', `/clubs/${id}/events`).then(res => res.data).catch(() => []);
      const clubEvts = evts.filter((e: any) => {
        const eClubId = typeof e.clubId === 'object' ? e.clubId?._id : e.clubId;
        return !eClubId || eClubId === id;
      });
      const { upcoming, past } = partitionEvents(clubEvts);
      setUpcomingEvents(upcoming);
      setPastEvents(past);

      if (user?.role === 'student') {
        const reqs = await api<any>('GET', '/join-requests/student').then(res => res.data);
        const isMember = mems.some((m: any) => m.studentId._id === user._id);
        const hasPending = reqs.some((r: any) => r.clubId?._id === id && r.status === 'pending');
        if (isMember) setJoinStatus('member');
        else if (hasPending) setJoinStatus('pending');
        else setJoinStatus('none');
      }
    } catch (e: any) {
      alert('Error loading club details: ' + (e.message || 'Not found'));
      navigate('/clubs');
    } finally {
      setLoading(false);
      setPageLoading(false);
    }
  };

  useEffect(() => {
    loadClubAndMembers();
  }, [id, user, navigate, today]);

  useEffect(() => {
    if (!loading && window.location.hash) {
      setTimeout(() => {
        const el = document.querySelector(window.location.hash);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [loading]);

  useEffect(() => {
    if (!deletingEvent) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !deleting) setDeletingEvent(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [deletingEvent, deleting]);

  useEffect(() => {
    if (!showEventForm) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowEventForm(false);
        setEditingEvent(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showEventForm]);

  const handleJoin = async () => {
    try {
      await api('POST', `/clubs/${id}/join`);
      setJoinStatus('pending');
      alert('Join request sent successfully');
    } catch (e: any) {
      alert(e.message || 'Failed to join');
    }
  };

  const coreTeam = useMemo(() => members.filter((m) => m.membershipType === 'core_team'), [members]);
  const regularMembers = useMemo(() => members.filter((m) => m.membershipType !== 'core_team'), [members]);

  // MOCK: the composition meter counts the members array; the API exposes no aggregate on this route.
  // Suggested API: include coreTeamCount / memberCount on GET /clubs/:id

  const sortedMembers = useMemo(() => {
    return [...members].sort((a, b) => {
      const rank = (m: any) => (m.membershipType === 'core_team' ? 0 : 1);
      return rank(a) - rank(b) || (a.studentId?.name || '').localeCompare(b.studentId?.name || '');
    });
  }, [members]);

  const shownMembers = useMemo(() => {
    // MOCK: member search runs client side over GET /clubs/:id/members.
    // Suggested API: GET /clubs/:id/members?q=
    const q = memberQuery.trim().toLowerCase();
    if (!q) return sortedMembers;
    return sortedMembers.filter((m) =>
      [m.studentId?.name, m.studentId?.email, m.studentId?.department, m.position]
        .filter(Boolean)
        .some((field: string) => field.toLowerCase().includes(q)),
    );
  }, [sortedMembers, memberQuery]);

  if (loading) {
    return (
      <div className="clubs-page clubs-detail" aria-busy="true" aria-label="Loading club">
        <div className="ui-skel clubs-detail__loading-back" />
        <div className="clubs-board clubs-board--loading">
          <div className="clubs-skel">
            <div className="ui-skel clubs-skel__plate" />
            <div className="clubs-skel__body">
              <div className="ui-skel clubs-skel__line clubs-skel__line--title" />
              <div className="ui-skel clubs-skel__line" />
              <div className="ui-skel clubs-skel__line clubs-skel__line--short" />
            </div>
          </div>
          <div className="clubs-skel clubs-skel--row">
            <div className="ui-skel clubs-skel__plate clubs-skel__plate--sm" />
            <div className="clubs-skel__body">
              <div className="ui-skel clubs-skel__line clubs-skel__line--short" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!club) return null;

  const isCoordinator = user?.role === 'faculty_coordinator' &&
    (typeof club.facultyCoordinatorId === 'object' ? club.facultyCoordinatorId?._id : club.facultyCoordinatorId) === user?._id;
  const isClubAdmin = user?.role === 'club_admin';
  const canManage = isCoordinator || isClubAdmin;

  const coordinator = typeof club.facultyCoordinatorId === 'object' ? club.facultyCoordinatorId : null;
  const myMembership = members.find((m) => m.studentId?._id === user?._id);
  const coreCount = coreTeam.length;
  const regularCount = regularMembers.length;
  const coreShare = members.length ? coreCount / members.length : 0;
  const nextEvent = upcomingEvents[0] || null;

  const stateTag = (() => {
    if (isClubAdmin) return { text: 'Club admin', tone: 'ui-tag--plain' };
    if (isCoordinator) return { text: 'Coordinator', tone: 'is-accent' };
    if (joinStatus === 'member') {
      return myMembership?.membershipType === 'core_team'
        ? { text: myMembership.position ? `Core team · ${myMembership.position}` : 'Core team', tone: 'is-accent' }
        : { text: 'Member', tone: 'is-positive' };
    }
    if (joinStatus === 'pending') return { text: 'Request pending', tone: 'is-warning' };
    return null;
  })();

  return (
    <div className="clubs-page clubs-detail">
      <button type="button" className="clubs-back" onClick={() => navigate('/clubs')}>
        <ArrowLeft />
        All clubs
      </button>

      <section className="clubs-hero" aria-labelledby="club-name">
        {club.coverImage && (
          <img className="clubs-hero__cover" src={club.coverImage} alt="" />
        )}

        <div>
          {club.logo ? (
            <img src={club.logo} alt="" className="clubs-mono clubs-mono--image" />
          ) : (
            <span className="clubs-mono" aria-hidden="true">{monogram(club.name)}</span>
          )}
        </div>

        <div className="clubs-hero__main">
          <h1 id="club-name" className="clubs-hero__title">{club.name}</h1>

          <div className="clubs-hero__facts">
            {coordinator?.name ? (
              <span className="clubs-hero__fact">
                <span className="clubs-card__coord">
                  {coordinator.profileImage ? (
                    <img src={coordinator.profileImage} alt="" className="clubs-card__coord-face" />
                  ) : (
                    <span className="clubs-card__coord-face" aria-hidden="true">{initials(coordinator.name).slice(0, 1)}</span>
                  )}
                  <span className="clubs-card__coord-text">
                    <span className="clubs-card__coord-name">{coordinator.name}</span>
                    {coordinator.department && <span className="clubs-card__coord-dept">{coordinator.department}</span>}
                  </span>
                </span>
              </span>
            ) : (
              <span className="clubs-hero__fact">No faculty coordinator assigned</span>
            )}

            <span className="clubs-hero__fact">
              <UsersIcon />
              {members.length} {members.length === 1 ? 'member' : 'members'}
            </span>

            {coreCount > 0 && (
              <span className="clubs-hero__fact">
                <CenterIcon />
                {coreCount} core team
              </span>
            )}
          </div>
        </div>

        <div className="clubs-hero__actions">
          {stateTag && <span className={`ui-tag ${stateTag.tone}`}>{stateTag.text}</span>}
          {user?.role === 'student' && joinStatus === 'none' && (
            <button type="button" className="ui-btn ui-btn--primary" onClick={handleJoin}>
              Join club
            </button>
          )}
          {user?.role === 'student' && joinStatus === 'pending' && (
            <span className="ui-meta">Waiting for the coordinator</span>
          )}
        </div>
      </section>

      <div className="ui-stats clubs-stats">
        <div className="ui-stat">
          <div className="ui-stat__value">{members.length}</div>
          <div className="ui-stat__label">Members</div>
        </div>
        <div className="ui-stat">
          <div className="ui-stat__value">{coreCount}</div>
          <div className="ui-stat__label">Core team</div>
        </div>
        <div className="ui-stat">
          <div className="ui-stat__value">{upcomingEvents.length}</div>
          <div className="ui-stat__label">Upcoming events</div>
        </div>
        <div className="ui-stat">
          <div className="ui-stat__value">{club.createdAt ? new Date(club.createdAt).getFullYear() : '—'}</div>
          <div className="ui-stat__label">Created</div>
        </div>
      </div>

      <div className="clubs-split">
        <div className="clubs-main">
          <section className="ui-panel" aria-labelledby="club-about-title">
            <header className="ui-panel__head clubs-head">
              <div className="ui-panel__titles">
                <h2 id="club-about-title" className="ui-panel__title">About</h2>
              </div>
            </header>
            <div className="ui-panel__body">
              <p className="clubs-prose">{club.description || 'This club has not written a description yet.'}</p>
              {club.images && club.images.length > 0 && (
                <div className="clubs-gallery">
                  {club.images.map((img: any, i: number) => (
                    <img
                      key={i}
                      src={typeof img === 'string' ? img : img.url}
                      alt={`${club.name} gallery image ${i + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          </section>

          {canManage && <ClubManagement club={club} onUpdate={loadClubAndMembers} />}

          <section className="ui-panel" aria-labelledby="club-events-title">
            <header className="ui-panel__head clubs-head">
              <div className="ui-panel__titles">
                <h2 id="club-events-title" className="ui-panel__title">Events</h2>
                <span className="ui-panel__meta">{upcomingEvents.length} upcoming · {pastEvents.length} past</span>
              </div>
              <div className="clubs-members__tools">
                <div className="ui-seg" role="group" aria-label="Event period">
                  <button type="button" aria-pressed={clubEventTab === 'upcoming'} onClick={() => setClubEventTab('upcoming')}>
                    Upcoming
                  </button>
                  <button type="button" aria-pressed={clubEventTab === 'past'} onClick={() => setClubEventTab('past')}>
                    Past
                  </button>
                </div>
                {canManage && !showEventForm && (
                  <button
                    type="button"
                    className="ui-btn ui-btn--quiet ui-btn--sm"
                    onClick={() => {
                      setEditingEvent(null);
                      setShowEventForm(true);
                    }}
                  >
                    Add event
                  </button>
                )}
              </div>
            </header>

            <div className="ui-panel__body ui-panel__body--flush">
              <div className="ui-panel__body">
                {(clubEventTab === 'upcoming' ? upcomingEvents : pastEvents).length > 0 ? (
                  <div className="clubs-events">
                    {(clubEventTab === 'upcoming' ? upcomingEvents : pastEvents).map(e => (
                      <EventCard
                        key={e._id}
                        event={{
                          ...e,
                          clubId: typeof e.clubId === 'object' && e.clubId ? e.clubId : club,
                        }}
                        canManage={canManage}
                        isPast={clubEventTab === 'past'}
                        onEdit={evt => {
                          setEditingEvent(evt);
                          setShowEventForm(true);
                        }}
                        onDelete={(eventId) => {
                          const found = [...upcomingEvents, ...pastEvents].find((x) => x._id === eventId);
                          setDeletingEvent({ id: eventId, title: found?.title || 'this event' });
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="ui-empty clubs-empty-inline">
                    <span className="ui-empty__mark"><CalendarIcon /></span>
                    <p className="ui-empty__title">
                      No {clubEventTab} events
                    </p>
                    <p className="ui-empty__text">
                      {clubEventTab === 'upcoming'
                        ? 'Nothing is scheduled. Events added here appear on the department calendar as well.'
                        : 'Past events will be listed here once the first one has run.'}
                    </p>
                    {canManage && clubEventTab === 'upcoming' && (
                      <button
                        type="button"
                        className="ui-btn ui-btn--quiet ui-btn--sm"
                        onClick={() => { setEditingEvent(null); setShowEventForm(true); }}
                      >
                        Add event
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="ui-panel" id="club-members" aria-labelledby="club-members-title">
            <header className="ui-panel__head clubs-head">
              <div className="ui-panel__titles">
                <h2 id="club-members-title" className="ui-panel__title">Members</h2>
                <span className="ui-panel__meta">{members.length}</span>
              </div>
              {members.length > 6 && (
                <div className="ui-search clubs-members__search">
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="1.7" />
                    <path d="M15.5 15.5 20 20" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                  </svg>
                  <input
                    className="ui-field"
                    type="search"
                    value={memberQuery}
                    onChange={(e) => setMemberQuery(e.target.value)}
                    placeholder="Find a member"
                    aria-label="Search members"
                  />
                </div>
              )}
            </header>

            <div className="ui-panel__body ui-panel__body--flush">
              {shownMembers.length > 0 ? (
                <div className="clubs-members">
                  {shownMembers.map(m => (
                    <MemberItem
                      key={m._id}
                      m={m}
                      clubId={club._id}
                      canManage={canManage}
                      onRefresh={loadClubAndMembers}
                    />
                  ))}
                </div>
              ) : (
                <div className="ui-panel__body">
                  <div className="ui-empty clubs-empty-inline">
                    <span className="ui-empty__mark"><UsersIcon /></span>
                    <p className="ui-empty__title">
                      {members.length ? 'No member matches that search' : 'No members yet'}
                    </p>
                    <p className="ui-empty__text">
                      {members.length
                        ? 'Try the full name, the department, or the email address.'
                        : 'Students join from the directory and land in the join requests queue for approval.'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>

        <aside className="clubs-aside" aria-label="Club details">
          {nextEvent && (
            <section className="ui-panel">
              <header className="ui-panel__head clubs-head">
                <div className="ui-panel__titles">
                  <h2 className="ui-panel__title">Next up</h2>
                </div>
              </header>
              <div className="ui-panel__body ui-panel__body--tight">
                <div className="clubs-next">
                  <div className="clubs-next__date">
                    <span className="clubs-next__day">{dayOf(nextEvent.eventDate || nextEvent.date)}</span>
                    <span className="clubs-next__month">{monthShort(nextEvent.eventDate || nextEvent.date)}</span>
                  </div>
                  <div>
                    <p className="clubs-next__title">{nextEvent.title}</p>
                    <p className="clubs-next__meta">
                      {timeOf(nextEvent.eventDate || nextEvent.date)}
                      {nextEvent.location ? ` · ${nextEvent.location}` : ''}
                    </p>
                  </div>
                </div>
              </div>
            </section>
          )}

          <section className="ui-panel">
            <header className="ui-panel__head clubs-head">
              <div className="ui-panel__titles">
                <h2 className="ui-panel__title">Faculty coordinator</h2>
              </div>
            </header>
            <div className="ui-panel__body ui-panel__body--tight">
              {coordinator?.name ? (
                <div className="clubs-card-panel">
                  <div className="clubs-person">
                    {coordinator.profileImage ? (
                      <img src={coordinator.profileImage} alt="" className="ui-avatar" />
                    ) : (
                      <span className="ui-avatar" aria-hidden="true">{initials(coordinator.name)}</span>
                    )}
                    <div className="ui-grow">
                      <div className="clubs-person__name">{coordinator.name}</div>
                      <div className="clubs-person__sub">{coordinator.department || 'Faculty coordinator'}</div>
                    </div>
                  </div>
                  {coordinator.email && (
                    <a className="clubs-person__mail" href={`mailto:${coordinator.email}`}>
                      <MailIcon />
                      {coordinator.email}
                    </a>
                  )}
                </div>
              ) : (
                <p className="clubs-admin__note">No coordinator assigned yet.</p>
              )}
            </div>
          </section>

          <section className="ui-panel">
            <header className="ui-panel__head clubs-head">
              <div className="ui-panel__titles">
                <h2 className="ui-panel__title">Composition</h2>
                <span className="ui-panel__meta">{members.length} members</span>
              </div>
            </header>
            <div className="ui-panel__body ui-panel__body--tight clubs-card-panel">
              <div className="clubs-composition">
                <div className="ui-meter" aria-hidden="true">
                  <div className="ui-meter__fill" style={{ transform: `scaleX(${coreShare})` }} />
                </div>
                <div className="clubs-composition__legend">
                  <span><i className="clubs-composition__key" /><b>{coreCount}</b> core team</span>
                  <span><i className="clubs-composition__key clubs-composition__key--rest" /><b>{regularCount}</b> {regularCount === 1 ? 'member' : 'members'}</span>
                </div>
              </div>

              <div className="clubs-facts">
                {joinStatus === 'member' && myMembership && (
                  <div className="clubs-fact">
                    <span>Your role</span>
                    <span className="clubs-fact__value">
                      {myMembership.membershipType === 'core_team'
                        ? myMembership.position || 'Core team'
                        : 'Member'}
                    </span>
                  </div>
                )}
                {joinStatus === 'member' && myMembership?.joinedAt && (
                  <div className="clubs-fact">
                    <span>Joined</span>
                    <span className="clubs-fact__value">{fullDate(myMembership.joinedAt)}</span>
                  </div>
                )}
                {isCoordinator && (
                  <div className="clubs-fact">
                    <span>Your role</span>
                    <span className="clubs-fact__value">Faculty coordinator</span>
                  </div>
                )}
                {isClubAdmin && (
                  <div className="clubs-fact">
                    <span>Your role</span>
                    <span className="clubs-fact__value">Club admin</span>
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="ui-panel">
            <header className="ui-panel__head clubs-head">
              <div className="ui-panel__titles">
                <h2 className="ui-panel__title">Core team</h2>
                <span className="ui-panel__meta">{coreTeam.length}</span>
              </div>
            </header>
            <div className="ui-panel__body ui-panel__body--tight">
              {coreTeam.length ? (
                <div className="clubs-core">
                  {coreTeam.map((m) => (
                    <div className="clubs-core__item" key={m._id}>
                      {m.studentId?.profileImage ? (
                        <img src={m.studentId.profileImage} alt="" className="ui-avatar" />
                      ) : (
                        <span className="ui-avatar" aria-hidden="true">{initials(m.studentId?.name)}</span>
                      )}
                      <span className="clubs-core__text">
                        <span className="clubs-core__name">{m.studentId?.name || 'Member'}</span>
                        <span className="clubs-core__role">{m.position || 'Core team'}</span>
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="clubs-admin__note">No core team assigned yet.</p>
              )}
            </div>
          </section>
        </aside>
      </div>

      {showEventForm && (
        <div
          className="ui-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setShowEventForm(false);
              setEditingEvent(null);
            }
          }}
        >
          <div className="ui-modal ui-modal--wide" role="dialog" aria-modal="true" aria-labelledby="clubs-event-form-title">
            <div className="ui-modal__head">
              <div>
                <h2 id="clubs-event-form-title" className="ui-panel__title">
                  {editingEvent ? 'Edit event' : 'New event'}
                </h2>
                <p className="ui-hint clubs-modal__sub">
                  Events added here also appear on the department calendar.
                </p>
              </div>
              <button
                type="button"
                className="ui-icon-btn"
                onClick={() => { setShowEventForm(false); setEditingEvent(null); }}
                aria-label="Close"
              >
                <CloseIcon />
              </button>
            </div>
            <EventForm
              clubId={id!}
              event={editingEvent}
              onSave={() => {
                setShowEventForm(false);
                setEditingEvent(null);
                loadClubAndMembers();
              }}
              onCancel={() => {
                setShowEventForm(false);
                setEditingEvent(null);
              }}
            />
          </div>
        </div>
      )}

      {deletingEvent && (
        <div
          className="ui-overlay"
          onMouseDown={(e) => { if (e.target === e.currentTarget && !deleting) setDeletingEvent(null); }}
        >
          <div className="ui-modal ui-modal--narrow" role="dialog" aria-modal="true" aria-labelledby="clubs-delete-event-title">
            <div className="ui-modal__head">
              <h2 id="clubs-delete-event-title" className="ui-panel__title">Delete event</h2>
              <button type="button" className="ui-icon-btn" onClick={() => setDeletingEvent(null)} disabled={deleting} aria-label="Close">
                <CloseIcon />
              </button>
            </div>
            <div className="ui-modal__body">
              <p className="clubs-modal__danger-text">
                <strong>{deletingEvent.title}</strong> will be removed from the club and the department calendar.
                This cannot be undone.
              </p>
            </div>
            <div className="ui-modal__foot">
              <button type="button" className="ui-btn ui-btn--ghost" onClick={() => setDeletingEvent(null)} disabled={deleting}>
                Keep event
              </button>
              <button
                type="button"
                className="ui-btn ui-btn--danger"
                disabled={deleting}
                onClick={async () => {
                  try {
                    setDeleting(true);
                    await api('DELETE', `/events/${deletingEvent.id}`);
                    setUpcomingEvents(prev => prev.filter(x => x._id !== deletingEvent.id));
                    setPastEvents(prev => prev.filter(x => x._id !== deletingEvent.id));
                    setDeletingEvent(null);
                  } catch (err: any) {
                    alert(err.message || 'Failed to delete event');
                  } finally {
                    setDeleting(false);
                  }
                }}
              >
                {deleting ? 'Deleting…' : 'Delete event'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
