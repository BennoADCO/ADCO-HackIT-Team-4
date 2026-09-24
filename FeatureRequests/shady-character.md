# Feature: The Shady Character

**Status:** Built into Kitchen Wars (two characters). Not yet pushed to GitHub.
**Files touched:** `js/config.js`, `js/game.js`

## What it is

Two suspicious figures stand in the dark strip at the bottom of the screen:
one a quarter of the way across (P1's side), one three quarters (P2's side). Each wears a trench coat with the collar popped, a hat and sunglasses.
Each keeps glancing nervously over his left shoulder, then his right, as if
checking nobody is watching. Every now and then he stares straight at the
player, which is the creepiest bit.

They're there purely for comedy. They don't affect the score or the rules.

## How it behaves

- Every 0.5 to 1.4 seconds he picks a new direction to look: up-left,
  up-right, or (about 1 time in 4) straight at you.
- His head swings quickly towards the new direction rather than jumping.
  That reads as a nervous snap.
- His sunglasses and smirk slide towards the side he's looking at.
- They keep glancing about on every screen, including the title screen.
- The two start looking opposite ways, so they don't move in step.
- To make room, the second sabotage button in the strip moved right (`SABOTAGE_MENU_SPACING` went from 125 to 205).
- He's drawn entirely from canvas shapes, with no image files.

## Settings you can change (in `js/config.js`)

| Setting | Default | What it does |
|---|---|---|
| `SHADY_POSITIONS` | `[0.25, 0.75]` | Where they stand, as fractions of the screen width. Add a number for another character. |
| `SHADY_FEET_Y` | 597 | How far down the screen their feet are (600 = very bottom). |
| `SHADY_SCALE` | 0.8 | Their size. Bigger than 0.8 pokes out of the strip. |
| `SHADY_GLANCE_MIN` | 0.5 | Shortest wait before he looks somewhere new (seconds). |
| `SHADY_GLANCE_MAX` | 1.4 | Longest wait before he looks somewhere new (seconds). |
| `SHADY_TURN_SPEED` | 14 | How fast his head snaps round. Higher = twitchier. |
| `SHADY_COAT` | `#5b4a3a` | Trench coat colour. |
| `SHADY_HAT` | `#2b2622` | Hat colour. |
| `SHADY_SKIN` | `#e2b48c` | Face colour. |

## Ideas for later (not built)

- Have him react to the game, e.g. duck down when a customer gets angry.
- Give him a reason to be there, like slipping the player a bonus item now and then.
