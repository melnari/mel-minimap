export const SETTINGS = Object.freeze({
  AUTO_OPEN: "autoOpen",
  SHOW_BACKGROUND: "showBackground",
  SHOW_MAP_NOTES: "showMapNotes",
  DYNAMIC_SIZE: "dynamicSize"
});

export const DEFAULT_SETTINGS = Object.freeze({
  [SETTINGS.AUTO_OPEN]: true,
  [SETTINGS.SHOW_BACKGROUND]: true,
  [SETTINGS.SHOW_MAP_NOTES]: false,
  [SETTINGS.DYNAMIC_SIZE]: true
});

export const DYNAMIC_SIZE_SETTING = SETTINGS.DYNAMIC_SIZE;
export const DEFAULT_DYNAMIC_SIZE = DEFAULT_SETTINGS[DYNAMIC_SIZE_SETTING];
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
