// Todo el contenido que se repite en el deck sale de acá: creadores, piezas de la campaña, distribución,
// entregables y próximos pasos. Los textos son los de la propuesta en PDF (materiales/), sin cambiar el sentido.
// Los títulos y párrafos sueltos de cada escena están en index.html.
//
// Fechas: el calendario de la campaña va del 22 de noviembre al 5 de diciembre de 2026 (`dia` cuenta desde el
// 22 de noviembre = 0). Seguidores: Instagram, como en la propuesta y en el roster. `fila`: su fila en el line-up
// (de a dos, de más a menos seguidores)

export const CREADORES = {
  pablo:  { nombre: 'Pablo Bruschi',    usuario: 'pablobruschi',    seguidores: '1,7 M',  foto: 'assets/fotos/pablo_bruschi.webp',    fila: 1 },
  pia:    { nombre: 'Pía Scarnato',     usuario: 'piascarnato',     seguidores: '1,1 M',  foto: 'assets/fotos/pia_scarnato.webp',     fila: 1 },
  nacho:  { nombre: 'Nacho Mer',        usuario: 'inachomer',       seguidores: '762 K',  foto: 'assets/fotos/inachomer.webp',        fila: 2 },
  ber:    { nombre: 'Ber Scarnato',     usuario: 'berscarnato',     seguidores: '432 K',  foto: 'assets/fotos/ber_scarnato.webp',     fila: 2 },
  renata: { nombre: 'Renata Blasevich', usuario: 'renatablasevich', seguidores: '329 K',  foto: 'assets/fotos/renata_blasevich.webp', fila: 3 },
  feli:   { nombre: 'Feli Peschi',      usuario: 'felipeschi1',     seguidores: '288 K',  foto: 'assets/fotos/felicitas_peschi.webp', fila: 3 },
  morena: { nombre: 'Morena López',     usuario: 'morena',          seguidores: '92 K',   foto: 'assets/fotos/morena.webp',           fila: 4 },
  agus:   { nombre: 'Agus Cambra',      usuario: 'agusfc_',         seguidores: '35,3 K', foto: 'assets/fotos/agustina_cambra.webp',  fila: 4 },
};

// Las tres etapas. `desde` y `hasta` son días del calendario (0 = 22 de noviembre). `color` es el pétalo de la flor
// que la representa (ver flor-datos.js). `cartas`: lo que se entrega, dibujado como mazos de cartas ([tipo, cuántas])
export const ETAPAS = [
  {
    id: 'previa', nombre: 'Previa', fechas: '22 al 27 de noviembre', desde: 0, hasta: 5, color: 'naranja',
    resumen: 'Avisamos que el Primavera se ve en Disney+, con días y horarios.',
    cartas: [['reel', 2]],
    detalle: 'La semana antes, dos Reels que dicen dónde y cuándo ver el festival.',
  },
  {
    id: 'vivo', nombre: 'En vivo', fechas: '28 y 29 de noviembre', desde: 6, hasta: 7, color: 'celeste',
    resumen: 'Desde el predio y desde un sillón, mandamos a la transmisión mientras pasa.',
    cartas: [['reel', 3], ['story', 4]],
    detalle: 'Dos creadores en el predio y una en su casa. Stories en tiempo real con link a la transmisión.',
  },
  {
    id: 'repeticion', nombre: 'Repetición', fechas: '30 de noviembre al 5 de diciembre', desde: 8, hasta: 13, color: 'lila',
    resumen: 'Lo que te perdiste sigue 30 días en Disney+.',
    cartas: [['reel', 2], ['story', 1], ['recap', 1]],
    detalle: 'Los shows siguen 30 días en Disney+. Lo recordamos la semana después.',
  },
];

