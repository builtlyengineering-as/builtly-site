/* www.builtly.ai: demoen av Autoplan i Maps. Kilde: tools/nettsted/autoplan.js. Bruker tomt.js (regningen) og kart.js (kartet).
   Demoen følger flyten i produktet: hurtiganalysen, bryteren «Aktiver», gliderne, live-skissen og alternativene A, B og C.
   Tekstene i panelet er produktets egne. Skissen regnes i nettleseren ved hver endring, slik live-skissen i Maps gjør.
   Alternativene tegnes også forenklet her. I Maps regner studiens motor dem på tjeneren. Alt er eksempeldata. */
(function () {
  'use strict';
  var rot = document.querySelector('[data-autoplan]');
  if (!rot) return;
  var T = window.BuiltlyTomt, K = window.BuiltlyKart;
  if (!T || !K) { document.documentElement.classList.add('uten-skript'); return; }
  var rolig = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fmt = T.fmt;

  var TX = {
    analyser: 'Analyser område', ny: 'Ny', paa: 'På', autoplan: 'Autoplan',
    sub: 'Builtly tegner situasjonsplanen med bygg, uterom og kjøreareal på området — live mens du justerer, og studiens motor regner alternativer i bakgrunnen.',
    aktiver: 'Aktiver', tilbake: '‹ Full analysemeny',
    v1: 'Bruk eiendomsgrensen', v1s: 'Hele tomten slik den er registrert i matrikkelen', anbefalt: 'Anbefalt',
    v2: 'Legg til flere eiendommer', v2s: 'Klikk tomtene i kartet — arealene summeres',
    v3: 'Tegn eget område', v3s: 'Klikk hjørne for hjørne i kartet — f.eks. et delfelt',
    omraade: 'Område', o1: 'Eiendomsgrensen', o2: 'Flere eiendommer', o3: 'Tegn eget',
    formaal: 'Formål', f1: 'Bolig', f2: 'Kontor', f3: 'Hotell', f4: 'Industri / lager',
    typologi: 'Typologi', t1: 'Blokk', t2: 'Rekkehus', t3: 'Miks',
    maal: 'Mål', m1: '% BYA', m2: 'BRA (m²)',
    gBya: 'Mål for bebygd areal', gBra: 'Mål for BRA', gEt: 'Maks etasjer', gSnitt: 'Snitt boligstørrelse', gPark: 'Parkering per bolig',
    gAvst: 'Avstand fra tomtegrensen', gDrag: 'Bredde på grøntdraget',
    grontdrag: 'Grøntdrag', park: 'Park', av: 'Av', auto: 'Automatisk',
    hint: 'Skissen følger deg mens du drar — i området og i gliderne. Studiens motor regner varianter når du stopper.',
    live: 'Live-skisse', liveS: 'Forenklet — rader i byggbart areal mot målet. Uten planregler, naboer, sol og terreng.',
    motor: 'Studiens motor regner varianter',
    lineaert: 'Lineært grep', kvartal: 'Kvartal med gårdsrom', klynge: 'Klynger rundt park',
    bya: 'BYA', bra: 'BRA', boliger: 'Boliger', bygg: 'Bygg', mua: 'Uterom (MUA)', pp: 'P-plasser (antall)', ppKort: 'P-plasser', etasjer: 'Etasjer', tomt: 'Tomt',
    uteOk: 'Uterom dekker kravet', uteNei: 'Uterom under kravet',
    ikkeNaadd: 'Målet lot seg ikke nå innenfor etasjegrensen — se tallene på kortene.',
    ikkeNaaddBya: 'Bebygd areal er et mål, ikke et tak — tallet på kortet er det skissen faktisk tegnet.',
    forLiten: 'Området er under 6 000 m², og da tegnes ikke noe grøntdrag.', ensidig: 'Grøntdraget tegnes bare når begge sidene er store nok til å bebygges.',
    fyller: 'Målet fyller tomta, så det blir ingen park.',
    fortsett: 'Fortsett i mulighetsstudie ›', eksempel: 'Demo med eksempeldata',
    merknader: 'Forutsetninger og merknader',
    n1: 'Mulighetsstudiens motor tegner grep med bygg og nøkkeltall på området. En skisse — ikke en studie.',
    n2: 'Ikke målt her: naboer, terreng, planens felt og sol. Det gjør mulighetsstudien.',
    n3: 'Parkering er et antall (dekning × boliger) — plassene er ikke tegnet.',
    n4: 'Bebygd areal er et mål, ikke et tak — tallet på kortet er det motoren faktisk tegnet.',
    n5: 'Demoen regner i nettleseren med reglene fra live-skissen. Også alternativene er tegnet forenklet her. I Maps regner studiens motor dem.',
    n6: '«Anbefalt» er her grepet med høyest sum i en forenklet utgave av studiens poengmodell.',
    justert: 'Justert av deg — anslag', angre: '↶ Angre', gjorOm: '↷ Gjør om', alternativ: 'Forslag',
    lengde: 'Lengde', bredde: 'Bredde', fjern: 'Fjern bygget', nullstill: 'Tilbakestill bygget', lukk: 'Lukk',
    utenfor1: '1 bygg står utenfor tomta.', utenforN: '{n} bygg står utenfor tomta.',
    brann1: '1 par bygg står nærmere enn 8 m (brannavstand — brannvegg kreves).', brannN: '{n} par bygg står nærmere enn 8 m (brannavstand — brannvegg kreves).',
    anslag: 'Tallene i kartet er justert etter endringene — et anslag: BRA og boliger følger volumet, MUA er ikke målt.',
    tips: 'Dra i gliderne. Klikk et bygg for å endre det, eller dra det dit du vil.', tips3d: 'Prøv 3D øverst til høyre.',
    ikkeMed: 'Ikke med i demoen', slaattSammen: '2 tomter slått sammen · {m2} m² — planen tegnes på det samlede området.',
    blokkNavn: 'Blokk', rekkeNavn: 'Rekkehus', punktNavn: 'Punkthus',
    rekkeEn: 'Rekkehus · {n} enheter på rad', rekkeFlere: 'Rekkehus · {n} enheter i {r} rekker', enVariant: 'Rekkehus gir ett grep — konseptfamiliene blir like.',
    husTast: '{navn}, {n} etasjer. Enter åpner redigering, piltastene flytter bygget.'
  };

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

  var st = { paa: false, tomt: 'A', typologi: 'blokk', maal: 'bya', bya: 25, bra: 5000, etasjer: 4, snitt: 70, parkering: 0.8, avstand: 4,
    grontdrag: true, park: true, grontBredde: 12, modus: 'skisse', alt: null, altValgt: -1, justert: false, valgt: null, bygg: [], inn: 1 };
  var hist = [], fram = [], sk = null, motorTid = null, motorTikk = null, pilleStart = 0;

  // ---------- skjelettet ----------
  rot.innerHTML = '';
  var panel = h('div', { 'class': 'ap-panel' });
  var kartBoks = h('div', { 'class': 'ap-kart' });
  var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Kart over eksempeltomta med situasjonsplanen Autoplan tegner');
  kartBoks.appendChild(svg);
  var visning = h('div', { 'class': 'ap-seg liten ap-visning', role: 'group', 'aria-label': 'Perspektiv' }, [
    h('button', { type: 'button', 'aria-pressed': 'true', tekst: '2D', onclick: function () { settVisning(0); } }),
    h('button', { type: 'button', 'aria-pressed': 'false', tekst: '3D', onclick: function () { settVisning(1); } })
  ]);
  var pille = h('div', { 'class': 'ap-pille', 'aria-hidden': 'true' }, [h('i'), TX.motor + ' ', h('span', { tekst: '0,0 s' })]);
  var tallrad = h('div', { 'class': 'ap-tallrad' });
  var status = h('div', { 'class': 'ap-sr', 'aria-live': 'polite' }), statusTid = null;
  var tips = h('div', { 'class': 'ap-tips' });
  var velger = h('div', { 'class': 'ap-velger', role: 'group', 'aria-label': 'Forslagene', hidden: true });
  kartBoks.appendChild(velger);
  kartBoks.appendChild(visning); kartBoks.appendChild(pille); kartBoks.appendChild(tallrad); kartBoks.appendChild(tips);
  var ap = h('div', { 'class': 'ap' }, [panel, kartBoks]);
  rot.appendChild(ap); rot.appendChild(status);
  var kart = new K.Kart(svg, { fokus: K.fokusFor(T.TOMTER.A.ring, 4.6) });

  function ring() { return T.TOMTER[st.tomt].ring; }
  function teig() { return T.areal(ring()); }

  // ---------- tegningen i kartet ----------
  function ease(u) { return 1 - Math.pow(1 - u, 3); }
  function prismer() {
    var e = ease(st.inn);
    return st.bygg.map(function (b) {
      var c = T.tyngde(b.ring), r = e >= 1 ? b.ring : b.ring.map(function (q) { return [c[0] + (q[0] - c[0]) * e, c[1] + (q[1] - c[1]) * e]; });
      return { ring: r, hoyde: b.etasjer * T.REGEL.etasjehoyde, vekst: e, klasse: 'k-bygg' + (b.typ === 'rekkehus' ? ' rekke' : ''), id: b.id, merke: e > 0.9 ? b.etasjer : null, valgt: st.valgt === b.id,
        etikett: e >= 1 ? TX.husTast.replace('{navn}', husNavn(b)).replace('{n}', b.etasjer) : null };
    });
  }
  function husNavn(b) { return (b.typ === 'rekkehus' ? TX.rekkeNavn : b.typ === 'punkthus' ? TX.punktNavn : TX.blokkNavn) + ' ' + String(b.id).replace('B', ''); }
  function tegnPlan() {
    var g = kart.planG, el = K.el, pkt = K.pkt, r = ring();
    g.innerHTML = '';
    if (st.tomt === 'A') {
      var annen = el('polygon', { points: pkt(T.TOMTER.B.ring), 'class': 'k-tomt annen' }, g);
      annen.addEventListener('click', function () { settTomt('AB'); });
      var tt = el('title', {}, annen); tt.textContent = 'Eksempelgata 14: klikk for å legge til tomta';
    }
    if (st.paa) {
      el('polygon', { points: pkt(r), 'class': 'k-plen' }, g);
      var frie = aktiveFrie();
      frie.park.forEach(function (p) { el('polygon', { points: pkt(p), 'class': 'k-park' }, g); });
      frie.tun.forEach(function (p) { el('polygon', { points: pkt(p), 'class': 'k-tun' }, g); });
      // Gangveiene: en akse fra gata og stikk inn til hvert hus.
      var gr = T.grenser(r), c = T.tyngde(r), sor = [c[0] + 1.5, gr.y0 + 1], nord = [c[0] - 1.5, c[1] + (gr.y1 - c[1]) * 0.55];
      el('polyline', { points: pkt([sor, c, nord]), 'class': 'k-gangvei' }, g);
      st.bygg.forEach(function (b) {
        var m = T.tyngde(b.ring), tt2 = Math.max(0, Math.min(1, (m[1] - sor[1]) / Math.max(1, nord[1] - sor[1])));
        el('polyline', { points: pkt([m, [sor[0] + (nord[0] - sor[0]) * tt2, m[1]]]), 'class': 'k-gangvei' }, g);
      });
      if (frie.lek) el('circle', { cx: frie.lek[0], cy: frie.lek[1], r: 4.2, 'class': 'k-lek' }, g);
      grense = el('polygon', { points: pkt(T.innrykk(r, st.avstand)), 'class': 'k-grense' }, g);
    }
    el('polygon', { points: pkt(r), 'class': 'k-tomt', fill: st.paa ? 'none' : undefined }, g);
    kart.planTraer = st.paa ? planTraer() : [];
    kart.settPrismer(prismer());
  }
  var grense = null, grenseTid = null;
  function visGrense() {
    if (!grense) return;
    grense.classList.add('vis');
    clearTimeout(grenseTid);
    grenseTid = setTimeout(function () { if (grense) grense.classList.remove('vis'); }, 1400);
  }
  // Flatene som holdes åpne i planen som vises nå.
  function aktiveFrie() {
    var ut = { park: [], tun: [], lek: null };
    if (st.modus === 'skisse' && sk) {
      if (sk.park.aktiv) ut.park.push(sk.park.ring);
      if (sk.grontdrag.aktiv) ut.park.push(sk.grontdrag.ring);
    } else if (st.alt && st.alt[st.altValgt]) {
      var a = st.alt[st.altValgt];
      if (a.gaard) ut.tun.push(a.gaard);
      if (a.parkRing) ut.park.push(a.parkRing);
    }
    if (st.bygg.length) {
      var u = T.uterom(ring(), st.bygg, 3);
      if (u.storstAreal > 300) { var sx = 0, sy = 0; u.storst.forEach(function (o) { sx += o.p[0]; sy += o.p[1]; }); ut.lek = [sx / u.storst.length, sy / u.storst.length]; }
    }
    return ut;
  }
  function planTraer() {
    var ut = [], frie = aktiveFrie(), r = ring(), n = 0;
    frie.park.forEach(function (p) {
      var g = T.grenser(p), nx = Math.max(2, Math.round((g.x1 - g.x0) / 11)), ny = Math.max(1, Math.round((g.y1 - g.y0) / 11));
      for (var i = 0; i < nx; i++) for (var j = 0; j < ny; j++) {
        var q = [g.x0 + (i + 0.5) * (g.x1 - g.x0) / nx + ((i * 7 + j * 3) % 5 - 2) * 0.6, g.y0 + (j + 0.5) * (g.y1 - g.y0) / ny + ((i * 5 + j * 11) % 5 - 2) * 0.6];
        if (T.inne(q, p) && T.inne(q, r) && !st.bygg.some(function (b) { return T.avstand([q], b.ring) < 3; })) { ut.push(q); n++; }
      }
    });
    return ut;
  }
  // ---------- regningen ----------
  function regn(medInn) {
    sk = T.skisse(ring(), st);
    st.modus = 'skisse'; st.alt = null; st.altValgt = -1; st.justert = false; st.valgt = null;
    st.bygg = kopier(sk.bygg);
    hist = []; fram = [];
    lukkRediger();
    if (medInn) spillInn(); else { st.inn = 1; tegnPlan(); }
    tegnResultat(); tegnTallrad(); oppdaterGrunner();
    planleggMotor();
  }
  function kopier(bygg) { return bygg.map(function (b) { var k = {}; for (var n in b) k[n] = b[n]; k.ring = b.ring.map(function (q) { return [q[0], q[1]]; }); k.opprinnelig = { ring: k.ring.map(function (q) { return [q[0], q[1]]; }), etasjer: b.etasjer, lengde: b.lengde, dybde: b.dybde, enheter: b.enheter }; return k; }); }
  function spillInn() {
    if (rolig) { st.inn = 1; tegnPlan(); return; }
    var start = null;
    st.inn = 0; tegnPlan();
    cancelAnimationFrame(spillInn.id);
    (function steg(naa) {
      if (start == null) start = naa || performance.now();
      st.inn = Math.min(1, ((naa || start) - start) / 620);
      kart.settPrismer(prismer());
      if (st.inn < 1) spillInn.id = requestAnimationFrame(steg);
    })();
  }
  function tallNaa() {
    var t = T.tall(st.bygg, st, teig());
    if (st.modus === 'skisse' && sk && !st.justert) { if (sk.tall.park) t.park = sk.tall.park; if (sk.tall.grontdrag) t.grontdrag = sk.tall.grontdrag; }
    return t;
  }
  function stoppMotor() { clearTimeout(motorTid); clearInterval(motorTikk); pille.classList.remove('vis'); }
  function planleggMotor() {
    stoppMotor();
    if (!st.paa) return;
    motorTid = setTimeout(function () {
      pilleStart = performance.now();
      pille.classList.add('vis');
      motorTikk = setInterval(function () { pille.lastChild.textContent = fmt((performance.now() - pilleStart) / 1000, 1) + ' s'; }, 100);
      motorTid = setTimeout(function () {
        clearInterval(motorTikk); pille.classList.remove('vis');
        var alt = T.alternativer(ring(), st), best = -1, bestScore = -1;
        // Som i Maps: rekkehus gir ett grep, for konseptfamiliene blir like.
        if (st.typologi === 'rekkehus' && alt.length > 1) alt = [alt.filter(function (a) { return a.grep === 'lineaert'; })[0] || alt[0]];
        if (!alt.length) return; // ingenting får plass: live-skissen blir stående
        alt.forEach(function (a, i) {
          a.maalBra = st.maal === 'bra' ? a.maal : 0;
          a.ledd = T.ledd(a, ring(), { maksBya: 35, avstand: st.avstand });
          a.score = T.score(a.ledd).total;
          if (a.score > bestScore) { bestScore = a.score; best = i; }
        });
        st.alt = alt;
        velgAlt(best, true);
      }, rolig ? 300 : 1500);
    }, 700);
  }
  function velgAlt(i, forste) {
    if (!st.alt || !st.alt[i]) return;
    st.altValgt = i; st.modus = 'alt'; st.justert = false; st.valgt = null;
    st.bygg = kopier(st.alt[i].bygg);
    hist = []; fram = [];
    lukkRediger();
    spillInn(); tegnResultat(); tegnTallrad();
    if (forste) visTips(TX.tips3d);
  }

  // ---------- panelet ----------
  var ref = {};
  function seg(navn, valg, nu, klikk) {
    return h('div', { 'class': 'ap-seg', role: 'group', 'aria-label': navn }, valg.map(function (v) {
      return h('button', { type: 'button', 'aria-pressed': v[0] === nu ? 'true' : 'false', disabled: v[2] === false, title: v[2] === false ? TX.ikkeMed : null, tekst: v[1], 'data-v': v[0], onclick: function () { if (v[2] !== false) klikk(v[0]); } });
    }));
  }
  function gruppe(navn, innhold) { return h('div', {}, [h('div', { 'class': 'ap-l', tekst: navn }), innhold]); }
  function glider(nokkel, navn, min, maks, steg, enhet, des, hel) {
    var ut = h('output', {}), inn = h('input', { type: 'range', min: min, max: maks, step: steg, value: st[nokkel], 'aria-label': navn });
    function vis() { ut.textContent = fmt(Number(inn.value), des || 0) + (enhet ? ' ' + enhet : ''); }
    inn.addEventListener('input', function () { st[nokkel] = Number(inn.value); vis(); if (nokkel === 'avstand') { regn(); visGrense(); } else regn(); });
    vis();
    var boks = h('label', { 'class': 'ap-glider' + (hel ? ' hel' : '') }, [h('span', {}, [navn, ut]), inn]);
    ref['g_' + nokkel] = boks;
    return boks;
  }
  function byggStart() {
    var t = T.TOMTER.A;
    panel.innerHTML = '';
    panel.appendChild(h('div', { 'class': 'ap-hode' }, [h('h3', { tekst: TX.analyser })]));
    var aktiver = h('button', { type: 'button', 'class': 'ap-knapp puls', tekst: TX.aktiver, onclick: function () { slaaPaa(); } });
    panel.appendChild(h('div', { 'class': 'ap-rull' }, [
      h('p', { 'class': 'ap-eie' }, [h('b', { tekst: t.navn }), 'Gnr/bnr ' + t.gnrbnr + ' · Tomteareal ' + fmt(T.areal(t.ring)) + ' m²']),
      h('div', { 'class': 'ap-kortet' }, [h('h4', {}, [TX.autoplan, h('span', { 'class': 'ap-merke', tekst: TX.ny })]), h('p', { tekst: TX.sub }), aktiver]),
      h('div', { 'class': 'ap-valg', role: 'radiogroup', 'aria-label': TX.omraade }, [
        h('label', {}, [h('input', { type: 'radio', name: 'ap-omr', checked: st.tomt === 'A', onchange: function () { settTomt('A'); } }), h('div', {}, [h('b', {}, [TX.v1, h('span', { 'class': 'ap-merke', tekst: TX.anbefalt })]), h('span', { tekst: TX.v1s })])]),
        h('label', {}, [h('input', { type: 'radio', name: 'ap-omr', checked: st.tomt === 'AB', onchange: function () { settTomt('AB'); } }), h('div', {}, [h('b', { tekst: TX.v2 }), h('span', { tekst: TX.v2s })])]),
        h('label', { 'class': 'av', title: TX.ikkeMed }, [h('input', { type: 'radio', name: 'ap-omr', disabled: true }), h('div', {}, [h('b', { tekst: TX.v3 }), h('span', { tekst: TX.v3s })])])
      ])
    ]));
    panel.appendChild(h('div', { 'class': 'ap-fot' }, [h('span', { 'class': 'ap-hint', tekst: TX.eksempel })]));
  }
  function byggMeny() {
    panel.innerHTML = ''; ref = {};
    panel.appendChild(h('div', { 'class': 'ap-hode' }, [
      h('h3', {}, [TX.autoplan, h('span', { 'class': 'ap-merke', tekst: TX.paa })]),
      h('button', { type: 'button', 'class': 'ap-lenke', tekst: TX.tilbake, onclick: slaaAv })
    ]));
    ref.omr = h('p', { 'class': 'ap-eie' });
    ref.maalBoks = h('div', { 'class': 'ap-glidere' });
    ref.resultat = h('div', { style: 'display:grid;gap:10px' });
    ref.gdGrunn = h('p', { 'class': 'ap-hint' }); ref.pkGrunn = h('p', { 'class': 'ap-hint' });
    var rull = h('div', { 'class': 'ap-rull' }, [
      ref.omr,
      gruppe(TX.omraade, ref.omrSeg = seg(TX.omraade, [['A', TX.o1], ['AB', TX.o2], ['x', TX.o3, false]], st.tomt, function (v) { settTomt(v); })),
      gruppe(TX.formaal, seg(TX.formaal, [['bolig', TX.f1], ['kontor', TX.f2, false], ['hotell', TX.f3, false], ['lager', TX.f4, false]], 'bolig', function () {})),
      gruppe(TX.typologi, ref.typSeg = seg(TX.typologi, [['blokk', TX.t1], ['rekkehus', TX.t2], ['miks', TX.t3]], st.typologi, function (v) { st.typologi = v; trykk(ref.typSeg, v); regn(); })),
      gruppe(TX.maal, ref.maalSeg = seg(TX.maal, [['bya', TX.m1], ['bra', TX.m2]], st.maal, function (v) { st.maal = v; trykk(ref.maalSeg, v); byggGlidere(); regn(); })),
      ref.maalBoks,
      h('div', { 'class': 'ap-brytere' }, [
        h('div', {}, [h('div', { 'class': 'ap-l', tekst: TX.grontdrag }), ref.gdSeg = seg(TX.grontdrag, [[false, TX.av], [true, TX.auto]], st.grontdrag, function (v) { st.grontdrag = v; trykk(ref.gdSeg, v); byggGlidere(); regn(); })]),
        h('div', {}, [h('div', { 'class': 'ap-l', tekst: TX.park }), ref.pkSeg = seg(TX.park, [[false, TX.av], [true, TX.auto]], st.park, function (v) { st.park = v; trykk(ref.pkSeg, v); regn(); })])
      ]),
      ref.gdGrunn, ref.pkGrunn,
      h('p', { 'class': 'ap-hint', tekst: TX.hint }),
      ref.resultat,
      h('details', { 'class': 'ap-fold' }, [h('summary', { tekst: TX.merknader }), h('ul', {}, [TX.n1, TX.n2, TX.n3, TX.n4, TX.n5, TX.n6].map(function (t) { return h('li', { tekst: t }); }))])
    ]);
    panel.appendChild(rull);
    panel.appendChild(h('div', { 'class': 'ap-fot' }, [h('span', { 'class': 'ap-hint', tekst: TX.eksempel }), h('a', { href: rot.getAttribute('data-studielenke') || '/mulighetsstudie#demo', tekst: TX.fortsett })]));
    byggGlidere();
  }
  function trykk(segEl, v) { Array.prototype.forEach.call(segEl.children, function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-v')) === String(v) ? 'true' : 'false'); }); }
  function byggGlidere() {
    var b = ref.maalBoks; b.innerHTML = '';
    b.appendChild(st.maal === 'bya' ? glider('bya', TX.gBya, 5, 80, 1, '%', 0, true) : glider('bra', TX.gBra, 1000, 20000, 100, 'm²', 0, true));
    b.appendChild(glider('etasjer', TX.gEt, 1, 12, 1, ''));
    b.appendChild(glider('snitt', TX.gSnitt, 30, 200, 5, 'm²'));
    b.appendChild(glider('parkering', TX.gPark, 0, 3, 0.05, '', 2));
    b.appendChild(glider('avstand', TX.gAvst, 0, 10, 0.5, 'm', 1));
    if (st.grontdrag) b.appendChild(glider('grontBredde', TX.gDrag, 6, 30, 1, 'm', 0, true));
  }
  function oppdaterGrunner() {
    if (!ref.omr) return;
    ref.omr.textContent = '';
    if (st.tomt === 'AB') ref.omr.appendChild(document.createTextNode(TX.slaattSammen.replace('{m2}', fmt(teig()))));
    else { ref.omr.appendChild(h('b', { tekst: T.TOMTER.A.navn })); ref.omr.appendChild(document.createTextNode(TX.omraade + ' ' + fmt(teig()) + ' m²')); }
    var g = sk && sk.grontdrag, p = sk && sk.park;
    ref.gdGrunn.textContent = st.grontdrag && g && !g.aktiv ? (g.grunn === 'for_liten' ? TX.forLiten : TX.ensidig) : '';
    ref.gdGrunn.hidden = !ref.gdGrunn.textContent;
    ref.pkGrunn.textContent = st.park && p && !p.aktiv ? TX.fyller : '';
    ref.pkGrunn.hidden = !ref.pkGrunn.textContent;
    if (ref.g_grontBredde) ref.g_grontBredde.hidden = !(g && g.aktiv);
  }
  function tallListe(t, maal, ekstra) {
    var rader = [
      [TX.bya, fmt(t.bya, 1) + ' %', maal && maal.form === 'bya' ? 'mål ' + fmt(maal.verdi, maal.verdi % 1 ? 1 : 0) : ''],
      [TX.bra, fmt(t.bra) + ' m²', maal && maal.form === 'bra' ? 'mål ' + fmt(maal.verdi) : ''],
      [TX.boliger, fmt(t.boliger), ''], [TX.bygg, fmt(t.bygg), ''], [TX.pp, fmt(t.parkering), ''],
      [TX.etasjer, t.etasjerMin === t.etasjerMaks ? String(t.etasjerMaks) : t.etasjerMin + '–' + t.etasjerMaks, '']
    ];
    if (ekstra) rader.splice(4, 0, ekstra);
    if (t.park) rader.push([TX.park, fmt(t.park) + ' m²', '']);
    if (t.grontdrag) rader.push([TX.grontdrag, fmt(t.grontdrag) + ' m²', '']);
    return h('dl', { 'class': 'ap-tall' }, rader.map(function (r) { return h('div', {}, [h('dt', { tekst: r[0] }), h('dd', {}, [r[1], r[2] ? h('small', { tekst: r[2] }) : null])]); }));
  }
  // Kortene og brikkene bygges på nytt ved hvert valg. Sto tastaturfokus på en av dem, følger det med.
  function medFokus(boks, tegn) {
    var a = document.activeElement, i = -1, k;
    if (a && boks && boks.contains(a)) { k = boks.querySelectorAll('button'); i = Array.prototype.indexOf.call(k, a); }
    tegn();
    if (i >= 0) { k = boks.querySelectorAll('button'); if (k[i]) k[i].focus({ preventScroll: true }); }
  }
  function grepNavn(a) {
    if (st.typologi !== 'rekkehus') return TX[a.grep];
    var n = 0; a.bygg.forEach(function (b) { n += b.enheter || 0; });
    n = n || a.tall.boliger;
    return a.bygg.length === 1 ? TX.rekkeEn.replace('{n}', n) : TX.rekkeFlere.replace('{n}', n).replace('{r}', a.bygg.length);
  }
  function erBest(a) { return st.alt.length > 1 && st.alt.every(function (b) { return b.score <= a.score; }); }
  function tegnResultat() {
    medFokus(velger, tegnVelger);
    if (ref.resultat) medFokus(ref.resultat, tegnKort);
    meldTall();
  }
  function meldTall() {
    clearTimeout(statusTid);
    statusTid = setTimeout(function () {
      if (!st.paa) { status.textContent = ''; return; }
      var t = tallNaa();
      status.textContent = (st.modus === 'alt' && st.alt ? TX.alternativ + ' ' + st.alt[st.altValgt].id + ': ' + grepNavn(st.alt[st.altValgt]) : TX.live) + '. ' + TX.bya + ' ' + fmt(t.bya, 1) + ' %, ' + TX.bra + ' ' + fmt(t.bra) + ' m², ' + fmt(t.boliger) + ' boliger.';
    }, 700);
  }
  function tegnKort() {
    var boks = ref.resultat;
    boks.innerHTML = '';
    if (!st.alt) {
      boks.appendChild(h('div', { 'class': 'ap-kort' }, [
        h('div', { 'class': 'ap-kort-hode' }, [h('span', { 'class': 'bokstav live', tekst: '~' }), h('h5', { tekst: TX.live })]),
        h('p', { 'class': 'etikett', tekst: TX.liveS }),
        tallListe(sk.tall, sk.maal),
        sk.maal.naadd ? null : h('p', { 'class': 'ap-varsel', tekst: st.maal === 'bra' ? TX.ikkeNaadd : TX.ikkeNaaddBya })
      ]));
      return;
    }
    st.alt.forEach(function (a, i) {
      var best = erBest(a);
      var ok = a.ledd.mua >= a.ledd.muaKrav;
      boks.appendChild(h('button', { type: 'button', 'class': 'ap-kort', 'aria-pressed': i === st.altValgt ? 'true' : 'false', onclick: function () { velgAlt(i); } }, [
        h('div', { 'class': 'ap-kort-hode' }, [h('span', { 'class': 'bokstav', tekst: a.id }), h('h5', { tekst: grepNavn(a) }), best ? h('span', { 'class': 'ap-merke', tekst: TX.anbefalt }) : null]),
        tallListe(a.tall, { form: st.maal, verdi: a.maal }, [TX.mua, fmt(a.ledd.mua) + ' m²', 'krav ' + fmt(a.ledd.muaKrav)]),
        h('span', { 'class': 'ap-status ' + (ok ? 'ok' : 'nei'), tekst: ok ? TX.uteOk : TX.uteNei }),
        a.naadd ? null : h('p', { 'class': 'ap-varsel', tekst: st.maal === 'bra' ? TX.ikkeNaadd : TX.ikkeNaaddBya })
      ]));
    });
    if (st.typologi === 'rekkehus') boks.appendChild(h('p', { 'class': 'ap-hint', tekst: TX.enVariant }));
  }
  // Alternativene som brikker i kartet, så de kan byttes uten å rulle i panelet.
  function tegnVelger() {
    velger.innerHTML = '';
    velger.hidden = !(st.paa && st.alt);
    if (velger.hidden) return;
    st.alt.forEach(function (a, i) {
      var best = erBest(a);
      velger.appendChild(h('button', { type: 'button', 'aria-pressed': i === st.altValgt ? 'true' : 'false', onclick: function () { velgAlt(i); } }, [
        h('span', { 'class': 'bokstav', tekst: a.id }), h('span', { tekst: grepNavn(a) }), best ? h('span', { 'class': 'ap-merke', tekst: TX.anbefalt }) : null]));
    });
  }
  function tegnTallrad() {
    tallrad.innerHTML = '';
    if (!st.paa) { tallrad.hidden = true; return; }
    tallrad.hidden = false;
    var t = tallNaa(), navn = st.modus === 'alt' && st.alt ? TX.alternativ + ' ' + st.alt[st.altValgt].id : TX.live;
    tallrad.appendChild(h('span', { 'class': 'hva', tekst: navn }));
    [[TX.tomt, fmt(teig()) + ' m²'], [TX.bya, fmt(t.bya, 1) + ' %'], [TX.bra, fmt(t.bra) + ' m²'], [TX.boliger, fmt(t.boliger)], [TX.bygg, fmt(t.bygg)], [TX.ppKort, fmt(t.parkering)]].forEach(function (r) {
      tallrad.appendChild(h('span', {}, [r[0], h('b', { tekst: r[1] })]));
    });
    if (st.justert) tallrad.appendChild(h('span', { 'class': 'just', tekst: TX.justert }));
    var brudd = bruddTekst();
    if (brudd) tallrad.appendChild(h('span', { 'class': 'just', tekst: brudd }));
    if (hist.length || fram.length) tallrad.appendChild(h('span', { 'class': 'angre' }, [
      hist.length ? h('button', { type: 'button', tekst: TX.angre, onclick: angre }) : null,
      fram.length ? h('button', { type: 'button', tekst: TX.gjorOm, onclick: gjorOm }) : null]));
  }
  function bruddTekst() {
    if (!st.justert) return '';
    var r = ring(), ute = 0, par = 0, i, j;
    for (i = 0; i < st.bygg.length; i++) {
      if (!T.helInne(st.bygg[i].ring, r, 0.05)) ute++;
      for (j = i + 1; j < st.bygg.length; j++) if (T.avstand(st.bygg[i].ring, st.bygg[j].ring) < T.REGEL.brann - 0.05) par++;
    }
    var ut = [];
    if (ute) ut.push(ute === 1 ? TX.utenfor1 : TX.utenforN.replace('{n}', ute));
    if (par) ut.push(par === 1 ? TX.brann1 : TX.brannN.replace('{n}', par));
    return ut.join(' ');
  }
  function visTips(tekst) {
    tips.textContent = tekst; tips.classList.add('vis');
    clearTimeout(visTips.tid);
    visTips.tid = setTimeout(function () { tips.classList.remove('vis'); }, 6500);
  }

  // ---------- handlingene ----------
  function fokusI(velg) { var e = panel.querySelector(velg); if (e) { if (e.tagName === 'H3') e.setAttribute('tabindex', '-1'); e.focus({ preventScroll: true }); } }
  function slaaPaa() {
    var hadde = panel.contains(document.activeElement);
    st.paa = true;
    byggMeny(); regn(true);
    visTips(TX.tips);
    if (hadde) fokusI('h3');
  }
  function slaaAv() {
    var hadde = panel.contains(document.activeElement);
    st.paa = false; st.bygg = []; st.alt = null; sk = null;
    stoppMotor();
    lukkRediger(); byggStart(); tegnPlan(); tegnTallrad(); tegnVelger(); meldTall();
    if (kart.t > 0) settVisning(0);
    if (hadde) fokusI('.ap-knapp');
  }
  function settTomt(id) {
    if (st.tomt === id) return;
    st.tomt = id;
    kart.gaaTil(kart.t, K.fokusFor(ring(), id === 'AB' ? 3.9 : 4.6));
    if (st.paa) { trykk(ref.omrSeg, id); regn(true); } else { byggStart(); tegnPlan(); }
  }
  function settVisning(t) {
    Array.prototype.forEach.call(visning.children, function (b, i) { b.setAttribute('aria-pressed', i === t ? 'true' : 'false'); });
    lukkRediger();
    if (t && tips.textContent === TX.tips3d) { clearTimeout(visTips.tid); tips.classList.remove('vis'); }
    kart.gaaTil(t);
  }

  // ---------- redigering av bygg i kartet ----------
  var kort = null;
  function lagre() { hist.push(JSON.stringify(st.bygg)); if (hist.length > 50) hist.shift(); fram = []; }
  function etterEndring() {
    st.justert = true;
    stoppMotor();
    tegnPlan(); tegnTallrad(); meldTall();
    if (kort) plasserKort();
  }
  function angre() { if (!hist.length) return; fram.push(JSON.stringify(st.bygg)); st.bygg = JSON.parse(hist.pop()); st.valgt = null; lukkRediger(); etterEndring(); if (!hist.length) { st.justert = false; tegnTallrad(); } }
  function gjorOm() { if (!fram.length) return; hist.push(JSON.stringify(st.bygg)); st.bygg = JSON.parse(fram.pop()); st.valgt = null; lukkRediger(); etterEndring(); }
  function finn(id) { for (var i = 0; i < st.bygg.length; i++) if (st.bygg[i].id === id) return st.bygg[i]; return null; }
  // Setter lengde og dybde på et hus om midten, langs husets egne akser.
  function settMaal(b, lengde, dybde) {
    var r = b.ring, c = T.tyngde(r), ux = r[1][0] - r[0][0], uy = r[1][1] - r[0][1], L = Math.hypot(ux, uy);
    ux /= L; uy /= L;
    var vx = -uy, vy = ux, a = lengde / 2, d = dybde / 2;
    b.ring = [[c[0] - ux * a - vx * d, c[1] - uy * a - vy * d], [c[0] + ux * a - vx * d, c[1] + uy * a - vy * d], [c[0] + ux * a + vx * d, c[1] + uy * a + vy * d], [c[0] - ux * a + vx * d, c[1] - uy * a + vy * d]];
    b.lengde = lengde; b.dybde = dybde; b.hoyde = b.etasjer * T.REGEL.etasjehoyde;
    if (b.typ === 'rekkehus') b.enheter = Math.round(lengde / T.REGEL.rekke.bredde);
  }
  function lukkRediger() { if (kort) { kort.remove(); kort = null; } }
  // Lukker kortet etter Esc, × eller et klikk utenfor. Var fokus i kortet, går det tilbake til bygget. Er ingenting
  // endret, får motoren regne variantene den ble stoppet fra da kortet ble åpnet.
  function lukkValgt() {
    var id = st.valgt, iKort = kort && kort.contains(document.activeElement);
    st.valgt = null; lukkRediger(); kart.settPrismer(prismer());
    if (iKort && id) { var pg = svg.querySelector('.tak[data-id="' + id + '"]'); if (pg && pg.focus) pg.focus({ preventScroll: true }); }
    if (st.paa && !st.justert && !st.alt) planleggMotor();
  }
  function knappMerke(k) { return k.getAttribute('aria-label') || k.textContent; }
  function aapneRediger(id, fokus) {
    lukkRediger();
    var b = finn(id);
    if (!b) return;
    stoppMotor(); // et åpent kort skal ikke byttes ut av variantene som kommer
    st.valgt = id;
    function teller(navn, verdi, enhet, ned, opp) {
      var ut = h('output', { tekst: verdi + (enhet ? ' ' + enhet : '') });
      return h('div', { 'class': 'ap-teller' }, [h('span', { tekst: navn }), h('div', {}, [
        h('button', { type: 'button', 'aria-label': navn + ' ned', tekst: '−', onclick: ned }), ut, h('button', { type: 'button', 'aria-label': navn + ' opp', tekst: '+', onclick: opp })])]);
    }
    function endre(f) { var a = document.activeElement, m = kort && kort.contains(a) ? knappMerke(a) : null; lagre(); f(b); etterEndring(); aapneRediger(id, m); }
    var stegL = b.typ === 'rekkehus' ? T.REGEL.rekke.bredde : 3;
    kort = h('div', { 'class': 'ap-rediger', role: 'dialog', 'aria-label': 'Rediger bygget' }, [
      h('h5', {}, [(b.typ === 'rekkehus' ? TX.rekkeNavn : b.typ === 'punkthus' ? TX.punktNavn : TX.blokkNavn) + ' ' + b.id.replace('B', ''), h('button', { type: 'button', 'aria-label': TX.lukk, tekst: '×', onclick: lukkValgt })]),
      teller(TX.lengde, fmt(b.lengde, b.lengde % 1 ? 1 : 0), 'm', function () { endre(function (x) { settMaal(x, Math.max(6, x.lengde - stegL), x.dybde); }); }, function () { endre(function (x) { settMaal(x, Math.min(80, x.lengde + stegL), x.dybde); }); }),
      teller(TX.bredde, fmt(b.dybde, b.dybde % 1 ? 1 : 0), 'm', function () { endre(function (x) { settMaal(x, x.lengde, Math.max(5, x.dybde - 1)); }); }, function () { endre(function (x) { settMaal(x, x.lengde, Math.min(40, x.dybde + 1)); }); }),
      teller(TX.etasjer, String(b.etasjer), '', function () { endre(function (x) { x.etasjer = Math.max(1, x.etasjer - 1); x.hoyde = x.etasjer * T.REGEL.etasjehoyde; }); }, function () { endre(function (x) { x.etasjer = Math.min(30, x.etasjer + 1); x.hoyde = x.etasjer * T.REGEL.etasjehoyde; }); }),
      h('div', { 'class': 'rad' }, [
        h('button', { type: 'button', 'class': 'fjern', tekst: TX.fjern, onclick: function () { var iKort = kort && kort.contains(document.activeElement); lagre(); st.bygg = st.bygg.filter(function (x) { return x.id !== id; }); st.valgt = null; lukkRediger(); etterEndring(); if (iKort) { var neste = svg.querySelector('.k-bygg.tak[data-id]'); if (neste && neste.focus) neste.focus({ preventScroll: true }); } } }),
        h('button', { type: 'button', tekst: TX.nullstill, onclick: function () { endre(function (x) { var o = x.opprinnelig; x.ring = o.ring.map(function (q) { return [q[0], q[1]]; }); x.etasjer = o.etasjer; x.lengde = o.lengde; x.dybde = o.dybde; x.enheter = o.enheter; x.hoyde = o.etasjer * T.REGEL.etasjehoyde; }); } })
      ]),
      h('p', { 'class': 'ap-hint', tekst: TX.anslag })
    ]);
    kartBoks.appendChild(kort);
    kart.settPrismer(prismer());
    plasserKort();
    if (fokus) {
      var knapper = kort.querySelectorAll('button'), maal = null, i;
      if (typeof fokus === 'string') for (i = 0; i < knapper.length; i++) if (knappMerke(knapper[i]) === fokus) maal = knapper[i];
      (maal || knapper[1] || knapper[0]).focus({ preventScroll: true });
    }
  }
  function plasserKort() {
    var b = finn(st.valgt);
    if (!b || !kort) return;
    var c = T.tyngde(b.ring), s = kart.til(c[0], c[1], b.hoyde * kart.t), m = svg.getScreenCTM(), boks = kartBoks.getBoundingClientRect();
    if (!m) return;
    var p = svg.createSVGPoint(); p.x = s[0]; p.y = s[1];
    var q = p.matrixTransform(m), x = q.x - boks.left + 26, y = q.y - boks.top - 40;
    if (x + 240 > boks.width) x = q.x - boks.left - 254;
    kort.style.left = Math.max(8, Math.min(boks.width - 236, x)) + 'px';
    kort.style.top = Math.max(8, Math.min(boks.height - kort.offsetHeight - 60, y)) + 'px';
  }
  var drag = null;
  svg.addEventListener('pointerdown', function (e) {
    if (e.button > 0) return;
    var m = e.target.closest && e.target.closest('.k-bygg.tak');
    if (!m || !st.paa) { if (st.valgt && !(e.target.closest && e.target.closest('.ap-rediger'))) lukkValgt(); return; }
    var b = finn(m.getAttribute('data-id'));
    if (!b) return;
    drag = { id: b.id, start: kart.fraKlient(e.clientX, e.clientY), ring: b.ring.map(function (q) { return [q[0], q[1]]; }), flyttet: false, x: e.clientX, y: e.clientY, pid: e.pointerId };
    try { svg.setPointerCapture(e.pointerId); } catch (_) {}
    e.preventDefault();
  });
  svg.addEventListener('pointermove', function (e) {
    if (!drag) return;
    if (!drag.flyttet && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 4) return;
    var b = finn(drag.id), naa = kart.fraKlient(e.clientX, e.clientY);
    if (!b) return;
    if (!drag.flyttet) { stoppMotor(); lagre(); drag.flyttet = true; lukkRediger(); st.valgt = b.id; }
    var dx = naa[0] - drag.start[0], dy = naa[1] - drag.start[1];
    b.ring = drag.ring.map(function (q) { return [q[0] + dx, q[1] + dy]; });
    kart.settPrismer(prismer());
  });
  function slipp(e) {
    if (!drag) return;
    var d = drag; drag = null;
    try { svg.releasePointerCapture(d.pid); } catch (_) {}
    if (d.flyttet) { st.valgt = null; etterEndring(); }
    else if (e.type !== 'pointercancel') aapneRediger(d.id); // en avbrutt berøring (siden rullet) er ikke et klikk
  }
  svg.addEventListener('pointerup', slipp);
  svg.addEventListener('pointercancel', slipp);
  // Byggene fra tastaturet: Enter eller mellomrom åpner kortet, piltastene flytter bygget én meter. En serie
  // tastetrykk er ett steg i angreloggen.
  var tastId = null, tastTid = null;
  svg.addEventListener('keydown', function (e) {
    var m = e.target.closest && e.target.closest('.k-bygg.tak');
    if (!m || !st.paa) return;
    var b = finn(m.getAttribute('data-id')), d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }[e.key];
    if (!b) return;
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); aapneRediger(b.id, true); return; }
    if (!d) return;
    e.preventDefault();
    if (tastId !== b.id) { lagre(); tastId = b.id; }
    clearTimeout(tastTid); tastTid = setTimeout(function () { tastId = null; }, 1200);
    lukkRediger();
    b.ring = b.ring.map(function (q) { return [q[0] + d[0], q[1] + d[1]]; });
    st.valgt = b.id; etterEndring();
  });
  rot.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) { e.preventDefault(); if (e.shiftKey) gjorOm(); else angre(); }
    if (e.key === 'Escape' && kort) lukkValgt();
  });
  kart.etterSett = function () { if (kort) plasserKort(); };
  window.addEventListener('resize', function () { if (kort) plasserKort(); });

  byggStart(); tegnPlan(); tegnTallrad();
  rot.classList.add('klar');
  // For kontroll i tester og fra konsollen.
  rot.__autoplan = { st: st, slaaPaa: slaaPaa, velgAlt: velgAlt, settVisning: settVisning, settTomt: settTomt, kart: kart };
})();
