import { characters, players, cards } from "./data.js";

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

// Блок с кодом для вставки в data.js + кнопка "скопировать".
export function buildSnippetBox(code) {
  const box = document.createElement("div");
  box.className = "snippet-box";

  const pre = document.createElement("pre");
  const codeEl = document.createElement("code");
  codeEl.textContent = code;
  pre.appendChild(codeEl);
  box.appendChild(pre);

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "btn snippet-copy";
  btn.textContent = "Скопировать";
  btn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(code);
      btn.textContent = "Скопировано!";
    } catch {
      btn.textContent = "Не удалось скопировать";
    }
    setTimeout(() => {
      btn.textContent = "Скопировать";
    }, 1500);
  });
  box.appendChild(btn);

  return box;
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
