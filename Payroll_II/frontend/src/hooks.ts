import { useCallback, useEffect, useRef } from 'react';

// Same idea as the old ctx.alive(): false once the page was left (ignore late API answers)
export function useAlive(): () => boolean {
    const ref = useRef(true);
    useEffect(() => {
        ref.current = true;
        return () => {
            ref.current = false;
        };
    }, []);
    return useCallback(() => ref.current, []);
}
