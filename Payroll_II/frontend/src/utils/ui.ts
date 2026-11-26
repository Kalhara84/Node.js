import { createElement, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import parse, { attributesToProps, domToReact, Element } from 'html-react-parser';
import type { DOMNode, HTMLReactParserOptions } from 'html-react-parser';
import { Select } from './select2.tsx';
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

// Convert the existing escaped templates into React elements.
// Bindings supply React event handlers and state without writing to the DOM.
export function markup(html: string, bindings: Record<string, Record<string, unknown>> | ((element: Element) => Record<string, unknown>) = {}): ReactNode {
    const options: HTMLReactParserOptions = {
        replace(node) {
            if (!(node instanceof Element)) {
                return;
            }
            const props = attributesToProps(node.attribs);
            const bound = typeof bindings === 'function' ? bindings(node) : bindings[node.attribs.id] ?? bindings[node.attribs.name] ?? {};
            if (node.name === 'option') {
                delete props.selected;
            }
            if (node.name === 'select') {
                const selected = node.children.find((child) => child instanceof Element && child.attribs.selected !== undefined) as Element | undefined;
                if (selected) props.defaultValue = selected.attribs.value;
            }
            if (node.name === 'input' && ['checkbox', 'radio'].includes(node.attribs.type)) {
                props.checked = node.attribs.checked !== undefined;
                props.onChange = () => {};
                delete props.defaultChecked;
            }
            const children = Object.hasOwn(bound, 'children') ? bound.children as ReactNode : domToReact(node.children as DOMNode[], options);
            const attributes = { ...props, ...bound };
            if (['input', 'img', 'br', 'hr', 'meta', 'link', 'area', 'base', 'col', 'embed', 'param', 'source', 'track', 'wbr'].includes(node.name)) {
                return createElement(node.name, attributes);
            }
            return createElement(node.name === 'select' && node.attribs.class?.includes('form-select') ? Select : node.name, attributes, children);
        }
    };
    return parse(html, options);
}

// Guard async updates after a page has unmounted.
export function useAlive() {
    const alive = useRef(true);
    useEffect(() => {
        alive.current = true;
        return () => { alive.current = false; };
    }, []);
    return alive;
}

// Load initial page data and discard late responses after navigation.
export function useLoad<T>(load: () => Promise<T>) {
    const [data, setData] = useState<T | null>(null);
    const [error, setError] = useState('');
    useEffect(() => {
        let active = true;
        void load().then((result) => { if (active) setData(result); }).catch((reason: unknown) => { if (active) setError(errMsg(reason)); });
        return () => { active = false; };
    }, []);
    return { data, setData, error };
}

// Simple confirmation modal dialog rendered by React.
export function confirmModal(opts: { title: string; message: string; confirmText?: string }): Promise<boolean> {
    return new Promise((resolve) => {
        const host = document.createElement('div');
        document.body.appendChild(host);
        const root = createRoot(host);
        function done(value: boolean): void {
            root.unmount();
            host.remove();
            resolve(value);
        }
        root.render(<div className="modal-backdrop-lite" onClick={(event) => { if (event.target === event.currentTarget) done(false); }}>
            <div className="modal-box">
                <div className="modal-icon"><i className="bi bi-trash3-fill" /></div>
                <h5 className="mb-2">{opts.title}</h5>
                <p className="text-muted mb-4">{opts.message}</p>
                <div className="d-flex justify-content-end gap-2">
                    <button className="btn btn-light" data-no onClick={() => done(false)}>Cancel</button>
                    <button className="btn btn-danger" data-yes onClick={() => done(true)}>{opts.confirmText ?? 'Delete'}</button>
                </div>
            </div>
        </div>);
    });
}
