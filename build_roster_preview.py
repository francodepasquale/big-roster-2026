# -*- coding: utf-8 -*-
# Standalone preview build for external sharing: only Mujeres + Hombres,
# both using the "Tarjeta Talento — Clean Blur" card, "Ver más" always
# linking straight to the person's real Instagram (no mediakit/toast).
# Kept as its own file (not a mode flag on build_html.py) so the main
# site's build is never at risk while this one-off is iterated on.
import json, os, re

HERE = os.path.dirname(__file__)
people = json.load(open(os.path.join(HERE, "people.json")))
fonts = json.load(open(os.path.join(HERE, "fonts.json")))

# collage-only entries (different shots than their card photo), used just for
# the Hombres cat-cover preview, not part of the shared people.json dataset
people["pelao_khe_collage"] = {"name": "Pelao Khe", "photo": "assets/photos/pelao_khe_collage.webp"}
people["pablo_bruschi_collage"] = {"name": "Pablo Bruschi", "photo": "assets/photos/pablo_bruschi_collage.webp"}
people["benja_calero_collage"] = {"name": "Benja Calero", "photo": "assets/photos/benja_calero_collage.webp"}

FONDO_SVG_RAW = open("/Users/tomascardozo/main/big/web/vectorfondo.svg").read()
FONDO_INNER = re.search(r"<svg[^>]*>(.*)</svg>", FONDO_SVG_RAW, re.S).group(1)
FONDO_VIEWBOX = re.search(r'viewBox="([^"]+)"', FONDO_SVG_RAW).group(1)

LOGO_SVG_RAW = open("/Users/tomascardozo/main/big/brand/nuevo/big-logo2.svg").read()
ISOTIPO_PATH = re.search(r'\sd="([^"]+)"', LOGO_SVG_RAW).group(1)
ISOTIPO_VIEWBOX = re.search(r'viewBox="([^"]+)"', LOGO_SVG_RAW).group(1)

CATEGORIES = ["Mujeres", "Hombres"]

# maca_castro, ammichis (mujeres) and fran_silva, gena_pedrazzi, nico_grasso (hombres)
# excluded from every roster appearance per client decision
SECTIONS = [
    dict(
        slug="mujeres", name="Mujeres", split=("Muje", "res"),
        collage=["juli_savioli", "pia_scarnato", "dulce_pink", "renata_blasevich"],
        order=["juli_savioli", "pia_scarnato", "dulce_pink", "renata_blasevich", "giuli_bellicoso",
               "pauli_veltrano", "agustina_cambra", "eve_vidal", "inez", "mumy",
               "giuli_lourdes", "mely_francano", "martu_morales", "nanu_yael", "sabri_ludmila", "yo_soy_brisa"],
    ),
    dict(
        slug="hombres", name="Hombres", split=("Hom", "bres"),
        collage=["pelao_khe_collage", "benja_calero_collage", "cris_pierri"],
        order=["pelao_khe", "benja_calero", "tiago_bergallo", "cris_pierri", "hablemos_de_cine",
               "ber_scarnato", "mariano_bondar", "inachomer", "santi_gallo", "pablo_bruschi",
               "joselo_marquez", "bruno_rondini", "lubru_invierte", "los_arias_brothers",
               "facu_garcia", "lean_riccio", "tomas_alvarez", "el_capo_willy", "agus_benca",
               "lucas_monopoli", "soy_dalto"],
    ),
]

# secondary categories from BIG_AGENCY_Roster_2026.pdf ("Por categoría" index).
# Same exclusion list as above applies. No collage on these — cover is just
# the headline (client decision: no photos on category covers, only Mujeres/
# Hombres get the portrait collage).
CATEGORY_SECTIONS = [
    dict(
        slug="lifestyle", name="Lifestyle", split=("Lifestyle", ""),
        order=["pia_scarnato", "cris_pierri", "dulce_pink", "ber_scarnato", "renata_blasevich",
               "giuli_bellicoso", "inachomer", "santi_gallo", "tiago_bergallo", "pauli_veltrano",
               "agustina_cambra", "eve_vidal", "inez", "mumy", "joselo_marquez", "giuli_lourdes",
               "mely_francano", "martu_morales", "tomas_alvarez", "agus_benca", "yo_soy_brisa",
               "lucas_monopoli", "nanu_yael", "sabri_ludmila"],
    ),
    dict(
        slug="beauty-makeup", name="Beauty & Makeup", split=("Beauty & Makeup", ""),
        order=["pia_scarnato", "dulce_pink", "giuli_bellicoso", "giuli_lourdes", "mely_francano", "yo_soy_brisa"],
    ),
    dict(
        slug="trends", name="Trends", split=("Trends", ""),
        order=["pia_scarnato", "dulce_pink", "giuli_bellicoso", "giuli_lourdes", "mely_francano",
               "martu_morales", "tiago_bergallo"],
    ),
    dict(
        slug="fitness", name="Fitness", split=("Fitness", ""),
        order=["pelao_khe", "juli_savioli", "lucas_monopoli"],
    ),
    dict(
        slug="humor-sketches", name="Humor & Sketches", split=("Humor & Sketches", ""),
        order=["pelao_khe", "juli_savioli", "benja_calero", "cris_pierri", "dulce_pink", "ber_scarnato",
               "renata_blasevich", "giuli_bellicoso", "mariano_bondar", "inachomer", "santi_gallo",
               "tiago_bergallo", "pablo_bruschi", "inez", "mumy", "joselo_marquez", "los_arias_brothers",
               "giuli_lourdes", "mely_francano", "tomas_alvarez", "el_capo_willy", "agus_benca",
               "nanu_yael", "bruno_rondini"],
    ),
    dict(
        slug="entretenimiento", name="Entretenimiento", split=("Entretenimiento", ""),
        order=["pelao_khe", "juli_savioli", "pia_scarnato", "benja_calero", "cris_pierri", "dulce_pink",
               "ber_scarnato", "renata_blasevich", "giuli_bellicoso", "mariano_bondar", "inachomer",
               "santi_gallo", "tiago_bergallo", "pablo_bruschi", "inez", "mumy", "joselo_marquez",
               "bruno_rondini", "los_arias_brothers", "giuli_lourdes", "nanu_yael", "mely_francano",
               "tomas_alvarez", "el_capo_willy", "agus_benca", "hablemos_de_cine", "facu_garcia"],
    ),
    dict(
        slug="youtube", name="Youtube", split=("Youtube", ""),
        order=["benja_calero", "mariano_bondar", "lean_riccio"],
    ),
    dict(
        slug="tecnologia-crypto", name="Tecnología & Crypto", split=("Tecnología & Crypto", ""),
        order=["lubru_invierte", "lean_riccio", "soy_dalto"],
    ),
]

