#!/usr/bin/env node
// =============================================================
// Автоматическое формирование пар следующего раунда.
//
// Что делает: смотрит в js/data.js, находит матчи со status
// "tbd", у которых ОБА матча-«кормильца» (те, что ссылаются на
// него через nextMatchId) уже "completed", и заполняет им
// slotA/slotB (игрок+победивший персонаж), firstMove и переводит
// в status: "scheduled" — по алгоритму из памяти сессии
// "project-first-move-and-player-rule" (кумулятивный подсчёт
// "кто чаще ходил первым/кого чаще пилотировал Глеб" + MD5-хэш
// как тайбрейк).
//
// Зачем: раньше эти пары считались вручную и один раз это привело
// к ошибке — в некормящий слот взяли ПРОИГРАВШЕГО персонажа вместо
// победителя (r16-8, 2026-08-31: взяли Алису вместо Чупакабры,
// хотя выиграла Чупакабра). Скрипт всегда берёт персонажа/игрока
// именно из слота, указанного в match.winner, так что такая
// ошибка больше невозможна.
//
// Использование:
//   node scripts/advance-round.mjs           — применить изменения к js/data.js
//   node scripts/advance-round.mjs --dry-run — только показать, что было бы сделано
//   node scripts/advance-round.mjs --audit   — ничего не меняет; пересчитывает
//     заново ВСЕ уже собранные пары (включая совсем старые) и сверяет
//     с тем, что реально сохранено в data.js — для поиска прошлых
//     ручных ошибок вроде r16-8.
//
// Матч "third-place" сознательно пропускается — туда идут
// ПРОИГРАВШИЕ полуфиналов, а не победители, это отдельный ручной
// шаг (см. комментарий "3а" в data.js).
// =============================================================

import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataPath = path.join(__dirname, "..", "js", "data.js");
const dryRun = process.argv.includes("--dry-run");

function lastHexParity(str) {
  const hex = createHash("md5").update(str, "utf8").digest("hex");
  const lastChar = hex[hex.length - 1];
  const value = parseInt(lastChar, 16);
  return { hex, lastChar, odd: value % 2 === 1 };
}

function otherSlot(slot) {
  return slot === "A" ? "B" : "A";
}

// История персонажа: сколько раз он ходил первым и сколько раз
// им играл Глеб — по ВСЕМ его завершённым матчам (кумулятивно,
// не только по последнему), как того требует правило.
function characterHistory(matches, characterSlug, excludeMatchId) {
  let movedFirstCount = 0;
  let glebCount = 0;
  let totalCount = 0;
  for (const m of matches) {
    if (m.status !== "completed") continue;
    if (m.id === excludeMatchId) continue; // не считаем сам разбираемый матч своей же историей
    for (const slot of ["A", "B"]) {
      const s = slot === "A" ? m.slotA : m.slotB;
      if (s.character !== characterSlug) continue;
      totalCount++;
      if (s.player === "gleb") glebCount++;
      // 1/16: жёсткое правило — slotA всегда считается ходившим
      // первым, даже если firstMove там не хранится (null).
      const movedFirst = m.stage === "1/16" ? slot === "A" : m.firstMove === slot;
      if (movedFirst) movedFirstCount++;
    }
  }
  return { movedFirstCount, glebCount, totalCount };
}

