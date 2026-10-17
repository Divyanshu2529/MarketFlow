"use client";

import { useEffect } from "react";

export function ThemeInitializer() {
  useEffect(() => {
    const savedTheme = localStorage.getItem(
      "marketflow-theme"
    );

    document.documentElement.classList.toggle(
      "dark",
      savedTheme === "dark"
    );
  }, []);

  return null;
}