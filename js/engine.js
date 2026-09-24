// ============================================================================
//  SPUD RUSH: KITCHEN WARS — ENGINE
// ============================================================================
//
//  The machinery under the bonnet. You should rarely need to open this file.
//
//  It does four jobs:
//    1. Sets up the drawing surface (the "canvas" — a rectangle we paint on).
//    2. Runs the GAME LOOP: about 60 times a second it asks game.js to
//       "update" (move things along a little) and then "draw" (paint the
//       picture again from scratch). That is how all video games animate.
//    3. Keeps track of which keys are held down.
//    4. Provides small drawing helpers (emoji, rounded boxes, bars, text)
//       and the sfx() helper for sound.
//
//  Nothing here knows the rules of the game — those are all in game.js.
// ============================================================================


// ----------------------------------------------------------------------------
//  1. THE CANVAS
// ----------------------------------------------------------------------------
//  The game always thinks it is 900 x 600. We actually paint at double that
//  (RENDER_SCALE) so emoji look sharp, and CSS shrinks it to fit the window.

var canvas = document.getElementById('game');
canvas.width = CONFIG.WIDTH * CONFIG.RENDER_SCALE;
canvas.height = CONFIG.HEIGHT * CONFIG.RENDER_SCALE;
var ctx = canvas.getContext('2d');   // "ctx" is the paintbrush we draw with


// ----------------------------------------------------------------------------
//  2. SOUND HELPERS
// ----------------------------------------------------------------------------
//  The actual sounds live in sound.js. These helpers make sure the game keeps
//  working even if sound.js is missing or the laptop blocks audio.

var soundUnlocked = false;

// Play a named sound effect, e.g. sfx('serve'). Silently does nothing if
// sound isn't available.
function sfx(name) {
  if (typeof SOUND !== 'undefined') {
    try { SOUND.play(name); } catch (e) {}
  }
}

// Browsers won't make noise until the player has pressed something. This is
// called on the first key press to switch sound on.
function unlockSound() {
  if (soundUnlocked) {
    return;
  }
  if (typeof SOUND !== 'undefined') {
    try {
      SOUND.unlock();
      soundUnlocked = true;
    } catch (e) {}
  }
}

// Turn sound on/off. Returns true if now muted, false if now unmuted,
// or null if there's no sound at all.
var soundMuted = false;
function toggleMute() {
  if (typeof SOUND === 'undefined') {
    return null;
  }
  try {
    var result = SOUND.toggleMute();
    if (typeof result === 'boolean') {
      soundMuted = result;
    } else {
      soundMuted = !soundMuted;
    }
  } catch (e) {
    return null;
  }
  return soundMuted;
}


// ----------------------------------------------------------------------------
//  3. KEYBOARD
// ----------------------------------------------------------------------------
//  "keysDown" remembers every key currently held, by its code name
//  (KeyW, ArrowUp, Digit1...). game.js asks isKeyDown() each frame for
//  movement. Single presses (sabotage, restart) are passed to game.js
//  through the "onKeyPressed" function it gives us in startLoop().

var keysDown = {};
var keyPressedHandler = null;

// Keys the browser would normally use to scroll the page or do other things.
// We stop the browser doing that, so the page never jumps about mid-game.
function shouldBlockKey(code) {
  if (code.indexOf('Arrow') === 0) return true;
  if (code.indexOf('Digit') === 0) return true;
  if (code.indexOf('Numpad') === 0) return true;
  if (code === 'Space') return true;
  return false;
}

window.addEventListener('keydown', function (e) {
  unlockSound();

  if (!e.ctrlKey && !e.metaKey && !e.altKey && shouldBlockKey(e.code)) {
    e.preventDefault();
  }

  keysDown[e.code] = true;

  // Holding a key down makes the browser repeat it. We only want the first
  // press for things like buying sabotage, so repeats are ignored here.
  if (!e.repeat && keyPressedHandler !== null) {
    keyPressedHandler(e.code);
  }
});

window.addEventListener('keyup', function (e) {
  keysDown[e.code] = false;
});

// If the window loses focus (someone alt-tabs), forget every held key, or
// a chef would keep running forever.
window.addEventListener('blur', function () {
  keysDown = {};
});

// A mouse click also counts as "the player did something", for sound.
window.addEventListener('pointerdown', function () {
  unlockSound();
});

// Is ANY of these keys held down right now? (codes is a list like ['KeyW'])
function isKeyDown(codes) {
  if (!codes) return false;
  for (var i = 0; i < codes.length; i++) {
    if (keysDown[codes[i]] === true) {
      return true;
    }
  }
  return false;
}

// Is this key code one of the codes in the list?
function isOneOf(code, codes) {
  if (!codes) return false;
  for (var i = 0; i < codes.length; i++) {
    if (codes[i] === code) {
      return true;
    }
  }
  return false;
}

