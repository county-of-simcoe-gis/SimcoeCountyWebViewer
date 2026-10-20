"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { useMyMapsStore } from "@/stores/myMapsStore";
import MyMapsItem from "@/components/myMaps/MyMapsItem";
import type { MyMapsItem as MyMapsItemType } from "@/types/myMaps";

interface MyMapsItemsProps {
  onLabelChange: (id: string, label: string) => void;
  onItemDelete: (id: string) => void;
  onShowItemOptions?: (item: MyMapsItemType, event?: React.MouseEvent) => void;
  onHoverStart?: (item: MyMapsItemType) => void;
  onHoverEnd?: (item: MyMapsItemType) => void;
  isEditing?: boolean;
}

const MyMapsItems: React.FC<MyMapsItemsProps> = ({ onLabelChange, onItemDelete, onShowItemOptions, onHoverStart, onHoverEnd, isEditing = false }) => {
  const { items, moveItem } = useMyMapsStore();
  // Row is draggable only while its grip is pressed so label inputs keep normal text selection.
  const [armedIndex, setArmedIndex] = useState<number | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  // A grip press with no drag ends on mouseup; once a drag starts, dragend resets state instead.
  useEffect(() => {
    if (armedIndex === null) return;
    const disarm = () => setArmedIndex(null);
    window.addEventListener("mouseup", disarm);
    return () => window.removeEventListener("mouseup", disarm);
  }, [armedIndex]);

  const resetDrag = () => {
    setArmedIndex(null);
    setDraggedIndex(null);
    setDropIndex(null);
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", items[index].id);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    if (draggedIndex === null) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dropIndex !== index) setDropIndex(index);
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) {
      moveItem(draggedIndex, index);
    }
    resetDrag();
  };

  return (
    <div data-testid="mymaps-item-container" className="flex flex-col bg-base-100 rounded mb-2 overflow-hidden h-full">
      {/* Header */}
      <div data-testid="mymaps-items-header" className="flex items-center gap-1.5 py-2 px-3 bg-base-200 border-b border-base-300 text-xs font-semibold text-base-content">
        <Image src="/images/myMaps.png" alt="My Maps Icon" width={16} height={16} />
        <span className="flex-1">My Items</span>
        {isEditing && <label className="text-primary text-[11px] font-medium bg-primary/10 py-[2px] px-1.5 rounded-[3px] border border-primary/30">Editing Mode On</label>}
      </div>

      {/* No data message */}
      {items.length === 0 && (
        <div className="p-5 text-center text-base-content/60 text-xs leading-[1.4] italic before:content-['\1F4DD'] before:block before:text-2xl before:mb-2">
          There are currently no items to display. Please use the drawing tools above to create your own personal map item.
        </div>
      )}

      {/* Items list */}
      <div data-testid="mymaps-items-list" className="flex-auto min-h-0 overflow-y-auto overflow-x-hidden border-b border-base-300">
        {items.map((item, index) => (
          <div
            key={item.id}
            data-testid="mymaps-item-wrapper"
            draggable={armedIndex === index}
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={resetDrag}
            className={`animate-[fadeIn_0.3s_ease-out] ${dropIndex === index && draggedIndex !== index ? "border-t-2 border-t-primary" : ""} ${draggedIndex === index ? "opacity-50" : ""}`}
          >
            <MyMapsItem
              item={item}
              onLabelChange={onLabelChange}
              onDelete={onItemDelete}
              onShowOptions={onShowItemOptions}
              onHoverStart={onHoverStart}
              onHoverEnd={onHoverEnd}
              isEditing={isEditing}
              onGripMouseDown={() => setArmedIndex(index)}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default MyMapsItems;
