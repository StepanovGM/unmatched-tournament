import { matches, characters } from "./data.js?v=15";

const tableBody = document.querySelector(".stats-table tbody");

const counts = new Map();
matches
  .filter((m) => m.status === "completed")
  .forEach((m) => {
    [m.slotA.character, m.slotB.character].forEach((slug) => {
      if (!slug) return;
      counts.set(slug, (counts.get(slug) || 0) + 1);
    });
  });

const rows = [...counts.entries()].sort((a, b) => b[1] - a[1]);

if (rows.length === 0) {
  const empty = document.createElement("p");
  empty.className = "empty-note";
  empty.textContent = "Пока не сыграно ни одного матча.";
  tableBody.closest("table").replaceWith(empty);
} else {
  rows.forEach(([slug, count]) => {
    const character = characters[slug];
    const tr = document.createElement("tr");

    const nameTd = document.createElement("td");
    nameTd.textContent = character ? character.name : slug;
    tr.appendChild(nameTd);

    const countTd = document.createElement("td");
    countTd.textContent = count;
    tr.appendChild(countTd);

    tableBody.appendChild(tr);
  });
}
