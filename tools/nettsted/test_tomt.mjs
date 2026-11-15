// Tester for tools/nettsted/tomt.js, regnemotoren bak demoene av Autoplan og Mulighetsstudie.
// Kjør: node tools/nettsted/test_tomt.mjs
import { createRequire } from 'module';
const T = createRequire(import.meta.url)('./tomt.js');
let feil = 0, antall = 0;
function si(navn, ok, mer) { antall++; if (!ok) feil++; console.log((ok ? 'ok   ' : 'FEIL ') + navn + (mer ? ' (' + mer + ')' : '')); }
function naer(navn, v, fasit, tol) { si(navn, Math.abs(v - fasit) <= tol, v.toFixed(4) + ' mot ' + fasit + ' ± ' + tol); }
const A = T.TOMTER.A.ring, B = T.TOMTER.B.ring, AB = T.TOMTER.AB.ring;

// --- Tomtene: arealene sidene viser, og at de to tomtene til sammen er den sammenslåtte ---
naer('tomt A er 5 869 m²', T.areal(A), 5868.7, 0.5);
naer('tomt A og B summerer til AB', T.areal(A) + T.areal(B), T.areal(AB), 0.01);
naer('AB er 9 786 m²', T.areal(AB), 9785.9, 0.5);
// Innrykk: et rektangel på 40 × 30 trukket 4 m inn er 32 × 22.
naer('innrykk av rektangel', T.areal(T.innrykk([[0, 0], [40, 0], [40, 30], [0, 30]], 4)), 32 * 22, 1e-6);
naer('innrykk tåler ring med sola', T.areal(T.innrykk([[0, 0], [0, 30], [40, 30], [40, 0]], 4)), 32 * 22, 1e-6);
naer('negativt innrykk flytter kantene utover', T.areal(T.innrykk([[0, 0], [40, 0], [40, 30], [0, 30]], -1)), 42 * 32, 1e-6);

// --- Reglene fra live-skissen i Maps ---
naer('radavstand 3 etasjer (9,6 m): brannavstanden', T.radavstand(9.6), 8, 1e-9);
naer('radavstand 5 etasjer (16 m): halve høyden + 2', T.radavstand(16), 10, 1e-9);
naer('radavstand har tak på 12 m', T.radavstand(40), 12, 1e-9);
naer('luft mellom punkthus, 5 etasjer', T.punktluft(16), 8.8, 1e-9);
si('terrassering: 4 etasjer trapper én, 7 to, 13 tre', T.trapp(3) === 0 && T.trapp(4) === 1 && T.trapp(7) === 2 && T.trapp(13) === 3);
{ const r = T.rytme(4, 30, 0); naer('rytmen bevarer radens lengde', r.reduce((s, x) => s + x, 0), 120, 1e-9); si('rytmen holder husene innenfor 25–40 m', r.every(x => x >= 25 - 1e-9 && x <= 40 + 1e-9)); }

// --- Skissen: alle hus inne i byggbart areal, brannavstand mellom dem, og tallene følger volumet ---
let ute = 0, tett = 0, feilTall = 0, feilMaal = 0, kjoringer = 0, feilLengde = 0;
for (const tomt of [A, B, AB]) for (const typologi of ['blokk', 'rekkehus', 'miks']) for (const maal of ['bya', 'bra'])
  for (const verdi of maal === 'bya' ? [10, 18, 25, 30, 40, 60] : [2000, 5000, 8000, 14000]) for (const etasjer of [2, 4, 5, 8]) for (const avstand of [0, 4, 8]) {
    const p = { typologi, maal, bya: verdi, bra: verdi, etasjer, snitt: 70, parkering: 0.8, avstand, grontdrag: true, park: true };
    const s = T.skisse(tomt, p), ytre = T.innrykk(tomt, avstand);
    kjoringer++;
    for (const b of s.bygg) {
      if (!T.helInne(b.ring, ytre, 0.02)) ute++;
      if (b.typ === 'lamell' && (b.lengde < 25 - 1e-6 || b.lengde > 40 + 1e-6)) feilLengde++;
      for (const f of s.frie) if (T.avstand(b.ring, f) < -1e-6 || b.ring.some(q => T.inne(q, T.innrykk(f, 0.05)))) ute++;
    }
    for (let i = 0; i < s.bygg.length; i++) for (let j = i + 1; j < s.bygg.length; j++) if (T.avstand(s.bygg[i].ring, s.bygg[j].ring) < T.REGEL.brann - 1e-6) tett++;
    const fot = s.bygg.reduce((x, b) => x + b.lengde * b.dybde, 0), bra = s.bygg.reduce((x, b) => x + b.lengde * b.dybde * b.etasjer * 0.92, 0);
    if (Math.abs(fot - s.tall.fot) > 1 || Math.abs(bra - s.tall.bra) > 1 || s.tall.parkering !== Math.round(s.tall.boliger * 0.8)) feilTall++;
    const naadd = maal === 'bya' ? fot : bra, onsket = maal === 'bya' ? T.areal(tomt) * verdi / 100 : verdi;
    // Rekkehus går i hele enheter på 4,5 m, så de treffer målet innenfor én enhet per rekke.
    const slingring = typologi === 'blokk' ? 1.005 : 1.12;
    if (s.maal.naadd !== (naadd >= onsket * 0.97) || naadd > onsket * slingring + 60) feilMaal++;
  }
