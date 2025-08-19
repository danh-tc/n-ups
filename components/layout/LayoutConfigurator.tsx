"use client";

import Link from "next/link";
import { calculateGridLayout } from "@/lib/layoutCalculator";
import { PaperPreview } from "./PaperPreview";
import { SummaryTable } from "./SummaryTable";
import "./layout-configurator.scss";
import { PaperSettingsForm } from "../config/PaperSettingsForm";
import { ImageSettingsForm } from "../config/ImageSettingsForm";
import { MetaInfoForm } from "../config/MetaInfoForm";
import { useImpositionStore } from "@/store/useImpositionStore";
import { useHydrated } from "@/hooks/useImpositionHydrated";

export default function LayoutConfigurator() {
  const paper = useImpositionStore((s) => s.paper);
  const setPaper = useImpositionStore((s) => s.setPaper);
  const image = useImpositionStore((s) => s.image);
  const setImage = useImpositionStore((s) => s.setImage);
  const meta = useImpositionStore((s) => s.meta);
  const setMeta = useImpositionStore((s) => s.setMeta);
  const displayMeta = useImpositionStore((s) => s.displayMeta);
  const setDisplayMeta = useImpositionStore((s) => s.setDisplayMeta);

  const layout = calculateGridLayout(paper, image);
  const hydrated = useHydrated();
  if (!hydrated) return null;

  const handleResetForm = () => {
    useImpositionStore.persist.clearStorage();
    window.location.reload();
  };

  return (
    <section className="rethink-layout-configurator">
      <div className="rethink-layout-configurator__inner rethink-container">
        <div className="rethink-layout-configurator__main">
          <div className="rethink-layout-configurator__card">
            <h2 className="rethink-layout-configurator__section-title">
              Paper Settings
            </h2>
            <PaperSettingsForm value={paper} onChange={setPaper} />
          </div>

          <div className="rethink-layout-configurator__card">
            <h2 className="rethink-layout-configurator__section-title">
              Hangtag Settings
            </h2>
            <ImageSettingsForm value={image} onChange={setImage} />
          </div>

          <div className="rethink-layout-configurator__card">
            <h2 className="rethink-layout-configurator__section-title">
              Meta Data
            </h2>
            <MetaInfoForm
              value={meta}
              onChange={setMeta}
              displayMeta={displayMeta ?? true}
              onDisplayMetaChange={setDisplayMeta}
            />
          </div>
        </div>

        {/* RIGHT: one sticky column (preview + summary) */}
        <aside className="rethink-layout-configurator__aside">
          <div className="rethink-layout-configurator__aside-sticky">
            <div className="rethink-layout-configurator__card rethink-layout-configurator__preview">
              <PaperPreview
                paper={paper}
                image={image}
                customerName={displayMeta ? meta.customerName : undefined}
                description={displayMeta ? meta.description : undefined}
                date={displayMeta ? meta.date : undefined}
              />
            </div>

            <div className="rethink-layout-configurator__card rethink-layout-configurator__summary">
              <SummaryTable
                paper={paper}
                image={image}
                layout={layout}
                gap={paper.gap}
                margin={paper.margin}
              />
            </div>
          </div>
        </aside>
      </div>

      {/* Bottom sticky actions */}
      <div className="rethink-layout-configurator__actions">
        <div className="rethink-container rethink-layout-configurator__actions-inner">
          <button
            onClick={handleResetForm}
            className="rethink-btn rethink-btn--outline rethink-btn--md"
          >
            Reset
          </button>
          <Link
            href="/imposition"
            className="rethink-btn rethink-btn--primary rethink-btn--md"
          >
            Confirm
          </Link>
        </div>
      </div>
    </section>
  );
}
