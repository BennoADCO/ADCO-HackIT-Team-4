// ============================================================================
//  SPUD RUSH: KITCHEN WARS — SETTINGS
// ============================================================================
//
//  THIS IS THE FILE TO FIDDLE WITH.
//
//  Every number and every word in the game lives here. Nothing in this file
//  does anything clever — it is just a long list of labelled values. Change
//  one, save the file, press F5 in the browser, and the game changes.
//
//  Editing tips:
//    - Keep the comma at the end of each line. A missing comma is the most
//      common reason the screen goes blank.
//    - Words go inside 'single quotes'. If your words need an apostrophe
//      (like don't), wrap them in "double quotes" instead.
//    - Numbers never need quotes.
//    - If you break it: Ctrl+Z to undo, save, F5.
//
//  A "pixel" is a dot on the game screen. The whole game is 900 dots wide and
//  600 dots tall. Each player gets half: 450 wide. Positions below are
//  measured inside ONE half, from its top-left corner — both halves use the
//  same numbers, so a change here moves things in both kitchens.
//
// ============================================================================

var CONFIG = {

  // ==========================================================================
  //  THE SCREEN
  // ==========================================================================

  WIDTH: 900,           // whole game width. Leave this be.
  HEIGHT: 600,          // whole game height. Leave this be.
  HALF_WIDTH: 450,      // one player's half. Leave this be.

  // How many real dots we draw per game pixel. 2 keeps emoji sharp.
  // Drop to 1 if the game feels slow on an old laptop.
  RENDER_SCALE: 2,

  // The longest single step of time the game will take, in seconds. Stops
  // everything teleporting if the laptop hiccups. Leave this be.
  MAX_DT: 0.05,

  // Fonts already installed on the laptop (nothing is downloaded).
  FONT_TEXT: '"Segoe UI", Arial, "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif',
  FONT_EMOJI: '"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif',


  // ==========================================================================
  //  WINNING AND SCORING
  // ==========================================================================

  TARGET_MONEY: 1000,   // first player to this many dollars wins. 600 = shorter game.

  PAY_ON_TIME: 100,     // $ for the right dish before the patience bar runs out
  POINTS_ON_TIME: 2,    // sabotage points for the same
  PAY_LATE: 50,         // $ for the right dish AFTER the patience bar ran out
  POINTS_LATE: 1,       // sabotage points for the same
  PAY_WRONG: 0,         // $ for the wrong dish (or Mystery Slop)
  POINTS_WRONG: 0,      // sabotage points for the same


  // ==========================================================================
  //  THE CHEFS
  // ==========================================================================

  CHEF_SPEED: 260,      // pixels per second. Higher = faster running.
  CHEF_SIZE: 44,        // how big the chef emoji is drawn
  MAX_HELD: 3,          // most ingredients a chef can carry at once
  HELD_ITEM_SIZE: 20,   // size of the little emoji floating over the chef's head
  CHEF_LOSER_EMOJI: '😵', // what the losing chef turns into

  // Hitboxes: the invisible box used to decide "are these two touching?".
  // 0.75 means the box is 75% of the drawn size — a bit forgiving, which
  // feels fair. 1 = exact edges (feels harsh). 0.5 = must be right on it.
  HITBOX_SCALE: 0.75,

  // One entry per player. P1 is the left half, P2 is the right half.
  // Key names: KeyW = the W key, ArrowUp = up arrow, Digit1 = the 1 above
  // the letters, Numpad7 = the 7 on the number pad.
  PLAYERS: [
    {
      name: 'P1',
      emoji: '👨‍🍳',
      color: '#3aa0ff',            // blue: floor ring, name tag
      startX: 225,                 // where the chef stands when a round starts
      startY: 250,
      keys: {
        up:    ['KeyW'],
        down:  ['KeyS'],
        left:  ['KeyA'],
        right: ['KeyD']
      },
      // Which key buys which sabotage. The names match SABOTAGES further down.
      sabotageKeys: {
        freeze: ['Digit1'],
        slip:   ['Digit2']
        // Saved for later rounds:
        // rat:   ['Digit3'],
        // karen: ['Digit4']
      }
    },
    {
      name: 'P2',
      emoji: '👩‍🍳',
      color: '#ff5c8a',            // pink
      startX: 225,
      startY: 250,
      keys: {
        up:    ['ArrowUp'],
        down:  ['ArrowDown'],
        left:  ['ArrowLeft'],
        right: ['ArrowRight']
      },
      sabotageKeys: {
        freeze: ['Digit7', 'Numpad7'],
        slip:   ['Digit8', 'Numpad8']
        // Saved for later rounds:
        // rat:   ['Digit9', 'Numpad9'],
        // karen: ['Digit0', 'Numpad0']
      }
    }
  ],

  KEYS_RESTART: ['KeyR'],   // play again after someone wins
  KEYS_MUTE: ['KeyM'],      // sound on / off


  // ==========================================================================
  //  LAYOUT OF ONE HALF (top to bottom)
  // ==========================================================================
  //
  //   y 0   - 44   score bar     (name, money, sabotage points)
  //   y 44  - 140  customer area (the customer, their ticket, patience bar)
  //   y 140 - 540  kitchen floor (stations, oven, bin, chef)
  //   y 540 - 600  saboteur strip (the man in the trench coat and his menu)

  SCORE_BAR:      { y: 0,   h: 44 },
  CUSTOMER_AREA:  { y: 44,  h: 96 },
  KITCHEN:        { y: 140, h: 400 },
  SABOTEUR_STRIP: { y: 540, h: 60 },

  // The chef's centre can never leave this box.
  WALK_BOX: { left: 25, right: 425, top: 190, bottom: 516 },

  FLOOR_TILE_SIZE: 30,     // size of the checkerboard floor tiles

  // Customer area pieces
  CUSTOMER_X: 110,         // the customer's face
  CUSTOMER_Y: 84,
  CUSTOMER_SIZE: 48,
  PATIENCE_BAR: { x: 50, y: 118, w: 120, h: 10 },
  TICKET: { x: 250, y: 50, w: 130, h: 84 },   // the coloured order ticket
  SHOW_RECIPE_ON_TICKET: true,                // show the 3 ingredients on the ticket

  // Little "time left" badge that appears when you've been sabotaged
  COUNTDOWN_BADGE: { x: 8, y: 148, w: 128, h: 28 },

  // Saboteur strip pieces
  SABOTEUR_EMOJI: '🕵️',
  SABOTEUR_X: 30,
  SABOTEUR_SIZE: 38,
  SABOTAGE_MENU_X: 66,         // where the first menu item starts
  SABOTAGE_MENU_SPACING: 205,  // gap between menu items. Wide enough to leave room
                               // for the shady character between them.

  // The two shady characters lurking at the bottom of the screen, in trench
  // coats, hats and sunglasses. They keep glancing up-left and up-right, as
  // if checking nobody is watching. Drawn in shapes, so no picture needed.
  // Positions are fractions of the whole screen width: 0.25 = a quarter of
  // the way across from the left, 0.75 = three quarters.
  SHADY_POSITIONS: [0.25, 0.75],
  SHADY_FEET_Y: 597,        // where their feet are (600 is the very bottom)
  SHADY_SCALE: 0.8,         // 1 = normal size. Bigger than 0.8 pokes out of the strip.
  SHADY_GLANCE_MIN: 0.5,    // shortest wait before one looks somewhere new (seconds)
  SHADY_GLANCE_MAX: 1.4,    // longest wait
  SHADY_TURN_SPEED: 14,     // how fast their heads snap round. Higher = twitchier.
  SHADY_COAT: '#5b4a3a',    // trench coat colour
  SHADY_HAT: '#2b2622',     // hat colour
  SHADY_SKIN: '#e2b48c',


  // ==========================================================================
  //  STATIONS (where things are in the kitchen)
  // ==========================================================================
  //
  //  x = across (0 left wall, 450 right wall), y = down (140 top of kitchen,
  //  540 bottom). Keep stations at least 70 apart or they will overlap.
  //  There is room for more stations later (e.g. y 190 or y 500 along the walls).

  STATION_SIZE: 56,

  // Ingredient stations. Walk into one to pick up its ingredient.
  // The "ingredient" word must match an id in INGREDIENTS below.
  STATIONS: [
    { ingredient: 'patty',   x: 50,  y: 240 },
    { ingredient: 'cheese',  x: 50,  y: 340 },
    { ingredient: 'fries',   x: 50,  y: 440 },
    { ingredient: 'potato',  x: 400, y: 240 },
    { ingredient: 'ketchup', x: 400, y: 340 },
    { ingredient: 'beans',   x: 400, y: 440 }
  ],

  OVEN:    { x: 225, y: 350, size: 78, emoji: '🔥', label: 'OVEN' },
  BIN:     { x: 225, y: 495, size: 56, emoji: '🗑️', label: 'BIN' },
  // The serving counter, just under the customer. Walk into it holding a plate.
  COUNTER: { x: 225, y: 168, w: 170, h: 40, label: '🛎️ SERVE' },

  // The fire extinguisher, hanging on a hook just right of the oven.
  // Walk into it to grab it; walk into a fire while holding it to put it out.
  EXTINGUISHER: { x: 300, y: 350, size: 44, emoji: '🧯', label: 'FIRE' },


  // ==========================================================================
  //  KITCHEN FIRES 💥🔥
  // ==========================================================================
  //
  //  Every so often something explodes in each kitchen and leaves a fire.
  //  Grab the 🧯 next to the oven and walk into the fire to put it out.
  //  If it's still burning when the time runs out, you pay for the damage.
  //  Each kitchen gets its own fires, at its own random times.

  FIRES_ON: true,              // false = no fires at all
  FIRE_FIRST_DELAY: 20,        // seconds into a round before the first explosion
  FIRE_GAP_MIN: 15,            // shortest wait between fires (seconds)
  FIRE_GAP_MAX: 30,            // longest wait between fires (seconds)
  FIRE_SECONDS: 10,            // how long you have to put it out
  FIRE_SIZE: 50,               // how big the fire is drawn (the hitbox is 75% of this)
  FIRE_DAMAGE: 100,            // $ lost if it burns out. Money never goes below $0.
  FIRE_PUT_OUT_POINTS: 1,      // sabotage points for putting one out
  FIRE_BOOM_SECONDS: 0.5,      // how long the 💥 shows before it turns into 🔥

  // Where fires can break out. Kept clear of the stations, oven and bin so
  // there's always a way to reach them. Add or move spots freely.
  FIRE_SPOTS: [
    { x: 140, y: 250 }, { x: 310, y: 250 },
    { x: 140, y: 350 },
    { x: 140, y: 450 }, { x: 310, y: 450 }
  ],


  // ==========================================================================
  //  INGREDIENTS (all of them, even ones without a station yet)
  // ==========================================================================
  //  If an emoji shows as an empty box on your laptop, swap it for another.

  INGREDIENTS: [
    { id: 'patty',   emoji: '🍔', name: 'Patty' },
    { id: 'fries',   emoji: '🍟', name: 'Fries' },
    { id: 'ketchup', emoji: '🥫', name: 'Ketchup' },
    { id: 'potato',  emoji: '🥔', name: 'Potato' },
    { id: 'cheese',  emoji: '🧀', name: 'Cheese' },
    { id: 'beans',   emoji: '🫘', name: 'Beans' },
    { id: 'steak',   emoji: '🥩', name: 'Steak' },
    { id: 'greens',  emoji: '🥦', name: 'Greens' },
    { id: 'fish',    emoji: '🐟', name: 'Fish' },
    { id: 'lemon',   emoji: '🍋', name: 'Lemon' },
    { id: 'shell',   emoji: '🌮', name: 'Taco Shell' },
    { id: 'chilli',  emoji: '🌶️', name: 'Chilli' }
  ],


  // ==========================================================================
  //  DISHES (what customers order)
  // ==========================================================================
  //
  //  enabled: true  = customers can order it.
  //  To switch a dish on, set enabled: true AND make sure every one of its
  //  ingredients has a station in STATIONS above — otherwise nobody can make it.
  //  cookSeconds = how long it sits in the oven.

  DISHES: [
    { id: 'burger', name: 'Burger & Fries',     emoji: '🍔', ticketColor: '#e5483b', // tomato red
      ingredients: ['patty', 'fries', 'ketchup'], cookSeconds: 4, enabled: true },

    { id: 'jacket', name: 'Loaded Jacket Spud', emoji: '🧀', ticketColor: '#f2a900', // marigold yellow
      ingredients: ['potato', 'cheese', 'beans'], cookSeconds: 5, enabled: true },

    { id: 'steak',  name: 'Steak & Mash',       emoji: '🥩', ticketColor: '#6a3fa0', // deep purple
      ingredients: ['steak', 'potato', 'greens'], cookSeconds: 6, enabled: false },

    { id: 'fish',   name: 'Fish & Chips',       emoji: '🐟', ticketColor: '#1e73be', // ocean blue
      ingredients: ['fish', 'fries', 'lemon'],    cookSeconds: 5, enabled: false },

    { id: 'taco',   name: 'Spicy Potato Taco',  emoji: '🌮', ticketColor: '#7cb342', // lime green
      ingredients: ['shell', 'potato', 'chilli'], cookSeconds: 4, enabled: false }
  ],

  // What comes out of the oven if the 3 ingredients don't make any dish.
  // Serving it counts as a wrong dish.
  SLOP: { id: 'slop', name: 'Mystery Slop', emoji: '🤢', cookSeconds: 3 },


  // ==========================================================================
  //  CUSTOMERS
  // ==========================================================================

  CUSTOMER_PATIENCE_SECONDS: 20,  // how long the patience bar lasts
  CUSTOMER_LEAVE_SECONDS: 0.8,    // how long a served customer hangs about before leaving
  CUSTOMER_GAP_SECONDS: 1.0,      // empty counter time before the next customer arrives

  CUSTOMER_FACES: ['🧑', '👩', '👨', '👵', '👴', '🧔', '👱', '👷'],
  FACE_IMPATIENT: '😤',   // patience bar ran out
  FACE_HAPPY: '😋',       // served on time
  FACE_LATE: '😒',        // served late
  FACE_ANGRY: '😡',       // served the wrong thing


  // ==========================================================================
  //  SABOTAGE (the man in the trench coat)
  // ==========================================================================
  //
  //  Paid for with sabotage POINTS, not dollars. Hits the OTHER player.
  //  Only one sabotage can be running on a player at a time.
  //  cost = points, seconds = how long it lasts.
  //  The id must match the names in each player's sabotageKeys above.

  SABOTAGES: [
    { id: 'freeze', name: 'OVEN FREEZE',    shortName: 'FROZEN',   emoji: '🧊',
      cost: 3, seconds: 6, sound: 'freeze', flashColor: '#9fe8ff' },

    { id: 'slip',   name: 'SLIPPERY FLOOR', shortName: 'SLIPPERY', emoji: '🧈',
      cost: 4, seconds: 6, sound: 'slip',   flashColor: '#ffe066' }

    // Saved for later rounds (need code in game.js too):
    // { id: 'rat',   name: 'RAT RAID',   emoji: '🐀', cost: 5, ... },
    // { id: 'karen', name: 'KAREN CALL', emoji: '😡', cost: 6, ... }
  ],

  SABOTAGE_ANNOUNCE_SECONDS: 1.6,   // how long the big announcement stays up
  SABOTAGE_FLASH_SECONDS: 0.35,     // how long the screen flash lasts
  SABOTAGE_SHAKE_SECONDS: 0.35,     // how long the victim's half shakes
  SABOTAGE_SHAKE_PIXELS: 7,         // how hard it shakes
  SABOTAGE_EFFECT_SOUND_DELAY: 0.3, // seconds between the "sabotage" sting and the freeze/slip sound

  // Where the little butter blobs appear on a slippery floor (decoration only)
  BUTTER_SPOTS: [
    { x: 140, y: 230 }, { x: 310, y: 280 }, { x: 130, y: 410 },
    { x: 320, y: 450 }, { x: 225, y: 440 }, { x: 225, y: 250 }
  ],


  // ==========================================================================
  //  FLOATING TEXT ("+$100" that drifts up after a serve)
  // ==========================================================================

  FLOAT_TEXT_SECONDS: 1.3,   // how long it stays on screen
  FLOAT_TEXT_RISE: 40,       // how fast it drifts up, pixels per second


  // ==========================================================================
  //  SOUND
  // ==========================================================================

  SOUND_VOLUME: 0.4,         // 0 = silent, 1 = loud. M mutes during play.


  // ==========================================================================
  //  COLOURS
  // ==========================================================================
  //  Written as #rrggbb. Search "color picker" in a browser to find codes.

  COLORS: {
    BACKGROUND:     '#14121c',
    DIVIDER:        '#000000',
    SCORE_BAR:      '#23202f',
    CUSTOMER_AREA:  '#3b2f2a',
    FLOOR_A:        '#d9d2c3',
    FLOOR_B:        '#cbc3b2',
    STRIP:          '#1d1530',
    STRIP_EDGE:     '#4a3a6b',
    TILE:           '#fff8ec',
    TILE_EDGE:      '#8a7a66',
    OVEN:           '#3a3a44',
    OVEN_EDGE:      '#15151a',
    COUNTER:        '#a0673a',
    COUNTER_EDGE:   '#5e3a1e',
    BIN:            '#6e7b85',
    TEXT:           '#ffffff',
    TEXT_DARK:      '#2a2a2a',
    TEXT_DIM:       '#9a93ad',
    OUTLINE:        '#000000',
    MONEY:          '#7ddc6a',
    POINTS:         '#c69cff',
    GOLD:           '#ffd700',
    BAR_BACK:       '#00000066',
    PATIENCE_GOOD:  '#5fd35f',
    PATIENCE_MID:   '#f2b134',
    PATIENCE_LOW:   '#e5483b',
    COOK_BAR:       '#ff9a3c',
    FROZEN_TINT:    '#bff0ff',
    SLIPPERY_TINT:  '#ffe066',
    HINT:           '#ffe9a8',
    WRONG:          '#ff6b6b',
    KEYCAP:         '#ece6f7'
  },


  // ==========================================================================
  //  WORDS ON SCREEN
  // ==========================================================================
  //  {TARGET} gets swapped for TARGET_MONEY. {NAME} gets swapped for P1 or P2.

  TEXT: {
    TITLE:            'SPUD RUSH: KITCHEN WARS',
    SUBTITLE:         'First to ${TARGET} wins!',
    HOW_TO_PLAY:      'Walk into 3 ingredients  →  walk into the 🔥 oven  →  grab the plate  →  serve the customer',
    HOW_TO_PLAY_2:    'Wrong armful? Walk into the 🗑️ bin.   Earn points, then sabotage your rival!',
    P1_CONTROLS:      'P1 👨‍🍳   Move: W A S D     Sabotage: 1 = 🧊 Oven Freeze   2 = 🧈 Slippery Floor',
    P2_CONTROLS:      'P2 👩‍🍳   Move: Arrow keys   Sabotage: 7 = 🧊 Oven Freeze   8 = 🧈 Slippery Floor',
    PRESS_START:      'Press any key to start',
    MUTE_HINT:        'M = sound on / off',

    POINTS_LABEL:     'pts',
    LATE:             'LATE – half pay',
    OVEN_READY:       'READY!',
    LATE_SUFFIX:      ' (late)',
    SERVED_WRONG:     'WRONG DISH! $0',
    SERVED_SLOP:      'SLOP?! $0',

    HINT_NEED_3:      'Need 3 ingredients!',
    HINT_HANDS_FULL:  'Hands full! Use the 🗑️',
    HINT_FROZEN:      '🧊 Frozen shut!',
    HINT_COOK_FIRST:  'Cook it in the 🔥 first!',
    HINT_GET_EXTINGUISHER: 'Grab the 🧯 by the oven!',

    FIRE_STARTED:     '💥 FIRE!',
    FIRE_PUT_OUT:     'Fire out!',
    FIRE_BURNED:      '🔥 Burned! -$',

    NOT_ENOUGH_POINTS: 'Not enough pts!',
    ALREADY_SABOTAGED: 'They are already sabotaged!',
    SABOTAGE_SENT:     'Sabotage sent!',
    SABOTAGE_FROM:     'courtesy of {NAME}',

    WINS:             '{NAME} WINS!',
    PLAY_AGAIN:       'Press R to play again'
  }
};
