// mehndi-design-bd -- unit tests for js/logic.js + js/data.js + js/i18n.js.
// Run: node --test tests/logic.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('../js/logic.js');
const D = require('../js/data.js');
const I18N = require('../js/i18n.js');

const DESIGNS = D.DESIGNS;
const GUIDE = D.GUIDE;

// ---- Data integrity: the real shipped designs ----
test('ships exactly 12 designs with 48 steps total', () => {
  assert.equal(DESIGNS.length, 12);
  assert.equal(DESIGNS.reduce((a, d) => a + d.steps.length, 0), 48);
});

test('validateDesigns passes on the shipped data', () => {
  assert.deepEqual(L.validateDesigns(DESIGNS), []);
});

test('every design has unique id, valid category/difficulty, minutes, names, blurbs, >=3 steps, real SVG', () => {
  const ids = new Set();
  const cats = new Set();
  const diffs = new Set();
  for (const d of DESIGNS) {
    assert.ok(d.id && !ids.has(d.id), 'duplicate id ' + d.id);
    ids.add(d.id);
    cats.add(d.cat);
    diffs.add(d.diff);
    assert.ok(d.name.en && d.name.bn, d.id + ' name');
    assert.ok(d.blurb.en && d.blurb.bn, d.id + ' blurb');
    assert.ok(d.bestFor.en && d.bestFor.bn, d.id + ' bestFor');
    assert.ok(d.minutes > 0 && d.minutes <= 180, d.id + ' minutes');
    assert.ok(d.steps.length >= 3, d.id + ' steps');
    for (const s of d.steps) {
      assert.ok(s.en && s.bn, d.id + ' step text');
    }
    assert.ok(d.svg.startsWith('<svg') && d.svg.includes('</svg>'), d.id + ' svg');
    assert.ok(d.svg.length >= 500, d.id + ' svg too short');
    assert.ok(d.svg.includes('viewBox'), d.id + ' svg viewBox');
  }
  assert.deepEqual([...cats].sort(), ['arabic', 'bridal', 'feet', 'simple']);
  assert.deepEqual([...diffs].sort(), ['easy', 'hard', 'medium']);
});

test('category/difficulty mix: 3 per category; 5 easy, 5 medium, 2 hard', () => {
  const count = (k, v) => DESIGNS.filter((d) => d[k] === v).length;
  for (const c of L.CATS) assert.equal(count('cat', c), 3, c);
  assert.equal(count('diff', 'easy'), 5);
  assert.equal(count('diff', 'medium'), 5);
  assert.equal(count('diff', 'hard'), 2);
});

test('validateDesigns catches bad data', () => {
  const bad = JSON.parse(JSON.stringify(DESIGNS));
  bad[0].cat = 'nope';
  bad[1].diff = 'Impossible';
  bad[2].id = bad[0].id;
  bad[3].steps = [];
  bad[4].svg = 'not svg';
  bad[5].minutes = 0;
  const errs = L.validateDesigns(bad);
  assert.ok(errs.some((e) => e.includes('bad category')));
  assert.ok(errs.some((e) => e.includes('bad difficulty')));
  assert.ok(errs.some((e) => e.includes('duplicate id')));
  assert.ok(errs.some((e) => e.includes('too few steps')));
  assert.ok(errs.some((e) => e.includes('not SVG')));
  assert.ok(errs.some((e) => e.includes('bad minutes')));
  assert.deepEqual(L.validateDesigns([]), ['no designs']);
});

test('guide content: 6 ingredients, 5+5+5 steps, 5 stain stages', () => {
  assert.equal(GUIDE.ingredients.length, 6);
  assert.equal(GUIDE.mixing.length, 5);
  assert.equal(GUIDE.application.length, 5);
  assert.equal(GUIDE.aftercare.length, 5);
  assert.equal(GUIDE.stainStages.length, 5);
  for (const list of [GUIDE.ingredients, GUIDE.mixing, GUIDE.application, GUIDE.aftercare]) {
    for (const s of list) assert.ok(s.en && s.bn, 'guide item text');
  }
  const hours = GUIDE.stainStages.map((s) => s.hours);
  assert.deepEqual(hours, [0, 6, 24, 48, 168]);
});

