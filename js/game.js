// ============================================================================
//  SPUD RUSH: KITCHEN WARS — THE RULES
// ============================================================================
//
//  This file is the game itself: what happens when a chef touches a
//  station, how the oven cooks, how customers pay, how sabotage works, and
//  how everything is drawn.
//
//  Every number lives in config.js. If you want to change HOW MUCH or HOW
//  FAST, go there. Come here to change WHAT HAPPENS.
//
//  Map of this file:
//    1. Game state          — the few things the whole game remembers
//    2. Setting up a round  — making fresh players, starting, restarting
//    3. Looking things up   — find a dish or ingredient by its id
//    4. Update              — moving the game on, a tiny step at a time
//    5. Stations            — pick up, oven, bin, serving counter
//    6. Customers           — arriving, waiting, getting served
//    7. Sabotage            — buying it, and what it does
//    8. Keys                — single key presses
//    9. Drawing             — painting everything
//   10. Go!                 — start the loop
// ============================================================================


// ============================================================================
//  1. GAME STATE
// ============================================================================

// Which screen we're on:
//   'title'   — the start screen
//   'playing' — the race is on
//   'over'    — someone reached the target; waiting for R
var state = 'title';

// The two players. players[0] is P1 (left), players[1] is P2 (right).
// Each one is an "object" — a bundle of named values, like a form with fields.
var players = [];

var winnerIndex = -1;     // 0 = P1 won, 1 = P2 won, -1 = nobody yet
var floatingTexts = [];   // the "+$100" messages drifting up the screen
var clock = 0;            // seconds since the page opened (for blinking and bobbing)

// Both players get the SAME run of orders (customer 1 wants the same dish
// for both, customer 2 the same, and so on) so the race is fair.
// This list grows as customers are needed.
var dishSequence = [];


// ============================================================================
//  2. SETTING UP A ROUND
// ============================================================================

// Build a brand new player from their settings in config.js.
function makePlayer(index) {
  var setup = CONFIG.PLAYERS[index];
  return {
    index: index,
    name: setup.name,
    emoji: setup.emoji,
    color: setup.color,
    keys: setup.keys,
    sabotageKeys: setup.sabotageKeys,
    offsetX: index * CONFIG.HALF_WIDTH,   // P1 draws at x 0, P2 at x 450

    // Where the chef is, inside their own half
    x: setup.startX,
    y: setup.startY,
    moving: false,

    // What the chef is carrying: up to 3 ingredient ids, AND/OR one finished
    // plate. Carrying both lets you load the next dish before you serve.
    held: [],
    plate: null,          // the id of the dish on the plate, or null for none
    plateLook: null,      // what the plate LOOKS like (a wrong mix can look normal)

    money: 0,
    points: 0,            // sabotage points

    // Which stations the chef is standing in right now (so a pickup only
    // happens on the moment you walk IN, not every frame you stand there)
    inside: {},

    oven: {
      state: 'empty',     // 'empty', 'cooking' or 'done'
      dishId: null,       // what will come out
      lookId: null,       // what it will LOOK like when it comes out
      contents: [],       // the ingredients that went in (drawn while cooking)
      timeLeft: 0,
      totalTime: 0
    },

    // The customers at this player's counter: a list (an "array" — a
    // numbered list of things) with one entry per spot at the counter.
    // Filled in by resetGame().
    customers: [],
    customerCount: 0,     // how many customers this player has had so far

    sabotage: null,       // the sabotage hitting THIS player, or null
    announce: null,       // the big "OVEN FREEZE!" message, or null
    pendingSound: null,   // a sound waiting to play a moment later
    flash: 0,             // seconds of screen flash left
    shake: 0              // seconds of screen shake left
  };
}

// One empty spot at the counter.
function makeCustomerSpot() {
  return {
    state: 'empty',     // 'waiting', 'leaving' or 'empty'
    face: '',
    dishId: null,       // what they ordered
    patience: 0,        // seconds of patience left
    timer: 0            // counts down while 'leaving' or 'empty'
  };
}

// Wipe everything and set up a fresh round.
function resetGame() {
  players = [makePlayer(0), makePlayer(1)];
  winnerIndex = -1;
  floatingTexts = [];
  dishSequence = [];
  for (var i = 0; i < players.length; i++) {
    var p = players[i];
    for (var s = 0; s < CONFIG.CUSTOMER_QUEUE_SIZE; s++) {
      var spot = makeCustomerSpot();
      // The first customer is there straight away; the others turn up
      // one after another, so you're not swamped in the first second.
      spot.timer = s * CONFIG.CUSTOMER_START_STAGGER;
      p.customers.push(spot);
    }
    newCustomer(p, p.customers[0]);
  }
}

// Start playing (from the title screen, or R after a win).
function startGame() {
  resetGame();
  state = 'playing';
  sfx('start');
  startMusic();
}

// Somebody hit the target money.
function declareWinner(p) {
  state = 'over';
  winnerIndex = p.index;
  stopMusic();
  sfx('win');
}


// ============================================================================
//  3. LOOKING THINGS UP
// ============================================================================

// Find a dish by its id ('burger', 'jacket', 'slop'...). Returns null if none.
function findDish(id) {
  if (id === CONFIG.SLOP.id) {
    return CONFIG.SLOP;
  }
  for (var i = 0; i < CONFIG.DISHES.length; i++) {
    if (CONFIG.DISHES[i].id === id) {
      return CONFIG.DISHES[i];
    }
  }
  return null;
}

// Find an ingredient by its id ('patty', 'beans'...). Returns null if none.
function findIngredient(id) {
  for (var i = 0; i < CONFIG.INGREDIENTS.length; i++) {
    if (CONFIG.INGREDIENTS[i].id === id) {
      return CONFIG.INGREDIENTS[i];
    }
  }
  return null;
}

function ingredientEmoji(id) {
  var ingredient = findIngredient(id);
  if (ingredient === null) return '❓';
  return ingredient.emoji;
}

function dishEmoji(id) {
  var dish = findDish(id);
  if (dish === null) return '❓';
  return dish.emoji;
}

// The list of dishes customers are allowed to order right now.
function enabledDishes() {
  var list = [];
  for (var i = 0; i < CONFIG.DISHES.length; i++) {
    if (CONFIG.DISHES[i].enabled) {
      list.push(CONFIG.DISHES[i]);
    }
  }
  return list;
}

