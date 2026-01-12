"use client";

import { useEffect, useState } from "react";

/**
 * Returns true iff the device's primary input can hover (typical desktop mouse/trackpad).
 * We use this to keep hover-only UI on desktop while avoiding touch browsers emulating hover.
 */
export function useCanHover(fallback = true) {
  const [canHover, setCanHover] = useState(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return fallback;
    return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;

    const mql = window.matchMedia("(hover: hover) and (pointer: fine)");
    const update = () => setCanHover(mql.matches);
    update();

    if (typeof mql.addEventListener === "function") {
      mql.addEventListener("change", update);
      return () => mql.removeEventListener("change", update);
    }

    // Safari < 14
    // eslint-disable-next-line deprecation/deprecation
    mql.addListener(update);
    // eslint-disable-next-line deprecation/deprecation
    return () => mql.removeListener(update);
  }, []);

  return canHover;
}


