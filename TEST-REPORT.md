# Validation report

## Executed checks

| Check | Result |
| --- | --- |
| Pure rules, collision, loot and save tests | 21 passed, 0 failed |
| Real gameplay logic with explicit rendering/audio/UI doubles | 23 passed, 0 failed |
| Deterministic campaign simulation | Victory; 17 kills; level 5; 0 deaths |
| JavaScript syntax and local import / HTML asset checks | Passed |
| Real HTML/CSS and UI/input smoke scenarios (stubbed game interface) | 12 passed, no JavaScript errors |
| Node HTTP server, MIME types and file delivery | Passed |
| Missing-file request | Correctly returned 404 |
| Encoded path traversal request | Correctly returned 403 |
| Custom shader compile/link in supplied Chromium | Blocked: WebGL2 unavailable |
| Complete Three.js graphical run | Not performed |
| Windows batch launcher on Windows | Not performed |
| Real mobile touch and device performance | Not performed |

The campaign used seed 417 and Hunter/normal difficulty. It consumed
54.07 seconds of **simulated** time. Its automated
agent has exact state information and very fast decisions; that is **not a
human playtime estimate or a difficulty benchmark**. The simulation uses the
same collision layout and the actual `src/game.js` combat/progression code,
but replaces renderer/model/audio/input/UI services with explicit test doubles.
It cannot validate presentation, engine API compatibility, audio quality,
driver behaviour, or frame rate.

The tests cover the three-strike combo, real damage and ranged hits, extraction
conditions and capacity, summons/attacks/expiry, stat spending, equipping,
coffers, checkpoints, one-time blessings, reload, invulnerability, warning
windows, boss phases, death/retry, victory, Ascension and paused simulation.

Raw results are included in `tests/rules-results.tap`, `game-results.tap`,
`campaign-results.json`, `ui-results.json`, `server-results.json` and `shader-results.json`.
The shader result explicitly records the unavailable WebGL2 context rather
than reporting a false success.

## Runtime availability

The Three.js engine files could not be downloaded inside the build environment.
They are not hidden in the ZIP or replaced with a fake renderer. The supplied
Node/Python launchers download the actual pinned MIT-licensed Three.js 0.180.0
files on the user's machine; the browser has a pinned CDN fallback. Internet
is needed on first setup. All game-specific source and generated-asset
definitions are included.

## UI-only browser checks

The actual `UI` and `Input` source ran in Chromium with a stubbed game interface.
Twelve checks exercised starting a hunt, camera-relative movement, skill
shortcuts, the hunter record, Escape/pause, settings changes, mandatory reward
selection, controls help, right-drag orbit, on-screen skill buttons, joystick
drag/release and a landscape-phone record layout. The desktop title and
landscape mobile HUD were inspected **without a 3D background**. Overlapping
mobile HUD elements were corrected. These are not full rendering or physical
touch-device tests.

To rerun these optional checks, install Python Playwright and its Chromium:

```sh
python -m pip install playwright
python -m playwright install chromium
python tests/ui_check.py
```

`CHROMIUM_BIN` can point to an existing Chromium installation. Screenshots are
written to `tests/out/` and explicitly labelled as UI-only.

## Remaining validation

Run on a real WebGL2-capable browser and inspect the title and all three halls,
character poses, attack arcs, readable shadows, post-processing, boss warnings,
camera obstruction, touch controls, audio mix, and resource use across several
retries/Ascension runs. This is a small RPG prototype, not a production release.
