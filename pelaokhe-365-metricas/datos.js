// Los datos del deck. Es el único archivo que hay que tocar para completar números.
//
// Cómo completar un dato: cambiá `null` por el número, sin puntos ni comas de miles (12500, no 12.500).
// Porcentajes, como número de 0 a 100 (42,5 % → 42.5). Tiempos, en segundos (7,3 s → 7.3).
// Lo que queda en `null` se muestra como «A confirmar».
// La captura de las estadísticas de cada reel (la fuente de sus números) va en assets/capturas/ y se nombra en `captura`:
// la abre el botón «Ver captura» de cada reel. Los totales, la tasa de interacción, el costo por mil
// y la comparación reel por reel se recalculan solos con lo que haya.
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

  // inversión total de la campaña, en pesos, para calcular el costo por mil reproducciones
  inversion: null,

  FUENTES: {
    publicas: 'Reproducciones, me gusta y comentarios: contadores públicos de Instagram al 17/11/2026.',
    pendientes: 'Compartidos, reposteos, guardados, alcance y tiempo de visualización: estadísticas de la cuenta, a confirmar.',
  },

  reels: [
    {
      id: 'facto',
      titulo: 'El facto del día',
      url: 'https://www.instagram.com/reel/DekHbVThtM3/',
      video: 'assets/reels/facto-del-dia.mp4',
      portada: 'assets/reels/facto-del-dia.webp',
      captura: null,      // captura de las estadísticas del reel en el perfil: 'assets/capturas/facto-del-dia.webp'
      fechaCaptura: null, // por ejemplo '17/11/2026'
      publicado: '16/10/2026', // sale del código del reel en Instagram
      duracion: 32.5,
      copy: 'Tu plata rinde más cuando sabés cómo usarla.',
      mensaje: 'Miles de beneficios en nafta, supermercados, gastronomía, cines y turismo.',
      metricas: {
        reproducciones: 543000,
        meGusta: 6255,
        comentarios: 573,
        compartidos: null,
        reposteos: null,
        guardados: null,
        alcance: null,
        noSeguidores: null,   // % del alcance que no sigue al creador
        tiempoPromedio: null, // segundos
      },
    },
    {
      id: 'aura',
      titulo: '+1000 de aura en la caja',
      url: 'https://www.instagram.com/reel/DezkmnUB78D/',
      video: 'assets/reels/aura-en-la-caja.mp4',
      portada: 'assets/reels/aura-en-la-caja.webp',
      captura: null,      // captura de las estadísticas del reel en el perfil: 'assets/capturas/aura-en-la-caja.webp'
      fechaCaptura: null, // por ejemplo '17/11/2026'
      publicado: '22/10/2026',
      duracion: 38.8,
      copy: 'Heladera llena y bolsillo tranquilo.',
      mensaje: '15 % OFF en Jumbo los lunes y jueves. En la caja, «¡Tengo 365!».',
      metricas: {
        reproducciones: 1100000,
        meGusta: 7230,
        comentarios: 1029,
        compartidos: null,
        reposteos: null,
        guardados: null,
        alcance: null,
        noSeguidores: null,
        tiempoPromedio: null,
      },
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
