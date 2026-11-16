#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Generator for de nye sidene på www.builtly.ai (lanseringen november 2026).

Kjør fra repo-rot:  python3 tools/nettsted/lag.py
Sjekk uten å skrive: python3 tools/nettsted/lag.py --sjekk

Kildene ligger her i tools/nettsted/:
  sider/<navn>.html      innholdet i <main>, på norsk. Første linje er en kommentar med
                         ut, meny, kanonisk, tittel og beskrivelse.
  sider/<navn>.en.json   engelsk for hver nøkkel på siden, og _tittel og _beskrivelse.
  felles.en.json         engelsk for menyen og bunnteksten.
  nettsted.css, .js      kopieres til /nettsted.css og /nettsted.js.
  software.css           stilen for softwaresidene (meta: stil: software), kopieres til /software.css.
  vindu.js               modullinja, produktvinduene og interesseskjemaet på softwaresidene.
  tomt.js                regnemotoren bak produktdemoene. Test: node tools/nettsted/test_tomt.mjs
  kart.js                det tegnede eksempelkartet demoene bruker, i 2D og 3D.
  autoplan.js, studie.js demoene av Autoplan (Maps) og Mulighetsstudie. De bruker tomt.js og kart.js.

Softwaresidene deler tre biter som lages her, så de er like på alle sidene:
  {{MODULER:<modul>}}    modullinja i toppen, med den aktive modulen markert (tom = ingen aktiv).
  {{MODLINJE:<modul>}}   den smale linja som kommer fram når toppen er rullet forbi.
  {{INTERESSE:<modul>}}  interesseskjemaet, med modulen haket av på forhånd.
Tekstene i dem har nøkler under ns.sw. og engelsk i felles.en.json.

Tekst som skal oversettes, har data-i18n-html="ns.<side>.<nr>". Norsk står inline i
HTML-en og hentes derfra, så norsk finnes bare ett sted. i18n.js faller tilbake til
engelsk når en nøkkel mangler på norsk, derfor skrives hver nøkkel på begge språk i
blokken NETTSTED-2026 i i18n.js. Generatoren stopper hvis en nøkkel mangler engelsk,
hvis en engelsk nøkkel ikke brukes, eller hvis to elementer har samme nøkkel.

