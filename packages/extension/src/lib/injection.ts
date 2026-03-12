/**
 * DOM injection helpers for Bandcamp pages.
 */

export function createBandChampButton(text: string, onClick: () => void): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.textContent = text;
  btn.className = 'bandchamp-btn';
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    onClick();
  });
  return btn;
}

export function createBadge(text: string, variant: 'owned' | 'wishlisted' | 'none'): HTMLSpanElement {
  const badge = document.createElement('span');
  badge.textContent = text;
  badge.className = `bandchamp-badge bandchamp-badge--${variant}`;
  return badge;
}

export function createRatingStars(current: number, onChange: (rating: number) => void): HTMLDivElement {
  const container = document.createElement('div');
  container.className = 'bandchamp-stars';

  for (let i = 1; i <= 5; i++) {
    const star = document.createElement('button');
    star.textContent = i <= current ? '★' : '☆';
    star.className = `bandchamp-star ${i <= current ? 'bandchamp-star--active' : ''}`;
    star.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const newRating = i === current ? 0 : i;
      onChange(newRating);
      // Update display
      container.querySelectorAll('.bandchamp-star').forEach((s, idx) => {
        s.textContent = idx < newRating ? '★' : '☆';
        s.classList.toggle('bandchamp-star--active', idx < newRating);
      });
    });
    container.appendChild(star);
  }

  return container;
}

export function injectStyles(): void {
  if (document.querySelector('#bandchamp-styles')) return;

  const style = document.createElement('style');
  style.id = 'bandchamp-styles';
  style.textContent = `
    .bandchamp-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      background: #1da0c3;
      color: #fff;
      border: none;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      font-family: system-ui, sans-serif;
      transition: background 0.15s;
      margin: 4px 0;
    }
    .bandchamp-btn:hover {
      background: #22b8e0;
    }
    .bandchamp-badge {
      display: inline-flex;
      align-items: center;
      padding: 3px 10px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      font-family: system-ui, sans-serif;
      margin: 4px 4px 4px 0;
    }
    .bandchamp-badge--owned {
      background: #0e5060;
      color: #1da0c3;
    }
    .bandchamp-badge--wishlisted {
      background: #3b2e0a;
      color: #f0b429;
    }
    .bandchamp-badge--none {
      display: none;
    }
    .bandchamp-stars {
      display: inline-flex;
      gap: 2px;
      margin: 4px 0;
    }
    .bandchamp-star {
      background: none;
      border: none;
      font-size: 18px;
      cursor: pointer;
      color: #555;
      padding: 0 1px;
      transition: color 0.1s;
    }
    .bandchamp-star:hover {
      color: #f0b429;
    }
    .bandchamp-star--active {
      color: #f0b429;
    }
    .bandchamp-container {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
      margin: 10px 0;
      padding: 10px 14px;
      background: #0f0f0f;
      border: 1px solid #2a2a2a;
      border-radius: 8px;
    }
    .bandchamp-container__label {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #1da0c3;
      font-family: system-ui, sans-serif;
    }
  `;
  document.head.appendChild(style);
}
