# Workstream Execution Manifest

## Source

- Plan path: `/Users/joseph.montero/learning/jw-mcenter/PLAN.md`
- Repository path: `/Users/joseph.montero/learning/jw-mcenter`
- Base branch: `main`
- Manifest authoring mode: analysis-only; full plan read; read-only repository inspection performed; no edits, tests,
  branches, commits, or subagents.
- Planning assumptions:
    - `main` is the future integration base even though the local repo currently reports
      `main...origin/main [ahead 21]`.
    - `PLAN.md` is currently untracked; execution agent should preserve it unless explicitly asked to track/remove it.
    - File predictions are based on current repo structure: no build step, browser-run `src/`, Playwright tests under
      `test/`, app modules under `src/js/`.
    - All phase boundaries must leave `main` shippable and locally green.
    - Chrome local `channel: 'chrome'` is required; minimum Chrome is 142 for `--screen-info`.

## Original plan interpretation

### Intended outcome

Deliver the POC path for CU-01 + CU-02 end to end: add local image/video/audio files, select a secondary monitor, open
the presenter, advance/back through media, play/pause, wire ±10s transport commands, end the presentation, and ensure
the presenter dies when the control panel/master dies. ±10s wiring is required but does not gate the POC milestone.

### Deliverables

- Playwright project rig for smoke, multiscreen, and strict-autoplay flows.
- Local media fixtures and `node --test` unit-test harness.
- Hardened SharedWorker bus with stateful `update_media` and transient command/status channels.
- Extracted checked presenter module from `presentation.html`.
- Control panel transport controls, playlist-aware current-item tracking, startup gating, command wiring, and money E2E
  coverage.
- Presenter lifecycle feedback, button-state gating, and playback-time display.
- Presenter correctness fixes: contain aspect ratio, media error feedback, autoplay rejection handling, pending gesture
  retry.
- `TESTING.md` manual checklist and README status/offline correction.
- Final local `npm test` gate and real dual-monitor manual acceptance evidence.

### Acceptance criteria

- `npm test` explicitly runs `npm run check && npm run test:unit && playwright test`.
- Existing smoke coverage still includes first-run permission-denied behavior.
- Multiscreen canary proves `getScreenDetails()` sees two screens and UI excludes the browser screen from selectable
  monitors.
- Money E2E proves video, audio, image, pause/play, next navigation, presenter placement, and presenter close.
- Lifecycle tests prove presenter close updates panel controls and panel close kills presenter within `< 8s`.
- Strict-autoplay test proves blocked media surfaces actionable status, click retry calls `play()`, fullscreen state is
  polled, and playback resumes.
- Final README no longer claims active offline PWA behavior while service worker remains parked.

### Explicit constraints

- Phase 0 makes no app code changes.
- Every phase lands with relevant tests in the same commit or merge unit.
- All JS carries `// @ts-check` and JSDoc.
- Pure extracted modules for unit tests are dependency-free `.mjs`.
- No build step, bundler, transpiler, CDN, or service-worker activation.
- Do not rely on `pretest`; local npm has `ignore-scripts = true`.
- Worker imports must be relative; import maps do not apply inside workers.
- `--screen-info` syntax must be positional, not `left=...`.
- Strict-autoplay args must be built from scratch and must not inherit `no-user-gesture-required`.

### Implied constraints

- Avoid editing unchecked inline presenter behavior after extraction is available.
- Preserve object identity for playlist tracking; do not key current item by random `id`.
- Do not store transient worker commands or status messages for replay.
- Prefer deterministic tests over sleeps; avoid copying `waitForTimeout` into new E2E flows.
- Keep `src/service-worker.js` untouched except as documentation context.
- Treat browser autoplay and multi-screen behavior as integration risks, not unit-only behavior.

## Ambiguity and decision log

| ID    | Ambiguity or decision                                           | Impact | Recommendation                                                                                                                                                                       | Blocks execution?              |
|-------|-----------------------------------------------------------------|-------:|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|--------------------------------|
| A-001 | `moveFile` semantics: current wraparound is a swap, not rotate. |   High | Preserve and document current swap semantics for POC unless product owner explicitly wants rotate. Unit tests should encode the chosen behavior before command wiring depends on it. | No, if recommendation accepted |
| A-002 | Exact names/locations for pure reducer modules are unspecified. | Medium | Use dependency-free `.mjs` under `src/js/`, likely `presentation-state.mjs` and/or `media-command-state.mjs`, imported relatively.                                                   | No                             |
| A-003 | Media fixture generation method is unspecified.                 |    Low | Commit tiny deterministic fixtures under `test/fixtures/`; use repo-local generation only if reproducible and documented.                                                            | No                             |
| A-004 | Playback-time display format is unspecified.                    |    Low | Use a compact stable format such as `0:03 / 0:12`; test behavior, not ornamental formatting.                                                                                         | No                             |
| A-005 | Strict-autoplay status copy is partly specified in Spanish.     | Medium | Use text containing `haz clic en la ventana de presentación`; tests can assert a stable regex.                                                                                       | No                             |
| A-006 | Manual hardware acceptance cannot be automated.                 | Medium | `TESTING.md` must define checklist; execution evidence should record who ran it, date, hardware, and pass/fail notes.                                                                | No                             |
| A-007 | Whether docs may be drafted before implementation completes.    |    Low | Draft `TESTING.md` early; delay README status/final gate evidence until all implementation streams are merged.                                                                       | No                             |

