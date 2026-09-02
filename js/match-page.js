import { matches, cards } from "./data.js?v=15";
import { buildThumb, buildCardThumb, buildSpoiler, buildStarRating, slotLabel, sidekickLabel, displayOrder, getPlayer } from "./util.js?v=15";
import { buildIcon } from "./icons.js?v=15";
import { renderMatchLog } from "./match-log.js?v=15";

const root = document.getElementById("match-page");
const id = new URLSearchParams(location.search).get("id");
const match = matches.find((m) => m.id === id);

function isPlayed() {
  return match.status === "completed";
}

// Тому, кто ходит первым, известно заранее (не спойлер — см. заметку
// "first-move-rule" в памяти), поэтому бейдж можно показывать что до,
// что после игры. Приоритет источников — как в displayOrder().
function firstMoveSlotKey() {
  if (match.stats && match.stats.firstPlayer) return match.stats.firstPlayer;
  if (match.firstMove) return match.firstMove;
  if (match.stage === "1/16") return "A";
  return null;
}

// ---- Навигация между матчами (по порядку в data.js — соответствует
// ходу турнира: весь 1/16, потом 1/8, 1/4, 1/2, финал, матч за 3-е) ----

function buildNavLink(target, direction) {
  const a = document.createElement("a");
  a.className = `match-nav-link ${direction}`;
  a.href = `match.html?id=${target.id}`;

  const arrow = document.createElement("span");
  arrow.className = "match-nav-arrow";
  arrow.textContent = direction === "prev" ? "←" : "→";
  a.appendChild(arrow);

  const text = document.createElement("span");
  text.className = "match-nav-text";

  const label = document.createElement("span");
  label.className = "match-nav-label";
  label.textContent = direction === "prev" ? "Предыдущий матч" : "Следующий матч";
  text.appendChild(label);

  const desc = document.createElement("span");
  desc.className = "match-nav-desc";
  desc.textContent = `${target.stage} · ${slotLabel(target.slotA)} — ${slotLabel(target.slotB)}`;
  text.appendChild(desc);

  a.appendChild(text);
  return a;
}

function buildMatchNav() {
  const idx = matches.findIndex((m) => m.id === match.id);
  const prev = idx > 0 ? matches[idx - 1] : null;
  const next = idx < matches.length - 1 ? matches[idx + 1] : null;
  if (!prev && !next) return null;

  const nav = document.createElement("nav");
  nav.className = "match-nav";
  nav.appendChild(prev ? buildNavLink(prev, "prev") : Object.assign(document.createElement("span"), { className: "match-nav-spacer" }));
  nav.appendChild(next ? buildNavLink(next, "next") : Object.assign(document.createElement("span"), { className: "match-nav-spacer" }));
  return nav;
}

// ---- Hero (VS-блок) ----

function buildHeroSide(slot, { isWinner, isLoser, firstMove, showPlayer }) {
  const side = document.createElement("div");
  side.className = "hero-side" + (isWinner ? " winner" : "") + (isLoser ? " loser" : "");

  const frame = document.createElement("div");
  frame.className = "hero-portrait-frame";
  frame.appendChild(buildThumb(slot));
  if (firstMove) {
    const badge = document.createElement("span");
    badge.className = "hero-firstmove-badge";
    badge.textContent = "Первый ход";
    frame.appendChild(badge);
  }
  side.appendChild(frame);

  if (isWinner) {
    const tag = document.createElement("span");
    tag.className = "hero-result-tag";
    tag.textContent = "Победа";
    side.appendChild(tag);
  }

  const name = document.createElement("span");
  name.className = "hero-name";
  name.textContent = slotLabel(slot);
  side.appendChild(name);

  const sidekick = sidekickLabel(slot);
  if (sidekick) {
    const sidekickEl = document.createElement("span");
    sidekickEl.className = "hero-sidekick";
    sidekickEl.textContent = sidekick;
    side.appendChild(sidekickEl);
  }

  if (showPlayer && slot.player) {
    const playerEl = document.createElement("span");
    playerEl.className = "hero-player";
    playerEl.textContent = getPlayer(slot.player).name;
    side.appendChild(playerEl);
  }

  return side;
}

function buildHero() {
  const hero = document.createElement("div");
  hero.className = "match-hero";

  const stage = document.createElement("p");
  stage.className = "hero-eyebrow";
  stage.textContent = `Стадия: ${match.stage}`;
  hero.appendChild(stage);

  const versus = document.createElement("div");
  versus.className = "hero-versus";

  const played = isPlayed();
  const firstKey = firstMoveSlotKey();
  const [firstLetter, secondLetter] = displayOrder(match);

  [firstLetter, secondLetter].forEach((letter) => {
    const slot = match[`slot${letter}`];
    versus.appendChild(
      buildHeroSide(slot, {
        isWinner: played && match.winner === letter,
        isLoser: played && match.winner && match.winner !== letter,
        firstMove: firstKey === letter,
        showPlayer: played,
      })
    );
    if (letter === firstLetter) {
      const divider = document.createElement("div");
      divider.className = "hero-divider";
      const vs = document.createElement("span");
      vs.className = "vs-label";
      vs.textContent = "VS";
      divider.appendChild(vs);
      versus.appendChild(divider);
    }
  });

  hero.appendChild(versus);
  return hero;
}

