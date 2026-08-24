import { cards, cardDrawOrder, players, matches } from "./data.js";

const CYCLE_SIZE = Object.keys(cards).length;

function currentCycleDraws() {
  const cycleStart = Math.floor(cardDrawOrder.length / CYCLE_SIZE) * CYCLE_SIZE;
  return cardDrawOrder.slice(cycleStart);
}

// Карты, уже занятые в текущем незавершённом цикле розыгрыша (14 матчей).
export function cardsUsedInCurrentCycle() {
  return currentCycleDraws()
    .map((matchId) => matches.find((m) => m.id === matchId))
    .filter(Boolean)
    .map((m) => m.card)
    .filter(Boolean);
}

export function availableCards() {
  const used = new Set(cardsUsedInCurrentCycle());
  return Object.entries(cards).filter(([slug]) => !used.has(slug));
}

// Возвращает slug случайной ещё не занятой в этом цикле карты, либо null,
// если пул почему-то пуст (не должно случаться при аккуратном ведении
// cardDrawOrder — цикл сбрасывается сам каждые 14 розыгрышей).
export function drawRandomCard() {
  const pool = availableCards();
  if (pool.length === 0) return null;
  const [slug] = pool[Math.floor(Math.random() * pool.length)];
  return slug;
}

// Случайно распределяет двух игроков между слотами A/Б матча.
// Возвращает { playerA, playerB } (slug-и).
export function drawRandomPlayers() {
  const [p1, p2] = Object.keys(players);
  return Math.random() < 0.5 ? { playerA: p1, playerB: p2 } : { playerA: p2, playerB: p1 };
}
