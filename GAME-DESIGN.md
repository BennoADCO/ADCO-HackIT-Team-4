# SPUD RUSH — Game Design & Asset Brief

A robot works the line in a potato kitchen. Robot customers lean through a
hatch in the wall and demand very specific potatoes. You have hands, a
floor, and not enough time.

This document describes **the environment**, **the mechanics**, and **the
art assets we need**. No code exists yet. Nothing here is final until the
team agrees to it.

---

## 1. The pitch, in one sentence

Robot customers appear at a serving hatch and order a potato by **size**,
**colour** and **how burnt it is** — you run around a small kitchen
pulling potatoes out of garden beds, dunking them in paint, roasting them
for exactly the right length of time, and handing them over before the
customer gives up.

The fun is panic. Three orders on the go, two ovens, and one of them is
about to turn into charcoal.

---

## 2. The environment

### 2.1 The viewport

The whole game lives in a **fixed 500 × 500 pixel square**. It never
resizes and never scrolls. CSS may scale the whole square up on a big
screen, but the game always thinks it is 500 × 500.

Everything below is measured in those pixels, with **(0,0) at the top
left corner** and Y increasing downwards.

### 2.2 The layout

```
  0                                                            500
0 ┌────────────────────────────────────────────────────────────┐
  │  BACK WALL                                                 │
  │    ┌────────────────────────────────────────────────┐      │
  │    │  SERVING HATCH  — 3 customer bays              │      │
  │    │   [ bay 1 ]    [ bay 2 ]    [ bay 3 ]          │      │
  │    └────────────────────────────────────────────────┘      │
110──────────────────────────────────────────────────────────  │
  │  (speech bubbles hang down from the hatch to about y=158)   │
  │                                                            │
  │ ┌──────┐                                        ┌────────┐ │
  │ │ BED  │                                        │ JAR 1  │ │
  │ │LARGE │                                        └────────┘ │
  │ └──────┘             KITCHEN FLOOR              ┌────────┐ │
  │ ┌──────┐          (the walkable area)           │ JAR 2  │ │
  │ │ BED  │                                        └────────┘ │
  │ │  XL  │                ROBOT                   ┌────────┐ │
  │ └──────┘                CHEF                    │ JAR 3  │ │
  │ ┌──────┐                                        └────────┘ │
  │ │ BED  │                                        ┌────────┐ │
  │ │POGGO │   ┌───┐  ┌────────┐   ┌────────┐       │ JAR 4  │ │
  │ └──────┘   │BIN│  │ OVEN A │   │ OVEN B │       └────────┘ │
500└────────────────────────────────────────────────────────────┘
```

### 2.3 Exact positions

Every prop is a separate picture dropped on top of a plain background, so
we can nudge any of them later without redrawing the kitchen.

| Thing | Top-left corner | Size on screen |
|---|---|---|
| Background (the whole kitchen) | 0, 0 | 500 × 500 |
| Serving hatch opening *(painted into the background)* | 40, 18 | 420 × 82 |
| — customer bay 1 | 40, 18 | 140 × 82 |
| — customer bay 2 | 180, 18 | 140 × 82 |
| — customer bay 3 | 320, 18 | 140 × 82 |
| Garden bed — **Large** | 4, 132 | 82 × 96 |
| Garden bed — **Extra Large** | 4, 246 | 82 × 96 |
| Garden bed — **Poggolithic** | 4, 360 | 82 × 96 |
| Paint jar 1 | 424, 132 | 72 × 80 |
| Paint jar 2 | 424, 222 | 72 × 80 |
| Paint jar 3 | 424, 312 | 72 × 80 |
| Paint jar 4 | 424, 402 | 72 × 80 |
| Bin | 90, 410 | 60 × 78 |
| Oven A | 168, 404 | 112 × 84 |
| Oven B | 296, 404 | 112 × 84 |
| Robot chef (the player) | *moves* | 48 × 66 |

