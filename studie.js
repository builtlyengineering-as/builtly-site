/* www.builtly.ai: demoen av Mulighetsstudie. Kilde: tools/nettsted/studie.js. Bruker tomt.js (regningen) og kart.js (kartet).
   Demoen går gjennom studiens åtte trinn med trinnenes egne navn og knapper. Geometrien, sola, poengene og
   byggherrens regnestykke regnes i nettleseren med studiens regler og standardverdier, forenklet: uten naboer, terreng
   og planens egne felt, og med en forenklet måling av arkitektur. Planen, bestemmelsene og tomta er eksempeldata. */
(function () {
  'use strict';
  var rot = document.querySelector('[data-studie]');
  if (!rot) return;
  var T = window.BuiltlyTomt, K = window.BuiltlyKart;
  if (!T || !K) { document.documentElement.classList.add('uten-skript'); return; }
  var rolig = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fmt = T.fmt, TOMT = T.TOMTER.A, RING = TOMT.ring, TEIG = T.areal(RING);

  function h(tag, attrs, barn) {
    var e = document.createElement(tag), k;
    for (k in attrs || {}) {
      if (k === 'tekst') e.textContent = attrs[k];
      else if (k === 'html') e.innerHTML = attrs[k];
      else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] === true) e.setAttribute(k, '');
      else if (attrs[k] !== false && attrs[k] != null) e.setAttribute(k, attrs[k]);
    }
    (barn || []).forEach(function (b) { if (b) e.appendChild(typeof b === 'string' ? document.createTextNode(b) : b); });
    return e;
  }

  var TRINN = [
    { s: 'Grunnlag', n: 'Prosjekt' }, { s: 'Grunnlag', n: 'Eiendom' }, { s: 'Plan og rammer', n: 'Plan og rammer' },
    { s: 'Utforming', n: 'Produkt og program' }, { s: 'Utforming', n: 'Gjennomgang og oppstart' },
    { s: 'Analyse og leveranse', n: 'Analyse' }, { s: 'Analyse og leveranse', n: 'Resultater' }, { s: 'Analyse og leveranse', n: 'Rapport' }
  ];
  var STRATEGI = {
    folg: { navn: 'Følg reguleringsplan', bya: 35, etasjer: 4, kilde: 'Bestemmelse § 3.3' },
    hoyde: { navn: 'Utfordre høydene i planen', bya: 35, etasjer: 6, kilde: 'Angitt manuelt' },
    om: { navn: 'Se bort fra regulering (omregulering)', bya: 45, etasjer: 8, kilde: 'Angitt manuelt' }
  };
  // Studiens standardfordeling: andel (%) og gjennomsnittlig størrelse (m² BRA-i) for 1-rom, 2-rom, 3-rom og 4-rom+.
  var MIKS = [[15, 20], [35, 37], [35, 72], [15, 95]];
  var GREP = { lineaert: 'Lineært blandet boliggrep', kvartal: 'Urban kvartalsstruktur med gårdsrom', klynge: 'Boligklynger rundt grønt fellesrom' };
  var LEDD = ['Arkitektur', 'Måloppnåelse', 'Uterom (MUA)', 'Sol', 'BYA-tilpasning'];
  var LEDDFARGE = ['#0f6f75', '#3b8f94', '#7fb6a3', '#e2b04a', '#b9b3a4'];
  var FASER = ['Henter kontekst og støydata', 'Bygger masterplan og volummodeller', 'Beregner nøkkeltall og skriver rapport', 'Fanger 3D-foto fra Google', 'Beregner sol og skygge', 'Lager skisse og ferdig rapport'];
  var DAGER = { jevndogn: ['Vår/høstjevndøgn', '21. mars'], sommer: ['Sommersolverv', '21. juni'], vinter: ['Vintersolverv', '21. desember'] };

  var st = { trinn: 0, naadd: 0, boligtype: 'blokk', hentet: false, sone: false, avstand: 4, strategi: 'folg', onsketBra: 5500, parkering: 0.8,
    vekter: T.VEKTER.slice(), kjortVekter: T.VEKTER.slice(), alt: null, valgt: 0, fane: 'oversikt', dag: 'jevndogn', time: 12, salgspris: 82000, byggekost: 54000, fortjeneste: 12, vekting: false, analyse: -1 };

  // ---------- skjelettet ----------
  rot.innerHTML = '';
  var stegliste = h('ol', { 'class': 'ms-steg' });
  var panel = h('div', { 'class': 'ms-panel' });
  var kartBoks = h('div', { 'class': 'ms-kart' });
  var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', 'Kart over eksempeltomta med studiens alternativer');
  kartBoks.appendChild(svg);
  var visning = h('div', { 'class': 'ap-seg liten ap-visning', role: 'group', 'aria-label': 'Perspektiv' }, [
    h('button', { type: 'button', 'aria-pressed': 'true', tekst: '2D', onclick: function () { settVisning(0); } }),
    h('button', { type: 'button', 'aria-pressed': 'false', tekst: '3D', onclick: function () { settVisning(1); } })]);
  var merkelapp = h('div', { 'class': 'ms-merke' });
  kartBoks.appendChild(visning); kartBoks.appendChild(merkelapp);
  rot.appendChild(h('div', { 'class': 'ms' }, [h('nav', { 'class': 'ms-venstre', 'aria-label': 'Trinnene i studien' }, [stegliste]), panel, kartBoks]));
  var status = h('div', { 'class': 'ap-sr', 'aria-live': 'polite' });
  rot.appendChild(status);
  function si(tekst) { status.textContent = tekst; }
  var kart = new K.Kart(svg, { fokus: K.fokusFor(RING, 4.4) });

  // Panelet bygges på nytt ved hvert valg. Tastaturfokus følger med: til samme knapp når den finnes, ellers til overskriften.
  var fokusIPanel = false;
  panel.addEventListener('focusin', function () { fokusIPanel = true; });
  panel.addEventListener('focusout', function (e) { if (e.relatedTarget && !panel.contains(e.relatedTarget)) fokusIPanel = false; });
  document.addEventListener('pointerdown', function (e) { if (!panel.contains(e.target)) fokusIPanel = false; }, true);
  function fokusMerke(e) { return e.tagName + '|' + (e.getAttribute('aria-label') || e.textContent || '').trim().slice(0, 80); }
  function huskFokus() { var a = document.activeElement; return a && panel.contains(a) ? fokusMerke(a) : null; }
  function settFokus(merke) {
    if (!fokusIPanel) return;
    var kand = panel.querySelectorAll('button, a[href], input'), i;
    if (merke) for (i = 0; i < kand.length; i++) if (!kand[i].disabled && fokusMerke(kand[i]) === merke) { kand[i].focus({ preventScroll: true }); return; }
    var o = panel.querySelector('h3');
    if (o) { o.setAttribute('tabindex', '-1'); o.focus({ preventScroll: true }); }
  }

  // ---------- regningen ----------
  function ramme() { return STRATEGI[st.strategi]; }
  function snittBraI() { var s = 0; MIKS.forEach(function (r) { s += r[0] / 100 * r[1]; }); return s; }
  function snittBra() { return snittBraI() / T.KALKYLE.braI; }
  // Forbudssonen: et ti meter bredt belte langs østgrensa (eksempel).
  function soneRing() { var g = T.grenser(RING); return T.klipp(RING, -1, 0, -(g.x1 - 14)); }
  function tomtEff() { var g = T.grenser(RING); return st.sone ? T.klipp(RING, 1, 0, g.x1 - 14) : RING; }
  function byggbart() { return T.innrykk(tomtEff(), st.avstand); }
  function kapasitet() { return TEIG * ramme().bya / 100 * ramme().etasjer * T.REGEL.effektivitet; }
  function regn() {
    var p = { typologi: st.boligtype, maal: 'bra', bra: st.onsketBra, etasjer: ramme().etasjer, snitt: snittBra(), parkering: st.parkering, avstand: st.avstand };
    var alt = T.alternativer(tomtEff(), p);
    alt.forEach(function (a) {
      a.tall = T.tall(a.bygg, p, TEIG);
      a.maalBra = a.maal;
      a.ledd = T.ledd(a, RING, { maksBya: ramme().bya, avstand: st.avstand });
      a.score = a.scoreKjort = T.score(a.ledd, st.vekter).total;
    });
    // Som i studien: grepet som rangeres høyest i kjøringen, blir alternativ A og hovedalternativ. Rekkefølgen og
    // bokstavene står fast til neste kjøring, også når vektingen endres etterpå.
    alt.sort(function (x, y) { return y.score - x.score; });
    alt.forEach(function (a, i) { a.id = 'ABC'.charAt(i); });
    st.alt = alt; st.valgt = 0; st.kjortVekter = st.vekter.slice();
  }
  // Et valg som endrer forutsetningene: analysen må kjøres på nytt, og trinnene etter dette låses igjen.
  function nullstill() { st.alt = null; st.naadd = st.trinn; tegnSteg(); }
  function poeng() { (st.alt || []).forEach(function (a) { a.score = T.score(a.ledd, st.vekter).total; }); }
  function rang(felt) { var r = st.alt.map(function (a, i) { return i; }).sort(function (x, y) { return st.alt[y][felt] - st.alt[x][felt]; }); var ut = []; r.forEach(function (i, k) { ut[i] = k + 1; }); return ut; }
  function kalkyle(a) { return T.kalkyle({ bra: a.tall.bra, boliger: a.tall.boliger, parkering: a.tall.parkering, salgspris: st.salgspris, byggekost: st.byggekost, fortjeneste: st.fortjeneste / 100 }); }

  // ---------- kartet ----------
  function tegnKart() {
    var g = kart.planG, el = K.el, pkt = K.pkt, a = st.alt && st.trinn >= 5 ? st.alt[st.valgt] : null;
    g.innerHTML = '';
    kart.planTraer = [];
    if (!st.hentet) { kart.settPrismer([]); merkelapp.textContent = 'Ingen tomt hentet ennå'; return; }
    if (a && st.trinn >= 6) {
      el('polygon', { points: pkt(RING), 'class': 'k-plen' }, g);
      if (a.gaard) el('polygon', { points: pkt(a.gaard), 'class': 'k-tun' }, g);
      if (a.parkRing) { el('polygon', { points: pkt(a.parkRing), 'class': 'k-park' }, g); kart.planTraer = parkTraer(a.parkRing, a.bygg); }
      if (st.fane === 'sol' && st.trinn === 6) {
        var s = T.sol(T.STUDIE.bredde, st.dag, st.time);
        a.bygg.forEach(function (b) { var r = T.skygge(b, s); if (r) el('polygon', { points: pkt(r), 'class': 'k-skygge' }, g); });
      }
    } else if (st.trinn >= 1) {
      el('polygon', { points: pkt(byggbart()), 'class': 'k-byggbart' }, g);
    }
    if (st.sone) el('polygon', { points: pkt(soneRing()), 'class': 'k-forbud' }, g);
    el('polygon', { points: pkt(RING), 'class': 'k-tomt', fill: a && st.trinn >= 6 ? 'none' : undefined }, g);
    var vis = a && (st.trinn >= 6 || st.analyse >= 1);
    kart.settPrismer(vis ? a.bygg.map(function (b) { return { ring: b.ring, hoyde: b.hoyde, klasse: 'k-bygg las' + (b.typ === 'rekkehus' ? ' rekke' : ''), merke: b.etasjer }; }) : []);
    merkelapp.textContent = vis ? 'Alternativ ' + a.id + ' · ' + GREP[a.grep] : TOMT.navn + ' · gnr/bnr ' + TOMT.gnrbnr;
  }
  function parkTraer(ring, bygg) {
    var g = T.grenser(ring), ut = [], nx = Math.max(2, Math.round((g.x1 - g.x0) / 10));
    for (var i = 0; i < nx; i++) { var q = [g.x0 + (i + 0.5) * (g.x1 - g.x0) / nx, (g.y0 + g.y1) / 2 + (i % 2 ? 2 : -2)]; if (T.inne(q, ring) && !bygg.some(function (b) { return T.avstand([q], b.ring) < 3; })) ut.push(q); }
    return ut;
  }
  function settVisning(t) {
    Array.prototype.forEach.call(visning.children, function (b, i) { b.setAttribute('aria-pressed', i === t ? 'true' : 'false'); });
    kart.gaaTil(t);
  }

  // ---------- trinnlista ----------
  function tegnSteg() {
    stegliste.innerHTML = '';
    var forrige = '';
    TRINN.forEach(function (t, i) {
      if (t.s !== forrige) { stegliste.appendChild(h('li', { 'class': 'seksjon', tekst: t.s })); forrige = t.s; }
      var kan = i <= st.naadd;
      stegliste.appendChild(h('li', {}, [h('button', { type: 'button', 'class': i === st.trinn ? 'pa' : i < st.naadd ? 'gjort' : '', disabled: !kan, 'aria-current': i === st.trinn ? 'step' : null, onclick: function () { if (kan) gaa(i); } }, [
        h('span', { 'class': 'nr', tekst: i < st.naadd && i !== st.trinn ? '✓' : String(i + 1) }), h('span', { tekst: t.n })])]));
    });
    // På smal skjerm ligger trinnene på én linje: hold det aktive trinnet i syne uten å flytte siden.
    var boks = stegliste.parentNode, aktiv = stegliste.querySelector('button.pa');
    if (boks && aktiv && boks.scrollWidth > boks.clientWidth) boks.scrollLeft = Math.max(0, aktiv.offsetLeft - (boks.clientWidth - aktiv.offsetWidth) / 2);
  }
  function gaa(i) {
    clearInterval(spillAnalyse.id); clearTimeout(spillAnalyse.slutt);
    if (i >= 4 && !st.alt) regn();
    if (i >= 5 && !st.alt.length) i = 4; // ingen grep får plass: gjennomgangen sier hvorfor
    st.trinn = i; st.naadd = Math.max(st.naadd, i);
    if (i < 5 && kart.t > 0) settVisning(0);
    if (i === 6 && kart.t === 0 && !rolig) settVisning(1);
    tegnSteg(); tegnPanel(); tegnKart();
    if (i === 5) spillAnalyse();
  }

  // ---------- byggeklosser i panelet ----------
  function hode(tittel, under) { return h('div', { 'class': 'ms-hode' }, [h('span', { 'class': 'ms-eyebrow', tekst: 'Trinn ' + (st.trinn + 1) + ' av 8 · ' + TRINN[st.trinn].s }), h('h3', { tekst: tittel }), under ? h('p', { tekst: under }) : null]); }
  function kort(tittel, barn) { return h('div', { 'class': 'ms-kort' }, [tittel ? h('h4', { tekst: tittel }) : null].concat(barn)); }
  function felt(navn, verdi) { return h('label', { 'class': 'ms-felt' }, [h('span', { tekst: navn }), h('input', { type: 'text', value: verdi, readonly: true })]); }
  function valg(navn, liste, nu, klikk) {
    return h('div', { 'class': 'ms-valg', role: 'group', 'aria-label': navn }, liste.map(function (v) {
      return h('button', { type: 'button', 'aria-pressed': v[0] === nu ? 'true' : 'false', disabled: v[3] === false, title: v[3] === false ? 'Ikke med i demoen' : null, onclick: function () { klikk(v[0]); } }, [
        h('b', {}, [v[1], v[4] ? h('span', { 'class': 'ap-merke', tekst: v[4] }) : null]), v[2] ? h('span', { tekst: v[2] }) : null]);
    }));
  }
  function glider(navn, nokkel, min, maks, steg, vis, etter) {
    var ut = h('output', { tekst: vis(st[nokkel]) }), inn = h('input', { type: 'range', min: min, max: maks, step: steg, value: st[nokkel], 'aria-label': navn });
    inn.addEventListener('input', function () { st[nokkel] = Number(inn.value); ut.textContent = vis(st[nokkel]); etter(); });
    return h('label', { 'class': 'ap-glider hel' }, [h('span', {}, [navn, ut]), inn]);
  }
  function primar(tekst, klikk, av) { return h('div', { 'class': 'ms-fot' }, [st.trinn > 0 ? h('button', { type: 'button', 'class': 'ms-tilbake', tekst: 'Tilbake', onclick: function () { gaa(st.trinn - 1); } }) : h('span'), h('button', { type: 'button', 'class': 'ap-knapp', disabled: !!av, tekst: tekst, onclick: klikk })]); }
  function rad(k, v, kilde) { return h('tr', {}, [h('td', { tekst: k }), h('td', { 'class': 'tall', tekst: v }), kilde ? h('td', {}, [h('span', { 'class': 'ms-kilde', tekst: kilde })]) : null]); }

  // ---------- trinnene ----------
  function tegnPanel() {
    var merke = huskFokus();
    panel.innerHTML = '';
    var i = st.trinn, inn = h('div', { 'class': 'ms-rull' });
    panel.appendChild(inn);
    if (i === 0) {
      inn.appendChild(hode('Grunnlag for studien'));
      inn.appendChild(kort('For denne studien', [felt('Navn på studien', 'Eksempeltunet'),
        h('div', { 'class': 'ap-l', tekst: 'Studietype' }),
        h('div', { 'class': 'ap-seg' }, [['Bolig', true], ['Lager / logistikk', false], ['Kontor', false], ['Hotell', false], ['Handel / plasskrevende varehandel', false]].map(function (v) { return h('button', { type: 'button', 'aria-pressed': v[1] ? 'true' : 'false', disabled: !v[1], title: v[1] ? null : 'Ikke med i demoen', tekst: v[0] }); })),
        h('div', { 'class': 'ap-l', tekst: 'Boligtype' }),
        valg('Boligtype', [['blokk', 'Kun leiligheter'], ['miks', 'Miks (leiligheter + rekkehus)'], ['rekkehus', 'Kun rekkehus', '', false]], st.boligtype, function (v) { st.boligtype = v; nullstill(); tegnPanel(); })]));
      panel.appendChild(primar('Fortsett til eiendom', function () { gaa(1); }));
    } else if (i === 1) {
      inn.appendChild(hode('Eiendom', 'Hent tomt fra matrikkel eller gjør enkle justeringer før plananalysen.'));
      inn.appendChild(kort('1. Hent eiendom fra matrikkel', [h('div', { 'class': 'ms-to' }, [felt('Kommune', 'Eksempelby'), felt('Gnr./bnr.', TOMT.gnrbnr)]),
        h('button', { type: 'button', 'class': 'ms-knapp' + (st.hentet ? '' : ' puls'), tekst: 'Søk opp / endre tomt', onclick: function () { st.hentet = true; nullstill(); tegnPanel(); tegnKart(); } }),
        h('p', { 'class': 'ap-hint', tekst: st.hentet ? 'Tomteareal ' + fmt(TEIG) + ' m². Tomtegrensen er hentet fra matrikkelen.' : 'Ingen tomt hentet ennå' })]));
      if (st.hentet) {
        inn.appendChild(kort('2. Avgrens byggebart areal (anbefalt)', [
          h('p', { 'class': 'ap-hint', tekst: 'Tegn forbudssone eller byggbar sone direkte på kartet. Dette er den raskeste måten å avgrense arealet på.' }),
          h('button', { type: 'button', 'class': 'ms-knapp lys', tekst: st.sone ? 'Tøm tegning' : 'Legg til sone', onclick: function () { st.sone = !st.sone; nullstill(); tegnPanel(); tegnKart(); } }),
          st.sone ? h('p', { 'class': 'ap-hint', tekst: 'Forbudssone: et belte på 14 m langs østgrensen. I demoen er sonen tegnet på forhånd.' }) : null,
          glider('Polygonbuffer / inntrekk (m)', 'avstand', 0, 10, 0.5, function (v) { return fmt(v, 1) + ' m'; }, function () { nullstill(); tegnKart(); var e = panel.querySelector('[data-byggbart]'); if (e) e.textContent = byggbartTekst(); }),
          h('p', { 'class': 'ms-sum', 'data-byggbart': true, tekst: byggbartTekst() })]));
      }
      panel.appendChild(primar('Bekreft eiendom og fortsett', function () { gaa(2); }, !st.hentet));
    } else if (i === 2) {
      var r = ramme();
      inn.appendChild(hode('Plan og rammer', 'Kontroller planstatus, gå gjennom relevante bestemmelser og velg hvordan studien skal forholde seg til planen.'));
      inn.appendChild(kort('Planstatus', [h('p', { 'class': 'ms-sum', tekst: 'Reguleringsplan r2019 Eksempelgata · gjeldende' }), h('p', { 'class': 'ap-hint', tekst: 'Arealformål: Boligbebyggelse' })]));
      inn.appendChild(kort('Hvordan skal studien forholde seg til planen?', [
        valg('Strategi', [['folg', STRATEGI.folg.navn, '', true, 'Anbefalt'], ['hoyde', STRATEGI.hoyde.navn], ['om', STRATEGI.om.navn]], st.strategi, function (v) { st.strategi = v; nullstill(); tegnPanel(); })]));
      inn.appendChild(kort('Rammer som brukes i analysen', [h('table', { 'class': 'ms-tabell' }, [h('thead', {}, [h('tr', {}, [h('th', { tekst: 'Ramme' }), h('th', { 'class': 'tall', tekst: 'Verdi' }), h('th', { tekst: 'Kilde' })])]), h('tbody', {}, [
        rad('Maks BYA', r.bya + ' %', st.strategi === 'om' ? r.kilde : 'Bestemmelse § 3.2'), rad('Maks etasjer', String(r.etasjer), r.kilde),
        rad('Maks høyde', fmt(r.etasjer * T.REGEL.etasjehoyde, 1) + ' m', 'Følger etasjene'), rad('Byggegrense', fmt(st.avstand, 1) + ' m', 'Standardverdi'),
        rad('Uterom (MUA)', T.STUDIE.muaPerBolig + ' m² per bolig', 'Generisk standard')])])]));
      panel.appendChild(primar('Godkjenn plan og strategi og fortsett', function () { gaa(3); }));
    } else if (i === 3) {
      inn.appendChild(hode('Produkt og program', 'Start med hovedvalgene. Resten har standardverdier.'));
      var snittUt = h('p', { 'class': 'ms-sum', tekst: snittTekst() });
      inn.appendChild(kort('Hva vil du bygge?', [glider('Ønsket BRA', 'onsketBra', 2000, 12000, 100, function (v) { return fmt(v) + ' m²'; }, nullstill)]));
      inn.appendChild(kort('Boligfordeling', [
        h('div', { 'class': 'ms-miks' }, MIKS.map(function (rr, k) { return h('div', {}, [h('b', { tekst: (k === 3 ? '4-rom+' : (k + 1) + '-rom') }), h('span', { tekst: rr[0] + ' % · ' + rr[1] + ' m²' })]); })),
        h('p', { 'class': 'ms-sum ok', tekst: '100 % fordelt ✓' }),
        snittUt,
        h('p', { 'class': 'ap-hint', tekst: 'Standardfordelingen. I studien kan andel og størrelse endres for hver av de fire.' })]));
      inn.appendChild(kort('Parkering', [glider('Parkering pr. bolig', 'parkering', 0, 2, 0.05, function (v) { return fmt(v, 2); }, nullstill)]));
      panel.appendChild(primar('Fortsett', function () { gaa(4); }));
    } else if (i === 4) {
      var kap = kapasitet(), ok = st.onsketBra <= kap, ingen = !st.alt.length;
      inn.appendChild(hode('Gjennomgang og oppstart'));
      if (ingen) inn.appendChild(kort('Ingen grep får plass', [h('p', { 'class': 'ms-sum nei', tekst: 'Ingen av de tre grepene får plass med disse rammene.' }),
        h('p', { 'class': 'ap-hint', tekst: 'Gå tilbake og reduser inntrekket fra tomtegrensen, eller endre ønsket BRA.' })]));
      inn.appendChild(kort('Studien', [h('table', { 'class': 'ms-tabell' }, [h('tbody', {}, [
        rad('Eiendom', TOMT.navn + ', ' + fmt(TEIG) + ' m²'), rad('Byggbart areal', fmt(T.areal(byggbart())) + ' m²'), rad('Strategi', ramme().navn),
        rad('Ønsket BRA', fmt(st.onsketBra) + ' m²'), rad('Boligtype', st.boligtype === 'miks' ? 'Miks (leiligheter + rekkehus)' : 'Kun leiligheter')])])]));
      inn.appendChild(kort('Kapasitetskontroll mot plan', [h('p', { 'class': 'ms-sum ' + (ok ? 'ok' : 'nei'), tekst: ok ? 'Ønsket BRA ligger innenfor det planen rommer.' : 'Ønsket BRA er mer enn planen rommer.' }),
        h('p', { 'class': 'ap-hint', tekst: 'Planen rommer om lag ' + fmt(Math.round(kap / 10) * 10) + ' m² BRA (maks BYA ' + ramme().bya + ' % i ' + ramme().etasjer + ' etasjer).' })]));
      inn.appendChild(kort('Prioriteringer for vurdering', [vektlinje(false), h('p', { 'class': 'ap-hint', tekst: 'Standardvektingen. Du kan justere den på Resultater.' })]));
      panel.appendChild(primar('Start mulighetsstudie', function () { gaa(5); }, ingen));
    } else if (i === 5) {
      inn.appendChild(hode('Analyse', 'Fremdrift fase for fase.'));
      inn.appendChild(h('ol', { 'class': 'ms-faser' }, FASER.map(function (f, k) { return h('li', { 'class': k < st.analyse ? 'gjort' : k === st.analyse ? 'pa' : '' }, [h('i'), h('span', { tekst: f })]); })));
      inn.appendChild(h('p', { 'class': 'ap-hint', tekst: 'I Mulighetsstudie regner motoren analysen på tjeneren, med plan, naboer, terreng og sol. Her spilles fasene raskt gjennom, og tallene regnes forenklet i nettleseren.' }));
    } else if (i === 6) {
      tegnResultater(inn);
      panel.appendChild(primar('Gå til rapport', function () { gaa(7); }));
    } else {
      tegnRapport(inn);
      panel.appendChild(h('div', { 'class': 'ms-fot' }, [h('button', { type: 'button', 'class': 'ms-tilbake', tekst: 'Tilbake', onclick: function () { gaa(6); } }), h('a', { 'class': 'ap-knapp', href: rot.getAttribute('data-demo') || '#interesse', tekst: 'Se studien på deres egen tomt' })]));
    }
    settFokus(merke);
  }
  function byggbartTekst() { var b = T.areal(byggbart()); return 'Byggbart areal etter inntrekk og soner: ' + fmt(b) + ' m² (' + fmt(100 * b / TEIG) + ' % av tomten)'; }
  function snittTekst() { return 'Gj.snitt boligstørrelse ' + fmt(snittBraI(), 1) + ' m² BRA-i (internt bruksareal). Det tilsvarer ' + fmt(snittBra()) + ' m² BRA per bolig.'; }

  function spillAnalyse() {
    var k = 0;
    clearInterval(spillAnalyse.id); clearTimeout(spillAnalyse.slutt);
    st.analyse = 0; st.valgt = 0; tegnPanel();
    si('Analysen går.');
    function steg() {
      k++; st.analyse = k;
      if (st.trinn !== 5) { clearInterval(spillAnalyse.id); return; }
      tegnPanel(); tegnKart();
      if (k >= FASER.length) { clearInterval(spillAnalyse.id); spillAnalyse.slutt = setTimeout(function () { if (st.trinn === 5) { gaa(6); si('Analysen er ferdig. Resultatene vises.'); } }, rolig ? 100 : 500); }
    }
    spillAnalyse.id = setInterval(steg, rolig ? 120 : 650);
  }

  // Vektingen som en linje med skiller: flytt et skille, og bare de to nabovektene endres. Linja bygges én gang og
  // oppdateres på stedet, så skillet beholder fokus og pekerfangst mens det flyttes.
  function vektlinje(kanEndre, etter) {
    var boks = h('div', { 'class': 'ms-vekt' + (kanEndre ? ' kan' : '') }), linje = h('div', { 'class': 'ms-vektlinje' }), tegn = h('div', { 'class': 'ms-vekttegn' });
    var seg = [], tall = [], skiller = [];
    function sumTil(k) { var s = 0; for (var q = 0; q <= k; q++) s += st.vekter[q]; return s; }
    function oppdater() {
      var pos = [0, 1, 2, 3].map(sumTil), dytt = [0, 0, 0, 0], k;
      // Skiller som havner oppå hverandre når en vekt er null, skyves litt fra hverandre så begge kan gripes.
      for (k = 0; k < 3; k++) if (pos[k + 1] - pos[k] < 4) { dytt[k] -= 8; dytt[k + 1] += 8; }
      st.vekter.forEach(function (v, i) {
        seg[i].style.flex = String(Math.max(0.0001, v)); seg[i].title = LEDD[i] + ' ' + v + ' %'; tall[i].textContent = String(v);
        if (skiller[i]) {
          skiller[i].style.left = pos[i] + '%'; skiller[i].style.marginLeft = dytt[i] + 'px';
          skiller[i].setAttribute('aria-valuenow', pos[i]);
          skiller[i].setAttribute('aria-valuetext', LEDD[i] + ' ' + v + ' %, ' + LEDD[i + 1] + ' ' + st.vekter[i + 1] + ' %');
        }
      });
    }
    function flytt(idx, nySum) {
      var for_ = idx ? sumTil(idx - 1) : 0, par = st.vekter[idx] + st.vekter[idx + 1], a = Math.max(0, Math.min(par, Math.round(nySum - for_)));
      if (a === st.vekter[idx]) return;
      st.vekter[idx] = a; st.vekter[idx + 1] = par - a;
      poeng(); oppdater();
      if (etter) etter();
    }
    st.vekter.forEach(function (v, k) {
      seg[k] = h('span', { style: 'background:' + LEDDFARGE[k] }); linje.appendChild(seg[k]);
      tall[k] = h('b'); tegn.appendChild(h('span', {}, [h('i', { style: 'background:' + LEDDFARGE[k] }), LEDD[k] + ' ', tall[k]]));
    });
    if (kanEndre) [0, 1, 2, 3].forEach(function (idx) {
      var hd = h('button', { type: 'button', 'class': 'ms-skille', role: 'slider', 'aria-label': 'Skille mellom ' + LEDD[idx] + ' og ' + LEDD[idx + 1], 'aria-valuemin': 0, 'aria-valuemax': 100 });
      hd.addEventListener('pointerdown', function (e) {
        if (e.button > 0) return;
        e.preventDefault(); hd.focus({ preventScroll: true });
        try { hd.setPointerCapture(e.pointerId); } catch (_) {}
        function mv(ev) { var b = linje.getBoundingClientRect(); if (b.width) flytt(idx, 100 * (ev.clientX - b.left) / b.width); }
        function opp() { hd.removeEventListener('pointermove', mv); hd.removeEventListener('pointerup', opp); hd.removeEventListener('pointercancel', opp); }
        hd.addEventListener('pointermove', mv); hd.addEventListener('pointerup', opp); hd.addEventListener('pointercancel', opp);
      });
      hd.addEventListener('keydown', function (e) {
        var d = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1, PageDown: -5, PageUp: 5 }[e.key];
        if (!d) return;
        e.preventDefault(); flytt(idx, sumTil(idx) + d);
      });
      skiller[idx] = hd; linje.appendChild(hd);
    });
    boks.appendChild(h('div', { 'class': 'ms-vektspor' }, [linje])); boks.appendChild(tegn);
    boks.oppdater = oppdater;
    oppdater();
    return boks;
  }

  function tegnResultater(inn) {
    var a = st.alt[st.valgt];
    inn.appendChild(hode('Resultater'));
    var faner = [['oversikt', 'Oversikt'], ['sol', 'Sol og utsikt'], ['x1', 'Tegn selv', false], ['x2', 'Detaljerte resultater', false], ['okonomi', 'Økonomi'], ['x3', 'Følsomhetsanalyse', false]];
    inn.appendChild(h('div', { 'class': 'ms-faner', role: 'group', 'aria-label': 'Resultatene' }, faner.map(function (f) { return h('button', { type: 'button', 'aria-pressed': st.fane === f[0] ? 'true' : 'false', disabled: f[2] === false, title: f[2] === false ? 'Ikke med i demoen' : null, tekst: f[1], onclick: function () { st.fane = f[0]; tegnPanel(); tegnKart(); } }); })));
    if (st.fane === 'oversikt') {
      // Tabellen, linja om rangeringen og sammenligningen tegnes på nytt når en vekt flyttes. Resten av panelet står.
      var tabell = h('div', { 'class': 'ms-rulltabell' }), topp = h('p', { 'class': 'ms-sum', hidden: true }), sml = h('div', { 'class': 'ms-sml' }), vl;
      var tegnOversikt = function () {
        var rN = rang('scoreKjort'), rV = rang('score'), endret = st.vekter.join() !== st.kjortVekter.join(), forst = rV.indexOf(1);
        tabell.innerHTML = '';
        tabell.appendChild(h('table', { 'class': 'ms-tabell alt' }, [
          h('thead', {}, [h('tr', {}, ['#', 'Alternativ', 'BRA m²', 'Boliger', 'Solscore', 'Score'].map(function (tx, k) { return h('th', { 'class': k > 1 ? 'tall' : '', tekst: tx }); }))]),
          h('tbody', {}, st.alt.map(function (x, k) {
            return h('tr', { 'class': k === st.valgt ? 'valgt' : '', onclick: function () { st.valgt = k; tegnPanel(); tegnKart(); } }, [
              h('td', {}, [h('button', { type: 'button', 'class': 'ms-altknapp', 'aria-pressed': k === st.valgt ? 'true' : 'false', 'aria-label': 'Vis alternativ ' + x.id, tekst: x.id })]),
              h('td', {}, [h('b', { tekst: GREP[x.grep] }), k === 0 ? h('span', { 'class': 'ap-merke', tekst: '★ Anbefalt' }) : null]),
              h('td', { 'class': 'tall', tekst: fmt(x.tall.bra) }), h('td', { 'class': 'tall', tekst: fmt(x.tall.boliger) }),
              h('td', { 'class': 'tall', tekst: fmt(x.ledd.verdier[3]) }), h('td', { 'class': 'tall sterk', tekst: fmt(x.score) })]);
          }))]));
        // Som i studien: vektingen flytter ikke hovedalternativet. Rangeres et annet høyest, sies det i klartekst.
        topp.hidden = forst <= 0;
        topp.textContent = forst > 0 ? 'Med gjeldende vekting rangeres ' + st.alt[forst].id + ' · ' + GREP[st.alt[forst].grep] + ' høyest. A er beholdt som hovedalternativ i rapporten.' : '';
        sml.innerHTML = '';
        if (endret) {
          sml.appendChild(h('table', { 'class': 'ms-tabell' }, [h('thead', {}, [h('tr', {}, ['Alternativ', 'Score nå', 'Med ny vekting', 'Rang nå → ny'].map(function (tx, k) { return h('th', { 'class': k ? 'tall' : '', tekst: tx }); }))]),
            h('tbody', {}, st.alt.map(function (x, k) { return h('tr', {}, [h('td', { tekst: x.id + ' · ' + GREP[x.grep] }), h('td', { 'class': 'tall', tekst: fmt(x.scoreKjort) }), h('td', { 'class': 'tall sterk', tekst: fmt(x.score) }), h('td', { 'class': 'tall', tekst: rN[k] + ' → ' + rV[k] })]); }))]));
          sml.appendChild(h('p', { 'class': 'ap-hint', tekst: 'Rekkefølgen, bokstavene og hovedalternativet endres ikke av vektingen.' }));
          sml.appendChild(h('button', { type: 'button', 'class': 'ap-lenke', tekst: 'Tilbakestill til standard', onclick: function () { st.vekter = T.VEKTER.slice(); poeng(); vl.oppdater(); tegnOversikt(); var s = panel.querySelector('.ms-skille'); if (s && fokusIPanel) s.focus({ preventScroll: true }); } }));
        }
      };
      inn.appendChild(tabell); inn.appendChild(topp);
      inn.appendChild(kort('Slik er scoren beregnet · alternativ ' + a.id, [h('div', { 'class': 'ms-ledd' }, a.ledd.verdier.map(function (v, k) {
        return h('div', {}, [h('span', { tekst: LEDD[k] }), h('div', { 'class': 'stolpe' }, [h('i', { style: 'width:' + Math.round(v) + '%;background:' + LEDDFARGE[k] })]), h('b', { tekst: fmt(v) })]); })),
        h('p', { 'class': 'ap-hint', tekst: 'Soltimer på uterommet ved jevndøgn: ' + fmt(a.ledd.soltimer, 1) + ' t (krav ' + fmt(T.STUDIE.solKrav, 1) + ' t). Uterom ' + fmt(a.ledd.mua) + ' m² mot krav ' + fmt(a.ledd.muaKrav) + ' m².' })]));
      vl = vektlinje(true, tegnOversikt);
      inn.appendChild(kort('Prioriteringer for vurdering', [h('p', { 'class': 'ap-hint', tekst: 'Flytt et skille — bare de to nabovektene endres.' }), vl, sml]));
      tegnOversikt();
    } else if (st.fane === 'sol') {
      var les = h('p', { 'class': 'ms-sum' });
      function lesTekst() { var s2 = T.sol(T.STUDIE.bredde, st.dag, st.time), k2 = (st.time < 10 ? '0' : '') + Math.floor(st.time) + ':' + (st.time % 1 ? '30' : '00'); les.textContent = DAGER[st.dag][1] + ' · kl. ' + k2 + ' · ' + (s2.oppe ? 'solhøyde ' + fmt(s2.hoyde, 1) + '° · asimut ' + fmt(s2.asimut) + '°' : 'sola er nede'); }
      lesTekst();
      inn.appendChild(kort('Sol og skygge', [
        h('div', { 'class': 'ap-seg' }, Object.keys(DAGER).map(function (d) { return h('button', { type: 'button', 'aria-pressed': st.dag === d ? 'true' : 'false', tekst: DAGER[d][0], onclick: function () { st.dag = d; tegnPanel(); tegnKart(); } }); })),
        glider('Tidspunkt (soltid)', 'time', 6, 21, 0.5, function (v) { return (v < 10 ? '0' : '') + Math.floor(v) + ':' + (v % 1 ? '30' : '00'); }, function () { lesTekst(); tegnKart(); }), les,
        h('p', { 'class': 'ap-hint', tekst: 'Skyggene er kastet på flat mark av studiens egne volumer. Naboer og terreng er ikke med i demoen. I studien måles også dagslys og utsikt for hvert alternativ.' })]));
      inn.appendChild(kort('Soltimer på uterommet', [h('p', { 'class': 'ms-stor' }, [fmt(a.ledd.soltimer, 1) + ' t ', h('small', { tekst: 'ved jevndøgn kl. 9–16 · krav ' + fmt(T.STUDIE.solKrav, 1) + ' t' })]),
        h('p', { 'class': 'ap-hint', tekst: 'Solscore ' + fmt(a.ledd.verdier[3]) + ' av 100 for alternativ ' + a.id + '. Kravet gir 50 poeng, det dobbelte gir 100.' })]));
    } else {
      var mill = function (v) { return fmt(v / 1e6, 1) + ' mill. kr'; };
      var ut = h('div', {});
      function tegnKalk() {
        var c = kalkyle(a), rader = [['Salgspris/verdi', c.salg, 1], ['Entreprise', -c.entreprise], ['Finans', -c.finans], ['Tomtebelastning', -c.tomteverdi], ['Byggherrekostnader', -c.byggherre], ['BH fortjeneste', c.fortjeneste, 1]];
        ut.innerHTML = '';
        ut.appendChild(h('p', { 'class': 'ms-stor' }, [mill(c.residual) + ' ', h('small', { tekst: c.residual < 0 ? 'residual tomteverdi · prosjektet bærer ikke fortjenestekravet med disse forutsetningene' : 'residual tomteverdi · ' + fmt(c.perBolig / 1000) + ' 000 kr per bolig' })]));
        ut.appendChild(h('div', { 'class': 'ms-foss' }, rader.map(function (r2) { return h('div', {}, [h('span', { tekst: r2[0] }), h('div', { 'class': 'stolpe' }, [h('i', { 'class': r2[2] ? 'pluss' : 'minus', style: 'width:' + Math.max(1, Math.round(100 * Math.abs(r2[1]) / c.salg)) + '%' })]), h('b', { tekst: (r2[1] < 0 ? '−' : '') + fmt(Math.abs(r2[1]) / 1e6, 1) })]); })));
        ut.appendChild(h('p', { 'class': 'ap-hint', tekst: 'Tall i mill. kr. Salgspris/verdi er ' + fmt(c.braS) + ' m² BRA-i à ' + fmt(st.salgspris) + ' kr og ' + fmt(a.tall.parkering) + ' P-plasser à ' + fmt(T.KALKYLE.pPris) + ' kr. Tomtebelastning er residual tomteverdi. BH fortjeneste er ' + fmt(100 * c.fortjenesteAndel, 1) + ' % av salgsinntekten.' }));
      }
      tegnKalk();
      inn.appendChild(kort('Byggherrens regnestykke (residualmodell) · alternativ ' + a.id, [ut]));
      inn.appendChild(kort('Forutsetninger', [
        glider('Salgspris (kr/m² BRA-i)', 'salgspris', 50000, 130000, 1000, function (v) { return fmt(v); }, tegnKalk),
        glider('Byggekost (kr/m² BRA-i)', 'byggekost', 35000, 75000, 500, function (v) { return fmt(v); }, tegnKalk),
        glider('Fortjenestekrav', 'fortjeneste', 5, 25, 0.5, function (v) { return fmt(v, 1) + ' %'; }, tegnKalk),
        h('p', { 'class': 'ap-hint', tekst: 'Residual tomteverdi regner hva tomten tåler med fortjenestekravet. Forutsetningene er forslag, og dette er en tidligfase-kalkyle, ikke en takst.' })]));
    }
  }

  // En liten plan av et alternativ, til rapportsidene.
  function miniplan(a, medSkygge) {
    var g = T.grenser(RING), m = 6, w = g.x1 - g.x0 + 2 * m, hh = g.y1 - g.y0 + 2 * m;
    function P(r) { return r.map(function (q) { return (q[0] - g.x0 + m).toFixed(1) + ',' + (g.y1 - q[1] + m).toFixed(1); }).join(' '); }
    var s = '<svg viewBox="0 0 ' + w.toFixed(0) + ' ' + hh.toFixed(0) + '" aria-hidden="true"><polygon points="' + P(RING) + '" fill="#dfeedd" stroke="#14b8a6" stroke-width="1"/>';
    if (a.gaard) s += '<polygon points="' + P(a.gaard) + '" fill="#e2d2a4"/>';
    if (a.parkRing) s += '<polygon points="' + P(a.parkRing) + '" fill="#7fbf8a"/>';
    if (medSkygge) { var sl = T.sol(T.STUDIE.bredde, 'jevndogn', 12); a.bygg.forEach(function (b) { var r = T.skygge(b, sl); if (r) s += '<polygon points="' + P(r) + '" fill="#131820" fill-opacity=".18"/>'; }); }
    a.bygg.forEach(function (b) { s += '<polygon points="' + P(b.ring) + '" fill="' + (b.typ === 'rekkehus' ? '#f0a58f' : '#e8664f') + '" stroke="#b8432f" stroke-width=".5"/>'; });
    return s + '</svg>';
  }
  function tegnRapport(inn) {
    var a = st.alt[st.valgt], c = kalkyle(a), andre = st.alt.filter(function (x, k) { return k !== st.valgt; });
    inn.appendChild(hode('Rapport', 'A3-rapporten bygges av studien. Her er et utdrag med tallene fra demoen.'));
    function side(tittel, barn) { return h('article', { 'class': 'ms-a3' }, [h('header', {}, [h('span', { tekst: 'Eksempeltunet · Mulighetsstudie' }), h('span', { tekst: 'A3' })]), h('h4', { tekst: tittel })].concat(barn)); }
    function nokkel(k, v) { return h('div', {}, [h('span', { tekst: k }), h('b', { tekst: v })]); }
    inn.appendChild(h('div', { 'class': 'ms-sider' }, [
      side('Sammendrag og anbefaling', [h('div', { 'class': 'ms-a3-to' }, [h('div', { html: miniplan(a) }), h('div', { 'class': 'ms-nokler' }, [nokkel('Hovedalternativ', 'Alternativ ' + a.id), nokkel('BRA', fmt(a.tall.bra) + ' m²'), nokkel('Boliger', fmt(a.tall.boliger)), nokkel('Score', fmt(a.score) + ' av 100')])]), h('p', { tekst: GREP[a.grep] + '.' })]),
      side('Utbyggingsgrep', [h('div', { 'class': 'ms-a3-tre' }, st.alt.map(function (x) { return h('div', {}, [h('div', { html: miniplan(x) }), h('span', { tekst: x.id + ' · ' + fmt(x.tall.boliger) + ' boliger' })]); }))]),
      side('Arealregnskap', [h('div', { 'class': 'ms-nokler bred' }, [nokkel('BTA', fmt(a.tall.bta) + ' m²'), nokkel('BRA', fmt(a.tall.bra) + ' m²'), nokkel('BRA-i', fmt(c.braS) + ' m²'), nokkel('BYA', fmt(a.tall.bya, 1) + ' %'), nokkel('%-BRA', fmt(100 * a.tall.bra / TEIG) + ' %'), nokkel('P-plasser', fmt(a.tall.parkering))])]),
      side('Sol og skygge', [h('div', { 'class': 'ms-a3-to' }, [h('div', { html: miniplan(a, true) }), h('div', { 'class': 'ms-nokler' }, [nokkel('Jevndøgn kl. 12', 'skygger'), nokkel('Soltimer uterom', fmt(a.ledd.soltimer, 1) + ' t'), nokkel('Solscore', fmt(a.ledd.verdier[3]) + ' av 100')])])]),
      side('Tomteverdi og økonomi', [h('div', { 'class': 'ms-nokler bred' }, [nokkel('Salgsinntekt', fmt(c.salg / 1e6, 1) + ' mill.'), nokkel('Entreprise', fmt(c.entreprise / 1e6, 1) + ' mill.'), nokkel('Residual tomteverdi', fmt(c.tomteverdi / 1e6, 1) + ' mill.')])])
    ]));
    inn.appendChild(h('p', { 'class': 'ap-hint', tekst: 'A3-rapporten i studien har også kapitlene Tomten og området, Hovedalternativet, Støy, Risiko og avklaringsbehov og Neste steg, med vedlegg. Teaseren er en kortversjon i A3. Begge lastes ned som PDF.' }));
  }

  tegnSteg(); tegnPanel(); tegnKart();
  rot.classList.add('klar');
  rot.__studie = { st: st, gaa: gaa, kart: kart, regn: regn };
})();
