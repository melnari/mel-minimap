/**
 * Return whether the current user may view an Actor sheet.
 *
 * Foundry's document permission API is used instead of relying on ownership
 * alone, because an Observer may view a sheet without owning the Actor.
 */
export function canViewActorSheet(actor, user = globalThis.game?.user, constants = globalThis.CONST) {
  if (!actor || !user) return false;

  const observer = constants?.DOCUMENT_OWNERSHIP_LEVELS?.OBSERVER;
  if (typeof actor.testUserPermission === "function" && observer !== undefined) {
    return Boolean(actor.testUserPermission(user, observer));
  }

  // This fallback keeps the helper safe for test doubles and unusual legacy
  // documents which do not expose Foundry's permission method.
  return Boolean(user.isGM || actor.isOwner);
}

export function isActorSheetShortcut(event) {
  return Boolean(event?.ctrlKey && event.code === "KeyA" && !event.repeat);
}

/**
 * Open the sheet for a hovered Token Actor when the current user may view it.
 * Returns true only when a sheet render was actually requested.
 */
export function openActorSheetForToken(token, user = globalThis.game?.user, constants = globalThis.CONST) {
  const actor = token?.actor;
  if (!canViewActorSheet(actor, user, constants)) return false;

  const sheet = actor.sheet;
  if (!sheet || typeof sheet.render !== "function") return false;
  sheet.render({ force: true });
  return true;
}
