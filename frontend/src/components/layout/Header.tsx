import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export function Header() {
  const location = useLocation();
  const { user } = useAuth();
  
  const getPageTitle = () => {
    const path = location.pathname.split('/')[1] || 'dashboard';
    return path.charAt(0).toUpperCase() + path.slice(1).replace('-', ' ');
  };

  return (
    <header className="app-header">
      <h1 className="header-title">{getPageTitle()}</h1>
      <div className="header-actions">
        {user && <span className="badge badge-student" style={{ padding: '6px 12px', fontSize: '12px' }}>{user.role.replace('_', ' ')}</span>}
        <span style={{ fontSize: '1.2rem', cursor: 'pointer', padding: '8px', background: 'var(--bg)', borderRadius: '50%', color: 'var(--text-muted)' }}>🔔</span>
      </div>
    </header>
  );
}
