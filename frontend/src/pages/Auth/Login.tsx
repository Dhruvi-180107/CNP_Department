import { useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth, isProfileComplete } from '../../context/AuthContext';
import { api } from '../../services/api';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const isSubmittingRef = useRef(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || isSubmittingRef.current) return;

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError('Email and password are required');
      return;
    }

    setError('');
    setLoading(true);
    isSubmittingRef.current = true;

    try {
      const res = await api<any>('POST', '/auth/login', {
        email: trimmedEmail,
        password,
      });

      if (res.success && res.token && res.user) {
        login(res.token, res.user);

        const from = (location.state as any)?.from?.pathname;
        const target =
          from && from !== '/login'
            ? from
            : isProfileComplete(res.user)
            ? '/dashboard'
            : '/profile';

        navigate(target, { replace: true });
      } else {
        setError(res.message || 'Login failed');
        setLoading(false);
        isSubmittingRef.current = false;
      }
    } catch (err: any) {
      setError(err.message || 'Login failed');
      setLoading(false);
      isSubmittingRef.current = false;
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="dot"></div>
          <span>CNP Department</span>
        </div>
        <h1 className="auth-title">Welcome back</h1>
        <p className="auth-sub">Sign in to your account to continue</p>
        
        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <div className="auth-field">
            <label htmlFor="login-email">Email address</label>
            <input
              type="email"
              id="login-email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              disabled={loading}
              required
            />
          </div>
          <div className="auth-field">
            <label htmlFor="login-password">Password</label>
            <input
              type="password"
              id="login-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="auth-switch">
          Don't have an account? <a href="#" onClick={(e) => { e.preventDefault(); navigate('/register'); }}>Create one</a>
        </p>
      </div>
    </div>
  );
}
