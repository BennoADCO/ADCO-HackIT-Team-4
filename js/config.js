// ============================================================================
//  SPUD RUSH — SETTINGS
// ============================================================================
//
//  THIS IS THE FILE TO FIDDLE WITH.
//
//  Every number and every word in the game lives here. Nothing in this file
//  does anything clever — it is just a long list of labelled values. Change
//  one, save the file, press F5 in the browser, and the game changes.
//
//  You cannot break the game permanently by editing this file. If something
//  goes wrong, undo your change (Ctrl+Z), save, press F5.
//
//  A "second" is a real second. A "pixel" is a dot on the screen, and the
//  whole kitchen is 500 dots wide and 500 dots tall.
//
// ============================================================================

var CONFIG = {

  // ==========================================================================
  //  THE SCREEN
  // ==========================================================================

  // The size of the kitchen, in pixels. The game always thinks it is this
  // size no matter how big the window is — CSS stretches it to fit.
  WIDTH: 500,
  HEIGHT: 500,

  // How many real dots we draw per game pixel. 2 means the picture is drawn
  // at double resolution so it stays sharp on a good screen. Leave this be.
  SHARPNESS: 2,


  // ==========================================================================
  //  THE CHEFS (the two robots you drive)
  // ==========================================================================
  //
  //  Two players, one kitchen. Both chefs share the coins, the lives and the
  //  best score. Each one has its own battery and its own hands.

  CHEF_SPEED: 140,        // pixels per second. Higher = faster running.
  CHEF_WIDTH: 48,         // how wide each chef is drawn
  CHEF_HEIGHT: 66,        // how tall each chef is drawn

  // Where each chef stands when a round begins. Both spots must be inside the
  // walk box below, and at least a chef's width (48) apart so they don't
  // start on top of each other.
  P1_START_X: 210,
  P1_START_Y: 300,
  P2_START_X: 290,
  P2_START_Y: 300,

  // Each player's colour. It's used for the ring on the floor under their
  // chef, the little number over its head, their battery in the top corner,
  // and the glow around whatever their action key will use.
  P1_COLOUR: '#ff3b8d',   // pink
  P2_COLOUR: '#2979ff',   // blue

  // How close a chef has to be to a station before the action key will work
  // on it. Bigger number = more forgiving. 38 is about a chef-and-a-half.
  REACH: 38,

  // Standing on open floor with nothing in reach, the action key puts down
  // whatever you're holding — and picks it up again if your hands are empty.
  // This is how close you have to be to a potato on the floor to pick it up.
  DROP_REACH: 30,

  // The box his FEET are allowed to stay inside. He can't walk outside this.
  // His head and body are allowed to overlap the furniture, which is what
  // makes it look like a kitchen instead of a chessboard.
  WALK_LEFT: 110,
  WALK_RIGHT: 390,
  WALK_TOP: 168,
  WALK_BOTTOM: 398,


  // ==========================================================================
  //  THE OVEN — the most important numbers in the game
  // ==========================================================================
  //
  //  A potato put in the oven passes through four stages. These numbers are
  //  how many seconds it takes to reach each one.
  //
  //     0 seconds  ............  RAW      (pale, unchanged)
  //     COOKED_AT  ............  COOKED   (golden brown)
  //     BURNT_AT   ............  BURNT    (black, smoking) - people order this!
  //     RUINED_AT  ............  RUINED   (grey lump, bin it)
  //
  //  Making the gaps SMALLER makes the game harder and more frantic.
  //  Making them BIGGER makes it gentler. If the room finds it stressful,
  //  this is the first thing to change.

  OVEN_COOKED_AT: 3,
  OVEN_BURNT_AT: 8,
  OVEN_RUINED_AT: 13,


  // ==========================================================================
  //  THE CUSTOMERS
  // ==========================================================================

  // Seconds between new customers arriving. This is a GAP, not a rate — a
  // BIGGER number means FEWER customers. To cut the crowd by a quarter you
  // divide by 0.75, which is how 1.75 became 2.33.
  SPAWN_EVERY: 2.33,
  PATIENCE: 30,           // seconds a customer waits before storming off

  // The first two customers get an easier time of it, so nobody loses in the
  // first ten seconds while they're still working out the controls.
  // 1.5 means "half again as much patience as normal".
  BEGINNER_PATIENCE_BONUS: 1.5,

  // How the game gets harder the longer you survive.
  // Customers arrive faster, and they get less patient.
  SPAWN_RAMP_SECONDS: 200,   // after this long, spawning is at its fastest
  SPAWN_FASTEST: 0.4,        // 0.4 = arrive 2.5x as often as at the start
  PATIENCE_RAMP_SECONDS: 260,
  PATIENCE_SHORTEST: 0.45,   // 0.45 = under half the patience they started with


  // ==========================================================================
  //  SCORING
  // ==========================================================================

  PAY_BASE: 10,           // coins for any correct potato
  PAY_SPEED_BONUS: 20,    // extra coins, scaled by how much patience was left
  // Angry customers before the kitchen closes. The hearts in the top right
  // lay themselves out to fit, so you can put any number here.
  STRIKES_ALLOWED: 10,


  // ==========================================================================
  //  THE CHEFS' BATTERIES
  // ==========================================================================
  //
  //  Each chef runs on its own battery, shown as a yellow bar above its head
  //  and again in the top right corner. It drains the whole time it's working.
  //
  //     FULL battery  ->  full running speed
  //     HALF battery  ->  noticeably sluggish
  //     FLAT battery  ->  that chef collapses on the spot, and its player's
  //                       keys stop working. The OTHER chef can pick it up
  //                       (empty hands, action key) and carry it to the
  //                       charging pad to wake it up. If BOTH chefs are flat
  //                       at once, the round ends.
  //
  //  To fill it back up a chef stands on the charging pad in the top right.
  //  No key needed — just walking onto it is enough.
  //
  //  This is the second clock in the game, running against the oven and the
  //  customers. If the room finds it punishing, make BATTERY_LASTS bigger.

  BATTERY_LASTS: 75,          // seconds from full to flat if you never charge
  BATTERY_SLOWEST: 0.35,      // speed on a nearly-flat battery (0.35 = a third)
  BATTERY_RECHARGE_RATE: 70,  // how much of the bar refills per second on the pad
  BATTERY_LOW_AT: 25,         // below this the bar turns red and flashes

  // Where the charging pad sits. It is in the top right of the kitchen floor,
  // deliberately across the room from the ovens so topping up costs you time.
  CHARGER_X: 304,
  CHARGER_Y: 166,
  CHARGER_WIDTH: 48,
  CHARGER_HEIGHT: 64,

  // How close his feet have to get to the base of the pad to start charging.
  // This is a circle around the bottom of the pad, not a box.
  CHARGER_GRIP: 34,

  BATTERY_FULL_COLOUR: '#f2c230',   // the yellow bar
  BATTERY_LOW_COLOUR: '#e0483c',    // what it turns when it's nearly flat
  CHARGE_SPARK: '#fff6b0',          // the sparks that fly while charging


  // ==========================================================================
  //  HELPER ROBOTS (the parts table)
  // ==========================================================================
  //
  //  Walk to the parts table in the top left and, with EMPTY hands, press
  //  your action key to build a helper robot. It reads the customers' orders
  //  and fulfils them on its own.
  //
  //  Helpers run on batteries (see HELPER_BATTERY_LASTS below). They are lost
  //  when you restart.
  //
  //  With the numbers below the robots cost 1, 2, 4, 9 and 20 coins — cheap,
  //  so the room can see them working straight away. Put HELPER_FIRST_COST
  //  back up to about 60 once everyone has had a play, or the game gives
  //  itself away in the first twenty seconds.

  HELPER_FIRST_COST: 1,         // coins for helper number one
  HELPER_COST_MULTIPLIER: 2.2,  // each one costs this much more than the last
  // The most you can have at once. Set to 0 for no limit at all — the price
  // doubling over and over is what stops you, not a rule.
  //
  // Worth knowing: helpers only work when there is a customer nobody else has
  // claimed, and only BAY_COUNT customers fit in the hatch. So past about six
  // robots the extra ones mostly stand around looking pleased with themselves.
  HELPER_MAX: 0,

  // How fast helpers walk compared to you, at full battery. Deliberately
  // slower — if they were as quick as you, the game would play itself.
  HELPER_SPEED: 0.7,

  // A short pause at each station so you can see them working rather than
  // snapping from place to place.
  HELPER_PAUSE: 0.35,

  // Helpers run on batteries too. When one goes flat it collapses on the spot
  // and stays there until a chef carries it to the charging pad. Walk up to a
  // collapsed robot with empty hands, press your action key to hoist it, then
  // stand on the pad.
  HELPER_BATTERY_LASTS: 22.5,   // seconds of work before a helper collapses
  // How close you must be to pick up a flat robot — a helper, or the other
  // chef when its battery has run out.
  HELPER_PICKUP_REACH: 34,

  HELPER_SCALE: 0.88,           // drawn slightly smaller than you
  HELPER_TINTS: ['#4fc3f7', '#9ccc65', '#ff8a65', '#ba68c8'],  // floor ring colours

  // The parts table, top left of the floor.
  //
  // CAREFUL: do not move this further left. The Large garden bed is reached
  // from about x 110-124, and a table sitting on top of those few spots makes
  // that bed impossible to use.
  // It also must not sit in the strip just below the hatch (y 168-190), or it
  // steals the spot you stand on to serve a customer.
  PARTS_X: 150,
  PARTS_Y: 208,
  PARTS_WIDTH: 60,
  PARTS_HEIGHT: 52,

  // How close your feet must be to the FRONT of the parts table (the middle
  // of its bottom edge) before the action key will buy a robot there.
  //
  // The table stands out on the open floor, unlike everything else, which
  // sits against a wall. Measured from its whole outline, a big patch of
  // floor all the way round it would count as "at the table". Measured from
  // one spot at the front, it takes up about as much floor as the other
  // stations do. Bigger number = easier to hit.
  PARTS_REACH: 24,


  // ==========================================================================
  //  WHERE EVERYTHING SITS
  // ==========================================================================
  //
  //  Positions are measured from the TOP-LEFT corner of the kitchen.
  //  x = how far across.  y = how far down.
  //
  //  Moving a station here moves both the picture AND the spot the chef has
  //  to stand — they can never drift apart.

  // The three garden beds, stacked down the left wall.
  //
  // The chef reaches these from their RIGHT-HAND edge, which needs to stay at
  // about x=86. So if you make the beds narrower, push BED_X right by the
  // same amount to keep that edge where it is — otherwise he can't reach them.
  //
  // Up and down, the usable band is y 182 to 386. Above that the serving
  // hatch is nearer and steals the highlight; below it, the bin does.
  //
  // Keep BED_WIDTH and BED_HEIGHT at roughly 6:7 or the artwork looks squashed.
  BED_X: 24,
  BED_TOP: 150,
  BED_GAP: 80,            // vertical distance from one bed to the next
  BED_WIDTH: 62,
  BED_HEIGHT: 72,

  // The four paint jars, stacked down the right wall.
  //
  // CAREFUL with these two. The chef can only walk as far right as 390, and
  // he can only use something within 38 pixels of him. So the jars have to
  // start at 428 or less, or he can never reach them. 424 leaves a little
  // room to spare.
  //
  // The same trap applies up and down: above y=192 the serving hatch is
  // nearer than the jar and steals it, and below y=370 oven B does. Keep the
  // whole column between those two numbers.
  JAR_X: 424,
  JAR_TOP: 200,
  JAR_GAP: 44,
  JAR_WIDTH: 36,
  JAR_HEIGHT: 40,

  // The bin, bottom left.
  BIN_X: 90,
  BIN_Y: 410,
  BIN_WIDTH: 60,
  BIN_HEIGHT: 78,

  // The two ovens along the bottom.
  OVEN_POSITIONS: [ { x: 168, y: 404 }, { x: 296, y: 404 } ],
  OVEN_WIDTH: 112,
  OVEN_HEIGHT: 84,

  // The serving hatch in the back wall, and the three customer bays in it.
  HATCH_X: 40,
  HATCH_Y: 18,
  HATCH_WIDTH: 420,
  HATCH_HEIGHT: 82,
  // How many customers can be waiting at once, and how wide each one's slot
  // in the hatch is. These two multiply out to the hatch width: 6 x 70 = 420.
  // Change one and you must change the other, or the last customer will be
  // drawn off the end of the hole in the wall.
  //
  // More customers means each one is drawn smaller — everything below is
  // worked out from BAY_WIDTH, so the robots and their speech bubbles shrink
  // to fit automatically.
  BAY_COUNT: 6,
  BAY_WIDTH: 70,
  BAY_REACH_HEIGHT: 140,  // how far DOWN from the hatch the chef can serve


  // ==========================================================================
  //  THE POTATOES
  // ==========================================================================

  // The three sizes. These names must match the picture filenames.
  SIZES: ['large', 'xlarge', 'poggolithic'],

  // The five colours. 'natural' means never dunked.
  COLOURS: ['natural', 'red', 'blue', 'green', 'yellow'],

  // The four paint jars, in the order they appear down the right wall.
  JAR_COLOURS: ['red', 'blue', 'green', 'yellow'],

  // The burnt/cooked marks are drawn bigger on bigger potatoes.
  OVERLAY_SCALE: { large: 1, xlarge: 1.3, poggolithic: 1.6 },

  // How big potatoes are drawn in different places on screen.
  POTATO_IN_HANDS: 0.8,
  POTATO_IN_OVEN: 0.7,
  POTATO_IN_BUBBLE: 0.62,
  POTATO_ON_FLOOR: 0.7,


  // ==========================================================================
  //  COLOURS AND LOOK
  // ==========================================================================

  INK: '#2a2320',               // the dark outline colour used for text
  // (The pulsing glow round whatever a chef's action key will use is drawn
  // in that player's colour — see P1_COLOUR and P2_COLOUR up top.)

  // The splash of paint that puffs out when you dunk a potato.
  PAINT_SPLASH: { red: '#d9392b', blue: '#2f6fd6', green: '#3aa845', yellow: '#f2c230' },

  SOIL_PUFF: '#6b4a2f',         // dust when you pull a potato up
  BIN_PUFF: '#9a9a94',          // dust when you bin one

  // A chunky font that is already on every Windows machine. We are not
  // allowed to download one, so this is the next best thing.
  FONT: '"Arial Black", "Segoe UI Black", Impact, system-ui, sans-serif',


  // ==========================================================================
  //  THE NOISE
  // ==========================================================================
  //
  //  There are no sound files. Every noise is built by the browser as it is
  //  needed. These numbers control how loud it all is.
  //
  //  Volumes run from 0 (silent) to 1 (full). If the room finds it annoying,
  //  turn MASTER_VOLUME down rather than switching it off — the oven chime
  //  and the battery beep are genuinely useful to hear.
  //
  //  Press M in the game to mute.

  SOUND_ON: true,           // set to false for a permanently silent game
  MASTER_VOLUME: 0.5,       // the overall knob
  SFX_VOLUME: 0.7,          // beeps, thuds and dings
  MUSIC_VOLUME: 0.35,       // the background tune, deliberately well underneath

  // The tune speeds up as the round gets harder, using the same clock that
  // makes customers arrive faster.
  MUSIC_BPM_START: 100,
  MUSIC_BPM_MAX: 140,
  MUSIC_RAMP_SECONDS: 200,

  // Helper robots make their noises quieter than you do, so that five robots
  // working at once doesn't drown out what YOU are doing.
  HELPER_SOUND_GAIN: 0.35,

  // The same sound can't repeat faster than this, in seconds. Stops a busy
  // kitchen turning into a machine gun.
  SOUND_THROTTLE: 0.06,


  // ==========================================================================
  //  THE KEYS
  // ==========================================================================
  //
  //  Keys are named by WHERE they are on the keyboard, not by what they type,
  //  so Num Lock and Shift make no difference:
  //
  //     'KeyW'     the W key
  //     'Numpad8'  8 on the number pad, on the right of a full keyboard
  //     'Digit8'   8 on the row of numbers along the top
  //
  //  Each action can have more than one key — list them all in the brackets.
  //  Player 2 gets both the number pad AND the top row, because a lot of
  //  laptops have no number pad at all.
  //
  //  If you change a key here, change the words further down to match, and
  //  the line of help text under the game in index.html.

  P1_KEYS: {
    up:     ['KeyW'],
    down:   ['KeyS'],
    left:   ['KeyA'],
    right:  ['KeyD'],
    action: ['KeyE']
  },

  P2_KEYS: {
    up:     ['Numpad8', 'Digit8'],
    down:   ['Numpad5', 'Digit5'],
    left:   ['Numpad4', 'Digit4'],
    right:  ['Numpad6', 'Digit6'],
    action: ['Numpad7', 'Digit7']
  },

  RESTART_KEY: 'KeyR',    // starts a new round once the kitchen has closed
  MUTE_KEY: 'KeyM',       // sound off and on


  // ==========================================================================
  //  THE WORDS ON SCREEN
  // ==========================================================================

  TITLE: 'SPUD RUSH',
  TITLE_HINT: 'Click or press a key to start',
  TITLE_CONTROLS_P1: 'Player 1:  W A S D to walk  ·  E to use',
  TITLE_CONTROLS_P2: 'Player 2:  8 4 5 6 to walk  ·  7 to use',
  TITLE_CONTROLS_NOTE: '(number pad, or the number keys along the top)',
  PAUSED: 'Paused',
  PAUSED_HINT: 'Click or press a key to resume',
  GAME_OVER: 'KITCHEN CLOSED',
  GAME_OVER_WHY: 'Too many unhappy customers',       // under GAME_OVER
  GAME_OVER_FLAT: 'BOTH CHEFS FLAT',                 // shown when the batteries ran out instead
  GAME_OVER_FLAT_WHY: 'Both batteries ran out at once',
  GAME_OVER_HINT: 'Press R to go again',
  TITLE_BATTERY: 'Keep your batteries up — stand on the charger to refill',
  // The helper-robot lines. Keep each one about this long or shorter —
  // anything wider than the screen gets squashed to fit.
  TITLE_HELPERS: 'Parts table: empty hands + E / 7 buys a helper for coins',
  TITLE_FLAT: 'Helper or partner gone flat? Empty hands + E / 7 lifts it,',
  TITLE_FLAT_2: 'then walk onto the charger to wake it up',
  TITLE_MUTE: 'M to mute',
  HUD_P1: 'P1',           // the labels on the two batteries in the top corner
  HUD_P2: 'P2',
  BEST_LABEL: 'Best: ',
  COINS_LABEL: ' coins',


  // ==========================================================================
  //  BITS AND PIECES
  // ==========================================================================

  // Where the pictures live, relative to index.html.
  ASSETS: 'assets/',

  // Set this to true to see the chef's walk box and every station's hit area
  // drawn as dashed outlines. Handy when you've moved something and want to
  // check the chef can still reach it. Set it back to false afterwards.
  SHOW_ZONES: false

};
