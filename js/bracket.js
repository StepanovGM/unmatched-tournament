import { matches as allMatches } from "./data.js?v=16";
import { buildThumb, slotLabel, playerLabel, sidekickLabel, displayOrder, formatDate } from "./util.js?v=16";

const bracketEl = document.querySelector(".bracket");
const svg = document.querySelector(".bracket-connectors");
const podiumEl = document.querySelector(".podium");

// Матч за 3-е место — вне основной сетки на выбывание (не питает
// nextMatchId никуда, не должен участвовать в расчёте размеров
// раундов/сторон), поэтому везде ниже используется отдельный список.
const matches = allMatches.filter((m) => m.id !== "third-place");
const thirdPlaceMatch = allMatches.find((m) => m.id === "third-place");
const finalMatch = allMatches.find((m) => m.id === "final");

function roundSize(roundIndex) {
  return matches.filter((m) => m.roundIndex === roundIndex).length;
}

// Левая половина сетки — позиции 0..half-1 внутри раунда, правая — half..end.
// У финала (1 матч в раунде) стороны нет, он всегда рисуется по центру.
function isRightSide(match) {
  const size = roundSize(match.roundIndex);
  if (size <= 1) return false;
  return match.position >= size / 2;
}

function buildSlot(match, key) {
  const slot = match[key];
  const isWinner = match.winner === (key === "slotA" ? "A" : "B");
  const isLoser = match.winner && !isWinner;

  const row = document.createElement("div");
  row.className = "match-slot" + (isWinner ? " winner" : "") + (isLoser ? " loser" : "");
  row.appendChild(buildThumb(slot));

  const text = document.createElement("span");
  text.className = "slot-text";

  const name = document.createElement("span");
  name.className = "slot-name";
  name.textContent = slotLabel(slot);
  text.appendChild(name);

  const sidekick = sidekickLabel(slot);
  if (sidekick) {
    const sidekickEl = document.createElement("span");
    sidekickEl.className = "slot-sidekick";
    sidekickEl.textContent = sidekick;
    text.appendChild(sidekickEl);
  }

  row.appendChild(text);
  return row;
}

function buildMatchCard(match) {
  const card = document.createElement("div");
  card.className = "match-card";
  card.dataset.matchId = match.id;

  displayOrder(match).forEach((letter) => card.appendChild(buildSlot(match, `slot${letter}`)));

  const meta = document.createElement("div");
  meta.className = "match-meta";

  if (match.status !== "tbd") {
    card.classList.add("clickable");
    card.addEventListener("click", () => {
      location.href = `match.html?id=${match.id}`;
    });

    if (match.status === "completed") {
      meta.textContent = "Результаты матча →";
    } else if (match.scheduledDate) {
      meta.textContent = `${formatDate(match.scheduledDate)} →`;
    } else {
      meta.textContent = "Страница матча →";
    }
  }

  card.appendChild(meta);
  return card;
}

function buildColumn(roundIndex, side) {
  const size = roundSize(roundIndex);
  const half = size <= 1 ? size : size / 2;
  const roundMatches = matches
    .filter((m) => m.roundIndex === roundIndex && (side === "left" ? m.position < half : m.position >= half))
    .sort((a, b) => a.position - b.position);

  const column = document.createElement("div");
  column.className = "round-column";
  const isFinalColumn = size <= 1;
  if (isFinalColumn) column.classList.add("final-column");

  const title = document.createElement("div");
  title.className = "round-title";
  title.textContent = roundMatches[0] ? roundMatches[0].stage : "";
  column.appendChild(title);

  roundMatches.forEach((match) => column.appendChild(buildMatchCard(match)));

  if (isFinalColumn && thirdPlaceMatch) {
    const thirdTitle = document.createElement("div");
    thirdTitle.className = "round-title third-place-title";
    thirdTitle.textContent = thirdPlaceMatch.stage;
    column.appendChild(thirdTitle);
    const thirdCard = buildMatchCard(thirdPlaceMatch);
    thirdCard.classList.add("third-place-card");
    column.appendChild(thirdCard);
  }

  return column;
}

