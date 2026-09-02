#!/usr/bin/env node
// =============================================================
// Импорт лога матча из экспорта трекера (Tracker/web) в
// нормализованный data/logs/<matchId>.json для блока "лог матча"
// на странице match.html (см. js/match-log.js).
//
// Что делает: берёт JSON-экспорт трекера (структура { current,
// history: [...] }, каждый элемент — { id, players: [{heroSlug}x2],
// log: [...] }), для каждого сыгранного там матча ищет матч в
// js/data.js с той же (неупорядоченной) парой персонажей, и печёт
// его сырой лог в раунды/сегменты, которые фронтенд уже просто
// рисует как есть — вся группировка (по groupId, по "кто ходит")
// сделана здесь, а не в браузере.
//
// Использование:
//   node scripts/import-match-log.mjs <путь-к-экспорту.json>
//   node scripts/import-match-log.mjs <путь> --dry-run   — ничего не пишет,
//     только печатает, что нашло/пропустило
//
// Идемпотентно: можно скармливать один и тот же (или новый) экспорт
// сколько угодно раз — файлы logs/ перезаписываются, картинки карт
// копируются только если их ещё нет.
//
// Матчи без сохранённого лога (весь 1/16, r16-1/r16-2 — сыграны до
// трекера) просто не получают data/logs/<id>.json, и блок лога на
// их странице матча не показывается.
// =============================================================

import { readFile, writeFile, mkdir, copyFile, access } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const siteRoot = path.join(__dirname, "..");
const repoRoot = path.join(siteRoot, "..");
const dataPath = path.join(siteRoot, "js", "data.js");
const heroesJsonPath = path.join(repoRoot, "Tracker", "web", "data", "heroes.json");
const trackerImagesDir = path.join(repoRoot, "Tracker", "web", "images", "heroes");
const logsDir = path.join(siteRoot, "data", "logs");
const cardArtDir = path.join(siteRoot, "assets", "cardart");

const dryRun = process.argv.includes("--dry-run");
const exportArg = process.argv.slice(2).find((a) => !a.startsWith("--"));

// Расхождения в slug между трекером и сайтом (сайт длиннее/полнее).
// Всё, чего нет здесь, считается одинаковым slug'ом в обеих системах.
const SLUG_MAP = {
  "little-red": "little-red-riding-hood",
  sinbad: "sindbad",
};

function mapSlug(trackerSlug) {
  return SLUG_MAP[trackerSlug] || trackerSlug;
}

function isHeroFighter(fighterKey) {
  return fighterKey === "hero" || (typeof fighterKey === "string" && fighterKey.indexOf("hero-") === 0);
}

function pairKey(slugA, slugB) {
  return [slugA, slugB].sort().join("|");
}

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

// ---- Загрузка справочников ----

async function loadSiteData() {
  const moduleUrl = pathToFileURL(dataPath).href + `?t=${Date.now()}`;
  const { matches, characters } = await import(moduleUrl);
  return { matches, characters };
}

async function loadHeroesCatalog() {
  const raw = await readFile(heroesJsonPath, "utf8");
  const parsed = JSON.parse(raw);
  const bySlug = new Map();
  for (const h of parsed.heroes) bySlug.set(h.slug, h);
  return bySlug;
}

// ---- Персонажи/бойцы: подписи и стартовое HP ----

function fighterLabel(siteCharacter, trackerHero, fighterKey) {
  if (fighterKey === "hero") return siteCharacter.name;
  if (typeof fighterKey === "string" && fighterKey.indexOf("hero-") === 0) {
    const idx = Number(fighterKey.slice(5));
    return `${siteCharacter.name} ${idx + 1}`;
  }
  // numeric — сайдкик
  const base = siteCharacter.sidekick
    ? siteCharacter.sidekick.replace(/^и\s+/, "")
    : trackerHero.sidekick
    ? trackerHero.sidekick.name
    : "Помощник";
  const count = trackerHero.sidekick ? trackerHero.sidekick.count : 1;
  return count > 1 ? `${base} ${fighterKey + 1}` : base;
}

function startingHp(trackerHero, fighterKey) {
  if (isHeroFighter(fighterKey)) return trackerHero.hp;
  return trackerHero.sidekick ? trackerHero.sidekick.hp : 1;
}

// ---- Карты: путь к картинке (и копирование при необходимости) ----