ALL_SECTIONS = SECTIONS + CATEGORY_SECTIONS

def isotipo_svg(size=28, color="#FFFFFF", cls=""):
    return f'<svg class="{cls}" width="{size}" height="{size}" viewBox="{ISOTIPO_VIEWBOX}" style="color:{color}"><path fill="currentColor" d="{ISOTIPO_PATH}"/></svg>'

def tabs_html():
    return "\n".join(f'<button class="tab" data-cat="{cat}">{cat}</button>' for cat in CATEGORIES)

# minimal white glyphs (no background chip of their own — they sit inside
# .bcard-chip's own translucent pill), lifted from the Figma "Tarjeta Talento
# — Clean Blur (Chips Abajo)" component
IG_ICON_MINI = '''<svg width="15" height="15" viewBox="4.5 4.5 11 11" fill="none" xmlns="http://www.w3.org/2000/svg">
<path fill-rule="evenodd" clip-rule="evenodd" d="M10 13C11.6568 13 13 11.6568 13 10C13 8.34315 11.6568 7 10 7C8.34315 7 7 8.34315 7 10C7 11.6568 8.34315 13 10 13ZM10 12C11.1046 12 12 11.1046 12 10C12 8.89543 11.1046 8 10 8C8.89543 8 8 8.89543 8 10C8 11.1046 8.89543 12 10 12Z" fill="white"/>
<path d="M13 6.5C12.7239 6.5 12.5 6.72386 12.5 7C12.5 7.27614 12.7239 7.5 13 7.5C13.2762 7.5 13.5 7.27614 13.5 7C13.5 6.72386 13.2762 6.5 13 6.5Z" fill="white"/>
<path fill-rule="evenodd" clip-rule="evenodd" d="M4.82698 6.13803C4.5 6.77977 4.5 7.61985 4.5 9.3V10.7C4.5 12.3801 4.5 13.2202 4.82698 13.8619C5.1146 14.4264 5.57354 14.8854 6.13803 15.173C6.77977 15.5 7.61985 15.5 9.3 15.5H10.7C12.3801 15.5 13.2202 15.5 13.8619 15.173C14.4264 14.8854 14.8854 14.4264 15.173 13.8619C15.5 13.2202 15.5 12.3801 15.5 10.7V9.3C15.5 7.61985 15.5 6.77977 15.173 6.13803C14.8854 5.57354 14.4264 5.1146 13.8619 4.82698C13.2202 4.5 12.3801 4.5 10.7 4.5H9.3C7.61985 4.5 6.77977 4.5 6.13803 4.82698C5.57354 5.1146 5.1146 5.57354 4.82698 6.13803ZM10.7 5.5H9.3C8.44342 5.5 7.86113 5.50078 7.41104 5.53755C6.97262 5.57337 6.74842 5.6383 6.59202 5.71799C6.2157 5.90974 5.90974 6.2157 5.71799 6.59202C5.6383 6.74842 5.57337 6.97262 5.53755 7.41104C5.50078 7.86113 5.5 8.44342 5.5 9.3V10.7C5.5 11.5566 5.50078 12.1388 5.53755 12.5889C5.57337 13.0274 5.6383 13.2516 5.71799 13.408C5.90974 13.7843 6.2157 14.0902 6.59202 14.282C6.74842 14.3617 6.97262 14.4267 7.41104 14.4625C7.86113 14.4992 8.44342 14.5 9.3 14.5H10.7C11.5566 14.5 12.1388 14.4992 12.5889 14.4625C13.0274 14.4267 13.2516 14.3617 13.408 14.282C13.7843 14.0902 14.0902 13.7843 14.282 13.408C14.3617 13.2516 14.4267 13.0274 14.4625 12.5889C14.4992 12.1388 14.5 11.5566 14.5 10.7V9.3C14.5 8.44342 14.4992 7.86113 14.4625 7.41104C14.4267 6.97262 14.3617 6.74842 14.282 6.59202C14.0902 6.2157 13.7843 5.90974 13.408 5.71799C13.2516 5.6383 13.0274 5.57337 12.5889 5.53755C12.1388 5.50078 11.5566 5.5 10.7 5.5Z" fill="white"/>
</svg>'''

TT_ICON_MINI = '''<svg width="15" height="15" viewBox="4.5 4.5 11 11" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M12.9314 6.22392C12.5107 5.76167 12.2578 5.15893 12.2578 4.5H11.7306C11.8664 5.22023 12.3137 5.83829 12.9314 6.22392Z" fill="white"/>
<path d="M8.05382 9.94764C7.14061 9.94764 6.3978 10.6602 6.3978 11.5362C6.3978 12.1467 6.75989 12.6778 7.28704 12.9434C7.09003 12.683 6.97288 12.3637 6.97288 12.0164C6.97288 11.1404 7.71569 10.4278 8.62891 10.4278C8.7993 10.4278 8.96435 10.4558 9.11879 10.5018V8.57106C8.95902 8.5506 8.79663 8.53782 8.62891 8.53782C8.59961 8.53782 8.57299 8.54038 8.5437 8.54038V10.0217C8.38662 9.97569 8.22421 9.94764 8.05382 9.94764Z" fill="white"/>
<path d="M14.4249 7.07184V8.54038C13.4026 8.54038 12.4548 8.22626 11.6826 7.69501V11.5387C11.6826 13.4568 10.0559 15.0199 8.05377 15.0199C7.28168 15.0199 6.56283 14.7849 5.97444 14.389C6.63737 15.0709 7.58253 15.5 8.62887 15.5C10.6283 15.5 12.2577 13.9395 12.2577 12.0189V8.17516C13.0298 8.70641 13.9776 9.02051 15 9.02051V7.13061C14.8003 7.13061 14.6086 7.11016 14.4249 7.07184Z" fill="white"/>
<path d="M11.6826 11.5387V7.69501C12.4548 8.22626 13.4026 8.54038 14.4249 8.54038V7.07184C13.8339 6.95183 13.3148 6.64535 12.9314 6.22392C12.3137 5.83829 11.869 5.22023 11.7279 4.5H10.2849L10.2822 12.0776C10.2503 12.9256 9.52076 13.6075 8.62887 13.6075C8.07507 13.6075 7.58785 13.3444 7.28434 12.946C6.75718 12.6778 6.3951 12.1492 6.3951 11.5387C6.3951 10.6628 7.13791 9.95017 8.05111 9.95017C8.2215 9.95017 8.38657 9.97828 8.541 10.0243V8.54293C6.58147 8.5838 5 10.1264 5 12.0189C5 12.9332 5.37008 13.7658 5.97444 14.389C6.56283 14.7849 7.28168 15.0199 8.05377 15.0199C10.0532 15.0199 11.6826 13.4568 11.6826 11.5387Z" fill="white"/>
</svg>'''