Gamle sider som ikke lages her, får ny meny og bunntekst med tools/bytt_meny.py.
"""
import html
import json
import pathlib
import re
import sys
from html.parser import HTMLParser

ROT = pathlib.Path(__file__).resolve().parents[2]
HER = pathlib.Path(__file__).resolve().parent
VERSJON = "20261115-1"
SITE = "https://www.builtly.ai"
PORTAL = "https://portal.builtly.ai"

CHEV = '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 4.5l3 3 3-3"/></svg>'
TOMME = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"}


# ---------------------------------------------------------------------------
# Nøkler: finn hvert element med data-i18n-html og hent den norske teksten inline
# ---------------------------------------------------------------------------
class Nokler(HTMLParser):
    def __init__(self, tekst):
        super().__init__(convert_charrefs=False)
        self.tekst = tekst
        self.linjer = [0]
        for linje in tekst.splitlines(keepends=True):
            self.linjer.append(self.linjer[-1] + len(linje))
        self.stabel = []  # (tag, nøkkel, start på innholdet)
        self.funn = []  # (nøkkel, norsk innerHTML)
        self.feil = []

    def pos(self):
        linje, kol = self.getpos()
        return self.linjer[linje - 1] + kol

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        for navn, verdi in attrs:
            if navn.startswith("data-i18n-attr-"):
                self.funn.append((verdi, html.unescape(a.get(navn[len("data-i18n-attr-"):], "")).strip()))
        if tag in TOMME:
            return
        nokkel = a.get("data-i18n-html")
        if nokkel and any(n for _, n, _ in self.stabel if n):
            self.feil.append(f"{nokkel} ligger inne i en annen nøkkel")
        start = self.pos() + len(self.get_starttag_text())
        self.stabel.append((tag, nokkel, start))

    def handle_endtag(self, tag):
        if tag in TOMME:
            return
        while self.stabel:
            t, nokkel, start = self.stabel.pop()
            if nokkel:
                self.funn.append((nokkel, self.tekst[start:self.pos()].strip()))
            if t == tag:
                break


def nokler(tekst, hvor):
    p = Nokler(tekst)
    p.feed(tekst)
    p.close()
    ut = {}
    for k, v in p.funn:
        if k in ut and ut[k] != v:
            p.feil.append(f"{k} brukes to ganger med ulik tekst")
        ut[k] = v
    if p.feil:
        sys.exit(f"{hvor}: " + "; ".join(p.feil))
    return ut


# ---------------------------------------------------------------------------
# Meny og bunntekst (felles for alle nye sider)
# ---------------------------------------------------------------------------
def k(nokkel, norsk, tag="span", attr=""):
    return f'<{tag}{attr} data-i18n-html="ns.{nokkel}">{norsk}</{tag}>'


def meny(aktiv):
    def on(m):
        return ' class="on"' if aktiv == m else ""

    return f"""<header class="nav">
  <div class="w nav-in">
    <a class="logo" href="/" aria-label="Builtly"><span class="logo-mark"></span>Builtly</a>
    <nav class="nav-links" aria-label="Hovedmeny" data-i18n-attr-aria-label="ns.nav.hovedmeny">
      <div class="dd">
        <a class="dd-lenke{' on' if aktiv == 'radgivning' else ''}" href="/tjenester" data-i18n-html="ns.nav.rad">Rådgivning</a><button class="dd-btn" type="button" aria-expanded="false" aria-controls="dd-rad" aria-label="Vis fagene" data-i18n-attr-aria-label="ns.nav.rad.vis">{CHEV}</button>
        <div class="dd-panel" id="dd-rad">
          <a class="dd-i" href="/tjenester/geoteknikk"><span class="k">RIG</span>{k('nav.geo', 'Geoteknikk', 'b')}{k('nav.geo.t', 'Grunnforhold, fundamentering, stabilitet og rapportering')}</a>
          <a class="dd-i" href="/tjenester/konstruksjon"><span class="k">RIB</span>{k('nav.rib', 'Konstruksjon', 'b')}{k('nav.rib.t', 'Bæresystem, dimensjonering og konstruktive vurderinger')}</a>
          <a class="dd-i" href="/tjenester/bygningsfysikk"><span class="k">RIByfy</span>{k('nav.fy', 'Bygningsfysikk', 'b')}{k('nav.fy.t', 'Energi, fukt, lufttetthet og klimaskjerm')}</a>
          <a class="dd-i" href="/uavhengig-kontroll"><span class="k">UAK</span><b><span data-i18n-html="ns.nav.uak">Uavhengig kontroll</span><i class="ny" data-i18n-html="ns.nav.ny">NY</i></b>{k('nav.uak.t', 'Tiltaksklasse 2, fast pris 20 000 kr per fag')}</a>
          <div class="dd-fot">{k('nav.rad.fot', 'Rådgivende ingeniører i Trondheim')}<a href="/tjenester" data-i18n-html="ns.nav.rad.alt">Alt om rådgivning →</a></div>
        </div>
      </div>
      <div class="dd">
        <a class="dd-lenke{' on' if aktiv == 'software' else ''}" href="/software">Software</a><button class="dd-btn" type="button" aria-expanded="false" aria-controls="dd-sw" aria-label="Vis modulene" data-i18n-attr-aria-label="ns.nav.sw.vis">{CHEV}</button>
        <div class="dd-panel" id="dd-sw">
          <a class="dd-i" href="/maps"><span class="k">01</span><b>Maps</b>{k('nav.maps.t', 'Alt om eiendommen, på ett sted')}</a>
          <a class="dd-i" href="/mulighetsstudie"><span class="k">02</span>{k('nav.ms', 'Mulighetsstudie', 'b')}{k('nav.ms.t', 'Hva tåler tomten?')}</a>
          <a class="dd-i" href="/prosjekthotell"><span class="k">03</span>{k('nav.ph', 'Prosjekthotell', 'b')}{k('nav.ph.t', 'Hele prosjektet i ett rom')}</a>
          <a class="dd-i" href="/salgskonsoll"><span class="k">04</span>{k('nav.sk', 'Salgskonsoll', 'b')}{k('nav.sk.t', 'Fra prosjekt til siste bolig solgt')}</a>
          <div class="dd-fot">{k('nav.sw.fot', 'Én plattform, fire moduler')}<a href="/software" data-i18n-html="ns.nav.sw.alt">Se hele løpet →</a></div>
        </div>
      </div>
      <a href="/about"{on('om')} data-i18n-html="ns.nav.om">Om Builtly</a>
      <a href="/contact"{on('kontakt')} data-i18n-html="ns.nav.kontakt">Kontakt</a>
    </nav>
    <div class="nav-cta">
      <span class="lang"><a href="?lang=no&amp;lang_src=manual" data-sprak="no" hreflang="no">NO</a> · <a href="?lang=en&amp;lang_src=manual" data-sprak="en" hreflang="en">EN</a></span>
      <a class="nav-login" href="{PORTAL}" data-i18n-html="ns.nav.login">Logg inn</a>
      <a class="btn" href="/contact"><span data-i18n-html="ns.nav.cta">Ta kontakt</span> <span aria-hidden="true">→</span></a>
      <button class="burger" type="button" aria-label="Meny" data-i18n-attr-aria-label="ns.nav.meny" aria-expanded="false" aria-controls="mm"><span></span><span></span><span></span></button>
    </div>
  </div>
  <div class="mm" id="mm">
    <div class="w mm-in">
      <div>{k('nav.rad.h', 'Rådgivning', 'h4')}
        <a href="/tjenester/geoteknikk"><span data-i18n-html="ns.nav.geo">Geoteknikk</span> <span>RIG</span></a>
        <a href="/tjenester/konstruksjon"><span data-i18n-html="ns.nav.rib">Konstruksjon</span> <span>RIB</span></a>
        <a href="/tjenester/bygningsfysikk"><span data-i18n-html="ns.nav.fy">Bygningsfysikk</span> <span>RIByfy</span></a>
        <a href="/uavhengig-kontroll"><span data-i18n-html="ns.nav.uak">Uavhengig kontroll</span> <span data-i18n-html="ns.nav.uak.pris">20 000 kr per fag</span></a>
        <a href="/tjenester"><span data-i18n-html="ns.nav.rad.alt2">Alt om rådgivning</span> <span>→</span></a></div>
      <div><h4>Software</h4>
        <a href="/software"><span data-i18n-html="ns.nav.sw.alt2">Hele løpet</span> <span data-i18n-html="ns.nav.sw.fire">Fire moduler</span></a>
        <a href="/maps">Maps <span data-i18n-html="ns.nav.fase1">01 Finn</span></a>
        <a href="/mulighetsstudie"><span data-i18n-html="ns.nav.ms">Mulighetsstudie</span> <span data-i18n-html="ns.nav.fase2">02 Vurder</span></a>
        <a href="/prosjekthotell"><span data-i18n-html="ns.nav.ph">Prosjekthotell</span> <span data-i18n-html="ns.nav.fase3">03 Utvikle</span></a>
        <a href="/salgskonsoll"><span data-i18n-html="ns.nav.sk">Salgskonsoll</span> <span data-i18n-html="ns.nav.fase4">04 Selg</span></a>
        <a href="/bli-kunde"><span data-i18n-html="ns.nav.demo">Book en demo</span> <span>→</span></a></div>
      <div><h4>Builtly</h4>
        <a href="/about"><span data-i18n-html="ns.nav.om">Om Builtly</span> <span></span></a>
        <a href="/contact"><span data-i18n-html="ns.nav.kontakt">Kontakt</span> <span data-i18n-html="ns.nav.ring">Ring eller skriv</span></a>
        <a href="{PORTAL}"><span data-i18n-html="ns.nav.login">Logg inn</span> <span>portal.builtly.ai</span></a>
        <a href="?lang=en&amp;lang_src=manual" data-sprak="en">English <span>EN</span></a>
        <a href="?lang=no&amp;lang_src=manual" data-sprak="no">Norsk <span>NO</span></a></div>
    </div>
  </div>
