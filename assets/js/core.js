/* =========================================================
   CORE — kho dữ liệu, tiện ích, biểu tượng, hộp thoại, thông báo
   Dùng chung cho trang khách và trang quản trị.
   ========================================================= */
(() => {
  'use strict';

  const KEY = 'ct_data_v1';
  const K_VIEWS = 'ct_views';
  const K_RECENT = 'ct_recent';
  const K_THEME = 'ct_theme';
  const K_SESSION = 'ct_admin_session';
  const DEFAULT_PASSWORD = 'admin123';
  const OLD_NOTES = 'Không đăng nhập tài khoản trong thời gian cày.\nGiá có thể thay đổi theo mùa giải.\nLiên hệ trước khi chuyển khoản để xác nhận lịch.';

  /* ---------- localStorage an toàn ---------- */
  const ls = {
    get(k, f = null) { try { const v = localStorage.getItem(k); return v == null ? f : JSON.parse(v); } catch (e) { return f; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* bỏ qua */ } }
  };
  const clone = o => JSON.parse(JSON.stringify(o));

  /* ---------- Tiện ích ---------- */
  const U = {
    ls, clone,
    uid(p = 'id') { return p + Date.now().toString(36).slice(-5) + Math.random().toString(36).slice(2, 6); },
    fold(s) { return String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase(); },
    slug(s) { return U.fold(s).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'muc'; },
    esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); },
    num(n) { return Math.round(Number(n) || 0).toLocaleString('vi-VN'); },
    fmt(n) { return U.num(n) + 'đ'; },
    parseNum(s) { return Number(String(s ?? '').replace(/[^\d]/g, '')) || 0; },
    off(p) { return p && p.oldPrice > p.price && p.price > 0 ? Math.round((1 - p.price / p.oldPrice) * 100) : 0; },
    initials(name) {
      const w = String(name || '').trim().split(/\s+/).filter(Boolean);
      if (!w.length) return '?';
      return (w.length === 1 ? w[0].slice(0, 2) : w[0][0] + w[1][0]).toUpperCase();
    },
    hash(str) { // mã hóa một chiều đơn giản (cyrb53) — đủ cho khóa giao diện, không phải bảo mật máy chủ
      let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
      for (let i = 0; i < str.length; i++) { const ch = str.charCodeAt(i); h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677); }
      h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
      h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
      return 'h' + (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
    },
    date(ts) { return new Date(ts).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }); },
    dateTime(ts) { return new Date(ts).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }); },
    debounce(fn, ms = 150) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; },
    highlight(text, q) {
      text = String(text ?? '');
      const fq = U.fold(q).trim();
      if (!fq) return U.esc(text);
      const i = U.fold(text).indexOf(fq);
      if (i < 0) return U.esc(text);
      return U.esc(text.slice(0, i)) + '<mark>' + U.esc(text.slice(i, i + fq.length)) + '</mark>' + U.esc(text.slice(i + fq.length));
    },
    async copy(text) {
      try { await navigator.clipboard.writeText(text); return true; } catch (e) {
        try {
          const ta = document.createElement('textarea');
          ta.value = text; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
          document.body.appendChild(ta); ta.select();
          const ok = document.execCommand('copy'); ta.remove(); return ok;
        } catch (e2) { return false; }
      }
    },
    download(name, text, type = 'application/json') {
      const blob = new Blob([text], { type: type + ';charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = name;
      document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800);
    },
    reduced() { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; },
    tween(from, to, ms, cb) {
      if (U.reduced() || from === to) { cb(to); return; }
      const t0 = performance.now();
      const step = now => {
        const k = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - k, 3);
        cb(from + (to - from) * e);
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    },
    // Chế độ mô tả / lưu ý của sản phẩm: default | none | custom
    descMode(p) { return p.descMode || (p.desc && p.desc.trim() ? 'custom' : 'default'); },
    notesMode(p) { return p.notesMode || (p.notes && p.notes.trim() ? 'custom' : 'default'); },
    descOf(p, s) {
      const m = U.descMode(p);
      return m === 'none' ? '' : m === 'custom' ? (p.desc || '').trim() : (s.defaultDesc || '').trim();
    },
    notesOf(p, s) {
      const m = U.notesMode(p);
      const txt = m === 'none' ? '' : m === 'custom' ? p.notes || '' : s.defaultNotes || '';
      return txt.split('\n').map(x => x.trim()).filter(Boolean);
    },
    digits(v) { return String(v || '').replace(/\D/g, ''); },
    // Link của một mục liên hệ: ô Link trống thì lấy từ Cài đặt › Liên hệ
    channelUrl(item, s) {
      if (item.url && item.url.trim()) return item.url.trim();
      const z = U.digits(s.zalo), ph = U.digits(s.phone || s.zalo);
      switch (item.icon) {
        case 'zalo': return z ? 'https://zalo.me/' + z : '';
        case 'messenger': return s.messenger || '';
        case 'phone': return ph ? 'tel:' + ph : '';
        case 'email': return s.email ? 'mailto:' + s.email : '';
        case 'facebook': case 'youtube': case 'tiktok': case 'instagram': case 'telegram': case 'discord': return s[item.icon] || '';
        default: return '';
      }
    },
    // Dòng phụ: trống thì tự hiện số điện thoại / email
    channelDesc(item, s) {
      if (item.desc && item.desc.trim()) return item.desc.trim();
      if (item.icon === 'phone') return s.phone || s.zalo || '';
      if (item.icon === 'zalo') return s.zalo || '';
      if (item.icon === 'email') return s.email || '';
      return '';
    },
    moneyMask(inp) {
      const d = U.parseNum(inp.value);
      inp.value = d ? U.num(d) : '';
    }
  };

  /* ---------- Kho dữ liệu ---------- */
  function normalize(d) {
    const def = clone(window.DEFAULT_DATA);
    if (!d || typeof d !== 'object') return def;
    const arr = k => (Array.isArray(d[k]) ? d[k] : def[k]);
    const settings = Object.assign({}, def.settings, d.settings || {});
    // Lưu ý mặc định bản cũ → bản mới
    if (settings.defaultNotes === OLD_NOTES) settings.defaultNotes = def.settings.defaultNotes;
    if (!settings.phone) settings.phone = settings.zalo || '';
    // Giá trị dự phòng khi data.js là bản xuất từ phiên bản cũ
    const fb = {
      footerAbout: '', footerSocial: true, footerAdminLink: true,
      footerCopyright: '© {year} {site}. Giá có thể thay đổi theo mùa giải.',
      defaultNotes: 'Không đăng nhập trong thời gian cày.\nGiá có thể thay đổi.\nLiên hệ admin trước khi chuyển khoản để xác nhận.'
    };
    Object.keys(fb).forEach(k => { if (settings[k] === undefined) settings[k] = fb[k]; });
    if (!Array.isArray(settings.footerCols)) settings.footerCols = [
      { id: 'fc1', type: 'services', title: 'Dịch vụ', visible: true, limit: 5, items: [] },
      { id: 'fc2', type: 'contact', title: 'Liên hệ', visible: true, items: [] }
    ];
    if (!settings.quick || !Array.isArray(settings.quick.items)) settings.quick = {
      on: true, auto: true, autoSec: 2, side: 'right', title: 'Hỗ trợ nhanh', sub: 'Phản hồi trong 5 phút',
      items: [
        { id: 'q1', icon: 'zalo', name: 'Zalo', desc: 'Tư vấn & báo giá nhanh', url: '', visible: true },
        { id: 'q2', icon: 'messenger', name: 'Messenger', desc: 'Nhắn tin qua Facebook', url: '', visible: true },
        { id: 'q3', icon: 'phone', name: 'Gọi điện', desc: '', url: '', visible: true }
      ]
    };
    return {
      version: 1,
      updatedAt: d.updatedAt || def.updatedAt || Date.now(),
      settings,
      games: arr('games'), cats: arr('cats'), prods: arr('prods'),
      faqs: arr('faqs'), reviews: arr('reviews')
    };
  }

  let cache = null;
  const subs = new Set();
  const emit = kind => subs.forEach(f => f(kind));

  /* ---------- Chế độ máy chủ (khi chạy bằng server.js trên VPS) ----------
     - Có server: dữ liệu đọc/ghi qua /api, mọi khách thấy cùng một bảng giá.
     - Mở file trực tiếp (file://) hoặc không có server: lưu trong trình duyệt như cũ. */
  let mode = 'local';
  const srv = { admin: false, defaultPw: false, views: {}, pending: false, timer: null };
  async function api(method, url, body) {
    const opt = { method, credentials: 'same-origin', cache: 'no-store', headers: { 'X-Requested-With': 'fetch' } };
    if (body !== undefined) { opt.headers['Content-Type'] = 'application/json'; opt.body = JSON.stringify(body); }
    const r = await fetch(url, opt);
    let j = null;
    try { j = await r.json(); } catch (e) { /* bỏ qua */ }
    if (!r.ok) throw Object.assign(new Error((j && j.error) || 'Lỗi kết nối máy chủ (' + r.status + ')'), { status: r.status, field: j && j.field });
    return j || {};
  }
  function queuePush() {
    srv.pending = true;
    clearTimeout(srv.timer);
    srv.timer = setTimeout(pushNow, 300);
  }
  async function pushNow() {
    try {
      const j = await api('PUT', 'api/data', cache);
      if (j.updatedAt) cache.updatedAt = j.updatedAt;
      srv.pending = false;
    } catch (e) {
      srv.pending = false;
      if (e.status === 401) { srv.admin = false; emit('session'); UI.toast('Phiên đăng nhập đã hết. Vui lòng đăng nhập lại.', 'err'); }
      else UI.toast('Chưa lưu được lên máy chủ: ' + e.message, 'err', { ms: 6000 });
    }
  }
  window.addEventListener('beforeunload', e => { if (srv.pending) { e.preventDefault(); e.returnValue = ''; } });

  const Store = {
    get mode() { return mode; },
    ready: (async () => {
      if (!/^https?:$/.test(location.protocol)) return;
      try {
        const j = await api('GET', 'api/data');
        if (!j.data) return;
        mode = 'server';
        cache = normalize(j.data);
        srv.admin = !!j.admin;
        srv.defaultPw = !!j.defaultPassword;
      } catch (e) { /* không có server: dùng trình duyệt */ }
    })(),
    // Trang khách: kiểm tra định kỳ xem admin có cập nhật không
    watch(ms = 30000) {
      if (mode !== 'server') return;
      setInterval(async () => {
        if (document.hidden || srv.pending) return;
        try {
          const v = await api('GET', 'api/version');
          if (v.updatedAt && cache && v.updatedAt !== cache.updatedAt) {
            const j = await api('GET', 'api/data');
            if (srv.pending) return;
            cache = normalize(j.data);
            emit('data');
          }
        } catch (e) { /* mạng chập chờn: thử lại lần sau */ }
      }, ms);
    },
    get() { if (!cache) cache = normalize(ls.get(KEY, null)); return cache; },
    save() {
      const d = Store.get();
      d.updatedAt = Date.now();
      if (mode === 'server') { queuePush(); return true; }
      const ok = ls.set(KEY, d);
      if (!ok) UI.toast('Không lưu được. Bộ nhớ trình duyệt đầy hoặc bị chặn.', 'err');
      return ok;
    },
    replace(d) { cache = normalize(d); return Store.save(); },
    reset() {
      if (mode === 'server') { cache = normalize(clone(window.DEFAULT_DATA)); Store.save(); return; }
      ls.del(KEY); cache = null;
    },
    // Tải ảnh lên máy chủ, trả về đường dẫn dạng uploads/xxxx.png
    async upload(file) {
      if (mode !== 'server') throw new Error('Tải ảnh chỉ dùng được khi web chạy trên máy chủ (server.js).');
      if (file.size > 5 * 1024 * 1024) throw new Error('Ảnh quá lớn, tối đa 5 MB.');
      const r = await fetch('api/upload', { method: 'POST', credentials: 'same-origin', headers: { 'X-Requested-With': 'fetch', 'Content-Type': file.type || 'application/octet-stream' }, body: file });
      let j = null; try { j = await r.json(); } catch (e) { /* bỏ qua */ }
      if (!r.ok) throw new Error((j && j.error) || 'Tải ảnh thất bại (' + r.status + ')');
      return j.path;
    },
    hasLocal() { return mode === 'server' || ls.get(KEY, null) != null; },
    on(fn) { subs.add(fn); },
    game(id) { return Store.get().games.find(x => x.id === id); },
    cat(id) { return Store.get().cats.find(x => x.id === id); },
    prod(id) { return Store.get().prods.find(x => x.id === id); },
    isPublic(p) {
      if (!p || !p.visible) return false;
      const c = Store.cat(p.catId); if (!c || !c.visible) return false;
      const g = Store.game(c.gameId); return !!(g && g.visible);
    },
    checkPassword(pw) { const h = Store.get().settings.passwordHash; return h ? U.hash(pw) === h : pw === DEFAULT_PASSWORD; },
    usingDefaultPassword() { return mode === 'server' ? srv.defaultPw : !Store.get().settings.passwordHash; },
    auth: {
      // Trả về true/false; ném lỗi khi máy chủ từ chối vì lý do khác (vd: sai quá nhiều lần)
      async login(pw) {
        if (mode === 'server') {
          try { const j = await api('POST', 'api/login', { password: pw }); srv.admin = true; srv.defaultPw = !!j.defaultPassword; return true; }
          catch (e) { if (e.status === 401) return false; throw e; }
        }
        if (!Store.checkPassword(pw)) return false;
        ls.set(K_SESSION, { exp: Date.now() + 8 * 3600e3 });
        return true;
      },
      async logout() {
        if (mode === 'server') { try { await api('POST', 'api/logout'); } catch (e) { /* bỏ qua */ } srv.admin = false; return; }
        ls.del(K_SESSION);
      },
      // Ném lỗi có .field ('cur' | 'new') khi không đổi được
      async changePassword(cur, next) {
        if (next.length < 6) throw Object.assign(new Error('Mật khẩu mới cần ít nhất 6 ký tự.'), { field: 'new' });
        if (mode === 'server') { await api('POST', 'api/password', { current: cur, next }); srv.defaultPw = false; return; }
        if (!Store.checkPassword(cur)) throw Object.assign(new Error('Mật khẩu hiện tại không đúng.'), { field: 'cur' });
        Store.get().settings.passwordHash = U.hash(next);
        Store.save();
      }
    },
    views: {
      all() { return mode === 'server' ? srv.views : (ls.get(K_VIEWS, {}) || {}); },
      add(id) {
        if (mode === 'server') { api('POST', 'api/view', { id }).catch(() => {}); return; }
        const v = Store.views.all(); v[id] = (v[id] || 0) + 1; ls.set(K_VIEWS, v);
      },
      async load() { if (mode === 'server') { try { srv.views = (await api('GET', 'api/views')).views || {}; } catch (e) { /* bỏ qua */ } } },
      async clear() { if (mode === 'server') { await api('DELETE', 'api/views'); srv.views = {}; return; } ls.del(K_VIEWS); }
    },
    recent: {
      all() { return ls.get(K_RECENT, []) || []; },
      add(id) { const r = Store.recent.all().filter(x => x !== id); r.unshift(id); ls.set(K_RECENT, r.slice(0, 6)); },
      clear() { ls.del(K_RECENT); }
    },
    session: {
      active() {
        if (mode === 'server') return srv.admin;
        const s = ls.get(K_SESSION, null); return !!(s && s.exp > Date.now());
      }
    }
  };

  // Đồng bộ giữa các tab khi chạy không có máy chủ
  window.addEventListener('storage', e => {
    if (e.key === K_THEME) UI.applyTheme();
    if (mode === 'server') return;
    if (e.key === KEY || e.key === null) { cache = null; emit('data'); }
    if (e.key === K_SESSION) emit('session');
  });

  /* ---------- Biểu tượng (SVG nét) ---------- */
  const ICONS = {
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    chevDown: '<path d="m6 9 6 6 6-6"/>',
    chevUp: '<path d="m18 15-6-6-6 6"/>',
    chevRight: '<path d="m9 6 6 6-6 6"/>',
    chevLeft: '<path d="m15 6-6 6 6 6"/>',
    arrowUp: '<path d="M12 19V5M5 12l7-7 7 7"/>',
    arrowDown: '<path d="M12 5v14M5 12l7 7 7-7"/>',
    arrowRight: '<path d="M5 12h14M12 5l7 7-7 7"/>',
    copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/>',
    chat: '<path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.2A8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5z"/>',
    star: '<path d="m12 2.5 2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5-4.8-4.6 6.6-.9z"/>',
    fire: '<path d="M12 22c4 0 7-2.9 7-7 0-3.6-2.4-5.7-4-8.5-.9 1.8-2 2.8-3.5 3C11.5 7 11 4.5 9 2 8 5.5 5 8 5 13.5 5 18.5 8 22 12 22z"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    refresh: '<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>',
    lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    gamepad: '<rect x="2" y="6" width="20" height="12" rx="5"/><path d="M7 12h4M9 10v4"/><path d="M15 11h.01M17.5 13.5h.01" stroke-width="3"/>',
    folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    box: '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/>',
    sliders: '<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
    database: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    alert: '<path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    eyeOff: '<path d="M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6C3.8 8.4 2 12 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v5M14 11v5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
    external: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
    tag: '<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
    chart: '<path d="M3 3v18h18"/><path d="M8 16v-4M12.5 16V8M17 16v-6"/>',
    megaphone: '<path d="M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1zM15 8.5a4.5 4.5 0 0 1 0 7M18 5.5a8.5 8.5 0 0 1 0 13"/>',
    zap: '<path d="M13 2 3 14h9l-1 8 10-12h-9z"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    sort: '<path d="M7 4v16M4 17l3 3 3-3M17 20V4M14 7l3-3 3 3"/>',
    grip: '<circle cx="9" cy="6" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="18" r="1"/>',
    key: '<circle cx="7.5" cy="15.5" r="4.5"/><path d="m10.7 12.3 9.3-9.3M17 6l3 3M14 9l2 2"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
    wrench: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z"/>',
    palette: '<circle cx="12" cy="12" r="9"/><circle cx="7.5" cy="10.5" r="1.2"/><circle cx="12" cy="7" r="1.2"/><circle cx="16.5" cy="10.5" r="1.2"/><path d="M12 21a2.5 2.5 0 0 1 0-5h1.5a3 3 0 0 0 3-3"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    trophy: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>',
    wallet: '<rect x="3" y="6" width="18" height="14" rx="2"/><path d="M3 10h18M16 15h2"/><path d="M6 6V5a2 2 0 0 1 2-2h9"/>',
    headset: '<path d="M4 14v-2a8 8 0 0 1 16 0v2"/><rect x="3" y="14" width="4" height="6" rx="1.5"/><rect x="17" y="14" width="4" height="6" rx="1.5"/><path d="M19 20a3 3 0 0 1-3 2h-2"/>',
    home: '<path d="M3 11 12 4l9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
    sidebar: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/>',
    percent: '<path d="M19 5 5 19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>',
    history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/>',
    layout: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 15h18M9 15v6M15 15v6"/>',
    columns: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16M15 4v16"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
    send: '<path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/>'
  };

  /* ---------- Biểu tượng kênh liên hệ (nền màu, hình trắng) ---------- */
  const W = 'fill="#fff"';
  const CHANNELS = {
    zalo: { label: 'Zalo', bg: '#0068ff', text: 'Zalo' },
    messenger: { label: 'Messenger', bg: 'linear-gradient(135deg,#0099ff,#a033ff 60%,#ff5280)', svg: `<path ${W} d="M12 2.5C6.6 2.5 2.5 6.4 2.5 11.3c0 2.6 1.1 4.8 3 6.4v3.8l3.4-1.9c1 .3 2 .4 3.1.4 5.4 0 9.5-3.9 9.5-8.7S17.4 2.5 12 2.5z"/><path style="fill:#7a4dff" d="m6.8 14 3-4.8 2.4 1.9 3-1.9-3 4.8-2.4-1.9z"/>` },
    phone: { label: 'Gọi điện', bg: '#22b35e', stroke: ICONS.phone },
    telegram: { label: 'Telegram', bg: '#2aabee', svg: `<path ${W} d="M21.4 3.7 2.9 10.8c-1 .4-1 1.5 0 1.8l4.6 1.5 1.8 5.6c.2.7 1.1.9 1.6.4l2.6-2.5 4.7 3.5c.6.4 1.4.1 1.6-.6l3-15.2c.2-.9-.6-1.6-1.4-1.3zM9.9 14.6l-.4 3.9-1.4-4.6 9.7-6.2z"/>` },
    discord: { label: 'Discord', bg: '#5865f2', svg: `<path ${W} d="M19.3 5.3A16 16 0 0 0 15.4 4l-.5 1a15 15 0 0 0-5.8 0L8.6 4a16 16 0 0 0-3.9 1.3C2.2 9 1.6 12.7 1.9 16.3a16 16 0 0 0 4.8 2.4l1-1.6c-.6-.2-1.1-.5-1.6-.8l.4-.3a11.4 11.4 0 0 0 11 0l.4.3c-.5.3-1 .6-1.6.8l1 1.6a16 16 0 0 0 4.8-2.4c.4-4.2-.7-7.8-2.8-11zM8.7 14.1c-1 0-1.7-.9-1.7-2s.8-2 1.7-2 1.8.9 1.7 2c0 1.1-.8 2-1.7 2zm6.6 0c-1 0-1.7-.9-1.7-2s.8-2 1.7-2 1.8.9 1.7 2c0 1.1-.8 2-1.7 2z"/>` },
    facebook: { label: 'Facebook', bg: '#1877f2', svg: `<path ${W} d="M13.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.5-1.5h1.6V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2.2H7.8v3h2.6V21z"/>` },
    youtube: { label: 'YouTube', bg: '#ff0033', svg: `<rect ${W} x="2.5" y="5.5" width="19" height="13" rx="4"/><path style="fill:#ff0033" d="m10 9 5 3-5 3z"/>` },
    tiktok: { label: 'TikTok', bg: '#111418', svg: `<path style="fill:#25f4ee" transform="translate(-.8 -.6)" d="M16.6 3h-3.1v12.3a2.6 2.6 0 1 1-2.6-2.6c.3 0 .5 0 .8.1V9.6a5.7 5.7 0 1 0 4.9 5.6V9.1a7.3 7.3 0 0 0 4.3 1.4V7.4c-2.3 0-4.3-2-4.3-4.4z"/><path style="fill:#fe2c55" transform="translate(.8 .6)" d="M16.6 3h-3.1v12.3a2.6 2.6 0 1 1-2.6-2.6c.3 0 .5 0 .8.1V9.6a5.7 5.7 0 1 0 4.9 5.6V9.1a7.3 7.3 0 0 0 4.3 1.4V7.4c-2.3 0-4.3-2-4.3-4.4z"/><path ${W} d="M16.6 3h-3.1v12.3a2.6 2.6 0 1 1-2.6-2.6c.3 0 .5 0 .8.1V9.6a5.7 5.7 0 1 0 4.9 5.6V9.1a7.3 7.3 0 0 0 4.3 1.4V7.4c-2.3 0-4.3-2-4.3-4.4z"/>` },
    instagram: { label: 'Instagram', bg: 'linear-gradient(45deg,#f9ce34,#ee2a7b 50%,#6228d7)', stroke: '<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17 7h.01" stroke-width="3"/>' },
    email: { label: 'Email', bg: '#ea580c', stroke: ICONS.mail },
    website: { label: 'Website', bg: '#0ea5e9', stroke: ICONS.globe },
    support: { label: 'Hỗ trợ', bg: '#7c4ddb', stroke: ICONS.headset },
    link: { label: 'Liên kết khác', bg: '#64748b', stroke: ICONS.link }
  };

  /* ---------- Màu chủ đạo ---------- */
  const ACCENTS = {
    cobalt: { name: 'Xanh cobalt', l: '#2f54eb', d: '#7b93ff' },
    violet: { name: 'Tím', l: '#7038d9', d: '#a98bff' },
    teal: { name: 'Xanh ngọc', l: '#0b8a82', d: '#34d2c1' },
    emerald: { name: 'Xanh lá', l: '#15803d', d: '#4ade80' },
    orange: { name: 'Cam', l: '#d9560b', d: '#ff9a52' },
    rose: { name: 'Hồng', l: '#d61f59', d: '#ff6f97' }
  };

  let toastBox = null;
  const modalStack = [];

  const UI = {
    ACCENTS,
    icon(n, s = 18, cls = '') {
      return `<svg class="ic ${cls}" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n] || ''}</svg>`;
    },
    CHANNELS,
    channel(key, size = 36, cls = '') {
      const c = CHANNELS[key] || CHANNELS.link;
      const g = Math.round(size * 0.56);
      const inner = c.text
        ? `<span class="ch-txt" style="font-size:${Math.max(8, Math.round(size * 0.3))}px">${c.text}</span>`
        : `<svg width="${g}" height="${g}" viewBox="0 0 24 24" aria-hidden="true" ${c.stroke ? 'fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"' : ''}>${c.stroke || c.svg}</svg>`;
      return `<span class="ch-ic ${cls}" style="--chbg:${c.bg};width:${size}px;height:${size}px">${inner}</span>`;
    },
    hydrate(root = document) {
      root.querySelectorAll('i[data-icon]').forEach(i => { i.outerHTML = UI.icon(i.dataset.icon, +i.dataset.size || 18, i.className || ''); });
    },
    toast(msg, type = 'ok', opts = {}) {
      if (!toastBox) {
        toastBox = document.getElementById('toasts');
        if (!toastBox) { toastBox = document.createElement('div'); toastBox.className = 'toasts'; toastBox.id = 'toasts'; document.body.appendChild(toastBox); }
      }
      const el = document.createElement('div');
      el.className = 'toast t-' + type;
      el.setAttribute('role', 'status');
      el.innerHTML = UI.icon(type === 'err' ? 'x' : type === 'info' ? 'info' : 'check', 22) + `<span>${U.esc(msg)}</span>`;
      let gone = false;
      const dismiss = () => {
        if (gone) return; gone = true;
        el.classList.add('out');
        setTimeout(() => el.remove(), 320);
      };
      if (opts.action) {
        const b = document.createElement('button');
        b.className = 't-act'; b.type = 'button'; b.textContent = opts.action;
        b.addEventListener('click', () => { dismiss(); opts.onAction && opts.onAction(); });
        el.appendChild(b);
      }
      toastBox.appendChild(el);
      while (toastBox.children.length > 3) toastBox.firstElementChild.remove();
      setTimeout(dismiss, opts.ms || (opts.action ? 6500 : 2800));
    },
    modal({ html, cls = '', side = false, top = false, onClose } = {}) {
      const ov = document.createElement('div');
      ov.className = 'overlay' + (side ? ' side' : '') + (top ? ' top' : '');
      ov.innerHTML = `<div class="${side ? 'drawer' : 'modal'} ${cls}" role="dialog" aria-modal="true">${html}</div>`;
      document.body.appendChild(ov);
      UI.hydrate(ov);
      const box = ov.firstElementChild;
      const prev = document.activeElement;
      document.documentElement.classList.add('no-scroll');
      requestAnimationFrame(() => requestAnimationFrame(() => ov.classList.add('show')));
      let closed = false;
      const api = {
        el: box, overlay: ov,
        close() {
          if (closed) return; closed = true;
          ov.classList.remove('show');
          const i = modalStack.indexOf(api); if (i > -1) modalStack.splice(i, 1);
          if (!modalStack.length) document.documentElement.classList.remove('no-scroll');
          setTimeout(() => ov.remove(), 320);
          if (prev && prev.focus) { try { prev.focus({ preventScroll: true }); } catch (e) { /* bỏ qua */ } }
          onClose && onClose();
        }
      };
      ov.addEventListener('mousedown', e => { if (e.target === ov) api.close(); });
      box.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', e => { e.preventDefault(); api.close(); }));
      modalStack.push(api);
      setTimeout(() => {
        const f = box.querySelector('[autofocus], input:not([type=hidden]):not([type=checkbox]):not([type=color]), select, textarea');
        if (f) f.focus({ preventScroll: true });
      }, 80);
      return api;
    },
    confirm({ title = 'Xác nhận', text = '', ok = 'Đồng ý', cancel = 'Hủy', danger = false } = {}) {
      return new Promise(res => {
        let v = false;
        const m = UI.modal({
          cls: 'confirm',
          html: `<div class="cf-body"><div class="cf-ic ${danger ? 'danger' : ''}">${UI.icon(danger ? 'alert' : 'info', 22)}</div>
            <div><h3>${U.esc(title)}</h3><p>${text}</p></div></div>
            <div class="cf-foot"><button class="btn btn-ghost" data-close>${U.esc(cancel)}</button>
            <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-ok>${U.esc(ok)}</button></div>`,
          onClose: () => res(v)
        });
        const b = m.el.querySelector('[data-ok]');
        b.addEventListener('click', () => { v = true; m.close(); });
        setTimeout(() => b.focus(), 90);
      });
    },
    theme() {
      return document.documentElement.getAttribute('data-theme') ||
        (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    },
    applyTheme() {
      const t = ls.get(K_THEME, null);
      if (t) document.documentElement.setAttribute('data-theme', t);
      else document.documentElement.removeAttribute('data-theme');
      document.dispatchEvent(new CustomEvent('themechange'));
    },
    toggleTheme() {
      const next = UI.theme() === 'dark' ? 'light' : 'dark';
      const r = document.documentElement;
      if (!U.reduced()) r.classList.add('theme-anim');
      ls.set(K_THEME, next);
      UI.applyTheme();
      setTimeout(() => r.classList.remove('theme-anim'), 500);
    },
    applyAccent(key) {
      const a = ACCENTS[key] || ACCENTS.cobalt;
      const s = document.documentElement.style;
      s.setProperty('--accent-l', a.l);
      s.setProperty('--accent-d', a.d);
    },
    themeButton(btn) {
      const upd = () => {
        const dark = UI.theme() === 'dark';
        btn.innerHTML = UI.icon(dark ? 'sun' : 'moon', 18, 'spin-in');
        const label = dark ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối';
        btn.setAttribute('aria-label', label); btn.title = label;
      };
      upd();
      btn.addEventListener('click', UI.toggleTheme);
      document.addEventListener('themechange', upd);
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      if (mq.addEventListener) mq.addEventListener('change', upd);
    }
  };

  // Esc đóng hộp thoại trên cùng
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && modalStack.length) { e.preventDefault(); e.stopPropagation(); modalStack[modalStack.length - 1].close(); }
  }, true);

  // Hiệu ứng gợn sóng khi bấm nút
  document.addEventListener('pointerdown', e => {
    const b = e.target.closest('.btn, .opt, .ripple-host');
    if (!b || U.reduced() || b.disabled) return;
    const r = b.getBoundingClientRect();
    const s = Math.max(r.width, r.height) * 2.2;
    const sp = document.createElement('span');
    sp.className = 'ripple';
    sp.style.cssText = `width:${s}px;height:${s}px;left:${e.clientX - r.left - s / 2}px;top:${e.clientY - r.top - s / 2}px`;
    b.appendChild(sp);
    setTimeout(() => sp.remove(), 650);
  });

  window.CT = { Store, U, UI };
})();
