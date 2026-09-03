import { characters, players, cards } from "./data.js?v=16";

export function getCharacter(slug) {
  return slug ? characters[slug] : null;
}

export function getPlayer(slug) {
  return slug ? players[slug] : null;
}

export function slotLabel(slot) {
  const character = getCharacter(slot.character);
  return character ? character.name : "TBD";
}

export function playerLabel(slot) {
  const player = getPlayer(slot.player);
  return player ? player.name : "";
}

export function sidekickLabel(slot) {
  const character = getCharacter(slot.character);
  return character && character.sidekick ? character.sidekick : "";
}

// Порядок отображения слотов матча: тот, кто ходит первым, всегда
// идёт первым (сверху в сетке, слева на странице матча) — даже если
// физически хранится как slotB. Источник истины по приоритету:
// фактически записанный первый ход (stats.firstPlayer, после игры),
// затем заранее определённый firstMove, затем правило для 1/16
// (всегда slotA), иначе — обычный порядок A, B.
export function displayOrder(match) {
  let firstKey = "A";
  if (match.stats && match.stats.firstPlayer) {
    firstKey = match.stats.firstPlayer;
  } else if (match.firstMove) {
    firstKey = match.firstMove;
  } else if (match.stage === "1/16") {
    firstKey = "A";
  }
  return firstKey === "A" ? ["A", "B"] : ["B", "A"];
}

// Строит ряд из filled/empty звёзд по оценке 1-5.
export function buildStarRating(rating) {
  const wrap = document.createElement("span");
  wrap.className = "star-rating";
  for (let i = 1; i <= 5; i++) {
    const star = document.createElement("span");
    star.className = "star" + (i <= rating ? " filled" : "");
    star.textContent = "★";
    wrap.appendChild(star);
  }
  return wrap;
}

// Строит миниатюру персонажа: картинку, если она есть и грузится,
// иначе цветной плейсхолдер с первой буквой имени.
export function buildThumb(slot) {
  const character = getCharacter(slot.character);
  const wrap = document.createElement("span");

  if (!character) {
    wrap.className = "placeholder-thumb";
    wrap.textContent = "?";
    return wrap;
  }

  const placeholder = document.createElement("span");
  placeholder.className = "placeholder-thumb";
  placeholder.textContent = character.name.charAt(0).toUpperCase();

  const img = document.createElement("img");
  img.className = "thumb";
  img.src = character.image;
  img.alt = character.name;
  img.onerror = () => {
    img.replaceWith(placeholder);
  };

  wrap.appendChild(img);
  return wrap;
}

// Миниатюра карты (аналогично buildThumb, но для словаря cards).
export function buildCardThumb(cardSlug) {
  const card = cardSlug ? cards[cardSlug] : null;
  const wrap = document.createElement("span");

  if (!card) {
    wrap.className = "placeholder-thumb";
    wrap.textContent = "?";
    return wrap;
  }

  const placeholder = document.createElement("span");
  placeholder.className = "placeholder-thumb";
  placeholder.textContent = card.name.charAt(0).toUpperCase();

  const img = document.createElement("img");
  img.className = "thumb";
  img.src = card.image;
  img.alt = card.name;
  img.onerror = () => {
    img.replaceWith(placeholder);
  };

  wrap.appendChild(img);
  return wrap;
}

// Рубашка карты персонажа (для событий "взял карту" в логе матча).
export function buildCardbackThumb(characterSlug) {
  const character = getCharacter(characterSlug);
  const wrap = document.createElement("span");

  if (!character || !character.cardback) {
    wrap.className = "placeholder-thumb";
    wrap.textContent = character ? character.name.charAt(0).toUpperCase() : "?";
    return wrap;
  }

  const placeholder = document.createElement("span");
  placeholder.className = "placeholder-thumb";
  placeholder.textContent = character.name.charAt(0).toUpperCase();

  const img = document.createElement("img");
  img.className = "thumb";
  img.src = character.cardback;
  img.alt = "";
  img.onerror = () => {
    img.replaceWith(placeholder);
  };

  wrap.appendChild(img);
  return wrap;
}

// Оборачивает уже готовый DOM-узел в спойлер: контент размыт и скрыт
// за кнопкой "Показать", пока пользователь сам не откроет его.
export function buildSpoiler(contentEl) {
  const wrap = document.createElement("div");
  wrap.className = "spoiler";

  const content = document.createElement("div");
  content.className = "spoiler-content";
  content.appendChild(contentEl);
  wrap.appendChild(content);

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "spoiler-reveal";
  btn.textContent = "Показать";
  btn.addEventListener("click", () => wrap.classList.add("revealed"));
  wrap.appendChild(btn);

  return wrap;
}

export function formatDate(isoDate) {
  if (!isoDate) return "";
  const date = new Date(isoDate + "T00:00:00");
  return date.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
