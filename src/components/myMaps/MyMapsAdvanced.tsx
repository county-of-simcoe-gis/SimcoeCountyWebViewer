"use client";

import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import Switch from "react-switch";
import Image from "next/image";
import copy from "copy-to-clipboard";
import { useMyMapsStore } from "@/stores/myMapsStore";

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
  const inputId = "mymaps-advanced-import-input";

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
      const isClickOutsideAdditionalMenu = !document.querySelector(".mymaps-additional-menu-portal")?.contains(target);
      const isClickOutsideSubmenu = !document.querySelector(".mymaps-export-submenu-portal")?.contains(target);

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
        if (onMyMapsImport && result.data && typeof result.data === "object" && "id" in result.data && "json" in result.data) {
          onMyMapsImport(result.data as { id: string; json: string });
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
    const inputElement = document.getElementById(elementId) as HTMLInputElement;
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
    <div className="relative h-[30px] m-[5px] bg-[#e8e8e8] border border-[#ddd] cursor-pointer select-none leading-[30px] pl-[31px] mt-auto shrink-0">
      {/* Content that appears above when open */}
      <div
        className={`absolute bottom-full left-0 right-0 border border-solid border-[#d8dadc] border-b-0 rounded-t-[5px] bg-white p-[5px] z-[10001] transition-all duration-[400ms] ease-in-out ${open ? "max-h-[500px] opacity-100 translate-y-0 p-[5px]" : "max-h-0 opacity-0 translate-y-[10px] !pt-0 !pb-0 overflow-hidden"}`}
      >
        <div className="border-b border-[#d8dadc] pb-2.5">
          <label className="block font-bold">Import/Save</label>
          <div>
            <input
              className="h-[25px] w-[280px] text-[8pt] py-[2px] pr-[25px] pl-1 border-2 border-[#999] rounded-[3px] mb-2 box-border bg-[url('/images/edit.png')] bg-no-repeat bg-[position:right_4px_center] bg-[length:16px_16px] bg-white text-[#367cc5] focus:outline-none focus:border-[#007bff] focus:shadow-[0_0_0_2px_rgba(0,123,255,0.4)]"
              id={inputId}
              type="text"
              placeholder="Enter ID here"
              onChange={onInputChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              value={inputText}
            />
            <br />
            <div className="flex gap-[3px] flex-wrap">
              <button
                className="bg-[#f8f9fa] border border-[#dee2e6] rounded-[3px] py-1 px-[5px] cursor-pointer text-[11px] font-[Arial,sans-serif] text-[#333] flex items-center justify-center gap-[3px] transition-all min-h-[24px] min-w-[60px] hover:bg-[#e9ecef]"
                onClick={onImport}
                title="Load map items from an existing MyMaps ID"
              >
                Import
              </button>
              <button
                className="bg-[#f8f9fa] border border-[#dee2e6] rounded-[3px] py-1 px-[5px] cursor-pointer text-[11px] font-[Arial,sans-serif] text-[#333] flex items-center justify-center gap-[3px] transition-all min-h-[24px] min-w-[60px] hover:bg-[#e9ecef] disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={onSave}
                disabled={!hasItems}
                title={hasItems ? "Save your current map items and get a shareable ID" : "No items to save - draw something on the map first"}
              >
                Save
              </button>
              <button
                className="bg-[#f8f9fa] border border-[#dee2e6] rounded-[3px] py-1 px-[5px] cursor-pointer text-[11px] font-[Arial,sans-serif] text-[#333] flex items-center justify-center gap-[3px] transition-all min-h-[24px] min-w-[60px] hover:bg-[#e9ecef]"
                onClick={onShare}
                title="Create a shareable link with your saved MyMaps ID"
              >
                Share
              </button>
            </div>
          </div>
        </div>

        <div className="pt-[5px]">
          <label className={`inline-table w-[175px] text-xs cursor-pointer ${editOn ? "font-bold" : ""} text-[#495057]`}>
            Edit Features
            <Switch
              className="relative top-[5px] ml-[5px]"
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

          <label style={{ marginRight: "15px", marginLeft: "15px" }} className="!inline text-xs text-[#495057] cursor-pointer select-none hover:text-[#007bff]">
            <input className="relative top-[2px] mr-1 cursor-pointer" type="radio" name="editOptions" value="vertices" checked={editOption === "vertices"} onChange={onEditOption} />
            Vertices
          </label>
          <label className="!inline text-xs text-[#495057] cursor-pointer select-none hover:text-[#007bff]">
            <input className="relative top-[2px] mr-1 cursor-pointer" type="radio" name="editOptions" value="translate" checked={editOption === "translate"} onChange={onEditOption} />
            Move
          </label>
        </div>

        <div className="flex gap-1 pt-2.5 border-t border-[#d8dadc] mt-2.5 text-center">
          <button
            className="bg-[#f8f9fa] border border-[#dee2e6] rounded-[3px] py-1 px-[5px] cursor-pointer text-[11px] font-[Arial,sans-serif] text-[#333] flex items-center justify-center gap-[3px] transition-all min-h-[24px] min-w-[60px] flex-1 w-full bg-[url('/images/myMaps/eraser.png')] bg-no-repeat bg-[position:8px_center] bg-[length:16px_16px] text-left hover:bg-[#e9ecef] disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => {
              if (window.confirm("Delete all items? This action cannot be undone.")) {
                onDeleteAllClick();
              }
            }}
            disabled={!hasItems}
          >
            Delete All
          </button>
          <div className="relative flex-1 flex" ref={additionalMenuRef}>
            <button
              className="bg-[#f8f9fa] border border-[#dee2e6] rounded-[3px] py-1 px-[5px] cursor-pointer text-[11px] font-[Arial,sans-serif] text-[#333] flex items-center justify-center gap-[3px] transition-all min-h-[24px] min-w-[60px] flex-1 w-full bg-[url('/images/myMaps/toolbox.png')] bg-no-repeat bg-[position:8px_center] bg-[length:16px_16px] pl-7 text-left hover:bg-[#e9ecef]"
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
      <button
        className={`block w-full -ml-[31px] pl-7 font-bold pt-px border-none bg-transparent cursor-pointer text-inherit text-inherit h-[30px] leading-[30px] transition-colors bg-[url('/images/myMaps/settings.png'),url('${open ? "/images/up.png" : "/images/down.png"}')] bg-[position:5px_center,calc(100%-25px)_9px] bg-no-repeat hover:bg-black/5`}
        onClick={() => setOpen(!open)}
      >
        Advanced Options
      </button>

      {/* Export submenu rendered as portal */}
      {showExportSubmenu &&
        typeof window !== "undefined" &&
        createPortal(
          <div
            className="mymaps-export-submenu-portal"
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
              className="flex items-center py-2 px-3 text-xs text-[#495057] cursor-pointer transition-colors border-b border-[#f0f0f0] last:border-b-0 hover:bg-[#f8f9fa] hover:text-[#007bff] active:bg-[#e9ecef]"
              onClick={() => {
                onAdditionalToolsAction("export-kml");
                setShowAdditionalMenu(false);
                setShowExportSubmenu(false);
              }}
            >
              <Image src="/images/json.png" alt="KML" width={16} height={16} className="mr-2 shrink-0" />
              KML
            </div>
            <div
              className="flex items-center py-2 px-3 text-xs text-[#495057] cursor-pointer transition-colors border-b border-[#f0f0f0] last:border-b-0 hover:bg-[#f8f9fa] hover:text-[#007bff] active:bg-[#e9ecef]"
              onClick={() => {
                onAdditionalToolsAction("export-esri-json");
                setShowAdditionalMenu(false);
                setShowExportSubmenu(false);
              }}
            >
              <Image src="/images/json.png" alt="ESRI JSON" width={16} height={16} className="mr-2 shrink-0" />
              ESRIJson
            </div>
            <div
              className="flex items-center py-2 px-3 text-xs text-[#495057] cursor-pointer transition-colors border-b border-[#f0f0f0] last:border-b-0 hover:bg-[#f8f9fa] hover:text-[#007bff] active:bg-[#e9ecef]"
              onClick={() => {
                onAdditionalToolsAction("export-geo-json");
                setShowAdditionalMenu(false);
                setShowExportSubmenu(false);
              }}
            >
              <Image src="/images/json.png" alt="GeoJSON" width={16} height={16} className="mr-2 shrink-0" />
              GeoJSON
            </div>
          </div>,
          document.body,
        )}

      {/* Additional Tools menu rendered as portal */}
      {showAdditionalMenu &&
        typeof window !== "undefined" &&
        createPortal(
          <div
            className="mymaps-additional-menu-portal"
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
              className="flex items-center py-2 px-3 text-xs text-[#495057] cursor-pointer transition-colors border-b border-[#f0f0f0] last:border-b-0 hover:bg-[#f8f9fa] hover:text-[#007bff] active:bg-[#e9ecef] relative"
              onClick={() => {
                onAdditionalToolsAction("show-all");
                setShowAdditionalMenu(false);
              }}
            >
              <Image src="/images/myMaps/checkbox_on.png" alt="Show All" width={16} height={16} className="mr-2 shrink-0" />
              Show All
            </div>
            <div
              className="flex items-center py-2 px-3 text-xs text-[#495057] cursor-pointer transition-colors border-b border-[#f0f0f0] last:border-b-0 hover:bg-[#f8f9fa] hover:text-[#007bff] active:bg-[#e9ecef] relative"
              onClick={() => {
                onAdditionalToolsAction("hide-all");
                setShowAdditionalMenu(false);
              }}
            >
              <Image src="/images/myMaps/checkbox_off.png" alt="Hide All" width={16} height={16} className="mr-2 shrink-0" />
              Hide All
            </div>
            <div className="h-px bg-[#dee2e6] my-1"></div>
            <div
              className="flex items-center py-2 px-3 text-xs text-[#495057] cursor-pointer transition-colors border-b border-[#f0f0f0] last:border-b-0 hover:bg-[#f8f9fa] hover:text-[#007bff] active:bg-[#e9ecef] relative"
              onClick={() => {
                onAdditionalToolsAction("delete-selected");
                setShowAdditionalMenu(false);
              }}
            >
              <Image src="/images/myMaps/eraser.png" alt="Delete Selected" width={16} height={16} className="mr-2 shrink-0" />
              Delete Selected
            </div>
            <div
              className="flex items-center py-2 px-3 text-xs text-[#495057] cursor-pointer transition-colors border-b border-[#f0f0f0] last:border-b-0 hover:bg-[#f8f9fa] hover:text-[#007bff] active:bg-[#e9ecef] relative"
              onClick={() => {
                onAdditionalToolsAction("delete-unselected");
                setShowAdditionalMenu(false);
              }}
            >
              <Image src="/images/myMaps/eraser.png" alt="Delete Unselected" width={16} height={16} className="mr-2 shrink-0" />
              Delete Unselected
            </div>
            <div
              className="flex items-center py-2 px-3 text-xs text-[#495057] cursor-pointer transition-colors border-b border-[#f0f0f0] last:border-b-0 hover:bg-[#f8f9fa] hover:text-[#007bff] active:bg-[#e9ecef] relative"
              onClick={() => {
                onAdditionalToolsAction("merge-polygons");
                setShowAdditionalMenu(false);
              }}
            >
              <Image src="/images/polygon.png" alt="Merge Polygons" width={16} height={16} className="mr-2 shrink-0" />
              Merge Polygons
            </div>
            <div>
              <div
                ref={exportMenuRef}
                className="flex items-center py-2 px-3 text-xs text-[#495057] cursor-pointer transition-colors border-b border-[#f0f0f0] last:border-b-0 hover:bg-[#f8f9fa] hover:text-[#007bff] active:bg-[#e9ecef] relative"
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
                <Image src="/images/json.png" alt="Export" width={16} height={16} className="mr-2 shrink-0" />
                Export to ...
                <span className="ml-auto text-[10px] text-[#6c757d]">▶</span>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
};

export default MyMapsAdvanced;
