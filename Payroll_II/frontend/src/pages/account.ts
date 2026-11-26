import { useState } from 'react';
import type { FormEvent } from 'react';
import { request } from '../services/api.ts';
import { currentUser } from '../services/auth.ts';
import { esc, markup, errMsg, useAlive } from '../utils/ui.tsx';
export default function Account() {
    const user = currentUser();
    const alive = useAlive();
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState('');
    const [success, setSuccess] = useState(false);
    async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
        event.preventDefault();
        if (busy) return;
        const form = event.currentTarget;
        const data = Object.fromEntries(new FormData(form));
        if (data.newPassword !== data.confirmPassword) { setSuccess(false); setMessage('New passwords do not match'); return; }
        setBusy(true);
        try {
            await request('/auth/password', { method: 'POST', body: JSON.stringify(data) });
            if (alive.current) { form.reset(); setSuccess(true); setMessage('Password updated successfully.'); }
        } catch (error) {
            if (alive.current) { setSuccess(false); setMessage(errMsg(error)); }
        } finally {
            if (alive.current) setBusy(false);
        }
    }
    return <>{markup(`
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
      </div>`, (element) => {
        if (element.attribs.id === 'password-form') return { onSubmit: submit };
        if (element.attribs.id === 'message') return { children: message ? <div className={success ? 'alert alert-success' : 'alert alert-danger py-2'}>{message}</div> : null };
        if (element.name === 'button' && element.attribs.type === 'submit') return { disabled: busy };
        return {};
    })}</>;
}
