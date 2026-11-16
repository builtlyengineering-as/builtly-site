/* www.builtly.ai: softwaresidene. Kilde: tools/nettsted/vindu.js.
   Modullinja som kommer fram når toppen er rullet forbi, produktvinduene (faner, brytere, kartlag, prisliste, revisjoner,
   flippbok) og interesseskjemaet. Vinduene viser eksempeldata. Ingenting her henter eller sender noe, bortsett fra skjemaet. */
(function () {
  'use strict';
  var doc = document.documentElement;
  var rolig = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function alle(v, rot) { return Array.prototype.slice.call((rot || document).querySelectorAll(v)); }

  // ---------- modullinja ----------
  var linje = document.querySelector('[data-modlinje]'), skinne = document.querySelector('.moduler');
  if (linje && skinne) {
    var punkter = alle('li', linje), kapitler = alle('.kap[data-kap]');
    if (kapitler.length) linje.classList.add('lop');
    var ol = linje.querySelector('ol'), sistOn = null;
    var holdSynlig = function () {
      var on = linje.querySelector('li.on');
      if (!ol || !on || on === sistOn || ol.scrollWidth <= ol.clientWidth) return;
      sistOn = on; ol.scrollLeft = Math.max(0, on.offsetLeft - ol.offsetLeft - 16);
    };
    var vis = function () {
      var navh = parseFloat(getComputedStyle(doc).getPropertyValue('--navh')) || 65;
      var forbi = skinne.getBoundingClientRect().bottom < navh + 4;
      linje.classList.toggle('vis', forbi);
      if (forbi) linje.removeAttribute('inert'); else linje.setAttribute('inert', '');
      if (!kapitler.length) return;
      // På siden med hele løpet viser linja hvor langt man har kommet. Alle målene leses før noe skrives.
      var merke = navh + 60 + window.innerHeight * 0.25, aktiv = -1;
      var andeler = kapitler.map(function (k, i) {
        var r = k.getBoundingClientRect();
        if (r.top <= merke && r.bottom > merke) aktiv = i;
        return Math.max(0, Math.min(1, (merke - r.top) / r.height));
      });
      punkter.forEach(function (p, i) {
        var fyll = p.querySelector('.spor i');
        if (fyll && andeler[i] != null) fyll.style.width = (andeler[i] * 100).toFixed(1) + '%';
        p.classList.toggle('on', i === aktiv);
      });
      holdSynlig();
    };
    var venter = false, etterRull = function () { if (venter) return; venter = true; requestAnimationFrame(function () { venter = false; vis(); }); };
    window.addEventListener('scroll', etterRull, { passive: true });
    window.addEventListener('resize', etterRull);
    vis();
    // På smal skjerm ruller modullinja sidelengs: hold modulen man står på, i syne.
    holdSynlig();
  }

  // ---------- faner og valg i produktvinduene ----------
  var faneNr = 0;
  // [data-faner]: knapper med data-fane="x" viser ruten med data-rute="x" i samme vindu.
  alle('[data-faner]').forEach(function (gruppe) {
    var rotEl = gruppe.closest('[data-vindu]') || gruppe.parentNode, navn = gruppe.getAttribute('data-faner');
    var knapper = alle('[data-fane]', gruppe);
    // Faner (role=tab) får panelene sine koblet på med id-er, så rollene stemmer for skjermlesere.
    if (knapper.length && knapper[0].getAttribute('role') === 'tab') knapper.forEach(function (k) {
      var v = k.getAttribute('data-fane'), ider = [];
      if (!k.id) k.id = 'fane-' + (++faneNr);
      alle('[data-rute]', rotEl).forEach(function (r) {
        if ((r.getAttribute('data-for') || '') !== navn || r.getAttribute('data-rute') !== v) return;
        if (!r.id) r.id = k.id + '-rute' + (ider.length ? ider.length + 1 : '');
        r.setAttribute('role', 'tabpanel'); r.setAttribute('aria-labelledby', k.id); ider.push(r.id);
      });
      if (ider.length) k.setAttribute('aria-controls', ider.join(' '));
    });
    function velg(v, fokus) {
      knapper.forEach(function (k) { var pa = k.getAttribute('data-fane') === v; k.setAttribute(k.getAttribute('role') === 'tab' ? 'aria-selected' : 'aria-pressed', pa ? 'true' : 'false'); k.tabIndex = pa || k.getAttribute('role') !== 'tab' ? 0 : -1; if (pa && fokus) k.focus(); });
      alle('[data-rute]', rotEl).forEach(function (r) { if ((r.getAttribute('data-for') || '') === navn) r.hidden = r.getAttribute('data-rute') !== v; });
      rotEl.setAttribute('data-valgt-' + (navn || 'fane'), v);
    }
    knapper.forEach(function (k, i) {
      k.addEventListener('click', function () { velg(k.getAttribute('data-fane')); });
      k.addEventListener('keydown', function (e) {
        var d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
        if (!d || k.getAttribute('role') !== 'tab') return;
        e.preventDefault();
        var n = knapper[(i + d + knapper.length) % knapper.length];
        velg(n.getAttribute('data-fane'), true);
      });
    });
  });
  // [data-bryter="navn"]: slår klassen pa-navn av og på i vinduet.
  alle('[data-bryter]').forEach(function (b) {
    var rotEl = b.closest('[data-vindu]') || document.body;
    b.addEventListener('click', function () {
      var pa = b.getAttribute('aria-pressed') !== 'true';
      b.setAttribute('aria-pressed', pa ? 'true' : 'false');
      rotEl.classList.toggle('pa-' + b.getAttribute('data-bryter'), pa);
    });
  });

  // ---------- Maps: kartet med kartlag ----------
  alle('[data-kartlag]').forEach(function (boks) {
    var K = window.BuiltlyKart, T = window.BuiltlyTomt, svg = boks.querySelector('svg');
    if (!K || !T || !svg) { boks.classList.add('uten-kart'); return; }
    var kart = new K.Kart(svg, { fokus: { x: 62, y: 34, k: 2.75 } });
    var tomt = K.el('polygon', { points: K.pkt(T.TOMTER.A.ring), 'class': 'k-tomt' }, kart.planG);
    var kort = boks.querySelector('[data-eiendomskort]');
    tomt.style.cursor = 'pointer';
    tomt.addEventListener('click', function () { if (kort) kort.hidden = !kort.hidden; });
    alle('[data-lag]', boks).forEach(function (cb) {
      function sett() { kart.settLag(cb.getAttribute('data-lag'), cb.checked); var f = boks.querySelector('[data-forklaring="' + cb.getAttribute('data-lag') + '"]'); if (f) f.hidden = !cb.checked; }
      cb.addEventListener('change', sett); sett();
    });
    if (boks.hasAttribute('data-start3d')) kart.sett(1);
    alle('[data-perspektiv]', boks).forEach(function (k) {
      k.addEventListener('click', function () {
        alle('[data-perspektiv]', boks).forEach(function (x) { x.setAttribute('aria-pressed', x === k ? 'true' : 'false'); });
        kart.gaaTil(Number(k.getAttribute('data-perspektiv')));
      });
    });
  });

  // ---------- Mulighetsstudie i miniatyr: de tre grepene på eksempeltomta, regnet av tomt.js ----------
  alle('[data-ministudie]').forEach(function (boks) {
    var T = window.BuiltlyTomt;
    if (!T) return;
    var ring = T.TOMTER.A.ring, teig = T.areal(ring), navn = { lineaert: 'Lineært blandet boliggrep', kvartal: 'Urban kvartalsstruktur med gårdsrom', klynge: 'Boligklynger rundt grønt fellesrom' };
    var p = { typologi: 'blokk', maal: 'bra', bra: 5500, etasjer: 4, snitt: 67.5, parkering: 0.8, avstand: 4 };
    var alt = T.alternativer(ring, p), best = 0;
    alt.forEach(function (a) { a.maalBra = a.maal; a.ledd = T.ledd(a, ring, { maksBya: 35, avstand: 4 }); a.score = T.score(a.ledd).total; });
    // Som i studien: grepet som rangeres høyest, blir alternativ A og hovedalternativ.
    alt.sort(function (x, y) { return y.score - x.score; });
    alt.forEach(function (a, i) { a.id = 'ABC'.charAt(i); });
    var g = T.grenser(ring), m = 5, w = g.x1 - g.x0 + 2 * m, hh = g.y1 - g.y0 + 2 * m;
    function P(r) { return r.map(function (q) { return (q[0] - g.x0 + m).toFixed(1) + ',' + (g.y1 - q[1] + m).toFixed(1); }).join(' '); }
    var html = '';
    alt.forEach(function (a, i) {
      var s = '<svg viewBox="0 0 ' + w.toFixed(0) + ' ' + hh.toFixed(0) + '" aria-hidden="true"><polygon points="' + P(ring) + '" fill="#dfeedd" stroke="#14b8a6" stroke-width="1.2"/>';
      if (a.gaard) s += '<polygon points="' + P(a.gaard) + '" fill="#e2d2a4"/>';
      if (a.parkRing) s += '<polygon points="' + P(a.parkRing) + '" fill="#7fbf8a"/>';
      a.bygg.forEach(function (b) { s += '<polygon points="' + P(b.ring) + '" fill="#e8664f" stroke="#b8432f" stroke-width=".6"/>'; });
      html += '<button type="button" class="mini-alt" aria-pressed="' + (i === best ? 'true' : 'false') + '" data-i="' + i + '"><span class="mini-hode"><b>' + a.id + '</b>' + (i === best ? '<span class="ap-merke">★ Anbefalt</span>' : '') + '</span>' + s + '</svg><span class="mini-navn">' + navn[a.grep] + '</span>' +
        '<span class="mini-tall"><span>BRA <b>' + T.fmt(a.tall.bra) + ' m²</b></span><span>Boliger <b>' + T.fmt(a.tall.boliger) + '</b></span><span>Score <b>' + T.fmt(a.score) + '</b></span></span></button>';
    });
    boks.innerHTML = html;
    alle('.mini-alt', boks).forEach(function (k) { k.addEventListener('click', function () { alle('.mini-alt', boks).forEach(function (x) { x.setAttribute('aria-pressed', x === k ? 'true' : 'false'); }); }); });
  });

  // ---------- Salgskonsoll: prislista ----------
  alle('[data-prisliste]').forEach(function (boks) {
    var rekke = ['ledig', 'reservert', 'solgt'], navn = { ledig: 'Ledig', reservert: 'Reservert', solgt: 'Solgt' };
    function tell() {
      var n = { ledig: 0, reservert: 0, solgt: 0 }, sum = 0, tot = 0;
      alle('[data-enhet]', boks).forEach(function (e) { var s = e.getAttribute('data-status'); n[s]++; tot++; if (s === 'solgt') sum += Number(e.getAttribute('data-pris')); });
      var sett = function (k, v) { alle('[data-tall="' + k + '"]', boks).forEach(function (e) { e.textContent = v; }); };
      sett('solgt', n.solgt); sett('reservert', n.reservert); sett('ledig', n.ledig); sett('alle', tot);
      sett('grad', Math.round(100 * n.solgt / tot) + ' %');
      sett('sum', (sum / 1e6).toFixed(1).replace('.', ',') + ' mill. kr');
      alle('[data-fyll]', boks).forEach(function (e) { e.style.width = (100 * n.solgt / tot).toFixed(1) + '%'; });
    }
    alle('[data-enhet]', boks).forEach(function (e) {
      e.addEventListener('click', function () {
        var ny = rekke[(rekke.indexOf(e.getAttribute('data-status')) + 1) % 3];
        e.setAttribute('data-status', ny);
        var m = e.querySelector('.status'); if (m) m.textContent = navn[ny];
        e.setAttribute('aria-label', e.getAttribute('data-enhet') + ': ' + navn[ny] + '. Trykk for å endre status.');
        tell();
      });
    });
    tell();
  });

  // ---------- Prosjekthotell: ny revisjon ----------
  alle('[data-revisjon]').forEach(function (knapp) {
    var liste = document.getElementById(knapp.getAttribute('data-revisjon'));
    if (!liste) return;
    knapp.addEventListener('click', function () {
      var n = liste.children.length, bokstav = String.fromCharCode(65 + n), li = document.createElement('li');
      if (n >= 6) return;
      alle('.gjeldende', liste).forEach(function (e) { e.classList.remove('gjeldende'); var c = e.querySelector('.pv-chip'); if (c) c.remove(); });
      li.className = 'gjeldende ny';
      li.innerHTML = '<b>Rev. ' + bokstav + '</b><span>Lastet opp nå · Ola Nordmann</span><span class="pv-chip ok">Gjeldende</span>';
      liste.insertBefore(li, liste.firstChild);
      var teller = document.querySelector('[data-revteller="' + liste.id + '"]'); if (teller) teller.textContent = 'Rev. ' + bokstav;
      if (liste.children.length >= 6) { knapp.disabled = true; knapp.title = 'Demoen viser opptil seks revisjoner'; }
    });
  });

  // ---------- Salgskonsoll: flippboka ----------
  alle('[data-flippbok]').forEach(function (bok) {
    var sider = alle('.blad', bok), i = 0, tall = bok.querySelector('[data-sidetall]');
    function vis(n) { i = Math.max(0, Math.min(sider.length - 1, n)); sider.forEach(function (s, k) { s.classList.toggle('bladd', k < i); s.classList.toggle('aapen', k === i); }); if (tall) tall.textContent = (i + 1) + ' / ' + sider.length; }
    alle('[data-bla]', bok).forEach(function (k) { k.addEventListener('click', function () { vis(i + Number(k.getAttribute('data-bla'))); }); });
    vis(0);
  });

  // ---------- interesseskjemaet ----------
  // Sender til det samme mottaket som det gamle skjemaet på /bli-kunde: interessentlista i Salgskonsoll, som varsler salg.
  // Uten data-intake (som i prototypen) vises bare kvitteringen, og ingenting sendes.
  alle('form[data-skjema]').forEach(function (skjema) {
    var ramme = skjema.closest('.skj-ramme'), takk = ramme && ramme.querySelector('.skj-takk'), feil = skjema.querySelector('.skj-feil');
    skjema.addEventListener('submit', function (e) {
      e.preventDefault();
      var f = skjema.elements, ok = f.firma.value.trim() && f.navn.value.trim() && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.epost.value.trim()) && f.samtykke.checked;
      if (feil) feil.hidden = !!ok;
      if (!ok) { var forste = [f.firma, f.navn, f.epost, f.samtykke].filter(function (x) { return x.type === 'checkbox' ? !x.checked : !x.value.trim() || (x.type === 'email' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(x.value.trim())); })[0]; if (forste) forste.focus(); return; }
      // Feltet «nettside» er skjult for mennesker. Er det fylt ut, er avsenderen en robot, og ingenting sendes.
      var robot = f.nettside && f.nettside.value;
      var moduler = alle('input[name="mod"]:checked', skjema).map(function (x) { return x.value; });
      var onske = (skjema.querySelector('input[name="onske"]:checked') || {}).value || 'Demo + tilbud';
      var base = skjema.getAttribute('data-intake'), liste = skjema.getAttribute('data-liste');
      if (base && liste && !robot) {
        // Mottaket er en side som må lastes i en nettleser for å registrere henvendelsen. Derfor en skjult ramme og ikke fetch.
        var q = new URLSearchParams();
        q.set('mkt_intake', liste);
        q.set('name', (f.navn.value.trim() + ' — ' + f.firma.value.trim()).slice(0, 190));
        q.set('email', f.epost.value.trim());
        if (f.tlf.value.trim()) q.set('phone', f.tlf.value.trim());
        q.set('consent', '1'); q.set('source', 'form'); q.set('lead', 'bli_kunde');
        q.set('firma', f.firma.value.trim().slice(0, 160));
        q.set('onske', onske);
        if (f.melding.value.trim()) q.set('melding', f.melding.value.trim().slice(0, 600)); // holder adressen godt under grensene for lengde
        moduler.concat(['Ønske: ' + onske]).forEach(function (m) { q.append('interest', m); });
        var fr = document.createElement('iframe');
        fr.style.cssText = 'position:absolute;width:1px;height:1px;opacity:0;border:0';
        fr.setAttribute('aria-hidden', 'true'); fr.tabIndex = -1; fr.referrerPolicy = 'no-referrer';
        fr.src = base + '?' + q.toString();
        document.body.appendChild(fr);
        setTimeout(function () { try { fr.remove(); } catch (_) {} }, 25000);
      }
      skjema.hidden = true;
      if (takk) { takk.hidden = false; takk.setAttribute('tabindex', '-1'); takk.focus(); }
    });
  });
  // Lenker til skjemaet med ?modul=maps haker av modulen.
  var m = /[?&]modul=([a-z]+)/.exec(location.search);
  if (m) alle('form[data-skjema] input[name="mod"]').forEach(function (x) { if (x.getAttribute('data-modul') === m[1]) x.checked = true; });

  // ---------- tall som teller opp når de kommer til syne ----------
  if ('IntersectionObserver' in window && !rolig) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        var el = e.target, maal = Number(el.getAttribute('data-tell')), start = null, etter = el.getAttribute('data-etter') || '';
        (function steg(naa) {
          if (start == null) start = naa || performance.now();
          var u = Math.min(1, ((naa || start) - start) / 900), v = Math.round(maal * (1 - Math.pow(1 - u, 3)));
          el.textContent = v + etter;
          if (u < 1) requestAnimationFrame(steg);
        })();
      });
    }, { threshold: 0.6 });
    alle('[data-tell]').forEach(function (el) { io.observe(el); });
  }
})();
