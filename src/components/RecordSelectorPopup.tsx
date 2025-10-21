"use client";

import { useState, useEffect, ReactNode } from "react";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import "@/components/RecordSelectorPopup.css";

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
    <div className={`sc-record-selector-icon-default ${isSelected ? "sc-record-selector-icon-selected" : ""}`}>{index + 1}</div>
  );

  const iconRenderer = renderCollapsedIcon || defaultCollapsedIconRenderer;

  return (
    <div className="sc-record-selector-popup">
      {/* Sidebar with record list */}
      <div className={`sc-record-selector-sidebar ${isSidebarCollapsed ? "sc-record-selector-sidebar-collapsed" : ""}`}>
        <div className="sc-record-selector-sidebar-header">
          <h4>
            {sidebarTitle} ({records.length})
          </h4>
          <button
            className="sc-record-selector-sidebar-toggle"
            onClick={handleToggleSidebar}
            aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isSidebarCollapsed ? <FaChevronLeft /> : <FaChevronRight />}
          </button>
        </div>

        {isSidebarCollapsed && records.length > 0 && (
          <div className="sc-record-selector-icons">
            {records.map((record, index) => (
              <button
                key={record.id}
                className={`sc-record-selector-icon-button ${selectedRecordId === record.id ? "sc-record-selector-icon-button-selected" : ""}`}
                onClick={() => onSelectRecord(record.id)}
                aria-label={`Select record ${index + 1}`}
                title={`Record ${index + 1}`}
              >
                {iconRenderer(record, index, selectedRecordId === record.id)}
              </button>
            ))}
          </div>
        )}

        {!isSidebarCollapsed && (
          <div className="sc-record-selector-sidebar-content">
            {isLoadingRecords && (
              <div className="sc-record-selector-sidebar-loading">
                <div className="sc-spinner-small"></div>
                <p>Loading...</p>
              </div>
            )}

            {recordsError && (
              <div className="sc-record-selector-sidebar-error">
                <p>{recordsError}</p>
              </div>
            )}

            {!isLoadingRecords && !recordsError && records.length === 0 && (
              <div className="sc-record-selector-sidebar-empty">
                <p>{emptyMessage}</p>
              </div>
            )}

            {!isLoadingRecords && !recordsError && records.length > 0 && (
              <div className="sc-record-selector-sidebar-list">
                {records.map((record) => (
                  <button
                    key={record.id}
                    className={`sc-record-selector-sidebar-item ${selectedRecordId === record.id ? "sc-record-selector-sidebar-item-selected" : ""}`}
                    onClick={() => onSelectRecord(record.id)}
                    aria-label={`Select record ${record.id}`}
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
      <div className="sc-record-selector-content">
        {isLoadingContent && (
          <div className="sc-record-selector-content-loading">
            <div className="sc-spinner"></div>
            <p>Loading details...</p>
          </div>
        )}

        {!isLoadingContent && selectedRecord && renderContent(selectedRecord)}

        {!isLoadingContent && !selectedRecord && !isLoadingRecords && (
          <div className="sc-record-selector-content-empty">
            <p>Select a record to view details.</p>
          </div>
        )}
      </div>
    </div>
  );
}
