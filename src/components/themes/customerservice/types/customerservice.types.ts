export interface CustomerServiceThemeProps {
  name?: string;
  helpLink?: string;
  hideHeader?: boolean;
  onClose: () => void;
  onSidebarVisibility?: () => void;
}

export interface TicketInfo {
  X: string;
  Y: string;
  Status: string;
  CreatedDateTime: string;
  Location: string;
  Category: string;
  SubCategory: string;
  CreatedBy: string;
  IncidentNumber: string;
  Hyperlink: string;
}

export interface TicketFeature {
  ticketInfo: TicketInfo;
  getGeometry: () => unknown;
  getProperties: () => Record<string, unknown>;
  setStyle: (style: unknown) => void;
}

export interface LayerTogglerProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  layer: any;
  displayName: string;
  legendImage?: string;
  visible?: boolean;
}

export interface WMSLayerConfig {
  serverUrl: string;
  layerName: string;
  displayName: string;
  zIndex: number;
}
