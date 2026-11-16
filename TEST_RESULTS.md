# TEST_RESULTS.md — mehndi-design-bd (factory run #352, 2026-11-16 ~12:10 +06)

## Unit tests — 15/15 PASS
Command: `node --test tests/logic.test.js` (Node v24.22.1), run twice, green both times.
- Bank: 12 designs, 48 steps total, unique ids; 3 per category (bridal/arabic/simple/feet); 5 easy, 5 medium, 2 hard; every SVG starts with `<svg`, has a viewBox, and is >= 500 chars.
- `validateDesigns` passes on shipped data and catches bad category / bad difficulty / duplicate id / too few steps / non-SVG diagram / bad minutes when injected.
- Guide: 6 ingredients, 5 mixing + 5 application + 5 aftercare steps, 5 stain stages at hours [0, 6, 24, 48, 168].
- i18n: EN and BN have identical key sets (57 keys), no empty strings.
- Filters: bridal 3, feet 3, easy 5, hard 2, arabic+medium 2, simple+hard 0, favourites-only 2 of 2, empty filters 12.
- Search: "mandala" 4 (3 names + arabic-cuff blurb), "paisley" 1, "মণ্ডল" 4, "পায়েল" 1, id "bridal-mandala" 1, "zzzznope" 0, padded/cased "  MANDALA  " 4.
- `toBengaliDigits`: "0123456789" -> "০১২৩৪৫৬৭৮৯"; `fmtNum` picks language.
- State: toggleFav/toggleTried pure + reversible; setNote trims and clears on empty.
- Progress: 3 tried (1 bridal, 2 simple), 1 fav, 1 note; by-category totals 3 each.
- `stainStage` boundaries: 0/5->0h, 6/23->6h, 24/47->24h, 48/167->48h, 168/500->168h, negative/NaN->0h, empty stages->null.
- Export/import: round-trip preserves state exactly; rejects wrong app tag, bad version, unknown design id (favs + notes), non-string note, null/non-object input.
- Repairs during testing: 3 test-side expectation fixes only (mandala search count 3->4, difficulty mix 4 medium/3 hard -> 5 medium/2 hard, MANDALA search 3->4) — the app code was correct in each case; 0 app bugs found.

## Headless-Chrome smoke — 42/42 PASS (run twice, idempotent)
Command: `node tests/smoke.mjs .` against headless_shell-1187 (HeadlessChrome/140) via raw CDP, file:// URL. 0 console/page errors, 0 network requests.
Desktop 1280px (36 checks):
- Title "Mehndi Design BD"; 12 cards; 12 inline SVGs; count "12 / 12 designs".
- Bridal filter -> 3; bridal + hard -> 2; search "paisley" -> 1 ("Dulhan Paisley Trail"); Bangla search "মণ্ডল" -> 4.
- Star toggles to ★; favourites-only -> 1.
- Detail opens: "Rajkumari Mandala", 4 steps, 1 SVG, meta "Bridal · Hard · 90 min".
- Mark tried -> "Tried ✓"; note saves ("Note saved."); tried chip shows on the card after back.
- Guide tab: 6 ingredients, 5 mixing, 5 aftercare, 5 stain stages; stain at 24h "Developing — reddish brown"; at 48h "Peak — deep brown".
- BN toggle: title "মেহেদি ডিজাইন বিডি", count "১২ / ১২টি নকশা"; EN toggle restores.
- Progress: tried 1, favs 1, notes 1; tried list 1; notes list 1; by-category "Bridal: 1 / 3 | Arabic: 0 / 3 | Simple: 0 / 3 | Feet: 0 / 3".
Persistence (3 checks): after reload, tried/favs/notes all still 1 (localStorage `mehndi-state-v1`).
Mobile 390px (2 checks): scrollWidth 390 (no horizontal overflow), 12 cards render.
Errors/network (2 checks): 0 page console/page errors; 0 http(s) network requests.

## Visual check
Screenshot at 1280x900 (`/tmp/mehndi-gallery.png`, read 2026-11-16 ~12:06 +06): warm henna gradient header, 4 cards per row, each with a distinct stylised hand + motif (mandala, paisley, jaali lattice, vine) in henna brown on cream — renders as designed. No layout breakage, no clipped text.

## ASCII-safety
`grep -P '[^\x00-\x7F]'` over js/data.js, js/i18n.js, js/logic.js, js/app.js, index.html, css/styles.css: zero matches. Bengali exists only as `\uXXXX` escapes in JS (verified: node prints "রাজকুমারী মণ্ডল" from data.js).
