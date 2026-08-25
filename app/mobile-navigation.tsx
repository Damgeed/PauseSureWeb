"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

type NavigationItem = readonly [label: string, href: string];

type MobileNavigationProps = {
  navigation: readonly NavigationItem[];
  releaseAction: {
    label: string;
    href: string;
  };
};

export function MobileNavigation({ navigation, releaseAction }: MobileNavigationProps) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const summaryRef = useRef<HTMLElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  const closeMenu = useCallback((restoreFocus = false) => {
    const details = detailsRef.current;
    if (!details?.open) return;

    details.open = false;
    setIsOpen(false);

    if (restoreFocus) {
      window.requestAnimationFrame(() => summaryRef.current?.focus());
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const details = detailsRef.current;
      if (details && !event.composedPath().includes(details)) {
        closeMenu();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu(true);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeMenu, isOpen]);

  return (
    <details
      className="mobile-nav"
      ref={detailsRef}
      onToggle={(event) => setIsOpen(event.currentTarget.open)}
    >
      <summary
        ref={summaryRef}
        aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
        aria-expanded={isOpen}
        aria-controls="mobile-navigation-panel"
      >
        <span />
        <span />
        <span />
      </summary>
      <nav id="mobile-navigation-panel" aria-label="Mobile navigation">
        {navigation.map(([label, href]) => (
          <Link href={href} key={href} onClick={() => closeMenu()}>{label}</Link>
        ))}
        <a className="mobile-contact" href={releaseAction.href} onClick={() => closeMenu()}>
          {releaseAction.label}
        </a>
      </nav>
    </details>
  );
}
