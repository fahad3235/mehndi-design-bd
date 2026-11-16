// mehndi-design-bd -- DOM glue. Loads DESIGNS/GUIDE (data.js), I18N (i18n.js),
// MEHNDI_LOGIC (logic.js). All state in localStorage; zero network requests.
(function () {
  'use strict';

  var L = window.MEHNDI_LOGIC;
  var DESIGNS = window.MEHNDI_DATA.DESIGNS;
  var GUIDE = window.MEHNDI_DATA.GUIDE;
  var I18N = window.MEHNDI_I18N;

  var LS_LANG = 'mehndi-lang';
  var LS_STATE = 'mehndi-state-v1';
  var lang = 'en';
  try { lang = localStorage.getItem(LS_LANG) || 'en'; } catch (e) { lang = 'en'; }
  if (lang !== 'bn' && lang !== 'en') lang = 'en';

  var state = L.emptyState();
  try {
    var raw = localStorage.getItem(LS_STATE);
    if (raw) {
      var parsed = JSON.parse(raw);
      var res = L.importData(parsed, DESIGNS);
      if (res.ok) state = res.state;
    }
  } catch (e) { state = L.emptyState(); }

  var currentDetail = null;

  function t(key) {
    var s = (I18N[lang] && I18N[lang][key]) || I18N.en[key] || key;
    return s;
  }
  function tn(key, n) {
    return t(key).replace('{n}', L.fmtNum(n, lang));
  }
  function saveState() {
    try { localStorage.setItem(LS_STATE, JSON.stringify(L.exportData(state))); } catch (e) {}
  }
  function saveLang() {
    try { localStorage.setItem(LS_LANG, lang); } catch (e) {}
  }
  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ---------- tabs ----------
  function showTab(name) {
    ['gallery', 'guide', 'progress'].forEach(function (n) {
      $('tab-' + n).hidden = (n !== name);
      $('tabBtn-' + n).classList.toggle('active', n === name);
      $('tabBtn-' + n).setAttribute('aria-selected', n === name ? 'true' : 'false');
    });
    if (name === 'progress') renderProgress();
  }

  // ---------- gallery ----------
  function currentFilters() {
    return {
      cat: $('filterCat').value,
      diff: $('filterDiff').value,
      q: $('searchBox').value,
      favOnly: $('favOnly').checked,
      favs: state.favs,
    };
  }

  function renderGallery() {
    var list = L.filterDesigns(DESIGNS, currentFilters());
    var grid = $('cardGrid');
    grid.innerHTML = '';
    list.forEach(function (d) {
      var card = document.createElement('article');
      card.className = 'card';
      card.dataset.id = d.id;
      var isFav = !!state.favs[d.id];
      var isTried = !!state.tried[d.id];
      card.innerHTML =
        '<div class="card-svg">' + d.svg + '</div>' +
        '<div class="card-body">' +
          '<h3 class="card-name">' + esc(d.name[lang]) + '</h3>' +
          '<p class="card-blurb">' + esc(d.blurb[lang]) + '</p>' +
          '<p class="card-meta"><span class="chip">' + esc(t(d.cat)) + '</span> ' +
          '<span class="chip">' + esc(t(d.diff)) + '</span> ' +
          '<span class="chip">' + esc(tn('minutes', d.minutes)) + '</span>' +
          (isTried ? ' <span class="chip tried-chip">' + esc(t('tried')) + '</span>' : '') +
          '</p>' +
          '<div class="card-actions">' +
            '<button class="btn primary btn-detail" type="button">' + esc(t('how_to')) + '</button>' +
            '<button class="star" type="button" aria-label="' + esc(t('favourite')) + '">' + (isFav ? '\u2605' : '\u2606') + '</button>' +
          '</div>' +
        '</div>';
      card.querySelector('.btn-detail').addEventListener('click', function () { openDetail(d.id); });
      card.querySelector('.star').addEventListener('click', function () {
        state = L.toggleFav(state, d.id);
        saveState();
        renderGallery();
      });
      grid.appendChild(card);
    });
    if (!list.length) {
      var p = document.createElement('p');
      p.className = 'empty';
      p.textContent = t('no_results');
      grid.appendChild(p);
    }
    $('libCount').textContent = t('of_total').replace('{a}', L.fmtNum(list.length, lang)).replace('{b}', L.fmtNum(DESIGNS.length, lang));
  }

  // ---------- detail ----------
  function openDetail(id) {
    var d = null;
    DESIGNS.forEach(function (x) { if (x.id === id) d = x; });
    if (!d) return;
    currentDetail = id;
    $('detailSvg').innerHTML = d.svg;
    $('detailName').textContent = d.name[lang];
    $('detailMeta').textContent = t(d.cat) + ' \u00b7 ' + t(d.diff) + ' \u00b7 ' + tn('minutes', d.minutes);
    $('detailBlurb').textContent = d.blurb[lang];
    $('detailBest').textContent = t('best_for') + ': ' + d.bestFor[lang];
    var ol = $('detailSteps');
    ol.innerHTML = '';
    d.steps.forEach(function (s, i) {
      var li = document.createElement('li');
      li.innerHTML = '<strong>' + esc(t('step').replace('{n}', L.fmtNum(i + 1, lang))) + ':</strong> ' + esc(s[lang]);
      ol.appendChild(li);
    });
    refreshDetailButtons();
    $('noteBox').value = state.notes[id] || '';
    $('noteMsg').textContent = '';
    $('galleryView').hidden = true;
    $('detailView').hidden = false;
    window.scrollTo(0, 0);
  }

  function refreshDetailButtons() {
    if (!currentDetail) return;
    var favBtn = $('detailFav');
    favBtn.textContent = (state.favs[currentDetail] ? '\u2605 ' : '\u2606 ') + t('favourite');
    var triedBtn = $('detailTried');
    triedBtn.textContent = state.tried[currentDetail] ? t('tried') : t('mark_tried');
    triedBtn.classList.toggle('done', !!state.tried[currentDetail]);
  }

  function closeDetail() {
    currentDetail = null;
    $('detailView').hidden = true;
    $('galleryView').hidden = false;
    renderGallery();
  }

  // ---------- guide ----------
  function renderGuide() {
    function fillList(id, items) {
      var ul = $(id);
      ul.innerHTML = '';
      items.forEach(function (s) {
        var li = document.createElement('li');
        li.textContent = s[lang];
        ul.appendChild(li);
      });
    }
    fillList('guideIngredients', GUIDE.ingredients);
    fillList('guideMixing', GUIDE.mixing);
    fillList('guideApply', GUIDE.application);
    fillList('guideCare', GUIDE.aftercare);
    var tl = $('stainTimeline');
    tl.innerHTML = '';
    GUIDE.stainStages.forEach(function (s) {
      var li = document.createElement('li');
      li.innerHTML = '<strong>' + esc(L.fmtNum(s.hours, lang)) + 'h</strong> — ' + esc(s.label[lang]);
      tl.appendChild(li);
    });
    updateStain();
  }

  function updateStain() {
    var v = parseFloat($('stainHours').value);
    var stage = L.stainStage(GUIDE.stainStages, isNaN(v) ? 0 : v);
    $('stainResult').textContent = stage ? stage.label[lang] : '';
  }

  // ---------- progress ----------
  function renderProgress() {
    var s = L.progressStats(DESIGNS, state);
    $('statTried').textContent = L.fmtNum(s.tried, lang);
    $('statFavs').textContent = L.fmtNum(s.favs, lang);
    $('statNotes').textContent = L.fmtNum(s.notes, lang);
    var byCat = $('statByCat');
    byCat.innerHTML = '';
    L.CATS.forEach(function (c) {
      var li = document.createElement('li');
      li.textContent = t(c) + ': ' + L.fmtNum(s.byCat[c], lang) + ' / ' + L.fmtNum(s.totalByCat[c], lang);
      byCat.appendChild(li);
    });
    var tl = $('triedList');
    tl.innerHTML = '';
    if (!s.triedIds.length) {
      var p = document.createElement('p');
      p.className = 'empty';
      p.textContent = t('none_tried');
      tl.appendChild(p);
    } else {
      s.triedIds.forEach(function (id) {
        var d = null;
        DESIGNS.forEach(function (x) { if (x.id === id) d = x; });
        if (!d) return;
        var li = document.createElement('li');
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'linklike';
        b.textContent = d.name[lang];
        b.addEventListener('click', function () { showTab('gallery'); openDetail(id); });
        li.appendChild(b);
        tl.appendChild(li);
      });
    }
    var nl = $('notesList');
    nl.innerHTML = '';
    var noteIds = Object.keys(state.notes);
    if (!noteIds.length) {
      var p2 = document.createElement('p');
      p2.className = 'empty';
      p2.textContent = t('no_notes');
      nl.appendChild(p2);
    } else {
      noteIds.forEach(function (id) {
        var d = null;
        DESIGNS.forEach(function (x) { if (x.id === id) d = x; });
        if (!d) return;
        var li = document.createElement('li');
        li.innerHTML = '<strong>' + esc(d.name[lang]) + ':</strong> ' + esc(state.notes[id]);
        nl.appendChild(li);
      });
    }
  }

  // ---------- i18n ----------
  function applyLang() {
    document.documentElement.lang = lang === 'bn' ? 'bn' : 'en';
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      el.textContent = t(el.getAttribute('data-i18n'));
    });
    document.querySelectorAll('[data-i18n-ph]').forEach(function (el) {
      el.setAttribute('placeholder', t(el.getAttribute('data-i18n-ph')));
    });
    $('langToggle').textContent = lang === 'bn' ? 'English' : 'বাংলা';
    renderGallery();
    renderGuide();
    if (currentDetail) openDetail(currentDetail);
    else renderProgress();
  }

  // ---------- data tools ----------
  function download(filename, text) {
    var blob = new Blob([text], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  function bind() {
    $('langToggle').addEventListener('click', function () {
      lang = (lang === 'bn') ? 'en' : 'bn';
      saveLang();
      applyLang();
    });
    ['gallery', 'guide', 'progress'].forEach(function (n) {
      $('tabBtn-' + n).addEventListener('click', function () { showTab(n); });
    });
    $('searchBox').addEventListener('input', renderGallery);
    $('filterCat').addEventListener('change', renderGallery);
    $('filterDiff').addEventListener('change', renderGallery);
    $('favOnly').addEventListener('change', renderGallery);
    $('backBtn').addEventListener('click', closeDetail);
    $('detailFav').addEventListener('click', function () {
      state = L.toggleFav(state, currentDetail);
      saveState();
      refreshDetailButtons();
    });
    $('detailTried').addEventListener('click', function () {
      state = L.toggleTried(state, currentDetail);
      saveState();
      refreshDetailButtons();
    });
    $('saveNoteBtn').addEventListener('click', function () {
      state = L.setNote(state, currentDetail, $('noteBox').value);
      saveState();
      $('noteMsg').textContent = t('note_saved');
    });
    $('stainHours').addEventListener('input', updateStain);
    $('exportBtn').addEventListener('click', function () {
      download('mehndi-design-bd-export.json', JSON.stringify(L.exportData(state), null, 2));
      $('dataMsg').textContent = '';
    });
    $('importBtn').addEventListener('click', function () { $('importFile').click(); });
    $('importFile').addEventListener('change', function (ev) {
      var file = ev.target.files && ev.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        try {
          var obj = JSON.parse(reader.result);
          var res = L.importData(obj, DESIGNS);
          if (res.ok) {
            state = res.state;
            saveState();
            $('dataMsg').textContent = t('import_ok');
            renderProgress();
          } else {
            $('dataMsg').textContent = t('import_bad');
          }
        } catch (e) {
          $('dataMsg').textContent = t('import_bad');
        }
        ev.target.value = '';
      };
      reader.readAsText(file);
    });
    $('eraseBtn').addEventListener('click', function () {
      $('eraseBox').hidden = false;
      $('eraseInput').focus();
    });
    $('eraseConfirmBtn').addEventListener('click', function () {
      if ($('eraseInput').value.trim() === 'DELETE') {
        state = L.emptyState();
        saveState();
        $('eraseBox').hidden = true;
        $('eraseInput').value = '';
        $('dataMsg').textContent = t('erase_done');
        renderProgress();
      }
    });
  }

  bind();
  applyLang();
  showTab('gallery');
})();