// Do these carried ingredients make an enabled dish? Order doesn't matter.
// Returns the dish, or null if it's Mystery Slop.
function matchRecipe(held) {
  var dishes = enabledDishes();
  for (var i = 0; i < dishes.length; i++) {
    var recipe = dishes[i].ingredients;
    if (recipe.length !== held.length) {
      continue;
    }
    var allThere = true;
    for (var j = 0; j < recipe.length; j++) {
      if (held.indexOf(recipe[j]) === -1) {
        allThere = false;
      }
    }
    if (allThere) {
      return dishes[i];
    }
  }
  return null;
}

// Which real dish is closest to these ingredients? (The one sharing the
// most ingredients with them.) Used to disguise a wrong mix.
function closestDish(held) {
  var dishes = enabledDishes();
  var best = null;
  var bestShared = -1;
  for (var i = 0; i < dishes.length; i++) {
    var shared = 0;
    for (var j = 0; j < held.length; j++) {
      if (dishes[i].ingredients.indexOf(held[j]) !== -1) {
        shared = shared + 1;
      }
    }
    if (shared > bestShared) {
      best = dishes[i];
      bestShared = shared;
    }
  }
  if (best === null) {
    return CONFIG.SLOP;   // safety net if every dish was switched off
  }
  return best;
}

// Is this particular sabotage currently hitting this player?
function hasSabotage(p, id) {
  return p.sabotage !== null && p.sabotage.id === id;
}

// Find a sabotage's settings by its id ('freeze', 'slip').
function findSabotage(id) {
  for (var i = 0; i < CONFIG.SABOTAGES.length; i++) {
    if (CONFIG.SABOTAGES[i].id === id) {
      return CONFIG.SABOTAGES[i];
    }
  }
  return null;
}

// Pop up a little message that drifts up and fades. (x, y) are inside the
// player's half — we add their offset so it lands in the right kitchen.
function addFloatingText(p, x, y, text, color, size) {
  floatingTexts.push({
    x: p.offsetX + x,
    y: y,
    text: text,
    color: color,
    size: size || 18,
    timeLeft: CONFIG.FLOAT_TEXT_SECONDS
  });
}


// ============================================================================
//  4. UPDATE — called about 60 times a second with dt (seconds since last)
// ============================================================================

function update(dt) {
  clock = clock + dt;
  updateFloatingTexts(dt);

  // Nothing moves on the title screen or after a win.
  if (state !== 'playing') {
    return;
  }

  for (var i = 0; i < players.length; i++) {
    var p = players[i];
    updateSabotageTimers(p, dt);
    moveChef(p, dt);
    checkStations(p);
    updateOven(p, dt);
    updateCustomers(p, dt);

    // Someone may have just won — stop right here if so.
    if (state !== 'playing') {
      return;
    }
  }
}

// Move the chef with their keys.
function moveChef(p, dt) {
  var dx = 0;
  var dy = 0;
  if (isKeyDown(p.keys.left))  dx = dx - 1;
  if (isKeyDown(p.keys.right)) dx = dx + 1;
  if (isKeyDown(p.keys.up))    dy = dy - 1;
  if (isKeyDown(p.keys.down))  dy = dy + 1;

  // Going diagonally shouldn't be faster than going straight.
  if (dx !== 0 && dy !== 0) {
    dx = dx * 0.7071;
    dy = dy * 0.7071;
  }

  // 🧈 Slippery Floor: everything is backwards.
  if (hasSabotage(p, 'slip')) {
    dx = -dx;
    dy = -dy;
  }

  p.x = p.x + dx * CONFIG.CHEF_SPEED * dt;
  p.y = p.y + dy * CONFIG.CHEF_SPEED * dt;

  // Stay inside your own kitchen.
  p.x = clamp(p.x, CONFIG.WALK_BOX.left, CONFIG.WALK_BOX.right);
  p.y = clamp(p.y, CONFIG.WALK_BOX.top, CONFIG.WALK_BOX.bottom);

  p.moving = (dx !== 0 || dy !== 0);
}

function updateFloatingTexts(dt) {
  for (var i = floatingTexts.length - 1; i >= 0; i--) {
    var t = floatingTexts[i];
    t.timeLeft = t.timeLeft - dt;
    t.y = t.y - CONFIG.FLOAT_TEXT_RISE * dt;
    if (t.timeLeft <= 0) {
      floatingTexts.splice(i, 1);   // remove it from the list
    }
  }
}


// ============================================================================
//  5. STATIONS — what happens when the chef touches things
// ============================================================================

// Remember whether the chef is standing in a zone, and report whether they
// have JUST walked in this frame (true only on the first frame inside).
function updateInside(p, key, nowInside) {
  var wasInside = (p.inside[key] === true);
  p.inside[key] = nowInside;
  return nowInside && !wasInside;
}

// Is the chef touching a box centred on (x, y), drawn w wide and h tall?
// Both hitboxes are shrunk to HITBOX_SCALE (75%) to feel generous.
function chefTouches(p, x, y, w, h) {
  var chefBox = CONFIG.CHEF_SIZE * CONFIG.HITBOX_SCALE;
  return boxesOverlap(p.x, p.y, chefBox, chefBox,
                      x, y, w * CONFIG.HITBOX_SCALE, h * CONFIG.HITBOX_SCALE);
}

function checkStations(p) {
  // --- Ingredient stations: pick up ONCE, on the moment you walk in ---
  for (var i = 0; i < CONFIG.STATIONS.length; i++) {
    var s = CONFIG.STATIONS[i];
    var touching = chefTouches(p, s.x, s.y, CONFIG.STATION_SIZE, CONFIG.STATION_SIZE);
    var justEntered = updateInside(p, 'station' + i, touching);
    if (justEntered) {
      tryPickUp(p, s.ingredient);
    }
  }

  // The oven, bin and counter only ever act when it would actually do
  // something (e.g. the oven only takes a FULL armful), so it's safe to
  // check them every frame you stand there. That way, if you wait on the
  // oven, you grab the plate the instant it's ready.

  // --- Oven ---
  var o = CONFIG.OVEN;
  var onOven = chefTouches(p, o.x, o.y, o.size, o.size);
  var enteredOven = updateInside(p, 'oven', onOven);
  if (onOven) {
    useOven(p, enteredOven);
  }

  // --- Bin: empties your hands ---
  var b = CONFIG.BIN;
  var onBin = chefTouches(p, b.x, b.y, b.size, b.size);
  updateInside(p, 'bin', onBin);
  if (onBin && (p.held.length > 0 || p.plate !== null)) {
    p.held = [];
    p.plate = null;
    p.plateLook = null;
    sfx('bin');
  }

  // --- Serving counter ---
  var c = CONFIG.COUNTER;
  var onCounter = chefTouches(p, c.x, c.y, c.w, c.h);
  var enteredCounter = updateInside(p, 'counter', onCounter);
  if (onCounter) {
    useCounter(p, enteredCounter);
  }
}