// Las piezas, en orden. `dia`: dónde se para el calendario (6,5 = las dos jornadas del festival). `quien`: cómo se
// nombra a los creadores en la pieza. `gancho`, `pasa` y `cierre` son el arranque, el desarrollo y el final de cada
// video; `cita: true` cuando es lo que dice el creador (va entre comillas y aparece en la pantalla del teléfono)
export const PIEZAS = [
  {
    id: 'ber-pia', quien: 'Ber y Pía Scarnato', etapa: 'previa', dia: 2, cuando: '24 de noviembre', formato: 'Reel en collab', creadores: ['ber', 'pia'],
    titulo: 'El que va vs. la que lo mira en Disney+',
    gancho: { texto: 'Este finde hay dos tipos de personas: los que van al Primavera y los que lo miran en Disney+.', cita: true },
    pasa: 'Ber sufre el festival: la fila, el calor, uno alto adelante. Pía lo mira tirada en el sillón, en primera fila.',
    cierre: { texto: 'Sábado desde las 14:30, en vivo por Disney+.', cita: true },
  },
  {
    id: 'morena', quien: 'Morena López', etapa: 'previa', dia: 4, cuando: '26 de noviembre', formato: 'Reel en collab', creadores: ['morena'],
    titulo: 'Los shows que no me pierdo',
    gancho: { texto: 'Mi agenda del Primavera, para que no te pierdas nada.', cita: true },
    pasa: 'Arma su lista de imperdibles de los escenarios 1 y 2, con día y hora, y canta un fragmento de su favorito.',
    cierre: { texto: '¿No tenés entrada? Lo ves en vivo por Disney+.', cita: true },
  },
  {
    id: 'nacho', quien: 'Nacho Mer', etapa: 'vivo', dia: 6.5, cuando: '28 y 29 de noviembre', formato: 'Reel + stories desde el predio', creadores: ['nacho'],
    titulo: 'Saludos para los de Disney+',
    gancho: { texto: 'Mandale un saludo a alguien que te está mirando por Disney+.', cita: true },
    pasa: 'Entrevistas en el predio: a quién vinieron a ver y a quién dejaron mirando desde casa.',
    cierre: { texto: 'Lo que falta del festival, en vivo por Disney+.', cita: true },
  },
  {
    id: 'feli', quien: 'Feli Peschi', etapa: 'vivo', dia: 6.5, cuando: '28 y 29 de noviembre', formato: 'Reel + stories desde el predio', creadores: ['feli'],
    titulo: 'Coqueteo en el Primavera',
    gancho: { texto: '¿Viniste solo o te quedó alguien mirando en Disney+?', cita: true },
    pasa: 'Su formato de entrevistas con coqueteo, entre show y show.',
    cierre: { texto: 'Feli elige su match y le avisa al de casa por Disney+.', cita: false },
  },
  {
    id: 'renata', quien: 'Renata Blasevich', etapa: 'vivo', dia: 6.5, cuando: '28 y 29 de noviembre', formato: 'Reel + stories desde su casa', creadores: ['renata'],
    titulo: 'Mi Primavera desde el sillón',
    gancho: { texto: 'No conseguí entrada, así que armé mi propio Primavera.', cita: true },
    pasa: 'Vlog de la noche con amigas mirando la transmisión en Disney+: outfits, comida y los shows en la tele.',
    cierre: { texto: 'El domingo, desde las 13:45.', cita: true },
  },
  {
    id: 'morena-stories', quien: 'Morena López', etapa: 'vivo', dia: 6.5, cuando: '28 y 29 de noviembre', formato: 'Stories desde el público', creadores: ['morena'], historia: true,
    titulo: 'Además, Morena en el público',
    pasa: 'Morena López cubre el festival en stories desde el público, con link a la transmisión.',
  },
  {
    id: 'pablo', quien: 'Pablo Bruschi', etapa: 'repeticion', dia: 10, cuando: '2 de diciembre', formato: 'Reel en collab', creadores: ['pablo'],
    titulo: 'Lo que te perdiste, doblado',
    gancho: { texto: 'Momentos de la transmisión, con voces nuevas.', cita: false },
    pasa: 'Dobla escenas del festival al estilo de sus Bruschimichis.',
    cierre: { texto: 'Los shows completos, 30 días en Disney+.', cita: true },
  },
  {
    id: 'agus', quien: 'Agus Cambra', etapa: 'repeticion', dia: 11, cuando: '3 de diciembre', formato: 'Reel + stories', creadores: ['agus'],
    titulo: 'Lo que pasó en el Primavera',
    gancho: { texto: 'Lo conocí en el show de The Strokes.', cita: true },
    pasa: 'Ficción corta de romance, grabada en el predio.',
    cierre: { texto: 'El show de esa noche está en Disney+.', cita: true },
  },
  {
    id: 'recap', quien: 'BIG Agency', etapa: 'repeticion', dia: 13, cuando: '5 de diciembre', formato: 'Video para la marca', creadores: [], marca: true,
    titulo: 'Recap de la campaña',
    gancho: { texto: 'Lo mejor de los ocho creadores, editado por nosotros.', cita: false },
    pasa: 'Para las cuentas de Disney+ y Primavera Sound, y pauta en dark.',
    cierre: { texto: 'Los 30 días de repetición en Disney+.', cita: false },
  },
];