function buildPodiumPlace(rank, slot, targetMatchId) {
  const place = document.createElement("div");
  place.className = `podium-place place-${rank} clickable`;
  place.addEventListener("click", () => {
    location.href = `match.html?id=${targetMatchId}`;
  });

  const card = document.createElement("div");
  card.className = "podium-card";
  card.appendChild(buildThumb(slot));

  const text = document.createElement("span");
  text.className = "podium-text";

  const name = document.createElement("span");
  name.className = "podium-name";
  name.textContent = slotLabel(slot);
  text.appendChild(name);

  const sidekick = sidekickLabel(slot);
  if (sidekick) {
    const sidekickEl = document.createElement("span");
    sidekickEl.className = "podium-sidekick";
    sidekickEl.textContent = sidekick;
    text.appendChild(sidekickEl);
  }

  const player = document.createElement("span");
  player.className = "podium-player";
  player.textContent = playerLabel(slot);
  text.appendChild(player);

  card.appendChild(text);
  place.appendChild(card);

  const block = document.createElement("div");
  block.className = "podium-block";
  block.textContent = rank;
  place.appendChild(block);

  return place;
}

function renderPodium() {
  if (!podiumEl) return;
  podiumEl.innerHTML = "";
  if (!finalMatch || finalMatch.status !== "completed") return;

  const champSlot = finalMatch.winner === "A" ? finalMatch.slotA : finalMatch.slotB;
  const runnerUpSlot = finalMatch.winner === "A" ? finalMatch.slotB : finalMatch.slotA;
  const hasThird = thirdPlaceMatch && thirdPlaceMatch.status === "completed";
  const thirdSlot = hasThird ? (thirdPlaceMatch.winner === "A" ? thirdPlaceMatch.slotA : thirdPlaceMatch.slotB) : null;
  const fourthSlot = hasThird ? (thirdPlaceMatch.winner === "A" ? thirdPlaceMatch.slotB : thirdPlaceMatch.slotA) : null;

  const title = document.createElement("h3");
  title.className = "podium-title";
  title.textContent = "Итоги турнира";
  podiumEl.appendChild(title);

  const stand = document.createElement("div");
  stand.className = "podium-stand";
  stand.appendChild(buildPodiumPlace(2, runnerUpSlot, "final"));
  stand.appendChild(buildPodiumPlace(1, champSlot, "final"));
  if (thirdSlot) stand.appendChild(buildPodiumPlace(3, thirdSlot, "third-place"));
  podiumEl.appendChild(stand);

  if (fourthSlot) {
    const fourth = document.createElement("div");
    fourth.className = "podium-fourth";
    fourth.textContent = `4-е место: ${slotLabel(fourthSlot)} (${playerLabel(fourthSlot)})`;
    podiumEl.appendChild(fourth);
  }
}

function renderBracket() {
  bracketEl.innerHTML = "";
  bracketEl.appendChild(svg);

  const maxRound = Math.max(...matches.map((m) => m.roundIndex));

  for (let r = 0; r < maxRound; r++) {
    bracketEl.appendChild(buildColumn(r, "left"));
  }
  bracketEl.appendChild(buildColumn(maxRound, "left"));
  for (let r = maxRound - 1; r >= 0; r--) {
    bracketEl.appendChild(buildColumn(r, "right"));
  }
}

function layoutConnectors() {
  const bracketRect = bracketEl.getBoundingClientRect();
  svg.setAttribute("width", bracketEl.scrollWidth);
  svg.setAttribute("height", bracketEl.scrollHeight);
  svg.querySelectorAll("path").forEach((p) => p.remove());

  matches.forEach((match) => {
    if (!match.nextMatchId) return;
    const sourceEl = bracketEl.querySelector(`[data-match-id="${match.id}"]`);
    const targetEl = bracketEl.querySelector(`[data-match-id="${match.nextMatchId}"]`);
    if (!sourceEl || !targetEl) return;

    const sRect = sourceEl.getBoundingClientRect();
    const tRect = targetEl.getBoundingClientRect();
    const y1 = sRect.top + sRect.height / 2 - bracketRect.top;
    const y2 = tRect.top + tRect.height / 2 - bracketRect.top;

    const right = isRightSide(match);
    const x1 = (right ? sRect.left : sRect.right) - bracketRect.left;
    const x2 = (right ? tRect.right : tRect.left) - bracketRect.left;
    const midX = (x1 + x2) / 2;

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", `M ${x1} ${y1} H ${midX} V ${y2} H ${x2}`);
    if (match.winner) path.classList.add("decided");
    svg.appendChild(path);
  });
}

function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

renderPodium();
renderBracket();
layoutConnectors();
if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(layoutConnectors);
}
window.addEventListener("resize", debounce(layoutConnectors, 150));
