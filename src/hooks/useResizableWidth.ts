import { useCallback, useEffect, useRef, useState } from 'react';

interface Options {
  key: string;
  defaultWidth: number;
  min: number;
  max: number;
  /** 'left' = handle is on the left edge, dragging left increases width (used for right-side panels). 'right' = handle on right edge. */
  side?: 'left' | 'right';
}

/**
 * Resizable width hook with per-user localStorage persistence.
 * Returns width state, drag handlers and a reset function.
 */
export function useResizableWidth({ key, defaultWidth, min, max, side = 'left' }: Options) {
  const [width, setWidth] = useState<number>(() => {
    if (typeof window === 'undefined') return defaultWidth;
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return defaultWidth;
      const n = parseInt(raw, 10);
      if (Number.isFinite(n)) return Math.max(min, Math.min(max, n));
    } catch { /* ignore */ }
    return defaultWidth;
  });

  const dragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(defaultWidth);

  // Persist when width changes (debounced via rAF)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const id = window.requestAnimationFrame(() => {
      try { window.localStorage.setItem(key, String(width)); } catch { /* ignore */ }
    });
    return () => window.cancelAnimationFrame(id);
  }, [key, width]);

  // Re-load when key changes (e.g., user changes)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) {
        const n = parseInt(raw, 10);
        if (Number.isFinite(n)) setWidth(Math.max(min, Math.min(max, n)));
        else setWidth(defaultWidth);
      } else {
        setWidth(defaultWidth);
      }
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const onPointerMove = useCallback((e: PointerEvent) => {
    if (!dragging.current) return;
    const delta = e.clientX - startX.current;
    const next = side === 'left' ? startWidth.current - delta : startWidth.current + delta;
    setWidth(Math.max(min, Math.min(max, next)));
  }, [min, max, side]);

  const onPointerUp = useCallback(() => {
    dragging.current = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
  }, [onPointerMove]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    dragging.current = true;
    startX.current = e.clientX;
    startWidth.current = width;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  }, [width, onPointerMove, onPointerUp]);

  const reset = useCallback(() => setWidth(defaultWidth), [defaultWidth]);

  return { width, onPointerDown, reset };
}