YT_ICON_MINI = '''<svg width="16" height="13" viewBox="4 5 12 10" fill="none" xmlns="http://www.w3.org/2000/svg">
<path fill-rule="evenodd" clip-rule="evenodd" d="M7,5 H13 A3,3 0 0 1 16,8 V12 A3,3 0 0 1 13,15 H7 A3,3 0 0 1 4,12 V8 A3,3 0 0 1 7,5 Z M9,8.3 L9,11.7 L12.3,10 Z" fill="white"/>
</svg>'''

def card_html(pid, i):
    """'CHIP - v1 gral': IG + TikTok + (YouTube if they have one, else no third chip)."""
    p = people[pid]
    role = " · ".join(p["tags"])
    third_chip = (
        f'<a class="bcard-chip" href="{p["yt_url"]}" target="_blank" rel="noopener">{YT_ICON_MINI}<span>{p["yt"]}</span></a>'
        if p.get("yt") else ""
    )
    return f'''
    <article class="bcard" style="--i:{i}">
      <img class="bcard-photo" src="{p["photo"]}" alt="{p["name"]}" loading="lazy" decoding="async" width="307" height="527">
      <div class="bcard-top-scrim" aria-hidden="true"></div>
      <div class="bcard-top">
        <h3 class="bcard-name">{p["name"]}</h3>
        <p class="bcard-role">{role}</p>
      </div>
      <div class="bcard-bottom">
        <a class="bcard-chip" href="{p["ig_url"]}" target="_blank" rel="noopener">{IG_ICON_MINI}<span>{p["ig"]}</span></a>
        <a class="bcard-chip" href="{p["tt_url"]}" target="_blank" rel="noopener">{TT_ICON_MINI}<span>{p["tt"]}</span></a>
        {third_chip}
      </div>
    </article>'''

def collage_html(ids):
    return "".join(
        f'<img class="collage-tile ct-{i+1}" src="{people[cid]["photo"]}" alt="{people[cid]["name"]}" loading="lazy" decoding="async">'
        for i, cid in enumerate(ids)
    )

def category_section(cat, collapsible=False):
    slug = cat["slug"]
    head, tail = cat["split"]
    cards = "".join(card_html(pid, i) for i, pid in enumerate(cat["order"]))
    has_collage = bool(cat.get("collage"))
    collage_cls = " collage-4" if has_collage and len(cat["collage"]) == 4 else ""
    collage_block = f'''
        <div class="cat-collage{collage_cls}">
          {collage_html(cat["collage"])}
        </div>''' if has_collage else ""
    inner_cls = "" if has_collage else " no-collage"
    section_cls = " collapsible" if collapsible else ""
    # mobile-only accordion toggle — a no-op on desktop (hidden via CSS),
    # tapping it (or the cat-cover, see JS) expands/collapses the card grid
    toggle_html = f'''
      <button class="cat-toggle" aria-expanded="false">
        <span>{len(cat["order"])} creadores</span>
        <svg width="13" height="8" viewBox="0 0 13 8" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M1 1L6.5 6.5L12 1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>''' if collapsible else ""
    return f'''
  <section class="category{section_cls}" data-cat="{cat["name"]}" data-slug="{slug}" id="cat-{slug}">
    <div class="cat-cover">
      <div class="section-inner{inner_cls}">
        <div>
          <h1>{head}{tail}</h1>
        </div>{collage_block}
      </div>
      {toggle_html}
    </div>
    <div class="cat-rail">
      <div class="rail-head">
        <div class="rail-eyebrow">{len(cat["order"])} creadores en nuestro equipo</div>
      </div>
      <div class="rail-viewport">
        <div class="rail-wrap">
          <button class="rail-arrow prev" aria-label="Anterior">‹</button>
          <button class="rail-arrow next" aria-label="Siguiente">›</button>
          <div class="rail" tabindex="0" role="region" aria-label="Creadores de {cat["name"]}, pasar el mouse y scrollear para deslizar">
            {cards}
          </div>
        </div>
        <div class="progress-track">
          <div class="progress-bar"><div class="progress-fill"></div></div>
        </div>
      </div>
    </div>
  </section>'''

font_faces = "\n".join(f'''
@font-face {{
  font-family: 'Inter';
  font-weight: {w};
  font-style: normal;
  src: url(data:font/woff2;base64,{fonts[name]}) format('woff2');
  font-display: swap;
}}''' for name, w in [("Regular", 400), ("Medium", 500), ("Bold", 700), ("Black", 900)])

def fondo_svg():
    return f'<svg viewBox="{FONDO_VIEWBOX}" preserveAspectRatio="xMidYMid slice">{FONDO_INNER}</svg>'

sections_html = (
    "\n".join(category_section(cat) for cat in SECTIONS)
    + "\n" + "\n".join(category_section(cat, collapsible=True) for cat in CATEGORY_SECTIONS)
)
slug_map = json.dumps({cat["name"]: cat["slug"] for cat in ALL_SECTIONS})
category_slugs_json = json.dumps([cat["slug"] for cat in CATEGORY_SECTIONS])
cat_menu_links = "\n".join(
    f'<a href="#cat-{cat["slug"]}" class="cat-menu-link" data-slug="{cat["slug"]}">{cat["name"]}</a>'
    for cat in CATEGORY_SECTIONS
)

