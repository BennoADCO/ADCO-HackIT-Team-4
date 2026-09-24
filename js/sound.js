// ============================================================================
//  SPUD RUSH: KITCHEN WARS — THE NOISE
// ============================================================================
//
//  There are no sound files in this game. Not one. Every ding, buzz, splat
//  and fanfare you hear is built by the browser the instant it is needed,
//  out of nothing but a tone generator (an "oscillator") and a volume knob
//  ("gain"). That is the Web Audio API — it ships in every browser, so
//  nothing needs to be downloaded and it still works on a laptop with no
//  internet connection.
//
//  HOW TO PLAY A SOUND FROM game.js:
//      SOUND.play('serve');
//    That's it. If you type a name that doesn't exist below, nothing
//    happens — it will not crash the game.
//
//  HOW TO ADD A NEW SOUND:
//    1. Pick a short, clear name (e.g. 'confetti').
//    2. Add an entry to the RECIPES object further down, built out of the
//       three helpers explained just above it: tone(), slide() and noise().
//    3. Call SOUND.play('confetti') from game.js whenever it should happen.
//
//  HOW TO TWEAK AN EXISTING SOUND:
//    Find its section in RECIPES (they're in the same order as the list in
//    the game plan, each with a one-line comment describing how it should
//    sound). Change the numbers. Bigger frequency numbers = higher pitched.
//    Longer duration numbers = the note rings out for longer. Play with it —
//    you cannot break anything else by changing a number in here.
//
//  Nothing in this file can crash the game. Every single thing it does is
//  wrapped in a safety net (a "try/catch") — if the browser refuses to make
//  sound for any reason, every function below just quietly does nothing.
//
// ============================================================================

