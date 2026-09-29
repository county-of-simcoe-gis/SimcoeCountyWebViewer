"use client";

import React, { useState, useEffect, useRef } from "react";
import { useLegendStore, type LegendObject, type LegendEntry } from "@/stores/legendStore";
import { type TOCLayer } from "@/stores/tocStore";
import { FaChevronDown, FaTimes, FaPrint } from "react-icons/fa";

interface LegendItemProps {
  layer: TOCLayer;
  center?: boolean;
}

const LegendItem: React.FC<LegendItemProps> = ({ layer, center = false }) => {
  const [legendImage, setLegendImage] = useState<string | null>(layer.legendImage || layer.styleUrl);

  useEffect(() => {
    if (layer.styleUrl && !legendImage) {
      setLegendImage(layer.styleUrl);
    }
  }, [layer.styleUrl, legendImage]);

  return (
    <div className={`flex flex-col gap-2 ${center ? "items-center text-center" : ""}`}>
      <label className="text-sm font-medium text-base-content/70 m-0">{layer.tocDisplayName}</label>
      {legendImage && legendImage !== "" && (
        <img
          className={`max-w-[250px] w-fit h-auto border border-base-300 rounded ${center ? "mx-auto" : ""}`}
          src={legendImage}
          alt={layer.tocDisplayName}
          onError={(e) => {
            // Hide broken images
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      )}
      {layer.legendObj && <LegendObject legendObj={layer.legendObj} />}
    </div>
  );
};

interface LegendObjectProps {
  legendObj: LegendObject;
}

const LegendObject: React.FC<LegendObjectProps> = ({ legendObj }) => {
  if (!legendObj || !legendObj.legend) {
    return null;
  }

  return (
    <ul className="list-none p-0 m-0 flex flex-col gap-[5px]">
      {legendObj.legend.map((item: LegendEntry, index: number) => (
        <LegendRow key={`legend-row-${index}`} legend={item} />
      ))}
    </ul>
  );
};

interface LegendRowProps {
  legend: {
    height: number;
    width: number;
    contentType: string;
    imageData: string;
    label: string;
  };
}

const LegendRow: React.FC<LegendRowProps> = ({ legend }) => {
  return (
    <li className="flex items-center gap-2 select-none" style={{ height: `${legend.height}px` }} title={legend.label}>
      <img style={{ height: `${legend.height}px`, width: `${legend.width}px` }} src={`data:${legend.contentType};base64,${legend.imageData}`} alt="style" />
      <div
        className="flex items-center text-[13px] text-base-content"
        style={{
          height: `${legend.height}px`,
          width: `${220 - legend.width}px`,
        }}
      >
        {legend.label.trim()}
      </div>
    </li>
  );
};

interface GroupItemProps {
  group: {
    label: string;
    value: string;
    layers: TOCLayer[];
  };
  center?: boolean;
}

const GroupItem: React.FC<GroupItemProps> = ({ group, center = false }) => {
  return (
    <div className="break-inside-avoid">
      <fieldset className="border-2 border-base-300 rounded-lg p-[15px] m-0 bg-base-100">
        <legend className="text-base font-semibold text-base-content px-2.5">{group.label.replace(/_/g, " ")}</legend>
        <div className="flex flex-col gap-[15px]">
          {group.layers.map((layer) => (
            <LegendItem key={layer.id} layer={layer} center={center} />
          ))}
        </div>
      </fieldset>
    </div>
  );
};

interface MultiSelectDropdownProps {
  options: { label: string; value: string }[];
  selectedOptions: { label: string; value: string }[];
  onChange: (selected: { label: string; value: string }[]) => void;
}

const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({ options, selectedOptions, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const toggleOption = (option: { label: string; value: string }) => {
    const isSelected = selectedOptions.some((o) => o.value === option.value);
    if (isSelected) {
      onChange(selectedOptions.filter((o) => o.value !== option.value));
    } else {
      onChange([...selectedOptions, option]);
    }
  };

  const removeOption = (option: { label: string; value: string }) => {
    onChange(selectedOptions.filter((o) => o.value !== option.value));
  };

  const clearAll = () => {
    onChange([]);
  };

  return (
    <div className="relative flex-1 max-w-[600px]" ref={dropdownRef}>
      <div
        className="min-h-[38px] bg-base-100 border border-base-300 rounded cursor-pointer flex items-center px-2 py-1 transition-colors hover:border-base-content/40"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex-1 flex flex-wrap gap-1">
          {selectedOptions.length === 0 ? (
            <span className="text-base-content/70 p-1">Select groups...</span>
          ) : (
            <div className="flex flex-wrap gap-1">
              {selectedOptions.map((option) => (
                <span key={option.value} className="inline-flex items-center gap-1 bg-primary/10 border border-primary/30 rounded-sm px-1.5 py-0.5 text-[13px] text-base-content">
                  {option.label}
                  <button
                    className="bg-transparent border-none cursor-pointer p-0 flex items-center text-base-content/60 hover:text-base-content transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeOption(option);
                    }}
                  >
                    <FaTimes size={10} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 pl-2">
          {selectedOptions.length > 0 && (
            <button
              className="bg-transparent border-none cursor-pointer p-1 flex items-center text-base-content/70 hover:text-base-content transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                clearAll();
              }}
              title="Clear all"
            >
              <FaTimes size={14} />
            </button>
          )}
          <FaChevronDown size={14} className={`text-base-content/60 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
        </div>
      </div>
      {isOpen && (
        <div className="absolute top-full left-0 right-0 bg-base-100 border border-base-300 rounded mt-1 max-h-[300px] overflow-y-auto z-[1000] shadow-[0_2px_8px_rgba(0,0,0,0.15)]">
          {options.map((option) => {
            const isSelected = selectedOptions.some((o) => o.value === option.value);
            return (
              <div
                key={option.value}
                className={`px-3 py-2 cursor-pointer flex items-center gap-2 transition-colors hover:bg-base-200 ${isSelected ? "bg-primary/10" : ""}`}
                onClick={() => toggleOption(option)}
              >
                <input type="checkbox" checked={isSelected} onChange={() => {}} className="checkbox checkbox-xs checkbox-primary" />
                {option.label}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

interface LegendProps {
  justifyCenter?: boolean;
}

export default function Legend({ justifyCenter = false }: LegendProps) {
  const { allGroups, selectedGroups, setSelectedGroups } = useLegendStore();
  const [centerJustify, setCenterJustify] = useState(justifyCenter);

  const handleGroupChange = (selected: { label: string; value: string }[]) => {
    // Convert the simple objects back to full group objects
    const fullGroups = selected.map((s) => allGroups.find((g) => g.value === s.value)).filter((g) => g !== undefined);
    setSelectedGroups(fullGroups);
  };

  const handlePrintClick = () => {
    window.print();
  };

  return (
    <div className="p-5 bg-white min-h-full">
      <div className="flex justify-between items-center mb-2.5 pb-2.5 border-b-2 border-[#ddd]">
        <div className="text-2xl font-bold text-[#333]">Legend</div>
        <div className="flex items-center gap-[15px]">
          <button className="btn btn-sm btn-ghost no-print" onClick={handlePrintClick} title="Print Legend">
            <FaPrint size={16} />
          </button>
          <div className="flex gap-2.5 no-print">
            <button className={`btn btn-sm btn-ghost ${!centerJustify ? "btn-primary text-white" : ""}`} onClick={() => setCenterJustify(false)} title="Left Justify">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 3h18v2H3V3zm0 4h12v2H3V7zm0 4h18v2H3v-2zm0 4h12v2H3v-2zm0 4h18v2H3v-2z" />
              </svg>
            </button>
            <button className={`btn btn-sm btn-ghost ${centerJustify ? "btn-primary text-white" : ""}`} onClick={() => setCenterJustify(true)} title="Center Justify">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 3h18v2H3V3zm3 4h12v2H6V7zm-3 4h18v2H3v-2zm3 4h12v2H6v-2zm-3 4h18v2H3v-2z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="mb-5 flex items-start gap-2.5 no-print">
        <label className="font-semibold text-[#333] pt-2 min-w-[60px]">Groups:</label>
        <MultiSelectDropdown
          options={allGroups.map((g) => ({ label: g.label, value: g.value }))}
          selectedOptions={selectedGroups.map((g) => ({ label: g.label, value: g.value }))}
          onChange={handleGroupChange}
        />
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-5 mb-10 sm:grid-cols-[repeat(auto-fill,minmax(400px,1fr))]">
        {selectedGroups.map((group) => (
          <GroupItem key={group.value} group={group} center={centerJustify} />
        ))}
      </div>

      <div className="mt-10 pt-5 border-t border-[#ddd] text-xs text-[#666] overflow-hidden no-print flex justify-between">
        <div>Layer info page generated using interactive mapping.</div>
        <div>{"Generated on: " + new Date().toLocaleString()}</div>
      </div>
    </div>
  );
}