## Workstream map

| Stream ID | Stream name             | Purpose                                                                                  | Tasks               | Dependencies                                  | Parallelization                                                      | Conflict risk |
|-----------|-------------------------|------------------------------------------------------------------------------------------|---------------------|-----------------------------------------------|----------------------------------------------------------------------|---------------|
| WS-01     | Test rig foundation     | Create local gates, Playwright projects, CDP permission fixture, fixtures, canary.       | T-001, T-002, T-003 | None                                          | Must run first; tasks mostly sequential.                             | medium        |
| WS-02     | Shared bus hardening    | Prevent ghost commands and leaked ports before transport wiring lands.                   | T-004, T-005        | WS-01                                         | Can run in parallel with WS-03 after WS-01 if worktrees used.        | medium        |
| WS-03     | Presenter extraction    | Move inline presenter module into checked JS before behavior edits.                      | T-006               | WS-01                                         | Can run in parallel with WS-02, then merge before WS-04.             | medium        |
| WS-04     | Control command core    | Wire panel controls, playlist state, commands, startup/end behavior, money E2E.          | T-007, T-008, T-009 | WS-01, WS-02, WS-03                           | Sequence internally; high shared-state risk.                         | high          |
| WS-05     | Lifecycle feedback      | Derive alive state, gate buttons, show playback time, prove master/slave close behavior. | T-010, T-011        | WS-04                                         | Can run parallel with WS-06 only with worktrees; otherwise sequence. | medium        |
| WS-06     | Presenter correctness   | Fix aspect ratio, media error feedback, autoplay degradation/retry, strict-policy tests. | T-012, T-013        | WS-03, WS-04                                  | Can run parallel with WS-05 using worktrees.                         | medium        |
| WS-07     | Close-out docs and gate | Manual checklist, README correction, final local and hardware acceptance.                | T-014, T-015        | T-001 initially; final depends on all streams | `TESTING.md` can draft early; final gate must be last.               | low           |

## Execution topology

Recommended order:

1. Run WS-01 first. It defines the test boundary all later work relies on.
2. After WS-01 is green, WS-02 and WS-03 may run in parallel in separate branches/worktrees. Merge WS-02 before WS-04 to
   close the ghost-command window; merge WS-03 before any presenter behavior edits.
3. Run WS-04 as one sequenced integration stream. Do not split command wiring across concurrent branches because
   `presentation-manager.js`, bridge channels, playlist state, and E2E tests will churn together.
4. After WS-04, WS-05 and WS-06 may run in parallel if speed matters. Use worktrees and merge through explicit
   integration checkpoints because both depend on presenter/control behavior.
5. WS-07 can draft `TESTING.md` early, but README status and final gate evidence must wait until all implementation
   streams are merged.
6. Integration checkpoints:
    - After WS-01: `npm test` green with new explicit gate.
    - After WS-02: unit/regression tests prove transient messages are not replayed.
    - After WS-03: smoke presenter test and `npm run check` cover extracted module.
    - After WS-04: money multiscreen E2E and placement pass.
    - After WS-05: lifecycle and time-display tests pass.
    - After WS-06: portrait and strict-autoplay tests pass.
    - After WS-07: full `npm test` plus manual dual-monitor checklist evidence.

## Task inventory

### T-001: Playwright Project Rig

- Stream: WS-01
- Type: test infrastructure
- Objective: Introduce Playwright `projects` for `smoke`, `multiscreen`, and `strict-autoplay` with correct scoping and
  browser args.
- Relevant plan excerpts: “Introduce the `projects` array”; smoke preserves permission-denied coverage; multiscreen uses
  positional `--screen-info`, `--autoplay-policy=no-user-gesture-required`, `viewport: null`; strict uses only strict
  autoplay flag.
- Expected files or areas: `/Users/joseph.montero/learning/jw-mcenter/playwright.config.mjs`, possibly
  `test/**/*.spec.mjs`.
