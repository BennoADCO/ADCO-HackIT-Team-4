// SPUD RUSH — <spud-rush> web component. Logical canvas is always 500x500.
(function () {
  if (customElements.get('spud-rush')) return;
  const INK = '#2a2320';
  const SIZES = ['large', 'xlarge', 'poggolithic'];
  const COLOURS = ['natural', 'red', 'blue', 'green', 'yellow'];
  const OVERLAY_SCALE = { large: 1, xlarge: 1.3, poggolithic: 1.6 };
  const DEFAULTS = { ovenCook: 3, ovenBurn: 8, ovenRuin: 13, spawnInterval: 7, patience: 30, showZones: false, assetsBase: 'assets/' };
  const WALK = { x1: 110, x2: 390, y1: 168, y2: 398 };
  const REACH = 38;
  const FILES = ['kitchen_background', 'chef_robot', 'customer_1', 'customer_2', 'customer_3', 'customer_4', 'customer_5',
    'bed_large', 'bed_xlarge', 'bed_poggolithic', 'jar_red', 'jar_blue', 'jar_green', 'jar_yellow', 'oven', 'bin',
    'overlay_cooked', 'overlay_burnt', 'potato_ruined', 'speech_bubble', 'icon_coin', 'icon_heart'];
  SIZES.forEach(s => COLOURS.forEach(c => FILES.push(`potato_${s}_${c}`)));
  const FONT = '"Lilita One", system-ui, sans-serif';
  const rand = a => a[Math.floor(Math.random() * a.length)];

  if (!document.querySelector('link[data-spud-font]')) {
    const l = document.createElement('link');
    l.rel = 'stylesheet'; l.dataset.spudFont = '1';
    l.href = 'https://fonts.googleapis.com/css2?family=Lilita+One&display=swap';
    document.head.appendChild(l);
  }

  class SpudRush extends HTMLElement {
    static get observedAttributes() { return ['assets-base', 'oven-cook', 'oven-burn', 'oven-ruin', 'spawn-interval', 'patience', 'show-zones']; }
    constructor() { super(); this._cfg = {}; this.img = {}; }
    cfg(k) {
      if (this._cfg[k] != null) return this._cfg[k];
      const kebab = k.replace(/[A-Z]/g, m => '-' + m.toLowerCase());
      const a = this.getAttribute(kebab) ?? this.getAttribute(k.toLowerCase());
      if (a == null) return DEFAULTS[k];
      if (typeof DEFAULTS[k] === 'number') return parseFloat(a);
      if (typeof DEFAULTS[k] === 'boolean') return a !== 'false';
      return a;
    }
    attributeChangedCallback(n) { if (n === 'assets-base' && this.isConnected) this.loadImages(); }

    connectedCallback() {
      this.style.display = 'block';
      this.style.aspectRatio = '1 / 1';
      this.style.position = 'relative';
      const cv = this.canvas = document.createElement('canvas');
      cv.width = 1000; cv.height = 1000; cv.tabIndex = 0;
      cv.style.cssText = 'width:100%;height:100%;display:block;outline:none;image-rendering:auto;cursor:pointer;border-radius:inherit';
      this.appendChild(cv);
      this.ctx = cv.getContext('2d');
      this.keys = new Set();
      this.loadImages();
      this.best = +(localStorage.getItem('spudrush.best') || 0);
      this.reset(); this.mode = 'title';
      this._kd = e => this.onKey(e, true); this._ku = e => this.onKey(e, false);
      cv.addEventListener('keydown', this._kd); cv.addEventListener('keyup', this._ku);
      cv.addEventListener('mousedown', () => { setTimeout(() => cv.focus(), 0); if (this.mode === 'title' || this.mode === 'paused') this.mode = 'play'; });
      cv.addEventListener('blur', () => { this.keys.clear(); if (this.mode === 'play') this.mode = 'paused'; });
      this.last = performance.now();
      const loop = t => { const dt = Math.min(0.05, (t - this.last) / 1000); this.last = t; this.update(dt); this.draw(); this.raf = requestAnimationFrame(loop); };
      this.raf = requestAnimationFrame(loop);
    }
    disconnectedCallback() { cancelAnimationFrame(this.raf); }

    loadImages() {
      const base = this.cfg('assetsBase');
      FILES.forEach(f => { const i = new Image(); i.onerror = () => { i._bad = true; }; i.src = base + f + '.png'; this.img[f] = i; });
    }

    reset() {
      this.chef = { x: 250, y: 300, walk: 0 };
      this.holding = null;
      this.ovens = [{ x: 168, y: 404, w: 112, h: 84 }, { x: 296, y: 404, w: 112, h: 84 }].map(o => ({ ...o, type: 'oven', potato: null, t: 0 }));
      this.beds = SIZES.map((s, i) => ({ type: 'bed', size: s, x: 4, y: 132 + i * 114, w: 82, h: 96, img: 'bed_' + s }));
      this.jars = ['red', 'blue', 'green', 'yellow'].map((c, i) => ({ type: 'jar', colour: c, x: 424, y: 132 + i * 90, w: 72, h: 80, img: 'jar_' + c }));
      this.bin = { type: 'bin', x: 90, y: 410, w: 60, h: 78 };
      this.bays = [0, 1, 2].map(i => ({ type: 'bay', i, x: 40 + i * 140, y: 18, w: 140, h: 140 }));
      this.customers = [null, null, null];
      this.stations = [...this.beds, ...this.jars, this.bin, ...this.ovens, ...this.bays];
      this.coins = 0; this.strikes = 0; this.elapsed = 0; this.spawnT = 0.6; this.orders = 0;
      this.particles = []; this.floaters = []; this.near = null; this.mode = 'play';
    }

    onKey(e, down) {
      const k = e.key.toLowerCase();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
      if (down) {
        if (k === 'r' && this.mode === 'over') { this.reset(); return; }
        if (this.mode === 'title' || this.mode === 'paused') { this.mode = 'play'; if (k === ' ') return; }
        if (k === ' ' && !e.repeat && this.mode === 'play') this.act();
        this.keys.add(k);
      } else this.keys.delete(k);
    }

    doneAt(t) { const c = this.cfg.bind(this); return t < c('ovenCook') ? 'raw' : t < c('ovenBurn') ? 'cooked' : t < c('ovenRuin') ? 'burnt' : 'ruined'; }
    startT(done) { return { raw: 0, cooked: this.cfg('ovenCook'), burnt: this.cfg('ovenBurn'), ruined: this.cfg('ovenRuin') }[done]; }

    makeOrder() {
      const n = this.orders++;
      if (n === 0) return { size: 'large', colour: 'natural', done: 'raw' };
      if (n === 1) return { size: 'large', colour: 'red', done: 'raw' };
      if (n === 2) return { size: rand(SIZES), colour: 'natural', done: 'cooked' };
      if (n === 3) return { size: rand(SIZES), colour: rand(COLOURS.slice(1)), done: 'raw' };
      const r = Math.random();
      return { size: rand(SIZES), colour: Math.random() < 0.2 ? 'natural' : rand(COLOURS.slice(1)), done: r < 0.3 ? 'raw' : r < 0.7 ? 'cooked' : 'burnt' };
    }

    spawn() {
      const free = [0, 1, 2].filter(i => !this.customers[i]);
      if (!free.length) return false;
      const bay = this.orders === 0 ? 0 : rand(free);
      const used = this.customers.filter(Boolean).map(c => c.face);
      const face = rand([1, 2, 3, 4, 5].filter(f => !used.includes(f)));
      const p = this.cfg('patience') * Math.max(0.45, 1 - this.elapsed / 260) * (this.orders < 2 ? 1.5 : 1);
      this.customers[bay] = { face, order: this.makeOrder(), patience: p, max: p, state: 'arriving', t: 0 };
      return true;
    }

    leave(i, mood) {
      const c = this.customers[i]; c.state = 'leaving'; c.mood = mood; c.t = 0;
      if (mood === 'angry') {
        this.strikes++;
        this.float(this.bays[i].x + 70, 60, 'X', '#e0483c');
        if (this.strikes >= 3) { this.mode = 'over'; if (this.coins > this.best) { this.best = this.coins; localStorage.setItem('spudrush.best', this.best); } }
      }
    }
    float(x, y, text, col) { this.floaters.push({ x, y, text, col, life: 1.1 }); }

    act() {
      const s = this.near; if (!s) return;
      const h = this.holding;
      if (s.type === 'bed' && !h) { this.holding = { size: s.size, colour: 'natural', done: 'raw' }; this.puff(this.chef.x, this.chef.y - 24, '#6b4a2f', 6); }
      else if (s.type === 'jar' && h && h.done !== 'ruined') { h.colour = s.colour; this.puff(s.x + 36, s.y + 20, { red: '#d9392b', blue: '#2f6fd6', green: '#3aa845', yellow: '#f2c230' }[s.colour], 8); }
      else if (s.type === 'oven') {
        if (!s.potato && h) { s.potato = h; s.t = this.startT(h.done); this.holding = null; }
        else if (s.potato && !h) { this.holding = { ...s.potato, done: this.doneAt(s.t) }; s.potato = null; }
      }
      else if (s.type === 'bin' && h) { this.holding = null; this.puff(s.x + 30, s.y + 14, '#9a9a94', 8); }
      else if (s.type === 'bay' && h) {
        const c = this.customers[s.i];
        if (!c || c.state === 'leaving') return;
        const o = c.order;
        this.holding = null;
        if (o.size === h.size && o.colour === h.colour && o.done === h.done) {
          const pay = 10 + Math.round(20 * c.patience / c.max);
          this.coins += pay; this.float(s.x + 70, 70, '+' + pay, '#f2c230'); this.leave(s.i, 'happy');
        } else this.leave(s.i, 'angry');
      }
    }

    puff(x, y, col, n) { for (let i = 0; i < n; i++) this.particles.push({ x, y, vx: (Math.random() - 0.5) * 80, vy: -Math.random() * 70 - 10, life: 0.5, max: 0.5, r: 2 + Math.random() * 2.5, col }); }

    update(dt) {
      this.particles.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; });
      this.particles = this.particles.filter(p => p.life > 0);
      this.floaters.forEach(f => { f.y -= 28 * dt; f.life -= dt; });
      this.floaters = this.floaters.filter(f => f.life > 0);
      if (this.mode !== 'play') return;
      this.elapsed += dt;
      const k = this.keys; let dx = 0, dy = 0;
      if (k.has('arrowleft') || k.has('a')) dx--; if (k.has('arrowright') || k.has('d')) dx++;
      if (k.has('arrowup') || k.has('w')) dy--; if (k.has('arrowdown') || k.has('s')) dy++;
      const ch = this.chef;
      if (dx || dy) { const m = Math.hypot(dx, dy); ch.x += dx / m * 140 * dt; ch.y += dy / m * 140 * dt; ch.walk += dt * 14; } else ch.walk = 0;
      ch.x = Math.max(WALK.x1, Math.min(WALK.x2, ch.x)); ch.y = Math.max(WALK.y1, Math.min(WALK.y2, ch.y));

      this.ovens.forEach(o => {
        if (!o.potato) return;
        o.t += dt;
        const d = this.doneAt(o.t);
        if (Math.random() < dt * (d === 'cooked' ? 5 : d === 'raw' ? 0 : 9))
          this.particles.push({ x: o.x + 40 + Math.random() * 32, y: o.y + 4, vx: (Math.random() - 0.5) * 10, vy: -25 - Math.random() * 20, life: 1.2, max: 1.2, r: 3 + Math.random() * 3, col: d === 'cooked' ? 'rgba(255,255,255,0.8)' : d === 'burnt' ? 'rgba(60,55,52,0.7)' : 'rgba(30,28,26,0.85)' });
      });

      this.customers.forEach((c, i) => {
        if (!c) return;
        c.t += dt;
        if (c.state === 'arriving' && c.t > 0.4) { c.state = 'waiting'; }
        if (c.state !== 'leaving') { c.patience -= dt; if (c.patience <= 0 && this.mode === 'play') this.leave(i, 'angry'); }
        else if (c.t > 0.7) this.customers[i] = null;
      });

      this.spawnT -= dt;
      if (this.spawnT <= 0) this.spawnT = this.spawn() ? this.cfg('spawnInterval') * Math.max(0.4, 1 - this.elapsed / 200) : 1;

      let best = null, bd = REACH;
      this.stations.forEach(s => {
        const px = Math.max(s.x, Math.min(s.x + s.w, ch.x)), py = Math.max(s.y, Math.min(s.y + s.h, ch.y));
        const d = Math.hypot(px - ch.x, py - ch.y);
        if (d < bd) { bd = d; best = s; }
      });
      this.near = best;
    }

    // ---- drawing ----
    pic(name, x, y, w, h) {
      const i = this.img[name], c = this.ctx;
      if (i && i.complete && !i._bad && i.naturalWidth) c.drawImage(i, x, y, w, h);
      else { c.fillStyle = 'rgba(224,131,58,0.25)'; c.strokeStyle = '#e0833a'; c.lineWidth = 1; c.fillRect(x, y, w, h); c.strokeRect(x + .5, y + .5, w - 1, h - 1); c.fillStyle = INK; c.font = '8px monospace'; c.fillText(name, x + 2, y + 10, w - 4); }
    }
    potato(p, cx, cy, s) {
      const sz = 64 * s;
      if (p.done === 'ruined') return this.pic('potato_ruined', cx - sz / 2, cy - sz / 2, sz, sz);
      this.pic(`potato_${p.size}_${p.colour}`, cx - sz / 2, cy - sz / 2, sz, sz);
      if (p.done === 'cooked' || p.done === 'burnt') { const o = sz * OVERLAY_SCALE[p.size]; this.pic('overlay_' + p.done, cx - o / 2, cy - o / 2, o, o); }
    }
    shadow(cx, cy, rx, ry) { const c = this.ctx; c.fillStyle = 'rgba(40,30,20,0.16)'; c.beginPath(); c.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); c.fill(); }

    draw() {
      const c = this.ctx;
      c.setTransform(2, 0, 0, 2, 0, 0);
      c.clearRect(0, 0, 500, 500);
      this.pic('kitchen_background', 0, 0, 500, 500);

      // customers in the hatch
      c.save(); c.beginPath(); c.rect(40, 18, 420, 82); c.clip();
      this.customers.forEach((cu, i) => {
        if (!cu) return;
        const bx = this.bays[i].x;
        const e = t => 1 - Math.pow(1 - Math.min(1, t), 3);
        let off = cu.state === 'arriving' ? (1 - e(cu.t / 0.4)) * 86 : cu.state === 'leaving' ? e(cu.t / 0.7) * 86 : 0;
        let jx = 0;
        if (cu.state === 'waiting' && cu.patience / cu.max < 0.3) jx = Math.sin(performance.now() / 40) * 1.5;
        if (cu.state === 'leaving' && cu.mood === 'angry') jx = Math.sin(cu.t * 60) * 3;
        this.pic('customer_' + cu.face, bx + 4 + jx, 14 + off, 132, 86);
        if (cu.state === 'leaving' && cu.mood === 'angry') { c.fillStyle = 'rgba(224,72,60,0.35)'; c.fillRect(bx, 18, 140, 82); }
      });
      c.restore();

      // sprites, y-sorted
      const list = [];
      this.beds.forEach(b => list.push([b.y + b.h, () => { this.shadow(b.x + 41, b.y + b.h - 4, 38, 6); this.pic(b.img, b.x, b.y, b.w, b.h); }]));
      this.jars.forEach(j => list.push([j.y + j.h, () => { this.shadow(j.x + 36, j.y + j.h - 3, 30, 5); this.pic(j.img, j.x, j.y, j.w, j.h); }]));
      list.push([this.bin.y + this.bin.h, () => { const b = this.bin; this.shadow(b.x + 30, b.y + b.h - 3, 22, 5); this.pic('bin', b.x, b.y, b.w, b.h); }]);
      this.ovens.forEach(o => list.push([o.y + o.h, () => this.drawOven(o)]));
      const ch = this.chef;
      list.push([ch.y, () => {
        const bob = ch.walk ? -Math.abs(Math.sin(ch.walk)) * 2.5 : 0;
        this.shadow(ch.x, ch.y - 1, 18, 5);
        this.pic('chef_robot', ch.x - 24, ch.y - 66 + bob, 48, 66);
        if (this.holding) this.potato(this.holding, ch.x, ch.y - 24 + bob, 0.8);
      }]);
      list.sort((a, b) => a[0] - b[0]).forEach(s => s[1]());

      // highlight ring
      if (this.near && this.mode === 'play') {
        const s = this.near, h = s.type === 'bay' ? 82 : s.h, a = 0.6 + 0.4 * Math.sin(performance.now() / 150);
        c.strokeStyle = `rgba(255,210,63,${a})`; c.lineWidth = 3;
        c.beginPath(); c.roundRect(s.x - 2, s.y - 2, s.w + 4, h + 4, 10); c.stroke();
      }

      // bubbles
      this.customers.forEach((cu, i) => {
        if (!cu || cu.state === 'leaving') return;
        const bx = this.bays[i].x, a = cu.state === 'arriving' ? Math.min(1, cu.t / 0.4) : 1;
        c.globalAlpha = a;
        this.pic('speech_bubble', bx + 30, 96, 80, 58);
        this.potato(cu.order, bx + 70, 124, 0.62);
        const f = Math.max(0, cu.patience / cu.max);
        c.fillStyle = '#d9d2c2'; c.fillRect(bx + 44, 143, 52, 5);
        c.fillStyle = f > 0.5 ? '#3aa845' : f > 0.25 ? '#f2c230' : '#e0483c'; c.fillRect(bx + 44, 143, 52 * f, 5);
        c.strokeStyle = INK; c.lineWidth = 1; c.strokeRect(bx + 44, 143, 52, 5);
        c.globalAlpha = 1;
      });

      this.particles.forEach(p => { c.globalAlpha = Math.max(0, p.life / p.max); c.fillStyle = p.col; c.beginPath(); c.arc(p.x, p.y, p.r, 0, Math.PI * 2); c.fill(); });
      c.globalAlpha = 1;
      c.textAlign = 'center';
      this.floaters.forEach(f => { c.globalAlpha = Math.min(1, f.life * 2); c.font = `18px ${FONT}`; c.lineWidth = 4; c.strokeStyle = INK; c.strokeText(f.text, f.x, f.y); c.fillStyle = f.col; c.fillText(f.text, f.x, f.y); });
      c.globalAlpha = 1;

      // HUD
      this.pic('icon_coin', 6, 2, 14, 14);
      c.textAlign = 'left'; c.font = `13px ${FONT}`; c.fillStyle = INK; c.fillText(this.coins, 24, 14);
      for (let i = 0; i < 3; i++) { c.globalAlpha = i < 3 - this.strikes ? 1 : 0.22; this.pic('icon_heart', 446 + i * 16, 2, 14, 14); }
      c.globalAlpha = 1;

      if (this.cfg('showZones')) {
        c.setLineDash([4, 3]); c.lineWidth = 1;
        c.strokeStyle = '#2f6fd6'; c.strokeRect(WALK.x1, WALK.y1, WALK.x2 - WALK.x1, WALK.y2 - WALK.y1);
        c.strokeStyle = '#e0483c'; this.stations.forEach(s => c.strokeRect(s.x, s.y, s.w, s.h));
        c.setLineDash([]);
      }

      if (this.mode !== 'play') this.overlay();
    }

    drawOven(o) {
      const c = this.ctx;
      this.shadow(o.x + 56, o.y + o.h - 3, 50, 6);
      const d = o.potato ? this.doneAt(o.t) : null;
      c.fillStyle = '#2a1e18'; c.fillRect(o.x + 28, o.y + 22, 56, 40);
      if (o.potato) {
        c.fillStyle = `rgba(255,140,40,${0.25 + 0.1 * Math.sin(performance.now() / 200)})`; c.fillRect(o.x + 28, o.y + 22, 56, 40);
        this.potato({ ...o.potato, done: d }, o.x + 56, o.y + 44, 0.7);
      }
      this.pic('oven', o.x, o.y, o.w, o.h);
      // progress bar in the display slot
      const bx = o.x + 37, by = o.y + 10.5, bw = 58, bh = 5;
      if (o.potato) {
        const cook = this.cfg('ovenCook'), burn = this.cfg('ovenBurn'), ruin = this.cfg('ovenRuin');
        const zone = (a, b, col) => { c.fillStyle = col; c.fillRect(bx + bw * a / ruin, by, bw * (b - a) / ruin, bh); };
        c.globalAlpha = 0.35; zone(0, cook, '#d9d2c2'); zone(cook, burn, '#f2a93a'); zone(burn, ruin, '#8a7f78'); c.globalAlpha = 1;
        const f = Math.min(1, o.t / ruin);
        c.fillStyle = { raw: '#d9d2c2', cooked: '#f2a93a', burnt: '#8a7f78', ruined: '#e0483c' }[d];
        c.fillRect(bx, by, bw * f, bh);
        c.fillStyle = '#fff'; c.fillRect(bx + bw * f - 1, by - 1, 2, bh + 2);
      }
    }

    overlay() {
      const c = this.ctx;
      c.fillStyle = 'rgba(42,35,32,0.72)'; c.fillRect(0, 0, 500, 500);
      c.textAlign = 'center'; c.fillStyle = '#fbf7ee';
      const t = (s, y, px, col = '#fbf7ee') => { c.font = `${px}px ${FONT}`; c.fillStyle = col; c.fillText(s, 250, y); };
      if (this.mode === 'title') { t('SPUD RUSH', 220, 52, '#f2c230'); t('Click to start', 262, 20); t('Arrows / WASD to walk  ·  Space to use', 292, 14, '#d9d2c2'); }
      if (this.mode === 'paused') { t('Paused', 240, 36, '#f2c230'); t('Click to resume', 272, 18); }
      if (this.mode === 'over') { t('KITCHEN CLOSED', 200, 40, '#e0483c'); t(this.coins + ' coins', 250, 32); t('Best: ' + this.best, 282, 18, '#d9d2c2'); t('Press R to go again', 330, 18, '#f2c230'); }
    }
  }
  Object.keys(DEFAULTS).forEach(k => Object.defineProperty(SpudRush.prototype, k, {
    get() { return this.cfg(k); },
    set(v) { this._cfg[k] = v == null || v === '' ? null : (typeof DEFAULTS[k] === 'number' ? parseFloat(v) : typeof DEFAULTS[k] === 'boolean' ? (v === true || v === 'true') : v); if (k === 'assetsBase' && this.isConnected) this.loadImages(); }
  }));
  customElements.define('spud-rush', SpudRush);
})();
