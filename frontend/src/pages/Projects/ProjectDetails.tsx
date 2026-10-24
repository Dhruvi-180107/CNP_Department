import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { ProjectMentors } from '../../components/projects/ProjectMentors';
import { ProjectMaterials } from '../../components/projects/ProjectMaterials';
import { ProjectMaterialRequests } from '../../components/projects/ProjectMaterialRequests';
import { ProjectUpdates } from '../../components/projects/ProjectUpdates';
import { ProjectManagement } from '../../components/projects/ProjectManagement';
import { ProjectJoinRequests } from '../../components/projects/ProjectJoinRequests';
import { usePageLoading } from '../../context/LoadingContext';
import './projects.css';

interface ProjectPerson {
  _id?: string;
  name?: string;
  email?: string;
  role?: string;
  department?: string;
  semester?: number | null;
  profileImage?: string | null;
}

interface ProjectMember {
  _id: string;
  studentId?: ProjectPerson;
  joinedAt?: string;
}

interface MentorAssignment {
  _id?: string;
  assignmentId?: string;
  isPrimary?: boolean;
  mentorId?: ProjectPerson;
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

function initialOf(name?: string): string {
  return (name || '?').replace(/^Dr\.\s*/i, '').trim().charAt(0).toUpperCase() || '?';
}

function monogram(name?: string): string {
  const words = (name || '').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

function fullDate(value?: string): string {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Not recorded'
    : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function statusText(status?: string): string {
  if (!status) return 'Active';
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function statusTone(status?: string): string {
  if (status === 'completed') return 'ui-tag--plain';
  if (status === 'inactive') return 'is-warning';
  return 'is-positive';
}

const ArrowLeft = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M20 12H5M11 6l-6 6 6 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const CameraMark = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M4 8.5h3l1.4-2h6.2l1.4 2H20v9H4v-9Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    <circle cx="12" cy="12.6" r="2.6" stroke="currentColor" strokeWidth="1.7" />
  </svg>
);

const LockMark = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect x="5" y="10" width="14" height="9.5" rx="2" stroke="currentColor" strokeWidth="1.7" />
    <path d="M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
  </svg>
);

const LayersMark = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="m12 4 8 4-8 4-8-4 8-4Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    <path d="m4 12 8 4 8-4M4 16l8 4 8-4" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
  </svg>
);

function PersonAvatar({ person, size = 'sm' }: { person?: ProjectPerson | null; size?: 'sm' | 'md' | 'lg' }) {
  const className =
    size === 'lg'
      ? 'ui-avatar ui-avatar--lg prj-avatar'
      : size === 'md'
        ? 'ui-avatar prj-avatar'
        : 'ui-avatar ui-avatar--sm prj-avatar';
  if (person?.profileImage) {
    return (
      <span className={className}>
        <img src={person.profileImage} alt="" />
      </span>
    );
  }
  return (
    <span className={className} aria-hidden="true">
      {initialOf(person?.name)}
    </span>
  );
}

export default function ProjectDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { setPageLoading } = usePageLoading();

