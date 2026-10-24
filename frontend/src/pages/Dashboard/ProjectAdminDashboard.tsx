import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  DashAvatar,
  DashEmpty,
  DashIcon,
  DashLoadError,
  DashNotifications,
  DashStat,
  fmtShortDay,
} from './StaffBits';

interface ProjectAdminStats {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  inactiveProjects: number;
  withTeamLeader: number;
  pendingMaterialRequests: number;
  inventoryItems: number;
}

interface ProjectAdminDashboardProps {
  stats: ProjectAdminStats | null;
  projects: any[];
  requests: any[];
  materialRequests: any[];
  inventory: any[];
  unread: number;
  loadError: string | null;
  onReload: () => void;
}

type StatusFilter = 'all' | 'active' | 'completed' | 'inactive';

const statusTone = (status: string) => {
  if (status === 'active') return 'is-positive';
  if (status === 'completed') return 'is-accent';
  if (status === 'inactive') return '';
  return '';
};

const projectIdOf = (request: any) =>
  request.projectId && typeof request.projectId === 'object'
    ? request.projectId._id
    : request.projectId;

/**
 * Project admin — the operations desk. Portfolio on the left, the two queues
 * that need a decision on the right, the counts that matter in one strip.
 */
export function ProjectAdminDashboard({
  stats,
  projects,
  requests,
  materialRequests,
  inventory,
  unread,
  loadError,
  onReload,
}: ProjectAdminDashboardProps) {
  const [filter, setFilter] = useState<StatusFilter>('all');

  const active = stats?.activeProjects ?? projects.filter((p) => p.status === 'active').length;
  const completed =
    stats?.completedProjects ?? projects.filter((p) => p.status === 'completed').length;
  const inactive =
    stats?.inactiveProjects ?? projects.filter((p) => p.status === 'inactive').length;

  const pendingMaterials = useMemo(
    () => materialRequests.filter((request) => request.status === 'pending'),
    [materialRequests],
  );
  const pendingJoins = requests;

  const withoutLeader = stats
    ? Math.max(stats.totalProjects - stats.withTeamLeader, 0)
    : projects.filter((project) => !project.teamLeaderId).length;

  // MOCK: inventory totals and units on loan are summed in the browser
  const units = useMemo(
    () =>
      inventory.reduce(
        (acc, item) => {
          const total = Number(item.totalQuantity) || 0;
          const available = Number(item.availableQuantity) || 0;
          acc.total += total;
          acc.out += Math.max(total - available, 0);
          return acc;
        },
        { total: 0, out: 0 },
      ),
    [inventory],
  );

  const filters: Array<{ key: StatusFilter; label: string; count: number }> = [
    { key: 'all', label: 'All', count: projects.length },
    { key: 'active', label: 'Active', count: active },
    { key: 'completed', label: 'Completed', count: completed },
    { key: 'inactive', label: 'Inactive', count: inactive },
  ];
  // MOCK: status filtering happens over the full /projects payload
  const filtered = filter === 'all' ? projects : projects.filter((p) => p.status === filter);

  const queueCount = pendingMaterials.length + pendingJoins.length;
  const shownMaterials = pendingMaterials.slice(0, 4);
  const shownJoins = pendingJoins.slice(0, 4);
  const hiddenQueue =
    pendingMaterials.length - shownMaterials.length + (pendingJoins.length - shownJoins.length);

  return (
    <div className="dash">
      <header className="ui-page-head">
        <div className="ui-page-head__text">
          <h1 className="ui-title">Operations desk</h1>
          <p className="ui-sub">
            {projects.length === 0
              ? 'No projects yet. Material requests and inventory appear once work begins.'
              : `${projects.length} projects, ${active} active.${
                  pendingMaterials.length + pendingJoins.length > 0
                    ? ` ${pendingMaterials.length} material request${
                        pendingMaterials.length === 1 ? '' : 's'
                      } and ${pendingJoins.length} join request${
                        pendingJoins.length === 1 ? '' : 's'
                      } waiting.`
                    : ' Nothing is waiting in the queues.'
                }`}
          </p>
        </div>
        <div className="ui-page-actions">
          <DashNotifications count={unread} />
          <Link to="/inventory" className="ui-btn ui-btn--quiet">
            Inventory
          </Link>
          <Link to="/material-requests" className="ui-btn ui-btn--primary">
            Material requests
          </Link>
        </div>
      </header>

      {loadError ? <DashLoadError message={loadError} onRetry={onReload} /> : null}

      <div className="ui-stats">
        <DashStat value={stats?.totalProjects ?? projects.length} label="Projects" />
        <DashStat value={active} label="Active" />
        <DashStat value={completed} label="Completed" />
        <DashStat value={inactive} label="Inactive" />
      </div>

      <section className="dash-ops" aria-label="Operational queues">
        <Link to="/material-requests" className="dash-ops__cell">
          <span className="dash-ops__label">Material requests</span>
          <span className="dash-ops__value">{pendingMaterials.length}</span>
          <span className="dash-ops__sub">waiting on review</span>
          <span className="dash-ops__go" aria-hidden="true">
            <DashIcon name="arrow" size={15} />
          </span>
        </Link>
        <Link to="/projects" className="dash-ops__cell">
          <span className="dash-ops__label">Project join requests</span>
          <span className="dash-ops__value">{pendingJoins.length}</span>
          <span className="dash-ops__sub">students in the queue</span>
          <span className="dash-ops__go" aria-hidden="true">
            <DashIcon name="arrow" size={15} />
          </span>
        </Link>
        <Link to="/inventory" className="dash-ops__cell">
          <span className="dash-ops__label">Inventory</span>
          <span className="dash-ops__value">{stats?.inventoryItems ?? inventory.length}</span>
          <span className="dash-ops__sub">
            {units.out} of {units.total} units on loan
          </span>
          <span className="dash-ops__go" aria-hidden="true">
            <DashIcon name="arrow" size={15} />
          </span>
        </Link>
        <Link to="/projects" className="dash-ops__cell">
          <span className="dash-ops__label">Teams without a leader</span>
          <span className="dash-ops__value">{withoutLeader}</span>
          <span className="dash-ops__sub">need an assignment</span>
          <span className="dash-ops__go" aria-hidden="true">
            <DashIcon name="arrow" size={15} />
          </span>
        </Link>
      </section>

      <div className="dash-split">
        <section className="ui-panel ui-panel--accent" aria-labelledby="pa-portfolio-title">
          <header className="ui-panel__head">
            <div className="ui-panel__titles">
              <h2 className="ui-panel__title" id="pa-portfolio-title">
                Portfolio
              </h2>
              <span className="ui-panel__meta">
                {filtered.length} of {projects.length}
              </span>
            </div>
            <Link to="/projects" className="ui-btn ui-btn--quiet ui-btn--sm">
              All projects
            </Link>
          </header>

          <div className="dash-seg">
            <div className="ui-seg" role="group" aria-label="Filter projects by status">
              {filters.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  aria-pressed={filter === option.key}
                  onClick={() => setFilter(option.key)}
                >
                  {option.label}
                  <span className="dash-seg__n">{option.count}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="ui-panel__body ui-panel__body--flush">
            {filtered.length ? (
              <ul className="ui-rows">
                {filtered.map((project) => {
                  const leader =
                    project.teamLeaderId && typeof project.teamLeaderId === 'object'
                      ? project.teamLeaderId
                      : null;
                  return (
                    <li className="ui-row" key={project._id}>
                      <DashAvatar name={project.name} src={project.image} />
                      <div className="ui-row__main">
                        <p className="ui-row__title">
                          <Link to={`/projects/${project._id}`} className="dash-link">
                            {project.name}
                          </Link>
                        </p>
                        <p className="ui-row__sub">
                          {leader ? `Led by ${leader.name}` : 'No team leader assigned'}
                          {project.updatedAt ? ` · updated ${fmtShortDay(project.updatedAt)}` : ''}
                        </p>
                      </div>
                      <div className="ui-row__meta">
                        <span className={`ui-tag dash-status ${statusTone(project.status)}`}>
                          {project.status || 'Unknown'}
                        </span>
                      </div>
                      <div className="ui-row__actions">
                        <Link
                          to={`/projects/${project._id}`}
                          className="ui-btn ui-btn--quiet ui-btn--sm"
                        >
                          Open
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
                  title={`No ${filter === 'all' ? '' : filter} projects`}
                  text={
                    filter === 'all'
                      ? 'Projects appear here once they are created.'
                      : 'No project currently carries this status.'
                  }
                  action={
                    filter !== 'all' ? (
                      <button
                        type="button"
                        className="ui-btn ui-btn--quiet ui-btn--sm"
                        onClick={() => setFilter('all')}
                      >
                        Show all projects
                      </button>
                    ) : undefined
                  }
                />
              </div>
            )}
          </div>
        </section>

        <aside className="dash-col" aria-label="Operational queues">
        <section className="ui-panel" aria-labelledby="pa-queue-title">
          <header className="ui-panel__head">
            <div className="ui-panel__titles">
              <h2 className="ui-panel__title" id="pa-queue-title">
                Waiting on you
              </h2>
              <span className="ui-panel__meta">{queueCount}</span>
            </div>
          </header>

          <div className="ui-panel__body ui-panel__body--flush">
            {queueCount === 0 ? (
              <div className="ui-panel__body">
                <DashEmpty
                  icon="check"
                  title="Queues are clear"
                  text="No material request or project join request is pending."
                />
              </div>
            ) : (
              <>
                {pendingMaterials.length > 0 ? (
                  <>
                    <p className="dash-group">
                      <span>Material requests</span>
                      <span className="dash-group__count">{pendingMaterials.length}</span>
                    </p>
                    <ul className="ui-rows" aria-label="Pending material requests">
                      {shownMaterials.map((request) => {
                        const item =
                          request.inventoryItemId?.name ||
                          request.materialName ||
                          'Requested material';
                        const quantity = Number(request.quantity) || 0;
                        const projectName = request.projectId?.name || 'Project';
                        return (
                          <li className="ui-row" key={request._id}>
                            <div className="ui-row__main">
                              <p className="ui-row__title">{item}</p>
                              <p className="ui-row__sub">
                                {quantity} unit{quantity === 1 ? '' : 's'} · {projectName}
                                {request.requestedBy?.name ? ` · ${request.requestedBy.name}` : ''}
                              </p>
                            </div>
                            <div className="ui-row__meta">
                              <span className="dash-at">{fmtShortDay(request.createdAt)}</span>
                              <Link
                                to="/material-requests"
                                className="ui-btn ui-btn--quiet ui-btn--sm"
                              >
                                Review
                              </Link>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </>
                ) : null}

                {pendingJoins.length > 0 ? (
                  <>
                    <p className="dash-group">
                      <span>Join requests</span>
                      <span className="dash-group__count">{pendingJoins.length}</span>
                    </p>
                    <ul className="ui-rows" aria-label="Pending project join requests">
                      {shownJoins.map((request) => {
                        const student = request.studentId;
                        const projectId = projectIdOf(request);
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
                              <p className="ui-row__sub">
                                {request.projectId?.name || 'Project'}
                                {student?.department ? ` · ${student.department}` : ''}
                              </p>
                            </div>
                            <div className="ui-row__meta">
                              <span className="dash-at">{fmtShortDay(request.createdAt)}</span>
                              {projectId ? (
                                <Link
                                  to={`/projects/${projectId}#join-requests`}
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

          {hiddenQueue > 0 ? (
            <footer className="ui-panel__foot">
              <span className="dash-at">{hiddenQueue} more in the queues</span>
              <Link to="/material-requests" className="ui-btn ui-btn--ghost ui-btn--sm">
                Open requests
              </Link>
            </footer>
          ) : null}
        </section>

        </aside>
      </div>

      <section className="ui-panel" aria-labelledby="pa-inventory-title">
        <header className="ui-panel__head">
          <div className="ui-panel__titles">
            <h2 className="ui-panel__title" id="pa-inventory-title">
              Inventory
            </h2>
            <span className="ui-panel__meta">
              {stats?.inventoryItems ?? inventory.length} items · {units.out} of {units.total} units on loan
            </span>
          </div>
          <Link to="/inventory" className="ui-btn ui-btn--quiet ui-btn--sm">
            Open inventory
          </Link>
        </header>

        {inventory.length ? (
          <div className="ui-panel__body ui-panel__body--flush ui-scroll-x dash-inv-table">
            <table className="ui-table dash-inventory">
              <thead>
                <tr>
                  <th scope="col">Item</th>
                  <th scope="col">Availability</th>
                  <th scope="col" className="is-num">Available</th>
                  <th scope="col" className="is-num">Total</th>
                  <th scope="col" className="is-num">On loan</th>
                </tr>
              </thead>
              <tbody>
                {inventory.map((item) => {
                  const totalUnits = Number(item.totalQuantity) || 0;
                  const availableUnits = Number(item.availableQuantity) || 0;
                  const out = Math.max(totalUnits - availableUnits, 0);
                  const availableShare = totalUnits > 0 ? availableUnits / totalUnits : 0;
                  return (
                    <tr key={item._id}>
                      <td>
                        <Link to="/inventory" className="dash-link dash-inventory__name">
                          {item.name}
                        </Link>
                      </td>
                      <td>
                        <span className="ui-meter dash-inventory__meter" aria-hidden="true">
                          <span
                            className="ui-meter__fill"
                            style={{ transform: `scaleX(${availableShare})` }}
                          />
                        </span>
                      </td>
                      <td className="is-num">{availableUnits}</td>
                      <td className="is-num">{totalUnits}</td>
                      <td className="is-num">{out}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="ui-panel__body">
            <DashEmpty
              icon="box"
              title="No inventory yet"
              text="Equipment added to inventory will be listed here."
            />
          </div>
        )}

        {inventory.length ? (
          <ul className="ui-rows dash-inv-list">
            {inventory.map((item) => {
              const totalUnits = Number(item.totalQuantity) || 0;
              const availableUnits = Number(item.availableQuantity) || 0;
              const out = Math.max(totalUnits - availableUnits, 0);
              const availableShare = totalUnits > 0 ? availableUnits / totalUnits : 0;
              return (
                <li className="ui-row" key={item._id}>
                  <div className="ui-row__main">
                    <p className="ui-row__title">
                      <Link to="/inventory" className="dash-link">
                        {item.name}
                      </Link>
                    </p>
                    <p className="ui-row__sub">
                      {availableUnits} of {totalUnits} available · {out} on loan
                    </p>
                    <span className="dash-meter">
                      <span className="ui-meter" aria-hidden="true">
                        <span
                          className="ui-meter__fill"
                          style={{ transform: `scaleX(${availableShare})` }}
                        />
                      </span>
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : null}
      </section>
    </div>
  );
}
