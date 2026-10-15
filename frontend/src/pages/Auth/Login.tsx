import { useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth, isProfileComplete } from '../../context/AuthContext';
import { api } from '../../services/api';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const isSubmittingRef = useRef(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loading || isSubmittingRef.current) return;

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError('Enter your email address and password to continue.');
      return;
    }

    setError('');
    setLoading(true);
    isSubmittingRef.current = true;

    try {
      const response = await api<any>('POST', '/auth/login', {
        email: trimmedEmail,
        password,
      });

      if (response.success && response.token && response.user) {
        login(response.token, response.user);

        const from = (location.state as any)?.from?.pathname;
        const target =
          from && from !== '/login'
            ? from
            : isProfileComplete(response.user)
              ? '/dashboard'
              : '/profile';

        navigate(target, { replace: true });
      } else {
        setError(response.message || 'Login failed. Check your details and try again.');
        setLoading(false);
        isSubmittingRef.current = false;
      }
    } catch (requestError: any) {
      setError(requestError.message || 'We couldn’t sign you in. Please try again.');
      setLoading(false);
      isSubmittingRef.current = false;
    }
  };

  return (
    <main className="login-page">
      <section className="login-shell" aria-label="CNP Department sign in">
        <div className="login-story">
          <div className="login-brand">
            <span className="login-brand-mark" aria-hidden="true">
              <svg viewBox="0 0 28 28" fill="none">
                <path d="M5 21.5V10.8L14 5l9 5.8v10.7h-6.1v-7h-5.8v7H5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
                <path d="M10 10.6h.1M18 10.6h.1" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
              </svg>
            </span>
            <span>CNP Department</span>
          </div>

          <div className="login-story-copy">
            <p className="login-eyebrow">Student Clubs <span aria-hidden="true">·</span> GUIITAR Projects</p>
            <h1>Your campus work,<br />connected.</h1>
            <p className="login-story-description">
              Access student-managed clubs and GUIITAR projects through one college platform.
            </p>
          </div>

          <div className="campus-illustration" aria-hidden="true">
            <div className="illustration-orbit illustration-orbit-one" />
            <div className="illustration-orbit illustration-orbit-two" />
            <div className="illustration-note illustration-note-club">
              <span className="note-icon note-icon-club"><svg viewBox="0 0 24 24" fill="none"><path d="M12 12.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4ZM5.8 19.2c.5-2.5 2.8-4.2 6.2-4.2s5.7 1.7 6.2 4.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg></span>
              <span><strong>Student clubs</strong><small>Ideas take shape together</small></span>
            </div>
            <div className="illustration-note illustration-note-project">
              <span className="note-icon note-icon-project"><svg viewBox="0 0 24 24" fill="none"><path d="m8.5 8-4 4 4 4m7-8 4 4-4 4m-2.2-10-2.6 12" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
              <span><strong>GUIITAR projects</strong><small>Built by the campus community</small></span>
            </div>
            <div className="illustration-campus">
              <div className="campus-sun" />
              <div className="campus-building">
                <div className="building-roof" />
                <div className="building-top"><span /><span /><span /></div>
                <div className="building-columns"><i /><i /><i /><i /><i /></div>
                <div className="building-steps" />
              </div>
              <div className="campus-ground" />
              <span className="campus-spark campus-spark-one">✳</span>
              <span className="campus-spark campus-spark-two">✦</span>
            </div>
          </div>

          <p className="login-audience">For authorized students, faculty, and college officials</p>
        </div>

        <div className="login-form-side">
          <div className="login-form-wrap">
            <div className="login-mobile-brand">
              <span className="login-brand-mark" aria-hidden="true"><svg viewBox="0 0 28 28" fill="none"><path d="M5 21.5V10.8L14 5l9 5.8v10.7h-6.1v-7h-5.8v7H5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /></svg></span>
              <span>CNP Department</span>
            </div>
            <div className="login-form-heading">
              <p className="login-form-kicker">College community access</p>
              <h2>Welcome back</h2>
              <p>Sign in with your authorized college account.</p>
            </div>

            {error && <div className="login-error" id="login-error" role="alert">{error}</div>}

            <form className="login-form" onSubmit={handleSubmit} noValidate>
              <div className="login-field">
                <label htmlFor="login-email">College email</label>
                <div className="login-input-wrap">
                  <svg className="login-input-icon" viewBox="0 0 20 20" fill="none" aria-hidden="true"><rect x="2.5" y="4" width="15" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" /><path d="m3.5 5 6.5 5 6.5-5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /></svg>
                  <input
                    id="login-email"
                    name="email"
                    type="email"
                    autoComplete="username"
                    inputMode="email"
                    placeholder="name@college.edu"
                    value={email}
                    onChange={event => setEmail(event.target.value)}
                    disabled={loading}
                    required
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? 'login-error' : undefined}
                  />
                </div>
              </div>

              <div className="login-field">
                <label htmlFor="login-password">Password</label>
                <div className="login-input-wrap">
                  <svg className="login-input-icon" viewBox="0 0 20 20" fill="none" aria-hidden="true"><rect x="3.5" y="8.5" width="13" height="9" rx="2" stroke="currentColor" strokeWidth="1.5" /><path d="M6.5 8.5V6a3.5 3.5 0 0 1 7 0v2.5M10 12v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                  <input
                    id="login-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={event => setPassword(event.target.value)}
                    disabled={loading}
                    required
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? 'login-error' : undefined}
                  />
                  <button
                    className="login-password-toggle"
                    type="button"
                    onClick={() => setShowPassword(visible => !visible)}
                    disabled={loading}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? (
                      <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M2.2 10s2.7-5 7.8-5 7.8 5 7.8 5-2.7 5-7.8 5-7.8-5-7.8-5Z" stroke="currentColor" strokeWidth="1.5" /><circle cx="10" cy="10" r="2.2" stroke="currentColor" strokeWidth="1.5" /><path d="m4 4 12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                    ) : (
                      <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M2.2 10s2.7-5 7.8-5 7.8 5 7.8 5-2.7 5-7.8 5-7.8-5-7.8-5Z" stroke="currentColor" strokeWidth="1.5" /><circle cx="10" cy="10" r="2.2" stroke="currentColor" strokeWidth="1.5" /></svg>
                    )}
                  </button>
                </div>
              </div>

              <button className="login-submit" type="submit" disabled={loading}>
                {loading ? <><span className="login-spinner" aria-hidden="true" />Signing in…</> : <>Sign in <span aria-hidden="true">→</span></>}
              </button>
              <p className="login-form-note"><span className="login-secure-mark" aria-hidden="true">✓</span> Access is limited to authorized college accounts</p>
            </form>
          </div>
          <p className="login-legal">CNP Department <span aria-hidden="true">·</span> Student Managed Clubs &amp; GUIITAR</p>
        </div>
      </section>
    </main>
  );
}
