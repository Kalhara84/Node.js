import { request } from '../services/api.ts';
import { currentUser } from '../services/auth.ts';
import { esc, qs, alertBox, errMsg } from '../utils/ui.ts';
import type { PageContext } from '../types.ts';

// Render user account password change page
export async function render(el: HTMLElement, ctx: PageContext): Promise<void> {
    const user = currentUser();

    el.innerHTML = `
      <div class="admin-banner mb-4">
        <div class="admin-eyebrow">My account</div>
        <h4 class="page-title">Change password</h4>
        <div class="page-sub">Manage sign-in details for ${esc(user?.username)}</div>
      </div>
      <div class="card-soft p-4" style="max-width:640px">
        <h5 class="mb-3">Update your password</h5>
        <form id="password-form">
          <div class="mb-3">
            <label class="form-label" for="currentPassword">Current password</label>
            <input id="currentPassword" name="currentPassword" class="form-control" type="password" maxlength="256" autocomplete="current-password" required>
          </div>
          <div class="mb-3">
            <label class="form-label" for="newPassword">New password</label>
            <input id="newPassword" name="newPassword" class="form-control" type="password" maxlength="256" autocomplete="new-password" required>
          </div>
          <div class="mb-3">
            <label class="form-label" for="confirmPassword">Confirm new password</label>
            <input id="confirmPassword" name="confirmPassword" class="form-control" type="password" maxlength="256" autocomplete="new-password" required>
          </div>
          <div id="message" role="status" aria-live="polite"></div>
          <div class="d-flex gap-2">
            <button type="submit" class="btn btn-primary">Update password</button>
            <button type="reset" class="btn btn-light">Reset</button>
          </div>
        </form>
      </div>`;

    // Handle password change form submission
    qs<HTMLFormElement>(el, '#password-form').onsubmit = async (e) => {
        e.preventDefault();
        const form = e.currentTarget as HTMLFormElement;
        const button = form.querySelector('button')!;
        const data = Object.fromEntries(new FormData(form));

        if (data.newPassword !== data.confirmPassword) {
            qs(el, '#message').innerHTML = alertBox('New passwords do not match');
            return;
        }

        button.disabled = true;

        try {
            await request('/auth/password', {
                method: 'POST',
                body: JSON.stringify(data)
            });

            if (ctx.alive()) {
                form.reset();
                qs(el, '#message').innerHTML = '<div class="alert alert-success">Password updated successfully.</div>';
            }
        } catch (err) {
            if (ctx.alive()) {
                qs(el, '#message').innerHTML = alertBox(errMsg(err));
            }
        } finally {
            button.disabled = false;
        }
    };
}
