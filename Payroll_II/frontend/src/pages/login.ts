import { loginHero, logo, shield } from '../assets/index.ts';
import { login, homeFor } from '../services/auth.ts';
import { esc, errMsg, qs } from '../utils/ui.ts';
import type { PageContext } from '../types.ts';

// Render user login page
export async function render(el: HTMLElement, ctx: PageContext): Promise<void> {
    el.innerHTML = `
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
      </div>`;

    const $ = <T extends HTMLElement = HTMLElement>(s: string): T => qs<T>(el, s);
    const errBox = $('#login-error');
    const btn = $<HTMLButtonElement>('#login-btn');

    // Toggle password visibility (show/hide)
    $('#toggle-pw').onclick = () => {
        const pw = $<HTMLInputElement>('#password');
        const show = pw.type === 'password';
        pw.type = show ? 'text' : 'password';
        $('#toggle-pw i').className = show ? 'bi bi-eye-slash' : 'bi bi-eye';
    };

    // Handle sign-in submission
    $<HTMLFormElement>('#login-form').onsubmit = async (e) => {
        e.preventDefault();
        errBox.innerHTML = '';

        const username = $<HTMLInputElement>('#username').value.trim();
        const password = $<HTMLInputElement>('#password').value;

        const showError = (m: string): void => {
            errBox.innerHTML = `<div class="alert alert-danger py-2 d-flex align-items-center gap-2"><i class="bi bi-exclamation-circle"></i> ${esc(m)}</div>`;
        };

        if (!username || !password) {
            return showError('Please enter your user name and password');
        }

        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Signing in...';

        try {
            const user = await login(username, password);
            ctx.navigate(homeFor(user), true);
        } catch (err) {
            showError(errMsg(err));
            btn.disabled = false;
            btn.innerHTML = 'Sign in <i class="bi bi-arrow-right ms-1"></i>';
        }
    };
}
