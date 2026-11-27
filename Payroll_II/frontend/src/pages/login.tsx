import { useState } from 'react';
import type { FormEvent } from 'react';
import { loginHero, logo, shield } from '../assets/index.ts';
import { login, homeFor } from '../services/auth.ts';
import { errMsg } from '../utils/ui.ts';
import { navigate } from '../router.tsx';

// Render user login page
export default function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    // Handle sign-in submission
    async function onSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
        e.preventDefault();
        setError('');

        const name = username.trim();

        if (!name || !password) {
            setError('Please enter your user name and password');
            return;
        }

        setBusy(true);

        try {
            const user = await login(name, password);
            navigate(homeFor(user), true);
        } catch (err) {
            setError(errMsg(err));
            setBusy(false);
        }
    }

    return (
        <div className="login-page">
            <section className="login-hero">
                <div className="hero-inner">
                    <span className="hero-pill"><i className="bi bi-shield-check"></i>Secure sign in</span>
                    <h1>Attendance &amp;<br /><span>Payroll System</span></h1>
                    <p>Manage employees, attendance and payroll from one clean place.</p>
                    <img src={loginHero} alt="Payroll dashboard, payslip and attendance device" className="hero-art" />
                    <div className="hero-points">
                        <span><i className="bi bi-check-circle-fill"></i>Employee records</span>
                        <span><i className="bi bi-check-circle-fill"></i>Live dashboard</span>
                        <span><i className="bi bi-check-circle-fill"></i>Secure access</span>
                    </div>
                </div>
            </section>

            <section className="login-side">
                <form className="login-card" id="login-form" noValidate onSubmit={(e) => void onSubmit(e)}>
                    <img src={logo} alt="Mike Flora" className="login-logo" />
                    <h2>Welcome back</h2>
                    <p className="text-muted mb-4">Sign in to continue to your dashboard</p>
                    <div id="login-error">
                        {error ? (
                            <div className="alert alert-danger py-2 d-flex align-items-center gap-2">
                                <i className="bi bi-exclamation-circle"></i> {error}
                            </div>
                        ) : null}
                    </div>

                    <label className="form-label" htmlFor="username">User name</label>
                    <div className="input-group mb-3">
                        <span className="input-group-text"><i className="bi bi-person"></i></span>
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

                    <label className="form-label" htmlFor="password">Password</label>
                    <div className="input-group mb-4">
                        <span className="input-group-text"><i className="bi bi-lock"></i></span>
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
                            id="toggle-pw"
                            aria-label="Show password"
                            onClick={() => setShowPassword((v) => !v)}
                        >
                            <i className={showPassword ? 'bi bi-eye-slash' : 'bi bi-eye'}></i>
                        </button>
                    </div>

                    <button className="btn btn-primary w-100 login-btn" id="login-btn" disabled={busy}>
                        {busy ? (
                            <><span className="spinner-border spinner-border-sm me-2"></span>Signing in...</>
                        ) : (
                            <>Sign in <i className="bi bi-arrow-right ms-1"></i></>
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
