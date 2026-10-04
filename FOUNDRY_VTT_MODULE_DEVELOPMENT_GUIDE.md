# Foundry VTT Module Development Guide

This document is a reusable, project-independent baseline for designing, implementing, testing, documenting, packaging, and publishing an add-on module for Foundry Virtual Tabletop (Foundry VTT).

It intentionally contains no feature decisions for a specific module. Replace these placeholders when applying it to a new project:

- `<module-id>`: the permanent package identifier
- `<repository-owner>`: the GitHub owner or organization
- `<repository-name>`: the repository name
- `<system-id>`: an optional system identifier

The examples target the Foundry VTT 14 API family. Always verify the exact target build and current API documentation before release.

## 1. Foundry package fundamentals

Foundry packages are distributed as manifests and versioned releases. The main package types are:

- **World**: a complete game world and its world data.
- **Game System**: rules, sheets, documents, configuration, and related game functionality.
- **Add-on Module**: optional functionality or content that can be enabled in a world.

This guide concerns add-on modules. A module needs its own directory and a valid `module.json` manifest at its root. The directory name and manifest `id` must match exactly.

Package identity rules:

- Use a unique, stable, lower-case, hyphenated ID.
- Do not change the ID after publication.
- Do not include a version in the ID.
- Keep repository, manifest, and release naming consistent.
- Do not use private or temporary URLs in a public package manifest.

## 2. Decisions before implementation

Record these decisions before writing feature code:

| Topic | Decision to record |
|---|---|
| Purpose | What problem does the module solve? |
| Package type | Add-on module, system, or world? |
| Core target | Minimum, verified, and optionally maximum compatible Foundry versions |
| System scope | System-independent, system-specific, or system-adaptive |
| User scope | Client-only, world setting, GM-only, or mixed |
| Entry points | Scene controls, settings, keybindings, menus, hooks, API |
| State | Persistent settings, transient UI state, cached data, or none |
| Visibility | What each user may see or interact with |
| Dependencies | Required and optional packages, libraries, and versions |
| Languages | Base language, included translations, and fallback behavior |
| Assets | Ownership, licenses, formats, paths, and fallbacks |
| Release model | Free, premium, release cadence, support channel |
| Compatibility | Supported core versions, systems, browsers, and known limitations |

A feature is not complete until its permissions, visibility rules, failure behavior, localization, documentation, and release impact are defined.

## 3. Recommended project structure

```text
<module-id>/
├── module.json
├── README.md
├── CHANGELOG.md
├── LICENSE
├── scripts/
│   ├── main.js
│   ├── settings.js
│   └── ui.js
├── styles/
│   └── module.css
├── templates/
├── lang/
│   ├── en.json
│   └── de.json
├── assets/
└── tests/
```

Keep the manifest at the package root. Use relative paths from that root. Separate runtime code, styles, templates, localization, and tests. Do not ship credentials, local configuration, or unnecessary development output.

## 4. The `module.json` manifest

### 4.1 Required fields

At minimum, an add-on module needs:

- `id`
- `title`
- `description`
- `version`

The manifest is machine-read, so valid JSON is mandatory: no comments, trailing commas, or Markdown syntax.

### 4.2 Generic manifest example

Replace every placeholder and remove fields that do not apply:

```json
{
  "id": "<module-id>",
  "title": "Example Module",
  "description": "A concise description of the module's purpose and primary features.",
  "version": "1.0.0",
  "compatibility": {
    "minimum": "14",
    "verified": "14.367"
  },
  "authors": [
    {
      "name": "<author-name>",
      "email": "<author-email>",
      "url": "https://github.com/<repository-owner>/<repository-name>"
    }
  ],
  "url": "https://github.com/<repository-owner>/<repository-name>",
  "manifest": "https://raw.githubusercontent.com/<repository-owner>/<repository-name>/main/module.json",
  "download": "https://github.com/<repository-owner>/<repository-name>/releases/download/v1.0.0/<module-id>.zip",
  "readme": "https://github.com/<repository-owner>/<repository-name>/blob/main/README.md",
  "license": "LICENSE",
  "bugs": "https://github.com/<repository-owner>/<repository-name>/issues",
  "changelog": "https://github.com/<repository-owner>/<repository-name>/releases",
  "esmodules": ["scripts/main.js"],
  "styles": ["styles/module.css"],
  "languages": [
    {
      "lang": "en",
      "name": "English",
      "path": "lang/en.json"
    }
  ]
}
```

Rules:

