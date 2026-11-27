import { useEffect, useRef } from 'react';
import type { SelectHTMLAttributes } from 'react';
import { destroySelect2, enhanceSelect, refreshSelect2 } from '../utils/select2.ts';

// <select class="form-select"> with the searchable Select2 dropdown (every dropdown in the app uses this)
export default function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
    const ref = useRef<HTMLSelectElement>(null);

    useEffect(() => {
        const select = ref.current!;
        enhanceSelect(select);
        return () => destroySelect2(select);
    }, []);

    // Keep the Select2 label in sync with the React value / options / disabled state
    useEffect(() => {
        refreshSelect2(ref.current!);
    });

    // The wrapper keeps the extra nodes added by Select2 away from React's own nodes
    return (
        <span style={{ display: 'contents' }}>
            <select ref={ref} className={className ? `form-select ${className}` : 'form-select'} {...props}>
                {children}
            </select>
        </span>
    );
}
