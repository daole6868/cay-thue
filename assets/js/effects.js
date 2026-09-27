/* =========================================================
   HIỆU ỨNG TRANG KHÁCH (bật/tắt trong Quản trị › Giao diện)
   - Hiệu ứng nền vẽ bằng canvas: hạt kết nối, sao, sóng âm, lưới + vạch quét,
     đèn neon nhòe, tuyết rơi, bong bóng
   - Vầng sáng theo chuột, thẻ nghiêng 3D
   - Màn hình tải trang, màn hình chào "Vào trang", nhạc nền, nền nhún theo nhạc
   ========================================================= */
(() => {
  'use strict';
  const { U, UI } = window.CT;
  const root = document.documentElement;
  const fine = window.matchMedia('(pointer: fine)').matches;
  const $ = s => document.querySelector(s);

  /* ---------- Nền canvas ---------- */
  const FX = { kind: 'none', canvas: null, ctx: null, w: 0, h: 0, raf: 0, last: 0, t: 0, parts: [], level: 0, col: null };

  function palette() {
    const cs = getComputedStyle(root);
    const a = cs.getPropertyValue('--accent').trim() || '#2f54eb';
    const b = cs.getPropertyValue('--accent2').trim() || '#7c4ddb';
    return { a: /^#/.test(a) ? a : '#2f54eb', b: /^#/.test(b) ? b : '#7c4ddb', dark: UI.theme() === 'dark' };
  }
  function ensureCanvas() {
    if (FX.canvas) return;
    const c = document.createElement('canvas');
    c.id = 'fx'; c.setAttribute('aria-hidden', 'true');
    document.body.prepend(c);
    FX.canvas = c; FX.ctx = c.getContext('2d');
    window.addEventListener('resize', U.debounce(resize, 150));
    document.addEventListener('themechange', () => { FX.col = palette(); });
    resize();
  }
  function resize() {
    if (!FX.canvas) return;
    const d = Math.min(1.5, window.devicePixelRatio || 1);
    FX.w = window.innerWidth; FX.h = window.innerHeight;
    FX.canvas.width = Math.round(FX.w * d); FX.canvas.height = Math.round(FX.h * d);
    FX.ctx.setTransform(d, 0, 0, d, 0, 0);
    seed();
  }
  const rnd = (a, b) => a + Math.random() * (b - a);
  function seed() {
    const { w, h } = FX, area = w * h;
    const n = (div, max) => Math.max(12, Math.min(max, Math.round(area / div)));
    FX.col = palette();
    switch (FX.kind) {
      case 'particles': FX.parts = Array.from({ length: n(16000, 80) }, () => ({ x: rnd(0, w), y: rnd(0, h), vx: rnd(-.35, .35), vy: rnd(-.35, .35) })); break;
      case 'stars': FX.parts = Array.from({ length: n(4500, 240) }, () => ({ x: rnd(0, w), y: rnd(0, h), r: rnd(.4, 1.6), ph: rnd(0, 6.28), sp: rnd(.01, .04) })); FX.shoot = null; break;
      case 'bokeh': FX.parts = Array.from({ length: n(60000, 18) }, (_, i) => ({ x: rnd(0, w), y: rnd(0, h), r: rnd(50, 140), vx: rnd(-.25, .25), vy: rnd(-.2, .2), c: i % 2, ph: rnd(0, 6.28) })); break;
      case 'snow': FX.parts = Array.from({ length: n(9000, 160) }, () => ({ x: rnd(0, w), y: rnd(-h, h), r: rnd(1, 3.4), vy: rnd(.4, 1.3), ph: rnd(0, 6.28) })); break;
      case 'bubbles': FX.parts = Array.from({ length: n(26000, 40) }, () => ({ x: rnd(0, w), y: rnd(0, h * 1.2), r: rnd(4, 20), vy: rnd(.3, 1), ph: rnd(0, 6.28) })); break;
      default: FX.parts = [];
    }
  }
  const DRAW = {
    particles(c, dt) {
      const { w, h, parts } = FX, { a, b } = FX.col, L = FX.level, max = 130 + L * 60;
      parts.forEach(p => {
        p.x += p.vx * dt * (1 + L * 2); p.y += p.vy * dt * (1 + L * 2);
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
      });
      c.lineWidth = 1;
      for (let i = 0; i < parts.length; i++) {
        for (let j = i + 1; j < parts.length; j++) {
          const dx = parts[i].x - parts[j].x, dy = parts[i].y - parts[j].y, d = Math.sqrt(dx * dx + dy * dy);
          if (d < max) { c.strokeStyle = U.rgba(j % 2 ? a : b, (1 - d / max) * .32); c.beginPath(); c.moveTo(parts[i].x, parts[i].y); c.lineTo(parts[j].x, parts[j].y); c.stroke(); }
        }
      }
      parts.forEach((p, i) => { c.fillStyle = U.rgba(i % 2 ? a : b, .75); c.beginPath(); c.arc(p.x, p.y, 1.8 + L * 2.5, 0, 6.28); c.fill(); });
    },
    stars(c, dt) {
      const { w, h, parts } = FX, { a, dark } = FX.col, L = FX.level;
      parts.forEach(s => {
        s.ph += s.sp * dt;
        const al = (.25 + .75 * Math.abs(Math.sin(s.ph))) * (dark ? .9 : .55);
        c.fillStyle = dark ? `rgba(255,255,255,${al})` : U.rgba(a, al);
        c.beginPath(); c.arc(s.x, s.y, s.r * (1 + L), 0, 6.28); c.fill();
      });
      if (!FX.shoot && Math.random() < .004 * dt) FX.shoot = { x: rnd(w * .2, w), y: rnd(0, h * .4), l: 0 };
      if (FX.shoot) {
        const s = FX.shoot; s.l += 14 * dt;
        const g = c.createLinearGradient(s.x - s.l, s.y + s.l * .5, s.x, s.y);
        g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, dark ? 'rgba(255,255,255,.9)' : U.rgba(a, .8));
        c.strokeStyle = g; c.lineWidth = 2; c.beginPath(); c.moveTo(s.x - s.l, s.y + s.l * .5); c.lineTo(s.x, s.y); c.stroke();
        s.x -= 10 * dt; s.y += 5 * dt;
        if (s.l > 260 || s.x < -300) FX.shoot = null;
      }
    },
    waves(c, dt) {
      const { w, h } = FX, { a, b } = FX.col, L = FX.level;
      FX.t += .02 * dt * (1 + L * 3);
      for (let i = 0; i < 4; i++) {
        const y0 = h * .7 + i * 22, amp = (20 + i * 10) * (1 + L * 2.2), f = .006 + i * .0015;
        const g = c.createLinearGradient(0, 0, w, 0);
        g.addColorStop(0, U.rgba(a, .38 - i * .07)); g.addColorStop(1, U.rgba(b, .38 - i * .07));
        c.strokeStyle = g; c.lineWidth = 2; c.beginPath();
        for (let x = 0; x <= w; x += 8) {
          const y = y0 + Math.sin(x * f + FX.t * (1 + i * .3) + i) * amp * Math.sin(x / w * Math.PI);
          x ? c.lineTo(x, y) : c.moveTo(x, y);
        }
        c.stroke();
      }
    },
    grid(c, dt) {
      const { w, h } = FX, { a, b } = FX.col, L = FX.level, gap = 48;
      c.strokeStyle = U.rgba(a, .07 + L * .08); c.lineWidth = 1; c.beginPath();
      for (let x = (FX.t * .3) % gap; x < w; x += gap) { c.moveTo(x, 0); c.lineTo(x, h); }
      for (let y = 0; y < h; y += gap) { c.moveTo(0, y); c.lineTo(w, y); }
      c.stroke();
      FX.t += 2.2 * dt * (1 + L * 2);
      const y = (FX.t % (h + 240)) - 120;
      const g = c.createLinearGradient(0, y - 110, 0, y + 10);
      g.addColorStop(0, U.rgba(b, 0)); g.addColorStop(.85, U.rgba(a, .14 + L * .15)); g.addColorStop(1, U.rgba(a, 0));
      c.fillStyle = g; c.fillRect(0, y - 110, w, 120);
      c.fillStyle = U.rgba(a, .55); c.fillRect(0, y, w, 1.5);
    },
    bokeh(c, dt) {
      const { w, h, parts } = FX, { a, b, dark } = FX.col, L = FX.level;
      parts.forEach(p => {
        p.x += p.vx * dt; p.y += p.vy * dt; p.ph += .01 * dt;
        if (p.x < -p.r) p.x = w + p.r; if (p.x > w + p.r) p.x = -p.r;
        if (p.y < -p.r) p.y = h + p.r; if (p.y > h + p.r) p.y = -p.r;
        const r = p.r * (1 + L * .5), al = (dark ? .2 : .13) * (.7 + .3 * Math.sin(p.ph));
        const g = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
        g.addColorStop(0, U.rgba(p.c ? a : b, al)); g.addColorStop(1, U.rgba(p.c ? a : b, 0));
        c.fillStyle = g; c.beginPath(); c.arc(p.x, p.y, r, 0, 6.28); c.fill();
      });
    },
    snow(c, dt) {
      const { w, h, parts } = FX, { a, dark } = FX.col, L = FX.level;
      c.fillStyle = dark ? 'rgba(255,255,255,.85)' : U.rgba(a, .35);
      parts.forEach(p => {
        p.y += p.vy * dt * (1 + L); p.ph += .02 * dt; p.x += Math.sin(p.ph) * .5 * dt;
        if (p.y > h + 5) { p.y = -5; p.x = rnd(0, w); }
        c.beginPath(); c.arc(p.x, p.y, p.r * (1 + L * .6), 0, 6.28); c.fill();
      });
    },
    bubbles(c, dt) {
      const { w, h, parts } = FX, { a, b } = FX.col, L = FX.level;
      parts.forEach((p, i) => {
        p.y -= p.vy * dt * (1 + L * 1.5); p.ph += .03 * dt; p.x += Math.sin(p.ph) * .4 * dt;
        if (p.y < -p.r * 2) { p.y = h + p.r; p.x = rnd(0, w); }
        const r = p.r * (1 + L * .5), col = i % 2 ? a : b;
        c.fillStyle = U.rgba(col, .07); c.strokeStyle = U.rgba(col, .38); c.lineWidth = 1.2;
        c.beginPath(); c.arc(p.x, p.y, r, 0, 6.28); c.fill(); c.stroke();
        c.fillStyle = 'rgba(255,255,255,.5)'; c.beginPath(); c.arc(p.x - r * .35, p.y - r * .35, r * .18, 0, 6.28); c.fill();
      });
    }
  };
  function loop(ts) {
    FX.raf = requestAnimationFrame(loop);
    if (document.hidden) { FX.last = ts; return; }
    const dt = Math.min(3, (ts - (FX.last || ts)) / 16.67);
    FX.last = ts;
    const fn = DRAW[FX.kind]; if (!fn) return;
    FX.ctx.clearRect(0, 0, FX.w, FX.h);
    fn(FX.ctx, dt || 1);
  }
  function setBackground(kind) {
    if (kind && kind !== 'none' && DRAW[kind]) {
      ensureCanvas();
      if (FX.kind !== kind) { FX.kind = kind; FX.t = 0; seed(); }
      FX.canvas.hidden = false;
      if (!FX.raf) FX.raf = requestAnimationFrame(loop);
    } else {
      FX.kind = 'none';
      if (FX.canvas) FX.canvas.hidden = true;
      cancelAnimationFrame(FX.raf); FX.raf = 0;
    }
    root.classList.toggle('has-fx', FX.kind !== 'none');
  }

  /* ---------- Vầng sáng theo chuột ---------- */
  let glowEl = null, gx = 0, gy = 0, graf = 0;
  function onGlow(e) {
    gx = e.clientX; gy = e.clientY;
    if (!graf) graf = requestAnimationFrame(() => { graf = 0; if (glowEl) glowEl.style.transform = `translate(${gx}px, ${gy}px)`; });
  }
  function setGlow(on) {
    if (on && !glowEl) {
      glowEl = document.createElement('div'); glowEl.className = 'glow'; glowEl.setAttribute('aria-hidden', 'true');
      document.body.appendChild(glowEl);
      document.addEventListener('pointermove', onGlow, { passive: true });
    }
    if (glowEl) glowEl.hidden = !on;
  }

  /* ---------- Thẻ nghiêng 3D ---------- */
  const TILT = '.feat, .fcard, .review, .cta-box, .detail.has';
  let tiltOn = false, tiltEl = null;
  function resetTilt() { if (tiltEl) { tiltEl.style.transform = ''; tiltEl.classList.remove('tilting'); tiltEl = null; } }
  document.addEventListener('pointermove', e => {
    if (!tiltOn || e.pointerType !== 'mouse') return;
    const el = e.target.closest(TILT);
    if (el !== tiltEl) resetTilt();
    if (!el) return;
    tiltEl = el;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
    const k = el.classList.contains('detail') ? .35 : 1;
    el.classList.add('tilting');
    el.style.transform = `perspective(900px) rotateX(${(-y * 8 * k).toFixed(2)}deg) rotateY(${(x * 10 * k).toFixed(2)}deg) translateY(-3px)`;
  }, { passive: true });
  document.addEventListener('pointerleave', resetTilt);
  window.addEventListener('blur', resetTilt);

  /* ---------- Nhạc nền + nền nhún theo nhạc ---------- */
  const M = { url: '', audio: null, ctx: null, an: null, buf: null, raf: 0, pulse: false, vol: .5 };
  function sameOrigin(url) { return !/^[a-z]+:/i.test(url) || url.startsWith(location.origin); }
  function musicBtn() { return $('#musicBtn'); }
  function updBtn() {
    const b = musicBtn(); if (!b) return;
    const on = !!(M.audio && !M.audio.paused);
    b.classList.toggle('on', on);
    b.innerHTML = UI.icon(on ? 'pause' : 'music', 18);
    b.setAttribute('aria-label', on ? 'Tắt nhạc nền' : 'Bật nhạc nền');
    b.title = b.getAttribute('aria-label');
  }
  function beat() {
    M.raf = requestAnimationFrame(beat);
    let v = 0;
    if (M.an && M.audio && !M.audio.paused && M.pulse) {
      M.an.getByteFrequencyData(M.buf);
      // Lấy dải trầm, so với mức đỉnh gần đây để bắt nhịp ở mọi mức âm lượng
      let bass = 0; const n = Math.min(8, M.buf.length);
      for (let i = 0; i < n; i++) bass = Math.max(bass, M.buf[i]);
      bass /= 255;
      M.avg = M.avg == null ? bass : M.avg * .96 + bass * .04;
      M.peak = Math.max(bass, (M.peak || 0) * .99);
      v = Math.min(1, Math.max(0, (bass - M.avg) / Math.max(.06, M.peak - M.avg)));
    }
    FX.level += (v - FX.level) * .25;
    if (FX.level < .002) FX.level = 0;
    root.style.setProperty('--beat', FX.level.toFixed(3));
    if (!M.pulse && FX.level === 0) { cancelAnimationFrame(M.raf); M.raf = 0; }
  }
  function play() {
    if (!M.url) return;
    if (!M.audio) {
      M.audio = new Audio(M.url);
      M.audio.loop = true;
      M.audio.addEventListener('play', updBtn); M.audio.addEventListener('pause', updBtn);
      // Phân tích nhịp chỉ làm được với file nhạc trên cùng máy chủ
      if (sameOrigin(M.url) && (window.AudioContext || window.webkitAudioContext)) {
        try {
          M.ctx = new (window.AudioContext || window.webkitAudioContext)();
          const src = M.ctx.createMediaElementSource(M.audio);
          M.an = M.ctx.createAnalyser(); M.an.fftSize = 256; M.an.smoothingTimeConstant = .5;
          M.an.minDecibels = -75; M.an.maxDecibels = -15;
          M.buf = new Uint8Array(M.an.frequencyBinCount);
          src.connect(M.an); M.an.connect(M.ctx.destination);
        } catch (e) { M.an = null; }
      }
    }
    M.audio.volume = M.vol;
    if (M.ctx && M.ctx.state === 'suspended') M.ctx.resume();
    M.audio.play().then(() => { if (M.pulse && !M.raf) beat(); }).catch(() => UI.toast('Trình duyệt chưa cho phát nhạc. Bấm nút nhạc ở góc trái để bật.', 'info'));
  }
  function stop() { if (M.audio) M.audio.pause(); }
  function setMusic(t) {
    const url = (t.music || '').trim();
    if (url !== M.url) {
      if (M.audio) { M.audio.pause(); M.audio.src = ''; }
      M.audio = null; M.ctx = null; M.an = null; M.url = url;
    }
    M.vol = Math.max(0, Math.min(1, (Number(t.volume) || 0) / 100));
    if (M.audio) M.audio.volume = M.vol;
    M.pulse = !!t.pulse && t.motion !== false && !U.reduced();
    if (M.pulse && M.audio && !M.audio.paused && !M.raf) beat();
    const b = musicBtn(); if (b) { b.hidden = !url; updBtn(); }
  }

  /* ---------- Màn hình chào "Vào trang" ---------- */
  let welcomeDone = false;
  function welcome(t) {
    const el = $('#welcome'); if (!el || welcomeDone) return;
    let seen = false;
    try { seen = sessionStorage.getItem('ct_welcomed') === '1'; } catch (e) { /* bỏ qua */ }
    if (!t.welcome || seen) return;
    welcomeDone = true;
    $('#wcNote').hidden = !M.url;
    el.hidden = false;
    root.classList.add('no-scroll');
    const enter = () => {
      try { sessionStorage.setItem('ct_welcomed', '1'); } catch (e) { /* bỏ qua */ }
      if (M.url) play();
      el.classList.add('out');
      root.classList.remove('no-scroll');
      setTimeout(() => { el.hidden = true; }, 650);
    };
    $('#wcEnter').onclick = enter;
    setTimeout(() => $('#wcEnter').focus({ preventScroll: true }), 300);
  }

  /* ---------- Màn hình tải trang ---------- */
  function hideLoader() {
    const el = $('#loader'); if (!el || !root.classList.contains('has-loader')) return;
    const t0 = window.__ct_t0 || 0, wait = Math.max(0, 650 - (performance.now() - t0));
    setTimeout(() => {
      el.classList.add('out');
      setTimeout(() => root.classList.remove('has-loader'), 550);
    }, wait);
  }

  /* ---------- Áp dụng từ cài đặt ---------- */
  function apply(settings) {
    const t = Object.assign({}, UI.THEME_DEFAULT, (settings && settings.theme) || {});
    const motion = t.motion !== false && !U.reduced();
    root.classList.toggle('no-motion', !motion);
    FX.col = palette();
    setBackground(motion ? t.bg : 'none');
    setGlow(motion && !!t.glow && fine);
    tiltOn = motion && !!t.tilt && fine;
    if (!tiltOn) resetTilt();
    setMusic(t);
    welcome(t);
  }

  function boot() {
    const b = musicBtn();
    if (b) b.addEventListener('click', () => { if (M.audio && !M.audio.paused) stop(); else play(); });
  }

  // Dùng khi cần kiểm tra lỗi trong Console: CTFX.status()
  function status() {
    let sum = 0;
    if (M.an) { M.an.getByteFrequencyData(M.buf); sum = M.buf.reduce((x, y) => x + y, 0); }
    return { bg: FX.kind, level: +FX.level.toFixed(3), pulse: M.pulse, analyser: !!M.an, playing: !!(M.audio && !M.audio.paused), ctx: M.ctx && M.ctx.state, spectrum: sum };
  }
  window.CTFX = { apply, boot, hideLoader, status };
})();