// Walked into an ingredient station. (You can do this while carrying a
// plate — the plate is in one hand, ingredients in the other.)
function tryPickUp(p, ingredientId) {
  if (p.held.length >= CONFIG.MAX_HELD) return;        // already carrying 3
  if (p.held.indexOf(ingredientId) !== -1) return;     // already got this one
  p.held.push(ingredientId);
  sfx('pickup');
}

// Standing on the oven. justEntered = this is the first frame on it.
function useOven(p, justEntered) {
  var oven = p.oven;
  var o = CONFIG.OVEN;

  // 🧊 Frozen shut: can't put anything in or take anything out.
  if (hasSabotage(p, 'freeze')) {
    if (justEntered) {
      addFloatingText(p, o.x, o.y - 55, CONFIG.TEXT.HINT_FROZEN, CONFIG.COLORS.FROZEN_TINT);
    }
    return;
  }

  // Carrying a plate doesn't stop you loading the oven, so you can get the
  // next dish cooking and THEN go and serve.
  if (oven.state === 'empty') {
    if (p.held.length === CONFIG.MAX_HELD) {
      loadOven(p);
    } else if (justEntered && p.held.length > 0) {
      addFloatingText(p, o.x, o.y - 55, CONFIG.TEXT.HINT_NEED_3, CONFIG.COLORS.HINT);
    }
  } else if (oven.state === 'done') {
    // Take the plate out. If you're also holding 3 ingredients, the oven is
    // now empty, so next frame they go straight in — a quick swap.
    if (p.plate === null) {
      p.plate = oven.dishId;
      p.plateLook = oven.lookId;
      oven.state = 'empty';
      oven.dishId = null;
      oven.lookId = null;
      oven.contents = [];
      sfx('plateUp');
    } else if (justEntered) {
      addFloatingText(p, o.x, o.y - 55, CONFIG.TEXT.HINT_HANDS_FULL, CONFIG.COLORS.HINT);
    }
  }
}

// Put the 3 carried ingredients in the oven and start cooking.
function loadOven(p) {
  var oven = p.oven;
  var dish = matchRecipe(p.held);
  var look = dish;
  if (dish === null) {
    dish = CONFIG.SLOP;   // no recipe matched: it's secretly slop
    look = CONFIG.SLOP;
    if (CONFIG.SLOP_LOOKS_NORMAL) {
      look = closestDish(p.held);   // ...but disguised as a real dish
    }
  }
  oven.state = 'cooking';
  oven.dishId = dish.id;
  oven.lookId = look.id;
  oven.contents = p.held;
  oven.totalTime = dish.cookSeconds;
  oven.timeLeft = dish.cookSeconds;
  p.held = [];
  sfx('ovenLoad');
}

// Tick the oven's cooking timer.
function updateOven(p, dt) {
  var oven = p.oven;
  if (oven.state !== 'cooking') return;
  if (hasSabotage(p, 'freeze')) return;   // 🧊 the timer stops dead

  oven.timeLeft = oven.timeLeft - dt;
  if (oven.timeLeft <= 0) {
    oven.timeLeft = 0;
    oven.state = 'done';
    sfx('ovenDone');
  }
}

// Standing at the serving counter.
function useCounter(p, justEntered) {
  if (p.plate !== null) {
    // Go by what the plate LOOKS like, so a disguised wrong dish still goes
    // to the customer you'd expect — who then finds out it's wrong.
    var spotIndex = chooseCustomerToServe(p, p.plateLook);
    if (spotIndex !== -1) {
      serveCustomer(p, spotIndex);
    }
  } else if (justEntered && p.held.length > 0) {
    addFloatingText(p, CONFIG.COUNTER.x, CONFIG.COUNTER.y + 40, CONFIG.TEXT.HINT_COOK_FIRST, CONFIG.COLORS.HINT);
  }
}


// ============================================================================
//  6. CUSTOMERS
// ============================================================================

// The middle of a customer spot, across the screen (inside one half).
function spotCenterX(spotIndex) {
  return spotIndex * CONFIG.CUSTOMER_SLOT_WIDTH + CONFIG.CUSTOMER_SLOT_WIDTH / 2;
}

// A new customer steps up to spot "c" at this player's counter.
function newCustomer(p, c) {
  var n = p.customerCount;

  // Make sure the shared order list is long enough, then read this
  // player's next order from it.
  while (dishSequence.length <= n) {
    var dishes = enabledDishes();
    if (dishes.length === 0) {
      dishes = CONFIG.DISHES;   // safety net if every dish was switched off
    }
    dishSequence.push(randomItem(dishes).id);
  }

  c.state = 'waiting';
  c.dishId = dishSequence[n];
  c.face = randomItem(CONFIG.CUSTOMER_FACES);
  c.patience = CONFIG.CUSTOMER_PATIENCE_SECONDS;
  c.timer = 0;
  p.customerCount = n + 1;
}

// Move every customer spot along a little.
function updateCustomers(p, dt) {
  for (var i = 0; i < p.customers.length; i++) {
    updateCustomer(p, p.customers[i], dt);
  }
}

function updateCustomer(p, c, dt) {
  if (c.state === 'waiting') {
    // Patience drains. At zero they get grumpy, but they never walk off.
    if (c.patience > 0) {
      c.patience = c.patience - dt;
      if (c.patience <= 0) {
        c.patience = 0;
        c.face = CONFIG.FACE_IMPATIENT;
      }
    }
  } else if (c.state === 'leaving') {
    c.timer = c.timer - dt;
    if (c.timer <= 0) {
      c.state = 'empty';
      c.timer = CONFIG.CUSTOMER_GAP_SECONDS;
    }
  } else if (c.state === 'empty') {
    c.timer = c.timer - dt;
    if (c.timer <= 0) {
      newCustomer(p, c);
    }
  }
}

// Holding a plate at the counter: who gets it?
//   1. Someone who ordered this dish. If several did, the one who has been
//      waiting longest (least patience left).
//   2. If nobody ordered it, the longest-waiting customer gets it anyway —
//      and it counts as a wrong dish.
// Returns the spot number, or -1 if nobody is waiting.
function chooseCustomerToServe(p, dishId) {
  var best = -1;
  var bestMatches = false;
  for (var i = 0; i < p.customers.length; i++) {
    var c = p.customers[i];
    if (c.state !== 'waiting') {
      continue;
    }
    var matches = (c.dishId === dishId);
    if (best === -1) {
      best = i;
      bestMatches = matches;
    } else if (matches && !bestMatches) {
      best = i;          // a match always beats a non-match
      bestMatches = true;
    } else if (matches === bestMatches && c.patience < p.customers[best].patience) {
      best = i;          // same kind, but this one has waited longer
    }
  }
  return best;
}

