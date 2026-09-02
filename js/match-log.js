// -------------------------------------------------------------
// Блок "Ход матча" на странице матча: полный лог, испечённый
// заранее скриптом scripts/import-match-log.mjs в
// data/logs/<id>.json (см. комментарий в этом скрипте — тут мы
// только рисуем то, что уже разложено по раундам/сегментам).
//
// Два представления одних и тех же данных:
//   - .log-strip  — сжатый навигатор (см. buildCompactStrip)
//   - .log-full   — подробный таймлайн (см. buildFullTimeline)
//
// Внутри строки таймлайна каждая "клетка" (сторона) делится на:
//   - главное (.log-cell-main): манёвр/способность (шильдик) и/или
//     разыгранная карта — то, ради чего эта строка вообще есть;
//   - прицепленные события (.log-attach-stack): добор/сброс/
//     возврат карты, появление сайдкика — они никогда не бывают
//     "сами по себе", поэтому рисуются мелкими карточками внахлёст
//     сбоку от главного (слева у стороны A, справа у стороны B),
//     а не отдельной строкой. Наведение/тап поднимает конкретную
//     карточку наверх стопки.
//   - HP (.log-cell-hp): текстовые строки урона/лечения, отдельно
//     снизу — это данные, которые всегда должны быть читаемы сразу,
//     без наведения.
// -------------------------------------------------------------
import { buildThumb, buildCardbackThumb } from "./util.js?v=14";
import { buildIcon } from "./icons.js?v=14";

// ---- Лайтбокс: клик по карте открывает её крупно ----

let lightboxEl = null;

function ensureLightbox() {
  if (lightboxEl) return lightboxEl;
  lightboxEl = document.createElement("div");
  lightboxEl.className = "log-lightbox";
  const img = document.createElement("img");
  lightboxEl.appendChild(img);
  lightboxEl.addEventListener("click", () => closeLightbox());
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeLightbox();
  });
  document.body.appendChild(lightboxEl);
  return lightboxEl;
}

function closeLightbox() {
  if (lightboxEl) lightboxEl.classList.remove("is-open");
}

function openLightbox(src, alt) {
  const el = ensureLightbox();
  const img = el.querySelector("img");
  img.src = src;
  img.alt = alt || "";
  el.classList.add("is-open");
}

function makeClickable(cardImg, srcOverride) {
  cardImg.classList.add("log-card-clickable");
  cardImg.addEventListener("click", (e) => {
    e.stopPropagation();
    openLightbox(srcOverride || cardImg.src, cardImg.alt);
  });
}

const CHIP_LABEL = {
  maneuver: "Маневр",
  ability: "Способность",
};

const CHIP_ICON = {
  maneuver: "boot",
  ability: "sparkle",
};

// Событие "прицепляется" к предыдущему, а не открывает свою строку.
const ATTACH_KINDS = new Set(["draw", "discard", "return", "spawn"]);

function heroSlugForSide(match, side) {
  return side === "A" ? match.slotA.character : match.slotB.character;
}

// ---- Отдельные визуалы события ----

function buildChip(kind) {
  const chip = document.createElement("div");
  chip.className = "log-chip";
  chip.appendChild(buildIcon(CHIP_ICON[kind], "log-chip-icon"));
  const label = document.createElement("span");
  label.textContent = CHIP_LABEL[kind];
  chip.appendChild(label);
  return chip;
}

function buildPlayCard(entry) {
  const wrap = document.createElement("div");
  wrap.className = "log-card mechanic-" + entry.mechanic;
  wrap.title = entry.cardName || "";

  const placeholder = document.createElement("span");
  placeholder.className = "placeholder-thumb log-card-placeholder";
  placeholder.textContent = (entry.cardName || "?").charAt(0).toUpperCase();

  const img = document.createElement("img");
  img.src = entry.image;
  img.alt = entry.cardName || "";
  img.onerror = () => img.replaceWith(placeholder);
  makeClickable(img);

  wrap.appendChild(img);
  return wrap;
}

