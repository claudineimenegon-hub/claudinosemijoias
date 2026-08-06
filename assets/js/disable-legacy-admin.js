(() => {
  'use strict';

  const LEGACY_TEXT = ['Acesso Restrito', 'Senha de Administrador', 'Entrar no Painel'];
  const params = new URLSearchParams(location.search);
  const openingAuthenticatedPanel = params.get('admin') === 'supabase';
  let redirecting = false;

  // Durante a abertura autenticada do painel completo, este script não deve
  // interceptar o modal antigo nem redirecionar novamente para /admin/.
  if (location.pathname.startsWith('/admin') || openingAuthenticatedPanel) return;

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

  function isActuallyVisible(element) {
    if (!(element instanceof HTMLElement)) return false;
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return style.display !== 'none'
      && style.visibility !== 'hidden'
      && Number(style.opacity || 1) > 0
      && rect.width > 0
      && rect.height > 0
      && element.getAttribute('aria-hidden') !== 'true';
  }

  function openSupabaseAdmin() {
    if (redirecting) return;
    redirecting = true;
    location.assign('/admin/');
  }

  function suppressLegacyModal(root) {
    if (!root || root.dataset.supabaseReplaced === 'true' || !isActuallyVisible(root)) return;
    root.dataset.supabaseReplaced = 'true';
    root.style.setProperty('display', 'none', 'important');
    root.setAttribute('aria-hidden', 'true');
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
    requestAnimationFrame(openSupabaseAdmin);
  }

  function scan(scope = document) {
    const elements = scope instanceof HTMLElement
      ? [scope, ...scope.querySelectorAll('*')]
      : [...document.querySelectorAll('body *')];

    for (const element of elements) {
      if (!isLegacyAdminModal(element)) continue;
      const root = findModalRoot(element);
      if (isActuallyVisible(root)) {
        suppressLegacyModal(root);
        break;
      }
    }
  }

  const observer = new MutationObserver(mutations => {
    for (const mutation of mutations) {
      if (mutation.type === 'attributes') {
        scan(mutation.target);
        continue;
      }
      mutation.addedNodes.forEach(node => {
        if (node instanceof HTMLElement) scan(node);
      });
    }
  });

  window.addEventListener('DOMContentLoaded', () => {
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'aria-hidden']
    });
  }, { once: true });
})();
