"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import "./hero.scss";

export function Hero() {
  const [imgLoaded, setImgLoaded] = useState(false);

  return (
    <section className="rethink-hero">
      <div className="rethink-hero__inner rethink-container">
        <div className="rethink-hero__copy">
          <h1 className="rethink-hero__title">Ready-2-Print Imposition</h1>
          <p className="rethink-hero__subtitle">
            From images to press-ready PDFs in minutes. Auto-fit, crop, and
            paginate to any paper size with mm-level precision.
          </p>

          <div className="rethink-hero__actions">
            {/* Primary: global button style */}
            <Link
              href="/configuration"
              className="rethink-btn rethink-btn--primary rethink-btn--md"
            >
              Start
            </Link>
          </div>

          <div className="rethink-hero__meta">
            No signup · Local processing · 300 DPI export
          </div>
        </div>

        <div className="rethink-hero__art">
          <Image
            src="https://images.unsplash.com/photo-1542708993627-b6e5bbae43c4?q=80&w=1144&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
            alt="Imposition workflow preview"
            fill
            sizes="600px"
            className={`rethink-hero__art-img ${
              imgLoaded ? "rethink-hero__art-img--visible" : ""
            }`}
            priority
            unoptimized
            onLoadingComplete={() => setImgLoaded(true)}
          />
          <div
            className={`rethink-hero__art-placeholder ${
              imgLoaded ? "rethink-hero__art-placeholder--hidden" : ""
            }`}
          >
            Drop images → Auto-layout grid → Export PDF
          </div>
        </div>
      </div>
    </section>
  );
}
