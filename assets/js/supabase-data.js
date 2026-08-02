(() => {
  'use strict';

  const cfg = window.__CLAUDINO_CONFIG__ || {};
  const supabaseLib = window.supabase;
  let client = null;
  let realtimeChannel = null;

  function assertConfigured() {
    if (!cfg.supabaseUrl || !cfg.supabasePublishableKey) {
      throw new Error('Supabase não configurado neste deploy.');
    }
    if (!supabaseLib?.createClient) {
      throw new Error('Biblioteca do Supabase não carregada.');
    }
  }

  function getClient() {
    if (client) return client;
    assertConfigured();
    client = supabaseLib.createClient(cfg.supabaseUrl, cfg.supabasePublishableKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
    return client;
  }

  async function signIn(email, password) {
    const { data, error } = await getClient().auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }

  async function signOut() {
    const { error } = await getClient().auth.signOut();
    if (error) throw error;
  }

  async function getSession() {
    const { data, error } = await getClient().auth.getSession();
    if (error) throw error;
    return data.session;
  }

  async function isAdmin() {
    const session = await getSession();
    if (!session?.user?.id) return false;
    const { data, error } = await getClient()
      .from('admin_users')
      .select('role')
      .eq('user_id', session.user.id)
      .maybeSingle();
    if (error) throw error;
    return data?.role === 'admin' || data?.role === 'editor';
  }

  async function listProducts({ includeInactive = false } = {}) {
    let query = getClient()
      .from('products')
      .select('*, categories(id,name,slug)')
      .order('created_at', { ascending: false });
    if (!includeInactive) query = query.eq('active', true);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  async function saveProduct(product) {
    if (!(await isAdmin())) throw new Error('Acesso administrativo necessário.');
    const payload = {
      id: product.id || undefined,
      name: product.name,
      slug: product.slug,
      description: product.description || null,
      sku: product.sku || null,
      category_id: product.category_id || null,
      price: Number(product.price || 0),
      promotional_price: product.promotional_price == null || product.promotional_price === '' ? null : Number(product.promotional_price),
      stock: Number(product.stock || 0),
      active: product.active !== false,
      featured: Boolean(product.featured),
      weight_grams: product.weight_grams == null || product.weight_grams === '' ? null : Number(product.weight_grams),
      image_url: product.image_url || null,
      gallery: Array.isArray(product.gallery) ? product.gallery : [],
      metadata: product.metadata && typeof product.metadata === 'object' ? product.metadata : {}
    };
    const { data, error } = await getClient().from('products').upsert(payload).select().single();
    if (error) throw error;
    return data;
  }

  async function deleteProduct(id) {
    if (!(await isAdmin())) throw new Error('Acesso administrativo necessário.');
    const { error } = await getClient().from('products').delete().eq('id', id);
    if (error) throw error;
  }

  async function listCategories({ includeInactive = false } = {}) {
    let query = getClient().from('categories').select('*').order('sort_order').order('name');
    if (!includeInactive) query = query.eq('active', true);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  async function saveCategory(category) {
    if (!(await isAdmin())) throw new Error('Acesso administrativo necessário.');
    const { data, error } = await getClient().from('categories').upsert({
      id: category.id || undefined,
      name: category.name,
      slug: category.slug,
      active: category.active !== false,
      sort_order: Number(category.sort_order || 0)
    }).select().single();
    if (error) throw error;
    return data;
  }

  async function getSettings() {
    const { data, error } = await getClient().from('store_settings').select('key,value');
    if (error) throw error;
    return Object.fromEntries((data || []).map(item => [item.key, item.value]));
  }

  async function saveSetting(key, value) {
    if (!(await isAdmin())) throw new Error('Acesso administrativo necessário.');
    const { data, error } = await getClient().from('store_settings').upsert({ key, value }).select().single();
    if (error) throw error;
    return data;
  }

  function subscribe(onChange) {
    if (realtimeChannel) getClient().removeChannel(realtimeChannel);
    realtimeChannel = getClient()
      .channel('claudino-store-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, payload => onChange?.('products', payload))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, payload => onChange?.('categories', payload))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'store_settings' }, payload => onChange?.('store_settings', payload))
      .subscribe();
    return () => {
      if (realtimeChannel) getClient().removeChannel(realtimeChannel);
      realtimeChannel = null;
    };
  }

  window.ClaudinoData = {
    configured: Boolean(cfg.supabaseUrl && cfg.supabasePublishableKey),
    getClient,
    signIn,
    signOut,
    getSession,
    isAdmin,
    listProducts,
    saveProduct,
    deleteProduct,
    listCategories,
    saveCategory,
    getSettings,
    saveSetting,
    subscribe
  };
})();
