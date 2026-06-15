"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import Switch from "react-switch";
import Image from "next/image";
import { FaCog, FaChevronDown, FaChevronUp } from "react-icons/fa";
import { useSession } from "next-auth/react";
import { useConfig } from "@/hooks/useConfig";
import { useMyMapsStore } from "@/stores/myMapsStore";
import type { UserMyMapsEntry, MyMapsHistoryEntry } from "@/stores/myMapsStore";
import { useToast } from "@/hooks/useToast";
import { copyToClipboard } from "@/utils/myMapsHelpers";
import "./MyMapsAdvanced.css";

interface MyMapsAdvancedProps {
  onEditFeatures: (editOn: boolean, option?: string) => void;
  onDeleteAllClick: () => void;
  onMyMapsImport: (result: { id: string; json: string }) => void;
  onAdditionalToolsAction: (action: string) => void;
  hasItems: boolean;
}

const MyMapsAdvanced: React.FC<MyMapsAdvancedProps> = ({ onEditFeatures, onDeleteAllClick, onMyMapsImport, onAdditionalToolsAction, hasItems }) => {
  const { isEditing, editMode, importText, setImportText, saveToApi, importFromApi, fetchUserMaps, userMaps, getHistory } = useMyMapsStore();
  const { data: session } = useSession();
  const { config } = useConfig();
  const toast = useToast();
  const isAuthenticated = !!session?.user?.email;

  const [open, setOpen] = useState(false);
  const [editOn, setEditOn] = useState(isEditing);
  const [editOption, setEditOption] = useState(editMode || "vertices");
  const [inputText, setInputText] = useState(importText);
  const [myMapsName, setMyMapsName] = useState("");
  const [selectedDropdownValue, setSelectedDropdownValue] = useState("manual");
  const [showAdditionalMenu, setShowAdditionalMenu] = useState(false);
  const [showExportSubmenu, setShowExportSubmenu] = useState(false);
  const [submenuPosition, setSubmenuPosition] = useState({ x: 0, y: 0 });
  const [additionalMenuPosition, setAdditionalMenuPosition] = useState({ x: 0, y: 0 });
  const additionalMenuRef = useRef<HTMLDivElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const exportHoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const inputId = "mymaps-advanced-import-input";

  // Fetch user maps when authenticated and panel opens
  useEffect(() => {
    if (open && isAuthenticated) {
      fetchUserMaps();
    }
  }, [open, isAuthenticated, fetchUserMaps]);

  // Build dropdown options
  const dropdownOptions = useCallback((): { value: string; label: string }[] => {
    const options: { value: string; label: string }[] = [{ value: "manual", label: "Enter ID Manually..." }];

    if (isAuthenticated) {
      userMaps.forEach((m: UserMyMapsEntry) => {
        const dateStr = m.date_created ? new Date(m.date_created).toLocaleDateString() : "unknown date";
        options.push({
          value: m.id,
          label: `${m.name || "(unnamed)"} - ${dateStr}`,
        });
      });
    } else {
      const history = getHistory();
      history.forEach((entry: MyMapsHistoryEntry) => {
        const dateStr = new Date(entry.date).toLocaleDateString();
        options.push({
          value: entry.id,
          label: `${entry.id} - ${dateStr}`,
        });
      });
    }

    return options;
  }, [isAuthenticated, userMaps, getHistory]);

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
    // Determine the ID to import — either from the dropdown selection or manual input
    const idToImport = selectedDropdownValue !== "manual" ? selectedDropdownValue : inputText.trim();

    if (!idToImport) {
      toast.warning("Please enter a MyMaps ID to import.");
      return;
    }

    try {
      const result = await importFromApi(idToImport);

      if (result.success) {
        toast.success(result.message || "Success! MyMaps imported.");

        if (onMyMapsImport && result.data && typeof result.data === "object" && "id" in result.data && "json" in result.data) {
          onMyMapsImport(result.data as { id: string; json: string });
        }

        // If authenticated and a named map was selected, pre-fill the name input
        if (isAuthenticated && selectedDropdownValue !== "manual") {
          const selectedMap = userMaps.find((m) => m.id === selectedDropdownValue);
          if (selectedMap?.name) {
            setMyMapsName(selectedMap.name);
          }
        }

        setInputText("");
        setImportText("");
      } else {
        toast.error(result.message || "Import failed. Please try again.");
      }
    } catch (error) {
      console.error("Error importing MyMaps:", error);
      toast.error("An error occurred while importing. Please try again.");
    }
  };

  const onShare = async () => {
    const shareId = selectedDropdownValue !== "manual" ? selectedDropdownValue : inputText.trim();
    if (!shareId) {
      toast.warning("Please save your MyMaps first to get an ID to share.");
      return;
    }

    const currentUrl = `${window.location.href.split("?")[0]}?MY_MAPS_ID=${shareId}`;

    const copied = await copyToClipboard(currentUrl);

    if (copied) {
      toast.success("MyMaps link has been saved to clipboard.");
    } else {
      console.error("Failed to copy to clipboard.");
      alert("Failed to copy link to clipboard. Please copy this URL manually: " + currentUrl);
    }
  };

  const onSharePublic = async () => {
    const shareId = selectedDropdownValue !== "manual" ? selectedDropdownValue : inputText.trim();
    if (!shareId) {
      toast.warning("Please save your MyMaps first to get an ID to share.");
      return;
    }

    const publicUrl = config?.publicUrl;
    if (!publicUrl) {
      toast.warning("Public URL is not configured.");
      return;
    }

    const url = `${publicUrl}?MY_MAPS_ID=${shareId}`;

    const copied = await copyToClipboard(url);

    if (copied) {
      toast.success("Public MyMaps link has been saved to clipboard.");
    } else {
      console.error("Failed to copy to clipboard.");
      alert("Failed to copy link to clipboard. Please copy this URL manually: " + url);
    }
  };

  const onSave = async () => {
    // Validate name for authenticated saves
    if (isAuthenticated && !myMapsName.trim()) {
      toast.warning("Please enter a name for your MyMaps.");
      return;
    }

    try {
      const result = await saveToApi(isAuthenticated ? { myMapsName: myMapsName.trim(), isAuthenticated: true } : undefined);

      if (result.success && result.id) {
        toast.success(result.message || "MyMaps have been saved! Your ID has been saved to clipboard.");

        setInputText(result.id);
        setImportText(result.id);
        glowContainer(inputId);

        // Refresh the user's maps list after authenticated save
        if (isAuthenticated) {
          fetchUserMaps();
        }
      } else {
        toast.error(result.message || "Save failed. Please try again.");
      }
    } catch (error) {
      console.error("Error saving MyMaps:", error);
      toast.error("An error occurred while saving. Please try again.");
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
    <div className="relative h-[30px] m-[5px] bg-base-300 border border-base-300 cursor-pointer select-none leading-[30px] pl-[31px] mt-auto shrink-0">
      {/* Content that appears above when open */}
      <div
        data-testid="mymaps-advanced-content"
        data-state={open ? "open" : "closed"}
        className={`absolute bottom-full left-0 right-0 border border-solid border-base-300 border-b-0 rounded-t-[5px] bg-base-100 p-[5px] z-[10001] transition-all duration-[400ms] ease-in-out ${open ? "max-h-[500px] opacity-100 translate-y-0 p-[5px]" : "max-h-0 opacity-0 translate-y-[10px] !pt-0 !pb-0 overflow-hidden"}`}
      >
        <div className="border-b border-base-300 pb-2.5">
          <label className="block font-bold">Import/Save</label>
          <div>
            {/* Dropdown for selecting existing MyMaps or entering manually */}
            <select
              className="select select-bordered select-sm w-full mb-1 text-primary"
              value={selectedDropdownValue}
              onChange={(e) => {
                const value = e.target.value;
                setSelectedDropdownValue(value);
                if (value !== "manual") {
                  setInputText(value);
                  setImportText(value);
                  // Pre-fill name for authenticated users
                  if (isAuthenticated) {
                    const selectedMap = userMaps.find((m) => m.id === value);
                    if (selectedMap?.name) {
                      setMyMapsName(selectedMap.name);
                    }
                  }
                } else {
                  setInputText("");
                  setImportText("");
                  setMyMapsName("");
                }
              }}
            >
              {dropdownOptions().map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            {/* Manual ID input — visible only when "Enter ID Manually" is selected */}
            {selectedDropdownValue === "manual" && (
              <input
                className="mymaps-text-input bg-[url('/images/edit.png')] bg-no-repeat bg-[position:right_4px_center] bg-[length:16px_16px] bg-base-100 text-primary focus:outline-none focus:border-primary focus:shadow-[0_0_0_2px_rgba(0,123,255,0.4)] mb-1"
                id={inputId}
                type="text"
                placeholder="Enter ID here"
                onChange={onInputChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                value={inputText}
              />
            )}

            {/* Name input — visible only for authenticated users */}
            {isAuthenticated && (
              <input
                className="input input-bordered input-sm w-full mb-1"
                type="text"
                placeholder="MyMaps name (required to save)"
                maxLength={100}
                value={myMapsName}
                onChange={(e) => setMyMapsName(e.target.value)}
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
            )}

            <div className="flex gap-[3px] flex-wrap">
              <button className="mymaps-action-btn" onClick={onImport} title="Load map items from an existing MyMaps ID">
                Import
              </button>
              <button
                className="mymaps-action-btn disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={onSave}
                disabled={!hasItems}
                title={hasItems ? "Save your current map items and get a shareable ID" : "No items to save - draw something on the map first"}
              >
                Save
              </button>
              <button className="mymaps-action-btn" onClick={onShare} title="Create a shareable link with your saved MyMaps ID">
                Share
              </button>
              {session && (
                <button className="mymaps-action-btn" onClick={onSharePublic} title="Create a shareable link for the public viewer">
                  Share Public
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="pt-[5px]">
          <label className={`inline-table w-[175px] text-xs cursor-pointer ${editOn ? "font-bold" : ""} text-base-content`}>
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

          <label style={{ marginRight: "15px", marginLeft: "15px" }} className="!inline text-xs text-base-content cursor-pointer select-none hover:text-primary">
            <input className="relative top-[2px] mr-1 cursor-pointer" type="radio" name="editOptions" value="vertices" checked={editOption === "vertices"} onChange={onEditOption} />
            Vertices
          </label>
          <label className="!inline text-xs text-base-content cursor-pointer select-none hover:text-primary">
            <input className="relative top-[2px] mr-1 cursor-pointer" type="radio" name="editOptions" value="translate" checked={editOption === "translate"} onChange={onEditOption} />
            Move
          </label>
        </div>

        <div className="flex gap-1 pt-2.5 border-t border-base-300 mt-2.5 text-center">
          <button
            className="mymaps-action-btn flex-1 w-full bg-[url('/images/myMaps/eraser.png')] bg-no-repeat bg-[position:8px_center] bg-[length:16px_16px] text-left disabled:opacity-50 disabled:cursor-not-allowed"
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
              className="mymaps-action-btn flex-1 w-full bg-[url('/images/myMaps/toolbox.png')] bg-no-repeat bg-[position:8px_center] bg-[length:16px_16px] pl-7 text-left"
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
        className="block w-full -ml-[31px] font-bold pt-px border-none bg-transparent cursor-pointer text-inherit h-[30px] leading-[30px] transition-colors hover:bg-black/5"
        onClick={() => setOpen(!open)}
      >
        <span className="flex h-full items-center justify-between px-[5px] pl-7">
          <span className="flex items-center gap-[6px]">
            <FaCog size={12} className="shrink-0 text-base-content/70" aria-hidden="true" />
            <span>Advanced Options</span>
          </span>
          {open ? <FaChevronUp size={10} className="shrink-0 text-base-content/60" aria-hidden="true" /> : <FaChevronDown size={10} className="shrink-0 text-base-content/60" aria-hidden="true" />}
        </span>
      </button>

      {/* Export submenu rendered as portal */}
      {showExportSubmenu &&
        typeof window !== "undefined" &&
        createPortal(
          <div
            className="mymaps-export-submenu-portal fixed bg-base-100 border border-base-300 rounded shadow-[0_4px_12px_rgba(0,0,0,0.15)] min-w-[120px] z-[99999]"
            style={{
              left: submenuPosition.x,
              top: submenuPosition.y,
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
              className="flex items-center py-2 px-3 text-xs text-base-content cursor-pointer transition-colors border-b border-base-200 last:border-b-0 hover:bg-base-200 hover:text-primary active:bg-base-300"
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
              className="flex items-center py-2 px-3 text-xs text-base-content cursor-pointer transition-colors border-b border-base-200 last:border-b-0 hover:bg-base-200 hover:text-primary active:bg-base-300"
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
              className="flex items-center py-2 px-3 text-xs text-base-content cursor-pointer transition-colors border-b border-base-200 last:border-b-0 hover:bg-base-200 hover:text-primary active:bg-base-300"
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
            className="mymaps-additional-menu-portal fixed bg-base-100 border border-base-300 rounded shadow-[0_4px_12px_rgba(0,0,0,0.15)] min-w-[180px] z-[99999] -translate-y-full"
            style={{
              left: additionalMenuPosition.x,
              top: additionalMenuPosition.y,
            }}
          >
            <div
              className="flex items-center py-2 px-3 text-xs text-base-content cursor-pointer transition-colors border-b border-base-200 last:border-b-0 hover:bg-base-200 hover:text-primary active:bg-base-300 relative"
              onClick={() => {
                onAdditionalToolsAction("show-all");
                setShowAdditionalMenu(false);
              }}
            >
              <Image src="/images/myMaps/checkbox_on.png" alt="Show All" width={16} height={16} className="mr-2 shrink-0" />
              Show All
            </div>
            <div
              className="flex items-center py-2 px-3 text-xs text-base-content cursor-pointer transition-colors border-b border-base-200 last:border-b-0 hover:bg-base-200 hover:text-primary active:bg-base-300 relative"
              onClick={() => {
                onAdditionalToolsAction("hide-all");
                setShowAdditionalMenu(false);
              }}
            >
              <Image src="/images/myMaps/checkbox_off.png" alt="Hide All" width={16} height={16} className="mr-2 shrink-0" />
              Hide All
            </div>
            <div className="h-px bg-base-300 my-1"></div>
            <div
              className="flex items-center py-2 px-3 text-xs text-base-content cursor-pointer transition-colors border-b border-base-200 last:border-b-0 hover:bg-base-200 hover:text-primary active:bg-base-300 relative"
              onClick={() => {
                onAdditionalToolsAction("delete-selected");
                setShowAdditionalMenu(false);
              }}
            >
              <Image src="/images/myMaps/eraser.png" alt="Delete Selected" width={16} height={16} className="mr-2 shrink-0" />
              Delete Selected
            </div>
            <div
              className="flex items-center py-2 px-3 text-xs text-base-content cursor-pointer transition-colors border-b border-base-200 last:border-b-0 hover:bg-base-200 hover:text-primary active:bg-base-300 relative"
              onClick={() => {
                onAdditionalToolsAction("delete-unselected");
                setShowAdditionalMenu(false);
              }}
            >
              <Image src="/images/myMaps/eraser.png" alt="Delete Unselected" width={16} height={16} className="mr-2 shrink-0" />
              Delete Unselected
            </div>
            <div
              className="flex items-center py-2 px-3 text-xs text-base-content cursor-pointer transition-colors border-b border-base-200 last:border-b-0 hover:bg-base-200 hover:text-primary active:bg-base-300 relative"
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
                className="flex items-center py-2 px-3 text-xs text-base-content cursor-pointer transition-colors border-b border-base-200 last:border-b-0 hover:bg-base-200 hover:text-primary active:bg-base-300 relative"
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
                <span className="ml-auto text-[10px] text-base-content/60">{"\u25B6"}</span>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
};

export default MyMapsAdvanced;