// Hand the plate to the customer in spot "spotIndex" and get paid (or not).
function serveCustomer(p, spotIndex) {
  var c = p.customers[spotIndex];
  var pay = 0;
  var pts = 0;
  var message = '';
  var color = CONFIG.COLORS.MONEY;

  if (p.plate === c.dishId && c.patience > 0) {
    // Right dish, on time
    pay = CONFIG.PAY_ON_TIME;
    pts = CONFIG.POINTS_ON_TIME;
    c.face = CONFIG.FACE_HAPPY;
    message = '+$' + pay + '  +' + pts + ' ' + CONFIG.TEXT.POINTS_LABEL;
    sfx('serve');
  } else if (p.plate === c.dishId) {
    // Right dish, but late
    pay = CONFIG.PAY_LATE;
    pts = CONFIG.POINTS_LATE;
    c.face = CONFIG.FACE_LATE;
    message = '+$' + pay + '  +' + pts + ' ' + CONFIG.TEXT.POINTS_LABEL + CONFIG.TEXT.LATE_SUFFIX;
    sfx('serveLate');
  } else {
    // Wrong dish, or Mystery Slop
    pay = CONFIG.PAY_WRONG;
    pts = CONFIG.POINTS_WRONG;
    c.face = CONFIG.FACE_ANGRY;
    if (p.plate === CONFIG.SLOP.id && !CONFIG.SLOP_LOOKS_NORMAL) {
      message = CONFIG.TEXT.SERVED_SLOP;
    } else {
      message = CONFIG.TEXT.SERVED_WRONG;
    }
    color = CONFIG.COLORS.WRONG;
    sfx('wrong');
  }

  p.money = p.money + pay;
  p.points = p.points + pts;
  p.plate = null;
  p.plateLook = null;

  c.state = 'leaving';
  c.timer = CONFIG.CUSTOMER_LEAVE_SECONDS;

  // The "+$100" pops up under whichever customer was served. (Kept away
  // from the very edges so the words don't get cut off.)
  var textX = clamp(spotCenterX(spotIndex), 110, CONFIG.HALF_WIDTH - 110);
  addFloatingText(p, textX, CONFIG.COUNTER.y + 36, message, color, 22);

  if (p.money >= CONFIG.TARGET_MONEY) {
    declareWinner(p);
  }
}


// ============================================================================
//  7. SABOTAGE
// ============================================================================

// A player pressed a sabotage key. The victim is always the OTHER player.
function tryBuySabotage(buyer, sab) {
  var victim = players[1 - buyer.index];
  var menuY = CONFIG.SABOTEUR_STRIP.y - 12;

  // Refused: can't afford it (no points are spent)
  if (buyer.points < sab.cost) {
    sfx('dud');
    addFloatingText(buyer, CONFIG.HALF_WIDTH / 2, menuY, CONFIG.TEXT.NOT_ENOUGH_POINTS, CONFIG.COLORS.WRONG);
    return;
  }
  // Refused: the other player is already being sabotaged (no points spent)
  if (victim.sabotage !== null) {
    sfx('dud');
    addFloatingText(buyer, CONFIG.HALF_WIDTH / 2, menuY, CONFIG.TEXT.ALREADY_SABOTAGED, CONFIG.COLORS.WRONG);
    return;
  }

  // Bought!
  buyer.points = buyer.points - sab.cost;
  victim.sabotage = { id: sab.id, timeLeft: sab.seconds };
  victim.announce = { sabotageId: sab.id, byName: buyer.name, timeLeft: CONFIG.SABOTAGE_ANNOUNCE_SECONDS };
  victim.flash = CONFIG.SABOTAGE_FLASH_SECONDS;
  victim.shake = CONFIG.SABOTAGE_SHAKE_SECONDS;
  victim.pendingSound = { name: sab.sound, timeLeft: CONFIG.SABOTAGE_EFFECT_SOUND_DELAY };

  addFloatingText(buyer, CONFIG.HALF_WIDTH / 2, menuY, sab.emoji + ' ' + CONFIG.TEXT.SABOTAGE_SENT, CONFIG.COLORS.POINTS);
  sfx('buy');
  sfx('sabotage');
}

// Count down the sabotage and its flashy effects.
function updateSabotageTimers(p, dt) {
  if (p.sabotage !== null) {
    p.sabotage.timeLeft = p.sabotage.timeLeft - dt;
    if (p.sabotage.timeLeft <= 0) {
      p.sabotage = null;   // it wore off
    }
  }
  if (p.announce !== null) {
    p.announce.timeLeft = p.announce.timeLeft - dt;
    if (p.announce.timeLeft <= 0) {
      p.announce = null;
    }
  }
  if (p.pendingSound !== null) {
    p.pendingSound.timeLeft = p.pendingSound.timeLeft - dt;
    if (p.pendingSound.timeLeft <= 0) {
      sfx(p.pendingSound.name);
      p.pendingSound = null;
    }
  }
  p.flash = Math.max(0, p.flash - dt);
  p.shake = Math.max(0, p.shake - dt);
}


// ============================================================================
//  8. KEYS — single presses (movement is handled in moveChef)
// ============================================================================

function onKeyPressed(code) {
  // M mutes on any screen
  if (isOneOf(code, CONFIG.KEYS_MUTE)) {
    toggleMute();
    return;
  }

  if (state === 'title') {
    startGame();   // any key starts
    return;
  }

  if (state === 'over') {
    if (isOneOf(code, CONFIG.KEYS_RESTART)) {
      startGame();
    }
    return;
  }

  // Playing: was it a sabotage key?
  for (var i = 0; i < players.length; i++) {
    var p = players[i];
    for (var j = 0; j < CONFIG.SABOTAGES.length; j++) {
      var sab = CONFIG.SABOTAGES[j];
      if (isOneOf(code, p.sabotageKeys[sab.id])) {
        tryBuySabotage(p, sab);
      }
    }
  }
}


// ============================================================================
//  9. DRAWING — paint the whole picture, back to front, every frame
// ============================================================================

