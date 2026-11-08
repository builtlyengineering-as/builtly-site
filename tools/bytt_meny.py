#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Gir de eldre sidene som ikke lages av tools/nettsted/lag.py, samme meny og bunntekst
som resten av nettstedet (lanseringen november 2026): logoen «Builtly», menyen
Rådgivning, Software, Om Builtly og Kontakt, Logg inn og «Ta kontakt», språkene
norsk og engelsk, og bunnteksten med de tre fagene og de fire produktene.

Sidene beholder sin egen stil. Tekstene bruker nøklene ns.* fra NETTSTED-2026 i i18n.js.

Kjør fra repo-rot: python3 tools/bytt_meny.py
Idempotent: kjøres den to ganger, er andre kjøring en no-op.
"""
import os
import re
import sys

ROT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VERSJON = "20261108-1"

SIDER = {
    "apenhetsloven.html": "",
    "bim-viewer.html": "software",
    "bli-kunde.html": "",
    "careers.html": "",
    "control.html": "software",
    "etiske-retningslinjer.html": "",
    "referanser.html": "",
    "render.html": "software",
    "uavhengig-kontroll.html": "radgivning",
}

NAV_ITEMS = [
    ("/tjenester", "ns.nav.rad", "Rådgivning", "radgivning"),
    ("/software", None, "Software", "software"),
    ("/about", "ns.nav.om", "Om Builtly", "om"),
    ("/contact", "ns.nav.kontakt", "Kontakt", "kontakt"),
]


def nav_links(active):
    out = []
    for href, key, label, slug in NAV_ITEMS:
        cls = ' class="active"' if slug == active else ""
        i18n = f' data-i18n="{key}"' if key else ""
        out.append(f'<a href="{href}"{cls}{i18n}>{label}</a>')
    return "\n".join(out)


LOGO_NY = '<a href="/" class="logo"><span class="logo-mark"></span>Builtly</a>'
CTA_NY = (
    '<a href="https://portal.builtly.ai" class="nav-login" data-i18n="ns.nav.login" '
    'style="font-size:14px;font-weight:500;color:var(--ink-soft);white-space:nowrap">Logg inn</a>\n'
    '<a href="/contact" class="btn"><span data-i18n="ns.nav.cta">Ta kontakt</span> <span class="arr">→</span></a>'
)
MM_CTA_NY = (
    '<a href="/contact" class="btn mm-cta"><span data-i18n="ns.nav.cta">Ta kontakt</span> <span class="arr">→</span></a>\n'
    '<a href="https://portal.builtly.ai" class="btn btn-ghost mm-cta" style="margin-top:10px"><span data-i18n="ns.nav.login">Logg inn</span></a>'
)

FOOTER_TOP_NY = """<div class="footer-top">
<div>
<div class="f-brand"><span class="lm"></span>Builtly</div>
<div class="f-tag" data-i18n="ns.fot.tag">Fremtidens ingeniørselskap. Allerede her.</div>
</div>
<div class="f-col">
<h5 data-i18n="ns.fot.rad">Rådgivning</h5>
<ul>
<li><a href="/tjenester/geoteknikk" data-i18n="ns.nav.geo">Geoteknikk</a></li>
<li><a href="/tjenester/konstruksjon" data-i18n="ns.nav.rib">Konstruksjon</a></li>
<li><a href="/tjenester/bygningsfysikk" data-i18n="ns.nav.fy">Bygningsfysikk</a></li>
<li><a href="/uavhengig-kontroll" data-i18n="ns.nav.uak">Uavhengig kontroll</a></li>
<li><a href="/tjenester" data-i18n="ns.nav.rad.alt">Alt om rådgivning →</a></li>
</ul>
</div>
<div class="f-col">
<h5>Software</h5>
<ul>
<li><a href="/maps">Maps</a></li>
<li><a href="/mulighetsstudie" data-i18n="ns.nav.ms">Mulighetsstudie</a></li>
<li><a href="/prosjekthotell" data-i18n="ns.nav.ph">Prosjekthotell</a></li>
<li><a href="/salgskonsoll" data-i18n="ns.nav.sk">Salgskonsoll</a></li>
<li><a href="/software" data-i18n="ns.nav.sw.alt">Se hele løpet →</a></li>
</ul>
</div>
<div class="f-col">
<h5 data-i18n="ns.fot.selskapet">Selskapet</h5>
<ul>
<li><a href="/about" data-i18n="ns.nav.om">Om Builtly</a></li>
<li><a href="/referanser" data-i18n="ns.fot.referanser">Referanser</a></li>
<li><a href="/careers" data-i18n="ns.fot.karriere">Karriere</a></li>
<li><a href="/contact" data-i18n="ns.nav.kontakt">Kontakt</a></li>
<li><a href="/trust" data-i18n="ns.fot.trust">Sikkerhet og data</a></li>
<li><a href="https://portal.builtly.ai" data-i18n="ns.nav.login">Logg inn</a></li>
</ul>
</div>
</div>"""

RE_LOGO = re.compile(r'<a href="/" class="logo"><span class="logo-mark"></span>Builtly(?:<span class="sub">[^<]*</span>)?</a>')
RE_NAVLINKS = re.compile(r'(<div class="nav-links">)(.*?)(</div>)', re.S)
RE_CTA = re.compile(
    r'(?:<a href="https://maps\.builtly\.ai/" class="btn btn-ghost"[^>]*>.*?</a>\s*)?'
    r'(?:<a href="https://portal\.builtly\.ai" class="nav-login"[^>]*>[^<]*</a>\s*<a href="/contact" class="btn"><span data-i18n="ns\.nav\.cta">[^<]*</span>\s*<span class="arr">→</span></a>'
    r'|<a href="https://portal\.builtly\.ai" class="btn"><span data-i18n="nav\.openPortal">[^<]*</span>\s*<span class="arr">→</span></a>)',
    re.S,
)
RE_MM_CTA = re.compile(
    r'(?:<a href="/contact" class="btn mm-cta">.*?</a>\s*<a href="https://portal\.builtly\.ai" class="btn btn-ghost mm-cta"[^>]*>.*?</a>'
    r'|<a href="https://portal\.builtly\.ai" class="btn mm-cta"><span data-i18n="nav\.openPortal">[^<]*</span>\s*<span class="arr">→</span></a>'
    r'(?:\s*<a href="/bli-kunde\.html" class="btn btn-ghost mm-cta"[^>]*><span data-i18n="nav\.quote">[^<]*</span></a>)*)',
    re.S,
)
RE_FOOTER = re.compile(r'<div class="footer-top">.*?</div>\s*</div>\s*(?=<div class="footer-bot)', re.S)
# Språkmenyen: bare norsk og engelsk
RE_LANG_ANDRE = re.compile(r'<button class="lang-option[^"]*" data-lang="(?:de|sv|fi|da)"[^>]*>.*?</button>\s*', re.S)
RE_I18N_V = re.compile(r'/i18n\.js\?v=[A-Za-z0-9_-]+')


def bytt(fil, active):
    sti = os.path.join(ROT, fil)
    src = open(sti, encoding="utf-8").read()
    rapport = []

    for navn, rx, ny in (
        ("logo", RE_LOGO, LOGO_NY),
        ("nav", RE_NAVLINKS, lambda m: m.group(1) + "\n" + nav_links(active) + "\n" + m.group(3)),
        ("cta", RE_CTA, CTA_NY),
        ("mm", RE_MM_CTA, MM_CTA_NY),
        ("bunn", RE_FOOTER, FOOTER_TOP_NY + "\n"),
    ):
        src, n = rx.subn(ny, src, count=1)
        rapport.append(f"{navn}:{n}")
    src, n = RE_LANG_ANDRE.subn("", src)
    rapport.append(f"språk-:{n}")
    src, n = RE_I18N_V.subn(f"/i18n.js?v={VERSJON}", src)
    rapport.append(f"i18n:{n}")

    open(sti, "w", encoding="utf-8").write(src)
    return rapport


def main():
    feil = False
    for fil, active in SIDER.items():
        rapport = bytt(fil, active)
        merk = ""
        if any(r.split(":")[0] in ("logo", "nav", "cta", "bunn", "i18n") and r.endswith(":0") for r in rapport):
            merk = "   <-- SJEKK MANUELT"
            feil = True
        print(f"{fil:28s} {' '.join(rapport)}{merk}")
    sys.exit(1 if feil else 0)


if __name__ == "__main__":
    main()
