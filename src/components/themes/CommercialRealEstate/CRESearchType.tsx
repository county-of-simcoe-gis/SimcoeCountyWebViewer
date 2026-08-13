"use client";

import { useCREStore } from "./stores/creStore";
import { getTypes } from "./creObjects";

const types = getTypes();

export default function CRESearchType() {
  const selectedType = useCREStore((s) => s.selectedType);
  const setSelectedType = useCREStore((s) => s.setSelectedType);

  return (
    <div className="border-b border-base-300 mt-2 pb-2">
      <label className="font-bold text-sm">Real Estate Type</label>
      <select
        className="select select-bordered select-sm w-full mt-1"
        value={selectedType.value}
        onChange={(e) => {
          const match = types.find((t) => t.value === e.target.value);
          if (match) setSelectedType(match);
        }}
      >
        {types.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </select>
    </div>
  );
}
