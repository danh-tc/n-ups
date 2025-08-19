"use client";

import "./benefits-grids.scss";
import {
  Crop,
  Ruler,
  Scissors,
  Shield,
  SlidersHorizontal,
  Zap,
} from "lucide-react";

type Benefit = {
  title: string;
  text: string;
  Icon: React.ElementType;
};

const BENEFITS: Benefit[] = [
  {
    title: "Auto crop & orientation",
    text: "We detect the best fit and rotate as needed so every slot fills neatly—no manual nudging.",
    Icon: Crop,
  },
  {
    title: "True-to-mm precision",
    text: "Export matches your configuration exactly (300 DPI). No hidden scaling, no surprises at the printer.",
    Icon: Ruler,
  },
  {
    title: "Multi-page & cutting lines",
    text: "Overflow images paginate automatically. Add trim guides so finishing is fast and accurate.",
    Icon: Scissors,
  },
  {
    title: "Private by design",
    text: "Everything runs in your browser. Your images never leave your device.",
    Icon: Shield,
  },
  {
    title: "Presets & custom sizes",
    text: "A-series and US sizes built-in, or define any paper and slot dimensions in mm, cm, or inches.",
    Icon: SlidersHorizontal,
  },
  {
    title: "Fast, batch-friendly",
    text: "Drag in a folder, tweak once, export. Save time on repetitive layouts and last-minute changes.",
    Icon: Zap,
  },
];

export function BenefitGrid() {
  return (
    <section className="rethink-benefits" aria-labelledby="benefits-title">
      <div className="rethink-benefits__inner rethink-container">
        <h2 id="benefits-title" className="rethink-benefits__heading">
          Why Ready-2-Print
        </h2>

        <ul className="rethink-benefits__grid" role="list">
          {BENEFITS.map(({ title, text, Icon }) => (
            <li className="rethink-benefits__item" key={title}>
              <div className="rethink-benefits__icon">
                <Icon size={22} />
              </div>
              <div className="rethink-benefits__content">
                <div className="rethink-benefits__title">{title}</div>
                <p className="rethink-benefits__text">{text}</p>
              </div>
            </li>
          ))}
        </ul>

        <div className="rethink-benefits__badges">
          <span className="rethink-benefits__badge">No signup</span>
          <span className="rethink-benefits__badge">Local processing</span>
          <span className="rethink-benefits__badge">300 DPI export</span>
          <span className="rethink-benefits__badge">WYSIWYG preview</span>
        </div>
      </div>
    </section>
  );
}
