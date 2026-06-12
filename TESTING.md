# Testing and Manual Acceptance

## Local Gates

Prerequisites:

- Chrome 142 or newer. The local Chrome channel is used for Playwright, and `--screen-info` requires Chrome 142+.
- Dependencies installed with `npm install` or `npm ci`.
- No CI is configured. These gates are local convention and must be run before a release or handoff.

Run:

```sh
npm test
```

The `test` script must run all of these explicitly:

```sh
npm run check
npm run test:unit
playwright test
```

Useful focused checks:

```sh
npx playwright test --project=smoke
npx playwright test --project=multiscreen
npx playwright test --project=strict-autoplay
```

## Manual Pre-Meeting Checklist

Record one manual pass on real dual-monitor or projector-like hardware before treating the POC as accepted.

- Chrome version is 142 or newer.
- The venue laptop detects the projector or secondary monitor with the expected EDID, resolution, scaling, and orientation.
- The control panel remains on the operator screen.
- The presenter opens on the physical secondary display.
- Fullscreen works on the secondary display.
- A 1080p video plays smoothly on the venue laptop.
- Audio media advances and is controllable from the panel.
- Image media displays without cropping.
- Previous/next navigation between media feels under 1 second.
- Play/pause, rewind 10s, and fast-forward 10s work during video playback.
- Ending the presentation closes the presenter window and resets panel controls.
- Closing the presenter window updates panel controls.
- Closing the control panel causes the presenter to close within 8 seconds.
- OS display reconfiguration during a presentation is tested and noted.

## Manual Acceptance Record

Use this template for the hardware pass.

```md
Date:
Tester:
Chrome version:
Laptop model / OS:
Projector or secondary display:
Resolution / scaling:
Media set used:

Local `npm test` result:

Checklist result:
- Presenter on physical secondary display:
- Fullscreen on secondary display:
- 1080p decode:
- Audio playback/control:
- Image containment:
- Media navigation under 1s:
- Play/pause and ±10s:
- End presentation:
- Presenter close updates panel:
- Panel close kills presenter within 8s:
- OS display reconfiguration:

Notes / failures:
```

For asset-pack-driven media passes, use `test/fixtures/media/public-domain/` as the regression set.

## Known Limits

- The service worker remains parked and is not registered. Active offline/PWA behavior is post-POC work.
- Multi-screen hotplug handling beyond the manual reconfiguration check is post-POC work.
- Browser autoplay behavior varies by policy. The strict-autoplay automated test uses a deterministic first-play rejection to exercise the recovery path while preserving the real control-panel/presenter flow.
