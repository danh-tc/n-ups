"use client";

import Link from "next/link";
import "./footer.scss";

export function Footer() {
  return (
    <footer className="rethink-footer rethink-footer--tint" role="contentinfo">
      <div className="rethink-footer__inner rethink-container">
        {/* Brand / tagline */}
        <div className="rethink-footer__col rethink-footer__brand">
          <div className="rethink-footer__logo">Ready-2-Print</div>
          <p className="rethink-footer__tagline">
            Precision imposition and press-ready PDF export.
          </p>
        </div>

        {/* Product links */}
        <nav
          className="rethink-footer__col rethink-footer__nav"
          aria-label="Product"
        >
          <div className="rethink-footer__heading">Product</div>

          {/* Keep /configuration if that's your route; otherwise switch to /config */}
          <Link href="/configuration" className="rethink-footer__link">
            Configuration
          </Link>
          <Link href="/imposition" className="rethink-footer__link">
            Imposition
          </Link>
          <Link href="/export" className="rethink-footer__link">
            Export PDF
          </Link>
        </nav>

        {/* Legal / support */}
        <nav
          className="rethink-footer__col rethink-footer__nav"
          aria-label="Legal"
        >
          <div className="rethink-footer__heading">Legal</div>
          <Link href="/privacy" className="rethink-footer__link">
            Privacy
          </Link>
          <Link href="/terms" className="rethink-footer__link">
            Terms
          </Link>
          <Link href="/contact" className="rethink-footer__link">
            Contact
          </Link>
        </nav>
      </div>

      <div className="rethink-footer__bar">
        <div className="rethink-container rethink-footer__bar-inner">
          <span className="rethink-footer__copy">
            © {new Date().getFullYear()} Ready-2-Print
          </span>
          <span className="rethink-footer__note">
            Built for accurate, fast printing.
          </span>
        </div>
      </div>
    </footer>
  );
}
