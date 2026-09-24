# Feature: Kitchen Fires 💥🔥

**Status:** Built on the `kitchen-fires` branch. Not yet pushed to GitHub.
**Files touched:** `js/config.js`, `js/game.js`, `js/sound.js`

## What it is

Every so often something explodes in a kitchen and leaves a fire burning on
the floor. The player has **10 seconds** to grab the fire extinguisher 🧯
from its hook next to the oven and walk into the fire to put it out.

- **Put it out in time:** "Fire out!" and +1 sabotage point.
- **Too slow:** the fire burns out and costs you **$100** (you can't go below $0).

Each kitchen gets its own fires at its own random times, so it's a
distraction you have to juggle while cooking.

## How it plays

1. About 20 seconds into a round: 💥 BOOM. The screen shakes and a big
   explosion appears at a random spot on the floor.
2. The explosion turns into a flickering 🔥 with a countdown above it. The
   numbers turn red for the last 3 seconds.
3. Walk into the 🧯 box (right of the oven) to pick it up. It sits at your
   chef's side. You can still carry food while holding it.
4. Walk into the fire. Pssssh, it's out, and the extinguisher goes back on
   its hook for next time.
5. Walk into a fire *without* the extinguisher and you get a hint: "Grab the
   🧯 by the oven!"
6. The next fire comes 15 to 30 seconds later.

## Settings you can change (in `js/config.js`, section KITCHEN FIRES)

| Setting | Default | What it does |
|---|---|---|
| `FIRES_ON` | true | false switches fires off completely. |
| `FIRE_FIRST_DELAY` | 20 | Seconds into a round before the first explosion. |
| `FIRE_GAP_MIN` / `FIRE_GAP_MAX` | 15 / 30 | Shortest and longest wait between fires. |
| `FIRE_SECONDS` | 10 | How long you have to put it out. |
| `FIRE_DAMAGE` | 100 | $ lost if it burns out. |
| `FIRE_PUT_OUT_POINTS` | 1 | Sabotage points for putting one out. |
| `FIRE_SIZE` | 50 | How big the fire is drawn. |
| `FIRE_SPOTS` | 5 spots | Where fires can break out. Kept clear of the stations. |
| `EXTINGUISHER` | x 300, y 350 | Where the extinguisher hangs (next to the oven). |

## Ideas for later (not built)

- A sabotage that sets fire to your rival's kitchen.
- Fire spreading to a second spot if it's left too long.