// Общая "мелкая карточка" для прицепленных событий (добор/сброс/
// возврат) — все одного размера, чтобы стопка внахлёст смотрелась
// аккуратно.
function buildAttachCardBase(extraClass) {
  const wrap = document.createElement("div");
  wrap.className = "log-attach-card" + (extraClass ? " " + extraClass : "");
  return wrap;
}

// Крупный символ по центру карты (добор "+", сброс ↩/↪, возврат ⇧).
function buildOverlaySymbol(char) {
  const overlay = document.createElement("span");
  overlay.className = "log-attach-overlay";
  const text = document.createElement("span");
  text.className = "log-attach-overlay-text";
  text.textContent = char;
  overlay.appendChild(text);
  return overlay;
}

function buildDrawEntry(entry, match) {
  const wrap = buildAttachCardBase("log-attach-draw");
  wrap.title = "Взял карту";
  wrap.appendChild(buildCardbackThumb(heroSlugForSide(match, entry.side)));
  wrap.appendChild(buildOverlaySymbol("+"));
  return wrap;
}

function buildDiscardEntry(entry) {
  const wrap = buildAttachCardBase("log-attach-discard");
  wrap.title = entry.cardName || "Сброс";

  const placeholder = document.createElement("span");
  placeholder.className = "placeholder-thumb log-card-placeholder";
  placeholder.textContent = (entry.cardName || "?").charAt(0).toUpperCase();

  const img = document.createElement("img");
  img.src = entry.image;
  img.alt = entry.cardName || "";
  img.onerror = () => img.replaceWith(placeholder);
  makeClickable(img);
  wrap.appendChild(img);

  // По просьбе — именно эти юникод-символы, не иконка: ↩ для
  // стороны A, ↪ для стороны B.
  wrap.appendChild(buildOverlaySymbol(entry.side === "A" ? "↩" : "↪"));

  if (entry.boosted) {
    const badge = document.createElement("span");
    badge.className = "log-attach-badge log-attach-badge-boost";
    badge.appendChild(buildIcon("star"));
    wrap.appendChild(badge);
  }

  return wrap;
}

function buildReturnEntry(entry) {
  const wrap = buildAttachCardBase("log-attach-return");
  wrap.title = entry.cardName || "Возврат в руку";

  const placeholder = document.createElement("span");
  placeholder.className = "placeholder-thumb log-card-placeholder";
  placeholder.textContent = (entry.cardName || "?").charAt(0).toUpperCase();

  const img = document.createElement("img");
  img.src = entry.image;
  img.alt = entry.cardName || "";
  img.onerror = () => img.replaceWith(placeholder);
  makeClickable(img);
  wrap.appendChild(img);

  // Тот же приём, что у сброса — юникод-символ, не иконка.
  wrap.appendChild(buildOverlaySymbol("⇧"));

  return wrap;
}

function buildSpawnEntry(entry) {
  const wrap = document.createElement("div");
  wrap.className = "log-spawn";
  wrap.title = "Появление бойца";

  if (entry.image) {
    const placeholder = document.createElement("span");
    placeholder.className = "placeholder-thumb log-spawn-placeholder";
    placeholder.textContent = "?";

    const img = document.createElement("img");
    img.src = entry.image;
    img.alt = "";
    img.onerror = () => img.replaceWith(placeholder);
    wrap.appendChild(img);
  } else {
    const placeholder = document.createElement("span");
    placeholder.className = "placeholder-thumb log-spawn-placeholder";
    placeholder.textContent = "+";
    wrap.appendChild(placeholder);
  }

  const badge = document.createElement("span");
  badge.className = "log-attach-badge log-attach-badge-spawn";
  badge.appendChild(buildIcon("plus"));
  wrap.appendChild(badge);

  return wrap;
}

function buildAttachContent(entry, match) {
  switch (entry.kind) {
    case "draw":
      return buildDrawEntry(entry, match);
    case "discard":
      return buildDiscardEntry(entry);
    case "return":
      return buildReturnEntry(entry);
    case "spawn":
      return buildSpawnEntry(entry);
    default:
      return document.createElement("span");
  }
}