function computeNextRound(matches, characters, target, feeder1, feeder2) {
  // character1 = кормилец с меньшим position (раньше в сетке).
  const [f1, f2] =
    feeder1.position <= feeder2.position ? [feeder1, feeder2] : [feeder2, feeder1];

  const winnerInfo = (feeder) => {
    const slot = feeder.winner;
    if (slot !== "A" && slot !== "B") {
      throw new Error(`Матч ${feeder.id} помечен completed, но winner не "A"/"B"`);
    }
    const s = slot === "A" ? feeder.slotA : feeder.slotB;
    return { character: s.character, player: s.player, targetSlot: feeder.nextMatchSlot };
  };

  const w1 = winnerInfo(f1); // character1
  const w2 = winnerInfo(f2); // character2

  const h1 = characterHistory(matches, w1.character, target.id);
  const h2 = characterHistory(matches, w2.character, target.id);

  const name1 = characters[w1.character]?.name ?? w1.character;
  const name2 = characters[w2.character]?.name ?? w2.character;
  const tieHash = lastHexParity(`${name1}${name2}`);

  // --- Кто ходит первым ---
  let firstMoveCharacter; // "character1" | "character2"
  let firstMoveReason;
  if (h1.movedFirstCount !== h2.movedFirstCount) {
    firstMoveCharacter = h1.movedFirstCount < h2.movedFirstCount ? "character1" : "character2";
    firstMoveReason = `counts differ (${h1.movedFirstCount} vs ${h2.movedFirstCount}) — lower goes first`;
  } else {
    firstMoveCharacter = tieHash.odd ? "character1" : "character2";
    firstMoveReason = `tie (${h1.movedFirstCount} each) — hash("${name1}${name2}")=${tieHash.hex}, last=${tieHash.lastChar}, ${tieHash.odd ? "odd" : "even"}`;
  }

  // --- Кто из игроков кого пилотирует ---
  let glebCharacter; // "character1" | "character2"
  let playerReason;
  if (h1.glebCount !== h2.glebCount) {
    glebCharacter = h1.glebCount < h2.glebCount ? "character1" : "character2";
    playerReason = `counts differ (Глеб ${h1.glebCount}/${h1.totalCount} vs ${h2.glebCount}/${h2.totalCount}) — Глеб takes fewer`;
  } else {
    glebCharacter = tieHash.odd ? "character1" : "character2";
    playerReason = `tie (Глеб ${h1.glebCount}/${h1.totalCount} each) — same hash, ${tieHash.odd ? "odd" : "even"}`;
  }

  const winnerBySlotTag = { character1: w1, character2: w2 };
  const firstMoveSlot = winnerBySlotTag[firstMoveCharacter].targetSlot;
  const glebSlot = winnerBySlotTag[glebCharacter].targetSlot;

  const slotA = w1.targetSlot === "A" ? w1 : w2;
  const slotB = w1.targetSlot === "A" ? w2 : w1;

  const newSlotA = { player: slotA.targetSlot === glebSlot ? "gleb" : "roma", character: slotA.character };
  const newSlotB = { player: slotB.targetSlot === glebSlot ? "gleb" : "roma", character: slotB.character };

  return {
    slotA: newSlotA,
    slotB: newSlotB,
    firstMove: firstMoveSlot,
    log: [
      `${target.id}: ${f1.id}(${name1}/${w1.player}) + ${f2.id}(${name2}/${w2.player})`,
      `  first move: ${firstMoveReason} -> ${firstMoveCharacter === "character1" ? name1 : name2} moves first (slot ${firstMoveSlot})`,
      `  player: ${playerReason} -> Глеб plays ${glebCharacter === "character1" ? name1 : name2}`,
    ],
  };
}

function applyEditToSource(source, matchId, update) {
  const blockRe = new RegExp(`\\r?\\n  \\{\\r?\\n    id: "${matchId}"[\\s\\S]*?\\r?\\n  \\},`);
  const match = source.match(blockRe);
  if (!match) throw new Error(`Не нашёл блок матча ${matchId} в data.js`);
  let block = match[0];

  block = block.replace(
    /slotA: \{ player: [^,]+, character: [^}]+\},/,
    `slotA: { player: ${JSON.stringify(update.slotA.player)}, character: ${JSON.stringify(update.slotA.character)} },`
  );
  block = block.replace(
    /slotB: \{ player: [^,]+, character: [^}]+\},/,
    `slotB: { player: ${JSON.stringify(update.slotB.player)}, character: ${JSON.stringify(update.slotB.character)} },`
  );
  block = block.replace(/status: "tbd",/, `status: "scheduled",`);
  block = block.replace(/firstMove: null,/, `firstMove: ${JSON.stringify(update.firstMove)},`);

  return source.slice(0, match.index) + block + source.slice(match.index + match[0].length);
}

