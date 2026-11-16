// mehndi-design-bd -- pure logic (no DOM). Shared by the app and the tests.
// Classic script: defines window.MEHNDI_LOGIC in the browser and module.exports in node.
(function (root) {
  'use strict';

  var CATS = ['bridal', 'arabic', 'simple', 'feet'];
  var DIFFS = ['easy', 'medium', 'hard'];
  var BN_DIGITS = ['\u09E6', '\u09E7', '\u09E8', '\u09E9', '\u09EA', '\u09EB', '\u09EC', '\u09ED', '\u09EE', '\u09EF'];
  var APP_TAG = 'mehndi-design-bd';
  var EXPORT_VERSION = 1;

  function toBengaliDigits(value) {
    return String(value).replace(/[0-9]/g, function (d) { return BN_DIGITS[+d]; });
  }

  function fmtNum(value, lang) {
    return lang === 'bn' ? toBengaliDigits(value) : String(value);
  }

  function isDesign(d) {
    return d && typeof d.id === 'string' && d.id.length > 0;
  }

  function validateDesigns(designs) {
    var errs = [];
    if (!Array.isArray(designs) || designs.length === 0) return ['no designs'];
    var ids = {};
    designs.forEach(function (d, i) {
      var where = 'design[' + i + ']';
      if (!d.id) { errs.push(where + ': missing id'); return; }
      if (ids[d.id]) errs.push(where + ': duplicate id ' + d.id);
      ids[d.id] = true;
      if (CATS.indexOf(d.cat) === -1) errs.push(d.id + ': bad category ' + d.cat);
      if (DIFFS.indexOf(d.diff) === -1) errs.push(d.id + ': bad difficulty ' + d.diff);
      if (!(d.minutes > 0 && d.minutes <= 180)) errs.push(d.id + ': bad minutes ' + d.minutes);
      if (!d.name || !d.name.en || !d.name.bn) errs.push(d.id + ': missing name');
      if (!d.blurb || !d.blurb.en || !d.blurb.bn) errs.push(d.id + ': missing blurb');
      if (!d.bestFor || !d.bestFor.en || !d.bestFor.bn) errs.push(d.id + ': missing bestFor');
      if (!Array.isArray(d.steps) || d.steps.length < 3) errs.push(d.id + ': too few steps');
      else d.steps.forEach(function (s, j) {
        if (!s.en || !s.bn) errs.push(d.id + ': step ' + j + ' missing text');
      });
      if (typeof d.svg !== 'string' || d.svg.indexOf('<svg') !== 0 || d.svg.indexOf('</svg>') === -1) {
        errs.push(d.id + ': diagram is not SVG');
      }
      if (typeof d.svg === 'string' && d.svg.length < 500) errs.push(d.id + ': diagram too short');
    });
    return errs;
  }

  // Search text: EN name/blurb/bestFor + BN name/blurb + romanized id.
  function designText(d) {
    return [d.id, d.name.en, d.name.bn, d.blurb.en, d.blurb.bn, d.bestFor.en, d.bestFor.bn]
      .join(' ').toLowerCase();
  }

  function filterDesigns(designs, opts) {
    var q = (opts.q || '').trim().toLowerCase();
    return designs.filter(function (d) {
      if (opts.cat && opts.cat !== 'all' && d.cat !== opts.cat) return false;
      if (opts.diff && opts.diff !== 'all' && d.diff !== opts.diff) return false;
      if (opts.favOnly && !(opts.favs || {})[d.id]) return false;
      if (q && designText(d).indexOf(q) === -1) return false;
      return true;
    });
  }

  // ---- state (favourites, tried, notes) ----
  function emptyState() {
    return { favs: {}, tried: {}, notes: {} };
  }

  function toggleFav(state, id) {
    var next = { favs: Object.assign({}, state.favs), tried: Object.assign({}, state.tried), notes: Object.assign({}, state.notes) };
    if (next.favs[id]) delete next.favs[id]; else next.favs[id] = true;
    return next;
  }

  function toggleTried(state, id) {
    var next = { favs: Object.assign({}, state.favs), tried: Object.assign({}, state.tried), notes: Object.assign({}, state.notes) };
    if (next.tried[id]) delete next.tried[id]; else next.tried[id] = true;
    return next;
  }

  function setNote(state, id, text) {
    var next = { favs: Object.assign({}, state.favs), tried: Object.assign({}, state.tried), notes: Object.assign({}, state.notes) };
    var t = String(text == null ? '' : text).trim();
    if (t) next.notes[id] = t; else delete next.notes[id];
    return next;
  }

  function progressStats(designs, state) {
    var triedIds = Object.keys(state.tried || {});
    var favIds = Object.keys(state.favs || {});
    var noteIds = Object.keys(state.notes || {});
    var byCat = {};
    CATS.forEach(function (c) { byCat[c] = 0; });
    var totalByCat = {};
    CATS.forEach(function (c) { totalByCat[c] = 0; });
    designs.forEach(function (d) {
      totalByCat[d.cat] += 1;
      if (state.tried[d.id]) byCat[d.cat] += 1;
    });
    return {
      tried: triedIds.length,
      favs: favIds.length,
      notes: noteIds.length,
      byCat: byCat,
      totalByCat: totalByCat,
      triedIds: triedIds.sort(),
      favIds: favIds.sort(),
    };
  }

  // ---- stain timeline ----
  // GUIDE stain stages: {hours, label}. Returns the stage label for `hours`
  // since the paste was scraped off (negative -> first stage).
  function stainStage(stages, hours) {
    if (!Array.isArray(stages) || stages.length === 0) return null;
    var h = (typeof hours === 'number' && isFinite(hours)) ? hours : 0;
    if (h < 0) h = 0;
    var current = stages[0];
    stages.forEach(function (s) {
      if (h >= s.hours) current = s;
    });
    return current;
  }

  // ---- export / import ----
  function exportData(state) {
    return {
      app: APP_TAG,
      version: EXPORT_VERSION,
      favs: Object.keys(state.favs || {}).sort(),
      tried: Object.keys(state.tried || {}).sort(),
      notes: state.notes || {},
    };
  }

  function validateImport(obj, designs) {
    var errs = [];
    if (!obj || typeof obj !== 'object') return ['not an object'];
    if (obj.app !== APP_TAG) errs.push('wrong app tag');
    if (obj.version !== EXPORT_VERSION) errs.push('bad version');
    var known = {};
    (designs || []).forEach(function (d) { known[d.id] = true; });
    ['favs', 'tried'].forEach(function (key) {
      if (!Array.isArray(obj[key])) { errs.push(key + ' not an array'); return; }
      obj[key].forEach(function (id) {
        if (typeof id !== 'string' || !known[id]) errs.push(key + ': unknown design id ' + id);
      });
    });
    if (obj.notes == null || typeof obj.notes !== 'object' || Array.isArray(obj.notes)) {
      errs.push('notes not an object');
    } else {
      Object.keys(obj.notes).forEach(function (id) {
        if (!known[id]) errs.push('notes: unknown design id ' + id);
        else if (typeof obj.notes[id] !== 'string') errs.push('notes: bad note for ' + id);
      });
    }
    return errs;
  }

  function importData(obj, designs) {
    var errs = validateImport(obj, designs);
    if (errs.length) return { ok: false, errors: errs, state: null };
    var state = emptyState();
    obj.favs.forEach(function (id) { state.favs[id] = true; });
    obj.tried.forEach(function (id) { state.tried[id] = true; });
    Object.keys(obj.notes).forEach(function (id) { state.notes[id] = obj.notes[id]; });
    return { ok: true, errors: [], state: state };
  }

  var api = {
    CATS: CATS, DIFFS: DIFFS, APP_TAG: APP_TAG, EXPORT_VERSION: EXPORT_VERSION,
    toBengaliDigits: toBengaliDigits, fmtNum: fmtNum,
    validateDesigns: validateDesigns, filterDesigns: filterDesigns,
    emptyState: emptyState, toggleFav: toggleFav, toggleTried: toggleTried, setNote: setNote,
    progressStats: progressStats, stainStage: stainStage,
    exportData: exportData, validateImport: validateImport, importData: importData,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MEHNDI_LOGIC = api;
})(typeof window !== 'undefined' ? window : globalThis);
