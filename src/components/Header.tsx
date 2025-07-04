"use client";

import "./Header.css";
import { useState, useEffect } from "react";
import { useSidebarStore } from "@/stores/sidebarStore";
import { useEventStore } from "@/stores/eventStore";
import { useMapStore } from "@/stores/mapStore";
import { useAppStore } from "@/stores/appStore";

interface SearchType {
  label: string;
  value: string;
}

export default function Header() {
  const { toggleSidebar } = useSidebarStore();
  const { emitHeaderLoaded } = useEventStore();
  const { addLoadedItem } = useMapStore();
  const { setHeaderLoading } = useAppStore();
  const [searchValue, setSearchValue] = useState("");
  const [searchTypes, setSearchTypes] = useState<SearchType[]>([]);
  const [selectedType, setSelectedType] = useState<SearchType>({ label: "All", value: "All" });

  useEffect(() => {
    // Initialize search types (simulating the API call from original)
    const types = [
      { label: "All", value: "All" },
      { label: "Address", value: "Address" },
      { label: "Parcel", value: "Parcel" },
      { label: "Open Street Map", value: "Open Street Map" },
      { label: "Map Layer", value: "Map Layer" },
      { label: "Tool", value: "Tool" },
      { label: "Theme", value: "Theme" },
    ];
    setSearchTypes(types);
    setSelectedType(types[0]);

    // Mark header as loaded (replaces window.emitter.emit("headerLoaded"))
    emitHeaderLoaded();
    addLoadedItem("header");
    setHeaderLoading(false);
  }, [emitHeaderLoaded, addLoadedItem, setHeaderLoading]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchValue(e.target.value);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement search functionality
    console.log("Search:", searchValue, "Type:", selectedType.value);
  };

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newType = searchTypes.find((type) => type.value === e.target.value) || searchTypes[0];
    setSelectedType(newType);
  };

  const onFeedbackClick = () => {
    // TODO: Implement feedback functionality
    console.log("Feedback clicked");
  };

  const handleBurgerClick = () => {
    toggleSidebar();
  };

  return (
    <div
      className="w-full border-b border-gray-300 flex items-center h-[52px] max-h-[52px] p-0 z-auto absolute left-0 top-0 right-0 bottom-auto"
      style={{
        background: "linear-gradient(to bottom, rgba(255, 255, 255, 1) 0%, rgba(229, 229, 229, 1) 100%)",
      }}
    >
      {/* Burger Button */}
      <div
        className="cursor-pointer ml-3 w-[65px] h-11 flex items-center justify-center pt-1 outline-none bg-transparent"
        onClick={handleBurgerClick}
        role="button"
        tabIndex={2}
        onKeyDown={(e) => e.key === "Enter" && handleBurgerClick()}
        aria-label="Toggle sidebar"
      >
        <img src="/images/burger-button.png" alt="Menu" className="max-w-full max-h-full w-auto h-auto" />
      </div>

      {/* Logo */}
      <div className="flex items-end pl-2 w-[111px]">
        <img src="/images/logo.png" alt="Simcoe County" className="max-w-full max-h-full w-auto h-auto" />
      </div>

      {/* Search Container - takes remaining space */}
      <div className="flex-1 pt-1.5 pr-3 relative">
        {/* Types Dropdown - positioned absolutely over search input */}
        <div
          className="absolute top-[7px] ml-[1px] z-[1000000] max-w-[600px]"
          style={{
            width: `${50 + selectedType.label.length * 9}px`,
          }}
        >
          <select
            value={selectedType.value}
            onChange={handleTypeChange}
            className="h-[38px] w-full border-none shadow-none bg-transparent text-sm pr-8 pl-2 outline-none appearance-none cursor-pointer"
            style={{
              background: "transparent",
              backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6,9 12,15 18,9'%3e%3c/polyline%3e%3c/svg%3e")`,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 8px center",
              backgroundSize: "16px",
            }}
          >
            {searchTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSearchSubmit} className="relative">
          <input
            type="text"
            value={searchValue}
            onChange={handleSearchChange}
            placeholder="Search..."
            className="h-[41px] w-full text-[22px] border border-gray-300 box-border outline-none focus:border-[#f9c280] pr-12"
            style={{
              fontFamily: "Verdana, Arial, sans-serif",
              paddingLeft: `${50 + selectedType.label.length * 9 + 5}px`,
              paddingRight: "40px",
            }}
            autoComplete="new-password"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
          />
          <button
            type="submit"
            className="absolute right-4 top-1/2 transform -translate-y-1/2 cursor-pointer p-1"
            style={{
              zIndex: 10000000,
            }}
            aria-label="Search"
          >
            <img src="/images/magnify.png" alt="Search" className="w-auto h-auto" />
          </button>
        </form>
      </div>

      {/* Feedback Button */}
      <div
        className="w-[60px] text-center flex flex-col items-center justify-center cursor-pointer px-1 text-xs text-[#5b5b5b] h-[52px] hover:bg-black hover:bg-opacity-5"
        onClick={onFeedbackClick}
        title="Feedback"
      >
        <img src="/images/feedback.png" alt="Feedback" className="mt-1 mb-1" />
        <span>Feedback</span>
      </div>
    </div>
  );
}
