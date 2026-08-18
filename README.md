# Mel-Minimap

Mel-Minimap is an add-on module for Foundry Virtual Tabletop 14.x. It displays the active Scene as a compact, movable overview map with token markers and a frame showing the current canvas viewport.

The module manifest targets Foundry VTT 14 and is verified with Foundry VTT 14.366.

## Features

- Displays the complete active Scene background using the original image aspect ratio.
- Uses a normal scale of 10% of the source image dimensions.
- Ensures a minimum of 300 pixels on the shorter map edge when this is compatible with the maximum size.
- Limits the outer minimap window to a maximum of 350 × 350 pixels. Large or extreme-aspect-ratio maps are scaled down proportionally.
- Preserves the map aspect ratio at all times; the map is never stretched.
- Starts with a 300 × 300 pixel window and adapts its content size automatically.
- Movable and minimizable Foundry `ApplicationV2` window.
- No manual resizing is required or enabled.
- Displays the Scene background and grid when enabled.
- Displays visible tokens using disposition colors:
  - Party: friendly tokens
  - Neutral: neutral tokens
  - Opposition: hostile tokens
  - Self: the controlled token or the token belonging to the user's character
- Highlights the user's own token with a white marker and blue outline.
- Shows the currently visible main-canvas area as a translucent white frame.
- Clicking the map centers the main canvas on the selected location without resizing the minimap.
- Redraws after Scene changes, canvas panning, zooming, token changes, visibility updates, and Fog of War updates.
- Opens and closes through the Scene Controls button or `Ctrl+M`.
- Provides settings for automatic opening and background rendering.

## Fog of War and token visibility

Mel-Minimap follows the active Scene's visibility state for non-GM users:

- Unexplored or currently invisible map areas are masked.
- Tokens inside masked areas are not displayed.
- Hidden or otherwise invisible tokens are not displayed to non-GM users.
- GMs can see hidden tokens; hidden GM-visible tokens are drawn with reduced opacity.

The Fog of War mask is sampled across the map for performance. Lighting, weather, animated effects, and video animation are not reproduced as a separate full Scene render.

## Installation

1. Copy this project folder into `Data/modules/` and keep the folder name `mel-minimap`.
2. Restart Foundry VTT.
3. Enable **Mel-Minimap** in the target World.
4. The minimap opens automatically when the World starts unless automatic opening has been disabled in the module settings.

When upgrading from an older development build with a different module ID, disable or remove the old build first. The current module ID is `mel-minimap`.

## Usage

Move the minimap window like any other Foundry window. Its map surface is fitted automatically to the source image while preserving the original aspect ratio.

Use one of the following controls to toggle the minimap:

- Click the Mel-Minimap button in the Scene Controls.
- Press `Ctrl+M`.
- Click anywhere inside the map to center the main canvas on that point.

Panning the main canvas changes only the viewport frame. It does not change the minimap size or scale.

## Localization

The module includes 37 localization files. The list contains the 24 official European Union languages previously supported by the module plus additional Foundry/community language codes.

| Code | Language | File |
|---|---|---|
| ar | العربية | `lang/ar.json` |
| bg | Български | `lang/bg.json` |
| ca | Català | `lang/ca.json` |
| ceb | Cebuano | `lang/ceb.json` |
| cs | Čeština | `lang/cs.json` |
| da | Dansk | `lang/da.json` |
| de | Deutsch | `lang/de.json` |
| el | Ελληνικά | `lang/el.json` |
| en | English | `lang/en.json` |
| es | Español | `lang/es.json` |
| et | Eesti | `lang/et.json` |
| eu | Euskara | `lang/eu.json` |
| fi | Suomi | `lang/fi.json` |
| fr | Français | `lang/fr.json` |
| ga | Gaeilge | `lang/ga.json` |
| gl | Galego | `lang/gl.json` |
| hi | हिन्दी | `lang/hi.json` |
| hr | Hrvatski | `lang/hr.json` |
| hu | Magyar | `lang/hu.json` |
| it | Italiano | `lang/it.json` |
| ja | 日本語 | `lang/ja.json` |
| ko | 한국어 | `lang/ko.json` |
| lt | Lietuvių | `lang/lt.json` |
| lv | Latviešu | `lang/lv.json` |
| mt | Malti | `lang/mt.json` |
| nl | Nederlands | `lang/nl.json` |
| pl | Polski | `lang/pl.json` |
| pt | Português | `lang/pt.json` |
| ro | Română | `lang/ro.json` |
| ru | Русский | `lang/ru.json` |
| sk | Slovenčina | `lang/sk.json` |
| sl | Slovenščina | `lang/sl.json` |
| sv | Svenska | `lang/sv.json` |
| th | ไทย | `lang/th.json` |
| tr | Türkçe | `lang/tr.json` |
| uk | Українська | `lang/uk.json` |
| zh | 中文 | `lang/zh.json` |

The legend uses the following localization keys in every language file:

- `MEL_MINIMAP.Legend.Party`
- `MEL_MINIMAP.Legend.Neutral`
- `MEL_MINIMAP.Legend.Opposition`
- `MEL_MINIMAP.Legend.Self`

## Technical structure

```text
mel-minimap/
├── module.json
├── README.md
├── lang/
│   ├── ar.json  ├── bg.json  ├── ca.json  ├── ceb.json
│   ├── cs.json  ├── da.json  ├── de.json  ├── el.json
│   ├── en.json  ├── es.json  ├── et.json  ├── eu.json
│   ├── fi.json  ├── fr.json  ├── ga.json  ├── gl.json
│   ├── hi.json  ├── hr.json  ├── hu.json  ├── it.json
│   ├── ja.json  ├── ko.json  ├── lt.json  ├── lv.json
│   ├── mt.json  ├── nl.json  ├── pl.json  ├── pt.json
│   ├── ro.json  ├── ru.json  ├── sk.json  ├── sl.json
│   ├── sv.json  ├── th.json  ├── tr.json  ├── uk.json
│   └── zh.json
├── scripts/minimap.js
└── styles/minimap.css
```

The module uses Foundry VTT's `ApplicationV2`, Hooks, Scene Controls, the Canvas API, and a dedicated HTML canvas. It does not modify the active Scene document or add a second PIXI layer to the main canvas.

## Validation

The module is checked for JavaScript syntax, valid JSON manifests and language files, complete localization keys, and the expected Foundry-isolated module load.