test('i18n: EN and BN have identical key sets, no empty strings', () => {
  const en = Object.keys(I18N.en).sort();
  const bn = Object.keys(I18N.bn).sort();
  assert.deepEqual(bn, en);
  assert.ok(en.length >= 50, 'key count ' + en.length);
  for (const k of en) {
    assert.ok(I18N.en[k].length > 0, 'en empty ' + k);
    assert.ok(I18N.bn[k].length > 0, 'bn empty ' + k);
  }
});

// ---- Filters ----
test('filters: category, difficulty, combined, favourites-only', () => {
  assert.equal(L.filterDesigns(DESIGNS, { cat: 'bridal' }).length, 3);
  assert.equal(L.filterDesigns(DESIGNS, { cat: 'feet' }).length, 3);
  assert.equal(L.filterDesigns(DESIGNS, { diff: 'easy' }).length, 5);
  assert.equal(L.filterDesigns(DESIGNS, { diff: 'hard' }).length, 2);
  assert.equal(L.filterDesigns(DESIGNS, { cat: 'arabic', diff: 'medium' }).length, 2);
  assert.equal(L.filterDesigns(DESIGNS, { cat: 'simple', diff: 'hard' }).length, 0);
  const favs = { 'simple-mandala': true, 'bridal-mandala': true };
  assert.equal(L.filterDesigns(DESIGNS, { favOnly: true, favs }).length, 2);
  assert.equal(L.filterDesigns(DESIGNS, { favOnly: true, favs: {} }).length, 0);
  assert.equal(L.filterDesigns(DESIGNS, {}).length, 12);
});

test('search: English, Bangla, id, no-match', () => {
  assert.equal(L.filterDesigns(DESIGNS, { q: 'mandala' }).length, 4); // 3 names + arabic-cuff blurb
  assert.equal(L.filterDesigns(DESIGNS, { q: 'paisley' }).length, 1);
  assert.equal(L.filterDesigns(DESIGNS, { q: 'মণ্ডল' }).length, 4);
  assert.equal(L.filterDesigns(DESIGNS, { q: 'পায়েল' }).length, 1);
  assert.equal(L.filterDesigns(DESIGNS, { q: 'bridal-mandala' }).length, 1);
  assert.equal(L.filterDesigns(DESIGNS, { q: 'zzzznope' }).length, 0);
  assert.equal(L.filterDesigns(DESIGNS, { q: '  MANDALA  ' }).length, 4);
});

// ---- Digits ----
test('toBengaliDigits converts 0-9; fmtNum picks language', () => {
  assert.equal(L.toBengaliDigits('0123456789'), '০১২৩৪৫৬৭৮৯');
  assert.equal(L.toBengaliDigits(90), '৯০');
  assert.equal(L.fmtNum(12, 'bn'), '১২');
  assert.equal(L.fmtNum(12, 'en'), '12');
});

// ---- State helpers ----
test('toggleFav / toggleTried are pure and reversible', () => {
  const s0 = L.emptyState();
  const s1 = L.toggleFav(s0, 'simple-mandala');
  assert.ok(s1.favs['simple-mandala']);
  assert.ok(!s0.favs['simple-mandala'], 'original untouched');
  const s2 = L.toggleFav(s1, 'simple-mandala');
  assert.ok(!s2.favs['simple-mandala']);
  const s3 = L.toggleTried(s0, 'feet-toe');
  assert.ok(s3.tried['feet-toe']);
  assert.ok(!s3.favs['feet-toe']);
});

test('setNote trims, stores, and clears on empty', () => {
  let s = L.setNote(L.emptyState(), 'simple-dots', '  good first try  ');
  assert.equal(s.notes['simple-dots'], 'good first try');
  s = L.setNote(s, 'simple-dots', '   ');
  assert.ok(!('simple-dots' in s.notes));
});

