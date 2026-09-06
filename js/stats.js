import { matches, characters, players } from "./data.js?v=16";
import { buildThumb, slotLabel } from "./util.js?v=16";

const completed = matches.filter((m) => m.status === "completed");

function winnerSlot(m) {
  return m.winner === "A" ? m.slotA : m.winner === "B" ? m.slotB : null;
}

// "Кто ходил первым" — то же правило, что и в advance-round.mjs:
// для 1/16 жёсткий house-rule (всегда slotA), иначе — фактически
// записанный первый ход (stats.firstPlayer), а до записи — firstMove.
function firstMoveSlot(m) {
  if (m.stage === "1/16") return "A";
  return (m.stats && m.stats.firstPlayer) || m.firstMove || null;
}

function buildPair(slotOrSlugA, slotOrSlugB) {
  const wrap = document.createElement("div");
  wrap.className = "duo-pair";

  const toSlot = (s) => (typeof s === "string" ? { character: s } : s);
  const a = toSlot(slotOrSlugA);
  const b = toSlot(slotOrSlugB);

  const thumbA = document.createElement("span");
  thumbA.className = "pair-thumb";
  thumbA.appendChild(buildThumb(a));
  wrap.appendChild(thumbA);

  const nameA = document.createElement("span");
  nameA.className = "slot-name";
  nameA.textContent = slotLabel(a);
  wrap.appendChild(nameA);

  const vs = document.createElement("span");
  vs.className = "pair-vs";
  vs.textContent = "vs";
  wrap.appendChild(vs);

  const thumbB = document.createElement("span");
  thumbB.className = "pair-thumb";
  thumbB.appendChild(buildThumb(b));
  wrap.appendChild(thumbB);

  const nameB = document.createElement("span");
  nameB.className = "slot-name";
  nameB.textContent = slotLabel(b);
  wrap.appendChild(nameB);

  return wrap;
}

function setEmpty(card, title, text) {
  card.innerHTML = "";
  const h = document.createElement("h3");
  h.className = "stat-title";
  h.textContent = title;
  card.appendChild(h);
  const p = document.createElement("p");
  p.className = "stat-empty";
  p.textContent = text;
  card.appendChild(p);
}

// --- 1. Соотношение побед: Глеб vs Рома ---

function renderPlayerRatio() {
  const card = document.getElementById("stat-players");
  const wins = { gleb: 0, roma: 0 };
  completed.forEach((m) => {
    const w = winnerSlot(m);
    if (w && wins[w.player] != null) wins[w.player]++;
  });
  const total = wins.gleb + wins.roma;

  const h = document.createElement("h3");
  h.className = "stat-title";
  h.textContent = "Соотношение побед: Глеб vs Рома";
  card.appendChild(h);

  if (total === 0) {
    setEmpty(card, "Соотношение побед: Глеб vs Рома", "Пока нет завершённых матчей.");
    return;
  }

  const bar = document.createElement("div");
  bar.className = "ratio-bar";
  const segGleb = document.createElement("div");
  segGleb.className = "ratio-seg p1";
  segGleb.style.flex = `${wins.gleb} 0 0`;
  segGleb.textContent = wins.gleb > 0 ? wins.gleb : "";
  const segRoma = document.createElement("div");
  segRoma.className = "ratio-seg p2";
  segRoma.style.flex = `${wins.roma} 0 0`;
  segRoma.textContent = wins.roma > 0 ? wins.roma : "";
  bar.appendChild(segGleb);
  bar.appendChild(segRoma);
  card.appendChild(bar);

  const legend = document.createElement("div");
  legend.className = "ratio-legend";
  const pct = (n) => Math.round((n / total) * 100);
  legend.innerHTML = `<span>${players.gleb.name}: ${wins.gleb} (${pct(wins.gleb)}%)</span><span>${players.roma.name}: ${wins.roma} (${pct(wins.roma)}%)</span>`;
  card.appendChild(legend);
}

