# -*- coding: utf-8 -*-
"""BIG × Scrub Daddy. Adapted from the Somos Fans brand-deck scaffold.
Real roster portraits and a real partner logo; the campaign is explicitly a proposal.
Run from any directory: python3 build_deck.py
"""
from pathlib import Path
from html import escape
import json
import hashlib
HERE=Path(__file__).resolve().parent
people=json.loads((HERE/'people.json').read_text())
budget=json.loads((HERE/'budget.json').read_text())
SCENES=[
 dict(id='pia',pid='pia_scarnato',short='Pía',number='01',sponge='mommy',product='Scrub Mommy',surface='Bacha de cerámica',kind='sink',color='#ddd0ff',accent='#6743dc',title='El after del GRWM.',quote='El look: 10/10. La bacha: mejor no hablemos.',story='Pía termina de prepararse y la cámara descubre el verdadero detrás de escena: la bacha. Un cambio de protagonista, espuma y un final tan impecable como el look.',benefit='Dos caras, una solución: FlexTexture® para frotar y ResoFoam® para absorber y hacer espuma.',reveal='Lista para salir.\nY para volver.',result='El look y la bacha: 10/10.',productUrl='https://scrubdaddy.com.ar/productos/scrub-mommy/'),
 dict(id='ber',pid='ber_scarnato',short='Ber',number='02',sponge='daddy',product='Scrub Daddy Original',surface='Olla de acero inoxidable',kind='pan',color='#bdebb9',accent='#257a45',title='Una receta. Toda la cocina.',quote='Decía «una receta fácil». No decía cuántas cosas iba a ensuciar.',story='Ber cocina algo simple y convierte la cocina en una producción. Cuando llega la hora de lavar, Scrub Daddy entra a resolver el último paso de la receta.',benefit='FlexTexture® se vuelve firme con agua fría para trabajar sobre residuos persistentes.',reveal='Chef del caos.\nCrack del después.',result='Receta terminada. Olla también.',productUrl='https://scrubdaddy.com.ar/productos/scrub-daddy-original1/'),
 dict(id='renata',pid='renata_blasevich',short='Renata',number='03',sponge='mommy',product='Scrub Mommy',surface='Mesada de granito',kind='counter',color='#ffc7db',accent='#bc366b',title='«Estamos abajo».',quote='Yo: vengan cuando quieran. También yo: ¿YA?',story='Un mensaje dispara el operativo visitas. Renata intenta acomodar todo al mismo tiempo; Scrub Mommy y la mesada se llevan su propio momento de transformación.',benefit='El lado ResoFoam® absorbe líquidos y el lado FlexTexture® ayuda con la limpieza de la superficie.',reveal='Que pase\nla visita.',result='Mesada lista. Que suban.',productUrl='https://scrubdaddy.com.ar/productos/scrub-mommy/'),
 dict(id='cris',pid='cris_pierri',short='Cris',number='04',sponge='daddy',product='Scrub Daddy Original',surface='Plato de cerámica',kind='plate',color='#bde5ff',accent='#2263c0',title='Lo dejé en remojo.',quote='Ese plato está en remojo desde otra gestión.',story='Cris defiende con toda seriedad su estrategia de postergar el lavado. Hasta que una esponja sonriente resuelve lo que él venía negociando hace días.',benefit='Con agua tibia, FlexTexture® se ablanda para un lavado más suave de la vajilla.',reveal='Chau excusas.\nHola sonrisa.',result='Se terminó el mandato del remojo.',productUrl='https://scrubdaddy.com.ar/productos/scrub-daddy-original1/'),
]
for s in SCENES:
 s['name']=people[s['pid']]['name'];s['photo']=people[s['pid']]['photo'];s['ig']=people[s['pid']]['ig_url']

# The visual deck keeps one idea per scene; full working scripts can evolve separately.
for s,story,benefit in zip(SCENES,[
 'El look está listo. La bacha necesita su propio cambio de look.',
 'Una receta fácil. Una montaña de cosas por lavar. Falta el último paso.',
 'Llega el mensaje: «Estamos abajo». Empieza el operativo mesada.',
 'El plato sigue en remojo. La esponja le pone fin a la excusa.',
],[
 'Un lado para frotar. Otro para absorber y hacer espuma.',
 'Con agua fría, FlexTexture® se vuelve firme para frotar.',
 'ResoFoam® absorbe. FlexTexture® ayuda a limpiar la superficie.',
 'Con agua tibia, FlexTexture® se ablanda para lavar la vajilla.',
]):
 s['story']=story;s['benefit']=benefit

