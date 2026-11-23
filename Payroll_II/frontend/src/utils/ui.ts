import { empty } from '../assets/index.ts';

// Escape HTML special characters to prevent XSS
export const esc = (s: unknown): string => {
    return String(s ?? '').replace(/[&<>"']/g, (c) => {
        return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string);
    });
};

// Format currency and numbers (LKR format)
export const money = (n: number | string | null | undefined, d = 0): string => {
    return Number(n ?? 0).toLocaleString('en-LK', {
        minimumFractionDigits: d,
        maximumFractionDigits: d
    });
};

// Employee category lookup mapping
export const CATEGORY: Record<string, string> = {
    W: 'Wages',
    E: 'Executive',
    S: 'Staff'
};

// Gender code lookup mapping
export const GENDER: Record<string, string> = {
    M: 'Male',
    F: 'Female'
};

// Convert Y/N database values to readable Yes/No text
export const yn = (v: string | null | undefined): string => {
    if (v === 'Y') {
        return 'Yes';
    }
    if (v === 'N') {
        return 'No';
    }
    return v || '-';
};

// Extract readable error message from caught exception
export const errMsg = (e: unknown): string => {
    return e instanceof Error ? e.message : String(e);
};

// Loading spinner markup helper
export const loading = (text = 'Loading...'): string => `
  <div class="text-center text-muted py-5">
    <div class="spinner-border text-primary mb-2"></div>
    <div>${esc(text)}</div>
  </div>`;

// Error alert box markup helper
export const alertBox = (msg: string): string => `
  <div class="alert alert-danger py-2">${esc(msg)}</div>`;

// Empty state placeholder markup helper
export const emptyState = (title: string, sub = ''): string => {
    const subtitle = sub ? `<div class="small">${esc(sub)}</div>` : '';
    return `
      <div class="empty-state">
        <img src="${empty}" alt="" />
        <div class="t">${esc(title)}</div>
        ${subtitle}
      </div>`;
};

// Type-safe querySelector that throws if element is missing
export function qs<T extends HTMLElement = HTMLElement>(root: ParentNode, selector: string): T {
    const el = root.querySelector<T>(selector);
    if (!el) {
        throw new Error(`Element not found: ${selector}`);
    }
    return el;
}

// Simple confirmation modal dialog
export function confirmModal(opts: {
    title: string;
    message: string;
    confirmText?: string;
}): Promise<boolean> {
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
            if (t === el || t.closest('[data-no]')) {
                done(false);
            } else if (t.closest('[data-yes]')) {
                done(true);
            }
        });

        document.body.appendChild(el);
    });
}
