import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  DEFAULT_SETTINGS,
  DEFAULT_DYNAMIC_SIZE,
  DEFAULT_EXPLORED_AREA_VISIBILITY,
  DEFAULT_PERFORMANCE_OPTIMIZATION,
  DYNAMIC_SIZE_SETTING,
  EXPLORED_AREA_VISIBILITY_SETTING,
  FOG_DEBOUNCE_OPTIMIZED_MS,
  FOG_DEBOUNCE_RESPONSIVE_MS,
  getFogDebounceDelay,
  isDynamicSizeEnabled,
  isPerformanceOptimizationEnabled,
  getExploredAreaVisibility,
  getExploredHiddenMaskAlpha,
  normalizeExploredAreaVisibility,
  readLegacyClientSetting,
  PERFORMANCE_OPTIMIZATION_SETTING,
  SETTINGS,
  SETTINGS_MIGRATION_SETTING,
  SETTINGS_MIGRATION_VERSION
} from "../scripts/minimap-settings.mjs";

test("dynamic minimap size is enabled by default", () => {
  assert.equal(DEFAULT_DYNAMIC_SIZE, true);
  assert.equal(DYNAMIC_SIZE_SETTING, "dynamicSize");
  assert.equal(DEFAULT_PERFORMANCE_OPTIMIZATION, false);
  assert.equal(PERFORMANCE_OPTIMIZATION_SETTING, "performanceOptimization");
  assert.equal(DEFAULT_EXPLORED_AREA_VISIBILITY, 60);
  assert.equal(EXPLORED_AREA_VISIBILITY_SETTING, "exploredAreaVisibility");
  assert.equal(FOG_DEBOUNCE_OPTIMIZED_MS, 500);
  assert.equal(FOG_DEBOUNCE_RESPONSIVE_MS, 250);
  assert.equal(SETTINGS_MIGRATION_SETTING, "settingsMigration");
  assert.equal(SETTINGS_MIGRATION_VERSION, 1);
  assert.equal(isDynamicSizeEnabled({ get: () => false }), false);
});

test("dynamic minimap size follows the shared world setting", () => {
  assert.equal(isDynamicSizeEnabled({ get: () => true }), true);
  assert.equal(isDynamicSizeEnabled({ get: () => 0 }), false);
});

test("performance optimization selects the configured Fog debounce", () => {
  assert.equal(isPerformanceOptimizationEnabled({get: () => true}), true);
  assert.equal(isPerformanceOptimizationEnabled({get: () => false}), false);
  assert.equal(isPerformanceOptimizationEnabled(), false);
  assert.equal(getFogDebounceDelay(true), 500);
  assert.equal(getFogDebounceDelay(false), 250);
});

test("explored-area visibility is an integer percentage from 0 to 100", () => {
  assert.equal(normalizeExploredAreaVisibility(-1), 0);
  assert.equal(normalizeExploredAreaVisibility(60.4), 60);
  assert.equal(normalizeExploredAreaVisibility(100.6), 100);
  assert.equal(normalizeExploredAreaVisibility("not-a-number"), 60);
  assert.equal(getExploredAreaVisibility({get: () => 42}), 42);
  assert.equal(getExploredAreaVisibility({get: () => 150}), 100);
  assert.equal(getExploredHiddenMaskAlpha(0), 1);
  assert.equal(getExploredHiddenMaskAlpha(60), 0.4);
  assert.equal(getExploredHiddenMaskAlpha(100), 0);
});

test("missing or failing settings safely use the dynamic-size default", () => {
  assert.equal(isDynamicSizeEnabled(), true);
  assert.equal(isDynamicSizeEnabled({ get: () => { throw new Error("unavailable"); } }), true);
});

test("shared setting defaults cover every migrated minimap setting", () => {
  assert.deepEqual(DEFAULT_SETTINGS, {
    [SETTINGS.AUTO_OPEN]: true,
    [SETTINGS.SHOW_BACKGROUND]: true,
    [SETTINGS.SHOW_MAP_NOTES]: false,
    [SETTINGS.DYNAMIC_SIZE]: true,
    [SETTINGS.PERFORMANCE_OPTIMIZATION]: false,
    [SETTINGS.EXPLORED_AREA_VISIBILITY]: 60
  });
});

