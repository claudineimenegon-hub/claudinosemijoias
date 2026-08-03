(() => {
  'use strict';

  const MOBILE = matchMedia('(max-width: 768px)');

  function visible(element) {
    if (!(element instanceof HTMLElement)) return false;
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
  }

  function findByText(pattern) {
    return [...document.querySelectorAll('button, a, [role="button"], div')]
      .filter(visible)
      .find(element => pattern.test((element.textContent || '').replace(/\s+/g, ' ').trim()));
  }

  function position() {
    if (!MOBILE.matches || document.body.classList.contains('cj-admin-panel-open')) return;

    const normal = findByText(/^(carrinho|meu carrinho)$/i)
      || document.querySelector('[class*="cart"]:not([class*="wholesale"]):not([class*="atacado"])');
    const wholesale = findByText(/carrinho\s*(de\s*)?atacado|atacado/i)
      || document.querySelector('[class*="wholesale"], [class*="atacado"]');

    if (!(normal instanceof HTMLElement) || !(wholesale instanceof HTMLElement) || normal === wholesale) return;

    const normalRect = normal.getBoundingClientRect();
    const wholesaleRect = wholesale.getBoundingClientRect();
    const top = Math.max(12, normalRect.top + (normalRect.height - wholesaleRect.height) / 2);

    wholesale.classList.add('cj-wholesale-cart-mobile');
    wholesale.style.setProperty('position', 'fixed', 'important');
    wholesale.style.setProperty('left', '14px', 'important');
    wholesale.style.setProperty('right', 'auto', 'important');
    wholesale.style.setProperty('top', `${top}px`, 'important');
    wholesale.style.setProperty('bottom', 'auto', 'important');
    wholesale.style.setProperty('z-index', '9997', 'important');
  }

  let timer;
  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(position, 180);
  };

  addEventListener('DOMContentLoaded', schedule, { once: true });
  addEventListener('load', schedule, { once: true });
  addEventListener('resize', schedule);
  MOBILE.addEventListener?.('change', schedule);
  new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style', 'hidden'] });
})();
