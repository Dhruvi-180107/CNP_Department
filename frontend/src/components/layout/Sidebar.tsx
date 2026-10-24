import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/**
 * Destinations, one row each. `icon` is a key into NAV_ICON_PATHS (it used to hold
 * an emoji; the rendered mark is the line icon below). The shape is unchanged:
 * { id, label, icon, path, roles }.
 */
export const NAVIGATION = [
  { id: 'dashboard',     label: 'Dashboard',         icon: 'dashboard',     path: '/dashboard',         roles: ['student', 'faculty_coordinator', 'faculty_mentor', 'club_admin', 'project_admin'] },
  { id: 'clubs',         label: 'Clubs',             icon: 'clubs',         path: '/clubs',             roles: ['student', 'faculty_coordinator', 'club_admin', 'project_admin'] },
  { id: 'projects',      label: 'Projects',          icon: 'projects',      path: '/projects',          roles: ['student', 'faculty_coordinator', 'faculty_mentor', 'club_admin', 'project_admin'] },
  { id: 'events',        label: 'Events',            icon: 'events',        path: '/events',            roles: ['student', 'faculty_coordinator', 'faculty_mentor', 'club_admin', 'project_admin'] },
  { id: 'notifications', label: 'Notifications',     icon: 'notifications', path: '/notifications',     roles: ['student', 'faculty_coordinator', 'faculty_mentor', 'club_admin', 'project_admin'] },
  { id: 'inventory',     label: 'Inventory',         icon: 'inventory',     path: '/inventory',         roles: ['project_admin'] },
  { id: 'requests',      label: 'Material Requests', icon: 'requests',      path: '/material-requests', roles: ['project_admin'] },
  { id: 'profile',       label: 'Profile',           icon: 'profile',       path: '/profile',           roles: ['student', 'faculty_coordinator', 'faculty_mentor', 'club_admin', 'project_admin'] }
];

/**
 * Navigation grouped by what the person is doing, not by entity type. Order inside
 * a group is fixed by `items`; a group with nothing visible for this role is dropped.
 */
export const NAV_GROUPS: { id: string; label: string; items: string[] }[] = [
  { id: 'participate', label: 'Participate', items: ['dashboard', 'clubs', 'projects', 'events'] },
  { id: 'inbox',       label: 'Inbox',       items: ['notifications'] },
  { id: 'operations',  label: 'Operations',  items: ['inventory', 'requests'] },
  { id: 'account',     label: 'Account',     items: ['profile'] },
];

/* Line icons (24px grid, 1.7 stroke) so the graphite rail stays crisp. */
export const NAV_ICON_PATHS: Record<string, string> = {
  dashboard: 'M4 13h7V4H4v9Zm9 7h7V11h-7v9ZM4 20h7v-5H4v5ZM13 9h7V4h-7v5Z',
  clubs: 'M3 10 12 4l9 6M5 10v8m4-8v8m6-8v8m4-8v8M3 20h18',
  projects: 'M9 4h6a1 1 0 0 1 1 1v1H8V5a1 1 0 0 1 1-1ZM6 6h12a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Zm3 6h6m-6 4h4',
  events: 'M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Zm-1 5h16M8 3v4m8-4v4',
  notifications: 'M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4',
  inventory: 'm4 8 8-4 8 4-8 4-8-4Zm0 0v8l8 4m8-12v8l-8 4m0-8v8',
  requests: 'M4 5h2l2 10h9l2-7H7M10 20h.01M17 20h.01',
  profile: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0',
};

export function NavIcon({ id, className = 'rail-icon' }: { id: string; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
      <path
        d={NAV_ICON_PATHS[id]}
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export const ROLE_LABELS: Record<string, string> = {
  student: 'Student',
  faculty_coordinator: 'Faculty coordinator',
  faculty_mentor: 'Faculty mentor',
  club_admin: 'Club admin',
  project_admin: 'Project admin',
};

export function roleLabel(role?: string): string {
  if (!role) return '';
  return ROLE_LABELS[role] ?? role.replace(/_/g, ' ');
}

interface SidebarProps {
  /** Present only when the rail is an off-canvas drawer; renders the close control. */
  onClose?: () => void;
}

export function Sidebar({ onClose }: SidebarProps = {}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  // After signing out, go to the public landing page (not the login form).
  const handleSignOut = () => {
    navigate('/', { replace: true });
    logout();
  };

  const visible = NAVIGATION.filter((item) => item.roles.includes(user.role));
  const groups = NAV_GROUPS.map((group) => ({
    ...group,
    entries: visible.filter((item) => group.items.includes(item.id)),
  })).filter((group) => group.entries.length > 0);

  return (
    <div className="rail">
      <div className="rail-head">
        <Link className="rail-brand" to="/dashboard" aria-label="CNP Department, open dashboard">
          <span className="shell-mark" aria-hidden="true">C</span>
          <span className="rail-brand__text">
            <span className="rail-brand__name">CNP Department</span>
            <span className="rail-brand__place">GSFC University</span>
          </span>
        </Link>

        {onClose && (
          <button type="button" className="rail-close" onClick={onClose} aria-label="Close navigation">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
              <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>

      <nav className="rail-nav" aria-label="Main">
        {groups.map((group) => (
          <div className="rail-group" key={group.id}>
            <p className="rail-group__label" id={`rail-group-${group.id}`}>{group.label}</p>
            <ul className="rail-list" aria-labelledby={`rail-group-${group.id}`}>
              {group.entries.map((item) => (
                <li key={item.id}>
                  <NavLink
                    to={item.path}
                    className={({ isActive }) => `rail-link${isActive ? ' is-active' : ''}`}
                  >
                    <NavIcon id={item.id} />
                    <span className="rail-link__label">{item.label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="rail-foot">
        <div className="rail-user">
          {user.profileImage ? (
            <span className="rail-avatar">
              <img src={user.profileImage} alt="" decoding="async" />
            </span>
          ) : (
            <span className="rail-avatar" aria-hidden="true">{user.name.charAt(0).toUpperCase()}</span>
          )}
          <span className="rail-user__text">
            <span className="rail-user__name" title={user.name}>{user.name}</span>
            <span className="rail-role">{roleLabel(user.role)}</span>
          </span>
        </div>

        <button type="button" className="rail-signout" onClick={handleSignOut}>
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
            <path
              d="M15 5H7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h8M14 12h7m-3-3 3 3-3 3"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Sign out
        </button>
      </div>
    </div>
  );
}
