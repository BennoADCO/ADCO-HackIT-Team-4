// ============================================================================
//  SPUD RUSH — THE NOISE
// ============================================================================
//
//  There are no sound files in this game. Not one. Every beep, thud and note
//  you hear is built by the browser the instant it is needed, out of nothing
//  but a tone generator and a volume knob.
//
//  That is deliberate: it means the game has nothing to download, works with
//  no internet, and still makes a racket on a locked-down laptop.
//
//  If you want to change how it SOUNDS, the numbers are in config.js under
//  "THE NOISE". If you want to change WHAT a thing sounds like, the recipes
//  are in the RECIPES section near the bottom of this file.
//
//  Nothing in here can break the game. If the browser refuses to make noise,
//  every one of these functions quietly does nothing and the game plays on
//  in silence.
//
// ============================================================================

var SOUND = (function () {
  'use strict';

  var C = CONFIG;

  var ctx = null;          // the browser's sound engine, once we're allowed one
  var master = null;       // the overall volume knob
  var broken = false;      // true if this browser won't play ball at all
  var muted = false;
  var lastPlayed = {};     // when each sound last played, to stop machine-gunning
  var noiseBuffer = null;  // a short burst of static, made once and reused


  // ==========================================================================
  //  TURNING IT ON
  // ==========================================================================
  //
  //  Browsers refuse to make any sound until the person has clicked or pressed
  //  a key. That is a rule we cannot argue with, so we don't even try to set
  //  up the sound engine until the first click arrives.
  //
  //  The game calls unlock() from its click and keypress handlers. Calling it
  //  a hundred times is harmless — it only does the work once.

  function unlock() {
    if (broken) return;

    try {
      if (!ctx) {
        var Engine = window.AudioContext || window.webkitAudioContext;
        if (!Engine) { broken = true; return; }

        ctx = new Engine();

        master = ctx.createGain();
        master.gain.value = C.MASTER_VOLUME;
        master.connect(ctx.destination);

        makeNoiseBuffer();
      }

      // Chrome starts the engine asleep. This wakes it up.
      if (ctx.state === 'suspended') ctx.resume();
    } catch (err) {
      // Some locked-down machines block audio entirely. Fine — play in silence.
      broken = true;
    }
  }

  // A third of a second of static, generated once. Used for thuds, digs,
  // clatters and hisses — anything that isn't a clean musical note.
  function makeNoiseBuffer() {
    var frames = Math.floor(ctx.sampleRate * 0.35);
    noiseBuffer = ctx.createBuffer(1, frames, ctx.sampleRate);
    var data = noiseBuffer.getChannelData(0);
    for (var i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;
  }

  function ready() {
    return !broken && ctx && !muted && C.SOUND_ON;
  }


  // ==========================================================================
  //  THE THREE BUILDING BLOCKS
  // ==========================================================================
  //
  //  Every sound in the game is made of these three things, on their own or
  //  stacked on top of each other.
  //
  //    blip()   a clean musical note
  //    sweep()  a note that slides from one pitch to another
  //    noise()  a burst of static
  //
  //  The arguments are all the same idea: when to start (seconds from now),
  //  how long to last, and how loud.

  // A clean note.
  //   shape: 'sine' (soft), 'triangle' (mellow), 'square' (chunky, arcade),
  //          'sawtooth' (harsh, buzzy)
  function blip(freq, start, length, shape, volume) {
    var t = ctx.currentTime + start;
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();

    osc.type = shape || 'square';
    osc.frequency.setValueAtTime(freq, t);

    // The volume envelope: snap up fast, then fade away. Without this, notes
    // click unpleasantly at each end.
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(volume, t + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + length);

    osc.connect(gain);
    gain.connect(master);
    osc.start(t);
    osc.stop(t + length + 0.02);
  }

  // A note that slides in pitch. Going down sounds sad or wet; going up
  // sounds hopeful or electrical.
  function sweep(fromFreq, toFreq, start, length, shape, volume) {
    var t = ctx.currentTime + start;
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();

    osc.type = shape || 'sine';
    osc.frequency.setValueAtTime(fromFreq, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, toFreq), t + length);

    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(volume, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + length);

    osc.connect(gain);
    gain.connect(master);
    osc.start(t);
    osc.stop(t + length + 0.02);
  }

  // A burst of static, with a filter to colour it.
  //   cutoff: low numbers (300) = a dull thud, high numbers (6000) = a hiss
  function noise(start, length, cutoff, volume, sweepTo) {
    var t = ctx.currentTime + start;
    var source = ctx.createBufferSource();
    var filter = ctx.createBiquadFilter();
    var gain = ctx.createGain();

    source.buffer = noiseBuffer;

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(cutoff, t);
    if (sweepTo) filter.frequency.exponentialRampToValueAtTime(Math.max(1, sweepTo), t + length);

    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + length);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start(t);
    source.stop(t + length + 0.02);
  }

  // A little run of notes, one after the other.
  function run(freqs, start, gap, length, shape, volume) {
    for (var i = 0; i < freqs.length; i++) {
      blip(freqs[i], start + i * gap, length, shape, volume);
    }
  }


  // ==========================================================================
  //  THE RECIPES — what each thing in the game sounds like
  // ==========================================================================
  //
  //  Each entry is a function that gets told how loud to be. To change how
  //  something sounds, change the numbers here. Bigger frequency numbers are
  //  higher pitched. Middle C is about 262.

  var RECIPES = {

    // --- Making a potato ----------------------------------------------------

    // Yanking one out of the soil: a dull, earthy thump.
    dig: function (v) {
      noise(0, 0.18, 700, 0.5 * v, 180);
      blip(110, 0, 0.1, 'sine', 0.22 * v);
    },

    // Dunking it in paint: a wet downward gloop.
    dunk: function (v) {
      sweep(620, 190, 0, 0.22, 'sine', 0.3 * v);
      noise(0.02, 0.14, 1400, 0.16 * v, 500);
    },

    // --- The oven -----------------------------------------------------------

    ovenIn: function (v) {
      blip(150, 0, 0.09, 'square', 0.25 * v);
      noise(0, 0.1, 500, 0.2 * v);
    },

    ovenOut: function (v) {
      sweep(260, 480, 0, 0.1, 'square', 0.22 * v);
    },

    // THE IMPORTANT ONE. A clean two-note chime the moment a potato hits
    // perfect, so you can cook by ear from the other side of the kitchen.
    ovenReady: function (v) {
      blip(1046, 0, 0.14, 'triangle', 0.3 * v);
      blip(1568, 0.09, 0.22, 'triangle', 0.26 * v);
    },

    // It has tipped over into burnt. Not always bad — someone may have
    // ordered it that way — so this is a nudge, not an alarm.
    ovenBurnt: function (v) {
      blip(300, 0, 0.1, 'sawtooth', 0.16 * v);
      blip(220, 0.08, 0.16, 'sawtooth', 0.16 * v);
    },

    // Left in far too long. Now it is genuinely ruined.
    ovenRuined: function (v) {
      noise(0, 0.5, 4000, 0.22 * v, 300);
      sweep(200, 70, 0, 0.45, 'sawtooth', 0.14 * v);
    },

    // --- Carrying things around ---------------------------------------------

    bin: function (v) {
      noise(0, 0.28, 2600, 0.34 * v, 400);
      sweep(380, 120, 0, 0.24, 'square', 0.14 * v);
    },

    drop: function (v) {
      noise(0, 0.1, 420, 0.24 * v);
    },

    pickup: function (v) {
      blip(560, 0, 0.06, 'square', 0.18 * v);
    },

    // --- Customers ----------------------------------------------------------

    // A polite robot clearing its throat at the hatch.
    arrive: function (v) {
      blip(523, 0, 0.09, 'square', 0.2 * v);
      blip(784, 0.1, 0.12, 'square', 0.2 * v);
    },

    // You got it right. A bright major arpeggio — the best sound in the game,
    // and the one the room will be chasing.
    serveGood: function (v) {
      run([523, 659, 784], 0, 0.07, 0.18, 'triangle', 0.3 * v);
      blip(1046, 0.21, 0.3, 'triangle', 0.26 * v);
    },

    // Wrong potato. Two flat notes downward — unmistakably a mistake.
    serveBad: function (v) {
      blip(233, 0, 0.16, 'sawtooth', 0.26 * v);
      blip(220, 0.01, 0.16, 'sawtooth', 0.2 * v);   // slightly out of tune on purpose
      blip(175, 0.15, 0.3, 'sawtooth', 0.24 * v);
    },

    // Coins landing, played over the top of serveGood.
    coins: function (v) {
      blip(1318, 0.26, 0.07, 'square', 0.16 * v);
      blip(1760, 0.33, 0.12, 'square', 0.16 * v);
    },

    // A customer has given up and stormed off.
    strike: function (v) {
      sweep(180, 60, 0, 0.5, 'sawtooth', 0.3 * v);
      noise(0, 0.3, 900, 0.2 * v, 200);
    },

    // --- The battery --------------------------------------------------------

    // Repeats once a second while the battery is nearly flat. Kept soft and
    // high so it nags without drowning everything else out.
    batteryLow: function (v) {
      blip(1200, 0, 0.07, 'square', 0.16 * v);
      blip(1200, 0.12, 0.07, 'square', 0.12 * v);
    },

    // While standing on the pad. Pitch climbs as the battery fills.
    charge: function (v, pitch) {
      blip(600 + (pitch || 0) * 900, 0, 0.05, 'triangle', 0.1 * v);
    },

    // --- The parts table ----------------------------------------------------

    // A new helper robot assembling itself.
    build: function (v) {
      run([262, 330, 392, 523], 0, 0.08, 0.16, 'square', 0.26 * v);
      sweep(400, 1600, 0.3, 0.25, 'sawtooth', 0.18 * v);
      noise(0.3, 0.2, 3000, 0.16 * v, 800);
    },

    // You cannot afford one.
    nope: function (v) {
      blip(150, 0, 0.13, 'square', 0.24 * v);
      blip(140, 0.13, 0.18, 'square', 0.2 * v);
    },

    // --- Starting and stopping ----------------------------------------------

    newRound: function (v) {
      run([392, 523, 659], 0, 0.08, 0.14, 'triangle', 0.24 * v);
    },

    // Three strikes.
    gameOver: function (v) {
      run([523, 440, 349, 262], 0, 0.17, 0.3, 'triangle', 0.3 * v);
    },

    // Ran the battery flat. Lower and slower — a robot winding down.
    powerDown: function (v) {
      sweep(440, 40, 0, 1.1, 'sawtooth', 0.3 * v);
      sweep(660, 60, 0.05, 1.0, 'triangle', 0.16 * v);
    }
  };


  // ==========================================================================
  //  PLAYING A SOUND
  // ==========================================================================

  // Make a noise. 'name' is one of the recipes above.
  // options.gain makes it quieter (helper robots use this so five robots
  // working at once doesn't turn into soup).
  function play(name, options) {
    if (!ready()) return;

    var recipe = RECIPES[name];
    if (!recipe) return;          // unknown name: do nothing rather than crash

    // Don't let the same sound retrigger instantly — that is what turns four
    // busy helper robots into a machine gun.
    //
    // Note the "!== undefined". The clock starts at zero, and zero counts as
    // "nothing" in JavaScript, so checking the plain value here would skip the
    // throttle for the first sound of each kind in the opening seconds.
    var now = ctx.currentTime;
    var last = lastPlayed[name];
    if (last !== undefined && now - last < C.SOUND_THROTTLE) return;
    lastPlayed[name] = now;

    var volume = C.SFX_VOLUME * ((options && options.gain) || 1);

    try {
      recipe(volume, options && options.pitch);
    } catch (err) {
      // One duff sound must never take the game down with it.
    }
  }


  // ==========================================================================
  //  THE BACKGROUND TUNE
  // ==========================================================================
  //
  //  A short loop of a bass line and a melody. Both use a pentatonic scale,
  //  which is the trick that makes it impossible for the notes to clash.
  //
  //  The timing is the fiddly part. We cannot just play a note every beat
  //  using a normal timer — those drift, and within half a minute the tune
  //  would audibly stagger. Instead a timer wakes up every 25 thousandths of
  //  a second, looks a little way into the future, and books in any notes due
  //  to play during that window. The sound engine then plays them at exactly
  //  the right moment.

  var BASS =   [110, 110, 165, 110, 147, 147, 110, 110];
  var MELODY = [440, 550, 660, 550, 494, 587, 440, 330,
                440, 660, 550, 440, 392, 494, 587, 440];

  var musicOn = false;
  var nextNoteTime = 0;
  var step = 0;
  var timer = null;
  var tempoScale = 0;      // 0 at the start of a round, 1 when it's frantic

  function beatLength() {
    var bpm = C.MUSIC_BPM_START + (C.MUSIC_BPM_MAX - C.MUSIC_BPM_START) * tempoScale;
    return 60 / bpm / 2;   // we play two notes per beat
  }

  function scheduleStep(time) {
    var v = C.MUSIC_VOLUME;

    // Bass on every step.
    var bass = BASS[step % BASS.length];
    blipAt(bass, time, beatLength() * 0.9, 'square', v * 0.32);

    // Melody on every other step, so it doesn't fight the bass.
    if (step % 2 === 0) {
      var note = MELODY[Math.floor(step / 2) % MELODY.length];
      blipAt(note, time, beatLength() * 1.4, 'triangle', v * 0.2);
    }

    step++;
  }

  // Same as blip(), but booked for an exact moment rather than "seconds
  // from now". The tune needs this precision; one-off effects don't.
  function blipAt(freq, t, length, shape, volume) {
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.type = shape;
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(volume, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + length);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t);
    osc.stop(t + length + 0.02);
  }

  function tick() {
    if (!ready() || !musicOn) return;

    // Book every note falling in the next tenth of a second.
    while (nextNoteTime < ctx.currentTime + 0.1) {
      scheduleStep(nextNoteTime);
      nextNoteTime += beatLength();
    }
  }

  function startMusic() {
    if (!ready() || musicOn) return;
    musicOn = true;
    step = 0;
    nextNoteTime = ctx.currentTime + 0.05;
    if (!timer) timer = setInterval(tick, 25);
  }

  function stopMusic() {
    musicOn = false;
  }

  // The game calls this every frame with 'title', 'play', 'paused' or 'over'.
  // The tune plays during a round and stops the rest of the time.
  function setMode(mode, elapsed) {
    if (broken || !ctx) return;

    if (typeof elapsed === 'number') {
      tempoScale = Math.max(0, Math.min(1, elapsed / C.MUSIC_RAMP_SECONDS));
    }

    if (mode === 'play' && C.SOUND_ON && !muted) startMusic();
    else stopMusic();
  }


  // ==========================================================================
  //  MUTE
  // ==========================================================================

  function loadMuted() {
    try { return localStorage.getItem('spudrush.muted') === 'yes'; }
    catch (err) { return false; }
  }

  function saveMuted(value) {
    try { localStorage.setItem('spudrush.muted', value ? 'yes' : 'no'); }
    catch (err) { /* blocked — it just won't be remembered next time */ }
  }

  muted = loadMuted();

  function toggleMute() {
    muted = !muted;
    saveMuted(muted);
    if (muted) stopMusic();
    return muted;
  }

  function isMuted() {
    return muted;
  }


  // What the rest of the game is allowed to call.
  return {
    unlock: unlock,
    play: play,
    setMode: setMode,
    toggleMute: toggleMute,
    isMuted: isMuted
  };

})();
