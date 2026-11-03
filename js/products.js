(function () {
  const user = initLayout({ active: 'products' });
  if (!user) return;
  const isManager = user.role === 'manager';

  const state = { q: '', page: 1 };
  const tbody = $('#tbody');
  const pager = $('#pager');
  const search = $('#search');
  const clearBtn = $('#clearSearch');

  if (isManager) $('#addBtn').classList.remove('hidden');
  else $('#actionHead').remove();
  const colCount = isManager ? 7 : 6;

  function matching() {
    const q = state.q.trim().toLowerCase();
    return DB.products().filter(p => !q || [p.id, p.name, p.category].some(v => String(v).toLowerCase().includes(q)));
  }

  function render() {
    const list = matching();
    const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
    if (state.page > pages) state.page = pages;
    if (state.page < 1) state.page = 1;
    const slice = list.slice((state.page - 1) * PAGE_SIZE, state.page * PAGE_SIZE);

    if (!slice.length) {
      tbody.innerHTML = '<tr><td class="empty" colspan="' + colCount + '">' +
        (state.q.trim() ? 'No products match “' + esc(state.q.trim()) + '”.' : 'No products yet.') + '</td></tr>';
    } else {
      tbody.innerHTML = slice.map(p => {
        const actions = isManager
          ? '<td><div class="cell-actions">' +
              '<button type="button" class="icon-btn" data-act="restock" data-id="' + esc(p.id) + '" aria-label="Restock ' + esc(p.name) + '" title="Restock">' + icon('restock', 18) + '</button>' +
              '<button type="button" class="icon-btn" data-act="edit" data-id="' + esc(p.id) + '" aria-label="Edit ' + esc(p.name) + '" title="Edit">' + icon('pencil', 18) + '</button>' +
              '<button type="button" class="icon-btn danger" data-act="delete" data-id="' + esc(p.id) + '" aria-label="Delete ' + esc(p.name) + '" title="Delete">' + icon('trash', 18) + '</button>' +
            '</div></td>'
          : '';
        return '<tr><td>' + esc(p.id) + '</td><td>' + esc(p.name) + '</td><td>' + esc(p.category) + '</td><td>' +
          peso(p.price) + '</td><td>' + esc(p.stock) + '</td><td>' + statusBadge(p) + '</td>' + actions + '</tr>';
      }).join('');
    }
    renderPagination(pager, state.page, pages, n => { state.page = n; render(); });
  }

  search.addEventListener('input', () => {
    state.q = search.value;
    state.page = 1;
    clearBtn.classList.toggle('hidden', !search.value);
    render();
  });
  clearBtn.addEventListener('click', () => {
    search.value = ''; state.q = ''; state.page = 1;
    clearBtn.classList.add('hidden');
    render();
    search.focus();
  });

  tbody.addEventListener('click', e => {
    const btn = e.target.closest('button[data-act]');
    if (!btn || !isManager) return;
    const product = DB.find(btn.dataset.id);
    if (!product) { toast('That product no longer exists.', 'error'); render(); return; }
    if (btn.dataset.act === 'edit') location.href = 'add-product.html?id=' + encodeURIComponent(product.id);
    else if (btn.dataset.act === 'delete') deleteProduct(product);
    else if (btn.dataset.act === 'restock') restock(product);
  });

  async function deleteProduct(p) {
    const ok = await confirmDialog({
      title: 'Delete product?',
      message: 'Are you sure you want to delete “' + p.name + '”? This cannot be undone.',
      confirmText: 'Delete', danger: true
    });
    if (!ok) return;
    if (DB.saveProducts(DB.products().filter(x => x.id !== p.id))) {
      toast('“' + p.name + '” was deleted.');
      render();
    }
  }

  function restock(p) {
    const body = document.createElement('div');
    body.className = 'modal-body';
    body.innerHTML =
      '<p class="modal-text">Current stock of <strong>' + esc(p.name) + '</strong>: <strong>' + esc(p.stock) + '</strong></p>' +
      '<div class="field"><label for="rsQty">Quantity received</label><input id="rsQty" class="input" type="number" min="1" step="1" placeholder="e.g. 20"></div>' +
      '<div class="field"><label for="rsCost">Total cost (₱)</label><input id="rsCost" class="input" type="number" min="0" step="0.01" placeholder="e.g. 600"></div>' +
      '<p class="form-error hidden" id="rsErr" role="alert"></p>';

    openModal({
      title: 'Restock product',
      body,
      actions: [
        { label: 'Cancel' },
        {
          label: 'Add stock', className: 'btn-primary', primary: true,
          onClick: modal => {
            const err = $('#rsErr', modal.el);
            const fail = msg => { err.textContent = msg; err.classList.remove('hidden'); };
            const qtyRaw = $('#rsQty', modal.el).value.trim();
            const costRaw = $('#rsCost', modal.el).value.trim();
            const qty = Number(qtyRaw);
            const cost = Number(costRaw);
            if (!qtyRaw || !Number.isInteger(qty) || qty < 1) return fail('Enter a whole number of 1 or more for the quantity.');
            if (!costRaw || !isFinite(cost) || cost < 0) return fail('Enter the total cost (0 or more).');

            const products = DB.products();
            const target = products.find(x => x.id === p.id);
            if (!target) return fail('That product no longer exists.');
            target.stock = Number(target.stock) + qty;
            const tx = DB.transactions();
            tx.push({
              id: uid('T'), saleId: uid('R'), date: new Date().toISOString(),
              productId: target.id, product: target.name, qty, total: round2(cost),
              type: 'Purchase', user: user.username
            });
            if (!DB.saveProducts(products) || !DB.saveTransactions(tx)) return;
            modal.close();
            toast('Added ' + qty + ' to ' + target.name + '. New stock: ' + target.stock + '.');
            render();
          }
        }
      ]
    });
  }

  render();
})();