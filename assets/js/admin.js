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
  const idOf = el => el && el.closest('[data-id]') && el.closest('[data-id]').dataset.id;

  function fieldErr(root, key, msg) {
    const e = root.querySelector(`[data-err="${key}"]`);
    if (e) {
      e.textContent = msg;
      const inp = e.parentElement.querySelector('.input, .select');
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
    $('#loginForm').addEventListener('submit', e => {
      e.preventDefault();
      const pw = $('#pw').value;
      if (Store.checkPassword(pw)) {
        Store.session.start();
        $('#pw').value = ''; $('#pwErr').textContent = '';
        showApp();
        UI.toast('Đăng nhập thành công');
      } else {
        const card = $('.login-card');
        card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake');
        $('#pwErr').textContent = pw ? 'Mật khẩu không đúng. Vui lòng thử lại.' : 'Vui lòng nhập mật khẩu.';
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
    if (A.dirty && A.route === 'settings' && key !== 'settings') {
      const ok = await UI.confirm({ title: 'Bỏ thay đổi chưa lưu?', text: 'Các thay đổi trong Cài đặt chưa được lưu sẽ bị mất.', ok: 'Bỏ thay đổi', cancel: 'Ở lại', danger: true });
      if (!ok) { skipHash = true; location.hash = 'settings'; return; }
      discardSettings();
    }
    if (key !== A.route) A.sel.clear();
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
      else if (act === 'goto-prods') Object.assign(A.pf, { game: id, cat: '', q: '', status: 'all' });
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
      side: true,
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
  function vCats(v) {
    const d = D();
    if (A.cf.game && !Store.game(A.cf.game)) A.cf.game = '';
    const gf = A.cf.game;
    const list = d.cats.filter(c => !gf || c.gameId === gf);
    v.innerHTML = `<section class="panel">
      <div class="panel-h"><div><h2>Danh mục</h2><p class="muted small">${list.length} danh mục${gf ? ' trong ' + U.esc(Store.game(gf).name) : ' của tất cả game'}. Thứ tự sắp xếp áp dụng trong từng game.</p></div>
        <div class="toolbar ml-auto">
          <select class="select sel-auto" id="cfGame" aria-label="Lọc theo game"><option value="">Tất cả game</option>${d.games.map(g => `<option value="${g.id}" ${g.id === gf ? 'selected' : ''}>${U.esc(g.name)}</option>`).join('')}</select>
          <button class="btn btn-primary" type="button" data-act="add">${I('plus', 16)}Thêm danh mục</button>
        </div></div>
      ${list.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th class="w-drag"></th><th>Danh mục</th><th>Game</th><th class="num">Số gói</th><th class="num">Giá từ</th><th>Hiển thị</th><th class="num">Thao tác</th></tr></thead>
      <tbody>${list.map(c => {
        const g = Store.game(c.gameId), ps = d.prods.filter(p => p.catId === c.id);
        const sib = d.cats.filter(x => x.gameId === c.gameId), k = sib.indexOf(c);
        return `<tr data-id="${c.id}" class="${c.visible ? '' : 'is-hidden'}">
          <td class="w-drag">${dragCell(k === 0, k === sib.length - 1)}</td>
          <td><b>${U.esc(c.name)}</b></td>
          <td>${g ? `<span class="cell-main sm">${avatar(g, 'xs')}<span>${U.esc(g.name)}</span></span>` : '—'}</td>
          <td class="num"><a class="lnk" href="#prods" data-act="goto">${ps.length} gói</a></td>
          <td class="num">${ps.length ? U.fmt(Math.min(...ps.map(p => p.price))) : '—'}</td>
          <td>${sw(c.visible, 'data-act="vis" aria-label="Hiển thị ' + U.esc(c.name) + '"')}</td>
          <td class="num"><div class="row-actions">${rowBtn('edit', 'edit', 'Sửa')}${rowBtn('trash', 'trash', 'Xóa', 'danger')}</div></td></tr>`;
      }).join('')}</tbody></table></div>` : emptyState('folder', 'Chưa có danh mục', gf ? 'Game này chưa có danh mục nào.' : 'Thêm danh mục cho game của bạn.', 'add', 'Thêm danh mục')}
    </section>`;
    $('#cfGame', v).addEventListener('change', e => { A.cf.game = e.target.value; render(false); });
    v.onclick = e => {
      const b = e.target.closest('[data-act]'); if (!b) return;
      const id = idOf(b), act = b.dataset.act;
      if (act === 'add') catForm(null, A.cf.game);
      else if (act === 'edit') catForm(id);
      else if (act === 'trash') delCat(id);
      else if (act === 'up' || act === 'down') move('cats', id, act === 'up' ? -1 : 1, 'gameId');
      else if (act === 'goto') { const c = Store.cat(id); Object.assign(A.pf, { game: c.gameId, cat: id, q: '', status: 'all' }); }
    };
    v.onchange = e => {
      if (!e.target.matches('[data-act="vis"]')) return;
      const c = Store.cat(idOf(e.target));
      c.visible = e.target.checked;
      commit(c.visible ? `Đã hiện “${c.name}”` : `Đã ẩn “${c.name}”`);
    };
    sortable($('tbody', v), 'cats', 'gameId');
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
  function filteredProds() {
    const d = D(), f = A.pf, fq = U.fold(f.q).trim();
    let list = d.prods.filter(p => {
      const c = Store.cat(p.catId); if (!c) return false;
      if (f.game && c.gameId !== f.game) return false;
      if (f.cat && p.catId !== f.cat) return false;
      if (fq && !U.fold(p.name + ' ' + c.name).includes(fq)) return false;
      switch (f.status) {
        case 'on': return p.visible;
        case 'off': return !p.visible;
        case 'sale': return U.off(p) > 0;
        case 'hot': return p.badge === 'hot';
        case 'new': return p.badge === 'new';
        default: return true;
      }
    });
    if (f.sort) {
      const views = Store.views.all();
      const key = { name: p => U.fold(p.name), price: p => p.price, views: p => views[p.id] || 0 }[f.sort];
      list = [...list].sort((a, b) => { const x = key(a), y = key(b); return (x > y ? 1 : x < y ? -1 : 0) * f.dir; });
    }
    return list;
  }

  function vProds(v) {
    const d = D(), f = A.pf;
    if (f.cat && !Store.cat(f.cat)) f.cat = '';
    if (f.game && !Store.game(f.game)) f.game = '';
    if (f.cat) f.game = Store.cat(f.cat).gameId;
    v.innerHTML = `<section class="panel">
      <div class="panel-h"><div><h2>Sản phẩm</h2><p class="muted small" id="pCount"></p></div>
        <button class="btn btn-primary ml-auto" type="button" data-act="add">${I('plus', 16)}Thêm sản phẩm</button></div>
      <div class="filters">
        <label class="search-in">${I('search', 16)}<input class="input" id="pQ" placeholder="Tìm theo tên gói hoặc danh mục…" value="${U.esc(f.q)}" aria-label="Tìm sản phẩm"></label>
        <select class="select" id="pGame" aria-label="Lọc theo game"><option value="">Tất cả game</option>${d.games.map(g => `<option value="${g.id}" ${g.id === f.game ? 'selected' : ''}>${U.esc(g.name)}</option>`).join('')}</select>
        <select class="select" id="pCat" aria-label="Lọc theo danh mục" ${f.game ? '' : 'disabled'}><option value="">${f.game ? 'Tất cả danh mục' : 'Chọn game trước'}</option>${d.cats.filter(c => c.gameId === f.game).map(c => `<option value="${c.id}" ${c.id === f.cat ? 'selected' : ''}>${U.esc(c.name)}</option>`).join('')}</select>
        <select class="select" id="pStatus" aria-label="Lọc theo trạng thái">${[['all', 'Mọi trạng thái'], ['on', 'Đang hiện'], ['off', 'Đang ẩn'], ['sale', 'Đang giảm giá'], ['hot', 'Nhãn Hot'], ['new', 'Nhãn Mới']].map(([k, l]) => `<option value="${k}" ${k === f.status ? 'selected' : ''}>${l}</option>`).join('')}</select>
        ${(f.q || f.game || f.status !== 'all' || f.sort) ? `<button class="btn btn-ghost btn-sm" type="button" data-act="clear-f">${I('x', 14)}Bỏ lọc</button>` : ''}
      </div>
      <div id="pTable"></div>
    </section>`;
    renderProdTable();
    $('#pQ', v).addEventListener('input', U.debounce(e => { f.q = e.target.value; renderProdTable(); }, 120));
    $('#pGame', v).addEventListener('change', e => { f.game = e.target.value; f.cat = ''; render(false); });
    $('#pCat', v).addEventListener('change', e => { f.cat = e.target.value; render(false); });
    $('#pStatus', v).addEventListener('change', e => { f.status = e.target.value; render(false); });
    v.onclick = e => {
      const b = e.target.closest('[data-act], [data-sortby]'); if (!b) return;
      if (b.dataset.sortby) {
        const k = b.dataset.sortby;
        if (f.sort === k) { if (f.dir === 1) f.dir = -1; else { f.sort = ''; f.dir = 1; } } else { f.sort = k; f.dir = 1; }
        render(false); return;
      }
      const id = idOf(b), act = b.dataset.act;
      if (act === 'add') prodForm(null);
      else if (act === 'edit') prodForm(id);
      else if (act === 'dup') dupProd(id);
      else if (act === 'trash') delProds([id]);
      else if (act === 'qprice') quickPrice(b);
      else if (act === 'up' || act === 'down') move('prods', id, act === 'up' ? -1 : 1, 'catId');
      else if (act === 'clear-f') { Object.assign(f, { q: '', game: '', cat: '', status: 'all', sort: '', dir: 1 }); render(false); }
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
        syncAllCheck(); updateBulk();
      } else if (t.matches('[data-act="all"]')) {
        filteredProds().forEach(p => { if (t.checked) A.sel.add(p.id); else A.sel.delete(p.id); });
        renderProdTable();
      }
    };
  }

  function syncAllCheck() {
    const all = $('#pTable [data-act="all"]'); if (!all) return;
    const list = filteredProds();
    const n = list.filter(p => A.sel.has(p.id)).length;
    all.checked = list.length > 0 && n === list.length;
    all.indeterminate = n > 0 && n < list.length;
  }

  function renderProdTable() {
    const box = $('#pTable'); if (!box) return;
    const d = D(), f = A.pf, list = filteredProds(), views = Store.views.all();
    const canOrder = !f.sort;
    $('#pCount').textContent = `Đang xem ${list.length} / ${d.prods.length} sản phẩm${canOrder ? '. Kéo để đổi thứ tự trong danh mục.' : '.'}`;
    const th = (k, l, cls = '') => `<th class="${cls}"><button type="button" class="th-sort${f.sort === k ? ' on' : ''}" data-sortby="${k}">${l}${f.sort === k ? I(f.dir > 0 ? 'chevUp' : 'chevDown', 14) : I('sort', 13)}</button></th>`;
    box.innerHTML = list.length ? `<div class="tbl-wrap"><table class="tbl tbl-prods"><thead><tr>
        <th class="w-check"><label class="check"><input type="checkbox" data-act="all" aria-label="Chọn tất cả"><span></span></label></th>
        ${canOrder ? '<th class="w-drag"></th>' : ''}${th('name', 'Sản phẩm')}${th('price', 'Giá bán', 'num')}<th class="num">Giá gốc</th><th>Thời gian</th>${th('views', 'Lượt xem', 'num')}<th>Hiển thị</th><th class="num">Thao tác</th></tr></thead>
      <tbody>${list.map(p => {
        const c = Store.cat(p.catId), g = Store.game(c.gameId);
        const sib = d.prods.filter(x => x.catId === p.catId), k = sib.indexOf(p);
        return `<tr data-id="${p.id}" class="${p.visible ? '' : 'is-hidden'}${A.sel.has(p.id) ? ' sel' : ''}">
          <td class="w-check"><label class="check"><input type="checkbox" data-act="sel" ${A.sel.has(p.id) ? 'checked' : ''} aria-label="Chọn ${U.esc(p.name)}"><span></span></label></td>
          ${canOrder ? `<td class="w-drag">${dragCell(k === 0, k === sib.length - 1)}</td>` : ''}
          <td><div class="cell-main">${g ? avatar(g, 'xs') : ''}<div><b>${U.esc(p.name)} ${badgeHtml(p)}</b><small>${g ? U.esc(g.name) : ''} › ${U.esc(c.name)}</small></div></div></td>
          <td class="num"><button class="qprice" type="button" data-act="qprice" title="Bấm để sửa nhanh giá">${U.fmt(p.price)}${I('edit', 12)}</button></td>
          <td class="num muted">${p.oldPrice ? `<s>${U.fmt(p.oldPrice)}</s>` : '—'}</td>
          <td class="nowrap">${U.esc(p.time || '—')}</td>
          <td class="num">${views[p.id] || 0}</td>
          <td>${sw(p.visible, 'data-act="vis" aria-label="Hiển thị ' + U.esc(p.name) + '"')}</td>
          <td class="num"><div class="row-actions">${rowBtn('edit', 'edit', 'Sửa')}${rowBtn('dup', 'copy', 'Nhân bản')}${rowBtn('trash', 'trash', 'Xóa', 'danger')}</div></td></tr>`;
      }).join('')}</tbody></table></div>`
      : emptyState('box', 'Không có sản phẩm phù hợp', (f.q || f.status !== 'all' || f.game) ? 'Thử bỏ bớt bộ lọc hoặc đổi từ khóa tìm kiếm.' : 'Thêm sản phẩm đầu tiên cho bảng giá.', 'add', 'Thêm sản phẩm');
    UI.hydrate(box);
    syncAllCheck();
    if (canOrder) sortable($('tbody', box), 'prods', 'catId');
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
      renderProdTable(); flashRow(p.id);
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
      side: true, cls: 'wide',
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
          <div class="field full"><label for="fDesc">Mô tả</label><textarea class="textarea" id="fDesc" placeholder="${U.esc(s.defaultDesc)}">${U.esc(f.desc)}</textarea><span class="hint">Để trống sẽ dùng mô tả mặc định trong Cài đặt.</span></div>
          <div class="field full"><label for="fNotes">Lưu ý (mỗi dòng một ý)</label><textarea class="textarea" id="fNotes" placeholder="${U.esc(s.defaultNotes)}">${U.esc(f.notes)}</textarea><span class="hint">Để trống sẽ dùng lưu ý mặc định.</span></div>
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
      const data = { catId, name, price, oldPrice: U.parseNum(q('#fOld').value), time: q('#fTime').value.trim(), badge, desc: q('#fDesc').value.trim(), notes: q('#fNotes').value.trim(), visible: q('#fVis').checked };
      let nid = id;
      if (p) {
        const moved = p.catId !== catId;
        Object.assign(p, data);
        if (moved) { d.prods.splice(d.prods.indexOf(p), 1); insertInGroup(d.prods, p, 'catId'); }
      } else {
        nid = U.uid('p');
        insertInGroup(d.prods, { id: nid, ...data }, 'catId');
      }
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
      if (act === 'clear') { A.sel.clear(); renderProdTable(); return; }
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
      ['messenger', 'Link Messenger', 'text', 'Ví dụ: https://m.me/tenfanpage'],
      ['email', 'Email', 'text'],
      ['hours', 'Giờ làm việc', 'text']
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
  function discardSettings() { A.draft = null; A.dirty = false; UI.applyAccent(D().settings.accent); }
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
    v.innerHTML = `<div class="settings">
      ${SF.map(sec => `<section class="panel"><div class="panel-h"><span class="ph-ic">${I(sec.i, 18)}</span><h2>${sec.t}</h2></div><div class="panel-b form-stack">${sec.f.map(field).join('')}</div></section>`).join('')}
      <section class="panel"><div class="panel-h"><span class="ph-ic">${I('palette', 18)}</span><h2>Màu chủ đạo</h2></div>
        <div class="panel-b form-stack"><div class="accents">${Object.entries(UI.ACCENTS).map(([k, a]) => `<button type="button" class="acc${s.accent === k ? ' on' : ''}" data-acc="${k}" style="--c:${a.l}"><span class="acc-sw">${I('check', 16)}</span><span>${a.name}</span></button>`).join('')}</div>
        <p class="hint">Áp dụng cho nút, liên kết và điểm nhấn trên cả trang khách lẫn trang quản trị. Bấm để xem trước, nhớ bấm Lưu.</p></div></section>
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
    <div class="savebar${A.dirty ? ' show' : ''}" id="saveBar">
      <span>${I('info', 16)}Bạn có thay đổi chưa lưu</span>
      <button class="btn btn-sm" type="button" data-act="undo">Hoàn tác</button>
      <button class="btn btn-primary btn-sm" type="button" data-act="save">${I('check', 14)}Lưu thay đổi</button>
    </div>`;
    const onField = e => {
      const t = e.target, k = t.dataset.k; if (!k) return;
      s[k] = t.type === 'checkbox' ? t.checked : t.type === 'number' ? Number(t.value) : t.value;
      setDirty(true);
    };
    v.oninput = onField; v.onchange = onField;
    v.onclick = e => {
      const a = e.target.closest('[data-acc]');
      if (a) {
        s.accent = a.dataset.acc; UI.applyAccent(s.accent);
        $$('.acc', v).forEach(x => x.classList.toggle('on', x === a));
        setDirty(true); return;
      }
      const b = e.target.closest('[data-act]'); if (!b) return;
      if (b.dataset.act === 'save') saveSettings();
      if (b.dataset.act === 'undo') { discardSettings(); render(false); UI.toast('Đã hoàn tác thay đổi', 'info'); }
    };
    $('#pwForm', v).addEventListener('submit', e => {
      e.preventDefault();
      const f = e.currentTarget;
      const cur = $('#pwCur', f).value, n1 = $('#pwNew', f).value, n2 = $('#pwNew2', f).value;
      if (!Store.checkPassword(cur)) return fieldErr(f, 'cur', 'Mật khẩu hiện tại không đúng.');
      if (n1.length < 6) return fieldErr(f, 'new', 'Mật khẩu mới cần ít nhất 6 ký tự.');
      if (n1 !== n2) return fieldErr(f, 'new2', 'Hai mật khẩu chưa khớp.');
      D().settings.passwordHash = U.hash(n1);
      Store.save();
      f.reset();
      UI.toast('Đã đổi mật khẩu');
    });
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
            <div><dt>Nguồn dữ liệu</dt><dd>${Store.hasLocal() ? 'Đã chỉnh sửa, lưu trong trình duyệt này' : 'Dữ liệu gốc trong file data.js'}</dd></div>
            <div><dt>Cập nhật lần cuối</dt><dd>${U.dateTime(d.updatedAt)}</dd></div>
            <div><dt>Dung lượng</dt><dd>${(size / 1024).toFixed(1)} KB</dd></div>
            <div><dt>Nội dung</dt><dd>${d.games.length} game · ${d.cats.length} danh mục · ${d.prods.length} sản phẩm</dd></div>
          </dl>
          <div class="callout">${I('info', 18)}<p>Mọi thay đổi ở trang quản trị được lưu ngay trong trình duyệt bạn đang dùng. Khi đăng web lên mạng, hãy <b>tải file data.js</b> bên dưới và chép đè vào thư mục <code>assets/js/</code> để mọi khách đều thấy bảng giá mới.</p></div>
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
        if (ok) { Store.views.clear(); render(false); UI.toast('Đã xóa thống kê'); }
      } else if (act === 'reset') {
        const ok = await UI.confirm({ title: 'Khôi phục dữ liệu gốc?', text: 'Mọi game, danh mục, sản phẩm và cài đặt đã sửa trên trình duyệt này sẽ được thay bằng dữ liệu trong data.js. Nên tải bản sao lưu trước.', ok: 'Khôi phục', danger: true });
        if (!ok) return;
        const snap = snapshot();
        Store.reset(); Store.get(); A.sel.clear();
        UI.applyAccent(D().settings.accent);
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
    UI.applyAccent(D().settings.accent);
    updateCounts(); render(false);
    UI.toast('Đã nhập dữ liệu', 'ok', { action: 'Hoàn tác', onAction: () => undo(snap) });
  }

  /* =========================================================
     KHỞI ĐỘNG
     ========================================================= */
  function init() {
    UI.hydrate();
    UI.applyAccent(D().settings.accent);
    UI.themeButton($('#themeBtn'));
    bindLogin();
    bindBulk();

    $('#logoutBtn').addEventListener('click', () => { Store.session.end(); A.sel.clear(); updateBulk(); discardSettings(); showLogin(); UI.toast('Đã đăng xuất', 'info'); });
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
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's' && A.route === 'settings' && A.dirty) { e.preventDefault(); saveSettings(); }
      if (e.key === 'Escape') toggleSidebar(false);
    });
    Store.on(kind => {
      if (kind === 'session' && !Store.session.active()) { showLogin(); return; }
      if ($('#app').hidden) return;
      updateCounts();
      if (!(A.route === 'settings' && A.dirty) && !document.querySelector('.overlay')) render(false);
    });

    if (Store.session.active()) showApp(); else showLogin();
  }
  init();
})();
