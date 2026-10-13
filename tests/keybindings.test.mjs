import test from "node:test";
import assert from "node:assert/strict";
import { KEYBINDING_DEFAULTS, getKeybindingDefaults } from "../scripts/keybindings.mjs";

test("all Mel-Minimap keybindings keep the current default assignments", () => {
  assert.deepEqual(KEYBINDING_DEFAULTS, {
    toggleMinimap: [{ key: "KeyM", modifiers: ["Control"] }],
    actorSheet: [{ key: "KeyS", modifiers: ["Control"] }],
    viewArtwork: [
      { key: "Digit1", modifiers: ["Control"] },
      { key: "Numpad1", modifiers: ["Control"] }
    ],
    shareArtwork: [
      { key: "Digit2", modifiers: ["Control"] },
      { key: "Numpad2", modifiers: ["Control"] }
    ]
  });
});

test("keybinding defaults are returned as independent editable definitions", () => {
  const first = getKeybindingDefaults("viewArtwork");
  const second = getKeybindingDefaults("viewArtwork");

  assert.deepEqual(first, [
    { key: "Digit1", modifiers: ["Control"] },
    { key: "Numpad1", modifiers: ["Control"] }
  ]);
  assert.notEqual(first, second);
  assert.notEqual(first[0].modifiers, second[0].modifiers);
  assert.deepEqual(getKeybindingDefaults("unknown"), []);
});
