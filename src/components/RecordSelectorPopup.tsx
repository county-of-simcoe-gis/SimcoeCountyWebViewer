"use client";

import { useState, useEffect, ReactNode } from "react";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";

export interface RecordItem {
  id: string;
  [key: string]: unknown;
}

interface RecordSelectorPopupProps<T extends RecordItem> {
  /** Array of records to display in the selector */
  records: T[];
  /** Currently selected record ID */
  selectedRecordId: string | null;
  /** Callback when a record is selected */
  onSelectRecord: (recordId: string) => void;
  /** Function to render the sidebar item for each record */
  renderSidebarItem: (record: T, isSelected: boolean) => ReactNode;
  /** Function to render the content for the selected record */
  renderContent: (selectedRecord: T | null) => ReactNode;
  /** Title for the sidebar header */
  sidebarTitle?: string;
  /** Loading state for records */
  isLoadingRecords?: boolean;
  /** Loading state for content */
  isLoadingContent?: boolean;
  /** Error message for records */
  recordsError?: string | null;
  /** Empty state message */
  emptyMessage?: string;
  /** Optional callback when sidebar is collapsed/expanded */
  onSidebarToggle?: (collapsed: boolean) => void;
  /** Optional function to render icon for collapsed state (defaults to numbered circles) */
  renderCollapsedIcon?: (record: T, index: number, isSelected: boolean) => ReactNode;
  /** Optional callback when hovering over a record (null = mouse left) */
  onHoverRecord?: (record: T | null) => void;
}

