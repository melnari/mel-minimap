export const SETTINGS = Object.freeze({
  AUTO_OPEN: "autoOpen",
  SHOW_BACKGROUND: "showBackground",
  SHOW_MAP_NOTES: "showMapNotes",
  DYNAMIC_SIZE: "dynamicSize",
  PERFORMANCE_OPTIMIZATION: "performanceOptimization",
  EXPLORED_AREA_VISIBILITY: "exploredAreaVisibility"
});

export const DEFAULT_SETTINGS = Object.freeze({
  [SETTINGS.AUTO_OPEN]: true,
  [SETTINGS.SHOW_BACKGROUND]: true,
  [SETTINGS.SHOW_MAP_NOTES]: false,
  [SETTINGS.DYNAMIC_SIZE]: true,
  [SETTINGS.PERFORMANCE_OPTIMIZATION]: false,
  [SETTINGS.EXPLORED_AREA_VISIBILITY]: 60
});

export const DYNAMIC_SIZE_SETTING = SETTINGS.DYNAMIC_SIZE;
export const DEFAULT_DYNAMIC_SIZE = DEFAULT_SETTINGS[DYNAMIC_SIZE_SETTING];
export const PERFORMANCE_OPTIMIZATION_SETTING = SETTINGS.PERFORMANCE_OPTIMIZATION;
export const DEFAULT_PERFORMANCE_OPTIMIZATION = DEFAULT_SETTINGS[PERFORMANCE_OPTIMIZATION_SETTING];
export const EXPLORED_AREA_VISIBILITY_SETTING = SETTINGS.EXPLORED_AREA_VISIBILITY;
export const DEFAULT_EXPLORED_AREA_VISIBILITY = DEFAULT_SETTINGS[EXPLORED_AREA_VISIBILITY_SETTING];
export const FOG_DEBOUNCE_OPTIMIZED_MS = 500;
export const FOG_DEBOUNCE_RESPONSIVE_MS = 250;
export const SETTINGS_MIGRATION_SETTING = "settingsMigration";
export const SETTINGS_MIGRATION_VERSION = 1;

/**
 * Read a value saved by the previous client-scoped registration.
 *
 * The migration deliberately reads the browser storage directly because the
 * same setting keys are now registered as world-scoped settings. Existing
 * client values remain available in localStorage until the migration finishes.
 */
export function readLegacyClientSetting(storage, key, fallback) {
  try {
    const raw = storage?.getItem?.(`mel-minimap.${key}`);
    if (raw === null || raw === undefined) return fallback;
    const value = JSON.parse(raw);
    return typeof value === typeof fallback ? value : fallback;
  } catch {
    return fallback;
  }
}

/** Read the shared world setting without making UI initialization fragile. */
export function isDynamicSizeEnabled(settings = globalThis.game?.settings) {
  try {
    const value = settings?.get?.("mel-minimap", SETTINGS.DYNAMIC_SIZE);
    return value === undefined ? DEFAULT_DYNAMIC_SIZE : Boolean(value);
  } catch {
    return DEFAULT_DYNAMIC_SIZE;
  }
}

/** Read the shared performance setting without making UI initialization fragile. */
export function isPerformanceOptimizationEnabled(settings = globalThis.game?.settings) {
  try {
    const value = settings?.get?.("mel-minimap", SETTINGS.PERFORMANCE_OPTIMIZATION);
    return value === undefined ? DEFAULT_PERFORMANCE_OPTIMIZATION : Boolean(value);
  } catch {
    return DEFAULT_PERFORMANCE_OPTIMIZATION;
  }
}

/** Select the debounce delay used for expensive Fog of War rebuilds. */
export function getFogDebounceDelay(optimized) {
  return optimized ? FOG_DEBOUNCE_OPTIMIZED_MS : FOG_DEBOUNCE_RESPONSIVE_MS;
}

/** Clamp the explored-area visibility to the integer range exposed in settings. */
export function normalizeExploredAreaVisibility(value, fallback = DEFAULT_EXPLORED_AREA_VISIBILITY) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return fallback;
  return Math.min(100, Math.max(0, Math.round(numericValue)));
}

/** Read the shared explored-area visibility setting safely. */
export function getExploredAreaVisibility(settings = globalThis.game?.settings) {
  try {
    const value = settings?.get?.("mel-minimap", EXPLORED_AREA_VISIBILITY_SETTING);
    return normalizeExploredAreaVisibility(value);
  } catch {
    return DEFAULT_EXPLORED_AREA_VISIBILITY;
  }
}

/** Convert visible explored-area percentage to black-mask alpha. */
export function getExploredHiddenMaskAlpha(visibility) {
  return 1 - normalizeExploredAreaVisibility(visibility) / 100;
}
