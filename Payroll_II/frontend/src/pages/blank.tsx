import { useState } from 'react';
import type { FormEvent } from 'react';
import { currentUser } from '../services/auth.ts';
import { errMsg } from '../utils/ui.ts';
import { AlertBox } from '../components/ui.tsx';
import { useAlive } from '../App.tsx';
import { useNavigate } from 'react-router-dom';

// Example blank starter page following the project's page pattern
export default function Blank() {
    const navigate = useNavigate();
    const alive = useAlive();
    const user = currentUser();
    const [err, setErr] = useState('');
    const [submitted, setSubmitted] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    // Example form submit handler showing alive() and error handling pattern
    async function onSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.currentTarget));

        setErr('');
        setSubmitted(null);
        setBusy(true);

        try {
            // Replace with your API call, e.g.:
            // await request('/your-endpoint', { method: 'POST', body: JSON.stringify(data) });
            if (!alive()) {
                return;
            }
            setSubmitted(String(data.sampleInput ?? ''));
        } catch (error) {
            if (alive()) {
                setErr(errMsg(error));
            }
        } finally {
            if (alive()) {
                setBusy(false);
            }
        }
    }

    return (
        <>
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
                <div className="program-banner flex-grow-1 mb-0">
                    <div className="program-eyebrow">Starter Template</div>
                    <h4 className="page-title">Blank Page</h4>
                    <div className="page-sub">Signed in as {user?.username || 'Guest'} — use this layout as a starting point for new pages.</div>
                </div>
                <div className="d-flex gap-2">
                    <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm"
                        id="btn-back"
                        onClick={() => {
                            if (window.history.length > 1) {
                                window.history.back();
                            } else {
                                navigate('/dashboard');
                            }
                        }}
                    >
                        <i className="bi bi-arrow-left me-1"></i>Back
                    </button>
                    <button type="button" className="btn btn-primary btn-sm" id="btn-menu" onClick={() => navigate('/dashboard')}>
                        <i className="bi bi-grid-1x2-fill me-1"></i>Menu
                    </button>
                </div>
            </div>

            <div id="err" role="alert">{err ? <AlertBox message={err} /> : null}</div>

            <div className="card-soft fade-in p-4">
                <h5 className="mb-2">Example Section</h5>
                <p className="text-muted small mb-3">Replace this section with your page content, table, or form.</p>

                <form id="example-form" className="row g-3" style={{ maxWidth: '560px' }} onSubmit={(e) => void onSubmit(e)}>
                    <div className="col-12">
                        <label className="form-label" htmlFor="sampleInput">Sample Input</label>
                        <input id="sampleInput" name="sampleInput" className="form-control" type="text" placeholder="Type something..." required />
                    </div>
                    <div className="col-12" id="message" role="status" aria-live="polite">
                        {submitted !== null ? (
                            <div className="alert alert-success py-2 mb-0">Submitted: <strong>{submitted}</strong></div>
                        ) : null}
                    </div>
                    <div className="col-12 d-flex gap-2">
                        <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>Submit</button>
                        <button type="reset" className="btn btn-light btn-sm">Reset</button>
                    </div>
                </form>
            </div>
        </>
    );
}