// --- 2. Соотношение побед: 1 ход vs 2 ход ---

function renderFirstMoveRatio() {
  const card = document.getElementById("stat-firstmove");
  let first = 0;
  let second = 0;
  completed.forEach((m) => {
    const fm = firstMoveSlot(m);
    if (!fm || !m.winner) return;
    if (m.winner === fm) first++;
    else second++;
  });
  const total = first + second;

  if (total === 0) {
    setEmpty(card, "Соотношение побед: 1 ход vs 2 ход", "Недостаточно данных.");
    return;
  }

  const h = document.createElement("h3");
  h.className = "stat-title";
  h.textContent = "Соотношение побед: 1 ход vs 2 ход";
  card.appendChild(h);

  const bar = document.createElement("div");
  bar.className = "ratio-bar";
  const segFirst = document.createElement("div");
  segFirst.className = "ratio-seg first";
  segFirst.style.flex = `${first} 0 0`;
  segFirst.textContent = first > 0 ? first : "";
  const segSecond = document.createElement("div");
  segSecond.className = "ratio-seg second";
  segSecond.style.flex = `${second} 0 0`;
  segSecond.textContent = second > 0 ? second : "";
  bar.appendChild(segFirst);
  bar.appendChild(segSecond);
  card.appendChild(bar);

  const legend = document.createElement("div");
  legend.className = "ratio-legend";
  const pct = (n) => Math.round((n / total) * 100);
  legend.innerHTML = `<span>Ходившие первыми: ${first} (${pct(first)}%)</span><span>Ходившие вторыми: ${second} (${pct(second)}%)</span>`;
  card.appendChild(legend);
}

// --- 3 и 4. Средние значения ---

function renderAverageTile(id, title, values, suffix) {
  const card = document.getElementById(id);
  if (values.length === 0) {
    setEmpty(card, title, "Нет данных.");
    return;
  }
  const avg = values.reduce((a, b) => a + b, 0) / values.length;

  const h = document.createElement("h3");
  h.className = "stat-title";
  h.textContent = title;
  card.appendChild(h);

  const value = document.createElement("div");
  value.className = "stat-value";
  value.textContent = avg.toFixed(1);
  card.appendChild(value);

  const sub = document.createElement("div");
  sub.className = "stat-sub";
  sub.textContent = `${suffix} · по ${values.length} матчам`;
  card.appendChild(sub);
}

// --- 5. Самый долгий / короткий матч ---

function renderDuration() {
  const card = document.getElementById("stat-duration");
  const withRounds = completed.filter((m) => m.stats && m.stats.finalRound != null);

  if (withRounds.length === 0) {
    setEmpty(card, "Самый долгий и самый короткий матч", "Нет данных.");
    return;
  }

  const longest = withRounds.reduce((a, b) => (b.stats.finalRound > a.stats.finalRound ? b : a));
  const shortest = withRounds.reduce((a, b) => (b.stats.finalRound < a.stats.finalRound ? b : a));

  const h = document.createElement("h3");
  h.className = "stat-title";
  h.textContent = "Самый долгий и самый короткий матч";
  card.appendChild(h);

  const body = document.createElement("div");
  body.className = "stat-duo-body";

  const buildDuoItem = (label, match) => {
    const a = document.createElement("a");
    a.className = "duo-item";
    a.href = `match.html?id=${match.id}`;

    const lbl = document.createElement("span");
    lbl.className = "duo-label";
    lbl.textContent = label;
    a.appendChild(lbl);

    const val = document.createElement("span");
    val.className = "duo-value";
    val.textContent = `${match.stats.finalRound} ходов`;
    a.appendChild(val);

    a.appendChild(buildPair(match.slotA, match.slotB));

    const meta = document.createElement("span");
    meta.className = "highlight-meta";
    meta.textContent = match.stage;
    a.appendChild(meta);

    return a;
  };

  body.appendChild(buildDuoItem("Самый долгий", longest));
  body.appendChild(buildDuoItem("Самый короткий", shortest));
  card.appendChild(body);
}

