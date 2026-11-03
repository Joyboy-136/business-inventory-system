(function () {
  const user = initLayout({ active: 'sales' });
  if (!user) return;

  let cart = [];
  let query = '';
  const listEl = $('#productList');
  const bodyEl = $('#saleBody');
  const totalEl = $('#saleTotal');
  const completeBtn = $('#completeBtn');

  function thumb(p) {
    return p.image ? '<img src="' + esc(p.image) + '" alt="">' : icon('box', 22, 1.75);
  }

  function cartLines(products) {
    return cart.map(l => ({ line: l, product: products.find(p => p.id === l.id) })).filter(x => x.product);
  }
  function cartTotal(products) {
    return round2(cartLines(products).reduce((s, x) => s + x.product.price * x.line.qty, 0));
  }

  function render() {
    const products = DB.products();
    cart = cartLines(products).map(x => {
      x.line.qty = Math.max(1, Math.min(x.line.qty, Math.max(1, x.product.stock)));
      return x.line;
    }).filter(l => (products.find(p => p.id === l.id) || { stock: 0 }).stock > 0);

    const q = query.trim().toLowerCase();
    const shown = products.filter(p => !q || p.name.toLowerCase().includes(q) || String(p.category).toLowerCase().includes(q));
    listEl.innerHTML = shown.length ? shown.map(p =>
      '<button type="button" class="product-item" data-id="' + esc(p.id) + '"' + (p.stock <= 0 ? ' disabled' : '') + '>' +
        '<span class="product-left"><span class="thumb">' + thumb(p) + '</span>' +
        '<span class="product-text"><strong>' + esc(p.name) + '</strong><small>' + pesoShort(p.price) + '</small></span></span>' +
        '<span class="stock-label">' + (p.stock <= 0 ? 'Out of stock' : 'Stock: ' + esc(p.stock)) + '</span>' +
      '</button>').join('')
      : '<p class="muted" style="padding:12px 8px">No products found.</p>';

    const lines = cartLines(products);
    bodyEl.innerHTML = lines.length ? lines.map(({ line, product }) =>
      '<tr><td>' + esc(product.name) + '</td>' +
      '<td><input class="qty-input" type="number" min="1" max="' + esc(product.stock) + '" step="1" value="' + line.qty + '" data-id="' + esc(product.id) + '" aria-label="Quantity of ' + esc(product.name) + '"></td>' +
      '<td>' + pesoShort(product.price) + '</td>' +
      '<td>' + pesoShort(round2(product.price * line.qty)) + '</td>' +
      '<td><button type="button" class="icon-btn danger" data-remove="' + esc(product.id) + '" aria-label="Remove ' + esc(product.name) + '" title="Remove">' + icon('trash', 18) + '</button></td></tr>').join('')
      : '<tr><td class="empty" colspan="5">No items yet. Click a product to add it.</td></tr>';

    totalEl.textContent = pesoShort(cartTotal(products));
    completeBtn.disabled = !lines.length;
  }

  function addToCart(id) {
    const p = DB.find(id);
    if (!p) { toast('That product no longer exists.', 'error'); render(); return; }
    if (p.stock <= 0) { toast(p.name + ' is out of stock.', 'error'); return; }
    const line = cart.find(l => l.id === id);
    if (line) {
      if (line.qty >= p.stock) { toast('Only ' + p.stock + ' ' + p.name + ' in stock.', 'error'); return; }
      line.qty += 1;
    } else {
      cart.push({ id, qty: 1 });
    }
    render();
  }

  listEl.addEventListener('click', e => {
    const btn = e.target.closest('.product-item');
    if (btn && !btn.disabled) addToCart(btn.dataset.id);
  });

  bodyEl.addEventListener('click', e => {
    const btn = e.target.closest('[data-remove]');
    if (!btn) return;
    cart = cart.filter(l => l.id !== btn.dataset.remove);
    render();
  });

  bodyEl.addEventListener('change', e => {
    const input = e.target.closest('.qty-input');
    if (!input) return;
    const p = DB.find(input.dataset.id);
    const line = cart.find(l => l.id === input.dataset.id);
    if (!p || !line) { render(); return; }
    let v = parseInt(input.value, 10);
    if (!v || v < 1) v = 1;
    if (v > p.stock) { v = p.stock; toast('Only ' + p.stock + ' ' + p.name + ' in stock.', 'error'); }
    line.qty = v;
    render();
  });

  $('#productSearch').addEventListener('input', e => { query = e.target.value; render(); });

  completeBtn.addEventListener('click', () => {
    const products = DB.products();
    const lines = cartLines(products);
    if (!lines.length) { toast('Add at least one product first.', 'error'); return; }
    const total = cartTotal(products);

    const body = document.createElement('div');
    body.className = 'modal-body';
    body.innerHTML =
      '<div class="table-card"><table class="mini-table"><thead><tr><th>Product</th><th>Qty</th><th>Total</th></tr></thead><tbody>' +
      lines.map(({ line, product }) =>
        '<tr><td>' + esc(product.name) + '</td><td>' + line.qty + '</td><td>' + pesoShort(round2(product.price * line.qty)) + '</td></tr>').join('') +
      '</tbody></table></div>' +
      '<div class="sum-row"><span>Total</span><strong>' + peso(total) + '</strong></div>' +
      '<div class="field"><label for="paid">Amount received (optional)</label><input id="paid" class="input" type="number" min="0" step="0.01" placeholder="e.g. 200"></div>' +
      '<div class="sum-row"><span>Change</span><strong id="change">—</strong></div>' +
      '<p class="form-error hidden" id="saleErr" role="alert"></p>';

    const paid = $('#paid', body), change = $('#change', body), err = $('#saleErr', body);
    paid.addEventListener('input', () => {
      err.classList.add('hidden');
      const v = Number(paid.value);
      change.textContent = paid.value !== '' && v >= total ? peso(round2(v - total)) : '—';
    });

    openModal({
      title: 'Confirm sale',
      body,
      actions: [
        { label: 'Cancel' },
        {
          label: 'Confirm sale', className: 'btn-blue', primary: true,
          onClick: modal => {
            const fail = msg => { err.textContent = msg; err.classList.remove('hidden'); };
            const received = paid.value === '' ? null : Number(paid.value);
            if (received !== null && (!isFinite(received) || received < total)) {
              return fail('Amount received is less than the total (' + peso(total) + ').');
            }

            const fresh = DB.products();
            for (const l of cart) {
              const p = fresh.find(x => x.id === l.id);
              if (!p) return fail('A product in this sale no longer exists.');
              if (l.qty > p.stock) return fail('Only ' + p.stock + ' ' + p.name + ' left in stock.');
            }

            const now = new Date().toISOString();
            const saleId = uid('S');
            const tx = DB.transactions();
            cart.forEach(l => {
              const p = fresh.find(x => x.id === l.id);
              p.stock -= l.qty;
              tx.push({
                id: uid('T'), saleId, date: now, productId: p.id, product: p.name, qty: l.qty,
                total: round2(p.price * l.qty), type: 'Sale', user: user.username
              });
            });
            if (!DB.saveProducts(fresh) || !DB.saveTransactions(tx)) return;

            modal.close();
            const msg = 'Sale completed: ' + peso(total) + (received !== null ? ' · Change ' + peso(round2(received - total)) : '');
            cart = [];
            query = '';
            $('#productSearch').value = '';
            render();
            toast(msg);
          }
        }
      ]
    });
  });

  render();
})();