- Keep `id` identical to the package folder name.
- Use a SemVer version without a leading `v` in JSON, for example `1.0.0`.
- Use `v1.0.0` only for a Git tag and release URL when that is the chosen convention.
- Prefer `esmodules` for modern JavaScript.
- Declare real dependencies in `relationships`; feature-detect optional integrations.
- Use stable HTTPS URLs.
- Keep the main manifest URL stable while changing its version and release URL for each release.
- Validate JSON before committing and after packaging.

## 5. Compatibility and versioning

`compatibility.minimum` is the lowest supported core version; `verified` is the newest version actually tested. Use `maximum` only for a known upper-bound incompatibility. Do not claim a verified version merely because the manifest parses.

For Foundry VTT 14, replace deprecated APIs with their current equivalents. In particular, avoid the deprecated `Scene#background` accessor and use the current Level background and texture data. Deprecation warnings are migration work, not harmless noise.

Use Semantic Versioning:

- **Major**: breaking behavior, removal, or migration requirement.
- **Minor**: backward-compatible functionality.
- **Patch**: backward-compatible fixes, documentation, translations, or packaging corrections.

Each release needs a unique tag, matching manifest version, release notes, tested archive, and clear compatibility statement.

## 6. Architecture and lifecycle

Use the earliest lifecycle hook sufficient for the work:

- `init`: register settings, keybindings, sheets, menus, and configuration.
- `setup`: prepare data or integrations needed during setup.
- `ready`: access fully initialized game documents and services.
- `canvasReady`: initialize or refresh canvas-dependent state.
- `getSceneControlButtons`: add scene-control actions where appropriate.
- Document/placeable hooks: react to create, update, delete, refresh, and scene changes.

Keep hooks short and delegate to named, testable functions. A useful separation is:

1. **Integration**: Foundry hooks, settings, keybindings, and document access.
2. **Application**: windows, user interaction, lifecycle, and event handling.
3. **Domain**: visibility rules, filtering, coordinate conversions, and decisions.
4. **Rendering**: DOM, canvas, textures, markers, and visual state.
5. **Tests**: pure logic tests plus a manual Foundry matrix.

Prefer ES modules and explicit imports. Handle asynchronous failures explicitly. Clean up listeners, timers, animation frames, observers, and temporary objects after close or scene change. Evaluate Foundry's current `ApplicationV2` APIs for new UI work and document the selected approach.

## 7. Application and UI rules

- Keep state on the application instance or a dedicated state object.
- Bind handlers once and remove them during cleanup.
- Distinguish a full render from a lightweight redraw.
- Do not rerender a whole window on every pointer movement or animation frame.
- Debounce expensive refreshes when several events arrive together.
- Preserve user position and size unless auto-fitting is intentional.
- Make keyboard actions discoverable and avoid stealing input from editable fields.
- Use CSS for presentation and JavaScript for state and behavior.

For an auto-fitting view:

1. Read source dimensions.
2. Calculate available display dimensions.
3. Select one scale: `min(availableWidth / sourceWidth, availableHeight / sourceHeight)`.
4. Do not independently scale width and height.
5. Center the result and letterbox unused space.
6. Recalculate after source, container, or device-pixel-ratio changes.

## 8. Canvas, images, and coordinate systems

Most visual bugs come from mixing coordinate spaces. Name every conversion explicitly. Common spaces are source image pixels, Scene or Level dimensions, Foundry world coordinates, canvas coordinates after pan and zoom, CSS pixels, and canvas backing-buffer pixels.

Use one source of truth for map bounds. Do not infer an image ratio from current window dimensions or from an already scaled canvas.

### 8.1 Uniform aspect-ratio scaling

```js
const scale = Math.min(boxWidth / sourceWidth, boxHeight / sourceHeight);
const drawWidth = sourceWidth * scale;
const drawHeight = sourceHeight * scale;
const offsetX = (boxWidth - drawWidth) / 2;
const offsetY = (boxHeight - drawHeight) / 2;
```

Always derive both display dimensions from the same scale.

### 8.2 Canvas backing buffer

```js
const ratio = window.devicePixelRatio || 1;
canvas.style.width = `${cssWidth}px`;
canvas.style.height = `${cssHeight}px`;
canvas.width = Math.round(cssWidth * ratio);
canvas.height = Math.round(cssHeight * ratio);

const context = canvas.getContext("2d");
context.setTransform(ratio, 0, 0, ratio, 0, 0);
```

Keep pointer coordinates in CSS pixels and convert them into the same logical space used for drawing. Use `getBoundingClientRect()`, not assumptions about the element's origin.

### 8.3 Pointer conversion

```js
const rect = canvas.getBoundingClientRect();
const localX = clientX - rect.left;
const localY = clientY - rect.top;
const sourceX = (localX - offsetX) / scale;
const sourceY = (localY - offsetY) / scale;
```

