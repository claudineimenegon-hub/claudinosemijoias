(() => {
  'use strict';

  const api = window.ClaudinoData;
  const $ = id => document.getElementById(id);
  let products = [];
  let unsubscribe = null;

  function slugify(value = '') {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function money(value) {
    return Number(value || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  }

  async function ensureAdmin() {
    const session = await api.getSession();
    if (!session) return { session: null, admin: false };
    return { session, admin: await api.isAdmin() };
  }

  function showLogin(message = '') {
    $('dashboardView').hidden = true;
    $('loginView').hidden = false;
    $('loginStatus').textContent = message;
  }

  function showDashboard(session) {
    $('loginView').hidden = true;
    $('dashboardView').hidden = false;
    $('sessionLabel').textContent = session.user.email || session.user.id;
  }

  function renderProducts() {
    const list = $('productsList');
    list.replaceChildren();

    if (!products.length) {
      const empty = document.createElement('p');
      empty.className = 'status';
      empty.textContent = 'Nenhum produto cadastrado no Supabase.';
      list.append(empty);
      return;
    }

    for (const product of products) {
      const row = document.createElement('article');
      row.className = 'product-row';
      row.innerHTML = `
        <img src="${product.image_url || ''}" alt="" loading="lazy" onerror="this.style.visibility='hidden'">
        <div class="product-main">
          <strong>${product.name}</strong>
          <span>${money(product.price)} · Estoque: ${Number(product.stock || 0)}</span>
          <small>${product.active ? 'Ativo' : 'Inativo'} · ${product.slug}</small>
        </div>
        <div class="product-actions">
          <button type="button" data-edit="${product.id}" class="secondary">Editar</button>
          <button type="button" data-delete="${product.id}" class="danger">Excluir</button>
        </div>`;
      list.append(row);
    }

    list.querySelectorAll('[data-edit]').forEach(button => {
      button.addEventListener('click', () => openProduct(products.find(p => p.id === button.dataset.edit)));
    });

    list.querySelectorAll('[data-delete]').forEach(button => {
      button.addEventListener('click', async () => {
        const product = products.find(p => p.id === button.dataset.delete);
        if (!product || !confirm(`Excluir “${product.name}”? Esta ação não pode ser desfeita.`)) return;
        button.disabled = true;
        try {
          await api.deleteProduct(product.id);
          await loadDashboard();
        } catch (error) {
          alert(`Não foi possível excluir: ${error.message}`);
        } finally {
          button.disabled = false;
        }
      });
    });
  }

  async function loadDashboard() {
    const [allProducts, categories] = await Promise.all([
      api.listProducts({ includeInactive: true }),
      api.listCategories({ includeInactive: true })
    ]);

    products = allProducts;
    $('productCount').textContent = String(products.length);
    $('categoryCount').textContent = String(categories.length);
    $('stockCount').textContent = String(products.reduce((sum, item) => sum + Number(item.stock || 0), 0));
    renderProducts();
  }

  function clearProductForm() {
    $('productForm').reset();
    $('productId').value = '';
    $('productActive').checked = true;
    $('formStatus').textContent = '';
  }

  function openProduct(product = null) {
    clearProductForm();
    $('formTitle').textContent = product ? 'Editar produto' : 'Novo produto';

    if (product) {
      $('productId').value = product.id;
      $('productName').value = product.name || '';
      $('productSlug').value = product.slug || '';
      $('productPrice').value = product.price ?? '';
      $('productStock').value = product.stock ?? 0;
      $('productImage').value = product.image_url || '';
      $('productDescription').value = product.description || '';
      $('productActive').checked = product.active !== false;
    }

    $('productDialog').showModal();
  }

  async function init() {
    if (!api?.configured) {
      showLogin('Supabase não configurado neste deploy.');
      return;
    }

    try {
      const { session, admin } = await ensureAdmin();
      if (!session) {
        showLogin();
        return;
      }
      if (!admin) {
        await api.signOut();
        showLogin('Usuário autenticado, mas sem permissão administrativa.');
        return;
      }

      showDashboard(session);
      await loadDashboard();
      unsubscribe = api.subscribe(() => loadDashboard().catch(console.error));
    } catch (error) {
      showLogin(error.message);
    }
  }

  $('loginForm').addEventListener('submit', async event => {
    event.preventDefault();
    $('loginStatus').textContent = 'Entrando…';
    try {
      await api.signIn($('email').value.trim(), $('password').value);
      const { session, admin } = await ensureAdmin();
      if (!admin) throw new Error('Este usuário não possui permissão administrativa.');
      showDashboard(session);
      await loadDashboard();
      unsubscribe = api.subscribe(() => loadDashboard().catch(console.error));
    } catch (error) {
      $('loginStatus').textContent = error.message;
    }
  });

  $('logoutBtn').addEventListener('click', async () => {
    unsubscribe?.();
    unsubscribe = null;
    await api.signOut();
    showLogin('Sessão encerrada.');
  });

  $('newProductBtn').addEventListener('click', () => openProduct());
  $('closeDialog').addEventListener('click', () => $('productDialog').close());

  $('productName').addEventListener('input', () => {
    if (!$('productId').value || !$('productSlug').dataset.edited) {
      $('productSlug').value = slugify($('productName').value);
    }
  });
  $('productSlug').addEventListener('input', () => { $('productSlug').dataset.edited = 'true'; });

  $('productForm').addEventListener('submit', async event => {
    event.preventDefault();
    const submit = event.submitter;
    submit.disabled = true;
    $('formStatus').textContent = 'Salvando…';

    try {
      await api.saveProduct({
        id: $('productId').value || undefined,
        name: $('productName').value.trim(),
        slug: slugify($('productSlug').value || $('productName').value),
        price: $('productPrice').value,
        stock: $('productStock').value,
        image_url: $('productImage').value.trim() || null,
        description: $('productDescription').value.trim() || null,
        active: $('productActive').checked
      });
      $('formStatus').textContent = 'Produto salvo com sucesso.';
      await loadDashboard();
      setTimeout(() => $('productDialog').close(), 450);
    } catch (error) {
      $('formStatus').textContent = `Erro: ${error.message}`;
    } finally {
      submit.disabled = false;
    }
  });

  init();
})();
