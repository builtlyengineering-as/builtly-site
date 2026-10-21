#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Generator for builtly.ai — tjeneste- og områdesidene (reposisjoneringen 2026).

Lager:
  tjenester.html + tjenester/<fag>.html  (9 fagsider)
  software.html · referanser.html · slik-jobber-vi.html
  /tmp/i18n_reposition_fragment.js       (i18n-laget som spleises inn i i18n.js)

Kjør fra repo-rot:  python3 tools/lag_sider.py

Prinsipper (fra reposisjoneringen):
  - Norsk er kildespråket: inline-teksten i HTML er norsk, og hver data-i18n-nøkkel
    finnes i BÅDE no og en i i18n-laget (tt() faller ellers til en og overskriver
    norsk inline). sv/da/fi/de får nav/footer + korte fellesnøkler; resten faller
    ærlig tilbake til engelsk.
  - Tjenestesidene bruker norsk innkjøpsvokabular (rådgiveroppdrag, ansvarlig
    prosjekterende, prosjekteringsgrunnlag, kontroll, leveranse) — aldri
    tier/attested/production layer.
  - Ingeniøren har det faglige ansvaret og leverer oppdraget; softwaren er et
    verktøy i prosjekteringen. Aldri «plattformen lager leveransen, ingeniøren
    signerer» på tjenestesidene.
  - Generatoren er sjekket inn med vilje: en generert flate uten kilde kan ikke
    oppdateres, bare skrives om.
"""
import html as _html
import json
import os

ROT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# ============================================================================
# DELT CHROME — design-tokens, nav, footer (matcher index.html-formspråket)
# ============================================================================

CSS_CORE = """
:root{
  --bg:#FAFAF7; --bg-soft:#F1EEE6; --bg-warm:#EDE9DF;
  --ink:#131820; --ink-soft:#2A323C; --mid:#6A6E76; --grey:#B8B5AD;
  --dark:#131820; --dark-soft:#1C232D; --dark-paper:#F7F4ED;
  --line:rgba(19,24,32,0.10); --line-strong:rgba(19,24,32,0.22);
  --line-dark:rgba(247,244,237,0.10); --line-dark-strong:rgba(247,244,237,0.20);
  --accent:#14B8A6; --accent-bright:#2DD4BF; --accent-soft:#0D9488;
  --font-display:'Manrope','Helvetica Neue',system-ui,sans-serif;
  --font-body:'Manrope','Helvetica Neue',system-ui,sans-serif;
  --font-serif:'Newsreader','Times New Roman',serif;
  --font-mono:'JetBrains Mono',Menlo,monospace;
  --max:1440px; --gutter:clamp(24px,4.5vw,72px);
}
*,*::before,*::after{box-sizing:border-box}
html{scroll-behavior:smooth}
body{margin:0;background:var(--bg);color:var(--ink);font-family:var(--font-body);font-size:17px;line-height:1.55;font-weight:400;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;overflow-x:hidden;font-feature-settings:"ss01","cv11"}
::selection{background:var(--ink);color:var(--bg)}
h1,h2,h3,h4,h5{font-family:var(--font-display);font-weight:600;color:inherit;margin:0;line-height:1.05;letter-spacing:-0.022em}
.dpy-1{font-size:clamp(38px,5.2vw,74px);line-height:1.05;letter-spacing:-0.028em;font-weight:500}
.dpy-2{font-size:clamp(30px,4vw,56px);line-height:1.1;letter-spacing:-0.024em;font-weight:500}
.dpy-3{font-size:clamp(24px,3vw,38px);line-height:1.12;letter-spacing:-0.02em;font-weight:600}
.dpy-4{font-size:clamp(19px,2.1vw,26px);line-height:1.2;letter-spacing:-0.015em;font-weight:600}
.lead{font-size:clamp(16.5px,1.35vw,21px);line-height:1.55;color:var(--ink-soft);font-weight:400;letter-spacing:-0.005em}
.lead.on-dark{color:var(--dark-paper)}
.serif{font-family:var(--font-serif);font-style:italic;font-weight:400;letter-spacing:-0.005em}
.eyebrow{font-family:var(--font-mono);font-size:11px;text-transform:uppercase;letter-spacing:0.16em;font-weight:500;color:var(--mid)}
.eyebrow .accent-dot{display:inline-block;width:6px;height:6px;background:var(--accent);margin-right:10px;vertical-align:1px}
a{color:inherit;text-decoration:none}
.link-line{position:relative;padding-bottom:1px;border-bottom:1px solid currentColor;transition:opacity .2s}
.link-line:hover{opacity:.6}
.wrap{max-width:var(--max);margin:0 auto;padding:0 var(--gutter);position:relative}
.section{position:relative;padding:clamp(64px,9vh,110px) 0}
.section-dark{background:var(--dark);color:var(--dark-paper)}
.section-dark h1,.section-dark h2,.section-dark h3,.section-dark h4{color:var(--dark-paper)}
.section-soft{background:var(--bg-soft)}
.smark{display:flex;align-items:baseline;gap:14px;font-family:var(--font-mono);font-size:11px;text-transform:uppercase;letter-spacing:0.16em;color:var(--mid);margin-bottom:clamp(34px,4.5vh,54px)}
.section-dark .smark{color:rgba(247,244,237,0.55)}
.smark .num{color:var(--accent);font-weight:600}
.section-dark .smark .num{color:var(--accent-bright)}
.smark .dash{flex:0 0 32px;height:1px;background:currentColor;opacity:.5}
.nav{position:sticky;top:0;z-index:100;background:rgba(250,250,247,0.92);backdrop-filter:blur(20px) saturate(150%);-webkit-backdrop-filter:blur(20px) saturate(150%);border-bottom:1px solid var(--line)}
.nav-inner{display:flex;align-items:center;justify-content:space-between;padding:18px var(--gutter);max-width:var(--max);margin:0 auto;gap:32px}
.logo{display:flex;align-items:center;gap:12px;font-family:var(--font-display);font-size:18px;font-weight:600;letter-spacing:-0.018em;color:var(--ink)}
.logo-mark{display:inline-flex;width:26px;height:26px;border:1.5px solid var(--ink);border-radius:5px;align-items:center;justify-content:center;position:relative}
.logo-mark::before{content:"";position:absolute;top:5px;right:5px;width:6px;height:6px;background:var(--accent);border-radius:50%}
.logo .sub{font-family:var(--font-mono);font-size:10px;text-transform:uppercase;letter-spacing:0.18em;color:var(--mid);font-weight:500;margin-left:4px}
.nav-links{display:flex;gap:clamp(20px,2.2vw,32px);font-size:14px;font-weight:500;color:var(--ink-soft);letter-spacing:-0.005em}
.nav-links a{position:relative;padding:6px 0;transition:color .18s}
.nav-links a:hover{color:var(--accent)}
.nav-links a.active{color:var(--accent-soft)}

@media (max-width:1240px){.nav-links{gap:14px;font-size:13.5px}}
@media (max-width:1140px){.nav-links{gap:9px;font-size:12.5px}}
@media (max-width:1040px){.nav-links{display:none}}
.nav-burger{display:none;width:38px;height:38px;flex:0 0 auto;border:1px solid var(--line-strong);background:none;cursor:pointer;position:relative;padding:0}
.nav-burger span{display:block;width:16px;height:1.5px;background:var(--ink);position:absolute;left:50%;transform:translateX(-50%);transition:transform .22s ease,opacity .16s ease,top .22s ease}
.nav-burger span:nth-child(1){top:13px}
.nav-burger span:nth-child(2){top:18px}
.nav-burger span:nth-child(3){top:23px}
body.menu-open .nav-burger span:nth-child(1){top:18px;transform:translateX(-50%) rotate(45deg)}
body.menu-open .nav-burger span:nth-child(2){opacity:0}
body.menu-open .nav-burger span:nth-child(3){top:18px;transform:translateX(-50%) rotate(-45deg)}
.mobile-menu{display:none;position:fixed;inset:0;z-index:90;background:var(--bg);overflow-y:auto;-webkit-overflow-scrolling:touch;padding:96px var(--gutter) 44px;flex-direction:column}
body.menu-open .mobile-menu{display:flex}
body.menu-open{overflow:hidden}
.mobile-menu .mm-eyebrow{font-family:var(--font-mono);font-size:10px;text-transform:uppercase;letter-spacing:0.16em;color:var(--mid);padding-bottom:10px;border-bottom:1px solid var(--line-strong)}
.mobile-menu .mm-link{display:flex;align-items:baseline;gap:16px;padding:17px 2px;border-bottom:1px solid var(--line);font-family:var(--font-display);font-size:23px;font-weight:500;letter-spacing:-0.015em;color:var(--ink)}
.mobile-menu .mm-num{font-family:var(--font-mono);font-size:10px;letter-spacing:0.14em;color:var(--mid)}
.mobile-menu .mm-link.active .mm-lab{color:var(--accent-soft)}
.mobile-menu .mm-cta{margin-top:30px;align-self:flex-start;padding:12px 22px;font-size:13px}
@media (max-width:1040px){.nav-burger{display:block}}
@media (max-width:640px){.nav .btn-ghost{display:none}}
@media (min-width:1041px){body.menu-open .mobile-menu{display:none}body.menu-open{overflow:auto}}
.btn{display:inline-flex;align-items:center;gap:8px;padding:11px 18px;background:var(--ink);color:var(--bg);font-family:var(--font-display);font-size:13px;font-weight:600;letter-spacing:-0.005em;border:0;cursor:pointer;white-space:nowrap;transition:background .18s ease,transform .18s ease}
.nav-cta{display:flex;align-items:center;gap:12px}
.nav .btn{padding:8px 15px;font-size:12px}
.nav .btn-ghost{padding:7px 14px}
@media (max-width:400px){.nav-inner{gap:9px}.nav-cta{gap:7px}.nav .btn{padding:7px 11px;font-size:11.5px}}
.btn:hover{background:var(--accent)}
.btn .arr{transition:transform .18s ease;font-weight:400}
.btn:hover .arr{transform:translateX(3px)}
.btn-ghost{background:transparent;color:var(--ink);border:1px solid var(--line-strong);padding:10px 17px}
.btn-ghost:hover{background:var(--ink);color:var(--bg);border-color:var(--ink)}
.btn-light{background:var(--dark-paper);color:var(--ink)}
.btn-light:hover{background:var(--accent);color:var(--bg)}
.btn-dark-ghost{background:transparent;color:var(--dark-paper);border:1px solid var(--line-dark-strong);padding:10px 17px}
.btn-dark-ghost:hover{background:var(--dark-paper);color:var(--ink);border-color:var(--dark-paper)}
@media (max-width:520px){.nav-inner{gap:14px;padding:14px var(--gutter)}.logo .sub{display:none}.btn{padding:9px 14px;font-size:12px}}
.lang-picker{display:inline-flex;align-items:center;gap:7px;background:none;border:1px solid var(--line-strong);padding:8px 11px;cursor:pointer;font-family:var(--font-mono);font-size:11px;letter-spacing:0.1em;color:var(--ink);position:relative}
.lang-picker:hover{border-color:var(--ink)}
.lang-picker svg{width:13px;height:13px}
.lang-menu{position:absolute;top:calc(100% + 8px);right:0;background:var(--bg);border:1px solid var(--line-strong);min-width:170px;z-index:120;box-shadow:0 16px 40px -18px rgba(19,24,32,0.28);padding:6px}
.lang-menu[hidden]{display:none}
.lang-option{display:flex;align-items:center;justify-content:space-between;gap:14px;width:100%;background:none;border:0;text-align:left;padding:9px 10px;font-family:var(--font-body);font-size:13px;color:var(--ink-soft);cursor:pointer}
.lang-option:hover{background:var(--bg-soft)}
.lang-option .native{color:var(--mid);font-size:12px}
.lang-option .check{width:11px;height:11px;stroke:var(--accent);fill:none;stroke-width:2;opacity:0}
.lang-option.active .check{opacity:1}
.lang-wrap{position:relative}
/* småskjerm: nav-cta må få plass med «Be om tilbud» (sist i kaskaden med vilje) */
@media (max-width:430px){
  .nav-inner{gap:8px;padding:14px var(--gutter)}
  .nav-cta{gap:7px}
  .lang-picker{padding:6px 8px;gap:5px}
  .lang-picker svg:last-child{display:none}
  .nav .btn{padding:7px 10px;font-size:11.5px}
  .nav .btn .arr{display:none}
}
/* hero for undersidene */
.p-hero{padding:clamp(40px,7vh,84px) 0 clamp(36px,6vh,64px);border-bottom:1px solid var(--line)}
.p-hero-grid{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(300px,0.9fr);gap:clamp(36px,5vw,90px);align-items:start}
@media (max-width:1000px){.p-hero-grid{grid-template-columns:1fr}}
.p-hero h1{margin-top:18px;text-wrap:balance}
.p-hero .lead{margin-top:24px;max-width:56ch}
.p-hero-actions{display:flex;gap:12px;flex-wrap:wrap;margin-top:32px}
.p-side{display:flex;flex-direction:column}
.p-side .row{padding:15px 0;border-top:1px solid var(--line);display:flex;justify-content:space-between;gap:16px;align-items:baseline}
.p-side .row:first-child{border-top:1px solid var(--ink)}
.p-side .row .k{font-family:var(--font-mono);font-size:11px;text-transform:uppercase;letter-spacing:0.16em;color:var(--mid)}
.p-side .row .v{font-family:var(--font-display);font-size:14px;font-weight:600;color:var(--ink);letter-spacing:-0.01em;text-align:right;max-width:26ch}
/* kortgrid (hairline-rutenett) */
.cardgrid{display:grid;gap:1px;background:var(--line-strong);border:1px solid var(--line-strong)}
.cardgrid.c2{grid-template-columns:repeat(2,1fr)}
.cardgrid.c3{grid-template-columns:repeat(3,1fr)}
@media (max-width:980px){.cardgrid.c3{grid-template-columns:repeat(2,1fr)}}
@media (max-width:700px){.cardgrid.c2,.cardgrid.c3{grid-template-columns:1fr}}
.card{background:var(--bg);padding:clamp(24px,3vw,36px);display:flex;flex-direction:column;min-height:200px;transition:background .18s ease;position:relative}
.card:hover{background:var(--bg-soft)}
.section-soft .card{background:var(--bg-soft)}
.section-soft .card:hover{background:var(--bg)}
.card .head{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:18px;font-family:var(--font-mono);font-size:11px;text-transform:uppercase;letter-spacing:0.16em;color:var(--accent);font-weight:600}
.card .head .topic{color:var(--mid)}
.card h3{margin-bottom:12px;font-size:clamp(19px,2vw,25px)}
.card p{margin:0;color:var(--ink-soft);font-size:15px;line-height:1.55;flex-grow:1;max-width:56ch}
.card .foot{margin-top:20px;padding-top:16px;border-top:1px solid var(--line);display:flex;justify-content:space-between;align-items:baseline;font-family:var(--font-mono);font-size:11px;text-transform:uppercase;letter-spacing:0.14em;color:var(--mid)}
.card .foot .v{font-family:var(--font-display);font-weight:600;color:var(--ink);font-size:13px;letter-spacing:-0.005em;text-transform:none}
a.card .foot .go{color:var(--accent);font-weight:600}
/* liste-rader (leveranser) */
.dlist{list-style:none;margin:0;padding:0;border-top:1px solid var(--ink)}
.dlist li{display:grid;grid-template-columns:clamp(40px,4vw,56px) 1fr;gap:clamp(16px,2.5vw,40px);padding:clamp(18px,2.6vh,26px) 0;border-bottom:1px solid var(--line);align-items:baseline}
.dlist .n{font-family:var(--font-mono);font-size:11px;letter-spacing:0.14em;color:var(--accent);font-weight:600}
.dlist .t{font-family:var(--font-display);font-size:clamp(17px,1.8vw,21px);font-weight:600;letter-spacing:-0.012em;color:var(--ink)}
.dlist .d{margin-top:6px;color:var(--ink-soft);font-size:15px;line-height:1.55;max-width:66ch}
/* fase-rad */
.phases{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:var(--line-strong);border:1px solid var(--line-strong)}
@media (max-width:900px){.phases{grid-template-columns:repeat(2,1fr)}}
@media (max-width:540px){.phases{grid-template-columns:1fr}}
.phase{background:var(--bg);padding:22px 20px 24px;min-height:150px}
.section-soft .phase{background:var(--bg-soft)}
.phase .ix{font-family:var(--font-mono);font-size:10.5px;text-transform:uppercase;letter-spacing:0.18em;color:var(--accent);font-weight:600;margin-bottom:8px}
.phase .nm{font-family:var(--font-display);font-size:17px;font-weight:600;letter-spacing:-0.012em;color:var(--ink);margin-bottom:8px;line-height:1.15}
.phase .ds{font-size:13.5px;color:var(--ink-soft);line-height:1.5}
/* stille sitat/garanti-strip */
.quiet-strip{border-top:1px solid var(--line);border-bottom:1px solid var(--line);background:var(--bg-soft);padding:clamp(32px,5vh,48px) 0}
.quiet-strip .inner{display:grid;grid-template-columns:auto 1fr;gap:clamp(20px,3vw,44px);align-items:start;max-width:980px}
@media (max-width:700px){.quiet-strip .inner{grid-template-columns:1fr}}
.quiet-strip .mark{font-family:var(--font-mono);font-size:11px;text-transform:uppercase;letter-spacing:0.16em;color:var(--accent);font-weight:600;padding-top:4px;white-space:nowrap}
.quiet-strip p{margin:0;font-size:clamp(16px,1.5vw,19px);line-height:1.6;color:var(--ink-soft);max-width:72ch}
/* kryss-lenkekort */
.crosslink{display:grid;grid-template-columns:1fr auto;gap:24px;align-items:center;border:1px solid var(--line-strong);background:var(--bg);padding:clamp(24px,3vw,36px)}
@media (max-width:700px){.crosslink{grid-template-columns:1fr}}
.crosslink h3{font-size:clamp(18px,1.9vw,23px);margin-bottom:8px}
.crosslink p{margin:0;color:var(--ink-soft);font-size:15px;line-height:1.55;max-width:64ch}
/* gratis-produkt-stripe (BIM Viewer) */
.free-strip{border:1px solid var(--line-strong);background:var(--bg);padding:clamp(26px,3.4vw,42px);display:grid;grid-template-columns:minmax(0,1.4fr) auto;gap:clamp(24px,3vw,56px);align-items:center}
@media (max-width:880px){.free-strip{grid-template-columns:1fr}}
.free-strip .fs-badge{display:inline-block;font-family:var(--font-mono);font-size:10.5px;text-transform:uppercase;letter-spacing:0.16em;font-weight:600;color:var(--bg);background:var(--accent);padding:4px 10px;margin-bottom:14px}
.free-strip h3{font-size:clamp(19px,2.1vw,26px);margin-bottom:10px}
.free-strip p{margin:0;color:var(--ink-soft);font-size:15px;line-height:1.6;max-width:66ch}
.free-strip .fs-actions{display:flex;gap:12px;flex-wrap:wrap}
/* CTA */
.cta-grid{display:grid;grid-template-columns:1.2fr 1fr;gap:clamp(40px,5vw,96px);align-items:end}
@media (max-width:900px){.cta-grid{grid-template-columns:1fr}}
.cta-side .row{display:flex;justify-content:space-between;padding:16px 0;border-top:1px solid var(--line);align-items:baseline;font-family:var(--font-mono);font-size:13px}
.cta-side .row:first-child{border-top:1px solid var(--ink)}
.cta-side .row .k{color:var(--mid);text-transform:uppercase;letter-spacing:0.14em;font-size:11px}
.cta-side .row .v{color:var(--ink);font-weight:500;letter-spacing:-0.005em;text-align:right}
.cta-actions{display:flex;gap:12px;flex-wrap:wrap;margin-top:40px}
/* footer */
footer{background:var(--bg-soft);padding:64px 0 28px;color:var(--ink-soft);border-top:1px solid var(--line)}
.footer-top{display:grid;grid-template-columns:1.4fr 1fr 1fr 1fr;gap:48px;padding-bottom:56px;border-bottom:1px solid var(--line)}
@media (max-width:800px){.footer-top{grid-template-columns:1fr 1fr;gap:32px}}
@media (max-width:480px){.footer-top{grid-template-columns:1fr;gap:32px}}
.f-brand{font-family:var(--font-display);font-size:22px;font-weight:600;letter-spacing:-0.018em;color:var(--ink);margin-bottom:14px;display:flex;align-items:center;gap:10px}
.f-brand .lm{width:24px;height:24px;border:1.5px solid var(--ink);border-radius:5px;position:relative}
.f-brand .lm::before{content:"";position:absolute;top:4px;right:4px;width:6px;height:6px;background:var(--accent);border-radius:50%}
.f-tag{font-size:14px;line-height:1.6;color:var(--mid);max-width:36ch}
.f-col h5{color:var(--ink);font-family:var(--font-mono);font-size:11px;text-transform:uppercase;letter-spacing:0.16em;font-weight:600;margin-bottom:18px}
.f-col ul{list-style:none;margin:0;padding:0}
.f-col li{padding:5px 0;font-size:14px;line-height:1.5}
.f-col a:hover{color:var(--accent)}
.footer-bot{padding-top:24px;display:flex;justify-content:space-between;flex-wrap:wrap;gap:16px;font-family:var(--font-mono);font-size:11px;text-transform:uppercase;letter-spacing:0.16em;color:var(--mid)}
.footer-legal{flex-basis:100%;margin-top:8px;text-transform:none;letter-spacing:0.04em;opacity:.7;font-size:11px}
/* reveal */
.rv{opacity:0;transform:translateY(20px);transition:opacity .6s ease,transform .6s ease}
.rv.in{opacity:1;transform:none}
@media (prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}.rv{opacity:1;transform:none}}
"""

LANG_MENU = """<div class="lang-wrap">
<button class="lang-picker" id="langPicker" aria-haspopup="true" aria-expanded="false" aria-label="Velg språk" data-i18n-attr-aria-label="lang.selectLabel">
<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.2" aria-hidden="true"><circle cx="8" cy="8" r="6.4"/><path d="M1.6 8h12.8M8 1.6c1.8 1.7 2.8 4 2.8 6.4S9.8 12.7 8 14.4C6.2 12.7 5.2 10.4 5.2 8S6.2 3.3 8 1.6Z"/></svg>
<span class="lang-code">NO</span>
<svg viewBox="0 0 10 6" width="9" height="6" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M1 1l4 4 4-4"/></svg>
</button>
<div class="lang-menu" id="langMenu" role="menu" hidden>
<button class="lang-option" data-lang="en" role="menuitem">English<span class="native">English</span><svg class="check" viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 6.5l2.5 2.5L9.5 3" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
<button class="lang-option" data-lang="de" role="menuitem">German<span class="native">Deutsch</span><svg class="check" viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 6.5l2.5 2.5L9.5 3" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
<button class="lang-option" data-lang="sv" role="menuitem">Swedish<span class="native">Svenska</span><svg class="check" viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 6.5l2.5 2.5L9.5 3" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
<button class="lang-option active" data-lang="no" role="menuitem">Norwegian<span class="native">Norsk</span><svg class="check" viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 6.5l2.5 2.5L9.5 3" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
<button class="lang-option" data-lang="fi" role="menuitem">Finnish<span class="native">Suomi</span><svg class="check" viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 6.5l2.5 2.5L9.5 3" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
<button class="lang-option" data-lang="da" role="menuitem">Danish<span class="native">Dansk</span><svg class="check" viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 6.5l2.5 2.5L9.5 3" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
</div>
</div>"""


def nav_links(active: str) -> str:
    items = [
        ("/tjenester.html", "nav.services", "Tjenester", "tjenester"),
        ("/software.html", "nav.software", "Software", "software"),
        ("/referanser.html", "nav.references", "Referanser", "referanser"),
        ("/slik-jobber-vi.html", "nav.method", "Slik jobber vi", "metode"),
        ("/about.html", "nav.aboutBuiltly", "Om Builtly", "om"),
        ("/contact.html", "nav.contact", "Kontakt", "kontakt"),
    ]
    out = []
    for href, key, label, slug in items:
        cls = ' class="active"' if slug == active else ""
        out.append(f'<a href="{href}"{cls} data-i18n="{key}">{label}</a>')
    return "\n".join(out)


def nav_block(active: str) -> str:
    return f"""<nav class="nav">
