(() => {
  'use strict';

  const LEGACY_TEXT = ['Acesso Restrito', 'Senha de Administrador', 'Entrar no Painel'];

  function isLegacyAdminModal(node) {
    if (!(node instanceof HTMLElement)) return false;
    const text = (node.textContent || '').replace(/\s+/g, ' ').trim();
    return LEGACY_TEXT.filter(term => text.includes(term)).length >= 2;
  }

  function findModalRoot(node) {
    let current = node;
    while (current?.parentElement && current !== document.body) {
      const style = getComputedStyle(current);
      if (style.position === 'fixed' || style.position === 'absolute' || current.getAttribute('role') === 'dialog') {
        return current;
      }
      current = current.parentElement;
    }
    return node;
  }

  function openSupabaseAdmin() {
    const panel = document.getElementById('supabase-admin-tools');
    if (!panel) return;
    panel.hidden = false;
    panel.style.display = 'block';
    panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
    panel.animate(
      [
        { transform: 'scale(.98)', boxShadow: '0 0 0 rgba(201,168,76,0)' },
        { transform: 'scale(1)', boxShadow: '0 0 0 4px rgba(201,168,76,.35)' },
        { transform: 'scale(1)', boxShadow: '0 16px 50px rgba(0,0,0,.22)' }
      ],
      { duration: 700, easing: 'ease-out' }
    );
  }

  function suppressLegacyModal(root) {
    if (!root || root.dataset.supabaseReplaced === 'true') return;
    root.dataset.supabaseReplaced = 'true';
    root.style.setProperty('display', 'none', 'important');
    root.setAttribute('aria-hidden', 'true');
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
    openSupabaseAdmin();
  }

  function scan(scope = document) {
    const elements = scope instanceof HTMLElement ? [scope, ...scope.querySelectorAll('*')] : [...document.querySelectorAll('body *')];
    for (const element of elements) {
      if (isLegacyAdminModal(element)) {
        suppressLegacyModal(findModalRoot(element));
        break;
      }
    }
  }

  const observer = new MutationObserver(mutations => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach(node => {
        if (node instanceof HTMLElement) scan(node);
      });
    }
  });

  window.addEventListener('DOMContentLoaded', () => {
    scan();
    observer.observe(document.body, { childList: true, subtree: true });
  }, { once: true });
})();
