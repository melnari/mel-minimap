# Mel-Minimap

Mel-Minimap is a Foundry Virtual Tabletop module that displays the complete active Scene in a compact overview window. The minimap preserves the original map aspect ratio, shows relevant Tokens and Map Notes, and marks the portion of the Scene currently visible on the main canvas.

## Compatibility

- Module version: `1.0.7`
- Foundry Virtual Tabletop: `14.x`
- Verified with Foundry Virtual Tabletop `14.368`

## Features

### Scene overview

- Displays the complete background of the active Scene or viewed Level.
- Preserves the original image aspect ratio. The map is never stretched.
- Uses a normal scale of 10% of the source image dimensions.
- Keeps the shorter map edge at least 300 pixels where possible.
- Scales very large maps down proportionally so the outer window does not exceed 350 × 350 pixels.
- Gives the map the maximum possible size when an extreme aspect ratio prevents both size limits from being met.
- Fits the map automatically. Manual resizing is not required or enabled.
- Displays the configured grid and a translucent white frame around the current main-canvas viewport.
- Can be moved or minimized like any other Foundry `ApplicationV2` window.
- Clicking the minimap centers the main canvas on the selected position without changing the minimap's size or aspect ratio.

### Tokens

Visible Tokens are displayed as compact markers using Foundry disposition colors:

- **Party** for friendly Tokens
- **Neutral** for neutral Tokens
- **Opposition** for hostile Tokens
- **Self** for the controlled Token or the Token belonging to the current user's character

The user's own Token is highlighted with a white marker and blue outline. Hovering over a Token displays its name and localized disposition in the top-left information area, subject to Foundry's Token name-display mode and the user's permissions.

### Map Notes

Map Notes use their configured Foundry icon and `iconSize`, scaled proportionally to the complete Scene. The feature is controlled by the client setting **Show Map Notes**, which is disabled by default.

When the pointer hovers over a Map Note, its custom Note text or linked Journal title is shown in the top-left information area. Pressing `Ctrl+S` opens the linked Journal Entry and, when configured, its linked Journal Entry Page.

### Actor Sheets and artwork

- `Ctrl+S` opens the Actor Sheet for a hovered Token when the current user has at least Observer permission for that Actor.
- `Ctrl+1` opens the hovered Actor's artwork locally when the current user may view that Actor.
- `Ctrl+2` allows a GM to open and share the hovered Actor's artwork with all connected players.

## Installation

### Install from Foundry's module browser

If the module is available in Foundry's package browser, install **Mel-Minimap** from **Add-on Modules**.

### Install with a manifest URL

In Foundry, open **Add-on Modules → Install Module**, enter the following Manifest URL, and select **Install**:

```text
https://raw.githubusercontent.com/melnari/mel-minimap/main/module.json
```

The manifest points to the published GitHub release archive.

### Manual installation

1. Download the module release archive.
2. Extract the `mel-minimap` folder into Foundry's `Data/modules/` directory.
3. Restart Foundry VTT.
4. Enable **Mel-Minimap** in the target World.

The installed folder must be named `mel-minimap`, matching the module ID in `module.json`.

## Configuration

The settings are client-specific and can be found in Foundry's module settings:

- **Open minimap when the world starts**: Opens the minimap automatically after the World is ready. Enabled by default.
- **Show map background**: Displays the active Scene background in the minimap. Enabled by default.
- **Show Map Notes**: Displays visible Map Note markers and enables Map Note hover actions. Disabled by default.

Changing **Show Map Notes** updates open minimaps immediately.

## Usage

### Minimap controls

| Action | Result |
|---|---|
| Scene Controls button | Opens or closes the minimap |
| `Ctrl+M` | Opens or closes the minimap |
| Click inside the map | Centers the main canvas on that position |
| Move the pointer over a Token | Shows the Token name and disposition |
| Move the pointer over a Map Note | Shows the Note text or linked Journal title |

### Keyboard shortcuts for hovered objects

| Shortcut | Hovered Token | Hovered Map Note |
|---|---|---|
| `Ctrl+S` | Opens the Actor Sheet when permitted | Opens the linked Journal Entry or Journal Entry Page when permitted |
| `Ctrl+1` | Opens the Actor's artwork locally when permitted | No action |
| `Ctrl+2` | A GM shares the Actor's artwork with all connected players | No action |

The shortcut only applies while the pointer is over the minimap. If the current user does not have the required permission, the shortcut is ignored.

## Visibility and Fog of War

Mel-Minimap follows Foundry's current Scene visibility state for non-GM users:

- Unexplored or currently invisible areas are masked.
- Tokens inside masked areas are not displayed.
- Hidden or otherwise invisible Tokens are not displayed to players.
- Non-global Map Notes in unexplored or currently invisible areas are not displayed to players.
- Global Map Notes follow Foundry's global visibility behavior.
- GMs can see content that is hidden from players; hidden Token markers use reduced opacity.
- If the Scene's **Token Vision** setting is disabled, players see the complete map regardless of **Exploration Mode**.

The Fog of War mask is sampled across the map for performance. Lighting, weather, animated effects, and video animation are not reproduced as a separate full Scene render.

## Localization

Mel-Minimap supports the following five languages:

| Code | Language | File |
|---|---|---|
| de | Deutsch | `lang/de.json` |
| en | English | `lang/en.json` |
| es | Español | `lang/es.json` |
| fr | Français | `lang/fr.json` |
| nl | Nederlands | `lang/nl.json` |

The main localization keys include:

- `MEL_MINIMAP.Toggle`
- `MEL_MINIMAP.AutoOpen`
- `MEL_MINIMAP.ShowBackground`
- `MEL_MINIMAP.ShowMapNotes`
- `MEL_MINIMAP.Legend.Party`
- `MEL_MINIMAP.Legend.Neutral`
- `MEL_MINIMAP.Legend.Opposition`
- `MEL_MINIMAP.Legend.Self`

## Project structure

```text
mel-minimap/
├── module.json
├── README.md
├── lang/
├── scripts/
│   ├── minimap.js
│   ├── actor-sheet.mjs
│   └── map-note.mjs
├── tests/
│   ├── actor-sheet.test.mjs
│   └── map-note.test.mjs
└── styles/minimap.css
```

The module uses Foundry's `ApplicationV2`, Hooks, Scene Controls, Canvas APIs, registered document sheets, the document permission API, and a dedicated HTML canvas. It does not modify the active Scene document or add a second PIXI layer to the main canvas.

## Development and validation

No build step is required. The module can be tested directly from the project directory.

Run the unit tests:

```bash
node --test tests/*.test.mjs
```

The validation suite covers Actor Sheet and artwork permissions, keyboard shortcuts, Map Note resolution, Journal permissions, Journal Page opening, JavaScript syntax, and JSON validity.

## License

See [LICENSE](LICENSE).
