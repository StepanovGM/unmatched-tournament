import { matches, players, cards, cardDrawOrder } from "./data.js";
import { buildThumb, buildCardThumb, buildSnippetBox, buildSpoiler, slotLabel, playerLabel, getPlayer } from "./util.js";
import { drawRandomCard, drawRandomPlayers } from "./random.js";

const root = document.getElementById("match-page");
const id = new URLSearchParams(location.search).get("id");
const match = matches.find((m) => m.id === id);

if (!match) {
  root.innerHTML = '<p class="empty-note">Матч не найден.</p>';
} else {
  render();
}

function buildSide(slot, isWinner) {
  const side = document.createElement("div");
  side.className = "match-side" + (isWinner ? " winner" : "");
  side.appendChild(buildThumb(slot));

  const name = document.createElement("span");
  name.className = "slot-name";
  name.textContent = slotLabel(slot);
  side.appendChild(name);

  // Имя игрока в шапке матча показываем только после игры — до этого
  // распределение скрыто за спойлером в разделе "Кто за кого играет",
  // и здесь его показывать раньше времени не нужно.
  if (isPlayed()) {
    const player = document.createElement("span");
    player.className = "slot-player";
    player.textContent = playerLabel(slot);
    side.appendChild(player);
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

function buildSection(title) {
  const section = document.createElement("section");
  section.className = "match-section";
  const h = document.createElement("h3");
  h.textContent = title;
  section.appendChild(h);
  return section;
}

function pairKnown() {
  return match.status !== "tbd";
}

function isPlayed() {
  return match.status === "completed";
}

function buildCardDisplay(slug) {
  const card = cards[slug];
  const row = document.createElement("div");
  row.className = "card-display";
  row.appendChild(buildCardThumb(slug));
  const name = document.createElement("span");
  name.className = "slot-name";
  name.textContent = card ? card.name : slug;
  row.appendChild(name);
  return row;
}

// ---- Карта ----

function renderCardSection() {
  const section = buildSection("Карта матча");

  if (match.card) {
    if (isPlayed()) {
      section.appendChild(buildCardDisplay(match.card));
    } else {
      section.appendChild(buildSpoiler(buildCardDisplay(match.card)));
      const note = document.createElement("p");
      note.className = "empty-note";
      note.textContent = "Карта уже определена, но скрыта до игры.";
      section.insertBefore(note, section.lastChild);
    }
    return section;
  }

  if (!pairKnown()) {
    const note = document.createElement("p");
    note.className = "empty-note";
    note.textContent = "Пара ещё не определена — карту разыграть пока нельзя.";
    section.appendChild(note);
    return section;
  }

  const note = document.createElement("p");
  note.className = "empty-note";
  note.textContent = "Карта ещё не разыграна.";
  section.appendChild(note);

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "btn";
  btn.textContent = "🎲 Рандомизировать карту";
  section.appendChild(btn);

  const resultWrap = document.createElement("div");
  section.appendChild(resultWrap);

  btn.addEventListener("click", () => {
    const slug = drawRandomCard();
    resultWrap.innerHTML = "";
    if (!slug) {
      const err = document.createElement("p");
      err.className = "empty-note";
      err.textContent = "Не осталось доступных карт в этом цикле — проверьте cardDrawOrder в data.js.";
      resultWrap.appendChild(err);
      return;
    }

    const card = cards[slug];
    const row = document.createElement("div");
    row.className = "card-display";
    row.appendChild(buildCardThumb(slug));
    const name = document.createElement("span");
    name.className = "slot-name";
    name.textContent = card ? card.name : slug;
    row.appendChild(name);
    resultWrap.appendChild(row);

    const newOrder = [...cardDrawOrder, match.id].map((v) => JSON.stringify(v)).join(", ");
    const code =
      `// В объекте матча "${match.id}" (js/data.js):\n` +
      `card: ${JSON.stringify(slug)},\n\n` +
      `// И замените строку с cardDrawOrder на:\n` +
      `export const cardDrawOrder = [${newOrder}];`;
    const help = document.createElement("p");
    help.className = "empty-note";
    help.textContent = "Чтобы результат сохранился, скопируйте код в data.js — иначе он пропадёт при перезагрузке страницы.";
    resultWrap.appendChild(help);
    resultWrap.appendChild(buildSnippetBox(code));
  });

  return section;
}

// ---- Игроки ----

function renderPlayerSection() {
  const section = buildSection("Кто за кого играет");

  if (match.slotA.player && match.slotB.player) {
    const p = document.createElement("p");
    p.textContent = `${getPlayer(match.slotA.player).name} — ${slotLabel(match.slotA)}, ${getPlayer(match.slotB.player).name} — ${slotLabel(match.slotB)}`;

    if (isPlayed()) {
      section.appendChild(p);
    } else {
      section.appendChild(buildSpoiler(p));
      const note = document.createElement("p");
      note.className = "empty-note";
      note.textContent = "Распределение уже готово, но скрыто до игры.";
      section.insertBefore(note, section.lastChild);
    }
    return section;
  }

  if (!pairKnown()) {
    const note = document.createElement("p");
    note.className = "empty-note";
    note.textContent = "Пара ещё не определена — распределять игроков пока рано.";
    section.appendChild(note);
    return section;
  }

  const [p1, p2] = Object.keys(players);
  const optionsWrap = document.createElement("div");
  optionsWrap.className = "player-options";

  function optionLabel(playerA, playerB) {
    return `${players[playerA].name} — ${slotLabel(match.slotA)}, ${players[playerB].name} — ${slotLabel(match.slotB)}`;
  }

  const options = [
    { playerA: p1, playerB: p2 },
    { playerA: p2, playerB: p1 },
  ];

  const resultWrap = document.createElement("div");

  function selectOption(choice, buttons) {
    buttons.forEach((b) => b.classList.remove("selected"));
    choice.btn.classList.add("selected");

    const code =
      `// В объекте матча "${match.id}" (js/data.js), внутри slotA/slotB:\n` +
      `slotA: { player: ${JSON.stringify(choice.playerA)}, character: ${JSON.stringify(match.slotA.character)} },\n` +
      `slotB: { player: ${JSON.stringify(choice.playerB)}, character: ${JSON.stringify(match.slotB.character)} },`;

    resultWrap.innerHTML = "";
    const help = document.createElement("p");
    help.className = "empty-note";
    help.textContent = "Скопируйте код в data.js, чтобы распределение сохранилось.";
    resultWrap.appendChild(help);
    resultWrap.appendChild(buildSnippetBox(code));
  }

  const buttons = options.map((opt) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn player-option";
    btn.textContent = optionLabel(opt.playerA, opt.playerB);
    opt.btn = btn;
    return btn;
  });

  buttons.forEach((btn, i) => {
    btn.addEventListener("click", () => selectOption(options[i], buttons));
    optionsWrap.appendChild(btn);
  });

  const randomBtn = document.createElement("button");
  randomBtn.type = "button";
  randomBtn.className = "btn";
  randomBtn.textContent = "🎲 Рандомно";
  randomBtn.addEventListener("click", () => {
    const picked = drawRandomPlayers();
    const match_ = options.find((o) => o.playerA === picked.playerA && o.playerB === picked.playerB);
    selectOption(match_, buttons);
  });

  section.appendChild(randomBtn);
  section.appendChild(optionsWrap);
  section.appendChild(resultWrap);

  return section;
}

// ---- Результаты ----

function renderResultsSection() {
  const section = buildSection("Результаты матча");

  if (match.status !== "completed") {
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
  root.appendChild(renderCardSection());
  root.appendChild(renderPlayerSection());
  root.appendChild(renderResultsSection());
}
