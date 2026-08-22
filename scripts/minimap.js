const MODULE_ID = "mel-minimap";
const MINIMAP_ID = `${MODULE_ID}-window`;
const DEFAULT_SIZE = 300;
const MAP_SCALE = 0.10;
const MIN_MAP_EDGE = 300;
const MAX_MINIMAP_EDGE = 350;

const { ApplicationV2 } = foundry.applications.api;

/**
 * A lightweight 2D overview of the active Foundry canvas.
 *
 * The map itself is intentionally rendered to a normal HTML canvas instead
 * of adding another PIXI layer to the game canvas. This keeps the minimap
 * independent from the current canvas zoom and avoids changing scene data.
 */
class MelMinimap extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: MINIMAP_ID,
    classes: ["mel-minimap"],
    position: {
      width: DEFAULT_SIZE,
      height: DEFAULT_SIZE,
      left: 24,
      top: 120
    },
    window: {
      title: "MEL_MINIMAP.Title",
      icon: "fa-solid fa-map",
      resizable: false,
      minimizable: true
    }
  };

  static _instances = new Set();

  #content = null;
  #mapCanvas = null;
  #status = null;
  #context = null;
  #animationFrame = null;
  #imageCache = new Map();
  #lastSize = "";
  #fittedMapSignature = "";

  constructor(options = {}) {
    super(options);
    MelMinimap._instances.add(this);
  }

  async _renderHTML() {
    const content = document.createElement("div");
    content.className = "mel-minimap__content";

    const canvasElement = document.createElement("canvas");
    canvasElement.className = "mel-minimap__canvas";
    canvasElement.setAttribute("aria-label", "Mel-Minimap");
    canvasElement.addEventListener("pointerdown", event => this.#panToMapPoint(event));

    const status = document.createElement("div");
    status.className = "mel-minimap__status";
    status.hidden = true;

    const legend = document.createElement("div");
    legend.className = "mel-minimap__legend";
    for (const entry of [
      ["friendly", "MEL_MINIMAP.Legend.Party"],
      ["neutral", "MEL_MINIMAP.Legend.Neutral"],
      ["hostile", "MEL_MINIMAP.Legend.Opposition"],
      ["self", "MEL_MINIMAP.Legend.Self"]
    ]) {
      const item = document.createElement("span");
      const marker = document.createElement("i");
      marker.className = entry[0];
      item.append(marker, document.createTextNode(game.i18n.localize(entry[1])));
      legend.append(item);
    }

    content.append(canvasElement, status, legend);
    return content;
  }

  _replaceHTML(result, content) {
    content.replaceChildren(result);
    this.#content = result;
    this.#mapCanvas = result.querySelector(".mel-minimap__canvas");
    this.#status = result.querySelector(".mel-minimap__status");
    this.#context = this.#mapCanvas.getContext("2d");
    // A render replaces the HTML canvas with a new element whose backing
    // buffer starts at the browser default of 300x150. Force the next draw
    // to size that new buffer to its actual CSS dimensions.
    this.#lastSize = "";
  }

  async _onRender() {
    this.#startRefreshLoop();
    const map = this.#getMapBounds(globalThis.canvas?.dimensions, globalThis.canvas?.scene);
    if (map) this.#fitWindowToMap(map);
    this.#draw();
  }

  async _onClose() {
    this.#stopRefreshLoop();
    MelMinimap._instances.delete(this);
  }

  redraw() {
    this.#draw();
  }

  #startRefreshLoop() {
    if (this.#animationFrame) return;
    const tick = () => {
      this.#animationFrame = window.requestAnimationFrame(tick);
      this.#draw();
    };
    this.#animationFrame = window.requestAnimationFrame(tick);
  }

  #stopRefreshLoop() {
    if (!this.#animationFrame) return;
    window.cancelAnimationFrame(this.#animationFrame);
    this.#animationFrame = null;
  }

  #draw() {
    if (!this.#mapCanvas || !this.#context) return;

    const width = Math.max(1, Math.floor(this.#mapCanvas.clientWidth));
    const height = Math.max(1, Math.floor(this.#mapCanvas.clientHeight));
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const size = `${width}x${height}@${pixelRatio}`;
    if (this.#lastSize !== size) {
      this.#mapCanvas.width = Math.floor(width * pixelRatio);
      this.#mapCanvas.height = Math.floor(height * pixelRatio);
      this.#lastSize = size;
    }

    const context = this.#context;
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.clearRect(0, 0, width, height);
    context.fillStyle = "#171717";
    context.fillRect(0, 0, width, height);

    const dimensions = globalThis.canvas?.dimensions;
    const scene = globalThis.canvas?.scene;
    if (!dimensions || !scene || !globalThis.canvas?.initialized) {
      this.#setStatus(game.i18n.localize("MEL_MINIMAP.NoScene"));
      return;
    }

    this.#setStatus("");
    const map = this.#getMapBounds(dimensions, scene);
    if (!map) return;
    const projection = this.#getMapProjection(map, width, height);

    context.save();
    context.translate(projection.offsetX, projection.offsetY);
    context.scale(projection.scale, projection.scale);
    context.translate(-map.x, -map.y);

    this.#drawMapBackground(context, scene, map);
    this.#drawGrid(context, dimensions, map);
    this.#drawFogMask(context, dimensions, scene, map);
    this.#drawTokens(context, scene, map);
    context.restore();

    this.#drawViewport(context, map, projection.toCanvasX, projection.toCanvasY, width, height);
    this.#drawBorder(context, projection.offsetX, projection.offsetY, map, projection.scale);
  }

  #getMapProjection(map, width, height) {
    // A single uniform scale is used for both axes. Any unused space is
    // letterboxed, so the source image can never be stretched by the view.
    const scale = Math.min(width / map.width, height / map.height);
    const offsetX = (width - map.width * scale) / 2;
    const offsetY = (height - map.height * scale) / 2;
    return {
      scale,
      offsetX,
      offsetY,
      toCanvasX: value => offsetX + (value - map.x) * scale,
      toCanvasY: value => offsetY + (value - map.y) * scale
    };
  }

  #getMapBounds(dimensions, scene) {
    if (!dimensions) return null;
    const sceneRect = dimensions.sceneRect;
    if (!sceneRect || !sceneRect.width || !sceneRect.height) return null;

    const source = scene?.background?.src ?? scene?.background?.video;
    const image = source ? this.#getImage(source) : null;
    const width = image?.naturalWidth || sceneRect.width;
    const height = image?.naturalHeight || sceneRect.height;
    return {
      x: 0,
      y: 0,
      width,
      height,
      worldX: sceneRect.x,
      worldY: sceneRect.y,
      worldWidth: sceneRect.width,
      worldHeight: sceneRect.height,
      source,
      image
    };
  }

  #fitWindowToMap(map) {
    const sceneId = globalThis.canvas?.scene?.id ?? "unknown-scene";
    const signature = `${sceneId}:${map.source ?? ""}:${map.width}:${map.height}`;

    const frame = this.element;
    const content = this.window?.content;
    if (!frame || !content) return;

    const frameRect = frame.getBoundingClientRect();
    const contentRect = content.getBoundingClientRect();
    if (!contentRect.width || !contentRect.height) return;

    // Determine the frame chrome before sizing the map. The resulting outer
    // window, not only the inner canvas, stays within 350 px on both axes.
    const chromeWidth = Math.max(0, frameRect.width - contentRect.width);
    const chromeHeight = Math.max(0, frameRect.height - contentRect.height);

    // Keep the normal 10% scale, but avoid an unusably small minimap for
    // small source images. The shorter map edge becomes at least 300 px;
    // both axes use the same factor so the original aspect ratio is kept.
    const shorterEdge = Math.min(map.width, map.height);
    const minimumScale = shorterEdge > 0 ? MIN_MAP_EDGE / shorterEdge : MAP_SCALE;
    const minimumMapScale = Math.max(MAP_SCALE, minimumScale);

    // If the 300 px minimum and 350 px maximum cannot both be satisfied for
    // an extreme aspect ratio, the maximum window size takes precedence.
    const maximumContentWidth = Math.max(1, MAX_MINIMAP_EDGE - chromeWidth);
    const maximumContentHeight = Math.max(1, MAX_MINIMAP_EDGE - chromeHeight);
    const maximumMapScale = Math.min(
      maximumContentWidth / map.width,
      maximumContentHeight / map.height
    );
    const mapScale = Math.max(0.001, Math.min(minimumMapScale, maximumMapScale));
    const contentWidth = Math.max(1, Math.round(map.width * mapScale));
    const contentHeight = Math.max(1, Math.round(map.height * mapScale));

    // Do not let the Foundry window layout stretch the map surface. The
    // canvas must receive the exact target aspect ratio calculated above.
    if (this.#content) {
      this.#content.style.width = `${contentWidth}px`;
      this.#content.style.height = `${contentHeight}px`;
      this.#content.style.flex = "0 0 auto";
    }

    // A full ApplicationV2 render replaces the inner HTML. Restore the
    // explicit dimensions above even when the window position is unchanged.
    if (signature === this.#fittedMapSignature) return;

    this.setPosition({
      width: contentWidth + Math.round(chromeWidth),
      height: contentHeight + Math.round(chromeHeight)
    });
    this.#fittedMapSignature = signature;
  }

  #worldToMapX(map, value) {
    return map.x + ((value - map.worldX) / map.worldWidth) * map.width;
  }

  #worldToMapY(map, value) {
    return map.y + ((value - map.worldY) / map.worldHeight) * map.height;
  }

  #mapToWorldX(map, value) {
    return map.worldX + ((value - map.x) / map.width) * map.worldWidth;
  }

  #mapToWorldY(map, value) {
    return map.worldY + ((value - map.y) / map.height) * map.worldHeight;
  }

  #drawMapBackground(context, scene, map) {
    if (!game.settings.get(MODULE_ID, "showBackground")) {
      context.fillStyle = "#232323";
      context.fillRect(map.x, map.y, map.width, map.height);
      return;
    }

    const source = map.source ?? scene.background?.src ?? scene.background?.video;
    if (!source) {
      context.fillStyle = "#232323";
      context.fillRect(map.x, map.y, map.width, map.height);
      return;
    }

    const image = map.image ?? this.#getImage(source);
    if (image?.complete && image.naturalWidth) {
      context.drawImage(image, map.x, map.y, map.width, map.height);
      context.fillStyle = "rgb(0 0 0 / 16%)";
      context.fillRect(map.x, map.y, map.width, map.height);
    } else {
      context.fillStyle = "#232323";
      context.fillRect(map.x, map.y, map.width, map.height);
    }
  }

  #drawGrid(context, dimensions, map) {
    const gridSize = Number(dimensions.size);
    if (!gridSize || gridSize < 4) return;
    const alpha = Math.max(0.04, Math.min(0.16, 10 / gridSize));
    context.strokeStyle = `rgb(255 255 255 / ${alpha * 100}%)`;
    const scaleX = map.width / map.worldWidth;
    const scaleY = map.height / map.worldHeight;
    context.lineWidth = Math.max(1, gridSize * Math.min(scaleX, scaleY) / 100);
    context.beginPath();
    for (let x = map.worldX; x <= map.worldX + map.worldWidth; x += gridSize) {
      const mapX = this.#worldToMapX(map, x);
      context.moveTo(mapX, map.y);
      context.lineTo(mapX, map.y + map.height);
    }
    for (let y = map.worldY; y <= map.worldY + map.worldHeight; y += gridSize) {
      const mapY = this.#worldToMapY(map, y);
      context.moveTo(map.x, mapY);
      context.lineTo(map.x + map.width, mapY);
    }
    context.stroke();
  }

  #drawFogMask(context, dimensions, scene, map) {
    if (game.user?.isGM || !this.#hasFogOfWar(scene)) return;

    // Sampling at roughly one grid cell keeps the mask inexpensive while
    // still hiding unexplored/currently unseen areas and their contents.
    const sampleSize = Math.max(32, Number(dimensions.size) || 100);
    context.save();
    context.fillStyle = "rgb(0 0 0 / 94%)";

    for (let worldY = map.worldY; worldY < map.worldY + map.worldHeight; worldY += sampleSize) {
      for (let worldX = map.worldX; worldX < map.worldX + map.worldWidth; worldX += sampleSize) {
        const point = {
          x: worldX + Math.min(sampleSize, map.worldX + map.worldWidth - worldX) / 2,
          y: worldY + Math.min(sampleSize, map.worldY + map.worldHeight - worldY) / 2
        };
        if (this.#isWorldPointVisible(point)) continue;

        const mapX = this.#worldToMapX(map, worldX);
        const mapY = this.#worldToMapY(map, worldY);
        const mapX2 = this.#worldToMapX(map, Math.min(worldX + sampleSize, map.worldX + map.worldWidth));
        const mapY2 = this.#worldToMapY(map, Math.min(worldY + sampleSize, map.worldY + map.worldHeight));
        context.fillRect(mapX, mapY, mapX2 - mapX, mapY2 - mapY);
      }
    }
    context.restore();
  }

  #drawTokens(context, scene, map) {
    const tokens = globalThis.canvas?.tokens?.placeables ?? [];
    const isGM = Boolean(game.user?.isGM);
    const fogEnabled = this.#hasFogOfWar(scene);
    for (const token of tokens) {
      const document = token.document;
      if (!document || (!token.visible && !isGM)) continue;
      if (document.hidden && !isGM) continue;

      const center = token.center ?? {
        x: document.x + document.width * (globalThis.canvas.dimensions.size ?? 100) / 2,
        y: document.y + document.height * (globalThis.canvas.dimensions.size ?? 100) / 2
      };
      if (!Number.isFinite(center.x) || !Number.isFinite(center.y)) continue;
      if (!isGM && fogEnabled && !this.#isWorldPointVisible(center)) continue;

      const gridSize = globalThis.canvas.dimensions.size ?? 100;
      const tokenWidth = document.width * gridSize * map.width / map.worldWidth;
      const tokenHeight = document.height * gridSize * map.height / map.worldHeight;
      const radius = Math.max(8, Math.min(tokenWidth, tokenHeight) / 2);
      const mapCenter = {
        x: this.#worldToMapX(map, center.x),
        y: this.#worldToMapY(map, center.y)
      };
      const self = this.#isOwnToken(token);
      const color = self ? "#ffffff" : this.#dispositionColor(document.disposition);
      const alpha = document.hidden ? 0.42 : 0.95;

      context.save();
      context.globalAlpha = alpha;
      context.beginPath();
      context.arc(mapCenter.x, mapCenter.y, radius, 0, Math.PI * 2);
      context.fillStyle = color;
      context.fill();
      context.lineWidth = self ? Math.max(3, radius * 0.22) : Math.max(1.5, radius * 0.1);
      context.strokeStyle = self ? "#2d8cff" : "#101010";
      context.stroke();
      if (self) {
        context.beginPath();
        context.arc(mapCenter.x, mapCenter.y, radius * 1.45, 0, Math.PI * 2);
        context.lineWidth = Math.max(1.5, radius * 0.1);
        context.strokeStyle = "rgb(255 255 255 / 72%)";
        context.stroke();
      }
      context.restore();
    }
  }

  #hasFogOfWar(scene) {
    // When Token Vision is disabled for the Scene, players can see the full
    // environment regardless of the configured Fog Exploration mode.
    if (scene?.tokenVision === false) return false;

    const mode = scene?.fog?.mode;
    const disabledMode = globalThis.CONST?.FOG_EXPLORATION_MODES?.DISABLED ?? 0;
    if (mode !== undefined && mode !== null) return mode !== disabledMode;

    const fog = globalThis.canvas?.fog;
    return Boolean(fog?.fogExploration || fog?.exploration);
  }

  #isWorldPointVisible(point) {
    const fog = globalThis.canvas?.fog;
    const visibility = globalThis.canvas?.visibility;
    let explored = true;
    let visible = true;

    try {
      if (typeof fog?.isPointExplored === "function") explored = Boolean(fog.isPointExplored(point));
    } catch (error) {
      console.warn(`${MODULE_ID} could not query fog exploration`, error);
    }

    try {
      if (typeof visibility?.testVisibility === "function") visible = Boolean(visibility.testVisibility(point));
    } catch (error) {
      console.warn(`${MODULE_ID} could not query canvas visibility`, error);
    }

    return explored && visible;
  }

  #drawViewport(context, map, toMapX, toMapY, width, height) {
    const stage = globalThis.canvas?.stage;
    const screen = globalThis.canvas?.screenDimensions ?? [width, height];
    const zoom = Number(stage?.scale?.x) || 1;
    const pivotX = Number(stage?.pivot?.x);
    const pivotY = Number(stage?.pivot?.y);
    if (!Number.isFinite(pivotX) || !Number.isFinite(pivotY)) return;

    const viewportWidth = screen[0] / zoom;
    const viewportHeight = screen[1] / zoom;
    const viewportX = pivotX - viewportWidth / 2;
    const viewportY = pivotY - viewportHeight / 2;
    const x1 = Math.max(map.worldX, viewportX);
    const y1 = Math.max(map.worldY, viewportY);
    const x2 = Math.min(map.worldX + map.worldWidth, viewportX + viewportWidth);
    const y2 = Math.min(map.worldY + map.worldHeight, viewportY + viewportHeight);
    if (x2 <= x1 || y2 <= y1) return;

    const left = toMapX(this.#worldToMapX(map, x1));
    const top = toMapY(this.#worldToMapY(map, y1));
    const frameWidth = toMapX(this.#worldToMapX(map, x2)) - left;
    const frameHeight = toMapY(this.#worldToMapY(map, y2)) - top;

    context.save();
    context.fillStyle = "rgb(255 255 255 / 8%)";
    context.fillRect(left, top, frameWidth, frameHeight);
    context.strokeStyle = "rgb(255 255 255 / 88%)";
    context.lineWidth = 2;
    context.strokeRect(left, top, frameWidth, frameHeight);
    context.restore();
  }

  #drawBorder(context, offsetX, offsetY, map, scale) {
    context.save();
    context.strokeStyle = "rgb(255 255 255 / 42%)";
    context.lineWidth = 1;
    context.strokeRect(offsetX, offsetY, map.width * scale, map.height * scale);
    context.restore();
  }

  #isOwnToken(token) {
    const actorId = game.user?.character?.id;
    return Boolean(
      token.controlled ||
      (actorId && token.actor?.id === actorId)
    );
  }

  #dispositionColor(disposition) {
    const colors = CONFIG.Canvas?.dispositionColors ?? {};
    if (disposition === CONST.TOKEN_DISPOSITIONS?.HOSTILE) return this.#colorHex(colors.HOSTILE, "#e15c5c");
    if (disposition === CONST.TOKEN_DISPOSITIONS?.NEUTRAL) return this.#colorHex(colors.NEUTRAL, "#e5c454");
    if (disposition === CONST.TOKEN_DISPOSITIONS?.PARTY) return this.#colorHex(colors.PARTY, "#5da9e9");
    return this.#colorHex(colors.FRIENDLY, "#4ecb71");
  }

  #colorHex(value, fallback) {
    if (typeof value === "string") return value;
    if (typeof value !== "number") return fallback;
    return `#${value.toString(16).padStart(6, "0")}`;
  }

  #getImage(source) {
    if (this.#imageCache.has(source)) return this.#imageCache.get(source);
    const image = new Image();
    image.decoding = "async";
    image.addEventListener("load", () => {
      // The natural image dimensions are the authoritative map aspect ratio.
      // Re-render once they are available after the first open. The window is
      // fitted only during render, never from inside the drawing routine.
      this.#fittedMapSignature = "";
      if (this.element) void this.render();
    }, { once: true });
    image.src = source;
    this.#imageCache.set(source, image);
    return image;
  }

  #setStatus(message) {
    if (!this.#status) return;
    this.#status.textContent = message;
    this.#status.hidden = !message;
  }

  #panToMapPoint(event) {
    const dimensions = globalThis.canvas?.dimensions;
    const stage = globalThis.canvas?.stage;
    if (!dimensions || !stage || !globalThis.canvas?.animatePan) return;

    const rect = this.#mapCanvas.getBoundingClientRect();
    const map = this.#getMapBounds(dimensions, globalThis.canvas?.scene);
    if (!map || !rect.width || !rect.height) return;
    const projection = this.#getMapProjection(map, rect.width, rect.height);
    const mapX = map.x + (event.clientX - rect.left - projection.offsetX) / projection.scale;
    const mapY = map.y + (event.clientY - rect.top - projection.offsetY) / projection.scale;
    if (mapX < map.x || mapY < map.y || mapX > map.x + map.width || mapY > map.y + map.height) return;

    const pointX = this.#mapToWorldX(map, mapX);
    const pointY = this.#mapToWorldY(map, mapY);

    event.preventDefault();
    event.stopPropagation();
    void globalThis.canvas.animatePan({
      x: pointX,
      y: pointY,
      scale: Number(stage.scale.x) || 1
    }).finally(() => {
      // Panning changes only the viewport rectangle. Never resize or
      // re-render the Application here; doing so can compound frame metrics
      // and distort the map after repeated clicks.
      this.#draw();
    });
  }
}

