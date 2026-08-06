(() => {
  'use strict';

  const api = window.ClaudinoData;
  const $ = id => document.getElementById(id);

  async function ensureAdmin() {
    const session = await api.getSession();
    if (!session) return { session: null, admin: false };
    return { session, admin: await api.isAdmin() };
  }

  function openOriginalPanel() {
    location.replace('/?admin=supabase');
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
      openOriginalPanel();
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
      openOriginalPanel();
    } catch (error) {
      $('loginStatus').textContent = error.message;
    }
  });

  init();
})();
