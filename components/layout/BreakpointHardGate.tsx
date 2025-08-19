"use client";

import React, { useEffect, useState } from "react";

const BREAKPOINT_PX = 1024;

export default function BreakpointHardGate() {
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    const check = () => {
      // Guard for SSR
      if (typeof window === "undefined") return;
      setBlocked(window.innerWidth < BREAKPOINT_PX);
    };

    // Initial check
    check();

    // Debounced resize listener
    let timeoutId: number | null = null;
    const onResize = () => {
      if (timeoutId) window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(check, 150);
    };

    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, []);

  // Prevent page scroll when blocked
  useEffect(() => {
    if (!blocked) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [blocked]);

  if (!blocked) return null;

  return (
    <div
      className="rethink-hardgate"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rethink-hardgate-title"
      aria-describedby="rethink-hardgate-desc"
    >
      <div className="rethink-hardgate__panel" tabIndex={-1}>
        <h2 id="rethink-hardgate-title" className="rethink-hardgate__title">
          Best on Desktop
        </h2>
        <p id="rethink-hardgate-desc" className="rethink-hardgate__desc">
          This tool is optimized for screens wider than 1024&nbsp;px. Please
          open it on a desktop.
        </p>
      </div>
    </div>
  );
}