### 2.4 The walkable area

The chef's **feet** are kept inside a single rectangle:

- left / right: **x 110 to 390**
- top / bottom: **y 168 to 398**

That is the entire collision system. There is nothing to bump into, no
walls to slide along, no pathfinding — the chef simply cannot walk his
feet outside that box. His body and head are allowed to overlap the beds,
jars and ovens, which is what makes it look like a real kitchen rather
than a chessboard.

**This is a deliberate simplification.** Proper obstacle collision is
where small games die. We are not doing it.

---

## 3. The mechanics

### 3.1 Controls

| Key | What it does |
|---|---|
| **Arrow keys** or **WASD** | Walk. Diagonals allowed. |
| **Spacebar** | Do the thing at the station you're standing next to. |
| **R** | Restart, once the game is over. |

That is the whole control scheme. One movement, one verb.

The chef **always faces the camera** — he does not turn to face the way
he is walking. This was a deliberate choice: it means we need one picture
of him instead of four, and it reads perfectly well at this size.

### 3.2 Carrying

The chef can hold **exactly one potato at a time**, and you can always
see it in his hands.

Holding one thing is what creates the game. It forces trips across the
kitchen, it means you have to decide what to do *next*, and it makes the
oven timer genuinely stressful because you cannot be in two places at
once.

### 3.3 The stations, and what Spacebar does at each

The nearest station within reach gets a highlight ring around it so you
always know what Spacebar will do.

| Station | Hands empty | Holding a potato |
|---|---|---|
| **Garden bed** | Pull up a raw potato of that bed's size | *nothing* |
| **Paint jar** | *nothing* | Dunk it — the potato becomes that colour |
| **Oven** (empty) | *nothing* | Put the potato in; it starts cooking |
| **Oven** (loaded) | Take the potato out | *nothing* |
| **Customer** | *nothing* | Hand it over — scored immediately |
| **Bin** | *nothing* | Destroy it, no penalty beyond the wasted time |

Re-dunking a potato in a different jar **overwrites** its colour. This is
deliberate and forgiving — a wrong dunk costs you a walk, not a potato.

**The bin matters more than it sounds.** Without it, one wrong move
leaves a useless potato welded to your hands and the round is over. The
bin is the "undo" button and non-players find it instantly.

### 3.4 A potato has exactly three properties

Everything in this game is one of 45 combinations:

- **Size** — Large · Extra Large · Poggolithic *(there is no small. That is the joke.)*
- **Colour** — Natural · Red · Blue · Green · Yellow *(natural = never dunked)*
- **Doneness** — Raw · Cooked · Burnt *(plus Ruined, which nobody orders)*

An order is a picture of one specific combination. Match all three and
you get paid.

### 3.5 The oven, which is the actual game

Put a potato in an oven and a timer starts running. What comes out
depends entirely on when you pull it:

| Time in the oven | State | Looks like |
|---|---|---|
| 0 – 3 seconds | **Raw** | unchanged, pale |
| 3 – 8 seconds | **Cooked** | golden brown, a little steam |
| 8 – 13 seconds | **Burnt** | charred and black, smoking |
| 13 seconds + | **Ruined** | a sad grey lump — bin it |

Crucially, **"burnt" is a thing customers order**. A burnt potato is a
correct answer, not a mistake. That turns the oven into a two-way timing
puzzle: sometimes you're racing to grab it before it chars, and sometimes
you're deliberately leaving it in while a customer's patience ticks away.

You can see the potato cooking through the oven window, and there's a
small progress bar on the oven so it's readable at a glance.

**Two ovens** is the right number. One is not enough to create juggling;
three is too many to watch at once in a 500-pixel kitchen.

### 3.6 Customers

Up to **three customers** at once, one per bay in the hatch.

Each one has:
- a **robot face**, picked from five, so the queue looks varied
- a **speech bubble** hanging below the hatch showing **a picture of
  exactly the potato they want** — right size, right colour, right amount
  of burnt
