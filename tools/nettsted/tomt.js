/* www.builtly.ai: regnemotoren bak produktdemoene (Autoplan i Maps og Mulighetsstudie). Kilde: tools/nettsted/tomt.js.
   Rene funksjoner uten DOM, så de samme funksjonene testes i node (tools/nettsted/test_tomt.mjs).
   Skissen følger reglene i live-skissen i Maps: parallelle rader i byggbart areal mot målet, med husenes dybde,
   lengde og avstand som i produktet. Den er forenklet og sier det: ingen planregler, naboer eller terreng.
   Dette er en demo til nettsiden, ikke produktets motor. Tomtene er konvekse, og ringene er i meter (x øst, y nord). */
(function (rot, lag) {
  if (typeof module === 'object' && module.exports) module.exports = lag();
  else rot.BuiltlyTomt = lag();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Tallene er de samme som live-skissen i Maps bruker.
  var REGEL = {
    effektivitet: 0.92,                              // BRA = BTA × 0,92
    etasjehoyde: 3.2,                                // m
    lamellDybde: 13,                                 // m (12–14)
    husLengde: [25, 40],                             // m
    brann: 8,                                        // m mellom hus
    sol: { tak: 12, faktor: 0.5, tillegg: 2 },       // radavstand = min(tak, max(brann, faktor × høyde + tillegg))
    rekke: { bredde: 4.5, dybde: 9.5, etasjerMaks: 3, enheterMin: 2 },
    punktSide: 19.5,                                 // m (17–22)
    punktFaktor: 0.55,                               // luft mellom punkthus = max(brann, faktor × høyde)
    rytme: 0.18,                                     // lange og korte hus veksler om snittet
    miksSor: 0.4,                                    // i «miks» er den sørligste delen rekkehus
    slakk: 0.03,                                     // et mål regnes som nådd innenfor denne slakken
    grontdrag: { bredde: 12, fra: 6000, delMin: 1500 },
    park: { tetthet: 0.5, min: 600, maksAndel: 0.2 }
  };

  // ---------- geometri ----------
  function fortegn(r) {
    var s = 0;
    for (var i = 0; i < r.length; i++) { var a = r[i], b = r[(i + 1) % r.length]; s += a[0] * b[1] - b[0] * a[1]; }
    return s / 2;
  }
  function areal(r) { return Math.abs(fortegn(r)); }
  function motsols(r) { return fortegn(r) < 0 ? r.slice().reverse() : r.slice(); }
  function tyngde(r) {
    var a = 0, cx = 0, cy = 0;
    for (var i = 0; i < r.length; i++) {
      var p = r[i], q = r[(i + 1) % r.length], k = p[0] * q[1] - q[0] * p[1];
      a += k; cx += (p[0] + q[0]) * k; cy += (p[1] + q[1]) * k;
    }
    return [cx / (3 * a), cy / (3 * a)];
  }
  // Sutherland–Hodgman mot halvplanet nx·x + ny·y ≤ d.
  function klipp(r, nx, ny, d) {
    var ut = [];
    for (var i = 0; i < r.length; i++) {
      var a = r[i], b = r[(i + 1) % r.length];
      var fa = nx * a[0] + ny * a[1] - d, fb = nx * b[0] + ny * b[1] - d;
      if (fa <= 0) ut.push(a);
      if ((fa < 0 && fb > 0) || (fb < 0 && fa > 0)) { var t = fa / (fa - fb); ut.push([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]); }
    }
    return ut;
  }
  // En konveks ring trukket s meter inn fra hver kant (negativ s flytter kantene utover): snittet av halvplanene.
  function innrykk(ring, s) {
    var r = motsols(ring), g = grenser(r), m = Math.abs(s || 0) + 10;
    var ut = [[g.x0 - m, g.y0 - m], [g.x1 + m, g.y0 - m], [g.x1 + m, g.y1 + m], [g.x0 - m, g.y1 + m]];
    for (var i = 0; i < r.length && ut.length >= 3; i++) {
      var a = r[i], b = r[(i + 1) % r.length], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy);
      if (L < 1e-9) continue;
      var nx = dy / L, ny = -dx / L; // ut av ringen når den går mot sola
      ut = klipp(ut, nx, ny, nx * a[0] + ny * a[1] - (s || 0));
    }
    return ut.length >= 3 ? ut : [];
  }
  function rot2(p, c, s) { return [p[0] * c + p[1] * s, -p[0] * s + p[1] * c]; }
  function tilbake(p, c, s) { return [p[0] * c - p[1] * s, p[0] * s + p[1] * c]; }
  function grenser(r) {
    var x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (var i = 0; i < r.length; i++) { x0 = Math.min(x0, r[i][0]); x1 = Math.max(x1, r[i][0]); y0 = Math.min(y0, r[i][1]); y1 = Math.max(y1, r[i][1]); }
    return { x0: x0, x1: x1, y0: y0, y1: y1 };
  }
  // Den vannrette linja y gjennom en konveks ring: [venstre, høyre] eller null.
  function spenn(r, y) {
    var lo = Infinity, hi = -Infinity;
    for (var i = 0; i < r.length; i++) {
      var a = r[i], b = r[(i + 1) % r.length];
      if ((a[1] <= y && b[1] >= y) || (b[1] <= y && a[1] >= y)) {
        if (Math.abs(b[1] - a[1]) < 1e-12) { lo = Math.min(lo, a[0], b[0]); hi = Math.max(hi, a[0], b[0]); }
        else { var x = a[0] + (y - a[1]) * (b[0] - a[0]) / (b[1] - a[1]); lo = Math.min(lo, x); hi = Math.max(hi, x); }
      }
    }
    return hi > lo ? [lo, hi] : null;
  }
  // Der hele båndet [y0, y1] ligger inne i en konveks ring: det smaleste av de to endene.
  function baand(r, y0, y1) {
    var a = spenn(r, y0 + 1e-7), b = spenn(r, y1 - 1e-7);
    if (!a || !b) return null;
    var lo = Math.max(a[0], b[0]), hi = Math.min(a[1], b[1]);
    return hi > lo ? [lo, hi] : null;
  }
  // x-spennet til en ring innenfor båndet [y0, y1], eller null.
  function ringSpenn(r, y0, y1) {
    var k = klipp(klipp(r, 0, 1, y1), 0, -1, -y0);
    if (k.length < 3) return null;
    var g = grenser(k);
    return [g.x0, g.x1];
  }
  function trekkFra(iv, sp) {
    if (!sp) return iv;
    var ut = [];
    for (var i = 0; i < iv.length; i++) {
      var a = iv[i][0], b = iv[i][1];
      if (sp[1] <= a || sp[0] >= b) { ut.push([a, b]); continue; }
      if (sp[0] > a) ut.push([a, sp[0]]);
      if (sp[1] < b) ut.push([sp[1], b]);
    }
    return ut;
  }
  function rektRing(b) { return [[b.x0, b.y0], [b.x1, b.y0], [b.x1, b.y1], [b.x0, b.y1]]; }

  // De dominerende retningene i tomta (grader, 0 = øst–vest): kantlengdene summert, de lengste først, og tverretningen.
  function retninger(ring) {
    var kant = [];
    for (var i = 0; i < ring.length; i++) {
      var a = ring[i], b = ring[(i + 1) % ring.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (L < 1e-6) continue;
      var v = ((Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI) + 360) % 180;
      var funnet = null;
      for (var j = 0; j < kant.length; j++) { var d = Math.abs(kant[j].v - v); if (Math.min(d, 180 - d) < 8) { funnet = kant[j]; break; } }
      if (funnet) {
        var vv = v; if (vv - funnet.v > 90) vv -= 180; if (funnet.v - vv > 90) vv += 180;
        funnet.v = ((funnet.v * funnet.L + vv * L) / (funnet.L + L) + 180) % 180; funnet.L += L;
      } else kant.push({ v: v, L: L });
    }
    kant.sort(function (p, q) { return q.L - p.L; });
    var ut = [];
    kant.slice(0, 2).forEach(function (k) {
      [k.v, (k.v + 90) % 180].forEach(function (w) {
        if (!ut.some(function (u) { var d = Math.abs(u - w); return Math.min(d, 180 - d) < 1; })) ut.push(w);
      });
    });
    return ut;
  }
  function hovedretning(ring) { return retninger(ring)[0]; }

  // ---------- reglene ----------
  function radavstand(hoyde) { var s = REGEL.sol; return Math.min(s.tak, Math.max(REGEL.brann, s.faktor * hoyde + s.tillegg)); }
  function punktluft(hoyde) { return Math.max(REGEL.brann, REGEL.punktFaktor * hoyde); }
  function trapp(maks) { return maks >= 13 ? 3 : maks >= 7 ? 2 : maks >= 4 ? 1 : 0; }

  // Lengdene i en rad: vekselvis lang og kort om snittet, samme sum, hver innenfor grensene.
  function rytme(n, L, rad) {
    var lo = REGEL.husLengde[0], hi = REGEL.husLengde[1], ut = [], i;
    if (n < 2) { for (i = 0; i < n; i++) ut.push(L); return ut; }
    var d = Math.min(REGEL.rytme * L, L - lo, hi - L);
    if (n % 2 || d <= 0) { for (i = 0; i < n; i++) ut.push(L); return ut; }
    for (i = 0; i < n; i++) ut.push(L + ((i + rad) % 2 ? -d : d));
    return ut;
  }
  function lameller(a, b, y0, D, et, rad) {
    var lo = REGEL.husLengde[0], hi = REGEL.husLengde[1], G = REGEL.brann, len = b - a, ut = [];
    if (len < lo) return ut;
    var n = Math.max(1, Math.ceil((len + G) / (hi + G))), L = (len - (n - 1) * G) / n;
    while (n > 1 && L < lo) { n--; L = (len - (n - 1) * G) / n; }
    L = Math.min(L, hi);
    var x = a + (len - (n * L + (n - 1) * G)) / 2;
    rytme(n, L, rad).forEach(function (Li) { ut.push({ x0: x, x1: x + Li, y0: y0, y1: y0 + D, typ: 'lamell', etasjer: et, rad: rad }); x += Li + G; });
    return ut;
  }
  function punkthus(a, b, y0, D, et, rad, luft) {
    var len = b - a, ut = [];
    if (len < D) return ut;
    var n = Math.max(1, Math.floor((len + luft) / (D + luft))), x = a + (len - (n * D + (n - 1) * luft)) / 2;
    for (var i = 0; i < n; i++) { ut.push({ x0: x, x1: x + D, y0: y0, y1: y0 + D, typ: 'punkthus', etasjer: et, rad: rad }); x += D + luft; }
    return ut;
  }
  function rekkehus(a, b, y0, D, et, rad) {
    var w = REGEL.rekke.bredde, kmin = REGEL.rekke.enheterMin, kmax = Math.floor(REGEL.husLengde[1] / w), G = REGEL.brann, ut = [], x = a;
    while (b - x >= kmin * w - 1e-9) {
      var k = Math.min(kmax, Math.floor((b - x + 1e-9) / w));
      if (k < kmin) break;
      ut.push({ x0: x, x1: x + k * w, y0: y0, y1: y0 + D, typ: 'rekkehus', etasjer: et, enheter: k, rad: rad });
      x += k * w + G;
    }
    if (ut.length) { var dx = (b - ut[ut.length - 1].x1) / 2; ut.forEach(function (r) { r.x0 += dx; r.x1 += dx; }); }
    return ut;
  }

  // Én utlegging i én retning og fase: rader fra sør mot nord i rammen der retningen er x-aksen.
  function utlegg(B, frie, p, familie, fase, erSor) {
    var g = grenser(B), eh = REGEL.etasjehoyde, ut = [], y0 = g.y0 + fase, rad = 0;
    var maks = Math.max(1, Math.round(p.etasjer || 1));
    for (var vakt = 0; vakt < 200 && y0 < g.y1; vakt++) {
      var rekke = p.typologi === 'rekkehus' || (p.typologi === 'miks' && erSor(y0 + REGEL.rekke.dybde / 2));
      var punkt = !rekke && familie === 'punkt';
      var D = rekke ? REGEL.rekke.dybde : punkt ? REGEL.punktSide : REGEL.lamellDybde;
      var et = rekke ? Math.min(REGEL.rekke.etasjerMaks, maks) : maks;
      if (y0 + D > g.y1 + 1e-9) break;
      var iv = baand(B, y0, y0 + D);
      var liste = iv ? [iv] : [];
      for (var f = 0; f < frie.length; f++) liste = trekkFra(liste, ringSpenn(frie[f], y0 - 1e-6, y0 + D + 1e-6));
      for (var k = 0; k < liste.length; k++) {
        var a = liste[k][0], b = liste[k][1];
        ut = ut.concat(rekke ? rekkehus(a, b, y0, D, et, rad) : punkt ? punkthus(a, b, y0, D, et, rad, punktluft(et * eh)) : lameller(a, b, y0, D, et, rad));
      }
      rad++;
      y0 += D + (punkt ? punktluft(et * eh) : radavstand(et * eh));
    }
    return ut;
  }

  function fot(b) { return (b.x1 - b.x0) * (b.y1 - b.y0); }
  function sumFot(bygg) { var s = 0; for (var i = 0; i < bygg.length; i++) s += fot(bygg[i]); return s; }

  // Etasjene trappes ned mot sør når taket er fire etasjer eller mer (sol inn i uterommene).
  function terrasser(bygg, c, s) {
    var lam = bygg.filter(function (b) { return b.typ === 'lamell' || b.typ === 'punkthus'; });
    if (!lam.length) return;
    var maks = 0; lam.forEach(function (b) { maks = Math.max(maks, b.etasjer); });
    var ned = trapp(maks);
    if (!ned) return;
    var ys = lam.map(function (b) { return tilbake([(b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2], c, s)[1]; });
    var lo = Math.min.apply(null, ys), hi = Math.max.apply(null, ys);
    if (hi - lo < 1) return;
    lam.forEach(function (b, i) { b.etasjer = Math.max(1, maks - Math.round(ned * (hi - ys[i]) / (hi - lo))); });
  }

  // Vekten et hus teller med mot målet: fotavtrykket (mål i % BYA) eller bruksarealet (mål i BRA).
  function vekt(b, form) { return form === 'bra' ? (b.y1 - b.y0) * b.etasjer * REGEL.effektivitet : (b.y1 - b.y0); }
  // Lameller kortes ned til 25 m. Rekkehus kortes ikke under fire enheter (en rekke på to er en stubb), punkthus ikke i det hele tatt.
  function minLengde(b) { return b.typ === 'lamell' ? REGEL.husLengde[0] : b.typ === 'rekkehus' ? Math.min(b.x1 - b.x0, 4 * REGEL.rekke.bredde) : b.x1 - b.x0; }

  // Tar ut hus og korter dem inn til utlegget treffer målet. Rekkefølgen for uttak gir funksjonen `forst`.
  function trim(bygg, maal, form, forst) {
    var liste = bygg.slice();
    for (var vakt = 0; vakt < 400; vakt++) {
      var tot = 0, min = 0;
      liste.forEach(function (b) { tot += (b.x1 - b.x0) * vekt(b, form); min += minLengde(b) * vekt(b, form); });
      if (tot <= maal * (1 + 1e-9) || !liste.length) return liste;
      if (min <= maal) {
        var t = tot - min > 1e-9 ? (maal - min) / (tot - min) : 0;
        liste.forEach(function (b) {
          var L = b.x1 - b.x0, ny = minLengde(b) + t * (L - minLengde(b));
          if (b.typ === 'rekkehus') { var k = Math.max(REGEL.rekke.enheterMin, Math.round(ny / REGEL.rekke.bredde)); ny = k * REGEL.rekke.bredde; b.enheter = k; }
          var m = (b.x0 + b.x1) / 2; b.x0 = m - ny / 2; b.x1 = m + ny / 2;
        });
        return liste;
      }
      var ut = 0, best = -Infinity;
      for (var i = 0; i < liste.length; i++) { var v = forst(liste[i], liste); if (v > best) { best = v; ut = i; } }
      liste.splice(ut, 1);
    }
    return liste;
  }

  // Målet som vekt: kvadratmeter fotavtrykk, eller kvadratmeter BRA.
  function maalVerdi(p, teig) { return p.maal === 'bra' ? Math.max(0, p.bra || 0) : teig * Math.max(0, p.bya || 0) / 100; }

  function ferdig(bygg, c, s, grep) {
    return bygg.map(function (b, i) {
      return {
        id: 'B' + (i + 1), typ: b.typ, etasjer: b.etasjer, enheter: b.enheter || 0, grep: grep,
        ring: rektRing(b).map(function (q) { return tilbake(q, c, s); }),
        lengde: b.x1 - b.x0, dybde: b.y1 - b.y0, hoyde: Math.round(b.etasjer * REGEL.etasjehoyde * 10) / 10
      };
    });
  }

  // ---------- grepene ----------
  // Lineært grep: parallelle rader. Hver retning og fase legges ut og trimmes mot målet, og utlegget som treffer
  // målet vinner. Er flere like gode, vinner retningen med langsidene nærmest øst–vest (sol på langfasaden).
  // `frie` er flater som holdes ubebygd (park, grøntdrag).
  function lineaert(tomt, p, frie, familie) {
    var B0 = innrykk(tomt, p.avstand), teig = areal(tomt), beste = null;
    if (B0.length < 3) return { bygg: [], retning: 0 };
    var gT = grenser(tomt), sorY = gT.y0 + REGEL.miksSor * (gT.y1 - gT.y0);
    var D = familie === 'punkt' ? REGEL.punktSide : p.typologi === 'rekkehus' ? REGEL.rekke.dybde : REGEL.lamellDybde;
    var steg = (D + radavstand(Math.max(1, p.etasjer || 1) * REGEL.etasjehoyde)) / 4;
    var form = p.maal === 'bra' ? 'bra' : 'bya', maal = maalVerdi(p, teig);
    retninger(tomt).forEach(function (v) {
      var c = Math.cos(v * Math.PI / 180), s = Math.sin(v * Math.PI / 180);
      var B = B0.map(function (q) { return rot2(q, c, s); }), gB = grenser(B), xm = (gB.x0 + gB.x1) / 2;
      var F = (frie || []).map(function (r) { return r.map(function (q) { return rot2(q, c, s); }); });
      var ov = Math.min(v, 180 - v);
      for (var fase = 0; fase < 4; fase++) {
        var bygg = utlegg(B, F, p, familie, fase * steg, function (y) { return tilbake([xm, y], c, s)[1] < sorY; });
        if (!bygg.length) continue;
        terrasser(bygg, c, s);
        // Hus tas ut fra raden med flest hus, i sør ved likhet (det åpne arealet havner i den solrike enden), og ytterst i raden.
        bygg = trim(bygg, maal, form, function (b, liste) {
          var n = 0; liste.forEach(function (x) { if (x.rad === b.rad) n++; });
          return n * 1000 - tilbake([(b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2], c, s)[1] + 0.01 * Math.abs((b.x0 + b.x1) / 2 - xm);
        });
        var fikk = 0, rader = {}; bygg.forEach(function (b) { fikk += (b.x1 - b.x0) * vekt(b, form); rader[b.rad] = 1; });
        var naadd = fikk >= maal * (1 - REGEL.slakk), nr = Object.keys(rader).length;
        var bedre = !beste || (naadd && !beste.naadd) ||
          (naadd === beste.naadd && (naadd
            ? (ov < beste.ov - 1 || (Math.abs(ov - beste.ov) <= 1 && (nr < beste.nr || (nr === beste.nr && bygg.length < beste.bygg.length))))
            : fikk > beste.fikk * 1.01));
        if (bedre) beste = { fikk: fikk, naadd: naadd, bygg: bygg, c: c, s: s, v: v, ov: ov, nr: nr };
      }
    });
    if (!beste) return { bygg: [], retning: 0 };
    return { bygg: ferdig(beste.bygg, beste.c, beste.s, familie === 'punkt' ? 'klynge' : 'lineaert'), retning: beste.v };
  }

  // Hjørner som nesten ligger på linje, tas ut, så kantene blir tomtas egentlige sider.
  function forenkle(ring) {
    var r = ring.slice(), endret = true;
    while (endret && r.length > 3) {
      endret = false;
      for (var i = 0; i < r.length; i++) {
        var a = r[(i + r.length - 1) % r.length], b = r[i], c = r[(i + 1) % r.length];
        var v1 = Math.atan2(b[1] - a[1], b[0] - a[0]), v2 = Math.atan2(c[1] - b[1], c[0] - b[0]);
        var d = Math.abs(v2 - v1); if (d > Math.PI) d = 2 * Math.PI - d;
        if (d < 5 * Math.PI / 180) { r.splice(i, 1); endret = true; break; }
      }
    }
    return r;
  }

  // Hus langs kantene av byggbart areal, med et åpent rom i midten. Annenhver kant går hjørne til hjørne, de andre
  // står mellom dem. Begge fordelingene prøves, og den som gir hus langs flest kanter, vinner.
  function langsKantene(B, D, luft, legg) {
    var n = B.length, beste = null;
    for (var start = 0; start < 2; start++) {
      var hus = [], kanter = 0;
      for (var j = 0; j < n; j++) {
        var a = B[j], b = B[(j + 1) % n], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
        if (L < 1e-6) continue;
        var c = (b[0] - a[0]) / L, s = (b[1] - a[1]) / L; // kanten er x-aksen i husets ramme, innover er +y
        var hoved = n % 2 === 0 ? j % 2 === start : (j % 2 === start && j < n - 1);
        var a0 = rot2(a, c, s), kutt = hoved ? 0 : D + luft + 1;
        var Br = B.map(function (q) { return rot2(q, c, s); }), iv = baand(Br, a0[1] + 1e-6, a0[1] + D);
        if (!iv) continue;
        var x0 = Math.max(a0[0] + kutt, iv[0]), x1 = Math.min(a0[0] + L - kutt, iv[1]);
        var nye = legg(x0, x1, a0[1], j);
        nye.forEach(function (h) { h.c = c; h.s = s; h.kant = j; });
        if (nye.length) kanter++;
        hus = hus.concat(nye);
      }
      var f = sumFot(hus);
      if (!beste || kanter > beste.kanter || (kanter === beste.kanter && f > beste.f * 1.02)) beste = { hus: hus, kanter: kanter, f: f };
    }
    return beste ? beste.hus : [];
  }
  function midt(h) { return tilbake([(h.x0 + h.x1) / 2, (h.y0 + h.y1) / 2], h.c, h.s); }
  function trappNed(hus, maks) {
    var ned = trapp(maks);
    if (!ned || !hus.length) return;
    var ys = hus.map(function (h) { return midt(h)[1]; }), lo = Math.min.apply(null, ys), hi = Math.max.apply(null, ys);
    if (hi - lo < 1) return;
    hus.forEach(function (h, k) { h.etasjer = Math.max(1, maks - Math.round(ned * (hi - ys[k]) / (hi - lo))); });
  }
  function ferdigRing(hus, grep) {
    var ut = [];
    hus.forEach(function (h) { ut = ut.concat(ferdig([h], h.c, h.s, grep)); });
    ut.forEach(function (b, k) { b.id = 'B' + (k + 1); });
    return ut;
  }

  // Kvartal med gårdsrom: lameller langs kantene av byggbart areal. Åpnes mot sør når målet er lavt.
  function kvartal(tomt, p) {
    var B = forenkle(innrykk(tomt, p.avstand)), D = REGEL.lamellDybde, G = REGEL.brann, teig = areal(tomt);
    var maks = Math.max(1, Math.round(p.etasjer || 1)), form = p.maal === 'bra' ? 'bra' : 'bya';
    var gaard = B.length >= 3 ? innrykk(B, D + 4) : [];
    if (gaard.length < 3 || areal(gaard) < 200) return null;
    var hus = langsKantene(B, D, G, function (x0, x1, y0, j) { return lameller(x0, x1, y0, D, maks, j); });
    if (hus.length < 3) return null;
    trappNed(hus, maks);
    var bygg = trim(hus, maalVerdi(p, teig), form, function (h) { return -midt(h)[1]; });
    return { bygg: ferdigRing(bygg, 'kvartal'), gaard: gaard };
  }

  // Klynger rundt park: punkthus langs kantene, parken i midten. Husene står med luft for den største siden som
  // lar parken få plass (17–22 m), og får siden som treffer målet. Hus tas ut nærmest midten først, så hjørnene står.
  function klynge(tomt, p) {
    var B = forenkle(innrykk(tomt, p.avstand)), teig = areal(tomt), lo = 17, hi = 22, parken = [];
    var maks = Math.max(1, Math.round(p.etasjer || 1)), form = p.maal === 'bra' ? 'bra' : 'bya';
    var luft = punktluft(maks * REGEL.etasjehoyde);
    if (B.length < 3) return null;
    for (; hi >= lo; hi--) {
      parken = innrykk(B, hi + 2);
      var g = parken.length >= 3 ? grenser(parken.map(function (q) { var v = hovedretning(tomt) * Math.PI / 180; return rot2(q, Math.cos(v), Math.sin(v)); })) : null;
      if (g && areal(parken) >= 250 && Math.min(g.x1 - g.x0, g.y1 - g.y0) >= 12) break;
    }
    if (hi < lo) return null;
    var hus = langsKantene(B, hi, luft, function (x0, x1, y0, j) { return punkthus(x0, x1, y0, hi, maks, j, luft); });
    if (hus.length < 3) return null;
    trappNed(hus, maks);
    var maal = maalVerdi(p, teig), m0 = tyngde(tomt);
    var vektAv = function (h, side) { return form === 'bra' ? side * side * h.etasjer * REGEL.effektivitet : side * side; };
    var sum = function (side) { var t = 0; hus.forEach(function (h) { t += vektAv(h, side); }); return t; };
    while (hus.length > 3 && sum(lo) > maal) {
      var ut = 0, best = Infinity;
      hus.forEach(function (h, k) { var q = midt(h), d = Math.hypot(q[0] - m0[0], q[1] - m0[1]) + 0.001 * q[1]; if (d < best) { best = d; ut = k; } });
      hus.splice(ut, 1);
    }
    var a = lo, b = hi;
    for (var i = 0; i < 40; i++) { var m = (a + b) / 2; if (sum(m) < maal) a = m; else b = m; }
    var side = sum(hi) <= maal ? hi : sum(lo) >= maal ? lo : (a + b) / 2;
    hus.forEach(function (h) {
      var mx = (h.x0 + h.x1) / 2;
      h.x0 = mx - side / 2; h.x1 = mx + side / 2; h.y1 = h.y0 + side; // huset blir stående mot kanten, parken vokser
    });
    return { bygg: ferdigRing(hus, 'klynge'), park: parken };
  }

  // ---------- grøntdrag og park (reglene i Autoplan) ----------
  // Grøntdraget går gjennom tyngdepunktet på tvers av hovedretningen, og står bare når begge sidene er store nok.
  function grontdrag(tomt, bredde) {
    var R = REGEL.grontdrag, teig = areal(tomt);
    if (teig < R.fra) return { aktiv: false, grunn: 'for_liten' };
    var v = hovedretning(tomt), c = Math.cos(v * Math.PI / 180), s = Math.sin(v * Math.PI / 180);
    var T = tomt.map(function (q) { return rot2(q, c, s); }), m = rot2(tyngde(tomt), c, s), w = bredde || R.bredde;
    var venstre = klipp(T, 1, 0, m[0] - w / 2), hoyre = klipp(T, -1, 0, -(m[0] + w / 2));
    if (areal(venstre) < R.delMin || areal(hoyre) < R.delMin) return { aktiv: false, grunn: 'ensidig' };
    var drag = klipp(klipp(T, 1, 0, m[0] + w / 2), -1, 0, -(m[0] - w / 2));
    return { aktiv: true, ring: drag.map(function (q) { return tilbake(q, c, s); }), areal: areal(drag), bredde: w };
  }
  // Parken: bebyggelsen får sonen målet trenger, resten er én park i den solrike (sørlige) enden.
  function park(tomt, maalFot, dragAreal) {
    var P = REGEL.park, teig = areal(tomt), sone = maalFot / P.tetthet + (dragAreal || 0);
    var A = Math.min(teig - sone, P.maksAndel * teig);
    if (A < P.min) return { aktiv: false, grunn: 'maalet_fyller' };
    var g = grenser(tomt), lo = g.y0, hi = g.y1;
    for (var i = 0; i < 40; i++) { var y = (lo + hi) / 2; if (areal(klipp(tomt, 0, 1, y)) < A) lo = y; else hi = y; }
    var ring = klipp(tomt, 0, 1, (lo + hi) / 2);
    return { aktiv: true, ring: ring, areal: areal(ring) };
  }

  // ---------- nøkkeltallene ----------
  function tall(bygg, p, teig) {
    var f = 0, bta = 0, bra = 0, bol = 0, et = [], snitt = Math.max(30, p.snitt || 65);
    bygg.forEach(function (b) {
      var a = b.lengde * b.dybde, btaB = a * b.etasjer, braB = btaB * REGEL.effektivitet;
      f += a; bta += btaB; bra += braB; et.push(b.etasjer);
      bol += b.typ === 'rekkehus' ? b.enheter : braB / snitt;
    });
    bol = Math.round(bol);
    return {
      bya: Math.round(1000 * f / teig) / 10, fot: Math.round(f), bta: Math.round(bta), bra: Math.round(bra), boliger: bol,
      bygg: bygg.length, ubebygd: Math.round(teig - f), parkering: Math.round(bol * (p.parkering == null ? 0.8 : p.parkering)),
      etasjerMin: et.length ? Math.min.apply(null, et) : 0, etasjerMaks: et.length ? Math.max.apply(null, et) : 0
    };
  }

  // Hele skissen for ett sett innstillinger: grøntdrag og park etter reglene, så radene mot målet.
  //   p: { typologi: 'blokk' | 'rekkehus' | 'miks', maal: 'bya' | 'bra', bya, bra, etasjer, snitt, parkering, avstand,
  //        grontdrag: true/false, park: true/false, grontBredde }
  function skisse(tomt, p) {
    var teig = areal(tomt), frie = [], ut = { teig: teig };
    var et = p.typologi === 'rekkehus' ? Math.min(REGEL.rekke.etasjerMaks, p.etasjer) : p.etasjer;
    var maalFot = p.maal === 'bra' ? (p.bra || 0) / (REGEL.effektivitet * Math.max(1, et)) : teig * (p.bya || 0) / 100;
    ut.grontdrag = p.grontdrag ? grontdrag(tomt, p.grontBredde) : { aktiv: false, grunn: 'av' };
    if (ut.grontdrag.aktiv) frie.push(ut.grontdrag.ring);
    ut.park = p.park ? park(tomt, maalFot, ut.grontdrag.aktiv ? ut.grontdrag.areal : 0) : { aktiv: false, grunn: 'av' };
    if (ut.park.aktiv) frie.push(ut.park.ring);
    var r = lineaert(tomt, p, frie, 'lamell');
    ut.bygg = r.bygg; ut.retning = r.retning; ut.frie = frie;
    ut.tall = tall(r.bygg, p, teig);
    if (ut.grontdrag.aktiv) ut.tall.grontdrag = Math.round(ut.grontdrag.areal);
    if (ut.park.aktiv) ut.tall.park = Math.round(ut.park.areal);
    var naadd = p.maal === 'bra' ? ut.tall.bra : ut.tall.fot, onsket = maalVerdi(p, teig);
    ut.maal = { form: p.maal === 'bra' ? 'bra' : 'bya', verdi: p.maal === 'bra' ? p.bra : p.bya, naadd: naadd >= onsket * (1 - REGEL.slakk) };
    return ut;
  }

  // De tre grepene på samme tomt. Hvert grep har sitt eget mål, slik studiens motor gjør det:
  // lineært er balansert (1,00), kvartalet gir mest utnyttelse (1,15) og klyngen best bokvalitet (0,85).
  var TETTHET = { lineaert: 1, kvartal: 1.15, klynge: 0.85 };
  function alternativer(tomt, p) {
    var teig = areal(tomt), ut = [];
    function med(grep) {
      var q = {}, k;
      for (k in p) q[k] = p[k];
      q.typologi = grep === 'lineaert' && p.typologi === 'miks' ? 'miks' : 'blokk'; // rekkehusene i miksen står i radene
      if (q.maal === 'bra') q.bra = (p.bra || 0) * TETTHET[grep]; else q.bya = (p.bya || 0) * TETTHET[grep];
      return q;
    }
    function legg(grep, bygg, ekstra) {
      var q = med(grep), t = tall(bygg, q, teig), onsket = maalVerdi(q, teig), v = { id: 'ABC'.charAt(ut.length), grep: grep, bygg: bygg, tall: t };
      for (var k in ekstra) v[k] = ekstra[k];
      v.maal = q.maal === 'bra' ? Math.round(q.bra) : Math.round(q.bya * 10) / 10;
      v.naadd = (q.maal === 'bra' ? t.bra : t.fot) >= onsket * (1 - REGEL.slakk);
      ut.push(v);
    }
    var a = lineaert(tomt, med('lineaert'), [], 'lamell');
    if (a.bygg.length) legg('lineaert', a.bygg, {});
    var kv = kvartal(tomt, med('kvartal'));
    if (kv && kv.bygg.length) legg('kvartal', kv.bygg, { gaard: kv.gaard });
    var kl = klynge(tomt, med('klynge'));
    if (kl && kl.bygg.length) { legg('klynge', kl.bygg, { parkRing: kl.park }); ut[ut.length - 1].tall.park = Math.round(areal(kl.park)); }
    return ut;
  }

  // Minste avstand mellom to hus (konvekse ringer), og om et hus ligger inne i en ring. Brukes i testene og i demoene.
  function punktLinje(p, a, b) {
    var dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy;
    var t = L2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2)) : 0;
    return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
  }
  function inne(p, r) {
    var inn = false;
    for (var i = 0, j = r.length - 1; i < r.length; j = i++) {
      if ((r[i][1] > p[1]) !== (r[j][1] > p[1]) && p[0] < (r[j][0] - r[i][0]) * (p[1] - r[i][1]) / (r[j][1] - r[i][1]) + r[i][0]) inn = !inn;
    }
    return inn;
  }
  function avstand(r1, r2) {
    var d = Infinity, i, j;
    for (i = 0; i < r1.length; i++) { if (inne(r1[i], r2)) return 0; for (j = 0; j < r2.length; j++) d = Math.min(d, punktLinje(r1[i], r2[j], r2[(j + 1) % r2.length])); }
    for (i = 0; i < r2.length; i++) { if (inne(r2[i], r1)) return 0; for (j = 0; j < r1.length; j++) d = Math.min(d, punktLinje(r2[i], r1[j], r1[(j + 1) % r1.length])); }
    return d;
  }
  function helInne(ring, ytre, slakk) {
    var y = innrykk(ytre, -(slakk || 0.01));
    return ring.every(function (q) { return inne(q, y.length ? y : ytre); });
  }

  // ---------- sol og skygge (Mulighetsstudie) ----------
  // Solas høyde og retning i soltid. Deklinasjonen er 0° ved jevndøgn og ±23,44° ved solvervene.
  var DEKL = { jevndogn: 0, sommer: 23.44, vinter: -23.44 };
  function sol(bredde, dag, time) {
    var f = Math.PI / 180, lat = bredde * f, d = (DEKL[dag] || 0) * f, H = 15 * (time - 12) * f;
    var sinH = Math.sin(lat) * Math.sin(d) + Math.cos(lat) * Math.cos(d) * Math.cos(H);
    var hoyde = Math.asin(Math.max(-1, Math.min(1, sinH)));
    var az = Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(lat) - Math.tan(d) * Math.cos(lat)); // fra sør, positiv mot vest
    var komp = (180 + az / f + 360) % 360; // kompassretning: 180 = sør, 270 = vest
    return { hoyde: hoyde / f, asimut: komp, oppe: hoyde > 0.5 * f,
      // skyggen av en meter høyde, i meter (x øst, y nord)
      sx: hoyde > 0.5 * f ? -Math.sin(komp * f) / Math.tan(hoyde) : 0, sy: hoyde > 0.5 * f ? -Math.cos(komp * f) / Math.tan(hoyde) : 0 };
  }
  function hylster(pkt) {
    var p = pkt.slice().sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; }), n = p.length, k = 0, h = [];
    function kryss(o, a, b) { return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); }
    for (var i = 0; i < n; i++) { while (k >= 2 && kryss(h[k - 2], h[k - 1], p[i]) <= 0) k--; h[k++] = p[i]; }
    for (var j = n - 2, t = k + 1; j >= 0; j--) { while (k >= t && kryss(h[k - 2], h[k - 1], p[j]) <= 0) k--; h[k++] = p[j]; }
    h.length = k - 1;
    return h;
  }
  // Skyggen et hus kaster på flat mark: hylsteret om grunnflaten og grunnflaten forskjøvet med skyggen av taket.
  function skygge(bygg, s) {
    if (!s.oppe) return null;
    var dx = s.sx * bygg.hoyde, dy = s.sy * bygg.hoyde;
    return hylster(bygg.ring.concat(bygg.ring.map(function (q) { return [q[0] + dx, q[1] + dy]; })));
  }

  // Uterommet målt på et rutenett: punktene på tomta med fri avstand til husene.
  //   steg: maskevidde i meter. Svaret bærer det største sammenhengende uterommet (minst 6 m til nærmeste hus).
  function uterom(tomt, bygg, steg) {
    var g = grenser(tomt), d = steg || 2, pkt = [], nx = Math.ceil((g.x1 - g.x0) / d), ny = Math.ceil((g.y1 - g.y0) / d), i, j;
    var celle = {};
    for (i = 0; i < nx; i++) for (j = 0; j < ny; j++) {
      var q = [g.x0 + (i + 0.5) * d, g.y0 + (j + 0.5) * d];
      if (!inne(q, tomt)) continue;
      var fri = Infinity;
      for (var b = 0; b < bygg.length && fri > 0; b++) {
        var r = bygg[b].ring;
        if (inne(q, r)) { fri = 0; break; }
        for (var e = 0; e < r.length; e++) fri = Math.min(fri, punktLinje(q, r[e], r[(e + 1) % r.length]));
      }
      if (fri <= 0) continue;
      var o = { p: q, fri: fri, i: i, j: j, del: -1 };
      pkt.push(o); celle[i + ',' + j] = o;
    }
    // Største sammenhengende flate der det er minst 6 m til nærmeste hus.
    var storst = [], nr = 0;
    pkt.forEach(function (o) {
      if (o.del >= 0 || o.fri < 6) return;
      var ko = [o], del = []; o.del = nr;
      while (ko.length) {
        var c = ko.pop(); del.push(c);
        [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (v) {
          var n = celle[(c.i + v[0]) + ',' + (c.j + v[1])];
          if (n && n.del < 0 && n.fri >= 6) { n.del = nr; ko.push(n); }
        });
      }
      if (del.length > storst.length) storst = del;
      nr++;
    });
    return { punkter: pkt, storst: storst, storstAreal: storst.length * d * d, areal: pkt.length * d * d, steg: d };
  }

  // Soltimer på uterommet ved jevndøgn kl. 9–16 (soltid), slik studien måler dem. Uten naboer og terreng.
  function soltimer(bygg, punkter, bredde) {
    if (!punkter.length) return 0;
    var dt = 0.5, sum = 0;
    for (var t = 9 + dt / 2; t < 16; t += dt) {
      var s = sol(bredde, 'jevndogn', t), sk = [];
      if (!s.oppe) continue;
      bygg.forEach(function (b) { var r = skygge(b, s); if (r) sk.push(r); });
      var lyse = 0;
      punkter.forEach(function (o) { for (var k = 0; k < sk.length; k++) if (inne(o.p, sk[k])) return; lyse++; });
      sum += dt * lyse / punkter.length;
    }
    return sum;
  }

  // ---------- poengmodellen (Mulighetsstudie) ----------
  // Fem ledd på 0–100, vektet. Vektene og regnestykket er studiens: arkitektur 50, måloppnåelse 20, uterom 14,
  // sol 10 og BYA 6, med +3 når arkitekturen er 75 eller mer og −8 når volumet er under 75 % av målet.
  // Måloppnåelse, uterom, sol og BYA regnes som i studien. Arkitekturen er forenklet her: luft mellom husene (40 %)
  // og størrelsen på det største uterommet eller gårdsrommet (60 %). I Mulighetsstudie måler motoren flere forhold.
  var VEKTER = [50, 20, 14, 10, 6];
  var STUDIE = { muaPerBolig: 40, muaAndel: 0.8, solKrav: 2.5, byaTreff: 0.88, byaHelning: 2.2, bredde: 63.4 };
  function ledd(alt, tomt, ramme) {
    var teig = areal(tomt), byggbart = areal(innrykk(tomt, ramme.avstand == null ? 4 : ramme.avstand)), t = alt.tall;
    var u = uterom(tomt, alt.bygg, 2);
    // Luft: avstanden til nærmeste hus målt mot høyden. 0,4 høyder gir 0, to høyder gir 100.
    // Samlet uterom: det største uterommet målt mot halve tomta.
    var luft = 0;
    alt.bygg.forEach(function (b) {
      var d = Infinity;
      alt.bygg.forEach(function (c) { if (c !== b) d = Math.min(d, avstand(b.ring, c.ring)); });
      luft += alt.bygg.length < 2 ? 100 : Math.max(0, Math.min(100, 100 * (d / b.hoyde - 0.4) / 1.6));
    });
    luft = alt.bygg.length ? luft / alt.bygg.length : 0;
    var samlet = Math.min(100, 100 * u.storstAreal / (0.5 * teig));
    // Et gårdsrom er et samlet uterom selv om det er smalt: det måles mot en firedel av tomta.
    if (alt.gaard) samlet = Math.max(samlet, Math.min(100, 100 * areal(alt.gaard) / (0.25 * teig)));
    var arkitektur = 0.4 * luft + 0.6 * samlet;
    var maal = alt.maalBra || ramme.onsketBra || 0;
    var fit = maal > 0 ? (t.bra >= maal ? 100 : Math.max(0, 100 - 100 * (maal - t.bra) / maal)) : 100;
    var mua = STUDIE.muaAndel * t.ubebygd, krav = STUDIE.muaPerBolig * t.boliger;
    var ute = krav > 0 ? Math.min(100, 100 * mua / krav) : 100;
    var timer = soltimer(alt.bygg, u.storst.length ? u.storst : u.punkter, ramme.bredde || STUDIE.bredde);
    var solscore = Math.min(100, 50 * timer / STUDIE.solKrav);
    var byaAndel = 100 * t.fot / Math.max(1, byggbart);
    var bya = Math.max(0, 100 - Math.abs(byaAndel - (ramme.maksBya || 35) * STUDIE.byaTreff) * STUDIE.byaHelning);
    return { verdier: [arkitektur, fit, ute, solscore, bya], luft: luft, samlet: samlet, storstUterom: u.storstAreal, mua: mua, muaKrav: krav,
      soltimer: timer, byaAvByggbart: byaAndel, etterslep: maal > 0 && t.bra < 0.75 * maal };
  }
  function score(l, vekter) {
    var w = vekter || VEKTER, sum = 0, tot = 0, i;
    for (i = 0; i < 5; i++) tot += w[i];
    for (i = 0; i < 5; i++) sum += (w[i] / tot) * l.verdier[i];
    var delsum = sum;
    if (l.etterslep) sum -= 8;
    if (l.verdier[0] >= 75) sum += 3;
    return { delsum: delsum, bonus: l.verdier[0] >= 75 ? 3 : 0, etterslep: l.etterslep ? -8 : 0, total: Math.max(0, Math.min(100, sum)) };
  }

  // ---------- byggherrens regnestykke (residualmodellen i Mulighetsstudie) ----------
  // Samme regnestykke og standardverdier som studien: salgsinntekt minus entreprise, pristigning, byggherrekostnader
  // og finans gir det tomta tåler med fortjenestekravet. En tidligfase-kalkyle, ikke en takst.
  var KALKYLE = {
    braI: 0.82, salgspris: 82000, byggekost: 54000, fortjeneste: 0.12, pPris: 450000,
    arkitekt: 40000, annonse: 40000, gebyr: 50000, megler: 0.011, prosjektledelse: 1200, seksjonering: 250000,
    advokat: 400000, diverse: 2000000, uforutsett: 1500, pristigning: 0.04,
    rente: 0.07, ltvBygg: 1, ltvTomt: 0.7, mndBygg: 23, mndTomt: 23, faktorBygg: 0.5, faktorTomt: 1, provisjon: 0.008, etablering: 0.0005
  };
  function kalkyle(inn) {
    var K = {}, k;
    for (k in KALKYLE) K[k] = KALKYLE[k];
    for (k in inn) if (inn[k] != null) K[k] = inn[k];
    var braS = K.braS != null ? K.braS : (inn.bra || 0) * K.braI, enheter = inn.boliger || 0, pPlasser = inn.parkering || 0;
    var salg = braS * K.salgspris + pPlasser * K.pPris;
    var entreprise = braS * K.byggekost, pristigning = entreprise * K.pristigning;
    var myke = (K.arkitekt + K.annonse + K.gebyr) * enheter + K.megler * salg + (K.prosjektledelse + K.uforutsett) * braS + K.seksjonering + K.advokat + K.diverse;
    var kT = K.ltvTomt * K.rente * (K.mndTomt / 12) * K.faktorTomt;
    var renteAndel = K.rente * (K.mndBygg / 12) * K.faktorBygg;
    var kB = (renteAndel * (1 + K.rente) + K.etablering + K.provisjon * (K.mndBygg / 12)) * K.ltvBygg;
    var basis = entreprise + pristigning + myke;
    var A = 1 + kT * (1 + kB), B = basis * (1 + kB);
    var residual = (salg - B - K.fortjeneste * salg) / A, tomt = Math.max(0, residual); // negativ residual: prosjektet bærer ikke fortjenestekravet
    var finTomt = kT * tomt, finBygg = kB * (basis + finTomt), finans = finTomt + finBygg;
    var kost = tomt + basis + finans, fortjeneste = salg - kost;
    return { braS: braS, salg: salg, entreprise: entreprise, byggherre: myke + pristigning, finans: finans, tomteverdi: tomt, residual: residual,
      fortjeneste: fortjeneste, fortjenesteAndel: salg > 0 ? fortjeneste / salg : 0, perBraS: braS > 0 ? tomt / braS : 0, perBolig: enheter > 0 ? tomt / enheter : 0 };
  }

  // ---------- eksempeltomtene ----------
  // Oppdiktede tomter i «Eksempelby». A og B er naboer og kan slås sammen til AB (ringene deler kanten mellom dem).
  var TOMTER = {
    A: { navn: 'Eksempelgata 12', gnrbnr: '100/415', ring: [[0, 0], [88, 4.2], [84.6, 71], [-3.2, 66.4]] },
    B: { navn: 'Eksempelgata 14', gnrbnr: '100/416', ring: [[88, 4.2], [147, 7.05], [142.4, 74], [84.6, 71]] },
    AB: { navn: 'Eksempelgata 12 og 14', gnrbnr: '100/415 og 100/416', ring: [[0, 0], [88, 4.2], [147, 7.05], [142.4, 74], [84.6, 71], [-3.2, 66.4]] }
  };

  // Norsk tallformat: desimalkomma og tynt mellomrom for tusen.
  function fmt(v, d) {
    if (!isFinite(v)) return '–';
    var s = Math.abs(v).toFixed(d == null ? 0 : d).split('.');
    s[0] = s[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return (v < 0 ? '−' : '') + s.join(',');
  }

  return {
    REGEL: REGEL, TOMTER: TOMTER, areal: areal, tyngde: tyngde, innrykk: innrykk, klipp: klipp, grenser: grenser, retninger: retninger,
    hovedretning: hovedretning, radavstand: radavstand, punktluft: punktluft, trapp: trapp, rytme: rytme,
    grontdrag: grontdrag, park: park, skisse: skisse, alternativer: alternativer, lineaert: lineaert, kvartal: kvartal,
    klynge: klynge, forenkle: forenkle, TETTHET: TETTHET, tall: tall, sol: sol, skygge: skygge, uterom: uterom, soltimer: soltimer,
    ledd: ledd, score: score, VEKTER: VEKTER, STUDIE: STUDIE, kalkyle: kalkyle, KALKYLE: KALKYLE, avstand: avstand, inne: inne, helInne: helInne, fmt: fmt, motsols: motsols
  };
});