- Dependencies: none.
- Recommended delegate: GPT-5.4
- Reasoning effort: medium
- Risk level: medium
- Conflict risk: medium
- Git strategy: feature branch
- Suggested branch or worktree: `orchestrator/T-001-playwright-projects`
- Parallelization: none; foundation task.
- Acceptance criteria: Project names and `testMatch` prevent suite cross-run; strict args are built independently; smoke
  still runs existing tests.
- Validation: `npx playwright test --list`; targeted smoke run; inspect effective config if needed.
- Boundaries: No app code changes.
- Subagent brief seed: “Implement Playwright project segmentation exactly per PLAN.md Phase 0, preserving smoke behavior
  and using correct multiscreen/autoplay args.”
- Notes: Flag order matters. Do not derive strict args by appending to multiscreen args.

### T-002: Fixtures And Unit Harness

- Stream: WS-01
- Type: test infrastructure
- Objective: Add media fixtures and explicit `node --test` unit harness into the local test gate.
- Relevant plan excerpts: “Media fixtures in `test/fixtures/`”; “New scripts: `test:unit` and explicit `test` gate”;
  remove or neutralize load-bearing `pretest`.
- Expected files or areas: `/Users/joseph.montero/learning/jw-mcenter/package.json`,
  `/Users/joseph.montero/learning/jw-mcenter/test/fixtures/`, `/Users/joseph.montero/learning/jw-mcenter/test/unit/`.
- Dependencies: T-001 preferred but not strict.
- Recommended delegate: GPT-5.4-Mini
- Reasoning effort: low
- Risk level: low
- Conflict risk: low
- Git strategy: same feature branch as WS-01 or `orchestrator/T-002-fixtures-unit-harness`
- Suggested branch or worktree: `orchestrator/T-002-fixtures-unit-harness`
- Parallelization: can run after T-001 config shape is known.
- Acceptance criteria: `npm run test:unit` exists and succeeds before later unit tests are added; `npm test` explicitly
  chains check, unit, Playwright; fixtures include mp4, webm, mp3, small png, portrait image.
- Validation: `npm run test:unit`; `npm test` after T-003.
- Boundaries: No app code changes; no dependency upgrade unless unavoidable.
- Subagent brief seed: “Add deterministic tiny media fixtures and update package scripts so `npm test` explicitly runs
  check, unit tests, and Playwright without relying on lifecycle scripts.”
- Notes: If generating fixtures, record command or provenance in a short comment/doc only if useful.

### T-003: Multiscreen Permission Canary

- Stream: WS-01
- Type: Playwright integration test
- Objective: Add CDP window-management permission fixture and the Phase 0 exit canary.
- Relevant plan excerpts: CDP `Browser.grantPermissions` must pass `browserContextId`; canary asserts two screens, one
  selectable monitor option with value `1`, text `2`, and legend rows.
- Expected files or areas: `/Users/joseph.montero/learning/jw-mcenter/test/`,
  `/Users/joseph.montero/learning/jw-mcenter/test/smoke.spec.mjs`.
- Dependencies: T-001, T-002.
- Recommended delegate: GPT-5.4
- Reasoning effort: medium
- Risk level: medium
- Conflict risk: medium
- Git strategy: same WS-01 feature branch
- Suggested branch or worktree: `orchestrator/T-003-multiscreen-canary`
- Parallelization: sequence after T-001.
- Acceptance criteria: Permission grant lands on Playwright context; `EXPECTED_NOISE` masking is scoped to smoke only;
  granted projects fail on real unexpected permission errors.
- Validation: `npx playwright test --project=multiscreen`; full `npm test`.
- Boundaries: Do not alter production permission flow to satisfy tests.
- Subagent brief seed: “Create the CDP permission fixture and multiscreen canary that proves the UI sees two screens and
  exposes only the non-browser monitor.”
- Notes: Use `Target.getTargets` to obtain the correct `browserContextId`.

### T-004: Shared Bus Action Contract

- Stream: WS-02
- Type: shared contract and unit-testable extraction
- Objective: Move action codes and transient/stateful classification into a dependency-free `.mjs` module imported by
  bridge and worker.
- Relevant plan excerpts: `update_media` stateful; `play`, `pause`, `fast_forward`, `rewind`, `ping`, `pong`,
  `media_time_update` transient.
- Expected files or areas: `/Users/joseph.montero/learning/jw-mcenter/src/js/shared-worker.mjs`,
  `/Users/joseph.montero/learning/jw-mcenter/src/js/shared-worker-bridge.js`, new
  `/Users/joseph.montero/learning/jw-mcenter/src/js/*codes*.mjs`,
  `/Users/joseph.montero/learning/jw-mcenter/test/unit/`.
