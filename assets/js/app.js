/* =========================================================
   TRANG KHÁCH — logic chọn game → danh mục → sản phẩm → chi tiết
   ========================================================= */
(() => {
  'use strict';
  const { Store, U, UI } = window.CT;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const mqMobile = window.matchMedia('(max-width: 960px)');

  // Trạng thái lựa chọn hiện tại
  const S = { gameId: null, catId: null, prodId: null, sort: 'def', sale: false, price: 0 };

  /* ---------- Dữ liệu công khai ---------- */
  const D = () => Store.get();
  const games = () => D().games.filter(g => g.visible);
  const catsOf = gid => D().cats.filter(c => c.gameId === gid && c.visible);
  const prodsOf = cid => D().prods.filter(p => p.catId === cid && p.visible);
  const gameProds = gid => catsOf(gid).flatMap(c => prodsOf(c.id));
  const minOf = list => (list.length ? Math.min(...list.map(p => p.price)) : 0);
  const avatar = (g, cls = '') => `<span class="av ${cls}" style="--c:${U.esc(g.color)}">${U.esc(g.initials || U.initials(g.name))}</span>`;
  const badges = p => {
    let h = '';
    const o = U.off(p);
    if (p.badge === 'hot') h += `<span class="badge badge-hot">${UI.icon('fire', 11)}Hot</span>`;
    if (p.badge === 'new') h += '<span class="badge badge-new">Mới</span>';
    if (o) h += `<span class="badge badge-sale">-${o}%</span>`;
    return h;
  };
  const richTitle = t => U.esc(t).replace(/\*(.+?)\*/g, '<span class="hl">$1</span>');
  const zaloDigits = () => String(D().settings.zalo || '').replace(/\D/g, '');

  /* ---------- Thông tin shop ---------- */
  function applyLinks(root = document) {
    const s = D().settings, z = zaloDigits();
    const links = {
      zalo: z ? 'https://zalo.me/' + z : '#',
      facebook: s.facebook || '#',
      messenger: s.messenger || s.facebook || '#',
      tel: z ? 'tel:' + z : '#',
      email: s.email ? 'mailto:' + s.email : '#'
    };
    $$('[data-href]', root).forEach(a => { a.href = links[a.dataset.href] || '#'; });
  }

  const fmtStat = (v, dec, suf) => (dec ? Number(v).toFixed(dec).replace('.', ',') : U.num(v)) + suf;
  function setStat(sel, val, dec, suf) {
    const el = $(sel);
    el.dataset.to = val; el.dataset.dec = dec; el.dataset.suf = suf;
    el.textContent = fmtStat(val, dec, suf);
  }

  function renderBrand() {
    const s = D().settings;
    document.title = `${s.siteName} · ${s.tagline}`;
    $$('[data-bind]').forEach(el => { el.textContent = s[el.dataset.bind] ?? ''; });
    $('#heroTitle').innerHTML = richTitle(s.heroTitle);
    $('#updated').textContent = 'Bảng giá cập nhật ' + U.date(D().updatedAt);
    setStat('#statOrders', s.statOrders, 0, '+');
    setStat('#statBoosters', s.statBoosters, 0, '');
    setStat('#statRating', s.statRating, 1, '/5');
    applyLinks();
    UI.applyAccent(s.accent);

    // Thanh thông báo
    let closed = '';
    try { closed = sessionStorage.getItem('ct_ann_closed') || ''; } catch (e) { /* bỏ qua */ }
    const an = $('#announce');
    an.hidden = !(s.announcementOn && s.announcement) || closed === s.announcement;
    an.classList.remove('closing');
    $('#announceText').textContent = s.announcement;

    // Bảo trì
    const admin = Store.session.active();
    const maint = !!s.maintenanceOn;
    $('#maint').hidden = !(maint && !admin);
    $('#adminBar').hidden = !(maint && admin);
    $('#maintText').textContent = s.maintenanceText;
    document.documentElement.classList.toggle('no-scroll', maint && !admin);
  }

  /* ---------- Gói nổi bật (hero) ---------- */
  const F = { list: [], i: 0, timer: null };
  function buildFeatured() {
    const all = D().prods.filter(p => Store.isPublic(p));
    let list = all.filter(p => p.badge === 'hot' || U.off(p));
    if (list.length < 2) list = all.slice(0, 6);
    F.list = list.slice(0, 8);
    if (F.i >= F.list.length) F.i = 0;
    $('#feature').hidden = !F.list.length;
    $('#featDots').innerHTML = F.list.map((_, i) => `<button class="fdot${i === F.i ? ' on' : ''}" data-i="${i}" aria-label="Gói nổi bật ${i + 1}"></button>`).join('');
    paintFeat(false);    renderStrip();
  }
  // Điện thoại: dải thẻ nhỏ chạy ngang từ phải sang trái
  function renderStrip() {
    const strip = $('#fstrip'), track = $('#fsTrack');
    strip.hidden = !F.list.length;
    if (!F.list.length) return;
    const card = (p, dup) => {
      const c = Store.cat(p.catId), g = Store.game(c.gameId), off = U.off(p);
      return `<button class="fs-card" type="button" data-id="${p.id}"${dup ? ' aria-hidden="true" tabindex="-1"' : ''}>
        ${avatar(g, 'sm')}
        <span class="fs-t"><b>${U.esc(p.name)}</b><small>${U.esc(c.name)}</small></span>
        <span class="fs-p"><b>${U.fmt(p.price)}</b>${off ? `<em>-${off}%</em>` : p.badge === 'hot' ? '<em class="hot">Hot</em>' : ''}</span></button>`;
    };
    // Nhân bản để băng chạy liền mạch, đủ dài để không bị hở
    let base = F.list;
    while (base.length < 6) base = base.concat(F.list);
    track.innerHTML = base.map(p => card(p)).join('') + base.map(p => card(p, true)).join('');
    track.style.animationDuration = Math.max(16, base.length * 4) + 's';
  }
  function paintFeat(anim = true) {
    const p = F.list[F.i];
    if (!p) return;
    const c = Store.cat(p.catId), g = Store.game(c.gameId);
    const body = $('#featBody');
    const html = `<div class="f-game">${avatar(g, 'sm')}<span>${U.esc(g.name)}</span>${UI.icon('chevRight', 14)}<span>${U.esc(c.name)}</span></div>
      <h3 class="f-name">${U.esc(p.name)}</h3>
      <div class="f-badges">${badges(p)}<span class="f-time">${UI.icon('clock', 14)}${U.esc(p.time || 'Liên hệ')}</span></div>
      <div class="f-price"><b>${U.fmt(p.price)}</b>${p.oldPrice > p.price ? `<s>${U.fmt(p.oldPrice)}</s>` : ''}</div>`;
    const set = () => { body.innerHTML = html; body.dataset.id = p.id; };
    if (!anim || U.reduced()) set();
    else { body.classList.add('out'); setTimeout(() => { set(); body.classList.remove('out'); }, 260); }
    $$('.fdot').forEach((d, i) => d.classList.toggle('on', i === F.i));
    restartFeatTimer();
  }
  function restartFeatTimer() {
    const bar = $('#featProg');
    clearInterval(F.timer);
    if (F.list.length < 2) { bar.classList.remove('run'); return; }
    if (U.reduced()) { F.timer = setInterval(() => { if (!document.hidden) nextFeat(); }, 7000); return; }
    bar.classList.remove('run'); void bar.offsetWidth; bar.classList.add('run');
  }
  function nextFeat() { if (!F.list.length) return; F.i = (F.i + 1) % F.list.length; paintFeat(); }

  /* ---------- Bước 1: ô chọn game ---------- */
  const DD = { open: false, hl: 0, q: '' };
  function renderGameBtn() {
    const g = S.gameId && Store.game(S.gameId);
    $('#ddBtn').innerHTML = g
      ? `${avatar(g)}<span class="dd-txt"><span class="dd-name">${U.esc(g.name)}</span><span class="dd-sub">${catsOf(g.id).length} danh mục · ${gameProds(g.id).length} gói</span></span>${UI.icon('chevDown', 18, 'caret')}`
      : `<span class="av ph-av">${UI.icon('gamepad', 18)}</span><span class="dd-txt"><span class="dd-ph">Vui lòng chọn game</span></span>${UI.icon('chevDown', 18, 'caret')}`;
    $('#gameMeta').textContent = games().length + ' game';
  }
  function gameList() {
    const q = U.fold(DD.q).trim();
    return games().filter(g => !q || U.fold(g.name).includes(q));
  }
  function renderGameList() {
    const list = gameList();
    $('#ddList').innerHTML = list.length ? list.map((g, i) => {
      const ps = gameProds(g.id);
      return `<li class="dd-opt${i === DD.hl ? ' hl' : ''}" role="option" id="ddo-${g.id}" data-id="${g.id}" aria-selected="${g.id === S.gameId}" style="--i:${i}">
        ${avatar(g)}<span class="dd-txt"><span class="dd-name">${U.highlight(g.name, DD.q)}</span>
        <span class="dd-sub">${catsOf(g.id).length} danh mục${ps.length ? ' · từ ' + U.fmt(minOf(ps)) : ''}</span></span>${UI.icon('check', 18, 'ck')}</li>`;
    }).join('') : `<li class="dd-empty">Không tìm thấy game “${U.esc(DD.q)}”</li>`;
  }
  function markHl() {
    const opts = $$('.dd-opt');
    opts.forEach((o, i) => o.classList.toggle('hl', i === DD.hl));
    const cur = opts[DD.hl];
    if (cur) { cur.scrollIntoView({ block: 'nearest' }); $('#ddSearch').setAttribute('aria-activedescendant', cur.id); }
  }
  function openDD() {
    if (DD.open) return;
    DD.open = true; DD.q = ''; $('#ddSearch').value = '';
    DD.hl = Math.max(0, games().findIndex(g => g.id === S.gameId));
    renderGameList();
    $('#dd').classList.add('open');
    $('#ddBtn').setAttribute('aria-expanded', 'true');
    setTimeout(() => { $('#ddSearch').focus({ preventScroll: true }); markHl(); }, 40);
  }
  function closeDD(focusBtn) {
    if (!DD.open) return;
    DD.open = false;
    $('#dd').classList.remove('open');
    $('#ddBtn').setAttribute('aria-expanded', 'false');
    if (focusBtn) $('#ddBtn').focus({ preventScroll: true });
  }

  function selectGame(id) {
    closeDD(true);
    if (id === S.gameId) return;
    const hadPick = !!S.catId;
    S.gameId = id; S.catId = null; S.prodId = null; S.sale = false; S.sort = 'def';
    renderGameBtn(); renderCats(true); renderProds(true); renderDetail(); renderSteps(); clearHash();
    if (hadPick) UI.toast('Đã đổi game. Vui lòng chọn lại danh mục.', 'info');
  }

  /* ---------- Bước 2: danh mục ---------- */
  function renderCats(anim) {
    const g = S.gameId && Store.game(S.gameId);
    $('#catLock').classList.toggle('open', !g);
    $('#catWrap').classList.toggle('open', !!g);
    if (!g) { $('#catMeta').textContent = ''; hideHint($('#catHint')); return; }
    const cats = catsOf(g.id);
    const ul = $('#catList');
    $('#catMeta').textContent = cats.length + ' danh mục';
    ul.className = 'opts cat-opts' + (anim ? ' stagger' : '');
    ul.innerHTML = cats.length ? cats.map((c, i) => {
      const ps = prodsOf(c.id);
      return `<li style="--i:${Math.min(i, 8)}"><button class="opt" data-id="${c.id}" aria-pressed="${c.id === S.catId}">
        <span class="radio"></span>
        <span class="main"><span class="nm">${U.esc(c.name)}</span>
        <span class="sub">${ps.length} gói${ps.length ? ` · từ <b class="from">${U.fmt(minOf(ps))}</b>` : ''}</span></span>
        ${UI.icon('chevRight', 18, 'go')}</button></li>`;
    }).join('') : '<li class="opts-empty">Game này chưa có danh mục.</li>';
    if (anim) ul.scrollTop = 0;
    watchScroller(ul, $('#catHint'));
  }
  function selectCat(id) {
    if (id === S.catId) return;
    S.catId = id; S.prodId = null; S.sale = false; S.sort = 'def';
    $$('#catList .opt').forEach(o => o.setAttribute('aria-pressed', String(o.dataset.id === id)));
    renderProds(true); renderDetail(); renderSteps(); clearHash();
    if (mqMobile.matches) setTimeout(() => scrollToEl($('#cardProd')), 150);
  }

  /* ---------- Bước 3: sản phẩm ---------- */
  function sortedProds() {
    let list = prodsOf(S.catId);
    if (S.sale) list = list.filter(p => U.off(p));
    if (S.sort === 'asc') list = [...list].sort((a, b) => a.price - b.price);
    if (S.sort === 'desc') list = [...list].sort((a, b) => b.price - a.price);
    return list;
  }
  function renderProds(anim) {
    const c = S.catId && Store.cat(S.catId);
    $('#prodLockText').textContent = S.gameId ? 'Vui lòng chọn danh mục trước' : 'Vui lòng chọn game trước';
    $('#prodLock').classList.toggle('open', !c);
    $('#prodWrap').classList.toggle('open', !!c);
    if (!c) { $('#prodMeta').textContent = ''; hideHint($('#prodHint')); return; }
    const all = prodsOf(c.id), list = sortedProds();
    $('#prodMeta').textContent = all.length + ' sản phẩm';
    $$('#sortSeg button').forEach(b => b.classList.toggle('on', b.dataset.sort === S.sort));
    requestAnimationFrame(moveSegPill);
    const saleCount = all.filter(p => U.off(p)).length;
    const chip = $('#saleChip');
    chip.setAttribute('aria-pressed', String(S.sale));
    chip.querySelector('.cnt').textContent = saleCount;
    chip.disabled = !saleCount && !S.sale;
    const ul = $('#prodList');
    ul.className = 'opts prod-opts' + (anim ? ' stagger' : '');
    ul.innerHTML = list.length ? list.map((p, i) => `<li style="--i:${Math.min(i, 8)}"><button class="opt" data-id="${p.id}" aria-pressed="${p.id === S.prodId}">
        <span class="radio"></span>
        <span class="main"><span class="nm">${U.esc(p.name)}${badges(p)}</span>
        <span class="sub">${UI.icon('clock', 13)}${U.esc(p.time || 'Liên hệ')}</span></span>
        <span class="pr"><b>${U.fmt(p.price)}</b>${p.oldPrice > p.price ? `<s>${U.fmt(p.oldPrice)}</s>` : ''}</span></button></li>`).join('')
      : `<li class="opts-empty">${S.sale ? 'Danh mục này chưa có gói đang giảm giá.' : 'Danh mục này chưa có sản phẩm.'}</li>`;
    if (anim) ul.scrollTop = 0;
    watchScroller(ul, $('#prodHint'));
  }
  function moveSegPill() {
    const seg = $('#sortSeg'), on = seg.querySelector('button.on'), pill = seg.querySelector('.pill');
    if (!on || !on.offsetWidth) return;
    pill.style.left = on.offsetLeft + 'px';
    pill.style.width = on.offsetWidth + 'px';
  }
  function selectProd(id, { scroll = true } = {}) {
    S.prodId = id;
    $$('#prodList .opt').forEach(o => o.setAttribute('aria-pressed', String(o.dataset.id === id)));
    renderDetail(); renderSteps();
    Store.views.add(id); Store.recent.add(id); renderRecent();
    setHash(id);
    if (scroll && mqMobile.matches) setTimeout(() => scrollToEl($('#detail')), 90);
  }

  // Gợi ý "kéo xuống để xem thêm" khi danh sách dài hơn 5 dòng
  function watchScroller(ul, hint) {
    const wrap = ul.parentElement;
    const run = () => {
      const bottom = ul.scrollTop + ul.clientHeight + 4;
      const below = $$(':scope > li', ul).filter(li => li.offsetTop + li.offsetHeight > bottom).length;
      wrap.classList.toggle('more', below > 0);
      hint.classList.toggle('show', below > 0);
      hint.querySelector('span').textContent = `Kéo xuống để xem thêm ${below} mục`;
    };
    ul.onscroll = run;
    hint.onclick = () => ul.scrollBy({ top: ul.clientHeight * 0.8, behavior: U.reduced() ? 'auto' : 'smooth' });
    requestAnimationFrame(run);
  }
  function hideHint(h) { h.classList.remove('show'); }

  /* ---------- Bước 4: chi tiết ---------- */
  function summary(p) {
    const c = Store.cat(p.catId), g = Store.game(c.gameId), s = D().settings;
    return [
      `[${s.siteName}] Mình muốn đặt gói:`,
      `• Game: ${g.name}`,
      `• Danh mục: ${c.name}`,
      `• Gói: ${p.name}`,
      `• Giá: ${U.fmt(p.price)}`,
      `• Thời gian: ${p.time || 'Liên hệ'}`,
      `• Mã gói: ${p.id.toUpperCase()}`
    ].join('\n');
  }
  function renderDetail() {
    const box = $('#detailBody'), panel = $('#detail');
    const p = S.prodId && Store.prod(S.prodId);
    if (!p || !Store.isPublic(p)) {
      const [ic, title, text] = !S.gameId
        ? ['gamepad', 'Bắt đầu bằng việc chọn game', 'Giá và thông tin gói sẽ hiện ở đây sau khi bạn chọn đủ 3 bước.']
        : !S.catId
          ? ['folder', 'Tiếp theo, chọn danh mục', 'Mỗi danh mục gồm nhiều gói với mức giá khác nhau.']
          : ['box', 'Chọn một gói để xem chi tiết', 'Bấm vào gói bất kỳ trong danh sách sản phẩm.'];
      if (box.dataset.state !== ic) {
        box.dataset.state = ic;
        box.innerHTML = `<div class="dt-empty"><div class="art">${UI.icon(ic, 32)}</div><h3>${title}</h3><p>${text}</p></div>`;
      }
      panel.classList.remove('has');
      S.price = 0;
      return;
    }
    const c = Store.cat(p.catId), g = Store.game(c.gameId), s = D().settings;
    const off = U.off(p);
    const notes = U.notesOf(p, s), desc = U.descOf(p, s);
    const from = S.price || Math.round(p.price * 0.6);
    box.dataset.state = 'p-' + p.id;
    panel.classList.add('has');
    box.innerHTML = `<div class="dt">
      <div class="crumbs">${avatar(g, 'xs')}<span>${U.esc(g.name)}</span>${UI.icon('chevRight', 14)}<span>${U.esc(c.name)}</span></div>
      <div class="dt-title"><h3>${U.esc(p.name)}</h3><div class="dt-badges">${badges(p)}</div></div>
      <div class="price-box">
        <span class="lbl">Giá trọn gói</span>
        <div class="row"><span class="big" id="bigPrice">${U.fmt(from)}</span>${p.oldPrice > p.price ? `<s>${U.fmt(p.oldPrice)}</s>` : ''}</div>
        ${off ? `<span class="save">${UI.icon('tag', 14)}Tiết kiệm ${U.fmt(p.oldPrice - p.price)} so với giá gốc</span>` : ''}
      </div>
      <dl class="facts">
        <div class="fact">${UI.icon('clock', 18)}<div><dt>Thời gian</dt><dd>${U.esc(p.time || 'Liên hệ')}</dd></div></div>
        <div class="fact">${UI.icon('tag', 18)}<div><dt>Mã gói</dt><dd class="mono">${U.esc(p.id.toUpperCase())}</dd></div></div>
      </dl>
      ${desc ? `<p class="dt-desc">${U.esc(desc).replace(/\n/g, '<br>')}</p>` : ''}
      ${notes.length ? `<ul class="notes">${notes.map(n => `<li>${UI.icon('check', 16)}<span>${U.esc(n)}</span></li>`).join('')}</ul>` : ''}
      <div class="dt-actions">
        <a class="btn btn-primary btn-lg wide" data-href="zalo" target="_blank" rel="noopener" id="orderZalo">${UI.icon('chat', 18)}Nhắn Zalo đặt gói này</a>
        <a class="btn btn-soft" data-href="messenger" target="_blank" rel="noopener">${UI.icon('chat', 16)}Messenger</a>
        <button class="btn btn-ghost" id="copyInfo" type="button">${UI.icon('copy', 16)}Sao chép thông tin</button>
      </div>
      <div class="dt-links">
        <button class="link-btn" id="copyLink" type="button">${UI.icon('link', 14)}Sao chép link gói</button>
        <button class="link-btn" id="resetSel" type="button">${UI.icon('refresh', 14)}Chọn lại từ đầu</button>
      </div>
    </div>`;
    applyLinks(box);
    U.tween(from, p.price, 650, v => { const el = $('#bigPrice'); if (el) el.textContent = U.fmt(v); });
    S.price = p.price;

    $('#orderZalo').addEventListener('click', () => {
      U.copy(summary(p)).then(ok => { if (ok) UI.toast('Đã sao chép thông tin gói. Dán vào Zalo để gửi shop.'); });
    });
    $('#copyInfo').addEventListener('click', async () => {
      const ok = await U.copy(summary(p));
      UI.toast(ok ? 'Đã sao chép thông tin gói' : 'Không sao chép được, hãy bôi đen và sao chép thủ công', ok ? 'ok' : 'err');
    });
    $('#copyLink').addEventListener('click', async () => {
      const url = location.href.split('#')[0] + '#sp-' + p.id;
      const ok = await U.copy(url);
      UI.toast(ok ? 'Đã sao chép link gói' : 'Không sao chép được link', ok ? 'ok' : 'err');
    });
    $('#resetSel').addEventListener('click', resetAll);
  }

  /* ---------- Tiến trình ---------- */
  function renderSteps() {
    const cur = !S.gameId ? 1 : !S.catId ? 2 : !S.prodId ? 3 : 4;
    $$('.stp').forEach((el, i) => {
      const n = i + 1;
      el.classList.toggle('done', n < cur);
      el.classList.toggle('cur', n === cur);
      el.querySelector('.n').innerHTML = n < cur ? UI.icon('check', 15) : n;
    });
    $$('.stp-bar').forEach((b, i) => b.classList.toggle('fill', i + 1 < cur));
    const cls = (n) => 'card step-card ' + (cur === n ? 'cur' : cur > n ? 'done' : 'locked');
    [['#cardGame', 1], ['#cardCat', 2], ['#cardProd', 3]].forEach(([sel, n]) => {
      const el = $(sel);
      el.className = cls(n);
      el.querySelector('.sc-n').innerHTML = cur > n ? UI.icon('check', 14) : n;
    });
  }

  /* ---------- Đã xem gần đây ---------- */
  function renderRecent() {
    const ids = Store.recent.all().filter(id => Store.isPublic(Store.prod(id)));
    $('#recent').hidden = !ids.length;
    $('#recentList').innerHTML = ids.map(id => {
      const p = Store.prod(id), c = Store.cat(p.catId), g = Store.game(c.gameId);
      return `<button class="rchip" data-id="${id}" title="${U.esc(g.name + ' › ' + c.name)}">${avatar(g, 'xs')}<span>${U.esc(p.name)}</span><b>${U.fmt(p.price)}</b></button>`;
    }).join('');
  }

  /* ---------- Chọn nhanh một gói (tìm kiếm, link, gần đây) ---------- */
  function pick(id, { scroll = true } = {}) {
    const p = Store.prod(id);
    if (!Store.isPublic(p)) { UI.toast('Gói này hiện không còn hiển thị.', 'err'); return; }
    const c = Store.cat(p.catId);
    const gameChanged = S.gameId !== c.gameId;
    const listChanged = gameChanged || S.catId !== c.id || S.sale || S.sort !== 'def';
    S.gameId = c.gameId; S.catId = c.id; S.sale = false; S.sort = 'def'; S.prodId = null;
    closeDD();
    renderGameBtn();
    if (gameChanged) renderCats(true);
    else $$('#catList .opt').forEach(o => o.setAttribute('aria-pressed', String(o.dataset.id === c.id)));
    if (listChanged) renderProds(true);
    selectProd(id, { scroll: false });
    // Cuộn danh sách để thấy mục đang chọn
    requestAnimationFrame(() => {
      [['#catList', c.id], ['#prodList', id]].forEach(([sel, key]) => {
        const ul = $(sel), b = ul.querySelector(`.opt[data-id="${key}"]`);
        if (b) ul.scrollTop = Math.max(0, b.parentElement.offsetTop - 8);
      });
    });
    if (scroll) setTimeout(() => scrollToEl(mqMobile.matches ? $('#detail') : $('#stepper')), 60);
  }

  function resetAll() {
    S.gameId = S.catId = S.prodId = null; S.sale = false; S.sort = 'def';
    renderGameBtn(); renderCats(); renderProds(); renderDetail(); renderSteps(); clearHash();
    scrollToEl($('#stepper'));
  }
  function scrollToEl(el) {
    const y = el.getBoundingClientRect().top + window.scrollY - 84;
    window.scrollTo({ top: y, behavior: U.reduced() ? 'auto' : 'smooth' });
  }
  function setHash(id) { try { history.replaceState(null, '', '#sp-' + id); } catch (e) { /* bỏ qua */ } }
  function clearHash() {
    if (location.hash.startsWith('#sp-')) { try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* bỏ qua */ } }
  }

  /* ---------- Tìm kiếm (Ctrl K) ---------- */
  function openSearch() {
    if (document.querySelector('.overlay')) return;
    closeDD(); toggleMenu(false);
    const m = UI.modal({
      top: true, cls: 'sbox',
      html: `<div class="s-row">${UI.icon('search', 20)}<input class="s-input" id="sInput" placeholder="Tìm game, danh mục hoặc gói…" autocomplete="off" aria-label="Tìm kiếm"><kbd>Esc</kbd></div>
        <div class="s-results" id="sRes" role="listbox"></div>
        <div class="s-foot"><span><kbd>↑</kbd> <kbd>↓</kbd> di chuyển</span><span><kbd>Enter</kbd> chọn</span><span><kbd>Esc</kbd> đóng</span></div>`
    });
    const input = m.el.querySelector('#sInput'), res = m.el.querySelector('#sRes');
    let hl = 0;
    const row = (p, q) => {
      const c = Store.cat(p.catId), g = Store.game(c.gameId);
      return `<div class="s-item" role="option" data-prod="${p.id}">${avatar(g, 'sm')}<div class="s-main"><div class="s-name">${U.highlight(p.name, q)}</div><div class="s-sub">${U.esc(g.name)} › ${U.highlight(c.name, q)}</div></div><div class="s-pr">${U.fmt(p.price)}</div></div>`;
    };
    const items = () => $$('.s-item', res);
    const mark = () => { items().forEach((el, i) => el.classList.toggle('hl', i === hl)); const el = items()[hl]; if (el) el.scrollIntoView({ block: 'nearest' }); };
    const run = () => {
      const q = input.value.trim();
      const toks = U.fold(q).split(/\s+/).filter(Boolean);
      if (!toks.length) {
        const hot = D().prods.filter(p => Store.isPublic(p) && (p.badge === 'hot' || U.off(p))).slice(0, 8);
        res.innerHTML = hot.length ? '<div class="s-group">Gói nổi bật</div>' + hot.map(p => row(p, '')).join('') : '';
      } else {
        const gs = games().filter(g => toks.every(t => U.fold(g.name).includes(t)));
        const ps = D().prods.filter(p => {
          if (!Store.isPublic(p)) return false;
          const c = Store.cat(p.catId), g = Store.game(c.gameId);
          const hay = U.fold(`${p.name} ${c.name} ${g.name}`);
          return toks.every(t => hay.includes(t));
        }).slice(0, 40);
        let html = '';
        if (gs.length) html += '<div class="s-group">Game</div>' + gs.map(g => `<div class="s-item" role="option" data-game="${g.id}">${avatar(g, 'sm')}<div class="s-main"><div class="s-name">${U.highlight(g.name, q)}</div><div class="s-sub">${catsOf(g.id).length} danh mục · ${gameProds(g.id).length} gói</div></div>${UI.icon('chevRight', 16)}</div>`).join('');
        const byGame = new Map();
        ps.forEach(p => { const gid = Store.cat(p.catId).gameId; if (!byGame.has(gid)) byGame.set(gid, []); byGame.get(gid).push(p); });
        byGame.forEach((list, gid) => { html += `<div class="s-group">${U.esc(Store.game(gid).name)}</div>` + list.map(p => row(p, q)).join(''); });
        res.innerHTML = html || `<div class="s-empty">${UI.icon('search', 30)}<p>Không tìm thấy kết quả cho “${U.esc(q)}”.</p><p class="small">Thử tên rank như “kim cương” hoặc tên game.</p></div>`;
      }
      hl = 0; mark();
    };
    const choose = el => {
      if (!el) return;
      m.close();
      if (el.dataset.prod) pick(el.dataset.prod);
      else { selectGame(el.dataset.game); scrollToEl($('#stepper')); }
    };
    input.addEventListener('input', U.debounce(run, 60));
    input.addEventListener('keydown', e => {
      const n = items().length || 1;
      if (e.key === 'ArrowDown') { e.preventDefault(); hl = (hl + 1) % n; mark(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); hl = (hl - 1 + n) % n; mark(); }
      else if (e.key === 'Enter') { e.preventDefault(); choose(items()[hl]); }
    });
    res.addEventListener('click', e => choose(e.target.closest('.s-item')));
    res.addEventListener('mousemove', e => {
      const it = e.target.closest('.s-item'); if (!it) return;
      const i = items().indexOf(it);
      if (i !== hl) { hl = i; items().forEach((el, j) => el.classList.toggle('hl', j === hl)); }
    });
    run();
  }

  /* ---------- Hỏi đáp & đánh giá ---------- */
  function renderFaq() {
    const list = D().faqs.filter(f => f.visible);
    $('#hoi-dap').hidden = !list.length;
    $('#faqList').innerHTML = list.map((f, i) => `<div class="qa card">
      <button class="qa-q" aria-expanded="false" aria-controls="qa-a${i}" id="qa-q${i}">${U.esc(f.q)}<span class="pm">${UI.icon('plus', 16)}</span></button>
      <div class="qa-a" id="qa-a${i}" role="region" aria-labelledby="qa-q${i}"><div><p>${U.esc(f.a)}</p></div></div></div>`).join('');
  }
  function renderReviews() {
    const list = D().reviews.filter(r => r.visible);
    $('#danh-gia').hidden = !list.length;
    if (!list.length) return;
    const avg = list.reduce((a, r) => a + (+r.stars || 0), 0) / list.length;
    $('#avgRating').textContent = `Trung bình ${avg.toFixed(1).replace('.', ',')}/5 từ ${list.length} đánh giá gần đây.`;
    const card = (r, dup) => `<figure class="review card${dup ? ' dup' : ''}"${dup ? ' aria-hidden="true"' : ''}>
      <div class="stars" role="img" aria-label="${r.stars} trên 5 sao">${[1, 2, 3, 4, 5].map(i => `<span class="${i <= r.stars ? 'on' : ''}">${UI.icon('star', 16)}</span>`).join('')}</div>
      <blockquote>${U.esc(r.text)}</blockquote>
      <figcaption class="rv-foot"><span class="rv-av">${U.esc(U.initials(r.name))}</span><span><b>${U.esc(r.name)}</b><small>${U.esc(r.game)}</small></span></figcaption></figure>`;
    // Nhân đôi để băng chạy liền mạch
    let base = list;
    while (base.length < 6) base = base.concat(list);
    const track = $('#track');
    track.innerHTML = base.map(r => card(r)).join('') + base.map(r => card(r, true)).join('');
    track.style.animationDuration = Math.max(30, base.length * 8) + 's';
  }

  /* ---------- Menu, nút nổi, cuộn ---------- */
  function toggleMenu(open) {
    const m = $('#mnav');
    if (open === m.classList.contains('open')) return;
    m.classList.toggle('open', open);
    m.setAttribute('aria-hidden', String(!open));
    $('#menuBtn').setAttribute('aria-expanded', String(open));
    document.documentElement.classList.toggle('no-scroll', open);
  }
  /* ---------- Thanh liên hệ nhanh ---------- */
  const QC = { timer: null, touched: false, shown: false };
  function renderQuick() {
    const s = D().settings, q = s.quick || {};
    const items = (q.items || []).filter(it => it.visible !== false);
    const box = $('#qc');
    box.hidden = !q.on || !items.length;
    if (box.hidden) return;
    box.classList.toggle('left', q.side === 'left');
    $('#qcTitle').textContent = q.title || 'Hỗ trợ nhanh';
    $('#qcSub').hidden = !q.sub;
    $('#qcSub span').textContent = q.sub || '';
    $('#qcList').innerHTML = items.map(it => {
      const url = U.channelUrl(it, s), desc = U.channelDesc(it, s);
      const ext = /^https?:/i.test(url) ? ' target="_blank" rel="noopener"' : '';
      const inner = `${UI.channel(it.icon, 36)}<span class="qc-t"><b>${U.esc(it.name)}</b>${desc ? `<small>${U.esc(desc)}</small>` : ''}</span>`;
      return url ? `<a class="qc-item" href="${U.esc(url)}"${ext}>${inner}</a>` : `<div class="qc-item">${inner}</div>`;
    }).join('');
  }
  function toggleQuick(open) {
    const box = $('#qc');
    if (box.hidden || open === box.classList.contains('open')) return;
    box.classList.toggle('open', open);
    $('#qcTab').setAttribute('aria-expanded', String(open));
    $('#qcTab').setAttribute('aria-label', open ? 'Đóng hỗ trợ nhanh' : 'Mở hỗ trợ nhanh');
  }
  function autoQuick() {
    const q = D().settings.quick || {};
    if (QC.shown || !q.on || !q.auto || $('#qc').hidden) return;
    QC.shown = true;
    setTimeout(() => {
      if (QC.touched) return;
      toggleQuick(true);
      QC.timer = setTimeout(() => { if (!QC.touched) toggleQuick(false); }, Math.max(1, +q.autoSec || 2) * 1000);
    }, 700);
  }

  /* ---------- Chân trang ---------- */
  function renderFooter() {
    const s = D().settings;
    $('#footAbout').textContent = s.footerAbout || '';
    $('#footAbout').hidden = !s.footerAbout;
    const socials = ['facebook', 'youtube', 'tiktok', 'instagram', 'telegram', 'discord'].filter(k => s[k]);
    $('#footSocial').hidden = !s.footerSocial || !socials.length;
    $('#footSocial').innerHTML = socials.map(k => `<a href="${U.esc(s[k])}" target="_blank" rel="noopener" aria-label="${UI.CHANNELS[k].label}" title="${UI.CHANNELS[k].label}">${UI.channel(k, 34)}</a>`).join('');

    const cols = (s.footerCols || []).filter(c => c.visible !== false);
    $$('#footGrid > .foot-col').forEach(el => el.remove());
    const grid = $('#footGrid');
    cols.forEach(c => {
      let body = '';
      if (c.type === 'services') {
        body = games().slice(0, Math.max(1, +c.limit || 5)).map(g => `<li><a href="#bang-gia" data-game="${g.id}">${avatar(g, 'xs')}<span>${U.esc(g.name)}</span></a></li>`).join('');
      } else if (c.type === 'contact') {
        body = [
          s.zalo ? `<li>${UI.icon('chat', 16)}<span>Zalo: <b>${U.esc(s.zalo)}</b></span><button class="link-btn" data-copy="zalo" aria-label="Sao chép số Zalo">${UI.icon('copy', 14)}</button></li>` : '',
          s.phone && s.phone !== s.zalo ? `<li>${UI.icon('phone', 16)}<a href="tel:${U.digits(s.phone)}">${U.esc(s.phone)}</a></li>` : '',
          s.email ? `<li>${UI.icon('mail', 16)}<a href="mailto:${U.esc(s.email)}">${U.esc(s.email)}</a></li>` : '',
          s.hours ? `<li>${UI.icon('clock', 16)}<span>${U.esc(s.hours)}</span></li>` : ''
        ].join('');
      } else {
        body = (c.items || []).map(it => {
          const url = U.channelUrl(it, s);
          const inner = `${UI.channel(it.icon, 28)}<span class="fl-t"><span>${U.esc(it.name)}</span>${it.desc ? `<small>${U.esc(it.desc)}</small>` : ''}</span>`;
          return `<li>${url ? `<a class="fl" href="${U.esc(url)}"${/^https?:/i.test(url) ? ' target="_blank" rel="noopener"' : ''}>${inner}</a>` : `<span class="fl">${inner}</span>`}</li>`;
        }).join('');
      }
      const el = document.createElement('div');
      el.className = 'foot foot-col';
      el.innerHTML = `<h4>${U.esc(c.title)}</h4><ul class="${c.type === 'links' ? 'fl-list' : ''}">${body}</ul>`;
      grid.appendChild(el);
    });
    grid.style.setProperty('--cols', cols.length);
    const copy = (s.footerCopyright || '').replace(/\{year\}/g, new Date().getFullYear()).replace(/\{site\}/g, s.siteName);
    $('#footCopy').textContent = copy;
    $('#footAdmin').hidden = !s.footerAdminLink;
  }

  function initScroll() {
    const header = $('#header'), toTop = $('#toTop'), ring = $('#toTopRing');
    const C = 2 * Math.PI * 21;
    let ticking = false;
    const onScroll = () => {
      ticking = false;
      const y = window.scrollY;
      header.classList.toggle('scrolled', y > 8);
      const max = document.documentElement.scrollHeight - window.innerHeight;
      ring.style.strokeDashoffset = C * (1 - (max > 0 ? Math.min(1, y / max) : 0));
      toTop.classList.toggle('show', y > 700);
    };
    window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
    onScroll();
    toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: U.reduced() ? 'auto' : 'smooth' }));

    if (!('IntersectionObserver' in window)) { $$('.reveal').forEach(e => e.classList.add('in')); return; }
    // Đánh dấu mục menu theo vị trí cuộn
    const links = $$('.nav a');
    const spy = new IntersectionObserver(ents => ents.forEach(en => {
      if (en.isIntersecting) links.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + en.target.id));
    }), { rootMargin: '-45% 0px -50% 0px' });
    ['bang-gia', 'quy-trinh', 'cam-ket', 'danh-gia', 'hoi-dap'].forEach(id => { const el = document.getElementById(id); if (el) spy.observe(el); });

    // Hiện dần khi cuộn tới
    const io = new IntersectionObserver(ents => ents.forEach(en => {
      if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
    }), { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    $$('.reveal').forEach(e => io.observe(e));

    // Đếm số liệu
    const st = new IntersectionObserver(ents => {
      if (!ents[0].isIntersecting) return;
      st.disconnect();
      $$('#stats [data-to]').forEach(el => {
        const to = +el.dataset.to, dec = +el.dataset.dec, suf = el.dataset.suf;
        U.tween(0, to, 1500, v => { el.textContent = fmtStat(v, dec, suf); });
      });
    });
    st.observe($('#stats'));
  }

  /* ---------- Sự kiện ---------- */
  function bind() {
    // Ô chọn game
    $('#ddBtn').addEventListener('click', () => (DD.open ? closeDD() : openDD()));
    $('#ddBtn').addEventListener('keydown', e => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); openDD(); }
    });
    $('#ddSearch').addEventListener('input', e => { DD.q = e.target.value; DD.hl = 0; renderGameList(); markHl(); });
    $('#ddSearch').addEventListener('keydown', e => {
      const n = $$('.dd-opt').length;
      if (e.key === 'ArrowDown') { e.preventDefault(); DD.hl = Math.min(n - 1, DD.hl + 1); markHl(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); DD.hl = Math.max(0, DD.hl - 1); markHl(); }
      else if (e.key === 'Enter') { e.preventDefault(); const o = $$('.dd-opt')[DD.hl]; if (o) selectGame(o.dataset.id); }
      else if (e.key === 'Escape') { e.preventDefault(); closeDD(true); }
      else if (e.key === 'Tab') closeDD();
    });
    $('#ddList').addEventListener('click', e => { const o = e.target.closest('.dd-opt'); if (o) selectGame(o.dataset.id); });
    document.addEventListener('click', e => {
      if (DD.open && !e.target.closest('#dd')) closeDD();
      if ($('#qc').classList.contains('open') && !e.target.closest('#qc')) toggleQuick(false);
      const fg = e.target.closest('#footGrid [data-game]');
      if (fg) { e.preventDefault(); selectGame(fg.dataset.game); scrollToEl($('#stepper')); }
    });

    // Danh mục & sản phẩm
    $('#catList').addEventListener('click', e => { const b = e.target.closest('.opt'); if (b) selectCat(b.dataset.id); });
    $('#prodList').addEventListener('click', e => { const b = e.target.closest('.opt'); if (b) selectProd(b.dataset.id); });
    $('#sortSeg').addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b || b.dataset.sort === S.sort) return;
      S.sort = b.dataset.sort; renderProds(true);
    });
    $('#saleChip').addEventListener('click', () => { S.sale = !S.sale; renderProds(true); });
    $('#recentList').addEventListener('click', e => { const b = e.target.closest('.rchip'); if (b) pick(b.dataset.id); });
    $('#recentClear').addEventListener('click', () => { Store.recent.clear(); renderRecent(); });

    // Gói nổi bật
    $('#featProg').addEventListener('animationend', nextFeat);
    $('#featDots').addEventListener('click', e => { const d = e.target.closest('.fdot'); if (d) { F.i = +d.dataset.i; paintFeat(); } });
    $('#featOpen').addEventListener('click', () => { const id = $('#featBody').dataset.id; if (id) pick(id); });
    $('#fsTrack').addEventListener('click', e => { const c = e.target.closest('.fs-card'); if (c) pick(c.dataset.id); });
    // Chạm giữ để dừng băng chạy, thả ra chạy tiếp
    let fsResume = null;
    $('#fstrip').addEventListener('touchstart', () => { clearTimeout(fsResume); $('#fstrip').classList.add('paused'); }, { passive: true });
    $('#fstrip').addEventListener('touchend', () => { fsResume = setTimeout(() => $('#fstrip').classList.remove('paused'), 1500); }, { passive: true });

    // Hỏi đáp
    $('#faqList').addEventListener('click', e => {
      const q = e.target.closest('.qa-q'); if (!q) return;
      const item = q.parentElement, open = !item.classList.contains('open');
      $$('.qa').forEach(x => { x.classList.remove('open'); x.querySelector('.qa-q').setAttribute('aria-expanded', 'false'); });
      if (open) { item.classList.add('open'); q.setAttribute('aria-expanded', 'true'); }
    });

    // Tìm kiếm
    $('#searchBtn').addEventListener('click', openSearch);
    $('#kbdHint').textContent = /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘ K' : 'Ctrl K';
    document.addEventListener('keydown', e => {
      const t = document.activeElement;
      const typing = t && (/INPUT|TEXTAREA|SELECT/.test(t.tagName) || t.isContentEditable);
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openSearch(); }
      else if (e.key === '/' && !typing) { e.preventDefault(); openSearch(); }
      else if (e.key === 'Escape') { toggleMenu(false); toggleQuick(false); if (DD.open) closeDD(true); }
    });

    // Menu điện thoại
    $('#menuBtn').addEventListener('click', () => toggleMenu(true));
    $('#mnavClose').addEventListener('click', () => toggleMenu(false));
    $('#mnav .scrim').addEventListener('click', () => toggleMenu(false));
    $$('#mnav a').forEach(a => a.addEventListener('click', () => toggleMenu(false)));
    mqMobile.addEventListener && mqMobile.addEventListener('change', e => { if (!e.matches) toggleMenu(false); });

    // Nút nổi & sao chép
    $('#qcTab').addEventListener('click', () => { QC.touched = true; clearTimeout(QC.timer); toggleQuick(!$('#qc').classList.contains('open')); });
    $('#qc').addEventListener('pointerenter', () => { QC.touched = true; clearTimeout(QC.timer); });
    document.addEventListener('click', async e => {
      const b = e.target.closest('[data-copy]'); if (!b) return;
      const val = D().settings[b.dataset.copy] || '';
      const ok = await U.copy(val);
      UI.toast(ok ? `Đã sao chép ${val}` : 'Không sao chép được', ok ? 'ok' : 'err');
    });

    // Thanh thông báo
    $('#announceClose').addEventListener('click', () => {
      const an = $('#announce');
      try { sessionStorage.setItem('ct_ann_closed', D().settings.announcement); } catch (e) { /* bỏ qua */ }
      an.classList.add('closing');
      setTimeout(() => { an.hidden = true; }, 420);
    });

    // Giao diện sáng/tối
    UI.themeButton($('#themeBtn'));
    $('#themeBtn2').addEventListener('click', UI.toggleTheme);

    window.addEventListener('resize', U.debounce(() => {
      moveSegPill();
      if (S.gameId) watchScroller($('#catList'), $('#catHint'));
      if (S.catId) watchScroller($('#prodList'), $('#prodHint'));
    }, 150));
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(moveSegPill);
  }

  /* ---------- Cập nhật khi admin sửa dữ liệu (tab khác) ---------- */
  function validateState() {
    const g = S.gameId && Store.game(S.gameId);
    if (S.gameId && (!g || !g.visible)) { S.gameId = S.catId = S.prodId = null; return; }
    const c = S.catId && Store.cat(S.catId);
    if (S.catId && (!c || !c.visible || c.gameId !== S.gameId)) { S.catId = S.prodId = null; return; }
    const p = S.prodId && Store.prod(S.prodId);
    if (S.prodId && (!Store.isPublic(p) || p.catId !== S.catId)) S.prodId = null;
  }
  function renderAll() {
    validateState();
    renderBrand(); buildFeatured(); renderGameBtn();
    if (DD.open) renderGameList();
    const catScroll = $('#catList').scrollTop, prodScroll = $('#prodList').scrollTop;
    renderCats(false); renderProds(false);
    $('#catList').scrollTop = catScroll; $('#prodList').scrollTop = prodScroll;
    $('#detailBody').dataset.state = '';
    renderDetail(); renderSteps(); renderRecent(); renderFaq(); renderReviews(); renderFooter(); renderQuick();
  }

  function init() {
    UI.hydrate();
    renderAll();
    bind();
    initScroll();
    autoQuick();
    Store.watch(30000);
    Store.on(kind => {
      renderAll();
      if (kind === 'data') UI.toast('Bảng giá vừa được cập nhật', 'info');
    });
    if (location.hash.startsWith('#sp-')) {
      const id = location.hash.slice(4);
      setTimeout(() => pick(id), 350);
    }
  }
  Store.ready.then(init);
})();
