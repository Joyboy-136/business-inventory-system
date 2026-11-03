'use strict';

const LOW_STOCK_LIMIT = 10;
const PAGE_SIZE = 5;
const CATEGORIES = ['Beverages', 'Snacks', 'Food', 'Hygiene', 'Household'];

const KEYS = {
  products: 'sbis_products',
  transactions: 'sbis_transactions',
  session: 'sbis_session',
  flash: 'sbis_flash'
};

const USERS = [
  { username: 'manager', password: 'manager123', role: 'manager', name: 'Manager' },
  { username: 'staff',   password: 'staff123',   role: 'staff',   name: 'Staff' }
];

const NAV = [
  { key: 'dashboard', label: 'Dashboard',            href: 'dashboard.html',   roles: ['staff', 'manager'] },
  { key: 'products',  label: 'Product Management',   href: 'products.html',    roles: ['staff', 'manager'] },
  { key: 'add',       label: 'Add/Edit Product',     href: 'add-product.html', roles: ['manager'] },
  { key: 'sales',     label: 'Sales Transaction',    href: 'sales.html',       roles: ['staff', 'manager'] },
  { key: 'inventory', label: 'Inventory Monitoring', href: 'inventory.html',   roles: ['staff', 'manager'] },
  { key: 'flow',      label: 'Navigation Flow',      href: 'flow.html',        roles: ['manager'] }
];

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function esc(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function round2(n) { return Math.round((Number(n) + Number.EPSILON) * 100) / 100; }
function peso(n) {
  return '₱' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function pesoShort(n) {
  return '₱' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}
function formatDate(iso) {
  const d = new Date(iso);
  const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  return date + ' ' + time;
}
function isToday(iso) { return new Date(iso).toDateString() === new Date().toDateString(); }
function uid(prefix) { return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

const ICONS = {
  box: '<path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
  alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  db: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/>',
  user: '<circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  filter: '<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>',
  plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  pencil: '<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/>',
  trash: '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/>',
  arrow: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  restock: '<path d="M16 16h6"/><path d="M19 13v6"/><path d="M21 10V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l2-1.14"/><path d="m7.5 4.27 9 5.15"/><polyline points="3.29 7 12 12 20.71 7"/><line x1="12" x2="12" y1="22" y2="12"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/>'
};
function icon(name, size = 20, stroke = 2) {
  return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + stroke +
    '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[name] || '') + '</svg>';
}
function hydrateIcons(root = document) {
  $$('[data-icon]', root).forEach(el => {
    if (el.dataset.done) return;
    el.innerHTML = icon(el.dataset.icon, Number(el.dataset.size) || 20, Number(el.dataset.stroke) || 2);
    el.dataset.done = '1';
  });
}

function toast(message, type = 'success') {
  let box = document.getElementById('toasts');
  if (!box) {
    box = document.createElement('div');
    box.id = 'toasts';
    box.className = 'toasts';
    box.setAttribute('aria-live', 'polite');
    document.body.appendChild(box);
  }
  const el = document.createElement('div');
  el.className = 'toast toast-' + type;
  el.textContent = message;
  box.appendChild(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 300); }, 3500);
}
function flash(message, type = 'success') {
  try { sessionStorage.setItem(KEYS.flash, JSON.stringify({ message, type })); } catch (e) {  }
}
function showFlash() {
  try {
    const raw = sessionStorage.getItem(KEYS.flash);
    if (!raw) return;
    sessionStorage.removeItem(KEYS.flash);
    const f = JSON.parse(raw);
    toast(f.message, f.type);
  } catch (e) {  }
}

const Store = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (e) { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (e) { toast('Could not save. Browser storage may be full or blocked.', 'error'); return false; }
  }
};

