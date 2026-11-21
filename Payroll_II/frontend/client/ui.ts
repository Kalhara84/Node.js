/** small helpers shared by all pages */
export const esc = (s: unknown): string =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

export const money = (n: number | string | null | undefined, d = 0): string =>
  Number(n ?? 0).toLocaleString('en-LK', { minimumFractionDigits: d, maximumFractionDigits: d });

export const CATEGORY: Record<string, string> = { W: 'Wages', E: 'Executive', S: 'Staff' };
export const GENDER: Record<string, string> = { M: 'Male', F: 'Female' };
export const yn = (v: string | null | undefined): string => (v === 'Y' ? 'Yes' : v === 'N' ? 'No' : v || '-');

/** error text from anything that was thrown */
export const errMsg = (e: unknown): string => (e instanceof Error ? e.message : String(e));

export const loading = (text = 'Loading...'): string =>
  `<div class="text-center text-muted py-5"><div class="spinner-border text-primary mb-2"></div><div>${esc(text)}</div></div>`;

export const alertBox = (msg: string): string => `<div class="alert alert-danger py-2">${esc(msg)}</div>`;

export const emptyState = (title: string, sub = ''): string =>
  `<div class="empty-state"><img src="/assets/empty.svg" alt="" /><div class="t">${esc(title)}</div>${sub ? `<div class="small">${esc(sub)}</div>` : ''}</div>`;

/** typed querySelector that throws if the element is missing (no more "possibly null") */
export function qs<T extends HTMLElement = HTMLElement>(root: ParentNode, selector: string): T {
  const el = root.querySelector<T>(selector);
  if (!el) throw new Error(`Element not found: ${selector}`);
  return el;
}

/** delete / confirm dialog -> resolves true (confirmed) or false (cancelled) */
export function confirmModal(opts: { title: string; message: string; confirmText?: string }): Promise<boolean> {
  const { title, message, confirmText = 'Delete' } = opts;
  return new Promise((resolve) => {
    const el = document.createElement('div');
    el.className = 'modal-backdrop-lite';
    el.innerHTML = `
      <div class="modal-box">
        <div class="modal-icon"><i class="bi bi-trash3-fill"></i></div>
        <h5 class="mb-2">${esc(title)}</h5>
        <p class="text-muted mb-4">${esc(message)}</p>
        <div class="d-flex justify-content-end gap-2">
          <button class="btn btn-light" data-no>Cancel</button>
          <button class="btn btn-danger" data-yes>${esc(confirmText)}</button>
        </div>
      </div>`;
    const done = (v: boolean): void => {
      el.remove();
      resolve(v);
    };
    el.addEventListener('click', (e) => {
      const t = e.target as HTMLElement;
      if (t === el || t.closest('[data-no]')) done(false);
      else if (t.closest('[data-yes]')) done(true);
    });
    document.body.appendChild(el);
  });
}
