// -------------------------------------------------------------
// Общая библиотека маленьких line-иконок (SVG-строки, currentColor).
// Раньше жила только внутри match-page.js — вынесена сюда, чтобы
// match-log.js мог использовать те же иконки без дублирования.
// -------------------------------------------------------------
export const ICONS = {
  footprint:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3c-1.7 0-3 2-3 5 0 2-1 3-1 5.5C4 16.4 5.6 18 8 18s4-1.6 4-4.5c0-2.5-1-3.5-1-5.5 0-3-1.3-5-3-5z"/><path d="M16.5 8c-1.4 0-2.5 1.7-2.5 4.2 0 1.7-.8 2.5-.8 4.6 0 2.4 1.3 4.2 3.3 4.2s3.3-1.8 3.3-4.2c0-2.1-.8-2.9-.8-4.6 0-2.5-1.1-4.2-2.5-4.2z"/></svg>',
  flag:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 21V4"/><path d="M5 4h13l-3 4 3 4H5"/></svg>',
  heart:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20.5s-7.5-4.6-9.8-9.3C.7 7.8 2.4 4.5 5.6 4c2.1-.3 3.9.7 6.4 3.4C14.5 4.7 16.3 3.7 18.4 4c3.2.5 4.9 3.8 3.4 7.2C19.5 15.9 12 20.5 12 20.5z"/></svg>',
  // Тот же силуэт ботинка, что в кнопке "Маневр" трекера (Tracker/web/js/app.js, ICONS.boot).
  boot:
    '<svg viewBox="0 0 512 512" fill="currentColor" stroke="none"><path d="M272.5 18.906c-12.775.17-26.23 2.553-40.344 7.594-30.165 55.31-68.313 120.904-125.72 178.5-21.19 21.26-39.23 44.94-52.28 68.313 1.294 6.312 4.984 11.65 10.72 17.406 10.992 11.032 30.86 21.618 54.593 33.25 46.313 22.695 107.284 50.39 146.374 108.467l195.625.032c-20.198-70.834-100.276-101.12-159.064-83.94-.073.03-.145.066-.22.095-1.61.633-3.27 1.138-4.967 1.563-.024.005-.04.025-.064.03-8.86 2.204-18.82 1.68-29.125-.406-24.79-5.02-52.76-19.695-61.342-45.687-28.615-86.673 16.65-179.742 78.156-223.28 23.064-16.328 49.06-25.848 74.47-24.47.144.008.29.023.436.03-24.19-22.74-53.33-37.95-87.25-37.5zm81.75 56c-19.213.01-39.414 7.59-58.625 21.188-54.644 38.682-96.652 125.024-71.188 202.156 5.127 15.53 27.25 29.162 47.282 33.22 10.015 2.027 19.218 1.518 23.717-.283 2.25-.9 3.173-1.84 3.594-2.562.422-.72.81-1.663.25-4.375-9.08-44.167-2.743-84.61 22.533-114.47 23.586-27.863 62.753-45.462 117.406-50.686-15.014-47.145-37.47-71.226-61.314-80.03-6.407-2.368-13.032-3.706-19.812-4.064-1.272-.067-2.563-.094-3.844-.094zM43.78 294.22c-5.405 12.554-9.136 24.756-10.905 36.186 7.178 27.76 51.898 55.43 91.094 61.344 1.703-5.973 5.832-11.475 10.28-14.25 51.01 28.844 86.18 60.704 102 101h229.594c.697-9.613.44-18.712-.625-27.344l-204.314-.03h-5.125l-2.75-4.345c-35.405-55.575-93.93-82.58-141.78-106.03-23.925-11.724-45.17-22.336-59.625-36.844-2.978-2.99-5.618-6.225-7.844-9.687z"/></svg>',
  sparkle:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15z"/></svg>',
  arrowUp:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20V4"/><path d="M5 11l7-7 7 7"/></svg>',
  skull:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3C7.6 3 5 6.2 5 10c0 2.4 1 3.9 2 5v2.5c0 .8.7 1.5 1.5 1.5H10v-2h1v2h2v-2h1v2h1.5c.8 0 1.5-.7 1.5-1.5V15c1-1.1 2-2.6 2-5 0-3.8-2.6-7-7-7z"/><circle cx="9.3" cy="10.5" r="1.3" fill="currentColor" stroke="none"/><circle cx="14.7" cy="10.5" r="1.3" fill="currentColor" stroke="none"/></svg>',
  spawn:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3"/><path d="M3.5 20c0-3 2.5-5 5.5-5s5.5 2 5.5 5"/><path d="M18 8h4M20 6v4"/></svg>',
  // Тот же плюс, что в кнопке "Взять карту" трекера — заливка,
  // а не тонкий stroke, чтобы не терялся на маленьком значке.
  plus:
    '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M11 3h2v8h8v2h-8v8h-2v-8H3v-2h8z"/></svg>',
  star:
    '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 2.5l2.9 6.1 6.6.7-4.9 4.6 1.3 6.6L12 17l-5.9 3.5 1.3-6.6-4.9-4.6 6.6-.7L12 2.5z"/></svg>',
};

export function buildIcon(name, extraClass) {
  const wrap = document.createElement("span");
  wrap.className = "stat-icon" + (extraClass ? " " + extraClass : "");
  wrap.innerHTML = ICONS[name] || "";
  return wrap;
}
