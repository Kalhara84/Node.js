import { empty } from '../assets';

export const esc = (value: unknown): string => String(value ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#039;');

export const qs = <T extends Element = HTMLElement>(selector: string, parent: ParentNode = document): T | null =>
  parent.querySelector<T>(selector);

export const money = (value: number | string | null | undefined, decimals = 0): string =>
  Number(value ?? 0).toLocaleString('en-LK', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

export const CATEGORY: Record<string, string> = { W: 'Wages', E: 'Executive', S: 'Staff' };
export const GENDER: Record<string, string> = { M: 'Male', F: 'Female' };

export const yn = (value: string | null | undefined): string => {
  if (value === 'Y') return 'Yes';
  if (value === 'N') return 'No';
  return value || '-';
};

export const errMsg = (error: unknown): string => error instanceof Error ? error.message : String(error);

export const loading = (text = 'Loading...'): string => `
  <div class="loading-state text-center py-5">
    <div class="spinner-border" role="status"><span class="visually-hidden">Loading...</span></div>
    <div class="mt-2 text-muted">${esc(text)}</div>
  </div>`;

export const emptyState = (title: string, sub = '') => `
  <div class="empty-state">
    <img src="${empty}" alt="" />
    <div class="t">${esc(title)}</div>
    ${sub ? `<div class="small">${esc(sub)}</div>` : ''}
  </div>`;

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
          <button type="button" class="btn btn-light" data-no>Cancel</button>
          <button type="button" class="btn btn-danger" data-yes>${esc(confirmText)}</button>
        </div>
      </div>`;
    const done = (value: boolean) => { el.remove(); resolve(value); };
    el.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      if (target === el || target.closest('[data-no]')) done(false);
      else if (target.closest('[data-yes]')) done(true);
    });
    document.body.appendChild(el);
  });
}
