import { type TOCLayer } from "@/stores/tocStore";
import { useDisclaimerModalStore } from "@/stores/disclaimerModalStore";

/**
 * Session-scoped set of layer names whose disclaimer/terms the user has
 * already accepted. Matches the legacy app's in-memory `window.acceptedDisclaimers`.
 */
const acceptedDisclaimers = new Set<string>();

/**
 * Track layers whose disclaimer modal is currently open so the same layer
 * cannot spawn multiple modals if the user clicks rapidly.
 */
const pendingDisclaimers = new Set<string>();

/**
 * Check whether a layer's disclaimer/terms must be accepted before the layer
 * can be turned on. If accepted (or no disclaimer is required), returns true
 * and the caller should proceed with the visibility change. If a modal is
 * shown, returns false and the caller should wait for the callback.
 *
 * @param layer - The TOC layer being toggled on.
 * @param returnToFunction - Called when the user accepts the disclaimer.
 * @returns true when the toggle may proceed immediately, false when blocked.
 */
export function acceptDisclaimer(layer: TOCLayer, returnToFunction: () => void): boolean {
  if (!layer.disclaimer) return true;

  const { title, url, warning } = layer.disclaimer;

  // When the layer is already visible, the user is turning it off. Clear any
  // previous acceptance so they are prompted again next time they turn it on.
  if (layer.visible) {
    acceptedDisclaimers.delete(layer.name);
    pendingDisclaimers.delete(layer.name);
    return true;
  }

  if (acceptedDisclaimers.has(layer.name)) {
    return true;
  }

  // Prevent duplicate modals for the same layer.
  if (pendingDisclaimers.has(layer.name)) {
    return false;
  }
  pendingDisclaimers.add(layer.name);

  const openModal = useDisclaimerModalStore.getState().open;

  const handleAccept = () => {
    pendingDisclaimers.delete(layer.name);
    acceptedDisclaimers.add(layer.name);
    returnToFunction();
  };

  const handleDecline = () => {
    pendingDisclaimers.delete(layer.name);
  };

  if (warning) {
    openModal(
      title || "Warning",
      warning,
      url,
      {
        color: "warning",
        acceptLabel: "OK",
        showAccept: true,
        showDecline: false,
      },
      { onAccept: handleAccept, onDecline: handleDecline },
    );
    return false;
  }

  if (url) {
    openModal(
      title || "Terms and Conditions",
      `The layer (${layer.displayName}) you are about to view contains data which is subject to a licence agreement.\nBefore turning on this layer, you must review the agreement and click 'Accept' or 'Decline'.`,
      url,
      {
        color: "neutral",
        acceptLabel: "Accept",
        declineLabel: "Decline",
        showAccept: true,
        showDecline: true,
      },
      { onAccept: handleAccept, onDecline: handleDecline },
    );
    return false;
  }

  openModal(
    title || "Terms and Conditions",
    `The layer (${layer.displayName}) you are about to view contains data which is subject to a disclaimer.\nBefore turning on this layer, you must review and click 'Accept' or 'Decline'.`,
    "",
    {
      color: "neutral",
      acceptLabel: "Accept",
      declineLabel: "Decline",
      showAccept: true,
      showDecline: true,
    },
    { onAccept: handleAccept, onDecline: handleDecline },
  );
  return false;
}

/**
 * Clear all accepted and pending disclaimer state. Useful when resetting the
 * TOC to defaults or when the current user changes.
 */
export function clearDisclaimerAcceptances(): void {
  acceptedDisclaimers.clear();
  pendingDisclaimers.clear();
}

/**
 * Exposed for testing only.
 */
export function __resetAcceptedDisclaimersForTests(): void {
  acceptedDisclaimers.clear();
  pendingDisclaimers.clear();
}
