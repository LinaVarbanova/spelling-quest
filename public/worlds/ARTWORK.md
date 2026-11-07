# Spelling Quest world artwork

## Current 3D playground

All six floating realms are original procedural Three.js scenes authored in `src/playground-scene.ts`. No purchased models, stock characters, downloaded textures, fonts or external runtime asset services are used. Three.js is MIT licensed.

The live hero renders the same island models with WebGL, antialiasing and a capped device pixel ratio. It supports dragging, buttons and selection. The app stops rendering when the scene is offscreen or the tab is hidden; reduced-motion mode renders static views on interaction instead of a continuous animation loop. If WebGL is unavailable or its context is lost, original still artwork and HTML world controls remain available.

Each `realm-N.webp` is a separate 2400 × 1400 view. `realm-N-card.webp` is a 960 × 560 card variant, avoiding full-size image decoding for every thumbnail. These are not crops from a shared atlas. Both sizes are generated from the same source geometry as the live playground.

To regenerate, start the development server and run `npm run render:worlds` in another terminal. Install Playwright Chromium first or set `PLAYWRIGHT_CHROMIUM_PATH` to an installed Chromium executable. The generation script renders trusted local geometry with software WebGL if required. Generated files are committed; browsers and CI do not need to regenerate them to build the game.

## Earlier illustration

`fairy-realms.webp` is retained as an earlier original ImageGen direction. The active interface no longer uses it, and it is excluded from PWA precaching. Its original generated PNG remains separately in the creation workspace. No third-party screenshot was composited into it.