// ---- Карта ----

function buildShowcaseMedia(slug) {
  const card = cards[slug];
  const media = document.createElement("div");
  media.className = "showcase-media";
  media.appendChild(buildCardThumb(slug));

  const scrim = document.createElement("div");
  scrim.className = "showcase-scrim";
  const eyebrow = document.createElement("p");
  eyebrow.className = "showcase-eyebrow";
  eyebrow.textContent = "Карта матча";
  const title = document.createElement("p");
  title.className = "showcase-title";
  title.textContent = card ? card.name : slug;
  scrim.appendChild(eyebrow);
  scrim.appendChild(title);
  media.appendChild(scrim);

  return media;
}

function renderCardSection() {
  const section = document.createElement("section");
  section.className = "card-showcase";

  if (!match.card) {
    const note = document.createElement("p");
    note.className = "empty-note";
    note.textContent = "Карта ещё не определена.";
    section.appendChild(note);
    return section;
  }

  const media = buildShowcaseMedia(match.card);
  section.appendChild(isPlayed() ? media : buildSpoiler(media));
  return section;
}

// ---- Игроки (только для ещё не сыгранных — после игры имя игрока
// показывается прямо в hero, под персонажем) ----

function renderPlayerSection() {
  const section = document.createElement("section");
  section.className = "match-section";
  const h = document.createElement("h3");
  h.textContent = "Кто за кого играет";
  section.appendChild(h);

  if (!match.slotA.player || !match.slotB.player) {
    const note = document.createElement("p");
    note.className = "empty-note";
    note.textContent = "Распределение игроков ещё не определено.";
    section.appendChild(note);
    return section;
  }

  const p = document.createElement("p");
  p.textContent = `${getPlayer(match.slotA.player).name} — ${slotLabel(match.slotA)}, ${getPlayer(match.slotB.player).name} — ${slotLabel(match.slotB)}`;
  section.appendChild(buildSpoiler(p));
  return section;
}

// ---- Результаты (панель статистики для сыгранных матчей) ----

function buildStatTile(iconName, value, label) {
  const tile = document.createElement("div");
  tile.className = "stat-tile";
  tile.appendChild(buildIcon(iconName));
  const val = document.createElement("span");
  val.className = "stat-value";
  val.textContent = value;
  tile.appendChild(val);
  const lbl = document.createElement("span");
  lbl.className = "stat-label";
  lbl.textContent = label;
  tile.appendChild(lbl);
  return tile;
}

function renderResultsSection() {
  if (!isPlayed()) {
    const section = document.createElement("section");
    section.className = "match-section";
    const h = document.createElement("h3");
    h.textContent = "Результаты матча";
    section.appendChild(h);
    const note = document.createElement("p");
    note.className = "empty-note";
    note.textContent = "Матч ещё не сыгран.";
    section.appendChild(note);
    return [section];
  }

  const nodes = [];
  const strip = document.createElement("div");
  strip.className = "stat-strip";

  if (match.stats.firstPlayer) {
    const firstSlot = match.stats.firstPlayer === "A" ? match.slotA : match.slotB;
    strip.appendChild(buildStatTile("footprint", slotLabel(firstSlot), "Первый ход"));
  }
  if (match.stats.finalRound != null) {
    strip.appendChild(buildStatTile("flag", match.stats.finalRound, "Раунд окончания"));
  }
  if (match.stats.winnerHp != null) {
    strip.appendChild(buildStatTile("heart", match.stats.winnerHp, "HP победителя"));
  }
  if (match.stats.rating != null) {
    const tile = document.createElement("div");
    tile.className = "stat-tile";
    tile.appendChild(buildStarRating(match.stats.rating));
    const lbl = document.createElement("span");
    lbl.className = "stat-label";
    lbl.textContent = "Оценка игры";
    tile.appendChild(lbl);
    strip.appendChild(tile);
  }

  if (strip.children.length) nodes.push(strip);

  if (match.stats.notes) {
    const notes = document.createElement("p");
    notes.className = "match-notes-card";
    notes.textContent = match.stats.notes;
    nodes.push(notes);
  }

  return nodes;
}

function render() {
  root.innerHTML = "";

  const inner = document.createElement("div");
  inner.className = "match-page-inner";

  const nav = buildMatchNav();
  if (nav) inner.appendChild(nav);

  if (isPlayed()) {
    inner.appendChild(buildHero());
    inner.appendChild(renderCardSection());
    renderResultsSection().forEach((node) => inner.appendChild(node));
    renderMatchLog(inner, match);
  } else {
    inner.appendChild(buildHero());
    inner.appendChild(renderCardSection());
    inner.appendChild(renderPlayerSection());
    renderResultsSection().forEach((node) => inner.appendChild(node));
  }

  root.appendChild(inner);
}

if (!match) {
  root.innerHTML = '<p class="empty-note">Матч не найден.</p>';
} else {
  render();
}