function draw(ctx) {
  var C = CONFIG.COLORS;

  ctx.fillStyle = C.BACKGROUND;
  ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);

  for (var i = 0; i < players.length; i++) {
    drawHalf(ctx, players[i]);
  }

  // The line down the middle
  ctx.fillStyle = C.DIVIDER;
  ctx.fillRect(CONFIG.HALF_WIDTH - 2, 0, 4, CONFIG.HEIGHT);

  drawFloatingTexts(ctx);

  if (state === 'over') {
    drawPlayAgain(ctx);
  }
  if (state === 'title') {
    drawTitleScreen(ctx);
  }
  if (soundMuted) {
    drawEmoji(ctx, '🔇', CONFIG.HALF_WIDTH, 22, 18);
  }
}

// Draw one player's half. Everything inside is drawn as if the half started
// at x = 0; "translate" slides the paintbrush over for P2.
function drawHalf(ctx, p) {
  ctx.save();

  // "clip" = don't let any paint spill into the other player's half
  ctx.beginPath();
  ctx.rect(p.offsetX, 0, CONFIG.HALF_WIDTH, CONFIG.HEIGHT);
  ctx.clip();

  var shakeX = 0;
  var shakeY = 0;
  if (p.shake > 0) {
    shakeX = (Math.random() * 2 - 1) * CONFIG.SABOTAGE_SHAKE_PIXELS;
    shakeY = (Math.random() * 2 - 1) * CONFIG.SABOTAGE_SHAKE_PIXELS;
  }
  ctx.translate(p.offsetX + shakeX, shakeY);

  drawScoreBar(ctx, p);
  drawCustomerArea(ctx, p);
  drawKitchenFloor(ctx, p);
  drawCounter(ctx);
  drawStations(ctx);
  drawOven(ctx, p);
  drawBin(ctx);
  drawChef(ctx, p);
  drawSaboteurStrip(ctx, p);
  drawSabotageBadge(ctx, p);
  drawFlash(ctx, p);
  drawAnnouncement(ctx, p);
  if (state === 'over') {
    drawResult(ctx, p);
  }

  ctx.restore();
}

// --- Score bar: name tag, money, sabotage points, progress to target ---
function drawScoreBar(ctx, p) {
  var C = CONFIG.COLORS;
  var bar = CONFIG.SCORE_BAR;
  ctx.fillStyle = C.SCORE_BAR;
  ctx.fillRect(0, bar.y, CONFIG.HALF_WIDTH, bar.h);

  drawRoundRect(ctx, 8, bar.y + 7, 74, 26, 13, p.color, null);
  drawText(ctx, p.name + ' ' + p.emoji, 45, bar.y + 20, 16, C.TEXT, 'center', true);

  drawText(ctx, '$' + p.money, CONFIG.HALF_WIDTH / 2, bar.y + 20, 24, C.MONEY, 'center', true);
  drawText(ctx, '/ $' + CONFIG.TARGET_MONEY, CONFIG.HALF_WIDTH / 2 + 50, bar.y + 22, 12, C.TEXT_DIM, 'left', false);

  drawText(ctx, CONFIG.SABOTEUR_EMOJI + ' ' + p.points + ' ' + CONFIG.TEXT.POINTS_LABEL,
           CONFIG.HALF_WIDTH - 10, bar.y + 20, 17, C.POINTS, 'right', true);

  // Thin progress bar along the bottom: how close to the target
  drawBar(ctx, 0, bar.y + bar.h - 4, CONFIG.HALF_WIDTH, 4, p.money / CONFIG.TARGET_MONEY, C.MONEY, C.BAR_BACK);
}

// --- Customer area: a row of spots, each with a face, ticket, patience bar ---
function drawCustomerArea(ctx, p) {
  var C = CONFIG.COLORS;
  var area = CONFIG.CUSTOMER_AREA;

  ctx.fillStyle = C.CUSTOMER_AREA;
  ctx.fillRect(0, area.y, CONFIG.HALF_WIDTH, area.h);

  for (var i = 0; i < p.customers.length; i++) {
    var slotLeft = i * CONFIG.CUSTOMER_SLOT_WIDTH;

    // Thin line between spots
    if (i > 0) {
      ctx.fillStyle = C.CUSTOMER_SLOT_LINE;
      ctx.fillRect(slotLeft - 1, area.y + 6, 2, area.h - 12);
    }

    // "translate" slides the paintbrush along, so each spot can be drawn
    // with the same numbers from config.js.
    ctx.save();
    ctx.translate(slotLeft, 0);
    drawCustomer(ctx, p.customers[i]);
    ctx.restore();
  }
}

// One customer, drawn as if their spot started at x = 0.
function drawCustomer(ctx, c) {
  var C = CONFIG.COLORS;

  if (c.state === 'empty') {
    return;
  }

  // A leaving customer fades out and drifts up
  var alpha = 1;
  var lift = 0;
  if (c.state === 'leaving') {
    alpha = clamp(c.timer / CONFIG.CUSTOMER_LEAVE_SECONDS, 0, 1);
    lift = (1 - alpha) * 20;
  }
  ctx.globalAlpha = alpha;

  // The face (angry customers shake)
  var face = CONFIG.CUSTOMER_FACE;
  var faceX = face.x;
  if (c.face === CONFIG.FACE_ANGRY) {
    faceX = faceX + Math.sin(clock * 60) * 3;
  }
  drawEmoji(ctx, c.face, faceX, face.y - lift, face.size);

  // The ticket, in the dish's colour
  var dish = findDish(c.dishId);
  var t = CONFIG.TICKET;
  if (dish !== null) {
    drawRoundRect(ctx, t.x, t.y - lift, t.w, t.h, 8, dish.ticketColor, C.TEXT, 2);
    if (CONFIG.SHOW_RECIPE_ON_TICKET) {
      drawDish(ctx, dish.id, t.x + t.w / 2, t.y + 18 - lift, 26);
      drawRoundRect(ctx, t.x + 5, t.y + 35 - lift, t.w - 10, 22, 6, '#ffffffcc', null);
      for (var i = 0; i < dish.ingredients.length; i++) {
        var ix = t.x + t.w / 2 + (i - (dish.ingredients.length - 1) / 2) * 24;
        drawEmoji(ctx, ingredientEmoji(dish.ingredients[i]), ix, t.y + 46 - lift, 16);
      }
    } else {
      drawDish(ctx, dish.id, t.x + t.w / 2, t.y + t.h / 2 - lift, 40);
    }
  }

  // Patience bar under the face (only while they're waiting)
  if (c.state === 'waiting') {
    var pb = CONFIG.PATIENCE_BAR;
    var fraction = c.patience / CONFIG.CUSTOMER_PATIENCE_SECONDS;
    var barColor = C.PATIENCE_GOOD;
    if (fraction < 0.5) barColor = C.PATIENCE_MID;
    if (fraction < 0.25) barColor = C.PATIENCE_LOW;
    drawBar(ctx, pb.x, pb.y, pb.w, pb.h, fraction, barColor, C.BAR_BACK);
    if (c.patience <= 0) {
      // The bar is empty now, so write "LATE" right over it
      drawText(ctx, CONFIG.TEXT.LATE, pb.x + pb.w / 2, pb.y + pb.h / 2, 11, C.WRONG, 'center', true, C.OUTLINE);
    }
  }

  ctx.globalAlpha = 1;
}

