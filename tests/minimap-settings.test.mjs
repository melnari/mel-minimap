import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  DEFAULT_DYNAMIC_SIZE,
  DYNAMIC_SIZE_SETTING,
  isDynamicSizeEnabled
} from "../scripts/minimap-settings.mjs";

test("dynamic minimap size is disabled by default", () => {
  assert.equal(DEFAULT_DYNAMIC_SIZE, false);
  assert.equal(DYNAMIC_SIZE_SETTING, "dynamicSize");
  assert.equal(isDynamicSizeEnabled({ get: () => false }), false);
});

test("dynamic minimap size follows the client setting", () => {
  assert.equal(isDynamicSizeEnabled({ get: () => true }), true);
  assert.equal(isDynamicSizeEnabled({ get: () => 0 }), false);
});

test("missing or failing settings safely use the fixed-size default", () => {
  assert.equal(isDynamicSizeEnabled(), false);
  assert.equal(isDynamicSizeEnabled({ get: () => { throw new Error("unavailable"); } }), false);
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
