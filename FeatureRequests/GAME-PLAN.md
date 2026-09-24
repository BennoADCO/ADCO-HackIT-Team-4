# 🥔 SPUD RUSH — Game Spec (for review)

**Status:** draft for sign-off. Nothing built yet. Read the ⚠️ box before approving.

---

## 1. The pitch

Two chefs, side by side on one keyboard, run rival potato restaurants. Grab the
right ingredients, cook them in the oven, serve the customer before they lose
patience — and spend your winnings on a man in a trench coat who will sabotage
the other kitchen. **First to $1,000 wins.**

---

## 2. What's on screen

One fixed 900 × 600 window, split straight down the middle. Left half is Player 1,
right half is Player 2. Identical layouts, mirrored nothing — same game, side by side.

```
+---------------------------+---------------------------+
|  P1  $350   Sabotage: 4   |  P2  $200   Sabotage: 7   |  <- score bar
|  [🍔 ▓▓▓░] [🥩 ▓▓▓▓] [🐟] |  [🌮 ▓▓░░] [🧀 ▓▓▓▓] [🍔] |  <- customer queue (3 shown)
+---------------------------+---------------------------+
|  🥔  🧀  🥦               |               🥦  🧀  🥔  |
|                           |                           |
|         👨‍🍳  🔥OVEN        |        🔥OVEN  👩‍🍳         |  <- the kitchen
|                           |                           |
|  🥩  🐟  🌶️      🗑️      |      🗑️     🌶️  🐟  🥩   |
+---------------------------+---------------------------+
| 🕵️ 1:🧊$3  2:🧈$4  3:🐀$5 | 🕵️ 7:🧊$3  8:🧈$4  9:🐀$5 |  <- the saboteur
+---------------------------+---------------------------+
```

Everything is emoji drawn onto the canvas plus coloured rectangles. No image files,
no sound files, no downloads — it runs by double-clicking `index.html` on any laptop.

---

## 3. The five dishes

Each dish has its own **ticket colour**, so from across the room you can tell what a
customer wants without reading anything. Every dish is three ingredients. Every dish
has a potato in it.

| # | Dish | Ticket colour | Ingredients to collect | Cook time |
|---|------|---------------|------------------------|-----------|
| 1 | 🍔 **Burger & Fries** | Tomato red | 🍔 patty · 🍟 fries · 🥫 ketchup | 4s |
| 2 | 🥩 **Steak & Mash** | Deep purple | 🥩 steak · 🥔 mash · 🥦 greens | 6s |
| 3 | 🧀 **Loaded Jacket Spud** | Marigold yellow | 🥔 jacket · 🧀 cheese · 🫘 beans | 5s |
| 4 | 🐟 **Fish & Chips** | Ocean blue | 🐟 fish · 🍟 chips · 🍋 lemon | 5s |
| 5 | 🌮 **Spicy Potato Taco** | Lime green | 🌮 shell · 🥔 spud · 🌶️ chilli | 4s |

Nine ingredient stations sit around each kitchen. The fiddly bit for the player is
that ingredients are **shared across dishes** — 🍟 is in two of them, 🥔 in two —
so you have to actually read your ticket.

---

## 4. Controls

| | Player 1 | Player 2 |
|---|---|---|
| Move | **W A S D** | **Arrow keys** |
| Pick up / drop off | *automatic* — walk into a station, oven or customer | same |
| Buy sabotage | **1 2 3 4** | **7 8 9 0** |
| Restart after a win | **R** (either player) | **R** |

No mouse. No clicking. Deliberately: two people sharing one keyboard is the whole
joke, and auto-pickup means nobody has to remember a grab key while panicking.

---

## 5. The first ten seconds of play

1. Press any key on the title screen. Both queues fill with three customers each.
2. Front customer shows a 🍔 ticket and a patience bar that starts draining.
3. You walk your chef over 🍔, then 🍟, then 🥫 — each one sticks to you as you touch it.
4. You walk into the 🔥 oven. It takes everything you're carrying and starts cooking.
5. Four seconds later a finished plate pops out. You touch the oven to grab it.
6. You walk into the customer at the front of the queue. **Ding — $100.** Next
   customer steps up, and you've got 2 sabotage points burning a hole in your apron.

---

## 6. Scoring, and the Karen

| What happens | You get |
|---|---|
| Right dish, patience bar still going | **$100** + 2 sabotage points |
| Right dish, patience bar ran out | **$50** + 1 sabotage point |
| Wrong dish | **$0**, no points, and the customer becomes a **Karen** |

