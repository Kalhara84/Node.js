import { useSyncExternalStore } from 'react';
import type { AnchorHTMLAttributes, MouseEvent } from 'react';

// Every navigation (link click, back/forward, redirect) creates a new snapshot,
// so the app checks the route again even when the path itself did not change.
interface NavSnapshot {
    tick: number;
}

let snapshot: NavSnapshot = { tick: 0 };
const listeners = new Set<() => void>();

function emit(): void {
    snapshot = { tick: snapshot.tick + 1 };
    listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

// SPA navigation function
export function navigate(path: string, replace = false): void {
    if (replace) {
        history.replaceState({}, '', path);
    } else {
        history.pushState({}, '', path);
    }
    emit();
}

// Handle browser back/forward history buttons
window.addEventListener('popstate', emit);

export function useNavigation(): NavSnapshot {
    return useSyncExternalStore(subscribe, () => snapshot);
}

// Check if current URL matches a route and extract parameters like :id
export function matchRoute(routePath: string, currentPath: string): { matched: boolean; params: string[] } {
    const routeParts = routePath.split('/').filter(Boolean);
    const currentParts = currentPath.split('/').filter(Boolean);

    if (routeParts.length !== currentParts.length) {
        return { matched: false, params: [] };
    }

    const params: string[] = [];

    for (let i = 0; i < routeParts.length; i++) {
        const rPart = routeParts[i];
        const cPart = currentParts[i];

        // Dynamic parameter like :id
        if (rPart.startsWith(':')) {
            params.push(cPart);
        } else if (rPart !== cPart) {
            return { matched: false, params: [] };
        }
    }

    return { matched: true, params };
}

// Client-side link (same as the old <a data-link>)
export function Link({ href = '/', onClick, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement>) {
    const handleClick = (e: MouseEvent<HTMLAnchorElement>): void => {
        onClick?.(e);
        if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) {
            return;
        }
        e.preventDefault();
        navigate(href);
    };

    return <a href={href} data-link="" {...rest} onClick={handleClick} />;
}
