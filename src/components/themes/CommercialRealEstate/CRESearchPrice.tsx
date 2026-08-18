"use client";

import { useCREStore } from "./stores/creStore";
import { getPriceFromItems, getPriceToItems } from "./creObjects";

const fromItems = getPriceFromItems();
const toItems = getPriceToItems();

export default function CRESearchPrice() {
  const selectedFrom = useCREStore((s) => s.selectedPriceFrom);
  const selectedTo = useCREStore((s) => s.selectedPriceTo);
  const setFrom = useCREStore((s) => s.setPriceFrom);
  const setTo = useCREStore((s) => s.setPriceTo);

  return (
    <div className="border-b border-base-300 mt-2 pb-2">
      <label className="font-bold text-sm">Price</label>
      <div className="flex items-center gap-1 pt-1">
        <select
          className="select select-bordered select-sm flex-1"
          value={selectedFrom.value}
          onChange={(e) => {
            const match = fromItems.find((i) => i.value === Number(e.target.value));
            if (match) setFrom(match);
          }}
        >
          {fromItems.map((i) => (
            <option key={`from-${i.value}`} value={i.value}>
              {i.label}
            </option>
          ))}
        </select>
        <span className="text-xs px-1">to</span>
        <select
          className="select select-bordered select-sm flex-1"
          value={selectedTo.value}
          onChange={(e) => {
            const match = toItems.find((i) => i.value === Number(e.target.value));
            if (match) setTo(match);
          }}
        >
          {toItems.map((i) => (
            <option key={`to-${i.value}`} value={i.value}>
              {i.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
