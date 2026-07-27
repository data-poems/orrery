/**
 * Reveal the idle-fading HUD before moving focus into it. The deferred focus lets
 * React commit the visible state before the control becomes the active element.
 */
export function restoreHudControlFocus(
  controlId: string,
  wakeHud: () => void,
): void {
  wakeHud();
  window.setTimeout(() => document.getElementById(controlId)?.focus(), 0);
}