function sampleProducts() {
  const p = (id, name, category, price, stock) => ({ id, name, category, price, stock, description: '', image: '' });
  return [
    p('P001', 'Product A', 'Beverages', 50, 20),
    p('P002', 'Product B', 'Snacks', 35, 15),
    p('P003', 'Product C', 'Hygiene', 120, 8),
    p('P004', 'Product D', 'Household', 75, 25),
    p('P005', 'Product E', 'Beverages', 60, 12),
    p('P006', 'Iced Coffee', 'Beverages', 60, 20),
    p('P007', 'Burger', 'Food', 80, 10),
    p('P008', 'Fries', 'Food', 40, 8),
    p('P009', 'Water', 'Beverages', 20, 50),
    p('P010', 'Sandwich', 'Food', 70, 15)
  ];
}
function sampleTransactions() {
  const t = (n, y, m, d, h, mi, productId, product, qty, total, type, user) => ({
    id: 'T' + n, saleId: 'S' + n, date: new Date(y, m, d, h, mi).toISOString(),
    productId, product, qty, total, type, user
  });
  return [
    t(1, 2025, 7, 8, 10, 24, 'P001', 'Product A', 5, 250, 'Sale', 'staff'),
    t(2, 2025, 7, 8, 9, 15, 'P002', 'Product B', 10, 500, 'Sale', 'staff'),
    t(3, 2025, 7, 7, 16, 32, 'P003', 'Product C', 3, 180, 'Purchase', 'manager'),
    t(4, 2025, 7, 7, 11, 20, 'P004', 'Product D', 8, 400, 'Sale', 'staff'),
    t(5, 2025, 7, 6, 15, 45, 'P005', 'Product E', 12, 600, 'Purchase', 'manager')
  ];
}
function seedData() {
  Store.set(KEYS.products, sampleProducts());
  Store.set(KEYS.transactions, sampleTransactions());
}
(function ensureSeed() {
  try {
    if (localStorage.getItem(KEYS.products) === null) Store.set(KEYS.products, sampleProducts());
    if (localStorage.getItem(KEYS.transactions) === null) Store.set(KEYS.transactions, sampleTransactions());
  } catch (e) {  }
})();

const DB = {
  products() { return Store.get(KEYS.products, []); },
  saveProducts(list) { return Store.set(KEYS.products, list); },
  transactions() { return Store.get(KEYS.transactions, []); },
  saveTransactions(list) { return Store.set(KEYS.transactions, list); },
  find(id) { return this.products().find(p => p.id === id) || null; },
  nextId() {
    const max = this.products().reduce((m, p) => Math.max(m, parseInt(String(p.id).replace(/\D/g, ''), 10) || 0), 0);
    return 'P' + String(max + 1).padStart(3, '0');
  },
  status(p) { return p.stock <= 0 ? 'out' : (p.stock <= LOW_STOCK_LIMIT ? 'low' : 'in'); }
};
function statusBadge(p) {
  const s = DB.status(p);
  const label = { in: 'In Stock', low: 'Low Stock', out: 'Out of Stock' }[s];
  return '<span class="badge badge-' + s + '">' + label + '</span>';
}
function txBadge(type) {
  return '<span class="badge badge-' + (type === 'Purchase' ? 'purchase' : 'sale') + '">' + esc(type) + '</span>';
}

const Auth = {
  login(username, password) {
    const user = USERS.find(u => u.username === String(username).trim().toLowerCase() && u.password === password);
    if (!user) return null;
    const session = { username: user.username, role: user.role, name: user.name };
    try { sessionStorage.setItem(KEYS.session, JSON.stringify(session)); } catch (e) { return null; }
    return session;
  },
  current() {
    try { return JSON.parse(sessionStorage.getItem(KEYS.session)); } catch (e) { return null; }
  },
  logout() {
    try { sessionStorage.removeItem(KEYS.session); } catch (e) {  }
    location.href = 'index.html';
  },
  require(roles) {
    const user = this.current();
    if (!user) { location.replace('index.html'); return null; }
    if (roles && roles.indexOf(user.role) === -1) {
      flash('You do not have access to that page.', 'error');
      location.replace('dashboard.html');
      return null;
    }
    return user;
  }
};

function openModal({ title, body, actions = [], wide = false }) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  const box = document.createElement('div');
  box.className = 'modal' + (wide ? ' wide' : '');
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  box.innerHTML = '<h3>' + esc(title) + '</h3><div class="modal-body"></div><div class="modal-actions"></div>';
  const bodyEl = $('.modal-body', box);
  if (typeof body === 'string') bodyEl.innerHTML = body; else if (body) bodyEl.appendChild(body);
  overlay.appendChild(box);
  document.body.appendChild(overlay);
  hydrateIcons(box);

  function onKey(e) { if (e.key === 'Escape') api.close(); }
  const api = {
    el: box,
    close() { document.removeEventListener('keydown', onKey); overlay.remove(); }
  };
  let primaryBtn = null;
  actions.forEach(a => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn ' + (a.className || 'btn-outline');
    b.textContent = a.label;
    b.addEventListener('click', () => (a.onClick ? a.onClick(api) : api.close()));
    $('.modal-actions', box).appendChild(b);
    if (a.primary) primaryBtn = b;
  });
  box.addEventListener('keydown', e => {
    if (e.key === 'Enter' && primaryBtn && e.target.tagName === 'INPUT') { e.preventDefault(); primaryBtn.click(); }
  });
  overlay.addEventListener('mousedown', e => { if (e.target === overlay) api.close(); });
  document.addEventListener('keydown', onKey);
  const first = $('input, select, textarea', bodyEl) || primaryBtn;
  if (first) setTimeout(() => first.focus(), 0);
  return api;
}