function buildHpLine(hit) {
  const line = document.createElement("div");
  line.className = "log-hp-hit" + (hit.dead ? " log-hp-dead" : "");

  const label = document.createElement("span");
  label.className = "log-hp-label";
  label.textContent = hit.fighterLabel;
  line.appendChild(label);

  const delta = document.createElement("span");
  delta.className = "log-hp-delta " + (hit.delta < 0 ? "log-hp-dmg" : hit.delta > 0 ? "log-hp-heal" : "log-hp-flat");
  delta.textContent = `${hit.delta > 0 ? "+" : ""}${hit.delta} → ${hit.total}`;
  line.appendChild(delta);

  if (hit.dead) {
    line.appendChild(buildIcon("skull", "log-hp-skull"));
  }

  return line;
}

// ---- Стопка прицепленных карточек (наведение/тап — наверх) ----

function buildAttachStack(items, match) {
  const stack = document.createElement("div");
  stack.className = "log-attach-stack";

  items.forEach((item, i) => {
    const holder = document.createElement("div");
    holder.className = "log-attach-item";
    holder.style.setProperty("--i", String(i));
    holder.tabIndex = 0;
    holder.appendChild(buildAttachContent(item, match));
    holder.addEventListener("click", () => {
      stack.querySelectorAll(".log-attach-item.is-front").forEach((el) => el.classList.remove("is-front"));
      holder.classList.add("is-front");
    });
    holder.addEventListener("focus", () => holder.classList.add("is-front"));
    holder.addEventListener("blur", () => holder.classList.remove("is-front"));
    stack.appendChild(holder);
  });

  return stack;
}

// ---- Клетка (одна сторона одной строки) ----

function classifyForSide(segment, side) {
  const all = [segment, ...(segment.reactions || [])].filter((e) => e.side === side);
  const primary = [];
  const attach = [];
  const hp = [];
  all.forEach((e) => {
    if (e.kind === "hp") hp.push(...e.hits);
    else if (ATTACH_KINDS.has(e.kind)) attach.push(e);
    else primary.push(e);
  });
  return { primary, attach, hp };
}

function buildCell(segment, side, match) {
  const cell = document.createElement("div");
  cell.className = "log-cell log-cell-" + side.toLowerCase();

  const { primary, attach, hp } = classifyForSide(segment, side);

  if (primary.length || attach.length) {
    const main = document.createElement("div");
    main.className = "log-cell-main";

    const buildPrimaryEls = () =>
      primary.map((entry) => {
        const el = entry.kind === "play" ? buildPlayCard(entry) : buildChip(entry.kind);
        if (entry === segment && segment.kind === "play" && segment.mechanic === "attack") {
          el.classList.add("log-attack-source");
        }
        return el;
      });

    // Свободное место — по внешнему краю: у стороны A прицепленные
    // карточки идут слева от основной, у B — справа.
    if (side === "A") {
      if (attach.length) main.appendChild(buildAttachStack(attach, match));
      buildPrimaryEls().forEach((el) => main.appendChild(el));
    } else {
      buildPrimaryEls().forEach((el) => main.appendChild(el));
      if (attach.length) main.appendChild(buildAttachStack(attach, match));
    }

    cell.appendChild(main);
  }

  if (hp.length) {
    const hpWrap = document.createElement("div");
    hpWrap.className = "log-cell-hp";
    hp.forEach((hit) => hpWrap.appendChild(buildHpLine(hit)));
    cell.appendChild(hpWrap);
  }

  return cell;
}

function rowHasDeath(segment) {
  const all = [segment, ...(segment.reactions || [])];
  return all.some((e) => e.kind === "hp" && e.hits.some((h) => h.dead));
}

// ---- Большой таймлайн ----

function rowHasCard(segment) {
  const all = [segment, ...(segment.reactions || [])];
  return all.some((e) => e.kind === "play");
}

