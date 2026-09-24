// ============================================================================
//  SPUD RUSH — THE GAME
// ============================================================================
//
//  This is the rulebook. It decides what happens when you press a key, what
//  a customer wants, when a potato burns, and what gets drawn on screen.
//
//  Every number it uses comes from config.js. If you want to change how the
//  game FEELS, edit that file instead of this one.
//
//  The file is in sections, marked with big banners like the one above. In
//  rough order: setup, then the rules, then the drawing.
//
// ============================================================================

(function () {
  'use strict';

  // Short name for the settings, so we can write C.CHEF_SPEED instead of
  // CONFIG.CHEF_SPEED everywhere below.
  var C = CONFIG;


  // ==========================================================================
  //  THE PICTURES
  // ==========================================================================
  //
  //  We build a list of every PNG the game needs, then load them all up front.
  //  If one is missing, the game still runs — that picture is drawn as an
  //  orange box with its filename in it, so you can see exactly what's absent.

  var FILES = [
    'kitchen_background', 'chef_robot',
    'customer_1', 'customer_2', 'customer_3', 'customer_4', 'customer_5',
    'bed_large', 'bed_xlarge', 'bed_poggolithic',
    'jar_red', 'jar_blue', 'jar_green', 'jar_yellow',
    'oven', 'bin', 'charging_station', 'parts_table',
    'overlay_cooked', 'overlay_burnt', 'potato_ruined',
    'speech_bubble', 'icon_coin', 'icon_heart'
  ];

  // Add the fifteen potatoes: every size in every colour.
  for (var si = 0; si < C.SIZES.length; si++) {
    for (var ci = 0; ci < C.COLOURS.length; ci++) {
      FILES.push('potato_' + C.SIZES[si] + '_' + C.COLOURS[ci]);
    }
  }

  var images = {};

  function loadImages() {
    for (var i = 0; i < FILES.length; i++) {
      var name = FILES[i];
      var img = new Image();
      img.onerror = (function (im) { return function () { im.failed = true; }; })(img);
      img.src = C.ASSETS + name + '.png';
      images[name] = img;
    }
  }


  // ==========================================================================
  //  SMALL HELPERS
  // ==========================================================================

  // Make a noise. Safe to call anywhere, at any time.
  //
  // If sound.js didn't load, or the browser refuses to play audio, this
  // quietly does nothing instead of stopping the game. That guard is why the
  // game still runs on a machine with sound locked down.
  //
  // Pass { gain: 0.35 } to make it quieter — the helper robots do this so a
  // busy kitchen doesn't turn into noise soup.
  function sfx(name, options) {
    if (typeof SOUND !== 'undefined' && SOUND.play) SOUND.play(name, options);
  }

  // The volume helper robots make their noises at.
  var HELPER_SFX = { gain: C.HELPER_SOUND_GAIN };

  // Pick one random thing out of a list.
  function pickOne(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  // Read the saved high score. This is wrapped in try/catch because saving is
  // sometimes blocked when the game is opened straight off the disk — if that
  // happens we just start from zero rather than crashing.
  function loadBestScore() {
    try { return Number(localStorage.getItem('spudrush.best')) || 0; }
    catch (err) { return 0; }
  }

  function saveBestScore(value) {
    try { localStorage.setItem('spudrush.best', value); }
    catch (err) { /* Saving is blocked. Not a problem — carry on. */ }
  }


  // ==========================================================================
  //  THE GAME OBJECT
  // ==========================================================================

  function Game(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.keysHeld = {};
    this.bestScore = loadBestScore();

    this.reset();
    this.mode = 'title';   // 'title', 'play', 'paused' or 'over'
  }


  // --------------------------------------------------------------------------
  //  Starting (or restarting) a round
  // --------------------------------------------------------------------------

  Game.prototype.reset = function () {
    var self = this;

    this.chef = { x: C.CHEF_START_X, y: C.CHEF_START_Y, walkPhase: 0 };
    this.holding = null;         // the potato in the chef's hands, or null
    this.dropped = [];           // potatoes left lying on the kitchen floor

    // The two ovens.
    this.ovens = C.OVEN_POSITIONS.map(function (pos) {
      return { type: 'oven', x: pos.x, y: pos.y, w: C.OVEN_WIDTH, h: C.OVEN_HEIGHT,
               potato: null, timeIn: 0,
               // Remembered so we can chime the moment it CHANGES stage.
               lastDoneness: 'raw' };
    });

    // The three garden beds, stacked down the left wall.
    this.beds = C.SIZES.map(function (size, i) {
      return { type: 'bed', size: size,
               x: C.BED_X, y: C.BED_TOP + i * C.BED_GAP,
               w: C.BED_WIDTH, h: C.BED_HEIGHT, picture: 'bed_' + size };
    });

    // The four paint jars, stacked down the right wall.
    this.jars = C.JAR_COLOURS.map(function (colour, i) {
      return { type: 'jar', colour: colour,
               x: C.JAR_X, y: C.JAR_TOP + i * C.JAR_GAP,
               w: C.JAR_WIDTH, h: C.JAR_HEIGHT, picture: 'jar_' + colour };
    });

    this.bin = { type: 'bin', x: C.BIN_X, y: C.BIN_Y, w: C.BIN_WIDTH, h: C.BIN_HEIGHT };

    // The charging pad. Note it is deliberately NOT in the station list below —
    // you don't press Space to use it, you just walk onto it.
    this.charger = { x: C.CHARGER_X, y: C.CHARGER_Y,
                     w: C.CHARGER_WIDTH, h: C.CHARGER_HEIGHT };

    // The spots in the hatch where customers appear.
    // Each bay has TWO positions, and they are deliberately different.
    //
    //   drawX  — where the customer is drawn, spread across the hatch.
    //   x / w  — where the chef has to stand to serve them, spread across the
    //            walkable floor instead.
    //
    // They differ because the hatch is wider than the floor you can walk on.
    // If we used the hatch position for both, the customers at each end would
    // be literally impossible to reach.
    this.bays = [];
    this.customers = [];
    var serveWidth = (C.WALK_RIGHT - C.WALK_LEFT) / C.BAY_COUNT;
    for (var b = 0; b < C.BAY_COUNT; b++) {
      this.bays.push({ type: 'bay', index: b,
                       drawX: C.HATCH_X + b * C.BAY_WIDTH,
                       x: C.WALK_LEFT + b * serveWidth, y: C.HATCH_Y,
                       w: serveWidth, h: C.BAY_REACH_HEIGHT });
      this.customers.push(null);
    }

    // One flat list of everything the chef can walk up to and use.
    // The parts table, where you buy helper robots.
    this.partsTable = { type: 'parts', x: C.PARTS_X, y: C.PARTS_Y,
                        w: C.PARTS_WIDTH, h: C.PARTS_HEIGHT };

    // Helper robots. Always empty at the start of a round — they do not
    // survive a restart, so run two is never easier than run one.
    this.helpers = [];
    this.helperCost = C.HELPER_FIRST_COST;
    this.carryingHelper = null;   // a collapsed robot the player is carrying
    this.nearestFlat = null;      // a collapsed robot within pickup range

    this.stations = this.beds.concat(this.jars, [this.bin], this.ovens,
                                     [this.partsTable], this.bays);

    // Work out, once, where a robot has to stand to use each station: the
    // point inside the walk box closest to that station's rectangle.
    var self2 = this;
    this.stations.forEach(function (s) { s.spot = self2.standingSpot(s); });

    this.coins = 0;
    this.strikes = 0;
    this.battery = 100;          // percent full. Always starts topped up.
    this.charging = false;       // is he standing on the pad this instant?
    this.lowBeep = 0;            // countdown to the next flat-battery nag
    this.chargeBeep = 0;         // countdown to the next charging shimmer
    this.overReason = 'strikes'; // why the last round ended
    this.elapsed = 0;
    this.untilNextCustomer = 0.6;
    this.ordersMade = 0;
    this.nearest = null;
    this.nearestDrop = null;

    this.puffs = [];        // little dust and steam dots
    this.popups = [];       // the "+20" numbers that float up

    this.mode = 'play';
    sfx('newRound');
  };


  // ==========================================================================
  //  HELPER ROBOTS
  // ==========================================================================
  //
  //  A helper is a second robot that works on its own. It picks a customer,
  //  then walks the same route you would: bed, then paint, then oven, then
  //  the hatch. It is a simple list of steps — see helperThink below.
  //
  //  Helpers run on batteries. A flat one collapses until you carry it to the
  //  charging pad. They are lost when the round restarts.

  // The four states of doneness, in order, so we can tell "past it" from
  // "not there yet" when a potato is sitting in the oven.
  var DONENESS_ORDER = ['raw', 'cooked', 'burnt', 'ruined'];

  // Where does a robot have to stand to use this station? It's the point
  // inside the walkable box that is closest to the station's rectangle.
  Game.prototype.standingSpot = function (s) {
    var x, y;

    if (s.x + s.w < C.WALK_LEFT) x = C.WALK_LEFT;
    else if (s.x > C.WALK_RIGHT) x = C.WALK_RIGHT;
    else x = Math.max(C.WALK_LEFT, Math.min(C.WALK_RIGHT, s.x + s.w / 2));

    if (s.y + s.h < C.WALK_TOP) y = C.WALK_TOP;
    else if (s.y > C.WALK_BOTTOM) y = C.WALK_BOTTOM;
    else y = Math.max(C.WALK_TOP, Math.min(C.WALK_BOTTOM, s.y + s.h / 2));

    return { x: x, y: y };
  };

  Game.prototype.spawnHelper = function () {
    var table = this.partsTable;
    this.helpers.push({
      x: table.x + table.w / 2,
      y: table.y + table.h + 12,
      holding: null,
      battery: 100,       // flat = collapses until the player carries it to the pad
      carried: false,
      state: 'idle',
      station: null,      // the station it is walking to
      bay: -1,            // the customer it has claimed, or -1
      oven: null,         // the oven it has claimed, or null
      order: null,        // a copy of what that customer asked for
      pause: 0.6,
      walkPhase: 0,
      tint: C.HELPER_TINTS[this.helpers.length % C.HELPER_TINTS.length]
    });
    this.puff(table.x + table.w / 2, table.y + table.h, C.CHARGE_SPARK, 14);
    sfx('build');
  };

  // Is another helper already dealing with this customer?
  Game.prototype.bayTaken = function (index, exclude) {
    for (var i = 0; i < this.helpers.length; i++) {
      var h = this.helpers[i];
      if (h !== exclude && h.bay === index) return true;
    }
    return false;
  };

  // Walk towards a point. Returns true once we've arrived.
  Game.prototype.walkHelper = function (h, target, seconds) {
    var dx = target.x - h.x, dy = target.y - h.y;
    var gap = Math.sqrt(dx * dx + dy * dy);
    if (gap < 3) { h.walkPhase = 0; return true; }

    var speed = C.CHEF_SPEED * C.HELPER_SPEED;
    var move = Math.min(gap, speed * seconds);
    h.x += (dx / gap) * move;
    h.y += (dy / gap) * move;
    h.walkPhase += seconds * 14;
    return false;
  };

  // Let go of the oven this helper had claimed.
  //
  // If the helper's own potato is still in there cooking, it gets marked
  // "orphaned": nobody is coming back for it. Without that mark it would sit
  // in the oven burning for ever, and no helper would ever use that oven
  // again. With it, the next free helper knows to take it out and bin it.
  //
  // Only a helper that is 'waiting' has its own potato in the oven. A potato
  // YOU put in is never marked, so no helper will ever touch it.
  Game.prototype.releaseOven = function (h) {
    if (!h.oven) return;
    if (h.state === 'waiting' && h.oven.potato) h.oven.potato.orphaned = true;
    h.oven.claimedBy = null;
    h.oven = null;
  };

  // Give up on the current job. Anything still in hand goes in the bin.
  Game.prototype.helperAbandon = function (h) {
    h.bay = -1;
    h.order = null;
    this.releaseOven(h);
    h.state = h.holding ? 'toBin' : 'idle';
    h.station = h.holding ? this.bin : null;
  };

  // A helper has run out of power. It drops whatever it was holding and lies
  // there until the player picks it up and carries it to the charging pad.
  Game.prototype.helperCollapse = function (h) {
    if (h.holding) {
      this.dropped.push({ potato: h.holding, x: h.x, y: h.y });
      h.holding = null;
    }
    h.bay = -1;
    h.order = null;
    this.releaseOven(h);
    h.state = 'flat';
    h.station = null;
    this.puff(h.x, h.y - 20, '#8a7f78', 8);
  };

  // Work out the next step for one helper. Called once per frame each.
  Game.prototype.helperThink = function (h, seconds) {
    // Collapsed, or slung over the player's shoulder: no thinking either way.
    if (h.state === 'flat' || h.carried) return;

    // Helpers run their batteries down just like you do.
    h.battery -= (100 / C.HELPER_BATTERY_LASTS) * seconds;
    if (h.battery <= 0) { h.battery = 0; this.helperCollapse(h); return; }

    if (h.pause > 0) { h.pause -= seconds; return; }

    var order = h.order;

    // At every step, check the job still exists. The player may have served
    // this customer, or they may have run out of patience and left.
    // (A helper with no customer — idle, binning, or emptying an oven — has
    // nothing to check.)
    if (h.bay !== -1) {
      var customer = this.customers[h.bay];
      if (!customer || customer.state === 'leaving') { this.helperAbandon(h); return; }
    }

    // --- Nothing to do: find some work --------------------------------------
    if (h.state === 'idle') {
      // First job: any potato left behind in an oven by a helper that gave up
      // or went flat. Until it's gone, that oven is out of action for every
      // helper, so clearing it comes before taking a new order.
      if (!h.holding) {
        for (var o = 0; o < this.ovens.length; o++) {
          var jammed = this.ovens[o];
          if (jammed.potato && jammed.potato.orphaned && !jammed.claimedBy) {
            jammed.claimedBy = h;
            h.oven = jammed;
            h.station = jammed;
            h.state = 'toClear';
            return;
          }
        }
      }

      // Otherwise, a customer nobody else has claimed.
      for (var i = 0; i < this.customers.length; i++) {
        var c = this.customers[i];
        if (!c || c.state === 'leaving' || this.bayTaken(i, h)) continue;
        h.bay = i;
        h.order = { size: c.order.size, colour: c.order.colour, doneness: c.order.doneness };
        h.state = 'toBed';
        h.station = this.beds[C.SIZES.indexOf(c.order.size)];
        return;
      }
      return;   // no work going; stand still
    }

    // --- Walking to the bin -------------------------------------------------
    if (h.state === 'toBin') {
      if (this.walkHelper(h, this.bin.spot, seconds)) {
        h.holding = null;
        h.state = 'idle';
        h.station = null;
        h.pause = C.HELPER_PAUSE;
        this.puff(this.bin.x + 30, this.bin.y + 14, C.BIN_PUFF, 6);
        sfx('bin', HELPER_SFX);
      }
      return;
    }

    // --- Off to empty an oven that somebody left a potato in ----------------
    if (h.state === 'toClear') {
      var oven = h.oven;

      // You may have taken it out yourself while we were walking over. If so,
      // never mind — and never touch a potato YOU have put in since.
      if (!oven.potato || !oven.potato.orphaned) {
        oven.claimedBy = null;
        h.oven = null;
        h.station = null;
        h.state = 'idle';
        return;
      }

      if (!this.walkHelper(h, oven.spot, seconds)) return;

      // Take it out, then off to the bin with it. That frees the oven.
      oven.potato.doneness = this.donenessAt(oven.timeIn);
      oven.potato.orphaned = false;
      h.holding = oven.potato;
      oven.potato = null;
      oven.claimedBy = null;
      h.oven = null;
      h.pause = C.HELPER_PAUSE;
      h.state = 'toBin';
      h.station = this.bin;
      sfx('ovenOut', HELPER_SFX);
      return;
    }

    // --- Off to the garden bed ----------------------------------------------
    if (h.state === 'toBed') {
      if (!this.walkHelper(h, h.station.spot, seconds)) return;
      h.holding = { size: order.size, colour: 'natural', doneness: 'raw' };
      this.puff(h.x, h.y - 20, C.SOIL_PUFF, 5);
      sfx('dig', HELPER_SFX);
      h.pause = C.HELPER_PAUSE;
      this.helperNextAfterPotato(h);
      return;
    }

    // --- Off to the paint jar -----------------------------------------------
    if (h.state === 'toJar') {
      if (!this.walkHelper(h, h.station.spot, seconds)) return;
      h.holding.colour = order.colour;
      this.puff(h.station.x + h.station.w / 2, h.station.y + h.station.h / 4,
                C.PAINT_SPLASH[order.colour], 6);
      sfx('dunk', HELPER_SFX);
      h.pause = C.HELPER_PAUSE;
      this.helperNextAfterPaint(h);
      return;
    }

    // --- Off to an oven -----------------------------------------------------
    if (h.state === 'toOven') {
      // Claim a free oven. If both are busy, wait rather than dithering.
      if (!h.oven) {
        for (var k = 0; k < this.ovens.length; k++) {
          var candidate = this.ovens[k];
          if (!candidate.potato && !candidate.claimedBy) {
            candidate.claimedBy = h;
            h.oven = candidate;
            h.station = candidate;
            break;
          }
        }
        if (!h.oven) return;   // both ovens busy — hold position
      }

      if (!this.walkHelper(h, h.oven.spot, seconds)) return;

      // Someone beat us to it while we were walking.
      if (h.oven.potato) { h.oven.claimedBy = null; h.oven = null; return; }

      h.oven.potato = h.holding;
      h.oven.timeIn = this.timerForDoneness(h.holding.doneness);
      h.oven.lastDoneness = this.donenessAt(h.oven.timeIn);
      h.holding = null;
      h.state = 'waiting';
      sfx('ovenIn', HELPER_SFX);
      return;
    }

    // --- Standing at the oven, watching it cook -----------------------------
    if (h.state === 'waiting') {
      if (!h.oven) { this.helperAbandon(h); return; }

      // The player has taken our potato out. Start over.
      if (!h.oven.potato) {
        h.oven.claimedBy = null;
        h.oven = null;
        h.state = 'toBed';
        h.station = this.beds[C.SIZES.indexOf(order.size)];
        return;
      }

      var now = this.donenessAt(h.oven.timeIn);
      var wantedAt = DONENESS_ORDER.indexOf(order.doneness);
      var nowAt = DONENESS_ORDER.indexOf(now);
      if (nowAt < wantedAt) return;   // not ready yet — keep waiting

      // Ready, or we've overshot. Either way, take it out.
      h.oven.potato.doneness = now;
      h.holding = h.oven.potato;
      h.oven.potato = null;
      h.oven.claimedBy = null;
      h.oven = null;
      h.pause = C.HELPER_PAUSE;

      if (nowAt > wantedAt) { h.state = 'toBin'; h.station = this.bin; return; }

      h.state = 'toCustomer';
      h.station = this.bays[h.bay];
      return;
    }

    // --- Off to the hatch to hand it over ------------------------------------
    if (h.state === 'toCustomer') {
      if (!this.walkHelper(h, this.bays[h.bay].spot, seconds)) return;
      this.serveCustomer(h.bay, h.holding, this.bays[h.bay].drawX + C.BAY_WIDTH / 2);
      h.holding = null;
      h.bay = -1;
      h.order = null;
      h.state = 'idle';
      h.station = null;
      h.pause = C.HELPER_PAUSE;
    }
  };

  // After picking a potato: paint it, cook it, or take it straight over.
  Game.prototype.helperNextAfterPotato = function (h) {
    if (h.order.colour !== 'natural') {
      h.state = 'toJar';
      h.station = this.jars[C.JAR_COLOURS.indexOf(h.order.colour)];
      return;
    }
    this.helperNextAfterPaint(h);
  };

  // After painting: cook it, or take it straight over.
  Game.prototype.helperNextAfterPaint = function (h) {
    if (h.order.doneness !== 'raw') {
      h.state = 'toOven';
      h.station = null;
      h.oven = null;
      return;
    }
    h.state = 'toCustomer';
    h.station = this.bays[h.bay];
  };


  // --------------------------------------------------------------------------
  //  The battery
  // --------------------------------------------------------------------------

  // How fast the chef walks right now. A full battery is full speed; a flat
  // one is BATTERY_SLOWEST of that. It slides smoothly between the two, so
  // you feel yourself getting sluggish long before you actually run out.
  Game.prototype.currentSpeed = function () {
    var charge = Math.max(0, Math.min(1, this.battery / 100));
    return C.CHEF_SPEED * (C.BATTERY_SLOWEST + (1 - C.BATTERY_SLOWEST) * charge);
  };

  // Is he standing close enough to the base of the charging pad?
  // This is measured as a circle around the bottom of the pad rather than the
  // whole rectangle, so he charges when he's standing AT it, not behind it.
  Game.prototype.onCharger = function () {
    var pad = this.charger;
    var padX = pad.x + pad.w / 2;
    var padY = pad.y + pad.h - 6;
    var dx = this.chef.x - padX;
    var dy = this.chef.y - padY;
    return Math.sqrt(dx * dx + dy * dy) < C.CHARGER_GRIP;
  };


  // --------------------------------------------------------------------------
  //  How cooked is it?
  // --------------------------------------------------------------------------

  // Given how many seconds a potato has been in the oven, what state is it in?
  Game.prototype.donenessAt = function (seconds) {
    if (seconds < C.OVEN_COOKED_AT) return 'raw';
    if (seconds < C.OVEN_BURNT_AT) return 'cooked';
    if (seconds < C.OVEN_RUINED_AT) return 'burnt';
    return 'ruined';
  };

  // The reverse: if a potato is already 'cooked' and you put it back in the
  // oven, the timer needs to resume from the right place rather than zero.
  Game.prototype.timerForDoneness = function (doneness) {
    if (doneness === 'cooked') return C.OVEN_COOKED_AT;
    if (doneness === 'burnt') return C.OVEN_BURNT_AT;
    if (doneness === 'ruined') return C.OVEN_RUINED_AT;
    return 0;
  };


  // --------------------------------------------------------------------------
  //  Deciding what a customer wants
  // --------------------------------------------------------------------------
  //
  //  The first four orders are fixed, and deliberately gentle. They teach the
  //  game one station at a time: first just a potato, then paint, then the
  //  oven, then a combination. After that it goes random.

  Game.prototype.makeOrder = function () {
    var n = this.ordersMade;
    this.ordersMade++;

    if (n === 0) return { size: 'large', colour: 'natural', doneness: 'raw' };
    if (n === 1) return { size: 'large', colour: 'red', doneness: 'raw' };
    if (n === 2) return { size: pickOne(C.SIZES), colour: 'natural', doneness: 'cooked' };
    if (n === 3) return { size: pickOne(C.SIZES), colour: pickOne(C.JAR_COLOURS), doneness: 'raw' };

    // From the fifth order on, anything goes.
    var roll = Math.random();
    return {
      size: pickOne(C.SIZES),
      colour: Math.random() < 0.2 ? 'natural' : pickOne(C.JAR_COLOURS),
      doneness: roll < 0.3 ? 'raw' : roll < 0.7 ? 'cooked' : 'burnt'
    };
  };


  // --------------------------------------------------------------------------
  //  Customers arriving and leaving
  // --------------------------------------------------------------------------

  Game.prototype.spawnCustomer = function () {
    // Which bays are empty?
    var free = [];
    for (var i = 0; i < this.customers.length; i++) if (!this.customers[i]) free.push(i);
    if (free.length === 0) return false;

    // The very first customer always uses the left-hand bay so they're easy
    // to spot. After that it's random.
    var bay = this.ordersMade === 0 ? 0 : pickOne(free);

    // Try not to show the same robot face twice at once. There are only five
    // faces and there can be more customers than that, so once they're all
    // in use we just pick any of them rather than ending up with no face.
    var facesInUse = this.customers.filter(Boolean).map(function (c) { return c.face; });
    var freeFaces = [1, 2, 3, 4, 5].filter(function (f) { return facesInUse.indexOf(f) === -1; });
    var face = pickOne(freeFaces.length ? freeFaces : [1, 2, 3, 4, 5]);

    // Patience shrinks as the game goes on. The first two customers get extra.
    var ramp = Math.max(C.PATIENCE_SHORTEST, 1 - this.elapsed / C.PATIENCE_RAMP_SECONDS);
    var beginnerBonus = this.ordersMade < 2 ? C.BEGINNER_PATIENCE_BONUS : 1;
    var patience = C.PATIENCE * ramp * beginnerBonus;

    this.customers[bay] = {
      face: face,
      order: this.makeOrder(),
      patience: patience,
      patienceMax: patience,
      state: 'arriving',      // 'arriving', 'waiting' or 'leaving'
      stateTime: 0
    };
    sfx('arrive');
    return true;
  };

  Game.prototype.customerLeaves = function (index, mood) {
    var customer = this.customers[index];
    customer.state = 'leaving';
    customer.mood = mood;
    customer.stateTime = 0;

    if (mood !== 'angry') return;

    this.strikes++;
    this.showPopup(this.bays[index].drawX + C.BAY_WIDTH / 2, 60, 'X', '#e0483c');
    sfx('strike');

    if (this.strikes >= C.STRIKES_ALLOWED) this.endRound('strikes');
  };


  // Ends the round, whatever ended it, and remembers the high score.
  // 'reason' is either 'strikes' or 'battery' — it only changes the wording
  // on the game-over screen.
  Game.prototype.endRound = function (reason) {
    this.mode = 'over';
    this.overReason = reason;

    // A flat battery is a robot winding down; running out of lives is the
    // kitchen closing. They sound different so you know which happened.
    sfx(reason === 'battery' ? 'powerDown' : 'gameOver');

    if (this.coins > this.bestScore) {
      this.bestScore = this.coins;
      saveBestScore(this.bestScore);
    }
  };


  // --------------------------------------------------------------------------
  //  Little visual effects
  // --------------------------------------------------------------------------

  Game.prototype.showPopup = function (x, y, text, colour) {
    this.popups.push({ x: x, y: y, text: text, colour: colour, life: 1.1 });
  };

  Game.prototype.puff = function (x, y, colour, count) {
    for (var i = 0; i < count; i++) {
      this.puffs.push({
        x: x, y: y,
        vx: (Math.random() - 0.5) * 80,
        vy: -Math.random() * 70 - 10,
        life: 0.5, lifeMax: 0.5,
        radius: 2 + Math.random() * 2.5,
        colour: colour
      });
    }
  };


  // ==========================================================================
  //  WHAT WILL SPACE DO? — worked out fresh every frame
  // ==========================================================================
  //
  //  Space does exactly one thing, and it is always the thing that is
  //  glowing. This section decides what that thing is. The drawing code puts
  //  a ring round it, and useStation() below does it. Both read the same
  //  answer, so the glow and the Space bar can never disagree.
  //
  //  Things are checked in this order, and the first match wins:
  //
  //    1. Carrying a flat robot?          Space puts it down. Nothing else
  //                                       counts, so you can never get stuck.
  //    2. Empty hands, by a flat robot?   Space lifts it onto your shoulders.
  //    3. Empty hands, by a potato lying on the floor?   Space picks it up.
  //    4. Next to a station?              Space uses it — but only if there
  //                                       is something to do there. If not,
  //                                       nothing glows and nothing happens.
  //    5. Holding a potato, with no station near?   Space puts it down on
  //                                       the floor.

  // How far the chef's feet are from a station.
  //
  // Most stations sit against a wall, so this is the gap to the nearest edge
  // of the station's rectangle. The parts table stands out on the open floor,
  // so it is measured from one spot instead — the middle of its front edge.
  Game.prototype.gapTo = function (s) {
    var chef = this.chef;
    var nx, ny;

    if (s.type === 'parts') {
      nx = s.x + s.w / 2;
      ny = s.y + s.h;
    } else {
      nx = Math.max(s.x, Math.min(s.x + s.w, chef.x));
      ny = Math.max(s.y, Math.min(s.y + s.h, chef.y));
    }

    var dx = nx - chef.x, dy = ny - chef.y;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // How close counts as "close enough" for this station.
  Game.prototype.reachOf = function (s) {
    return s.type === 'parts' ? C.PARTS_REACH : C.REACH;
  };

  // Could Space buy a helper robot right now? Only with completely empty
  // hands (no potato, no flat robot on your shoulders), enough coins, and
  // room for another robot. HELPER_MAX of 0 means there is no limit.
  Game.prototype.canBuyHelper = function () {
    if (this.holding || this.carryingHelper) return false;
    if (C.HELPER_MAX > 0 && this.helpers.length >= C.HELPER_MAX) return false;
    return this.coins >= this.helperCost;
  };

  // Would Space actually do something at this station, right now?
  // Each line here matches one of the station rules in useStation() below.
  Game.prototype.canUse = function (station) {
    var held = this.holding;
    if (this.carryingHelper) return false;

    // A bed: only with empty hands, to pull up a potato.
    if (station.type === 'bed') return held === null;

    // A jar: with any potato that isn't ruined.
    if (station.type === 'jar') return held !== null && held.doneness !== 'ruined';

    // An oven: put a potato in an empty one, or take one out empty-handed.
    if (station.type === 'oven') {
      if (station.potato) return held === null;
      return held !== null;
    }

    // The bin: only if there's something to throw away.
    if (station.type === 'bin') return held !== null;

    // The parts table: only if a robot would really be bought.
    if (station.type === 'parts') return this.canBuyHelper();

    // A customer: only if you have a potato AND someone is there to take it.
    // An empty slot, or one whose customer is already leaving, does nothing
    // — you keep your potato.
    if (station.type === 'bay') {
      var customer = this.customers[station.index];
      return held !== null && customer !== null && customer.state !== 'leaving';
    }

    return false;
  };

  // Work out what Space would do right now, and remember it in three places:
  //
  //    this.nearestFlat   the flat robot Space would lift
  //    this.nearestDrop   the potato on the floor Space would pick up
  //    this.nearest       the station Space is next to
  //
  // At most ONE of these is ever set, in the order listed at the top of this
  // section.
  Game.prototype.findTarget = function () {
    var chef = this.chef;
    var i, gap;

    this.nearestFlat = null;
    this.nearestDrop = null;
    this.nearest = null;

    // 1. Carrying a flat robot: Space puts it down, whatever else is near.
    if (this.carryingHelper) return;

    if (!this.holding) {
      // 2. A flat robot underfoot. This beats any station, because a robot
      //    can collapse right on top of one.
      var flatGap = C.HELPER_PICKUP_REACH;
      for (i = 0; i < this.helpers.length; i++) {
        var fh = this.helpers[i];
        if (fh.state !== 'flat' || fh.carried) continue;
        gap = Math.sqrt((fh.x - chef.x) * (fh.x - chef.x) + (fh.y - chef.y) * (fh.y - chef.y));
        if (gap < flatGap) { flatGap = gap; this.nearestFlat = fh; }
      }
      if (this.nearestFlat) return;

      // 3. A potato lying on the floor. This beats any station too — so a
      //    potato can always be picked up again, even one that a robot
      //    dropped right next to a bed or the bin when it collapsed.
      var dropGap = C.DROP_REACH;
      for (i = 0; i < this.dropped.length; i++) {
        var item = this.dropped[i];
        gap = Math.sqrt((item.x - chef.x) * (item.x - chef.x) + (item.y - chef.y) * (item.y - chef.y));
        if (gap < dropGap) { dropGap = gap; this.nearestDrop = item; }
      }
      if (this.nearestDrop) return;
    }

    // 4. The closest station in reach. The parts table only counts when Space
    //    would really buy a robot. Otherwise it steps aside, and whatever else
    //    is nearby — or the open floor — gets the press instead.
    var closestGap = Infinity;
    for (i = 0; i < this.stations.length; i++) {
      var s = this.stations[i];
      if (s.type === 'parts' && !this.canBuyHelper()) continue;
      gap = this.gapTo(s);
      if (gap < this.reachOf(s) && gap < closestGap) {
        closestGap = gap;
        this.nearest = s;
      }
    }
  };


  // ==========================================================================
  //  PRESSING SPACE — the one verb in the game
  // ==========================================================================
  //
  //  What happens depends entirely on what findTarget() above picked out.

  Game.prototype.useStation = function () {
    // Work the answer out fresh, so Space does exactly what is glowing.
    this.findTarget();

    var station = this.nearest;
    var held = this.holding;

    // --- CARRYING A COLLAPSED ROBOT: put it down ----------------------------
    // This beats everything, so you can never get stuck holding one.
    if (this.carryingHelper) {
      this.carryingHelper.carried = false;
      this.carryingHelper.x = this.chef.x;
      this.carryingHelper.y = this.chef.y;
      this.carryingHelper = null;
      return;
    }

    // --- A COLLAPSED ROBOT UNDERFOOT: pick it up ----------------------------
    if (this.nearestFlat) {
      this.nearestFlat.carried = true;
      this.carryingHelper = this.nearestFlat;
      this.nearestFlat = null;
      return;
    }

    // --- A POTATO ON THE FLOOR: pick it back up -----------------------------
    // With empty hands this beats every station, so a potato on the floor can
    // always be picked up again, wherever it is lying.
    if (this.nearestDrop) {
      this.holding = this.nearestDrop.potato;
      var at = this.dropped.indexOf(this.nearestDrop);
      if (at !== -1) this.dropped.splice(at, 1);
      this.nearestDrop = null;
      sfx('pickup');
      return;
    }

    // --- OPEN FLOOR: put it down --------------------------------------------
    // No station is in reach, so Space puts down whatever you're holding.
    // Dropping only ever happens out in the open like this — never next to a
    // station, where Space means using the station instead.
    if (!station) {
      if (held) {
        this.dropped.push({ potato: held, x: this.chef.x, y: this.chef.y });
        this.holding = null;
        this.puff(this.chef.x, this.chef.y - 6, C.SOIL_PUFF, 4);
        sfx('drop');
      } else if (this.gapTo(this.partsTable) < C.PARTS_REACH &&
                 (C.HELPER_MAX === 0 || this.helpers.length < C.HELPER_MAX)) {
        // Empty hands at the parts table, but not enough coins. Nothing is
        // bought, so nothing glows — but say why, rather than doing nothing
        // silently.
        var t = this.partsTable;
        this.showPopup(t.x + t.w / 2, t.y - 4, this.helperCost + '!', C.BATTERY_LOW_COLOUR);
        sfx('nope');
      }
      return;
    }

    // --- NEXT TO A STATION, BUT NOTHING TO DO THERE -------------------------
    // For example an empty slot in the hatch: nothing happens, and you keep
    // your potato. canUse() is the same check that decides the glow.
    if (!this.canUse(station)) return;

    // --- A GARDEN BED: pull up a raw potato ---------------------------------
    if (station.type === 'bed') {
      this.holding = { size: station.size, colour: 'natural', doneness: 'raw' };
      this.puff(this.chef.x, this.chef.y - 24, C.SOIL_PUFF, 6);
      sfx('dig');
      return;
    }

    // --- A PAINT JAR: dunk whatever we're holding ---------------------------
    // Re-dunking is allowed and simply overwrites the colour, so a wrong dunk
    // costs a walk rather than the whole potato.
    if (station.type === 'jar') {
      held.colour = station.colour;
      // Splash from the middle of the jar's opening, whatever size it is.
      this.puff(station.x + station.w / 2, station.y + station.h / 4,
                C.PAINT_SPLASH[station.colour], 8);
      sfx('dunk');
      return;
    }

    // --- AN OVEN: put one in, or take one out -------------------------------
    if (station.type === 'oven') {
      if (!station.potato && held) {
        station.potato = held;
        station.timeIn = this.timerForDoneness(held.doneness);
        station.lastDoneness = this.donenessAt(station.timeIn);
        this.holding = null;
        sfx('ovenIn');
      } else if (station.potato && !held) {
        station.potato.doneness = this.donenessAt(station.timeIn);
        // If a helper had abandoned this one, it's yours now — so no helper
        // will come and take it off you.
        station.potato.orphaned = false;
        this.holding = station.potato;
        station.potato = null;
        sfx('ovenOut');
      }
      return;
    }

    // --- THE BIN: throw it away ---------------------------------------------
    if (station.type === 'bin') {
      this.holding = null;
      this.puff(station.x + 30, station.y + 14, C.BIN_PUFF, 8);
      sfx('bin');
      return;
    }

    // --- THE PARTS TABLE: build a helper robot -------------------------------
    // canUse() has already checked your hands are empty and you can afford it.
    if (station.type === 'parts') {
      this.coins -= this.helperCost;
      this.spawnHelper();
      this.helperCost = Math.round(this.helperCost * C.HELPER_COST_MULTIPLIER);
      return;
    }

    // --- A CUSTOMER: hand it over and find out ------------------------------
    // canUse() has already checked there's a customer here who isn't leaving.
    if (station.type === 'bay') {
      this.holding = null;
      this.serveCustomer(station.index, held, station.drawX + C.BAY_WIDTH / 2);
    }
  };


  // Hand a potato to a customer and settle up. Used by the player AND by the
  // helper robots, so that both are paid by exactly the same rules.
  Game.prototype.serveCustomer = function (bayIndex, potato, popupX) {
    var customer = this.customers[bayIndex];
    if (!customer || customer.state === 'leaving') return false;

    var wanted = customer.order;
    var correct = wanted.size === potato.size &&
                  wanted.colour === potato.colour &&
                  wanted.doneness === potato.doneness;

    if (correct) {
      // The faster it arrived, the more it pays.
      var speedShare = customer.patience / customer.patienceMax;
      var pay = C.PAY_BASE + Math.round(C.PAY_SPEED_BONUS * speedShare);
      this.coins += pay;
      this.showPopup(popupX, 70, '+' + pay, '#f2c230');
      // Full volume even when a helper did it — this is the payoff you bought
      // them for, so it should sound just as good.
      sfx('serveGood');
      sfx('coins');
      this.customerLeaves(bayIndex, 'happy');
    } else {
      sfx('serveBad');
      this.customerLeaves(bayIndex, 'angry');
    }
    return true;
  };


  // ==========================================================================
  //  THE GAME LOOP — runs about 60 times a second
  // ==========================================================================
  //
  //  'seconds' is how long has passed since the last frame. Everything that
  //  moves is multiplied by it, so the game runs at the same speed on a fast
  //  machine and a slow one.

  Game.prototype.update = function (seconds) {
    // Dust and steam keep drifting even when paused — it looks better.
    var i;
    for (i = 0; i < this.puffs.length; i++) {
      var p = this.puffs[i];
      p.x += p.vx * seconds;
      p.y += p.vy * seconds;
      p.life -= seconds;
    }
    this.puffs = this.puffs.filter(function (p) { return p.life > 0; });

    for (i = 0; i < this.popups.length; i++) {
      this.popups[i].y -= 28 * seconds;
      this.popups[i].life -= seconds;
    }
    this.popups = this.popups.filter(function (p) { return p.life > 0; });

    if (this.mode !== 'play') return;

    this.elapsed += seconds;

    // --- Walking ------------------------------------------------------------
    var dx = 0, dy = 0;
    if (this.keysHeld['arrowleft'] || this.keysHeld['a']) dx--;
    if (this.keysHeld['arrowright'] || this.keysHeld['d']) dx++;
    if (this.keysHeld['arrowup'] || this.keysHeld['w']) dy--;
    if (this.keysHeld['arrowdown'] || this.keysHeld['s']) dy++;

    var chef = this.chef;
    var speed = this.currentSpeed();
    if (dx || dy) {
      // Divide by the diagonal length so walking diagonally isn't faster.
      var length = Math.sqrt(dx * dx + dy * dy);
      chef.x += (dx / length) * speed * seconds;
      chef.y += (dy / length) * speed * seconds;
      // A flat battery shuffles instead of striding.
      chef.walkPhase += seconds * 14 * (speed / C.CHEF_SPEED);
    } else {
      chef.walkPhase = 0;
    }

    // Keep his feet inside the walkable box.
    chef.x = Math.max(C.WALK_LEFT, Math.min(C.WALK_RIGHT, chef.x));
    chef.y = Math.max(C.WALK_TOP, Math.min(C.WALK_BOTTOM, chef.y));

    // --- The battery --------------------------------------------------------
    // Standing on the pad fills it quickly. Everything else drains it slowly.
    this.charging = this.onCharger();

    // A robot you're carrying rides along on your shoulders, and wakes up the
    // moment you step onto the pad.
    if (this.carryingHelper) {
      this.carryingHelper.x = chef.x;
      this.carryingHelper.y = chef.y;
      if (this.charging) {
        var revived = this.carryingHelper;
        revived.battery = 100;
        revived.carried = false;
        revived.state = 'idle';
        revived.pause = 0.4;
        revived.x = this.charger.x + this.charger.w / 2;
        revived.y = this.charger.y + this.charger.h + 14;
        this.carryingHelper = null;
        this.puff(revived.x, revived.y - 20, C.CHARGE_SPARK, 14);
      }
    }

    if (this.charging) {
      this.battery = Math.min(100, this.battery + C.BATTERY_RECHARGE_RATE * seconds);

      // Sparks, so it is obvious something is happening.
      if (Math.random() < seconds * 20) {
        var pad = this.charger;
        this.puffs.push({
          x: pad.x + pad.w / 2 + (Math.random() - 0.5) * pad.w,
          y: pad.y + pad.h - 10,
          vx: (Math.random() - 0.5) * 70,
          vy: -50 - Math.random() * 50,
          life: 0.4, lifeMax: 0.4,
          radius: 1.5 + Math.random() * 2,
          colour: C.CHARGE_SPARK
        });
      }

      // A shimmer that climbs in pitch as the battery fills.
      this.chargeBeep -= seconds;
      if (this.chargeBeep <= 0) {
        this.chargeBeep = 0.09;
        sfx('charge', { pitch: this.battery / 100 });
      }
    } else {
      this.battery -= (100 / C.BATTERY_LASTS) * seconds;
      if (this.battery <= 0) {
        this.battery = 0;
        this.endRound('battery');
        return;
      }

      // Nag once a second while the battery is nearly flat. You are usually
      // looking somewhere else entirely when this matters.
      if (this.battery <= C.BATTERY_LOW_AT) {
        this.lowBeep -= seconds;
        if (this.lowBeep <= 0) {
          this.lowBeep = 1;
          sfx('batteryLow');
        }
      } else {
        this.lowBeep = 0;
      }
    }

    // --- Ovens cooking ------------------------------------------------------
    for (i = 0; i < this.ovens.length; i++) {
      var oven = this.ovens[i];
      if (!oven.potato) continue;
      oven.timeIn += seconds;

      // Steam while cooking, smoke once it's past that.
      var state = this.donenessAt(oven.timeIn);

      // The most useful sound in the game. A potato changing stage makes a
      // noise, so you can cook by ear from the far side of the kitchen
      // instead of having to watch the oven.
      if (state !== oven.lastDoneness) {
        if (state === 'cooked') sfx('ovenReady');
        else if (state === 'burnt') sfx('ovenBurnt');
        else if (state === 'ruined') sfx('ovenRuined');
        oven.lastDoneness = state;
      }

      var rate = state === 'raw' ? 0 : state === 'cooked' ? 5 : 9;
      if (Math.random() < seconds * rate) {
        this.puffs.push({
          x: oven.x + 40 + Math.random() * 32,
          y: oven.y + 4,
          vx: (Math.random() - 0.5) * 10,
          vy: -25 - Math.random() * 20,
          life: 1.2, lifeMax: 1.2,
          radius: 3 + Math.random() * 3,
          colour: state === 'cooked' ? 'rgba(255,255,255,0.8)'
                : state === 'burnt' ? 'rgba(60,55,52,0.7)'
                : 'rgba(30,28,26,0.85)'
        });
      }
    }

    // --- Customers waiting --------------------------------------------------
    for (i = 0; i < this.customers.length; i++) {
      var customer = this.customers[i];
      if (!customer) continue;
      customer.stateTime += seconds;

      if (customer.state === 'arriving' && customer.stateTime > 0.4) {
        customer.state = 'waiting';
      }

      if (customer.state !== 'leaving') {
        customer.patience -= seconds;
        if (customer.patience <= 0 && this.mode === 'play') {
          this.customerLeaves(i, 'angry');
        }
      } else if (customer.stateTime > 0.7) {
        this.customers[i] = null;
      }
    }

    // --- New customers arriving ---------------------------------------------
    this.untilNextCustomer -= seconds;
    if (this.untilNextCustomer <= 0) {
      if (this.spawnCustomer()) {
        var speedUp = Math.max(C.SPAWN_FASTEST, 1 - this.elapsed / C.SPAWN_RAMP_SECONDS);
        this.untilNextCustomer = C.SPAWN_EVERY * speedUp;
      } else {
        this.untilNextCustomer = 1;   // hatch is full — try again in a second
      }
    }

    // --- The helper robots get their turn -----------------------------------
    for (i = 0; i < this.helpers.length; i++) {
      this.helperThink(this.helpers[i], seconds);
    }

    // --- What would Space do right now? -------------------------------------
    // Worked out every frame so the right thing glows. See findTarget above.
    this.findTarget();
  };


  // ==========================================================================
  //  DRAWING
  // ==========================================================================

  // Draw a picture. If it's missing, draw a labelled orange box instead so
  // you can see at a glance which file didn't turn up.
  Game.prototype.picture = function (name, x, y, w, h) {
    var img = images[name];
    var ctx = this.ctx;

    if (img && img.complete && !img.failed && img.naturalWidth) {
      ctx.drawImage(img, x, y, w, h);
      return;
    }

    ctx.fillStyle = 'rgba(224,131,58,0.25)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#e0833a';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    ctx.fillStyle = C.INK;
    ctx.font = '8px monospace';
    ctx.fillText(name, x + 2, y + 10, w - 4);
  };

  // Draw a potato: the base picture, then the cooked or burnt marks on top.
  Game.prototype.drawPotato = function (potato, centreX, centreY, scale) {
    var size = 64 * scale;

    if (potato.doneness === 'ruined') {
      this.picture('potato_ruined', centreX - size / 2, centreY - size / 2, size, size);
      return;
    }

    this.picture('potato_' + potato.size + '_' + potato.colour,
                 centreX - size / 2, centreY - size / 2, size, size);

    if (potato.doneness === 'cooked' || potato.doneness === 'burnt') {
      var overlay = size * C.OVERLAY_SCALE[potato.size];
      this.picture('overlay_' + potato.doneness,
                   centreX - overlay / 2, centreY - overlay / 2, overlay, overlay);
    }
  };

  // The yellow battery bar that floats above the chef's head.
  // It turns red and flashes once the battery is nearly flat, which is the
  // only warning you get before the round ends.
  // 'charge' and 'barWidth' are optional — left out, it draws the player's own
  // battery at full size, which is what the chef uses.
  Game.prototype.drawBatteryBar = function (centreX, y, charge, barWidth) {
    var ctx = this.ctx;
    if (charge === undefined) charge = this.battery;
    var width = barWidth || 34, height = 5;
    var left = centreX - width / 2;
    var filled = Math.max(0, Math.min(1, charge / 100));
    var low = charge <= C.BATTERY_LOW_AT;

    // Flash when it's nearly flat.
    ctx.globalAlpha = low ? 0.55 + 0.45 * Math.sin(performance.now() / 110) : 1;

    // The empty trough behind the bar.
    ctx.fillStyle = 'rgba(42,35,32,0.6)';
    ctx.fillRect(left - 1, y - 1, width + 2, height + 2);

    // The charge itself.
    ctx.fillStyle = low ? C.BATTERY_LOW_COLOUR : C.BATTERY_FULL_COLOUR;
    ctx.fillRect(left, y, width * filled, height);

    ctx.globalAlpha = 1;
  };


  // A soft oval shadow, so things look like they're sitting on the floor.
  Game.prototype.shadow = function (centreX, centreY, radiusX, radiusY) {
    var ctx = this.ctx;
    ctx.fillStyle = 'rgba(40,30,20,0.16)';
    ctx.beginPath();
    ctx.ellipse(centreX, centreY, radiusX, radiusY, 0, 0, Math.PI * 2);
    ctx.fill();
  };


  Game.prototype.draw = function () {
    var ctx = this.ctx;
    var self = this;
    var i;

    // Everything below is written in 500x500 coordinates; this line scales it
    // up to the real canvas so it stays sharp.
    ctx.setTransform(C.SHARPNESS, 0, 0, C.SHARPNESS, 0, 0);
    ctx.clearRect(0, 0, C.WIDTH, C.HEIGHT);

    this.picture('kitchen_background', 0, 0, C.WIDTH, C.HEIGHT);

    // --- Customers in the hatch ---------------------------------------------
    // Clipped to the hatch opening so they slide in and out of a hole.
    ctx.save();
    ctx.beginPath();
    ctx.rect(C.HATCH_X, C.HATCH_Y, C.HATCH_WIDTH, C.HATCH_HEIGHT);
    ctx.clip();

    for (i = 0; i < this.customers.length; i++) {
      var cu = this.customers[i];
      if (!cu) continue;

      var bayX = this.bays[i].drawX;
      var ease = function (t) { return 1 - Math.pow(1 - Math.min(1, t), 3); };

      var slide = 0;
      if (cu.state === 'arriving') slide = (1 - ease(cu.stateTime / 0.4)) * 86;
      else if (cu.state === 'leaving') slide = ease(cu.stateTime / 0.7) * 86;

      // Fidget when patience is low, storm off when angry.
      var jitter = 0;
      if (cu.state === 'waiting' && cu.patience / cu.patienceMax < 0.3) {
        jitter = Math.sin(performance.now() / 40) * 1.5;
      }
      if (cu.state === 'leaving' && cu.mood === 'angry') {
        jitter = Math.sin(cu.stateTime * 60) * 3;
      }

      // Sized to fit the bay, keeping the artwork's own proportions so the
      // robots never look squashed however many customers we allow at once.
      var cw = C.BAY_WIDTH - 6;
      var chh = cw * (86 / 132);
      var cy = C.HATCH_Y + C.HATCH_HEIGHT - chh;
      this.picture('customer_' + cu.face, bayX + 3 + jitter, cy + slide, cw, chh);

      if (cu.state === 'leaving' && cu.mood === 'angry') {
        ctx.fillStyle = 'rgba(224,72,60,0.35)';
        ctx.fillRect(bayX, C.HATCH_Y, C.BAY_WIDTH, C.HATCH_HEIGHT);
      }
    }
    ctx.restore();

    // --- The kitchen itself -------------------------------------------------
    // Everything is collected into a list first and sorted by how far down the
    // screen it is, so things nearer the bottom are drawn last and overlap
    // properly. Without this the chef would appear behind the ovens.
    var toDraw = [];

    this.beds.forEach(function (bed) {
      toDraw.push([bed.y + bed.h, function () {
        self.shadow(bed.x + bed.w / 2, bed.y + bed.h - 4, bed.w * 0.46, 6);
        self.picture(bed.picture, bed.x, bed.y, bed.w, bed.h);
      }]);
    });

    this.jars.forEach(function (jar) {
      toDraw.push([jar.y + jar.h, function () {
        self.shadow(jar.x + jar.w / 2, jar.y + jar.h - 3, jar.w * 0.42, 5);
        self.picture(jar.picture, jar.x, jar.y, jar.w, jar.h);
      }]);
    });

    toDraw.push([this.bin.y + this.bin.h, function () {
      var b = self.bin;
      self.shadow(b.x + 30, b.y + b.h - 3, 22, 5);
      self.picture('bin', b.x, b.y, b.w, b.h);
    }]);

    this.ovens.forEach(function (oven) {
      toDraw.push([oven.y + oven.h, function () { self.drawOven(oven); }]);
    });

    // Potatoes lying on the floor. Sorted in with everything else so the chef
    // walks in front of the ones below him and behind the ones above.
    this.dropped.forEach(function (item) {
      toDraw.push([item.y, function () {
        self.shadow(item.x, item.y, 13, 4);
        self.drawPotato(item.potato, item.x, item.y - 11, C.POTATO_ON_FLOOR);
      }]);
    });

    // The parts table, with the price of the next robot floating over it.
    toDraw.push([this.partsTable.y + this.partsTable.h, function () {
      var t = self.partsTable;
      self.shadow(t.x + t.w / 2, t.y + t.h - 3, t.w * 0.44, 6);
      self.picture('parts_table', t.x, t.y, t.w, t.h);

      if (C.HELPER_MAX === 0 || self.helpers.length < C.HELPER_MAX) {
        var affordable = self.coins >= self.helperCost;
        ctx.textAlign = 'center';
        ctx.font = '12px ' + C.FONT;
        ctx.lineWidth = 3;
        ctx.strokeStyle = C.INK;
        ctx.strokeText(self.helperCost, t.x + t.w / 2, t.y - 4);
        ctx.fillStyle = affordable ? C.BATTERY_FULL_COLOUR : C.BATTERY_LOW_COLOUR;
        ctx.fillText(self.helperCost, t.x + t.w / 2, t.y - 4);
        ctx.textAlign = 'left';
      }
    }]);

    // The helper robots, each sorted into the scene by how far down it is.
    this.helpers.forEach(function (h) {
      // A robot being carried is drawn with the chef, not here.
      if (h.carried) return;

      toDraw.push([h.y, function () {
        var w = C.CHEF_WIDTH * C.HELPER_SCALE;
        var ht = C.CHEF_HEIGHT * C.HELPER_SCALE;

        // A coloured ring on the floor, so you can tell them apart from you.
        ctx.strokeStyle = h.tint;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(h.x, h.y - 1, 15, 5, 0, 0, Math.PI * 2);
        ctx.stroke();

        // --- Collapsed: lying on its side until someone carries it off ------
        if (h.state === 'flat') {
          ctx.save();
          ctx.translate(h.x, h.y - 10);
          ctx.rotate(Math.PI / 2);
          ctx.globalAlpha = 0.75;
          self.picture('chef_robot', -w / 2, -ht / 2, w, ht);
          ctx.restore();
          ctx.globalAlpha = 1;

          // A flashing red cross so it's obvious it needs collecting.
          ctx.globalAlpha = 0.5 + 0.5 * Math.sin(performance.now() / 160);
          ctx.fillStyle = C.BATTERY_LOW_COLOUR;
          ctx.font = '13px ' + C.FONT;
          ctx.textAlign = 'center';
          ctx.fillText('!', h.x, h.y - 26);
          ctx.textAlign = 'left';
          ctx.globalAlpha = 1;
          return;
        }

        var bob = h.walkPhase ? -Math.abs(Math.sin(h.walkPhase)) * 2.5 : 0;
        self.picture('chef_robot', h.x - w / 2, h.y - ht + bob, w, ht);
        if (h.holding) {
          self.drawPotato(h.holding, h.x, h.y - 21 + bob, C.POTATO_IN_HANDS * C.HELPER_SCALE);
        }
        self.drawBatteryBar(h.x, h.y - ht - 7 + bob, h.battery, 26);
      }]);
    });

    // The charging pad. It glows while the chef is topping up.
    toDraw.push([this.charger.y + this.charger.h, function () {
      var pad = self.charger;
      self.shadow(pad.x + pad.w / 2, pad.y + pad.h - 5, pad.w * 0.5, 7);

      if (self.charging) {
        var halo = 0.25 + 0.2 * Math.sin(performance.now() / 90);
        ctx.fillStyle = 'rgba(255,230,120,' + halo + ')';
        ctx.beginPath();
        ctx.ellipse(pad.x + pad.w / 2, pad.y + pad.h - 6, pad.w * 0.7, 14, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      self.picture('charging_station', pad.x, pad.y, pad.w, pad.h);
    }]);

    var chef = this.chef;
    toDraw.push([chef.y, function () {
      var bob = chef.walkPhase ? -Math.abs(Math.sin(chef.walkPhase)) * 2.5 : 0;
      self.shadow(chef.x, chef.y - 1, 18, 5);
      self.picture('chef_robot',
                   chef.x - C.CHEF_WIDTH / 2, chef.y - C.CHEF_HEIGHT + bob,
                   C.CHEF_WIDTH, C.CHEF_HEIGHT);
      if (self.holding) {
        self.drawPotato(self.holding, chef.x, chef.y - 24 + bob, C.POTATO_IN_HANDS);
      }
      // A collapsed robot slung over his shoulders.
      if (self.carryingHelper) {
        var cw = C.CHEF_WIDTH * C.HELPER_SCALE * 0.8;
        var cht = C.CHEF_HEIGHT * C.HELPER_SCALE * 0.8;
        ctx.save();
        ctx.translate(chef.x, chef.y - C.CHEF_HEIGHT - 6 + bob);
        ctx.rotate(Math.PI / 2);
        self.picture('chef_robot', -cw / 2, -cht / 2, cw, cht);
        ctx.restore();
      }
      self.drawBatteryBar(chef.x, chef.y - C.CHEF_HEIGHT - 9 + bob);
    }]);

    toDraw.sort(function (a, b) { return a[0] - b[0]; });
    for (i = 0; i < toDraw.length; i++) toDraw[i][1]();

    // --- The pulsing ring around whatever Space will use --------------------
    // Only drawn when Space would really do something there (canUse), so an
    // empty hatch slot, or a bed when your hands are full, never glows.
    if (this.nearest && this.mode === 'play' && this.canUse(this.nearest)) {
      var s = this.nearest;
      var ringHeight = s.type === 'bay' ? C.HATCH_HEIGHT : s.h;
      // For a customer, ring the robot up in the hatch rather than the
      // invisible patch of floor you're standing on.
      var ringX = s.type === 'bay' ? s.drawX : s.x;
      var ringW = s.type === 'bay' ? C.BAY_WIDTH : s.w;
      var pulse = 0.6 + 0.4 * Math.sin(performance.now() / 150);
      ctx.strokeStyle = 'rgba(' + C.HIGHLIGHT + ',' + pulse + ')';
      ctx.lineWidth = 3;
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(ringX - 2, s.y - 2, ringW + 4, ringHeight + 4, 10);
      } else {
        ctx.rect(ringX - 2, s.y - 2, ringW + 4, ringHeight + 4);
      }
      ctx.stroke();
    }

    // --- The ring around a potato he's standing over and could pick up -------
    // Only shown when his hands are empty, because that's the only time
    // Space would actually pick it up.
    if (this.nearestDrop && !this.holding && this.mode === 'play') {
      var drop = this.nearestDrop;
      var dropPulse = 0.6 + 0.4 * Math.sin(performance.now() / 150);
      ctx.strokeStyle = 'rgba(' + C.HIGHLIGHT + ',' + dropPulse + ')';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(drop.x, drop.y, 20, 8, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // --- The ring around a flat robot he's standing over and could lift ------
    if (this.nearestFlat && this.mode === 'play') {
      var flat = this.nearestFlat;
      var flatPulse = 0.6 + 0.4 * Math.sin(performance.now() / 150);
      ctx.strokeStyle = 'rgba(' + C.HIGHLIGHT + ',' + flatPulse + ')';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(flat.x, flat.y - 1, 24, 9, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // --- Speech bubbles, with the order and the patience bar -----------------
    for (i = 0; i < this.customers.length; i++) {
      var c2 = this.customers[i];
      if (!c2 || c2.state === 'leaving') continue;

      var bx = this.bays[i].drawX;
      ctx.globalAlpha = c2.state === 'arriving' ? Math.min(1, c2.stateTime / 0.4) : 1;

      // The bubble fills its bay, whatever size the bays are.
      var bw = C.BAY_WIDTH - 6;              // bubble width
      var bh = bw * (58 / 80);               // keep the artwork's proportions
      var bLeft = bx + 3;
      var midX = bLeft + bw / 2;

      this.picture('speech_bubble', bLeft, 96, bw, bh);
      this.drawPotato(c2.order, midX, 96 + bh * 0.47,
                      C.POTATO_IN_BUBBLE * (C.BAY_WIDTH / 140));

      // The patience bar sits just under the bubble.
      var barW = bw * 0.62, barX = midX - barW / 2, barY = 96 + bh - 4;
      var left = Math.max(0, c2.patience / c2.patienceMax);
      ctx.fillStyle = '#d9d2c2';
      ctx.fillRect(barX, barY, barW, 5);
      ctx.fillStyle = left > 0.5 ? '#3aa845' : left > 0.25 ? '#f2c230' : '#e0483c';
      ctx.fillRect(barX, barY, barW * left, 5);
      ctx.strokeStyle = C.INK;
      ctx.lineWidth = 1;
      ctx.strokeRect(barX, barY, barW, 5);

      ctx.globalAlpha = 1;
    }

    // --- Dust, steam and smoke ----------------------------------------------
    for (i = 0; i < this.puffs.length; i++) {
      var puff = this.puffs[i];
      ctx.globalAlpha = Math.max(0, puff.life / puff.lifeMax);
      ctx.fillStyle = puff.colour;
      ctx.beginPath();
      ctx.arc(puff.x, puff.y, puff.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // --- Floating score numbers ---------------------------------------------
    ctx.textAlign = 'center';
    for (i = 0; i < this.popups.length; i++) {
      var pop = this.popups[i];
      ctx.globalAlpha = Math.min(1, pop.life * 2);
      ctx.font = '18px ' + C.FONT;
      ctx.lineWidth = 4;
      ctx.strokeStyle = C.INK;
      ctx.strokeText(pop.text, pop.x, pop.y);
      ctx.fillStyle = pop.colour;
      ctx.fillText(pop.text, pop.x, pop.y);
    }
    ctx.globalAlpha = 1;

    // --- Coins and lives ----------------------------------------------------
    this.picture('icon_coin', 6, 2, 14, 14);
    ctx.textAlign = 'left';
    ctx.font = '13px ' + C.FONT;
    ctx.fillStyle = C.INK;
    ctx.fillText(this.coins, 24, 14);

    // The hearts, in a row across the middle of the top. They shrink to fit
    // however many lives config.js asks for, so ten works as well as three,
    // and the whole row stays centred whatever that number is.
    var heartSize = C.STRIKES_ALLOWED > 6 ? 11 : 14;
    var heartGap = heartSize + 2;
    var heartsLeft = (C.WIDTH - C.STRIKES_ALLOWED * heartGap + 2) / 2;
    for (i = 0; i < C.STRIKES_ALLOWED; i++) {
      ctx.globalAlpha = i < C.STRIKES_ALLOWED - this.strikes ? 1 : 0.22;
      this.picture('icon_heart', heartsLeft + i * heartGap, 2,
                   heartSize, heartSize);
    }
    ctx.globalAlpha = 1;

    // --- The debug outlines, if switched on in config.js ---------------------
    if (C.SHOW_ZONES) {
      ctx.setLineDash([4, 3]);
      ctx.lineWidth = 1;
      ctx.strokeStyle = '#2f6fd6';
      ctx.strokeRect(C.WALK_LEFT, C.WALK_TOP,
                     C.WALK_RIGHT - C.WALK_LEFT, C.WALK_BOTTOM - C.WALK_TOP);
      ctx.strokeStyle = '#e0483c';
      for (i = 0; i < this.stations.length; i++) {
        var z = this.stations[i];
        ctx.strokeRect(z.x, z.y, z.w, z.h);
      }
      // The parts table is used from one spot at its front, not from its
      // outline, so its circle shows where your feet need to be.
      var pt = this.partsTable;
      ctx.beginPath();
      ctx.arc(pt.x + pt.w / 2, pt.y + pt.h, C.PARTS_REACH, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    if (this.mode !== 'play') this.drawOverlay();
  };


  // The oven is drawn in layers: the dark inside, then the potato, then the
  // oven picture on top (its window is a see-through hole), then the timer bar.
  Game.prototype.drawOven = function (oven) {
    var ctx = this.ctx;

    this.shadow(oven.x + 56, oven.y + oven.h - 3, 50, 6);

    var state = oven.potato ? this.donenessAt(oven.timeIn) : null;

    ctx.fillStyle = '#2a1e18';
    ctx.fillRect(oven.x + 28, oven.y + 22, 56, 40);

    if (oven.potato) {
      var glow = 0.25 + 0.1 * Math.sin(performance.now() / 200);
      ctx.fillStyle = 'rgba(255,140,40,' + glow + ')';
      ctx.fillRect(oven.x + 28, oven.y + 22, 56, 40);
      this.drawPotato({ size: oven.potato.size, colour: oven.potato.colour, doneness: state },
                      oven.x + 56, oven.y + 44, C.POTATO_IN_OVEN);
    }

    this.picture('oven', oven.x, oven.y, oven.w, oven.h);

    if (!oven.potato) return;

    // The timer bar, showing which stage the potato is in.
    var barX = oven.x + 37, barY = oven.y + 10.5, barW = 58, barH = 5;
    var ruin = C.OVEN_RUINED_AT;

    ctx.globalAlpha = 0.35;
    var zone = function (from, to, colour) {
      ctx.fillStyle = colour;
      ctx.fillRect(barX + barW * from / ruin, barY, barW * (to - from) / ruin, barH);
    };
    zone(0, C.OVEN_COOKED_AT, '#d9d2c2');
    zone(C.OVEN_COOKED_AT, C.OVEN_BURNT_AT, '#f2a93a');
    zone(C.OVEN_BURNT_AT, ruin, '#8a7f78');
    ctx.globalAlpha = 1;

    var progress = Math.min(1, oven.timeIn / ruin);
    ctx.fillStyle = state === 'raw' ? '#d9d2c2'
                  : state === 'cooked' ? '#f2a93a'
                  : state === 'burnt' ? '#8a7f78' : '#e0483c';
    ctx.fillRect(barX, barY, barW * progress, barH);

    ctx.fillStyle = '#fff';
    ctx.fillRect(barX + barW * progress - 1, barY - 1, 2, barH + 2);
  };


  // The title, pause and game-over screens.
  Game.prototype.drawOverlay = function () {
    var ctx = this.ctx;

    ctx.fillStyle = 'rgba(42,35,32,0.72)';
    ctx.fillRect(0, 0, C.WIDTH, C.HEIGHT);
    ctx.textAlign = 'center';

    var self = this;
    // The last number given to fillText is the widest a line may be. A line
    // longer than that is squeezed to fit rather than running off the edge.
    var line = function (text, y, size, colour) {
      ctx.font = size + 'px ' + C.FONT;
      ctx.fillStyle = colour || '#fbf7ee';
      ctx.fillText(text, C.WIDTH / 2, y, C.WIDTH - 40);
    };

    if (this.mode === 'title') {
      line(C.TITLE, 220, 52, '#f2c230');
      line(C.TITLE_HINT, 262, 20);
      line(C.TITLE_CONTROLS, 292, 14, '#d9d2c2');
      line(C.TITLE_BATTERY, 314, 13, '#f2c230');
      line(C.TITLE_HELPERS, 338, 12, '#d9d2c2');
      line(C.TITLE_FLAT, 358, 12, '#d9d2c2');
      line(C.TITLE_MUTE, 384, 12, '#9a9086');
    }

    if (this.mode === 'paused') {
      line(C.PAUSED, 240, 36, '#f2c230');
      line(C.PAUSED_HINT, 272, 18);
    }

    if (this.mode === 'over') {
      // Two ways to lose, so the screen says which one it was.
      line(this.overReason === 'battery' ? C.GAME_OVER_FLAT : C.GAME_OVER, 200, 40, '#e0483c');
      line(this.coins + C.COINS_LABEL, 250, 32);
      line(C.BEST_LABEL + this.bestScore, 282, 18, '#d9d2c2');
      line(C.GAME_OVER_HINT, 330, 18, '#f2c230');
    }
  };


  // ==========================================================================
  //  STARTING EVERYTHING UP
  // ==========================================================================

  function start() {
    var canvas = document.getElementById('game');
    canvas.width = C.WIDTH * C.SHARPNESS;
    canvas.height = C.HEIGHT * C.SHARPNESS;

    loadImages();
    var game = new Game(canvas);

    // --- Keyboard -----------------------------------------------------------
    // Listened for on the whole window rather than just the canvas, so the
    // controls keep working no matter where you last clicked.
    window.addEventListener('keydown', function (e) {
      var key = e.key.toLowerCase();

      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].indexOf(key) !== -1) {
        e.preventDefault();
      }

      // Browsers refuse to make any noise until the person has touched the
      // page. This is the first moment we are allowed to switch the sound on.
      if (typeof SOUND !== 'undefined') SOUND.unlock();

      // M mutes. This has to come BEFORE the "any key starts the game" line
      // below, or muting from the title screen would also start the round.
      if (key === 'm') {
        if (typeof SOUND !== 'undefined') SOUND.toggleMute();
        return;
      }

      if (key === 'r' && game.mode === 'over') { game.reset(); return; }

      if (game.mode === 'title' || game.mode === 'paused') {
        game.mode = 'play';
        if (key === ' ') return;   // don't also use a station on the same press
      }

      if (key === ' ' && !e.repeat && game.mode === 'play') game.useStation();

      game.keysHeld[key] = true;
    });

    window.addEventListener('keyup', function (e) {
      game.keysHeld[e.key.toLowerCase()] = false;
    });

    // Click anywhere on the game to start or un-pause.
    canvas.addEventListener('mousedown', function () {
      if (typeof SOUND !== 'undefined') SOUND.unlock();
      if (game.mode === 'title' || game.mode === 'paused') game.mode = 'play';
    });

    // Alt-tabbing away pauses, so nobody comes back to a closed kitchen.
    window.addEventListener('blur', function () {
      game.keysHeld = {};
      if (game.mode === 'play') game.mode = 'paused';
    });

    // --- The loop -----------------------------------------------------------
    var lastTime = performance.now();

    function frame(now) {
      // Capped at 0.05 so that alt-tabbing away doesn't make the next frame
      // advance the game by several seconds all at once.
      var seconds = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      game.update(seconds);
      game.draw();

      // The background tune plays during a round and stops the rest of the
      // time. It also speeds up as the round goes on, using the same clock
      // that makes the customers arrive faster.
      if (typeof SOUND !== 'undefined') SOUND.setMode(game.mode, game.elapsed);

      requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
  }

  // Wait until the page is ready, then go.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }

})();
