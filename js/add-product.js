(function () {
  const user = initLayout({ active: 'add', roles: ['manager'] });
  if (!user) return;

  const editId = new URLSearchParams(location.search).get('id');
  let editing = null;
  if (editId) {
    editing = DB.find(editId);
    if (!editing) {
      flash('That product was not found.', 'error');
      location.replace('products.html');
      return;
    }
  }

  const f = {
    name: $('#pName'), category: $('#pCategory'), price: $('#pPrice'), qty: $('#pQty'), desc: $('#pDesc'),
    upload: $('#upload'), file: $('#fileInput')
  };
  let image = editing ? (editing.image || '') : '';

  const cats = CATEGORIES.slice();
  if (editing && cats.indexOf(editing.category) === -1) cats.push(editing.category);
  f.category.innerHTML = '<option value="" disabled selected>Select category</option>' +
    cats.map(c => '<option value="' + esc(c) + '">' + esc(c) + '</option>').join('');

  if (editing) {
    $('#pageTitle').textContent = 'Edit Product';
    document.title = 'Edit Product · Sales & Inventory';
    f.name.value = editing.name;
    f.category.value = editing.category;
    f.price.value = editing.price;
    f.qty.value = editing.stock;
    f.desc.value = editing.description || '';
  }

  function drawUpload() {
    if (image) {
      f.upload.innerHTML = '<img src="' + esc(image) + '" alt="Product image preview"><span>Click to change image</span>' +
        '<button type="button" class="link-btn" id="removeImg">Remove image</button>';
      $('#removeImg').addEventListener('click', e => { e.stopPropagation(); image = ''; drawUpload(); });
    } else {
      f.upload.innerHTML = '<span data-icon="upload" data-size="26"></span><span>Upload product image</span><small>(optional)</small>';
      hydrateIcons(f.upload);
    }
  }
  function readImage(file) {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith('image/')) return reject(new Error('Please choose an image file.'));
      if (file.size > 5 * 1024 * 1024) return reject(new Error('Image is too large (max 5 MB).'));
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Could not read that image.'));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('Could not read that image.'));
        img.onload = () => {
          const scale = Math.min(1, 400 / Math.max(img.width, img.height));
          const c = document.createElement('canvas');
          c.width = Math.max(1, Math.round(img.width * scale));
          c.height = Math.max(1, Math.round(img.height * scale));
          const ctx = c.getContext('2d');
          ctx.fillStyle = '#fff';
          ctx.fillRect(0, 0, c.width, c.height);
          ctx.drawImage(img, 0, 0, c.width, c.height);
          resolve(c.toDataURL('image/jpeg', 0.8));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }
  async function handleFile(file) {
    if (!file) return;
    setError('image', '');
    try { image = await readImage(file); drawUpload(); }
    catch (err) { setError('image', err.message); }
    f.file.value = '';
  }
  f.upload.addEventListener('click', () => f.file.click());
  f.upload.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); f.file.click(); } });
  f.file.addEventListener('change', () => handleFile(f.file.files[0]));
  ['dragover', 'dragenter'].forEach(ev => f.upload.addEventListener(ev, e => { e.preventDefault(); f.upload.classList.add('drag'); }));
  ['dragleave', 'drop'].forEach(ev => f.upload.addEventListener(ev, e => { e.preventDefault(); f.upload.classList.remove('drag'); }));
  f.upload.addEventListener('drop', e => handleFile(e.dataTransfer.files[0]));
  drawUpload();

  function setError(key, msg) {
    const el = document.getElementById('err-' + key);
    if (el) el.textContent = msg;
  }
  function mark(el, bad) { el.classList.toggle('invalid', !!bad); }
  function validate() {
    let ok = true;
    ['pName', 'pCategory', 'pPrice', 'pQty', 'image'].forEach(k => setError(k, ''));
    [f.name, f.category, f.qty].forEach(el => mark(el, false));
    mark($('#priceGroup'), false);

    const name = f.name.value.trim();
    if (!name) { setError('pName', 'Product name is required.'); mark(f.name, true); ok = false; }
    else {
      const dup = DB.products().some(p => p.name.toLowerCase() === name.toLowerCase() && (!editing || p.id !== editing.id));
      if (dup) { setError('pName', 'A product with this name already exists.'); mark(f.name, true); ok = false; }
    }
    if (!f.category.value) { setError('pCategory', 'Please select a category.'); mark(f.category, true); ok = false; }

    const price = Number(f.price.value);
    if (f.price.value.trim() === '' || !isFinite(price) || price <= 0) {
      setError('pPrice', 'Enter a price greater than 0.'); mark($('#priceGroup'), true); ok = false;
    }
    const qty = Number(f.qty.value);
    if (f.qty.value.trim() === '' || !Number.isInteger(qty) || qty < 0) {
      setError('pQty', 'Enter a whole number, 0 or more.'); mark(f.qty, true); ok = false;
    }
    return ok;
  }

  $('#productForm').addEventListener('submit', e => {
    e.preventDefault();
    if (!validate()) {
      const firstBad = $('.invalid input, input.invalid, select.invalid');
      if (firstBad) firstBad.focus();
      return;
    }
    const data = {
      name: f.name.value.trim(),
      category: f.category.value,
      price: round2(Number(f.price.value)),
      stock: Number(f.qty.value),
      description: f.desc.value.trim(),
      image
    };
    const products = DB.products();
    if (editing) {
      const target = products.find(p => p.id === editing.id);
      if (!target) { flash('That product no longer exists.', 'error'); location.href = 'products.html'; return; }
      Object.assign(target, data);
    } else {
      products.push(Object.assign({ id: DB.nextId() }, data));
    }
    if (!DB.saveProducts(products)) return;
    flash(editing ? '“' + data.name + '” was updated.' : '“' + data.name + '” was added.');
    location.href = 'products.html';
  });

  $('#cancelBtn').addEventListener('click', async () => {
    const changed = !editing
      ? (f.name.value.trim() || f.price.value || f.qty.value || f.desc.value.trim() || image || f.category.value)
      : (f.name.value.trim() !== editing.name || Number(f.price.value) !== editing.price || Number(f.qty.value) !== editing.stock ||
         f.category.value !== editing.category || f.desc.value.trim() !== (editing.description || '') || image !== (editing.image || ''));
    if (changed) {
      const ok = await confirmDialog({ title: 'Discard changes?', message: 'You have unsaved changes. Leave this page without saving?', confirmText: 'Discard', danger: true });
      if (!ok) return;
    }
    location.href = 'products.html';
  });
})();