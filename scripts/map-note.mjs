const DEFAULT_MAP_NOTE_ICON = "icons/svg/book.svg";

function getNoteDocument(note) {
  return note?.document ?? note ?? null;
}

/**
 * Resolve the Journal Entry linked by a Foundry map note.
 *
 * The canvas Note placeable exposes the entry directly in Foundry VTT 14,
 * while the document reference remains the reliable fallback for tests and
 * older-compatible note objects.
 */
export function getMapNoteJournal(note, journalCollection = globalThis.game?.journal) {
  if (!note) return null;
  if (note.entry) return note.entry;

  const document = getNoteDocument(note);
  const entryId = document?.entryId ?? note?.entryId;
  if (!entryId) return null;
  return journalCollection?.get?.(entryId) ?? null;
}

/** Return whether the current user may open the linked Journal Entry. */
export function canViewMapNote(
  note,
  user = globalThis.game?.user,
  constants = globalThis.CONST,
  journalCollection = globalThis.game?.journal
) {
  const journal = getMapNoteJournal(note, journalCollection);
  if (!journal || !user) return false;

  const observer = constants?.DOCUMENT_OWNERSHIP_LEVELS?.OBSERVER;
  if (typeof journal.testUserPermission === "function" && observer !== undefined) {
    return Boolean(journal.testUserPermission(user, observer));
  }

  return Boolean(user.isGM || journal.isOwner);
}

/**
 * Open the Journal Entry linked by a hovered map note, optionally at its
 * linked Journal Entry Page.
 */
export function openMapNoteJournal(
  note,
  user = globalThis.game?.user,
  constants = globalThis.CONST,
  journalCollection = globalThis.game?.journal
) {
  if (!canViewMapNote(note, user, constants, journalCollection)) return false;

  const journal = getMapNoteJournal(note, journalCollection);
  const sheet = journal?.sheet;
  if (!sheet || typeof sheet.render !== "function") return false;

  const document = getNoteDocument(note);
  const pageId = document?.pageId ?? note?.page?.id ?? null;
  const options = { force: true };
  if (pageId) options.pageId = pageId;
  sheet.render(options);
  return true;
}

/** Return the configured icon source used by the original map note. */
export function getMapNoteIcon(note) {
  const document = getNoteDocument(note);
  const texture = document?.texture?.src ?? document?.texture ?? note?.controlIcon?.texture;
  if (typeof texture === "string" && texture) return texture;
  if (typeof texture?.src === "string" && texture.src) return texture.src;
  if (typeof texture?.baseTexture?.resource?.src === "string" && texture.baseTexture.resource.src) {
    return texture.baseTexture.resource.src;
  }
  return DEFAULT_MAP_NOTE_ICON;
}

/** Return the source-space icon size used by Foundry's Note placeable. */
export function getMapNoteIconSize(note) {
  const document = getNoteDocument(note);
  const size = Number(document?.iconSize ?? note?.controlIcon?.size ?? 40);
  return Number.isFinite(size) && size > 0 ? size : 40;
}

/**
 * Return the same human-readable label used by a Map Note's canvas tooltip.
 * A custom Note text has priority over the linked Journal title.
 */
export function getMapNoteText(note) {
  const document = getNoteDocument(note);
  const candidates = [
    note?.label,
    document?.label,
    document?.text,
    note?.page?.name,
    note?.entry?.name
  ];

  return candidates
    .map(value => String(value ?? "").trim())
    .find(Boolean) ?? "";
}
