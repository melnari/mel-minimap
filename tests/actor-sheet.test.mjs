import test from "node:test";
import assert from "node:assert/strict";
import {
  canViewActorSheet,
  isActorSheetShortcut,
  openActorSheetForToken
} from "../scripts/actor-sheet.mjs";

const constants = {
  DOCUMENT_OWNERSHIP_LEVELS: { OBSERVER: 2 }
};

test("Ctrl+A is recognized only as a non-repeated control shortcut", () => {
  assert.equal(isActorSheetShortcut({ ctrlKey: true, code: "KeyA", repeat: false }), true);
  assert.equal(isActorSheetShortcut({ ctrlKey: false, code: "KeyA", repeat: false }), false);
  assert.equal(isActorSheetShortcut({ ctrlKey: true, code: "KeyB", repeat: false }), false);
  assert.equal(isActorSheetShortcut({ ctrlKey: true, code: "KeyA", repeat: true }), false);
});

test("Observer permission allows the hovered Actor Sheet to open", () => {
  const user = { id: "player" };
  const calls = [];
  const actor = {
    sheet: { render: options => calls.push(options) },
    testUserPermission: (requestedUser, permission) => {
      assert.equal(requestedUser, user);
      assert.equal(permission, constants.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER);
      return true;
    }
  };

  assert.equal(canViewActorSheet(actor, user, constants), true);
  assert.equal(openActorSheetForToken({ actor }, user, constants), true);
  assert.deepEqual(calls, [{ force: true }]);
});

test("Users without Observer permission cannot open the Actor Sheet", () => {
  let rendered = false;
  const actor = {
    sheet: { render: () => { rendered = true; } },
    testUserPermission: () => false
  };

  assert.equal(canViewActorSheet(actor, { id: "player" }, constants), false);
  assert.equal(openActorSheetForToken({ actor }, { id: "player" }, constants), false);
  assert.equal(rendered, false);
});

test("Missing Actors or Sheets are handled without throwing", () => {
  const user = { id: "player" };
  assert.equal(openActorSheetForToken(null, user, constants), false);
  assert.equal(openActorSheetForToken({ actor: null }, user, constants), false);
  assert.equal(openActorSheetForToken({ actor: { testUserPermission: () => true } }, user, constants), false);
});