var SOUND = (function () {
  'use strict';

  // -- The sound engine, switched on the first time it's needed -------------

  var ctx = null;           // the browser's sound engine (an AudioContext)
  var broken = false;       // true if this browser won't make sound at all
  var noiseBuffer = null;   // a short recording of static, made once and reused


  // ==========================================================================
  //  TURNING IT ON
  // ==========================================================================
  //
  //  Browsers refuse to make any sound until the player has pressed a key or
  //  clicked. That is a browser rule we cannot get around, so we do not even
  //  try to build the sound engine until that first keypress arrives.
  //
  //  The game calls SOUND.unlock() from its very first keydown handler.
  //  Calling it many times is completely safe — it only sets things up once.

  function ensureContext() {
    if (broken) return null;

    try {
      if (!ctx) {
        var Engine = window.AudioContext || window.webkitAudioContext;
        if (!Engine) {
          broken = true;
          return null;
        }
        ctx = new Engine();
      }

      // Some browsers (Chrome especially) start the engine asleep until a
      // real user action wakes it up. This nudges it awake.
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      if (!noiseBuffer) {
        makeNoiseBuffer();
      }

      return ctx;
    } catch (err) {
      // A locked-down machine can block audio entirely. That's fine — the
      // game just plays in silence from here on.
      broken = true;
      return null;
    }
  }

  function unlock() {
    try {
      ensureContext();
    } catch (err) {
      // never let sound setup take the game down
    }
  }

  // A third of a second of pure static (random noise), generated once and
  // reused for every splat, buzz, whoosh and scurry. Making one recording
  // and reusing it is much cheaper than making a fresh one every time.
  function makeNoiseBuffer() {
    try {
      var frames = Math.floor(ctx.sampleRate * 0.3);
      noiseBuffer = ctx.createBuffer(1, frames, ctx.sampleRate);
      var data = noiseBuffer.getChannelData(0);
      for (var i = 0; i < frames; i++) {
        data[i] = Math.random() * 2 - 1;
      }
    } catch (err) {
      noiseBuffer = null;
    }
  }

  // How loud everything should be, out of 1.0. Read fresh every time a
  // sound plays (not stored once at the top of the file) so that if
  // config.js changes the number, or someone edits it mid-game, the very
  // next sound picks it up immediately.
  function masterVolume() {
    try {
      if (typeof CONFIG !== 'undefined' && CONFIG.SOUND_VOLUME != null) {
        return CONFIG.SOUND_VOLUME;
      }
    } catch (err) {
      // fall through to the default below
    }
    return 0.4;
  }


  // ==========================================================================
  //  THE THREE BUILDING BLOCKS
  // ==========================================================================
  //
  //  Every sound effect in this game is built out of these three things,
  //  used on their own or layered on top of each other.
  //
  //    tone()   a single clean musical note
  //    slide()  a note that glides from one pitch to another
  //    noise()  a burst of static, filtered to sound dull or hissy
  //
  //  All three take "start" (seconds from right now) and "duration" (how
  //  long the sound lasts, in seconds).

  // A single note.
  //   type: 'sine' (soft/round), 'triangle' (mellow), 'square' (chunky,
  //         arcade-ish), 'sawtooth' (harsh, buzzy)
  function tone(freq, start, duration, type, volume) {
    if (!ctx) return;
    var t = ctx.currentTime + start;
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();

    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t);

    // The volume envelope: rise quickly, then fade away smoothly. Without
    // this, notes "click" unpleasantly the moment they start or stop.
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(volume, t + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + duration + 0.03);
  }

  // A note that glides in pitch from one frequency to another. Sliding down
  // tends to sound sad, wet or deflating. Sliding up tends to sound
  // hopeful, alarming or electric, depending on the waveform.
  function slide(fromFreq, toFreq, start, duration, type, volume) {
    if (!ctx) return;
    var t = ctx.currentTime + start;
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();

    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(fromFreq, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, toFreq), t + duration);

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(volume, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + duration + 0.03);
  }

  // A burst of static, run through a filter to colour it.
  //   cutoff: low numbers (around 300) sound like a dull thud or splat,
  //           high numbers (around 5000) sound like a hiss or sizzle
  //   sweepTo: optional — if set, the filter slides from "cutoff" to this
  //            value over the sound's duration (a splat trailing off, etc.)
  function noise(start, duration, cutoff, volume, sweepTo) {
    if (!ctx || !noiseBuffer) return;
    var t = ctx.currentTime + start;
    var source = ctx.createBufferSource();
    var filter = ctx.createBiquadFilter();
    var gain = ctx.createGain();

    source.buffer = noiseBuffer;

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(cutoff, t);
    if (sweepTo) {
      filter.frequency.exponentialRampToValueAtTime(Math.max(1, sweepTo), t + duration);
    }

    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start(t);
    source.stop(t + duration + 0.03);
  }

  // A quick run of notes, one after another. Handy for jingles and fanfares.
  function run(freqs, start, gap, duration, type, volume) {
    for (var i = 0; i < freqs.length; i++) {
      tone(freqs[i], start + i * gap, duration, type, volume);
    }
  }


  // ==========================================================================
  //  THE RECIPES — what each effect actually sounds like
  // ==========================================================================
  //
  //  Each recipe is a function that gets told how loud ("v", short for
  //  volume) it is allowed to be, from 0 up to 1. To change how something
  //  sounds, change the numbers in its section below. Bigger frequency
  //  numbers are higher pitched — middle C is about 262.

  var RECIPES = {

    // --- Round start ----------------------------------------------------

    // A quick, upbeat four-note climb. Plays once when a round begins.
    start: function (v) {
      run([392, 523, 659, 784], 0, 0.09, 0.16, 'triangle', 0.3 * v);
    },

    // --- Everyday kitchen actions -----------------------------------------

    // Picking up an ingredient: a tiny, soft blip. This fires constantly
    // while people play, so it is kept deliberately quiet and short —
    // it should be felt more than heard.
    pickup: function (v) {
      tone(880, 0, 0.05, 'sine', 0.12 * v);
    },

    // Food going into the oven: a soft whoosh followed by a thunk.
    ovenLoad: function (v) {
      noise(0, 0.12, 900, 0.24 * v, 200);
      tone(140, 0.04, 0.08, 'square', 0.2 * v);
    },

    // The oven timer going off: a clean two-tone "ding-ding", the same
    // note played twice, like a kitchen timer.
    ovenDone: function (v) {
      tone(1568, 0, 0.12, 'triangle', 0.3 * v);
      tone(1568, 0.16, 0.14, 'triangle', 0.3 * v);
    },

    // Grabbing the plate to carry a dish: a small, bright pop.
    plateUp: function (v) {
      tone(1200, 0, 0.03, 'sine', 0.1 * v);
      tone(1600, 0.02, 0.06, 'sine', 0.22 * v);
    },

    // Throwing something in the bin: a low descending "bloop" with a
    // wet little splat underneath it.
    bin: function (v) {
      slide(500, 120, 0, 0.22, 'sine', 0.28 * v);
      noise(0.05, 0.15, 800, 0.18 * v, 150);
    },

    // --- Serving customers ------------------------------------------------

    // Right dish, on time: a satisfying cash-register "ka-ching". This is
    // the best sound in the game and should feel like it.
    serve: function (v) {
      run([1046, 1568], 0, 0.06, 0.14, 'square', 0.3 * v);
      tone(2093, 0.1, 0.28, 'triangle', 0.26 * v);
    },

    // Right dish, but late: the same idea as serve(), just lower pitched,
    // quieter and without the sparkle on top — a weaker, flatter payoff.
    serveLate: function (v) {
      run([784, 1046], 0, 0.09, 0.16, 'square', 0.16 * v);
      tone(1318, 0.14, 0.18, 'triangle', 0.1 * v);
    },

    // Wrong dish: a sad, descending buzzer — a "wah wah" that leaves no
    // doubt a mistake was just made.
    wrong: function (v) {
      slide(300, 90, 0, 0.28, 'sawtooth', 0.26 * v);
      slide(220, 70, 0.22, 0.3, 'sawtooth', 0.18 * v);
    },

    // --- The sabotage shop --------------------------------------------------

    // Buying a sabotage: a sneaky, low two-note "heh heh" for the player
    // who just bought trouble for their rival.
    buy: function (v) {
      tone(180, 0, 0.08, 'sawtooth', 0.2 * v);
      tone(150, 0.11, 0.1, 'sawtooth', 0.2 * v);
    },

    // Trying to buy something you can't afford: a short, dull "bonk".
    dud: function (v) {
      tone(140, 0, 0.09, 'square', 0.2 * v);
      noise(0, 0.07, 400, 0.12 * v);
    },

    // --- Getting sabotaged (played for the victim, so they know exactly
    //     what just happened to them) ---------------------------------------

    // A generic hit: a nasty, harsh double buzz — an alarm going off in
    // your kitchen.
    sabotage: function (v) {
      tone(160, 0, 0.15, 'sawtooth', 0.3 * v);
      tone(160, 0.18, 0.15, 'sawtooth', 0.3 * v);
      noise(0, 0.3, 2500, 0.18 * v, 600);
    },

    // Frozen oven: an icy, high shimmer that tumbles downward, like
    // sparkling ice crystals falling.
    freeze: function (v) {
      run([2093, 1864, 1568, 1318], 0, 0.07, 0.2, 'sine', 0.22 * v);
    },

    // Controls reversed: a classic slide-whistle "wheeoo" — down, then
    // straight back up.
    slip: function (v) {
      slide(700, 200, 0, 0.18, 'sine', 0.26 * v);
      slide(200, 700, 0.18, 0.18, 'sine', 0.22 * v);
    },

    // Rats let loose: a rapid burst of tiny, squeaky, randomised chitters.
    rat: function (v) {
      var i;
      for (i = 0; i < 6; i++) {
        tone(1500 + Math.random() * 900, i * 0.05, 0.04, 'square', 0.14 * v);
      }
    },

    // A Karen sent to complain: one long, rising, indignant wail — the
    // only long sound in the game, about a second and a half of pure
    // outrage sliding upward.
    karen: function (v) {
      slide(380, 850, 0, 0.7, 'sawtooth', 0.22 * v);
      slide(400, 880, 0.12, 0.7, 'square', 0.14 * v);
      slide(850, 1050, 0.7, 0.6, 'sawtooth', 0.18 * v);
    },

    // --- Kitchen fires -------------------------------------------------------

    // An explosion: a deep thump that drops away, with a roar of static
    // over the top that rumbles down into the low end.
    boom: function (v) {
      slide(160, 35, 0, 0.5, 'sine', 0.5 * v);
      noise(0, 0.7, 3000, 0.45 * v, 120);
    },

    // The extinguisher: a long, bright "pssssh" of spray.
    extinguish: function (v) {
      noise(0, 0.5, 6000, 0.3 * v, 2500);
      tone(1318, 0.35, 0.12, 'triangle', 0.18 * v);
    },

    // --- Round end ----------------------------------------------------------

    // Winning the round: a triumphant fanfare — a quick climbing run of
    // notes, finishing on a big held chord.
    win: function (v) {
      run([523, 659, 784, 1046], 0, 0.12, 0.22, 'triangle', 0.3 * v);
      tone(1568, 0.5, 1.0, 'triangle', 0.28 * v);
      tone(1046, 0.5, 1.0, 'square', 0.16 * v);
    }
  };


  // ==========================================================================
  //  PLAYING A SOUND
  // ==========================================================================

  // Make a noise. 'name' must match one of the recipe names above exactly.
  // An unrecognised name is ignored — this deliberately never throws an
  // error, so a typo in game.js can never crash the game.
  function play(name) {
    try {
      if (api.muted) return;

      var recipe = RECIPES[name];
      if (!recipe) return;

      var context = ensureContext();
      if (!context) return;

      var volume = masterVolume();
      recipe(volume);
    } catch (err) {
      // One duff sound must never take the game down with it.
    }
  }


  // ==========================================================================
  //  MUTE
  // ==========================================================================
  //
  //  Flips sound off and on. The flag lives on SOUND.muted so the game can
  //  check it directly (e.g. to show a speaker icon), and toggleMute() is
  //  how the game flips it.

  function toggleMute() {
    try {
      api.muted = !api.muted;
    } catch (err) {
      // if this somehow fails, sound simply keeps working as before
    }
    return api.muted;
  }


  // What the rest of the game is allowed to call.
  var api = {
    play: play,
    unlock: unlock,
    toggleMute: toggleMute,
    muted: false
  };

  return api;

})();
