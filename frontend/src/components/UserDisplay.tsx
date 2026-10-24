import type { User } from '../types';
import '../pages/Profile/profile.css';

interface UserDisplayProps {
  user: User | any; // To accept populated mongoose objects which might not perfectly match User
  showRole?: boolean;
  showEmail?: boolean;
  showDepartment?: boolean;
  showSemester?: boolean;
  showEnrollmentNumber?: boolean;
}

const ROLE_LABELS: Record<string, string> = {
  student: 'Student',
  faculty_coordinator: 'Faculty coordinator',
  faculty_mentor: 'Faculty mentor',
  club_admin: 'Club admin',
  project_admin: 'Project admin',
};

function roleLabel(role?: string) {
  if (!role) return '';
  return ROLE_LABELS[role] ?? role.replace(/_/g, ' ');
}

function initialsOf(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part.charAt(0).toUpperCase())
    .join('');
}

export function UserDisplay({
  user,
  showRole = false,
  showEmail = true,
  showDepartment = true,
  showSemester = true,
  showEnrollmentNumber = true,
}: UserDisplayProps) {
  if (!user || !user.name) return <span>Unknown User</span>;

  const isStudent = user.role === 'student';
  const shouldShowDept = showDepartment && user.department;
  const shouldShowSem = showSemester && isStudent && user.semester;
  const shouldShowEnr = showEnrollmentNumber && isStudent && user.enrollmentNumber;
  const hasMeta = shouldShowEnr || shouldShowDept || shouldShowSem;

  return (
    <div className="ui-person prf-person">
      <span className="ui-avatar ui-avatar--sm" aria-hidden="true">
        {typeof user.profileImage === 'string' && user.profileImage
          ? <img src={user.profileImage} alt="" />
          : initialsOf(user.name)}
      </span>

      <div className="ui-person__text">
        <div className="prf-person__head">
          <span className="ui-person__name prf-person__name">{user.name}</span>
          {showRole && user.role && (
            <span className="ui-tag ui-tag--plain prf-person__role">{roleLabel(user.role)}</span>
          )}
        </div>

        {showEmail && user.email && (
          <a className="ui-link prf-person__email" href={`mailto:${user.email}`}>
            {user.email}
          </a>
        )}

        {hasMeta && (
          <p className="ui-person__sub prf-person__meta">
            {shouldShowEnr && <span>Enrollment: {user.enrollmentNumber}</span>}
            {shouldShowEnr && (shouldShowDept || shouldShowSem) && <span className="prf-sep" aria-hidden="true">·</span>}
            {shouldShowDept && <span>{user.department}</span>}
            {shouldShowDept && shouldShowSem && <span className="prf-sep" aria-hidden="true">·</span>}
            {shouldShowSem && <span>Semester {user.semester}</span>}
          </p>
        )}
      </div>
    </div>
  );
}
