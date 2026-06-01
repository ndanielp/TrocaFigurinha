// Gera infra/seeds/stickers.sql com os 48 times oficiais da Copa 2026
// Fonte: Modelos/album_copa_2026.md (99 paginas, 994 figurinhas)
//
// section_order reflete a ordem exata de paginas do album fisico:
//   Pagina  1: FWC00-FWC08 (intro, section_order 0-8)
//   Paginas 2-97: 48 times x 20 figurinhas (section_order 9-968)
//   Pagina 98: FWC09-FWC19 (historia, section_order 969-979)
//   Pagina 99: CC01-CC14 (section_order 980-993)
// Total: 9 + 960 + 11 + 14 = 994

import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const out = join(__dirname, "../infra/seeds/stickers.sql");

const TEAMS = [
  // Grupo A
  { slug: "MEX", name: "México",           group: "A" },
  { slug: "RSA", name: "África do Sul",    group: "A" },
  { slug: "KOR", name: "Coreia do Sul",    group: "A" },
  { slug: "CZE", name: "Rep. Tcheca",      group: "A" },
  // Grupo B
  { slug: "CAN", name: "Canadá",           group: "B" },
  { slug: "BIH", name: "Bósnia",           group: "B" },
  { slug: "QAT", name: "Catar",            group: "B" },
  { slug: "SUI", name: "Suíça",            group: "B" },
  // Grupo C
  { slug: "BRA", name: "Brasil",           group: "C" },
  { slug: "MAR", name: "Marrocos",         group: "C" },
  { slug: "HAI", name: "Haiti",            group: "C" },
  { slug: "SCO", name: "Escócia",          group: "C" },
  // Grupo D
  { slug: "USA", name: "Estados Unidos",   group: "D" },
  { slug: "PAR", name: "Paraguai",         group: "D" },
  { slug: "AUS", name: "Austrália",        group: "D" },
  { slug: "TUR", name: "Turquia",          group: "D" },
  // Grupo E
  { slug: "GER", name: "Alemanha",         group: "E" },
  { slug: "CUW", name: "Curaçao",          group: "E" },
  { slug: "CIV", name: "Costa do Marfim",  group: "E" },
  { slug: "ECU", name: "Equador",          group: "E" },
  // Grupo F
  { slug: "NED", name: "Holanda",          group: "F" },
  { slug: "JPN", name: "Japão",            group: "F" },
  { slug: "SWE", name: "Suécia",           group: "F" },
  { slug: "TUN", name: "Tunísia",          group: "F" },
  // Grupo G
  { slug: "BEL", name: "Bélgica",          group: "G" },
  { slug: "EGY", name: "Egito",            group: "G" },
  { slug: "IRN", name: "Irã",              group: "G" },
  { slug: "NZL", name: "Nova Zelândia",    group: "G" },
  // Grupo H
  { slug: "ESP", name: "Espanha",          group: "H" },
  { slug: "CPV", name: "Cabo Verde",       group: "H" },
  { slug: "KSA", name: "Arábia Saudita",   group: "H" },
  { slug: "URU", name: "Uruguai",          group: "H" },
  // Grupo I
  { slug: "FRA", name: "França",           group: "I" },
  { slug: "SEN", name: "Senegal",          group: "I" },
  { slug: "IRQ", name: "Iraque",           group: "I" },
  { slug: "NOR", name: "Noruega",          group: "I" },
  // Grupo J
  { slug: "ARG", name: "Argentina",        group: "J" },
  { slug: "ALG", name: "Argélia",          group: "J" },
  { slug: "AUT", name: "Áustria",          group: "J" },
  { slug: "JOR", name: "Jordânia",         group: "J" },
  // Grupo K
  { slug: "POR", name: "Portugal",         group: "K" },
  { slug: "COD", name: "Congo",            group: "K" },
  { slug: "UZB", name: "Uzbequistão",      group: "K" },
  { slug: "COL", name: "Colômbia",         group: "K" },
  // Grupo L
  { slug: "ENG", name: "Inglaterra",       group: "L" },
  { slug: "CRO", name: "Croácia",          group: "L" },
  { slug: "GHA", name: "Gana",             group: "L" },
  { slug: "PAN", name: "Panamá",           group: "L" },
];