si('skissen: ' + kjoringer + ' kjøringer, ingen hus utenfor byggbart areal eller i park og grøntdrag', ute === 0, ute + ' brudd');
si('skissen: brannavstand på 8 m mellom alle hus', tett === 0, tett + ' par');
si('skissen: lamellene er 25–40 m lange', feilLengde === 0, feilLengde + ' hus');
si('skissen: BYA, BRA og parkering følger volumet', feilTall === 0, feilTall + ' avvik');
si('skissen: treffer målet, eller sier at det ikke ble nådd', feilMaal === 0, feilMaal + ' avvik');

// --- Grøntdrag og park etter reglene i Autoplan ---
{ const p = { typologi: 'blokk', maal: 'bya', bya: 25, etasjer: 4, snitt: 70, parkering: 0.8, avstand: 4, grontdrag: true, park: true };
  const a = T.skisse(A, p), ab = T.skisse(AB, p);
  si('grøntdrag: ikke under 6 000 m²', !a.grontdrag.aktiv && a.grontdrag.grunn === 'for_liten');
  si('grøntdrag: tegnes på den sammenslåtte tomta', ab.grontdrag.aktiv && Math.abs(ab.grontdrag.bredde - 12) < 1e-9);
  si('park: høyst 20 % av tomta, minst 600 m²', a.park.aktiv && a.park.areal <= 0.2 * T.areal(A) + 1 && a.park.areal >= 600);
  si('park: ingen park når målet fyller tomta', !T.skisse(A, Object.assign({}, p, { bya: 45 })).park.aktiv); }

// --- De tre grepene ---
{ let feilA = 0, n = 0;
  for (const tomt of [A, AB]) for (const bra of [3000, 5500, 8000]) for (const etasjer of [3, 4, 6]) {
    const alt = T.alternativer(tomt, { typologi: 'blokk', maal: 'bra', bra, etasjer, snitt: 67.5, parkering: 0.8, avstand: 4 }), ytre = T.innrykk(tomt, 4);
    n++;
    if (alt.length !== 3 || alt.map(a => a.grep).join() !== 'lineaert,kvartal,klynge') feilA++;
    for (const a of alt) {
      for (const b of a.bygg) if (!T.helInne(b.ring, ytre, 0.05)) feilA++;
      for (let i = 0; i < a.bygg.length; i++) for (let j = i + 1; j < a.bygg.length; j++) if (T.avstand(a.bygg[i].ring, a.bygg[j].ring) < 8 - 0.05) feilA++;
      if (a.grep === 'klynge' && a.bygg.some(b => b.lengde < 17 - 1e-6 || b.lengde > 22 + 1e-6 || Math.abs(b.lengde - b.dybde) > 1e-6)) feilA++;
      if (Math.abs(a.maal - bra * T.TETTHET[a.grep]) > 1) feilA++;
    }
  }
  si('grepene: ' + n + ' kjøringer gir lineært, kvartal og klynge, inne på tomta og med brannavstand', feilA === 0, feilA + ' avvik'); }