// Turn a key code into something short to print: 'Digit7' -> '7', 'KeyW' -> 'W'.
function keyLabel(code) {
  if (!code) return '?';
  if (code.indexOf('Digit') === 0) return code.substring(5);
  if (code.indexOf('Numpad') === 0) return code.substring(6);
  if (code.indexOf('Key') === 0) return code.substring(3);
  return code;
}


// ----------------------------------------------------------------------------
//  4. THE GAME LOOP
// ----------------------------------------------------------------------------
//  game.js calls startLoop() once, handing over its three functions:
//    updateFn(dt)   — move the game on by dt seconds
//    drawFn(ctx)    — paint the whole picture
//    keyFn(code)    — a key was just pressed
//
//  "dt" (short for "delta time") is how many seconds passed since the last
//  frame — usually about 0.016. Every speed is multiplied by dt, so the game
//  runs at the same pace on a fast laptop and a slow one.

function startLoop(updateFn, drawFn, keyFn) {
  keyPressedHandler = keyFn;
  var lastTime = null;

  function frame(now) {
    // Book the next frame first, so one error doesn't freeze the whole game.
    requestAnimationFrame(frame);

    var dt = 0;
    if (lastTime !== null) {
      dt = (now - lastTime) / 1000;
    }
    lastTime = now;
    if (dt < 0) dt = 0;
    if (dt > CONFIG.MAX_DT) dt = CONFIG.MAX_DT;

    updateFn(dt);

    // Reset the paintbrush to "game pixels" before every drawing pass.
    ctx.setTransform(CONFIG.RENDER_SCALE, 0, 0, CONFIG.RENDER_SCALE, 0, 0);
    ctx.globalAlpha = 1;
    drawFn(ctx);
  }

  requestAnimationFrame(frame);
}


// ----------------------------------------------------------------------------
//  5. DRAWING HELPERS
// ----------------------------------------------------------------------------

// Draw an emoji centred on (x, y). size is roughly its height in pixels.
function drawEmoji(context, emoji, x, y, size) {
  context.font = size + 'px ' + CONFIG.FONT_EMOJI;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillStyle = '#000000';
  context.fillText(emoji, x, y);
}

// Draw text. align is 'left', 'center' or 'right'. bold is true/false.
// outlineColor (optional) draws a dark edge round the letters so they read
// on any background.
function drawText(context, text, x, y, size, color, align, bold, outlineColor) {
  var weight = '';
  if (bold) weight = 'bold ';
  context.font = weight + size + 'px ' + CONFIG.FONT_TEXT;
  context.textAlign = align || 'left';
  context.textBaseline = 'middle';
  if (outlineColor) {
    context.lineJoin = 'round';
    context.lineWidth = Math.max(2, size / 5);
    context.strokeStyle = outlineColor;
    context.strokeText(text, x, y);
  }
  context.fillStyle = color;
  context.fillText(text, x, y);
}

// Draw a box with rounded corners. (x, y) is the TOP-LEFT corner.
// fill and stroke are colours; pass null to skip either.
function drawRoundRect(context, x, y, w, h, radius, fill, stroke, lineWidth) {
  var r = Math.min(radius, w / 2, h / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.lineTo(x + w - r, y);
  context.arcTo(x + w, y, x + w, y + r, r);
  context.lineTo(x + w, y + h - r);
  context.arcTo(x + w, y + h, x + w - r, y + h, r);
  context.lineTo(x + r, y + h);
  context.arcTo(x, y + h, x, y + h - r, r);
  context.lineTo(x, y + r);
  context.arcTo(x, y, x + r, y, r);
  context.closePath();
  if (fill) {
    context.fillStyle = fill;
    context.fill();
  }
  if (stroke) {
    context.lineWidth = lineWidth || 2;
    context.strokeStyle = stroke;
    context.stroke();
  }
}

// Draw a progress bar. fraction is 0 (empty) to 1 (full).
function drawBar(context, x, y, w, h, fraction, fillColor, backColor) {
  if (fraction < 0) fraction = 0;
  if (fraction > 1) fraction = 1;
  drawRoundRect(context, x, y, w, h, h / 2, backColor, null);
  if (fraction > 0) {
    drawRoundRect(context, x, y, Math.max(h, w * fraction), h, h / 2, fillColor, null);
  }
}


// ----------------------------------------------------------------------------
//  6. SMALL MATHS HELPERS
// ----------------------------------------------------------------------------

// Keep a number between a smallest and a largest value.
function clamp(value, min, max) {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

// Pick one thing at random from a list.
function randomItem(list) {
  return list[Math.floor(Math.random() * list.length)];
}

// Do two boxes overlap? Each box is given by its CENTRE (x, y) and its
// width and height. This is how we decide "the chef is touching a station".
function boxesOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
  return Math.abs(ax - bx) < (aw + bw) / 2 &&
         Math.abs(ay - by) < (ah + bh) / 2;
}
