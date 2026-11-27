import { createRoot } from 'react-dom/client';
import { empty } from '../assets/index.ts';

// Loading spinner
export function Loading({ text = 'Loading...' }: { text?: string }) {
    return (
        <div className="text-center text-muted py-5">
            <div className="spinner-border text-primary mb-2"></div>
            <div>{text}</div>
        </div>
    );
}

// Error alert box
export function AlertBox({ message }: { message: string }) {
    return <div className="alert alert-danger py-2">{message}</div>;
}

// Empty state placeholder
export function EmptyState({ title, sub = '' }: { title: string; sub?: string }) {
    return (
        <div className="empty-state">
            <img src={empty} alt="" />
            <div className="t">{title}</div>
            {sub ? <div className="small">{sub}</div> : null}
        </div>
    );
}

interface ConfirmOptions {
    title: string;
    message: string;
    confirmText?: string;
}

function ConfirmBox({ title, message, confirmText = 'Delete', onDone }: ConfirmOptions & { onDone: (v: boolean) => void }) {
    return (
        <div
            className="modal-backdrop-lite"
            onClick={(e) => {
                if (e.target === e.currentTarget) {
                    onDone(false);
                }
            }}
        >
            <div className="modal-box">
                <div className="modal-icon"><i className="bi bi-trash3-fill"></i></div>
                <h5 className="mb-2">{title}</h5>
                <p className="text-muted mb-4">{message}</p>
                <div className="d-flex justify-content-end gap-2">
                    <button className="btn btn-light" onClick={() => onDone(false)}>Cancel</button>
                    <button className="btn btn-danger" onClick={() => onDone(true)}>{confirmText}</button>
                </div>
            </div>
        </div>
    );
}

// Simple confirmation modal dialog (promise based, same as before)
export function confirmModal(opts: ConfirmOptions): Promise<boolean> {
    return new Promise((resolve) => {
        const host = document.createElement('div');
        document.body.appendChild(host);
        const root = createRoot(host);
        let finished = false;

        const done = (v: boolean): void => {
            if (finished) {
                return;
            }
            finished = true;
            resolve(v);
            setTimeout(() => {
                root.unmount();
                host.remove();
            }, 0);
        };

        root.render(<ConfirmBox {...opts} onDone={done} />);
    });
}