</header>"""


def bunntekst():
    return f"""<footer class="fot">
  <div class="w">
    <div class="fot-topp">
      <div>
        <a class="logo" href="/"><span class="logo-mark"></span>Builtly</a>
        {k('fot.tag', 'Fremtidens ingeniørselskap. Allerede her.', 'p', ' class="tag"')}
      </div>
      <div>{k('fot.rad', 'Rådgivning', 'h4')}<ul>
        <li><a href="/tjenester/geoteknikk" data-i18n-html="ns.nav.geo">Geoteknikk</a></li>
        <li><a href="/tjenester/konstruksjon" data-i18n-html="ns.nav.rib">Konstruksjon</a></li>
        <li><a href="/tjenester/bygningsfysikk" data-i18n-html="ns.nav.fy">Bygningsfysikk</a></li>
        <li><a href="/uavhengig-kontroll" data-i18n-html="ns.nav.uak">Uavhengig kontroll</a></li></ul></div>
      <div><h4>Software</h4><ul>
        <li><a href="/maps">Maps</a></li>
        <li><a href="/mulighetsstudie" data-i18n-html="ns.nav.ms">Mulighetsstudie</a></li>
        <li><a href="/prosjekthotell" data-i18n-html="ns.nav.ph">Prosjekthotell</a></li>
        <li><a href="/salgskonsoll" data-i18n-html="ns.nav.sk">Salgskonsoll</a></li>
        <li class="grp" data-i18n-html="ns.fot.ogsaa">Også fra Builtly</li>
        <li><a href="/render">Render</a> · <a href="/bim-viewer">BIM Viewer</a> · <a href="/control">Control</a></li></ul></div>
      <div><h4>Builtly</h4><ul>
        <li><a href="/about" data-i18n-html="ns.nav.om">Om Builtly</a></li>
        <li><a href="/about#folkene" data-i18n-html="ns.fot.folkene">Folkene</a></li>
        <li><a href="/referanser" data-i18n-html="ns.fot.referanser">Referanser</a></li>
        <li><a href="/careers" data-i18n-html="ns.fot.karriere">Karriere</a></li>
        <li><a href="/contact" data-i18n-html="ns.nav.kontakt">Kontakt</a></li>
        <li><a href="{PORTAL}" data-i18n-html="ns.nav.login">Logg inn</a></li></ul></div>
      <div>{k('fot.selskapet', 'Selskapet', 'h4')}<ul>
        <li><a href="/privacy" data-i18n-html="ns.fot.personvern">Personvern</a></li>
        <li><a href="/terms" data-i18n-html="ns.fot.vilkar">Vilkår</a></li>
        <li><a href="/cookies" data-i18n-html="ns.fot.cookies">Informasjonskapsler</a></li>
        <li><a href="/trust" data-i18n-html="ns.fot.trust">Sikkerhet og data</a></li>
        <li><a href="/etiske-retningslinjer" data-i18n-html="ns.fot.etikk">Etiske retningslinjer</a></li>
        <li><a href="/apenhetsloven" data-i18n-html="ns.fot.apenhet">Åpenhetsloven</a></li></ul></div>
    </div>
    <div class="fot-bunn">
      <span>Builtly Engineering AS · Org.nr 837 694 892 · Bassengbakken 4, 7042 Trondheim</span>
      <span class="sprak"><a href="?lang=no&amp;lang_src=manual" data-sprak="no">Norsk</a> · <a href="?lang=en&amp;lang_src=manual" data-sprak="en">English</a> · <a href="/intern" title="Intern portal">Intern →</a></span>
    </div>
  </div>
