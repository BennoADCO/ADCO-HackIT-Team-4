# PLAN — The Parts Table and AI Helper Robots

**Status: not built yet.** This is the plan only. Nothing in `js/` has been
changed for this feature.

---

## Context

Right now one player runs the whole kitchen alone, and the battery means
you spend part of every round walking to the charger instead of cooking.
The parts table is the answer to "I'm earning coins but there's nothing to
spend them on" — it turns SPUD RUSH from a pure survival game into
something closer to the tycoon we originally pitched.

You walk up to the parts table, spend coins, and a second robot builds
itself and starts working. It reads the customers' orders and fulfils them
on its own. Each robot costs much more than the last, so the decision is
always "do I buy help now, or bank the coins?"

**Asset already in place:** `assets/parts_table.png`

---

## What the player does

1. Walk to the parts table in the top-left of the floor.
2. The price is shown floating above it — yellow if you can afford it, red if
   you can't.
3. Press **Space**. Coins are deducted, a helper robot assembles itself on
   the spot with a puff of sparks, and walks off to find work.
4. The next one costs much more.

---

## The numbers (all going in `config.js`)

```
HELPER_FIRST_COST      60      coins for helper number one
HELPER_COST_MULTIPLIER 2.2     each one costs this much more than the last
HELPER_MAX             4       the most you can have at once
HELPER_SPEED           0.7     how fast they walk vs you (0.7 = 70%)
HELPER_THINK_DELAY     0.35    seconds they pause at each station, so you
                               can see them working rather than teleporting
HELPER_SCALE           0.88    drawn slightly smaller than you
HELPER_TINTS           four colours, one per helper, for the floor ring
```

So the prices come out at **60, 132, 290, 638**. The fourth one is a
genuine decision rather than an obvious buy.

**Why they're slower than you:** if helpers were as good as the player, the
game would play itself. At 70% speed they're useful but never a replacement.

---

## Where the table goes

Top-left of the floor, at roughly **x 150, y 166, 60 × 52**.

**This position has to be checked, not guessed.** The left wall is already
crowded: the Large garden bed only has about 540 standing spots and the
player reaches it from around x 110–124. If the parts table sits too far
left it will steal those spots and the Large bed becomes unusable — which
is exactly the bug we already hit and fixed with the yellow jar.

The existing sweep script (`reach.js` in the scratchpad) prints how many
standing spots every station has. **Run it before and after adding the
table.** If `bed:large` drops below about 300 spots, move the table right.

---

## How the helper's brain works

A plain state machine. One helper is an object with a state name, a target,
and a potato in its hands — the same shape as the player.

```
idle      ->  look at the three customers, claim the one nobody has claimed
toBed     ->  walk to the bed for the size wanted, take a potato
toJar     ->  if a colour is wanted, walk to that jar, dunk
toOven    ->  if cooked or burnt is wanted, walk to a free oven, put it in
waiting   ->  stand at the oven until it hits the right doneness, take it out
toCustomer->  walk to the bay, hand it over
idle      ->  start again
```

**Movement needs no pathfinding.** The kitchen has no obstacles — the walk
box is a plain rectangle and robots are allowed to overlap the furniture.
So "walk in a straight line towards the target" is correct and complete.
This is the single biggest reason this feature is affordable today.

**Standing spots** are worked out once at startup: for each station, the
closest point inside the walk box to that station's rectangle. Same maths
the game already uses to decide the nearest station, run backwards.

**Reuse, don't rewrite.** The helper must call the same code the player
does — `donenessAt()`, `timerForDoneness()`, and the serve/pay logic
currently sitting inside `useStation()` in `js/game.js`. That last part
needs lifting out into its own small function so both the player and the
helpers call it. If we copy-paste the rules instead, the helper will
eventually pay out differently from the player and nobody will know why.

---

## The three things that will go wrong

These are the whole difficulty of the feature. Everything else is easy.

1. **Two robots chasing one customer.** Each helper claims a bay index, and
   a claimed bay is invisible to everyone else. Claims are released when the
   customer leaves.

2. **Fighting over the two ovens.** Same fix: `oven.claimedBy`. A helper
   that finds no free oven waits rather than standing still forever.

3. **The player interfering.** You can serve a helper's customer, or pull
   its potato out of the oven, at any moment. Every state must re-check
   reality on arrival: if the customer has gone or the oven is empty, drop
   back to `idle` and re-plan. If the potato in hand is now useless, take it
   to the bin.

---

## Build order — playable at every step

Do not build the whole thing and then test it.

1. **Table + buying only.** Price shows, Space takes coins, cost goes up. The
   helper appears and just stands there. Confirms the economy works.
2. **Simplest possible job.** Helper only takes orders that are plain,
   uncooked potatoes: bed → customer. Two states. Watch it do a lap.
3. **Add paint.** One more state.
4. **Add the oven.** The hard one — this is where the waiting and the
   claiming come in.
5. **Add the fallbacks** — customer gone, oven robbed, potato useless.
6. **Polish.** Sparks on purchase, the coloured floor ring, price in red
   when you can't afford it.

If we run out of time, **stopping after step 3 still leaves a working,
sellable feature.** A helper that only does plain and painted potatoes is
still worth 60 coins.

---

## Two things I need you to decide

1. **Do helpers have batteries too?** My recommendation is **no** — they run
   forever. It's one less thing to go wrong, and it makes the purchase feel
   like a real upgrade rather than another chore. If you want them to
   charge, it's easy to add later, but it needs a second charging pad or
   they'll queue up.

2. **What happens to helpers when you die?** Recommendation: they're lost.
   Coins reset on restart, so helpers should too — otherwise run two is
   permanently easier than run one and the high score stops meaning anything.

---

## How we'll know it works

- `node --check js/*.js` — syntax.
- `reach.js` — every station still reachable, and `bed:large` hasn't been
  strangled by the new table.
- A new `helpers.js` test: buy a helper, run four simulated minutes, and
  assert it actually serves at least one customer correctly, never ends up
  stuck in one state for more than ~20 seconds, and that two helpers never
  claim the same bay or the same oven.
- Then open `index.html` and watch one do a lap. If it looks stupid, it is
  stupid — the tests can't catch that.