function findCard(trackerHero, cardId) {
  const card = trackerHero.cards.find((c) => c.id === cardId);
  if (!card) {
    throw new Error(`Карта id=${cardId} не найдена в каталоге героя "${trackerHero.slug}" (heroes.json)`);
  }
  return card;
}

const copiedCardArt = new Set(); // "siteSlug/cardId" — чтобы не копировать/логать дважды за прогон

async function resolveCardImage(siteSlug, trackerHero, cardId) {
  const card = findCard(trackerHero, cardId);
  const ext = path.extname(card.image); // ".webp" и т.п.
  const destRel = `assets/cardart/${siteSlug}/${cardId}${ext}`;
  const dedupeKey = `${siteSlug}/${cardId}`;

  if (!copiedCardArt.has(dedupeKey)) {
    copiedCardArt.add(dedupeKey);
    const destAbs = path.join(cardArtDir, siteSlug, `${cardId}${ext}`);
    if (!(await exists(destAbs))) {
      const srcAbs = path.join(repoRoot, "Tracker", "web", card.image);
      if (!dryRun) {
        await mkdir(path.dirname(destAbs), { recursive: true });
        await copyFile(srcAbs, destAbs);
      }
      console.log(`  + скопирована карта: ${destRel}`);
    }
  }

  return destRel;
}

const copiedSidekickArt = new Set(); // siteSlug — по одному представительному кадру на героя

async function resolveSidekickImage(siteSlug, trackerHero) {
  const tokenImages = trackerHero.sidekick && trackerHero.sidekick.tokenImages;
  if (!tokenImages || !tokenImages.length) return null;

  const srcRel = tokenImages[0];
  const ext = path.extname(srcRel);
  const destRel = `assets/cardart/${siteSlug}/sidekick${ext}`;

  if (!copiedSidekickArt.has(siteSlug)) {
    copiedSidekickArt.add(siteSlug);
    const destAbs = path.join(cardArtDir, siteSlug, `sidekick${ext}`);
    if (!(await exists(destAbs))) {
      const srcAbs = path.join(repoRoot, "Tracker", "web", srcRel);
      if (!dryRun) {
        await mkdir(path.dirname(destAbs), { recursive: true });
        await copyFile(srcAbs, destAbs);
      }
      console.log(`  + скопирован сайдкик: ${destRel}`);
    }
  }

  return destRel;
}

// ---- Поиск матча на сайте по паре персонажей ----

function buildPairLookup(matches) {
  const lookup = new Map();
  for (const m of matches) {
    if (m.status !== "completed") continue;
    if (!m.slotA.character || !m.slotB.character) continue;
    const key = pairKey(m.slotA.character, m.slotB.character);
    if (lookup.has(key)) {
      console.warn(`! неоднозначность: и "${lookup.get(key).id}", и "${m.id}" имеют пару ${key} — пропущу обе при совпадении`);
      lookup.set(key, null); // помечаем как неоднозначное
      continue;
    }
    lookup.set(key, m);
  }
  return lookup;
}

// ---- Основная обработка одного матча трекера ----

