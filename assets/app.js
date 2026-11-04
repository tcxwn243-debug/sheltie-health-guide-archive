/* 犬の健康・飼育ガイド — 画面の補助機能（なくても本文はすべて読めます） */
(function () {
  'use strict';
  var root = document.documentElement;
  var ROOT = root.getAttribute('data-root') || '';
  var FILE_LINKS = root.getAttribute('data-links') === 'file';
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem('sg.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem('sg.' + k, JSON.stringify(v)); } catch (e) { } }
  };
  function url(path) { return ROOT + path + (FILE_LINKS ? 'index.html' : ''); }

  /* 文字サイズ・明るさ */
  var fs = store.get('fs', 1);
  var fsBtn = $('#fsBtn');
  function applyFs() { root.style.setProperty('--fs', fs); if (fsBtn) { fsBtn.textContent = fs >= 1.2 ? 'Aa++' : fs > 1 ? 'Aa+' : 'Aa'; fsBtn.setAttribute('aria-label', '文字の大きさを切り替え（現在：' + (fs >= 1.2 ? '特大' : fs > 1 ? '大' : '標準') + '）'); } }
  applyFs();
  if (fsBtn) fsBtn.addEventListener('click', function () { fs = fs >= 1.2 ? 1 : fs >= 1.1 ? 1.2 : 1.1; store.set('fs', fs); applyFs(); });
  var themeBtn = $('#themeBtn');
  if (themeBtn) themeBtn.addEventListener('click', function () {
    var cur = root.getAttribute('data-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    var nx = cur === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', nx); store.set('theme', nx);
  });

  /* スマホの目次ドロワー */
  var rail = $('#rail'), scrim = $('#scrim'), menuBtn = $('#menuBtn');
  function closeRail() { if (!rail) return; rail.classList.remove('open'); scrim.hidden = true; menuBtn && menuBtn.setAttribute('aria-expanded', 'false'); }
  if (menuBtn) menuBtn.addEventListener('click', function () {
    rail.classList.add('open'); scrim.hidden = false; menuBtn.setAttribute('aria-expanded', 'true');
    var a = $('a[aria-current="page"]', rail) || $('a', rail); a && a.focus();
  });
  if (scrim) scrim.addEventListener('click', closeRail);

  /* 章ページ：読書位置、章内の見出し、根拠を開く */
  var article = $('article.chapter');
  var progress = $('#progress');
  if (article) {
    store.set('last', { slug: article.getAttribute('data-slug'), key: article.getAttribute('data-key'), title: article.getAttribute('data-title') });
    var secs = $$('.sec', article), links = $$('.toc a');
    var onScroll = function () {
      var h = document.documentElement, p = h.scrollTop / ((h.scrollHeight - h.clientHeight) || 1);
      if (progress) progress.style.width = (Math.min(1, Math.max(0, p)) * 100) + '%';
      var y = 0; secs.forEach(function (s, i) { if (s.getBoundingClientRect().top < 140) y = i; });
      links.forEach(function (a, i) { a.classList.toggle('on', i === y); });
    };
    addEventListener('scroll', onScroll, { passive: true }); onScroll();
    links.forEach(function (a) { a.addEventListener('click', function () { var t = document.getElementById(a.getAttribute('href').slice(1)); var d = t && t.querySelector('details'); if (d) d.open = true; }); });
  }
  function revealHash() {
    var id = decodeURIComponent(location.hash.slice(1)); if (!id) return;
    var el = document.getElementById(id); if (!el) return;
    var d = el.closest('details'); if (d && !d.open) { d.open = true; }
    if (/^b\d+$/.test(id)) {
      setTimeout(function () { el.scrollIntoView({ block: 'center' }); el.classList.add('flash'); setTimeout(function () { el.classList.remove('flash'); }, 2500); }, 30);
    } else if (d) { setTimeout(function () { el.scrollIntoView(); }, 30); }
  }
  addEventListener('hashchange', revealHash); revealHash();
  addEventListener('beforeprint', function () { $$('details').forEach(function (d) { d.open = true; }); });

  /* 連絡先メモ（この端末だけに保存） */
  function contactsHtml(c) {
    return [['かかりつけの動物病院', 'clinic'], ['夜間・休日の動物病院', 'night']].map(function (p) {
      var nm = c[p[1] + 'Name'] || '', tel = c[p[1] + 'Tel'] || '';
      if (!nm && !tel) return '';
      return '<div class="contact"><span class="lab">' + p[0] + '</span>' + (nm ? '<span class="nm">' + esc(nm) + '</span>' : '') +
        (tel ? '<span class="val">' + esc(tel) + ' <a class="linkish" href="tel:' + esc(tel.replace(/[^\d+]/g, '')) + '">電話をかける</a></span>' : '') + '</div>';
    }).join('');
  }
  var hc = $('#homeContacts');
  if (hc) {
    var c0 = store.get('contacts', {}), rows = contactsHtml(c0);
    hc.innerHTML = rows ? '<div class="contacts">' + rows + '</div>' : '<div class="contacts"><span class="muted" style="font-size:12.5px">かかりつけと夜間・休日の動物病院の電話番号を、<a href="' + url('triage/') + '#contactPanel">受診の目安まとめ</a>でこの端末に保存しておけます。</span></div>';
  }
  var cbox = $('#contacts');
  if (cbox) {
    var renderForm = function (msg) {
      var c = store.get('contacts', {}), rows = contactsHtml(c);
      cbox.innerHTML = (rows ? '<div class="contacts">' + rows + '</div>' : '') +
        '<form class="form" id="cf"><label for="cn1">かかりつけ（病院名）<input id="cn1" autocomplete="off" value="' + esc(c.clinicName || '') + '"></label>' +
        '<label for="ct1">電話番号<input id="ct1" inputmode="tel" autocomplete="off" value="' + esc(c.clinicTel || '') + '"></label>' +
        '<label for="cn2">夜間・休日（病院名）<input id="cn2" autocomplete="off" value="' + esc(c.nightName || '') + '"></label>' +
        '<label for="ct2">電話番号<input id="ct2" inputmode="tel" autocomplete="off" value="' + esc(c.nightTel || '') + '"></label>' +
        '<div class="actions"><button class="btn primary" type="submit">この端末に保存</button><span class="saved" aria-live="polite">' + (msg || '') + '</span></div></form>';
      $('#cf').addEventListener('submit', function (e) {
        e.preventDefault();
        store.set('contacts', { clinicName: $('#cn1').value.trim(), clinicTel: $('#ct1').value.trim(), nightName: $('#cn2').value.trim(), nightTel: $('#ct2').value.trim() });
        renderForm('保存しました');
      });
    };
    renderForm('');
  }

  /* 受診の目安まとめ：絞り込み */
  var tl = $('#tl');
  if (tl) {
    var tier = 'all', q = '';
    var apply = function () {
      var any = false;
      $$('.tier', tl).forEach(function (sec) {
        var show = tier === 'all' || sec.getAttribute('data-tier') === tier, n = 0;
        $$('li', sec).forEach(function (li) {
          var t = li.getAttribute('data-t'), ok = show && (!q || t.indexOf(q) >= 0);
          li.hidden = !ok; if (ok) n++;
          var tx = $('.tx', li); tx.innerHTML = q && ok ? esc(t).split(esc(q)).join('<mark class="hit">' + esc(q) + '</mark>') : esc(t);
        });
        sec.hidden = n === 0; if (n) any = true;
      });
      $('#tEmpty').hidden = any;
    };
    $$('.seg button').forEach(function (b) { b.addEventListener('click', function () { tier = b.getAttribute('data-t'); $$('.seg button').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); }); apply(); }); });
    $('#tq').addEventListener('input', function (e) { q = e.target.value.trim(); apply(); });
  }

  /* 推奨の一覧：絞り込み */
  var rl = $('#rl');
  if (rl) {
    $$('.seg button').forEach(function (b) {
      b.addEventListener('click', function () {
        var s = b.getAttribute('data-s');
        $$('.seg button').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        $$('.rec', rl).forEach(function (r) { r.hidden = !(s === 'all' || r.getAttribute('data-s') === s); });
      });
    });
  }

  /* トップ：前回の続き */
  var resume = $('#resume'), last = store.get('last', null);
  if (resume && last && last.slug) {
    resume.innerHTML = '<div class="resume">前回の続き：<a href="' + url('guide/' + esc(last.slug) + '/') + '">' + esc(last.key) + '　' + esc(last.title) + '</a></div>';
  }

  /* 検索（索引は開いたときに読み込む） */
  var dlg = $('#sdlg'), sq = $('#sq'), sres = $('#sres'), loading = false;
  function loadIndex(cb) {
    if (window.SG_INDEX) return cb();
    if (loading) return; loading = true;
    sres.innerHTML = '<div class="none">索引を読み込んでいます…</div>';
    var s = document.createElement('script'); s.src = ROOT + 'assets/search-index.js';
    s.onload = function () { loading = false; cb(); };
    s.onerror = function () { loading = false; sres.innerHTML = '<div class="none">検索の索引を読み込めませんでした。通信状況を確認してください。</div>'; };
    document.head.appendChild(s);
  }
  var lastFocus = null;
  function openSearch() { lastFocus = document.activeElement; dlg.hidden = false; sq.value = ''; render(''); setTimeout(function () { sq.focus(); }, 20); loadIndex(function () { render(sq.value); }); }
  function closeSearch() { dlg.hidden = true; if (lastFocus) lastFocus.focus(); }
  var hits = [];
  function render(q) {
    q = q.trim();
    if (!q) {
      sres.innerHTML = '<div class="tips">よく調べられることば：' + ['けいれん', '熱中症', '吐く', 'ワクチン', 'MDR1', 'マダニ', 'BCS', '歯磨き', '避妊', '経験則'].map(function (w) { return '<button type="button">' + w + '</button>'; }).join('') + '</div>';
      $$('.tips button', sres).forEach(function (b) { b.addEventListener('click', function () { sq.value = b.textContent; render(b.textContent); sq.focus(); }); });
      return;
    }
    if (!window.SG_INDEX) return;
    var terms = q.split(/\s+/).filter(Boolean);
    hits = window.SG_INDEX.filter(function (x) { return terms.every(function (t) { return x.t.indexOf(t) >= 0; }); });
    if (!hits.length) { sres.innerHTML = '<div class="none">「' + esc(q) + '」は見つかりませんでした。ことばを短くするか、別の言い方で試してください。</div>'; return; }
    var order = {}; window.SG_INDEX.forEach(function (x, i) { if (!(x.c in order)) order[x.c] = i; });
    hits.sort(function (a, b) { return (a.e - b.e) || (order[a.c] - order[b.c]); });
    var html = '<div class="grp-t">' + hits.length + '件' + (hits.length > 80 ? '（上位80件を表示）' : '') + '</div>', lastc = null;
    hits.slice(0, 80).forEach(function (x) {
      if (x.c !== lastc) { html += '<div class="grp-t">' + esc(x.c) + '　' + esc(x.n) + '</div>'; lastc = x.c; }
      var p = x.t.indexOf(terms[0]), st = Math.max(0, p - 36);
      var snip = (st > 0 ? '…' : '') + x.t.slice(st, st + 120) + (x.t.length > st + 120 ? '…' : '');
      var sh = esc(snip); terms.forEach(function (t) { sh = sh.split(esc(t)).join('<mark class="hit">' + esc(t) + '</mark>'); });
      html += '<a href="' + url(x.u) + '#' + x.a + '"><small>' + esc(x.s) + (x.e ? '（根拠）' : '') + '</small>' + sh + '</a>';
    });
    sres.innerHTML = html;
    $$('a', sres).forEach(function (a) { a.addEventListener('click', function () { dlg.hidden = true; }); });
  }
  if (dlg) {
    $('#searchBtn').addEventListener('click', openSearch);
    $$('[data-open-search]').forEach(function (b) { b.addEventListener('click', openSearch); });
    sq.addEventListener('input', function () { loadIndex(function () { render(sq.value); }); render(sq.value); });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) closeSearch(); });
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { if (dlg && !dlg.hidden) closeSearch(); closeRail(); }
    if (e.key === '/' && dlg && dlg.hidden && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { e.preventDefault(); openSearch(); }
    if (dlg && !dlg.hidden && (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter')) {
      var as = $$('a', sres); if (!as.length) return;
      var i = as.findIndex(function (a) { return a.classList.contains('sel'); });
      if (e.key === 'Enter') { if (document.activeElement === sq) { e.preventDefault(); (as[i < 0 ? 0 : i]).click(); } return; }
      e.preventDefault(); as.forEach(function (a) { a.classList.remove('sel'); });
      i = e.key === 'ArrowDown' ? Math.min(as.length - 1, i + 1) : Math.max(0, i - 1);
      as[i].classList.add('sel'); as[i].scrollIntoView({ block: 'nearest' });
    }
  });
})();