- Dependencies: WS-01.
- Recommended delegate: GPT-5.4
- Reasoning effort: medium
- Risk level: medium
- Conflict risk: medium
- Git strategy: feature branch; worktree only if parallel with T-006.
- Suggested branch or worktree: `orchestrator/T-004-bus-contract`
- Parallelization: may run parallel with T-006 after WS-01.
- Acceptance criteria: Worker stores only stateful channels; transient classification has unit coverage; worker imports
  remain relative.
- Validation: `npm run check`; `npm run test:unit`.
- Boundaries: Do not import worker module directly in Node; it dereferences `self`.
- Subagent brief seed: “Extract bus action codes and transient/stateful policy into a pure `.mjs` module, then adapt
  bridge and worker without changing external channel names.”
- Notes: Keep exported names stable enough for later control wiring.

### T-005: Worker Port Lifecycle Fixes

- Stream: WS-02
- Type: reliability fix and regression tests
- Objective: Send bridge disconnect on `pagehide` and fix replay loop so removed ports stop receiving pending replays.
- Relevant plan excerpts: bridge sends `{type:'disconnect'}` on `pagehide`; failed replay port stops after `removePort`;
  close-while-paused reopen regression.
- Expected files or areas: `/Users/joseph.montero/learning/jw-mcenter/src/js/shared-worker.mjs`,
  `/Users/joseph.montero/learning/jw-mcenter/src/js/shared-worker-bridge.js`,
  `/Users/joseph.montero/learning/jw-mcenter/test/`.
- Dependencies: T-004.
- Recommended delegate: GPT-5.4
- Reasoning effort: medium
- Risk level: medium
- Conflict risk: medium
- Git strategy: same WS-02 feature branch
- Suggested branch or worktree: `orchestrator/T-005-worker-lifecycle`
- Parallelization: sequence after T-004.
- Acceptance criteria: No replay of stale `fast_forward`; presenter reopened after close-while-paused is not stuck
  paused; ports do not leak across Terminar/Iniciar cycles.
- Validation: targeted regression test; `npm test` at WS-02 merge.
- Boundaries: Do not make `update_media` transient; replay of current media is required.
- Subagent brief seed: “Fix SharedWorker port cleanup and replay failure handling, then add the regression proving stale
  commands are not replayed into a new presenter.”
- Notes: This must merge before transport buttons ship.

### T-006: Presenter Module Extraction

- Stream: WS-03
- Type: mechanical extraction with type coverage
- Objective: Extract inline presenter module to `src/js/presentation.js` with `// @ts-check` and JSDoc.
- Relevant plan excerpts: “Extract the inline module from `presentation.html`”; delete `webkitRequestFullscreen`/
  `msRequestFullscreen` fallbacks.
- Expected files or areas: `/Users/joseph.montero/learning/jw-mcenter/src/presentation.html`, new
  `/Users/joseph.montero/learning/jw-mcenter/src/js/presentation.js`.
- Dependencies: WS-01.
- Recommended delegate: GPT-5.4-Mini
- Reasoning effort: low
- Risk level: medium
- Conflict risk: medium
- Git strategy: feature branch; worktree if parallel with WS-02.
- Suggested branch or worktree: `orchestrator/T-006-presenter-extraction`
- Parallelization: can run parallel with WS-02 after WS-01.
- Acceptance criteria: Presenter behavior unchanged except forbidden legacy fallbacks removed; `npm run check` covers
  new file; presenter smoke remains green.
- Validation: `npm run check`; `npx playwright test --project=smoke`.
- Boundaries: Do not implement Phase C/E behavior changes here.
- Subagent brief seed: “Move the inline presenter module into checked `src/js/presentation.js`, preserve behavior,
  remove old fullscreen fallbacks, and keep smoke green.”
- Notes: This prevents later unchecked inline edits.

### T-007: Control DOM And Startup State

- Stream: WS-04
- Type: control-panel scaffolding
- Objective: Add IDs for transport buttons and implement safe startup/end state scaffolding.
- Relevant plan excerpts: IDs for anonymous buttons; gate Iniciar on non-empty playlist; Terminar closes presenter and
  resets state; disable Iniciar while presenter is open.
- Expected files or areas: `/Users/joseph.montero/learning/jw-mcenter/src/index.html`,
  `/Users/joseph.montero/learning/jw-mcenter/src/js/presentation-manager.js`, possibly
  `/Users/joseph.montero/learning/jw-mcenter/src/css/layout.css`.
