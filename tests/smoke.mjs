// mehndi-design-bd - headless-Chrome smoke test (raw CDP, file://).
// Usage: node tests/smoke.mjs [app-dir]
// Expects Chrome/headless_shell already running with --remote-debugging-port=9222.
// Prints PASS/FAIL lines, exits non-zero on failure or any page console error.
import path from 'node:path';

const PORT = process.env.CHROME_PORT || '9222';
const APP_DIR = process.argv[2] || process.cwd();
const appUrl = 'file://' + path.resolve(APP_DIR, 'index.html');

let failures = 0;
function check(name, ok, extra = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? ' — ' + extra : ''}`);
  if (!ok) failures++;
}

async function getJson(p, method = 'GET') {
  const res = await fetch(`http://127.0.0.1:${PORT}${p}`, { method });
  return res.json();
}

async function main() {
  const target = await getJson(`/json/new?${encodeURIComponent(appUrl)}`, 'PUT');
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

  let msgId = 0;
  const pending = new Map();
  const exceptions = [];
  const netRequests = [];
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
    if (msg.method === 'Runtime.exceptionThrown') {
      exceptions.push(msg.params.exceptionDetails?.exception?.description || msg.params.exceptionDetails?.text || 'unknown exception');
    }
    if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
      exceptions.push('console.error: ' + JSON.stringify(msg.params.args.map((a) => a.value ?? a.description)));
    }
    if (msg.method === 'Network.requestWillBeSent' && /^https?:/.test(msg.params.request?.url || '')) {
      netRequests.push(msg.params.request.url);
    }
  };
  const send = (method, params = {}) => new Promise((resolve) => {
    const id = ++msgId;
    pending.set(id, resolve);
    ws.send(JSON.stringify({ id, method, params }));
  });
  const evalJs = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
    if (r.result?.exceptionDetails) return { error: r.result.exceptionDetails.exception?.description || 'eval exception' };
    return { value: r.result?.result?.value };
  };

  await send('Runtime.enable');
  await send('Page.enable');
  await send('Network.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  await new Promise((r) => setTimeout(r, 1200));
  await send('Runtime.evaluate', { expression: `localStorage.clear()`, returnByValue: true });
  await send('Page.reload', { ignoreCache: true });
  await new Promise((r) => setTimeout(r, 1200));

  const desktop = await evalJs(`(async () => {
    const out = {};
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    out.title = document.querySelector('h1').textContent;
    out.cardCount = document.querySelectorAll('#cardGrid .card').length;
    out.libCount = document.getElementById('libCount').textContent;
    out.svgCount = document.querySelectorAll('#cardGrid .card svg').length;
    // Category filter: bridal
    const fc = document.getElementById('filterCat');
    fc.value = 'bridal'; fc.dispatchEvent(new Event('change'));
    out.bridalCount = document.querySelectorAll('#cardGrid .card').length;
    // Difficulty filter: hard (within bridal)
    const fd = document.getElementById('filterDiff');
    fd.value = 'hard'; fd.dispatchEvent(new Event('change'));
    out.bridalHardCount = document.querySelectorAll('#cardGrid .card').length;
    // Reset, search English
    fc.value = 'all'; fc.dispatchEvent(new Event('change'));
    fd.value = 'all'; fd.dispatchEvent(new Event('change'));
    const sb = document.getElementById('searchBox');
    sb.value = 'paisley'; sb.dispatchEvent(new Event('input'));
    out.searchPaisley = document.querySelectorAll('#cardGrid .card').length;
    out.searchPaisleyName = document.querySelector('#cardGrid .card .card-name')?.textContent || '';
    // Bangla search
    sb.value = 'মণ্ডল'; sb.dispatchEvent(new Event('input'));
    out.searchBn = document.querySelectorAll('#cardGrid .card').length;
    sb.value = ''; sb.dispatchEvent(new Event('input'));
    // Favourite first card, then favourites-only
    const star = document.querySelector('#cardGrid .card .star');
    star.click();
    out.starAfter = document.querySelector('#cardGrid .card .star').textContent;
    const fo = document.getElementById('favOnly');
    fo.checked = true; fo.dispatchEvent(new Event('change'));
    out.favOnlyCount = document.querySelectorAll('#cardGrid .card').length;
    fo.checked = false; fo.dispatchEvent(new Event('change'));
    // Open detail of first card
    document.querySelector('#cardGrid .card .btn-detail').click();
    out.detailVisible = !document.getElementById('detailView').hidden;
    out.detailName = document.getElementById('detailName').textContent;
    out.detailSteps = document.querySelectorAll('#detailSteps li').length;
    out.detailSvg = document.querySelectorAll('#detailSvg svg').length;
    out.detailMeta = document.getElementById('detailMeta').textContent;
    // Mark tried
    document.getElementById('detailTried').click();
    out.triedBtn = document.getElementById('detailTried').textContent;
    // Save a note
    document.getElementById('noteBox').value = 'first try - lines a bit wobbly';
    document.getElementById('saveNoteBtn').click();
    out.noteMsg = document.getElementById('noteMsg').textContent;
    // Back to gallery: tried chip shows
    document.getElementById('backBtn').click();
    out.triedChip = document.querySelector('#cardGrid .card .tried-chip')?.textContent || '';
    // Guide tab
    document.getElementById('tabBtn-guide').click();
    out.guideVisible = !document.getElementById('tab-guide').hidden;
    out.ingCount = document.querySelectorAll('#guideIngredients li').length;
    out.mixCount = document.querySelectorAll('#guideMixing li').length;
    out.careCount = document.querySelectorAll('#guideCare li').length;
    out.stainStages = document.querySelectorAll('#stainTimeline li').length;
    out.stainDefault = document.getElementById('stainResult').textContent;
    const sh = document.getElementById('stainHours');
    sh.value = '48'; sh.dispatchEvent(new Event('input'));
    out.stain48 = document.getElementById('stainResult').textContent;
    // Bengali toggle
    document.getElementById('langToggle').click();
    out.titleBn = document.querySelector('h1').textContent;
    document.getElementById('tabBtn-gallery').click();
    out.countBn = document.getElementById('libCount').textContent;
    document.getElementById('langToggle').click();
    out.titleEn = document.querySelector('h1').textContent;
    // Progress tab
    document.getElementById('tabBtn-progress').click();
    out.statTried = document.getElementById('statTried').textContent;
    out.statFavs = document.getElementById('statFavs').textContent;
    out.statNotes = document.getElementById('statNotes').textContent;
    out.triedListCount = document.querySelectorAll('#triedList li').length;
    out.notesListCount = document.querySelectorAll('#notesList li').length;
    out.byCat = [...document.querySelectorAll('#statByCat li')].map((li) => li.textContent).join(' | ');
    // Persistence across reload
    await sleep(200);
    return out;
  })()`);

  if (desktop.error) { check('desktop eval ran', false, desktop.error); }
  else {
    const d = desktop.value;
    check('title is Mehndi Design BD', d.title === 'Mehndi Design BD', d.title);
    check('12 cards render', d.cardCount === 12, String(d.cardCount));
    check('12 inline SVGs render', d.svgCount === 12, String(d.svgCount));
    check('count line 12 / 12', d.libCount === '12 / 12 designs', d.libCount);
    check('bridal filter -> 3', d.bridalCount === 3, String(d.bridalCount));
    check('bridal + hard -> 2', d.bridalHardCount === 2, String(d.bridalHardCount));
    check('search paisley -> 1', d.searchPaisley === 1, String(d.searchPaisley));
    check('search paisley name is Dulhan Paisley Trail', d.searchPaisleyName === 'Dulhan Paisley Trail', d.searchPaisleyName);
    check('Bangla search মণ্ডল -> 4', d.searchBn === 4, String(d.searchBn));
    check('star toggles to filled', d.starAfter === '★', JSON.stringify(d.starAfter));
    check('favourites-only -> 1', d.favOnlyCount === 1, String(d.favOnlyCount));
    check('detail view opens', d.detailVisible === true);
    check('detail name is Rajkumari Mandala', d.detailName === 'Rajkumari Mandala', d.detailName);
    check('detail shows 4 steps', d.detailSteps === 4, String(d.detailSteps));
    check('detail shows the SVG', d.detailSvg === 1, String(d.detailSvg));
    check('detail meta has Bridal, Hard, 90 min', d.detailMeta.includes('Bridal') && d.detailMeta.includes('Hard') && d.detailMeta.includes('90 min'), d.detailMeta);
    check('mark tried -> Tried ✓', d.triedBtn.includes('Tried'), d.triedBtn);
    check('note saved message', d.noteMsg === 'Note saved.', d.noteMsg);
    check('tried chip on card after back', d.triedChip.includes('Tried'), d.triedChip);
    check('guide tab visible', d.guideVisible === true);
    check('6 ingredients', d.ingCount === 6, String(d.ingCount));
    check('5 mixing steps', d.mixCount === 5, String(d.mixCount));
    check('5 aftercare steps', d.careCount === 5, String(d.careCount));
    check('5 stain stages', d.stainStages === 5, String(d.stainStages));
    check('stain at 24h is Developing — reddish brown', d.stainDefault === 'Developing — reddish brown', d.stainDefault);
    check('stain at 48h is Peak — deep brown', d.stain48 === 'Peak — deep brown', d.stain48);
    check('BN toggle title', d.titleBn === 'মেহেদি ডিজাইন বিডি', d.titleBn);
    check('BN count ১২ / ১২', d.countBn === '১২ / ১২টি নকশা', d.countBn);
    check('EN toggle restores title', d.titleEn === 'Mehndi Design BD', d.titleEn);
    check('progress: tried 1', d.statTried === '1', d.statTried);
    check('progress: favs 1', d.statFavs === '1', d.statFavs);
    check('progress: notes 1', d.statNotes === '1', d.statNotes);
    check('tried list has 1 entry', d.triedListCount === 1, String(d.triedListCount));
    check('notes list has 1 entry', d.notesListCount === 1, String(d.notesListCount));
    check('by-category tried line', d.byCat.includes('Bridal: 1 / 3'), d.byCat);
  }

  // Reload: state persists
  await send('Page.reload', { ignoreCache: true });
  await new Promise((r) => setTimeout(r, 1200));
  const after = await evalJs(`(() => ({
    tried: document.getElementById('statTried')?.textContent,
    stored: JSON.parse(localStorage.getItem('mehndi-state-v1') || '{}'),
    lang: localStorage.getItem('mehndi-lang'),
  }))()`);
  // statTried is on progress tab (hidden but present in DOM)
  await send('Runtime.evaluate', { expression: `document.getElementById('tabBtn-progress').click()`, returnByValue: true });
  await new Promise((r) => setTimeout(r, 400));
  const after2 = await evalJs(`(() => ({
    tried: document.getElementById('statTried').textContent,
    favs: document.getElementById('statFavs').textContent,
    notes: document.getElementById('statNotes').textContent,
  }))()`);
  check('state persists after reload (tried 1)', after2.value?.tried === '1', JSON.stringify(after2.value));
  check('state persists after reload (favs 1)', after2.value?.favs === '1', JSON.stringify(after2.value));
  check('state persists after reload (notes 1)', after2.value?.notes === '1', JSON.stringify(after2.value));

  // Mobile 390px: no horizontal overflow
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await send('Runtime.evaluate', { expression: `document.getElementById('tabBtn-gallery').click()`, returnByValue: true });
  await new Promise((r) => setTimeout(r, 600));
  const mob = await evalJs(`(() => ({
    scrollW: document.documentElement.scrollWidth,
    innerW: window.innerWidth,
    cards: document.querySelectorAll('#cardGrid .card').length,
  }))()`);
  check('390px: no horizontal overflow', mob.value && mob.value.scrollW <= 391, JSON.stringify(mob.value));
  check('390px: 12 cards still render', mob.value && mob.value.cards === 12, String(mob.value?.cards));

  check('zero page console/page errors', exceptions.length === 0, exceptions.slice(0, 3).join(' | '));
  check('zero network requests', netRequests.length === 0, netRequests.slice(0, 3).join(', '));

  ws.close();
  console.log(failures === 0 ? 'SMOKE: ALL PASS' : `SMOKE: ${failures} FAILURE(S)`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => { console.error('SMOKE HARNESS ERROR', e); process.exit(2); });
