# BIG × Scrub Daddy — El lado alegre del lío

Propuesta comercial interactiva con Pía Scarnato, Ber Scarnato, Renata Blasevich y Cris Pierri.

URL: https://roster.bigagency.com.ar/scrubdaddy-big/

GitHub Pages publica esta carpeta desde la raíz de `main`. Todos los recursos de la experiencia son locales: no requiere Node, CDN ni servicios externos para funcionar.

## Editar y probar

- `template.html` y `build_deck.py`: contenido y generación de `index.html`.
- `people.json`: datos públicos de los cuatro talentos utilizados por el generador.
- `budget.json`: formatos e importes por talento; `null` se muestra como «A cotizar».
- `styles.css`: estilos y diseño responsive.
- `startup.js`: carga de 0 a 100% antes de mostrar la portada.
- `app.js`, `navigation.js` y `cleaning.js`: escenas, índice, reinicio, suciedad, arrastre y espuma.
- `geometry.js`, `sponges.js` y `assets/`: geometrías, render 3D, imágenes, texturas, fuentes y Three.js r170.

Regenerar desde esta carpeta:

```sh
python3 build_deck.py
```

El generador agrega una versión basada en el contenido a los estilos y módulos para que cada publicación cargue los recursos actualizados.

Para probar la ruta de publicación, ejecutar desde la raíz del repositorio:

```sh
python3 -m http.server 8935 --bind 127.0.0.1
```

Abrir http://127.0.0.1:8935/scrubdaddy-big/. Los módulos ES requieren HTTP; no abrir con `file://`.

## Alcance

La portada se limpia con tres esponjas 3D y luego habilita el recorrido del deck. Hay cuatro escenas por talento, un visor de producto, índice flotante y botones «Volver a ensuciar». Incluye controles por teclado, reducción de movimiento y fotos de respaldo cuando WebGL no está disponible.

El cierre incluye Presupuesto con enlaces y seguidores de Instagram y TikTok para los cuatro talentos. Tarifas actualizadas el 16 de octubre de 2026: Reel, Story y TikTok incluyen «+ IVA»; la pauta por 30 días equivale al 20% del valor total del contenido.

Las geometrías se generan en el navegador desde `assets/models/silhouettes.json`. Los GLB, imágenes originales y scripts de generación de texturas permanecen en la carpeta de trabajo; no son necesarios para ejecutar ni editar el contenido de esta versión.

Los talentos, situaciones y formatos son una exploración creativa, no una campaña contratada. Validar disponibilidad, claims, inversión, calendario y derechos al desarrollar la campaña. La referencia marrón se presenta como «Fibra», pendiente de identificar con la marca. La interacción de limpieza no representa una medición de eficacia del producto.