- Dependencies: WS-02, WS-03.
- Recommended delegate: GPT-5.4
- Reasoning effort: medium
- Risk level: high
- Conflict risk: high
- Git strategy: feature branch, sequenced inside WS-04
- Suggested branch or worktree: `orchestrator/T-007-control-startup-state`
- Parallelization: do not run concurrently with T-008/T-009 unless execution agent accepts high integration churn.
- Acceptance criteria: Buttons have specified IDs; starting with empty playlist is blocked; double-Iniciar cannot
  renavigate live presenter; Terminar closes popup and resets local state.
- Validation: targeted Playwright test plus `npm run check`.
- Boundaries: Do not implement final money E2E until T-009.
- Subagent brief seed: “Add stable transport button IDs and safe presentation startup/end state without yet overreaching
  into full navigation command behavior.”
- Notes: Keep UI copy minimal and Spanish-consistent.

### T-008: Playlist Navigation State Reducers

- Stream: WS-04
- Type: pure state logic and unit tests
- Objective: Extract/test current-item derivation by `FileItem` object reference, prev/next bounds, media-type mapping,
  and chosen move semantics.
- Relevant plan excerpts: Track current item by object reference; derive index via `indexOf`; clamp only when item is
  gone; do not key on `id`; decide `moveFile` semantics first.
- Expected files or areas: `/Users/joseph.montero/learning/jw-mcenter/src/js/file-manager.js`, new pure `.mjs` under
  `/Users/joseph.montero/learning/jw-mcenter/src/js/`, `/Users/joseph.montero/learning/jw-mcenter/test/unit/`.
- Dependencies: WS-02, WS-03; A-001 decision.
- Recommended delegate: GPT-5.4
- Reasoning effort: medium
- Risk level: high
- Conflict risk: high
- Git strategy: same WS-04 feature branch
- Suggested branch or worktree: `orchestrator/T-008-playlist-navigation-state`
- Parallelization: sequence before T-009.
- Acceptance criteria: Unit tests cover reorder, delete-before, delete-current, prev/next clamping, media type mapping,
  and move semantics.
- Validation: `npm run test:unit`; `npm run check`.
- Boundaries: Do not change file-manager behavior unrelated to presentation state.
- Subagent brief seed: “Extract dependency-free navigation helpers and lock down playlist identity behavior with Node
  unit tests before wiring UI commands.”
- Notes: Existing `moveFile` mutates array then emits a copy; tests should reflect the accepted semantics, not
  accidental integer-index behavior.

### T-009: Transport Command Wiring And Money E2E

- Stream: WS-04
- Type: multi-file implementation and integration test
- Objective: Wire prev/next, play/pause, ±10s, media update, presenter popup capture, and placement.
- Relevant plan excerpts: Reset play/pause toggle to playing on every `update_media`; map detected media types;
  prev/next clamped; money E2E across video/audio/image; placement `screenX >= 1920`.
- Expected files or areas: `/Users/joseph.montero/learning/jw-mcenter/src/js/presentation-manager.js`,
  `/Users/joseph.montero/learning/jw-mcenter/src/js/shared-worker-bridge.js`,
  `/Users/joseph.montero/learning/jw-mcenter/src/js/presentation.js`, `/Users/joseph.montero/learning/jw-mcenter/test/`.
- Dependencies: T-007, T-008.
- Recommended delegate: GPT-5.4
- Reasoning effort: medium
- Risk level: high
- Conflict risk: high
- Git strategy: same WS-04 feature branch; sequence, not parallel.
- Suggested branch or worktree: `orchestrator/T-009-transport-money-e2e`
- Parallelization: none within WS-04.
- Acceptance criteria: Multiscreen E2E adds video/audio/image, selects monitor, opens popup, proves video time advances,
  pause freezes, audio advances, image swaps, Terminar closes window, placement is secondary screen.
- Validation: `npx playwright test --project=multiscreen`; full `npm test` at WS-04 checkpoint.
- Boundaries: Do not use `waitForTimeout` for popup readiness; use `context.waitForEvent('page')` and load/state
  assertions.
- Subagent brief seed: “Complete the core command wiring and write the money multiscreen E2E proving real SharedWorker
  media handoff and transport controls.”
- Notes: This is the core POC gap and highest integration-risk task.

### T-010: Presenter Alive State And Button Gating

- Stream: WS-05
- Type: lifecycle state management
- Objective: Derive one `presenterAlive$` from existing 2s ping interval and use it for ping gating and button
  enabled/disabled state.
- Relevant plan excerpts: “One `presenterAlive$`”; do not add duplicate 1s `.closed` poll; transport disabled when no
  presenter; Iniciar disabled while open.
