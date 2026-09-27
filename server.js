#!/usr/bin/env node
/* =========================================================
   MÁY CHỦ BẢNG GIÁ CÀY THUÊ
   - Phục vụ trang khách (index.html) và trang quản trị (admin.html)
   - Lưu dữ liệu chung cho mọi khách tại data/db.json
   - Đăng nhập quản trị bằng mật khẩu mã hóa scrypt, phiên qua cookie HttpOnly
   - Không cần cài thêm thư viện: chỉ dùng module có sẵn của Node.js (>= 18)

   Chạy:            node server.js
   Đổi mật khẩu:    node server.js --set-password MatKhauMoi
   Biến môi trường: PORT (mặc định 3000), HOST (mặc định 0.0.0.0),
                    DATA_DIR (mặc định ./data), ADMIN_PASSWORD (mật khẩu lần đầu)
   ========================================================= */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const zlib = require('zlib');
const vm = require('vm');

const ROOT = __dirname;
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(ROOT, 'data'));
const DB_FILE = path.join(DATA_DIR, 'db.json');
const AUTH_FILE = path.join(DATA_DIR, 'auth.json');
const VIEWS_FILE = path.join(DATA_DIR, 'views.json');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
const MAX_UPLOAD = 12 * 1024 * 1024;
const SESSION_HOURS = 12;
const MAX_BODY = 5 * 1024 * 1024;
const MAX_BACKUPS = 60;

