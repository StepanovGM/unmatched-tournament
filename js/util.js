import { characters, players } from "./data.js";

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

export function formatDate(isoDate) {
  if (!isoDate) return "";
  const date = new Date(isoDate + "T00:00:00");
  return date.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
