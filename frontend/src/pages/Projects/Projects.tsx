import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { ProjectForm } from '../../components/projects/ProjectForm';
import { usePageLoading } from '../../context/LoadingContext';
import './projects.css';

/* ── Shapes the API returns ───────────────────────────────────────────────── */

interface ProjectPerson {
  _id?: string;
  name?: string;
  email?: string;
  role?: string;
  department?: string;
  semester?: number | null;
  profileImage?: string | null;
}

interface ProjectRecord {
  _id: string;
  name: string;
  description?: string;
  status?: string;
  image?: string | null;
  teamLeaderId?: ProjectPerson | string | null;
  createdAt?: string;
  updatedAt?: string;
}

interface MemberRecord {
  _id: string;
  studentId?: ProjectPerson | string | null;
}

interface JoinRequestRecord {
  _id: string;
  projectId?: { _id?: string } | string | null;
  status?: string;
}

type StatusKey = 'active' | 'completed' | 'inactive';

const STATUS_ORDER: StatusKey[] = ['active', 'completed', 'inactive'];

const STATUS_LABEL: Record<StatusKey, string> = {
  active: 'Active',
  completed: 'Completed',
  inactive: 'Inactive',
};

const STATUS_NOTE: Record<StatusKey, string> = {
  active: 'Work in progress',
  completed: 'Delivered and closed',
  inactive: 'Paused for now',
};

function statusKey(status?: string): StatusKey {
  return status === 'completed' || status === 'inactive' ? status : 'active';
}

function personOf(value?: ProjectPerson | string | null): ProjectPerson | null {
  return value && typeof value === 'object' ? value : null;
}

function initialOf(name?: string): string {
  return (name || '?').replace(/^Dr\.\s*/i, '').trim().charAt(0).toUpperCase() || '?';
}