- a **patience bar** that drains from full to empty

The order is shown as a *picture*, not as words. Nobody should have to
read "1 × Extra Large, Red, Burnt" while panicking. They should see a
fat red charcoal potato and go find one.

**What happens when they're served:**

| Outcome | Result |
|---|---|
| Correct potato | Coins, and the more patience left the more you get |
| Wrong potato | Customer leaves angry — **one strike** |
| Patience runs out | Customer leaves angry — **one strike** |

### 3.7 Winning, losing, and the shape of a round

There is no winning. There is **surviving**, and a score.

- **Three strikes and the game is over.** Final score on screen, high
  score below it, press R to go again.
- Customers arrive **faster** and their **patience shrinks** the longer
  you last, so every run ends eventually.
- Coins are the score. They go up, they never get spent.

We are calling it a tycoon game. It is a rush game. If the core is
finished early, the first thing we add is a single upgrade — *spend 50
coins for a third oven* — and then it genuinely is one.

### 3.8 The first ten seconds of play

1. One robot appears in bay 1. Its bubble shows a plain, uncooked Large
   potato — the easiest possible order.
2. You walk left to the Large bed and press Space. You're now holding a
   potato, and you can see it.
3. You walk up to the robot and press Space. Coins. It leaves happy.
4. A second robot arrives, and this one wants it *red*.

Nobody is told any of this. The layout and the pictures have to teach it.

---

## 4. The art assets

### 4.1 House style — applies to everything

- **Flat cartoon.** Bold shapes, thick dark outlines, limited palette. No
  photo-realism, no heavy gradients, no fine detail — everything has to
  survive being 70 pixels wide.
- **One consistent viewing angle**: a gentle top-down three-quarter view,
  the way you'd see a kitchen from a standing adult's eye height. Props
  and background must agree with each other.
- **Light comes from above.**
- **Transparent PNG** for every prop and character. The background is the
  only opaque image.
- **No baked-in drop shadows.** Shadows get drawn in code so everything
  sits on the floor consistently.
- **Deliver at 2× the on-screen size** so it stays crisp. If the tool can
  only produce squares, centre the subject on a transparent square and
  say so — positions get adjusted to suit.
- **Robots are friendly, chunky and a bit stupid.** Boxy heads, big
  simple eyes, visible bolts. Not menacing, not sleek.

---

### 4.2 BATCH ONE — environment, characters and furniture

Sixteen pictures. This is everything needed to draw a kitchen with a
robot standing in it.

#### The background — 1 image

| File | Deliver at | Notes |
|---|---|---|
| `kitchen_background.png` | 1000 × 1000 | Opaque. No transparency. |

**This image must be bland.** It is a stage, not a scene. Plain floor,
plain wall, low contrast, muted colours. Every interesting thing in this
game — the potatoes, the paint, the robots — gets drawn on top of it, and
a busy background would swallow all of them.

It must contain:
- A **back wall** across the top, roughly the top fifth of the image.
- A **long rectangular serving hatch** cut into that wall. In final
  screen coordinates the opening sits at **x 40–460, y 18–100**. Double
  those for the 1000 × 1000 delivery: **x 80–920, y 36–200**. The inside
  of the opening should be dark and empty — robots get drawn into it.
- **Kitchen floor** filling everything below the wall. Tiles are fine,
  kept subtle and low-contrast.
- **Nothing else.** No benches, no equipment, no props, no clutter, no
  decoration in the middle of the floor. All of that arrives as separate
  sprites.

#### Characters — 6 images

| File | Deliver at | Notes |
|---|---|---|
| `chef_robot.png` | 96 × 132 | The player |
| `customer_1.png` … `customer_5.png` | 264 × 172 each | The queue |

**The chef:** one picture, **face on**, standing, arms forward and
slightly apart as if ready to carry something. We draw the potato into
that gap, so leave a clear space in front of his chest at roughly belly
height. He never turns around — no side or back views needed. Feet at the
very bottom edge of the canvas, centred.