fs.mkdirSync(BACKUP_DIR, { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

/* ---------- Tiện ích file ---------- */
function readJSON(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { return fallback; }
}
function writeJSON(file, obj) {
  const tmp = file + '.' + process.pid + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(obj));
  fs.renameSync(tmp, file);
}
function log(...a) { console.log(new Date().toISOString(), ...a); }

/* ---------- Mật khẩu ---------- */
function makeHash(pw) {
  const salt = crypto.randomBytes(16).toString('hex');
  return { salt, hash: crypto.scryptSync(pw, salt, 64).toString('hex') };
}
function checkHash(pw, a) {
  if (!a || !a.salt || !a.hash || typeof pw !== 'string') return false;
  const got = crypto.scryptSync(pw, a.salt, 64);
  const want = Buffer.from(a.hash, 'hex');
  return got.length === want.length && crypto.timingSafeEqual(got, want);
}

// Lệnh đổi mật khẩu từ dòng lệnh
const setIdx = process.argv.indexOf('--set-password');
if (setIdx > -1) {
  const pw = process.argv[setIdx + 1];
  if (!pw || pw.length < 6) { console.error('Mật khẩu cần ít nhất 6 ký tự. Ví dụ: node server.js --set-password MatKhauMoi123'); process.exit(1); }
  writeJSON(AUTH_FILE, { ...makeHash(pw), isDefault: false, changedAt: Date.now() });
  console.log('Đã đổi mật khẩu quản trị. Khởi động lại server để đăng xuất mọi phiên cũ.');
  process.exit(0);
}

let auth = readJSON(AUTH_FILE, null);
if (!auth) {
  const pw = process.env.ADMIN_PASSWORD || 'admin123';
  auth = { ...makeHash(pw), isDefault: !process.env.ADMIN_PASSWORD, changedAt: Date.now() };
  writeJSON(AUTH_FILE, auth);
  log(auth.isDefault
    ? 'CẢNH BÁO: đang dùng mật khẩu mặc định admin123. Hãy đổi trong Quản trị › Cài đặt.'
    : 'Đã tạo mật khẩu quản trị từ biến ADMIN_PASSWORD.');
}

/* ---------- Dữ liệu ---------- */
function loadSeed() {
  const code = fs.readFileSync(path.join(ROOT, 'assets/js/data.js'), 'utf8');
  const ctx = { window: {} };
  vm.createContext(ctx);
  vm.runInContext(code, ctx, { timeout: 2000 });
  return JSON.parse(JSON.stringify(ctx.window.DEFAULT_DATA));
}
let db = readJSON(DB_FILE, null);
if (!db) {
  db = loadSeed();
  db.updatedAt = Date.now();
  writeJSON(DB_FILE, db);
  log('Đã tạo data/db.json từ assets/js/data.js');
}
if (db.settings) delete db.settings.passwordHash;

function publicData() { return db; }
function validData(d) {
  return d && typeof d === 'object' && d.settings && typeof d.settings === 'object' &&
    ['games', 'cats', 'prods'].every(k => Array.isArray(d[k]));
}
function backupDb() {
  try {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    fs.copyFileSync(DB_FILE, path.join(BACKUP_DIR, `db-${stamp}.json`));
    const files = fs.readdirSync(BACKUP_DIR).filter(f => f.startsWith('db-')).sort();
    files.slice(0, Math.max(0, files.length - MAX_BACKUPS)).forEach(f => fs.unlinkSync(path.join(BACKUP_DIR, f)));
  } catch (e) { log('Lỗi sao lưu:', e.message); }
}
let lastBackup = 0;

/* ---------- Lượt xem ---------- */
let views = readJSON(VIEWS_FILE, {});
let viewsTimer = null;
function saveViewsSoon() {
  clearTimeout(viewsTimer);
  viewsTimer = setTimeout(() => { try { writeJSON(VIEWS_FILE, views); } catch (e) { log('Lỗi lưu lượt xem:', e.message); } }, 3000);
}

/* ---------- Phiên đăng nhập ---------- */
const sessions = new Map(); // token -> hết hạn
const loginFails = new Map(); // ip -> { n, until }
function parseCookies(req) {
  const out = {};
  (req.headers.cookie || '').split(';').forEach(p => {
    const i = p.indexOf('=');
    if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}
function isAdmin(req) {
  const t = parseCookies(req).ct_sid;
  if (!t) return false;
  const exp = sessions.get(t);
  if (!exp || exp < Date.now()) { sessions.delete(t); return false; }
  return true;
}
function isHttps(req) { return req.socket.encrypted || String(req.headers['x-forwarded-proto'] || '').startsWith('https'); }
function sessionCookie(req, token, maxAge) {
  return `ct_sid=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${isHttps(req) ? '; Secure' : ''}`;
}
function clientIp(req) {
  return String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress || '';
}

/* ---------- Phản hồi ---------- */
const SEC_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Referrer-Policy': 'strict-origin-when-cross-origin'
};
function sendJSON(res, code, obj, extra = {}) {
  const body = JSON.stringify(obj);
  res.writeHead(code, { ...SEC_HEADERS, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extra });
  res.end(body);
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', c => {
      size += c.length;
      if (size > MAX_BODY) { reject(Object.assign(new Error('Dữ liệu quá lớn'), { status: 413 })); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
      catch (e) { reject(Object.assign(new Error('JSON không hợp lệ'), { status: 400 })); }
    });
    req.on('error', reject);
  });
}
function readRaw(req, limit) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', c => {
      size += c.length;
      if (size > limit) { reject(Object.assign(new Error('File quá lớn (tối đa 12 MB)'), { status: 413 })); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}
