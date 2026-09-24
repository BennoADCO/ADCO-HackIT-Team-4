# Feature: Aggressive 8-Bit Arcade Music

**Status:** Built for the old co-op game, but not yet added to Kitchen Wars. The code is saved in Git's stash ("shady character + 8-bit music (old game)").
**Files touched:** `js/sound.js`, `js/config.js`

## What it is

The old gentle background loop (a bass line plus a soft melody) is
replaced with a fast, driving chiptune: the kind of track a 1980s
games console would play. It's made entirely in code with the browser's
built-in sound engine, with no music files.

## What's in the track

Four instruments, the same line-up an old console had:

- **Bass**: a galloping low line (low-low-HIGH-low) that drives it along.
- **Lead**: the main tune, using a bright, nasal "pulse" sound that's
  typical of old console chips.
- **Arpeggio**: a very fast ripple through each chord, the classic
  chiptune trick for faking a chord with one voice.
- **Drums**: kick, snare and hi-hat, made from bursts of static and a
  falling tone.

The song is 4 bars long and loops, with the chords A minor, F, G and E.
The last bar has a snare roll to announce the loop starting again.
Every second time round, the lead jumps up an octave so it doesn't get
stale.

## Faster tempo

The music still speeds up as the round gets harder, but it now starts
much faster.

| Setting (in `js/config.js`) | Old | New |
|---|---|---|
| `MUSIC_BPM_START`: speed at the start of a round | 100 | 150 |
| `MUSIC_BPM_MAX`: speed when it's frantic | 140 | 190 |

"BPM" means beats per minute: bigger is faster. Around 150 feels like
an arcade game; 190 is sheer panic.

## How to rewrite the tune

Open `js/sound.js` and find the section **THE BACKGROUND TUNE**. The
tune is written as plain lists you can edit:

- `CHORDS`: the chord for each of the 4 bars.
- `BASS_ROOTS`: the lowest bass note for each bar.
- `LEAD`: the melody. Notes are a letter plus an octave number (`'A4'`,
  `'C5'`, `'G#4'`), and `'.'` means rest. **Keep each bar exactly 16
  entries long.**
- `DRUMS` / `DRUMS_FILL`: `K` = kick, `S` = snare, `h` = hi-hat,
  `.` = nothing. 16 characters each.

## Things to check

- Is the music too loud or too busy under the sound effects? If so,
  turn down `MUSIC_VOLUME` in `js/config.js` (currently 0.35).
- At 190 BPM it may feel too frantic by the end of a long round. Try
  170 for `MUSIC_BPM_MAX` if so.
