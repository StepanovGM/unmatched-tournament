import { matches } from "./data.js";
import { buildThumb, slotLabel, playerLabel, formatDate } from "./util.js";

const bracketWrap = document.querySelector(".bracket-wrap");
const bracketEl = document.querySelector(".bracket");
const svg = document.querySelector(".bracket-connectors");

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

  // Игрока показываем только после игры — до этого распределение
  // скрыто за спойлером на странице матча, здесь его спалить не нужно.
  const player = match.status === "completed" ? playerLabel(slot) : "";
  if (player) {
    const playerEl = document.createElement("span");
    playerEl.className = "slot-player";
    playerEl.textContent = player;
    text.appendChild(playerEl);
  }

  row.appendChild(text);
  return row;
}

function buildMatchCard(match) {
  const card = document.createElement("div");
  card.className = "match-card";
  card.dataset.matchId = match.id;

  card.appendChild(buildSlot(match, "slotA"));
  card.appendChild(buildSlot(match, "slotB"));

  if (match.status !== "tbd") {
    card.classList.add("clickable");
    card.addEventListener("click", () => {
      location.href = `match.html?id=${match.id}`;
    });

    const meta = document.createElement("div");
    meta.className = "match-meta";
    if (match.status === "completed") {
      meta.textContent = "Результаты матча →";
    } else if (match.scheduledDate) {
      meta.textContent = `${formatDate(match.scheduledDate)} →`;
    } else {
      meta.textContent = "Страница матча →";
    }
    card.appendChild(meta);
  }

  return card;
}

function renderBracket() {
  const rounds = new Map();
  matches.forEach((match) => {
    if (!rounds.has(match.roundIndex)) rounds.set(match.roundIndex, []);
    rounds.get(match.roundIndex).push(match);
  });

  const roundIndexes = [...rounds.keys()].sort((a, b) => a - b);

  bracketEl.innerHTML = "";
  bracketEl.appendChild(svg);

  roundIndexes.forEach((roundIndex) => {
    const roundMatches = rounds.get(roundIndex).sort((a, b) => a.position - b.position);
    const column = document.createElement("div");
    column.className = "round-column";

    const title = document.createElement("div");
    title.className = "round-title";
    title.textContent = roundMatches[0].stage;
    column.appendChild(title);

    roundMatches.forEach((match) => column.appendChild(buildMatchCard(match)));
    bracketEl.appendChild(column);
  });
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
    const x1 = sRect.right - bracketRect.left;
    const y1 = sRect.top + sRect.height / 2 - bracketRect.top;
    const x2 = tRect.left - bracketRect.left;
    const y2 = tRect.top + tRect.height / 2 - bracketRect.top;
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

renderBracket();
layoutConnectors();
if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(layoutConnectors);
}
window.addEventListener("resize", debounce(layoutConnectors, 150));