// Nhận dạng ảnh theo nội dung file, không tin phần mở rộng
function imageExt(b) {
  if (b.length < 12) return '';
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return '.png';
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return '.jpg';
  if (b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') return '.webp';
  if (b.toString('ascii', 0, 4) === 'GIF8') return '.gif';
  return '';
}
function audioExt(b) {
  if (b.length < 12) return '';
  if (b.toString('ascii', 0, 3) === 'ID3' || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0)) return '.mp3';
  if (b.toString('ascii', 4, 8) === 'ftyp') return '.m4a';
  if (b.toString('ascii', 0, 4) === 'OggS') return '.ogg';
  if (b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WAVE') return '.wav';
  return '';
}

/* ---------- Thẻ xem trước khi gửi link (Facebook, Zalo, Google) ---------- */
const escAttr = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function seoTags(req) {
  const s = db.settings || {};
  const proto = isHttps(req) ? 'https' : 'http';
  const origin = `${proto}://${req.headers.host || 'localhost'}`;
  const title = (s.seoTitle || '').trim() || [s.siteName, s.tagline].filter(Boolean).join(' – ') || 'Bảng giá cày thuê';
  const desc = (s.seoDesc || '').trim() || (s.heroText || '').trim();
  let img = (s.seoImage || '').trim();
  if (img && !/^https?:\/\//i.test(img)) img = origin + '/' + img.replace(/^\/+/, '');
  const t = [
    `<title>${escAttr(title)}</title>`,
    `<meta name="description" content="${escAttr(desc)}">`,
    `<link rel="canonical" href="${escAttr(origin + '/')}">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:site_name" content="${escAttr(s.siteName || '')}">`,
    `<meta property="og:title" content="${escAttr(title)}">`,
    `<meta property="og:description" content="${escAttr(desc)}">`,
    `<meta property="og:url" content="${escAttr(origin + '/')}">`,
    `<meta property="og:locale" content="vi_VN">`,
    `<meta name="twitter:card" content="${img ? 'summary_large_image' : 'summary'}">`,
    `<meta name="twitter:title" content="${escAttr(title)}">`,
    `<meta name="twitter:description" content="${escAttr(desc)}">`
  ];
  if (img) t.push(`<meta property="og:image" content="${escAttr(img)}">`, `<meta property="og:image:alt" content="${escAttr(title)}">`, `<meta name="twitter:image" content="${escAttr(img)}">`);
  return t.join('\n  ');
}
/* ---------- Giao diện chèn sẵn vào trang (tránh nháy màu khi tải) ---------- */
const FONTS = { 'Be Vietnam Pro': '400;500;600;700;800', 'Lexend': '400;500;600;700;800', 'Nunito': '400;500;600;700;800', 'Montserrat': '400;500;600;700;800', 'Quicksand': '400;500;600;700', 'Mulish': '400;500;600;700;800', 'Roboto': '400;500;700;900', 'Baloo 2': '400;500;600;700;800' };
const isHex = v => /^#[0-9a-f]{6}$/i.test(String(v || ''));
const rgbOf = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const mixHex = (a, b, t) => '#' + rgbOf(a).map((v, i) => Math.round(v + (rgbOf(b)[i] - v) * t).toString(16).padStart(2, '0')).join('');
const lumOf = h => { const c = rgbOf(h).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; };
function lookInject(html) {
  const t = (db.settings && db.settings.theme) || {};
  const pick = (v, list, d) => (list.includes(v) ? v : d);
  const p = isHex(t.primary) ? t.primary : '#2f54eb', q = isHex(t.secondary) ? t.secondary : '#7c4ddb';
  const rad = Math.max(0, Math.min(28, Number(t.radius ?? 12) || 0));
  const font = FONTS[t.font] ? t.font : 'Be Vietnam Pro';
  const vars = [
    `--accent-l:${p}`, `--accent-d:${mixHex(p, '#ffffff', lumOf(p) < .08 ? .42 : .28)}`,
    `--accent2-l:${q}`, `--accent2-d:${mixHex(q, '#ffffff', lumOf(q) < .08 ? .42 : .28)}`,
    `--on-accent-l:${lumOf(p) > .5 ? '#10131c' : '#ffffff'}`,
    `--r:${rad}px`, `--r-sm:${Math.round(rad * .67)}px`, `--r-lg:${Math.round(rad * 1.34)}px`,
    `--font:"${font}", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`
  ].join(';');
  const attrs = [
    'lang="vi"', 'data-served="1"',
    `data-mode="${pick(t.mode, ['system', 'light', 'dark'], 'system')}"`,
    `data-card="${pick(t.card, ['solid', 'glass', 'outline'], 'solid')}"`,
    `data-hero="${pick(t.hero, ['split', 'center'], 'split')}"`,
    `data-reveal="${pick(t.reveal, ['up', 'zoom', 'side', 'blur', 'flip', 'none'], 'up')}"`,
    t.loader ? 'class="has-loader"' : '',
    `style="${escAttr(vars)}"`
  ].filter(Boolean).join(' ');
  html = html.replace('<html lang="vi">', `<html ${attrs}>`);
  const link = font === 'Be Vietnam Pro' ? '' : `<link rel="stylesheet" id="ct-font" href="https://fonts.googleapis.com/css2?family=${encodeURIComponent(font).replace(/%20/g, '+')}:wght@${FONTS[font]}&display=swap">`;
  return html.replace('<!--LOOK-->', link);
}
function serveIndex(req, res) {
  fs.readFile(path.join(ROOT, 'index.html'), 'utf8', (err, html) => {
    if (err) return notFound(res);
    html = html.replace(/<!--SEO-->[\s\S]*?<!--\/SEO-->/, seoTags(req));
    html = lookInject(html);
    const headers = { ...SEC_HEADERS, 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' };
    let body = Buffer.from(html);
    if (/\bgzip\b/.test(req.headers['accept-encoding'] || '')) { body = zlib.gzipSync(body); headers['Content-Encoding'] = 'gzip'; headers.Vary = 'Accept-Encoding'; }
    res.writeHead(200, headers);
    res.end(req.method === 'HEAD' ? undefined : body);
  });
}
function serveUpload(req, res, name) {
  if (!/^[a-f0-9]{16}\.(png|jpg|webp|gif|mp3|m4a|ogg|wav)$/.test(name)) return notFound(res);
  const file = path.join(UPLOAD_DIR, name);
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) return notFound(res);
    const headers = { ...SEC_HEADERS, 'Content-Type': MIME[path.extname(name)], 'Accept-Ranges': 'bytes', 'Cache-Control': 'public, max-age=31536000, immutable' };
    // Hỗ trợ tải từng đoạn (trình duyệt cần khi phát nhạc)
    const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
    if (m && (m[1] || m[2])) {
      let start = m[1] ? parseInt(m[1], 10) : st.size - parseInt(m[2], 10);
      let end = m[1] && m[2] ? parseInt(m[2], 10) : st.size - 1;
      if (isNaN(start) || start < 0 || start >= st.size || end < start) { res.writeHead(416, { 'Content-Range': `bytes */${st.size}` }); return res.end(); }
      end = Math.min(end, st.size - 1);
      res.writeHead(206, { ...headers, 'Content-Range': `bytes ${start}-${end}/${st.size}`, 'Content-Length': end - start + 1 });
      if (req.method === 'HEAD') return res.end();
      return fs.createReadStream(file, { start, end }).pipe(res);
    }
    res.writeHead(200, { ...headers, 'Content-Length': st.size });
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(file).pipe(res);
  });
}