function confirmDialog({ title, message, confirmText = 'Confirm', danger = false }) {
  return new Promise(resolve => {
    let answered = false;
    const done = v => { if (!answered) { answered = true; resolve(v); } };
    const m = openModal({
      title,
      body: '<p class="modal-text">' + esc(message) + '</p>',
      actions: [
        { label: 'Cancel', onClick: api => { api.close(); done(false); } },
        { label: confirmText, className: danger ? 'btn-danger' : 'btn-primary', primary: true, onClick: api => { api.close(); done(true); } }
      ]
    });
    const obs = new MutationObserver(() => { if (!document.body.contains(m.el)) { obs.disconnect(); done(false); } });
    obs.observe(document.body, { childList: true, subtree: true });
  });
}

function renderPagination(el, page, pages, onChange) {
  el.innerHTML = '';
  if (pages <= 1) { el.classList.add('hidden'); return; }
  el.classList.remove('hidden');
  const make = (label, target, opts = {}) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    if (opts.active) { b.classList.add('active'); b.setAttribute('aria-current', 'page'); }
    if (opts.aria) b.setAttribute('aria-label', opts.aria);
    b.disabled = !!opts.disabled;
    b.addEventListener('click', () => onChange(target));
    el.appendChild(b);
  };
  make('‹', page - 1, { disabled: page === 1, aria: 'Previous page' });
  const shown = Array.from(new Set([1, pages, page - 1, page, page + 1]))
    .filter(n => n >= 1 && n <= pages).sort((a, b) => a - b);
  let prev = 0;
  shown.forEach(n => {
    if (n - prev > 1) {
      const gap = document.createElement('span');
      gap.className = 'pager-gap';
      gap.textContent = '…';
      el.appendChild(gap);
    }
    make(String(n), n, { active: n === page, aria: 'Page ' + n });
    prev = n;
  });
  make('›', page + 1, { disabled: page === pages, aria: 'Next page' });
}

function buildSidebar(active, user) {
  const host = document.getElementById('sidebar');
  if (!host) return;
  const links = NAV.filter(n => n.roles.indexOf(user.role) !== -1).map(n =>
    '<a href="' + n.href + '"' + (n.key === active ? ' class="active" aria-current="page"' : '') + '>' + esc(n.label) + '</a>').join('');
  host.innerHTML =
    '<a class="brand" href="dashboard.html"><span class="brand-mark">' + icon('box', 24, 1.75) + '</span><span>Sales &amp; Inventory</span></a>' +
    '<nav class="nav" aria-label="Main">' + links + '</nav>';
}

function buildUserMenu(user) {
  const host = document.getElementById('userMenu');
  if (!host) return;
  host.innerHTML =
    '<div class="user-menu">' +
      '<button type="button" class="user-btn" id="userBtn" aria-haspopup="true" aria-expanded="false">' +
        '<span class="avatar" data-icon="user" data-size="16"></span>' +
        '<span>' + esc(user.name) + '</span>' +
        '<span data-icon="down" data-size="16"></span>' +
      '</button>' +
      '<div class="menu-pop hidden" id="userPop" role="menu">' +
        '<div class="menu-head"><strong>' + esc(user.name) + '</strong><small>' + (user.role === 'manager' ? 'Manager' : 'Staff') + ' · ' + esc(user.username) + '</small></div>' +
        (user.role === 'manager' ? '<button type="button" class="menu-item" id="resetData" role="menuitem">Reset sample data</button>' : '') +
        '<button type="button" class="menu-item" id="logoutBtn" role="menuitem">' + icon('logout', 16) + ' Logout</button>' +
      '</div>' +
    '</div>';
  hydrateIcons(host);
  const btn = $('#userBtn', host), pop = $('#userPop', host);
  const setOpen = open => { pop.classList.toggle('hidden', !open); btn.setAttribute('aria-expanded', String(open)); };
  btn.addEventListener('click', e => { e.stopPropagation(); setOpen(pop.classList.contains('hidden')); });
  document.addEventListener('click', e => { if (!host.contains(e.target)) setOpen(false); });
  $('#logoutBtn', host).addEventListener('click', () => Auth.logout());
  const reset = $('#resetData', host);
  if (reset) reset.addEventListener('click', async () => {
    setOpen(false);
    const ok = await confirmDialog({
      title: 'Reset sample data?',
      message: 'This replaces all products and transactions with the original sample data. Your changes will be lost.',
      confirmText: 'Reset', danger: true
    });
    if (!ok) return;
    seedData();
    flash('Sample data restored.');
    location.reload();
  });
}

function initLayout({ active, roles } = {}) {
  const user = Auth.require(roles);
  if (!user) return null;
  buildSidebar(active, user);
  buildUserMenu(user);
  hydrateIcons();
  const h1 = $('.topbar h1');
  if (h1) document.title = h1.textContent + ' · Sales & Inventory';
  showFlash();
  return user;
}