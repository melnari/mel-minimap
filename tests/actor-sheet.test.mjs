import test from "node:test";
import assert from "node:assert/strict";
import {
  canShareActorArtwork,
  canViewActorArtwork,
  canViewActorSheet,
  canViewTokenArtwork,
  getActorArtwork,
  getTokenArtwork,
  openActorArtworkForToken,
  openActorSheetForToken,
  shareActorArtworkForToken
} from "../scripts/actor-sheet.mjs";

const constants = {
  DOCUMENT_OWNERSHIP_LEVELS: { OBSERVER: 2 }
};

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

function makeArtworkToken({ permitted = true, gm = false, visible = true, hidden = false } = {}) {
  const calls = [];
  const actor = {
    name: "Ranger",
    img: "artwork/ranger.webp",
    uuid: "Actor.ranger",
    sheet: { render: options => calls.push({ type: "sheet", options }) },
    testUserPermission: () => permitted
  };
  const token = {
    name: "Ranger Token",
    visible,
    actor,
    document: { hidden, texture: { src: "artwork/token.webp" } }
  };
  const user = { id: gm ? "gm" : "player", isGM: gm };
  return { calls, actor, token, user };
}

test("Ctrl+1 opens visible Token artwork without Actor permission", async () => {
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

  assert.equal(getTokenArtwork(token), "artwork/token.webp");
  assert.equal(canViewTokenArtwork(token, user), true);
  assert.equal(await openActorArtworkForToken(token, user, constants, FakeImagePopout), true);
  assert.deepEqual(popouts[0].options, {
    src: "artwork/token.webp",
    window: { title: "Token Artwork" }
  });
  assert.deepEqual(popouts[0].renderCalls, [{ force: true }]);
});

test("Ctrl+2 preserves the GM Actor artwork behavior", async () => {
  const { token, user } = makeArtworkToken({ gm: true });
  let shared = 0;
  const popouts = [];
  class FakeImagePopout {
    constructor(options) { popouts.push(options); }
    async render() {}
    shareImage() { shared += 1; }
  }

  assert.equal(canShareActorArtwork(token, user, constants), true);
  assert.equal(await shareActorArtworkForToken(token, user, constants, FakeImagePopout), true);
  assert.equal(shared, 1);
  assert.deepEqual(popouts, [{
    src: "artwork/ranger.webp",
    uuid: "Actor.ranger",
    window: { title: "Ranger" }
  }]);

  const player = makeArtworkToken().user;
  assert.equal(canShareActorArtwork(token, player, constants), false);
  assert.equal(await shareActorArtworkForToken(token, player, constants, FakeImagePopout), false);
  assert.equal(shared, 1);
});

test("Token artwork access is denied when the Token is not visible", async () => {
  const { token, user } = makeArtworkToken({ permitted: false });
  token.visible = false;
  let constructed = false;
  class FakeImagePopout {
    constructor() { constructed = true; }
  }

  assert.equal(await openActorArtworkForToken(token, user, constants, FakeImagePopout), false);
  assert.equal(constructed, false);
});

test("GM Actor artwork behavior remains available for hidden Tokens", async () => {
  const { token, user } = makeArtworkToken({ gm: true, hidden: true });
  assert.equal(canViewTokenArtwork(token, user), false);
  assert.equal(canViewActorArtwork(token, user, constants), true);

  const popouts = [];
  class FakeImagePopout {
    constructor(options) { popouts.push(options); }
    async render() {}
  }

  assert.equal(await openActorArtworkForToken(token, user, constants, FakeImagePopout), true);
  assert.deepEqual(popouts[0], {
    src: "artwork/ranger.webp",
    uuid: "Actor.ranger",
    window: { title: "Ranger" }
  });
});

test("Missing Actors or Sheets are handled without throwing", () => {
  const user = { id: "player" };
  assert.equal(openActorSheetForToken(null, user, constants), false);
  assert.equal(openActorSheetForToken({ actor: null }, user, constants), false);
  assert.equal(openActorSheetForToken({ actor: { testUserPermission: () => true } }, user, constants), false);
});
