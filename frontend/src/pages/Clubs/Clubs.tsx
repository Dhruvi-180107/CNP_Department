import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { ClubForm } from '../../components/clubs/ClubForm';
import { StudentClubCard } from '../../components/clubs/StudentClubCard';
import { usePageLoading } from '../../context/LoadingContext';
import './clubs.css';

interface Club {
  _id: string;
  name: string;
  description?: string;
  logo?: string | null;
  coverImage?: string | null;
  images?: string[];
  facultyCoordinatorId?: any;
  totalMembers?: number;
  memberCount?: number;
  coreTeamCount?: number;
  createdAt?: string;
}

const SearchIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="1.7" />
    <path d="M15.5 15.5 20 20" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
  </svg>
);

const DirectoryIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M4 6h16M4 12h16M4 18h10" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
  </svg>
);

export default function Clubs() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { setPageLoading } = usePageLoading();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<'all' | 'mine'>('all');

  // Student specific state
  const [myMemberships, setMyMemberships] = useState<Record<string, any>>({});
  const [myPending, setMyPending] = useState<Record<string, boolean>>({});

  const loadClubs = async () => {
    setPageLoading(true);
    setError('');
    try {
      const res = await api<any>('GET', '/clubs');
      const allClubs = res.data;
      setClubs(allClubs);

      if (user?.role === 'student') {
        const [reqs, ...memberships] = await Promise.all([
          api<any>('GET', '/join-requests/student').then(r => r.data),
          ...allClubs.map((c: any) => api<any>('GET', `/clubs/${c._id}/members`).then(r => ({ clubId: c._id, members: r.data })))
        ]);

        const pendingMap: Record<string, boolean> = {};
        reqs.forEach((r: any) => {
          if (r.status === 'pending' && r.clubId) {
            pendingMap[typeof r.clubId === 'object' ? r.clubId._id : r.clubId] = true;
          }
        });
        setMyPending(pendingMap);

        const memberMap: Record<string, any> = {};
        memberships.forEach((m: any) => {
          const me = m.members.find((x: any) => x.studentId._id === user._id);
          if (me) memberMap[m.clubId] = me;
        });
        setMyMemberships(memberMap);
      }
    } catch (e: any) {
      console.error(e);
      setError(e?.message || 'Could not load the club directory.');
    } finally {
      setLoading(false);
      setPageLoading(false);
    }
  };

  useEffect(() => {
    loadClubs();
  }, [user]);

  const isStudent = user?.role === 'student';
  const canCreate = user?.role === 'club_admin';
  const joinedCount = Object.keys(myMemberships).length;

  const coordinatorCount = useMemo(() => {
    const ids = new Set<string>();
    clubs.forEach((c) => {
      const coord = typeof c.facultyCoordinatorId === 'object' ? c.facultyCoordinatorId : null;
      if (coord?._id) ids.add(coord._id);
    });
    return ids.size;
  }, [clubs]);

  const totalMembers = useMemo(
    () => clubs.reduce((sum, c) => sum + (c.memberCount ?? c.totalMembers ?? 0), 0),
    [clubs],
  );

  // MOCK: search and the All / My clubs filter run over the full GET /clubs response.
  // Suggested API: GET /clubs?q=&scope=joined
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return clubs.filter((c) => {
      if (scope === 'mine' && !myMemberships[c._id]) return false;
      if (!q) return true;
      const coord = typeof c.facultyCoordinatorId === 'object' ? c.facultyCoordinatorId : null;
      return [c.name, c.description, coord?.name, coord?.department]
        .filter(Boolean)
        .some((field: string) => field.toLowerCase().includes(q));
    });
  }, [clubs, query, scope, myMemberships]);

  // MOCK: the featured club is chosen client side — the newest club the student belongs to,
  // else the newest club by createdAt (the API order is not contractual).
  // Suggested API: GET /clubs?featured=1 or a `featured` flag on the club record.
  const { lead, rest } = useMemo(() => {
    const byNewest = [...visible].sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime(),
    );
    const featured = (isStudent && byNewest.find((c) => myMemberships[c._id])) || byNewest[0] || null;
    return {
      lead: featured,
      rest: featured ? visible.filter((c) => c._id !== featured._id) : [],
    };
  }, [visible, isStudent, myMemberships]);

  const filtersActive = query.trim().length > 0 || scope !== 'all';

  const myClubs = useMemo(
    () => clubs.filter((c) => myMemberships[c._id]),
    [clubs, myMemberships],
  );

  const coordinatorList = useMemo(() => {
    // MOCK: coordinator → clubs grouping is derived from the directory payload.
    // Suggested API: GET /clubs/coordinators
    type CoordinatorEntry = {
      _id: string;
      name: string;
      department?: string;
      profileImage?: string | null;
      clubs: string[];
    };
    const map = new Map<string, CoordinatorEntry>();
    clubs.forEach((c) => {
      const coord = typeof c.facultyCoordinatorId === 'object' ? c.facultyCoordinatorId : null;
      if (!coord?._id || !coord?.name) return;
      const entry: CoordinatorEntry = map.get(coord._id) || {
        _id: coord._id,
        name: coord.name,
        department: coord.department,
        profileImage: coord.profileImage,
        clubs: [],
      };
      entry.clubs.push(c.name);
      map.set(coord._id, entry);
    });
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [clubs]);

  const coreTeamTotal = useMemo(
    () => clubs.reduce((sum, c) => sum + (c.coreTeamCount ?? 0), 0),
    [clubs],
  );

  const roleLabel = (clubId: string) => {
    const membership = myMemberships[clubId];
    if (!membership) return 'Not a member';
    return membership.membershipType === 'core_team'
      ? membership.position || 'Core team'
      : 'Member';
  };

  const cardTag = (club: Club) => {
    if (user?.role === 'club_admin') return 'Admin';
    if (user?.role === 'faculty_coordinator') {
      const coordId = typeof club.facultyCoordinatorId === 'object' ? club.facultyCoordinatorId?._id : club.facultyCoordinatorId;
      if (coordId === user._id) return 'Coordinator';
    }
    return undefined;
  };

  const renderCard = (club: Club, isLead = false) => (
    <StudentClubCard
      key={club._id}
      club={club as any}
      membership={myMemberships[club._id] || null}
      pending={!!myPending[club._id]}
      tag={cardTag(club)}
      lead={isLead}
      onClick={() => navigate(`/clubs/${club._id}`)}
    />
  );

  return (
    <div className="clubs-page">
      <header className="ui-page-head">
        <div className="ui-page-head__text">
          <h1 className="ui-title">Clubs</h1>
          <p className="ui-sub">
            {loading
              ? 'Loading the club directory.'
              : `${clubs.length} ${clubs.length === 1 ? 'club' : 'clubs'} · ${totalMembers} ${totalMembers === 1 ? 'member' : 'members'} · ${coordinatorCount} faculty ${coordinatorCount === 1 ? 'coordinator' : 'coordinators'}`}
          </p>
        </div>

        <div className="ui-page-actions clubs-actions">
          <div className="ui-search clubs-search">
            <SearchIcon />
            <input
              id="clubs-search"
              className="ui-field"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search clubs"
              aria-label="Search clubs by name, description or coordinator"
            />
          </div>

          {isStudent && (
            <div className="ui-seg" role="group" aria-label="Filter the directory">
              <button type="button" aria-pressed={scope === 'all'} onClick={() => setScope('all')}>
                All
              </button>
              <button type="button" aria-pressed={scope === 'mine'} onClick={() => setScope('mine')}>
                My clubs{joinedCount ? ` ${joinedCount}` : ''}
              </button>
            </div>
          )}

          {canCreate && !showForm && (
            <button type="button" className="ui-btn ui-btn--primary" onClick={() => setShowForm(true)}>
              New club
            </button>
          )}
        </div>
      </header>

      {showForm && (
        <ClubForm
          onSave={() => { setShowForm(false); loadClubs(); }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {error ? (
        <div className="clubs-error">
          <div className="ui-notice ui-notice--error" role="alert">
            <span>{error}</span>
          </div>
          <button type="button" className="ui-btn ui-btn--quiet ui-btn--sm" onClick={loadClubs}>
            Try again
          </button>
        </div>
      ) : loading ? (
        <div className="clubs-board clubs-board--loading" aria-busy="true" aria-label="Loading clubs">
          <div className="clubs-skel clubs-skel--lead">
            <div className="ui-skel clubs-skel__plate" />
            <div className="clubs-skel__body">
              <div className="ui-skel clubs-skel__line clubs-skel__line--title" />
              <div className="ui-skel clubs-skel__line" />
              <div className="ui-skel clubs-skel__line clubs-skel__line--short" />
            </div>
          </div>
          {[0, 1].map((i) => (
            <div className="clubs-skel clubs-skel--row" key={i}>
              <div className="ui-skel clubs-skel__plate clubs-skel__plate--sm" />
              <div className="clubs-skel__body">
                <div className="ui-skel clubs-skel__line clubs-skel__line--title" />
                <div className="ui-skel clubs-skel__line clubs-skel__line--short" />
              </div>
            </div>
          ))}
        </div>
      ) : clubs.length === 0 ? (
        <div className="ui-empty clubs-empty">
          <span className="ui-empty__mark"><DirectoryIcon /></span>
          <p className="ui-empty__title">No clubs yet</p>
          <p className="ui-empty__text">
            {canCreate
              ? 'Clubs appear here as soon as they are created. Start the first one with its name and a short description.'
              : 'The department has not published any student-managed clubs. Check back once a coordinator creates one.'}
          </p>
          {canCreate && !showForm && (
            <button type="button" className="ui-btn ui-btn--primary ui-btn--sm" onClick={() => setShowForm(true)}>
              New club
            </button>
          )}
        </div>
      ) : visible.length === 0 ? (
        <div className="ui-empty clubs-empty">
          <span className="ui-empty__mark"><SearchIcon /></span>
          <p className="ui-empty__title">No clubs match this view</p>
          <p className="ui-empty__text">
            {scope === 'mine' && !query.trim()
              ? 'You have not joined a club yet. Switch to all clubs to see what is open.'
              : `Nothing in ${clubs.length} clubs matches “${query.trim()}”. Try a shorter word or the coordinator's name.`}
          </p>
          <button
            type="button"
            className="ui-btn ui-btn--quiet ui-btn--sm"
            onClick={() => { setQuery(''); setScope('all'); }}
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="clubs-layout">
          <section
            className="clubs-board"
            aria-label={filtersActive ? 'Filtered clubs' : 'Club directory'}
          >
            {lead && renderCard(lead, true)}
            {rest.length > 0 && (
              <div className="clubs-board__index">
                {rest.map((club) => renderCard(club))}
              </div>
            )}

            <footer className="clubs-board__foot">
              <span>
                {filtersActive
                  ? `${visible.length} of ${clubs.length} ${clubs.length === 1 ? 'club' : 'clubs'}`
                  : `${totalMembers} ${totalMembers === 1 ? 'member' : 'members'} across ${clubs.length} ${clubs.length === 1 ? 'club' : 'clubs'}`}
              </span>
              <span className="clubs-board__foot-note">
                {isStudent ? 'Joining a club sends a request to its faculty coordinator.' : 'Each club is reviewed by a faculty coordinator.'}
              </span>
            </footer>
          </section>

          <aside className="clubs-aside" aria-label="Directory summary">
            {isStudent ? (
              <section className="ui-panel">
                <header className="ui-panel__head">
                  <div className="ui-panel__titles">
                    <h2 className="ui-panel__title">Your clubs</h2>
                    <span className="ui-panel__meta">{myClubs.length}</span>
                  </div>
                </header>
                <div className="ui-panel__body ui-panel__body--flush">
                  {myClubs.length ? (
                    <ul className="clubs-mini">
                      {myClubs.map((club) => (
                        <li key={club._id}>
                          <button
                            type="button"
                            className="clubs-mini__row"
                            onClick={() => navigate(`/clubs/${club._id}`)}
                          >
                            <span className="clubs-mini__mono" aria-hidden="true">
                              {club.logo
                                ? <img src={club.logo} alt="" />
                                : club.name.replace(/^The\s+/i, '').slice(0, 1).toUpperCase()}
                            </span>
                            <span className="clubs-mini__text">
                              <span className="clubs-mini__name">{club.name}</span>
                              <span className="clubs-mini__role">{roleLabel(club._id)}</span>
                            </span>
                            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                              <path d="m9 6 6 6-6 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="ui-panel__body">
                      <p className="clubs-admin__note">
                        You are not in a club yet. Open one from the directory and request to join; the faculty
                        coordinator reviews it.
                      </p>
                    </div>
                  )}
                </div>
              </section>
            ) : (
              <section className="ui-panel">
                <header className="ui-panel__head">
                  <div className="ui-panel__titles">
                    <h2 className="ui-panel__title">Directory</h2>
                  </div>
                </header>
                <div className="ui-panel__body ui-panel__body--tight">
                  <div className="clubs-facts">
                    <div className="clubs-fact">
                      <span>Clubs</span>
                      <span className="clubs-fact__value">{clubs.length}</span>
                    </div>
                    <div className="clubs-fact">
                      <span>Members</span>
                      <span className="clubs-fact__value">{totalMembers}</span>
                    </div>
                    <div className="clubs-fact">
                      <span>Core team seats</span>
                      <span className="clubs-fact__value">{coreTeamTotal}</span>
                    </div>
                    <div className="clubs-fact">
                      <span>Coordinators</span>
                      <span className="clubs-fact__value">{coordinatorCount}</span>
                    </div>
                  </div>
                </div>
              </section>
            )}

            <section className="ui-panel">
              <header className="ui-panel__head">
                <div className="ui-panel__titles">
                  <h2 className="ui-panel__title">Faculty coordinators</h2>
                  <span className="ui-panel__meta">{coordinatorList.length}</span>
                </div>
              </header>
              <div className="ui-panel__body ui-panel__body--flush">
                {coordinatorList.length ? (
                  <ul className="clubs-mini">
                    {coordinatorList.map((coord) => (
                      <li key={coord._id}>
                        <div className="clubs-mini__row clubs-mini__row--static">
                          {coord.profileImage ? (
                            <img src={coord.profileImage} alt="" className="ui-avatar ui-avatar--sm" />
                          ) : (
                            <span className="ui-avatar ui-avatar--sm" aria-hidden="true">
                              {coord.name.replace(/^Dr\.\s*/i, '').trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase()}
                            </span>
                          )}
                          <span className="clubs-mini__text">
                            <span className="clubs-mini__name">{coord.name}</span>
                            <span className="clubs-mini__role">
                              {coord.department || 'Faculty'}
                              {coord.clubs.length > 1 ? ` · ${coord.clubs.length} clubs` : ''}
                            </span>
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="ui-panel__body">
                    <p className="clubs-admin__note">No faculty coordinator is assigned to a club yet.</p>
                  </div>
                )}
              </div>
            </section>
          </aside>
        </div>
      )}
    </div>
  );
}
