import { matches } from "./data.js?v=14";
import { buildThumb, slotLabel, playerLabel, formatDate } from "./util.js?v=14";

const list = document.querySelector(".upcoming-list");

function buildSide(slot, played) {
  const side = document.createElement("div");
  side.className = "upcoming-side";
  side.appendChild(buildThumb(slot));

  const text = document.createElement("span");
  text.className = "slot-text";

  const name = document.createElement("span");
  name.className = "slot-name";
  name.textContent = slotLabel(slot);
  text.appendChild(name);

  // Игрока показываем только после игры — до этого распределение
  // скрыто за спойлером на странице матча.
  const player = played ? playerLabel(slot) : "";
  if (player) {
    const playerEl = document.createElement("span");
    playerEl.className = "slot-player";
    playerEl.textContent = player;
    text.appendChild(playerEl);
  }

  side.appendChild(text);
  return side;
}

function buildRow(match) {
  const row = document.createElement("a");
  row.className = "upcoming-row";
  row.href = `match.html?id=${match.id}`;

  const stage = document.createElement("span");
  stage.className = "upcoming-stage";
  stage.textContent = match.stage;
  row.appendChild(stage);

  const pair = document.createElement("div");
  pair.className = "upcoming-pair";
  const played = match.status === "completed";
  pair.appendChild(buildSide(match.slotA, played));
  const vs = document.createElement("span");
  vs.className = "vs-label";
  vs.textContent = "VS";
  pair.appendChild(vs);
  pair.appendChild(buildSide(match.slotB, played));
  row.appendChild(pair);

  const date = document.createElement("span");
  date.className = "upcoming-date";
  date.textContent = match.scheduledDate ? formatDate(match.scheduledDate) : "Дата не назначена";
  row.appendChild(date);

  return row;
}

const upcoming = matches
  .filter((m) => m.status === "scheduled")
  .sort((a, b) => {
    if (!a.scheduledDate) return 1;
    if (!b.scheduledDate) return -1;
    return a.scheduledDate.localeCompare(b.scheduledDate);
  });

if (upcoming.length === 0) {
  const empty = document.createElement("p");
  empty.className = "empty-note";
  empty.textContent = "Пока нет запланированных матчей.";
  list.appendChild(empty);
} else {
  upcoming.forEach((match) => list.appendChild(buildRow(match)));
}
