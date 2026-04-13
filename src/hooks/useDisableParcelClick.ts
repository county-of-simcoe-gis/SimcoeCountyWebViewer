import { useEffect } from "react";
import { useMapStore } from "@/stores/mapStore";

/**
 * Disables the parcel (property) click handler while the calling component is mounted.
 * Use in theme or tool components whose config has `disableParcelClick: true`.
 */
export function useDisableParcelClick(shouldDisable: boolean | undefined) {
  const setDisableParcelClick = useMapStore((s) => s.setDisableParcelClick);

  useEffect(() => {
    if (!shouldDisable) return;
    setDisableParcelClick(true);
    return () => setDisableParcelClick(false);
  }, [shouldDisable, setDisableParcelClick]);
}
