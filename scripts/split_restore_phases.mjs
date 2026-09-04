/**
 * PHASE SPLITTER v2 - Precise boundaries, all phases < 500KB
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(__dirname, '..', 'sql', '0001_master_full_restore.sql');
const OUT  = path.join(__dirname, '..', 'sql');

const allLines = fs.readFileSync(SRC, 'utf8').split('\n');
const total = allLines.length;
console.log(`Source: ${total} lines, ${(fs.statSync(SRC).size/1024/1024).toFixed(2)} MB\n`);

const HEADER = (phase, title) => `-- ══════════════════════════════════════════════════════════════════════════════
-- BMS PROJECT — MASTER RESTORE
-- PHASE ${phase}: ${title}
-- Run phases IN ORDER: 01 → 02 → 03 → ... → 11
-- ══════════════════════════════════════════════════════════════════════════════

SET statement_timeout = '0';
SET lock_timeout = '0';
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET client_min_messages = warning;

`;

// Delete old phase files
fs.readdirSync(OUT).filter(f => f.startsWith('phase_')).forEach(f => {
  fs.unlinkSync(path.join(OUT, f));
});

function writePhase(num, title, startLine, endLine) {
  const slice = allLines.slice(startLine - 1, endLine);
  const body = slice.join('\n').trim();
  if (!body) { console.log(`⚠️  Phase ${num} empty — skipped`); return null; }
  const content = HEADER(num, title) + body + '\n';
  const fname = `phase_${String(num).padStart(2,'0')}_${title.toLowerCase().replace(/[^a-z0-9]+/g,'_')}.sql`;
  fs.writeFileSync(path.join(OUT, fname), content, 'utf8');
  const kb = (content.length / 1024).toFixed(0);
  const warn = content.length > 490000 ? ' ⚠️  MAY BE TOO LARGE' : '';
  console.log(`✅ Phase ${String(num).padStart(2,' ')}: [${kb.padStart(5)} KB] ${fname}${warn}`);
  return fname;
}

// ── PHASES ──────────────────────────────────────────────────────────────────
// Phase 1 : Extensions
writePhase( 1, 'Extensions',                      1,     35);

// Phase 2 : Schema DDL Part 1 (lines 36–10000 ~387 KB)
writePhase( 2, 'Schema_DDL_Part1',                36,    10000);

// Phase 3 : Schema DDL Part 2 (lines 10001–20409 ~429 KB)
writePhase( 3, 'Schema_DDL_Part2',                10001, 20409);

// Phase 4 : RLS Enable + All Policies (lines 20410–23134 ~116 KB)
writePhase( 4, 'RLS_Enable_and_Policies',         20410, 23134);

// Phase 5 : Triggers, Grants, Realtime, Storage (lines 23135–23394 ~57 KB)
writePhase( 5, 'Triggers_Grants_Realtime_Storage', 23135, 23394);

// Phase 6 : Auth Users (lines 23348–23402 ~65 KB)
writePhase( 6, 'Auth_Users',                      23348, 23402);

// Phase 7 : Config + Profiles + Branches + Staff + Capital (23403–24031)
writePhase( 7, 'Data_Config_and_Users',           23403, 24031);

// Phase 8 : Central Inventory only (24032–24963 = ~475 KB)
writePhase( 8, 'Data_Central_Inventory',          24032, 24963);

// Phase 9 : Branch Inventory only (24964–26804 = ~984 KB) — split in half
writePhase( 9, 'Data_Branch_Inventory_A',         24964, 25884);
writePhase(10, 'Data_Branch_Inventory_B',         25885, 26804);

// Phase 10: Stock Movements + Suppliers + Sales + Cash (26805–27282)
writePhase(11, 'Data_Stock_and_Sales',            26805, 27282);

// Phase 11: Notifications + Messages + Tasks + Push (27283–27832)
writePhase(12, 'Data_Notifications_and_Push',     27283, 27832);

// Phase 12: Security Events — big table (27833–28645 ~390 KB)
writePhase(13, 'Data_Security_Events',            27833, 28645);

// Phase 13: AI Chat Messages (28646–29058 ~350 KB)
writePhase(14, 'Data_AI_Chat_Messages',           28646, 29058);

// Phase 14: Remaining sys tables + Post-restore (29059–end)
writePhase(15, 'Data_Remaining_and_Post_Restore', 29059, total);

console.log('\n══════════════════════════════════════════════════════════════════');
console.log('  ✅ ALL PHASES GENERATED — run them in order in Supabase SQL Editor');
console.log('══════════════════════════════════════════════════════════════════');
