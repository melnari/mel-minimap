export const DYNAMIC_SIZE_SETTING = "dynamicSize";
export const DEFAULT_DYNAMIC_SIZE = false;

/** Read the client setting without making UI initialization fragile. */
export function isDynamicSizeEnabled(settings = globalThis.game?.settings) {
  try {
    return Boolean(settings?.get?.("mel-minimap", DYNAMIC_SIZE_SETTING));
  } catch {
    return DEFAULT_DYNAMIC_SIZE;
  }
}
