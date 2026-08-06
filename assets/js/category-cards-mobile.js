(() => {
  'use strict';

  const MOBILE = matchMedia('(max-width: 768px)');
  const ORDER = [
    'colares',
    'conjunto colar e brincos',
    'conjunto colar anel e brincos',
    'conjunto colar anel brincos e pulseira',
    'conjunto anel e brincos',
    'aneis',
    'brincos',
    'pulseiras',
    'piercings',
    'embalagens',
    'diversos'
  ];

  const normalize = value => String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

  function categoryRank(label) {
    const n = normalize(label)
      .replace(/^conj\.?\s*/, 'conjunto ')
      .replace(/\s+/g, ' ');
    const exact = ORDER.indexOf(n);
    if (exact >= 0) return exact;
    return ORDER.findIndex(item => n.includes(item) || item.includes(n));
  }

  function findCategoryControls() {
    const candidates = [...document.querySelectorAll('button, a, [role="button"]')]
      .filter(el => {
        if (el.closest('.cj-category-cards')) return false;
        const text = normalize(el.textContent);
        if (!text || text.length > 55) return false;
        return categoryRank(text) >= 0;
      });

    if (candidates.length < 3) return [];

    const groups = new Map();
    for (const element of candidates) {
      let parent = element.parentElement;
      for (let depth = 0; parent && depth < 4; depth += 1, parent = parent.parentElement) {
        if (!groups.has(parent)) groups.set(parent, new Set());
        groups.get(parent).add(element);
      }
    }

    const best = [...groups.entries()]
      .filter(([, set]) => set.size >= 3)
      .sort((a, b) => b[1].size - a[1].size)[0];

    return best ? [...best[1]] : candidates;
  }

  function findProductFor(label) {
    const needle = normalize(label);
    const singular = needle.replace(/s$/, '');
    const cards = [...document.querySelectorAll('[class*="product"], .card, article')];

    return cards.find(card => {
      if (card.closest('.cj-category-cards')) return false;
      const text = normalize(card.textContent);
      return text.includes(needle) || text.includes(singular);
    });
  }

  function representativeImage(label) {
    const product = findProductFor(label);
    const image = product?.querySelector('img');
    return image?.currentSrc || image?.src || '';
  }

  function representativeDescription(label) {
    const product = findProductFor(label);
    const description = product?.querySelector('p, [class*="description"], small');
    const text = description?.textContent?.trim();
    return text && text.length <= 130 ? text : `Ver produtos da coleção ${label}.`;
  }

  function build() {
    document.querySelector('.cj-category-cards')?.remove();
    document.querySelectorAll('.cj-category-source-mobile-hidden')
      .forEach(el => el.classList.remove('cj-category-source-mobile-hidden'));

    if (!MOBILE.matches) return;

    const controls = findCategoryControls();
    if (controls.length < 3) return;

    const unique = new Map();
    controls.forEach(control => {
      const label = control.textContent.trim();
      const rank = categoryRank(label);
      if (rank < 0 || unique.has(rank)) return;
      unique.set(rank, { control, label, rank });
    });

    const items = [...unique.values()].sort((a, b) => a.rank - b.rank);
    if (items.length < 3) return;

    const source = controls[0].parentElement;
    source.classList.add('cj-category-source-mobile-hidden');

    const section = document.createElement('section');
    section.className = 'cj-category-cards';
    section.setAttribute('aria-label', 'Coleções');
    section.innerHTML = '<h2 class="cj-category-cards__title">Explore por coleção</h2><div class="cj-category-cards__list"></div>';

    const list = section.querySelector('.cj-category-cards__list');

    for (const item of items) {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'cj-category-card';

      const imageUrl = representativeImage(item.label);
      const description = representativeDescription(item.label);

      card.innerHTML = `
        ${imageUrl
          ? `<img class="cj-category-card__image" src="${imageUrl}" alt="" loading="lazy">`
          : '<span class="cj-category-card__image" aria-hidden="true"></span>'}
        <span class="cj-category-card__body">
          <strong class="cj-category-card__title"></strong>
          <span class="cj-category-card__description"></span>
        </span>
        <span class="cj-category-card__arrow" aria-hidden="true">›</span>`;

      card.querySelector('.cj-category-card__title').textContent = item.label;
      card.querySelector('.cj-category-card__description').textContent = description;
      card.addEventListener('click', () => {
        item.control.click();
        setTimeout(() => {
          const grid = document.querySelector('.products-grid, .product-grid, [class*="product"][class*="grid"]');
          grid?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      });
      list.append(card);
    }

    source.before(section);
  }

  let timer;
  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(build, 180);
  };

  addEventListener('DOMContentLoaded', schedule, { once: true });
  addEventListener('load', schedule, { once: true });
  MOBILE.addEventListener?.('change', schedule);

  new MutationObserver(mutations => {
    if (mutations.some(mutation => [...mutation.addedNodes].some(node => node.nodeType === 1 && !node.closest?.('.cj-category-cards')))) {
      schedule();
    }
  }).observe(document.documentElement, { childList: true, subtree: true });
})();
