import { useEffect, useRef } from "react";

export type KeyMap = Record<string, (e: KeyboardEvent) => void>;

export function useKey(map: KeyMap, options: { element?: HTMLElement | null } = {}) {
  const ref = useRef(map);
  ref.current = map;

  useEffect(() => {
    const target: HTMLElement | Document = options.element ?? document;
    const handler = (e: Event) => {
      const ke = e as KeyboardEvent;
      const fn = ref.current[ke.key] || ref.current[ke.code];
      if (fn) {
        fn(ke);
      }
    };
    target.addEventListener("keydown", handler);
    return () => target.removeEventListener("keydown", handler);
  }, [options.element]);
}

export function useKeyPressed() {
  const pressed = useRef(new Set<string>());

  useEffect(() => {
    const down = (e: KeyboardEvent) => pressed.current.add(e.key);
    const up = (e: KeyboardEvent) => pressed.current.delete(e.key);
    const blur = () => pressed.current.clear();
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, []);

  return pressed;
}