html = f'''<meta name="viewport" content="width=device-width, initial-scale=1">
<title>BIG Roster 2026</title>
<style>
{font_faces}

:root {{
  --azul: #33419A;
  --naranja: #F36F2C;
  --fondo: #F7D8BD;
  --lima: #E8F29C;
  --negro: #0D0D14;
  --blanco: #FFFFFF;
}}

* {{ box-sizing: border-box; margin: 0; padding: 0; }}
html {{ scroll-behavior: smooth; }}
body {{
  font-family: 'Inter', -apple-system, sans-serif;
  background: var(--fondo);
  color: var(--azul);
  overflow-x: hidden;
  letter-spacing: -0.01em;
}}

.page-flow {{ position: relative; }}
.below-hero {{ position: relative; }}
.bg-fondo {{ position: absolute; inset: 0; z-index: 0; pointer-events: none; overflow: hidden; }}
.bg-fondo svg {{ position: absolute; top: -5%; left: -5%; width: 110%; height: 110%; display: block; }}

/* ---------- NAV ---------- */
.nav {{
  position: fixed; top: 0; left: 0; right: 0; z-index: 100;
  display: flex; align-items: center; justify-content: space-between;
  padding: 18px 32px;
}}
.nav-brand {{
  display: flex; align-items: center; justify-content: center; flex-shrink: 0; cursor: pointer; border: none;
  background: var(--naranja); border-radius: 12px; padding: 9px;
  transition: background .25s ease;
}}
.nav-brand:hover {{ background: var(--azul); }}

/* "explorar por categorías" — separate from the Mujeres/Hombres dock on
   purpose, sits up in the nav so it reads as a distinct, secondary way to
   navigate (the 9 categories from the PDF) rather than a third main tab */
.cat-menu {{ position: relative; }}
.cat-menu-btn {{
  display: inline-flex; align-items: center; gap: 9px;
  background: var(--fondo); color: var(--naranja); cursor: pointer;
  border: 1.5px solid var(--naranja); border-radius: 999px;
  font-family: inherit; font-size: 12.5px; font-weight: 600;
  letter-spacing: .02em; text-transform: uppercase;
  padding: 9px 16px;
  transition: background .25s ease, color .25s ease, border-color .25s ease;
}}
.cat-menu-btn:hover, .cat-menu.open .cat-menu-btn, .cat-menu-btn.in-category {{
  background: var(--naranja); color: var(--blanco); border-color: transparent;
}}
.cat-menu-chevron {{ transition: transform .25s ease; flex-shrink: 0; }}
.cat-menu.open .cat-menu-chevron {{ transform: rotate(180deg); }}
.cat-menu-panel {{
  position: absolute; top: calc(100% + 10px); right: 0; z-index: 50;
  min-width: 250px; background: var(--blanco); border-radius: 20px; padding: 10px;
  display: flex; flex-direction: column; gap: 2px;
  box-shadow: 0 20px 45px rgba(13,13,23,.22);
  opacity: 0; transform: translateY(-8px) scale(.98); pointer-events: none;
  transition: opacity .22s ease, transform .22s ease;
}}
.cat-menu.open .cat-menu-panel {{ opacity: 1; transform: translateY(0) scale(1); pointer-events: auto; }}
.cat-menu-link {{
  display: block; padding: 11px 14px; border-radius: 12px; text-decoration: none;
  color: var(--azul); font-weight: 700; font-size: 14.5px; letter-spacing: -0.01em;
  transition: background .2s ease, color .2s ease;
}}
.cat-menu-link:hover, .cat-menu-link.active {{ background: var(--fondo); color: var(--naranja); }}

/* floating tab dock — pinned to the bottom of the screen, always reachable
   mid-scroll so you can jump straight from Mujeres to Hombres (or back)
   without scrolling all the way up to a top nav first */
.tabs-dock {{
  position: fixed; left: 50%; bottom: 24px; z-index: 100;
  transform: translateX(-50%);
  display: flex;
}}
.tabs {{ position: relative; display: flex; gap: 4px; }}
.tab-pill {{
  position: absolute; top: 4px; height: calc(100% - 8px);
  border-radius: 999px; background: var(--naranja);
  opacity: 0;
  transition: transform .45s cubic-bezier(.16,1,.3,1), width .45s cubic-bezier(.16,1,.3,1), opacity .3s ease;
  z-index: 0;
}}
.tab-pill.show {{ opacity: 1; }}
.tab {{
  position: relative; z-index: 1;
  background: var(--fondo); cursor: pointer; border-radius: 999px;
  border: 1.5px solid var(--naranja);
  font-family: inherit; font-size: 12.5px; font-weight: 600;
  letter-spacing: .02em; text-transform: uppercase;
  color: var(--naranja);
  padding: 9px 16px; white-space: nowrap;
  transition: color .3s ease, background .3s ease, border-color .3s ease;
}}
.tab:hover, .tab.active {{
  background: var(--naranja); color: var(--blanco); border-color: transparent; font-weight: 800;
}}

.tab:focus-visible, .nav-brand:focus-visible, .rail-arrow:focus-visible, .rail:focus-visible, .scroll-cue:focus-visible,
.cat-menu-btn:focus-visible, .cat-menu-link:focus-visible {{
  outline: 2px solid var(--lima); outline-offset: 3px;
}}

.section-inner {{ position: relative; z-index: 1; width: 100%; max-width: min(1600px, 90vw); margin: 0 auto; padding: 0 32px; }}

/* ---------- PORTADA ---------- */
.portada {{
  position: relative; min-height: 82vh; overflow: hidden;
  display: flex; align-items: center; padding: 140px 0 100px;
  border-radius: 0 0 64px 64px;
  background: var(--naranja);
  border-bottom: 2px solid var(--fondo);
}}
.portada .section-inner {{ max-width: 900px; }}
.portada h1 {{
  color: var(--blanco);
  font-weight: 900; line-height: .85; letter-spacing: -0.07em; text-transform: uppercase;
  font-size: clamp(56px, 8vw, 128px);
  opacity: 0; transform: translateY(24px);
  animation: riseIn .8s cubic-bezier(.16,1,.3,1) .18s forwards;
}}
.portada h1 .lima {{ color: var(--fondo); display: block; }}
.portada p {{
  margin-top: 26px; max-width: 520px; font-size: 20px; font-weight: 500;
  line-height: 1.5; color: rgba(255,255,255,.78);
  opacity: 0; transform: translateY(18px);
  animation: riseIn .7s cubic-bezier(.16,1,.3,1) .34s forwards;
}}
@keyframes riseIn {{ to {{ opacity: 1; transform: translateY(0); }} }}

.scroll-cue {{
  position: absolute; bottom: 36px; left: 32px; z-index: 2;
  display: flex; align-items: center; gap: 10px;
  font-size: 12px; font-weight: 600; letter-spacing: .04em; text-transform: uppercase;
  color: rgba(255,255,255,.55); cursor: pointer; border: none; background: none; font-family: inherit;
}}
.scroll-cue .chev {{ display: block; animation: bounce 1.8s ease-in-out infinite; }}
@keyframes bounce {{ 0%,100% {{ transform: translateY(0); }} 50% {{ transform: translateY(5px); }} }}

.cat-viewport {{ position: relative; }}
.category {{ display: block; }}

.cat-cover {{ position: relative; min-height: 92vh; overflow: hidden; display: flex; align-items: center; padding: 120px 0 80px; }}
.cat-cover .section-inner {{ display: grid; grid-template-columns: 1.15fr 1fr; gap: 40px; align-items: center; }}
.cat-cover h1 {{
  color: var(--naranja);
  font-weight: 900; line-height: .85; letter-spacing: -0.07em; text-transform: uppercase;
  font-size: clamp(64px, 9vw, 148px);
  opacity: 0; transform: translateY(24px);
  animation: riseIn .8s cubic-bezier(.16,1,.3,1) .1s forwards;
}}
.cat-cover p {{
  margin-top: 26px; max-width: 460px; font-size: 19px; font-weight: 500;
  line-height: 1.45; color: var(--naranja);
  opacity: 0; transform: translateY(18px);
  animation: riseIn .7s cubic-bezier(.16,1,.3,1) .38s forwards;
}}
/* category covers with no collage (all the secondary PDF categories) get
   the full width back and a slightly smaller, wrap-friendly headline since
   names like "Tecnología & Crypto" are much longer than "MUJERES" */
.section-inner.no-collage {{ grid-template-columns: 1fr; }}
.section-inner.no-collage h1 {{ font-size: clamp(48px, 7vw, 120px); max-width: 1100px; text-wrap: balance; }}
.cat-collage {{ position: relative; height: 680px; opacity: 0; animation: riseIn .9s cubic-bezier(.16,1,.3,1) .5s forwards; }}
.collage-tile {{ position: absolute; display: block; border-radius: 32px; width: auto; height: auto; object-fit: cover; object-position: center; }}
.ct-1 {{ width: 40%; height: 47%; left: 0; top: 2%; }}
.ct-2 {{ width: 40%; height: 47%; left: 0; bottom: 2%; }}
.ct-3 {{ width: 44%; height: 88%; right: 0; top: 8%; }}
#cat-hombres .ct-3 {{ object-position: 30% center; }}

/* 4-photo collage: a staggered 2x2 (right column dropped lower than the
   left) instead of a rigid grid, so it doesn't read as too static */
.cat-collage.collage-4 .ct-1 {{ width: 40%; height: 43%; left: 0; top: 2%; }}
.cat-collage.collage-4 .ct-2 {{ width: 40%; height: 43%; left: 0; top: 47%; }}
.cat-collage.collage-4 .ct-3 {{ width: 40%; height: 43%; right: 0; left: auto; top: 8%; }}
.ct-4 {{ width: 40%; height: 43%; right: 0; top: 53%; }}

.cat-rail {{ position: relative; padding: 40px 0 0; }}
.rail-head {{
  position: relative; z-index: 1;
  padding: 0 clamp(24px, 4vw, 64px); margin: 0 0 40px;
  opacity: 0; transform: translateY(20px); transition: opacity .7s cubic-bezier(.16,1,.3,1), transform .7s cubic-bezier(.16,1,.3,1);
}}
.rail-head.inview {{ opacity: 1; transform: translateY(0); }}
.rail-eyebrow {{ color: var(--naranja); font-weight: 700; font-size: 13px; letter-spacing: .06em; text-transform: uppercase; }}

/* the wheel/trackpad only drives the horizontal slide while the pointer is
   actually over this viewport (JS intercepts 'wheel' here and calls
   preventDefault while there's still room to slide) — scrolling anywhere
   else on the page (below the rail, over the dock, etc.) always scrolls
   the page normally, never gets captured by the carousel */
.rail-viewport {{
  position: relative;
  display: flex; flex-direction: column; gap: 20px;
  overflow: hidden;
}}
.rail-wrap {{ position: relative; z-index: 1; width: 100%; padding: 0 clamp(24px, 4vw, 64px); }}
.rail {{
  display: flex; gap: clamp(18px, 1.6vw, 26px);
  padding: 10px 0 8px; cursor: grab; user-select: none;
  will-change: transform;
}}
.rail.dragging {{ cursor: grabbing; }}

/* ---------- TARJETA TALENTO — CLEAN BLUR, CHIPS ABAJO (Figma node 97:242) ---------- */
.bcard {{
  flex: 0 0 clamp(280px, 19vw, 380px); aspect-ratio: 307 / 527; position: relative;
  border-radius: 32px; overflow: hidden; background: #d9d9d9;
  transition: transform .4s cubic-bezier(.16,1,.3,1), box-shadow .4s cubic-bezier(.16,1,.3,1);
}}
.bcard:hover {{ transform: translateY(-6px); box-shadow: 0 22px 44px rgba(13,13,23,.28); }}
@keyframes cardNudge {{
  0%, 100% {{ transform: translateX(0); }}
  32% {{ transform: translateX(16px); }}
  64% {{ transform: translateX(-8px); }}
}}
.bcard.hint-nudge {{ animation: cardNudge 1.7s cubic-bezier(.45,0,.2,1) .1s 1; }}
.bcard-photo {{
  position: absolute; inset: 0; width: 100%; height: 100%;
  object-fit: cover; object-position: center top; pointer-events: none;
  transition: transform .5s cubic-bezier(.16,1,.3,1);
}}
.bcard:hover .bcard-photo {{ transform: scale(1.05); }}
/* dark vignette at both the top (name) and bottom (chips) — the chips no
   longer sit on their own background bar, so the photo needs to darken
   under them directly for contrast */
.bcard-top-scrim {{
  position: absolute; inset: 0; pointer-events: none;
  background:
    linear-gradient(to bottom, rgba(13,13,23,0) 76%, rgba(13,13,23,.8) 100%),
    linear-gradient(to bottom, rgba(13,13,23,.95) 0%, rgba(13,13,23,0) 19%);
}}
.bcard-top {{ position: absolute; top: 26px; left: 24px; right: 24px; pointer-events: none; display: flex; flex-direction: column; align-items: flex-start; gap: 6px; }}
.bcard-name {{ color: var(--blanco); font-size: 32px; font-weight: 700; letter-spacing: -0.03em; line-height: 1.05; }}
.bcard-role {{ color: rgba(255,255,255,.8); font-size: 13px; }}
.bcard-bottom {{
  position: absolute; left: 24px; right: 24px; bottom: 24px;
  display: flex; flex-wrap: wrap; align-items: center; gap: 6px;
}}
.bcard-chip {{
  display: inline-flex; align-items: center; gap: 4px; padding: 7px 10px 7px 8px; border-radius: 999px;
  background: rgba(255,255,255,.35); border: 1px solid rgba(255,255,255,.25);
  -webkit-backdrop-filter: blur(2.5px); backdrop-filter: blur(2.5px);
  color: var(--blanco); font-size: 12px; font-weight: 700; letter-spacing: -0.02em;
  text-decoration: none; white-space: nowrap; flex-shrink: 0;
  transition: background .2s ease, transform .2s ease;
}}
.bcard-chip:hover {{ background: rgba(255,255,255,.5); transform: translateY(-2px); }}
.bcard-chip svg {{ display: block; flex-shrink: 0; }}
.bcard-btn {{
  display: inline-flex; align-items: center; justify-content: center;
  background: var(--naranja); border: 1px solid #994712;
  color: var(--blanco); font-weight: 700; font-size: 13px;
  padding: 8px 14px; border-radius: 999px; text-decoration: none; white-space: nowrap; flex-shrink: 0;
  transition: background .2s ease, transform .2s ease;
}}
.bcard-btn:hover {{ background: #F58C56; transform: translateY(-2px); }}

.rail-arrow {{
  position: absolute; top: 42%; transform: translateY(-50%);
  width: 46px; height: 46px; border-radius: 50%; border: none; cursor: pointer;
  background: rgba(243,111,44,.16); color: var(--naranja);
  display: flex; align-items: center; justify-content: center; font-size: 18px;
  transition: background .25s ease, transform .25s ease;
  z-index: 3;
}}
.rail-arrow:hover {{ background: var(--naranja); color: var(--blanco); transform: translateY(-50%) scale(1.08); }}
.rail-arrow.prev {{ left: 4px; }}
.rail-arrow.next {{ right: 4px; }}

.progress-track {{ position: relative; z-index: 1; padding: 0 clamp(24px, 4vw, 64px); }}
.progress-bar {{ height: 3px; background: rgba(51,65,154,.18); border-radius: 3px; overflow: hidden; }}
.progress-fill {{ height: 100%; width: 25%; background: var(--naranja); border-radius: 3px; transition: width .1s linear; }}

.cat-toggle {{ display: none; }}

@media (max-width: 860px) {{
  .cat-cover {{ min-height: 0; padding: 56px 0 20px; }}
  .cat-cover .section-inner {{ grid-template-columns: 1fr; }}
  .cat-cover h1, .section-inner.no-collage h1 {{ font-size: clamp(38px, 13vw, 64px); }}
  .cat-collage {{ height: 280px; order: -1; }}
  .portada {{ border-radius: 0 0 32px 32px; }}

  /* the 8 secondary (PDF) categories collapse into a tappable accordion row
     so the page reads as a short scannable list first — Mujeres/Hombres stay
     open since they're the two primary sections */
  .category.collapsible .cat-cover {{
    flex-direction: column; align-items: stretch;
    padding-bottom: 0; cursor: pointer;
  }}
  .category.collapsible .rail-head {{ display: none; }}
  .category.collapsible .cat-rail {{ padding-top: 0; }}
  .cat-toggle {{
    display: flex; align-items: center; justify-content: space-between; gap: 12px;
    width: 100%; margin-top: 22px; padding: 16px 32px;
    background: none; border: none; border-top: 1.5px solid rgba(243,111,44,.3);
    color: var(--naranja); font-family: inherit; font-weight: 700; font-size: 13px;
    letter-spacing: .04em; text-transform: uppercase; cursor: pointer;
  }}
  .cat-toggle svg {{ transition: transform .3s ease; flex-shrink: 0; }}
  .category.collapsible.open .cat-toggle svg {{ transform: rotate(180deg); }}
  .category.collapsible .cat-rail {{
    max-height: 0; overflow: hidden; padding-top: 0;
    transition: max-height .4s cubic-bezier(.4,0,.2,1);
  }}

  /* the scroll-pinned horizontal rail is a desktop (mouse-wheel/trackpad)
     trick — on touch it's a native swipeable, snap-to-card row instead,
     full-bleed with overlaid arrow buttons (one card in view at a time) */
  .rail-viewport {{ height: auto !important; display: block !important; }}
  .rail-wrap {{ padding: 0 22px; }}
  .rail {{
    transform: none !important;
    overflow-x: auto; scroll-snap-type: x mandatory; -webkit-overflow-scrolling: touch;
    padding: 4px 0 8px; gap: 14px;
  }}
  .bcard {{ flex: 0 0 min(82vw, 420px); scroll-snap-align: center; }}
  .progress-track {{ display: none; }}
  .rail-arrow {{
    display: flex; width: 38px; height: 38px; top: 45%;
    background: rgba(13,13,23,.4); color: var(--blanco);
    -webkit-backdrop-filter: blur(3px); backdrop-filter: blur(3px);
  }}
  .rail-arrow:hover {{ background: rgba(13,13,23,.6); }}
  .rail-arrow.prev {{ left: 10px; }}
  .rail-arrow.next {{ right: 10px; }}
}}

@media (prefers-reduced-motion: reduce) {{
  html {{ scroll-behavior: auto; }}
  *, *::before, *::after {{
    animation-duration: .001ms !important; animation-iteration-count: 1 !important;
    transition-duration: .001ms !important; scroll-behavior: auto !important;
  }}
}}
</style>

<div class="page-flow" id="pageFlow">
  <nav class="nav">
    <button class="nav-brand" id="navBrand">
      {isotipo_svg(24, "#FFFFFF")}
    </button>
    <div class="cat-menu" id="catMenu">
      <button class="cat-menu-btn" id="catMenuBtn" aria-expanded="false">
        Explorar por categorías
        <svg class="cat-menu-chevron" width="11" height="7" viewBox="0 0 11 7" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M1 1L5.5 5.5L10 1" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
      <div class="cat-menu-panel" id="catMenuPanel">
        {cat_menu_links}
      </div>
    </div>
  </nav>

  <div class="tabs-dock">
    <div class="tabs" id="tabs">
      <div class="tab-pill" id="tabPill"></div>
      {tabs_html()}
    </div>
  </div>

  <section class="portada" id="portada">
    <div class="section-inner">
      <h1>Roster<span class="lima">de Talentos</span></h1>
      <p>Creadores y creadoras que conectan marcas con audiencias reales, en cada categoría y en cada red.</p>
    </div>
    <button class="scroll-cue" onclick="document.getElementById('catViewport').scrollIntoView({{behavior:'smooth'}})">
      Explorar más <span class="chev">↓</span>
    </button>
  </section>

  <div class="below-hero">
    <div class="bg-fondo" aria-hidden="true">{fondo_svg()}</div>
    <div class="cat-viewport" id="catViewport">
{sections_html}
    </div>
  </div>
</div>

<script>
const tabsEl = document.getElementById('tabs');
const pill = document.getElementById('tabPill');
const tabEls = Array.from(document.querySelectorAll('.tab'));
let currentActive = null;

function movePill(el) {{
  if (!el) {{ pill.classList.remove('show'); return; }}
  const r = el.getBoundingClientRect();
  const navR = tabsEl.getBoundingClientRect();
  pill.style.width = r.width + 'px';
  pill.style.transform = `translateX(${{r.left - navR.left + tabsEl.scrollLeft}}px)`;
  pill.classList.add('show');
}}

const SLUG_MAP = {slug_map};
const CATEGORY_SLUGS = {category_slugs_json};
const catMenu = document.getElementById('catMenu');
const catMenuBtn = document.getElementById('catMenuBtn');
const catMenuLinks = Array.from(document.querySelectorAll('.cat-menu-link'));

function setActive(cat) {{
  currentActive = cat;
  tabEls.forEach(t => t.classList.toggle('active', t.dataset.cat === cat));
  const el = cat ? tabEls.find(t => t.dataset.cat === cat) : null;
  movePill(el);
  const slug = cat ? SLUG_MAP[cat] : null;
  catMenuLinks.forEach(l => l.classList.toggle('active', l.dataset.slug === slug));
  catMenuBtn.classList.toggle('in-category', CATEGORY_SLUGS.includes(slug));
}}

const catSections = {{}};
document.querySelectorAll('.category').forEach(el => {{ catSections[el.dataset.slug] = el; }});

// ---------- mobile accordion (secondary/PDF categories only) ----------
const MOBILE_QUERY = window.matchMedia('(max-width: 860px)');

function openCategory(section) {{
  if (!section.classList.contains('collapsible') || section.classList.contains('open')) return;
  const railEl = section.querySelector('.cat-rail');
  const toggle = section.querySelector('.cat-toggle');
  section.classList.add('open');
  toggle.setAttribute('aria-expanded', 'true');
  railEl.style.maxHeight = railEl.scrollHeight + 'px';
}}
function closeCategory(section) {{
  const railEl = section.querySelector('.cat-rail');
  const toggle = section.querySelector('.cat-toggle');
  section.classList.remove('open');
  toggle.setAttribute('aria-expanded', 'false');
  railEl.style.maxHeight = '0px';
}}
function syncAccordionState() {{
  document.querySelectorAll('.category.collapsible').forEach(section => {{
    const railEl = section.querySelector('.cat-rail');
    if (!MOBILE_QUERY.matches) {{ railEl.style.maxHeight = ''; return; }}
    railEl.style.maxHeight = section.classList.contains('open') ? railEl.scrollHeight + 'px' : '0px';
  }});
}}
syncAccordionState();
MOBILE_QUERY.addEventListener('change', syncAccordionState);
window.addEventListener('resize', () => {{ if (MOBILE_QUERY.matches) syncAccordionState(); }});

document.querySelectorAll('.category.collapsible .cat-toggle').forEach(toggle => {{
  toggle.addEventListener('click', () => {{
    const section = toggle.closest('.category');
    section.classList.contains('open') ? closeCategory(section) : openCategory(section);
  }});
}});

tabEls.forEach(t => {{
  t.addEventListener('mouseenter', () => movePill(t));
  t.addEventListener('click', () => {{
    const slug = SLUG_MAP[t.dataset.cat];
    catSections[slug].scrollIntoView({{ behavior: 'smooth', block: 'start' }});
  }});
}});
tabsEl.addEventListener('mouseleave', () => movePill(currentActive ? tabEls.find(t => t.dataset.cat === currentActive) : null));
document.getElementById('navBrand').addEventListener('click', () => document.getElementById('portada').scrollIntoView({{ behavior: 'smooth' }}));

catMenuBtn.addEventListener('click', () => {{
  const open = catMenu.classList.toggle('open');
  catMenuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
}});
catMenuLinks.forEach(link => {{
  link.addEventListener('click', (e) => {{
    e.preventDefault();
    const section = catSections[link.dataset.slug];
    if (MOBILE_QUERY.matches) openCategory(section);
    section.scrollIntoView({{ behavior: 'smooth', block: 'start' }});
    catMenu.classList.remove('open');
    catMenuBtn.setAttribute('aria-expanded', 'false');
  }});
}});
document.addEventListener('click', (e) => {{
  if (!catMenu.contains(e.target)) {{
    catMenu.classList.remove('open');
    catMenuBtn.setAttribute('aria-expanded', 'false');
  }}
}});
document.addEventListener('keydown', (e) => {{
  if (e.key === 'Escape') {{
    catMenu.classList.remove('open');
    catMenuBtn.setAttribute('aria-expanded', 'false');
  }}
}});

// scrollspy: highlight whichever category section (Mujeres / Hombres, both
// stacked in the same continuous page) currently sits in the viewport centre
const portadaObserver = new IntersectionObserver((entries) => {{
  entries.forEach(e => {{ if (e.isIntersecting) setActive(null); }});
}}, {{ rootMargin: '-45% 0px -45% 0px', threshold: 0 }});
portadaObserver.observe(document.getElementById('portada'));

const sectionObserver = new IntersectionObserver((entries) => {{
  entries.forEach(e => {{ if (e.isIntersecting) setActive(e.target.dataset.cat); }});
}}, {{ rootMargin: '-45% 0px -45% 0px', threshold: 0 }});
Object.values(catSections).forEach(el => sectionObserver.observe(el));

window.addEventListener('resize', () => movePill(currentActive ? tabEls.find(t => t.dataset.cat === currentActive) : null));

const io = new IntersectionObserver((entries) => {{
  entries.forEach(e => {{
    if (!e.isIntersecting) return;
    e.target.classList.add('inview');
    // one-shot "invite to slide" nudge on the first couple cards of this rail
    const rail = e.target.closest('.cat-rail').querySelector('.rail');
    Array.from(rail.children).slice(0, 2).forEach(c => c.classList.add('hint-nudge'));
    io.unobserve(e.target);
  }});
}}, {{ threshold: .2 }});
document.querySelectorAll('.rail-head').forEach(el => io.observe(el));

// ---------- horizontal rail: hover edges + trackpad swipe ----------
// plain vertical scroll (mouse wheel, or a trackpad swipe with no horizontal
// component) is NEVER captured — the page just scrolls normally no matter
// where the pointer is. Two ways to move the carousel instead:
//   1. resting the pointer over the left/right half of the rail auto-slides
//      slowly in that direction, for as long as it stays there;
//   2. a trackpad's native horizontal swipe (wheel events with a deltaX)
//      slides the rail directly, same direction as any other horizontally
//      scrollable page content (swipe right -> content moves toward the end).
const HOVER_SLIDE_SPEED = 4.5; // px per animation frame while parked on an edge

document.querySelectorAll('.cat-rail').forEach(catRail => {{
  const viewport = catRail.querySelector('.rail-viewport');
  const wrap = catRail.querySelector('.rail-wrap');
  const rail = catRail.querySelector('.rail');
  const progressFill = catRail.querySelector('.progress-fill');
  const prevBtn = catRail.querySelector('.rail-arrow.prev');
  const nextBtn = catRail.querySelector('.rail-arrow.next');
  let maxDistance = 0;
  let progress = 0;
  let hoverDir = 0;
  let hoverRafId = null;
  let isDown = false, startX = 0, moved = false;

  function isDesktop() {{ return window.matchMedia('(min-width: 861px)').matches; }}

  function measure() {{
    // .rail itself has no padding — the left/right inset lives on .rail-wrap
    // — so it has to be added back in, otherwise the carousel stops short
    // and the last card's far edge gets clipped by the viewport's overflow
    const wrapStyle = getComputedStyle(wrap);
    const padX = (parseFloat(wrapStyle.paddingLeft) || 0) + (parseFloat(wrapStyle.paddingRight) || 0);
    maxDistance = Math.max(0, rail.scrollWidth + padX - viewport.clientWidth);
    progress = Math.min(1, progress);
    update();
  }}
  function update() {{
    rail.style.transform = `translateX(${{-progress * maxDistance}}px)`;
    progressFill.style.width = (maxDistance > 0 ? progress * 100 : 0) + '%';
  }}
  function nudge(deltaPx) {{
    if (maxDistance <= 0) return;
    progress = Math.min(1, Math.max(0, progress + deltaPx / maxDistance));
    update();
  }}

  function hoverStep() {{
    if (hoverDir === 0 || isDown) {{ clearInterval(hoverRafId); hoverRafId = null; return; }}
    nudge(hoverDir * HOVER_SLIDE_SPEED);
  }}
  viewport.addEventListener('mousemove', (e) => {{
    if (!isDesktop() || maxDistance <= 0) return;
    // only the card sitting right at the left/right edge triggers auto-slide —
    // every other card in the middle is a dead zone so it stays clickable
    const rect = viewport.getBoundingClientRect();
    const first = rail.firstElementChild;
    const edgeZone = first ? first.getBoundingClientRect().width : 100;
    const x = e.clientX - rect.left;
    let dir = 0;
    if (x < edgeZone) dir = -1;
    else if (x > rect.width - edgeZone) dir = 1;
    if (dir !== hoverDir) {{
      hoverDir = dir;
      if (dir !== 0 && !hoverRafId) hoverRafId = setInterval(hoverStep, 16);
    }}
  }});
  viewport.addEventListener('mouseleave', () => {{ hoverDir = 0; }});

  viewport.addEventListener('wheel', (e) => {{
    if (!isDesktop() || Math.abs(e.deltaX) < 1) return; // no horizontal component -> let the page scroll
    const goingRight = e.deltaX > 0;
    const canConsume = (goingRight && progress < 1) || (!goingRight && progress > 0);
    if (!canConsume) return;
    e.preventDefault();
    nudge(e.deltaX);
  }}, {{ passive: false }});

  rail.addEventListener('pointerdown', (e) => {{
    if (e.target.closest('a') || e.pointerType === 'touch' || !isDesktop()) return;
    isDown = true; moved = false; hoverDir = 0;
    rail.classList.add('dragging');
    startX = e.clientX;
    rail.setPointerCapture(e.pointerId);
  }});
  rail.addEventListener('pointermove', (e) => {{
    if (!isDown) return;
    const dx = e.clientX - startX;
    if (Math.abs(dx) > 4) moved = true;
    nudge(-dx);
    startX = e.clientX;
  }});
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev =>
    rail.addEventListener(ev, () => {{ isDown = false; rail.classList.remove('dragging'); }})
  );
  rail.addEventListener('click', (e) => {{ if (moved) e.preventDefault(); }}, true);

  function scrollByCards(dir) {{
    const first = rail.firstElementChild;
    const gap = parseFloat(getComputedStyle(rail).columnGap || getComputedStyle(rail).gap || '26');
    const step = (first ? first.getBoundingClientRect().width : 300) + gap;
    if (isDesktop()) {{
      nudge(dir * step);
    }} else {{
      // mobile rail is native overflow-x scroll, not transform-driven
      rail.scrollBy({{ left: dir * step, behavior: 'smooth' }});
    }}
  }}
  prevBtn.addEventListener('click', () => scrollByCards(-1));
  nextBtn.addEventListener('click', () => scrollByCards(1));

  measure();
  window.addEventListener('resize', measure);
  catRail.querySelectorAll('.bcard-photo').forEach(img => {{
    if (!img.complete) img.addEventListener('load', measure, {{ once: true }});
  }});
}});
</script>
'''

out_path = os.path.join(HERE, "roster.html")
with open(out_path, "w") as f:
    f.write(html)
print("wrote", out_path, len(html) / 1024, "KB")