// Dónde vive cada pieza. `quien` va al pie de la tarjeta (quién la paga o de dónde sale)
export const DISTRIBUCION = [
  { id: 'collab', titulo: 'Reels en collab', texto: 'Cada Reel aparece en el perfil del creador y en los de Disney+ y Primavera Sound.', quien: 'Orgánico' },
  { id: 'link', titulo: 'Stories con link', texto: 'Durante las dos jornadas, cada set lleva un link con seguimiento a la transmisión.', quien: 'Tráfico' },
  { id: 'ads', titulo: 'Partnership Ads en Meta', texto: 'Concentrada del 26 al 29 de noviembre, sobre los Reels que mejor funcionen. Público propuesto: 18 a 34 años, interés en música en vivo y festivales, fuera del predio.', quien: 'Pauta incluida' },
  { id: 'tiktok', titulo: 'TikTok en dark', texto: 'Entregamos los 7 Reels y el recap listos para que Disney+ los paute en dark.', quien: 'A cargo de Disney+' },
];

export const ENTREGABLES = [
  { n: 7, texto: 'Reels en collab en Instagram' },
  { n: 5, texto: 'Sets de stories con link a Disney+' },
  { n: 1, texto: 'Recap de la campaña para las cuentas de Disney+' },
  { n: 1, texto: 'Campaña de Partnership Ads en Meta' },
  { n: 1, texto: 'Reporte final con clics y alcance' },
  { n: 8, texto: 'Piezas listas para pautar en dark en TikTok' },
];

// El plan desde la aprobación. `dia` cuenta desde el 19 de noviembre = 0 (para la línea de tiempo)
export const PLAN = [
  { cuando: '19 nov', texto: 'Aprobación de la propuesta.', dia: 0 },
  { cuando: '20 y 21 nov', texto: 'Guiones y aprobación de ustedes.', dia: 1.5 },
  { cuando: '22 al 27 nov', texto: 'Previa y arranque de la pauta.', dia: 5.5 },
  { cuando: '28 y 29 nov', texto: 'En vivo, con la transmisión.', dia: 9.5 },
  { cuando: '30 nov al 5 dic', texto: 'Repetición y recap.', dia: 13.5 },
  { cuando: '12 dic', texto: 'Reporte final.', dia: 23 },
];

// Cada paso, en su tarjeta: `titulo` es de qué se trata, `texto` es el de la propuesta, `cuando` la fecha si la hay
export const PASOS = [
  { titulo: 'Guiones', cuando: '19 nov', texto: 'Con su aprobación el 19 de noviembre, arrancamos los guiones.' },
  { titulo: 'Acreditaciones', cuando: '', texto: 'Coordinamos con ustedes las acreditaciones: cuatro creadores y un productor de BIG.' },
  { titulo: 'Collabs y pauta', cuando: '', texto: 'Vemos juntos las collabs, los Partnership Ads y el link de seguimiento a Disney+.' },
  { titulo: 'Doblaje', cuando: '', texto: 'Consultamos con ustedes si Pablo puede doblar imágenes de la transmisión.' },
];
