// Los datos del deck. Es el único archivo que hay que tocar para completar números.
//
// Los números salen de las estadísticas de Instagram de la cuenta de @pelao.khe (capturas del 17/11/2026, en
// assets/capturas/ y en ../materiales/estadisticas/). El botón «Ver captura» de cada reel las muestra: son la fuente.
//
// Cómo cambiar un dato: el número sin puntos ni comas de miles (12500, no 12.500). Porcentajes de 0 a 100
// (42,5 % → 42.5). Tiempos en segundos. Lo que quede en `null` no se muestra.
// Los totales, la tasa de interacción, el costo por mil, los gráficos y las lecturas se recalculan solos.
//
// Reels sin captura de estadísticas («Spoiler alert» y «Mentalidad de surtidor»): van con `metricas: null` y sus
// `publicos` (lo que muestra Instagram sin entrar a la cuenta). El deck los estima con la relación entre lo público
// y las estadísticas de los reels con captura (ver `estimar` en app.js) y los marca con ≈. Me gusta y comentarios no se
// estiman: son los públicos. Cuando llegue la captura, cargá `metricas` como en los otros y sumá `capturas`.
//
// Si cambiás la fecha de corte o la fuente, cambiala en FUENTES: se muestra debajo de cada tabla.

window.CAMPANA = {
  nombre: 'Invertí en disfrutar',
  marca: '365',
  hashtag: '#InvertiEnDisfrutar',

  creador: {
    nombre: 'Pelao Khe',
    usuario: 'pelao.khe',
    url: 'https://www.instagram.com/pelao.khe/',
    seguidores: 2971070, // Instagram, perfil público, 17/11/2026
  },

  // inversión total de la campaña, en pesos, para calcular el costo por mil visualizaciones
  inversion: null,

  corte: '17/11/2026', // el día en que se midió todo (capturas y datos públicos)

  FUENTES: {
    publicas: 'Fuente: estadísticas de Instagram de @pelao.khe al 17/11/2026 (incluyen datos de anuncios).',
    pendientes: 'Las capturas están en «Ver captura», en cada reel.',
    estimados: 'Con ≈, estimado con lo público de Instagram al 17/11/2026 y los reels con captura. Visualizaciones, me gusta y comentarios son reales.',
  },

  reels: [
    {
      id: 'facto',
      beneficio: 'general', // beneficios generales; en los otros, el beneficio concreto (va en «Lo que nos deja»)
      titulo: 'El facto del día',
      url: 'https://www.instagram.com/reel/DekHbVThtM3/',
      video: 'assets/reels/facto-del-dia.mp4',
      portada: 'assets/reels/facto-del-dia.webp',
      capturas: [1, 2, 3, 4, 5, 6].map(n => `assets/capturas/facto-${n}.webp`), // resumen, visualizaciones, me gusta, sexo, país, edad
      fechaCaptura: '17/11/2026',
      publicado: '16/10/2026', // sale del código del reel en Instagram
      duracion: 32.5,
      publicos: { reproducciones: 98174, meGusta: 6256, comentarios: 573 }, // embed pública de Instagram, 17/11/2026
      copy: 'Tu plata rinde más cuando sabés cómo usarla.',
      mensaje: 'Miles de beneficios en nafta, supermercados, gastronomía, cines y turismo.',
      metricas: {
        reproducciones: 543178,  // visualizaciones
        alcance: 297933,         // espectadores (cuentas únicas)
        meGusta: 6492,
        comentarios: 573,
        compartidos: 95,
        reposteos: 62,
        guardados: 131,
        noSeguidores: 5.1,       // % de las interacciones que vino de no seguidores
        tiempoTotal: 1965293,    // tiempo de reproducción: 22 d 17 h 54 min 53 s
        nuevosSeguidores: 8,
      },
      publico: { // cuentas que vieron el reel
        sexo: [['Hombres', 71.5], ['Mujeres', 28.5]],
        edad: [['13-17', 1.8], ['18-24', 14.1], ['25-34', 49.1], ['35-44', 24.7], ['45-54', 5.9], ['55-64', 2.1], ['65+', 2.3]],
        pais: [['Argentina', 81.6], ['Uruguay', 3.3], ['Chile', 3.2], ['España', 2.7], ['México', 2.2]],
      },
    },
    {
      id: 'aura',
      beneficio: 'Jumbo',
      titulo: '+1000 de aura en la caja',
      url: 'https://www.instagram.com/reel/DezkmnUB78D/',
      video: 'assets/reels/aura-en-la-caja.mp4',
      portada: 'assets/reels/aura-en-la-caja.webp',
      capturas: [1, 2, 3, 4, 5, 6].map(n => `assets/capturas/aura-${n}.webp`), // resumen, visualizaciones, me gusta, sexo, país, edad
      fechaCaptura: '17/11/2026',
      publicado: '22/10/2026',
      duracion: 38.8,
      publicos: { reproducciones: 144737, meGusta: 7231, comentarios: 1029 },
      copy: 'Heladera llena y bolsillo tranquilo.',
      mensaje: '15 % OFF en Jumbo los lunes y jueves. En la caja, «¡Tengo 365!».',
      metricas: {
        reproducciones: 1129039,
        alcance: 566899,
        meGusta: 8456,
        comentarios: 1029,
        compartidos: 291,
        reposteos: 94,
        guardados: 203,
        noSeguidores: 13.4,
        tiempoTotal: 3007743,    // 34 d 19 h 29 min 3 s
        nuevosSeguidores: 44,
      },
      publico: {
        sexo: [['Hombres', 78.5], ['Mujeres', 21.5]],
        edad: [['13-17', 1.5], ['18-24', 10.4], ['25-34', 47.2], ['35-44', 28.4], ['45-54', 7.3], ['55-64', 2.4], ['65+', 2.8]],
        pais: [['Argentina', 84.3], ['Uruguay', 2.6], ['Chile', 2.6], ['España', 2.3], ['México', 2.1]],
      },
    },
    {
      id: 'cine',
      beneficio: 'Cinemark',
      titulo: 'Spoiler alert',
      url: 'https://www.instagram.com/reel/DfIKjZihOQL/',
      video: 'assets/reels/spoiler-alert.mp4',
      portada: 'assets/reels/spoiler-alert.webp',
      capturas: [], // no hay captura de estadísticas: «Ver captura» pasa a ser «Cómo se estimó»
      publicado: '30/10/2026',
      duracion: 32.9,
      publicos: { reproducciones: 54362, meGusta: 1913, comentarios: 210 }, // embed pública de Instagram, 17/11/2026
      copy: 'Esta peli termina con 2 entradas en tu mano al precio de una.',
      mensaje: '2x1 en Cinemark todos los días.',
      reales: { reproducciones: 971000 }, // visualizaciones de la cuenta (Tomás, 17/11/2026)
      metricas: null, // el resto, estimado en app.js con `reales` y `publicos`
    },
    {
      id: 'surtidor',
      beneficio: 'Shell',
      titulo: 'Mentalidad de surtidor',
      url: 'https://www.instagram.com/reel/DfXn__MhsRP/',
      video: 'assets/reels/mentalidad-de-surtidor.mp4',
      portada: 'assets/reels/mentalidad-de-surtidor.webp',
      capturas: [],
      publicado: '05/11/2026',
      duracion: 31,
      publicos: { reproducciones: 71660, meGusta: 2936, comentarios: 114 },
      copy: 'Llená el tanque y cuidá el bolsillo.',
      mensaje: '10 % OFF en Shell V-Power de lunes a viernes, con 365 y Shell Box.',
      reales: { reproducciones: 1000000 }, // visualizaciones de la cuenta (Tomás, 17/11/2026)
      metricas: null,
    },
  ],

  // Capturas de comentarios. Para sumar una: guardá la imagen en assets/comentarios/ y agregá un bloque igual.
  comentarios: [
    {
      imagen: 'assets/comentarios/cine.webp',
      ancho: 994, alto: 582,
      alt: 'Comentario de felipeschi1: «alguien que me lleve al cine???». Responde pelao.khe: «ALGUIEN CON 365 por acá?». Siguen makherrera y gabrielzapata09.',
      titulo: 'La marca, como respuesta',
      texto: 'Una cuenta verificada pide que la lleven al cine y el Pelao contesta con la marca. La conversación sigue sola.',
    },
    {
      imagen: 'assets/comentarios/jumbo.webp',
      ancho: 992, alto: 384,
      alt: 'Comentario de elgatodepavlovv: «Yo compraba en otro lado pero por el pelado ahora soy soldado de jumbo». Responde pelao.khe con corazones.',
      titulo: 'Un cambio de hábito',
      texto: 'Alguien de la comunidad cuenta que cambió de súper por el Pelao, y el Pelao le responde.',
    },
  ],

  // lectura de los comentarios: se completa con el relevamiento
  conversacion: {
    mencionan365: null,     // comentarios que nombran a 365
    positivos: null,        // % de comentarios positivos
    respuestasCreador: null, // respuestas del Pelao
  },


};
