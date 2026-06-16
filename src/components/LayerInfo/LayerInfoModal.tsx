"use client";

import { useLayerInfoStore } from "@/stores/layerInfoStore";
import LayerInfo from "@/components/LayerInfo/LayerInfo";
import FloatingWindow from "@/components/common/FloatingWindow";

export default function LayerInfoModal() {
  const isOpen = useLayerInfoStore((s) => s.isOpen);
  const layerURL = useLayerInfoStore((s) => s.layerURL);
  const showDownload = useLayerInfoStore((s) => s.showDownload);
  const secured = useLayerInfoStore((s) => s.secured);
  const closeLayerInfo = useLayerInfoStore((s) => s.closeLayerInfo);

  const title = showDownload ? "Download Layer" : "Layer Info";

  return (
    <FloatingWindow isOpen={isOpen && !!layerURL} title={title} onClose={closeLayerInfo}>
      {layerURL && <LayerInfo layerURL={layerURL} showDownload={showDownload} secure={secured} hideNewWindow={true} />}
    </FloatingWindow>
  );
}