async function processTrackerMatch(trackerMatch, { matches, characters, heroesCatalog, pairLookup }) {
  const trackerSlugs = trackerMatch.players.map((p) => p.heroSlug);
  const siteSlugs = trackerSlugs.map(mapSlug);

  for (const slug of siteSlugs) {
    if (!characters[slug]) {
      throw new Error(
        `Slug "${slug}" (из трекера, матч ${trackerMatch.id}) не найден среди characters в data.js — добавьте соответствие в SLUG_MAP.`
      );
    }
  }

  const key = pairKey(siteSlugs[0], siteSlugs[1]);
  const siteMatch = pairLookup.get(key);
  if (!siteMatch) {
    console.log(`- ${trackerMatch.id}: пара (${siteSlugs.join(" vs ")}) не найдена среди завершённых матчей сайта — пропуск`);
    return null;
  }

  // trackerPlayerIndex -> "A" | "B"
  const sideOf = [null, null];
  for (let i = 0; i < 2; i++) {
    if (siteSlugs[i] === siteMatch.slotA.character) sideOf[i] = "A";
    else if (siteSlugs[i] === siteMatch.slotB.character) sideOf[i] = "B";
    else throw new Error(`Не удалось сопоставить сторону для ${siteSlugs[i]} в матче ${siteMatch.id}`);
  }
  if (sideOf[0] === sideOf[1]) {
    throw new Error(`Обе стороны матча ${trackerMatch.id} сопоставились на один и тот же слот (${sideOf[0]}) — проверьте пару персонажей`);
  }

  const trackerHeroes = trackerSlugs.map((slug) => {
    const h = heroesCatalog.get(slug);
    if (!h) throw new Error(`Герой "${slug}" не найден в heroes.json (каталог трекера)`);
    return h;
  });

  const hpTotals = new Map(); // `${playerIdx}:${fighterKey}` -> текущее HP
  function currentHp(playerIdx, fighterKey) {
    const k = `${playerIdx}:${fighterKey}`;
    if (!hpTotals.has(k)) hpTotals.set(k, startingHp(trackerHeroes[playerIdx], fighterKey));
    return hpTotals.get(k);
  }
  function applyDelta(playerIdx, fighterKey, delta) {
    const next = currentHp(playerIdx, fighterKey) + delta;
    hpTotals.set(`${playerIdx}:${fighterKey}`, next);
    return next;
  }

  // Суммарное HP только "геройских" фигур (без сайдкика) — для шапки
  // раунда. Для стай (Рапторы) — сумма по всем фигурам стаи.
  const heroFighterKeys = trackerHeroes.map((h) => {
    const count = h.heroFigure && h.heroFigure.count > 1 ? h.heroFigure.count : 1;
    return count > 1 ? Array.from({ length: count }, (_, i) => `hero-${i}`) : ["hero"];
  });
  function heroHpSnapshot() {
    const sumFor = (side) => {
      const playerIdx = sideOf.indexOf(side);
      return heroFighterKeys[playerIdx].reduce((sum, key) => sum + currentHp(playerIdx, key), 0);
    };
    return { A: sumFor("A"), B: sumFor("B") };
  }

  const roundsMap = new Map(); // round -> segments[]
  function roundSegments(round) {
    if (!roundsMap.has(round)) roundsMap.set(round, []);
    return roundsMap.get(round);
  }

  let activePlayerIdx = 0;
  let currentSegment = null;
  const groupBundles = new Map(); // groupId -> segment/reaction-объект kind:"hp"
  let lastRound = null;
  const heroHpByRound = new Map(); // round -> {A, B} — снимок HP героев на НАЧАЛО раунда

  for (const entry of trackerMatch.log) {
    const ownerIdx = entry.player;
    const isTurnOwner = ownerIdx === activePlayerIdx;
    const side = sideOf[ownerIdx];
    const round = entry.turnNumber;

    if (round !== lastRound) {
      // Раунд только начался — фиксируем HP таким, каким оно было ДО
      // его собственных событий (т.е. на конец предыдущего раунда).
      heroHpByRound.set(round, heroHpSnapshot());
      lastRound = round;
    }

    // Пас не несёт своей информации (раунды и так разделены заголовком),
    // поэтому в лог не попадает — но переключить владельца хода всё
    // равно нужно для всех событий после него.
    if (entry.type === "pass") {
      activePlayerIdx = 1 - activePlayerIdx;
      continue;
    }

    if (entry.type === "hp" || entry.type === "death") {
      const fighterKey = entry.target.fighter;
      const label = fighterLabel(characters[siteSlugs[ownerIdx]], trackerHeroes[ownerIdx], fighterKey);
      let bundle = entry.groupId ? groupBundles.get(entry.groupId) : null;

      if (entry.type === "hp") {
        const total = applyDelta(ownerIdx, fighterKey, entry.delta);
        const hit = { fighterLabel: label, delta: entry.delta, total, dead: false };
        if (!bundle) {
          bundle = { side, kind: "hp", hits: [hit], reactions: [] };
          if (entry.groupId) groupBundles.set(entry.groupId, bundle);
          // Изменение HP никогда не бывает "само по себе" — цепляем
          // его к текущей открытой строке (чьей бы она ни была), а
          // не открываем под него отдельную.
          if (currentSegment) {
            currentSegment.reactions.push(bundle);
          } else {
            roundSegments(round).push(bundle);
            currentSegment = bundle;
          }
        } else {
          bundle.hits.push(hit);
        }
      } else {
        // death: находим совпадающий hit в бандле того же groupId
        if (bundle) {
          const hit = [...bundle.hits].reverse().find((h) => h.fighterLabel === label && !h.dead);
          if (hit) hit.dead = true;
          else bundle.hits.push({ fighterLabel: label, delta: 0, total: currentHp(ownerIdx, fighterKey), dead: true });
        } else {
          console.warn(`  ! death без hp-пары (groupId=${entry.groupId}) для ${label} в ${trackerMatch.id}, раунд ${round}`);
        }
      }
      continue;
    }

    // Все остальные типы: maneuver, play, discard, draw, return, ability, spawn.
    // "Якорь" (открывает новую строку) — только манёвр, способность и
    // разыгранная карта самим ходящим игроком. Сброс, добор, возврат
    // карты и появление сайдкика сами по себе не происходят — они
    // всегда цепляются к уже открытой строке (см. фидбек: "они никогда
    // не происходят просто так").
    let seg;
    let isAnchor;
    switch (entry.type) {
      case "action":
        seg = { side, kind: "maneuver", reactions: [] };
        isAnchor = true;
        break;
      case "ability":
        seg = { side, kind: "ability", reactions: [] };
        isAnchor = isTurnOwner;
        break;
      case "spawn": {
        const image = await resolveSidekickImage(siteSlugs[ownerIdx], trackerHeroes[ownerIdx]);
        seg = { side, kind: "spawn", image, reactions: [] };
        isAnchor = false;
        break;
      }
      case "draw":
        seg = { side, kind: "draw", reactions: [] };
        isAnchor = false;
        break;
      case "play":
      case "discard":
      case "return": {
        const trackerHero = trackerHeroes[ownerIdx];
        const image = await resolveCardImage(siteSlugs[ownerIdx], trackerHero, entry.cardId);
        seg = {
          side,
          kind: entry.type,
          cardType: entry.cardType,
          mechanic: entry.mechanic || null,
          cardId: entry.cardId,
          cardName: entry.cardName,
          image,
          boosted: entry.type === "discard" ? !!entry.boosted : undefined,
          reactions: [],
        };
        isAnchor = entry.type === "play" && isTurnOwner;
        break;
      }
      default:
        console.warn(`  ! неизвестный тип события "${entry.type}" в ${trackerMatch.id} — пропущено`);
        continue;
    }

    if (isAnchor) {
      roundSegments(round).push(seg);
      currentSegment = seg;
    } else if (currentSegment) {
      currentSegment.reactions.push(seg);
    } else {
      roundSegments(round).push(seg);
      currentSegment = seg;
    }
  }

  const rounds = [...roundsMap.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([round, segments]) => ({
      round,
      turnSide: segments[0] ? segments[0].side : null,
      heroHp: heroHpByRound.get(round) || heroHpSnapshot(),
      segments,
    }));

  return {
    matchId: siteMatch.id,
    slotA: { heroSlug: siteMatch.slotA.character },
    slotB: { heroSlug: siteMatch.slotB.character },
    rounds,
  };
}