**The five customers:** **head and shoulders only, face on**, as if
leaning through a hatch. They are only ever seen inside a 140 × 82 window
so they must read instantly at that size. Five clearly different robots —
vary the head shape, the eyes, the aerials, the colour, the amount of
rust. One tall and nervous, one wide and grumpy, one tiny with an
enormous head, and so on. **Neutral expressions** — moods are shown with
effects drawn in code, so we only need one picture each.

#### Garden beds — 3 images

| File | Deliver at |
|---|---|
| `bed_large.png` | 164 × 192 |
| `bed_xlarge.png` | 164 × 192 |
| `bed_poggolithic.png` | 164 × 192 |

Three raised planter boxes, seen at the same angle, with potato foliage
growing out of the soil. **The three must be distinguishable at a glance
from across the room**, because picking the wrong size is the mistake
players will make most:

- **Large** — a modest box, a couple of small sprouts.
- **Extra Large** — a bigger box, fuller leaves, one potato shoulder
  visibly breaking the soil.
- **Poggolithic** — absurd. The box is straining, the foliage is
  enormous, something the size of a boulder is pushing up out of the
  ground. A faint glow would not be too much.

#### Paint jars — 4 images

| File | Deliver at |
|---|---|
| `jar_red.png` | 144 × 160 |
| `jar_blue.png` | 144 × 160 |
| `jar_green.png` | 144 × 160 |
| `jar_yellow.png` | 144 × 160 |

Open-topped industrial vats on short stands, with the paint surface
clearly visible from above and a drip or two down the side. The colour is
the entire point — it must be obvious which is which in a 72-pixel-wide
sprite, and the four colours must not be confusable with each other.

#### Ovens and bin — 2 images

| File | Deliver at |
|---|---|
| `oven.png` | 224 × 168 |
| `bin.png` | 120 × 156 |

**The oven** is a chunky front-loading heat box. It needs a **glass
window in the door, and that window must be fully transparent in the
PNG** — the cooking potato is drawn behind the oven picture and shows
through the hole. In delivery coordinates the window should be a clear
rectangle roughly **112 × 80, centred, starting about 44 pixels down**.
Only one oven picture is needed; both ovens use it.

**The bin** is an open-topped kitchen bin, obviously a bin, ideally with
something unfortunate already in it.

---

### 4.3 BATCH TWO — potatoes and interface

Not needed to start building, but needed before the game is playable.
Listed here so the whole job is visible.

**Potatoes — 18 images.** A potato is size × colour × doneness, which is
45 combinations. Drawing 45 pictures is madness, so it is layered:

- **15 base potatoes** — 3 sizes × 5 colours (natural, red, blue, green,
  yellow), each delivered at 128 × 128.
- **2 doneness overlays** — `overlay_cooked.png` and `overlay_burnt.png`,
  each 128 × 128. These are the browning and the charring, painted on
  transparency, drawn on top of any base potato. They must sit **well
  inside** the potato outline so they never poke over the edge.
- **1 ruined potato** — `potato_ruined.png`, a grey lump.

**Interface — 3 images:** `speech_bubble.png`, `icon_coin.png`,
`icon_heart.png`.

---

## 5. Open questions — need answers before building

1. **Is 500 × 500 definitely the size?** It fits, but it is snug: three
   customer bays, ten stations and a robot in a square the size of a
   drink coaster. **600 × 600 would be noticeably more comfortable** and
   costs nothing but a number. Worth a moment's thought.

2. **Which four paint colours?** Recommending red, blue, green, yellow —
   maximally distinct at small sizes. Purple and orange read as brown-ish
   next to a potato.

3. **Can a customer order a natural, uncooked potato?** Recommending yes
   — it makes the first order in a run trivially easy, which is how a
   game teaches itself.

4. **Do we want a name better than SPUD RUSH?** Almost certainly.
