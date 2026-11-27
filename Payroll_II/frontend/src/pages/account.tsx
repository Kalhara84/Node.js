import { useState } from 'react';
import type { FormEvent } from 'react';
import { request } from '../services/api.ts';
import { currentUser } from '../services/auth.ts';
import { errMsg } from '../utils/ui.ts';
import { AlertBox } from '../components/ui.tsx';
import { useAlive } from '../hooks.ts';

// Render user account password change page
export default function Account() {
    const alive = useAlive();
    const user = currentUser();
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState<{ error: boolean; text: string } | null>(null);

    // Handle password change form submission
    async function onSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
        e.preventDefault();
        const form = e.currentTarget;
        const data = Object.fromEntries(new FormData(form));

        if (data.newPassword !== data.confirmPassword) {
            setMessage({ error: true, text: 'New passwords do not match' });
            return;
        }

        setBusy(true);

        try {
            await request('/auth/password', {
                method: 'POST',
                body: JSON.stringify(data)
            });

            if (alive()) {
                form.reset();
                setMessage({ error: false, text: 'Password updated successfully.' });
            }
        } catch (err) {
            if (alive()) {
                setMessage({ error: true, text: errMsg(err) });
            }
        } finally {
            setBusy(false);
        }
    }

    return (
        <>
            <div className="admin-banner mb-4">
                <div className="admin-eyebrow">My account</div>
                <h4 className="page-title">Change password</h4>
                <div className="page-sub">Manage sign-in details for {user?.username}</div>
            </div>
            <div className="card-soft p-4" style={{ maxWidth: '640px' }}>
                <h5 className="mb-3">Update your password</h5>
                <form id="password-form" onSubmit={(e) => void onSubmit(e)}>
                    <div className="mb-3">
                        <label className="form-label" htmlFor="currentPassword">Current password</label>
                        <input id="currentPassword" name="currentPassword" className="form-control" type="password" maxLength={256} autoComplete="current-password" required />
                    </div>
                    <div className="mb-3">
                        <label className="form-label" htmlFor="newPassword">New password</label>
                        <input id="newPassword" name="newPassword" className="form-control" type="password" maxLength={256} autoComplete="new-password" required />
                    </div>
                    <div className="mb-3">
                        <label className="form-label" htmlFor="confirmPassword">Confirm new password</label>
                        <input id="confirmPassword" name="confirmPassword" className="form-control" type="password" maxLength={256} autoComplete="new-password" required />
                    </div>
                    <div id="message" role="status" aria-live="polite">
                        {message ? (
                            message.error ? <AlertBox message={message.text} /> : <div className="alert alert-success">{message.text}</div>
                        ) : null}
                    </div>
                    <div className="d-flex gap-2">
                        <button type="submit" className="btn btn-primary" disabled={busy}>Update password</button>
                        <button type="reset" className="btn btn-light">Reset</button>
                    </div>
                </form>
            </div>
        </>
    );
}
