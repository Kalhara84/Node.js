import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../services/auth';
import { loginHero, logo, shield } from '../assets';
import { errMsg } from '../utils/ui';

export default function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password) {
      setError('Please enter your user name and password');
      return;
    }

    setBusy(true);
    try {
      await login(username.trim(), password);
      navigate('/dashboard', { replace: true });
    } catch (e) {
      setError(errMsg(e));
      setBusy(false);
    }
  }

  return (
    <div className="login-page">
      <section className="login-hero">
        <div className="hero-inner">
          <span className="hero-pill">
            <i className="bi bi-shield-check" />
            Secure sign in
          </span>

          <h1>
            Attendance &amp;
            <br />
            <span>Payroll System</span>
          </h1>

          <p>Manage employees, attendance and payroll from one clean place.</p>

          <img
            src={loginHero}
            alt="Payroll dashboard, payslip and attendance device"
            className="hero-art"
          />

          <div className="hero-points">
            <span>
              <i className="bi bi-check-circle-fill" />
              Employee records
            </span>
            <span>
              <i className="bi bi-check-circle-fill" />
              Live dashboard
            </span>
            <span>
              <i className="bi bi-check-circle-fill" />
              Secure access
            </span>
          </div>
        </div>
      </section>

      <section className="login-side">
        <form className="login-card" onSubmit={submit} noValidate>
          <img src={logo} alt="Mike Flora" className="login-logo" />

          <h2>Welcome back</h2>
          <p className="text-muted mb-4">
            Sign in to continue to your dashboard
          </p>

          {error && (
            <div className="alert alert-danger py-2 d-flex align-items-center gap-2">
              <i className="bi bi-exclamation-circle" />
              {error}
            </div>
          )}

          <label className="form-label" htmlFor="username">
            User name
          </label>

          <div className="input-group mb-3">
            <span className="input-group-text">
              <i className="bi bi-person" />
            </span>
            <input
              id="username"
              className="form-control"
              placeholder="Enter your user name"
              autoComplete="username"
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <label className="form-label" htmlFor="password">
            Password
          </label>

          <div className="input-group mb-4">
            <span className="input-group-text">
              <i className="bi bi-lock" />
            </span>

            <input
              id="password"
              className="form-control"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <button
              type="button"
              className="btn btn-outline-secondary"
              aria-label="Show password"
              onClick={() => setShowPassword((v) => !v)}
            >
              <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`} />
            </button>
          </div>

          <button
            className="btn btn-primary w-100 login-btn"
            disabled={busy}
          >
            {busy ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" />
                Signing in...
              </>
            ) : (
              <>
                Sign in
                <i className="bi bi-arrow-right ms-1" />
              </>
            )}
          </button>

          <div className="login-foot">
            <img src={shield} alt="" width="24" height="24" />
            <span>Mike Flora LTD - Attendance &amp; Payroll System</span>
          </div>
        </form>
      </section>
    </div>
  );
}
