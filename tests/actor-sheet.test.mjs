import test from "node:test";
import assert from "node:assert/strict";
import {
  canShareActorArtwork,
  canViewActorSheet,
  getActorArtwork,
  getActorArtworkShortcut,
  isActorSheetShortcut,
  openActorArtworkForToken,
  openActorSheetForToken,
  shareActorArtworkForToken
} from "../scripts/actor-sheet.mjs";

const constants = {
  DOCUMENT_OWNERSHIP_LEVELS: { OBSERVER: 2 }
};

test("Ctrl+S is recognized only as a non-repeated control shortcut", () => {
  assert.equal(isActorSheetShortcut({ ctrlKey: true, code: "KeyS", repeat: false }), true);
  assert.equal(isActorSheetShortcut({ ctrlKey: false, code: "KeyS", repeat: false }), false);
  assert.equal(isActorSheetShortcut({ ctrlKey: true, code: "KeyA", repeat: false }), false);
  assert.equal(isActorSheetShortcut({ ctrlKey: true, code: "KeyB", repeat: false }), false);
  assert.equal(isActorSheetShortcut({ ctrlKey: true, code: "KeyS", repeat: true }), false);
});

test("Ctrl+1 and Ctrl+2 select local view and GM share actions", () => {
  assert.equal(getActorArtworkShortcut({ ctrlKey: true, code: "Digit1", repeat: false }), "view");
  assert.equal(getActorArtworkShortcut({ ctrlKey: true, code: "Numpad2", repeat: false }), "share");
  assert.equal(getActorArtworkShortcut({ ctrlKey: false, code: "Digit1", repeat: false }), null);
  assert.equal(getActorArtworkShortcut({ ctrlKey: true, code: "KeyA", repeat: false }), null);
  assert.equal(getActorArtworkShortcut({ ctrlKey: true, code: "Digit1", repeat: true }), null);
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

function makeArtworkToken({ permitted = true, gm = false } = {}) {
  const calls = [];
  const actor = {
    name: "Ranger",
    img: "artwork/ranger.webp",
    uuid: "Actor.ranger",
    sheet: { render: options => calls.push({ type: "sheet", options }) },
    testUserPermission: () => permitted
  };
  const token = { name: "Ranger Token", actor, document: { texture: { src: "artwork/token.webp" } } };
  const user = { id: gm ? "gm" : "player", isGM: gm };
  return { calls, actor, token, user };
}

test("Ctrl+1 opens the Actor artwork in a native ImagePopout", async () => {
  const { token, user } = makeArtworkToken();
  const popouts = [];
  class FakeImagePopout {
    constructor(options) {
      this.options = options;
      this.renderCalls = [];
      popouts.push(this);
    }

    async render(options) {
      this.renderCalls.push(options);
    }
  }

  assert.equal(getActorArtwork(token.actor, token), "artwork/ranger.webp");
  assert.equal(await openActorArtworkForToken(token, user, constants, FakeImagePopout), true);
  assert.deepEqual(popouts[0].options, {
    src: "artwork/ranger.webp",
    uuid: "Actor.ranger",
    window: { title: "Ranger" }
  });
  assert.deepEqual(popouts[0].renderCalls, [{ force: true }]);
});

test("Ctrl+2 shares artwork only for a permitted GM", async () => {
  const { token, user } = makeArtworkToken({ gm: true });
  let shared = 0;
  class FakeImagePopout {
    async render() {}
    shareImage() { shared += 1; }
  }

  assert.equal(canShareActorArtwork(token, user, constants), true);
  assert.equal(await shareActorArtworkForToken(token, user, constants, FakeImagePopout), true);
  assert.equal(shared, 1);

  const player = makeArtworkToken().user;
  assert.equal(canShareActorArtwork(token, player, constants), false);
  assert.equal(await shareActorArtworkForToken(token, player, constants, FakeImagePopout), false);
  assert.equal(shared, 1);
});

test("Artwork access is denied without Actor permission", async () => {
  const { token, user } = makeArtworkToken({ permitted: false });
  let constructed = false;
  class FakeImagePopout {
    constructor() { constructed = true; }
  }

  assert.equal(await openActorArtworkForToken(token, user, constants, FakeImagePopout), false);
  assert.equal(constructed, false);
});

test("Missing Actors or Sheets are handled without throwing", () => {
  const user = { id: "player" };
  assert.equal(openActorSheetForToken(null, user, constants), false);
  assert.equal(openActorSheetForToken({ actor: null }, user, constants), false);
  assert.equal(openActorSheetForToken({ actor: { testUserPermission: () => true } }, user, constants), false);
});