</footer>"""


# ---------------------------------------------------------------------------
# Softwaresidene: modullinja, den smale linja og interesseskjemaet (like på alle sidene)
# ---------------------------------------------------------------------------
MODULER = [  # (nøkkel, nr, fase, navn, slagord, adresse, verdien salgets mottak kjenner modulen på)
    ("maps", "01", "Finn", "Maps", "Alt om eiendommen, på ett sted.", "/maps", "Builtly Maps (eiendomskart)"),
    ("mulighetsstudie", "02", "Vurder", "Mulighetsstudie", "Hva tåler tomten?", "/mulighetsstudie", "Mulighetsstudie (ARK)"),
    ("prosjekthotell", "03", "Utvikle", "Prosjekthotell", "Hele prosjektet i ett rom.", "/prosjekthotell", "Prosjekthotell / datarom"),
    ("salgskonsoll", "04", "Selg", "Salgskonsoll", "Fra prosjekt til siste bolig solgt.", "/salgskonsoll", "Salgskonsoll"),
]
# Mottaket er det samme som det gamle skjemaet på /bli-kunde brukte: interessentlista «Builtly — Bli kunde» i
# Salgskonsoll, som varsler salg og gir oppfølging i CRM. Modulverdiene over må stå ordrett, tilbudsbrevet leser dem.
INTAKE = "https://app.builtly.ai/"
INTAKE_LISTE = "l_19fe041ff6232371164"


def moduler(aktiv):
    ut = ['<nav class="moduler" aria-label="Modulene" data-i18n-attr-aria-label="ns.sw.moduler">']
    for i, (nk, nr, fase, navn, slag, href, _) in enumerate(MODULER, 1):
        her = ' class="pa" aria-current="page"' if nk == aktiv else ""
        ut.append(
            f'  <a href="{href}"{her}><span class="n" data-i18n-html="ns.sw.m{i}.f">{nr} · {fase}</span>'
            f'<b>{navn}</b><span class="s" data-i18n-html="ns.sw.m{i}.s">{slag}</span></a>'
        )
    ut.append("</nav>")
    return "\n".join(ut)


def modlinje(aktiv):
    ut = ['<div class="modlinje" data-modlinje inert>', '  <div class="w modlinje-in">',
          '    <a class="hvem" href="/software">Builtly <i>Software</i></a>', "    <ol>"]
    for i, (nk, nr, fase, navn, slag, href, _) in enumerate(MODULER, 1):
        her = ' class="on"' if nk == aktiv else ""
        na = ' aria-current="page"' if nk == aktiv else ""
        ut.append(f'      <li{her} data-modul="{nk}"><a href="{href}"{na}>{nr} {navn}</a><span class="spor"><i></i></span></li>')
    ut += ["    </ol>",
           '    <a class="btn btn-liten" href="#interesse"><span data-i18n-html="ns.sw.demo">Book en demo</span> <span aria-hidden="true">→</span></a>',
           "  </div>", "</div>"]
    return "\n".join(ut)


def interesse(forvalgt):
    valg = []
    for i, (nk, nr, fase, navn, slag, href, verdi) in enumerate(MODULER, 1):
        paa = " checked" if nk == forvalgt else ""
        valg.append(f'<label class="brikke"><input type="checkbox" name="mod" value="{html.escape(verdi)}" data-modul="{nk}"{paa}><span>{navn}</span></label>')
    return f"""<div class="skj-ramme" id="interesse">
