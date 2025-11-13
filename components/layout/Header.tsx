"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import "./header.scss";

const NAV = [
  // { label: "Home", href: "/" },
  { label: "Configuration", href: "/configuration" },
  { label: "Imposition", href: "/imposition" },
  { label: "Combine", href: "/combine" },
];

export function Header() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`rethink-header ${scrolled ? "rethink-header--scrolled" : ""}`}
    >
      <div className="rethink-header__inner rethink-container">
        {/* Brand */}
        <Link href="/" className="rethink-header__brand">
          N-Ups
        </Link>

        {/* Nav (center) */}
        <nav className="rethink-header__nav" aria-label="Primary">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rethink-header__nav-link${
                  active ? " rethink-header__nav-link--active" : ""
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Right action */}
        {/* <div className="rethink-header__utils">
          <button className="rethink-btn rethink-btn--primary rethink-btn--md">
            Rethink Never Ends
          </button>
        </div> */}
      </div>
    </header>
  );
}
