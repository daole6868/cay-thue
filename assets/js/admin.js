/* =========================================================
   TRANG QUẢN TRỊ — admin.html
   ========================================================= */
(() => {
  'use strict';
  const { Store, U, UI } = window.CT;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const D = () => Store.get();
  const I = UI.icon;

  const A = {
    route: '', dirty: false, draft: null, sel: new Set(), ctab: 'faq',
    pf: { q: '', game: '', cat: '', status: 'all', sort: '', dir: 1 }, // bộ lọc sản phẩm
    cf: { game: '' } // bộ lọc danh mục
  };

  const ROUTES = {
    dashboard: { t: 'Tổng quan', i: 'grid', r: vDash },
    games: { t: 'Game', i: 'gamepad', r: vGames },
    cats: { t: 'Danh mục', i: 'folder', r: vCats },
    prods: { t: 'Sản phẩm', i: 'box', r: vProds },
    content: { t: 'Hỏi đáp & đánh giá', i: 'help', r: vContent },
    footer: { t: 'Chân trang', i: 'layout', r: vFooter },
    quick: { t: 'Liên hệ nhanh', i: 'headset', r: vQuick },
    look: { t: 'Giao diện', i: 'palette', r: vLook },
    settings: { t: 'Cài đặt', i: 'sliders', r: vSettings },
    backup: { t: 'Sao lưu dữ liệu', i: 'database', r: vBackup }
  };

  const COLORS = ['#d4940b', '#ea6a1c', '#e0474c', '#d61f59', '#b43fc4', '#7c4ddb', '#4a5ee8', '#1b93c9', '#0b8a82', '#5b8c1f', '#6b7280'];

  /* ---------- Mảnh giao diện dùng lại ---------- */
  const avatar = (g, cls = '') => `<span class="av ${cls}" style="--c:${U.esc(g.color)}">${U.esc(g.initials || U.initials(g.name))}</span>`;
  const sw = (on, attrs = '') => `<label class="switch"><input type="checkbox" ${on ? 'checked' : ''} ${attrs}><span></span></label>`;
  const rowBtn = (act, ic, label, cls = '') => `<button class="btn btn-sm btn-icon btn-ghost ${cls}" type="button" data-act="${act}" title="${label}" aria-label="${label}">${I(ic, 16)}</button>`;
  const dragCell = (first, last) => `<div class="drag"><span class="grip" title="Kéo để sắp xếp">${I('grip', 16)}</span>
    <span class="ud"><button type="button" data-act="up" ${first ? 'disabled' : ''} aria-label="Lên">${I('chevUp', 14)}</button><button type="button" data-act="down" ${last ? 'disabled' : ''} aria-label="Xuống">${I('chevDown', 14)}</button></span></div>`;
  const emptyState = (ic, title, text, act, btn) => `<div class="empty">${I(ic, 34)}<b>${title}</b><p>${text}</p>${act ? `<button class="btn btn-primary btn-sm" type="button" data-act="${act}">${I('plus', 14)}${btn}</button>` : ''}</div>`;
  const stars = n => [1, 2, 3, 4, 5].map(i => `<span class="${i <= n ? 'on' : ''}">${I('star', 14)}</span>`).join('');
  const badgeHtml = p => {
    const off = U.off(p);
    return (p.badge === 'hot' ? '<span class="badge badge-hot">Hot</span>' : '') +
      (p.badge === 'new' ? '<span class="badge badge-new">Mới</span>' : '') +
      (off ? `<span class="badge badge-sale">-${off}%</span>` : '');
  };
  // Bộ 3 nút gạt: Mặc định / Để trống / Tùy chỉnh (chỉ bật được 1)
  const MODES = [['default', 'Mặc định'], ['none', 'Để trống'], ['custom', 'Tùy chỉnh']];
  const modeCtl = (name, cur) => `<div class="modes" role="radiogroup">${MODES.map(([k, l]) =>
    `<label class="mode${k === cur ? ' on' : ''}"><span class="switch"><input type="radio" name="${name}" value="${k}" ${k === cur ? 'checked' : ''}><span></span></span>${l}</label>`).join('')}</div>`;
  function bindMode(root, name, ta, note, customText, defText, what) {
    let custom = customText;
    const cur = () => root.querySelector(`input[name="${name}"]:checked`).value;
    const apply = () => {
      const m = cur();
      $$(`input[name="${name}"]`, root).forEach(r => r.closest('.mode').classList.toggle('on', r.checked));
      ta.classList.toggle('is-default', m === 'default');
      ta.classList.toggle('is-none', m === 'none');
      ta.classList.remove('invalid');
      if (m === 'custom') {
        ta.disabled = false; ta.value = custom; ta.placeholder = `Nhập ${what} riêng cho gói này…`;
        note.textContent = `Bắt buộc nhập nội dung ${what} để lưu.`;
      } else if (m === 'default') {
        ta.disabled = true; ta.value = defText; ta.placeholder = '';
        note.textContent = `Dùng ${what} mặc định, sửa trong Cài đặt › Nội dung mặc định.`;
      } else {
        ta.disabled = true; ta.value = ''; ta.placeholder = `Khách sẽ không thấy phần ${what}.`;
        note.textContent = `Khi lưu, trang khách sẽ không hiện phần ${what} của gói này.`;
      }
    };
    ta.addEventListener('input', () => { if (cur() === 'custom') custom = ta.value; });
    $$(`input[name="${name}"]`, root).forEach(r => r.addEventListener('change', () => { apply(); if (cur() === 'custom') ta.focus(); }));
    apply();
    return () => ({ mode: cur(), text: (cur() === 'custom' ? ta.value : custom).trim() });
  }
  const idOf = el => el && el.closest('[data-id]') && el.closest('[data-id]').dataset.id;

  function fieldErr(root, key, msg) {
    const e = root.querySelector(`[data-err="${key}"]`);
    if (e) {
      e.textContent = msg;
      const inp = e.parentElement.querySelector('.input, .select, .textarea');
      if (inp) {
        inp.classList.remove('invalid'); void inp.offsetWidth; inp.classList.add('invalid'); inp.focus();
        inp.addEventListener('input', () => { inp.classList.remove('invalid'); e.textContent = ''; }, { once: true });
      }
    }
    return false;
  }
  function flashRow(id) {
    requestAnimationFrame(() => {
      const r = document.querySelector(`#view [data-id="${id}"]`);
      if (r) { r.classList.remove('flash'); void r.offsetWidth; r.classList.add('flash'); }
    });
  }
  const snapshot = () => U.clone(D());
  function undo(snap) { Store.replace(snap); A.sel.clear(); updateCounts(); render(false); UI.toast('Đã hoàn tác', 'info'); }
  function commit(msg, opts) { Store.save(); updateCounts(); render(false); if (msg) UI.toast(msg, 'ok', opts); }

  /* ---------- Đăng nhập ---------- */
  function showLogin() {
    $('#app').hidden = true;
    $('#login').hidden = false;
    $('#loginSite').textContent = D().settings.siteName;
    $('#loginHint').hidden = !Store.usingDefaultPassword();
    document.title = 'Đăng nhập · Quản trị';
    setTimeout(() => $('#pw').focus(), 120);
  }
  function bindLogin() {
    $('#loginForm').addEventListener('submit', async e => {
      e.preventDefault();
      const pw = $('#pw').value, btn = $('#loginForm [type="submit"]');
      let ok = false, msg = '';
      btn.disabled = true;
      try { ok = pw ? await Store.auth.login(pw) : false; } catch (err) { msg = err.message; }
      btn.disabled = false;
      if (ok) {
        $('#pw').value = ''; $('#pwErr').textContent = '';
        showApp();
        UI.toast('Đăng nhập thành công');
      } else {
        const card = $('.login-card');
        card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake');
        $('#pwErr').textContent = msg || (pw ? 'Mật khẩu không đúng. Vui lòng thử lại.' : 'Vui lòng nhập mật khẩu.');
        $('#pw').select();
      }
    });
    $('#pwToggle').addEventListener('click', () => {
      const inp = $('#pw'), show = inp.type === 'password';
      inp.type = show ? 'text' : 'password';
      $('#pwToggle').innerHTML = I(show ? 'eyeOff' : 'eye');
      $('#pwToggle').setAttribute('aria-label', show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu');
    });
  }

  /* ---------- Khung ứng dụng ---------- */
  function showApp() {
    $('#login').hidden = true;
    $('#app').hidden = false;
    $('#sbNav').innerHTML = '<span class="sb-ind" id="sbInd"></span>' + Object.entries(ROUTES).map(([k, r]) =>
      `<a class="sb-link" href="#${k}" data-r="${k}" title="${r.t}">${I(r.i, 19)}<span>${r.t}</span><em class="count" data-count="${k}"></em></a>`).join('');
    $('#sbBrand').textContent = D().settings.siteName;
    updateCounts();
    A.route = '';
    route();
    Store.views.load().then(() => { if (A.route === 'dashboard' || A.route === 'prods') render(false); });
  }
  function updateCounts() {
    const d = D();
    const c = { games: d.games.length, cats: d.cats.length, prods: d.prods.length };
    $$('[data-count]').forEach(el => { const v = c[el.dataset.count]; el.textContent = v ?? ''; el.hidden = v == null; });
    $('#sbBrand').textContent = d.settings.siteName;
  }
  function moveInd() {
    const a = $(`.sb-link[data-r="${A.route}"]`), ind = $('#sbInd');
    if (!a || !ind) return;
    ind.style.transform = `translateY(${a.offsetTop}px)`;
    ind.style.height = a.offsetHeight + 'px';
  }
  function toggleSidebar(open) {
    $('#app').classList.toggle('sb-open', open);
    document.documentElement.classList.toggle('no-scroll', open && window.innerWidth <= 860);
  }

  let skipHash = false;
  async function route() {
    if (skipHash) { skipHash = false; return; }
    if (!Store.session.active()) { showLogin(); return; }
    const want = location.hash.slice(1);
    const key = ROUTES[want] ? want : 'dashboard';
    if (A.dirty && DRAFT_ROUTES.includes(A.route) && key !== A.route) {
      const ok = await UI.confirm({ title: 'Bỏ thay đổi chưa lưu?', text: `Các thay đổi trong mục ${ROUTES[A.route].t} chưa được lưu sẽ bị mất.`, ok: 'Bỏ thay đổi', cancel: 'Ở lại', danger: true });
      if (!ok) { skipHash = true; location.hash = A.route; return; }
      discardSettings();
    }
    if (key !== A.route) A.sel.clear();
    if (key !== 'look') stopTest();
    const changed = key !== A.route;
    A.route = key;
    $$('.sb-link[data-r]').forEach(a => a.classList.toggle('active', a.dataset.r === key));
    moveInd();
    $('#pageTitle').textContent = ROUTES[key].t;
    document.title = ROUTES[key].t + ' · Quản trị';
    toggleSidebar(false);
    render(changed);
  }
  function render(anim) {
    const v = $('#view');
    const y = window.scrollY;
    v.onclick = v.onchange = v.oninput = null;
    ROUTES[A.route].r(v);
    UI.hydrate(v);
    if (anim) { v.classList.remove('view-in'); void v.offsetWidth; v.classList.add('view-in'); window.scrollTo(0, 0); }
    else window.scrollTo(0, y);
    updateBulk();
  }

  /* ---------- Sắp xếp: kéo thả + mũi tên ---------- */
  function move(name, id, dir, gk) {
    const a = D()[name];
    const i = a.findIndex(x => x.id === id);
    if (i < 0) return;
    let j = i + dir;
    while (j >= 0 && j < a.length && gk && a[j][gk] !== a[i][gk]) j += dir;
    if (j < 0 || j >= a.length) return;
    [a[i], a[j]] = [a[j], a[i]];
    commit();
    flashRow(id);
  }
  function sortable(tb, name, gk) {
    if (!tb) return;
    let dragId = null;
    const clear = () => $$('[data-id]', tb).forEach(t => t.classList.remove('drop-before', 'drop-after', 'dragging'));
    tb.addEventListener('pointerdown', e => { const g = e.target.closest('.grip'); if (g) g.closest('[data-id]').draggable = true; });
    tb.addEventListener('dragstart', e => {
      const tr = e.target.closest('[data-id]'); if (!tr) return;
      dragId = tr.dataset.id; tr.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      try { e.dataTransfer.setData('text/plain', dragId); } catch (err) { /* bỏ qua */ }
    });
    tb.addEventListener('dragend', e => { const tr = e.target.closest('[data-id]'); if (tr) tr.draggable = false; clear(); dragId = null; });
    tb.addEventListener('dragover', e => {
      if (!dragId) return;
      const tr = e.target.closest('[data-id]');
      if (!tr || tr.dataset.id === dragId) return;
      const a = D()[name], src = a.find(x => x.id === dragId), dst = a.find(x => x.id === tr.dataset.id);
      if (gk && src[gk] !== dst[gk]) return;
      e.preventDefault();
      const r = tr.getBoundingClientRect(), after = e.clientY > r.top + r.height / 2;
      $$('[data-id]', tb).forEach(t => t.classList.remove('drop-before', 'drop-after'));
      tr.classList.add(after ? 'drop-after' : 'drop-before');
    });
    tb.addEventListener('drop', e => {
      e.preventDefault();
      const tr = e.target.closest('[data-id]');
      if (!tr || !dragId || tr.dataset.id === dragId) return;
      const after = tr.classList.contains('drop-after');
      const a = D()[name];
      const [it] = a.splice(a.findIndex(x => x.id === dragId), 1);
      let to = a.findIndex(x => x.id === tr.dataset.id);
      if (after) to++;
      a.splice(to, 0, it);
      const id = dragId; dragId = null;
      commit('Đã cập nhật thứ tự');
      flashRow(id);
    });
  }
  function insertInGroup(a, item, gk) {
    let last = -1;
    a.forEach((x, i) => { if (x[gk] === item[gk]) last = i; });
    if (last < 0) a.push(item); else a.splice(last + 1, 0, item);
  }

  /* =========================================================
     TỔNG QUAN
     ========================================================= */
  function vDash(v) {
    const d = D(), views = Store.views.all();
    const pub = d.prods.filter(p => Store.isPublic(p));
    const sale = d.prods.filter(p => U.off(p));
    const hidden = d.prods.filter(p => !p.visible).length;
    const totalViews = Object.values(views).reduce((a, b) => a + b, 0);
    const kpi = (ic, label, val, sub, go) => `<a class="panel kpi" href="#${go}"><span class="kpi-ic">${I(ic, 20)}</span><span class="kpi-l">${label}</span><b>${val}</b><span class="kpi-s">${sub}</span></a>`;
    const byGame = d.games.map(g => {
      const cids = new Set(d.cats.filter(c => c.gameId === g.id).map(c => c.id));
      return { g, n: d.prods.filter(p => cids.has(p.catId)).length };
    });
    const max = Math.max(1, ...byGame.map(x => x.n));
    const top = Object.entries(views).map(([id, n]) => ({ p: Store.prod(id), n })).filter(x => x.p).sort((a, b) => b.n - a.n).slice(0, 5);

    const warns = [];
    if (Store.usingDefaultPassword()) warns.push(['key', 'Bạn đang dùng mật khẩu mặc định admin123.', 'Đổi mật khẩu', 'settings', 'warn']);
    if (d.settings.maintenanceOn) warns.push(['wrench', 'Chế độ bảo trì đang bật, khách không xem được bảng giá.', 'Mở cài đặt', 'settings', 'warn']);
    d.prods.filter(p => !p.price).forEach(p => warns.push(['tag', `Gói “${p.name}” chưa có giá.`, 'Xem sản phẩm', 'prods', 'warn']));
    d.games.filter(g => !d.cats.some(c => c.gameId === g.id)).forEach(g => warns.push(['folder', `Game “${g.name}” chưa có danh mục nào.`, 'Thêm danh mục', 'cats', 'info']));
    d.cats.filter(c => !d.prods.some(p => p.catId === c.id)).forEach(c => warns.push(['box', `Danh mục “${c.name}” chưa có sản phẩm.`, 'Thêm sản phẩm', 'prods', 'info']));

    const hour = new Date().getHours();
    const hello = hour < 11 ? 'Chào buổi sáng' : hour < 14 ? 'Chào buổi trưa' : hour < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';

    v.innerHTML = `
      <div class="hello">
        <div><h2>${hello}, quản trị viên</h2><p class="muted">Dữ liệu cập nhật lần cuối lúc ${U.dateTime(d.updatedAt)}.</p></div>
        <div class="toolbar"><button class="btn btn-ghost" type="button" data-act="add-game">${I('plus', 16)}Thêm game</button><button class="btn btn-primary" type="button" data-act="add-prod">${I('plus', 16)}Thêm sản phẩm</button></div>
      </div>
      <div class="kpis">
        ${kpi('gamepad', 'Game đang hiện', `${d.games.filter(g => g.visible).length}<small>/${d.games.length}</small>`, 'Bấm để quản lý game', 'games')}
        ${kpi('folder', 'Danh mục', d.cats.length, `${d.cats.filter(c => !c.visible).length} danh mục đang ẩn`, 'cats')}
        ${kpi('box', 'Sản phẩm', d.prods.length, `${pub.length} gói khách đang thấy · ${hidden} ẩn`, 'prods')}
        ${kpi('tag', 'Đang giảm giá', sale.length, 'Gói có giá gốc cao hơn giá bán', 'prods')}
        ${kpi('eye', 'Lượt xem gói', U.num(totalViews), 'Tính trên trình duyệt này', 'backup')}
      </div>
      <div class="grid-2">
        <section class="panel"><div class="panel-h"><h2>Sản phẩm theo game</h2></div>
          <div class="panel-b bars">${byGame.length ? byGame.map(x => `<div class="bar-row">${avatar(x.g, 'xs')}<span class="bar-name">${U.esc(x.g.name)}</span><span class="bar-track"><span class="bar-fill" style="--c:${U.esc(x.g.color)}" data-w="${(x.n / max) * 100}"></span></span><b>${x.n}</b></div>`).join('') : '<p class="muted">Chưa có game.</p>'}</div>
        </section>
        <section class="panel"><div class="panel-h"><h2>Xem nhiều nhất</h2><span class="muted small ml-auto">Trên trình duyệt này</span></div>
          <div class="panel-b">${top.length ? `<ol class="toplist">${top.map((x, i) => {
            const c = Store.cat(x.p.catId), g = c && Store.game(c.gameId);
            return `<li><span class="rank">${i + 1}</span>${g ? avatar(g, 'xs') : ''}<span class="tl-main"><b>${U.esc(x.p.name)}</b><small>${g ? U.esc(g.name) + ' › ' : ''}${c ? U.esc(c.name) : ''}</small></span><span class="tl-n">${x.n} lượt</span></li>`;
          }).join('')}</ol>` : emptyState('eye', 'Chưa có lượt xem', 'Mở trang khách và bấm vào vài gói, số liệu sẽ hiện ở đây.')}</div>
        </section>
      </div>
      <section class="panel"><div class="panel-h"><h2>Cần chú ý</h2><span class="badge ${warns.length ? 'badge-hot' : 'badge-new'}">${warns.length ? warns.length + ' mục' : 'Mọi thứ ổn'}</span></div>
        <div class="panel-b">${warns.length ? `<ul class="warns">${warns.slice(0, 8).map(w => `<li class="w-${w[4]}"><span class="w-ic">${I(w[0], 17)}</span><span class="w-t">${U.esc(w[1])}</span><a class="btn btn-sm btn-ghost" href="#${w[3]}">${w[2]}</a></li>`).join('')}</ul>${warns.length > 8 ? `<p class="muted small">Và ${warns.length - 8} mục khác.</p>` : ''}` : emptyState('check', 'Không có gì cần xử lý', 'Bảng giá đầy đủ và đang hiển thị bình thường.')}</div>
      </section>`;
    requestAnimationFrame(() => requestAnimationFrame(() => $$('.bar-fill', v).forEach(b => { b.style.width = b.dataset.w + '%'; })));
    v.onclick = e => {
      const a = e.target.closest('[data-act]'); if (!a) return;
      if (a.dataset.act === 'add-game') gameForm();
      if (a.dataset.act === 'add-prod') prodForm();
    };
  }

  /* =========================================================
     GAME
     ========================================================= */
  function vGames(v) {
    const d = D();
    v.innerHTML = `<section class="panel">
      <div class="panel-h"><div><h2>Danh sách game</h2><p class="muted small">Kéo biểu tượng ${I('grip', 13, 'inline')} hoặc bấm mũi tên để đổi thứ tự hiển thị trong ô chọn game.</p></div>
        <button class="btn btn-primary ml-auto" type="button" data-act="add">${I('plus', 16)}Thêm game</button></div>
      ${d.games.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th class="w-drag"></th><th>Game</th><th class="num">Danh mục</th><th class="num">Sản phẩm</th><th>Hiển thị</th><th class="num">Thao tác</th></tr></thead>
      <tbody>${d.games.map((g, i) => {
        const cs = d.cats.filter(c => c.gameId === g.id), cids = new Set(cs.map(c => c.id));
        const pn = d.prods.filter(p => cids.has(p.catId)).length;
        return `<tr data-id="${g.id}" class="${g.visible ? '' : 'is-hidden'}">
          <td class="w-drag">${dragCell(i === 0, i === d.games.length - 1)}</td>
          <td><div class="cell-main">${avatar(g)}<div><b>${U.esc(g.name)}</b><small>${U.esc(g.desc || '')}</small></div></div></td>
          <td class="num"><a class="lnk" href="#cats" data-act="goto-cats">${cs.length}</a></td>
          <td class="num"><a class="lnk" href="#prods" data-act="goto-prods">${pn}</a></td>
          <td>${sw(g.visible, 'data-act="vis" aria-label="Hiển thị ' + U.esc(g.name) + '"')}</td>
          <td class="num"><div class="row-actions">${rowBtn('edit', 'edit', 'Sửa')}${rowBtn('trash', 'trash', 'Xóa', 'danger')}</div></td></tr>`;
      }).join('')}</tbody></table></div>` : emptyState('gamepad', 'Chưa có game nào', 'Thêm game đầu tiên để bắt đầu tạo bảng giá.', 'add', 'Thêm game')}
    </section>`;
    v.onclick = e => {
      const b = e.target.closest('[data-act]'); if (!b) return;
      const id = idOf(b), act = b.dataset.act;
      if (act === 'add') gameForm();
      else if (act === 'edit') gameForm(id);
      else if (act === 'trash') delGame(id);
      else if (act === 'up' || act === 'down') move('games', id, act === 'up' ? -1 : 1);
      else if (act === 'goto-cats') A.cf.game = id;
      else if (act === 'goto-prods') { OPEN.pg.add(id); A.pf.q = ''; A.pf.status = 'all'; }
    };
    v.onchange = e => {
      if (!e.target.matches('[data-act="vis"]')) return;
      const g = Store.game(idOf(e.target));
      g.visible = e.target.checked;
      commit(g.visible ? `Đã hiện “${g.name}”` : `Đã ẩn “${g.name}” khỏi trang khách`);
    };
    sortable($('tbody', v), 'games');
  }

  function gameForm(id) {
    const g = id ? Store.game(id) : null;
    const f = g ? { ...g } : { name: '', initials: '', color: COLORS[6], desc: '', visible: true };
    const m = UI.modal({
      cls: 'big narrow',
      html: `<div class="dr-h"><h3>${g ? 'Sửa game' : 'Thêm game'}</h3><button class="btn btn-icon btn-ghost" type="button" data-close aria-label="Đóng">${I('x')}</button></div>
      <form class="dr-b" id="gf" novalidate>
        <div class="preview-av"><span class="av lg" id="gfAv" style="--c:${U.esc(f.color)}"></span><div><b id="gfName"></b><small class="muted" id="gfDesc"></small></div></div>
        <div class="field"><label for="gName">Tên game</label><input class="input" id="gName" value="${U.esc(f.name)}" placeholder="Ví dụ: Liên Quân Mobile" maxlength="60"><span class="err" data-err="name"></span></div>
        <div class="form-grid">
          <div class="field"><label for="gIni">Chữ viết tắt</label><input class="input" id="gIni" maxlength="3" value="${U.esc(f.initials)}" placeholder="Tự động"><span class="hint">Tối đa 3 ký tự, hiện trong ô biểu tượng.</span></div>
          <div class="field"><span class="label">Hiển thị cho khách</span><label class="switch-row">${sw(f.visible, 'id="gVis"')}<span>Đang hiện</span></label></div>
        </div>
        <div class="field"><span class="label">Màu biểu tượng</span>
          <div class="swatches" id="gCol">${COLORS.map(c => `<button type="button" class="sw${c === f.color ? ' on' : ''}" style="--c:${c}" data-c="${c}" aria-label="Màu ${c}">${I('check', 14)}</button>`).join('')}
          <label class="sw custom${COLORS.includes(f.color) ? '' : ' on'}" title="Chọn màu khác" style="--c:${U.esc(f.color)}"><input type="color" id="gColor" value="${U.esc(f.color)}" aria-label="Chọn màu khác">${I('plus', 14)}</label></div></div>
        <div class="field"><label for="gDesc">Mô tả ngắn</label><input class="input" id="gDesc" value="${U.esc(f.desc)}" placeholder="Ví dụ: MOBA 5v5 phổ biến nhất Việt Nam" maxlength="80"></div>
        <button type="submit" hidden></button>
      </form>
      <div class="dr-f"><button class="btn btn-ghost" type="button" data-close>Hủy</button><button class="btn btn-primary" type="button" id="gSave">${I('check', 16)}${g ? 'Lưu thay đổi' : 'Thêm game'}</button></div>`
    });
    const el = m.el, q = s => el.querySelector(s);
    const upd = () => {
      q('#gfAv').textContent = (q('#gIni').value.trim() || U.initials(q('#gName').value) || '?').toUpperCase();
      q('#gfAv').style.setProperty('--c', f.color);
      q('#gfName').textContent = q('#gName').value || 'Tên game';
      q('#gfDesc').textContent = q('#gDesc').value || 'Mô tả ngắn';
    };
    upd();
    el.addEventListener('input', upd);
    q('#gCol').addEventListener('click', e => {
      const b = e.target.closest('.sw[data-c]'); if (!b) return;
      f.color = b.dataset.c;
      $$('.sw', el).forEach(s => s.classList.toggle('on', s === b));
      upd();
    });
    q('#gColor').addEventListener('input', e => {
      f.color = e.target.value;
      $$('.sw', el).forEach(s => s.classList.remove('on'));
      const c = q('.sw.custom'); c.classList.add('on'); c.style.setProperty('--c', f.color);
      upd();
    });
    const save = () => {
      const name = q('#gName').value.trim();
      if (!name) return fieldErr(el, 'name', 'Vui lòng nhập tên game.');
      if (D().games.some(x => x.id !== id && U.fold(x.name) === U.fold(name))) return fieldErr(el, 'name', 'Đã có game trùng tên.');
      const data = { name, initials: q('#gIni').value.trim().toUpperCase(), color: f.color, desc: q('#gDesc').value.trim(), visible: q('#gVis').checked };
      let nid = id;
      if (g) Object.assign(g, data);
      else { nid = U.uid('g'); D().games.push({ id: nid, slug: U.slug(name), ...data }); }
      m.close();
      commit(g ? 'Đã lưu game' : `Đã thêm game “${name}”`);
      flashRow(nid);
    };
    q('#gSave').addEventListener('click', save);
    q('#gf').addEventListener('submit', e => { e.preventDefault(); save(); });
  }

  async function delGame(id) {
    const d = D(), g = Store.game(id);
    const cids = new Set(d.cats.filter(c => c.gameId === id).map(c => c.id));
    const pn = d.prods.filter(p => cids.has(p.catId)).length;
    const ok = await UI.confirm({
      title: `Xóa game “${g.name}”?`,
      text: `Thao tác này xóa luôn <b>${cids.size} danh mục</b> và <b>${pn} sản phẩm</b> của game. Bạn có thể bấm Hoàn tác ngay sau khi xóa.`,
      ok: 'Xóa game', danger: true
    });
    if (!ok) return;
    const snap = snapshot();
    d.games = d.games.filter(x => x.id !== id);
    d.cats = d.cats.filter(c => !cids.has(c.id));
    d.prods = d.prods.filter(p => !cids.has(p.catId));
    commit(`Đã xóa game “${g.name}”`, { action: 'Hoàn tác', onAction: () => undo(snap) });
  }

  /* =========================================================
     DANH MỤC
     ========================================================= */
  // Trạng thái mở/đóng của cây (giữ nguyên khi vẽ lại)
  const OPEN = { cg: new Set(), pg: new Set(), pc: new Set() };
  const chev = open => `<span class="tree-chev${open ? ' on' : ''}">${I('chevDown', 18)}</span>`;
  function toggleTree(btn, set) {
    const box = btn.closest('[data-node]'), id = box.dataset.node;
    const open = !box.classList.contains('open');
    box.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', String(open));
    if (open) set.add(id); else set.delete(id);
  }

  function vCats(v) {
    const d = D();
    if (A.cf.game) { OPEN.cg.add(A.cf.game); A.cf.game = ''; }
    v.innerHTML = `<div class="tree-top"><div><h2>Danh mục theo game</h2><p class="muted small">Bấm vào một game để xem và thêm danh mục của game đó. Kéo ${I('grip', 13, 'inline')} hoặc bấm mũi tên để đổi thứ tự.</p></div>
        <div class="toolbar"><button class="btn btn-ghost btn-sm" type="button" data-act="open-all">Mở tất cả</button><button class="btn btn-ghost btn-sm" type="button" data-act="close-all">Thu gọn</button></div></div>
      ${d.games.length ? `<div class="tree">${d.games.map(g => {
        const cats = d.cats.filter(c => c.gameId === g.id), open = OPEN.cg.has(g.id);
        return `<section class="tree-g panel${open ? ' open' : ''}${g.visible ? '' : ' g-off'}" data-node="${g.id}">
          <div class="tree-h">
            <button class="tree-tg" type="button" data-toggle="g" aria-expanded="${open}">${avatar(g)}<span class="tree-t"><b>${U.esc(g.name)}</b><small>${cats.length} danh mục${g.visible ? '' : ' · game đang ẩn'}</small></span>${chev(open)}</button>
            <button class="btn btn-soft btn-sm" type="button" data-act="add-cat" data-g="${g.id}">${I('plus', 14)}<span class="hide-xs">Thêm danh mục</span></button>
          </div>
          <div class="tree-body"><div>
            ${cats.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th class="w-drag"></th><th>Danh mục</th><th class="num">Số gói</th><th class="num">Giá từ</th><th>Hiển thị</th><th class="num">Thao tác</th></tr></thead>
            <tbody>${cats.map((c, k) => {
              const ps = d.prods.filter(p => p.catId === c.id);
              return `<tr data-id="${c.id}" class="${c.visible ? '' : 'is-hidden'}">
                <td class="w-drag">${dragCell(k === 0, k === cats.length - 1)}</td>
                <td><b>${U.esc(c.name)}</b></td>
                <td class="num"><a class="lnk" href="#prods" data-act="goto">${ps.length} gói</a></td>
                <td class="num">${ps.length ? U.fmt(Math.min(...ps.map(p => p.price))) : '—'}</td>
                <td>${sw(c.visible, 'data-act="vis" aria-label="Hiển thị ' + U.esc(c.name) + '"')}</td>
                <td class="num"><div class="row-actions">${rowBtn('edit', 'edit', 'Sửa')}${rowBtn('trash', 'trash', 'Xóa', 'danger')}</div></td></tr>`;
            }).join('')}</tbody></table></div>`
            : `<div class="tree-empty">${I('folder', 22)}<span>Game này chưa có danh mục.</span><button class="btn btn-primary btn-sm" type="button" data-act="add-cat" data-g="${g.id}">${I('plus', 14)}Thêm danh mục đầu tiên</button></div>`}
          </div></div></section>`;
      }).join('')}</div>` : `<section class="panel">${emptyState('gamepad', 'Chưa có game nào', 'Hãy thêm game trước, sau đó thêm danh mục cho từng game.', 'goto-games', 'Thêm game')}</section>`}`;
    v.onclick = e => {
      const t = e.target.closest('[data-toggle]');
      if (t) { toggleTree(t, OPEN.cg); return; }
      const b = e.target.closest('[data-act]'); if (!b) return;
      const id = idOf(b), act = b.dataset.act;
      if (act === 'add-cat') catForm(null, b.dataset.g);
      else if (act === 'open-all') { d.games.forEach(g => OPEN.cg.add(g.id)); render(false); }
      else if (act === 'close-all') { OPEN.cg.clear(); render(false); }
      else if (act === 'goto-games') { location.hash = 'games'; setTimeout(() => gameForm(), 300); }
      else if (act === 'edit') catForm(id);
      else if (act === 'trash') delCat(id);
      else if (act === 'up' || act === 'down') move('cats', id, act === 'up' ? -1 : 1, 'gameId');
      else if (act === 'goto') { const c = Store.cat(id); OPEN.pg.add(c.gameId); OPEN.pc.add(c.id); }
    };
    v.onchange = e => {
      if (!e.target.matches('[data-act="vis"]')) return;
      const c = Store.cat(idOf(e.target));
      c.visible = e.target.checked;
      commit(c.visible ? `Đã hiện “${c.name}”` : `Đã ẩn “${c.name}”`);
    };
    $$('tbody', v).forEach(tb => sortable(tb, 'cats', 'gameId'));
  }

  function catForm(id, presetGame) {
    const d = D();
    if (!d.games.length) { UI.toast('Hãy thêm game trước khi tạo danh mục.', 'err'); location.hash = 'games'; return; }
    const c = id ? Store.cat(id) : null;
    const gameId = c ? c.gameId : (presetGame || d.games[0].id);
    const m = UI.modal({
      cls: 'form-modal',
      html: `<div class="md-h"><h3>${c ? 'Sửa danh mục' : 'Thêm danh mục'}</h3><button class="btn btn-icon btn-ghost" type="button" data-close aria-label="Đóng">${I('x')}</button></div>
      <form class="md-b" id="cf" novalidate>
        <div class="field"><label for="cGame">Thuộc game</label><select class="select" id="cGame">${d.games.map(g => `<option value="${g.id}" ${g.id === gameId ? 'selected' : ''}>${U.esc(g.name)}</option>`).join('')}</select></div>
        <div class="field"><label for="cName">Tên danh mục</label><input class="input" id="cName" value="${U.esc(c ? c.name : '')}" placeholder="Ví dụ: Cày rank" maxlength="60"><span class="err" data-err="name"></span></div>
        <label class="switch-row">${sw(c ? c.visible : true, 'id="cVis"')}<span>Hiển thị cho khách</span></label>
        <button type="submit" hidden></button>
      </form>
      <div class="md-f">${c ? '' : '<button class="btn btn-ghost" type="button" id="cMore">Lưu & thêm tiếp</button><span class="spacer"></span>'}<button class="btn btn-ghost" type="button" data-close>Hủy</button><button class="btn btn-primary" type="button" id="cSave">${c ? 'Lưu' : 'Thêm'}</button></div>`
    });
    const el = m.el, q = s => el.querySelector(s);
    const save = more => {
      const name = q('#cName').value.trim(), gid = q('#cGame').value;
      if (!name) return fieldErr(el, 'name', 'Vui lòng nhập tên danh mục.');
      if (d.cats.some(x => x.id !== id && x.gameId === gid && U.fold(x.name) === U.fold(name))) return fieldErr(el, 'name', 'Game này đã có danh mục trùng tên.');
      let nid = id;
      if (c) {
        const moved = c.gameId !== gid;
        Object.assign(c, { name, visible: q('#cVis').checked });
        if (moved) { d.cats.splice(d.cats.indexOf(c), 1); c.gameId = gid; insertInGroup(d.cats, c, 'gameId'); }
      } else {
        nid = U.uid('c');
        insertInGroup(d.cats, { id: nid, gameId: gid, name, visible: q('#cVis').checked }, 'gameId');
      }
      Store.save(); updateCounts();
      OPEN.cg.add(gid); OPEN.pg.add(gid);
      if (more) {
        UI.toast(`Đã thêm “${name}”. Nhập danh mục tiếp theo.`);
        q('#cName').value = ''; q('#cName').focus();
        render(false);
      } else {
        m.close(); render(false); UI.toast(c ? 'Đã lưu danh mục' : `Đã thêm danh mục “${name}”`); flashRow(nid);
      }
    };
    q('#cSave').addEventListener('click', () => save(false));
    if (q('#cMore')) q('#cMore').addEventListener('click', () => save(true));
    q('#cf').addEventListener('submit', e => { e.preventDefault(); save(false); });
  }

  async function delCat(id) {
    const d = D(), c = Store.cat(id);
    const pn = d.prods.filter(p => p.catId === id).length;
    const ok = await UI.confirm({
      title: `Xóa danh mục “${c.name}”?`,
      text: pn ? `Danh mục có <b>${pn} sản phẩm</b>, tất cả sẽ bị xóa theo.` : 'Danh mục này chưa có sản phẩm.',
      ok: 'Xóa danh mục', danger: true
    });
    if (!ok) return;
    const snap = snapshot();
    d.cats = d.cats.filter(x => x.id !== id);
    d.prods = d.prods.filter(p => p.catId !== id);
    commit(`Đã xóa danh mục “${c.name}”`, { action: 'Hoàn tác', onAction: () => undo(snap) });
  }

  /* =========================================================
     SẢN PHẨM
     ========================================================= */
  // Sản phẩm khớp ô tìm kiếm + trạng thái
  function prodMatch(p, c) {
    const f = A.pf, fq = U.fold(f.q).trim();
    if (fq && !U.fold(p.name + ' ' + c.name).includes(fq)) return false;
    switch (f.status) {
      case 'on': return p.visible;
      case 'off': return !p.visible;
      case 'sale': return U.off(p) > 0;
      case 'hot': return p.badge === 'hot';
      case 'new': return p.badge === 'new';
      default: return true;
    }
  }
  const filtering = () => !!(U.fold(A.pf.q).trim() || A.pf.status !== 'all');

  function vProds(v) {
    const f = A.pf;
    v.innerHTML = `<div class="tree-top"><div><h2>Sản phẩm theo game › danh mục</h2><p class="muted small" id="pCount"></p></div>
        <div class="toolbar"><button class="btn btn-ghost btn-sm" type="button" data-act="open-all">Mở tất cả</button><button class="btn btn-ghost btn-sm" type="button" data-act="close-all">Thu gọn</button></div></div>
      <div class="filters panel">
        <label class="search-in">${I('search', 16)}<input class="input" id="pQ" placeholder="Tìm theo tên gói hoặc danh mục…" value="${U.esc(f.q)}" aria-label="Tìm sản phẩm"></label>
        <select class="select" id="pStatus" aria-label="Lọc theo trạng thái">${[['all', 'Mọi trạng thái'], ['on', 'Đang hiện'], ['off', 'Đang ẩn'], ['sale', 'Đang giảm giá'], ['hot', 'Nhãn Hot'], ['new', 'Nhãn Mới']].map(([k, l]) => `<option value="${k}" ${k === f.status ? 'selected' : ''}>${l}</option>`).join('')}</select>
        <button class="btn btn-ghost btn-sm" type="button" data-act="clear-f" id="pClear" ${filtering() ? '' : 'hidden'}>${I('x', 14)}Bỏ lọc</button>
      </div>
      <div id="pTree"></div>`;
    renderProdTree();
    $('#pQ', v).addEventListener('input', U.debounce(e => { f.q = e.target.value; renderProdTree(); }, 150));
    $('#pStatus', v).addEventListener('change', e => { f.status = e.target.value; renderProdTree(); });
    v.onclick = e => {
      const t = e.target.closest('[data-toggle]');
      if (t) { toggleTree(t, t.dataset.toggle === 'g' ? OPEN.pg : OPEN.pc); return; }
      const b = e.target.closest('[data-act]'); if (!b) return;
      const id = idOf(b), act = b.dataset.act, d = D();
      if (act === 'add-prod') prodForm(null, { cat: b.dataset.c });
      else if (act === 'add-cat') catForm(null, b.dataset.g);
      else if (act === 'open-all') { d.games.forEach(g => OPEN.pg.add(g.id)); d.cats.forEach(c => OPEN.pc.add(c.id)); renderProdTree(); }
      else if (act === 'close-all') { OPEN.pg.clear(); OPEN.pc.clear(); renderProdTree(); }
      else if (act === 'clear-f') { f.q = ''; f.status = 'all'; render(false); }
      else if (act === 'edit') prodForm(id);
      else if (act === 'dup') dupProd(id);
      else if (act === 'trash') delProds([id]);
      else if (act === 'qprice') quickPrice(b);
      else if (act === 'up' || act === 'down') move('prods', id, act === 'up' ? -1 : 1, 'catId');
    };
    v.onchange = e => {
      const t = e.target;
      if (t.matches('[data-act="vis"]')) {
        const p = Store.prod(idOf(t)); p.visible = t.checked;
        Store.save(); updateCounts();
        t.closest('tr').classList.toggle('is-hidden', !p.visible);
        UI.toast(p.visible ? `Đã hiện “${p.name}”` : `Đã ẩn “${p.name}”`);
      } else if (t.matches('[data-act="sel"]')) {
        const id = idOf(t);
        if (t.checked) A.sel.add(id); else A.sel.delete(id);
        t.closest('tr').classList.toggle('sel', t.checked);
        syncAllCheck(t.closest('table')); updateBulk();
      } else if (t.matches('[data-act="all"]')) {
        $$('tbody [data-act="sel"]', t.closest('table')).forEach(cb => {
          const id = idOf(cb);
          cb.checked = t.checked; cb.closest('tr').classList.toggle('sel', t.checked);
          if (t.checked) A.sel.add(id); else A.sel.delete(id);
        });
        updateBulk();
      }
    };
  }

  function syncAllCheck(table) {
    const all = table && $('[data-act="all"]', table); if (!all) return;
    const boxes = $$('tbody [data-act="sel"]', table);
    const n = boxes.filter(b => b.checked).length;
    all.checked = boxes.length > 0 && n === boxes.length;
    all.indeterminate = n > 0 && n < boxes.length;
  }

  function prodTable(list) {
    const d = D(), views = Store.views.all(), order = !filtering();
    return `<div class="tbl-wrap"><table class="tbl tbl-prods"><thead><tr>
        <th class="w-check"><label class="check"><input type="checkbox" data-act="all" aria-label="Chọn tất cả trong danh mục"><span></span></label></th>
        ${order ? '<th class="w-drag"></th>' : ''}<th>Sản phẩm</th><th class="num">Giá bán</th><th class="num">Giá gốc</th><th>Thời gian</th><th class="num">Lượt xem</th><th>Hiển thị</th><th class="num">Thao tác</th></tr></thead>
      <tbody>${list.map(p => {
        const sib = d.prods.filter(x => x.catId === p.catId), k = sib.indexOf(p);
        return `<tr data-id="${p.id}" class="${p.visible ? '' : 'is-hidden'}${A.sel.has(p.id) ? ' sel' : ''}">
          <td class="w-check"><label class="check"><input type="checkbox" data-act="sel" ${A.sel.has(p.id) ? 'checked' : ''} aria-label="Chọn ${U.esc(p.name)}"><span></span></label></td>
          ${order ? `<td class="w-drag">${dragCell(k === 0, k === sib.length - 1)}</td>` : ''}
          <td><div class="cell-main"><div><b>${U.esc(p.name)} ${badgeHtml(p)}</b></div></div></td>
          <td class="num"><button class="qprice" type="button" data-act="qprice" title="Bấm để sửa nhanh giá">${U.fmt(p.price)}${I('edit', 12)}</button></td>
          <td class="num muted">${p.oldPrice ? `<s>${U.fmt(p.oldPrice)}</s>` : '—'}</td>
          <td class="nowrap">${U.esc(p.time || '—')}</td>
          <td class="num">${views[p.id] || 0}</td>
          <td>${sw(p.visible, 'data-act="vis" aria-label="Hiển thị ' + U.esc(p.name) + '"')}</td>
          <td class="num"><div class="row-actions">${rowBtn('edit', 'edit', 'Sửa')}${rowBtn('dup', 'copy', 'Nhân bản')}${rowBtn('trash', 'trash', 'Xóa', 'danger')}</div></td></tr>`;
      }).join('')}</tbody></table></div>`;
  }

  function renderProdTree() {
    const box = $('#pTree'); if (!box) return;
    const d = D(), fil = filtering();
    $('#pClear') && ($('#pClear').hidden = !fil);
    let shown = 0;
    const html = d.games.map(g => {
      const cats = d.cats.filter(c => c.gameId === g.id);
      const blocks = cats.map(c => {
        const all = d.prods.filter(p => p.catId === c.id);
        const list = all.filter(p => prodMatch(p, c));
        if (fil && !list.length) return '';
        shown += list.length;
        const open = fil || OPEN.pc.has(c.id);
        return `<div class="tree-c${open ? ' open' : ''}${c.visible ? '' : ' c-off'}" data-node="${c.id}">
          <div class="tree-h">
            <button class="tree-tg" type="button" data-toggle="c" aria-expanded="${open}"><span class="rc-ic">${I('folder', 16)}</span><span class="tree-t"><b>${U.esc(c.name)}</b><small>${fil ? `${list.length}/${all.length}` : all.length} gói${all.length ? ' · từ ' + U.fmt(Math.min(...all.map(p => p.price))) : ''}${c.visible ? '' : ' · danh mục đang ẩn'}</small></span>${chev(open)}</button>
            <button class="btn btn-soft btn-sm" type="button" data-act="add-prod" data-c="${c.id}">${I('plus', 14)}<span class="hide-xs">Thêm sản phẩm</span></button>
          </div>
          <div class="tree-body"><div>${list.length ? prodTable(list)
            : `<div class="tree-empty">${I('box', 22)}<span>Danh mục này chưa có sản phẩm.</span><button class="btn btn-primary btn-sm" type="button" data-act="add-prod" data-c="${c.id}">${I('plus', 14)}Thêm sản phẩm đầu tiên</button></div>`}</div></div>
        </div>`;
      }).join('');
      if (fil && !blocks) return '';
      const n = d.prods.filter(p => cats.some(c => c.id === p.catId)).length;
      const open = fil || OPEN.pg.has(g.id);
      return `<section class="tree-g panel${open ? ' open' : ''}${g.visible ? '' : ' g-off'}" data-node="${g.id}">
        <div class="tree-h">
          <button class="tree-tg" type="button" data-toggle="g" aria-expanded="${open}">${avatar(g)}<span class="tree-t"><b>${U.esc(g.name)}</b><small>${cats.length} danh mục · ${n} sản phẩm${g.visible ? '' : ' · game đang ẩn'}</small></span>${chev(open)}</button>
        </div>
        <div class="tree-body"><div class="tree-cats">${blocks || `<div class="tree-empty">${I('folder', 22)}<span>Game này chưa có danh mục, hãy tạo danh mục trước.</span><button class="btn btn-primary btn-sm" type="button" data-act="add-cat" data-g="${g.id}">${I('plus', 14)}Thêm danh mục</button></div>`}</div></div>
      </section>`;
    }).join('');
    box.innerHTML = html ? `<div class="tree">${html}</div>`
      : `<section class="panel">${d.games.length ? emptyState('search', 'Không có sản phẩm phù hợp', 'Thử đổi từ khóa hoặc bỏ lọc trạng thái.') : emptyState('gamepad', 'Chưa có game nào', 'Hãy thêm game và danh mục trước.')}</section>`;
    $('#pCount').textContent = fil ? `Tìm thấy ${shown} / ${d.prods.length} sản phẩm.` : `${d.prods.length} sản phẩm trong ${d.cats.length} danh mục. Bấm game rồi bấm danh mục để xem và thêm sản phẩm.`;
    UI.hydrate(box);
    $$('table', box).forEach(tb => { syncAllCheck(tb); if (!fil) sortable($('tbody', tb), 'prods', 'catId'); });
    updateBulk();
  }

  function quickPrice(btn) {
    const p = Store.prod(idOf(btn)), td = btn.parentElement;
    td.innerHTML = `<div class="input-suffix q-wrap"><input class="input q-in" value="${U.num(p.price)}" inputmode="numeric" aria-label="Giá mới"><span>đ</span></div>`;
    const inp = td.querySelector('input');
    inp.focus(); inp.select();
    let done = false;
    const fin = save => {
      if (done) return; done = true;
      if (save) {
        const v = U.parseNum(inp.value);
        if (v > 0 && v !== p.price) { p.price = v; Store.save(); UI.toast(`Đã đổi giá “${p.name}” thành ${U.fmt(v)}`); }
      }
      renderProdTree(); flashRow(p.id);
    };
    inp.addEventListener('input', () => U.moneyMask(inp));
    inp.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); fin(true); }
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); fin(false); }
    });
    inp.addEventListener('blur', () => fin(true));
  }

  function dupProd(id) {
    const d = D(), p = Store.prod(id);
    const np = { ...p, id: U.uid('p'), name: p.name + ' (bản sao)', visible: false };
    d.prods.splice(d.prods.indexOf(p) + 1, 0, np);
    commit('Đã nhân bản. Bản sao đang ẩn, sửa xong hãy bật hiển thị.');
    flashRow(np.id);
  }

  function delProds(ids) {
    const d = D(), snap = snapshot();
    const set = new Set(ids);
    const name = ids.length === 1 ? `“${Store.prod(ids[0]).name}”` : `${ids.length} sản phẩm`;
    d.prods = d.prods.filter(p => !set.has(p.id));
    ids.forEach(id => A.sel.delete(id));
    commit(`Đã xóa ${name}`, { action: 'Hoàn tác', onAction: () => undo(snap) });
  }

  function prodForm(id, preset = {}) {
    const d = D();
    if (!d.cats.length) { UI.toast('Hãy tạo game và danh mục trước khi thêm sản phẩm.', 'err'); location.hash = d.games.length ? 'cats' : 'games'; return; }
    const p = id ? Store.prod(id) : null;
    const c0 = p ? Store.cat(p.catId) : Store.cat(preset.cat || A.pf.cat);
    const gameId = c0 ? c0.gameId : (A.pf.game || (d.cats[0] && d.cats[0].gameId));
    const f = p ? { ...p } : { name: '', price: 0, oldPrice: 0, time: '', badge: '', desc: '', notes: '', visible: true, catId: c0 ? c0.id : '' };
    const s = d.settings;
    const m = UI.modal({
      cls: 'big',
      html: `<div class="dr-h"><h3>${p ? 'Sửa sản phẩm' : 'Thêm sản phẩm'}</h3><button class="btn btn-icon btn-ghost" type="button" data-close aria-label="Đóng">${I('x')}</button></div>
      <form class="dr-b" id="pf" novalidate>
        <div class="pv"><span class="pv-l">Xem trước trên trang khách</span>
          <div class="pv-row"><span class="radio on"></span><span class="pv-main"><b id="pvName"></b><small id="pvTime"></small></span><span class="pv-pr"><b id="pvPrice"></b><s id="pvOld"></s></span></div></div>
        <div class="form-grid">
          <div class="field"><label for="fGame">Game</label><select class="select" id="fGame">${d.games.map(g => `<option value="${g.id}" ${g.id === gameId ? 'selected' : ''}>${U.esc(g.name)}</option>`).join('')}</select></div>
          <div class="field"><label for="fCat">Danh mục</label><select class="select" id="fCat"></select><span class="err" data-err="cat"></span></div>
          <div class="field full"><label for="fName">Tên gói</label><input class="input" id="fName" value="${U.esc(f.name)}" placeholder="Ví dụ: Kim Cương → Tinh Anh" maxlength="80"><span class="err" data-err="name"></span></div>
          <div class="field"><label for="fPrice">Giá bán</label><div class="input-suffix"><input class="input" id="fPrice" inputmode="numeric" value="${f.price ? U.num(f.price) : ''}" placeholder="150.000"><span>đ</span></div><span class="err" data-err="price"></span></div>
          <div class="field"><label for="fOld">Giá gốc <em class="opt-l">(không bắt buộc)</em></label><div class="input-suffix"><input class="input" id="fOld" inputmode="numeric" value="${f.oldPrice ? U.num(f.oldPrice) : ''}" placeholder="Để trống nếu không giảm"><span>đ</span></div><span class="hint" id="offHint"></span></div>
          <div class="field"><label for="fTime">Thời gian hoàn thành</label><input class="input" id="fTime" value="${U.esc(f.time)}" placeholder="Ví dụ: 2–3 ngày" list="timeList" maxlength="30">
            <datalist id="timeList">${['1 ngày', '1–2 ngày', '2 ngày', '2–3 ngày', '3–5 ngày', '5–7 ngày', '7 ngày', '7–10 ngày', '30 ngày'].map(t => `<option value="${t}">`).join('')}</datalist></div>
          <div class="field"><span class="label">Nhãn</span><div class="seg full" id="fBadge">${[['', 'Không'], ['hot', 'Hot'], ['new', 'Mới']].map(([k, l]) => `<button type="button" data-v="${k}" class="${f.badge === k ? 'on' : ''}">${l}</button>`).join('')}</div></div>
          <div class="field full"><span class="label">Mô tả</span>${modeCtl('fDescMode', p ? U.descMode(p) : 'default')}
            <textarea class="textarea" id="fDesc" rows="4" aria-label="Mô tả"></textarea><span class="mode-note" id="fDescNote"></span><span class="err" data-err="desc"></span></div>
          <div class="field full"><span class="label">Lưu ý (mỗi dòng một ý)</span>${modeCtl('fNotesMode', p ? U.notesMode(p) : 'default')}
            <textarea class="textarea" id="fNotes" rows="4" aria-label="Lưu ý"></textarea><span class="mode-note" id="fNotesNote"></span><span class="err" data-err="notes"></span></div>
          <label class="switch-row full">${sw(f.visible, 'id="fVis"')}<span><b>Hiển thị cho khách</b><small class="muted block">Tắt để ẩn gói mà không cần xóa.</small></span></label>
        </div>
        <button type="submit" hidden></button>
      </form>
      <div class="dr-f">${p ? '' : '<button class="btn btn-ghost" type="button" id="fMore">Lưu & thêm tiếp</button>'}<span class="spacer"></span><button class="btn btn-ghost" type="button" data-close>Hủy</button><button class="btn btn-primary" type="button" id="fSave">${I('check', 16)}${p ? 'Lưu thay đổi' : 'Thêm sản phẩm'}</button></div>`
    });
    const el = m.el, q = s2 => el.querySelector(s2);
    let badge = f.badge || '';
    const fillCats = () => {
      const cs = d.cats.filter(c => c.gameId === q('#fGame').value);
      q('#fCat').innerHTML = cs.length ? cs.map(c => `<option value="${c.id}" ${c.id === f.catId ? 'selected' : ''}>${U.esc(c.name)}</option>`).join('') : '<option value="">Game này chưa có danh mục</option>';
    };
    const upd = () => {
      const pr = U.parseNum(q('#fPrice').value), old = U.parseNum(q('#fOld').value);
      const off = old > pr && pr ? Math.round((1 - pr / old) * 100) : 0;
      q('#pvName').innerHTML = U.esc(q('#fName').value || 'Tên gói') + (badge === 'hot' ? ' <span class="badge badge-hot">Hot</span>' : badge === 'new' ? ' <span class="badge badge-new">Mới</span>' : '') + (off ? ` <span class="badge badge-sale">-${off}%</span>` : '');
      q('#pvTime').textContent = q('#fTime').value || 'Thời gian hoàn thành';
      q('#pvPrice').textContent = pr ? U.fmt(pr) : '—';
      q('#pvOld').textContent = off ? U.fmt(old) : '';
      const h = q('#offHint');
      h.textContent = old && old <= pr ? 'Giá gốc phải cao hơn giá bán thì khách mới thấy giảm giá.' : off ? `Khách sẽ thấy giảm ${off}%, tiết kiệm ${U.fmt(old - pr)}.` : '';
      h.classList.toggle('warn', !!(old && old <= pr));
    };
    fillCats(); upd();
    const descMode = bindMode(el, 'fDescMode', q('#fDesc'), q('#fDescNote'), p ? p.desc || '' : '', s.defaultDesc, 'mô tả');
    const notesMode = bindMode(el, 'fNotesMode', q('#fNotes'), q('#fNotesNote'), p ? p.notes || '' : '', s.defaultNotes, 'lưu ý');
    q('#fGame').addEventListener('change', () => { fillCats(); upd(); });
    q('#fBadge').addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      badge = b.dataset.v;
      $$('button', q('#fBadge')).forEach(x => x.classList.toggle('on', x === b));
      upd();
    });
    ['#fPrice', '#fOld'].forEach(sel => q(sel).addEventListener('input', e => U.moneyMask(e.target)));
    el.addEventListener('input', upd);

    const save = more => {
      const name = q('#fName').value.trim(), price = U.parseNum(q('#fPrice').value), catId = q('#fCat').value;
      if (!catId) return fieldErr(el, 'cat', 'Vui lòng chọn danh mục (tạo danh mục trước nếu game chưa có).');
      if (!name) return fieldErr(el, 'name', 'Vui lòng nhập tên gói.');
      if (!price) return fieldErr(el, 'price', 'Vui lòng nhập giá bán.');
      const dm = descMode(), nm = notesMode();
      if (dm.mode === 'custom' && !dm.text) return fieldErr(el, 'desc', 'Chế độ Tùy chỉnh cần nhập nội dung mô tả.');
      if (nm.mode === 'custom' && !nm.text) return fieldErr(el, 'notes', 'Chế độ Tùy chỉnh cần nhập ít nhất một lưu ý.');
      const data = { catId, name, price, oldPrice: U.parseNum(q('#fOld').value), time: q('#fTime').value.trim(), badge, descMode: dm.mode, desc: dm.text, notesMode: nm.mode, notes: nm.text, visible: q('#fVis').checked };
      let nid = id;
      if (p) {
        const moved = p.catId !== catId;
        Object.assign(p, data);
        if (moved) { d.prods.splice(d.prods.indexOf(p), 1); insertInGroup(d.prods, p, 'catId'); }
      } else {
        nid = U.uid('p');
        insertInGroup(d.prods, { id: nid, ...data }, 'catId');
      }
      OPEN.pc.add(catId); OPEN.pg.add(Store.cat(catId).gameId);
      Store.save(); updateCounts();
      if (more) {
        UI.toast(`Đã thêm “${name}”. Nhập gói tiếp theo.`);
        ['#fName', '#fPrice', '#fOld'].forEach(sel => { q(sel).value = ''; });
        f.catId = catId; upd(); q('#fName').focus();
        render(false);
      } else {
        m.close(); render(false);
        UI.toast(p ? 'Đã lưu sản phẩm' : `Đã thêm “${name}”`);
        flashRow(nid);
      }
    };
    q('#fSave').addEventListener('click', () => save(false));
    if (q('#fMore')) q('#fMore').addEventListener('click', () => save(true));
    q('#pf').addEventListener('submit', e => { e.preventDefault(); save(false); });
  }

  /* ---------- Thao tác hàng loạt ---------- */
  function updateBulk() {
    const n = A.route === 'prods' ? A.sel.size : 0;
    $('#bulk').classList.toggle('show', n > 0);
    $('#bulkN').textContent = n;
  }
  function bindBulk() {
    $('#bulk').addEventListener('click', e => {
      const b = e.target.closest('[data-bulk]'); if (!b) return;
      const ids = [...A.sel].filter(id => Store.prod(id));
      const act = b.dataset.bulk;
      if (act === 'clear') { A.sel.clear(); renderProdTree(); return; }
      if (!ids.length) return;
      if (act === 'show' || act === 'hide') {
        ids.forEach(id => { Store.prod(id).visible = act === 'show'; });
        commit(`Đã ${act === 'show' ? 'hiện' : 'ẩn'} ${ids.length} sản phẩm`);
      } else if (act === 'del') delProds(ids);
      else if (act === 'price') bulkPrice(ids);
      else if (act === 'move') bulkMove(ids);
    });
  }

  function bulkPrice(ids) {
    const sample = Store.prod(ids[0]);
    const m = UI.modal({
      cls: 'form-modal',
      html: `<div class="md-h"><h3>Điều chỉnh giá ${ids.length} sản phẩm</h3><button class="btn btn-icon btn-ghost" type="button" data-close aria-label="Đóng">${I('x')}</button></div>
      <div class="md-b">
        <div class="seg full" id="bpDir"><button type="button" class="on" data-v="-1">Giảm giá</button><button type="button" data-v="1">Tăng giá</button></div>
        <div class="field"><label for="bpPct">Mức điều chỉnh</label><div class="input-suffix"><input class="input" id="bpPct" type="number" min="1" max="90" value="10"><span>%</span></div></div>
        <label class="check-row" id="bpKeepRow"><span class="check"><input type="checkbox" id="bpKeep" checked><span></span></span><span>Giữ giá hiện tại làm giá gốc, khách thấy giá gạch ngang và phần trăm giảm</span></label>
        <label class="check-row"><span class="check"><input type="checkbox" id="bpRound" checked><span></span></span><span>Làm tròn đến 1.000đ</span></label>
        <div class="bp-preview" id="bpPrev"></div>
      </div>
      <div class="md-f"><button class="btn btn-ghost" type="button" data-close>Hủy</button><button class="btn btn-primary" type="button" id="bpOk">Áp dụng</button></div>`
    });
    const q = s => m.el.querySelector(s);
    let dir = -1;
    const calc = p => {
      const pct = Math.min(90, Math.max(0, +q('#bpPct').value || 0));
      let v = p.price * (1 + dir * pct / 100);
      if (q('#bpRound').checked) v = Math.round(v / 1000) * 1000;
      return Math.max(1000, Math.round(v));
    };
    const prev = () => {
      q('#bpKeepRow').hidden = dir > 0;
      q('#bpPrev').innerHTML = `Ví dụ: <b>${U.esc(sample.name)}</b><span>${U.fmt(sample.price)} ${I('arrowRight', 14)} <b class="pr">${U.fmt(calc(sample))}</b></span>`;
    };
    q('#bpDir').addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      dir = +b.dataset.v;
      $$('button', q('#bpDir')).forEach(x => x.classList.toggle('on', x === b));
      prev();
    });
    m.el.addEventListener('input', prev); m.el.addEventListener('change', prev); prev();
    q('#bpOk').addEventListener('click', () => {
      const snap = snapshot();
      ids.forEach(id => {
        const p = Store.prod(id), nv = calc(p);
        if (dir < 0 && q('#bpKeep').checked) { if (!(p.oldPrice > p.price)) p.oldPrice = p.price; }
        else if (dir > 0 && p.oldPrice && p.oldPrice <= nv) p.oldPrice = 0;
        p.price = nv;
      });
      m.close();
      commit(`Đã điều chỉnh giá ${ids.length} sản phẩm`, { action: 'Hoàn tác', onAction: () => undo(snap) });
    });
  }

  function bulkMove(ids) {
    const d = D();
    const m = UI.modal({
      cls: 'form-modal',
      html: `<div class="md-h"><h3>Chuyển ${ids.length} sản phẩm</h3><button class="btn btn-icon btn-ghost" type="button" data-close aria-label="Đóng">${I('x')}</button></div>
      <div class="md-b">
        <div class="field"><label for="mvGame">Game</label><select class="select" id="mvGame">${d.games.map(g => `<option value="${g.id}">${U.esc(g.name)}</option>`).join('')}</select></div>
        <div class="field"><label for="mvCat">Danh mục mới</label><select class="select" id="mvCat"></select></div>
      </div>
      <div class="md-f"><button class="btn btn-ghost" type="button" data-close>Hủy</button><button class="btn btn-primary" type="button" id="mvOk">Chuyển</button></div>`
    });
    const q = s => m.el.querySelector(s);
    const fill = () => {
      const cs = d.cats.filter(c => c.gameId === q('#mvGame').value);
      q('#mvCat').innerHTML = cs.length ? cs.map(c => `<option value="${c.id}">${U.esc(c.name)}</option>`).join('') : '<option value="">Chưa có danh mục</option>';
      q('#mvOk').disabled = !cs.length;
    };
    q('#mvGame').addEventListener('change', fill); fill();
    q('#mvOk').addEventListener('click', () => {
      const cid = q('#mvCat').value; if (!cid) return;
      const snap = snapshot();
      ids.forEach(id => {
        const p = Store.prod(id);
        d.prods.splice(d.prods.indexOf(p), 1);
        p.catId = cid;
        insertInGroup(d.prods, p, 'catId');
      });
      m.close();
      commit(`Đã chuyển ${ids.length} sản phẩm sang “${Store.cat(cid).name}”`, { action: 'Hoàn tác', onAction: () => undo(snap) });
    });
  }

  /* =========================================================
     HỎI ĐÁP & ĐÁNH GIÁ
     ========================================================= */
  function vContent(v) {
    const d = D(), tab = A.ctab, isFaq = tab === 'faq';
    const list = isFaq ? d.faqs : d.reviews;
    v.innerHTML = `<section class="panel">
      <div class="panel-h">
        <div class="seg" id="cTab"><button type="button" class="${isFaq ? 'on' : ''}" data-t="faq">${I('help', 15)}Hỏi đáp <em>${d.faqs.length}</em></button><button type="button" class="${!isFaq ? 'on' : ''}" data-t="rv">${I('star', 15)}Đánh giá <em>${d.reviews.length}</em></button></div>
        <button class="btn btn-primary ml-auto" type="button" data-act="add">${I('plus', 16)}${isFaq ? 'Thêm câu hỏi' : 'Thêm đánh giá'}</button>
      </div>
      ${list.length ? `<ul class="clist">${list.map((x, i) => `<li data-id="${x.id}" class="${x.visible ? '' : 'is-hidden'}">
        <div class="ud v"><button type="button" data-act="up" ${i === 0 ? 'disabled' : ''} aria-label="Lên">${I('chevUp', 14)}</button><button type="button" data-act="down" ${i === list.length - 1 ? 'disabled' : ''} aria-label="Xuống">${I('chevDown', 14)}</button></div>
        <div class="cl-main">${isFaq
          ? `<b>${U.esc(x.q)}</b><p>${U.esc(x.a)}</p>`
          : `<div class="cl-rv"><span class="rv-av">${U.esc(U.initials(x.name))}</span><b>${U.esc(x.name)}</b><small class="muted">${U.esc(x.game)}</small><span class="stars">${stars(x.stars)}</span></div><p>${U.esc(x.text)}</p>`}</div>
        <div class="cl-act">${sw(x.visible, 'data-act="vis" aria-label="Hiển thị"')}${rowBtn('edit', 'edit', 'Sửa')}${rowBtn('trash', 'trash', 'Xóa', 'danger')}</div></li>`).join('')}</ul>`
        : emptyState(isFaq ? 'help' : 'star', isFaq ? 'Chưa có câu hỏi' : 'Chưa có đánh giá', isFaq ? 'Mục Hỏi đáp trên trang khách sẽ ẩn khi danh sách trống.' : 'Mục Đánh giá trên trang khách sẽ ẩn khi danh sách trống.', 'add', isFaq ? 'Thêm câu hỏi' : 'Thêm đánh giá')}
    </section>`;
    const key = isFaq ? 'faqs' : 'reviews';
    v.onclick = e => {
      const t = e.target.closest('[data-t]');
      if (t) { A.ctab = t.dataset.t; render(false); return; }
      const b = e.target.closest('[data-act]'); if (!b) return;
      const id = idOf(b), act = b.dataset.act;
      if (act === 'add') (isFaq ? faqForm : reviewForm)();
      else if (act === 'edit') (isFaq ? faqForm : reviewForm)(id);
      else if (act === 'up' || act === 'down') move(key, id, act === 'up' ? -1 : 1);
      else if (act === 'trash') {
        const snap = snapshot();
        D()[key] = D()[key].filter(x => x.id !== id);
        commit(isFaq ? 'Đã xóa câu hỏi' : 'Đã xóa đánh giá', { action: 'Hoàn tác', onAction: () => undo(snap) });
      }
    };
    v.onchange = e => {
      if (!e.target.matches('[data-act="vis"]')) return;
      const x = D()[key].find(y => y.id === idOf(e.target));
      x.visible = e.target.checked;
      commit(x.visible ? 'Đã hiện trên trang khách' : 'Đã ẩn khỏi trang khách');
    };
  }

  function faqForm(id) {
    const x = id ? D().faqs.find(f => f.id === id) : null;
    const m = UI.modal({
      cls: 'form-modal',
      html: `<div class="md-h"><h3>${x ? 'Sửa câu hỏi' : 'Thêm câu hỏi'}</h3><button class="btn btn-icon btn-ghost" type="button" data-close aria-label="Đóng">${I('x')}</button></div>
      <div class="md-b">
        <div class="field"><label for="qQ">Câu hỏi</label><input class="input" id="qQ" value="${U.esc(x ? x.q : '')}" placeholder="Ví dụ: Bao lâu thì bắt đầu cày?"><span class="err" data-err="q"></span></div>
        <div class="field"><label for="qA">Trả lời</label><textarea class="textarea" id="qA" rows="5">${U.esc(x ? x.a : '')}</textarea><span class="err" data-err="a"></span></div>
        <label class="switch-row">${sw(x ? x.visible : true, 'id="qVis"')}<span>Hiển thị cho khách</span></label>
      </div>
      <div class="md-f"><button class="btn btn-ghost" type="button" data-close>Hủy</button><button class="btn btn-primary" type="button" id="qSave">${x ? 'Lưu' : 'Thêm'}</button></div>`
    });
    const q = s => m.el.querySelector(s);
    q('#qSave').addEventListener('click', () => {
      const qq = q('#qQ').value.trim(), a = q('#qA').value.trim();
      if (!qq) return fieldErr(m.el, 'q', 'Vui lòng nhập câu hỏi.');
      if (!a) return fieldErr(m.el, 'a', 'Vui lòng nhập câu trả lời.');
      if (x) Object.assign(x, { q: qq, a, visible: q('#qVis').checked });
      else D().faqs.push({ id: U.uid('f'), q: qq, a, visible: q('#qVis').checked });
      m.close(); commit(x ? 'Đã lưu câu hỏi' : 'Đã thêm câu hỏi');
    });
  }

  function reviewForm(id) {
    const d = D(), x = id ? d.reviews.find(r => r.id === id) : null;
    let st = x ? x.stars : 5;
    const m = UI.modal({
      cls: 'form-modal',
      html: `<div class="md-h"><h3>${x ? 'Sửa đánh giá' : 'Thêm đánh giá'}</h3><button class="btn btn-icon btn-ghost" type="button" data-close aria-label="Đóng">${I('x')}</button></div>
      <div class="md-b">
        <div class="form-grid">
          <div class="field"><label for="rName">Tên khách</label><input class="input" id="rName" value="${U.esc(x ? x.name : '')}" placeholder="Ví dụ: Minh Khoa"><span class="err" data-err="name"></span></div>
          <div class="field"><label for="rGame">Game</label><input class="input" id="rGame" value="${U.esc(x ? x.game : '')}" list="rGames" placeholder="Chọn hoặc nhập"><datalist id="rGames">${d.games.map(g => `<option value="${U.esc(g.name)}">`).join('')}</datalist></div>
        </div>
        <div class="field"><span class="label">Số sao</span><div class="star-pick" id="rStars" role="radiogroup" aria-label="Số sao">${[1, 2, 3, 4, 5].map(i => `<button type="button" data-s="${i}" role="radio" aria-checked="${i === st}" aria-label="${i} sao">${I('star', 26)}</button>`).join('')}</div></div>
        <div class="field"><label for="rText">Nội dung</label><textarea class="textarea" id="rText" rows="4">${U.esc(x ? x.text : '')}</textarea><span class="err" data-err="text"></span></div>
        <label class="switch-row">${sw(x ? x.visible : true, 'id="rVis"')}<span>Hiển thị cho khách</span></label>
      </div>
      <div class="md-f"><button class="btn btn-ghost" type="button" data-close>Hủy</button><button class="btn btn-primary" type="button" id="rSave">${x ? 'Lưu' : 'Thêm'}</button></div>`
    });
    const q = s => m.el.querySelector(s);
    const paint = n => $$('#rStars button', m.el).forEach(b => b.classList.toggle('on', +b.dataset.s <= n));
    paint(st);
    q('#rStars').addEventListener('mouseover', e => { const b = e.target.closest('button'); if (b) paint(+b.dataset.s); });
    q('#rStars').addEventListener('mouseleave', () => paint(st));
    q('#rStars').addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      st = +b.dataset.s; paint(st);
      $$('#rStars button', m.el).forEach(y => y.setAttribute('aria-checked', String(+y.dataset.s === st)));
    });
    q('#rSave').addEventListener('click', () => {
      const name = q('#rName').value.trim(), text = q('#rText').value.trim();
      if (!name) return fieldErr(m.el, 'name', 'Vui lòng nhập tên khách.');
      if (!text) return fieldErr(m.el, 'text', 'Vui lòng nhập nội dung đánh giá.');
      const data = { name, game: q('#rGame').value.trim(), stars: st, text, visible: q('#rVis').checked };
      if (x) Object.assign(x, data); else d.reviews.push({ id: U.uid('r'), ...data });
      m.close(); commit(x ? 'Đã lưu đánh giá' : 'Đã thêm đánh giá');
    });
  }

  /* =========================================================
     CÀI ĐẶT
     ========================================================= */
  const SF = [
    { t: 'Thông tin chung', i: 'home', f: [
      ['siteName', 'Tên website', 'text'],
      ['tagline', 'Khẩu hiệu', 'text'],
      ['heroTitle', 'Tiêu đề trang chủ', 'text', 'Đặt chữ giữa hai dấu * để tô màu nổi bật, ví dụ: Xem giá chỉ trong *3 bước*'],
      ['heroText', 'Mô tả dưới tiêu đề', 'area']
    ] },
    { t: 'Thông báo đầu trang', i: 'megaphone', f: [
      ['announcementOn', 'Hiện thanh thông báo trên cùng', 'switch'],
      ['announcement', 'Nội dung thông báo', 'text', 'Khách có thể bấm X để ẩn trong lần truy cập đó.']
    ] },
    { t: 'Liên hệ', i: 'phone', f: [
      ['zalo', 'Số Zalo / điện thoại', 'text', 'Nút “Nhắn Zalo” sẽ mở zalo.me/số này.'],
      ['facebook', 'Link Facebook', 'text'],
      ['phone', 'Số điện thoại gọi', 'text', 'Dùng cho mục “Gọi điện”. Để trống sẽ dùng số Zalo.'],
      ['messenger', 'Link Messenger', 'text', 'Ví dụ: https://m.me/tenfanpage'],
      ['email', 'Email', 'text'],
      ['hours', 'Giờ làm việc', 'text'],
      ['youtube', 'Link YouTube', 'text'],
      ['tiktok', 'Link TikTok', 'text'],
      ['instagram', 'Link Instagram', 'text'],
      ['telegram', 'Link Telegram', 'text'],
      ['discord', 'Link Discord', 'text']
    ] },
    { t: 'Số liệu trang chủ', i: 'chart', f: [
      ['statOrders', 'Đơn đã hoàn thành', 'number'],
      ['statBoosters', 'Số booster', 'number'],
      ['statRating', 'Điểm đánh giá (thang 5)', 'number', '', 'step="0.1" min="0" max="5"']
    ] },
    { t: 'Nội dung mặc định của sản phẩm', i: 'box', f: [
      ['defaultDesc', 'Mô tả mặc định', 'area', 'Dùng cho gói chưa có mô tả riêng.'],
      ['defaultNotes', 'Lưu ý mặc định (mỗi dòng một ý)', 'area']
    ] },
    { t: 'Chế độ bảo trì', i: 'wrench', f: [
      ['maintenanceOn', 'Bật bảo trì: khách chỉ thấy thông báo, admin vẫn xem được trang', 'switch'],
      ['maintenanceText', 'Thông báo bảo trì', 'area']
    ] }
  ];

  function setDirty(v) { A.dirty = v; const b = $('#saveBar'); if (b) b.classList.toggle('show', v); }
  function discardSettings() { A.draft = null; A.dirty = false; UI.applyLook(D().settings); }
  function saveSettings() {
    const d = D();
    const hash = d.settings.passwordHash;
    d.settings = { ...d.settings, ...A.draft, passwordHash: hash };
    A.draft = null;
    Store.save(); updateCounts(); setDirty(false);
    UI.toast('Đã lưu cài đặt. Trang khách đã được cập nhật.');
    render(false);
  }

  function vSettings(v) {
    if (!A.draft) A.draft = U.clone(D().settings);
    const s = A.draft;
    const field = ([k, label, type, hint, attrs]) => {
      const h = hint ? `<span class="hint">${U.esc(hint)}</span>` : '';
      if (type === 'switch') return `<label class="switch-row">${sw(s[k], `data-k="${k}"`)}<span>${U.esc(label)}</span></label>`;
      if (type === 'area') return `<div class="field"><label for="s-${k}">${label}</label><textarea class="textarea" id="s-${k}" data-k="${k}" rows="3">${U.esc(s[k])}</textarea>${h}</div>`;
      return `<div class="field"><label for="s-${k}">${label}</label><input class="input" id="s-${k}" data-k="${k}" type="${type === 'number' ? 'number' : 'text'}" value="${U.esc(s[k])}" ${attrs || ''}>${h}</div>`;
    };
    const server = Store.mode === 'server';
    v.innerHTML = `<div class="settings">
      <section class="panel full"><div class="panel-h"><span class="ph-ic">${I('send', 18)}</span><div><h2>Khi gửi link website (Facebook, Zalo, Messenger, Google)</h2><p class="muted small">Tiêu đề, mô tả và ảnh hiện ra trong khung xem trước khi ai đó gửi link trang của bạn.</p></div></div>
        <div class="panel-b seo-grid">
          <div class="form-stack">
            <div class="field"><label for="s-seoTitle">Tiêu đề</label><input class="input" id="s-seoTitle" data-k="seoTitle" maxlength="90" value="${U.esc(s.seoTitle || '')}" placeholder="${U.esc([s.siteName, s.tagline].filter(Boolean).join(' – '))}"><span class="hint">Để trống = Tên website – Khẩu hiệu</span></div>
            <div class="field"><label for="s-seoDesc">Mô tả</label><textarea class="textarea" id="s-seoDesc" data-k="seoDesc" rows="3" maxlength="300" placeholder="${U.esc(s.heroText || '')}">${U.esc(s.seoDesc || '')}</textarea><span class="hint" id="seoCount"></span></div>
            <div class="field"><label for="s-seoImage">Ảnh xem trước</label><input class="input" id="s-seoImage" data-k="seoImage" value="${U.esc(s.seoImage || '')}" placeholder="${server ? 'Bấm Tải ảnh lên, hoặc dán link ảnh https://…' : 'Dán link ảnh https://…'}"><span class="hint">Khuyên dùng ảnh ngang 1200 × 630 px, dưới 5 MB (PNG, JPG, WEBP).</span></div>
            <div class="toolbar">
              <label class="btn btn-ghost btn-sm${server ? '' : ' disabled'}" title="${server ? 'Chọn ảnh từ máy' : 'Chỉ dùng được khi chạy trên máy chủ'}">${I('upload', 15)}<span id="seoUpTxt">Tải ảnh lên</span><input type="file" id="seoFile" accept="image/png,image/jpeg,image/webp,image/gif" hidden ${server ? '' : 'disabled'}></label>
              <button class="btn btn-ghost btn-sm" type="button" data-act="seo-clear">${I('trash', 15)}Bỏ ảnh</button>
            </div>
          </div>
          <div class="seo-side">
            <div class="og-card" id="ogCard"></div>
            <p class="hint">Facebook và Zalo lưu tạm bản xem trước cũ. Sau khi đổi, dán link vào <a href="https://developers.facebook.com/tools/debug/" target="_blank" rel="noopener">Facebook Sharing Debugger</a> và bấm <b>Scrape Again</b>. Với Zalo, gửi link kèm đuôi mới như <code>${U.esc(location.host || 'gachaz.shop')}/?v=2</code> để hiện bản mới.</p>
          </div>
        </div></section>
      ${SF.map(sec => `<section class="panel"><div class="panel-h"><span class="ph-ic">${I(sec.i, 18)}</span><h2>${sec.t}</h2></div><div class="panel-b form-stack">${sec.f.map(field).join('')}</div></section>`).join('')}
      <section class="panel"><div class="panel-h"><span class="ph-ic">${I('palette', 18)}</span><h2>Màu sắc & hiệu ứng</h2></div>
        <div class="panel-b form-stack"><p class="muted">Màu, phông chữ, bo góc và các hiệu ứng đã chuyển sang mục riêng.</p><div><a class="btn btn-soft" href="#look">${I('palette', 16)}Mở mục Giao diện</a></div></div></section>
      <section class="panel"><div class="panel-h"><span class="ph-ic">${I('key', 18)}</span><h2>Đổi mật khẩu quản trị</h2></div>
        <form class="panel-b form-stack" id="pwForm" novalidate>
          <div class="field"><label for="pwCur">Mật khẩu hiện tại</label><input class="input" id="pwCur" type="password" autocomplete="current-password"><span class="err" data-err="cur"></span></div>
          <div class="form-grid">
            <div class="field"><label for="pwNew">Mật khẩu mới</label><input class="input" id="pwNew" type="password" autocomplete="new-password"><span class="err" data-err="new"></span></div>
            <div class="field"><label for="pwNew2">Nhập lại</label><input class="input" id="pwNew2" type="password" autocomplete="new-password"><span class="err" data-err="new2"></span></div>
          </div>
          <div><button class="btn btn-primary" type="submit">${I('key', 16)}Đổi mật khẩu</button></div>
        </form></section>
    </div>
    ${saveBar()}`;
    // Khung xem trước giống Facebook/Zalo
    const ogPreview = () => {
      const title = (s.seoTitle || '').trim() || [s.siteName, s.tagline].filter(Boolean).join(' – ');
      const desc = (s.seoDesc || '').trim() || (s.heroText || '').trim();
      const img = (s.seoImage || '').trim();
      $('#ogCard', v).innerHTML = `<div class="og-img">${img ? `<img src="${U.esc(img)}" alt="" onerror="this.parentNode.classList.add('bad')">` : ''}<span>${img ? 'Không tải được ảnh' : 'Chưa có ảnh xem trước'}</span></div>
        <div class="og-body"><small>${U.esc((location.host || 'ten-mien.vn').toUpperCase())}</small><b>${U.esc(title)}</b><p>${U.esc(desc)}</p></div>`;
      const n = (s.seoDesc || '').length;
      $('#seoCount', v).textContent = `Nên dài 1–2 câu (khoảng 150 ký tự). Hiện có ${n} ký tự.`;
      $('#seoCount', v).classList.toggle('warn', n > 200);
    };
    ogPreview();
    const onField = e => {
      const t = e.target, k = t.dataset.k; if (!k) return;
      s[k] = t.type === 'checkbox' ? t.checked : t.type === 'number' ? Number(t.value) : t.value;
      setDirty(true);
      if (/^seo|^siteName$|^tagline$|^heroText$/.test(k)) ogPreview();
    };
    v.oninput = onField; v.onchange = onField;
    $('#seoFile', v).addEventListener('change', async e => {
      const f = e.target.files[0]; e.target.value = '';
      if (!f) return;
      const txt = $('#seoUpTxt', v); txt.textContent = 'Đang tải…';
      try {
        const pth = await Store.upload(f);
        s.seoImage = pth; $('#s-seoImage', v).value = pth;
        setDirty(true); ogPreview();
        UI.toast('Đã tải ảnh lên. Bấm Lưu thay đổi để áp dụng.');
      } catch (err) { UI.toast(err.message, 'err'); }
      txt.textContent = 'Tải ảnh lên';
    });
    v.onclick = e => {
      if (e.target.closest('[data-act="seo-clear"]')) { s.seoImage = ''; $('#s-seoImage', v).value = ''; setDirty(true); ogPreview(); return; }
      const b = e.target.closest('[data-act]'); if (!b) return;
      if (b.dataset.act === 'save') saveSettings();
      if (b.dataset.act === 'undo') { discardSettings(); render(false); UI.toast('Đã hoàn tác thay đổi', 'info'); }
    };
    $('#pwForm', v).addEventListener('submit', e => {
      e.preventDefault();
      const f = e.currentTarget;
      const cur = $('#pwCur', f).value, n1 = $('#pwNew', f).value, n2 = $('#pwNew2', f).value;
      if (n1.length < 6) return fieldErr(f, 'new', 'Mật khẩu mới cần ít nhất 6 ký tự.');
      if (n1 !== n2) return fieldErr(f, 'new2', 'Hai mật khẩu chưa khớp.');
      Store.auth.changePassword(cur, n1).then(() => {
        f.reset();
        UI.toast('Đã đổi mật khẩu');
      }).catch(err => {
        if (err.field) fieldErr(f, err.field, err.message); else UI.toast(err.message, 'err');
      });
    });
  }

  /* =========================================================
     BẢN NHÁP DÙNG CHUNG (Cài đặt, Chân trang, Liên hệ nhanh)
     ========================================================= */
  const DRAFT_ROUTES = ['settings', 'footer', 'quick', 'look'];
  const saveBar = () => `<div class="savebar${A.dirty ? ' show' : ''}" id="saveBar">
      <span>${I('info', 16)}Bạn có thay đổi chưa lưu</span>
      <button class="btn btn-sm" type="button" data-act="undo">Hoàn tác</button>
      <button class="btn btn-primary btn-sm" type="button" data-act="save">${I('check', 14)}Lưu thay đổi</button>
    </div>`;
  function draftBarClick(e) {
    const b = e.target.closest('#saveBar [data-act]'); if (!b) return false;
    if (b.dataset.act === 'save') saveSettings();
    if (b.dataset.act === 'undo') { discardSettings(); render(false); UI.toast('Đã hoàn tác thay đổi', 'info'); }
    return true;
  }
  const udBtns = (i, n) => `<span class="ud"><button type="button" data-act="up" ${i === 0 ? 'disabled' : ''} aria-label="Lên">${I('chevUp', 14)}</button><button type="button" data-act="down" ${i === n - 1 ? 'disabled' : ''} aria-label="Xuống">${I('chevDown', 14)}</button></span>`;
  const eyeBtn = on => `<button class="btn btn-sm btn-icon btn-ghost eye${on ? ' on' : ''}" type="button" data-act="eye" title="${on ? 'Đang hiện, bấm để ẩn' : 'Đang ẩn, bấm để hiện'}" aria-label="${on ? 'Ẩn' : 'Hiện'}">${I(on ? 'eye' : 'eyeOff', 16)}</button>`;
  // Thao tác trên một dòng của danh sách trong bản nháp
  function rowAct(arr, id, act, onEdit, dupFn) {
    const i = arr.findIndex(x => x.id === id); if (i < 0) return;
    let flash = id;
    if (act === 'up' && i > 0) [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]];
    else if (act === 'down' && i < arr.length - 1) [arr[i + 1], arr[i]] = [arr[i], arr[i + 1]];
    else if (act === 'eye') arr[i].visible = arr[i].visible === false;
    else if (act === 'edit') { onEdit(); return; }
    else if (act === 'dup') { const c = dupFn(arr[i]); arr.splice(i + 1, 0, c); flash = c.id; }
    else if (act === 'trash') { arr.splice(i, 1); flash = null; }
    else return;
    setDirty(true); render(false);
    if (flash) flashRow(flash);
  }

  // Hộp thoại thêm/sửa một mục có biểu tượng (dùng cho Chân trang và Liên hệ nhanh)
  function channelItemForm({ item, title, onSave }) {
    const x = item ? { ...item } : { icon: 'zalo', name: 'Zalo', desc: '', url: '', visible: true };
    const s = A.draft || D().settings;
    const m = UI.modal({
      cls: 'form-modal',
      html: `<div class="md-h"><h3>${title}</h3><button class="btn btn-icon btn-ghost" type="button" data-close aria-label="Đóng">${I('x')}</button></div>
      <form class="md-b" id="ciForm" novalidate>
        <div class="field"><span class="label">Biểu tượng</span>
          <div class="ch-pick" id="chPick" role="radiogroup">${Object.entries(UI.CHANNELS).map(([k, c]) =>
            `<button type="button" class="chp${k === x.icon ? ' on' : ''}" data-k="${k}" role="radio" aria-checked="${k === x.icon}" title="${c.label}">${UI.channel(k, 32)}<span>${c.label}</span></button>`).join('')}</div></div>
        <div class="form-grid">
          <div class="field"><label for="ciName">Tên</label><input class="input" id="ciName" maxlength="40"><span class="err" data-err="name"></span></div>
          <div class="field"><label for="ciDesc">Mô tả <em class="opt-l">(nếu có)</em></label><input class="input" id="ciDesc" maxlength="60"></div>
        </div>
        <div class="field"><label for="ciUrl">Link</label><input class="input" id="ciUrl" placeholder="https://…"><span class="hint" id="ciHint"></span></div>
        <button type="submit" hidden></button>
      </form>
      <div class="md-f"><button class="btn btn-ghost" type="button" data-close>Hủy</button><button class="btn btn-primary" type="button" id="ciSave">${I('check', 16)}${item ? 'Lưu' : 'Thêm'}</button></div>`
    });
    const q = sel => m.el.querySelector(sel);
    q('#ciName').value = x.name; q('#ciDesc').value = x.desc || ''; q('#ciUrl').value = x.url || '';
    const hint = () => {
      const auto = U.channelUrl({ icon: x.icon, url: '' }, s);
      const autoDesc = U.channelDesc({ icon: x.icon, desc: '' }, s);
      q('#ciHint').textContent = auto ? `Để trống sẽ tự dùng: ${auto}` : ['zalo', 'messenger', 'phone', 'email', 'facebook', 'youtube', 'tiktok', 'instagram', 'telegram', 'discord'].includes(x.icon)
        ? 'Chưa có trong Cài đặt › Liên hệ, hãy nhập link.' : 'Ví dụ: https://… hoặc tel:0900000000';
      q('#ciDesc').placeholder = autoDesc ? `Để trống sẽ hiện: ${autoDesc}` : 'Ví dụ: Tư vấn & báo giá nhanh';
    };
    hint();
    q('#chPick').addEventListener('click', e => {
      const b = e.target.closest('.chp'); if (!b) return;
      const prevLabel = UI.CHANNELS[x.icon] && UI.CHANNELS[x.icon].label;
      x.icon = b.dataset.k;
      $$('.chp', m.el).forEach(y => { y.classList.toggle('on', y === b); y.setAttribute('aria-checked', String(y === b)); });
      const nm = q('#ciName');
      if (!nm.value.trim() || nm.value === prevLabel) nm.value = UI.CHANNELS[x.icon].label;
      hint();
    });
    const save = () => {
      const name = q('#ciName').value.trim();
      if (!name) return fieldErr(m.el, 'name', 'Vui lòng nhập tên.');
      onSave({ ...x, name, desc: q('#ciDesc').value.trim(), url: q('#ciUrl').value.trim() });
      m.close();
    };
    q('#ciSave').addEventListener('click', save);
    q('#ciForm').addEventListener('submit', e => { e.preventDefault(); save(); });
  }

  /* =========================================================
     CHÂN TRANG
     ========================================================= */
  const COL_TYPES = { services: 'Dịch vụ (tự lấy danh sách game)', contact: 'Liên hệ (tự lấy từ Cài đặt)', links: 'Danh sách link (tự thêm từng mục)' };
  function vFooter(v) {
    if (!A.draft) A.draft = U.clone(D().settings);
    const s = A.draft;
    if (!Array.isArray(s.footerCols)) s.footerCols = [];
    const info = c => c.type === 'services' ? ['layout', `Dịch vụ (tự động) · ${c.limit || 5} game đầu`]
      : c.type === 'contact' ? ['phone', 'Liên hệ (tự động)'] : ['link', `Danh sách link tự do · ${(c.items || []).length} mục`];
    const linkCols = s.footerCols.filter(c => c.type === 'links');
    v.innerHTML = `<div class="stack-narrow">
      <section class="panel"><div class="panel-h"><span class="ph-ic">${I('user', 18)}</span><div><h2>Phần giới thiệu (cột bên trái)</h2><p class="muted small">Logo và tên lấy từ Cài đặt › Thông tin chung.</p></div></div>
        <div class="panel-b form-stack">
          <div class="field"><label for="ft-about">Đoạn giới thiệu ngắn</label><textarea class="textarea" id="ft-about" data-k="footerAbout" rows="3">${U.esc(s.footerAbout)}</textarea></div>
          <label class="switch-card"><span><b>Hiện icon mạng xã hội</b><small>Link Facebook, YouTube, TikTok, Instagram, Telegram, Discord lấy từ Cài đặt › Liên hệ.</small></span>${sw(s.footerSocial, 'data-k="footerSocial"')}</label>
        </div></section>
      <section class="panel"><div class="panel-h"><span class="ph-ic">${I('columns', 18)}</span><div><h2>Các cột</h2><p class="muted small">Thêm, đổi tên, ẩn/hiện, sắp xếp. Loại “Dịch vụ” và “Liên hệ” tự lấy nội dung; loại “Danh sách link” bạn tự thêm từng mục bên dưới.</p></div></div>
        <div class="panel-b"><ul class="rows" data-list="cols">${s.footerCols.map((c, i, arr) => {
          const [ic, sub] = info(c);
          return `<li class="row-card${c.visible === false ? ' is-off' : ''}" data-id="${c.id}">${udBtns(i, arr.length)}<span class="rc-ic">${I(ic, 17)}</span>
            <span class="rc-main"><b>${U.esc(c.title)}</b><small>${sub}</small></span>
            <span class="rc-act">${eyeBtn(c.visible !== false)}${rowBtn('edit', 'edit', 'Sửa')}${rowBtn('dup', 'copy', 'Nhân bản')}${rowBtn('trash', 'trash', 'Xóa', 'danger')}</span></li>`;
        }).join('') || '<li class="rows-empty">Chưa có cột nào.</li>'}</ul>
        <button class="btn btn-ghost btn-sm add-row" type="button" data-act="add-col">${I('plus', 14)}Thêm cột</button></div></section>
      ${linkCols.map(c => `<section class="panel"><div class="panel-h"><span class="ph-ic">${I('link', 18)}</span><div><h2>Mục trong cột “${U.esc(c.title)}”</h2><p class="muted small">Mỗi mục gồm biểu tượng, tên, mô tả (nếu có) và link.</p></div></div>
        <div class="panel-b"><ul class="rows" data-list="items" data-col="${c.id}">${(c.items || []).map((it, i, arr) => `<li class="row-card" data-id="${it.id}">${udBtns(i, arr.length)}${UI.channel(it.icon, 34)}
            <span class="rc-main"><b>${U.esc(it.name)}</b><small>${U.esc([U.channelUrl(it, s) || 'Chưa có link', it.desc].filter(Boolean).join(' · '))}</small></span>
            <span class="rc-act">${rowBtn('edit', 'edit', 'Sửa')}${rowBtn('dup', 'copy', 'Nhân bản')}${rowBtn('trash', 'trash', 'Xóa', 'danger')}</span></li>`).join('') || '<li class="rows-empty">Chưa có mục nào.</li>'}</ul>
        <button class="btn btn-ghost btn-sm add-row" type="button" data-act="add-item" data-col="${c.id}">${I('plus', 14)}Thêm mục</button></div></section>`).join('')}
      <section class="panel"><div class="panel-h"><span class="ph-ic">${I('shield', 18)}</span><h2>Dòng cuối trang</h2></div>
        <div class="panel-b form-stack">
          <div class="field"><label for="ft-copy">Dòng bản quyền</label><input class="input" id="ft-copy" data-k="footerCopyright" value="${U.esc(s.footerCopyright)}">
            <span class="hint">Viết {year} để tự hiện năm hiện tại, {site} để hiện tên website. Ví dụ: © {year} {site}. Mọi quyền được bảo lưu.</span></div>
          <label class="switch-card"><span><b>Hiện liên kết “Quản trị”</b><small>Nên tắt để khách không thấy đường vào trang quản trị.</small></span>${sw(s.footerAdminLink, 'data-k="footerAdminLink"')}</label>
        </div></section>
    </div>${saveBar()}`;
    const onField = e => {
      const t = e.target, k = t.dataset.k; if (!k) return;
      s[k] = t.type === 'checkbox' ? t.checked : t.value;
      setDirty(true);
    };
    v.oninput = onField; v.onchange = onField;
    v.onclick = e => {
      if (draftBarClick(e)) return;
      const b = e.target.closest('[data-act]'); if (!b) return;
      const act = b.dataset.act;
      if (act === 'add-col') return colForm();
      if (act === 'add-item') return linkItemForm(b.dataset.col);
      const li = b.closest('[data-id]'), list = b.closest('[data-list]');
      if (!li || !list) return;
      const id = li.dataset.id;
      if (list.dataset.list === 'cols') {
        rowAct(s.footerCols, id, act, () => colForm(id),
          x => ({ ...U.clone(x), id: U.uid('fc'), title: x.title + ' (bản sao)', items: (x.items || []).map(it => ({ ...it, id: U.uid('fi') })) }));
      } else {
        const col = s.footerCols.find(c => c.id === list.dataset.col);
        rowAct(col.items, id, act, () => linkItemForm(col.id, id), x => ({ ...x, id: U.uid('fi'), name: x.name + ' (bản sao)' }));
      }
    };
  }

  function colForm(id) {
    const s = A.draft, c = id ? s.footerCols.find(x => x.id === id) : null;
    const m = UI.modal({
      cls: 'form-modal',
      html: `<div class="md-h"><h3>${c ? 'Sửa cột' : 'Thêm cột'}</h3><button class="btn btn-icon btn-ghost" type="button" data-close aria-label="Đóng">${I('x')}</button></div>
      <form class="md-b" id="colForm" novalidate>
        <div class="field"><label for="colTitle">Tên cột</label><input class="input" id="colTitle" maxlength="40" placeholder="Ví dụ: Cộng đồng"><span class="err" data-err="title"></span></div>
        <div class="field"><label for="colType">Loại cột</label><select class="select" id="colType">${Object.entries(COL_TYPES).map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select></div>
        <div class="field" id="colLimitF"><label for="colLimit">Số game hiển thị</label><input class="input" id="colLimit" type="number" min="1" max="20"></div>
        <button type="submit" hidden></button>
      </form>
      <div class="md-f"><button class="btn btn-ghost" type="button" data-close>Hủy</button><button class="btn btn-primary" type="button" id="colSave">${c ? 'Lưu' : 'Thêm'}</button></div>`
    });
    const q = sel => m.el.querySelector(sel);
    q('#colTitle').value = c ? c.title : '';
    q('#colType').value = c ? c.type : 'links';
    q('#colLimit').value = c && c.limit ? c.limit : 5;
    const sync = () => { q('#colLimitF').hidden = q('#colType').value !== 'services'; };
    q('#colType').addEventListener('change', sync); sync();
    const save = () => {
      const title = q('#colTitle').value.trim();
      if (!title) return fieldErr(m.el, 'title', 'Vui lòng nhập tên cột.');
      const data = { title, type: q('#colType').value, limit: Math.max(1, +q('#colLimit').value || 5) };
      if (c) Object.assign(c, data);
      else s.footerCols.push({ id: U.uid('fc'), visible: true, items: [], ...data });
      m.close(); setDirty(true); render(false);
    };
    q('#colSave').addEventListener('click', save);
    q('#colForm').addEventListener('submit', e => { e.preventDefault(); save(); });
  }

  function linkItemForm(colId, id) {
    const col = A.draft.footerCols.find(c => c.id === colId);
    col.items = col.items || [];
    const it = id ? col.items.find(x => x.id === id) : null;
    channelItemForm({
      item: it || { icon: 'facebook', name: 'Facebook', desc: '', url: '' },
      title: it ? 'Sửa mục' : `Thêm mục vào “${col.title}”`,
      onSave: data => {
        if (it) Object.assign(it, data); else col.items.push({ ...data, id: U.uid('fi') });
        setDirty(true); render(false);
      }
    });
  }

  /* =========================================================
     LIÊN HỆ NHANH
     ========================================================= */
  function vQuick(v) {
    if (!A.draft) A.draft = U.clone(D().settings);
    const s = A.draft;
    if (!s.quick) s.quick = { on: false, auto: false, autoSec: 2, side: 'right', title: 'Hỗ trợ nhanh', sub: '', items: [] };
    const q = s.quick;
    q.items = q.items || [];
    const preview = () => `<div class="qp${q.side === 'left' ? ' left' : ''}"><div class="qp-panel"><div class="qp-h"><b>${U.esc(q.title || 'Hỗ trợ nhanh')}</b>${q.sub ? `<span><i></i>${U.esc(q.sub)}</span>` : ''}</div>
      ${q.items.filter(x => x.visible !== false).map(x => { const d = U.channelDesc(x, s); return `<div class="qp-item">${UI.channel(x.icon, 34)}<span><b>${U.esc(x.name)}</b>${d ? `<small>${U.esc(d)}</small>` : ''}</span></div>`; }).join('') || '<p class="muted small">Chưa có mục nào đang hiện.</p>'}
      </div><span class="qp-tab">${I('headset', 18)}</span></div>`;
    v.innerHTML = `<div class="quick-grid">
      <section class="panel"><div class="panel-h"><span class="ph-ic">${I('headset', 18)}</span><div><h2>Thanh liên hệ nhanh</h2><p class="muted small">Nút nhỏ ở cạnh màn hình, bấm vào trượt ra danh sách liên hệ. Có thể tự hiện vài giây khi khách vào trang rồi lùi vào.</p></div></div>
        <div class="panel-b form-stack">
          <div class="form-grid">
            <label class="switch-card"><span><b>Bật thanh liên hệ nhanh</b></span>${sw(q.on, 'data-q="on"')}</label>
            <label class="switch-card"><span><b>Tự hiện khi tải trang rồi lùi vào</b></span>${sw(q.auto, 'data-q="auto"')}</label>
            <div class="field"><label for="qSec">Thời gian tự hiện</label><div class="range-row"><input type="range" id="qSec" min="1" max="10" step="1" value="${+q.autoSec || 2}" data-q="autoSec"><b id="qSecV">${+q.autoSec || 2} giây</b></div></div>
            <div class="field"><label for="qSide">Vị trí</label><select class="select" id="qSide" data-q="side"><option value="right" ${q.side !== 'left' ? 'selected' : ''}>Cạnh phải màn hình</option><option value="left" ${q.side === 'left' ? 'selected' : ''}>Cạnh trái màn hình</option></select></div>
            <div class="field"><label for="qTitle">Tiêu đề thanh</label><input class="input" id="qTitle" data-q="title" value="${U.esc(q.title)}" maxlength="40"></div>
            <div class="field"><label for="qSubIn">Dòng phụ (chấm xanh)</label><input class="input" id="qSubIn" data-q="sub" value="${U.esc(q.sub)}" maxlength="50"></div>
          </div>
          <div class="field"><span class="label">Các mục liên hệ</span>
            <ul class="rows" data-list="quick">${q.items.map((x, i, arr) => `<li class="row-card${x.visible === false ? ' is-off' : ''}" data-id="${x.id}">${udBtns(i, arr.length)}${UI.channel(x.icon, 34)}
              <span class="rc-main"><b>${U.esc(x.name)}</b><small>${U.esc([U.channelUrl(x, s) || 'Chưa có link', U.channelDesc(x, s)].filter(Boolean).join(' · '))}</small></span>
              <span class="rc-act">${eyeBtn(x.visible !== false)}${rowBtn('edit', 'edit', 'Sửa')}${rowBtn('dup', 'copy', 'Nhân bản')}${rowBtn('trash', 'trash', 'Xóa', 'danger')}</span></li>`).join('') || '<li class="rows-empty">Chưa có mục nào.</li>'}</ul>
            <div><button class="btn btn-ghost btn-sm add-row" type="button" data-act="add-quick">${I('plus', 14)}Thêm mục liên hệ</button></div>
            <p class="hint">Mẹo: với Zalo, Messenger, Gọi điện, Email, Facebook… để trống ô Link thì tự lấy từ Cài đặt › Liên hệ. Bấm con mắt để ẩn/hiện từng mục.</p>
          </div>
        </div></section>
      <section class="panel qp-wrap"><div class="panel-h"><span class="ph-ic">${I('eye', 18)}</span><h2>Xem trước</h2></div><div class="panel-b" id="qPrev">${preview()}</div></section>
    </div>${saveBar()}`;
    const onField = e => {
      const t = e.target, k = t.dataset.q; if (!k) return;
      q[k] = t.type === 'checkbox' ? t.checked : t.type === 'range' ? +t.value : t.value;
      if (k === 'autoSec') $('#qSecV', v).textContent = t.value + ' giây';
      $('#qPrev', v).innerHTML = preview();
      setDirty(true);
    };
    v.oninput = onField; v.onchange = onField;
    v.onclick = e => {
      if (draftBarClick(e)) return;
      const b = e.target.closest('[data-act]'); if (!b) return;
      const act = b.dataset.act;
      if (act === 'add-quick') {
        return channelItemForm({ title: 'Thêm mục liên hệ', onSave: data => { q.items.push({ ...data, id: U.uid('q'), visible: true }); setDirty(true); render(false); } });
      }
      const li = b.closest('[data-id]'); if (!li) return;
      const id = li.dataset.id;
      rowAct(q.items, id, act, () => {
        const it = q.items.find(x => x.id === id);
        channelItemForm({ item: it, title: 'Sửa mục liên hệ', onSave: data => { Object.assign(it, data); setDirty(true); render(false); } });
      }, x => ({ ...x, id: U.uid('q'), name: x.name + ' (bản sao)' }));
    };
  }

  /* =========================================================
     GIAO DIỆN (màu, kiểu dáng, hiệu ứng)
     ========================================================= */
  const PRESETS = [
    ['Tím Neon', '#7c5cff', '#38bdf8'], ['Hoàng hôn', '#f97316', '#ec4899'], ['Rừng xanh', '#16a34a', '#84cc16'], ['Đại dương', '#2563eb', '#06b6d4'],
    ['Hồng Pastel', '#ec4899', '#a78bfa'], ['Vàng Sang', '#f59e0b', '#ef4444'], ['Chàm', '#4f46e5', '#7c3aed'], ['Bạc hà', '#14b8a6', '#6366f1']
  ];
  const BG_OPTS = [['particles', 'Mạng hạt kết nối'], ['stars', 'Bầu trời sao'], ['waves', 'Sóng âm'], ['grid', 'Lưới kỹ thuật + vạch quét'], ['bokeh', 'Đèn neon nhòe (bokeh)'], ['snow', 'Tuyết rơi'], ['bubbles', 'Bong bóng'], ['none', 'Không có']];
  const REVEAL_OPTS = [['up', 'Trượt lên mờ dần'], ['zoom', 'Phóng to'], ['side', 'Trượt ngang'], ['blur', 'Làm rõ từ mờ'], ['flip', 'Lật 3D'], ['none', 'Không hiệu ứng']];
  let testAudio = null;
  function stopTest() { if (testAudio) { testAudio.pause(); testAudio = null; } }

  function vLook(v) {
    stopTest();
    if (!A.draft) A.draft = U.clone(D().settings);
    const s = A.draft;
    s.theme = Object.assign({}, UI.THEME_DEFAULT, s.theme || {});
    const t = s.theme, server = Store.mode === 'server';
    const opt = (list, cur) => list.map(([k, l]) => `<option value="${k}" ${k === cur ? 'selected' : ''}>${l}</option>`).join('');
    const tg = (k, title, sub) => `<label class="switch-card"><span><b>${title}</b>${sub ? `<small>${sub}</small>` : ''}</span>${sw(t[k], `data-t="${k}"`)}</label>`;
    const colorField = (k, label) => `<div class="field"><label for="lk-${k}">${label}</label><div class="color-row">
        <label class="color-sw" style="--c:${U.esc(t[k])}" title="Chọn màu"><input type="color" id="lk-${k}c" value="${U.esc(t[k])}" data-t="${k}" aria-label="${label}"></label>
        <input class="input mono" id="lk-${k}" value="${U.esc(t[k])}" data-t="${k}" maxlength="7" spellcheck="false"></div></div>`;
    v.innerHTML = `<div class="look-grid">
      <div class="look-col">
        <section class="panel"><div class="panel-h"><span class="ph-ic">${I('palette', 18)}</span><div><h2>Bảng màu mẫu</h2><p class="muted small">Chọn nhanh một cặp màu hài hoà</p></div></div>
          <div class="panel-b"><div class="presets" id="lkPresets">${PRESETS.map(([n, a, b]) => `<button type="button" class="preset" data-p="${a}|${b}"><span class="pz" style="background:linear-gradient(90deg,${a},${b})"></span><span>${n}</span></button>`).join('')}</div></div></section>
        <section class="panel"><div class="panel-h"><span class="ph-ic">${I('sliders', 18)}</span><h2>Màu & kiểu dáng</h2></div>
          <div class="panel-b form-grid">
            ${colorField('primary', 'Màu chính')}${colorField('secondary', 'Màu phụ')}
            <div class="field"><label for="lk-mode">Chế độ mặc định</label><select class="select" id="lk-mode" data-t="mode">${opt([['system', 'Theo máy của khách'], ['light', 'Sáng'], ['dark', 'Tối']], t.mode)}</select><span class="hint">Khách vẫn tự đổi được bằng nút sáng/tối.</span></div>
            <div class="field"><label for="lk-font">Phông chữ</label><select class="select" id="lk-font" data-t="font">${Object.keys(UI.FONTS).map(f => `<option value="${f}" ${f === t.font ? 'selected' : ''}>${f}${f === 'Be Vietnam Pro' ? ' (khuyên dùng)' : ''}</option>`).join('')}</select><span class="hint">Tất cả đều hỗ trợ tiếng Việt.</span></div>
            <div class="field full"><label for="lk-radius">Độ bo góc</label><div class="range-row"><input type="range" id="lk-radius" min="0" max="24" step="1" value="${Number(t.radius) || 0}" data-t="radius"><b id="lkRadV">${Number(t.radius) || 0}px</b></div></div>
            <div class="field"><label for="lk-card">Kiểu thẻ</label><select class="select" id="lk-card" data-t="card">${opt([['glass', 'Kính mờ (glass)'], ['solid', 'Nền đặc'], ['outline', 'Viền mảnh']], t.card)}</select></div>
            <div class="field"><label for="lk-hero">Bố cục phần đầu</label><select class="select" id="lk-hero" data-t="hero">${opt([['split', 'Chia 2 cột + thẻ gói nổi bật'], ['center', 'Căn giữa tối giản']], t.hero)}</select></div>
          </div></section>
      </div>
      <div class="look-col">
        <section class="panel"><div class="panel-h"><span class="ph-ic">${I('eye', 18)}</span><div><h2>Xem trước</h2><p class="muted small">Cập nhật ngay khi bạn chỉnh</p></div></div>
          <div class="panel-b"><div class="lk-prev" id="lkPrev"></div></div></section>
        <section class="panel"><div class="panel-h"><span class="ph-ic">${I('sparkle', 18)}</span><h2>Hiệu ứng</h2></div>
          <div class="panel-b form-stack">
            <div class="form-grid">
              <div class="field"><label for="lk-bg">Hiệu ứng nền</label><select class="select" id="lk-bg" data-t="bg">${opt(BG_OPTS, t.bg)}</select></div>
              <div class="field"><label for="lk-reveal">Kiểu xuất hiện khi cuộn</label><select class="select" id="lk-reveal" data-t="reveal">${opt(REVEAL_OPTS, t.reveal)}</select></div>
            </div>
            ${tg('loader', 'Màn hình tải trang', 'Logo xoay khi mở trang')}
            ${tg('welcome', 'Màn hình chào “Vào trang”', 'Khách bấm Vào trang → nhạc nền tự phát')}
            <div class="music-box">
              <div class="field"><label for="lk-music">Nhạc nền</label><input class="input" id="lk-music" data-t="music" value="${U.esc(t.music)}" placeholder="${server ? 'Bấm Tải nhạc lên, hoặc dán link file .mp3' : 'Dán link file nhạc .mp3'}">
                <span class="hint">MP3, M4A, OGG, tối đa 12 MB. Có nhạc thì góc trái trang khách hiện nút bật/tắt nhạc.</span></div>
              <div class="toolbar">
                <label class="btn btn-ghost btn-sm${server ? '' : ' disabled'}" title="${server ? 'Chọn file nhạc từ máy' : 'Chỉ dùng được khi chạy trên máy chủ'}">${I('upload', 15)}<span id="lkUpTxt">Tải nhạc lên</span><input type="file" id="lkMusicFile" accept="audio/mpeg,audio/mp4,audio/ogg,audio/wav,.mp3,.m4a,.ogg,.wav" hidden ${server ? '' : 'disabled'}></label>
                <button class="btn btn-ghost btn-sm" type="button" data-act="music-test">${I('music', 15)}<span id="lkTestTxt">Nghe thử</span></button>
                <button class="btn btn-ghost btn-sm" type="button" data-act="music-clear">${I('trash', 15)}Bỏ nhạc</button>
              </div>
              <div class="field"><label for="lk-vol">Âm lượng</label><div class="range-row"><input type="range" id="lk-vol" min="0" max="100" step="5" value="${Number(t.volume) || 0}" data-t="volume"><b id="lkVolV">${Number(t.volume) || 0}%</b></div></div>
            </div>
            ${tg('glow', 'Vầng sáng theo chuột', '')}
            ${tg('tilt', 'Thẻ nghiêng 3D khi rê chuột', '')}
            ${tg('pulse', 'Nền “nhún” theo nhạc', 'Hình nền đập theo nhịp nhạc (với nhạc tải lên máy chủ)')}
            ${tg('motion', 'Bật chuyển động trang trí', 'Tắt nếu muốn trang tĩnh, nhẹ hơn')}
            <p class="hint">Vầng sáng và thẻ nghiêng chỉ có trên máy tính. Máy khách bật chế độ “giảm chuyển động” sẽ tự tắt hiệu ứng.</p>
          </div></section>
      </div>
    </div>${saveBar()}`;

    const rich = txt => U.esc(txt || '').replace(/\*(.+?)\*/g, '<span class="lp-hl">$1</span>');
    const sample = D().prods.find(p => Store.isPublic(p) && p.badge === 'hot') || D().prods[0];
    const preview = () => {
      const p = $('#lkPrev', v), r = Number(t.radius) || 0;
      p.style.cssText = `--pa:${t.primary};--pb:${t.secondary};--pon:${U.lum(t.primary) > .5 ? '#10131c' : '#fff'};--pr:${r}px;--prl:${Math.round(r * 1.34)}px;font-family:"${t.font}",system-ui,sans-serif`;
      p.dataset.card = t.card; p.dataset.hero = t.hero;
      const title = /\*/.test(s.heroTitle || '') ? rich(s.heroTitle) : `${U.esc(s.heroTitle || s.siteName)} <span class="lp-hl">uy tín · an toàn</span>`;
      p.innerHTML = `<span class="lp-blob" aria-hidden="true"></span><h3>${title}</h3><p>${U.esc(s.heroText || '')}</p>
        <div class="lp-cta"><span class="lp-btn">Xem bảng giá</span><span class="lp-btn2">Tư vấn qua Zalo</span></div>
        ${sample ? `<div class="lp-card"><span class="lp-ic">${I('gamepad', 20)}</span><div><b>${U.esc(sample.name)}</b><small>Từ ${U.fmt(sample.price)}</small></div></div>` : ''}`;
      $$('.preset', v).forEach(b => b.classList.toggle('on', b.dataset.p === `${t.primary}|${t.secondary}`.toLowerCase()));
    };
    const setColor = (k, val) => {
      t[k] = val.toLowerCase();
      $(`#lk-${k}`, v).value = t[k]; $(`#lk-${k}c`, v).value = t[k];
      $(`#lk-${k}c`, v).parentElement.style.setProperty('--c', t[k]);
    };
    const changed = () => { setDirty(true); UI.applyLook(s); preview(); };
    preview();

    const onField = e => {
      const el = e.target, k = el.dataset.t; if (!k) return;
      if (k === 'primary' || k === 'secondary') {
        if (!/^#[0-9a-f]{6}$/i.test(el.value)) return;
        setColor(k, el.value);
        return changed();
      }
      t[k] = el.type === 'checkbox' ? el.checked : el.type === 'range' ? Number(el.value) : el.value;
      if (k === 'radius') $('#lkRadV', v).textContent = t[k] + 'px';
      if (k === 'volume') { $('#lkVolV', v).textContent = t[k] + '%'; if (testAudio) testAudio.volume = t[k] / 100; }
      if (k === 'music') stopTest();
      changed();
    };
    v.oninput = onField; v.onchange = onField;
    $('#lkMusicFile', v).addEventListener('change', async e => {
      const f = e.target.files[0]; e.target.value = '';
      if (!f) return;
      const txt = $('#lkUpTxt', v); txt.textContent = 'Đang tải…';
      try {
        const pth = await Store.upload(f);
        stopTest(); t.music = pth; $('#lk-music', v).value = pth;
        changed(); UI.toast('Đã tải nhạc lên. Bấm Lưu thay đổi để áp dụng.');
      } catch (err) { UI.toast(err.message, 'err'); }
      txt.textContent = 'Tải nhạc lên';
    });
    v.onclick = e => {
      if (draftBarClick(e)) { stopTest(); return; }
      const pr = e.target.closest('.preset');
      if (pr) { const [a, b] = pr.dataset.p.split('|'); setColor('primary', a); setColor('secondary', b); return changed(); }
      const b = e.target.closest('[data-act]'); if (!b) return;
      if (b.dataset.act === 'music-clear') { stopTest(); t.music = ''; $('#lk-music', v).value = ''; changed(); }
      if (b.dataset.act === 'music-test') {
        if (testAudio) { stopTest(); $('#lkTestTxt', v).textContent = 'Nghe thử'; return; }
        if (!t.music) { UI.toast('Chưa có nhạc nền để nghe thử.', 'info'); return; }
        testAudio = new Audio(t.music); testAudio.volume = (Number(t.volume) || 0) / 100;
        testAudio.play().then(() => { $('#lkTestTxt', v).textContent = 'Dừng'; }).catch(() => { UI.toast('Không phát được file nhạc này.', 'err'); testAudio = null; });
        testAudio.addEventListener('ended', () => { testAudio = null; const x = $('#lkTestTxt', v); if (x) x.textContent = 'Nghe thử'; });
      }
    };
  }

  /* =========================================================
     SAO LƯU
     ========================================================= */
  function vBackup(v) {
    const d = D();
    const size = new Blob([JSON.stringify(d)]).size;
    v.innerHTML = `
      <section class="panel"><div class="panel-h"><span class="ph-ic">${I('database', 18)}</span><h2>Dữ liệu hiện tại</h2></div>
        <div class="panel-b form-stack">
          <dl class="meta-grid">
            <div><dt>Nguồn dữ liệu</dt><dd>${Store.mode === 'server' ? 'Máy chủ (file data/db.json trên VPS)' : Store.hasLocal() ? 'Đã chỉnh sửa, lưu trong trình duyệt này' : 'Dữ liệu gốc trong file data.js'}</dd></div>
            <div><dt>Cập nhật lần cuối</dt><dd>${U.dateTime(d.updatedAt)}</dd></div>
            <div><dt>Dung lượng</dt><dd>${(size / 1024).toFixed(1)} KB</dd></div>
            <div><dt>Nội dung</dt><dd>${d.games.length} game · ${d.cats.length} danh mục · ${d.prods.length} sản phẩm</dd></div>
          </dl>
          <div class="callout">${I('info', 18)}${Store.mode === 'server'
            ? '<p>Đang chạy trên máy chủ: mọi thay đổi được lưu ngay lên VPS và khách thấy trong vòng 30 giây. Máy chủ tự sao lưu vào thư mục <code>data/backups</code> (tối đa 10 phút một bản).</p>'
            : '<p>Đang chạy không có máy chủ: mọi thay đổi chỉ lưu trong trình duyệt bạn đang dùng. Chạy bằng <code>node server.js</code> để lưu chung cho mọi khách, hoặc <b>tải file data.js</b> bên dưới và chép đè vào thư mục <code>assets/js/</code>.</p>'}</div>
        </div></section>
      <div class="grid-2">
        <section class="panel"><div class="panel-h"><span class="ph-ic">${I('download', 18)}</span><h2>Xuất dữ liệu</h2></div>
          <div class="panel-b form-stack">
            <p class="muted">Tải bản sao lưu để cất giữ hoặc chuyển sang máy khác.</p>
            <button class="btn btn-primary" type="button" data-act="json">${I('download', 16)}Tải bản sao lưu (.json)</button>
            <button class="btn btn-ghost" type="button" data-act="datajs">${I('download', 16)}Tải file data.js để đăng web</button>
          </div></section>
        <section class="panel"><div class="panel-h"><span class="ph-ic">${I('upload', 18)}</span><h2>Nhập dữ liệu</h2></div>
          <div class="panel-b"><label class="drop" id="drop" tabindex="0"><input type="file" accept=".json,application/json" id="fileIn" hidden>${I('upload', 28)}<b>Kéo thả file .json vào đây</b><span class="muted small">hoặc bấm để chọn file sao lưu</span></label></div></section>
      </div>
      <section class="panel danger-zone"><div class="panel-h"><span class="ph-ic">${I('alert', 18)}</span><h2>Vùng cần cẩn thận</h2></div>
        <div class="panel-b dz">
          <div class="dz-row"><div><b>Xóa thống kê lượt xem</b><p class="muted small">Đặt lại số lượt xem của mọi gói về 0.</p></div><button class="btn btn-ghost" type="button" data-act="clearviews">Xóa thống kê</button></div>
          <div class="dz-row"><div><b>Khôi phục dữ liệu gốc</b><p class="muted small">Bỏ mọi chỉnh sửa trên trình duyệt này và dùng lại dữ liệu trong data.js.</p></div><button class="btn btn-danger" type="button" data-act="reset">Khôi phục</button></div>
        </div></section>`;

    const stamp = () => { const t = new Date(); return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`; };
    v.onclick = async e => {
      const b = e.target.closest('[data-act]'); if (!b) return;
      const act = b.dataset.act;
      if (act === 'json') { U.download(`bang-gia-${stamp()}.json`, JSON.stringify(D(), null, 2)); UI.toast('Đã tải bản sao lưu'); }
      else if (act === 'datajs') {
        U.download('data.js', `/* Dữ liệu bảng giá, xuất từ trang quản trị lúc ${U.dateTime(Date.now())}.\n   Chép đè file này vào thư mục assets/js/ để đăng web. */\nwindow.DEFAULT_DATA = ${JSON.stringify(D(), null, 2)};\n`, 'text/javascript');
        UI.toast('Đã tải data.js');
      } else if (act === 'clearviews') {
        const ok = await UI.confirm({ title: 'Xóa thống kê lượt xem?', text: 'Số lượt xem của mọi gói sẽ về 0.', ok: 'Xóa thống kê', danger: true });
        if (ok) { try { await Store.views.clear(); render(false); UI.toast('Đã xóa thống kê'); } catch (err) { UI.toast(err.message, 'err'); } }
      } else if (act === 'reset') {
        const ok = await UI.confirm({ title: 'Khôi phục dữ liệu gốc?', text: 'Mọi game, danh mục, sản phẩm và cài đặt đã sửa trên trình duyệt này sẽ được thay bằng dữ liệu trong data.js. Nên tải bản sao lưu trước.', ok: 'Khôi phục', danger: true });
        if (!ok) return;
        const snap = snapshot();
        Store.reset(); Store.get(); A.sel.clear();
        UI.applyLook(D().settings);
        updateCounts(); render(false);
        UI.toast('Đã khôi phục dữ liệu gốc', 'ok', { action: 'Hoàn tác', onAction: () => undo(snap) });
      }
    };
    const drop = $('#drop', v), input = $('#fileIn', v);
    drop.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); } });
    input.addEventListener('change', () => { if (input.files[0]) importFile(input.files[0]); input.value = ''; });
    ['dragenter', 'dragover'].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.add('over'); }));
    ['dragleave', 'drop'].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.remove('over'); }));
    drop.addEventListener('drop', e => { const f = e.dataTransfer.files[0]; if (f) importFile(f); });
  }

  async function importFile(file) {
    let data;
    try { data = JSON.parse(await file.text()); } catch (e) { UI.toast('File không đúng định dạng JSON.', 'err'); return; }
    if (!data || !Array.isArray(data.games) || !Array.isArray(data.cats) || !Array.isArray(data.prods)) {
      UI.toast('File không phải bản sao lưu bảng giá hợp lệ.', 'err'); return;
    }
    const ok = await UI.confirm({
      title: 'Thay dữ liệu bằng file này?',
      text: `File <b>${U.esc(file.name)}</b> có ${data.games.length} game, ${data.cats.length} danh mục và ${data.prods.length} sản phẩm. Dữ liệu hiện tại sẽ bị thay thế.`,
      ok: 'Nhập dữ liệu'
    });
    if (!ok) return;
    const snap = snapshot();
    Store.replace(data); A.sel.clear(); A.draft = null;
    UI.applyLook(D().settings);
    updateCounts(); render(false);
    UI.toast('Đã nhập dữ liệu', 'ok', { action: 'Hoàn tác', onAction: () => undo(snap) });
  }

  /* =========================================================
     KHỞI ĐỘNG
     ========================================================= */
  function init() {
    UI.hydrate();
    UI.applyLook(D().settings);
    UI.themeButton($('#themeBtn'));
    bindLogin();
    bindBulk();

    $('#logoutBtn').addEventListener('click', async () => { await Store.auth.logout(); A.sel.clear(); updateBulk(); discardSettings(); showLogin(); UI.toast('Đã đăng xuất', 'info'); });
    $('#menuBtn').addEventListener('click', () => toggleSidebar(true));
    $('#sbScrim').addEventListener('click', () => toggleSidebar(false));
    $('#collapseBtn').addEventListener('click', () => {
      const on = document.documentElement.classList.toggle('sb-collapsed');
      U.ls.set('ct_sb_collapsed', on);
      setTimeout(moveInd, 380);
    });
    window.addEventListener('hashchange', route);
    window.addEventListener('resize', U.debounce(moveInd, 120));
    document.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's' && DRAFT_ROUTES.includes(A.route) && A.dirty) { e.preventDefault(); saveSettings(); }
      if (e.key === 'Escape') toggleSidebar(false);
    });
    Store.on(kind => {
      if (kind === 'session' && !Store.session.active()) { showLogin(); return; }
      if ($('#app').hidden) return;
      updateCounts();
      if (!(DRAFT_ROUTES.includes(A.route) && A.dirty) && !document.querySelector('.overlay')) render(false);
    });

    if (Store.session.active()) showApp(); else showLogin();
  }
  Store.ready.then(init);
})();
