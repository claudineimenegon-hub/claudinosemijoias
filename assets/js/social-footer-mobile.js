(() => {
  'use strict';

  const MOBILE = matchMedia('(max-width: 768px)');
  const NETWORKS = [
    { key: 'whatsapp', label: 'WhatsApp', hosts: ['wa.me', 'whatsapp.com'], icon: 'https://cdn.simpleicons.org/whatsapp/25D366' },
    { key: 'instagram', label: 'Instagram', hosts: ['instagram.com'], icon: 'https://cdn.simpleicons.org/instagram/E4405F' },
    { key: 'facebook', label: 'Facebook', hosts: ['facebook.com', 'fb.com'], icon: 'https://cdn.simpleicons.org/facebook/1877F2' },
    { key: 'tiktok', label: 'TikTok', hosts: ['tiktok.com'], icon: 'https://cdn.simpleicons.org/tiktok/000000' },
    { key: 'kwai', label: 'Kwai', hosts: ['kwai.com'], icon: 'https://cdn.simpleicons.org/kwai/FF4D00' }
  ];

  const normalize = value => String(value || '').trim();
  const isUrl = value => /^(https?:\/\/|whatsapp:\/\/)/i.test(normalize(value));

  function readObject(value) {
    try { return JSON.parse(value); } catch { return null; }
  }

  function networkFromText(text) {
    const value = String(text || '').toLowerCase();
    return NETWORKS.find(network => value.includes(network.key));
  }

  function collectFromObject(input, found, inheritedKey = '') {
    if (!input || typeof input !== 'object') return;

    if (Array.isArray(input)) {
      input.forEach(item => collectFromObject(item, found, inheritedKey));
      return;
    }

    for (const [key, value] of Object.entries(input)) {
      const combinedKey = `${inheritedKey} ${key}`.toLowerCase();
      const network = networkFromText(combinedKey);

      if (typeof value === 'string' && isUrl(value)) {
        const byUrl = NETWORKS.find(item => item.hosts.some(host => value.toLowerCase().includes(host)));
        const target = network || byUrl;
        if (target && !found.has(target.key)) found.set(target.key, value);
      } else if (value && typeof value === 'object') {
        const active = value.active ?? value.ativo ?? value.enabled ?? value.habilitado ?? true;
        const url = value.url ?? value.link ?? value.href ?? value.profile ?? value.perfil;
        if (network && active !== false && typeof url === 'string' && isUrl(url) && !found.has(network.key)) {
          found.set(network.key, url);
        }
        collectFromObject(value, found, combinedKey);
      }
    }
  }

  function collectSocialLinks() {
    const found = new Map();

    document.querySelectorAll('a[href]').forEach(anchor => {
      const href = anchor.href || anchor.getAttribute('href') || '';
      const network = NETWORKS.find(item => item.hosts.some(host => href.toLowerCase().includes(host)));
      if (network && !anchor.closest('#cj-social-footer') && !found.has(network.key)) found.set(network.key, href);
    });

    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      const raw = localStorage.getItem(key);
      const parsed = readObject(raw);
      if (parsed) collectFromObject(parsed, found, key);
      else if (isUrl(raw)) {
        const network = networkFromText(key) || NETWORKS.find(item => item.hosts.some(host => raw.toLowerCase().includes(host)));
        if (network && !found.has(network.key)) found.set(network.key, raw);
      }
    }

    document.querySelectorAll('input, textarea').forEach(field => {
      const context = `${field.name || ''} ${field.id || ''} ${field.placeholder || ''} ${field.closest('label')?.textContent || ''}`;
      const network = networkFromText(context);
      const value = field.value;
      const checkbox = field.closest('section, div, label')?.querySelector('input[type="checkbox"]');
      if (network && isUrl(value) && checkbox?.checked !== false) found.set(network.key, value);
    });

    return found;
  }

  function isAdminPanelOpen() {
    if (location.pathname.startsWith('/admin') || new URLSearchParams(location.search).get('admin') === 'supabase') return true;
    const visibleText = [...document.querySelectorAll('body *')].some(element => {
      if (!(element instanceof HTMLElement)) return false;
      const text = (element.textContent || '').replace(/\s+/g, ' ').trim();
      if (!/(Painel Administrativo|Novo Produto|Salvar produto|Redes Sociais)/i.test(text)) return false;
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    });
    return visibleText;
  }

  function applyAdminState() {
    document.body.classList.toggle('cj-admin-panel-open', isAdminPanelOpen());
  }

  function render() {
    document.getElementById('cj-social-footer')?.remove();
    applyAdminState();
    if (!MOBILE.matches || document.body.classList.contains('cj-admin-panel-open')) return;

    const links = collectSocialLinks();
    const footer = document.createElement('nav');
    footer.id = 'cj-social-footer';
    footer.setAttribute('aria-label', 'Redes sociais');

    NETWORKS.forEach(network => {
      const href = links.get(network.key);
      if (!href) return;
      const anchor = document.createElement('a');
      anchor.className = 'cj-social-link';
      anchor.href = href;
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      anchor.setAttribute('aria-label', network.label);
      anchor.title = network.label;
      anchor.innerHTML = `<img src="${network.icon}" alt="${network.label}">`;
      footer.append(anchor);
    });

    if (!footer.children.length) {
      footer.hidden = true;
    }
    document.body.append(footer);
  }

  let timer;
  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(render, 180);
  };

  addEventListener('DOMContentLoaded', schedule, { once: true });
  addEventListener('load', schedule, { once: true });
  addEventListener('storage', schedule);
  MOBILE.addEventListener?.('change', schedule);

  new MutationObserver(schedule).observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'style', 'hidden', 'aria-hidden', 'value', 'checked']
  });
})();
