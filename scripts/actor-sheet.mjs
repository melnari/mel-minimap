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
  return Boolean(event?.ctrlKey && event.code === "KeyS" && !event.repeat);
}

export function getActorArtworkShortcut(event) {
  if (!event?.ctrlKey || event.repeat) return null;
  if (event.code === "Digit1" || event.code === "Numpad1") return "view";
  if (event.code === "Digit2" || event.code === "Numpad2") return "share";
  return null;
}

export function getActorArtwork(actor, token = null) {
  return actor?.img || token?.document?.texture?.src || token?.texture?.src || null;
}

export function canShareActorArtwork(token, user = globalThis.game?.user, constants = globalThis.CONST) {
  return Boolean(
    user?.isGM &&
    canViewActorSheet(token?.actor, user, constants) &&
    getActorArtwork(token?.actor, token)
  );
}

function createActorArtworkPopout(token, ImagePopoutClass = globalThis.foundry?.applications?.apps?.ImagePopout) {
  const actor = token?.actor;
  const source = getActorArtwork(actor, token);
  if (!actor || !source || typeof ImagePopoutClass !== "function") return null;

  const options = {
    src: source,
    window: { title: actor.name || token?.name || "Actor Artwork" }
  };
  if (actor.uuid) options.uuid = actor.uuid;
  return new ImagePopoutClass(options);
}

/** Open a hovered Token Actor's artwork in a local native ImagePopout. */
export async function openActorArtworkForToken(
  token,
  user = globalThis.game?.user,
  constants = globalThis.CONST,
  ImagePopoutClass = globalThis.foundry?.applications?.apps?.ImagePopout
) {
  if (!canViewActorSheet(token?.actor, user, constants)) return false;
  const popout = createActorArtworkPopout(token, ImagePopoutClass);
  if (!popout) return false;

  await popout.render({ force: true });
  return true;
}

/** Open and share a hovered Token Actor's artwork with all connected Users. */
export async function shareActorArtworkForToken(
  token,
  user = globalThis.game?.user,
  constants = globalThis.CONST,
  ImagePopoutClass = globalThis.foundry?.applications?.apps?.ImagePopout
) {
  if (!canShareActorArtwork(token, user, constants)) return false;
  const popout = createActorArtworkPopout(token, ImagePopoutClass);
  if (!popout || typeof popout.shareImage !== "function") return false;

  await popout.render({ force: true });
  popout.shareImage();
  return true;
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
