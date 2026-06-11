# POC plan — jw-mcenter (v2)

**POC definition (worded in CU-02's terms):** CU-01 + CU-02 end-to-end — add local files
(image, video, audio) → pick a monitor → open the presenter → advance/go back between media →
play/pause → end presentation → presenter dies with the master. The ±10s buttons get wired
(handlers already exist, it's free) but do **not** gate the milestone — "seek" appears nowhere
in the SRS.

**Working agreement:** every phase lands with its tests in the same commit; `npm test`
(type-check + unit + all Playwright projects) is green at every phase boundary; all JS carries
`// @ts-check` + JSDoc. No CI exists — every gate is convention-enforced, locally.

**Budget: 4–5 days.**

---

## Phase 0 — Test rig (~half day)

No app code changes.

1. **Introduce the `projects` array** in `playwright.config.mjs` (none exists today), with
   `testMatch` scoping so suites don't cross-run:
   - **`smoke`** — the existing three tests, unchanged config. Preserves the
     permission-*denied* coverage (real first-run behavior; only coverage of that path).
   - **`multiscreen`** — `--screen-info={1920x1080}{1920,0 1280x720}` (screen origin is
     **positional**: `left=` is not a valid named param and crashes Chrome at launch),
     `--autoplay-policy=no-user-gesture-required` (**required**, not belt-and-suspenders:
     Chrome 149 headless blocks audible autoplay by default — verified by live probe), and
     **`viewport: null`** (Playwright's default viewport emulation otherwise masks the
     primary screen's geometry in `getScreenDetails()`).
   - **`strict-autoplay`** — shares **only** the screen/permission args with multiscreen
     (`--screen-info`, `viewport: null`, CDP grant) and uses **exactly one** autoplay flag:
     `--autoplay-policy=document-user-activation-required`. Do **not** inherit multiscreen's
     `no-user-gesture-required` — flag order matters (live probe: strict-only blocks,
     no-gesture-then-strict blocks, but strict-then-no-gesture *allows*). Build the args
     list for this project from scratch, not by appending to multiscreen's.
2. **Permission fixture:** CDP `Browser.grantPermissions` with `['windowManagement']` — and it
   **must pass `browserContextId`** (omit it and the grant lands on the default context, not
   Playwright's; permission stays at `prompt`). Get the id via `Target.getTargets`.
   (Playwright's `grantPermissions` doesn't support this permission — merged 2024, reverted a
   week later, [#27198](https://github.com/microsoft/playwright/issues/27198) closed
   not-planned 2026-05-07.)
3. **Scope the `EXPECTED_NOISE` filter** (`test/smoke.spec.mjs:11`) to the smoke project — its
   `/permission/i` catch-all would mask genuinely unexpected permission errors in the granted
   projects.
4. **Media fixtures** in `test/fixtures/`: ~1s mp4, ~1s webm, short mp3, small png, one
   portrait-orientation image. (Playwright ≥1.57 bundles Chrome for Testing — H.264/AAC/MP3
   all play, including under this repo's `channel: 'chrome'`. Playwright's default
   `--mute-audio` doesn't affect `currentTime`.)
5. **Unit-test mechanism:** `test/unit/*.test.mjs` run by `node --test`. Extracted pure
   modules are dependency-free **`.mjs`** files — `.mjs` avoids package-type ambiguity and
   Node's typeless-module reparse/warnings, since package.json has no `"type": "module"`
   (Node 26 does reparse ESM syntax in typeless `.js`, but explicit `.mjs` removes the
   ambiguity entirely). New scripts: `"test:unit": "node --test test/unit/"` and the gate
   made **explicit**: `"test": "npm run check && npm run test:unit && playwright test"`.
   Do **not** rely on `pretest` — this machine has `npm config ignore-scripts = true`, so
   lifecycle scripts silently don't run and plain `npm test` would skip check + units
   (verified: it ran only Playwright). The existing `pretest` entry should be removed or
   left as a no-op duplicate, never load-bearing.
6. Document **Chrome ≥ 142** as the minimum for `--screen-info` (`channel: 'chrome'` uses the
   unpinned local install).

**Exit canary (respecified to what the UI actually does):** `getScreenDetails()` resolves with
2 screens; the monitor `<select>` contains the `ninguno` placeholder plus exactly one
selectable option — assert `#monitorSelect option:not([value=""])` has count `1`, value `"1"`,
text `"2"` (the browser's own screen is excluded by `renderAvailableMonitorsSelect`, and the
label is a screen *index*, not a resolution); click "Información de monitores" to open the
`[popover]`, then assert the legend table has two rows with the two configured resolutions.

---

## Phase A — Bus hardening (~2–3h) — *pulled before the command wiring*

Land this **before** Phase C ships transport buttons, or the worker stores their commands and
replays them into the next presenter — a user-visible ghost-command bug living exactly in the
gap between phases.

1. **Transient/stateful channel split** in `src/js/shared-worker.mjs`: `update_media` stays
   stateful (replay-to-new-ports is the catch-up feature the E2E depends on); `play`, `pause`,
   `fast_forward`, `rewind`, `ping`, `pong`, `media_time_update` become transient (never
   stored). Action codes + the transient set move to a dependency-free sibling `.mjs` imported
   relatively by both worker and bridge (per CONTRIBUTING's worker-import rule) — which also
   makes them unit-testable (the worker module itself dereferences `self` at top level and
   can't be imported under Node).
2. **Port lifecycle fixes** while the worker is open: bridge sends `{type:'disconnect'}` on
   `pagehide` (today the worker's disconnect branch is dead code — `postMessage` to closed
   ports never throws, so every Terminar→Iniciar cycle leaks a port), and fix the onconnect
   replay loop so a failed port stops receiving the remaining codes after `removePort`.
3. Control panel (in Phase C) resends a fresh `update_media` on every Iniciar, overwriting
   stale blob URLs from a previous page load.

**Tests:** regression aimed at what the split actually changes (presenter `autoplay = true`
makes "no ghost play" unobservable): close-while-**paused** → reopen → presenter is *not*
stuck paused; stale `fast_forward` is not re-applied. Unit test of the transient/stateful
classification via the shared codes module.

---

## Phase B — Presenter extraction (~1h) — *pulled before the command wiring*

Extract the inline module from `presentation.html` to `src/js/presentation.js` with
`// @ts-check` + JSDoc, covered by `npm run check`. Delete the `webkitRequestFullscreen` /
`msRequestFullscreen` fallbacks now, so their type-casts never get written (REQ-SW-05 forbids
them anyway). Phase C touches presenter behavior (toggle semantics), so this must come first —
otherwise we're editing unchecked inline HTML, violating the working agreement.

**Exit:** existing presenter smoke test still green; `npm run check` covers the new file.

---

## Phase C — Control panel media commands (~1.5 days, the core gap)

1. IDs for the anonymous transport buttons in `index.html`: `#endPresentationBtn`,
   `#prevMediaBtn`, `#nextMediaBtn`, `#rewindBtn`, `#fastForwardBtn`, `#playPauseBtn`.
2. **Track the current item by `FileItem` object reference, not integer index.** The playlist
   is drag-sortable with wraparound moves and mid-presentation delete/duplicate (CU-01 step 3 /
   REQ-FM-02 — not an edge case). A clamped integer points at the *wrong item* after any
   reorder or delete-before. Diffing emissions can't save it either: `intentToRemoveFile$` and
   `moveFile` mutate the current array in place before emitting a copy. All mutation paths
   preserve item identity, so: hold the current `FileItem` reference, derive the index per
   emission via `indexOf`, clamp only when the item is gone. Do **not** key on `id` —
   `Math.random()`-based, can collide.
3. **Gate Iniciar / the initial `update_media` on a non-empty playlist** — otherwise
   `mediaUrl: undefined` reaches the presenter's image fall-through and renders a broken
   `<img>`.
4. **Define toggle semantics:** presenter sets `autoplay = true` on every media swap, so reset
   the panel's play/pause toggle to "playing" on every `update_media` send. Without this:
   pause → Siguiente → media autoplays while the toggle says paused → next click sends the
   wrong command.
5. Map `detected` (`isImage`/…) → presenter `mediaType` (`image`/…). Prev/next clamped (not
   wrapped). Wire play/pause/±10s to their channels. Terminar → `presentationWindow.close()` +
   state reset. Disable Iniciar while a presenter is open — a UX decision we own (not
   REQ-US-02): the named `'presentation'` window means double-Iniciar *renavigates the live
   presenter*.
6. **Decide `moveFile` semantics first** — the current "wraparound" is a swap (item 0 moved up
   swaps with the last item), not a rotate — before unit tests enshrine it.

**Tests:**
- `node --test` units for the extracted reducers: current-item derivation under reorder /
  delete-before / delete-current, prev/next bounds, media-type mapping, the move semantics as
  decided.
- **Money E2E** (multiscreen): add video + audio + image fixtures → select the secondary
  monitor → Iniciar → capture popup (`context.waitForEvent('page')`, then `waitForLoadState()`
  — no `waitForTimeout` copying) → video `duration > 0` and `currentTime` advances (blob URL
  crossed windows through the real SharedWorker) → pause, assert frozen → Siguiente → **audio
  leg**: `currentTime` advances (cheapest, least-flaky time assertion; REQ-FM-01/REQ-PC-04/
  REQ-CW-03 all bind audio; assert via attached element/evaluate, not visibility, because the
  presenter audio element has no controls and lays out hidden) → Siguiente → image swapped in
  → Terminar → window closed.
- **Placement:** presenter `window.screenX ≥ 1920` (cross-screen `window.open` under emulation
  is verified to honor coordinates).

---

## Phase D — Lifecycle feedback (~half day)

1. **One `presenterAlive$`** derived from the existing 2s ping interval in
   `presentation-manager.js` — don't add a duplicate 1s `.closed` poll. It drives ping gating
   *and* button state: transport buttons disabled when no presenter; Iniciar disabled while
   one is open.
2. Playback-time display in the panel fed from `mediaTimeUpdateChannel` (REQ-CW-03; presenter
   already emits every 200ms).

**Tests:** close presenter page → panel buttons flip (REQ-CW-02), fast/untagged. Close the
*panel* page → presenter self-closes via the orphan timeout — effective close is **5–6s**
(5000ms threshold polled at 1s); assert `< 8s`, tagged `@slow`, deliberately unmocked. Time
display advances during video playback.

---

## Phase E — Presenter correctness (~2–3h)

1. **Aspect ratio (REQ-UI-07):** portrait media currently crops (`width:100%; height:auto`
   inside `overflow:hidden` makes the existing `object-fit: contain` inert) →
   `max-width:100%; max-height:100%; object-fit:contain`; drop the duplicated inline styles in
   `updateMediaElement`.
2. **Media `error` handler → `#statusMessage`.** The worker survives a panel reload while the
   presenter holds it, so a dead blob URL can still arrive; today that renders silently broken
   media. Same shape as item 3.
3. **Autoplay degradation + gesture retry:** after setting/swapping media, the presenter must
   **explicitly call `element.play()` and catch its rejection** — merely setting
   `element.autoplay = true` (the current code) yields no promise to catch, so the blocked
   state would be undetectable. On rejection → "haz clic en la ventana de presentación" in
   `#statusMessage` **and store a pending-play flag**. The overlay
   click handler must then call `currentMediaElement.play()` inside the gesture, in addition
   to requesting fullscreen — today the overlay only requests fullscreen
   (`presentation.html:210`), and a live strict-policy probe confirmed blocked media stays
   paused after a click unless `play()` is explicitly re-invoked from the handler. Without
   this retry, the degradation message is a dead end and the strict-autoplay test below
   cannot pass.

**Tests:** portrait fixture's rendered box fits the viewport. **Strict-autoplay project** (the
rig has monitors + the grant, so the flow can actually start through the UI — this test cannot
live in the smoke project, where the monitor select is empty): start a video presentation
without clicking the presenter → status message appears and media is paused; click the
fullscreen overlay → poll `document.fullscreenElement` (don't assert immediately) → the
pending-play retry fires and `currentTime` starts advancing; overlay hides and reshows on
`fullscreenchange`.

---

## Phase F — Close-out gate (~2h)

1. **`TESTING.md`:** manual pre-meeting checklist — presenter on the physical projector
   (EDID/scaling), fullscreen on a real secondary display, 1080p decode on the venue laptop
   (REQ-PF-02), OS display reconfiguration mid-presentation, and **REQ-PF-03**: media-to-media
   navigation feels < 1s. Document **Chrome ≥ 142** minimum and that all gates are local
   convention (no CI).
2. Full gate: `npm test` green — where `"test"` itself runs
   `npm run check && npm run test:unit && playwright test` explicitly (lifecycle scripts
   don't run under this machine's `ignore-scripts = true`); one manual-checklist run on real
   dual-monitor hardware as POC acceptance.
3. README: update "Estado del Proyecto" **and fix line 21**, which claims offline PWA
   capability while the service worker is unregistered dead code.

`src/service-worker.js` stays parked until the post-POC PWA phase.

---

## Deferred post-POC

Default media libraries (§3.2.6) · configuration/playlist persistence (REQ-OF-07 — *config and
playlists*, not media libraries; needs design, blob URLs don't survive reloads) · service
worker activation/offline · sidebar library UI · live screen-hotplug handling (REQ-SM-05..07 —
the rig already supports it via CDP `Emulation.addScreen`/`removeScreen`, verified working,
headless-only/experimental) · responsive/dark-mode/i18n polish.

## Order and shape

```
Phase 0  rig: projects array, --screen-info (positional), CDP grant
         (browserContextId!), viewport:null, fixtures, node --test wiring → canary
Phase A  transient/stateful split + disconnect + replay-loop fix      → re-aimed regression
Phase B  presentation.js extraction (before any presenter edits)      → smoke still green
Phase C  panel sends commands; item-ref tracking; toggle semantics    → money E2E (3 media
                                                                          types) + placement + units
Phase D  presenterAlive$ drives pings + buttons; time display         → CW-02 + @slow CW-05
Phase E  contain fix, media error handler, autoplay degradation       → portrait + strict-policy
Phase F  TESTING.md, full gate, README (incl. line 21), real hardware → POC accepted
```

0 → A → B → C → D → E → F. A and B are deliberately *before* C: A closes the ghost-command
window that would otherwise exist on main between phases, B prevents editing unchecked inline
HTML. Every phase boundary leaves main shippable.
