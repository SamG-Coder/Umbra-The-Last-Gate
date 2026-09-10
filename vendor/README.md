# Three.js runtime

Pinned engine: **Three.js 0.180.0 / r180**.

The game needs both `three.module.js` and `three.core.js`. The engine bytes are
**not bundled in this delivery** because engine download access was unavailable
in the build environment. The first launcher run downloads them here. You can
also run:

```sh
npm run vendor
```

Once both files are present, the game uses them locally and does not need a CDN.
Never mix files from different Three.js releases. The licence is included as
`THREE-LICENSE.txt`.

The browser's fallback uses the pinned jsDelivr or unpkg build; game saves and
gameplay are local. CDN access sends ordinary HTTP requests to the CDN, not game
state or your saved hunter.