Reject points outside the drawn image before resolving a placeable. Recompute the transform after every redraw so clicks and hovers cannot use stale dimensions.

## 9. Documents, placeables, and scene data

Use current document APIs and placeable objects rather than scraping rendered HTML. Store stable IDs or UUIDs when state must survive a refresh.

Common placeables include Tokens and Actors, Notes and Journal Entries, Tiles, Drawings, Regions, Walls, Ambient Lights, and Ambient Sounds.

For each placeable, define its source document, scene ownership, user visibility, coordinate origin, dimensions, refresh hooks, and missing-asset behavior.

For generic Map Notes, do not assume one data shape across all versions. In Foundry VTT 14, note data can include fields such as `entryId`, `pageId`, `iconSize`, `texture`, `x`, and `y), while the placeable can resolve its Journal Entry or page. Use current document and placeable APIs, and test notes with and without a page reference.

## 10. Permissions, visibility, and safety

Visibility is part of the feature specification, not merely rendering. Use Foundry's document permission model, for example:

```js
const canObserve = actor?.testUserPermission(
  game.user,
  CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER
);
```

Do not use only `isOwner`, `isAuthor`, `visible`, or `game.user.isGM) as a universal permission check. They answer different questions.

For every rendered object, decide separately:

- may the user know it exists?
- may the user see its position?
- may the user see its name or artwork?
- may the user interact with it?
- may the user open its document or sheet?
- may the GM see additional information?

Client-side filtering is not a security boundary. Do not send privileged data to a client merely because the UI intends to hide it. Test as GM, player with no ownership, Observer, Owner, and a user without access to the referenced document.

## 11. Fog of War and perception

Define how a map-related feature handles Token Vision and Exploration Mode:

- currently visible areas versus explored areas;
- GM unrestricted view versus player view;
- hidden tokens and placeables inside unrevealed space;
- refresh after sight, fog, token, scene, or permission changes;
- behavior when Token Vision is disabled;
- any approximation caused by sampling or canvas limitations.

Use current Foundry perception and fog APIs for the target core version. Do not treat a client-side opacity mask as a permission system. Safe default: do not reveal unexplored map areas, hidden placeables, private text, or private artwork to users who could not see them in the normal Foundry view.

If a setting intentionally changes this behavior, make it explicit, localize its warning text, define its default, and state whether it affects one client or the entire world.

## 12. Settings and keybindings

Register settings during `init` with namespaced, localized metadata:

```js
game.settings.register("<module-id>", "showFeature", {
  name: "MODULE.SETTINGS.ShowFeature.Name",
  hint: "MODULE.SETTINGS.ShowFeature.Hint",
  scope: "client",
  config: true,
  type: Boolean,
  default: false,
  onChange: value => {
    // Refresh only the affected UI.
  }
});
```

Use `client` for per-user preferences and `world` for shared world configuration. Document each setting's purpose, scope, default, valid values, permission, immediate effect, and migration behavior.

For keybindings, use a namespaced action, localized name and hint, explicit modifier behavior, input guards for editable fields, permission checks at invocation time, and tests for keyboard layouts and conflicting shortcuts.

## 13. Localization

Use namespaced keys and never hard-code user-facing text:

```js
const label = game.i18n.localize("MODULE.UI.ExampleLabel");
```

Declare language files in the manifest:

```json
"languages": [
  { "lang": "en", "name": "English", "path": "lang/en.json" },
  { "lang": "de", "name": "Deutsch", "path": "lang/de.json" }
]
```

Keep a complete base language, one stable key per meaning, valid JSON, and a fallback for missing translations. Translate settings, hints, buttons, tooltips, errors, dialogs, keybinding labels, and user-facing UI text. Test long strings, accents, plural forms, missing keys, and merged core/system/module translations. Document the actual supported languages; do not assume every Foundry language must be included.

## 14. Assets, dependencies, and licensing

Before release, verify:

- every image, icon, font, sound, and text asset may be redistributed;
- code, third-party code, and content have compatible licenses;
- paths work after installation;
- missing or unloaded assets have a fallback;
- required dependencies are declared;
- optional integrations are feature-detected;
- no private API, local path, token, or credential is shipped.

Prefer stable local assets for core functionality. If external resources are unavoidable, define failure behavior and avoid blocking the main UI on a remote request.

## 15. Testing and quality gates

### 15.1 Automated checks

```bash
for file in scripts/*.js scripts/*.mjs; do
  [ -e "$file" ] || continue
  node --check "$file"
done
```