**The Karen.** Serve someone the wrong thing and they turn 😡 bright red, plant
themselves at the front of your queue and refuse to move for 8 seconds while the
queue behind them backs up. You can't serve anyone until she's done. She is loud
about it — a rising oscillator tone and a speech bubble from a short list of
complaints in `config.js` (the team writes these; that's the funny bit).

Customers never walk away. Running out of patience costs you money and tempo, not
the order. That's on purpose — a game where the queue empties out is a game that
punishes a beginner into a corner.

**Win:** first player to **$1,000**. Winner's half of the screen goes gold, loser's
chef slumps, press **R** to go again.

---

## 7. The saboteur 🕵️

Along the bottom of each half stands a shady figure in a trench coat. He doesn't move.
He sells things. You pay with **sabotage points**, not dollars, so sabotaging never
directly slows your own race to $1,000 — it only costs you the time you spend pressing
the key.

| Key | Sabotage | Cost | What it does to the other player | Lasts |
|---|---|---|---|---|
| 1 / 7 | 🧊 **Oven Freeze** | 3 pts | Their oven stops dead. Anything inside sits there. | 6s |
| 2 / 8 | 🧈 **Slippery Floor** | 4 pts | Their movement keys are reversed. | 6s |
| 3 / 9 | 🐀 **Rat Raid** | 5 pts | They instantly drop everything they're carrying on the floor. | instant |
| 4 / 0 | 😡 **Karen Call** | 6 pts | Spawns a Karen at the front of their queue. | 8s |

Every sabotage announces itself loudly on the victim's half — big emoji, screen flash,
a nasty buzz — so the room knows exactly who just did what to whom. Only one sabotage
can be active on a player at a time; buying a second while one is running is refused
with a dud noise and the points are not spent.

---

## 8. ⚠️ Scope — read this bit

**This is at the top end of what three hours holds.** Two independent kitchens, queues,
cooking, a shop and four sabotages is roughly twice the moving parts of a normal jam
game. The plan below is built so that we have a real, demoable, two-player game at the
**end of step 5**, about halfway through. Everything after that is gravy — literally.

### Must-have (this is the game)

- [ ] Split screen, two chefs, both moving on one keyboard
- [ ] Three ingredient stations, one oven, pick up by walking
- [ ] Two dishes only to start (🍔 Burger & Fries, 🧀 Loaded Jacket Spud)
- [ ] One customer at a time per player, with a patience bar
- [ ] $100 / $50 / $0 scoring, first to $1,000, win screen, restart
- [ ] Sabotage points earned, and **two** sabotages working (🧊 Oven Freeze, 🧈 Slippery Floor)

### Nice-to-have (in this order, if the core is solid)

- [ ] All five dishes and all nine ingredient stations
- [ ] Queue of three customers instead of one
- [ ] The Karen, with her complaint lines
- [ ] 🐀 Rat Raid and 😡 Karen Call
- [ ] 🗑️ bin station so you can dump a wrong armful
- [ ] Sound: ding, buzz, oven timer, Karen wail (all generated in-browser)
- [ ] Title screen with the rules on it, so a stranger can play unaided

### Not today — naming these honestly so nobody waits for them

- Online play, or two laptops. Same keyboard only.
- Saved high scores between sessions beyond a single number in local storage.
- Animated chefs, walk cycles, drawn art of any kind. Emoji only.
- More than two players.
- Customers who walk in and out along a path, pathfinding, AI behaviour.
- Levels, shifts, a campaign, upgrades to your kitchen.

---

## 9. How it gets built

Five files. A non-coder always knows which one to open.

```
index.html      the page, and the three script tags in load order
css/style.css   the page around the game
js/config.js    every number and every word. This is where the team tunes the game.
js/engine.js    loop, keyboard, sound, drawing helpers. Written once.
js/game.js      the rules. Most changes happen here.
```

**Every tunable value lives in `config.js`** — walk speed, cook times, patience seconds,
dollar amounts, sabotage costs and durations, the target score, the Karen's lines, the
dish list. Changing "customers are too impatient" should be editing one labelled number
and pressing F5, not reading code.

Build order, playable at every step: draw the split screen → move both chefs →
pick up and cook → serve a customer for money → win and restart → sabotage → polish.

---

## 10. Questions for the room before we start

1. **Target score:** $1,000 is about 10 good serves each, so roughly a 4–5 minute
   round. Too long for a demo? $600 makes it ~3 minutes.
2. **Karen's complaints** — we need 5 or 6 lines. Any ADCO in-jokes we want in there?
   Same question for the dish names: should these be named after people?
3. **Sabotage feel:** should a sabotage be buyable the moment you can afford it, or
   should there be a short cooldown so nobody gets chain-stunned?
4. **Ticket colours** — anyone colour-blind in the room? If so, we keep the emoji as
   the primary signal and treat colour as decoration.
