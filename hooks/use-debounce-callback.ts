import { useEffect, useRef } from "react";
import { debounce } from "lodash";

/**
 * Creates a stable, debounced version of a callback function
 */
export function useDebouncedCallback<Args extends unknown[]>(
    callback: (...args: Args) => void,
    delay: number
): (...args: Args) => void {
    const callbackRef = useRef(callback);
    callbackRef.current = callback;

    const debouncedFn = useRef(
        debounce((...args: Args) => {
            callbackRef.current(...args);
        }, delay)
    ).current;

    useEffect(() => {
        return () => {
            debouncedFn.cancel();
        };
    }, [debouncedFn]);

    return debouncedFn;
}
