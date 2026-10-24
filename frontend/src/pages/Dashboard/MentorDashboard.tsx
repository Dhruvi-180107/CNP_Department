import { Link } from 'react-router-dom';
import {
  DashAvatar,
  DashEmpty,
  DashLoadError,
  DashNotifications,
  DashStat,
  fmtShortDay,
} from './StaffBits';

interface MentorDashboardProps {
  mentorProjects: any[];
  unread: number;
  loadError: string | null;
  onReload: () => void;
}

const statusTone = (status: string) => {
  if (status === 'active') return 'is-positive';
  if (status === 'completed') return 'is-accent';
  return '';
};

/**
 * Faculty mentor — the projects they mentor. A calm, read-only reading of
 * status, team leadership and recency; no destructive controls live here.
 */
export function MentorDashboard({ mentorProjects, unread, loadError, onReload }: MentorDashboardProps) {
  const entries = mentorProjects.filter((entry) => entry && entry.project);
  const projects = entries.map((entry) => entry.project);
  const active = projects.filter((project) => project.status === 'active').length;
  const completed = projects.filter((project) => project.status === 'completed').length;
  const inactive = projects.filter((project) => project.status === 'inactive').length;
  const withLeader = projects.filter((project) => Boolean(project.teamLeaderId)).length;
  const primaryCount = entries.filter((entry) => entry.isPrimary).length;

  const since = entries
    .map((entry) => entry.assignedAt)
    .filter(Boolean)
    .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0];

  const denominator = projects.length || 1;
  const rows = [
    { key: 'active', label: 'Active', count: active, fill: 'dash-dist__fill--active' },
    { key: 'completed', label: 'Completed', count: completed, fill: 'dash-dist__fill--done' },
    { key: 'inactive', label: 'Inactive', count: inactive, fill: 'dash-dist__fill--off' },
  ];

  return (
    <div className="dash">
      <header className="ui-page-head">
        <div className="ui-page-head__text">
          <h1 className="ui-title">Projects I mentor</h1>
          <p className="ui-sub">
            {projects.length
              ? `${projects.length} GUIITAR project${
                  projects.length === 1 ? '' : 's'
                }, ${active} active. You are the primary mentor on ${primaryCount}.`
              : 'No projects are assigned to you yet.'}
          </p>
        </div>
        <div className="ui-page-actions">
          <DashNotifications count={unread} />
          <Link to="/projects" className="ui-btn ui-btn--quiet">
            All projects
          </Link>
        </div>
      </header>

      {loadError ? <DashLoadError message={loadError} onRetry={onReload} /> : null}

      <div className="ui-stats">
        <DashStat value={projects.length} label="Projects mentored" />
        <DashStat value={active} label="Active" />
        <DashStat value={completed} label="Completed" />
        <DashStat value={primaryCount} label="As primary mentor" />
      </div>

      <div className="dash-split dash-split--8">
        <section className="ui-panel ui-panel--accent" aria-labelledby="fm-projects-title">
          <header className="ui-panel__head">
            <div className="ui-panel__titles">
              <h2 className="ui-panel__title" id="fm-projects-title">
                Mentored projects
              </h2>
              <span className="ui-panel__meta">
                {projects.length} project{projects.length === 1 ? '' : 's'}
              </span>
            </div>
            <Link to="/projects" className="ui-btn ui-btn--quiet ui-btn--sm">
              Browse projects
            </Link>
          </header>

          <div className="ui-panel__body ui-panel__body--flush">
            {entries.length ? (
              <ul className="ui-rows">
                {entries.map((entry) => {
                  const project = entry.project;
                  const leader =
                    project.teamLeaderId && typeof project.teamLeaderId === 'object'
                      ? project.teamLeaderId
                      : null;
                  return (
                    <li className="ui-row" key={entry.assignmentId || project._id}>
                      <DashAvatar name={project.name} src={project.image} />
                      <div className="ui-row__main">
                        <p className="ui-row__title">
                          <Link to={`/projects/${project._id}`} className="dash-link">
                            {project.name}
                          </Link>
                        </p>
                        <p className="ui-row__sub">
                          {leader ? `Team led by ${leader.name}` : 'No team leader assigned'}
                          {project.updatedAt ? ` · updated ${fmtShortDay(project.updatedAt)}` : ''}
                        </p>
                        {project.description ? (
                          <p className="ui-row__sub dash-clamp">{project.description}</p>
                        ) : null}
                      </div>
                      <div className="ui-row__meta">
                        <span className={`ui-tag dash-status ${statusTone(project.status)}`}>
                          {project.status || 'Unknown'}
                        </span>
                        {entry.isPrimary ? (
                          <span className="ui-tag ui-tag--plain is-accent">Primary</span>
                        ) : (
                          <span className="ui-tag ui-tag--plain">Secondary</span>
                        )}
                      </div>
                      <div className="ui-row__actions">
                        <Link
                          to={`/projects/${project._id}`}
                          className="ui-btn ui-btn--quiet ui-btn--sm"
                        >
                          Open project
                        </Link>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="ui-panel__body">
                <DashEmpty
                  icon="ops"
                  title="No projects assigned"
                  text="A project admin assigns faculty mentors. Projects you mentor will appear here."
                />
              </div>
            )}
          </div>

          <footer className="ui-panel__foot">
            <span className="dash-foot-text">Join requests are reviewed on each project page</span>
            <Link to="/projects" className="ui-btn ui-btn--ghost ui-btn--sm">
              All projects
            </Link>
          </footer>
        </section>

        <aside className="dash-col" aria-label="Mentorship summary">
          <section className="ui-panel" aria-labelledby="fm-status-title">
            <header className="ui-panel__head">
              <div className="ui-panel__titles">
                <h2 className="ui-panel__title" id="fm-status-title">
                  Status split
                </h2>
                {since ? <span className="ui-panel__meta">Since {fmtShortDay(since)}</span> : null}
              </div>
            </header>
            <div className="ui-panel__body">
              <div className="dash-dist">
                {rows.map((row) => (
                  <div className="dash-dist__row" key={row.key}>
                    <span className="dash-dist__label">{row.label}</span>
                    <span className="ui-meter dash-dist__track" aria-hidden="true">
                      <span
                        className={`ui-meter__fill ${row.fill}`}
                        style={{ transform: `scaleX(${row.count / denominator})` }}
                      />
                    </span>
                    <span className="dash-dist__value">{row.count}</span>
                  </div>
                ))}
              </div>

              <hr className="ui-divider" />

              <div className="dash-aside-block">
                <div className="ui-between">
                  <span className="dash-at">Teams with a leader</span>
                  <span className="dash-cover__value">
                    {withLeader} / {projects.length}
                  </span>
                </div>
                <span className="ui-meter" aria-hidden="true">
                  <span
                    className="ui-meter__fill"
                    style={{ transform: `scaleX(${withLeader / denominator})` }}
                  />
                </span>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