// Chống gửi yêu cầu giả từ trang khác
function sameOrigin(req) {
  if (req.headers['x-requested-with'] !== 'fetch') return false;
  const origin = req.headers.origin;
  if (!origin) return true;
  try { return new URL(origin).host === req.headers.host; } catch (e) { return false; }
}

/* ---------- API ---------- */
async function handleApi(req, res, route) {
  const m = req.method;
  const admin = isAdmin(req);

  if (route === 'data' && m === 'GET') {
    return sendJSON(res, 200, { data: publicData(), admin, defaultPassword: admin ? !!auth.isDefault : undefined });
  }
  if (route === 'version' && m === 'GET') return sendJSON(res, 200, { updatedAt: db.updatedAt });

  if (m !== 'GET' && !sameOrigin(req)) return sendJSON(res, 403, { error: 'Yêu cầu không hợp lệ' });

  if (route === 'login' && m === 'POST') {
    const ip = clientIp(req), f = loginFails.get(ip);
    if (f && f.until > Date.now()) return sendJSON(res, 429, { error: 'Sai mật khẩu quá nhiều lần. Vui lòng thử lại sau 15 phút.' });
    const body = await readBody(req);
    if (!checkHash(String(body.password || ''), auth)) {
      const n = (f && f.until > Date.now() - 15 * 60e3 ? f.n : 0) + 1;
      loginFails.set(ip, { n, until: n >= 5 ? Date.now() + 15 * 60e3 : 0 });
      log('Đăng nhập sai từ', ip);
      return sendJSON(res, 401, { error: 'Mật khẩu không đúng.' });
    }
    loginFails.delete(ip);
    const token = crypto.randomBytes(32).toString('hex');
    sessions.set(token, Date.now() + SESSION_HOURS * 3600e3);
    log('Đăng nhập quản trị từ', ip);
    return sendJSON(res, 200, { ok: true, defaultPassword: !!auth.isDefault }, { 'Set-Cookie': sessionCookie(req, token, SESSION_HOURS * 3600) });
  }
  if (route === 'logout' && m === 'POST') {
    const t = parseCookies(req).ct_sid; if (t) sessions.delete(t);
    return sendJSON(res, 200, { ok: true }, { 'Set-Cookie': sessionCookie(req, '', 0) });
  }
  if (route === 'view' && m === 'POST') {
    const body = await readBody(req);
    const id = String(body.id || '');
    if (/^[\w-]{1,40}$/.test(id) && db.prods.some(p => p.id === id)) { views[id] = (views[id] || 0) + 1; saveViewsSoon(); }
    return sendJSON(res, 200, { ok: true });
  }

  // Từ đây trở xuống cần đăng nhập
  if (!admin) return sendJSON(res, 401, { error: 'Chưa đăng nhập' });

  if (route === 'data' && m === 'PUT') {
    const body = await readBody(req);
    if (!validData(body)) return sendJSON(res, 400, { error: 'Dữ liệu không hợp lệ' });
    if (Date.now() - lastBackup > 10 * 60e3) { backupDb(); lastBackup = Date.now(); }
    delete body.settings.passwordHash;
    body.updatedAt = Date.now();
    db = body;
    writeJSON(DB_FILE, db);
    return sendJSON(res, 200, { ok: true, updatedAt: db.updatedAt });
  }
  if (route === 'upload' && m === 'POST') {
    const buf = await readRaw(req, MAX_UPLOAD);
    const ext = imageExt(buf) || audioExt(buf);
    if (!ext) return sendJSON(res, 400, { error: 'Chỉ nhận ảnh (PNG, JPG, WEBP, GIF) hoặc nhạc (MP3, M4A, OGG, WAV).' });
    const name = crypto.randomBytes(8).toString('hex') + ext;
    fs.writeFileSync(path.join(UPLOAD_DIR, name), buf);
    log('Đã tải ảnh lên:', name);
    return sendJSON(res, 200, { ok: true, path: 'uploads/' + name });
  }
  if (route === 'password' && m === 'POST') {
    const body = await readBody(req);
    if (!checkHash(String(body.current || ''), auth)) return sendJSON(res, 400, { error: 'Mật khẩu hiện tại không đúng.', field: 'cur' });
    const next = String(body.next || '');
    if (next.length < 6) return sendJSON(res, 400, { error: 'Mật khẩu mới cần ít nhất 6 ký tự.', field: 'new' });
    auth = { ...makeHash(next), isDefault: false, changedAt: Date.now() };
    writeJSON(AUTH_FILE, auth);
    const keep = parseCookies(req).ct_sid;
    [...sessions.keys()].forEach(t => { if (t !== keep) sessions.delete(t); });
    log('Đã đổi mật khẩu quản trị');
    return sendJSON(res, 200, { ok: true });
  }
  if (route === 'views' && m === 'GET') return sendJSON(res, 200, { views });
  if (route === 'views' && m === 'DELETE') { views = {}; saveViewsSoon(); return sendJSON(res, 200, { ok: true }); }

  return sendJSON(res, 404, { error: 'Không tìm thấy' });
}

