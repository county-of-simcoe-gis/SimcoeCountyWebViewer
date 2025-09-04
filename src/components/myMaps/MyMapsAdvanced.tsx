"use client";

import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import Switch from "react-switch";
import Image from "next/image";
import copy from "copy-to-clipboard";
import { useMyMapsStore } from "@/stores/myMapsStore";

import "./MyMapsAdvanced.css";

interface MyMapsAdvancedProps {
  onEditFeatures: (editOn: boolean, option?: string) => void;
  onDeleteAllClick: () => void;
  onMyMapsImport: (result: { id: string; json: string }) => void;
  onAdditionalToolsAction: (action: string) => void;
  hasItems: boolean;
}

const MyMapsAdvanced: React.FC<MyMapsAdvancedProps> = ({ onEditFeatures, onDeleteAllClick, onMyMapsImport, onAdditionalToolsAction, hasItems }) => {
  const { isEditing, editMode, importText, setImportText, saveToApi, importFromApi } = useMyMapsStore();

  const [open, setOpen] = useState(false);
  const [editOn, setEditOn] = useState(isEditing);
  const [editOption, setEditOption] = useState(editMode || "vertices");
  const [inputText, setInputText] = useState(importText);
  const [showAdditionalMenu, setShowAdditionalMenu] = useState(false);
  const [showExportSubmenu, setShowExportSubmenu] = useState(false);
  const [submenuPosition, setSubmenuPosition] = useState({ x: 0, y: 0 });
  const [additionalMenuPosition, setAdditionalMenuPosition] = useState({ x: 0, y: 0 });
  const additionalMenuRef = useRef<HTMLDivElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const exportHoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const inputId = "sc-mymaps-advanced-import-input sc-editable";

  useEffect(() => {
    setEditOn(isEditing);
  }, [isEditing]);

  useEffect(() => {
    if (editMode) {
      setEditOption(editMode);
    }
  }, [editMode]);

  useEffect(() => {
    setInputText(importText);
  }, [importText]);

  // Cleanup hover timeout on unmount
  useEffect(() => {
    return () => {
      if (exportHoverTimeoutRef.current) {
        clearTimeout(exportHoverTimeoutRef.current);
        exportHoverTimeoutRef.current = null;
      }
    };
  }, []);

  // Click outside handler for additional menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const isClickOutsideAdditionalMenuButton = additionalMenuRef.current && !additionalMenuRef.current.contains(target);
      const isClickOutsideAdditionalMenu = !document.querySelector(".sc-mymaps-additional-menu-portal")?.contains(target);
      const isClickOutsideSubmenu = !document.querySelector(".sc-mymaps-export-submenu-portal")?.contains(target);

      if (isClickOutsideAdditionalMenuButton && isClickOutsideAdditionalMenu && isClickOutsideSubmenu) {
        setShowAdditionalMenu(false);
        setShowExportSubmenu(false);
      }
    };

    if (showAdditionalMenu || showExportSubmenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showAdditionalMenu, showExportSubmenu]);

  const onSwitchChange = (editOn: boolean) => {
    setEditOn(editOn);
    onEditFeatures(editOn, editOption);
  };

  const onEditOption = (evt: React.ChangeEvent<HTMLInputElement>) => {
    const value = evt.currentTarget.value as "vertices" | "translate";
    setEditOption(value);
    onEditFeatures(editOn, value);
  };

  const onImport = async () => {
    if (!inputText.trim()) {
      alert("Please enter a MyMaps ID to import.");
      return;
    }

    try {
      const result = await importFromApi(inputText.trim());

      if (result.success) {
        // Show success message with green highlight
        alert(result.message || "Success! MyMaps imported.");

        // Trigger the parent callback if provided for compatibility
        if (onMyMapsImport && result.data) {
          onMyMapsImport(result.data);
        }

        // Clear the input after successful import
        setInputText("");
        setImportText("");
      } else {
        alert(result.message || "Import failed. Please try again.");
      }
    } catch (error) {
      console.error("Error importing MyMaps:", error);
      alert("An error occurred while importing. Please try again.");
    }
  };

  const onShare = () => {
    if (!inputText.trim()) {
      alert("Please save your MyMaps first to get an ID to share.");
      return;
    }

    // Create shareable URL like old app
    const currentUrl = `${window.location.href.split("?")[0]}?MY_MAPS_ID=${inputText}`;

    try {
      // Copy to clipboard
      copy(currentUrl);
      alert("MyMaps link has been saved to clipboard.");
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
      alert("Failed to copy link to clipboard. Please copy this URL manually: " + currentUrl);
    }
  };

  const onSave = async () => {
    if (!hasItems) {
      alert("Cannot save MyMaps! No Items Found!");
      return;
    }

    try {
      const result = await saveToApi();

      if (result.success && result.id) {
        // Show success message
        alert(result.message || "MyMaps have been saved! Your ID has been saved to clipboard.");

        // Update the input with the saved ID and add glow effect
        setInputText(result.id);
        setImportText(result.id);
        glowContainer(inputId);
      } else {
        alert(result.message || "Save failed. Please try again.");
      }
    } catch (error) {
      console.error("Error saving MyMaps:", error);
      alert("An error occurred while saving. Please try again.");
    }
  };

  const onInputChange = (evt: React.ChangeEvent<HTMLInputElement>) => {
    const value = evt.target.value;
    setInputText(value);
    setImportText(value);
  };

  const handleFocus = () => {
    // Disable keyboard events for map when input is focused
    console.log("MyMaps: Input focused, disabling keyboard events");
  };

  const handleBlur = () => {
    // Re-enable keyboard events for map when input loses focus
    console.log("MyMaps: Input blurred, enabling keyboard events");
  };

  const glowContainer = (elementId: string) => {
    // Add glow effect to input similar to old app
    const inputElement = document.querySelector(`.${elementId}`) as HTMLInputElement;
    if (inputElement) {
      inputElement.style.boxShadow = "0 0 10px #00ff00";
      inputElement.style.border = "2px solid #00ff00";

      setTimeout(() => {
        inputElement.style.boxShadow = "";
        inputElement.style.border = "";
      }, 2000);
    }
  };

  return (
    <div id="sc-mymaps-advanced">
      {/* Content that appears above when open */}
      <div className={`sc-mymaps-advanced-content ${open ? "open" : "closed"}`}>
        <div className="sc-mymaps-advanced-import-container">
          <label className="sc-mymaps-advanced-main-label">Import/Save</label>
          <div>
            <input className={inputId} id={inputId} type="text" placeholder="Enter ID here" onChange={onInputChange} onFocus={handleFocus} onBlur={handleBlur} value={inputText} />
            <br />
            <div className="sc-mymaps-import-buttons">
              <button className="sc-button sc-mymaps-advanced-import-button" onClick={onImport}>
                Import
              </button>
              <button className="sc-button sc-mymaps-advanced-import-button" onClick={onSave} disabled={!hasItems}>
                Save
              </button>
              <button className="sc-button sc-mymaps-advanced-import-button" onClick={onShare}>
                Share
              </button>
            </div>
          </div>
        </div>

        <div className="sc-mymaps-advanced-edit-container">
          <label className={editOn ? "sc-mymaps-advanced-switch-label on" : "sc-mymaps-advanced-switch-label"}>
            Edit Features
            <Switch
              className="sc-mymaps-advanced-switch"
              onChange={onSwitchChange}
              checked={editOn}
              height={20}
              width={48}
              checkedIcon={false}
              uncheckedIcon={false}
              onColor="#007bff"
              offColor="#ccc"
            />
          </label>

          <label style={{ marginRight: "15px", marginLeft: "15px" }}>
            <input className="sc-mymaps-advanced-edit-radio" type="radio" name="editOptions" value="vertices" checked={editOption === "vertices"} onChange={onEditOption} />
            Vertices
          </label>
          <label>
            <input className="sc-mymaps-advanced-edit-radio" type="radio" name="editOptions" value="translate" checked={editOption === "translate"} onChange={onEditOption} />
            Move
          </label>
        </div>

        {/* Footer buttons - matching old MyMapsFooter structure */}
        <div className="sc-mymaps-footer-buttons">
          <button
            className="sc-button sc-mymaps-footer-button delete"
            onClick={() => {
              if (window.confirm("Delete all items? This action cannot be undone.")) {
                onDeleteAllClick();
              }
            }}
            disabled={!hasItems}
          >
            Delete All
          </button>
          <div className="sc-mymaps-additional-tools-container" ref={additionalMenuRef}>
            <button
              id="sc-mymaps-footer-button-tools"
              className="sc-button sc-mymaps-footer-button tools"
              onClick={(e) => {
                if (!showAdditionalMenu) {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setAdditionalMenuPosition({
                    x: rect.left,
                    y: rect.top - 10, // Position above the button
                  });
                }
                setShowAdditionalMenu(!showAdditionalMenu);
              }}
            >
              Additional Tools
            </button>
          </div>
        </div>
      </div>

      {/* Trigger button always at bottom */}
      <button className={`sc-mymaps-advanced-trigger ${open ? "open" : ""}`} onClick={() => setOpen(!open)}>
        <Image src="/images/myMaps/settings.png" alt="Settings" width={16} height={16} className="sc-mymaps-trigger-icon" />
        Advanced Options
        <span className={`sc-mymaps-trigger-arrow ${open ? "open" : ""}`}>▼</span>
      </button>

      {/* Export submenu rendered as portal */}
      {showExportSubmenu &&
        typeof window !== "undefined" &&
        createPortal(
          <div
            className="sc-mymaps-export-submenu-portal"
            style={{
              position: "fixed",
              left: submenuPosition.x,
              top: submenuPosition.y,
              zIndex: 99999,
              background: "white",
              border: "1px solid #ccc",
              borderRadius: "4px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              minWidth: "120px",
            }}
            onMouseEnter={() => {
              // Clear any pending close timeout when entering submenu
              if (exportHoverTimeoutRef.current) {
                clearTimeout(exportHoverTimeoutRef.current);
                exportHoverTimeoutRef.current = null;
              }
              setShowExportSubmenu(true);
            }}
            onMouseLeave={() => {
              // Close submenu immediately when leaving submenu area
              if (exportHoverTimeoutRef.current) {
                clearTimeout(exportHoverTimeoutRef.current);
                exportHoverTimeoutRef.current = null;
              }
              setShowExportSubmenu(false);
            }}
          >
            <div
              className="sc-mymaps-submenu-item"
              onClick={() => {
                onAdditionalToolsAction("export-kml");
                setShowAdditionalMenu(false);
                setShowExportSubmenu(false);
              }}
            >
              <Image src="/images/json.png" alt="KML" width={16} height={16} className="sc-mymaps-menu-icon" />
              KML
            </div>
            <div
              className="sc-mymaps-submenu-item"
              onClick={() => {
                onAdditionalToolsAction("export-esri-json");
                setShowAdditionalMenu(false);
                setShowExportSubmenu(false);
              }}
            >
              <Image src="/images/json.png" alt="ESRI JSON" width={16} height={16} className="sc-mymaps-menu-icon" />
              ESRIJson
            </div>
            <div
              className="sc-mymaps-submenu-item"
              onClick={() => {
                onAdditionalToolsAction("export-geo-json");
                setShowAdditionalMenu(false);
                setShowExportSubmenu(false);
              }}
            >
              <Image src="/images/json.png" alt="GeoJSON" width={16} height={16} className="sc-mymaps-menu-icon" />
              GeoJSON
            </div>
          </div>,
          document.body
        )}

      {/* Additional Tools menu rendered as portal */}
      {showAdditionalMenu &&
        typeof window !== "undefined" &&
        createPortal(
          <div
            className="sc-mymaps-additional-menu-portal"
            style={{
              position: "fixed",
              left: additionalMenuPosition.x,
              top: additionalMenuPosition.y,
              zIndex: 99999,
              background: "white",
              border: "1px solid #ccc",
              borderRadius: "4px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              minWidth: "180px",
              transform: "translateY(-100%)", // Position above the button
            }}
          >
            <div
              className="sc-mymaps-menu-item"
              onClick={() => {
                onAdditionalToolsAction("show-all");
                setShowAdditionalMenu(false);
              }}
            >
              <Image src="/images/myMaps/checkbox_on.png" alt="Show All" width={16} height={16} className="sc-mymaps-menu-icon" />
              Show All
            </div>
            <div
              className="sc-mymaps-menu-item"
              onClick={() => {
                onAdditionalToolsAction("hide-all");
                setShowAdditionalMenu(false);
              }}
            >
              <Image src="/images/myMaps/checkbox_off.png" alt="Hide All" width={16} height={16} className="sc-mymaps-menu-icon" />
              Hide All
            </div>
            <div className="sc-mymaps-menu-separator"></div>
            <div
              className="sc-mymaps-menu-item"
              onClick={() => {
                onAdditionalToolsAction("delete-selected");
                setShowAdditionalMenu(false);
              }}
            >
              <Image src="/images/myMaps/eraser.png" alt="Delete Selected" width={16} height={16} className="sc-mymaps-menu-icon" />
              Delete Selected
            </div>
            <div
              className="sc-mymaps-menu-item"
              onClick={() => {
                onAdditionalToolsAction("delete-unselected");
                setShowAdditionalMenu(false);
              }}
            >
              <Image src="/images/myMaps/eraser.png" alt="Delete Unselected" width={16} height={16} className="sc-mymaps-menu-icon" />
              Delete Unselected
            </div>
            <div
              className="sc-mymaps-menu-item"
              onClick={() => {
                onAdditionalToolsAction("merge-polygons");
                setShowAdditionalMenu(false);
              }}
            >
              <Image src="/images/polygon.png" alt="Merge Polygons" width={16} height={16} className="sc-mymaps-menu-icon" />
              Merge Polygons
            </div>
            <div className="sc-mymaps-menu-item-with-submenu">
              <div
                ref={exportMenuRef}
                className="sc-mymaps-menu-item"
                onMouseEnter={(e) => {
                  // Clear any pending close timeout
                  if (exportHoverTimeoutRef.current) {
                    clearTimeout(exportHoverTimeoutRef.current);
                    exportHoverTimeoutRef.current = null;
                  }

                  const rect = e.currentTarget.getBoundingClientRect();
                  setSubmenuPosition({
                    x: rect.right + 4,
                    y: rect.top,
                  });
                  setShowExportSubmenu(true);
                }}
                onMouseLeave={() => {
                  // Set timeout to close submenu after delay
                  exportHoverTimeoutRef.current = setTimeout(() => {
                    setShowExportSubmenu(false);
                    exportHoverTimeoutRef.current = null;
                  }, 300);
                }}
              >
                <Image src="/images/json.png" alt="Export" width={16} height={16} className="sc-mymaps-menu-icon" />
                Export to ...
                <span className="sc-mymaps-menu-arrow">▶</span>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default MyMapsAdvanced;