- Expected files or areas: `/Users/joseph.montero/learning/jw-mcenter/src/js/presentation-manager.js`,
  `/Users/joseph.montero/learning/jw-mcenter/src/index.html`, tests under
  `/Users/joseph.montero/learning/jw-mcenter/test/`.
- Dependencies: WS-04.
- Recommended delegate: GPT-5.4
- Reasoning effort: medium
- Risk level: medium
- Conflict risk: medium
- Git strategy: git worktree if parallel with WS-06; otherwise feature branch.
- Suggested branch or worktree: `orchestrator/T-010-presenter-alive-state`
- Parallelization: can run parallel with T-012/T-013 after WS-04 using worktrees.
- Acceptance criteria: Closing presenter page flips panel button state quickly; ping behavior remains tied to the same
  alive state.
- Validation: targeted lifecycle Playwright test; `npm run check`.
- Boundaries: Do not introduce an independent polling source that can drift from ping logic.
- Subagent brief seed: “Introduce a single presenter-alive observable from existing ping supervision and use it
  consistently for pings and control enablement.”
- Notes: This will overlap conceptually with T-007 startup state; rebase carefully.

### T-011: Playback Time Display And Master-Close Test

- Stream: WS-05
- Type: UI feedback and lifecycle integration test
- Objective: Show playback time from `mediaTimeUpdateChannel` and prove presenter self-closes when panel closes.
- Relevant plan excerpts: Playback-time display fed every 200ms; close panel page → presenter self-closes after 5–6s,
  assert `< 8s`, tagged `@slow`.
- Expected files or areas: `/Users/joseph.montero/learning/jw-mcenter/src/index.html`,
  `/Users/joseph.montero/learning/jw-mcenter/src/js/presentation-manager.js`,
  `/Users/joseph.montero/learning/jw-mcenter/test/`.
- Dependencies: T-010.
- Recommended delegate: GPT-5.4
- Reasoning effort: medium
- Risk level: medium
- Conflict risk: medium
- Git strategy: same WS-05 branch/worktree
- Suggested branch or worktree: `orchestrator/T-011-time-display-master-close`
- Parallelization: sequence after T-010.
- Acceptance criteria: Time display advances during video playback; master close causes presenter close within `< 8s`;
  slow test is tagged.
- Validation: targeted multiscreen lifecycle tests; full `npm test` at WS-05 checkpoint.
- Boundaries: Do not mock orphan timeout for the required slow test.
- Subagent brief seed: “Add panel playback-time feedback from the existing media time channel and cover both time
  advancement and real master-close orphan shutdown.”
- Notes: Keep test timeouts deliberate, not arbitrary sleeps.

### T-012: Presenter Media Correctness

- Stream: WS-06
- Type: presenter behavior implementation
- Objective: Fix contain sizing, add media error status, and implement explicit autoplay `play()` with rejection
  handling and pending click retry.
- Relevant plan excerpts: `max-width:100%; max-height:100%; object-fit:contain`; media `error` handler →
  `#statusMessage`; call `element.play()` and catch rejection; overlay click retries pending play.
- Expected files or areas: `/Users/joseph.montero/learning/jw-mcenter/src/js/presentation.js`,
  `/Users/joseph.montero/learning/jw-mcenter/src/presentation.html`.
- Dependencies: WS-04; T-006 already merged.
- Recommended delegate: GPT-5.4
- Reasoning effort: medium
- Risk level: high
- Conflict risk: medium
- Git strategy: git worktree if parallel with WS-05; otherwise feature branch.
- Suggested branch or worktree: `orchestrator/T-012-presenter-media-correctness`
- Parallelization: can run parallel with WS-05 after WS-04.
- Acceptance criteria: Portrait media fits viewport without crop; dead media URL surfaces status; autoplay rejection
  message appears; click overlay requests fullscreen and retries `play()`.
- Validation: `npm run check`; targeted presenter tests from T-013 before merge.
- Boundaries: Do not reintroduce legacy fullscreen fallbacks; do not activate service worker.
- Subagent brief seed: “Implement presenter media correctness: contain sizing, media load error feedback, explicit
  autoplay promise handling, and gesture retry on overlay click.”
- Notes: Do not merge implementation without T-013 tests because Phase E requires tests with the change.

### T-013: Portrait And Strict-Autoplay Tests

- Stream: WS-06
- Type: Playwright integration tests
- Objective: Add portrait rendering and strict-autoplay coverage in the correct project.
- Relevant plan excerpts: Strict-autoplay test cannot live in smoke; start video without clicking presenter, status
  appears, media paused; click overlay, poll fullscreen, pending retry advances time.
