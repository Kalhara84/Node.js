import { useState } from 'react';
import type { FormEvent } from 'react';
import { loginHero, logo, shield } from '../assets/index.ts';
import { login, homeFor } from '../services/auth.ts';
import { markup, errMsg, useAlive } from '../utils/ui.tsx';
import type { PageContext } from '../types.ts';

export default function Login({ ctx }: { ctx: PageContext }) {
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const alive = useAlive();
    async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
        event.preventDefault();
        if (busy) return;
        const form = event.currentTarget;
        const username = (form.elements.namedItem('username') as HTMLInputElement).value.trim();
        const password = (form.elements.namedItem('password') as HTMLInputElement).value;
        setError('');
        if (!username || !password) { setError('Please enter your user name and password'); return; }
        setBusy(true);
        try {
            const user = await login(username, password);
            if (alive.current) ctx.navigate(homeFor(user), true);
        } catch (error) {
            if (alive.current) { setError(errMsg(error)); setBusy(false); }
        }
    }
    return <>{markup(`
      <div class="login-page">
        <section class="login-hero">
          <div class="hero-inner">
            <span class="hero-pill"><i class="bi bi-shield-check"></i>Secure sign in</span>
            <h1>Attendance &amp;<br /><span>Payroll System</span></h1>
            <p>Manage employees, attendance and payroll from one clean place.</p>
            <img src="${loginHero}" alt="Payroll dashboard, payslip and attendance device" class="hero-art" />
            <div class="hero-points">
              <span><i class="bi bi-check-circle-fill"></i>Employee records</span>
              <span><i class="bi bi-check-circle-fill"></i>Live dashboard</span>
              <span><i class="bi bi-check-circle-fill"></i>Secure access</span>
            </div>
          </div>
        </section>

        <section class="login-side">
          <form class="login-card" id="login-form" novalidate>
            <img src="${logo}" alt="Mike Flora" class="login-logo" />
            <h2>Welcome back</h2>
            <p class="text-muted mb-4">Sign in to continue to your dashboard</p>
            <div id="login-error"></div>

            <label class="form-label" for="username">User name</label>
            <div class="input-group mb-3">
              <span class="input-group-text"><i class="bi bi-person"></i></span>
              <input id="username" class="form-control" placeholder="Enter your user name" autocomplete="username" autofocus />
            </div>

            <label class="form-label" for="password">Password</label>
            <div class="input-group mb-4">
              <span class="input-group-text"><i class="bi bi-lock"></i></span>
              <input id="password" class="form-control" type="password" placeholder="Enter your password" autocomplete="current-password" />
              <button type="button" class="btn btn-outline-secondary" id="toggle-pw" aria-label="Show password"><i class="bi bi-eye"></i></button>
            </div>

            <button class="btn btn-primary w-100 login-btn" id="login-btn">Sign in <i class="bi bi-arrow-right ms-1"></i></button>

            <div class="login-foot">
              <img src="${shield}" alt="" width="24" height="24" />
              <span>Mike Flora LTD - Attendance &amp; Payroll System</span>
            </div>
          </form>
        </section>
      </div>`, {
        'login-form': { onSubmit: submit },
        'username': { name: 'username', autoFocus: true },
        'password': { name: 'password', type: showPassword ? 'text' : 'password' },
        'toggle-pw': { onClick: () => setShowPassword(!showPassword), children: <i className={showPassword ? 'bi bi-eye-slash' : 'bi bi-eye'} /> },
        'login-error': { children: error ? <div className="alert alert-danger py-2 d-flex align-items-center gap-2"><i className="bi bi-exclamation-circle" /> {error}</div> : null },
        'login-btn': { disabled: busy, children: busy ? <><span className="spinner-border spinner-border-sm me-2" />Signing in...</> : <>Sign in <i className="bi bi-arrow-right ms-1" /></> }
    })}</>;
}