function buildRow(segment, match) {
  const row = document.createElement("div");
  row.className = "log-row";
  if (rowHasDeath(segment)) row.classList.add("log-row-death");
  if (rowHasCard(segment)) row.classList.add("log-row-card");

  const cellA = buildCell(segment, "A", match);
  const cellB = buildCell(segment, "B", match);

  if (segment.kind === "play" && segment.mechanic === "attack") {
    const arrow = document.createElement("div");
    arrow.className = "log-attack-arrow " + (segment.side === "A" ? "log-attack-a2b" : "log-attack-b2a");
    row.appendChild(arrow);
  }

  row.appendChild(cellA);
  row.appendChild(cellB);
  return row;
}

function buildHeroHpBadge(hp, side) {
  const el = document.createElement("span");
  el.className = "log-round-hp log-round-hp-" + side.toLowerCase();
  el.appendChild(buildIcon("heart", "log-round-hp-icon"));
  const value = document.createElement("span");
  value.textContent = Math.max(0, hp);
  el.appendChild(value);
  return el;
}

function buildFullTimeline(logData, match) {
  const full = document.createElement("div");
  full.className = "log-full";
  const roundEls = new Map();

  logData.rounds.forEach((round) => {
    const roundWrap = document.createElement("div");
    roundWrap.className = "log-round";
    roundWrap.dataset.round = round.round;

    const divider = document.createElement("div");
    divider.className = "log-round-divider";
    if (round.heroHp) divider.appendChild(buildHeroHpBadge(round.heroHp.A, "A"));
    const line1 = document.createElement("span");
    line1.className = "log-round-line";
    divider.appendChild(line1);
    const num = document.createElement("span");
    num.className = "log-round-number";
    num.textContent = `Раунд ${round.round}`;
    divider.appendChild(num);
    const line2 = document.createElement("span");
    line2.className = "log-round-line";
    divider.appendChild(line2);
    if (round.heroHp) divider.appendChild(buildHeroHpBadge(round.heroHp.B, "B"));
    roundWrap.appendChild(divider);

    const body = document.createElement("div");
    body.className = "log-round-body";
    round.segments.forEach((segment) => body.appendChild(buildRow(segment, match)));
    roundWrap.appendChild(body);

    full.appendChild(roundWrap);
    roundEls.set(round.round, roundWrap);
  });

  return { element: full, roundEls };
}

// Стрелка атаки должна стоять на высоте бьющей карты, а не по
// центру всей строки (в строке может быть выше/ниже соседей из-за
// стопок доборов и т.п.) — меряем уже отрисованное после вставки в DOM.
function positionAttackArrows(root) {
  root.querySelectorAll(".log-attack-arrow").forEach((arrow) => {
    const row = arrow.closest(".log-row");
    const source = row && row.querySelector(".log-attack-source");
    if (!source) return;
    arrow.style.top = source.offsetTop + source.offsetHeight / 2 + "px";
  });
}

// ---- Сжатый навигатор ----

function roundSideStats(round, side) {
  let plays = 0;
  let hpDelta = 0;

  const visit = (entry) => {
    if (entry.side !== side) return;
    if (entry.kind === "play") plays++;
    if (entry.kind === "hp") entry.hits.forEach((h) => (hpDelta += h.delta));
  };

  round.segments.forEach((seg) => {
    visit(seg);
    (seg.reactions || []).forEach(visit);
  });

  return { plays, hpDelta };
}

// Раунд, где ничего не произошло у этой стороны, ничего не рисует —
// сама кнопка раунда всё равно сужается до минимума (см. CSS), не
// отнимая место у соседей, где реально что-то было.
function buildStripHalf(round, side) {
  const half = document.createElement("div");
  half.className = "log-strip-half log-strip-half-" + side.toLowerCase();

  const { plays, hpDelta } = roundSideStats(round, side);

  if (plays > 0) {
    const cards = document.createElement("span");
    cards.className = "log-strip-cards";
    for (let i = 0; i < plays; i++) {
      const dot = document.createElement("span");
      dot.className = "log-strip-card-dot";
      cards.appendChild(dot);
    }
    half.appendChild(cards);
  }

  // Только цвет, без чисел — величина урона/лечения задаёт высоту
  // полоски (в пределах разумного), сам знак не подписываем.
  if (hpDelta !== 0) {
    const bar = document.createElement("span");
    bar.className = "log-strip-hp-bar " + (hpDelta < 0 ? "log-strip-hp-bar-dmg" : "log-strip-hp-bar-heal");
    const magnitude = Math.min(Math.abs(hpDelta), 10);
    bar.style.setProperty("--mag", String(magnitude));
    half.appendChild(bar);
  }

  return half;
}

