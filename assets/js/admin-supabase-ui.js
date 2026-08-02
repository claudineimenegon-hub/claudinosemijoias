(() => {
  'use strict';

  const data = window.ClaudinoData;
  const bridge = window.ClaudinoAdminBridge;
  if (!data || !bridge) return;

  function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    Object.entries(attrs).forEach(([key, value]) => {
      if (key === 'class') node.className = value;
      else if (key === 'text') node.textContent = value;
      else node.setAttribute(key, value);
    });
    [].concat(children).filter(Boolean).forEach(child => node.append(child));
    return node;
  }

  function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      #supabase-admin-tools{position:fixed;right:16px;bottom:88px;z-index:9999;width:min(360px,calc(100vw - 32px));background:#fff;border:1px solid #d6c59a;border-radius:14px;box-shadow:0 16px 50px rgba(0,0,0,.22);padding:16px;font-family:Jost,sans-serif;color:#2c2619}
      #supabase-admin-tools h3{margin:0 0 10px;font-size:20px}
      #supabase-admin-tools p{margin:7px 0;font-size:14px;line-height:1.45}
      #supabase-admin-tools input{width:100%;min-height:46px;margin:6px 0;padding:10px 12px;border:1px solid #cfc4aa;border-radius:8px;font-size:16px}
      #supabase-admin-tools button{width:100%;min-height:46px;margin-top:8px;border:0;border-radius:8px;background:#1a1610;color:#e8d5a3;font-size:15px;font-weight:600;cursor:pointer}
      #supabase-admin-tools button.secondary{background:#f3eddf;color:#2c2619}
      #supabase-admin-tools button:disabled{opacity:.55;cursor:not-allowed}
      #supabase-admin-status{padding:9px 10px;margin-top:10px;border-radius:8px;background:#f7f0e0;font-size:13px;white-space:pre-wrap}
      @media(max-width:768px){#supabase-admin-tools{right:10px;bottom:78px;width:calc(100vw - 20px);max-height:75vh;overflow:auto}}
    `;
    document.head.append(style);
  }

  async function render() {
    document.getElementById('supabase-admin-tools')?.remove();
    const panel = el('section', { id: 'supabase-admin-tools' });
    const title = el('h3', { text: 'Sincronização da loja' });
    const status = el('div', { id: 'supabase-admin-status', text: 'Verificando conexão…' });
    panel.append(title);

    try {
      const session = await data.getSession();
      const admin = session ? await data.isAdmin() : false;
      if (!session) {
        const email = el('input', { type: 'email', placeholder: 'E-mail administrativo', autocomplete: 'username' });
        const password = el('input', { type: 'password', placeholder: 'Senha', autocomplete: 'current-password' });
        const login = el('button', { type: 'button', text: 'Entrar no Supabase' });
        login.addEventListener('click', async () => {
          login.disabled = true;
          status.textContent = 'Entrando…';
          try {
            await data.signIn(email.value.trim(), password.value);
            await render();
          } catch (error) {
            status.textContent = `Falha no login: ${error.message}`;
          } finally { login.disabled = false; }
        });
        panel.append(el('p', { text: 'Entre com o usuário administrador criado no Supabase.' }), email, password, login, status);
      } else if (!admin) {
        panel.append(el('p', { text: 'Usuário autenticado, mas sem permissão administrativa.' }), status);
        status.textContent = session.user.email || session.user.id;
      } else {
        const localProducts = bridge.getLocalProducts();
        const remoteProducts = await data.listProducts({ includeInactive: true });
        panel.append(el('p', { text: `Produtos locais: ${localProducts.length} · Produtos no banco: ${remoteProducts.length}` }));

        const migrate = el('button', { type: 'button', text: 'Migrar produtos para o banco' });
        migrate.disabled = localProducts.length === 0;
        migrate.addEventListener('click', async () => {
          if (!confirm(`Migrar ${localProducts.length} produto(s) para o Supabase? Um backup local será criado antes.`)) return;
          migrate.disabled = true;
          status.textContent = 'Migrando produtos…';
          try {
            const result = await bridge.migrateLocalProducts();
            status.textContent = `Migração concluída. ${result.saved} produto(s) salvo(s), ${result.failed} falha(s).`;
            await render();
          } catch (error) {
            status.textContent = `Falha na migração: ${error.message}`;
          } finally { migrate.disabled = false; }
        });

        const refresh = el('button', { type: 'button', class: 'secondary', text: 'Atualizar catálogo pelo banco' });
        refresh.addEventListener('click', async () => {
          refresh.disabled = true;
          status.textContent = 'Atualizando catálogo…';
          try {
            const count = await bridge.refreshFromSupabase();
            status.textContent = `${count} produto(s) carregado(s) do Supabase.`;
          } catch (error) {
            status.textContent = `Falha na atualização: ${error.message}`;
          } finally { refresh.disabled = false; }
        });

        const logout = el('button', { type: 'button', class: 'secondary', text: 'Sair' });
        logout.addEventListener('click', async () => { await data.signOut(); await render(); });
        status.textContent = `Conectado como ${session.user.email || session.user.id}`;
        panel.append(migrate, refresh, logout, status);
      }
    } catch (error) {
      panel.append(status);
      status.textContent = `Supabase indisponível: ${error.message}`;
    }

    document.body.append(panel);
  }

  injectStyles();
  window.addEventListener('DOMContentLoaded', render, { once: true });
})();
