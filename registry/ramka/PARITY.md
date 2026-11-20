# Ramka parity verification

This native Foldkit adaptation follows `arturbien/ramka` commit
`bf58a38a92f8905a7014f23da38db06f41479c34` (`@ramka/react` 0.0.2).
`upstream-manifest.json`, `LICENSE` and `THIRD-PARTY-NOTICES.md` retain provenance.

The reference page uses a fixed native example with no playground controls.
Caller configuration belongs to the installed checked Block configuration.

The acceptance evidence compares actual browser behavior with the pinned upstream
implementation. It covers Chromium, WebKit and Firefox. Native animations run on
the browser's compositor; the tests do not replace them with JavaScript animation
loops.

| Check                              | Recorded result                                                                                                                            |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Native View Transitions            | 84/84 exact comparisons, all 84 with nonempty compositor tracks; no page, ready or finished errors                                         |
| Gesture trajectories               | Four trajectories across three engines: 12 matching implementation comparisons, including keyframes, durations and poses                   |
| Pull to close                      | Three engine comparisons; blocked-main-thread compositor progression recorded separately                                                   |
| Native unit/resource/SSR contracts | 206 passing tests, including 12 geometry cases; all 612 original expectation calls retained during registry policy adaptation              |
| Production source attestation      | All 38 TypeScript/CSS files match the verified native source byte for byte                                                                 |
| SDK bridge regression              | Four real SDK runtime cases; independent embeds, pending transition retirement, mount reentrancy and disposal; both guards mutation proven |
| SDK setup contract                 | Legacy upgrade, unknown patch conflict refusal, unrelated manifest preservation, byte-idempotence and corrupt-patch refusal                |

The release's verification receipt records the final source commit, registry
archive digest and gate results. Detailed browser receipts and reproduction
scripts are attached to the `registry-0.1.0-preview.6` GitHub prerelease as the
source proof archive. These results describe the recorded scenarios and browser
versions; they do not establish equality for every possible caller layout or
future browser version.

## Required SDK setup

After installing `@ramka-foldkit/lightbox`, run:

```sh
bun scripts/install-ramka-sdk.mjs
```

Ramka keeps Foldkit `0.170.0-canary.54f8bcd443b4` and Effect `4.1.2`. The distributed
SDK patch provides the public `Render.flushSync` Effect needed to commit the
checked view inside a native View Transition callback. It also retains the
existing subscription fixes. Its reviewed SHA-256 is
`24d36d7159e88ccca9cd0a9e4b4959e5043cccb976da741dec49dd230f8e1b0f`.

Setup checks that digest, all 11 patched runtime/declaration file digests, and the
public exported capability in a fresh Bun process. It changes only its Bun
`patchedDependencies` entry. It accepts the recognized original preview patch,
retains that file, and refuses other conflicting patches.