<div class="nav-inner">
<a href="/" class="logo"><span class="logo-mark"></span>Builtly<span class="sub">Engineering</span></a>
<div class="nav-links">
{nav_links(active)}
</div>
<div class="nav-cta">
{LANG_MENU}
<a href="https://portal.builtly.ai" class="btn"><span data-i18n="nav.openPortal">Åpne portalen</span> <span class="arr">→</span></a>
<button class="nav-burger" id="navBurger" type="button" aria-label="Meny" aria-expanded="false" aria-controls="mobileMenu"><span></span><span></span><span></span></button>
</div>
</div>
</nav>
<div class="mobile-menu" id="mobileMenu" hidden>
<div class="mm-eyebrow">Builtly · Meny</div>
<nav class="mm-links" aria-label="Mobilnavigasjon"></nav>
<a href="https://portal.builtly.ai" class="btn mm-cta"><span data-i18n="nav.openPortal">Åpne portalen</span> <span class="arr">→</span></a>
<a href="/bli-kunde.html" class="btn btn-ghost mm-cta" style="margin-top:10px"><span data-i18n="nav.quote">Be om tilbud</span></a>
</div>
<script>
(function(){{
  var burger=document.getElementById('navBurger'),menu=document.getElementById('mobileMenu');
  if(!burger||!menu)return;
  var links=document.querySelectorAll('.nav-links a'),mm=menu.querySelector('.mm-links');
  links.forEach(function(a,i){{
    var c=document.createElement('a');c.href=a.getAttribute('href');c.className='mm-link'+(a.classList.contains('active')?' active':'');
    var num=document.createElement('span');num.className='mm-num';num.textContent=(i+1<10?'0':'')+(i+1);
    var lab=document.createElement('span');lab.className='mm-lab';lab.textContent=a.textContent;
    var k=a.getAttribute('data-i18n');if(k)lab.setAttribute('data-i18n',k);
    c.appendChild(num);c.appendChild(lab);mm.appendChild(c);
  }});
  function close(){{document.body.classList.remove('menu-open');menu.hidden=true;burger.setAttribute('aria-expanded','false')}}
  burger.addEventListener('click',function(){{
    var open=document.body.classList.toggle('menu-open');
    menu.hidden=!open;burger.setAttribute('aria-expanded',open?'true':'false');
  }});
  menu.addEventListener('click',function(e){{if(e.target.closest('a'))close()}});
  document.addEventListener('keydown',function(e){{if(e.key==='Escape')close()}});
  window.addEventListener('resize',function(){{if(window.innerWidth>1040)close()}});
}})();
</script>"""


FOOTER = """<footer>
<div class="wrap">
<div class="footer-top">
<div>
<div class="f-brand"><span class="lm"></span>Builtly</div>
<div class="f-tag" data-i18n="f2.tag">Rådgivende ingeniører og egenutviklet software for bygg, anlegg og eiendom.</div>
</div>
<div class="f-col">
<h5 data-i18n="f2.services.h">Tjenester</h5>
<ul>
<li><a href="/tjenester/geoteknikk.html" data-i18n="f2.services.geo">Geoteknikk</a></li>
<li><a href="/tjenester/konstruksjon.html" data-i18n="f2.services.str">Konstruksjon</a></li>
<li><a href="/tjenester/brannsikkerhet.html" data-i18n="f2.services.fire">Brannsikkerhet</a></li>
<li><a href="/tjenester/akustikk.html" data-i18n="f2.services.aco">Akustikk</a></li>
<li><a href="/tjenester/miljo.html" data-i18n="f2.services.env">Miljø og bærekraft</a></li>
<li><a href="/tjenester.html" data-i18n="f2.services.all">Alle tjenester →</a></li>
</ul>
</div>
<div class="f-col">
<h5 data-i18n="f2.software.h">Software</h5>
<ul>
<li><a href="/software.html" data-i18n="f2.software.overview">Softwareområdet</a></li>
<li><a href="/maps.html" data-i18n="f2.software.maps">Builtly Maps</a></li>
<li><a href="/bim-viewer.html" data-i18n="f2.software.bim">BIM Viewer</a></li>
<li><a href="/platform.html" data-i18n="f2.software.platform">Plattformen</a></li>
<li><a href="/verktoy.html" data-i18n="f2.software.tools">Verktøykassen</a></li>
<li><a href="https://portal.builtly.ai" data-i18n="f2.software.portal">Logg inn i portalen</a></li>
</ul>
</div>
<div class="f-col">
<h5 data-i18n="f2.company.h">Selskapet</h5>
<ul>
<li><a href="/about.html" data-i18n="f2.company.about">Om Builtly</a></li>
<li><a href="/slik-jobber-vi.html" data-i18n="f2.company.method">Slik jobber vi</a></li>
<li><a href="/referanser.html" data-i18n="f2.company.references">Referanser</a></li>
<li><a href="/careers.html" data-i18n="f2.company.careers">Karriere</a></li>
<li><a href="/contact.html" data-i18n="f2.company.contact">Kontakt</a></li>
<li><a href="/trust.html" data-i18n="f2.company.trust">Trust &amp; sikkerhet</a></li>
</ul>
</div>
</div>
<div class="footer-bot fbot2">
<style>
.fbot2{display:grid !important;grid-template-columns:1fr auto 1fr;gap:14px 24px;align-items:baseline}
.fbot2 .fb-mid{text-align:center;color:var(--ink,#131820);opacity:.8}
.fbot2 .fb-right{justify-self:end;opacity:.45;font-size:10px;letter-spacing:0.16em;text-transform:uppercase}
.fbot2 .fb-legal{grid-column:1 / -1;margin-top:6px;padding-top:16px;border-top:1px solid rgba(19,24,32,.07);display:grid;grid-template-columns:1fr auto;gap:8px 24px}
.fbot2 .fb-legal .footer-legal:last-child{text-align:right}
@media (max-width:760px){
.fbot2{grid-template-columns:1fr;text-align:center;gap:10px}
.fbot2 .fb-right{justify-self:center}
.fbot2 .fb-legal{grid-template-columns:1fr}
.fbot2 .fb-legal .footer-legal:last-child{text-align:center}
}
</style>
<span data-i18n="f2.bot.left">© 2026 Builtly Engineering</span>
<span class="fb-mid" data-i18n="f2.bot.right">Fremtidens ingeniørselskap. Allerede her.</span>
<a class="fb-right" href="/intern" title="Intern portal — styret og ansatte">Intern&nbsp;→</a>
<div class="fb-legal">
<span class="footer-legal">Builtly Engineering AS · Org.nr 837 694 892 · Bassengbakken 4, 7042 Trondheim</span>
<span class="footer-legal"><a href="/privacy">Personvern</a> · <a href="/terms">Vilkår</a> · <a href="/cookies">Informasjonskapsler</a> · <a href="/etiske-retningslinjer.html">Etiske retningslinjer</a> · <a href="/apenhetsloven.html">Åpenhetsloven</a></span>
</div>
</div>
</div>
</footer>"""

TAIL_SCRIPTS = """<script>
(function(){
  if(!('IntersectionObserver' in window)){document.querySelectorAll('.rv').forEach(function(e){e.classList.add('in')});return}
  var obs=new IntersectionObserver(function(entries){entries.forEach(function(entry){if(entry.isIntersecting){entry.target.classList.add('in');obs.unobserve(entry.target)}})},{threshold:0.12,rootMargin:'0px 0px -60px 0px'});
  document.querySelectorAll('.rv').forEach(function(e){obs.observe(e)});
})();
document.querySelectorAll('a[href^="#"]').forEach(function(link){
  link.addEventListener('click',function(e){
    var t=document.querySelector(this.getAttribute('href'));
    if(t){e.preventDefault();var top=t.getBoundingClientRect().top+window.pageYOffset-60;window.scrollTo({top:top,behavior:'smooth'});}
  });
});
</script>
<script src="/i18n.js?v=20260817-reposisjon" defer></script>"""


def page(*, path, title, title_key, desc, desc_key, active, body, extra_css=""):
    """Sett sammen en komplett side med delt chrome."""
    return {
        "path": path,
        "html": f"""<!DOCTYPE html>
<html lang="no">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="description" data-i18n-attr-content="{desc_key}" content="{_html.escape(desc, quote=True)}" />
<meta name="theme-color" content="#FAFAF7" />
<title data-i18n="{title_key}">{_html.escape(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@300..800&family=Newsreader:ital,opsz,wght@0,6..72,300..700;1,6..72,300..700&family=JetBrains+Mono:wght@400..600&display=swap" rel="stylesheet" />
<style>
{CSS_CORE}
{extra_css}
</style>
</head>
<body>
{nav_block(active)}
{body}
{FOOTER}
{TAIL_SCRIPTS}
</body>
</html>
""",
    }


# ============================================================================
# i18n — nøkkelregister. NO er kildespråket; EN obligatorisk; sv/da/fi/de for
# nav/footer/fellesnøkler. Samles og skrives som spleise-fragment.
# ============================================================================

I18N = {"en": {}, "no": {}, "sv": {}, "da": {}, "fi": {}, "de": {}}


def t(key, no, en, sv=None, da=None, fi=None, de=None):
    I18N["no"][key] = no
    I18N["en"][key] = en
    if sv: I18N["sv"][key] = sv
    if da: I18N["da"][key] = da
    if fi: I18N["fi"][key] = fi
    if de: I18N["de"][key] = de
    return key


# --- nav + footer (alle 6 språk) --------------------------------------------
t("nav.services", "Tjenester", "Services", "Tjänster", "Ydelser", "Palvelut", "Leistungen")
t("nav.software", "Software", "Software", "Software", "Software", "Ohjelmistot", "Software")
t("nav.references", "Referanser", "References", "Referenser", "Referencer", "Referenssit", "Referenzen")
t("nav.method", "Slik jobber vi", "How we work", "Så arbetar vi", "Sådan arbejder vi", "Näin työskentelemme", "So arbeiten wir")
t("nav.aboutBuiltly", "Om Builtly", "About Builtly", "Om Builtly", "Om Builtly", "Tietoa Builtlysta", "Über Builtly")
t("nav.contact", "Kontakt", "Contact", "Kontakt", "Kontakt", "Yhteystiedot", "Kontakt")
t("nav.quote", "Be om tilbud", "Request a quote", "Begär offert", "Anmod om tilbud", "Pyydä tarjous", "Angebot anfordern")
t("nav.login", "Logg inn", "Log in", "Logga in", "Log ind", "Kirjaudu", "Anmelden")

t("f2.tag", "Rådgivende ingeniører og egenutviklet software for bygg, anlegg og eiendom.",
  "Consulting engineers and proprietary software for construction and real estate.",
  "Konsulterande ingenjörer och egenutvecklad mjukvara för bygg och fastighet.",
  "Rådgivende ingeniører og egenudviklet software til byggeri og ejendom.",
  "Konsultoivia insinöörejä ja omaa ohjelmistoa rakentamiseen ja kiinteistöihin.",
  "Beratende Ingenieure und eigene Software für Bau und Immobilien.")
t("f2.services.h", "Tjenester", "Services", "Tjänster", "Ydelser", "Palvelut", "Leistungen")
t("f2.services.geo", "Geoteknikk", "Geotechnics", "Geoteknik", "Geoteknik", "Geotekniikka", "Geotechnik")
t("f2.services.str", "Konstruksjon", "Structural engineering", "Konstruktion", "Konstruktion", "Rakennetekniikka", "Tragwerksplanung")
t("f2.services.fire", "Brannsikkerhet", "Fire safety", "Brandsäkerhet", "Brandsikkerhed", "Paloturvallisuus", "Brandschutz")
t("f2.services.aco", "Akustikk", "Acoustics", "Akustik", "Akustik", "Akustiikka", "Akustik")
t("f2.services.env", "Miljø og bærekraft", "Environment & sustainability", "Miljö och hållbarhet", "Miljø og bæredygtighed", "Ympäristö ja kestävyys", "Umwelt & Nachhaltigkeit")
t("f2.services.all", "Alle tjenester →", "All services →", "Alla tjänster →", "Alle ydelser →", "Kaikki palvelut →", "Alle Leistungen →")
t("f2.software.h", "Software", "Software", "Software", "Software", "Ohjelmistot", "Software")
t("f2.software.overview", "Softwareområdet", "Software overview", "Mjukvaruområdet", "Softwareområdet", "Ohjelmistoalue", "Software-Bereich")
t("f2.software.maps", "Builtly Maps", "Builtly Maps")
t("f2.software.bim", "BIM Viewer", "BIM Viewer")
t("f2.software.platform", "Plattformen", "The platform", "Plattformen", "Platformen", "Alusta", "Die Plattform")
t("f2.software.tools", "Verktøykassen", "The toolbox", "Verktygslådan", "Værktøjskassen", "Työkalupakki", "Der Werkzeugkasten")
t("f2.software.portal", "Logg inn i portalen", "Log in to the portal", "Logga in i portalen", "Log ind i portalen", "Kirjaudu portaaliin", "Im Portal anmelden")
t("f2.company.h", "Selskapet", "Company", "Företaget", "Virksomheden", "Yritys", "Unternehmen")
t("f2.company.about", "Om Builtly", "About Builtly", "Om Builtly", "Om Builtly", "Tietoa Builtlysta", "Über Builtly")
t("f2.company.method", "Slik jobber vi", "How we work", "Så arbetar vi", "Sådan arbejder vi", "Näin työskentelemme", "So arbeiten wir")
t("f2.company.references", "Referanser", "References", "Referenser", "Referencer", "Referenssit", "Referenzen")
t("f2.company.careers", "Karriere", "Careers", "Karriär", "Karriere", "Ura", "Karriere")
t("f2.company.contact", "Kontakt", "Contact", "Kontakt", "Kontakt", "Yhteystiedot", "Kontakt")
t("f2.company.trust", "Trust & sikkerhet", "Trust & security", "Trust & säkerhet", "Trust & sikkerhed", "Luottamus & turvallisuus", "Trust & Sicherheit")
t("f2.bot.left", "© 2026 Builtly Engineering", "© 2026 Builtly Engineering")
t("f2.bot.right", "Fremtidens ingeniørselskap. Allerede her.", "The engineering company of the future. Already here.",
  "Framtidens ingenjörsföretag. Redan här.", "Fremtidens ingeniørvirksomhed. Allerede her.",
  "Tulevaisuuden insinööritoimisto. Jo täällä.", "Das Ingenieurunternehmen der Zukunft. Schon hier.")


# --- forsiden (index.html — redigert for hånd, nøklene bor her) -------------
t("home2.title", "Builtly · Rådgivende ingeniører og egen software", "Builtly · Consulting engineers with our own software")
t("home2.desc",
  "Builtly kombinerer rådgivende ingeniørtjenester og egenutviklet software. Vi leverer komplette rådgiveroppdrag innen geoteknikk, konstruksjon, brann, akustikk og miljø — og utvikler software for eiendomsbransjen.",
  "Builtly combines consulting engineering and proprietary software. We deliver complete consulting engagements in geotechnics, structures, fire, acoustics and environment — and build software for the real-estate industry.")
t("home2.eyebrow", "Fremtidens ingeniørselskap. Allerede her.", "The engineering company of the future. Already here.")
t("home2.h1", "Rådgivende ingeniører.<br/>Banebrytende teknologi.", "Consulting engineers.<br/>Groundbreaking technology.")
t("home2.lede",
  "Builtly skaper en ny standard for rådgivende ingeniørtjenester. Vi forener ledende ingeniørkompetanse med egenutviklet software som automatiserer komplekse prosesser, reduserer tidsbruken, hever kvaliteten og transformerer måten eiendomsprosjekter planlegges, prosjekteres og realiseres på.",
  "Builtly is setting a new standard for consulting engineering. We unite leading engineering expertise with proprietary software that automates complex processes, cuts time spent, raises quality and transforms how real-estate projects are planned, designed and realised.")
t("home2.cta1", "Be om tilbud på rådgivning", "Request a consulting quote")
t("home2.cta2", "Utforsk Builtly Software", "Explore Builtly Software")
t("home2.pillar1", "Rådgiveroppdrag med fagansvar", "Consulting with professional responsibility")
t("home2.pillar2", "Deeptech software", "Deep tech software")
t("home2.pillar3", "Én modell av prosjektet", "One model of the project")
t("home2.side1k", "Rådgivning", "Consulting")
t("home2.side2k", "Software", "Software")
t("home2.side2v", "15+ moduler i drift", "15+ modules in operation")
t("home2.side3k", "Leveranse", "Delivery")
t("home2.side3v", "Oppdrag · lisens · kombinasjon", "Engagement · licence · combined")
t("home2.side4k", "Kvalitet", "Quality")
t("home2.side4v", "Fagansvar + sporbarhet", "Responsibility + traceability")
t("home2.side5k", "Svar på forespørsel", "Response")
t("home2.side5v", "Innen én virkedag", "Within one business day")
t("home2.hva.label", "Hva trenger du?", "What do you need?")
t("home2.hva.tag", "Tre innganger", "Three entry points")
t("home2.hva.h2", "Hva trenger du?", "What do you need?")
t("home2.hva.c1t", "Vi trenger en rådgiver", "We need a consultant")
t("home2.hva.c1d",
  "Engasjer Builtly til et komplett rådgiveroppdrag. Våre ingeniører tar ansvar for prosjektering, leveranser, kvalitetssikring og oppfølging.",
  "Engage Builtly for a complete consulting engagement. Our engineers take responsibility for design, deliverables, quality assurance and follow-up.")
t("home2.hva.c1cta", "Se våre rådgivertjenester →", "See our consulting services →")
t("home2.hva.c2t", "Vi ønsker å bruke Builtly selv", "We want to use Builtly ourselves")
t("home2.hva.c2d",
  "Bruk én eller flere av Builtlys moduler i egen organisasjon og på egne prosjekter.",
  "Use one or more of Builtly's modules in your own organisation and on your own projects.")
t("home2.hva.c2cta", "Se all software →", "See all software →")
t("home2.hva.c3t", "Vi ønsker en kombinasjon", "We want a combination")
t("home2.hva.c3d",
  "Bruk plattformen selv, med faglig bistand, kontroll eller signering fra Builtlys rådgivere når prosjektet krever det.",
  "Use the platform yourself, with professional assistance, control or sign-off from Builtly's consultants when the project requires it.")
t("home2.hva.c3cta", "Se hvordan det fungerer →", "See how it works →")
t("home2.fag.label", "Rådgivning", "Consulting")
t("home2.fag.tag", "Builtly Engineering", "Builtly Engineering")
t("home2.fag.h2", "Våre rådgivende ingeniører.", "Our consulting engineers.")
t("home2.fag.lede",
  "Kunden kjøper en vanlig rådgiverleveranse. Builtlys ingeniører deltar i møter, prosjekterer, gjør faglige vurderinger, koordinerer, kvalitetssikrer, signerer og følger opp prosjektet — du behøver ikke kjøpe software eller endre arbeidsmåte.",
  "You buy a normal consulting delivery. Builtly's engineers attend meetings, design, make professional judgements, coordinate, quality-assure, sign and follow up the project — you do not need to buy software or change how you work.")
t("home2.fag.c1t", "Geoteknikk", "Geotechnics")
t("home2.fag.c1d", "Grunnforhold, fundamentering, stabilitet, FEM-analyser og geotekniske rapporter.",
  "Ground conditions, foundations, stability, FEM analysis and geotechnical reports.")
t("home2.fag.c2t", "Konstruksjon", "Structures")
t("home2.fag.c2d", "Bæresystemer, dimensjonering, konstruksjonssikkerhet, tegninger og beregningsgrunnlag.",
  "Load-bearing systems, structural design, drawings and calculation basis.")
t("home2.fag.c3t", "Brannsikkerhet", "Fire safety")
t("home2.fag.c3d", "Brannkonsept, rømningsstrategi, branntegninger og oppfølging gjennom prosjektet.",
  "Fire concept, escape strategy, fire drawings and follow-up through the project.")
t("home2.fag.c4t", "Akustikk", "Acoustics")
t("home2.fag.c4d", "Bygningsakustikk, romakustikk, støyberegninger og dokumentasjon.",
  "Building acoustics, room acoustics, noise calculations and documentation.")
t("home2.fag.c5t", "Miljø", "Environment")
t("home2.fag.c5d", "Forurenset grunn, miljøoppfølging, ombruk, utslipp og naturhensyn.",
  "Contaminated ground, environmental follow-up, reuse, emissions and nature.")
t("home2.fag.c6t", "Flere fagområder", "More disciplines")
t("home2.fag.c6d", "Trafikk · SHA · Teknisk due diligence · Prosjekt- og byggherrestøtte.",
  "Traffic · HSE · Technical due diligence · Project & client support.")
t("home2.fag.c6cta", "Alle tjenester →", "All services →")
t("home2.fag.se", "Se tjenesten →", "See the service →")
t("home2.fag.cta", "Be om tilbud på rådgivning", "Request a consulting quote")
t("home2.ansvar.mark", "Fagansvaret", "Professional responsibility")
t("home2.ansvar.p",
  "Builtlys ingeniører har det faglige ansvaret og leverer oppdraget. Vår banebrytende software brukes som et verktøy i prosjekteringen der den gir bedre kvalitet, sporbarhet og arbeidsflyt — vurderingene, koordineringen og signaturen er ingeniørens.",
  "Builtly's engineers hold the professional responsibility and deliver the engagement. Our groundbreaking software is used as a tool in the design work where it improves quality, traceability and workflow — the judgements, the coordination and the signature belong to the engineer.")
t("home2.sw.label", "Software", "Software")
t("home2.sw.tag", "Deeptech for bygg og eiendom", "Deep tech for construction & real estate")
t("home2.sw.h2", "Software utviklet gjennom faktiske prosjekter.", "Software developed through real projects.")
t("home2.sw.lede",
  "Builtlys software utvikles og brukes av rådgivere som selv arbeider med ordinære oppdrag. Det gjør at modulene bygger på reelle arbeidsprosesser, faglige krav og faktiske prosjektleveranser.",
  "Builtly's software is developed and used by consultants who themselves work on ordinary engagements. That means the modules are built on real work processes, professional requirements and actual project deliverables.")
t("home2.sw.c1t", "Kart og eiendomsanalyse", "Maps & property analysis")
t("home2.sw.c1d", "Builtly Maps · Mulighetsstudie · Klimarisiko · Teknisk DD", "Builtly Maps · Feasibility · Climate risk · Technical DD")
t("home2.sw.c2t", "Prosjektering og ingeniørfag", "Engineering & design")
t("home2.sw.c2d", "Geo · Konstruksjon · Brann · Akustikk · Trafikk · SHA", "Geo · Structures · Fire · Acoustics · Traffic · HSE")
t("home2.sw.c3t", "Mengder og økonomi", "Quantities & economics")
t("home2.sw.c3d", "Anbud · Mengder og scope · Areal og yield", "Tenders · Quantities & scope · Area & yield")
t("home2.sw.c4t", "Salg og marked", "Sales & marketing")
t("home2.sw.c4d", "Salgskonsoll · Prosjektnettside · Prospekt", "Sales console · Project website · Prospectus")
t("home2.sw.c5t", "Prosjekt og samhandling", "Project & collaboration")
t("home2.sw.c5d", "Prosjekthotell/CDE · BIM i nettleseren · Anbudsrom", "Project hotel/CDE · BIM in the browser · Tender rooms")
t("home2.sw.c6t", "Miljø og sertifisering", "Environment & certification")
t("home2.sw.c6d", "BREEAM-NOR · Svanemerket · EU-taksonomi", "BREEAM-NOR · Nordic Swan · EU Taxonomy")
t("home2.sw.cta", "Utforsk Builtly Software", "Explore Builtly Software")
t("home2.ref.label", "Referanser", "References")
t("home2.ref.tag", "Faktiske prosjekter", "Real projects")
t("home2.ref.h2", "Dokumentert i faktiske leveranser.", "Documented in real deliveries.")
t("home2.ref.lede",
  "Rådgiverne dokumenterer at teknologien virker i virkeligheten — og teknologien gir rådgiverne arbeidsmåter tradisjonelle miljøer ikke har. Flere kunder har bedt om at bruken ikke omtales offentlig; referanser med navn oppgis ved forespørsel.",
  "The consultants document that the technology works in reality — and the technology gives the consultants ways of working traditional firms do not have. Several customers have asked that their use remain off the public record; named references are available on request.")
t("home2.ref.cta", "Se referansene", "See the references")
t("home2.ref.r1t", "Boligprosjekt, Trondheim — 93 boenheter", "Residential project, Trondheim — 93 units")
t("home2.ref.r1m", "BIM · areal · salg", "BIM · area · sales")
t("home2.ref.r2t", "Brannkonsept, boligblokk — byggetrinn 2", "Fire concept, residential block — stage 2")
t("home2.ref.r2m", "RIBr-produksjon", "Fire engineering")
t("home2.ref.r3t", "Kystprosjekt — 153 leiligheter, samlemodell", "Coastal project — 153 apartments, federated model")
t("home2.ref.r3m", "Modell-KS", "Model QA")
t("home2.ref.r4t", "Anbudsrom — totalentreprise", "Tender room — design & build")
t("home2.ref.r4m", "Anbudsprosess", "Tender process")
t("home2.cta.label", "Kontakt", "Contact")
t("home2.cta.tag", "Rådgivning · software · kombinasjon", "Consulting · software · combined")
t("home2.cta.h2", "Builtly kan gjøre jobben for deg — eller gi deg teknologien til å gjøre den selv.",
  "Builtly can do the job for you — or give you the technology to do it yourself.")
t("home2.cta.lede",
  "Beskriv prosjektet, så svarer vi innen én virkedag — med et konkret tilbud på rådgivning, en demo av softwaren, eller begge deler.",
  "Describe the project and we respond within one business day — with a concrete consulting quote, a software demo, or both.")
t("home2.cta.b1", "Be om tilbud", "Request a quote")
t("home2.cta.b2", "Utforsk softwaren", "Explore the software")
t("home2.cta.r1k", "Rådgivning", "Consulting")
t("home2.cta.r1v", "NS 8401 / NS 8402", "NS 8401 / NS 8402")
t("home2.cta.r2k", "Software", "Software")
t("home2.cta.r2v", "Lisens per modul", "Licence per module")
t("home2.cta.r3k", "Svar på forespørsel", "Response")
t("home2.cta.r3v", "Innen én virkedag", "Within one business day")
t("home2.cta.r4k", "Portal", "Portal")
t("home2.cta.r4v", "Live for kunder", "Live for customers")

# --- reposisjonerings-OVERSTYRINGER av eksisterende nøkler ------------------
# Disse må dekke ALLE seks språk: lavere lag har egne oversettelser per språk,
# og et språk vi ikke overstyrer beholder den gamle posisjoneringen.
t("about.meta.r2.v", "Rådgivning + software", "Consulting + software",
  "Rådgivning + mjukvara", "Rådgivning + software", "Konsultointi + ohjelmistot", "Beratung + Software")
t("about.hero.lede",
  "Builtly kombinerer rådgivende ingeniørtjenester og egenutviklet software. Vi leverer komplette rådgiveroppdrag — og teknologien kan brukes direkte av kunder, samarbeidspartnere og andre rådgivermiljøer. Bak begge står samme sjeldne kombinasjon: faglig ansvar, operativ eiendomserfaring og moderne softwareutvikling.",
  "Builtly combines consulting engineering and proprietary software. We deliver complete consulting engagements — and the technology can be used directly by clients, partners and other consultancies. Behind both sits the same rare combination: professional accountability, operating experience from real estate, and modern software development.",
  "Builtly kombinerar konsulterande ingenjörstjänster och egenutvecklad mjukvara. Vi levererar kompletta konsultuppdrag — och tekniken kan användas direkt av kunder, partner och andra konsultmiljöer. Bakom båda står samma sällsynta kombination: fackligt ansvar, operativ fastighetserfarenhet och modern mjukvaruutveckling.",
  "Builtly kombinerer rådgivende ingeniørydelser og egenudviklet software. Vi leverer komplette rådgiveropgaver — og teknologien kan bruges direkte af kunder, partnere og andre rådgivermiljøer. Bag begge står samme sjældne kombination: fagligt ansvar, operativ ejendomserfaring og moderne softwareudvikling.",
  "Builtly yhdistää konsultoivat insinööripalvelut ja oman ohjelmistokehityksen. Toimitamme kokonaisia konsulttitoimeksiantoja — ja teknologiaa voivat käyttää suoraan asiakkaat, kumppanit ja muut konsulttiyhteisöt. Molempien takana on sama harvinainen yhdistelmä: ammatillinen vastuu, operatiivinen kiinteistökokemus ja moderni ohjelmistokehitys.",
  "Builtly verbindet beratende Ingenieurleistungen mit eigener Software. Wir liefern vollständige Beratungsaufträge — und die Technologie kann direkt von Kunden, Partnern und anderen Ingenieurbüros genutzt werden. Hinter beidem steht dieselbe seltene Kombination: fachliche Verantwortung, operative Immobilienerfahrung und moderne Softwareentwicklung.")
t("about.glance.lede",
  "Builtly er et rådgivende ingeniør- og deeptech-selskap for de nordiske og tyske markedene.",
  "Builtly is a consulting engineering and deep-tech company for the Nordic and German markets.",
  "Builtly är ett konsulterande ingenjörs- och deeptech-företag för de nordiska och tyska marknaderna.",
  "Builtly er en rådgivende ingeniør- og deeptech-virksomhed for de nordiske og tyske markeder.",
  "Builtly on konsultoiva insinööri- ja deeptech-yhtiö Pohjoismaiden ja Saksan markkinoille.",
  "Builtly ist ein beratendes Ingenieur- und Deep-Tech-Unternehmen für die nordischen und deutschen Märkte.")
t("industries.hero.h1",
  "Hvem softwaren er bygget for.",
  "Who the software is built for.",
  "Vem mjukvaran är byggd för.",
  "Hvem softwaren er bygget til.",
  "Kenelle ohjelmisto on rakennettu.",
  "Für wen die Software gebaut ist.")
t("industries.hero.lede",
  "Builtly Software brukes av rådgivende ingeniørselskaper, eiendomsutviklere, banker, forvaltere og offentlige aktører — som lisens, direkte kjøp eller partnerintegrasjon. Og fordi Builtly selv tar rådgiveroppdrag, er modulene bygget på reelle leveranser: beregninger, lokale regler, kvalitetssikring og signerte dokumenter.",
  "Builtly Software is used by engineering consultancies, property developers, lenders, asset managers and public-sector teams — as a licence, direct purchase or partner integration. And because Builtly takes on consulting engagements of its own, the modules are built on real deliveries: calculations, local rules, quality assurance and signed documents.",
  "Builtly Software används av konsulterande ingenjörsföretag, fastighetsutvecklare, banker, förvaltare och offentliga aktörer — som licens, direktköp eller partnerintegration. Och eftersom Builtly själv tar konsultuppdrag är modulerna byggda på verkliga leveranser: beräkningar, lokala regler, kvalitetssäkring och signerade dokument.",
  "Builtly Software bruges af rådgivende ingeniørvirksomheder, ejendomsudviklere, banker, forvaltere og offentlige aktører — som licens, direkte køb eller partnerintegration. Og fordi Builtly selv tager rådgiveropgaver, er modulerne bygget på virkelige leverancer: beregninger, lokale regler, kvalitetssikring og signerede dokumenter.",
  "Builtly Softwarea käyttävät konsultoivat insinööritoimistot, kiinteistökehittäjät, pankit, salkunhoitajat ja julkiset toimijat — lisenssinä, suorana ostona tai kumppani-integraationa. Ja koska Builtly ottaa itse konsulttitoimeksiantoja, moduulit on rakennettu todellisten toimitusten varaan: laskelmat, paikalliset säännöt, laadunvarmistus ja allekirjoitetut dokumentit.",
  "Builtly Software wird von beratenden Ingenieurbüros, Projektentwicklern, Banken, Verwaltern und öffentlichen Auftraggebern genutzt — als Lizenz, Direktkauf oder Partnerintegration. Und weil Builtly selbst Beratungsaufträge übernimmt, sind die Module auf realen Lieferungen aufgebaut: Berechnungen, lokale Regeln, Qualitätssicherung und signierte Dokumente.")

t("industries.desc",
  "Builtly Software brukes av rådgivende ingeniørselskaper, eiendomsutviklere, banker og offentlige aktører. Builtly leverer også egne rådgiveroppdrag — softwaren er bygget på reelle leveranser.",
  "Builtly Software is used by engineering consultancies, property developers, lenders and public-sector teams. Builtly also delivers consulting engagements of its own — the software is built on real deliveries.",
  "Builtly Software används av konsulterande ingenjörsföretag, fastighetsutvecklare, banker och offentliga aktörer. Builtly levererar också egna konsultuppdrag — mjukvaran är byggd på verkliga leveranser.",
  "Builtly Software bruges af rådgivende ingeniørvirksomheder, ejendomsudviklere, banker og offentlige aktører. Builtly leverer også egne rådgiveropgaver — softwaren er bygget på virkelige leverancer.",
  "Builtly Softwarea käyttävät konsultoivat insinööritoimistot, kiinteistökehittäjät, pankit ja julkiset toimijat. Builtly toimittaa myös omia konsulttitoimeksiantoja — ohjelmisto on rakennettu todellisten toimitusten varaan.",
  "Builtly Software wird von beratenden Ingenieurbüros, Projektentwicklern, Banken und öffentlichen Auftraggebern genutzt. Builtly übernimmt auch eigene Beratungsaufträge — die Software basiert auf realen Lieferungen.")

# --- about: to forretningsområder-stripen -----------------------------------
t("about2.omr1.tag", "Forretningsområde 01", "Business area 01")
t("about2.omr1.h", "Builtly Engineering", "Builtly Engineering")
t("about2.omr1.p",
  "Komplette rådgiveroppdrag innen geoteknikk, konstruksjon, brann, akustikk, miljø, trafikk, SHA og teknisk due diligence — med fagansvar, koordinering og oppfølging.",
  "Complete consulting engagements in geotechnics, structures, fire, acoustics, environment, traffic, HSE and technical due diligence — with professional responsibility, coordination and follow-up.")
t("about2.omr1.cta", "Se tjenestene →", "See the services →")
t("about2.omr2.tag", "Forretningsområde 02", "Business area 02")
t("about2.omr2.h", "Builtly Software", "Builtly Software")
t("about2.omr2.p",
  "Kart og eiendomsanalyse, ingeniørfag, økonomi, salg, samhandling og finans — moduler kunder, samarbeidspartnere og andre rådgivermiljøer bruker selv.",
  "Maps and property analysis, engineering, economics, sales, collaboration and finance — modules customers, partners and other consultancies use themselves.")
t("about2.omr2.cta", "Se softwaren →", "See the software →")
t("about2.cta_b1", "Be om tilbud", "Request a quote")

# --- trust: organisatorisk garanti (en+no; øvrige faller til en) ------------
t("trust.smark.guarantee", "Organisatorisk garanti", "Organisational guarantee")
t("trust.c20.h", "Builtly Engineering ser ikke softwarekunders prosjekter.",
  "Builtly Engineering does not see software customers' projects.")
t("trust.c20.body",
  "Builtly både selger software til rådgivermiljøer og tar egne rådgiveroppdrag. Derfor er skillet organisatorisk og absolutt: Builtly Engineering har ikke tilgang til softwarekunders prosjekter uten at kunden uttrykkelig inviterer Builtly inn i prosjektet eller bestiller en rådgivertjeneste. Softwarekunders kunder, prosjektinformasjon og bruksmønstre benyttes ikke av Builtlys rådgivningsvirksomhet til salg eller konkurrerende tilbud.",
  "Builtly both sells software to consultancies and takes on consulting engagements of its own. The separation is therefore organisational and absolute: Builtly Engineering has no access to software customers' projects unless the customer explicitly invites Builtly into the project or orders a consulting service. Software customers' clients, project information and usage patterns are not used by Builtly's consulting practice for sales or competing bids.")


# ============================================================================
# FAG-DEFINISJONER — de ni rådgivertjenestene
# ============================================================================

FAG = [
    dict(
        slug="geoteknikk", kode="RIG", pfx="tj.geo",
        navn=("Geoteknikk", "Geotechnical engineering"),
        kort=("Grunnforhold, fundamentering, stabilitet, FEM-analyser og geotekniske rapporter.",
              "Ground conditions, foundations, stability, FEM analysis and geotechnical reports."),
        lede=("Builtly tar ansvar for geoteknisk prosjektering — fra innledende vurdering av grunnforhold til geoteknisk rapport, fundamenteringskonsept og oppfølging i byggetid. Våre geoteknikere deltar i prosjekteringsmøter, gjør de faglige vurderingene og står som ansvarlig prosjekterende der det er avtalt.",
              "Builtly takes responsibility for geotechnical design — from initial assessment of ground conditions to the geotechnical report, foundation concept and follow-up during construction. Our geotechnical engineers attend design meetings, make the professional judgements and act as responsible designer where agreed."),
        regelverk="Eurokode 7 · TEK17 kap. 7/10 · NVE 1/2019",
        kontakt=("Stefan Ødegård · Head of Geotechnics", "Stefan Ødegård · Head of Geotechnics"),
        leveranser=[
            ("Geoteknisk vurdering og datarapport", "Innledende vurdering av grunnforhold for tomtekjøp og regulering, og geoteknisk datarapport som prosjekteringsgrunnlag for rammesøknad.",
             "Geotechnical assessment and factual report", "Initial assessment of ground conditions for site acquisition and zoning, and a geotechnical factual report as design basis for the building permit."),
            ("Fundamenteringskonsept", "Valg og dimensjonering av fundamenteringsløsning — direktefundamentering, peler eller kompensert fundamentering — med setningsberegninger.",
             "Foundation concept", "Selection and design of the foundation solution — shallow foundations, piles or compensated foundations — with settlement calculations."),
            ("Stabilitet og områdestabilitet", "Stabilitetsberegninger for byggegrop og skråninger, og utredning av områdestabilitet i kvikkleiresoner etter NVEs veileder 1/2019.",
             "Stability and area stability", "Stability calculations for excavations and slopes, and area-stability assessment in quick-clay zones according to NVE guideline 1/2019."),
            ("FEM-analyser og 3D-grunnmodeller", "Avanserte elementanalyser av samvirke mellom byggegrop, konstruksjon og grunn, med 3D-modeller av lagdeling og poretrykk.",
             "FEM analysis and 3D ground models", "Advanced finite-element analysis of the interaction between excavation, structure and ground, with 3D models of stratification and pore pressure."),
            ("Geoteknisk prosjektering (PRO)", "Ansvarlig prosjekterende for geoteknikk i tiltaksklasse etter kompetanse og avtale, med kontroll og myndighetsdokumentasjon.",
             "Geotechnical design responsibility", "Responsible designer for geotechnics, in the responsibility class the project requires, with control and regulatory documentation."),
            ("Oppfølging i byggetid", "Kontroll av utgraving og fundamentering på plassen, vurdering av avvik og supplerende grunnundersøkelser ved behov.",
             "Follow-up during construction", "On-site control of excavation and foundation works, assessment of deviations and supplementary ground investigations where needed."),
        ],
        faser=[
            ("Tomtekjøp", "Innledende geoteknisk vurdering før beslutning.", "Site acquisition", "Initial geotechnical assessment before the decision."),
            ("Regulering", "Områdestabilitet og premisser for planforslaget.", "Zoning", "Area stability and premises for the plan proposal."),
            ("Prosjektering", "Datarapport, fundamentering og prosjektering.", "Design", "Factual report, foundations and detailed design."),
            ("Utførelse", "Oppfølging, kontroll og avviksvurdering.", "Construction", "Follow-up, control and deviation assessment."),
        ],
    ),
    dict(
        slug="konstruksjon", kode="RIB", pfx="tj.str",
        navn=("Konstruksjon", "Structural engineering"),
        kort=("Bæresystemer, dimensjonering, konstruksjonssikkerhet, tegninger og beregningsgrunnlag.",
              "Load-bearing systems, structural design, drawings and calculation basis."),
        lede=("Builtly tar ansvar for konstruksjonsteknisk prosjektering (RIB) — bæresystem, dimensjonering etter Eurokodene, tegninger og beregningsgrunnlag. Våre ingeniører prosjekterer, koordinerer mot arkitekt og øvrige fag, kvalitetssikrer og følger prosjektet gjennom utførelsen.",
              "Builtly takes responsibility for structural design — load-bearing system, design to the Eurocodes, drawings and calculation basis. Our engineers design, coordinate with the architect and the other disciplines, quality-assure and follow the project through construction."),
        regelverk="Eurokodene NS-EN 1990–1999 + NA · TEK17 kap. 10",
        kontakt=None,
        leveranser=[
            ("Bæresystem og konsept", "Valg av bæresystem i tidligfase — spennvidder, stabilitet og føringsveier — som premiss for arkitektur og økonomi.",
             "Load-bearing system and concept", "Choice of load-bearing system in early phase — spans, stability and service routes — as a premise for architecture and economy."),
            ("Dimensjonering etter Eurokodene", "Statiske beregninger av betong-, stål- og trekonstruksjoner etter NS-EN 1990–1999 med nasjonale tillegg.",
             "Design to the Eurocodes", "Structural calculations for concrete, steel and timber structures to EN 1990–1999 with national annexes."),
            ("Beregningsrapporter og tegninger", "Sporbart beregningsgrunnlag, arbeidstegninger og armeringstegninger — levert som redigerbare fagformater (IFC, DWG/DXF, PDF).",
             "Calculation reports and drawings", "Traceable calculation basis, working drawings and reinforcement drawings — delivered in editable discipline formats (IFC, DWG/DXF, PDF)."),
            ("BIM-kontroll og samordning", "Kontroll av arkitektmodellen mot tegninger, fagmodell som IFC og avvik som BCF — modellen prosjekteres på, ikke rundt.",
             "BIM control and coordination", "Control of the architect's model against drawings, discipline model as IFC and deviations as BCF — the model is designed on, not around."),
            ("Mengder etter NS 3420", "Mengdeuttak med sporbarhet til kilde, som grunnlag for kalkyle og kontrahering.",
             "Quantities to NS 3420", "Quantity take-off with traceability to source, as basis for estimates and procurement."),
            ("Kontroll og oppfølging", "Uavhengig kontroll av prosjektering der prosjektet krever det, og oppfølging av utførelsen.",
             "Control and follow-up", "Independent design control where the project requires it, and follow-up of the construction works."),
        ],
        faser=[
            ("Tidligfase", "Bæresystem, spennvidder og kostnadsdrivere.", "Early phase", "Load-bearing system, spans and cost drivers."),
            ("Rammesøknad", "Konstruksjonsteknisk premissdokument.", "Permit", "Structural premise documentation."),
            ("Detaljprosjekt", "Dimensjonering, tegninger, mengder.", "Detailed design", "Design, drawings, quantities."),
            ("Utførelse", "Oppfølging, kontroll og as-built.", "Construction", "Follow-up, control and as-built."),
        ],
    ),
    dict(
        slug="brannsikkerhet", kode="RIBr", pfx="tj.fire",
        navn=("Brannsikkerhet", "Fire safety engineering"),
        kort=("Brannkonsept, rømningsstrategi, branntegninger og oppfølging gjennom prosjektet.",
              "Fire concept, escape strategy, fire drawings and follow-up through the project."),
        lede=("Builtly tar ansvar for brannteknisk prosjektering (RIBr) — brannkonsept etter TEK17 kapittel 11, branntegninger, rømningsstrategi og oppfølging av de utførende fagene. Våre brannrådgivere deltar i prosjekteringsgruppen, avklarer fravik og følger konseptet helt til ferdigattest.",
              "Builtly takes responsibility for fire safety engineering — fire concept according to the building regulations, fire drawings, escape strategy and follow-up of the executing disciplines. Our fire engineers take part in the design group, resolve deviations and follow the concept all the way to completion."),
        regelverk="TEK17 kap. 11 · VTEK · NS 3901/INSTA 950",
        kontakt=None,
        leveranser=[
            ("Brannkonsept", "Brannteknisk hovedgrep for tiltaket — brannklasser, risikoklasser, bæreevne, seksjonering og rømning — som premiss for alle fag.",
             "Fire concept", "The fire-safety strategy for the project — fire and risk classes, load-bearing capacity, compartmentation and escape — as a premise for every discipline."),
            ("Branntegninger", "Branncelleinndeling, rømningsveier, slokkeutstyr og dørklasser tegnet på planene med tittelfelt og symbolforklaring, klare for kontroll og bruk.",
             "Fire drawings", "Fire compartments, escape routes, extinguishing equipment and door classes drawn on the plans with title block and legend, ready for control and use."),
            ("Rømningsanalyse", "Rømningsstrategi og kapasitetsvurderinger, inkludert beregning av rømningstider der konseptet krever analyse.",
             "Escape analysis", "Escape strategy and capacity assessments, including evacuation-time calculations where the concept requires analysis."),
            ("Fravik og analyse", "Dokumentasjon av fravik fra preaksepterte ytelser med komparativ analyse etter NS 3901.",
             "Deviations and analysis", "Documentation of deviations from pre-accepted performance with comparative analysis."),
            ("Utomhus branntegning", "Innsatsveier, oppstillingsplasser, slokkevann og hydranter dokumentert på situasjonsplanen.",
             "Site fire drawing", "Access routes for the fire service, staging areas, extinguishing water and hydrants documented on the site plan."),
            ("Oppfølging og kontroll", "Brannteknisk oppfølging i detaljprosjektering og utførelse, uavhengig kontroll der prosjektet krever det.",
             "Follow-up and control", "Fire-safety follow-up in detailed design and construction, independent control where the project requires it."),
        ],
        faser=[
            ("Rammesøknad", "Brannkonsept som premissdokument.", "Permit", "Fire concept as premise document."),
            ("Detaljprosjekt", "Branntegninger og fagavklaringer.", "Detailed design", "Fire drawings and discipline clarifications."),
            ("Utførelse", "Oppfølging av utførende fag.", "Construction", "Follow-up of the executing trades."),
            ("Ferdigattest", "Kontroll og sluttdokumentasjon.", "Completion", "Control and final documentation."),
        ],
    ),
    dict(
        slug="akustikk", kode="RIAku", pfx="tj.aco",
        navn=("Akustikk", "Acoustics"),
        kort=("Bygningsakustikk, romakustikk, støyberegninger og dokumentasjon.",
              "Building acoustics, room acoustics, noise calculations and documentation."),
        lede=("Builtly tar ansvar for akustisk prosjektering (RIAku) — lydtekniske premisser etter NS 8175, utendørs støyutredning, bygningsakustikk og romakustikk. Våre rådgivere setter kravene tidlig, følger dem gjennom detaljeringen og dokumenterer at bygget leverer.",
              "Builtly takes responsibility for acoustic design — acoustic premises according to NS 8175, external noise assessment, building acoustics and room acoustics. Our consultants set the requirements early, follow them through detailing and document that the building delivers."),
        regelverk="NS 8175 · T-1442 · TEK17 § 13-6",
        kontakt=None,
        leveranser=[
            ("Lydteknisk premissdokument", "Krav til luftlyd, trinnlyd, etterklang og teknisk støy for alle romtyper — premisset de andre fagene prosjekterer mot.",
             "Acoustic premise document", "Requirements for airborne and impact sound, reverberation and technical noise for every room type — the premise the other disciplines design against."),
            ("Utendørs støyutredning", "Støyberegninger mot T-1442 og NS 8175 for regulering og rammesøknad, med fasadetiltak og uteoppholdsvurderinger.",
             "External noise assessment", "Noise calculations for zoning and permit, with facade measures and outdoor-area assessments."),
            ("Bygningsakustikk", "Prosjektering av skillekonstruksjoner, lydfelle-detaljer og flanketransmisjon i detaljfasen.",
             "Building acoustics", "Design of separating constructions, detailing and flanking transmission in the detailed phase."),
            ("Romakustikk", "Etterklangs- og taletydelighetsberegninger for undervisningsrom, kontor og fellesarealer.",
             "Room acoustics", "Reverberation and speech-intelligibility calculations for teaching rooms, offices and common areas."),
            ("Teknisk støy", "Krav og kontroll av støy fra tekniske installasjoner, inne og mot naboer.",
             "Technical noise", "Requirements and control of noise from building services, indoors and towards neighbours."),
            ("Måling og dokumentasjon", "Kontrollmålinger og sluttdokumentasjon av at kravene er oppfylt.",
             "Measurement and documentation", "Control measurements and final documentation that the requirements are met."),
        ],
        faser=[
            ("Regulering", "Støyutredning for planforslaget.", "Zoning", "Noise assessment for the plan proposal."),
            ("Rammesøknad", "Lydteknisk premissdokument.", "Permit", "Acoustic premise document."),
            ("Detaljprosjekt", "Detaljering og fagoppfølging.", "Detailed design", "Detailing and discipline follow-up."),
            ("Overtakelse", "Kontrollmåling og dokumentasjon.", "Handover", "Control measurement and documentation."),
        ],
    ),
    dict(
        slug="miljo", kode="RIM", pfx="tj.env",
        navn=("Miljø og bærekraft", "Environment & sustainability"),
        kort=("Forurenset grunn, miljøoppfølging, ombruk, utslipp og naturhensyn.",
              "Contaminated ground, environmental follow-up, reuse, emissions and nature."),
        lede=("Builtly tar ansvar for miljørådgivning (RIM) — fra miljøkartlegging og tiltaksplan for forurenset grunn til miljøoppfølgingsplan, ombruksvurderinger og miljøsertifisering. Våre rådgivere setter miljøkravene og følger dem opp hos de utførende.",
              "Builtly takes responsibility for environmental consulting — from environmental surveys and action plans for contaminated ground to environmental follow-up plans, reuse assessments and environmental certification. Our consultants set the environmental requirements and follow them up on site."),
        regelverk="Forurensningsforskriften kap. 2 · TEK17 kap. 9 · BREEAM-NOR",
        kontakt=None,
        leveranser=[
            ("Miljøkartlegging", "Kartlegging av helse- og miljøfarlige stoffer i grunn og eksisterende bygg før riving og graving.",
             "Environmental survey", "Survey of hazardous substances in ground and existing buildings before demolition and excavation."),
            ("Tiltaksplan forurenset grunn", "Tiltaksplan etter forurensningsforskriften kapittel 2, med massedisponering og myndighetsdialog.",
             "Contaminated-ground action plan", "Action plan under the pollution regulations, with mass management and dialogue with the authorities."),
            ("Miljøoppfølgingsplan (MOP)", "Miljøkrav for byggefasen — avfall, utslipp, støy og natur — med oppfølging hos entreprenøren.",
             "Environmental follow-up plan", "Environmental requirements for the construction phase — waste, emissions, noise and nature — followed up with the contractor."),
            ("Ombruk og avfall", "Ombrukskartlegging og avfallsplan med sorteringsgrad og dokumentasjon.",
             "Reuse and waste", "Reuse survey and waste plan with sorting rates and documentation."),
            ("Miljøsertifisering", "Prekvalifisering og prosess-støtte for BREEAM-NOR og tilsvarende ordninger — ærlige to-tall-vurderinger av sikret nivå og prognose.",
             "Environmental certification", "Pre-assessment and process support for BREEAM-NOR and similar schemes — honest assessments of secured level and forecast."),
            ("Klimagassregnskap", "Klimagassberegninger for materialer og drift som beslutningsgrunnlag i prosjekteringen.",
             "Carbon accounting", "Greenhouse-gas calculations for materials and operation as a decision basis in design."),
        ],
        faser=[
            ("Tomtekjøp", "Miljørisiko inn i beslutningen.", "Site acquisition", "Environmental risk into the decision."),
            ("Regulering", "Kartlegging og tiltaksplan.", "Zoning", "Survey and action plan."),
            ("Prosjektering", "MOP, ombruk og sertifisering.", "Design", "Follow-up plan, reuse and certification."),
            ("Utførelse", "Oppfølging og sluttdokumentasjon.", "Construction", "Follow-up and final documentation."),
        ],
    ),
    dict(
        slug="trafikk", kode="Trafikk", pfx="tj.tra",
        navn=("Trafikk", "Traffic engineering"),
        kort=("Trafikkanalyser, parkering, byggeplasstrafikk og mobilitet.",
              "Traffic analysis, parking, construction traffic and mobility."),
        lede=("Builtly tar ansvar for trafikkfaglige utredninger — trafikkanalyse til regulering, parkeringsdekning, trafikksikkerhet og anleggslogistikk. Leveransene er skrevet for planmyndigheten og prosjekteringsgruppen, ikke for skuffen.",
              "Builtly takes responsibility for traffic assessments — traffic analysis for zoning, parking coverage, traffic safety and construction logistics. The deliverables are written for the planning authority and the design group."),
        regelverk="Statens vegvesens håndbøker · kommunale normer",
        kontakt=None,
        leveranser=[
            ("Trafikkanalyse", "Turproduksjon, kapasitet i kryss og belastning på omkringliggende nett — grunnlaget planmyndigheten spør etter.",
             "Traffic analysis", "Trip generation, junction capacity and load on the surrounding network — the basis the planning authority asks for."),
            ("Parkering og mobilitet", "Parkeringsdekning etter kommunal norm, sykkelparkering og mobilitetsplan.",
             "Parking and mobility", "Parking coverage to municipal standards, bicycle parking and mobility plan."),
            ("Trafikksikkerhet", "Siktanalyser, myke trafikanter og skolevei — dokumentert mot håndbøkene.",
             "Traffic safety", "Sight-line analysis, vulnerable road users and school routes — documented against the handbooks."),
            ("Byggeplasstrafikk", "Anleggslogistikk, riggplan-premisser og faseplaner for trafikkavvikling i byggetiden.",
             "Construction traffic", "Site logistics and phasing plans for traffic management during construction."),
        ],
        faser=[
            ("Tidligfase", "Overordnet vurdering av adkomst.", "Early phase", "High-level access assessment."),
            ("Regulering", "Trafikkanalyse til planforslaget.", "Zoning", "Traffic analysis for the plan proposal."),
            ("Prosjektering", "Parkering, sikt og detaljer.", "Design", "Parking, sight lines and details."),
            ("Utførelse", "Byggeplasstrafikk og faseplaner.", "Construction", "Construction traffic and phasing."),
        ],
    ),
    dict(
        slug="sha", kode="SHA", pfx="tj.sha",
        navn=("SHA", "HSE coordination"),
        kort=("SHA-plan, risikokartlegging og koordinering etter byggherreforskriften.",
              "HSE plan, risk survey and coordination under the client regulations."),
        lede=("Builtly tar ansvar for SHA-arbeidet etter byggherreforskriften — SHA-plan, risikokartlegging i prosjekteringen og koordinering i både prosjekterings- og utførelsesfasen (KP/KU).",
              "Builtly takes responsibility for HSE work under the Norwegian client regulations — HSE plan, design-phase risk survey and coordination in both the design and construction phases."),
        regelverk="Byggherreforskriften · arbeidsmiljøloven",
        kontakt=None,
        leveranser=[
            ("SHA-plan", "Prosjektspesifikk plan for sikkerhet, helse og arbeidsmiljø med risikoforhold, tiltak og fremdriftskobling.",
             "HSE plan", "Project-specific plan for safety, health and working environment with risks, measures and schedule linkage."),
            ("Risikokartlegging i prosjektering", "Identifisering av risikoforhold som kan prosjekteres bort — valg som tas før de blir farlige.",
             "Design-phase risk survey", "Identification of risks that can be designed out — choices made before they become dangerous."),
            ("Koordinering (KP/KU)", "Koordinatorrollen i prosjekterings- og utførelsesfasen, med dokumentert oppfølging.",
             "Coordination", "The coordinator role in the design and construction phases, with documented follow-up."),
            ("Oppfølging i byggefase", "Vernerunder, avviksoppfølging og rapportering til byggherren.",
             "Construction-phase follow-up", "Safety inspections, deviation follow-up and reporting to the client."),
        ],
        faser=[
            ("Prosjektering", "Risiko kartlegges og prosjekteres bort.", "Design", "Risks surveyed and designed out."),
            ("Kontrahering", "SHA-krav inn i kontraktene.", "Procurement", "HSE requirements into the contracts."),
            ("Utførelse", "Koordinering og vernerunder.", "Construction", "Coordination and inspections."),
            ("Overtakelse", "Sluttdokumentasjon.", "Handover", "Final documentation."),
        ],
    ),
    dict(
        slug="teknisk-dd", kode="TDD", pfx="tj.tdd",
        navn=("Teknisk due diligence", "Technical due diligence"),
        kort=("Teknisk gjennomgang av eiendom ved kjøp, salg og finansiering.",
              "Technical review of property for acquisitions, sales and financing."),
        lede=("Builtly tar ansvar for teknisk due diligence i transaksjoner — tilstandsvurdering, kostnadsestimat for vedlikeholdsetterslep, miljø- og klimarisiko og strukturert gjennomgang av datarommet. Leveransen er et beslutningsgrunnlag kjøper, selger og bank kan handle på.",
              "Builtly takes responsibility for technical due diligence in transactions — condition assessment, cost estimates for deferred maintenance, environmental and climate risk and a structured data-room review. The deliverable is a decision basis buyer, seller and lender can act on."),
        regelverk="NS 3424 · EU-taksonomien",
        kontakt=None,
        leveranser=[
            ("Tilstandsvurdering", "Systematisk gjennomgang av byggets tekniske tilstand etter NS 3424, med tilstandsgrader og restlevetid.",
             "Condition assessment", "Systematic review of the building's technical condition, with condition grades and remaining life."),
            ("Kostnadsestimat", "Prissatt vedlikeholdsetterslep og investeringsbehov fordelt over tid — tallene forhandlingen bruker.",
             "Cost estimate", "Priced deferred maintenance and investment needs over time — the numbers the negotiation uses."),
            ("Miljø- og klimarisiko", "Screening av forurensning, flom, havnivå, vind og skred — mot EU-taksonomiens krav der det er relevant.",
             "Environmental and climate risk", "Screening of contamination, flood, sea level, wind and landslide — against EU Taxonomy requirements where relevant."),
            ("Datarom-gjennomgang", "Strukturert gjennomgang av teknisk dokumentasjon i datarommet, med funn, hull og røde flagg.",
             "Data-room review", "Structured review of the technical documentation in the data room, with findings, gaps and red flags."),
        ],
        faser=[
            ("Indikativt bud", "Overordnet teknisk screening.", "Indicative bid", "High-level technical screening."),
            ("Eksklusivitet", "Full teknisk gjennomgang.", "Exclusivity", "Full technical review."),
            ("Forhandling", "Funn prissatt og dokumentert.", "Negotiation", "Findings priced and documented."),
            ("Overtakelse", "Verifikasjon og restpunkter.", "Completion", "Verification and outstanding items."),
        ],
    ),
    dict(
        slug="byggherrestotte", kode="PL/KS", pfx="tj.bhs",
        navn=("Prosjekt- og byggherrestøtte", "Project & client support"),
        kort=("Prosjekteringsledelse, byggherrerådgivning, kontrahering og kvalitetssikring.",
              "Design management, client advisory, procurement and quality assurance."),
        lede=("Builtly støtter byggherren gjennom hele prosjektet — prosjekteringsledelse, kontrahering og anbudsprosess, kvalitetssikring av leveranser og oppfølging av fremdrift, økonomi og overtakelse.",
              "Builtly supports the client through the whole project — design management, procurement and tendering, quality assurance of deliverables and follow-up of progress, economy and handover."),
        regelverk="NS 8401/8402 · NS 8405/8407 · SAK10",
        kontakt=None,
        leveranser=[
            ("Prosjekteringsledelse", "Ledelse og koordinering av prosjekteringsgruppen — fremdrift, grensesnitt og beslutninger.",
             "Design management", "Leadership and coordination of the design group — progress, interfaces and decisions."),
            ("Kontrahering og anbud", "Anbudsgrunnlag, tilbudsevaluering og kontrahering etter NS-kontraktene — med sporbare anbudsrom og kvitteringer.",
             "Procurement and tendering", "Tender basis, bid evaluation and contracting under the NS standard contracts — with traceable tender rooms and receipts."),
            ("Kvalitetssikring", "Uavhengig gjennomgang av fagleveranser før de sendes videre — komplett, konsistent og kontraktsmessig.",
             "Quality assurance", "Independent review of discipline deliverables before they are issued — complete, consistent and contractual."),
            ("Fremdrift og økonomi", "Oppfølging av fremdrift og prosjektøkonomi med ærlig rapportering til byggherren.",
             "Progress and economy", "Follow-up of progress and project economy with honest reporting to the client."),
            ("Overtakelse og FDV", "Overtakelsesforretning, mangeloppfølging og FDV-dokumentasjon etter kontrakt og TEK17.",
             "Handover and O&M", "Handover process, defect follow-up and O&M documentation under the contract and the regulations."),
        ],
        faser=[
            ("Tidligfase", "Strategi, organisering og budsjett.", "Early phase", "Strategy, organisation and budget."),
            ("Prosjektering", "Ledelse og kvalitetssikring.", "Design", "Management and quality assurance."),
            ("Kontrahering", "Anbud og kontrakter.", "Procurement", "Tendering and contracts."),
            ("Utførelse", "Oppfølging til overtakelse.", "Construction", "Follow-up to handover."),
        ],
    ),
]


# ============================================================================
# FAGSIDE-MAL
# ============================================================================

def fagside(f):
    p = f["pfx"]
    navn_no, navn_en = f["navn"]
    kort_no, kort_en = f["kort"]
    lede_no, lede_en = f["lede"]

    t(p + ".title", f"{navn_no} · Rådgivende ingeniører · Builtly", f"{navn_en} · Consulting engineers · Builtly")
    t(p + ".desc", f"Builtly leverer komplette rådgiveroppdrag innen {navn_no.lower()} — {kort_no.lower()[:-1]}. Be om tilbud.",
      f"Builtly delivers complete consulting engagements in {navn_en.lower()} — {kort_en.lower()[:-1]}. Request a quote.")
    t(p + ".h1", navn_no, navn_en)
    t(p + ".lede", lede_no, lede_en)

    lev_html = []
    for i, (lt_no, ld_no, lt_en, ld_en) in enumerate(f["leveranser"], 1):
        kt = t(f"{p}.lev{i}.t", lt_no, lt_en)
        kd = t(f"{p}.lev{i}.d", ld_no, ld_en)
        lev_html.append(
            f'<li class="rv"><span class="n">{i:02d}</span><div><div class="t" data-i18n="{kt}">{_html.escape(lt_no)}</div>'
            f'<div class="d" data-i18n="{kd}">{_html.escape(ld_no)}</div></div></li>'
        )

    fase_html = []
    for i, (fn_no, fd_no, fn_en, fd_en) in enumerate(f["faser"], 1):
        kn = t(f"{p}.fase{i}.n", fn_no, fn_en)
        kd = t(f"{p}.fase{i}.d", fd_no, fd_en)
        fase_html.append(
            f'<div class="phase rv"><div class="ix">Fase {i:02d}</div><div class="nm" data-i18n="{kn}">{_html.escape(fn_no)}</div>'
            f'<div class="ds" data-i18n="{kd}">{_html.escape(fd_no)}</div></div>'
        )

    kontakt_rad = ""
    if f["kontakt"]:
        kk = t(p + ".kontakt", f["kontakt"][0], f["kontakt"][1])
        kontakt_rad = f'<div class="row"><span class="k" data-i18n="tj.felles.kontakt_k">Fagkontakt</span><span class="v" data-i18n="{kk}">{_html.escape(f["kontakt"][0])}</span></div>'
    else:
        kontakt_rad = '<div class="row"><span class="k" data-i18n="tj.felles.kontakt_k">Fagansvarlig</span><span class="v" data-i18n="tj.felles.kontakt_v">Navngis i tilbudet</span></div>'

    mailto = f"mailto:sales@builtly.ai?subject=Tilbudsforesp%C3%B8rsel%20%E2%80%94%20{navn_no.replace(' ', '%20')}"

    sw_p_no = (f"Builtlys {navn_no.lower()}-rådgivere benytter banebrytende teknologi til analyser, "
               "tegningsproduksjon og kvalitetssikring. Den samme teknologien er tilgjengelig som "
               "software for kunder og andre rådgivermiljøer.")
    sw_p_en = (f"Builtly's {navn_en.lower()} consultants use groundbreaking technology for analysis, "
               "drawing production and quality assurance. The same technology is available as "
               "software for clients and other consultancies.")
    t(p + ".sw_p", sw_p_no, sw_p_en)

    body = f"""<main>
<section class="p-hero">
<div class="wrap">
<div class="p-hero-grid">
<div>
<div class="eyebrow"><span class="accent-dot"></span><span data-i18n="tj.felles.eyebrow">Builtly · Rådgivende ingeniører</span></div>
<h1 class="dpy-1" data-i18n="{p}.h1">{_html.escape(navn_no)}</h1>
<p class="lead" data-i18n="{p}.lede">{_html.escape(lede_no)}</p>
<div class="p-hero-actions">
<a href="/bli-kunde.html" class="btn"><span data-i18n="tj.felles.cta_tilbud">Be om tilbud</span> <span class="arr">→</span></a>
<a href="{mailto}" class="btn btn-ghost">sales@builtly.ai</a>
</div>
</div>
<div class="p-side">
<div class="row"><span class="k" data-i18n="tj.felles.fag_k">Fagområde</span><span class="v">{_html.escape(f["kode"])}</span></div>
<div class="row"><span class="k" data-i18n="tj.felles.regelverk_k">Regelverk</span><span class="v">{_html.escape(f["regelverk"])}</span></div>
<div class="row"><span class="k" data-i18n="tj.felles.leveranse_k">Leveranse</span><span class="v" data-i18n="tj.felles.leveranse_v">Redigerbare fagformater + rapport</span></div>
{kontakt_rad}
<div class="row"><span class="k" data-i18n="tj.felles.svar_k">Svar på forespørsel</span><span class="v" data-i18n="tj.felles.svar_v">Innen én virkedag</span></div>
</div>
</div>
</div>
</section>

<section class="section">
<div class="wrap">
<div class="smark"><span class="num">§ 01</span><span data-i18n="tj.felles.s01">Leveranser</span><span class="dash"></span><span data-i18n="tj.felles.s01tag">Dette tar vi ansvar for</span></div>
<h2 class="dpy-3 rv" data-i18n="tj.felles.s01h2">Dette utfører Builtly.</h2>
<ul class="dlist" style="margin-top:clamp(28px,4vh,44px)">
{chr(10).join(lev_html)}
</ul>
</div>
</section>

<section class="section section-soft">
<div class="wrap">
<div class="smark"><span class="num">§ 02</span><span data-i18n="tj.felles.s02">Faser</span><span class="dash"></span><span data-i18n="tj.felles.s02tag">Når i prosjektet</span></div>
<h2 class="dpy-3 rv" data-i18n="tj.felles.s02h2">Fra tidligfase til overtakelse.</h2>
<div class="phases" style="margin-top:clamp(28px,4vh,44px)">
{chr(10).join(fase_html)}
</div>
</div>
</section>

<section class="quiet-strip">
<div class="wrap">
<div class="inner">
<span class="mark" data-i18n="tj.felles.ansvar_mark">Fagansvaret</span>
<p data-i18n="tj.felles.ansvar_p">Builtlys ingeniører har det faglige ansvaret og leverer oppdraget. Vår banebrytende software brukes som et verktøy i prosjekteringen der den gir bedre kvalitet, sporbarhet og arbeidsflyt — vurderingene, koordineringen og signaturen er ingeniørens.</p>
</div>
</div>
</section>

<section class="section">
<div class="wrap">
<div class="crosslink rv">
<div>
<h3 data-i18n="tj.felles.sw_h">Er dere et rådgivermiljø som vil bruke teknologien selv?</h3>
<p data-i18n="{p}.sw_p">{_html.escape(sw_p_no)}</p>
</div>
<a href="/software.html" class="btn btn-ghost"><span data-i18n="tj.felles.sw_cta">Se Builtly Software</span> <span class="arr">→</span></a>
</div>
</div>
</section>

<section class="section section-dark" id="tilbud">
<div class="wrap">
<div class="cta-grid">
<div class="rv">
<h2 class="dpy-2" data-i18n="tj.felles.cta_h2">Be om tilbud.</h2>
<p class="lead on-dark" style="margin-top:24px;max-width:52ch" data-i18n="tj.felles.cta_lede">Beskriv prosjektet, så svarer vi innen én virkedag med hvem som tar oppdraget, hva leveransen omfatter og et konkret tilbud.</p>
<div class="cta-actions">
<a href="/bli-kunde.html" class="btn btn-light"><span data-i18n="tj.felles.cta_tilbud">Be om tilbud</span> <span class="arr">→</span></a>
<a href="mailto:sales@builtly.ai" class="btn btn-dark-ghost">sales@builtly.ai</a>
</div>
</div>
<div class="cta-side rv">
<div class="row" style="border-top-color:var(--dark-paper)"><span class="k" style="color:rgba(247,244,237,0.6)" data-i18n="tj.felles.svar_k">Svar på forespørsel</span><span class="v" style="color:var(--dark-paper)" data-i18n="tj.felles.svar_v">Innen én virkedag</span></div>
<div class="row" style="border-top-color:var(--line-dark)"><span class="k" style="color:rgba(247,244,237,0.6)" data-i18n="tj.felles.tilbud_k">Tilbudet navngir</span><span class="v" style="color:var(--dark-paper)" data-i18n="tj.felles.tilbud_v">Ansvarlig og fagansvarlig</span></div>
<div class="row" style="border-top-color:var(--line-dark)"><span class="k" style="color:rgba(247,244,237,0.6)" data-i18n="tj.felles.omrade_k">Geografi</span><span class="v" style="color:var(--dark-paper)" data-i18n="tj.felles.omrade_v">Hele landet</span></div>
</div>
</div>
</div>
</section>
</main>"""

    return page(
        path=f"tjenester/{f['slug']}.html",
        title=f"{navn_no} · Rådgivende ingeniører · Builtly",
        title_key=p + ".title",
        desc=I18N["no"][p + ".desc"],
        desc_key=p + ".desc",
        active="tjenester",
        body=body,
    )


# --- fellesnøkler for fagsidene ---------------------------------------------
t("tj.felles.eyebrow", "Builtly · Rådgivende ingeniører", "Builtly · Consulting engineers")
t("tj.felles.cta_tilbud", "Be om tilbud", "Request a quote")
t("tj.felles.fag_k", "Fagområde", "Discipline")
t("tj.felles.regelverk_k", "Regelverk", "Framework")
t("tj.felles.leveranse_k", "Leveranse", "Deliverables")
t("tj.felles.leveranse_v", "Redigerbare fagformater + rapport", "Editable discipline formats + report")
t("tj.felles.kontakt_k", "Fagansvarlig", "Discipline lead")
t("tj.felles.kontakt_v", "Navngis i tilbudet", "Named in the quote")
t("tj.felles.svar_k", "Svar på forespørsel", "Response")
t("tj.felles.svar_v", "Innen én virkedag", "Within one business day")
t("tj.felles.s01", "Leveranser", "Deliverables")
t("tj.felles.s01tag", "Dette tar vi ansvar for", "What we take responsibility for")
t("tj.felles.s01h2", "Dette utfører Builtly.", "This is what Builtly delivers.")
t("tj.felles.s02", "Faser", "Phases")
t("tj.felles.s02tag", "Når i prosjektet", "When in the project")
t("tj.felles.s02h2", "Fra tidligfase til overtakelse.", "From early phase to handover.")
t("tj.felles.ansvar_mark", "Fagansvaret", "Professional responsibility")
t("tj.felles.ansvar_p",
  "Builtlys ingeniører har det faglige ansvaret og leverer oppdraget. Vår banebrytende software brukes som et verktøy i prosjekteringen der den gir bedre kvalitet, sporbarhet og arbeidsflyt — vurderingene, koordineringen og signaturen er ingeniørens.",
  "Builtly's engineers hold the professional responsibility and deliver the engagement. Our groundbreaking software is used as a tool in the design work where it improves quality, traceability and workflow — the judgements, the coordination and the signature belong to the engineer.")
t("tj.felles.sw_h", "Er dere et rådgivermiljø som vil bruke teknologien selv?", "Are you a consultancy that wants to use the technology yourself?")
t("tj.felles.sw_cta", "Se Builtly Software", "See Builtly Software")
t("tj.felles.cta_h2", "Be om tilbud.", "Request a quote.")
t("tj.felles.cta_lede",
  "Beskriv prosjektet, så svarer vi innen én virkedag med hvem som tar oppdraget, hva leveransen omfatter og et konkret tilbud.",
  "Describe the project and we respond within one business day with who takes the engagement, what the delivery covers and a concrete quote.")
t("tj.felles.tilbud_k", "Tilbudet navngir", "The quote names")
t("tj.felles.tilbud_v", "Ansvarlig og fagansvarlig", "Responsible engineer and discipline lead")
t("tj.felles.omrade_k", "Geografi", "Geography")
t("tj.felles.omrade_v", "Hele landet", "All of Norway")


# ============================================================================
# TJENESTER.HTML — oversiktssiden
# ============================================================================

def tjenester_oversikt():
    t("tj.ov.title", "Rådgivende ingeniørtjenester · Builtly", "Consulting engineering services · Builtly")
    t("tj.ov.desc",
      "Builtly leverer komplette rådgiveroppdrag innen geoteknikk, konstruksjon, brann, akustikk, miljø, trafikk, SHA og teknisk due diligence.",
      "Builtly delivers complete consulting engagements in geotechnics, structures, fire, acoustics, environment, traffic, HSE and technical due diligence.")
    t("tj.ov.h1", "Rådgivende ingeniører.", "Consulting engineers.")
    t("tj.ov.lede",
      "Builtly tar ansvar for ordinære rådgiveroppdrag. Kunden kjøper en vanlig rådgiverleveranse: våre ingeniører deltar i møter, prosjekterer, gjør faglige vurderinger, koordinerer, kvalitetssikrer, signerer og følger opp prosjektet. Du behøver ikke kjøpe software eller endre arbeidsmåte.",
      "Builtly takes responsibility for ordinary consulting engagements. You buy a normal consulting delivery: our engineers attend meetings, design, make professional judgements, coordinate, quality-assure, sign and follow up the project. You do not need to buy software or change how you work.")
    t("tj.ov.s01", "Fagområder", "Disciplines")
    t("tj.ov.s01tag", "Ni rådgivertjenester", "Nine consulting services")
    t("tj.ov.s01h2", "Velg fagområde.", "Choose a discipline.")
    t("tj.ov.kort_cta", "Se tjenesten", "See the service")

    kort = []
    for i, f in enumerate(FAG, 1):
        p = f["pfx"]
        navn_no = f["navn"][0]
        kort_no = f["kort"][0]
        kh = t(p + ".ovh", navn_no, f["navn"][1])
        kd = t(p + ".ovd", kort_no, f["kort"][1])
        kort.append(f"""<a href="/tjenester/{f['slug']}.html" class="card rv">
<div class="head"><span>{_html.escape(f['kode'])}</span><span class="topic">{i:02d}</span></div>
<h3 data-i18n="{kh}">{_html.escape(navn_no)}</h3>
<p data-i18n="{kd}">{_html.escape(kort_no)}</p>
<div class="foot"><span data-i18n="tj.ov.kort_cta">Se tjenesten</span><span class="go">→</span></div>
</a>""")

    body = f"""<main>
<section class="p-hero">
<div class="wrap">
<div class="p-hero-grid">
<div>
<div class="eyebrow"><span class="accent-dot"></span><span data-i18n="tj.felles.eyebrow">Builtly · Rådgivende ingeniører</span></div>
<h1 class="dpy-1" data-i18n="tj.ov.h1">Rådgivende ingeniører.</h1>
<p class="lead" data-i18n="tj.ov.lede">{_html.escape(I18N['no']['tj.ov.lede'])}</p>
<div class="p-hero-actions">
<a href="/bli-kunde.html" class="btn"><span data-i18n="tj.felles.cta_tilbud">Be om tilbud</span> <span class="arr">→</span></a>
<a href="/slik-jobber-vi.html" class="btn btn-ghost"><span data-i18n="tj.ov.cta2">Slik jobber vi</span> <span class="arr">→</span></a>
</div>
</div>
<div class="p-side">
<div class="row"><span class="k" data-i18n="tj.ov.side1k">Oppdragsform</span><span class="v" data-i18n="tj.ov.side1v">Ordinære rådgiveroppdrag</span></div>
<div class="row"><span class="k" data-i18n="tj.ov.side2k">Kontrakt</span><span class="v">NS 8401 / NS 8402</span></div>
<div class="row"><span class="k" data-i18n="tj.felles.leveranse_k">Leveranse</span><span class="v" data-i18n="tj.felles.leveranse_v">Redigerbare fagformater + rapport</span></div>
<div class="row"><span class="k" data-i18n="tj.felles.svar_k">Svar på forespørsel</span><span class="v" data-i18n="tj.felles.svar_v">Innen én virkedag</span></div>
</div>
</div>
</div>
</section>

<section class="section">
<div class="wrap">
<div class="smark"><span class="num">§ 01</span><span data-i18n="tj.ov.s01">Fagområder</span><span class="dash"></span><span data-i18n="tj.ov.s01tag">Ni rådgivertjenester</span></div>
<h2 class="dpy-3 rv" data-i18n="tj.ov.s01h2">Velg fagområde.</h2>
<div class="cardgrid c3" style="margin-top:clamp(28px,4vh,44px)">
{chr(10).join(kort)}
</div>
</div>
</section>

<section class="quiet-strip">
<div class="wrap">
<div class="inner">
<span class="mark" data-i18n="tj.felles.ansvar_mark">Fagansvaret</span>
<p data-i18n="tj.felles.ansvar_p">{_html.escape(I18N['no']['tj.felles.ansvar_p'])}</p>
</div>
</div>
</section>

<section class="section section-dark" id="tilbud">
<div class="wrap">
<div class="cta-grid">
<div class="rv">
<h2 class="dpy-2" data-i18n="tj.felles.cta_h2">Be om tilbud.</h2>
<p class="lead on-dark" style="margin-top:24px;max-width:52ch" data-i18n="tj.felles.cta_lede">{_html.escape(I18N['no']['tj.felles.cta_lede'])}</p>
<div class="cta-actions">
<a href="/bli-kunde.html" class="btn btn-light"><span data-i18n="tj.felles.cta_tilbud">Be om tilbud</span> <span class="arr">→</span></a>
<a href="mailto:sales@builtly.ai" class="btn btn-dark-ghost">sales@builtly.ai</a>
</div>
</div>
<div class="cta-side rv">
<div class="row" style="border-top-color:var(--dark-paper)"><span class="k" style="color:rgba(247,244,237,0.6)" data-i18n="tj.felles.svar_k">Svar på forespørsel</span><span class="v" style="color:var(--dark-paper)" data-i18n="tj.felles.svar_v">Innen én virkedag</span></div>
<div class="row" style="border-top-color:var(--line-dark)"><span class="k" style="color:rgba(247,244,237,0.6)" data-i18n="tj.felles.tilbud_k">Tilbudet navngir</span><span class="v" style="color:var(--dark-paper)" data-i18n="tj.felles.tilbud_v">Ansvarlig og fagansvarlig</span></div>
<div class="row" style="border-top-color:var(--line-dark)"><span class="k" style="color:rgba(247,244,237,0.6)" data-i18n="tj.felles.omrade_k">Geografi</span><span class="v" style="color:var(--dark-paper)" data-i18n="tj.felles.omrade_v">Hele landet</span></div>
</div>
</div>
</div>
</section>
</main>"""

    t("tj.ov.cta2", "Slik jobber vi", "How we work")
    t("tj.ov.side1k", "Oppdragsform", "Engagement form")
    t("tj.ov.side1v", "Ordinære rådgiveroppdrag", "Ordinary consulting engagements")
    t("tj.ov.side2k", "Kontrakt", "Contract")

    return page(
        path="tjenester.html",
        title="Rådgivende ingeniørtjenester · Builtly",
        title_key="tj.ov.title",
        desc=I18N["no"]["tj.ov.desc"],
        desc_key="tj.ov.desc",
        active="tjenester",
        body=body,
    )


# ============================================================================
# SOFTWARE.HTML — samlesiden for softwareområdet
# ============================================================================

SW_KATEGORIER = [
    dict(id="kart", n=("Kart og eiendomsanalyse", "Maps & property analysis"),
         d=("Builtly Maps, mulighetsstudier, klimarisiko og teknisk DD — beslutningsgrunnlaget før prosjektet finnes.",
            "Builtly Maps, feasibility studies, climate risk and technical DD — the decision basis before the project exists."),
         href="/maps.html", lenketekst=("Se Builtly Maps", "See Builtly Maps")),
    dict(id="prosjektering", n=("Prosjektering og ingeniørfag", "Engineering & design"),
         d=("Geoteknikk, konstruksjon, brann, akustikk, trafikk, SHA, BREEAM og miljø — fagmodulene som leser og skriver BIM.",
            "Geotechnics, structures, fire, acoustics, traffic, HSE, BREEAM and environment — the discipline modules that read and write BIM."),
         href="/verktoy.html#utvikling", lenketekst=("Se fagmodulene", "See the discipline modules")),
    dict(id="okonomi", n=("Mengder og økonomi", "Quantities & economics"),
         d=("Anbud, mengder, areal og yield, byggelånskontroll og kredittgrunnlag — prosjektet i tall, på samme modell.",
            "Tenders, quantities, area and yield, construction-loan control and credit basis — the project in numbers, on the same model."),
         href="/verktoy.html#okonomi", lenketekst=("Se økonomimodulene", "See the economics modules")),
    dict(id="salg", n=("Salg og marked", "Sales & marketing"),
         d=("Salgskonsoll, prosjektnettsider, prospekt og interessentoppfølging — salgstakt målt mot mål, ikke magefølelse.",
            "Sales console, project websites, prospectus and prospect follow-up — sales pace measured against target, not gut feeling."),
         href="/verktoy.html#salg", lenketekst=("Se salgsverktøyene", "See the sales tools")),
    dict(id="samhandling", n=("Prosjekt og samhandling", "Project & collaboration"),
         d=("Prosjekthotell/CDE med BIM i nettleseren, anbudsrom, oversendelser med kvittering og byggeplass-innsjekk.",
            "Project hotel/CDE with BIM in the browser, tender rooms, transmittals with receipts and site check-in."),
         href="/verktoy.html#admin", lenketekst=("Se prosjekthotellet", "See the project hotel")),
    dict(id="finans", n=("Bank, finans og portefølje", "Banking, finance & portfolio"),
         d=("Byggelånskontroll, kredittgrunnlag, klimarisiko og porteføljeinnsikt — strukturert beslutningsstøtte for långivere.",
            "Construction-loan control, credit basis, climate risk and portfolio insight — structured decision support for lenders."),
         href="/verktoy.html#okonomi", lenketekst=("Se bankmodulene", "See the banking modules")),
]


def _bimv_nokler():
    t("sw.bimv.badge", "Gratis", "Free")
    t("sw.bimv.h", "Builtly BIM Viewer — gratis IFC-viser i nettleseren",
      "Builtly BIM Viewer — free IFC viewer in the browser")
    t("sw.bimv.p",
      "Dra inn en IFC-fil og den åpner seg — ingen installasjon, ingen lisens, ingen firmaregistrering. Mål lengder og arealer, kutt snitt, og les ut arealer og boenheter rett fra modellen. Filen parses lokalt på din maskin og lastes aldri opp.",
      "Drag in an IFC file and it opens — no installation, no licence, no company registration. Measure lengths and areas, cut sections, and read floor areas and residential units straight from the model. The file is parsed locally on your machine and never uploaded.")
    t("sw.bimv.cta", "Åpne BIM Viewer — gratis", "Open BIM Viewer — free")
    t("sw.bimv.mer", "Les mer om BIM Viewer", "More about BIM Viewer")


BIMV_STRIPE = """<div class="free-strip rv" style="margin-top:clamp(24px,3.5vh,36px)">
<div>
<span class="fs-badge" data-i18n="sw.bimv.badge">Gratis</span>
<h3 data-i18n="sw.bimv.h">Builtly BIM Viewer — gratis IFC-viser i nettleseren</h3>
<p data-i18n="sw.bimv.p">Dra inn en IFC-fil og den åpner seg — ingen installasjon, ingen lisens, ingen firmaregistrering. Mål lengder og arealer, kutt snitt, og les ut arealer og boenheter rett fra modellen. Filen parses lokalt på din maskin og lastes aldri opp.</p>
</div>
<div class="fs-actions">
<a href="https://bim.builtly.ai" class="btn"><span data-i18n="sw.bimv.cta">Åpne BIM Viewer — gratis</span> <span class="arr">→</span></a>
<a href="/bim-viewer.html" class="btn btn-ghost"><span data-i18n="sw.bimv.mer">Les mer om BIM Viewer</span></a>
</div>
</div>"""


def software_side():
    _bimv_nokler()
    t("sw.title", "Builtly Software · Software utviklet gjennom faktiske prosjekter", "Builtly Software · Software developed through real projects")
    t("sw.desc",
      "Builtlys software utvikles og brukes av rådgivere som selv arbeider med ordinære oppdrag — kart, ingeniørfag, økonomi, salg, samhandling og finans.",
      "Builtly's software is developed and used by consultants working on real engagements — maps, engineering, economics, sales, collaboration and finance.")
    t("sw.h1", "Software utviklet gjennom faktiske prosjekter.", "Software developed through real projects.")
    t("sw.lede",
      "Builtlys software utvikles og brukes av rådgivere som selv arbeider med ordinære oppdrag. Det gjør at modulene bygger på reelle arbeidsprosesser, faglige krav og faktiske prosjektleveranser — og kan brukes direkte av kunder, samarbeidspartnere og andre rådgivermiljøer. Dette er deeptech — egne motorer for BIM, regelverk og beregning.",
      "Builtly's software is developed and used by consultants who themselves work on ordinary engagements. That means the modules are built on real work processes, professional requirements and actual project deliverables — and can be used directly by clients, partners and other consultancies. This is deep tech — our own engines for BIM, regulation and computation.")
    t("sw.s01", "Områder", "Areas")
    t("sw.s01tag", "Seks kategorier", "Six categories")
    t("sw.s01h2", "Softwareområdet.", "The software area.")
    t("sw.s02", "Flywheel", "Flywheel")
    t("sw.s02tag", "Rådgivning og software forsterker hverandre", "Consulting and software reinforce each other")
    t("sw.s02h2", "Derfor virker det.", "Why it works.")
    t("sw.fly1", "Rådgivningsvirksomheten dokumenterer at softwaren fungerer i virkeligheten.",
      "The consulting practice documents that the software works in reality.")
    t("sw.fly2", "Softwaren gjør rådgivningsvirksomheten mer effektiv og skalerbar.",
      "The software makes the consulting practice more efficient and scalable.")
    t("sw.fly3", "Erfaringene fra oppdrag forbedrer produktene.",
      "Experience from engagements improves the products.")
    t("sw.fly4", "Bedre produkter forbedrer nye oppdrag.",
      "Better products improve new engagements.")
    t("sw.garanti_mark", "Datagaranti", "Data guarantee")
    t("sw.garanti_p",
      "Builtly Engineering har ikke tilgang til softwarekunders prosjekter uten at kunden uttrykkelig inviterer Builtly inn i prosjektet eller bestiller en rådgivertjeneste. Kunden eier dataene, prosjektdata brukes ikke til modelltrening, og data og tilgang er isolert per kunde. Softwarekunders kunder, prosjektinformasjon og bruksmønstre benyttes ikke av Builtlys rådgivningsvirksomhet til salg eller konkurrerende tilbud.",
      "Builtly Engineering has no access to software customers' projects unless the customer explicitly invites Builtly into the project or orders a consulting service. The customer owns the data, project data is never used to train models, and data and access are isolated per customer. Software customers' clients, project information and usage patterns are not used by Builtly's consulting practice for sales or competing bids.")
    t("sw.garanti_lenke", "Les mer under Trust & sikkerhet", "Read more under Trust & security")
    t("sw.tj_h", "Trenger dere at Builtly tar hele oppdraget?", "Need Builtly to take the whole engagement?")
    t("sw.tj_p", "Builtly leverer også komplette rådgiveroppdrag i de samme fagene — med fagansvar, koordinering og oppfølging.",
      "Builtly also delivers complete consulting engagements in the same disciplines — with professional responsibility, coordination and follow-up.")
    t("sw.tj_cta", "Se våre rådgivertjenester", "See our consulting services")
    t("sw.cta_h2", "Se softwaren på et eget prosjekt.", "See the software on one of your own projects.")
    t("sw.cta_lede",
      "Be om en demo på egne prosjektdata, eller utforsk plattformen og verktøykassen i detalj. Tilgang og lisens avtales per modul.",
      "Request a demo on your own project data, or explore the platform and the toolbox in detail. Access and licensing are agreed per module.")
    t("sw.cta1", "Be om demo", "Request a demo")
    t("sw.cta2", "Se plattformen i detalj", "See the platform in detail")
    t("sw.kort_cta", "Utforsk", "Explore")

    kats = []
    for i, k in enumerate(SW_KATEGORIER, 1):
        kn = t(f"sw.kat{i}.h", k["n"][0], k["n"][1])
        kd = t(f"sw.kat{i}.d", k["d"][0], k["d"][1])
        kl = t(f"sw.kat{i}.l", k["lenketekst"][0], k["lenketekst"][1])
        kats.append(f"""<a href="{k['href']}" class="card rv" id="{k['id']}">
<div class="head"><span>{i:02d}</span><span class="topic" data-i18n="sw.kort_cta">Utforsk</span></div>
<h3 data-i18n="sw.kat{i}.h">{_html.escape(k['n'][0])}</h3>
<p data-i18n="sw.kat{i}.d">{_html.escape(k['d'][0])}</p>
<div class="foot"><span data-i18n="sw.kat{i}.l">{_html.escape(k['lenketekst'][0])}</span><span class="go">→</span></div>
</a>""")

    fly = []
    for i in range(1, 5):
        fly.append(f'<li class="rv"><span class="n">{i:02d}</span><div><div class="t" data-i18n="sw.fly{i}">{_html.escape(I18N["no"][f"sw.fly{i}"])}</div></div></li>')

    body = f"""<main>
<section class="p-hero">
<div class="wrap">
<div class="p-hero-grid">
<div>
<div class="eyebrow"><span class="accent-dot"></span><span data-i18n="sw.eyebrow">Builtly Software</span></div>
<h1 class="dpy-1" data-i18n="sw.h1">Software utviklet gjennom faktiske prosjekter.</h1>
<p class="lead" data-i18n="sw.lede">{_html.escape(I18N['no']['sw.lede'])}</p>
<div class="p-hero-actions">
<a href="/bli-kunde.html" class="btn"><span data-i18n="sw.cta1">Be om demo</span> <span class="arr">→</span></a>
<a href="/platform.html" class="btn btn-ghost"><span data-i18n="sw.cta2">Se plattformen i detalj</span> <span class="arr">→</span></a>
</div>
</div>
<div class="p-side">
<div class="row"><span class="k" data-i18n="sw.side1k">Moduler</span><span class="v" data-i18n="sw.side1v">15+ i drift</span></div>
<div class="row"><span class="k" data-i18n="sw.side2k">BIM</span><span class="v">IFC · DWG/DXF · BCF</span></div>
<div class="row"><span class="k" data-i18n="sw.side3k">Regelverk</span><span class="v" data-i18n="sw.side3v">7 jurisdiksjoner</span></div>
<div class="row"><span class="k" data-i18n="sw.side4k">Tilgang</span><span class="v" data-i18n="sw.side4v">Lisens per modul</span></div>
</div>
</div>
</div>
</section>

<section class="section">
<div class="wrap">
<div class="smark"><span class="num">§ 01</span><span data-i18n="sw.s01">Områder</span><span class="dash"></span><span data-i18n="sw.s01tag">Seks kategorier</span></div>
<h2 class="dpy-3 rv" data-i18n="sw.s01h2">Softwareområdet.</h2>
<div class="cardgrid c3" style="margin-top:clamp(28px,4vh,44px)">
{chr(10).join(kats)}
</div>
{BIMV_STRIPE}
</div>
</section>

<section class="section section-soft">
<div class="wrap">
<div class="smark"><span class="num">§ 02</span><span data-i18n="sw.s02">Flywheel</span><span class="dash"></span><span data-i18n="sw.s02tag">Rådgivning og software forsterker hverandre</span></div>
<h2 class="dpy-3 rv" data-i18n="sw.s02h2">Derfor virker det.</h2>
<ul class="dlist" style="margin-top:clamp(28px,4vh,44px)">
{chr(10).join(fly)}
</ul>
</div>
</section>

<section class="quiet-strip">
<div class="wrap">
<div class="inner">
<span class="mark" data-i18n="sw.garanti_mark">Datagaranti</span>
<p><span data-i18n="sw.garanti_p">{_html.escape(I18N['no']['sw.garanti_p'])}</span><br/><a href="/trust.html" class="link-line" style="font-size:14px" data-i18n="sw.garanti_lenke">Les mer under Trust &amp; sikkerhet</a></p>
</div>
</div>
</section>

<section class="section">
<div class="wrap">
<div class="crosslink rv">
<div>
<h3 data-i18n="sw.tj_h">Trenger dere at Builtly tar hele oppdraget?</h3>
<p data-i18n="sw.tj_p">{_html.escape(I18N['no']['sw.tj_p'])}</p>
</div>
<a href="/tjenester.html" class="btn btn-ghost"><span data-i18n="sw.tj_cta">Se våre rådgivertjenester</span> <span class="arr">→</span></a>
</div>
</div>
</section>

<section class="section section-dark">
<div class="wrap">
<div class="cta-grid">
<div class="rv">
<h2 class="dpy-2" data-i18n="sw.cta_h2">Se softwaren på et eget prosjekt.</h2>
<p class="lead on-dark" style="margin-top:24px;max-width:52ch" data-i18n="sw.cta_lede">{_html.escape(I18N['no']['sw.cta_lede'])}</p>
<div class="cta-actions">
<a href="/bli-kunde.html" class="btn btn-light"><span data-i18n="sw.cta1">Be om demo</span> <span class="arr">→</span></a>
<a href="https://portal.builtly.ai" class="btn btn-dark-ghost"><span data-i18n="nav.login">Logg inn</span></a>
</div>
</div>
<div class="cta-side rv">
<div class="row" style="border-top-color:var(--dark-paper)"><span class="k" style="color:rgba(247,244,237,0.6)" data-i18n="sw.side4k">Tilgang</span><span class="v" style="color:var(--dark-paper)" data-i18n="sw.side4v">Lisens per modul</span></div>
<div class="row" style="border-top-color:var(--line-dark)"><span class="k" style="color:rgba(247,244,237,0.6)" data-i18n="sw.cta_r2k">Onboarding</span><span class="v" style="color:var(--dark-paper)" data-i18n="sw.cta_r2v">Samme dag</span></div>
<div class="row" style="border-top-color:var(--line-dark)"><span class="k" style="color:rgba(247,244,237,0.6)" data-i18n="sw.cta_r3k">Pilot</span><span class="v" style="color:var(--dark-paper)" data-i18n="sw.cta_r3v">På eget prosjekt</span></div>
</div>
</div>
</div>
</section>
</main>"""

    t("sw.eyebrow", "Builtly Software", "Builtly Software")
    t("sw.side1k", "Moduler", "Modules")
    t("sw.side1v", "15+ i drift", "15+ in operation")
    t("sw.side2k", "BIM", "BIM")
    t("sw.side3k", "Regelverk", "Frameworks")
    t("sw.side3v", "7 jurisdiksjoner", "7 jurisdictions")
    t("sw.side4k", "Tilgang", "Access")
    t("sw.side4v", "Lisens per modul", "Licence per module")
    t("sw.cta_r2k", "Onboarding", "Onboarding")
    t("sw.cta_r2v", "Samme dag", "Same day")
    t("sw.cta_r3k", "Pilot", "Pilot")
    t("sw.cta_r3v", "På eget prosjekt", "On your own project")

    return page(
        path="software.html",
        title="Builtly Software · Software utviklet gjennom faktiske prosjekter",
        title_key="sw.title",
        desc=I18N["no"]["sw.desc"],
        desc_key="sw.desc",
        active="software",
        body=body,
    )


# ============================================================================
# REFERANSER.HTML — anonymiserte leveranser (reelt, dokumentert arbeid)
# ============================================================================

REFERANSER = [
    dict(id=1,
         h=("Boligprosjekt, Trondheim — 93 boenheter", "Residential project, Trondheim — 93 units"),
         rolle=("BIM-kontroll · areal og yield · salgsstyring", "BIM control · area & yield · sales management"),
         d=("Kontroll av arkitektens IFC-modell mot tegninger, arealanalyse med BRA-i per enhet (4 278 m²), enhetsverifisering og løpende salgsoppfølging med takt målt mot mål.",
            "Control of the architect's IFC model against drawings, area analysis with BRA-i (internal usable area) per unit, unit verification and continuous sales follow-up with pace measured against target."),
         fakta=[("Prosjekttype", "Boligblokker, 3 bygg", "Project type", "Residential blocks, 3 buildings"),
                ("Builtlys rolle", "Analyse og salgsstyring", "Builtly's role", "Analysis and sales management"),
                ("Teknologi", "BIM-motor · Areal & yield · Salgskonsoll", "Technology", "BIM engine · Area & yield · Sales console")]),
    dict(id=2,
         h=("Boligprosjekt med næring — 63 boliger", "Mixed-use project — 63 homes"),
         rolle=("BIM-analyse · arealmåling · enhetsverifisering", "BIM analysis · area measurement · unit verification"),
         d=("Modellen manglet romobjekter helt. Boligareal, næring og parkering ble skilt og målt direkte av bygningsdelene, med hvert konkurrerende signal synlig — en feillesning skal kunne oppdages, aldri skjules.",
            "The model carried no room objects at all. Housing, commercial space and parking were separated and measured directly from the building elements, with every competing signal visible — a wrong reading must be discoverable, never hidden."),
         fakta=[("Prosjekttype", "Bolig, næring og parkering", "Project type", "Housing, commercial and parking"),
                ("Builtlys rolle", "Teknisk analyse", "Builtly's role", "Technical analysis"),
                ("Teknologi", "BIM-motor · arealanalyse", "Technology", "BIM engine · area analysis")]),
    dict(id=3,
         h=("Brannkonsept, boligblokk — byggetrinn 2", "Fire concept, residential block — stage 2"),
         rolle=("Brannteknisk tegningsproduksjon med fagkontroll", "Fire drawing production with professional control"),
         d=("Branncelleinndeling, rømningsveier og dørklasser avledet mot TEK17 kapittel 11 og tegnet som leveranseark med tittelfelt — kontrollert av brannrådgiver før bruk.",
            "Fire compartments, escape routes and door classes derived against the fire chapter of the building regulations and drawn as deliverable sheets with title blocks — controlled by a fire engineer before use."),
         fakta=[("Prosjekttype", "Boligblokk i byggetrinn", "Project type", "Residential block, staged"),
                ("Builtlys rolle", "Brannteknisk produksjon og kontroll", "Builtly's role", "Fire-engineering production and control"),
                ("Teknologi", "Brannmotor · TEK17 kap. 11", "Technology", "Fire engine · TEK17 ch. 11")]),
    dict(id=4,
         h=("Kystprosjekt — 153 leiligheter, samlemodell", "Coastal project — 153 apartments, federated model"),
         rolle=("Modellkontroll · samordning · enhetstelling", "Model control · coordination · unit counting"),
         d=("Kvalitetssikring av en 2,7 millioner linjers ArchiCAD-eksport uten romobjekter: terrenget ble skilt fra boligarealet, enhetene målt av dørsignaler i skillevegger, og fellesmodellen føderert i nettleseren.",
            "Quality assurance of a 2.7-million-line ArchiCAD export without room objects: terrain separated from housing area, units measured from door signals in party walls, and the federated model served in the browser."),
         fakta=[("Prosjekttype", "Leilighetsbygg, flere trinn", "Project type", "Apartment buildings, several stages"),
                ("Builtlys rolle", "Modell-KS og samordning", "Builtly's role", "Model QA and coordination"),
                ("Teknologi", "BIM-motor · samordningsmodell", "Technology", "BIM engine · federated model")]),
    dict(id=5,
         h=("Boligfelt — salg og marked, 19 enheter", "Housing development — sales & marketing, 19 units"),
         rolle=("Salgskonsoll · prosjektnettside · prospekt", "Sales console · project website · prospectus"),
         d=("Landingsside på prosjektets eget domene, bla-bart prospekt, interessentregistrering med samtykke, meglervarsling og fredagsrapport til utbygger — salgsgrad og takt målt løpende.",
            "Landing page on the project's own domain, browsable prospectus, consent-based prospect registration, broker alerts and a Friday report to the developer — sales rate and pace measured continuously."),
         fakta=[("Prosjekttype", "Rekkehus, leiligheter og eneboliger", "Project type", "Row houses, apartments and detached homes"),
                ("Builtlys rolle", "Salgs- og markedsstøtte", "Builtly's role", "Sales and marketing support"),
                ("Teknologi", "Salgskonsoll · landingssider", "Technology", "Sales console · landing pages")]),
    dict(id=6,
         h=("Anbudsrom — totalentreprise", "Tender room — design & build contract"),
         rolle=("Anbudsgrunnlag · oversendelser · tilbudsmottak", "Tender basis · transmittals · bid intake"),
         d=("Anbudsgrunnlag bygget av prosjekthotellets mapper med frosne revisjoner, oversendt hver tilbyder med personlig lenke og kvittering — og anonym spørsmål/svar-runde med svar publisert til alle.",
            "Tender basis built from the project hotel's folders with frozen revisions, transmitted to each bidder with a personal link and receipt — and an anonymous Q&A round with answers published to all."),
         fakta=[("Prosjekttype", "Totalentreprise, bolig", "Project type", "Design & build, residential"),
                ("Builtlys rolle", "Anbudsprosess-støtte", "Builtly's role", "Tender-process support"),
                ("Teknologi", "Prosjekthotell · anbudsrom", "Technology", "Project hotel · tender rooms")]),
]


def referanser_side():
    t("ref.title", "Referanser · Builtly", "References · Builtly")
    t("ref.desc",
      "Utvalgte leveranser fra Builtlys rådgivere og teknologi — anonymisert etter avtale. Referanser med navn oppgis ved forespørsel.",
      "Selected deliveries from Builtly's consultants and technology — anonymised by agreement. Named references available on request.")
    t("ref.h1", "Referanser.", "References.")
    t("ref.lede",
      "Utvalgte leveranser der Builtlys rådgivere og teknologi har vært i arbeid på faktiske prosjekter. Flere av kundene våre har bedt om at bruken ikke omtales offentlig — prosjektene under er derfor anonymisert, og referanser med navn og kontaktperson oppgis ved forespørsel.",
      "Selected deliveries where Builtly's consultants and technology have been at work on real projects. Several of our customers have asked that their use remain off the public record — the projects below are therefore anonymised, and named references with a contact person are available on request.")
    t("ref.s01", "Leveranser", "Deliveries")
    t("ref.s01tag", "Anonymisert etter avtale", "Anonymised by agreement")
    t("ref.be_om", "Be om navngitte referanser", "Request named references")
    t("ref.merk",
      "Referansene over beskriver dokumentert arbeid på reelle prosjekter. Navn, tall og kontaktpersoner deles i dialog — ikke på en nettside.",
      "The references above describe documented work on real projects. Names, figures and contact persons are shared in dialogue — not on a web page.")

    kort = []
    for r in REFERANSER:
        i = r["id"]
        kh = t(f"ref.p{i}.h", r["h"][0], r["h"][1])
        kr = t(f"ref.p{i}.r", r["rolle"][0], r["rolle"][1])
        kd = t(f"ref.p{i}.d", r["d"][0], r["d"][1])
        fakta = []
        for j, (fk_no, fv_no, fk_en, fv_en) in enumerate(r["fakta"], 1):
            kfk = t(f"ref.p{i}.f{j}k", fk_no, fk_en)
            kfv = t(f"ref.p{i}.f{j}v", fv_no, fv_en)
            fakta.append(f'<div class="frow"><span class="fk" data-i18n="{kfk}">{_html.escape(fk_no)}</span><span class="fv" data-i18n="{kfv}">{_html.escape(fv_no)}</span></div>')
        kort.append(f"""<article class="refcard rv">
<div class="rhead"><span class="rnum">{i:02d}</span><span class="rrole" data-i18n="{kr}">{_html.escape(r['rolle'][0])}</span></div>
<h3 data-i18n="{kh}">{_html.escape(r['h'][0])}</h3>
<p data-i18n="{kd}">{_html.escape(r['d'][0])}</p>
<div class="rfakta">
{chr(10).join(fakta)}
</div>
</article>""")

    extra_css = """
.refgrid{display:grid;grid-template-columns:repeat(2,1fr);gap:1px;background:var(--line-strong);border:1px solid var(--line-strong)}
@media (max-width:900px){.refgrid{grid-template-columns:1fr}}
.refcard{background:var(--bg);padding:clamp(26px,3.2vw,40px);display:flex;flex-direction:column}
.refcard .rhead{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:16px;font-family:var(--font-mono);font-size:11px;text-transform:uppercase;letter-spacing:0.14em}
.refcard .rnum{color:var(--accent);font-weight:600}
.refcard .rrole{color:var(--mid);text-align:right}
.refcard h3{font-size:clamp(19px,2vw,25px);margin-bottom:12px}
.refcard p{margin:0;color:var(--ink-soft);font-size:15px;line-height:1.55;flex-grow:1;max-width:60ch}
.refcard .rfakta{margin-top:22px;border-top:1px solid var(--line);padding-top:6px}
.refcard .frow{display:flex;justify-content:space-between;gap:16px;padding:8px 0;border-bottom:1px solid var(--line);font-size:13px}
.refcard .frow:last-child{border-bottom:0}
.refcard .fk{font-family:var(--font-mono);font-size:10.5px;text-transform:uppercase;letter-spacing:0.14em;color:var(--mid);white-space:nowrap}
.refcard .fv{font-family:var(--font-display);font-weight:600;color:var(--ink);text-align:right}
"""

    body = f"""<main>
<section class="p-hero">
<div class="wrap">
<div class="p-hero-grid">
<div>
<div class="eyebrow"><span class="accent-dot"></span><span data-i18n="ref.eyebrow">Builtly · Referanser</span></div>
<h1 class="dpy-1" data-i18n="ref.h1">Referanser.</h1>
<p class="lead" data-i18n="ref.lede">{_html.escape(I18N['no']['ref.lede'])}</p>
<div class="p-hero-actions">
<a href="mailto:sales@builtly.ai?subject=Referanseforesp%C3%B8rsel" class="btn"><span data-i18n="ref.be_om">Be om navngitte referanser</span> <span class="arr">→</span></a>
</div>
</div>
<div class="p-side">
<div class="row"><span class="k" data-i18n="ref.side1k">Prosjekter i aktiv leveranse</span><span class="v">8+</span></div>
<div class="row"><span class="k" data-i18n="ref.side2k">Navngivning</span><span class="v" data-i18n="ref.side2v">Ved forespørsel</span></div>
<div class="row"><span class="k" data-i18n="ref.side3k">Omfang</span><span class="v" data-i18n="ref.side3v">Rådgivning + software</span></div>
</div>
</div>
</div>
</section>

<section class="section">
<div class="wrap">
<div class="smark"><span class="num">§ 01</span><span data-i18n="ref.s01">Leveranser</span><span class="dash"></span><span data-i18n="ref.s01tag">Anonymisert etter avtale</span></div>
<div class="refgrid">
{chr(10).join(kort)}
</div>
<p class="lead" style="margin-top:clamp(28px,4vh,40px);max-width:70ch;font-size:15px" data-i18n="ref.merk">{_html.escape(I18N['no']['ref.merk'])}</p>
</div>
</section>

<section class="section section-dark">
<div class="wrap">
<div class="cta-grid">
<div class="rv">
<h2 class="dpy-2" data-i18n="tj.felles.cta_h2">Be om tilbud.</h2>
<p class="lead on-dark" style="margin-top:24px;max-width:52ch" data-i18n="tj.felles.cta_lede">{_html.escape(I18N['no']['tj.felles.cta_lede'])}</p>
<div class="cta-actions">
<a href="/bli-kunde.html" class="btn btn-light"><span data-i18n="tj.felles.cta_tilbud">Be om tilbud</span> <span class="arr">→</span></a>
<a href="mailto:sales@builtly.ai" class="btn btn-dark-ghost">sales@builtly.ai</a>
</div>
</div>
<div class="cta-side rv">
<div class="row" style="border-top-color:var(--dark-paper)"><span class="k" style="color:rgba(247,244,237,0.6)" data-i18n="tj.felles.svar_k">Svar på forespørsel</span><span class="v" style="color:var(--dark-paper)" data-i18n="tj.felles.svar_v">Innen én virkedag</span></div>
<div class="row" style="border-top-color:var(--line-dark)"><span class="k" style="color:rgba(247,244,237,0.6)" data-i18n="ref.side2k">Navngivning</span><span class="v" style="color:var(--dark-paper)" data-i18n="ref.side2v">Ved forespørsel</span></div>
</div>
</div>
</div>
</section>
</main>"""

    t("ref.eyebrow", "Builtly · Referanser", "Builtly · References")
    t("ref.side1k", "Prosjekter i aktiv leveranse", "Projects in active delivery")
    t("ref.side2k", "Navngivning", "Naming")
    t("ref.side2v", "Ved forespørsel", "On request")
    t("ref.side3k", "Omfang", "Scope")
    t("ref.side3v", "Rådgivning + software", "Consulting + software")

    return page(
        path="referanser.html",
        title="Referanser · Builtly",
        title_key="ref.title",
        desc=I18N["no"]["ref.desc"],
        desc_key="ref.desc",
        active="referanser",
        body=body,
        extra_css=extra_css,
    )


# ============================================================================
# SLIK-JOBBER-VI.HTML — de tre leveransemodellene
# ============================================================================

def slik_jobber_vi():
    t("sjv.title", "Slik jobber vi · Builtly", "How we work · Builtly")
    t("sjv.desc",
      "Builtly kan gjøre jobben for deg — eller gi deg teknologien til å gjøre den selv. Tre leveransemodeller: rådgiveroppdrag, software og kombinert leveranse.",
      "Builtly can do the job for you — or give you the technology to do it yourself. Three delivery models: consulting engagement, software, and combined delivery.")
    t("sjv.h1", "Builtly kan gjøre jobben for deg — eller gi deg teknologien til å gjøre den selv.",
      "Builtly can do the job for you — or give you the technology to do it yourself.")
    t("sjv.lede",
      "Ett Builtly, to forretningsområder — og en kombinasjon når prosjektet krever det. Her er de tre måtene markedet bruker oss på, og prinsippene som gjelder uansett modell.",
      "One Builtly, two business areas — and a combination when the project requires it. These are the three ways the market uses us, and the principles that apply in every model.")
    t("sjv.m1.h", "01 · Builtly som rådgiver", "01 · Builtly as your consultant")
    t("sjv.m1.p",
      "Kunden kjøper en vanlig rådgiverleveranse. Builtlys ingeniører deltar i møter, prosjekterer, gjør faglige vurderinger, koordinerer, kvalitetssikrer, signerer og følger opp prosjektet. Du behøver ikke kjøpe software eller endre arbeidsmåte.",
      "You buy a normal consulting delivery. Builtly's engineers attend meetings, design, make professional judgements, coordinate, quality-assure, sign and follow up the project. You do not need to buy software or change how you work.")
    t("sjv.m1.cta", "Se rådgivertjenestene", "See the consulting services")
    t("sjv.m2.h", "02 · Dere bruker softwaren selv", "02 · You use the software yourself")
    t("sjv.m2.p",
      "Kunden eller samarbeidspartneren bruker Builtlys moduler i egen organisasjon og på egne prosjekter — kart og analyse, ingeniørfag, økonomi, salg, samhandling og finans. Tilgang og lisens avtales per modul.",
      "The customer or partner uses Builtly's modules in their own organisation and on their own projects — maps and analysis, engineering, economics, sales, collaboration and finance. Access and licensing are agreed per module.")
    t("sjv.m2.cta", "Se softwareområdet", "See the software area")
    t("sjv.m3.h", "03 · Kombinert leveranse", "03 · Combined delivery")
    t("sjv.m3.p",
      "Dere bruker Builtly-modulen selv — og Builtly bistår med faglig vurdering, kontrollerer eller ferdigstiller leveransen, og tar ansvar og signerer når det er avtalt. Omfanget avtales per leveranse, så dere betaler for fagbistanden dere faktisk trenger.",
      "You use the Builtly module yourself — and Builtly assists with professional assessment, controls or completes the deliverable, and takes responsibility and signs where agreed. The scope is agreed per deliverable, so you pay for exactly the professional assistance you need.")
    t("sjv.m3.cta", "Be om tilbud", "Request a quote")
    t("sjv.s02", "Prinsipper", "Principles")
    t("sjv.s02tag", "Gjelder alle modellene", "Apply in every model")
    t("sjv.s02h2", "Prinsippene som ikke forhandles.", "The principles that are not negotiable.")
    t("sjv.p1.t", "Ingeniøren har det faglige ansvaret", "The engineer holds the professional responsibility")
    t("sjv.p1.d",
      "Builtlys ingeniører har det faglige ansvaret og leverer oppdraget. Vår banebrytende software brukes som et verktøy i prosjekteringen der den gir bedre kvalitet, sporbarhet og arbeidsflyt — vurderingene, koordineringen og signaturen er ingeniørens.",
      "Builtly's engineers hold the professional responsibility and deliver the engagement. Our groundbreaking software is used as a tool in the design work where it improves quality, traceability and workflow — the judgements, the coordination and the signature belong to the engineer.")
    t("sjv.p2.t", "Redigerbare fagformater, alltid", "Editable discipline formats, always")
    t("sjv.p2.d",
      "Leveransen er aldri bare en rapport: oppdatert IFC, fagmodell, tegninger som DWG/DXF, avvik som BCF og mengder etter NS 3420 — formater dere kan arbeide videre i.",
      "The delivery is never just a report: updated IFC, discipline model, drawings as DWG/DXF, deviations as BCF and quantities to NS 3420 — formats you can keep working in.")
    t("sjv.p3.t", "Der underlaget er tvetydig, gjettes det aldri", "Where the basis is ambiguous, we never guess")
    t("sjv.p3.d",
      "Målinger og vurderinger dokumenteres med kilde og forbehold. Et ærlig «dette må avklares» er verdt mer enn et pent tall ingen kan stole på.",
      "Measurements and assessments are documented with source and reservations. An honest “this needs clarification” is worth more than a pretty number no one can trust.")
    t("sjv.p4.t", "Sporbarhet fra underlag til leveranse", "Traceability from input to delivery")
    t("sjv.p4.d",
      "Hver leveranse kan spores tilbake til underlaget, beregningene og den som har kontrollert og signert — med revisjoner, kvitteringer og komplett historikk.",
      "Every delivery traces back to the input, the calculations and the person who controlled and signed — with revisions, receipts and a complete history.")
    t("sjv.garanti_h", "Når vi både samarbeider og konkurrerer", "When we both collaborate and compete")
    t("sjv.garanti_p",
      "Builtly selger software til rådgivermiljøer — og tar samtidig egne rådgiveroppdrag. Derfor er skillet absolutt: Builtly Engineering har ikke tilgang til softwarekunders prosjekter uten at kunden uttrykkelig inviterer Builtly inn eller bestiller en rådgivertjeneste. Softwarekunders kunder, prosjektinformasjon og bruksmønstre benyttes ikke til salg eller konkurrerende tilbud. Kunden eier dataene, og prosjektdata brukes ikke til modelltrening.",
      "Builtly sells software to consultancies — and takes on consulting engagements of its own. That is why the separation is absolute: Builtly Engineering has no access to software customers' projects unless the customer explicitly invites Builtly in or orders a consulting service. Software customers' clients, project information and usage patterns are not used for sales or competing bids. The customer owns the data, and project data is never used to train models.")
    t("sjv.prosess_h2", "Fra forespørsel til leveranse.", "From inquiry to delivery.")
    t("sjv.pr1.n", "Forespørsel", "Inquiry")
    t("sjv.pr1.d", "Beskriv prosjektet — vi svarer innen én virkedag.", "Describe the project — we respond within one business day.")
    t("sjv.pr2.n", "Tilbud", "Quote")
    t("sjv.pr2.d", "Konkret tilbud som navngir ansvarlig og fagansvarlig.", "A concrete quote naming the responsible engineer and discipline lead.")
    t("sjv.pr3.n", "Leveranse", "Delivery")
    t("sjv.pr3.d", "Prosjektering, koordinering og kvalitetssikring.", "Design, coordination and quality assurance.")
    t("sjv.pr4.n", "Oppfølging", "Follow-up")
    t("sjv.pr4.d", "Vi følger prosjektet gjennom utførelse og overtakelse.", "We follow the project through construction and handover.")

    modeller = []
    for i, (h_key, p_key, cta_key, href) in enumerate([
        ("sjv.m1.h", "sjv.m1.p", "sjv.m1.cta", "/tjenester.html"),
        ("sjv.m2.h", "sjv.m2.p", "sjv.m2.cta", "/software.html"),
        ("sjv.m3.h", "sjv.m3.p", "sjv.m3.cta", "/bli-kunde.html"),
    ], 1):
        modeller.append(f"""<a href="{href}" class="card rv">
<div class="head"><span>{i:02d}</span><span class="topic" data-i18n="sjv.modell_tag">Leveransemodell</span></div>
<h3 data-i18n="{h_key}">{_html.escape(I18N['no'][h_key])}</h3>
<p data-i18n="{p_key}">{_html.escape(I18N['no'][p_key])}</p>
<div class="foot"><span data-i18n="{cta_key}">{_html.escape(I18N['no'][cta_key])}</span><span class="go">→</span></div>
</a>""")

    prinsipper = []
    for i in range(1, 5):
        prinsipper.append(
            f'<li class="rv"><span class="n">{i:02d}</span><div><div class="t" data-i18n="sjv.p{i}.t">{_html.escape(I18N["no"][f"sjv.p{i}.t"])}</div>'
            f'<div class="d" data-i18n="sjv.p{i}.d">{_html.escape(I18N["no"][f"sjv.p{i}.d"])}</div></div></li>')

    prosess = []
    for i in range(1, 5):
        prosess.append(
            f'<div class="phase rv"><div class="ix">Steg {i:02d}</div><div class="nm" data-i18n="sjv.pr{i}.n">{_html.escape(I18N["no"][f"sjv.pr{i}.n"])}</div>'
            f'<div class="ds" data-i18n="sjv.pr{i}.d">{_html.escape(I18N["no"][f"sjv.pr{i}.d"])}</div></div>')

    body = f"""<main>
<section class="p-hero">
<div class="wrap">
<div class="p-hero-grid">
<div>
<div class="eyebrow"><span class="accent-dot"></span><span data-i18n="sjv.eyebrow">Builtly · Slik jobber vi</span></div>
<h1 class="dpy-2" style="margin-top:18px;letter-spacing:-0.012em;line-height:1.14" data-i18n="sjv.h1">Builtly kan gjøre jobben for deg — eller gi deg teknologien til å gjøre den selv.</h1>
<p class="lead" data-i18n="sjv.lede">{_html.escape(I18N['no']['sjv.lede'])}</p>
</div>
<div class="p-side">
<div class="row"><span class="k" data-i18n="sjv.side1k">Forretningsområder</span><span class="v" data-i18n="sjv.side1v">Rådgivning + software</span></div>
<div class="row"><span class="k" data-i18n="sjv.side2k">Kombinert leveranse</span><span class="v" data-i18n="sjv.side2v">Avtales per leveranse</span></div>
<div class="row"><span class="k" data-i18n="tj.felles.svar_k">Svar på forespørsel</span><span class="v" data-i18n="tj.felles.svar_v">Innen én virkedag</span></div>
</div>
</div>
</div>
</section>

<section class="section">
<div class="wrap">
<div class="smark"><span class="num">§ 01</span><span data-i18n="sjv.s01">Tre modeller</span><span class="dash"></span><span data-i18n="sjv.s01tag">Slik bruker markedet oss</span></div>
<div class="cardgrid c3">
{chr(10).join(modeller)}
</div>
</div>
</section>

<section class="section section-soft">
<div class="wrap">
<div class="smark"><span class="num">§ 02</span><span data-i18n="sjv.s02">Prinsipper</span><span class="dash"></span><span data-i18n="sjv.s02tag">Gjelder alle modellene</span></div>
<h2 class="dpy-3 rv" data-i18n="sjv.s02h2">Prinsippene som ikke forhandles.</h2>
<ul class="dlist" style="margin-top:clamp(28px,4vh,44px)">
{chr(10).join(prinsipper)}
</ul>
</div>
</section>

<section class="quiet-strip">
<div class="wrap">
<div class="inner">
<span class="mark" data-i18n="sjv.garanti_h">Når vi både samarbeider og konkurrerer</span>
<p><span data-i18n="sjv.garanti_p">{_html.escape(I18N['no']['sjv.garanti_p'])}</span><br/><a href="/trust.html" class="link-line" style="font-size:14px" data-i18n="sw.garanti_lenke">Les mer under Trust &amp; sikkerhet</a></p>
</div>
</div>
</section>

<section class="section">
<div class="wrap">
<div class="smark"><span class="num">§ 03</span><span data-i18n="sjv.s03">Prosess</span><span class="dash"></span><span data-i18n="sjv.s03tag">Fire steg</span></div>
<h2 class="dpy-3 rv" data-i18n="sjv.prosess_h2">Fra forespørsel til leveranse.</h2>
<div class="phases" style="margin-top:clamp(28px,4vh,44px)">
{chr(10).join(prosess)}
</div>
</div>
</section>

<section class="section section-dark">
<div class="wrap">
<div class="cta-grid">
<div class="rv">
<h2 class="dpy-2" data-i18n="tj.felles.cta_h2">Be om tilbud.</h2>
<p class="lead on-dark" style="margin-top:24px;max-width:52ch" data-i18n="tj.felles.cta_lede">{_html.escape(I18N['no']['tj.felles.cta_lede'])}</p>
<div class="cta-actions">
<a href="/bli-kunde.html" class="btn btn-light"><span data-i18n="tj.felles.cta_tilbud">Be om tilbud</span> <span class="arr">→</span></a>
<a href="mailto:sales@builtly.ai" class="btn btn-dark-ghost">sales@builtly.ai</a>
</div>
</div>
<div class="cta-side rv">
<div class="row" style="border-top-color:var(--dark-paper)"><span class="k" style="color:rgba(247,244,237,0.6)" data-i18n="tj.felles.svar_k">Svar på forespørsel</span><span class="v" style="color:var(--dark-paper)" data-i18n="tj.felles.svar_v">Innen én virkedag</span></div>
<div class="row" style="border-top-color:var(--line-dark)"><span class="k" style="color:rgba(247,244,237,0.6)" data-i18n="sjv.side2k">Kombinert leveranse</span><span class="v" style="color:var(--dark-paper)" data-i18n="sjv.side2v">Avtales per leveranse</span></div>
</div>
</div>
</div>
</section>
</main>"""

    t("sjv.eyebrow", "Builtly · Slik jobber vi", "Builtly · How we work")
    t("sjv.modell_tag", "Leveransemodell", "Delivery model")
    t("sjv.s01", "Tre modeller", "Three models")
    t("sjv.s01tag", "Slik bruker markedet oss", "How the market uses us")
    t("sjv.s03", "Prosess", "Process")
    t("sjv.s03tag", "Fire steg", "Four steps")
    t("sjv.side1k", "Forretningsområder", "Business areas")
    t("sjv.side1v", "Rådgivning + software", "Consulting + software")
    t("sjv.side2k", "Kombinert leveranse", "Combined delivery")
    t("sjv.side2v", "Avtales per leveranse", "Agreed per deliverable")

    return page(
        path="slik-jobber-vi.html",
        title="Slik jobber vi · Builtly",
        title_key="sjv.title",
        desc=I18N["no"]["sjv.desc"],
        desc_key="sjv.desc",
        active="metode",
        body=body,
    )


# ============================================================================
# KJØR
# ============================================================================

def main():
    sider = [tjenester_oversikt(), software_side(), referanser_side(), slik_jobber_vi()]
    sider += [fagside(f) for f in FAG]

    os.makedirs(os.path.join(ROT, "tjenester"), exist_ok=True)
    for s in sider:
        full = os.path.join(ROT, s["path"])
        with open(full, "w", encoding="utf-8") as fh:
            fh.write(s["html"])
        print(f"skrev {s['path']} ({len(s['html'])} tegn)")

    spleis_i18n()
    print(f"nøkler: no={len(I18N['no'])} en={len(I18N['en'])} sv={len(I18N['sv'])} da={len(I18N['da'])} fi={len(I18N['fi'])} de={len(I18N['de'])}")


MARK_START = "  // === REPOSITION-2026 START (generert av tools/lag_sider.py) ==="
MARK_SLUTT = "  // === REPOSITION-2026 SLUTT ==="


def spleis_i18n():
    """Skriv reposisjonerings-laget inn i i18n.js som SISTE Object.assign-lag.

    Laget må assignes ETTER BUILTLY_INDUSTRIES_HERO_REFINEMENT — da vinner det
    over både duplikatblokkene i T og industries-COPY/REFINEMENT-lagene
    (lag-rekkefølge-fella dokumentert i i18n.js). Idempotent: eksisterende
    blokk mellom markørene erstattes.
    """
    frag = [MARK_START,
            "  // Tjenester/software/referanser/slik-jobber-vi + ny nav/footer + forsiden",
            "  // + reposisjonerings-overstyringer. Endre i GENERATOREN, aldri her.",
            "  const BUILTLY_REPOSITION_2026 = {"]
    for lang in ["en", "no", "sv", "da", "fi", "de"]:
        frag.append(f"    {lang}: {{")
        for k in sorted(I18N[lang]):
            frag.append(f"      {json.dumps(k)}: {json.dumps(I18N[lang][k], ensure_ascii=False)},")
        frag.append("    },")
    frag += ["  };",
             "  Object.keys(BUILTLY_REPOSITION_2026).forEach(function(lang){",
             "    if (!T[lang]) return;",
             "    Object.assign(T[lang], BUILTLY_REPOSITION_2026[lang]);",
             "  });",
             MARK_SLUTT]
    blokk = "\n".join(frag)

    sti = os.path.join(ROT, "i18n.js")
    src = open(sti, encoding="utf-8").read()
    if MARK_START in src:
        i = src.index(MARK_START)
        j = src.index(MARK_SLUTT) + len(MARK_SLUTT)
        src = src[:i] + blokk + src[j:]
    else:
        anker = ("  Object.keys(BUILTLY_INDUSTRIES_HERO_REFINEMENT).forEach(function(lang){\n"
                 "    T[lang] = T[lang] || {};\n"
                 "    Object.assign(T[lang], BUILTLY_INDUSTRIES_HERO_REFINEMENT[lang]);\n"
                 "  });\n")
        assert src.count(anker) == 1, "fant ikke entydig innsettingspunkt i i18n.js"
        src = src.replace(anker, anker + "\n" + blokk + "\n", 1)
    open(sti, "w", encoding="utf-8").write(src)
    print(f"spleiset i18n-laget inn i i18n.js ({len(blokk)} tegn)")


if __name__ == "__main__":
    main()
