(() => {
  'use strict';

  const BACKUP_KEY = 'claudino_supabase_last_backup';
  const CANDIDATE_KEYS = ['products', 'produtos', 'claudino_products', 'store_products'];

  function slugify(value) {
    return String(value || '')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }

  function parseJson(value) {
    try { return JSON.parse(value); } catch { return null; }
  }

  function findLegacyProducts() {
    for (const key of CANDIDATE_KEYS) {
      const parsed = parseJson(localStorage.getItem(key));
      if (Array.isArray(parsed) && parsed.length) return { key, products: parsed };
    }

    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      const parsed = parseJson(localStorage.getItem(key));
      if (Array.isArray(parsed) && parsed.some(item => item && (item.name || item.nome) && (item.price != null || item.preco != null))) {
        return { key, products: parsed };
      }
    }

    const globals = [window.products, window.produtos, window.PRODUCTS];
    const list = globals.find(Array.isArray);
    return list?.length ? { key: 'window', products: list } : { key: null, products: [] };
  }

  function normalizeProduct(product, index) {
    const name = product.name || product.nome || `Produto ${index + 1}`;
    const rawPrice = product.price ?? product.preco ?? product.valor ?? 0;
    const price = typeof rawPrice === 'string'
      ? Number(rawPrice.replace(/[^0-9,.-]/g, '').replace('.', '').replace(',', '.'))
      : Number(rawPrice);

    return {
      id: product.id && /^[0-9a-f-]{36}$/i.test(product.id) ? product.id : undefined,
      name,
      slug: product.slug || `${slugify(name)}-${index + 1}`,
      description: product.description || product.descricao || null,
      sku: product.sku || product.codigo || null,
      category_id: product.category_id || null,
      price: Number.isFinite(price) ? price : 0,
      promotional_price: product.promotional_price ?? product.precoPromocional ?? null,
      stock: Number(product.stock ?? product.estoque ?? 0),
      active: product.active ?? product.ativo ?? true,
      featured: Boolean(product.featured ?? product.destaque),
      weight_grams: product.weight_grams ?? product.peso ?? null,
      image_url: product.image_url || product.image || product.imagem || null,
      gallery: product.gallery || product.galeria || [],
      metadata: { legacy: product }
    };
  }

  async function requireAdmin() {
    if (!window.ClaudinoData?.configured) throw new Error('Supabase não configurado neste deploy.');
    if (!(await window.ClaudinoData.isAdmin())) throw new Error('Entre com o usuário administrador antes de sincronizar.');
  }

  async function migrateLegacyProducts() {
    await requireAdmin();
    const source = findLegacyProducts();
    if (!source.products.length) return { imported: 0, source: null };

    localStorage.setItem(BACKUP_KEY, JSON.stringify({
      createdAt: new Date().toISOString(),
      source: source.key,
      products: source.products
    }));

    let imported = 0;
    const errors = [];
    for (const [index, legacy] of source.products.entries()) {
      try {
        await window.ClaudinoData.saveProduct(normalizeProduct(legacy, index));
        imported += 1;
      } catch (error) {
        errors.push({ index, name: legacy.name || legacy.nome, message: error.message });
      }
    }
    window.dispatchEvent(new CustomEvent('claudino:data-synced', { detail: { table: 'products', imported, errors } }));
    return { imported, source: source.key, errors };
  }

  async function saveProduct(product) {
    await requireAdmin();
    const saved = await window.ClaudinoData.saveProduct(normalizeProduct(product, 0));
    window.dispatchEvent(new CustomEvent('claudino:product-saved', { detail: saved }));
    return saved;
  }

  async function deleteProduct(id) {
    await requireAdmin();
    await window.ClaudinoData.deleteProduct(id);
    window.dispatchEvent(new CustomEvent('claudino:product-deleted', { detail: { id } }));
  }

  async function refreshCatalog() {
    if (!window.ClaudinoData?.configured) return [];
    const products = await window.ClaudinoData.listProducts();
    window.dispatchEvent(new CustomEvent('claudino:catalog-loaded', { detail: { products } }));
    return products;
  }

  function subscribe() {
    if (!window.ClaudinoData?.configured) return () => {};
    return window.ClaudinoData.subscribe(async table => {
      if (table === 'products' || table === 'categories') await refreshCatalog();
      window.dispatchEvent(new CustomEvent('claudino:remote-change', { detail: { table } }));
    });
  }

  window.ClaudinoAdminBridge = {
    findLegacyProducts,
    migrateLegacyProducts,
    saveProduct,
    deleteProduct,
    refreshCatalog,
    subscribe,
    backupKey: BACKUP_KEY
  };

  window.addEventListener('DOMContentLoaded', () => {
    if (!window.ClaudinoData?.configured) return;
    refreshCatalog().catch(error => console.warn('[Claudino] catálogo remoto indisponível:', error.message));
    subscribe();
  });
})();
