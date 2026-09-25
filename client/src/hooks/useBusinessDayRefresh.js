import { useEffect, useRef } from 'react';
import { getBusinessDateKey } from '../utils/attendanceDate';

/**
 * Calls onDayChange when the business calendar date rolls over
 * (local app timezone) or when the tab becomes visible again.
 */
export default function useBusinessDayRefresh(onDayChange, enabled = true) {
  const callbackRef = useRef(onDayChange);
  callbackRef.current = onDayChange;
  const dateKeyRef = useRef(getBusinessDateKey());

  useEffect(() => {
    if (!enabled) return undefined;

    const check = (force = false) => {
      const next = getBusinessDateKey();
      if (force || next !== dateKeyRef.current) {
        const previous = dateKeyRef.current;
        dateKeyRef.current = next;
        if (force || previous !== next) {
          callbackRef.current?.(next, previous);
        }
      }
    };

    const intervalId = setInterval(() => check(false), 15000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') check(false);
    };

    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [enabled]);
}