```bash
node --test tests/*.test.mjs
```

```bash
node -e 'const fs=require("fs"); for (const f of process.argv.slice(1)) JSON.parse(fs.readFileSync(f,"utf8"));' module.json lang/*.json
```

Use the project's package manager and lockfile when a test runner or build tool is required. Keep the release artifact reproducible.

### 15.2 Recommended coverage

Test manifest parsing and version consistency, localization completeness, setting defaults and migrations, keybinding guards, permissions, missing documents/assets, coordinate conversion, pointer bounds, aspect-ratio preservation, minimum and maximum display sizes, empty and unusual dimensions, fog/perception transitions, and cleanup after close, scene change, and repeated initialization.

### 15.3 Manual Foundry matrix

Use the exact target core build in a clean world:

1. Install from the intended distribution path.
2. Enable only required modules and dependencies.
3. Test GM and several player permission levels.
4. Test normal and extreme scene dimensions.
5. Test missing, unloaded, transparent, and very large assets.
6. Test settings, keybindings, scene changes, document updates, and reloads.
7. Test Token Vision and Exploration Mode combinations where relevant.
8. Verify that hidden data is not exposed.
9. Close and reopen UI elements repeatedly.
10. Inspect the console for errors, failed loads, and deprecated API usage.

Do not mask known errors with broad `try/catch` blocks or ignore console warnings.

## 16. Documentation requirements

Every public module should include an English `README.md` with purpose, feature summary, supported Foundry versions, installation, activation and configuration, controls and keybindings, permissions and visibility, supported languages, dependencies, limitations, troubleshooting, support link, license and asset credits, and AI-assisted development disclosure where applicable.

The README must describe current behavior. Update it in the same change as a user-visible feature or compatibility change.

Release notes should state the release version and date, new features, fixes, compatibility changes, localization changes, migration actions, known limitations, and links to the full changelog or issue tracker.

## 17. GitHub and release packaging

### 17.1 Commit discipline

Use short, descriptive English commit messages in the imperative mood:

```text
Add Foundry package metadata
Fix aspect-ratio preservation for map rendering
Update supported core compatibility
Add localized labels
```

Keep unrelated changes separate. Inspect the diff, validate the manifest, run tests, and check release contents before committing.

### 17.2 Release workflow

1. Update manifest version and compatibility.
2. Update `README.md` and `CHANGELOG.md`.
3. Update the release-specific `download` URL.
4. Validate JSON and code.
5. Commit the release changes.
6. Create a tag such as `v1.0.0`.
7. Push the commit and tag.
8. Build the archive from the intended commit or tag.
9. Create the GitHub release and upload the archive.
10. Test the public manifest and download URLs.
11. Install or update from Foundry and repeat the manual matrix.

### 17.3 Archive structure

Foundry expects one top-level package directory matching the manifest ID:

```bash
git archive \
  --format=zip \
  --prefix=<module-id>/ \
  --output=/tmp/<module-id>.zip \
  v1.0.0
```

Expected structure:

```text
<module-id>/module.json
<module-id>/scripts/...
<module-id>/styles/...
```

Do not include `.git`, credentials, local settings, or unrelated files. Inspect the result:

```bash
unzip -l /tmp/<module-id>.zip
```

Keep the main manifest URL stable. Set `download` to the exact ZIP asset for each release. Do not point a stable manifest at a file that silently changes or can disappear.

## 18. Official package submission

Before submitting an add-on module to the official package listing, prepare an active Foundry VTT software license where required, a public source location, a stable manifest URL, at least one public installable release, a correctly structured ZIP, complete title/description/author data, compatibility information, release notes, documentation, license and asset rights, categories, and a support channel.

Typical submission fields include package type (Add-on Module), package ID, title, description, author/publisher information, repository/manifest/download/readme/issue URLs, current release, release notes URL, required and compatible core version, license, content rights, category, and support information.

The current package-management and publisher documentation is authoritative if submission fields or policies change.

## 19. Free and premium distribution

A free package normally provides a public manifest, public version entry, public download URL, and ordinary installation/update path.

A premium package may require Foundry-hosted protected distribution and an approved commercial arrangement. Do not label a package premium or use protected distribution without the required arrangement. Follow the current package schema and publisher guidance; do not expose paid assets through an unrestricted public ZIP.

## 20. AI-assisted development and maintainership

If AI assisted implementation, document it accurately and retain human responsibility. A suitable disclosure is:

> Parts of this module were created with AI assistance. The maintainer reviews, tests, maintains, develops, and supports the code and is responsible for its quality, compatibility, licensing, and continued development.

