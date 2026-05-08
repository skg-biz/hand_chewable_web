import { useEffect, useRef } from "react";

export interface PointerEvt {
  id: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
  vx: number;
  vy: number;
  pressure: number;
  isPrimary: boolean;
}

export interface PointerHandlers {
  onDown?: (e: PointerEvt) => void;
  onMove?: (e: PointerEvt) => void;
  onUp?: (e: PointerEvt) => void;
  onCancel?: (e: PointerEvt) => void;
}

export function usePointer<T extends HTMLElement>(
  ref: React.RefObject<T | null>,
  handlers: PointerHandlers
) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const last = new Map<number, { x: number; y: number; t: number }>();

    const toEvt = (e: PointerEvent): PointerEvt => {
      const rect = el.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * el.clientWidth;
      const y = ((e.clientY - rect.top) / rect.height) * el.clientHeight;
      const prev = last.get(e.pointerId);
      const now = performance.now();
      const dt = prev ? Math.max(1, now - prev.t) : 16;
      const dx = prev ? x - prev.x : 0;
      const dy = prev ? y - prev.y : 0;
      return {
        id: e.pointerId,
        x, y, dx, dy,
        vx: dx / dt * 1000,
        vy: dy / dt * 1000,
        pressure: e.pressure || 0.5,
        isPrimary: e.isPrimary,
      };
    };

    const down = (e: PointerEvent) => {
      el.setPointerCapture?.(e.pointerId);
      const evt = toEvt(e);
      last.set(e.pointerId, { x: evt.x, y: evt.y, t: performance.now() });
      handlersRef.current.onDown?.(evt);
    };
    const move = (e: PointerEvent) => {
      const evt = toEvt(e);
      last.set(e.pointerId, { x: evt.x, y: evt.y, t: performance.now() });
      handlersRef.current.onMove?.(evt);
    };
    const up = (e: PointerEvent) => {
      const evt = toEvt(e);
      last.delete(e.pointerId);
      handlersRef.current.onUp?.(evt);
    };
    const cancel = (e: PointerEvent) => {
      const evt = toEvt(e);
      last.delete(e.pointerId);
      handlersRef.current.onCancel?.(evt);
    };

    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", cancel);
    el.addEventListener("pointerleave", cancel);
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", cancel);
      el.removeEventListener("pointerleave", cancel);
    };
  }, [ref]);
}
