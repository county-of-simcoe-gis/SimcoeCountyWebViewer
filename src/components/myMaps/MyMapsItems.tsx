"use client";

import React from "react";
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
  const { items } = useMyMapsStore();

  return (
    <div data-testid="mymaps-item-container" className="flex flex-col bg-white rounded mb-2 overflow-hidden h-full">
      {/* Header */}
      <div data-testid="mymaps-items-header" className="flex items-center gap-1.5 py-2 px-3 bg-[#f8f9fa] border-b border-[#dee2e6] text-xs font-semibold text-[#495057]">
        <Image src="/images/myMaps.png" alt="My Maps Icon" width={16} height={16} />
        <span className="flex-1">My Items</span>
        {isEditing && <label className="text-[#007bff] text-[11px] font-medium bg-[#e3f2fd] py-[2px] px-1.5 rounded-[3px] border border-[#bbdefb]">Editing Mode On</label>}
      </div>

      {/* No data message */}
      {items.length === 0 && (
        <div className="p-5 text-center text-[#6c757d] text-xs leading-[1.4] italic before:content-['\1F4DD'] before:block before:text-2xl before:mb-2">
          There are currently no items to display. Please use the drawing tools above to create your own personal map item.
        </div>
      )}

      {/* Items list */}
      <div data-testid="mymaps-items-list" className="flex-auto min-h-0 overflow-y-auto overflow-x-hidden border-b border-[#eee]">
        {items.map((item) => (
          <div key={item.id} data-testid="mymaps-item-wrapper" className="animate-[fadeIn_0.3s_ease-out]">
            <MyMapsItem item={item} onLabelChange={onLabelChange} onDelete={onItemDelete} onShowOptions={onShowItemOptions} onHoverStart={onHoverStart} onHoverEnd={onHoverEnd} isEditing={isEditing} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default MyMapsItems;
