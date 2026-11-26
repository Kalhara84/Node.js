import { currentUser } from '../services/auth.ts';
import { alertBox, errMsg, esc, qs } from '../utils/ui.ts';
import type { PageContext } from '../types.ts';

// Render example blank starter page following the project's page module pattern
export async function render(el: HTMLElement, ctx: PageContext): Promise<void> {
    const user = currentUser();

    el.innerHTML = `
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
      </div>`;

    const $ = <T extends HTMLElement = HTMLElement>(selector: string): T => qs<T>(el, selector);

    // Navigation button handlers
    $('#btn-back').addEventListener('click', () => {
        if (window.history.length > 1) {
            window.history.back();
        } else {
            ctx.navigate('/dashboard');
        }
    });

    $('#btn-menu').addEventListener('click', () => {
        ctx.navigate('/dashboard');
    });

    // Example form submit handler showing ctx.alive() and error handling pattern
    $<HTMLFormElement>('#example-form').onsubmit = async (e) => {
        e.preventDefault();
        const form = e.currentTarget as HTMLFormElement;
        const submitBtn = form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
        const data = Object.fromEntries(new FormData(form));

        $('#err').innerHTML = '';
        $('#message').innerHTML = '';
        submitBtn.disabled = true;

        try {
            // Replace with your API call, e.g.:
            // await request('/your-endpoint', { method: 'POST', body: JSON.stringify(data) });
            if (!ctx.alive()) {
                return;
            }
            $('#message').innerHTML = `<div class="alert alert-success py-2 mb-0">Submitted: <strong>${esc(String(data.sampleInput ?? ''))}</strong></div>`;
        } catch (err) {
            if (ctx.alive()) {
                $('#err').innerHTML = alertBox(errMsg(err));
            }
        } finally {
            if (ctx.alive()) {
                submitBtn.disabled = false;
            }
        }
    };
}