test('progressStats counts tried/favs/notes and by-category totals', () => {
  let s = L.emptyState();
  s = L.toggleTried(s, 'bridal-mandala');
  s = L.toggleTried(s, 'simple-mandala');
  s = L.toggleTried(s, 'simple-dots');
  s = L.toggleFav(s, 'bridal-mandala');
  s = L.setNote(s, 'simple-dots', 'nice');
  const st = L.progressStats(DESIGNS, s);
  assert.equal(st.tried, 3);
  assert.equal(st.favs, 1);
  assert.equal(st.notes, 1);
  assert.equal(st.byCat.bridal, 1);
  assert.equal(st.byCat.simple, 2);
  assert.equal(st.byCat.arabic, 0);
  assert.equal(st.totalByCat.feet, 3);
  assert.deepEqual(L.progressStats(DESIGNS, L.emptyState()).byCat, { bridal: 0, arabic: 0, simple: 0, feet: 0 });
});

// ---- Stain stages ----
test('stainStage picks the right stage at boundaries', () => {
  const stages = GUIDE.stainStages;
  assert.equal(L.stainStage(stages, 0).hours, 0);
  assert.equal(L.stainStage(stages, 5).hours, 0);
  assert.equal(L.stainStage(stages, 6).hours, 6);
  assert.equal(L.stainStage(stages, 23).hours, 6);
  assert.equal(L.stainStage(stages, 24).hours, 24);
  assert.equal(L.stainStage(stages, 47).hours, 24);
  assert.equal(L.stainStage(stages, 48).hours, 48);
  assert.equal(L.stainStage(stages, 167).hours, 48);
  assert.equal(L.stainStage(stages, 168).hours, 168);
  assert.equal(L.stainStage(stages, 500).hours, 168);
  assert.equal(L.stainStage(stages, -5).hours, 0);
  assert.equal(L.stainStage(stages, NaN).hours, 0);
  assert.equal(L.stainStage([], 10), null);
});

// ---- Export / import ----
test('export/import round-trip; rejects wrong tag, version, unknown ids, bad notes', () => {
  let s = L.emptyState();
  s = L.toggleFav(s, 'bridal-paisley');
  s = L.toggleTried(s, 'feet-anklet');
  s = L.setNote(s, 'feet-anklet', 'anklet was tricky');
  const exported = L.exportData(s);
  assert.equal(exported.app, 'mehndi-design-bd');
  assert.equal(exported.version, 1);
  const res = L.importData(JSON.parse(JSON.stringify(exported)), DESIGNS);
  assert.ok(res.ok);
  assert.deepEqual(res.state, s);
  assert.deepEqual(L.validateImport(exported, DESIGNS), []);
  const badTag = Object.assign({}, exported, { app: 'other-app' });
  assert.ok(L.validateImport(badTag, DESIGNS).some((e) => e.includes('wrong app tag')));
  const badVer = Object.assign({}, exported, { version: 99 });
  assert.ok(L.validateImport(badVer, DESIGNS).some((e) => e.includes('bad version')));
  const badId = Object.assign({}, exported, { favs: ['no-such-design'] });
  assert.ok(L.validateImport(badId, DESIGNS).some((e) => e.includes('unknown design id')));
  const badNotes = Object.assign({}, exported, { notes: { 'no-such-design': 'x' } });
  assert.ok(L.validateImport(badNotes, DESIGNS).some((e) => e.includes('unknown design id')));
  const badNotes2 = Object.assign({}, exported, { notes: { 'feet-anklet': 42 } });
  assert.ok(L.validateImport(badNotes2, DESIGNS).some((e) => e.includes('bad note')));
  assert.equal(L.importData(null, DESIGNS).ok, false);
  assert.equal(L.importData('nope', DESIGNS).ok, false);
});
