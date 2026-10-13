/**
 * Default keybindings used by Mel-Minimap.
 *
 * These values are passed to Foundry's editable keybinding configuration, so
 * they remain the defaults while allowing users to change them in Controls.
 */
export const KEYBINDING_DEFAULTS = Object.freeze({
  toggleMinimap: Object.freeze([{ key: "KeyM", modifiers: ["Control"] }]),
  actorSheet: Object.freeze([{ key: "KeyS", modifiers: ["Control"] }]),
  viewArtwork: Object.freeze([
    { key: "Digit1", modifiers: ["Control"] },
    { key: "Numpad1", modifiers: ["Control"] }
  ]),
  shareArtwork: Object.freeze([
    { key: "Digit2", modifiers: ["Control"] },
    { key: "Numpad2", modifiers: ["Control"] }
  ])
});

/** Return fresh Foundry-compatible binding definitions for an action. */
export function getKeybindingDefaults(action) {
  const bindings = KEYBINDING_DEFAULTS[action];
  if (!bindings) return [];
  return bindings.map(binding => ({
    key: binding.key,
    modifiers: [...binding.modifiers]
  }));
}
