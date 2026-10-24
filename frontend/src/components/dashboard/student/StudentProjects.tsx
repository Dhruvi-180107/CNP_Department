import { Link } from 'react-router-dom';
import { DashboardSection, PanelError } from './DashboardSection';
import { ArrowRightIcon, ProjectIcon } from './StudentIcons';
import { initialsOf, projectStatus, refId, refName, tagToneClass } from './studentUtils';
import type { StudentProjectWithMentors } from '../../../types/studentDashboard';

interface StudentProjectsProps {
  projects: StudentProjectWithMentors[];
  currentUserId: string;
  /** Project ids with a join request still awaiting a decision. */
  pendingProjectIds?: Set<string>;
  error?: string;
}

function mentorName(project: StudentProjectWithMentors): string | null {
  if (!project.mentors.length) return null;
  const primary = project.mentors.find((assignment) => assignment.isPrimary) ?? project.mentors[0];
  return refName(primary?.mentorId);
}

export function StudentProjects({
  projects,
  currentUserId,
  pendingProjectIds,
  error,
}: StudentProjectsProps) {
  return (
    <DashboardSection
      id="sd-projects"
      title="Your projects"
      meta={projects.length > 0 ? `${projects.length}` : undefined}
      actionLabel="All projects"
      actionTo="/projects"
      className="sd-projects"
    >
      {error ? <PanelError message={error} /> : null}

      {projects.length > 0 ? (
        <ul className="ui-rows sd-project-rows">
          {projects.map((project) => {
            const status = projectStatus(project.status);
            const leads = refId(project.teamLeaderId) === currentUserId;
            const mentor = mentorName(project);
            const pending = pendingProjectIds?.has(project._id) ?? false;
            return (
              <li className="ui-row ui-row--link" key={project._id}>
                <span className="ui-avatar sd-avatar" aria-hidden="true">
                  {project.image ? <img src={project.image} alt="" /> : initialsOf(project.name)}
                </span>
                <div className="ui-row__main">
                  <p className="ui-row__title">
                    <Link className="sd-row-title" to={`/projects/${project._id}`}>
                      {project.name}
                    </Link>
                  </p>
                  <p className="ui-row__sub ui-truncate">
                    {mentor ? `Mentor ${mentor}` : 'No mentor assigned'}
                  </p>
                </div>
                <div className="ui-row__meta sd-project-rows__meta">
                  {pending ? <span className="ui-tag is-warning">Request pending</span> : null}
                  {status ? <span className={tagToneClass(status.tone)}>{status.label}</span> : null}
                  <span className={leads ? 'ui-tag is-accent' : 'ui-tag ui-tag--plain'}>
                    {leads ? 'Team lead' : 'Member'}
                  </span>
                </div>
                <div className="ui-row__actions" aria-hidden="true">
                  <span className="ui-btn ui-btn--quiet ui-btn--sm">
                    Open
                    <ArrowRightIcon className="sd-icon sd-icon--sm" />
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      ) : !error ? (
        <div className="sd-panel__state">
          <div className="ui-empty sd-empty">
            <span className="ui-empty__mark">
              <ProjectIcon />
            </span>
            <p className="ui-empty__title">No project assignments yet</p>
            <p className="ui-empty__text">
              GUIITAR projects pair students with faculty mentors and a student team leader. Browse the
              open projects to apply.
            </p>
            <Link className="ui-btn ui-btn--quiet ui-btn--sm" to="/projects">
              View open projects
            </Link>
          </div>
        </div>
      ) : null}
    </DashboardSection>
  );
}
