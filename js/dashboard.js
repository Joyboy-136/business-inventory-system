(function () {
  const user = initLayout({ active: 'dashboard' });
  if (!user) return;
  const isManager = user.role === 'manager';

  const products = DB.products();
  const allTx = DB.transactions().slice().sort((a, b) => new Date(b.date) - new Date(a.date));
  const sales = allTx.filter(t => t.type === 'Sale');

  const visibleTx = isManager ? allTx : sales;

  const lowCount = products.filter(p => DB.status(p) !== 'in').length;
  const units = products.reduce((s, p) => s + (Number(p.stock) || 0), 0);
  const salesTotal = round2((isManager ? sales : sales.filter(t => isToday(t.date))).reduce((s, t) => s + t.total, 0));

  $('#stats').innerHTML =
    '<div class="stat"><span class="stat-icon">' + icon('box', 22) + '</span><div><div class="stat-label">Total Products</div><div class="stat-value">' + products.length + '</div></div></div>' +
    '<a class="stat" href="inventory.html?status=low" title="See low stock items"><span class="stat-icon">' + icon('alert', 22) + '</span><div><div class="stat-label">Low Stock</div><div class="stat-value">' + lowCount + '</div></div></a>' +
    '<div class="stat"><span class="stat-icon">₱</span><div><div class="stat-label">' + (isManager ? 'Total Sales' : "Today's Sales") + '</div><div class="stat-value">' + pesoShort(salesTotal) + '</div></div></div>' +
    '<div class="stat"><span class="stat-icon">' + icon('db', 22) + '</span><div><div class="stat-label">Inventory</div><div class="stat-value">' + units + '</div></div></div>';

  function rows(list) {
    if (!list.length) return '<tr><td class="empty" colspan="5">No transactions yet.</td></tr>';
    return list.map(t =>
      '<tr><td>' + esc(formatDate(t.date)) + '</td><td>' + esc(t.product) + '</td><td>' + esc(t.qty) + '</td><td>' +
      peso(t.total) + '</td><td>' + txBadge(t.type) + '</td></tr>').join('');
  }

  $('#txBody').innerHTML = rows(visibleTx.slice(0, 5));

  $('#viewAll').addEventListener('click', function () {
    const body =
      '<div class="table-card"><div class="table-wrap" style="max-height:60vh;overflow-y:auto"><table><thead><tr>' +
      '<th>Date</th><th>Product</th><th>Quantity</th><th>Total</th><th>Type</th></tr></thead><tbody>' +
      rows(visibleTx) + '</tbody></table></div></div>';
    openModal({
      title: 'All Transactions (' + visibleTx.length + ')',
      body, wide: true,
      actions: [{ label: 'Close', className: 'btn-primary', primary: true }]
    });
  });
})();