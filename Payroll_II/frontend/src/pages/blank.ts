import { useState } from 'react';
import type { FormEvent } from 'react';
import { currentUser } from '../services/auth.ts';
import { esc, markup } from '../utils/ui.tsx';
import type { PageContext } from '../types.ts';
export default function Blank({ ctx }: { ctx: PageContext }) {
    const user = currentUser();
    const [message, setMessage] = useState<string | null>(null);
    function submit(event: FormEvent<HTMLFormElement>): void {
        event.preventDefault();
        setMessage(String(new FormData(event.currentTarget).get('sampleInput') ?? ''));
    }
    return <>{markup(`
      <div class="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div class="admin-banner flex-grow-1 mb-0">
          <div class="admin-eyebrow">Starter Template</div>
          <h4 class="page-title">Blank Page</h4>
          <div class="page-sub">Signed in as ${esc(user?.username || 'Guest')} — use this layout as a starting point for new pages.</div>
        </div>
        <div class="d-flex gap-2">
          <button type="button" class="btn btn-outline-secondary btn-sm" id="btn-back">
            <i class="bi bi-arrow-left me-1"></i>Back
          </button>
          <button type="button" class="btn btn-primary btn-sm" id="btn-menu">
            <i class="bi bi-grid-1x2-fill me-1"></i>Menu
          </button>
        </div>
      </div>

      <div id="err" role="alert"></div>

      <div class="card-soft fade-in p-4">
        <h5 class="mb-2">Example Section</h5>
        <p class="text-muted small mb-3">Replace this section with your page content, table, or form.</p>

        <form id="example-form" class="row g-3" style="max-width: 560px;">
          <div class="col-12">
            <label class="form-label" for="sampleInput">Sample Input</label>
            <input id="sampleInput" name="sampleInput" class="form-control" type="text" placeholder="Type something..." required />
          </div>
          <div class="col-12" id="message" role="status" aria-live="polite"></div>
          <div class="col-12 d-flex gap-2">
            <button type="submit" class="btn btn-primary btn-sm">Submit</button>
            <button type="reset" class="btn btn-light btn-sm">Reset</button>
          </div>
        </form>
      </div>`, {
        'btn-back': { onClick: () => window.history.length > 1 ? window.history.back() : ctx.navigate('/dashboard') },
        'btn-menu': { onClick: () => ctx.navigate('/dashboard') },
        'example-form': { onSubmit: submit },
        'message': { children: message !== null ? <div className="alert alert-success py-2 mb-0">Submitted: <strong>{message}</strong></div> : null }
    })}</>;
}