<form class="skj" data-skjema data-intake="{INTAKE}" data-liste="{INTAKE_LISTE}" novalidate>
  <fieldset>
    <legend data-i18n-html="ns.sw.skj.mod">Hvilke moduler gjelder det?</legend>
    <div class="brikker">{''.join(valg)}</div>
  </fieldset>
  <fieldset>
    <legend data-i18n-html="ns.sw.skj.onske">Hva ønsker dere?</legend>
    <div class="brikker">
      <label class="brikke"><input type="radio" name="onske" value="Demo"><span data-i18n-html="ns.sw.skj.o1">Demo</span></label>
      <label class="brikke"><input type="radio" name="onske" value="Tilbud"><span data-i18n-html="ns.sw.skj.o2">Tilbud</span></label>
      <label class="brikke"><input type="radio" name="onske" value="Demo + tilbud" checked><span data-i18n-html="ns.sw.skj.o3">Demo og tilbud</span></label>
    </div>
  </fieldset>
  <div class="felt-rad">
    <label class="felt"><span data-i18n-html="ns.sw.skj.firma">Firma</span><input type="text" name="firma" required autocomplete="organization"></label>
    <label class="felt"><span data-i18n-html="ns.sw.skj.navn">Navn</span><input type="text" name="navn" required autocomplete="name"></label>
    <label class="felt"><span data-i18n-html="ns.sw.skj.epost">E-post</span><input type="email" name="epost" required autocomplete="email"></label>
    <label class="felt"><span data-i18n-html="ns.sw.skj.tlf">Telefon <i>valgfritt</i></span><input type="tel" name="tlf" autocomplete="tel"></label>
  </div>
  <label class="felt"><span data-i18n-html="ns.sw.skj.melding">Noe vi bør vite om prosjektet? <i>valgfritt</i></span><textarea name="melding" rows="3" maxlength="600"></textarea></label>
  <div class="skj-felle" aria-hidden="true"><label>Nettside <input type="text" name="nettside" tabindex="-1" autocomplete="off"></label></div>
  <label class="samtykke"><input type="checkbox" name="samtykke" required><span data-i18n-html="ns.sw.skj.samtykke">Jeg samtykker i at Builtly kontakter meg om henvendelsen og lagrer opplysningene mine til det formålet. Se <a href="/privacy">personvernerklæringen</a>.</span></label>
  <p class="skj-feil" role="alert" hidden data-i18n-html="ns.sw.skj.feil">Fyll ut firma, navn og e-post, og kryss av for samtykke.</p>
  <div class="skj-send"><button class="btn" type="submit"><span data-i18n-html="ns.sw.skj.send">Send forespørsel</span> <span aria-hidden="true">→</span></button><span class="liten" data-i18n-html="ns.sw.skj.svar">Vi svarer innen én virkedag.</span></div>