The maintainer must understand and review the code, verify claims against official documentation, test the actual core version, check security and permission behavior, verify asset rights and provenance, maintain migration guidance, and respond to compatibility changes and user reports.

## 21. Transferable development decisions

| Area | Binding decision |
|---|---|
| Identity | Permanent unique lower-case hyphenated package ID; folder and manifest ID match |
| Core target | Minimum and verified versions are stated and tested |
| Versioning | SemVer; manifest, tag, release, and archive agree |
| Scope | System-independent or explicitly restricted to named systems |
| UI | Supported application API is selected and documented |
| Entry points | Controls, settings, keybindings, hooks, and API are listed |
| Lifecycle | Initialization uses the earliest sufficient hook |
| Rendering | One coordinate model and one uniform aspect-ratio transform |
| Refresh | Document, canvas, scene, resize, and perception invalidators are defined |
| Permissions | Document ownership and action permissions are checked at invocation time |
| Visibility | Hidden and unexplored data is never revealed by convenience rendering |
| GM behavior | GM-only behavior is explicit and tested |
| Settings | Scope, default, migration, and immediate effect are documented |
| Keybindings | Namespaced, localized, conflict-aware, and input-safe |
| Localization | Base language, declared translations, fallback, and completeness are tested |
| Dependencies | Required packages are declared; optional packages are feature-detected |
| API stability | Deprecated APIs are replaced or a justified compatibility shim is documented |
| Assets | Rights, paths, fallbacks, and credits are recorded |
| Tests | Automated checks and the manual Foundry matrix pass |
| Releases | Manifest, archive, tag, release notes, and download URL agree |
| Documentation | README reflects current behavior and limitations |
| Licensing | Code, assets, content, and AI provenance are reviewed |
| Support | Issue tracker, contact path, and maintenance responsibility are clear |

## 22. New-project checklists

### Before implementation

- [ ] Package ID and repository name are fixed.
- [ ] Package type and supported core range are defined.
- [ ] System scope and dependencies are defined.
- [ ] Permission, visibility, and Fog of War behavior are defined.
- [ ] Settings, keybindings, and entry points are listed.
- [ ] Localization and supported languages are defined.
- [ ] Asset ownership and license are verified.
- [ ] Release and support model are chosen.

### Before feature completion

- [ ] Current Foundry APIs are used.
- [ ] No avoidable deprecation warnings remain.
- [ ] Coordinate conversion preserves the intended aspect ratio.
- [ ] Small, large, empty, missing, and unloaded inputs are handled.
- [ ] Document and placeable updates refresh the feature.
- [ ] Cleanup works after close, reload, and scene changes.
- [ ] GM and player permission tests pass.
- [ ] Localization keys and files are complete and valid.
- [ ] README and examples match behavior.

### Before the first release

- [ ] `module.json` is valid JSON.
- [ ] All manifest paths exist.
- [ ] Version and compatibility fields are correct.
- [ ] ZIP has the correct top-level directory.
- [ ] Release asset downloads from its public URL.
- [ ] Installation and update from the manifest were tested.
- [ ] Console errors, failed loads, and deprecation warnings were reviewed.
- [ ] Release notes and changelog are complete.

### Before official submission

- [ ] Package has a public installable release.
- [ ] Manifest URL is stable and reachable.
- [ ] Repository and issue tracker are accessible.
- [ ] License and content rights are documented.
- [ ] Package metadata is complete.
- [ ] Publisher and premium-content requirements, if applicable, are satisfied.

## 23. Official references

- [Module Development](https://foundryvtt.com/article/module-development/)
- [Modules](https://foundryvtt.com/article/modules/)
- [Module Maker](https://foundryvtt.com/article/module-maker/)
- [Package Management](https://foundryvtt.com/article/package-management/)
- [Package Release API](https://foundryvtt.com/article/package-release-api/)
- [Localization](https://foundryvtt.com/article/localization/)
- [Settings](https://foundryvtt.com/article/settings/)
- [Versioning](https://foundryvtt.com/article/versioning/)
- [Foundry VTT v14 API](https://foundryvtt.com/api/v14/)
- [Module Manifest API type](https://foundryvtt.com/api/v14/interfaces/foundry.packages.types.ModuleManifestData.html)
- [Foundry Packages](https://foundryvtt.com/packages/)
- [Publisher Handbook](https://foundryvtt.com/article/publisher-handbook/)
- [Licensing Guide](https://foundryvtt.com/article/licensing-guide/)
- [AI Content Policy](https://foundryvtt.com/article/ai-content-policy/)

When this guide conflicts with a newer official schema, API reference, package policy, or publisher instruction, follow the current official source and update the project documentation.