// --- 6 и 7. Пиковые значения по логам матчей ---

async function loadLog(matchId) {
  try {
    const res = await fetch(`data/logs/${matchId}.json?v=1`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function walkSegments(segments, visit) {
  segments.forEach((seg) => {
    visit(seg);
    if (seg.reactions && seg.reactions.length) walkSegments(seg.reactions, visit);
  });
}

// seg.side у "hp"-сегмента — это сторона, ЧЕЙ боец получил урон, т.е.
// урон, который нанёс противоположный персонаж. Считаем отдельно по
// сторонам, чтобы пик приписывался одному персонажу, а не сумме
// обеих сторон обмена в рамках хода.
function roundDamageBySide(round) {
  const dmg = { A: 0, B: 0 };
  walkSegments(round.segments, (seg) => {
    if (seg.kind === "hp") {
      seg.hits.forEach((hit) => {
        dmg[seg.side] += Math.abs(hit.delta);
      });
    }
  });
  return dmg;
}

function roundCardsBySide(round) {
  const cards = { A: 0, B: 0 };
  walkSegments(round.segments, (seg) => {
    if (seg.kind === "play") cards[seg.side]++;
  });
  return cards;
}

function renderHighlight(id, title, valueSuffix, best) {
  const card = document.getElementById(id);
  if (!best) {
    setEmpty(card, title, "Нет матчей с сохранённым логом.");
    return;
  }

  const h = document.createElement("h3");
  h.className = "stat-title";
  h.textContent = title;
  card.appendChild(h);

  const body = document.createElement("div");
  body.className = "highlight-body";

  const value = document.createElement("div");
  value.className = "highlight-value";
  value.textContent = best.value;
  body.appendChild(value);

  const detail = document.createElement("div");
  detail.className = "highlight-detail";

  const sub = document.createElement("div");
  sub.className = "stat-sub";
  sub.textContent = valueSuffix;
  detail.appendChild(sub);

  detail.appendChild(buildPair(best.pairSlugs[0], best.pairSlugs[1]));

  const meta = document.createElement("div");
  meta.className = "highlight-meta";
  meta.textContent = best.meta;
  detail.appendChild(meta);

  const link = document.createElement("a");
  link.className = "highlight-link";
  link.href = `match.html?id=${best.matchId}`;
  link.textContent = "Смотреть матч →";
  detail.appendChild(link);

  body.appendChild(detail);
  card.appendChild(body);
}

// Есть ли в ходе розыгрыш карты как атаки (mechanic === "attack"),
// независимо от того, чья это была карта.
function roundHasAttack(round) {
  let found = false;
  walkSegments(round.segments, (seg) => {
    if (seg.mechanic === "attack") found = true;
  });
  return found;
}

// Самая длинная последовательность подряд идущих ходов без урона
// (ни одной из сторон) и без розыгрыша атакующих карт.
function longestQuietStreak(log) {
  let best = null;
  let streakLen = 0;
  let streakStart = null;

  log.rounds.forEach((round) => {
    const dmg = roundDamageBySide(round);
    const quiet = dmg.A + dmg.B === 0 && !roundHasAttack(round);

    if (quiet) {
      if (streakLen === 0) streakStart = round.round;
      streakLen++;
      if (!best || streakLen > best.length) {
        best = { length: streakLen, startRound: streakStart, endRound: round.round };
      }
    } else {
      streakLen = 0;
    }
  });

  return best;
}

// Сколько ходов (снимков heroHp на начало хода) каждая сторона
// провела с суммарным HP <= 3 — считаем по всему матчу, эпизоды
// низкого HP до и после лечения суммируются.
function lowHpRoundCounts(log) {
  const counts = { A: 0, B: 0 };
  log.rounds.forEach((round) => {
    ["A", "B"].forEach((side) => {
      const hp = round.heroHp && round.heroHp[side];
      if (hp != null && hp <= 3) counts[side]++;
    });
  });
  return counts;
}

async function renderLogDerivedStats() {
  let maxDamage = null;
  let maxCards = null;
  let quietStreak = null;
  let lowHpSurvival = null;
  const winnerCardTotals = [];

  for (const m of completed) {
    const log = await loadLog(m.id);
    if (!log) continue;

    const cardTotals = { A: 0, B: 0 };

    log.rounds.forEach((round) => {
      const dmg = roundDamageBySide(round);
      // Урон стороне A нанёс персонаж B, и наоборот.
      [
        { dealer: "A", value: dmg.B },
        { dealer: "B", value: dmg.A },
      ].forEach(({ dealer, value }) => {
        if (value > 0 && (!maxDamage || value > maxDamage.value)) {
          maxDamage = {
            value,
            pairSlugs:
              dealer === "A" ? [m.slotA.character, m.slotB.character] : [m.slotB.character, m.slotA.character],
            meta: `${m.stage} · ход ${round.round}`,
            matchId: m.id,
          };
        }
      });

      const cards = roundCardsBySide(round);
      cardTotals.A += cards.A;
      cardTotals.B += cards.B;
      [
        { dealer: "A", value: cards.A },
        { dealer: "B", value: cards.B },
      ].forEach(({ dealer, value }) => {
        if (value > 0 && (!maxCards || value > maxCards.value)) {
          maxCards = {
            value,
            pairSlugs:
              dealer === "A" ? [m.slotA.character, m.slotB.character] : [m.slotB.character, m.slotA.character],
            meta: `${m.stage} · ход ${round.round}`,
            matchId: m.id,
          };
        }
      });
    });

    if (m.winner === "A" || m.winner === "B") {
      winnerCardTotals.push(cardTotals[m.winner]);
    }

    const quiet = longestQuietStreak(log);
    if (quiet && (!quietStreak || quiet.length > quietStreak.value)) {
      quietStreak = {
        value: quiet.length,
        pairSlugs: [m.slotA.character, m.slotB.character],
        meta:
          quiet.startRound === quiet.endRound
            ? `${m.stage} · ход ${quiet.startRound}`
            : `${m.stage} · ходы ${quiet.startRound}–${quiet.endRound}`,
        matchId: m.id,
      };
    }

    const lowHp = lowHpRoundCounts(log);
    [
      { side: "A", value: lowHp.A },
      { side: "B", value: lowHp.B },
    ].forEach(({ side, value }) => {
      if (value > 0 && (!lowHpSurvival || value > lowHpSurvival.value)) {
        const otherSide = side === "A" ? "B" : "A";
        lowHpSurvival = {
          value,
          pairSlugs: [m[`slot${side}`].character, m[`slot${otherSide}`].character],
          meta: m.stage,
          matchId: m.id,
        };
      }
    });
  }

  renderHighlight("stat-max-damage", "Наибольший урон за один ход", "урона за ход", maxDamage);
  renderHighlight("stat-max-cards", "Наибольшее число карт, сыгранных за один ход", "карт за ход", maxCards);
  renderHighlight("stat-quiet-streak", "Самое долгое затишье", "ходов без урона и атак подряд", quietStreak);
  renderHighlight("stat-low-hp-survival", "Самое долгое выживание на грани смерти", "ходов с HP ≤ 3", lowHpSurvival);
  renderAverageTile("stat-avg-winner-cards", "Среднее число карт, разыгранных победителем", winnerCardTotals, "карт");
}

renderPlayerRatio();
renderFirstMoveRatio();
renderAverageTile(
  "stat-avg-hp",
  "Среднее HP у победителя",
  completed.map((m) => m.stats && m.stats.winnerHp).filter((v) => v != null),
  "HP"
);
renderAverageTile(
  "stat-avg-rounds",
  "Среднее число ходов в матче",
  completed.map((m) => m.stats && m.stats.finalRound).filter((v) => v != null),
  "ходов"
);
renderDuration();
renderLogDerivedStats();
