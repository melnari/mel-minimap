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

/** Return only the artwork configured on the visible Token. */
export function getTokenArtwork(token) {
  return token?.document?.texture?.src || token?.texture?.src || null;
}

/** Return the legacy Actor artwork used by GM-only artwork actions. */
export function getActorArtwork(actor, token = null) {
  return actor?.img || getTokenArtwork(token);
}

/**
 * A Token's visible texture can be viewed without Actor ownership. The
 * caller still has to obtain the Token through the normal visible hover path.
 */
export function canViewTokenArtwork(token, user = globalThis.game?.user) {
  if (!token || !user) return false;
  if (token.visible === false || token.document?.hidden) return false;
  return Boolean(getTokenArtwork(token));
}

/** Return whether a user may use the legacy Actor artwork path. */
export function canViewActorArtwork(token, user = globalThis.game?.user, constants = globalThis.CONST) {
  return Boolean(
    canViewActorSheet(token?.actor, user, constants) &&
    getActorArtwork(token?.actor, token)
  );
}

export function canShareActorArtwork(token, user = globalThis.game?.user, constants = globalThis.CONST) {
  return Boolean(
    user?.isGM &&
    canViewActorArtwork(token, user, constants)
  );
}

function getNeutralArtworkTitle() {
  const key = "MEL_MINIMAP.TokenArtwork";
  const localized = globalThis.game?.i18n?.localize?.(key);
  return localized && localized !== key ? localized : "Token Artwork";
}

function createTokenArtworkPopout(token, ImagePopoutClass = globalThis.foundry?.applications?.apps?.ImagePopout) {
  const source = getTokenArtwork(token);
  if (!source || typeof ImagePopoutClass !== "function") return null;

  const options = {
    src: source,
    window: { title: getNeutralArtworkTitle() }
  };
  return new ImagePopoutClass(options);
}

function createActorArtworkPopout(
  token,
  ImagePopoutClass = globalThis.foundry?.applications?.apps?.ImagePopout
) {
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

/** Open a visible Token's configured artwork in a local native ImagePopout. */
export async function openActorArtworkForToken(
  token,
  user = globalThis.game?.user,
  constants = globalThis.CONST,
  ImagePopoutClass = globalThis.foundry?.applications?.apps?.ImagePopout
) {
  const isGM = Boolean(user?.isGM);
  const permitted = isGM
    ? canViewActorArtwork(token, user, constants)
    : canViewTokenArtwork(token, user);
  if (!permitted) return false;

  const popout = isGM
    ? createActorArtworkPopout(token, ImagePopoutClass)
    : createTokenArtworkPopout(token, ImagePopoutClass);
  if (!popout) return false;

  await popout.render({ force: true });
  return true;
}

/** Open and share a visible Token's configured artwork with all connected Users. */
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