- Expected files or areas: `/Users/joseph.montero/learning/jw-mcenter/test/`,
  `/Users/joseph.montero/learning/jw-mcenter/test/fixtures/`.
- Dependencies: T-012, T-001, T-003.
- Recommended delegate: GPT-5.4
- Reasoning effort: medium
- Risk level: medium
- Conflict risk: medium
- Git strategy: same WS-06 branch/worktree
- Suggested branch or worktree: `orchestrator/T-013-strict-autoplay-tests`
- Parallelization: sequence after T-012 implementation.
- Acceptance criteria: Portrait rendered box fits viewport; strict-autoplay flow proves blocked autoplay recovery after
  overlay click; overlay hide/reshow follows `fullscreenchange`.
- Validation: `npx playwright test --project=strict-autoplay`; relevant multiscreen portrait test; full `npm test` at
  WS-06 checkpoint.
- Boundaries: Do not weaken strict project args to make autoplay pass.
- Subagent brief seed: “Write the portrait and strict-autoplay Playwright tests against the real UI and strict browser
  policy, proving degradation and retry behavior.”
- Notes: Poll `document.fullscreenElement`; do not assert fullscreen synchronously.

### T-014: Manual Testing Checklist

- Stream: WS-07
- Type: documentation
- Objective: Add `TESTING.md` with manual pre-meeting checklist and local-gate expectations.
- Relevant plan excerpts: Physical projector, fullscreen on real secondary display, 1080p decode, OS display
  reconfiguration, media navigation feels `< 1s`, Chrome ≥142, no CI.
- Expected files or areas: new `/Users/joseph.montero/learning/jw-mcenter/TESTING.md`.
- Dependencies: T-001 for accurate test command docs; can draft before implementation completion.
- Recommended delegate: GPT-5.4-Mini
- Reasoning effort: low
- Risk level: low
- Conflict risk: none
- Git strategy: feature branch or same WS-07 branch
- Suggested branch or worktree: `orchestrator/T-014-testing-checklist`
- Parallelization: can run while later implementation streams proceed, but final wording should be reviewed after all
  tests exist.
- Acceptance criteria: Checklist covers all specified hardware/manual cases and explains local convention gates.
- Validation: documentation review against PLAN.md and final scripts.
- Boundaries: Do not claim CI exists.
- Subagent brief seed: “Create `TESTING.md` with the manual POC acceptance checklist and local test-gate instructions
  from Phase F.”
- Notes: This is suitable for low-cost delegation.

### T-015: README Correction And Final Gate

- Stream: WS-07
- Type: documentation plus integration acceptance
- Objective: Update README project status/offline claim and collect final validation evidence.
- Relevant plan excerpts: Update “Estado del Proyecto” and fix line 21 offline PWA claim; `src/service-worker.js` stays
  parked; full gate `npm test`; one manual checklist run on real hardware.
- Expected files or areas: `/Users/joseph.montero/learning/jw-mcenter/README.md`,
  `/Users/joseph.montero/learning/jw-mcenter/TESTING.md`.
- Dependencies: all implementation tasks T-001 through T-014.
- Recommended delegate: GPT-5.4
- Reasoning effort: medium
- Risk level: medium
- Conflict risk: low
- Git strategy: feature branch after all merges, or final integration branch
- Suggested branch or worktree: `orchestrator/T-015-readme-final-gate`
- Parallelization: final only.
- Acceptance criteria: README reflects actual POC status; no active offline/PWA claim contradicts parked service worker;
  `npm test` green; manual hardware checklist run recorded.
- Validation: `npm test`; manual dual-monitor checklist evidence.
- Boundaries: Do not register or modify service worker behavior.
- Subagent brief seed: “Perform close-out docs updates and final acceptance validation: README status/offline
  correction, full local gate, and manual hardware checklist evidence.”
- Notes: This is the final merge gate.

## Cross-stream risks

