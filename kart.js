/* www.builtly.ai: kartet bak produktdemoene. Kilde: tools/nettsted/kart.js.
   Et tegnet eksempelnabolag («Eksempelby») rundt de to eksempeltomtene i tomt.js, i SVG. Kartet kan vippes fra 2D til 3D:
   bakken følger én affin transformasjon, og husene tegnes som prismer oppå. Alt er eksempeldata, ingen ekte eiendommer. */
(function () {
  'use strict';
  var T = window.BuiltlyTomt;
  if (!T) return;
  var NS = 'http://www.w3.org/2000/svg';
  var W = 1000, H = 660;
  var rolig = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function el(navn, attrs, forelder) {
    var e = document.createElementNS(NS, navn);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (forelder) forelder.appendChild(e);
    return e;
  }
  function pkt(r) { return r.map(function (q) { return q[0].toFixed(2) + ',' + q[1].toFixed(2); }).join(' '); }
  // Fast tilfeldighet, så nabolaget er likt hver gang.
  function tilfeldig(fro) { var a = fro >>> 0; return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  // ---------- nabolaget ----------
  // Gatene følger tomtenes retning (2,9°). u går langs Eksempelgata, v på tvers; tomtene ligger i u 0–147, v 0–70.
  var VINKEL = 2.9 * Math.PI / 180, CU = Math.cos(VINKEL), SU = Math.sin(VINKEL);
  function uv(u, v) { return [u * CU - v * SU, u * SU + v * CU]; }
  function rekt(u0, v0, u1, v1) { return [uv(u0, v0), uv(u1, v0), uv(u1, v1), uv(u0, v1)]; }
  var VERDEN = { x0: -78, x1: 222, y0: -70, y1: 138 };
  var GATER = [
    { navn: 'Eksempelgata', b: 8, a: uv(-90, -10), z: uv(240, -10) },
    { navn: 'Bakkeveien', b: 6.5, a: uv(-90, 79), z: uv(240, 79) },
    { navn: 'Parkveien', b: 7, a: uv(-13.5, -90), z: uv(-13.5, 150) },
    { navn: 'Elvegata', b: 7, a: uv(160, -90), z: uv(160, 150) }
  ];
  var NABOLAG = (function () {
    var r = tilfeldig(20261113), hus = [], gront = [], traer = [], teiger = [];
    function rad(u0, u1, v0, v1, langs) {
      // en rad med hus langs gata: eneboliger, tomannsboliger og en og annen blokk
      var p = langs === 'u' ? u0 : v0, slutt = langs === 'u' ? u1 : v1;
      while (p < slutt - 9) {
        var type = r(), bredde = type < 0.55 ? 9 + r() * 3 : type < 0.82 ? 16 + r() * 6 : 28 + r() * 10;
        if (p + bredde > slutt) break;
        var dyp = (langs === 'u' ? v1 - v0 : u1 - u0), d = Math.min(dyp, type < 0.82 ? 8 + r() * 2.5 : 12.5), inn = (dyp - d) * (0.2 + r() * 0.6);
        var et = type < 0.55 ? 2 : type < 0.82 ? 2 + (r() < 0.4 ? 1 : 0) : 3 + Math.floor(r() * 2);
        var ring = langs === 'u' ? rekt(p, v0 + inn, p + bredde, v0 + inn + d) : rekt(u0 + inn, p, u0 + inn + d, p + bredde);
        hus.push({ ring: ring, hoyde: et * 3 + (type < 0.82 ? 1.5 : 0), nabo: true });
        if (langs === 'u') teiger.push([uv(p - 2.5, v0 - 2), uv(p - 2.5, v1 + 2)]); else teiger.push([uv(u0 - 2, p - 2.5), uv(u1 + 2, p - 2.5)]);
        if (r() < 0.5) traer.push(langs === 'u' ? uv(p + bredde + 2, v0 + r() * dyp) : uv(u0 + r() * dyp, p + bredde + 2));
        p += bredde + 5 + r() * 4;
      }
    }
    rad(-70, 150, -32, -19, 'u'); rad(-70, 150, -58, -44, 'u');           // sør for Eksempelgata
    rad(62, 150, 86, 99, 'u'); rad(-8, 150, 110, 124, 'u');               // nord for Bakkeveien
    rad(-34, -21, -4, 72, 'v'); rad(-62, -47, -4, 72, 'v');               // vest for Parkveien
    rad(-62, -21, 86, 124, 'v'); rad(-62, -21, -58, -19, 'v');            // hjørnene i vest
    hus.push({ ring: rekt(0, 86, 44, 104), hoyde: 8, nabo: true, skole: true });   // skolen nord for tomta
    hus.push({ ring: rekt(48, 90, 58, 104), hoyde: 5, nabo: true, skole: true });
    gront.push(rekt(-8, 84, 62, 108));                                    // skolegården og plenen rundt
    gront.push([uv(167, -90), uv(186, -90), uv(183, 20), uv(187, 80), uv(184, 150), uv(167, 150)]); // elveparken
    for (var v = -60; v < 130; v += 13) traer.push(uv(171 + 6 * r(), v + 4 * r()));
    for (var u = -60; u < 150; u += 17) { traer.push(uv(u + 3 * r(), -15.5)); }
    for (var k = 0; k < 7; k++) traer.push(uv(-4 + 62 * r(), 84 + 2 + 1.5 * r()));
    var elv = [uv(186, -90), uv(240, -90), uv(240, 150), uv(184, 150), uv(187, 80), uv(183, 20)];
    return { hus: hus, gront: gront, traer: traer, teiger: teiger, elv: elv };
  })();

  // Kartlagene i Maps-utsnittet. Sonene er tegnet for eksempelets skyld.
  var KARTLAG = {
    regulering: { navn: 'Reguleringsplan (arealformål)', flater: [
      { ring: T.TOMTER.AB.ring, farge: '#f5d94e', tekst: 'Boligbebyggelse' },
      { ring: rekt(-8, 84, 62, 108), farge: '#e8928c', tekst: 'Offentlig tjenesteyting' },
      { ring: [uv(167, -90), uv(186, -90), uv(183, 20), uv(187, 80), uv(184, 150), uv(167, 150)], farge: '#7fc77f', tekst: 'Friområde' },
      { ring: rekt(-70, -58, 150, -19), farge: '#f7e58a', tekst: 'Boligbebyggelse' },
      { ring: rekt(-62, -4, -21, 72), farge: '#f7e58a', tekst: 'Boligbebyggelse' }] },
    flom: { navn: 'Flomsoner (10–1000 år)', flater: [
      { ring: [uv(150, -90), uv(186, -90), uv(183, 20), uv(187, 80), uv(184, 150), uv(156, 150), uv(151, 96), uv(139, 58), uv(133, 22), uv(141, -22)], farge: '#3b82c4', tekst: '200-årsflom' }] },
    kvikkleire: { navn: 'Kvikkleire (aktsomhet)', flater: [
      { ring: [uv(70, 150), uv(63, 112), uv(84, 86), uv(118, 74), uv(150, 82), uv(162, 108), uv(160, 150)], farge: '#9b6fc4', tekst: 'Aktsomhetsområde' }] },
    stoy: { navn: 'Støysoner (veg/bane/fly)', flater: [
      { ring: rekt(-90, -36, 240, 16), farge: '#f2c94c', tekst: 'Gul sone' },
      { ring: rekt(-90, -22, 240, 2), farge: '#e25c4a', tekst: 'Rød sone' }] }
  };

  // ---------- kartet ----------
  function Kart(svg, valg) {
    valg = valg || {};
    this.svg = svg;
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid slice');
    this.t = 0;                       // 0 = 2D, 1 = 3D
    this.fokus = valg.fokus || { x: 44, y: 34, k: 3.9 };
    this.grunn = el('g', { 'class': 'k-grunn' }, svg);
    this.hus = el('g', { 'class': 'k-hus' }, svg);
    this.over = el('g', { 'class': 'k-over' }, svg);
    this.prismer = [];
    this.lag = {};
    this._byggGrunn(valg);
    this.sett(0, true);
  }
  Kart.prototype._byggGrunn = function (valg) {
    var g = this.grunn, V = VERDEN, self = this;
    el('rect', { x: V.x0 - 200, y: V.y0 - 200, width: V.x1 - V.x0 + 400, height: V.y1 - V.y0 + 400, 'class': 'k-land' }, g);
    NABOLAG.gront.forEach(function (r) { el('polygon', { points: pkt(r), 'class': 'k-gront' }, g); });
    el('polygon', { points: pkt(NABOLAG.elv), 'class': 'k-vann' }, g);
    this.lagG = el('g', { 'class': 'k-lag' }, g);       // kartlagene legges under gatene
    NABOLAG.teiger.forEach(function (l) { el('line', { x1: l[0][0], y1: l[0][1], x2: l[1][0], y2: l[1][1], 'class': 'k-teig' }, g); });
    GATER.forEach(function (v) { el('line', { x1: v.a[0], y1: v.a[1], x2: v.z[0], y2: v.z[1], 'stroke-width': v.b + 3, 'class': 'k-vei-kant' }, g); });
    GATER.forEach(function (v) { el('line', { x1: v.a[0], y1: v.a[1], x2: v.z[0], y2: v.z[1], 'stroke-width': v.b, 'class': 'k-vei' }, g); });
    this.navn = el('g', { 'class': 'k-navn' }, g);
    // Gatenavnene: teksten er speilvendt i bakkens ramme (y opp), så den vendes tilbake om sitt eget punkt.
    [['Eksempelgata', uv(60, -10), VINKEL], ['Bakkeveien', uv(96, 79), VINKEL], ['Parkveien', uv(-13.5, 40), VINKEL + Math.PI / 2], ['Elvegata', uv(160, 44), VINKEL + Math.PI / 2], ['Elva', uv(204, 30), VINKEL + Math.PI / 2]].forEach(function (n) {
      var t = el('text', { x: 0, y: 0, 'class': n[0] === 'Elva' ? 'k-tekst vann' : 'k-tekst', 'text-anchor': 'middle', transform: 'translate(' + n[1][0].toFixed(1) + ' ' + n[1][1].toFixed(1) + ') rotate(' + (n[2] * 180 / Math.PI).toFixed(1) + ') scale(1 -1)' }, self.navn);
      t.textContent = n[0];
    });
    this.planG = el('g', { 'class': 'k-plan' }, g);     // tomtegrense, plen, park, skygger: alt som ligger flatt
  };
  // Vipper kartet: t = 0 er rett ovenfra, t = 1 er skrått fra sør.
  Kart.prototype.matrise = function () {
    var t = this.t, f = this.fokus, th = -18 * Math.PI / 180 * t, ph = 54 * Math.PI / 180 * t, k = f.k * (1 + 0.1 * t);
    var c = Math.cos(th), s = Math.sin(th), cp = Math.cos(ph), sp = Math.sin(ph);
    return { k: k, c: c, s: s, cp: cp, sp: sp, cx: f.x, cy: f.y, ox: W / 2, oy: H / 2 + 26 * t };
  };
  Kart.prototype.til = function (x, y, z) {
    var m = this._m, X = (x - m.cx) * m.c - (y - m.cy) * m.s, Y = (x - m.cx) * m.s + (y - m.cy) * m.c;
    return [m.ox + m.k * X, m.oy - m.k * (Y * m.cp + (z || 0) * m.sp)];
  };
  // Skjermpunkt (i viewBox-koordinater) tilbake til bakken.
  Kart.prototype.fra = function (sx, sy) {
    var m = this._m, X = (sx - m.ox) / m.k, Y = -(sy - m.oy) / (m.k * m.cp);
    return [m.cx + X * m.c + Y * m.s, m.cy - X * m.s + Y * m.c];
  };
  Kart.prototype.fraKlient = function (cx, cy) {
    var p = this.svg.createSVGPoint(); p.x = cx; p.y = cy;
    var m = this.svg.getScreenCTM(); // null når kartet er skjult
    if (!m) return [0, 0];
    var q = p.matrixTransform(m.inverse());
    return this.fra(q.x, q.y);
  };
  Kart.prototype.sett = function (t, straks) {
    this.t = t;
    var m = this._m = this.matrise();
    var a = m.k * m.c, b = -m.k * m.cp * m.s, c = -m.k * m.s, d = -m.k * m.cp * m.c;
    var e = m.ox - m.k * (m.cx * m.c - m.cy * m.s), f = m.oy + m.k * m.cp * (m.cx * m.s + m.cy * m.c);
    this.grunn.setAttribute('transform', 'matrix(' + [a, b, c, d, e, f].map(function (v) { return v.toFixed(4); }).join(' ') + ')');
    this.svg.classList.toggle('er-3d', t > 0.5);
    this.tegnHus();
    if (this.etterSett) this.etterSett();
  };
  // Myk overgang mellom 2D og 3D, og mellom utsnitt.
  Kart.prototype.gaaTil = function (t1, fokus1, ferdig) {
    var self = this, t0 = this.t, f0 = { x: this.fokus.x, y: this.fokus.y, k: this.fokus.k }, f1 = fokus1 || f0, start = null;
    cancelAnimationFrame(this._anim);
    if (rolig) { this.fokus = f1; this.sett(t1, true); if (ferdig) ferdig(); return; }
    function steg(naa) {
      if (start == null) start = naa;
      var u = Math.min(1, (naa - start) / 700), e = u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
      self.fokus = { x: f0.x + (f1.x - f0.x) * e, y: f0.y + (f1.y - f0.y) * e, k: f0.k + (f1.k - f0.k) * e };
      self.sett(t0 + (t1 - t0) * e);
      if (u < 1) self._anim = requestAnimationFrame(steg); else if (ferdig) ferdig();
    }
    this._anim = requestAnimationFrame(steg);
  };
  // Prismene: naboene og husene i planen. { ring, hoyde, klasse, id, vekst (0–1) }
  Kart.prototype.settPrismer = function (liste) { this.prismer = liste; this.tegnHus(); };
  Kart.prototype.tegnHus = function () {
    var self = this, m = this._m, t = this.t, alle = NABOLAG.hus.concat(this.prismer || []), ut = [];
    function dybde(q) { return (q[0] - m.cx) * m.s + (q[1] - m.cy) * m.c; }
    // Bakerst først: størst avstand fra kameraet, som står i sør. Trærne sorteres sammen med husene.
    var med = alle.map(function (p) { return { p: p, d: dybde(T.tyngde(p.ring)) }; });
    NABOLAG.traer.concat(this.planTraer || []).forEach(function (q) { med.push({ tre: q, d: dybde(q) }); });
    med.sort(function (a, b) { return b.d - a.d; });
    var vx = -m.s, vy = -m.c; // retningen fra scenen mot kameraet, på bakken: (0, −1) i den dreide rammen
    med.forEach(function (o) {
      if (o.tre) {
        var q = o.tre, fot = self.til(q[0], q[1], 0), krone = self.til(q[0], q[1], 5 * t);
        if (t > 0.05) ut.push('<line class="k-stamme" x1="' + fot[0].toFixed(1) + '" y1="' + fot[1].toFixed(1) + '" x2="' + krone[0].toFixed(1) + '" y2="' + krone[1].toFixed(1) + '"/>');
        ut.push('<circle class="k-tre" cx="' + krone[0].toFixed(1) + '" cy="' + krone[1].toFixed(1) + '" r="' + (2.3 * m.k).toFixed(1) + '"/>');
        return;
      }
      var p = o.p, r = T.motsols(p.ring), h = p.hoyde * (p.vekst == null ? 1 : p.vekst) * t, kl = p.klasse || (p.skole ? 'k-nabo skole' : 'k-nabo');
      var id = p.id ? ' data-id="' + p.id + '"' : '';
      // Hus som kan velges fra tastaturet, får fokus og navn på taket.
      var tast = p.etikett ? ' tabindex="0" role="button" aria-label="' + String(p.etikett).replace(/&/g, '&amp;').replace(/"/g, '&quot;') + '"' : '';
      if (h > 0.05) {
        for (var i = 0; i < r.length; i++) {
          var a = r[i], b = r[(i + 1) % r.length], nx = b[1] - a[1], ny = -(b[0] - a[0]);
          if (nx * vx + ny * vy <= 0) continue; // veggen vender bort
          var lys = (nx * -0.35 + ny * -0.94) / Math.hypot(nx, ny); // sola står i sørvest
          var pts = [self.til(a[0], a[1], 0), self.til(b[0], b[1], 0), self.til(b[0], b[1], h), self.til(a[0], a[1], h)];
          ut.push('<polygon class="' + kl + ' vegg' + (lys > 0.3 ? ' lys' : '') + '"' + id + ' points="' + pkt(pts) + '"/>');
        }
      }
      ut.push('<polygon class="' + kl + ' tak' + (p.valgt ? ' valgt' : '') + '"' + id + tast + ' points="' + pkt(r.map(function (q) { return self.til(q[0], q[1], h); })) + '"/>');
      if (p.merke != null && t < 0.5) { var c = T.tyngde(p.ring), s = self.til(c[0], c[1], h); ut.push('<text class="k-etasjer" x="' + s[0].toFixed(1) + '" y="' + (s[1] + 4).toFixed(1) + '" text-anchor="middle">' + p.merke + '</text>'); }
    });
    // Husene tegnes på nytt ved hver endring. Står tastaturfokus på et hus, følger det med til det nye elementet.
    var akt = document.activeElement, fokusId = akt && this.hus.contains(akt) ? akt.getAttribute('data-id') : null;
    this.hus.innerHTML = ut.join('');
    if (fokusId) { var ny = this.hus.querySelector('.tak[data-id="' + fokusId + '"]'); if (ny && ny.focus) ny.focus({ preventScroll: true }); }
  };
  // Et kartlag av eller på.
  Kart.prototype.settLag = function (nokkel, paa) {
    var L = KARTLAG[nokkel], self = this;
    if (!L) return;
    if (!this.lag[nokkel]) {
      var g = el('g', { 'class': 'k-kartlag lag-' + nokkel }, this.lagG);
      L.flater.forEach(function (f) { el('polygon', { points: pkt(f.ring), fill: f.farge }, g); });
      this.lag[nokkel] = g;
    }
    this.lag[nokkel].classList.toggle('pa', !!paa);
  };

  window.BuiltlyKart = {
    Kart: Kart, el: el, pkt: pkt, uv: uv, rekt: rekt, VERDEN: VERDEN, KARTLAG: KARTLAG, NABOLAG: NABOLAG, W: W, H: H,
    fokusFor: function (ring, k) { var g = T.grenser(ring); return { x: (g.x0 + g.x1) / 2, y: (g.y0 + g.y1) / 2 - 2, k: k || Math.min(W / ((g.x1 - g.x0) * 1.55), H / ((g.y1 - g.y0) * 1.75)) }; }
  };
})();