function escape(s) { return s.replace(/'/g, "''"); }
function pad(n) { return String(n).padStart(2, '0'); }

const lines = [];
lines.push(`-- Seed: stickers (994 figurinhas FIFA 2026)`);
lines.push(`-- 48 selecoes x 20 = 960 (national_team, is_official_album=true)`);
lines.push(`-- 20 figurinhas FWC (tournament_special, is_official_album=true)`);
lines.push(`-- 14 figurinhas CC (promotional, is_official_album=false)`);
lines.push(`-- Gerado por scripts/gen-stickers-seed.mjs -- NAO editar manualmente`);
lines.push(`-- Fonte: Modelos/album_copa_2026.md (99 paginas, 994 figurinhas)`);
lines.push(`-- section_order: pagina 1 (FWC intro) + paginas 2-97 (times) + pagina 98 (FWC historia) + pagina 99 (CC)`);
lines.push(`-- Idempotente via ON CONFLICT (natural_key) DO UPDATE`);
lines.push(``);

// --- FWC INTRO: pagina 1 (FWC00-FWC08, section_order 0-8) ---
const fwcIntro = [
  [0,'FWC00','intro','FIFA World Cup 2026 Opening'],
  [1,'FWC01','intro','FIFA World Cup 2026 Trophy'],
  [2,'FWC02','intro','FIFA World Cup 2026 Host Cities'],
  [3,'FWC03','intro','FIFA World Cup 2026 Stadiums'],
  [4,'FWC04','intro','FIFA World Cup 2026 Logo'],
  [5,'FWC05','intro','FIFA World Cup 2026 Ball'],
  [6,'FWC06','intro','FIFA World Cup 2026 Mascot'],
  [7,'FWC07','intro','FIFA World Cup 2026 Legends'],
  [8,'FWC08','intro','FIFA World Cup 2026 History'],
];
lines.push(`-- FWC Intro: pagina 1 (FWC00-FWC08, section_order 0-8)`);
lines.push(`INSERT INTO stickers (natural_key, section_type, team_slug, group_code, position_in_section, position_role, sticker_name, is_official_album, release_batch, rarity, section_order) VALUES`);
lines.push(fwcIntro.map(([so, key, role, name]) =>
  `('${key}', 'tournament_special', NULL, NULL, ${so}, '${role}', '${escape(name)}', TRUE, 'original', 'regular', ${so})`
).join(',\n') + `\nON CONFLICT (natural_key) DO UPDATE SET section_order=EXCLUDED.section_order, sticker_name=EXCLUDED.sticker_name, position_role=EXCLUDED.position_role;`);
lines.push(``);

// --- SELECOES NACIONAIS: paginas 2-97 (section_order 9-968) ---
lines.push(`-- Selecoes nacionais: Grupos A-L, paginas 2-97, section_order 9-968`);
lines.push(`INSERT INTO stickers (natural_key, section_type, team_slug, group_code, position_in_section, position_role, sticker_name, is_official_album, release_batch, rarity, section_order) VALUES`);
const teamVals = [];
TEAMS.forEach((team, idx) => {
  for (let n = 1; n <= 20; n++) {
    const role = n === 1 ? 'badge' : n === 13 ? 'team_photo' : 'player';
    const sectionOrder = 9 + idx * 20 + (n - 1);
    const naturalKey = `${team.slug}${pad(n)}`;
    teamVals.push(
      `('${naturalKey}', 'national_team', '${team.slug}', '${team.group}', ${n}, '${role}', '${escape(team.name)} ${pad(n)}', TRUE, 'original', 'regular', ${sectionOrder})`
    );
  }
});
lines.push(teamVals.join(',\n') + `\nON CONFLICT (natural_key) DO UPDATE SET section_type=EXCLUDED.section_type, team_slug=EXCLUDED.team_slug, group_code=EXCLUDED.group_code, position_in_section=EXCLUDED.position_in_section, position_role=EXCLUDED.position_role, sticker_name=EXCLUDED.sticker_name, is_official_album=EXCLUDED.is_official_album, section_order=EXCLUDED.section_order;`);
lines.push(``);

// --- FWC HISTORIA: pagina 98 (FWC09-FWC19, section_order 969-979) ---
const fwcHistory = [
  [9,'FWC09','history','FWC History 1930',969],
  [10,'FWC10','history','FWC History 1950',970],
  [11,'FWC11','history','FWC History 1958',971],
  [12,'FWC12','history','FWC History 1970',972],
  [13,'FWC13','history','FWC History 1986',973],
  [14,'FWC14','history','FWC History 1994',974],
  [15,'FWC15','history','FWC History 1998',975],
  [16,'FWC16','history','FWC History 2006',976],
  [17,'FWC17','history','FWC History 2010',977],
  [18,'FWC18','history','FWC History 2014',978],
  [19,'FWC19','history','FWC History 2022',979],
];
lines.push(`-- FWC Historia: pagina 98 (FWC09-FWC19, section_order 969-979)`);
lines.push(`INSERT INTO stickers (natural_key, section_type, team_slug, group_code, position_in_section, position_role, sticker_name, is_official_album, release_batch, rarity, section_order) VALUES`);
lines.push(fwcHistory.map(([pos, key, role, name, so]) =>
  `('${key}', 'tournament_special', NULL, NULL, ${pos}, '${role}', '${escape(name)}', TRUE, 'original', 'regular', ${so})`
).join(',\n') + `\nON CONFLICT (natural_key) DO UPDATE SET section_order=EXCLUDED.section_order, sticker_name=EXCLUDED.sticker_name, position_role=EXCLUDED.position_role;`);
lines.push(``);

// --- COCA-COLA: pagina 99 (CC01-CC14, section_order 980-993) ---
lines.push(`-- Coca-Cola: pagina 99 (CC01-CC14, section_order 980-993)`);
lines.push(`INSERT INTO stickers (natural_key, section_type, team_slug, group_code, position_in_section, position_role, sticker_name, is_official_album, release_batch, rarity, section_order) VALUES`);
const ccVals = Array.from({length:14}, (_, i) => {
  const n = i + 1;
  return `('CC${pad(n)}', 'promotional', NULL, NULL, ${n}, 'promo', 'Coca-Cola ${pad(n)}', FALSE, 'original', 'regular', ${980 + i})`;
});
lines.push(ccVals.join(',\n') + `\nON CONFLICT (natural_key) DO UPDATE SET section_order=EXCLUDED.section_order, sticker_name=EXCLUDED.sticker_name;`);
lines.push(``);

writeFileSync(out, lines.join('\n'), 'utf-8');

const totals = { fwcIntro: fwcIntro.length, teams: TEAMS.length * 20, fwcHistory: fwcHistory.length, cc: 14 };
const total = Object.values(totals).reduce((a,b) => a+b, 0);
console.log(`Seed gerado: ${out}`);
console.log(`  FWC intro (pag.1): ${totals.fwcIntro} | Times (pag.2-97): ${totals.teams} | FWC historia (pag.98): ${totals.fwcHistory} | CC (pag.99): ${totals.cc}`);
console.log(`  Total: ${total} (esperado 994: ${total === 994 ? 'OK' : 'ERRO'})`);
console.log(`  section_order: FWC intro 0-8, times 9-968, FWC historia 969-979, CC 980-993`);