  const [project, setProject] = useState<ProjectRecord | null>(null);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [mentors, setMentors] = useState<MentorAssignment[]>([]);
  const [joinStatus, setJoinStatus] = useState<string>('none');
  const [pendingRequests, setPendingRequests] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setPageLoading(true);
    try {
      setError(null);
      const res = await api<any>('GET', `/projects/${id}`);
      if (!res.data) throw new Error('Project not found');
      setProject(res.data);

      const [mems, ments] = await Promise.all([
        api<any>('GET', `/projects/${id}/members`).then((r) => r.data).catch(() => []),
        api<any>('GET', `/projects/${id}/mentors`).then((r) => r.data).catch(() => []),
      ]);
      setMembers(mems || []);
      setMentors(ments || []);

      if (user?.role === 'student') {
        const reqs = await api<any>('GET', '/join-requests/student').then((r) => r.data).catch(() => []);
        const tlId = typeof res.data.teamLeaderId === 'object' ? res.data.teamLeaderId?._id : res.data.teamLeaderId;
        const isTL = tlId && user?._id && tlId === user._id;
        const isMember =
          (mems || []).some((m: any) => {
            const sId = typeof m.studentId === 'object' ? m.studentId?._id : m.studentId;
            return sId && user?._id && sId === user._id;
          }) || isTL;
        const hasPending = (reqs || []).some(
          (r: any) => (r.projectId?._id || r.projectId) === id && r.status === 'pending',
        );
        if (isMember) setJoinStatus('member');
        else if (hasPending) setJoinStatus('pending');
        else setJoinStatus('none');
      }
    } catch (e: any) {
      setError(e.message || 'Failed to load project details');
    } finally {
      setLoading(false);
      setPageLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id, user?._id]);

  useEffect(() => {
    if (!loading && window.location.hash) {
      setTimeout(() => {
        const el = document.querySelector(window.location.hash);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [loading]);

  const handleJoin = async () => {
    try {
      await api('POST', `/projects/${id}/join`);
      setJoinStatus('pending');
      alert('Join request sent successfully');
    } catch (e: any) {
      alert(e.message || 'Failed to join');
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);

    try {
      setLoading(true);
      await api('POST', `/projects/${id}/image`, formData);
      load();
    } catch (err: any) {
      alert(err.message || 'Failed to upload project image');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="prj-page prj-detail">
        <div className="prj-detail-loading" aria-hidden="true">
          <span className="ui-skel" style={{ width: '8rem', height: 12 }} />
          <div className="prj-identity prj-identity--skeleton">
            <span className="ui-skel prj-identity__mark-skel" />
            <div className="prj-identity__main">
              <span className="ui-skel" style={{ width: '45%', height: 26 }} />
              <span className="ui-skel" style={{ width: '75%', height: 12, marginTop: 12 }} />
              <span className="ui-skel" style={{ width: '55%', height: 34, marginTop: 18 }} />
            </div>
          </div>
          <div className="prj-detail-grid">
            <div className="prj-main">
              {[0, 1].map((panel) => (
                <div className="ui-panel" key={panel}>
                  <div className="ui-panel__head">
                    <span className="ui-skel" style={{ width: '30%', height: 13 }} />
                  </div>
                  <div className="ui-panel__body ui-stack">
                    <span className="ui-skel" style={{ width: '100%', height: 44 }} />
                    <span className="ui-skel" style={{ width: '92%', height: 44 }} />
                  </div>
                </div>
              ))}
            </div>
            <aside className="prj-aside">
              <div className="ui-panel">
                <div className="ui-panel__head">
                  <span className="ui-skel" style={{ width: '50%', height: 13 }} />
                </div>
                <div className="ui-panel__body ui-stack">
                  {[0, 1, 2, 3].map((row) => (
                    <span className="ui-skel" key={row} style={{ width: '100%', height: 32 }} />
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="prj-page prj-detail">
        <nav className="prj-crumb" aria-label="Breadcrumb">
          <Link className="prj-back" to="/projects">
            <ArrowLeft />
            Projects
          </Link>
        </nav>
        <div className="ui-notice ui-notice--error prj-detail-error" role="alert">
          <div className="ui-stack ui-stack--sm">
            <strong>This project could not be loaded</strong>
            <span>{error}</span>
          </div>
          <button type="button" className="ui-btn ui-btn--quiet ui-btn--sm" onClick={load}>
            Retry
          </button>
        </div>
        <button type="button" className="ui-btn ui-btn--ghost" onClick={() => navigate('/projects')}>
          Back to projects
        </button>
      </div>
    );
  }

  if (!project) return null;

  const isTL = (m: ProjectMember) => {
    const tlId = typeof project.teamLeaderId === 'object' ? project.teamLeaderId?._id : project.teamLeaderId;
    const sId = typeof m.studentId === 'object' ? m.studentId?._id : m.studentId;
    return Boolean(tlId && sId && tlId === sId);
  };

  const projectTLId = typeof project.teamLeaderId === 'object' ? project.teamLeaderId?._id : project.teamLeaderId;
  const currentUserIsTL = Boolean(projectTLId && user?._id && projectTLId === user._id);
  const teamLeader = typeof project.teamLeaderId === 'object' ? project.teamLeaderId : null;

  const isMember =
    (members || []).some((m: any) => {
      const sId = typeof m.studentId === 'object' ? m.studentId?._id : m.studentId;
      return sId && user?._id && sId === user._id;
    }) || currentUserIsTL;

  const isAssignedMentor =
    user?.role === 'faculty_mentor' &&
    (mentors || []).some((m: any) => {
      const mId = typeof m.mentorId === 'object' ? m.mentorId?._id : m.mentorId;
      return mId && user?._id && mId === user._id;
    });

  const isProjectAdmin = user?.role === 'project_admin';
  const canAccessProjectContent = isProjectAdmin || isAssignedMentor || isMember;

  const relation = isProjectAdmin
    ? 'Project admin'
    : isAssignedMentor
      ? 'Mentor'
      : currentUserIsTL
        ? 'Team leader'
        : isMember
          ? 'Team member'
          : user?.role === 'student'
            ? joinStatus === 'pending'
              ? 'Request pending'
              : 'Not a member'
            : null;

  const sortedMembers = [...(members || [])].sort((a, b) => {
    if (isTL(a)) return -1;
    if (isTL(b)) return 1;
    return (a.studentId?.name || '').localeCompare(b.studentId?.name || '');
  });

  const mentorPeople = (mentors || [])
    .map((assignment) => assignment.mentorId)
    .filter((person): person is ProjectPerson => Boolean(person));

  return (
    <div className="prj-page prj-detail">
      <nav className="prj-crumb" aria-label="Breadcrumb">
        <Link className="prj-back" to="/projects">
          <ArrowLeft />
          Projects
        </Link>
        <span className="prj-crumb__divider" aria-hidden="true">
          /
        </span>
        <span className="prj-crumb__here">{project.name}</span>
      </nav>

      {/* ── Identity ─────────────────────────────────────────────────────── */}
      <header className="prj-identity">
        <div className="prj-identity__mark-wrap">
          {project.image ? (
            <span className="prj-identity__mark">
              <img src={project.image} alt="" />
            </span>
          ) : (
            <span className="prj-identity__mark" aria-hidden="true">
              {monogram(project.name)}
            </span>
          )}
          {isProjectAdmin && (
            <label className="prj-identity__image-btn" title="Change project image">
              <CameraMark />
              <span className="ui-visually-hidden">Change project image</span>
              <input type="file" accept="image/*" onChange={handleImageUpload} />
            </label>
          )}
        </div>

        <div className="prj-identity__main">
          <div className="prj-identity__title-row">
            <h1 className="prj-detail-title">{project.name}</h1>
            <span className={`ui-tag ${statusTone(project.status)}`}>{statusText(project.status)}</span>
          </div>
          <p className="prj-identity__desc">
            {project.description || 'This project has not written a description yet.'}
          </p>

          <div className="prj-identity__facts">
            <span className="prj-identity__fact">
              {teamLeader ? (
                <>
                  <PersonAvatar person={teamLeader} />
                  <span className="prj-identity__fact-text">
                    <span className="prj-identity__fact-name">{teamLeader.name}</span>
                    <span className="prj-identity__fact-label">Team leader</span>
                  </span>
                </>
              ) : (
                <span className="prj-identity__fact-text">No team leader assigned</span>
              )}
            </span>

            <span className="prj-identity__fact">
              <span className="prj-identity__fact-text">
                <span className="prj-identity__fact-name">{members.length}</span>
                <span className="prj-identity__fact-label">
                  {members.length === 1 ? 'Member' : 'Members'}
                </span>
              </span>
            </span>

            <span className="prj-identity__fact">
              {mentorPeople.length ? (
                <>
                  <span className="prj-stack" aria-hidden="true">
                    {mentorPeople.slice(0, 3).map((mentor, index) => (
                      <PersonAvatar key={mentor._id || index} person={mentor} />
                    ))}
                  </span>
                  <span className="prj-identity__fact-text">
                    <span className="prj-identity__fact-name">{mentorPeople.length}</span>
                    <span className="prj-identity__fact-label">
                      {mentorPeople.length === 1 ? 'Mentor' : 'Mentors'}
                    </span>
                  </span>
                </>
              ) : (
                <span className="prj-identity__fact-text">No mentor assigned</span>
              )}
            </span>
          </div>
        </div>

        <div className="prj-identity__actions">
          {relation && !(user?.role === 'student' && joinStatus === 'pending') && (
            <span className="ui-tag ui-tag--plain prj-relation">{relation}</span>
          )}
          {user?.role === 'student' &&
            (joinStatus === 'pending' ? (
              <span className="ui-tag is-warning">Request pending</span>
            ) : joinStatus === 'none' ? (
              <button type="button" className="ui-btn ui-btn--primary" onClick={handleJoin}>
                Join project
              </button>
            ) : null)}
          {isProjectAdmin && (
            <a className="ui-btn ui-btn--quiet" href="#manage">
              Manage project
            </a>
          )}
        </div>
      </header>

      {/* ── The record ───────────────────────────────────────────────────── */}
      <div className="prj-detail-grid">
        <div className="prj-main">
          {isProjectAdmin || user?.role === 'faculty_mentor' ? (
            <ProjectJoinRequests
              projectId={project._id}
              onUpdate={load}
              onCountChange={setPendingRequests}
            />
          ) : null}

          {canAccessProjectContent ? (
            <ProjectUpdates
              projectId={project._id}
              projectName={project.name}
              isTL={currentUserIsTL}
              mentors={mentors}
            />
          ) : (
            <section className="ui-panel prj-restricted" aria-labelledby="prj-restricted-title">
              <div className="ui-panel__body">
                <span className="ui-empty__mark">
                  <LockMark />
                </span>
                <h2 className="ui-h3" id="prj-restricted-title">
                  Project resources are restricted
                </h2>
                <p className="prj-restricted__text">
                  {user?.role === 'student'
                    ? joinStatus === 'pending'
                      ? 'Your join request is waiting for review. Updates and materials open once the team accepts you.'
                      : 'Project updates, materials and material requests are available to the project team. Send a join request above to take part.'
                    : user?.role === 'faculty_mentor'
                      ? 'You are not assigned as a mentor for this project. Only assigned mentors and project administrators can open its updates, materials and requests.'
                      : 'Project materials, updates and requests are restricted to assigned team members, mentors and project administrators.'}
                </p>
              </div>
            </section>
          )}

          <section className="ui-panel" aria-labelledby="prj-team-title">
            <header className="ui-panel__head">
              <div className="ui-panel__titles">
                <h2 className="ui-panel__title" id="prj-team-title">
                  Team
                </h2>
                <span className="ui-panel__meta">{members.length}</span>
              </div>
            </header>
            <div className="ui-panel__body ui-panel__body--flush">
              {members.length ? (
                <ul className="prj-roster">
                  {sortedMembers.map((member) => (
                    <li key={member._id} className="ui-row prj-roster__row">
                      <PersonAvatar person={member.studentId} size="md" />
                      <div className="prj-roster__main">
                        <p className="prj-roster__name">{member.studentId?.name || 'Unknown student'}</p>
                        <p className="prj-roster__sub">
                          {[member.studentId?.department, member.studentId?.semester ? `Semester ${member.studentId.semester}` : null]
                            .filter(Boolean)
                            .join(' · ') || 'Student'}
                        </p>
                      </div>
                      {isTL(member) ? (
                        <span className="ui-tag is-accent">Team leader</span>
                      ) : (
                        <span className="ui-tag ui-tag--plain prj-roster__role">Member</span>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="ui-empty prj-empty">
                  <span className="ui-empty__mark">
                    <LayersMark />
                  </span>
                  <p className="ui-empty__title">No members yet</p>
                  <p className="ui-empty__text">
                    Students who join this project are listed here with the team leader first.
                  </p>
                </div>
              )}
            </div>
          </section>

          <ProjectMentors
            projectId={project._id}
            mentors={mentors}
            onMentorsChange={(updatedMentors) => setMentors(updatedMentors)}
          />

          {canAccessProjectContent && (
            <>
              <ProjectMaterials projectId={project._id} isTL={currentUserIsTL} />
              <ProjectMaterialRequests projectId={project._id} isTL={currentUserIsTL} />
            </>
          )}

          {isProjectAdmin && <ProjectManagement project={project} onUpdate={load} />}
        </div>

        <aside className="prj-aside prj-detail__aside" aria-label="Project facts">
          <section className="ui-panel">
            <header className="ui-panel__head">
              <div className="ui-panel__titles">
                <h2 className="ui-panel__title">Facts</h2>
              </div>
            </header>
            <div className="ui-panel__body">
              <dl className="prj-facts">
                <div>
                  <dt>Status</dt>
                  <dd>
                    <span className={`ui-tag ${statusTone(project.status)}`}>{statusText(project.status)}</span>
                  </dd>
                </div>
                <div>
                  <dt>Team leader</dt>
                  <dd>
                    {teamLeader?.name ? (
                      <span className="prj-facts__person">
                        <PersonAvatar person={teamLeader} />
                        {teamLeader.name}
                      </span>
                    ) : (
                      'Not assigned'
                    )}
                  </dd>
                </div>
                <div>
                  <dt>Team</dt>
                  <dd>
                    {members.length} {members.length === 1 ? 'member' : 'members'}
                  </dd>
                </div>
                <div>
                  <dt>Mentors</dt>
                  <dd>
                    {mentorPeople.length ? (
                      <span className="prj-facts__people">
                        {mentorPeople.map((mentor) => (
                          <span className="prj-facts__person" key={mentor._id || mentor.name}>
                            <PersonAvatar person={mentor} />
                            {mentor.name}
                          </span>
                        ))}
                      </span>
                    ) : (
                      'Not assigned'
                    )}
                  </dd>
                </div>
                <div>
                  <dt>Created</dt>
                  <dd>{fullDate(project.createdAt)}</dd>
                </div>
                <div>
                  <dt>Last updated</dt>
                  <dd>{fullDate(project.updatedAt)}</dd>
                </div>
                {(isProjectAdmin || isAssignedMentor) && (
                  <div>
                    <dt>Join requests</dt>
                    <dd>
                      {pendingRequests === null
                        ? 'Not recorded'
                        : pendingRequests === 0
                          ? 'None pending'
                          : `${pendingRequests} pending`}
                    </dd>
                  </div>
                )}
                {relation && (
                  <div>
                    <dt>Your access</dt>
                    <dd>{relation}</dd>
                  </div>
                )}
              </dl>
            </div>
            {isProjectAdmin && (
              <footer className="ui-panel__foot prj-facts__foot">
                <a className="ui-link" href="#manage">
                  Edit project settings
                </a>
              </footer>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
