# SPUD RUSH — starter kit

Open `index.html` in a browser. No build step, no dependencies.

- `game.js` — the whole game as a `<spud-rush>` web component (500×500 logical canvas, rendered at 2×).
- `assets/` — placeholder PNGs at 2× delivery size, named exactly as in the brief. Replace any file with final art of the same name and size; the game picks it up on reload. A missing file renders as a labelled orange box.

Tunable attributes on `<spud-rush>`: `oven-cook`, `oven-burn`, `oven-ruin`, `spawn-interval`, `patience` (all seconds), `show-zones` (debug walk box + station rects).

Potato sprites share one centre point; size is in the art (large is drawn smaller inside the 128² canvas). Doneness overlays are scaled in code per size (1 / 1.3 / 1.6).