/* ---------- File tĩnh ---------- */
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.ico': 'image/x-icon', '.woff2': 'font/woff2',
  '.woff': 'font/woff', '.txt': 'text/plain; charset=utf-8',
  '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.ogg': 'audio/ogg', '.wav': 'audio/wav'
};
const COMPRESS = new Set(['.html', '.css', '.js', '.json', '.svg', '.txt']);

function serveStatic(req, res, pathname) {
  let rel = decodeURIComponent(pathname).replace(/^\/+/, '');
  if (rel === '' ) rel = 'index.html';
  if (rel === 'admin') rel = 'admin.html';
  if (rel === 'index.html') return serveIndex(req, res);
  if (rel.startsWith('uploads/')) return serveUpload(req, res, rel.slice(8));
  // Chỉ cho phép trang chính và thư mục assets
  const allowed = rel === 'index.html' || rel === 'admin.html' || rel === 'favicon.ico' || rel === 'robots.txt' || rel.startsWith('assets/');
  const file = path.resolve(ROOT, rel);
  if (!allowed || !file.startsWith(ROOT + path.sep) || rel.includes('..')) return notFound(res);
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) return notFound(res);
    const ext = path.extname(file).toLowerCase();
    const etag = `W/"${st.size.toString(16)}-${Math.floor(st.mtimeMs).toString(16)}"`;
    const headers = {
      ...SEC_HEADERS,
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=0, must-revalidate',
      ETag: etag
    };
    if (rel === 'admin.html') headers['X-Robots-Tag'] = 'noindex';
    if (req.headers['if-none-match'] === etag) { res.writeHead(304, headers); return res.end(); }
    const gzip = COMPRESS.has(ext) && /\bgzip\b/.test(req.headers['accept-encoding'] || '');
    if (gzip) { headers['Content-Encoding'] = 'gzip'; headers.Vary = 'Accept-Encoding'; }
    res.writeHead(200, headers);
    if (req.method === 'HEAD') return res.end();
    const stream = fs.createReadStream(file);
    (gzip ? stream.pipe(zlib.createGzip()) : stream).pipe(res);
  });
}
function notFound(res) {
  res.writeHead(404, { ...SEC_HEADERS, 'Content-Type': 'text/html; charset=utf-8' });
  res.end('<!doctype html><meta charset="utf-8"><title>404</title><p style="font-family:sans-serif;padding:40px">Không tìm thấy trang. <a href="/">Về trang bảng giá</a></p>');
}

