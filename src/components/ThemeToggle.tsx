"use client";

import { useSyncExternalStore } from "react";

// Lê o tema atual diretamente do atributo data-theme do <html> (fonte da verdade,
// já aplicada pelo script inline do root layout) e observa mudanças.
function subscribe(callback: () => void) {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  return () => observer.disconnect();
}

function getSnapshot(): "light" | "dark" {
  return document.documentElement.getAttribute("data-theme") === "dark"
    ? "dark"
    : "light";
}

export default function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, () => "light");

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("bolao-theme", next);
    } catch {}
  }

  return (
    <button
      type="button"
      className="icon-btn"
      onClick={toggle}
      title="Alternar tema"
      aria-label="Alternar tema"
    >
      {theme === "dark" ? "☀︎" : "☾︎"}
    </button>
  );
}