// Дорожка без видимого скроллбара — тянуть можно мышью/пальцем
// (перетаскивание) или колесом мыши, наведясь на неё (колесо крутит
// вертикально по умолчанию, конвертируем в горизонтальную прокрутку,
// когда дорожка сама горизонтальна). Перетаскивание гасит клик по
// раунду, если движение было заметным — иначе драг всякий раз
// прыгал бы к раунду под курсором.
function enableDragScroll(track) {
  let dragging = false;
  let dragged = false;
  let startX = 0;
  let startY = 0;
  let startLeft = 0;
  let startTop = 0;

  track.addEventListener("pointerdown", (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    dragging = true;
    dragged = false;
    startX = e.clientX;
    startY = e.clientY;
    startLeft = track.scrollLeft;
    startTop = track.scrollTop;
    track.setPointerCapture(e.pointerId);
  });

  track.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragged = true;
    track.scrollLeft = startLeft - dx;
    track.scrollTop = startTop - dy;
  });

  const stopDrag = () => {
    dragging = false;
  };
  track.addEventListener("pointerup", stopDrag);
  track.addEventListener("pointercancel", stopDrag);

  // Перехватываем клик на этапе погружения — до того, как он дойдёт
  // до самой кнопки раунда, — только если это был драг, а не тап.
  track.addEventListener(
    "click",
    (e) => {
      if (dragged) {
        e.stopPropagation();
        e.preventDefault();
      }
    },
    true
  );

  track.addEventListener(
    "wheel",
    (e) => {
      if (track.scrollWidth <= track.clientWidth) return;
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      track.scrollLeft += e.deltaY;
      e.preventDefault();
    },
    { passive: false }
  );
}

function buildCompactStrip(logData, match, roundEls) {
  const strip = document.createElement("div");
  strip.className = "log-strip";

  const avatars = document.createElement("div");
  avatars.className = "log-strip-avatars";
  ["A", "B"].forEach((side) => {
    const avatar = document.createElement("div");
    avatar.className = "log-strip-avatar log-strip-avatar-" + side.toLowerCase();
    avatar.appendChild(buildThumb({ character: heroSlugForSide(match, side) }));
    avatars.appendChild(avatar);
  });
  strip.appendChild(avatars);

  const track = document.createElement("div");
  track.className = "log-strip-track";

  logData.rounds.forEach((round) => {
    const seg = document.createElement("button");
    seg.type = "button";
    seg.className = "log-strip-round";
    seg.setAttribute("aria-label", `Раунд ${round.round}`);
    seg.appendChild(buildStripHalf(round, "A"));
    seg.appendChild(buildStripHalf(round, "B"));
    seg.addEventListener("click", () => {
      const target = roundEls.get(round.round);
      if (target) target.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    track.appendChild(seg);
  });

  strip.appendChild(track);
  enableDragScroll(track);

  return strip;
}

// ---- Точка входа ----

export async function renderMatchLog(root, match) {
  let logData;
  try {
    const res = await fetch(`data/logs/${match.id}.json?v=1`);
    if (!res.ok) return;
    logData = await res.json();
  } catch {
    return;
  }
  if (!logData || !Array.isArray(logData.rounds) || logData.rounds.length === 0) return;

  const section = document.createElement("section");
  section.className = "match-log";

  const heading = document.createElement("h3");
  heading.className = "match-log-heading";
  heading.textContent = "Ход матча";
  section.appendChild(heading);

  const { element: fullEl, roundEls } = buildFullTimeline(logData, match);
  const stripEl = buildCompactStrip(logData, match, roundEls);

  const layout = document.createElement("div");
  layout.className = "log-layout";
  layout.appendChild(stripEl);
  layout.appendChild(fullEl);
  section.appendChild(layout);

  root.appendChild(section);

  requestAnimationFrame(() => positionAttackArrows(fullEl));
}
