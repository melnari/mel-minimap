import test from "node:test";
import assert from "node:assert/strict";
import {
  canViewMapNote,
  getMapNoteIcon,
  getMapNoteIconSize,
  getMapNoteJournal,
  getMapNoteText,
  openMapNoteJournal
} from "../scripts/map-note.mjs";

const constants = {
  DOCUMENT_OWNERSHIP_LEVELS: { OBSERVER: 2 }
};

function makeNote({ permitted = true, pageId = "page-1" } = {}) {
  const calls = [];
  const journal = {
    id: "journal-1",
    testUserPermission: (user, permission) => {
      calls.push({ type: "permission", user, permission });
      return permitted;
    },
    sheet: {
      render: options => calls.push({ type: "render", options })
    }
  };
  const note = {
    entry: journal,
    document: {
      entryId: "journal-1",
      pageId,
      iconSize: 48,
      texture: { src: "icons/svg/anchor.svg" }
    }
  };
  const collection = { get: id => id === journal.id ? journal : null };
  return { calls, collection, journal, note };
}

test("Map note resolves its linked Journal Entry and original icon settings", () => {
  const { collection, journal, note } = makeNote();
  journal.name = "Harbor District";
  note.document.text = "The old harbor";
  assert.equal(getMapNoteJournal(note, collection), journal);
  assert.equal(getMapNoteIcon(note), "icons/svg/anchor.svg");
  assert.equal(getMapNoteIconSize(note), 48);
  assert.equal(getMapNoteText(note), "The old harbor");
});

test("Map note hover text falls back to the linked Journal title", () => {
  const { journal, note } = makeNote();
  journal.name = "Harbor District";
  assert.equal(getMapNoteText(note), "Harbor District");
});

test("Ctrl+S map note action opens the linked Journal page for an Observer", () => {
  const { calls, collection, note } = makeNote();
  const user = { id: "player" };

  assert.equal(canViewMapNote(note, user, constants, collection), true);
  assert.equal(openMapNoteJournal(note, user, constants, collection), true);
  assert.deepEqual(calls, [
    { type: "permission", user, permission: 2 },
    { type: "permission", user, permission: 2 },
    { type: "render", options: { force: true, pageId: "page-1" } }
  ]);
});

test("Map note Journal access is denied without Observer permission", () => {
  const { calls, collection, note } = makeNote({ permitted: false });
  const user = { id: "player" };

  assert.equal(openMapNoteJournal(note, user, constants, collection), false);
  assert.deepEqual(calls, [{ type: "permission", user, permission: 2 }]);
});

test("Unlinked or incomplete map notes are handled safely", () => {
  assert.equal(getMapNoteJournal({ document: {} }, { get: () => null }), null);
  assert.equal(getMapNoteIcon({ document: {} }), "icons/svg/book.svg");
  assert.equal(getMapNoteIconSize({ document: { iconSize: 0 } }), 40);
  assert.equal(openMapNoteJournal(null, { id: "player" }, constants, { get: () => null }), false);
});
