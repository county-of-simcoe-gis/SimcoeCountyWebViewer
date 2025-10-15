"use client";

import React, { useState, useEffect, useRef } from "react";
import { useLegendStore } from "@/stores/legendStore";
import { useTOCStore, type TOCLayer } from "@/stores/tocStore";
import { FaChevronDown, FaTimes, FaPrint } from "react-icons/fa";
import "./Legend.css";

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
    <div className={`legend-item-container ${center ? "legend-item-center" : ""}`}>
      <label className="legend-item-title">{layer.tocDisplayName}</label>
      {legendImage && legendImage !== "" && (
        <img
          className={`legend-item-image ${center ? "legend-item-image-center" : ""}`}
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
  legendObj: any;
}

const LegendObject: React.FC<LegendObjectProps> = ({ legendObj }) => {
  if (!legendObj || !legendObj.legend) {
    return null;
  }

  return (
    <ul className="legend-list">
      {legendObj.legend.map((item: any, index: number) => (
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
    <li className="legend-list-item" style={{ height: `${legend.height}px` }} title={legend.label}>
      <img style={{ height: `${legend.height}px`, width: `${legend.width}px` }} src={`data:${legend.contentType};base64,${legend.imageData}`} alt="style" />
      <div
        className="legend-label"
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
    <div className="legend-group-column">
      <fieldset className="legend-fieldset">
        <legend className="legend-group-title">{group.label.replace(/_/g, " ")}</legend>
        <div className="legend-group-content">
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
    <div className="legend-multiselect" ref={dropdownRef}>
      <div className="legend-multiselect-control" onClick={() => setIsOpen(!isOpen)}>
        <div className="legend-multiselect-value">
          {selectedOptions.length === 0 ? (
            <span className="legend-multiselect-placeholder">Select groups...</span>
          ) : (
            <div className="legend-multiselect-tags">
              {selectedOptions.map((option) => (
                <span key={option.value} className="legend-multiselect-tag">
                  {option.label}
                  <button
                    className="legend-multiselect-tag-remove"
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
        <div className="legend-multiselect-indicators">
          {selectedOptions.length > 0 && (
            <button
              className="legend-multiselect-clear"
              onClick={(e) => {
                e.stopPropagation();
                clearAll();
              }}
              title="Clear all"
            >
              <FaTimes size={14} />
            </button>
          )}
          <FaChevronDown size={14} className={`legend-multiselect-arrow ${isOpen ? "open" : ""}`} />
        </div>
      </div>
      {isOpen && (
        <div className="legend-multiselect-menu">
          {options.map((option) => {
            const isSelected = selectedOptions.some((o) => o.value === option.value);
            return (
              <div key={option.value} className={`legend-multiselect-option ${isSelected ? "selected" : ""}`} onClick={() => toggleOption(option)}>
                <input type="checkbox" checked={isSelected} onChange={() => {}} className="legend-multiselect-checkbox" />
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
    <div className="legend-main-container">
      <div className="legend-header">
        <div className="legend-title">Legend</div>
        <div className="legend-header-buttons">
          <button className="legend-print-button no-print" onClick={handlePrintClick} title="Print Legend">
            <FaPrint size={16} />
          </button>
          <div className="legend-justify-buttons no-print">
            <button className={`legend-justify-button ${!centerJustify ? "active" : ""}`} onClick={() => setCenterJustify(false)} title="Left Justify">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 3h18v2H3V3zm0 4h12v2H3V7zm0 4h18v2H3v-2zm0 4h12v2H3v-2zm0 4h18v2H3v-2z" />
              </svg>
            </button>
            <button className={`legend-justify-button ${centerJustify ? "active" : ""}`} onClick={() => setCenterJustify(true)} title="Center Justify">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 3h18v2H3V3zm3 4h12v2H6V7zm-3 4h18v2H3v-2zm3 4h12v2H6v-2zm-3 4h18v2H3v-2z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="legend-group-selector no-print">
        <label className="legend-group-label">Groups:</label>
        <MultiSelectDropdown
          options={allGroups.map((g) => ({ label: g.label, value: g.value }))}
          selectedOptions={selectedGroups.map((g) => ({ label: g.label, value: g.value }))}
          onChange={handleGroupChange}
        />
      </div>

      <div className="legend-masonry-grid">
        {selectedGroups.map((group) => (
          <GroupItem key={group.value} group={group} center={centerJustify} />
        ))}
      </div>

      <div className="legend-footer no-print">
        <div style={{ float: "left" }}>Layer info page generated using interactive mapping.</div>
        <div style={{ float: "right" }}>{"Generated on: " + new Date().toLocaleString()}</div>
      </div>
    </div>
  );
}