export default function RecordSelectorPopup<T extends RecordItem>({
  records,
  selectedRecordId,
  onSelectRecord,
  renderSidebarItem,
  renderContent,
  sidebarTitle = "Records",
  isLoadingRecords = false,
  isLoadingContent = false,
  recordsError = null,
  emptyMessage = "No records found",
  onSidebarToggle,
  renderCollapsedIcon,
  onHoverRecord,
}: RecordSelectorPopupProps<T>) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);

  // Auto-select first record if none selected
  useEffect(() => {
    if (!selectedRecordId && records.length > 0) {
      onSelectRecord(records[0].id);
    }
  }, [records, selectedRecordId, onSelectRecord]);

  const handleToggleSidebar = () => {
    const newCollapsedState = !isSidebarCollapsed;
    setIsSidebarCollapsed(newCollapsedState);
    if (onSidebarToggle) {
      onSidebarToggle(newCollapsedState);
    }
  };

  const selectedRecord = records.find((r) => r.id === selectedRecordId) || null;

  // Default icon renderer for collapsed state
  const defaultCollapsedIconRenderer = (record: T, index: number, isSelected: boolean) => (
    <div className={`text-xs font-semibold leading-none ${isSelected ? "text-white" : "text-base-content/60"}`}>{index + 1}</div>
  );

  const iconRenderer = renderCollapsedIcon || defaultCollapsedIconRenderer;

  const sidebarBaseClasses =
    "shrink-0 flex flex-col border-r-2 border-base-300 bg-base-200 transition-[width,left] duration-300 ease-in-out overflow-hidden absolute h-full top-0 max-[768px]:relative max-[768px]:left-0 max-[768px]:w-full max-[768px]:h-auto max-[768px]:border-r-0 max-[768px]:border-b-2 max-[768px]:top-auto";

  const sidebarSizeClasses = isSidebarCollapsed
    ? "w-[60px] -left-[60px] max-[900px]:w-[56px] max-[900px]:-left-[56px] max-[768px]:flex-row max-[768px]:items-center"
    : "w-[220px] -left-[220px] max-[1200px]:w-[200px] max-[1200px]:-left-[200px] max-[900px]:w-[180px] max-[900px]:-left-[180px] max-[768px]:max-h-[180px]";

  return (
    <div className="flex bg-base-100 rounded shadow-[0_2px_8px_rgba(0,0,0,0.15)] overflow-hidden h-full min-h-[300px] max-[768px]:flex-col max-[768px]:min-h-0">
      {/* Sidebar with record list */}
      <div className={`${sidebarBaseClasses} ${sidebarSizeClasses}`}>
        <div className={`flex items-center border-b border-base-300 bg-base-200 rounded-t ${isSidebarCollapsed ? "justify-center py-1.5 px-1.5 max-[768px]:border-b-0 max-[768px]:border-r max-[768px]:rounded-none max-[768px]:py-2.5" : "justify-between py-1.5 px-2.5"}`}>
          <h4 className={`m-0 text-[13px] font-semibold text-base-content whitespace-nowrap overflow-hidden text-ellipsis flex-1 min-w-0 leading-normal ${isSidebarCollapsed ? "hidden" : ""}`}>
            {sidebarTitle} ({records.length})
          </h4>
          <button
            className="bg-transparent border-none text-sm text-base-content/60 cursor-pointer p-[3px] flex items-center justify-center w-[22px] h-[22px] max-[768px]:w-[28px] max-[768px]:h-[28px] rounded-[3px] transition-all shrink-0 hover:bg-black/5 dark:hover:bg-white/5 hover:text-base-content"
            onClick={handleToggleSidebar}
            aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isSidebarCollapsed ? <FaChevronLeft /> : <FaChevronRight />}
          </button>
        </div>

        {isSidebarCollapsed && records.length > 0 && (
          <div className="flex flex-col gap-2 p-2 overflow-y-auto overflow-x-hidden flex-1 items-center max-[768px]:flex-row max-[768px]:justify-start max-[768px]:p-1.5 max-[768px]:gap-1.5 max-[768px]:overflow-x-auto max-[768px]:overflow-y-hidden">
            {records.map((record, index) => (
              <button
                key={record.id}
                className={`bg-base-100 border-2 border-base-300 rounded-full w-9 h-9 flex items-center justify-center cursor-pointer transition-all p-0 shrink-0 hover:border-primary/50 hover:bg-primary/5 hover:scale-110 ${selectedRecordId === record.id ? "!border-primary !bg-primary shadow-[0_2px_4px_rgba(25,118,210,0.3)] hover:!bg-primary/90" : ""}`}
                onClick={() => onSelectRecord(record.id)}
                onMouseEnter={() => onHoverRecord?.(record)}
                onMouseLeave={() => onHoverRecord?.(null)}
                aria-label={`Select record ${index + 1}`}
                title={`Record ${index + 1}`}
              >
                {iconRenderer(record, index, selectedRecordId === record.id)}
              </button>
            ))}
          </div>
        )}

        {!isSidebarCollapsed && (
          <div className="flex-1 overflow-y-auto overflow-x-hidden p-1.5 min-h-0 h-full">
            {isLoadingRecords && (
              <div className="flex flex-col items-center justify-center py-8 px-4 text-center min-h-[150px]">
                <div className="border-2 border-[#f3f3f3] border-t-[#3498db] rounded-full w-[30px] h-[30px] animate-spin mb-3"></div>
                <p>Loading...</p>
              </div>
            )}

            {recordsError && (
              <div className="flex flex-col items-center justify-center py-8 px-4 text-center min-h-[150px]">
                <p className="text-[#d32f2f] text-sm">{recordsError}</p>
              </div>
            )}

            {!isLoadingRecords && !recordsError && records.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 px-4 text-center min-h-[150px]">
                <p className="text-[#666] text-sm">{emptyMessage}</p>
              </div>
            )}

            {!isLoadingRecords && !recordsError && records.length > 0 && (
              <div className="flex flex-col gap-1">
                {records.map((record) => (
                  <button
                    key={record.id}
                    className={`flex flex-col p-2.5 bg-white border-2 border-[#e0e0e0] rounded cursor-pointer transition-all text-left w-full hover:bg-[#f0f7ff] hover:border-[#90caf9] hover:translate-x-[2px] max-[768px]:p-2 ${selectedRecordId === record.id ? "!bg-[#1976d2] !border-[#1565c0] text-white" : ""}`}
                    onClick={() => onSelectRecord(record.id)}
                    onMouseEnter={() => onHoverRecord?.(record)}
                    onMouseLeave={() => onHoverRecord?.(null)}
                    aria-label={`Select record ${record.id}`}
                    data-testid="record-selector-sidebar-item"
                  >
                    {renderSidebarItem(record, selectedRecordId === record.id)}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden min-w-0 min-h-0 h-full flex flex-col relative">
        {isLoadingContent && (
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center flex-1">
            <div className="border-[3px] border-[#f3f3f3] border-t-[#3498db] rounded-full w-10 h-10 animate-spin mb-4"></div>
            <p>Loading details...</p>
          </div>
        )}

        {!isLoadingContent && selectedRecord && renderContent(selectedRecord)}

        {!isLoadingContent && !selectedRecord && !isLoadingRecords && (
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center flex-1">
            <p className="text-[#666]">Select a record to view details.</p>
          </div>
        )}
      </div>
    </div>
  );
}
