"use client";
import { PaperPreview } from "@/components/layout/PaperPreview";
import { useImpositionStore } from "@/store/useImpositionStore";

export default function UploadItems() {
  const paper = useImpositionStore((s) => s.paper);
  const image = useImpositionStore((s) => s.image);
  const meta = useImpositionStore((s) => s.meta);
  return (
    <div>
      <PaperPreview
        paper={paper}
        image={image}
        customerName={meta.customerName}
        description={meta.description}
        date={meta.date}
      />
    </div>
  );
}