/* ---------- Khởi động ---------- */
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x');
    const p = url.pathname;
    if (p.startsWith('/api/')) return await handleApi(req, res, p.slice(5).replace(/\/+$/, ''));
    if (req.method !== 'GET' && req.method !== 'HEAD') return sendJSON(res, 405, { error: 'Phương thức không hỗ trợ' });
    serveStatic(req, res, p);
  } catch (e) {
    log('Lỗi:', e.message);
    if (!res.headersSent) sendJSON(res, e.status || 500, { error: e.status ? e.message : 'Lỗi máy chủ' });
    else res.end();
  }
});
server.on('error', e => {
  if (e.code === 'EADDRINUSE') {
    console.error(`\nCổng ${PORT} đang có chương trình khác dùng.`);
    console.error(`- Xem chương trình nào đang dùng:  ss -ltnp | grep :${PORT}`);
    console.error(`- Hoặc chạy bằng cổng khác, ví dụ:  PORT=3100 node server.js\n`);
  } else if (e.code === 'EACCES') {
    console.error(`\nKhông có quyền mở cổng ${PORT}. Hãy dùng cổng từ 1024 trở lên, ví dụ PORT=3100.\n`);
  } else {
    console.error('Lỗi khởi động server:', e.message);
  }
  process.exit(1);
});
server.listen(PORT, HOST, () => {
  log(`Bảng giá đang chạy tại http://${HOST === '0.0.0.0' ? 'IP-VPS' : HOST}:${PORT}`);
  log(`Dữ liệu lưu tại ${DATA_DIR}`);
});
function shutdown() {
  clearTimeout(viewsTimer);
  try { writeJSON(VIEWS_FILE, views); } catch (e) { /* bỏ qua */ }
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 3000).unref();
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
