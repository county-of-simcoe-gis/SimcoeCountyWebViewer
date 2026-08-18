"use client";

import { useLegendStore } from "@/stores/legendStore";
import Legend from "@/components/Legend/Legend";
import FloatingWindow from "@/components/common/FloatingWindow";

export default function LegendModal() {
  const isOpen = useLegendStore((s) => s.isOpen);
  const closeLegend = useLegendStore((s) => s.closeLegend);

  return (
    <FloatingWindow isOpen={isOpen} title="Legend" onClose={closeLegend}>
      <Legend />
    </FloatingWindow>
  );
}