</form>
<div class="skj-takk" role="status" hidden><b data-i18n-html="ns.sw.skj.takk">Takk. Forespørselen er sendt.</b><p data-i18n-html="ns.sw.skj.takk2">Vi tar kontakt innen én virkedag. Hører dere ikke fra oss, ring Olav eller Sofie.</p></div>
</div>"""


def software_deler():
    """Alle de delte bitene samlet, så nøklene under ns.sw. kan hentes ut og sjekkes mot felles.en.json."""
    return moduler("") + modlinje("") + interesse("")


def utvid(innhold, fil):
    """Bytter {{MODULER:x}}, {{MODLINJE:x}} og {{INTERESSE:x}} med de delte bitene."""
    kjente = {m[0] for m in MODULER} | {""}
    lagere = {"MODULER": moduler, "MODLINJE": modlinje, "INTERESSE": interesse}

    def bytt(m):
        hva, modul = m.group(1), m.group(2)
        if modul not in kjente:
            sys.exit(f"{fil}: ukjent modul i {{{{{hva}:{modul}}}}}")
        return lagere[hva](modul)

    return re.sub(r"\{\{(MODULER|MODLINJE|INTERESSE):([a-z]*)\}\}", bytt, innhold)


def side(meta, innhold):
    ut = meta["ut"]
    kanon = SITE + meta.get("kanonisk", "/")
    tittel = html.escape(meta["tittel"])
    beskr = html.escape(meta["beskrivelse"])
    navn = meta["navn"]
    # Softwaresidene laster egne skript og egen stil i tillegg (meta: skript: tomt,kart,vindu og stil: software).
    ekstra = "".join(
        f'\n<script src="/{s.strip()}.js?v={VERSJON}" defer onerror="document.documentElement.classList.add(\'uten-skript\')"></script>'
        for s in meta.get("skript", "").split(",") if s.strip()
    )
    stiler = "".join(
        f'\n<link rel="stylesheet" href="/{s.strip()}.css?v={VERSJON}" />'
        for s in meta.get("stil", "").split(",") if s.strip()
    )
    # Uten JavaScript vises reservebildene, og det som bare virker med skript, skjules.
    uten_js = (
        '\n<noscript><style>[data-kartlag],.kun-js,.prov,.modlinje{display:none}</style></noscript>'
        if ekstra else ""
    )
    return f"""<!DOCTYPE html>