def cards():
 return '\n'.join(f'''<article class="talent-card" data-reveal style="--delay:{i*90}ms;--card-color:{s['color']};--card-accent:{s['accent']};--card-rotate:{[-2,1.5,-1.5,2][i]}deg">
 <button class="talent-image-button" data-scene-link="{i}" aria-label="Probar la escena de {escape(s['name'])}">
 <img src="{s['photo']}" alt="{escape(s['name'])}" width="600" height="900" loading="eager" decoding="async">
 <span class="talent-name">{escape(s['name']).replace(' ', '<br>',1)}</span>
 </button>
 <div class="talent-caption"><span>{escape(s['title'])}</span><a href="{s['ig']}" target="_blank" rel="noopener noreferrer" aria-label="Instagram de {escape(s['name'])}">IG</a></div></article>''' for i,s in enumerate(SCENES))

def tabs():
 return '\n'.join(f'<button role="tab" id="scene-tab-{i}" aria-controls="scene-panel" aria-selected="{str(i==0).lower()}" tabindex="{0 if i==0 else -1}" data-scene="{i}">{s["short"]}<span class="tab-done" aria-hidden="true">✓</span></button>' for i,s in enumerate(SCENES))

def reels():
 return '\n'.join(f'''<figure class="reel-card" style="--left:{[0,20,41,61][i]}%;--top:{[28,2,20,5][i]}px;--rotate:{[-12,-5,5,13][i]}deg;--delay:{i*110}ms"><img src="{s['photo']}" alt="{escape(s['name'])}" width="600" height="900" loading="lazy"><span class="reel-play" aria-hidden="true">▶</span><figcaption>{['El after.','La receta.','La visita.','El remojo.'][i]}</figcaption></figure>''' for i,s in enumerate(SCENES))

def versioned(name):
 return f'{name}?v={hashlib.sha256((HERE/name).read_bytes()).hexdigest()[:12]}'

def budget_cards():
 out=[]
 for i,s in enumerate(SCENES):
  p=people[s['pid']];rates=budget['talents'][s['pid']]
  socials=''.join(f'<a href="{escape(p[key+"_url"])}" target="_blank" rel="noopener noreferrer" aria-label="{label} de {escape(p["name"])}">{label}</a>' for key,label in [('ig','Instagram'),('tt','TikTok')])
  followers=''.join(f'<div class="budget-follow"><strong>{escape(p[key].replace(".",","))}</strong><span>Seguidores {label}</span></div>' for key,label in [('ig','Instagram'),('tt','TikTok')])
  rows=''.join(f'<div class="budget-row"><dt>{escape(f["label"])}</dt><dd>{escape(str(rates[f["key"]])) if rates[f["key"]] is not None else "A cotizar"}</dd></div>' for f in budget['formats'])
  out.append(f'''<article class="budget-card" data-reveal style="--budget-color:{s['color']};--delay:{(i%2)*100}ms" aria-labelledby="budget-name-{s['id']}">
 <div class="budget-talent"><img class="budget-avatar" src="{escape(p['photo'])}" alt="{escape(p['name'])}" width="72" height="72" loading="lazy"><div><h3 id="budget-name-{s['id']}">{escape(p['name'])}</h3><p>{escape(' · '.join(p['tags']))}</p><div class="budget-socials">{socials}</div></div></div>
 <div class="budget-followers">{followers}</div><dl class="budget-rows">{rows}</dl></article>''')
 return '\n'.join(out)

template=(HERE/'template.html').read_text()
module_imports={'imports':{f'./{name}':f'./{versioned(name)}' for name in ['app.js','sponges.js','geometry.js','cleaning.js','navigation.js']}}
replacements={'TALENT_CARDS':cards(),'SCENE_TABS':tabs(),'REEL_CARDS':reels(),'BUDGET_CARDS':budget_cards(),'BUDGET_NOTE':escape(budget['note']),'SCENES_JSON':json.dumps(SCENES,ensure_ascii=False).replace('</','<\\/'), 'YEAR':'2026','STYLES_URL':versioned('styles.css'),'STARTUP_URL':versioned('startup.js'),'MODULE_IMPORTS':json.dumps(module_imports)}
for k,v in replacements.items():template=template.replace('{{'+k+'}}',v)
assert '{{' not in template
(HERE/'index.html').write_text(template)
print('Built index.html — 4 real talents / 4 playable proposed scenes.')
