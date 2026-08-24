import { characters, players, cards } from "./data.js?v=3";

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