<html lang="no">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
<title data-i18n="ns.{navn}._tittel">{tittel}</title>
<meta name="description" content="{beskr}" data-i18n-attr-content="ns.{navn}._beskrivelse" />
<meta name="theme-color" content="#FAFAF7" />
<link rel="canonical" href="{kanon}" />
<meta property="og:type" content="website" />
<meta property="og:locale" content="nb_NO" />
<meta property="og:site_name" content="Builtly" />
<meta property="og:url" content="{kanon}" />
<meta property="og:title" content="{tittel}" />
<meta property="og:description" content="{beskr}" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&amp;family=Newsreader:ital,opsz,wght@0,6..72,400;1,6..72,400&amp;family=JetBrains+Mono:wght@400;500;600&amp;display=swap" rel="stylesheet" />
<link rel="stylesheet" href="/nettsted.css?v={VERSJON}" />{stiler}
<script src="/i18n.js?v={VERSJON}" defer></script>
<script src="/nettsted.js?v={VERSJON}" defer></script>{ekstra}{uten_js}
</head>
<body>
<!-- Laget av tools/nettsted/lag.py fra tools/nettsted/sider/{navn}.html. Rediger kilden, ikke denne fila. -->
{meny(meta.get("meny", ""))}
<main>
{innhold.strip()}
</main>
{bunntekst()}
</body>
</html>
"""



# ---------------------------------------------------------------------------
# /uavhengig-kontroll: ny topp og kontakt i den gamle siden, med stil under .nt
# ---------------------------------------------------------------------------
def css_blokker(css):
    """Deler CSS i toppnivåblokker: (prelude, kropp)."""
    ut, i = [], 0
    css = re.sub(r"/\*.*?\*/", "", css, flags=re.S)
    while True:
        a = css.find("{", i)
        if a < 0:
            return ut
        dybde, b = 1, a + 1
        while dybde:
            dybde += {"{": 1, "}": -1}.get(css[b], 0)
            b += 1
        ut.append((css[i:a].strip(), css[a + 1:b - 1]))
        i = b


def scoped_css(klasser):
    kilde = (HER / "nettsted.css").read_text(encoding="utf-8")
    nokkelrammer = set()

    def regler(css):
        ut = []
        for pre, kropp in css_blokker(css):
            if pre.startswith("@media"):
                indre = regler(kropp)
                if indre:
                    ut.append(f"{pre}{{{''.join(indre)}}}")
            elif pre.startswith("@keyframes"):
                navn = pre.split()[1]
                ut.append(f"@keyframes nt-{navn}{{{kropp}}}")
                nokkelrammer.add(navn)
            elif pre == ":root":
                ut.append(f".nt{{{kropp}}}")
            elif not pre.startswith("@"):
                deler = []
                for sel in pre.split(","):
                    sel = sel.strip()
                    tokens = set(re.findall(r"\.([A-Za-z0-9_-]+)", sel))
                    if tokens and tokens <= klasser:
                        deler.append(".nt " + sel)
                if deler:
                    ut.append(f"{','.join(deler)}{{{kropp}}}")
        return ut

    css = "".join(regler(kilde))
    for navn in nokkelrammer:
        css = re.sub(rf"(animation:[^;}}]*?)\b{navn}\b", rf"\1nt-{navn}", css)
    return css


def uak_side():
    sti = ROT / "uavhengig-kontroll.html"
    side_ = sti.read_text(encoding="utf-8")
    topp = (HER / "deler" / "uak-topp.html").read_text(encoding="utf-8")
    topp = re.sub(r"\s*<!--.*?-->\s*", "", topp, count=1, flags=re.S)
    kontakt = (HER / "deler" / "uak-kontakt.html").read_text(encoding="utf-8")
    klasser = set()
    for c in re.findall(r'class="([^"]+)"', topp + kontakt):
        klasser.update(c.split())
    klasser.add("nt")
    # Klassene sløyfen får fra JS-en (ikke i HTML-en), ellers forsvinner reglene for aktivt og ferdig steg.
    klasser.update({"aktiv", "ferdig"})
    film_js = (HER / "nettsted.js").read_text(encoding="utf-8")
    film_js = film_js[film_js.index("  // Sløyfen i toppen"):film_js.index("  // Språkvalget")]
    stil = f"<style>/* Laget av tools/nettsted/lag.py fra nettsted.css */{scoped_css(klasser)}</style>"
    ny_topp = (
        "<!-- NETTSTED-UAK-TOPP START: laget av tools/nettsted/lag.py fra deler/uak-topp.html -->\n"
        f'{stil}\n<div class="nt">\n{topp.strip()}\n</div>\n'
        f"<script>(function(){{\n{film_js}}})();</script>\n"
        "<!-- NETTSTED-UAK-TOPP SLUTT -->"
    )
    ny_kontakt = (
        "<!-- NETTSTED-UAK-KONTAKT START: laget av tools/nettsted/lag.py fra deler/uak-kontakt.html -->\n"
        f'<div class="nt">\n{kontakt.strip()}\n</div>\n'
        "<!-- NETTSTED-UAK-KONTAKT SLUTT -->"
    )
    m = re.search(r"<!-- NETTSTED-UAK-TOPP START.*?NETTSTED-UAK-TOPP SLUTT -->", side_, re.S)
    if m:
        side_ = side_[:m.start()] + ny_topp + side_[m.end():]
    else:
        m = re.search(r'<section class="p-hero uk-hero">.*?</section>', side_, re.S)
        if not m:
            sys.exit("uavhengig-kontroll.html: fant verken merkene eller den gamle toppen")
        side_ = side_[:m.start()] + ny_topp + side_[m.end():]
    m = re.search(r"<!-- NETTSTED-UAK-KONTAKT START.*?NETTSTED-UAK-KONTAKT SLUTT -->", side_, re.S)
    if m:
        side_ = side_[:m.start()] + ny_kontakt + side_[m.end():]
    else:
        i = side_.index("</main>")
        side_ = side_[:i] + ny_kontakt + "\n" + side_[i:]
    return sti, side_

# ---------------------------------------------------------------------------
def les_meta(kilde, fil):
    m = re.match(r"\s*<!--(.*?)-->", kilde, re.S)
    if not m:
        sys.exit(f"{fil}: mangler kommentaren med ut, meny, kanonisk, tittel og beskrivelse")
    meta = {}
    for del_ in m.group(1).split("|"):
        if ":" in del_:
            a, b = del_.split(":", 1)
            meta[a.strip()] = b.strip()
    for felt in ("ut", "tittel", "beskrivelse"):
        if felt not in meta:
            sys.exit(f"{fil}: mangler {felt}")
    return meta, kilde[m.end():]


def splice_i18n(no, en):
    sti = ROT / "i18n.js"
    js = sti.read_text(encoding="utf-8")
    data = json.dumps({"no": no, "en": en}, ensure_ascii=False, sort_keys=True, indent=1)
    blokk = (
        "  // === NETTSTED-2026 START (laget av tools/nettsted/lag.py, ikke rediger for hånd) ===\n"
        f"  const BUILTLY_NETTSTED_2026 = {data};\n"
        "  Object.keys(BUILTLY_NETTSTED_2026).forEach(function(lang){\n"
        "    if (!T[lang]) return;\n"
        "    Object.assign(T[lang], BUILTLY_NETTSTED_2026[lang]);\n"
        "  });\n"
        "  // === NETTSTED-2026 SLUTT ===\n"
    )
    m = re.search(r"  // === NETTSTED-2026 START.*?// === NETTSTED-2026 SLUTT ===\n", js, re.S)
    if m:
        js = js[:m.start()] + blokk + js[m.end():]
    else:
        i = js.index("  const SUPPORTED")
        js = js[:i] + blokk + "\n" + js[i:]
    return sti, js


def main():
    sjekk = "--sjekk" in sys.argv
    alle_no, alle_en = {}, {}

    felles_en = json.loads((HER / "felles.en.json").read_text(encoding="utf-8"))
    skall = meny("") + bunntekst() + software_deler()
    felles_no = nokler(skall, "meny, bunntekst og de delte bitene på softwaresidene")
    mangler = sorted(set(felles_no) - set(felles_en))
    ubrukt = sorted(set(felles_en) - set(felles_no))
    if mangler or ubrukt:
        sys.exit(f"felles.en.json: mangler {mangler}, ubrukt {ubrukt}")
    alle_no.update(felles_no)
    alle_en.update(felles_en)

    skrevet = []
    for fil in sorted((HER / "sider").glob("*.html")):
        navn = fil.stem
        meta, innhold = les_meta(fil.read_text(encoding="utf-8"), fil.name)
        meta["navn"] = navn
        innhold = utvid(innhold, fil.name)
        # Nøklene under ns.sw. hører til de delte bitene og er alt sjekket mot felles.en.json.
        alle_nokler = nokler(innhold, fil.name)
        ukjente = sorted(n for n in alle_nokler if n.startswith("ns.sw.") and n not in felles_no)
        if ukjente:
            sys.exit(f"{fil.name}: nøkler under ns.sw. som ikke finnes i de delte bitene: {', '.join(ukjente)}")
        no = {n: v for n, v in alle_nokler.items() if not n.startswith("ns.sw.")}
        enfil = fil.with_suffix(".en.json")
        en = json.loads(enfil.read_text(encoding="utf-8")) if enfil.exists() else {}
        feil_prefiks = [n for n in no if not n.startswith(f"ns.{navn}.")]
        if feil_prefiks:
            sys.exit(f"{fil.name}: nøkler uten prefikset ns.{navn}.: {feil_prefiks[:5]}")
        no[f"ns.{navn}._tittel"] = meta["tittel"]
        no[f"ns.{navn}._beskrivelse"] = meta["beskrivelse"]
        mangler = sorted(set(no) - set(en))
        ubrukt = sorted(set(en) - set(no))
        if mangler or ubrukt:
            sys.exit(f"{enfil.name}: mangler {len(mangler)} {mangler[:8]}, ubrukt {ubrukt[:8]}")
        for nk in no:
            if nk in alle_no and alle_no[nk] != no[nk]:
                sys.exit(f"{nk} finnes med ulik tekst i flere kilder")
        alle_no.update(no)
        alle_en.update(en)
        skrevet.append((ROT / meta["ut"], side(meta, innhold)))

    i18n_sti, i18n_js = splice_i18n(alle_no, alle_en)
    if sjekk:
        print(f"OK: {len(skrevet)} sider, {len(alle_no)} nøkler på norsk og engelsk")
        return
    for sti, tekst in skrevet:
        sti.parent.mkdir(parents=True, exist_ok=True)
        sti.write_text(tekst, encoding="utf-8")
        print("skrev", sti.relative_to(ROT))
    i18n_sti.write_text(i18n_js, encoding="utf-8")
    uak_sti, uak_tekst = uak_side()
    uak_sti.write_text(uak_tekst, encoding="utf-8")
    print("skrev uavhengig-kontroll.html (ny topp og kontakt)")
    (ROT / "nettsted.css").write_text((HER / "nettsted.css").read_text(encoding="utf-8"), encoding="utf-8")
    (ROT / "nettsted.js").write_text((HER / "nettsted.js").read_text(encoding="utf-8"), encoding="utf-8")
    for navn in ("software.css", "vindu.js", "tomt.js", "kart.js", "autoplan.js", "studie.js"):
        (ROT / navn).write_text((HER / navn).read_text(encoding="utf-8"), encoding="utf-8")
    print(f"i18n.js: {len(alle_no)} nøkler i NETTSTED-2026")


if __name__ == "__main__":
    main()