// --- Checkerboard kitchen floor (goes buttery when slippery) ---
function drawKitchenFloor(ctx, p) {
  var C = CONFIG.COLORS;
  var k = CONFIG.KITCHEN;
  var size = CONFIG.FLOOR_TILE_SIZE;

  for (var row = 0; row * size < k.h; row++) {
    for (var col = 0; col * size < CONFIG.HALF_WIDTH; col++) {
      if ((row + col) % 2 === 0) {
        ctx.fillStyle = C.FLOOR_A;
      } else {
        ctx.fillStyle = C.FLOOR_B;
      }
      ctx.fillRect(col * size, k.y + row * size, size, size);
    }
  }

  if (hasSabotage(p, 'slip')) {
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = C.SLIPPERY_TINT;
    ctx.fillRect(0, k.y, CONFIG.HALF_WIDTH, k.h);
    ctx.globalAlpha = 0.8;
    for (var i = 0; i < CONFIG.BUTTER_SPOTS.length; i++) {
      var spot = CONFIG.BUTTER_SPOTS[i];
      drawEmoji(ctx, '🧈', spot.x, spot.y, 26);
    }
    ctx.globalAlpha = 1;
  }
}

// --- Serving counter under the customer ---
function drawCounter(ctx) {
  var C = CONFIG.COLORS;
  var c = CONFIG.COUNTER;
  drawRoundRect(ctx, c.x - c.w / 2, c.y - c.h / 2, c.w, c.h, 8, C.COUNTER, C.COUNTER_EDGE, 3);
  drawText(ctx, c.label, c.x, c.y + 1, 16, C.TEXT, 'center', true, C.COUNTER_EDGE);
}

// --- Ingredient stations ---
function drawStations(ctx) {
  var C = CONFIG.COLORS;
  var size = CONFIG.STATION_SIZE;
  for (var i = 0; i < CONFIG.STATIONS.length; i++) {
    var s = CONFIG.STATIONS[i];
    var ingredient = findIngredient(s.ingredient);
    drawRoundRect(ctx, s.x - size / 2, s.y - size / 2, size, size, 10, C.TILE, C.TILE_EDGE, 3);
    if (ingredient !== null) {
      drawEmoji(ctx, ingredient.emoji, s.x, s.y + 1, 34);
      drawText(ctx, ingredient.name, s.x, s.y + size / 2 + 9, 11, C.TEXT_DARK, 'center', true);
    }
  }
}

