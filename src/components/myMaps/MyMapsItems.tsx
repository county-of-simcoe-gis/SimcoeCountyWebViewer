"use client";

import React from "react";
import Image from "next/image";
import { useMyMapsStore } from "@/stores/myMapsStore";
import MyMapsItem from "@/components/myMaps/MyMapsItem";
import type { MyMapsItem as MyMapsItemType } from "@/types/myMaps";
import "@/components/myMaps/MyMapsItems.css";

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
    <div className="sc-container sc-mymaps-item-container">
      {/* Header */}
      <div className="sc-mymaps-items-container-header">
        <Image src="/images/myMaps.png" alt="My Maps Icon" width={16} height={16} />
        <span className="sc-mymaps-items-header-text">My Items</span>
        {isEditing && <label className="sc-mymaps-items-container-header-editing">Editing Mode On</label>}
      </div>

      {/* No data message */}
      {items.length === 0 && <div className="sc-mymaps-items-no-data">There are currently no items to display. Please use the drawing tools above to create your own personal map item.</div>}

      {/* Items list */}
      <div className="sc-mymaps-items-container-list">
        {items.map((item) => (
          <div key={item.id} className="sc-mymaps-item-wrapper">
            <MyMapsItem item={item} onLabelChange={onLabelChange} onDelete={onItemDelete} onShowOptions={onShowItemOptions} onHoverStart={onHoverStart} onHoverEnd={onHoverEnd} isEditing={isEditing} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default MyMapsItems;
