"use client";

import { useEffect } from "react";
import "./BackgroundFX.css";

export default function BackgroundFX() {
  useEffect(() => {
    const el = document.querySelector(".bg-fx");
    if (!el) return;

    const handleMove = (e: MouseEvent) => {
      const x = e.clientX;
      const y = e.clientY;
      el.setAttribute(
        "style",
        `--x:${x}px; --y:${y}px;`
      );
    };

    window.addEventListener("pointermove", handleMove);
    return () => window.removeEventListener("pointermove", handleMove);
  }, []);

  return <div className="bg-fx"></div>;
}
