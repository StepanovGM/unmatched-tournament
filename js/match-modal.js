import { buildThumb, slotLabel, playerLabel } from "./util.js";

let overlay = null;

function ensureModal() {
  if (overlay) return overlay;

  overlay = document.createElement("div");
  overlay.className = "modal-overlay hidden";
  overlay.innerHTML = `
    <div class="modal-box" role="dialog" aria-modal="true">
      <button type="button" class="modal-close" aria-label="Закрыть">&times;</button>
      <p class="modal-stage"></p>
      <div class="modal-versus"></div>
      <dl class="modal-stats"></dl>
      <p class="modal-notes"></p>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) closeMatchModal();
  });
  overlay.querySelector(".modal-close").addEventListener("click", closeMatchModal);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMatchModal();
  });

  return overlay;
}

function buildSide(slot, isWinner) {
  const side = document.createElement("div");
  side.className = "modal-side" + (isWinner ? " winner" : "");
  side.appendChild(buildThumb(slot));

  const name = document.createElement("span");
  name.className = "slot-name";
  name.textContent = slotLabel(slot);
  side.appendChild(name);

  const player = document.createElement("span");
  player.className = "slot-player";
  player.textContent = playerLabel(slot);
  side.appendChild(player);

  return side;
}

export function openMatchModal(match) {
  const modal = ensureModal();

  modal.querySelector(".modal-stage").textContent = `Стадия: ${match.stage}`;

  const versus = modal.querySelector(".modal-versus");
  versus.innerHTML = "";
  versus.appendChild(buildSide(match.slotA, match.winner === "A"));
  const vs = document.createElement("span");
  vs.className = "modal-vs";
  vs.textContent = "VS";
  versus.appendChild(vs);
  versus.appendChild(buildSide(match.slotB, match.winner === "B"));

  const stats = modal.querySelector(".modal-stats");
  stats.innerHTML = "";
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

  const notes = modal.querySelector(".modal-notes");
  notes.textContent = match.stats.notes || "";
  notes.style.display = match.stats.notes ? "" : "none";

  modal.classList.remove("hidden");
}

export function closeMatchModal() {
  if (overlay) overlay.classList.add("hidden");
}