test("legacy client values are read from the previous local-storage format", () => {
  const storage = new Map([
    ["mel-minimap.autoOpen", "false"],
    ["mel-minimap.showMapNotes", "true"],
    ["mel-minimap.dynamicSize", "not-json"]
  ]);
  const clientStorage = {getItem: key => storage.get(key) ?? null};

  assert.equal(readLegacyClientSetting(clientStorage, "autoOpen", true), false);
  assert.equal(readLegacyClientSetting(clientStorage, "showMapNotes", false), true);
  assert.equal(readLegacyClientSetting(clientStorage, "dynamicSize", false), false);
  assert.equal(readLegacyClientSetting(clientStorage, "showBackground", true), true);
});

test("all supported languages include setting labels and hints", () => {
  for (const language of ["de", "en", "es", "fr", "nl"]) {
    const path = new URL(`../lang/${language}.json`, import.meta.url);
    const translations = JSON.parse(fs.readFileSync(path, "utf8"));
    assert.equal(typeof translations["MEL_MINIMAP.DynamicSize"], "string");
    assert.equal(typeof translations["MEL_MINIMAP.DynamicSizeHint"], "string");
    assert.equal(typeof translations["MEL_MINIMAP.PerformanceOptimization"], "string");
    assert.equal(typeof translations["MEL_MINIMAP.PerformanceOptimizationHint"], "string");
    assert.equal(typeof translations["MEL_MINIMAP.ExploredAreaVisibility"], "string");
    assert.equal(typeof translations["MEL_MINIMAP.ExploredAreaVisibilityHint"], "string");
    assert.ok(translations["MEL_MINIMAP.DynamicSize"].trim());
    assert.ok(translations["MEL_MINIMAP.DynamicSizeHint"].trim());
    assert.ok(translations["MEL_MINIMAP.PerformanceOptimization"].trim());
    assert.ok(translations["MEL_MINIMAP.PerformanceOptimizationHint"].trim());
    assert.ok(translations["MEL_MINIMAP.ExploredAreaVisibility"].trim());
    assert.ok(translations["MEL_MINIMAP.ExploredAreaVisibilityHint"].trim());
  }
});

test("dynamic mode passes the resized application area to the minimap content", () => {
  const css = fs.readFileSync(new URL("../styles/minimap.css", import.meta.url), "utf8");
  assert.match(css, /\.mel-minimap--dynamic \.window-content\s*\{[\s\S]*display:\s*flex/);
  assert.match(css, /\.mel-minimap--dynamic \.mel-minimap__content\s*\{[\s\S]*width:\s*100%/);
  assert.match(css, /\.mel-minimap--dynamic \.mel-minimap__content\s*\{[\s\S]*height:\s*100%/);
});

test("all user-facing minimap settings are registered as world settings", () => {
  const source = fs.readFileSync(new URL("../scripts/minimap.js", import.meta.url), "utf8");
  for (const registrationKey of [
    "SETTINGS.AUTO_OPEN",
    "SETTINGS.SHOW_BACKGROUND",
    "SETTINGS.SHOW_MAP_NOTES",
    "DYNAMIC_SIZE_SETTING",
    "PERFORMANCE_OPTIMIZATION_SETTING",
    "EXPLORED_AREA_VISIBILITY_SETTING"
  ]) {
    const registration = new RegExp(`register\\(MODULE_ID, ${registrationKey}[\\s\\S]*?scope: \\"world\\"`);
    assert.match(source, registration, `missing world registration for ${registrationKey}`);
  }
  assert.match(source, /migrateLegacyClientSettings/);
  assert.match(source, /readLegacyClientSetting/);
  assert.match(source, /requestFogRefresh/);
  assert.match(source, /preserveCache: true/);
  assert.match(source, /FOG_MAX_SAMPLES/);
  assert.match(source, /#isWorldPointExplored/);
  assert.match(source, /#isWorldPointCurrentlyVisible/);
  assert.match(source, /foregroundSource/);
  assert.match(source, /canvas\?\.level/);
  assert.doesNotMatch(source, /scene\.background/);
  assert.match(source, /imageSmoothingEnabled\s*=\s*false/);
  assert.doesNotMatch(source, /#startRefreshLoop/);
});
