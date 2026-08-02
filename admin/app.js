(() => {
  'use strict';
  const api = window.ClaudinoData;
  const $ = id => document.getElementById(id);
  const state = { products: [] };

  function slugify(value='') {
    return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  }

  async function ensureAdmin() {
    const session = await api.getSession();
    if (!session) return { session: null, admin: false };
    const admin = await api.isAdmin();
    return { session, admin };
  }

  async function loadProducts() {
    state.products = await api.listProducts({ includeInactive: true });
    $('productCount').textContent = state.products.length;
    $('stockCount').textContent = state.products.reduce((sum,p)=>sum+Number(p.stock||0),0);
    const categories = await api.listCategories({ includeInactive: true });
    $('categoryCount').textContent = categories.length;
    renderProducts();
  }

  function renderProducts() {
    const list = $('productsList');
    list.innerHTML = '';
    if (!state.products.length) {
      list.innerHTML = '<div class="empty">Nenhum produto cadastrado no banco.</div>';
      return;
    }
    state.products.forEach(product => {
      const row = document.createElement('article');
      row.className = 'product-row';
      row.innerHTML = `
        <img src="${product.image_url || ''}" alt="" onerror="this.style.visibility='hidden'">
        <div><h3>${product.name}</h3><p>R$ ${Number(product.price||0).toFixed(2).replace('.',',')} · Estoque: ${product.stock || 0} · ${product.active ? 'Ativo' : 'Inativo'}</p></div>
        <div class="actions"><button data-edit="${product.id}">Editar</button><button class="danger" data-delete="${product.id}">Excluir</button></div>`;
      list.append(row);
    });
  }

  function openProduct(product={}) {
    $('formTitle').textContent = product.id ? 'Editar produto' : 'Novo produto';
    $('productId').value = product.id || '';
    $('productName').value = product.name || '';
    $('productSlug').value = product.slug || '';
    $('productPrice').value = product.price ?? '';
    $('productStock').value = product.stock ?? 0;
    $('productImage').value = product.image_url || '';
    $('productDescription').value = product.description || '';
    $('productActive').checked = product.active !== false;
    $('formStatus').textContent = '';
    $('productDialog').showModal();
  }

  async function init() {
    if (!api?.configured) {
      $('loginStatus').textContent = 'Supabase não configurado neste deploy.';
      return;
    }
    try {
      const { session, admin } = await ensureAdmin();
      if (!session) return;
      if (!admin) {
        $('loginStatus').textContent = 'Usuário autenticado, mas sem permissão administrativa.';
        await api.signOut();
        return;
      }
      $('loginView').hidden = true;
      $('dashboardView').hidden = false;
      $('sessionLabel').textContent = session.user.email || session.user.id;
      await loadProducts();
      api.subscribe(() => loadProducts().catch(console.error));
    } catch (error) {
      $('loginStatus').textContent = error.message;
    }
  }

  $('loginForm').addEventListener('submit', async event => {
    event.preventDefault();
    $('loginStatus').textContent = 'Entrando…';
    try {
      await api.signIn($('email').value.trim(), $('password').value);
      const { admin } = await ensureAdmin();
      if (!admin) throw new Error('Este usuário não possui permissão administrativa.');
      location.reload();
    } catch (error) {
      $('loginStatus').textContent = error.message;
    }
  });

  $('logoutBtn').addEventListener('click', async () => { await api.signOut(); location.reload(); });
  $('newProductBtn').addEventListener('click', () => openProduct());
  $('closeDialog').addEventListener('click', () => $('productDialog').close());
  $('productName').addEventListener('input', () => { if (!$('productId').value) $('productSlug').value = slugify($('productName').value); });

  $('productsList').addEventListener('click', async event => {
    const editId = event.target.dataset.edit;
    const deleteId = event.target.dataset.delete;
    if (editId) openProduct(state.products.find(p => p.id === editId));
    if (deleteId && confirm('Excluir este produto do banco?')) {
      try { await api.deleteProduct(deleteId); await loadProducts(); }
      catch (error) { alert(error.message); }
    }
  });

  $('productForm').addEventListener('submit', async event => {
    event.preventDefault();
    $('formStatus').textContent = 'Salvando…';
    try {
      await api.saveProduct({
        id: $('productId').value || undefined,
        name: $('productName').value.trim(),
        slug: $('productSlug').value.trim(),
        price: $('productPrice').value,
        stock: $('productStock').value,
        image_url: $('productImage').value.trim(),
        description: $('productDescription').value.trim(),
        active: $('productActive').checked
      });
      $('productDialog').close();
      await loadProducts();
    } catch (error) {
      $('formStatus').textContent = error.message;
    }
  });

  init();
})();