/* Two letters, like the club boards: Campus Energy Monitor reads CE. */
function monogram(name?: string): string {
  const words = (name || '').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

/* ── Marks ────────────────────────────────────────────────────────────────── */

function SearchMark() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.7" />
      <path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function ArrowMark() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 12h15m-5.5-5.5L19 12l-5.5 5.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronMark() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m8 10 4 4 4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FolderMark() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 7.5A1.5 1.5 0 0 1 5.5 6h4l1.6 2H18.5A1.5 1.5 0 0 1 20 9.5v7A1.5 1.5 0 0 1 18.5 18h-13A1.5 1.5 0 0 1 4 16.5v-9Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PersonAvatar({ person, size = 'sm' }: { person: ProjectPerson | null; size?: 'sm' | 'md' }) {
  const className = size === 'sm' ? 'ui-avatar ui-avatar--sm prj-avatar' : 'ui-avatar prj-avatar';
  if (!person) {
    return (
      <span className={`${className} is-empty`} aria-hidden="true">
        ?
      </span>
    );
  }
  if (person.profileImage) {
    return (
      <span className={className}>
        <img src={person.profileImage} alt="" />
      </span>
    );
  }
  return (
    <span className={className} aria-hidden="true">
      {initialOf(person.name)}
    </span>
  );
}

/* ── Page ─────────────────────────────────────────────────────────────────── */

export default function Projects() {
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [membersByProject, setMembersByProject] = useState<Record<string, ProjectPerson[]>>({});
  const [pendingProjectIds, setPendingProjectIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | StatusKey>('all');
  const [openGroups, setOpenGroups] = useState<Record<StatusKey, boolean>>({
    active: true,
    completed: false,
    inactive: false,
  });

  const { user } = useAuth();
  const { setPageLoading } = usePageLoading();
  const newProjectTrigger = useRef<HTMLButtonElement>(null);
  const closeForm = () => {
    setShowForm(false);
    newProjectTrigger.current?.focus();
  };

  const loadProjects = async () => {
    setPageLoading(true);
    try {
      setError(null);
      let list: ProjectRecord[] = [];
      if (user?.role === 'faculty_mentor') {
        const res = await api<any>('GET', `/mentors/${user._id}/projects`);
        list = (res.data || []).map((m: any) => m.project).filter(Boolean);
      } else {
        const res = await api<any>('GET', '/projects');
        list = res.data || [];
      }
      setProjects(list);

      // MOCK: GET /projects carries no roster, so team size and "your relation" are
      // joined client-side from the per-project member list (one call per project).
      // Suggested API: include member ids/count on GET /projects, or GET /projects?mine=1.
      const [rosters, pending] = await Promise.all([
        Promise.all(
          list.map((project) =>
            api<any>('GET', `/projects/${project._id}/members`)
              .then((res) => ({ id: project._id, members: res.data || [] }))
              .catch(() => ({ id: project._id, members: [] as MemberRecord[] })),
          ),
        ),
        user?.role === 'student'
          ? api<any>('GET', '/join-requests/student')
              .then((res) => (res.data || []) as JoinRequestRecord[])
              .catch(() => [] as JoinRequestRecord[])
          : Promise.resolve([] as JoinRequestRecord[]),
      ]);

      const index: Record<string, ProjectPerson[]> = {};
      rosters.forEach(({ id, members }) => {
        index[id] = (members as MemberRecord[])
          .map((member) => personOf(member.studentId))
          .filter((person): person is ProjectPerson => Boolean(person));
      });
      setMembersByProject(index);

      setPendingProjectIds(
        pending
          .filter((request) => request.status === 'pending')
          .map((request) => {
            const project = request.projectId;
            return typeof project === 'object' && project ? project._id || '' : String(project || '');
          })
          .filter(Boolean),
      );
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Failed to load projects');
    } finally {
      setLoading(false);
      setPageLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, [user]);

  const decorated = useMemo(
    () =>
      projects.map((project) => {
        const leader = personOf(project.teamLeaderId);
        const members = membersByProject[project._id] || [];
        return {
          project,
          status: statusKey(project.status),
          leader,
          members,
          pending: pendingProjectIds.includes(project._id),
        };
      }),
    [projects, membersByProject, pendingProjectIds],
  );

  // MOCK: GET /projects takes no query, so search and the status filter run over the
  // fetched list. Suggested API: GET /projects?q=&status=.
  const searched = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return decorated;
    return decorated.filter(({ project, leader }) =>
      [project.name, project.description, leader?.name]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term)),
    );
  }, [decorated, query]);

  const statusCounts = useMemo(() => {
    const counts: Record<StatusKey, number> = { active: 0, completed: 0, inactive: 0 };
    decorated.forEach(({ status }) => {
      counts[status] += 1;
    });
    return counts;
  }, [decorated]);

  const visibleStatuses = STATUS_ORDER.filter((status) => statusCounts[status] > 0);

  const groups = STATUS_ORDER.map((status) => ({
    status,
    items: searched.filter((item) => item.status === status),
  })).filter(
    (group) =>
      group.items.length > 0 && (statusFilter === 'all' ? true : group.status === statusFilter),
  );

  /* Only the student's standing varies row to row; the admin and mentor views
     already list a single relation for the whole page. */
  const relationOf = (item: (typeof decorated)[number]): string | null => {
    if (!user || user.role !== 'student') return null;
    if (item.leader?._id && item.leader._id === user._id) return 'You lead';
    if (item.members.some((member) => member._id === user._id)) return 'Member';
    if (item.pending) return 'Request pending';
    return null;
  };

  const subline =
    user?.role === 'project_admin'
      ? 'Every GUIITAR project, its status and the student leading each team.'
      : user?.role === 'faculty_mentor'
        ? 'The projects you mentor, with their status and team leader.'
        : 'GUIITAR project teams, their status and the student leading each one.';

  const leaders = useMemo(() => {
    const seen = new Set<string>();
    return decorated
      .map(({ project, leader }) => ({ project, leader }))
      .filter(({ leader }) => {
        if (!leader?._id || seen.has(leader._id)) return false;
        seen.add(leader._id);
        return true;
      });
  }, [decorated]);

  const uniqueStudents = useMemo(() => {
    const seen = new Set<string>();
    Object.values(membersByProject).forEach((members) =>
      members.forEach((member) => {
        if (member._id) seen.add(member._id);
      }),
    );
    return seen.size;
  }, [membersByProject]);

  /* What the portfolio means to the person reading it. */
  const standing = useMemo(() => {
    if (!user) return [] as { label: string; value: number }[];
    if (user.role === 'project_admin') return [{ label: 'Administering', value: projects.length }];
    if (user.role === 'faculty_mentor') return [{ label: 'Mentoring', value: projects.length }];
    if (user.role !== 'student') return [];
    const leading = decorated.filter((item) => item.leader?._id === user._id).length;
    const onTeam = decorated.filter((item) =>
      item.members.some((member) => member._id === user._id),
    ).length;
    return [
      { label: 'Leading', value: leading },
      { label: 'On a team', value: onTeam },
    ];
  }, [user, projects.length, decorated]);

  const toggleGroup = (status: StatusKey) =>
    setOpenGroups((current) => ({ ...current, [status]: !current[status] }));

  const filters: { key: 'all' | StatusKey; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: projects.length },
    ...visibleStatuses.map((status) => ({
      key: status,
      label: STATUS_LABEL[status],
      count: statusCounts[status],
    })),
  ];

  return (
    <div className="prj-page">
      <header className="ui-page-head prj-head">
        <div className="ui-page-head__text">
          <div className="prj-head__title">
            <h1 className="ui-title">Projects</h1>
            {!loading && <span className="prj-head__count">{projects.length}</span>}
          </div>
          <p className="ui-sub">{subline}</p>
        </div>

        <div className="ui-page-actions prj-head__actions">
          <div className="ui-search prj-search">
            <SearchMark />
            <input
              className="ui-field"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search projects"
              aria-label="Search projects"
            />
          </div>
          {user?.role === 'project_admin' && (
            <button
              ref={newProjectTrigger}
              type="button"
              className="ui-btn ui-btn--primary"
              onClick={() => setShowForm(true)}
            >
              New project
            </button>
          )}
        </div>
      </header>

      {showForm && (
        <ProjectForm
          onSave={() => {
            closeForm();
            loadProjects();
          }}
          onCancel={closeForm}
        />
      )}

      {error && (
        <div className="ui-notice ui-notice--error prj-notice" role="alert">
          <span>{error}</span>
          <button type="button" className="ui-btn ui-btn--quiet ui-btn--sm" onClick={loadProjects}>
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div aria-hidden="true">
          <div className="prj-skeleton-rows">
            {[0, 1, 2].map((row) => (
              <div className="prj-skel-row" key={row}>
                <span className="ui-skel prj-skel-row__mark" />
                <div className="prj-skel-row__main">
                  <span className="ui-skel" style={{ width: '38%', height: 13 }} />
                  <span className="ui-skel" style={{ width: '58%', height: 9 }} />
                </div>
                <span className="ui-skel prj-skel-row__person" />
                <span className="ui-skel prj-skel-row__meta" />
              </div>
            ))}
          </div>
        </div>
      ) : error && projects.length === 0 ? null : projects.length === 0 ? (
        <div className="ui-empty prj-empty">
          <span className="ui-empty__mark">
            <FolderMark />
          </span>
          <p className="ui-empty__title">No projects yet</p>
          <p className="ui-empty__text">
            {user?.role === 'project_admin'
              ? 'Create the first GUIITAR project to give a team a name, a status and a place to work.'
              : 'Projects appear here once the council publishes them.'}
          </p>
          {user?.role === 'project_admin' && (
            <button type="button" className="ui-btn ui-btn--primary ui-btn--sm" onClick={() => setShowForm(true)}>
              New project
            </button>
          )}
        </div>
      ) : (
        <div className="prj-layout">
          <section className="ui-panel prj-panel" aria-label="Project portfolio">
            <header className="ui-panel__head prj-panel__head">
              <div
                className="ui-seg prj-statusfilter"
                role="group"
                aria-label="Filter projects by status"
              >
                {filters.map((filter) => (
                  <button
                    key={filter.key}
                    type="button"
                    aria-pressed={statusFilter === filter.key}
                    onClick={() => setStatusFilter(filter.key)}
                  >
                    {filter.label}
                    <span className="prj-statusfilter__count">{filter.count}</span>
                  </button>
                ))}
              </div>
              <p className="prj-toolbar__meta" aria-live="polite">
                {searched.length === projects.length
                  ? `${projects.length} ${projects.length === 1 ? 'project' : 'projects'}`
                  : `${searched.length} of ${projects.length} projects`}
              </p>
            </header>

            <div className="ui-panel__body ui-panel__body--flush prj-panel__body">
              {groups.length === 0 ? (
              <div className="ui-empty prj-empty">
                <span className="ui-empty__mark">
                  <FolderMark />
                </span>
                <p className="ui-empty__title">No projects match this view</p>
                <p className="ui-empty__text">
                  {query.trim() && statusFilter !== 'all'
                    ? `Nothing matches “${query.trim()}” in ${STATUS_LABEL[statusFilter as StatusKey].toLowerCase()} projects.`
                    : query.trim()
                      ? `Nothing in the portfolio matches “${query.trim()}”.`
                      : 'This status has no projects in the portfolio.'}
                </p>
                <button
                  type="button"
                  className="ui-btn ui-btn--quiet ui-btn--sm"
                  onClick={() => {
                    setQuery('');
                    setStatusFilter('all');
                  }}
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <div className="prj-list">
                {groups.map((group) => {
                  const open = statusFilter !== 'all' || openGroups[group.status];
                  return (
                    <section
                      key={group.status}
                      className={`prj-group is-${group.status}`}
                      aria-labelledby={`prj-group-${group.status}`}
                    >
                      <header className="prj-group__head">
                        <span className={`prj-status-mark is-${group.status}`} aria-hidden="true" />
                        <h2 className="prj-group__title" id={`prj-group-${group.status}`}>
                          {STATUS_LABEL[group.status]}
                        </h2>
                        <span className="prj-group__count">{group.items.length}</span>
                        <span className="prj-group__note">{STATUS_NOTE[group.status]}</span>
                        {statusFilter === 'all' && (
                          <button
                            type="button"
                            className="prj-group__toggle"
                            aria-expanded={open}
                            aria-controls={`prj-rows-${group.status}`}
                            onClick={() => toggleGroup(group.status)}
                          >
                            {open ? 'Hide' : 'Show'}
                            <ChevronMark />
                          </button>
                        )}
                      </header>

                      {open && (
                        <ul className="prj-rows" id={`prj-rows-${group.status}`}>
                          {group.items.map((item) => {
                            const { project, leader, members, status } = item;
                            const relation = relationOf(item);
                            const stack = members.slice(0, 4);
                            return (
                              <li key={project._id}>
                                <Link className={`prj-row is-${status}`} to={`/projects/${project._id}`}>
                                  <span className="prj-row__mark" aria-hidden="true">
                                    {project.image ? (
                                      <img src={project.image} alt="" />
                                    ) : (
                                      monogram(project.name)
                                    )}
                                  </span>

                                  <span className="prj-row__body">
                                    <span className="prj-row__title">{project.name}</span>
                                    <span
                                      className="prj-row__desc"
                                      title={project.description || undefined}
                                    >
                                      {project.description || 'No description recorded yet.'}
                                    </span>
                                  </span>

                                  <span className="prj-row__meta">
                                    <span
                                      className="prj-row__team"
                                      title={`${members.length} ${members.length === 1 ? 'member' : 'members'}`}
                                    >
                                      {stack.length ? (
                                        <span className="prj-stack" aria-hidden="true">
                                          {stack.map((member, index) => (
                                            <PersonAvatar key={member._id || index} person={member} />
                                          ))}
                                          {members.length > stack.length && (
                                            <span className="ui-avatar ui-avatar--sm prj-stack__more">
                                              +{members.length - stack.length}
                                            </span>
                                          )}
                                        </span>
                                      ) : null}
                                      <span className="prj-row__team-count">
                                        {members.length || 0}
                                      </span>
                                    </span>

                                    <span className="prj-row__leader">
                                      <PersonAvatar person={leader} />
                                      <span className="prj-row__leader-text">
                                        <span className="prj-row__leader-name">
                                          {leader?.name || 'Leader not set'}
                                        </span>
                                        <span className="prj-row__label">Team leader</span>
                                      </span>
                                    </span>

                                    <span className="prj-row__rel">
                                      {relation && (
                                        <span className="ui-tag ui-tag--plain prj-rel">{relation}</span>
                                      )}
                                    </span>
                                  </span>

                                  <span className="prj-row__open" aria-hidden="true">
                                    <span>Open</span>
                                    <ArrowMark />
                                  </span>
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </section>
                  );
                })}
              </div>
            )}
            </div>

            <footer className="ui-panel__foot prj-panel__foot">
              <p>
                {projects.length} {projects.length === 1 ? 'project' : 'projects'}
                <span aria-hidden="true"> · </span>
                {uniqueStudents} {uniqueStudents === 1 ? 'student' : 'students'} on teams
                <span aria-hidden="true"> · </span>
                {leaders.length} {leaders.length === 1 ? 'team leader' : 'team leaders'}
              </p>
              <p>Join requests are reviewed by the project’s mentors and admins.</p>
            </footer>
          </section>

          <aside className="prj-aside" aria-label="Portfolio summary">
            {leaders.length > 0 && (
              <section className="ui-panel">
                <header className="ui-panel__head">
                  <div className="ui-panel__titles">
                    <h2 className="ui-panel__title">Team leaders</h2>
                    <span className="ui-panel__meta">{leaders.length}</span>
                  </div>
                </header>
                <div className="ui-panel__body ui-panel__body--flush">
                  <ul className="ui-rows">
                    {leaders.map(({ project, leader }) => (
                      <li key={project._id}>
                        <Link className="ui-row ui-row--link prj-lead" to={`/projects/${project._id}`}>
                          <PersonAvatar person={leader} />
                          <div className="ui-row__main">
                            <div className="ui-row__title">{leader?.name || 'Not assigned'}</div>
                            <div className="ui-row__sub">{project.name}</div>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            )}

            {standing.length > 0 && (
              <section className="ui-panel">
                <header className="ui-panel__head">
                  <div className="ui-panel__titles">
                    <h2 className="ui-panel__title">You</h2>
                  </div>
                </header>
                <div className="ui-panel__body">
                  <dl className="prj-standing">
                    {standing.map((row) => (
                      <div key={row.label}>
                        <dt>{row.label}</dt>
                        <dd>{row.value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </section>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
