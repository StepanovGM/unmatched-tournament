import { matches, cards } from "./data.js?v=2";
import { buildThumb, buildCardThumb, buildSpoiler, slotLabel, sidekickLabel, playerLabel, getPlayer } from "./util.js?v=2";

const root = document.getElementById("match-page");
const id = new URLSearchParams(location.search).get("id");
const match = matches.find((m) => m.id === id);

if (!match) {
  root.innerHTML = '<p class="empty-note">Матч не найден.</p>';
} else {
  render();
}

function isPlayed() {
  return match.status === "completed";
}

function buildSide(slot, isWinner) {
  const side = document.createElement("div");
  side.className = "match-side" + (isWinner ? " winner" : "");
  side.appendChild(buildThumb(slot));

  const name = document.createElement("span");
  name.className = "slot-name";
  name.textContent = slotLabel(slot);
  side.appendChild(name);

  const sidekick = sidekickLabel(slot);
  if (sidekick) {
    const sidekickEl = document.createElement("span");
    sidekickEl.className = "slot-sidekick";
    sidekickEl.textContent = sidekick;
    side.appendChild(sidekickEl);
  }

  return side;
}

function buildVersus() {
  const wrap = document.createElement("div");
  wrap.className = "match-versus";
  wrap.appendChild(buildSide(match.slotA, match.winner === "A"));
  const vs = document.createElement("span");
  vs.className = "vs-label";
  vs.textContent = "VS";
  wrap.appendChild(vs);
  wrap.appendChild(buildSide(match.slotB, match.winner === "B"));
  return wrap;
}

// Для 1/16 действует фиксированное правило: первым ходит тот, кто указан
// первым в паре (slotA). Для более поздних стадий правило пока не решено,
// поэтому подсказку показываем только для 1/16 и только пока матч не сыгран
// (после игры это уже показывает раздел "Результаты матча").
function buildFirstMoveNote() {
  if (match.stage !== "1/16" || isPlayed()) return null;

  const note = document.createElement("p");
  note.className = "first-move";
  const strong = document.createElement("strong");
  strong.textContent = slotLabel(match.slotA);
  note.append("Первый ход: ", strong);
  return note;
}

function buildSection(title) {
  const section = document.createElement("section");
  section.className = "match-section";
  const h = document.createElement("h3");
  h.textContent = title;
  section.appendChild(h);
  return section;
}

function buildCardDisplay(slug) {
  const card = cards[slug];
  const wrap = document.createElement("div");
  wrap.className = "card-display";
  wrap.appendChild(buildCardThumb(slug));
  const name = document.createElement("span");
  name.className = "slot-name";
  name.textContent = card ? card.name : slug;
  wrap.appendChild(name);
  return wrap;
}

// ---- Карта ----

function renderCardSection() {
  const section = buildSection("Карта матча");

  if (!match.card) {
    const note = document.createElement("p");
    note.className = "empty-note";
    note.textContent = "Карта ещё не определена.";
    section.appendChild(note);
    return section;
  }

  const display = buildCardDisplay(match.card);
  section.appendChild(isPlayed() ? display : buildSpoiler(display));
  return section;
}

// ---- Игроки ----

function renderPlayerSection() {
  const section = buildSection("Кто за кого играет");

  if (!match.slotA.player || !match.slotB.player) {
    const note = document.createElement("p");
    note.className = "empty-note";
    note.textContent = "Распределение игроков ещё не определено.";
    section.appendChild(note);
    return section;
  }

  const p = document.createElement("p");
  p.textContent = `${getPlayer(match.slotA.player).name} — ${slotLabel(match.slotA)}, ${getPlayer(match.slotB.player).name} — ${slotLabel(match.slotB)}`;
  section.appendChild(isPlayed() ? p : buildSpoiler(p));
  return section;
}

// ---- Результаты ----

function renderResultsSection() {
  const section = buildSection("Результаты матча");

  if (!isPlayed()) {
    const note = document.createElement("p");
    note.className = "empty-note";
    note.textContent = "Матч ещё не сыгран.";
    section.appendChild(note);
    return section;
  }

  const stats = document.createElement("dl");
  stats.className = "result-stats";

  const rows = [];
  if (match.stats.firstPlayer) {
    const firstSlot = match.stats.firstPlayer === "A" ? match.slotA : match.slotB;
    rows.push(["Первый ход", playerLabel(firstSlot) || slotLabel(firstSlot)]);
  }
  if (match.stats.finalRound != null) {
    rows.push(["Игра закончилась на раунде", match.stats.finalRound]);
  }
  if (match.stats.winnerHp != null) {
    rows.push(["HP победителя в конце", match.stats.winnerHp]);
  }
  rows.forEach(([label, value]) => {
    const dt = document.createElement("dt");
    dt.textContent = label;
    const dd = document.createElement("dd");
    dd.textContent = value;
    stats.appendChild(dt);
    stats.appendChild(dd);
  });
  section.appendChild(stats);

  if (match.stats.notes) {
    const notes = document.createElement("p");
    notes.className = "match-notes";
    notes.textContent = match.stats.notes;
    section.appendChild(notes);
  }

  return section;
}

function render() {
  root.innerHTML = "";

  const stage = document.createElement("p");
  stage.className = "match-stage";
  stage.textContent = `Стадия: ${match.stage}`;
  root.appendChild(stage);

  root.appendChild(buildVersus());

  const firstMove = buildFirstMoveNote();
  if (firstMove) root.appendChild(firstMove);

  root.appendChild(renderCardSection());
  root.appendChild(renderPlayerSection());
  root.appendChild(renderResultsSection());
}
