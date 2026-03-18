"use client";

import PanelComponent from "@/components/PanelComponent";
import { FaPalette } from "react-icons/fa";
import Five11Content from "./Five11Content";

interface Five11Props {
  name?: string;
  helpLink?: string;
  hideHeader?: boolean;
  onClose: () => void;
  onSidebarVisibility?: () => void;
}

export default function Five11({ name = "511 Live Feeds", helpLink, hideHeader = false, onClose, onSidebarVisibility }: Five11Props) {
  return (
    <PanelComponent icon={<FaPalette size={20} className="text-neutral/70" />} name={name} helpLink={helpLink} hideHeader={hideHeader} onClose={onClose} onSidebarVisibility={onSidebarVisibility}>
      <Five11Content />
    </PanelComponent>
  );
}