// --- Sol: høyde og retning i soltid ---
{ const s = T.sol(63.4, 'jevndogn', 12);
  naer('sol ved jevndøgn kl. 12: høyde 90° − breddegraden', s.hoyde, 26.6, 1e-6); naer('sol kl. 12 står i sør', s.asimut, 180, 1e-6);
  naer('skyggen av én meter ved jevndøgn kl. 12', Math.hypot(s.sx, s.sy), 1 / Math.tan(26.6 * Math.PI / 180), 1e-9);
  naer('sommersolverv kl. 12', T.sol(63.4, 'sommer', 12).hoyde, 26.6 + 23.44, 1e-6); naer('vintersolverv kl. 12', T.sol(63.4, 'vinter', 12).hoyde, 26.6 - 23.44, 1e-6);
  si('ved jevndøgn står sola opp i øst kl. 6', !T.sol(63.4, 'jevndogn', 6).oppe && Math.abs(T.sol(63.4, 'jevndogn', 6.001).asimut - 90) < 0.1);
  const sk = T.skygge({ ring: [[0, 0], [10, 0], [10, 10], [0, 10]], hoyde: 10 }, s);
  naer('skyggen av en kube på 10 m kl. 12: grunnflaten pluss 10 × lengden', T.areal(sk), 100 + 10 * 10 / Math.tan(26.6 * Math.PI / 180), 1e-6);
  naer('uten hus er det sol hele målevinduet kl. 9–16', T.soltimer([], [{ p: [0, 0] }], 63.4), 7, 1e-9); }

// --- Poengmodellen: studiens vekter og justeringer ---
{ const l = { verdier: [80, 100, 50, 40, 90], etterslep: false };
  naer('score med standardvektene 50/20/14/10/6, og +3 for arkitektur over 75', T.score(l).total, 0.5 * 80 + 0.2 * 100 + 0.14 * 50 + 0.1 * 40 + 0.06 * 90 + 3, 1e-9);
  naer('score med egne vekter', T.score(l, [20, 20, 20, 20, 20]).total, (80 + 100 + 50 + 40 + 90) / 5 + 3, 1e-9);
  naer('etterslep under 75 % av målet trekker 8', T.score({ verdier: [50, 60, 50, 50, 50], etterslep: true }).total, 0.5 * 50 + 0.2 * 60 + 0.14 * 50 + 0.1 * 50 + 0.06 * 50 - 8, 1e-9);
  si('scoren holdes innenfor 0–100', T.score({ verdier: [100, 100, 100, 100, 100], etterslep: false }).total === 100); }

// --- Byggherrens regnestykke mot studiens egen kalkyle (builtly/feasibility_valuation.py, regnet 2026-11-13) ---
const FASIT = [
  { inn: {"bra": 4675, "boliger": 69, "parkering": 55, "salgspris": 82000, "byggekost": 54000, "fortjeneste": 0.12}, tomteverdi: 32937371.54, salg: 339097000.00, entreprise: 207009000.00, finans: 24478111.46, myke: 25700517.00 },
  { inn: {"bra": 5439, "boliger": 80, "parkering": 64, "salgspris": 82000, "byggekost": 54000, "fortjeneste": 0.12}, tomteverdi: 38787032.75, salg: 394518360.00, entreprise: 240838920.00, finans: 28484999.29, myke: 29431647.96 },
  { inn: {"bra": 7289, "boliger": 112, "parkering": 90, "salgspris": 95000, "byggekost": 60000, "fortjeneste": 0.15}, tomteverdi: 61588162.22, salg: 608313100.00, entreprise: 358618800.00, finans: 42475130.68, myke: 40039290.10 },
  { inn: {"bra": 3000, "boliger": 40, "parkering": 0, "salgspris": 60000, "byggekost": 54000, "fortjeneste": 0.12}, tomteverdi: -34384869.80, salg: 147600000.00, entreprise: 132840000.00, finans: 13515910.29, myke: 16115600.00 },
  { inn: {"bra": 6000, "boliger": 90, "parkering": 72, "salgspris": 70000, "byggekost": 58000, "fortjeneste": 0.1}, tomteverdi: -16530101.05, salg: 376800000.00, entreprise: 285360000.00, finans: 28785367.24, myke: 31778800.00 }
];
FASIT.forEach((f, i) => {
  const k = T.kalkyle(f.inn);
  naer('kalkyle ' + (i + 1) + ': residual tomteverdi mot studiens kalkyle', k.residual, f.tomteverdi, 1);
  si('kalkyle ' + (i + 1) + ': tomtekosten er aldri negativ', k.tomteverdi === Math.max(0, k.residual));
  naer('kalkyle ' + (i + 1) + ': salg, entreprise og finans', Math.abs(k.salg - f.salg) + Math.abs(k.entreprise - f.entreprise) + Math.abs(k.finans - f.finans), 0, 1);
});
naer('kalkylen gir fortjenestekravet når tomta betales til residualverdien', T.kalkyle(FASIT[0].inn).fortjenesteAndel, 0.12, 1e-9);

console.log('\n' + antall + ' kontroller, ' + feil + ' feil');
process.exit(feil ? 1 : 0);
