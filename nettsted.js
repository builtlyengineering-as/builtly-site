/* www.builtly.ai: meny, mobilmeny, språkvalget, framdriften i softwareløpet og sløyfen. Kilde: tools/nettsted/nettsted.js. */
(function () {
  var doc = document.documentElement;

  function maalNav() {
    var nav = document.querySelector('.nav');
    if (nav) doc.style.setProperty('--navh', nav.offsetHeight + 'px');
  }
  maalNav();
  window.addEventListener('resize', maalNav);

  // Nedtrekksmenyene: klikk åpner, Esc og klikk utenfor lukker, hover åpner på store skjermer.
  var dds = Array.prototype.slice.call(document.querySelectorAll('.dd'));
  function lukkAlle(unntatt) {
    dds.forEach(function (d) {
      if (d !== unntatt) { d.classList.remove('open'); d.querySelector('.dd-btn').setAttribute('aria-expanded', 'false'); }
    });
  }
  dds.forEach(function (d) {
    var b = d.querySelector('.dd-btn');
    b.addEventListener('click', function (e) {
      e.stopPropagation();
      // Med mus har hover allerede åpnet panelet, så klikket holder det åpent i stedet for å lukke det.
      var aapen = window.matchMedia('(hover:hover)').matches ? true : !d.classList.contains('open');
      lukkAlle(d);
      d.classList.toggle('open', aapen);
      b.setAttribute('aria-expanded', aapen ? 'true' : 'false');
    });
    var tid;
    d.addEventListener('mouseenter', function () {
      if (!window.matchMedia('(hover:hover)').matches) return;
      clearTimeout(tid); lukkAlle(d); d.classList.add('open'); b.setAttribute('aria-expanded', 'true');
    });
    d.addEventListener('mouseleave', function () {
      if (!window.matchMedia('(hover:hover)').matches) return;
      tid = setTimeout(function () { d.classList.remove('open'); b.setAttribute('aria-expanded', 'false'); }, 160);
    });
  });
  document.addEventListener('click', function (e) { if (!e.target.closest('.dd')) lukkAlle(null); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') lukkAlle(null); });

  // Mobilmenyen.
  var burger = document.querySelector('.burger');
  var mm = document.querySelector('.mm');
  if (burger && mm) {
    burger.addEventListener('click', function () {
      var aapen = !mm.classList.contains('open');
      mm.classList.toggle('open', aapen);
      burger.setAttribute('aria-expanded', aapen ? 'true' : 'false');
    });
  }

  // Framdriften i løpet på softwaresiden.
  var kapitler = Array.prototype.slice.call(document.querySelectorAll('.kap[data-kap]'));
  var punkter = Array.prototype.slice.call(document.querySelectorAll('.losbar li'));
  var her = document.querySelector('.losbar .her');
  if (kapitler.length && punkter.length) {
    function oppdater() {
      var navh = parseFloat(getComputedStyle(doc).getPropertyValue('--navh')) || 65;
      var linje = navh + 70 + window.innerHeight * 0.25;
      var aktiv = -1;
      kapitler.forEach(function (k, i) {
        var r = k.getBoundingClientRect();
        var andel = (linje - r.top) / r.height;
        andel = Math.max(0, Math.min(1, andel));
        var fyll = punkter[i] && punkter[i].querySelector('.spor i');
        if (fyll) fyll.style.width = (andel * 100).toFixed(1) + '%';
        if (r.top <= linje && r.bottom > linje) aktiv = i;
      });
      punkter.forEach(function (p, i) { p.classList.toggle('on', i === aktiv); });
      if (her) {
        if (aktiv >= 0) {
          var k = kapitler[aktiv];
          var en = document.documentElement.lang === 'en';
          her.innerHTML = '<b>' + (en && k.getAttribute('data-navn-en') || k.getAttribute('data-navn')) + '</b><span>§ 0' + (aktiv + 1) + ' · ' + (en && k.getAttribute('data-fase-en') || k.getAttribute('data-fase')) + '</span>';
        } else {
          her.innerHTML = document.documentElement.lang === 'en' ? '<b>From site to handover</b><span>Four products</span>' : '<b>Fra tomt til overlevering</b><span>Fire produkter</span>';
        }
      }
    }
    window.addEventListener('scroll', oppdater, { passive: true });
    window.addEventListener('resize', oppdater);
    oppdater();
  }
  // Sløyfen i toppen av forsiden: ett steg om gangen, så en pause, så på nytt. Står stille ved redusert bevegelse.
  var film = document.querySelector('.film');
  if (film) {
    var steg = Array.prototype.slice.call(film.querySelectorAll('.film-steg'));
    var rolig = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (rolig) {
      steg.forEach(function (s) { s.classList.add('ferdig'); });
    } else {
      var i = -1;
      var neste = function () {
        i++;
        if (i >= steg.length) {
          setTimeout(function () { steg.forEach(function (s) { s.classList.remove('aktiv', 'ferdig'); }); i = -1; neste(); }, 3200);
          return;
        }
        steg.forEach(function (s, j) { s.classList.toggle('aktiv', j === i); s.classList.toggle('ferdig', j < i); });
        setTimeout(neste, i === steg.length - 1 ? 3000 : 2600);
      };
      neste();
    }
  }

  // Språkvalget: marker språket i18n.js valgte.
  function merkSprak() {
    var l = document.documentElement.lang === 'en' ? 'en' : 'no';
    document.querySelectorAll('[data-sprak]').forEach(function (a) { a.classList.toggle('on', a.getAttribute('data-sprak') === l); });
  }
  merkSprak();
  new MutationObserver(merkSprak).observe(doc, { attributes: true, attributeFilter: ['lang'] });
})();