function buildFeedersByTarget(matches) {
  const feedersByTarget = new Map();
  for (const m of matches) {
    if (!m.nextMatchId) continue;
    if (m.id === "third-place") continue; // отдельная ручная логика (проигравшие)
    if (!feedersByTarget.has(m.nextMatchId)) feedersByTarget.set(m.nextMatchId, []);
    feedersByTarget.get(m.nextMatchId).push(m);
  }
  return feedersByTarget;
}

async function runAudit(matches, characters) {
  const feedersByTarget = buildFeedersByTarget(matches);
  const matchById = new Map(matches.map((m) => [m.id, m]));
  let checked = 0;
  let mismatches = 0;

  for (const [targetId, feeders] of feedersByTarget) {
    const target = matchById.get(targetId);
    if (!target) continue;
    if (feeders.length !== 2) continue;
    if (!feeders.every((f) => f.status === "completed")) continue;
    if (target.status === "tbd") continue; // ещё не собран — сверять нечего

    checked++;
    const result = computeNextRound(matches, characters, target, feeders[0], feeders[1]);
    const problems = [];
    if (target.slotA.character !== result.slotA.character || target.slotA.player !== result.slotA.player) {
      problems.push(
        `slotA: в data.js ${target.slotA.player}/${target.slotA.character}, пересчёт даёт ${result.slotA.player}/${result.slotA.character}`
      );
    }
    if (target.slotB.character !== result.slotB.character || target.slotB.player !== result.slotB.player) {
      problems.push(
        `slotB: в data.js ${target.slotB.player}/${target.slotB.character}, пересчёт даёт ${result.slotB.player}/${result.slotB.character}`
      );
    }
    if (target.firstMove !== result.firstMove) {
      problems.push(`firstMove: в data.js ${JSON.stringify(target.firstMove)}, пересчёт даёт ${JSON.stringify(result.firstMove)}`);
    }

    if (problems.length > 0) {
      mismatches++;
      console.log(`\n!!! РАСХОЖДЕНИЕ в ${targetId} (кормильцы: ${feeders.map((f) => f.id).join(", ")}) !!!`);
      console.log(result.log.join("\n"));
      for (const p of problems) console.log(`  ${p}`);
    }
  }

  console.log(`\nПроверено собранных матчей: ${checked}. Расхождений: ${mismatches}.`);
  if (mismatches === 0) console.log("Всё сходится с пересчётом по алгоритму.");
}

async function main() {
  const source = await readFile(dataPath, "utf8");
  const moduleUrl = pathToFileURL(dataPath).href + `?t=${Date.now()}`; // bust cache on re-run
  const { matches, characters } = await import(moduleUrl);

  if (process.argv.includes("--audit")) {
    await runAudit(matches, characters);
    return;
  }

  const feedersByTarget = buildFeedersByTarget(matches);
  const matchById = new Map(matches.map((m) => [m.id, m]));
  let updatedSource = source;
  let anyChange = false;

  for (const [targetId, feeders] of feedersByTarget) {
    const target = matchById.get(targetId);
    if (!target) continue;
    if (target.status !== "tbd") continue; // уже собран или сыгран
    if (feeders.length !== 2) continue; // третье место и т.п. — пропускаем
    if (!feeders.every((f) => f.status === "completed")) continue; // ждём оба матча

    const result = computeNextRound(matches, characters, target, feeders[0], feeders[1]);
    console.log(result.log.join("\n"));
    updatedSource = applyEditToSource(updatedSource, targetId, result);
    anyChange = true;
  }

  if (!anyChange) {
    console.log("Нет матчей, готовых к автосборке следующего раунда.");
    return;
  }

  if (dryRun) {
    console.log("\n(--dry-run: файл не изменён)");
  } else {
    await writeFile(dataPath, updatedSource, "utf8");
    console.log("\njs/data.js обновлён.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