function getMinimap() {
  return foundry.applications.instances.get(MINIMAP_ID) ?? null;
}

function toggleMinimap() {
  const existing = getMinimap();
  if (existing) {
    void existing.close();
    return;
  }
  void new MelMinimap().render({ force: true });
}

Hooks.once("init", () => {
  game.settings.register(MODULE_ID, "autoOpen", {
    name: "MEL_MINIMAP.AutoOpen",
    hint: "",
    scope: "client",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register(MODULE_ID, "showBackground", {
    name: "MEL_MINIMAP.ShowBackground",
    hint: "",
    scope: "client",
    config: true,
    type: Boolean,
    default: true
  });

  game.keybindings.register(MODULE_ID, "toggleMinimap", {
    name: "MEL_MINIMAP.Toggle",
    editable: [{ key: "KeyM", modifiers: ["Control"] }],
    restricted: false,
    onDown: () => {
      toggleMinimap();
      return true;
    }
  });
});

Hooks.on("getSceneControlButtons", controls => {
  const tokenControls = controls.tokens;
  if (!tokenControls?.tools) return;
  tokenControls.tools.melMinimap = {
    name: "melMinimap",
    title: "MEL_MINIMAP.Toggle",
    icon: "fa-solid fa-map",
    order: Object.keys(tokenControls.tools).length,
    button: true,
    visible: true,
    onChange: toggleMinimap
  };
});

Hooks.once("ready", () => {
  if (game.settings.get(MODULE_ID, "autoOpen")) toggleMinimap();
});

for (const hook of [
  "canvasReady",
  "canvasPan",
  "refreshToken",
  "controlToken",
  "createToken",
  "updateToken",
  "deleteToken",
  "updateScene",
  "visibilityRefresh",
  "sightRefresh",
  "updateFogExploration"
]) {
  Hooks.on(hook, () => {
    for (const minimap of MelMinimap._instances) {
      // Canvas panning and visibility/token updates must not replace the
      // Application DOM. Re-rendering during canvasPan caused unstable
      // content metrics and progressive distortion after minimap clicks.
      if (hook === "canvasReady" || hook === "updateScene") void minimap.render();
      else minimap.redraw();
    }
  });
}

globalThis.MelMinimap = MelMinimap;