// --- The oven: empty, cooking (with progress bar) or done (with plate) ---
function drawOven(ctx, p) {
  var C = CONFIG.COLORS;
  var o = CONFIG.OVEN;
  var oven = p.oven;
  var half = o.size / 2;

  drawRoundRect(ctx, o.x - half, o.y - half, o.size, o.size, 12, C.OVEN, C.OVEN_EDGE, 4);

  if (oven.state === 'empty') {
    ctx.globalAlpha = 0.5;
    drawEmoji(ctx, o.emoji, o.x, o.y - 4, 38);
    ctx.globalAlpha = 1;
    drawText(ctx, o.label, o.x, o.y + half - 11, 11, C.TEXT, 'center', true);
  } else if (oven.state === 'cooking') {
    // Flickering flame with the ingredients sitting in it
    var flicker = 36 + Math.sin(clock * 18) * 3;
    drawEmoji(ctx, o.emoji, o.x, o.y + 6, flicker);
    for (var i = 0; i < oven.contents.length; i++) {
      var ix = o.x + (i - (oven.contents.length - 1) / 2) * 22;
      drawEmoji(ctx, ingredientEmoji(oven.contents[i]), ix, o.y - 20, 18);
    }
    var fraction = 1 - oven.timeLeft / oven.totalTime;
    drawBar(ctx, o.x - half, o.y + half + 6, o.size, 9, fraction, C.COOK_BAR, C.BAR_BACK);
  } else if (oven.state === 'done') {
    // Finished plate, bobbing
    var bob = Math.sin(clock * 6) * 3;
    ctx.fillStyle = C.TILE;
    ctx.beginPath();
    ctx.ellipse(o.x, o.y + 8 + bob, 30, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    drawDish(ctx, oven.lookId, o.x, o.y - 2 + bob, 40);
    drawText(ctx, CONFIG.TEXT.OVEN_READY, o.x, o.y - half - 10, 14, C.GOLD, 'center', true, C.OUTLINE);
  }

  // 🧊 Frozen: ice block over the whole oven, with seconds left
  if (hasSabotage(p, 'freeze')) {
    ctx.globalAlpha = 0.6;
    drawRoundRect(ctx, o.x - half - 4, o.y - half - 4, o.size + 8, o.size + 8, 14, C.FROZEN_TINT, '#ffffff', 3);
    ctx.globalAlpha = 1;
    drawEmoji(ctx, '🧊', o.x, o.y - 4, 50);
    drawText(ctx, Math.ceil(p.sabotage.timeLeft) + 's', o.x, o.y + half - 12, 16, C.TEXT, 'center', true, C.OUTLINE);
  }
}

// --- The bin ---
function drawBin(ctx) {
  var C = CONFIG.COLORS;
  var b = CONFIG.BIN;
  var half = b.size / 2;
  drawRoundRect(ctx, b.x - half, b.y - half, b.size, b.size, 10, C.BIN, C.TILE_EDGE, 3);
  drawEmoji(ctx, b.emoji, b.x, b.y - 3, 32);
  drawText(ctx, b.label, b.x, b.y + half - 7, 10, C.TEXT, 'center', true);
}

// --- The chef, their floor ring, and what they're carrying ---
function drawChef(ctx, p) {
  var C = CONFIG.COLORS;
  var size = CONFIG.CHEF_SIZE;

  // Coloured ring on the floor so you can tell whose chef is whose
  ctx.globalAlpha = 0.65;
  ctx.fillStyle = p.color;
  ctx.beginPath();
  ctx.ellipse(p.x, p.y + size * 0.42, size * 0.6, size * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  if (hasSabotage(p, 'slip')) {
    drawEmoji(ctx, '🧈', p.x + 18, p.y + size * 0.42, 18);
  }

  // The loser slumps over
  if (state === 'over' && p.index !== winnerIndex) {
    ctx.save();
    ctx.translate(p.x, p.y + 8);
    ctx.rotate(Math.PI / 2);
    drawEmoji(ctx, CONFIG.CHEF_LOSER_EMOJI, 0, 0, size);
    ctx.restore();
    return;
  }

  // Little bounce while walking
  var bob = 0;
  if (p.moving && state === 'playing') {
    bob = Math.abs(Math.sin(clock * 16)) * -4;
  }
  drawEmoji(ctx, p.emoji, p.x, p.y + bob, size);

  // Carried things float over the chef's head: the plate first, and any
  // ingredients stacked above it.
  var carryY = p.y - size * 0.75 + bob;
  var itemSize = CONFIG.HELD_ITEM_SIZE;
  if (p.plate !== null) {
    ctx.fillStyle = C.TILE;
    ctx.beginPath();
    ctx.ellipse(p.x, carryY + 7, 18, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    drawDish(ctx, p.plateLook, p.x, carryY, itemSize + 6);
    carryY = carryY - itemSize - 6;   // ingredients go above the plate
  }
  for (var i = 0; i < p.held.length; i++) {
    var ix = p.x + (i - (p.held.length - 1) / 2) * (itemSize + 2);
    drawEmoji(ctx, ingredientEmoji(p.held[i]), ix, carryY, itemSize);
  }
}

// --- Draw a finished dish. Most dishes are just their emoji, but a dish
//     with a "drawing" setting in config.js is painted by hand instead. ---
function drawDish(ctx, dishId, x, y, size) {
  var dish = findDish(dishId);
  if (dish !== null && dish.drawing === 'jacket') {
    drawJacketPotato(ctx, x, y, size);
  } else {
    drawEmoji(ctx, dishEmoji(dishId), x, y, size);
  }
}

// --- A loaded jacket potato: brown skin, split open, cheese and beans on
//     top. Drawn centred on (x, y), about "size" pixels wide. ---
function drawJacketPotato(ctx, x, y, size) {
  var J = CONFIG.JACKET_POTATO;
  var s = size;

  // Little helper: fill an oval centred on (cx, cy)
  function oval(cx, cy, rx, ry, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // The potato's skin, with an outline
  ctx.beginPath();
  ctx.ellipse(x, y + s * 0.06, s * 0.5, s * 0.3, 0, 0, Math.PI * 2);
  ctx.fillStyle = J.SKIN;
  ctx.fill();
  ctx.lineWidth = Math.max(1, s * 0.04);
  ctx.strokeStyle = J.SKIN_EDGE;
  ctx.stroke();

  // A few dark speckles on the skin
  oval(x - s * 0.36, y + s * 0.14, s * 0.03, s * 0.02, J.SPECKLE);
  oval(x + s * 0.34, y + s * 0.18, s * 0.03, s * 0.02, J.SPECKLE);
  oval(x - s * 0.12, y + s * 0.28, s * 0.03, s * 0.02, J.SPECKLE);
  oval(x + s * 0.14, y + s * 0.27, s * 0.025, s * 0.02, J.SPECKLE);

  // Split open: the fluffy inside
  oval(x, y - s * 0.02, s * 0.36, s * 0.15, J.FLESH);

  // Melted cheese, in blobs, with a drip down each side
  oval(x - s * 0.14, y - s * 0.06, s * 0.16, s * 0.09, J.CHEESE);
  oval(x + s * 0.14, y - s * 0.06, s * 0.16, s * 0.09, J.CHEESE);
  oval(x, y - s * 0.1, s * 0.14, s * 0.08, J.CHEESE);
  oval(x - s * 0.3, y + s * 0.05, s * 0.05, s * 0.08, J.CHEESE);
  oval(x + s * 0.28, y + s * 0.06, s * 0.05, s * 0.09, J.CHEESE);

  // Beans in sauce, piled in the middle
  oval(x, y - s * 0.1, s * 0.13, s * 0.07, J.SAUCE);
  oval(x - s * 0.07, y - s * 0.12, s * 0.045, s * 0.03, J.BEANS);
  oval(x + s * 0.05, y - s * 0.13, s * 0.045, s * 0.03, J.BEANS);
  oval(x, y - s * 0.07, s * 0.045, s * 0.03, J.BEANS);
  oval(x + s * 0.1, y - s * 0.07, s * 0.04, s * 0.028, J.BEANS);
  oval(x - s * 0.1, y - s * 0.07, s * 0.04, s * 0.028, J.BEANS);
}

// --- Saboteur strip: the man in the trench coat and his price list ---
function drawSaboteurStrip(ctx, p) {
  var C = CONFIG.COLORS;
  var strip = CONFIG.SABOTEUR_STRIP;
  var midY = strip.y + strip.h / 2;

  ctx.fillStyle = C.STRIP;
  ctx.fillRect(0, strip.y, CONFIG.HALF_WIDTH, strip.h);
  ctx.fillStyle = C.STRIP_EDGE;
  ctx.fillRect(0, strip.y, CONFIG.HALF_WIDTH, 3);

  drawEmoji(ctx, CONFIG.SABOTEUR_EMOJI, CONFIG.SABOTEUR_X, midY + 2, CONFIG.SABOTEUR_SIZE);

  for (var i = 0; i < CONFIG.SABOTAGES.length; i++) {
    var sab = CONFIG.SABOTAGES[i];
    var x = CONFIG.SABOTAGE_MENU_X + i * CONFIG.SABOTAGE_MENU_SPACING;
    var codes = p.sabotageKeys[sab.id];
    var label = '?';
    if (codes && codes.length > 0) {
      label = keyLabel(codes[0]);
    }

    // Can't afford it? Draw it faded.
    if (p.points < sab.cost) {
      ctx.globalAlpha = 0.3;
    }
    drawRoundRect(ctx, x, midY - 14, 26, 28, 6, C.KEYCAP, null);
    drawText(ctx, label, x + 13, midY + 1, 16, C.TEXT_DARK, 'center', true);
    drawEmoji(ctx, sab.emoji, x + 46, midY + 1, 26);
    drawText(ctx, sab.cost + CONFIG.TEXT.POINTS_LABEL, x + 62, midY + 1, 15, C.POINTS, 'left', true);
    ctx.globalAlpha = 1;
  }
}

// --- "🧊 FROZEN 4s" badge in the corner while being sabotaged ---
function drawSabotageBadge(ctx, p) {
  if (p.sabotage === null) return;
  var sab = findSabotage(p.sabotage.id);
  if (sab === null) return;
  var C = CONFIG.COLORS;
  var b = CONFIG.COUNTDOWN_BADGE;
  drawRoundRect(ctx, b.x, b.y, b.w, b.h, b.h / 2, '#000000bb', sab.flashColor, 2);
  drawText(ctx, sab.emoji + ' ' + sab.shortName + ' ' + Math.ceil(p.sabotage.timeLeft) + 's',
           b.x + b.w / 2, b.y + b.h / 2 + 1, 14, C.TEXT, 'center', true);
}

// --- Screen flash when a sabotage lands ---
function drawFlash(ctx, p) {
  if (p.flash <= 0 || p.announce === null) return;
  var sab = findSabotage(p.announce.sabotageId);
  if (sab === null) return;
  ctx.globalAlpha = (p.flash / CONFIG.SABOTAGE_FLASH_SECONDS) * 0.7;
  ctx.fillStyle = sab.flashColor;
  ctx.fillRect(0, 0, CONFIG.HALF_WIDTH, CONFIG.HEIGHT);
  ctx.globalAlpha = 1;
}

// --- Big "🧊 OVEN FREEZE!" across the victim's half ---
function drawAnnouncement(ctx, p) {
  if (p.announce === null) return;
  var sab = findSabotage(p.announce.sabotageId);
  if (sab === null) return;
  var C = CONFIG.COLORS;

  var shown = CONFIG.SABOTAGE_ANNOUNCE_SECONDS - p.announce.timeLeft;
  var pop = clamp(0.5 + shown * 3, 0.5, 1);            // grows in quickly
  var alpha = clamp(p.announce.timeLeft / 0.4, 0, 1);  // fades out at the end
  var midX = CONFIG.HALF_WIDTH / 2;

  ctx.globalAlpha = alpha * 0.65;
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 245, CONFIG.HALF_WIDTH, 140);
  ctx.globalAlpha = alpha;
  drawEmoji(ctx, sab.emoji, midX, 285, 70 * pop);
  drawText(ctx, sab.name + '!', midX, 340, 34 * pop, sab.flashColor, 'center', true, C.OUTLINE);
  drawText(ctx, CONFIG.TEXT.SABOTAGE_FROM.replace('{NAME}', p.announce.byName), midX, 368, 15, C.TEXT, 'center', false, C.OUTLINE);
  ctx.globalAlpha = 1;
}

// --- After a win: gold for the winner, dim for the loser ---
function drawResult(ctx, p) {
  var C = CONFIG.COLORS;
  var midX = CONFIG.HALF_WIDTH / 2;
  if (p.index === winnerIndex) {
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = C.GOLD;
    ctx.fillRect(0, 0, CONFIG.HALF_WIDTH, CONFIG.HEIGHT);
    ctx.globalAlpha = 1;
    var bounce = Math.sin(clock * 4) * 6;
    drawEmoji(ctx, '🏆', midX, 250 + bounce, 90);
    drawText(ctx, CONFIG.TEXT.WINS.replace('{NAME}', p.name), midX, 335, 52, C.GOLD, 'center', true, C.OUTLINE);
  } else {
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, CONFIG.HALF_WIDTH, CONFIG.HEIGHT);
    ctx.globalAlpha = 1;
  }
}

function drawPlayAgain(ctx) {
  var C = CONFIG.COLORS;
  if (Math.floor(clock * 2) % 2 === 0) {
    drawRoundRect(ctx, CONFIG.WIDTH / 2 - 170, 440, 340, 44, 22, '#000000cc', C.GOLD, 2);
    drawText(ctx, CONFIG.TEXT.PLAY_AGAIN, CONFIG.WIDTH / 2, 463, 24, C.TEXT, 'center', true);
  }
}

function drawFloatingTexts(ctx) {
  for (var i = 0; i < floatingTexts.length; i++) {
    var t = floatingTexts[i];
    ctx.globalAlpha = clamp(t.timeLeft / CONFIG.FLOAT_TEXT_SECONDS * 1.5, 0, 1);
    drawText(ctx, t.text, t.x, t.y, t.size, t.color, 'center', true, CONFIG.COLORS.OUTLINE);
  }
  ctx.globalAlpha = 1;
}

// --- The title screen, drawn over a dimmed view of the two kitchens ---
function drawTitleScreen(ctx) {
  var C = CONFIG.COLORS;
  var T = CONFIG.TEXT;
  var midX = CONFIG.WIDTH / 2;

  ctx.globalAlpha = 0.85;
  ctx.fillStyle = C.BACKGROUND;
  ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);
  ctx.globalAlpha = 1;

  drawEmoji(ctx, '🥔', midX - 60, 120 + Math.sin(clock * 3) * 5, 60);
  drawEmoji(ctx, CONFIG.PLAYERS[0].emoji, midX - 150, 125, 50);
  drawEmoji(ctx, '🔥', midX + 60, 120 + Math.sin(clock * 3 + 1) * 5, 60);
  drawEmoji(ctx, CONFIG.PLAYERS[1].emoji, midX + 150, 125, 50);

  drawText(ctx, T.TITLE, midX, 205, 46, C.GOLD, 'center', true, C.OUTLINE);
  drawText(ctx, T.SUBTITLE.replace('{TARGET}', CONFIG.TARGET_MONEY), midX, 250, 22, C.TEXT, 'center', true);

  drawText(ctx, T.HOW_TO_PLAY, midX, 305, 16, C.TEXT, 'center', false);
  drawText(ctx, T.HOW_TO_PLAY_2, midX, 332, 16, C.TEXT, 'center', false);
  drawText(ctx, T.HOW_TO_PLAY_TIP, midX, 357, 14, C.HINT, 'center', false);

  drawText(ctx, T.P1_CONTROLS, midX, 385, 17, CONFIG.PLAYERS[0].color, 'center', true);
  drawText(ctx, T.P2_CONTROLS, midX, 415, 17, CONFIG.PLAYERS[1].color, 'center', true);

  if (Math.floor(clock * 2) % 2 === 0) {
    drawText(ctx, T.PRESS_START, midX, 485, 28, C.TEXT, 'center', true, C.OUTLINE);
  }
  drawText(ctx, T.MUTE_HINT, midX, 560, 13, C.TEXT_DIM, 'center', false);
}


// ============================================================================
//  10. GO!
// ============================================================================

resetGame();   // so the title screen has two kitchens behind it
startLoop(update, draw, onKeyPressed);
