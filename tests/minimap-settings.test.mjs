import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  DEFAULT_SETTINGS,
  DEFAULT_DYNAMIC_SIZE,
  DYNAMIC_SIZE_SETTING,
  isDynamicSizeEnabled,
  readLegacyClientSetting,
  SETTINGS,
  SETTINGS_MIGRATION_SETTING,
  SETTINGS_MIGRATION_VERSION
} from "../scripts/minimap-settings.mjs";

test("dynamic minimap size is enabled by default", () => {
  assert.equal(DEFAULT_DYNAMIC_SIZE, true);
  assert.equal(DYNAMIC_SIZE_SETTING, "dynamicSize");
  assert.equal(SETTINGS_MIGRATION_SETTING, "settingsMigration");
  assert.equal(SETTINGS_MIGRATION_VERSION, 1);
  assert.equal(isDynamicSizeEnabled({ get: () => false }), false);
});

test("dynamic minimap size follows the client setting", () => {
  assert.equal(isDynamicSizeEnabled({ get: () => true }), true);
  assert.equal(isDynamicSizeEnabled({ get: () => 0 }), false);
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
    [SETTINGS.DYNAMIC_SIZE]: true
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

test("all supported languages include dynamic-size labels and hints", () => {
  for (const language of ["de", "en", "es", "fr", "nl"]) {
    const path = new URL(`../lang/${language}.json`, import.meta.url);
    const translations = JSON.parse(fs.readFileSync(path, "utf8"));
    assert.equal(typeof translations["MEL_MINIMAP.DynamicSize"], "string");
    assert.equal(typeof translations["MEL_MINIMAP.DynamicSizeHint"], "string");
    assert.ok(translations["MEL_MINIMAP.DynamicSize"].trim());
    assert.ok(translations["MEL_MINIMAP.DynamicSizeHint"].trim());
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
    "DYNAMIC_SIZE_SETTING"
  ]) {
    const registration = new RegExp(`register\\(MODULE_ID, ${registrationKey}[\\s\\S]*?scope: \\"world\\"`);
    assert.match(source, registration, `missing world registration for ${registrationKey}`);
  }
  assert.match(source, /migrateLegacyClientSettings/);
  assert.match(source, /readLegacyClientSetting/);
});
