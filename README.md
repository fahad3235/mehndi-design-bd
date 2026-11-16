# Mehndi Design BD

Offline bilingual (English / বাংলা) mehndi (henna) design gallery, paste-mixing guide, and practice tracker for Bangladesh. All 12 designs are original SVG artwork drawn in code — no photos, no copied images, no network requests.

## The problem

Mehndi is everywhere in Bangladesh — Eid mornings, weddings, mehndi nights, school events — but finding a design you can actually draw means scrolling through photo-heavy apps that eat data and show designs far beyond a beginner's reach. Mehndi Design BD keeps it simple: a small gallery of drawable designs with step-by-step instructions, a paste recipe you can mix at home, and a tracker for the designs you have tried.

## Features

- **Design gallery** — 12 original designs in 4 categories (Bridal ×3, Arabic ×3, Simple ×3, Feet ×3), each drawn as a stylised hand/foot SVG with henna motifs (mandala, paisley, jaali lattice, vine, flowers, dots).
- **Filters & search** — category, difficulty (Easy / Medium / Hard), favourites-only, live search in English and Bangla.
- **How-to-draw view** — big design preview, best-for, estimated time, and 4 step-by-step application steps per design (48 steps total).
- **Favourites, tried marks & notes** — star a design, mark it tried, write a note on what worked; all saved in localStorage.
- **Paste guide** — ingredients, 5 mixing steps, 5 application tips, 5 aftercare tips, and a stain timeline (fresh paste → peak at ~48 h → fades over 1–2 weeks) plus a stain checker: enter hours since the paste came off and see the expected stain.
- **My Progress** — designs tried, favourites, notes, tried-by-category counts, JSON export / strict import, typed-DELETE erase-all.
- **Bilingual UI** — English/বাংলা toggle persisted across visits, Bengali digits in Bangla mode; works at 390 px mobile width; zero network requests.

## Stack

- Plain HTML + CSS + vanilla JavaScript (no framework, no build step).
- SVG artwork generated in code (`tools/gen.py` produces `js/data.js` + `js/i18n.js` with Bengali as `\uXXXX` escapes, so all sources stay pure ASCII).
- Tests: Node's built-in test runner + a raw-CDP headless-Chrome smoke test.

## Prerequisites

- Any modern browser (open `index.html` directly — no server needed).
- Node.js 18+ only for running the tests.

## Install & run

```bash
git clone https://github.com/fahad3235/mehndi-design-bd.git
cd mehndi-design-bd
# open index.html in a browser, or serve it:
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Development commands

```bash
# Regenerate data.js + i18n.js after editing tools/gen.py
python3 tools/gen.py

# Unit tests (15 tests)
node --test tests/logic.test.js

# Headless-Chrome smoke test (42 checks; needs Chrome with --remote-debugging-port=9222)
node tests/smoke.mjs .
```

## Environment

No environment variables, no API keys, no backend. All data lives in the browser's localStorage under the keys `mehndi-lang` and `mehndi-state-v1`.

## Testing

See `TEST_RESULTS.md` for the full record.

- `node --test tests/logic.test.js` — **15/15 pass**: data integrity (12 designs, 48 steps, valid categories/difficulties, real SVGs), guide content, i18n key parity, filters, Bangla/English search, Bengali digits, state helpers, progress stats, stain-stage boundaries, export/import round-trip and rejections.
- `node tests/smoke.mjs .` — **42/42 pass** (run twice): 12 cards + SVGs render, filters, search (EN + BN), favourite, detail view with 4 steps, mark-tried + note save, guide content, stain checker at 24 h and 48 h, Bangla toggle with Bengali digits, progress stats, persistence across reload, 390 px no-overflow, 0 console/page errors, 0 network requests.

## Deployment

Static site — any static host works. GitHub Pages: enable Pages on the `main` branch (root) and the app is live at `https://fahad3235.github.io/mehndi-design-bd/`.

## Limitations

- The designs are stylised illustrations on a drawn hand/foot, not photographs of real henna — they show the pattern layout, not the exact look of a stain.
- The paste recipe and aftercare are traditional guidance, not medical advice; sensitive skin should patch-test first. Stain times are typical values — real results vary with skin, paste quality, and how long the paste stays on.
- Progress, favourites, and notes live only in one browser's localStorage; export the JSON to move them to another device.
- Times (minutes per design) are estimates for a careful beginner, not measurements.

## Status

Complete MVP — factory run #352 (2026-11-16, 12:00 slot). Published and verified: repo public, Pages live, tests green (see `TEST_RESULTS.md`).
