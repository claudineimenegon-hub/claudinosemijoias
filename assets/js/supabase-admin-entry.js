(() => {
  'use strict';

  const params = new URLSearchParams(location.search);
  if (params.get('admin') !== 'supabase') return;

  async function openFullAdmin() {
    try {
      const api = window.ClaudinoData;
      if (!api?.configured) throw new Error('Supabase não configurado.');
      const session = await api.getSession();
      if (!session || !(await api.isAdmin())) {
        location.replace('/admin/');
        return;
      }

      sessionStorage.setItem('cj_admin_ok', '1');
      let attempts = 0;
      const timer = setInterval(() => {
        attempts += 1;
        if (typeof window.openAdmin === 'function') {
          clearInterval(timer);
          window.openAdmin();
          history.replaceState({}, '', '/');
        } else if (attempts > 80) {
          clearInterval(timer);
          alert('O painel original não pôde ser aberto. Atualize a página e tente novamente.');
        }
      }, 100);
    } catch (error) {
      console.error(error);
      location.replace('/admin/');
    }
  }

  window.addEventListener('load', openFullAdmin, { once: true });
})();