async function main() {
  if (!exportArg) {
    console.error("Использование: node scripts/import-match-log.mjs <путь-к-экспорту.json> [--dry-run]");
    process.exit(1);
  }
  const exportPath = path.resolve(process.cwd(), exportArg);

  const [{ matches, characters }, heroesCatalog, exportRaw] = await Promise.all([
    loadSiteData(),
    loadHeroesCatalog(),
    readFile(exportPath, "utf8"),
  ]);
  const exportData = JSON.parse(exportRaw);
  const pairLookup = buildPairLookup(matches);

  const candidates = [];
  if (exportData.current) candidates.push(exportData.current);
  if (Array.isArray(exportData.history)) candidates.push(...exportData.history);

  let written = 0;
  for (const trackerMatch of candidates) {
    const result = await processTrackerMatch(trackerMatch, { matches, characters, heroesCatalog, pairLookup });
    if (!result) continue;

    const destAbs = path.join(logsDir, `${result.matchId}.json`);
    console.log(`✓ ${trackerMatch.id} -> data/logs/${result.matchId}.json (${result.rounds.length} раундов)`);
    if (!dryRun) {
      await mkdir(logsDir, { recursive: true });
      await writeFile(destAbs, JSON.stringify(result, null, 2) + "\n", "utf8");
    }
    written++;
  }

  console.log(`\nГотово: ${written} файлов лога ${dryRun ? "было бы записано (--dry-run)" : "записано"}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
