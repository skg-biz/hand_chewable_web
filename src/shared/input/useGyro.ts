import { useEffect, useRef, useState } from "react";

export interface GyroState {
  beta: number;
  gamma: number;
  alpha: number;
  available: boolean;
  permissionState: "unknown" | "granted" | "denied" | "unsupported";
}

interface DeviceMotionEventCtor {
  requestPermission?: () => Promise<"granted" | "denied">;
}

export function useGyro(enabled: boolean) {
  const [state, setState] = useState<GyroState>({
    beta: 0, gamma: 0, alpha: 0, available: false, permissionState: "unknown",
  });
  const ref = useRef(state);
  ref.current = state;

  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined" || !("DeviceOrientationEvent" in window)) {
      setState((s) => ({ ...s, permissionState: "unsupported" }));
      return;
    }
    const handler = (e: DeviceOrientationEvent) => {
      setState({
        beta: e.beta ?? 0,
        gamma: e.gamma ?? 0,
        alpha: e.alpha ?? 0,
        available: true,
        permissionState: "granted",
      });
    };
    window.addEventListener("deviceorientation", handler);
    return () => window.removeEventListener("deviceorientation", handler);
  }, [enabled]);

  const requestPermission = async () => {
    const ctor = window.DeviceOrientationEvent as unknown as DeviceMotionEventCtor;
    if (typeof ctor?.requestPermission === "function") {
      try {
        const result = await ctor.requestPermission();
        setState((s) => ({ ...s, permissionState: result }));
        return result === "granted";
      } catch {
        setState((s) => ({ ...s, permissionState: "denied" }));
        return false;
      }
    }
    setState((s) => ({ ...s, permissionState: "granted" }));
    return true;
  };

  return { ...state, requestPermission };
}