| Risk                                                                              | Affected tasks             | Severity | Mitigation                                                                                               |
|-----------------------------------------------------------------------------------|----------------------------|---------:|----------------------------------------------------------------------------------------------------------|
| Playwright multi-screen flags are fragile and order-sensitive.                    | T-001, T-003, T-009, T-013 |     High | Build args explicitly per project; verify with canary before feature tests.                              |
| CDP permission grant can silently target wrong context.                           | T-003, T-009, T-013        |     High | Always pass `browserContextId`; assert permission-dependent UI state.                                    |
| Worker replay can resurrect stale commands.                                       | T-004, T-005, T-009        |     High | Merge WS-02 before WS-04; unit-test transient classification and regression-test stale command behavior. |
| Playlist integer index breaks after reorder/delete.                               | T-008, T-009               |     High | Centralize object-reference current-item logic and unit-test mutation scenarios.                         |
| Autoplay behavior differs by policy and flag order.                               | T-001, T-012, T-013        |     High | Keep strict project isolated; implement explicit `play()` promise handling and gesture retry.            |
| E2E tests can become flaky via sleeps or hidden audio assumptions.                | T-003, T-009, T-011, T-013 |   Medium | Use event waits, polling, element evaluation, and stable state assertions.                               |
| README/PWA docs may overstate offline readiness.                                  | T-014, T-015               |   Medium | Keep service worker parked; document POC reality and deferred PWA phase.                                 |
| No CI means local gate discipline is the only protection.                         | all tasks                  |   Medium | Require command evidence at each phase boundary and before integration.                                  |
| Concurrent branches may collide in `presentation-manager.js` and presenter tests. | WS-04, WS-05, WS-06        |   Medium | Sequence WS-04; use worktrees only after WS-04 and merge with explicit checkpoints.                      |

## Validation strategy

### Per-task validation

- T-001: `npx playwright test --list`; smoke project targeted run.
- T-002: `npm run test:unit`; inspect `npm test` script for explicit command chain.
- T-003: `npx playwright test --project=multiscreen` canary; full `npm test`.
- T-004: `npm run check`; `npm run test:unit` for bus policy.
- T-005: targeted stale-command/port lifecycle regression; `npm test` at WS-02 boundary.
- T-006: `npm run check`; `npx playwright test --project=smoke`.
- T-007: targeted start/end/gating UI tests; `npm run check`.
- T-008: `npm run test:unit`; `npm run check`.
- T-009: `npx playwright test --project=multiscreen`; full `npm test`.
- T-010: lifecycle close/button-state Playwright test; `npm run check`.
- T-011: time-display and `@slow` master-close tests; full WS-05 gate.
- T-012: `npm run check`; must be validated with T-013 before merge.
- T-013: `npx playwright test --project=strict-autoplay`; relevant portrait test; full WS-06 gate.
- T-014: docs review against Phase F requirements.
- T-015: full `npm test`; manual dual-monitor checklist evidence.

### Integration validation

At every phase/stream merge, run the explicit local gate or a justified targeted subset followed by `npm test` before
merging to `main`. The execution agent should capture command, exit status, and key passing test names. For worktree
parallelism, re-run affected Playwright projects after rebasing onto latest `main`.

### Final acceptance validation

- `npm test` passes where `test` itself runs check, unit, and all Playwright projects.
- Real hardware checklist from `TESTING.md` is completed once on dual-monitor/projector-like hardware.
- Manual evidence includes Chrome version, display setup, 1080p decode observation, fullscreen behavior, display
  reconfiguration result, and perceived `< 1s` media navigation.
- README and TESTING docs align with actual POC capabilities and deferred post-POC items.

## Recommended execution-agent behavior

The execution agent should consume this manifest as the working contract and use `PLAN.md` only as supporting context
when details are disputed. Start from `main`, verify worktree status, and preserve unrelated local changes. Keep task
IDs in branch names, commit messages, PR titles, and validation notes.

The agent may revise task boundaries only when repo facts make the proposed boundary unsafe or inefficient. It should
not revise product behavior silently where ambiguity affects public behavior, persistence, security, permissions, or
architecture. For A-001, adopt the recommended current swap semantics unless the user explicitly decides otherwise.

Each implementation stream should include tests in the same merge unit. Do not merge app behavior without its planned
validation. Do not activate service worker/offline behavior. Do not downgrade strict browser policy to make tests pass.

Completion evidence should be concrete: changed files, test commands, exit status, and any manual checklist artifact. A
task is not complete because code was written; it is complete when its acceptance criteria and validation evidence are
satisfied.

## Handoff summary

- First safe action: create the WS-01 test-rig branch from `main` and implement T-001.
- Highest-risk stream: WS-04 control command core, especially T-009 money E2E and playlist/current-item state.
- Best parallelization opportunity: after WS-01, run WS-02 bus hardening and WS-03 presenter extraction in parallel;
  after WS-04, run WS-05 and WS-06 in worktrees if schedule matters.
- Tasks requiring clarification: none blocking if A-001 recommendation is accepted; otherwise T-008 needs product
  decision on swap vs rotate.
- Tasks requiring Git worktrees: WS-05 and WS-06 if run in parallel; WS-02 and WS-03 if run concurrently.
- Tasks suitable for low-cost delegation: T-002, T-006, T-014.
- Final validation focus: full `npm test`, strict-autoplay behavior, money multiscreen E2E, master-close lifecycle, and
  real dual-monitor manual checklist.
