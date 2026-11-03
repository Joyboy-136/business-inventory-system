(function () {
  const user = initLayout({ active: 'inventory' });
  if (!user) return;

  const search = $('#search');
  const clearBtn = $('#clearSearch');
  const filterBtn = $('#filterBtn');
  const pop = $('#filterPop');
  const fStatus = $('#fStatus');
  const fCategory = $('#fCategory');
  const tbody = $('#tbody');
  const note = $('#resultNote');

  const cats = Array.from(new Set(CATEGORIES.concat(DB.products().map(p => p.category)))).sort();
  fCategory.innerHTML = '<option value="all">All</option>' + cats.map(c => '<option value="' + esc(c) + '">' + esc(c) + '</option>').join('');

  const wanted = new URLSearchParams(location.search).get('status');
  if (['in', 'low', 'out'].indexOf(wanted) !== -1) fStatus.value = wanted;

  function render() {
    const q = search.value.trim().toLowerCase();
    const all = DB.products();
    const list = all.filter(p =>
      (!q || p.name.toLowerCase().includes(q) || String(p.category).toLowerCase().includes(q)) &&
      (fStatus.value === 'all' || DB.status(p) === fStatus.value) &&
      (fCategory.value === 'all' || p.category === fCategory.value));

    tbody.innerHTML = list.length ? list.map(p =>
      '<tr><td>' + esc(p.name) + '</td><td>' + esc(p.category) + '</td><td>' + esc(p.stock) + '</td><td>' + statusBadge(p) + '</td></tr>').join('')
      : '<tr><td class="empty" colspan="4">No products found.</td></tr>';

    clearBtn.classList.toggle('hidden', !search.value);
    filterBtn.classList.toggle('has-filter', fStatus.value !== 'all' || fCategory.value !== 'all');
    note.textContent = 'Showing ' + list.length + ' of ' + all.length + ' products';
  }

  search.addEventListener('input', render);
  clearBtn.addEventListener('click', () => { search.value = ''; render(); search.focus(); });
  fStatus.addEventListener('change', render);
  fCategory.addEventListener('change', render);

  function setPop(open) { pop.classList.toggle('hidden', !open); filterBtn.setAttribute('aria-expanded', String(open)); }
  filterBtn.addEventListener('click', e => { e.stopPropagation(); setPop(pop.classList.contains('hidden')); });
  document.addEventListener('click', e => { if (!pop.contains(e.target) && e.target !== filterBtn) setPop(false); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') setPop(false); });
  $('#resetFilter').addEventListener('click', () => { fStatus.value = 'all'; fCategory.value = 'all'; render(); });

  render();
})();