export const CREADORES = {
  pablo:  { nombre: 'Pablo Bruschi',    usuario: 'pablobruschi',    seguidores: '1,7 M',  foto: 'assets/fotos/pablo_bruschi.webp',    fila: 1 },
  nacho:  { nombre: 'Nacho Mer',        usuario: 'inachomer',       seguidores: '762 K',  foto: 'assets/fotos/inachomer.webp',        fila: 2 },
  ber:    { nombre: 'Ber Scarnato',     usuario: 'berscarnato',     seguidores: '432 K',  foto: 'assets/fotos/ber_scarnato.webp',     fila: 2 },
  renata: { nombre: 'Renata Blasevich', usuario: 'renatablasevich', seguidores: '329 K',  foto: 'assets/fotos/renata_blasevich.webp', fila: 3 },
  feli:   { nombre: 'Feli Peschi',      usuario: 'felipeschi1',     seguidores: '288 K',  foto: 'assets/fotos/felicitas_peschi.webp', fila: 3 },
  morena: { nombre: 'Morena López',     usuario: 'morena',          seguidores: '92 K',   foto: 'assets/fotos/morena.webp',           fila: 4 },
  agus:   { nombre: 'Agus Cambra',      usuario: 'agusfc_',         seguidores: '35,3 K', foto: 'assets/fotos/agustina_cambra.webp',  fila: 4 },
};

export const ETAPAS = [
  {
    id: 'previa', nombre: 'Previa', fechas: '26 y 27 de noviembre', desde: 4, hasta: 5, color: 'naranja',
    resumen: 'Avisamos que el Primavera se ve en Disney+, con días y horarios.',
    cartas: [['reel', 2], ['story', 2]],
  },
  {
    id: 'vivo', nombre: 'En vivo', fechas: '28 y 29 de noviembre', desde: 6, hasta: 7, color: 'celeste',
    resumen: 'Desde el predio y desde un sillón, mandamos a la transmisión mientras pasa.',
    cartas: [['reel', 3], ['story', 4]],
  },
  {
    id: 'repeticion', nombre: 'Repetición', fechas: '30 de noviembre al 5 de diciembre', desde: 8, hasta: 13, color: 'lila',
    resumen: 'Lo que te perdiste sigue 30 días en Disney+.',
    cartas: [['reel', 2], ['story', 1]],
  },
];

export const PIEZAS = [
  {
    id: 'ber', quien: 'Ber Scarnato', etapa: 'previa', dia: 4, cuando: '26 de noviembre', formato: 'Reel en collab', creadores: ['ber'],
    titulo: 'El que va vs. el que lo mira en Disney+',
    gancho: { texto: 'Este finde hay dos tipos de personas: los que van al Primavera y los que lo miran en Disney+.', cita: true },
    pasa: 'Ber hace de los dos: el que sufre el festival (la fila, el calor, uno alto adelante) y el que lo mira tirado en el sillón, en primera fila.',
    cierre: { texto: 'Sábado desde las 14:30, en vivo por Disney+.', cita: true },
  },
  {
    id: 'morena', quien: 'Morena López', etapa: 'previa', dia: 5, cuando: '27 de noviembre', formato: 'Reel en collab', creadores: ['morena'],
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
    id: 'pablo', quien: 'Pablo Bruschi', etapa: 'repeticion', dia: 10, cuando: '2 de diciembre', formato: 'Reel en collab', creadores: ['pablo'],
    titulo: 'Yo estuve en el Primavera (mentira)',
    gancho: { texto: 'El lunes todos dicen que fueron al Primavera.', cita: true },
    pasa: 'Un sketch en la oficina: Pablo cuenta el festival como si hubiera estado, con detalles que solo sabe porque lo vio después en Disney+.',
    cierre: { texto: 'Los shows completos, 30 días en Disney+.', cita: true },
  },
  {
    id: 'agus', quien: 'Agus Cambra', etapa: 'repeticion', dia: 11, cuando: '3 de diciembre', formato: 'Reel + stories', creadores: ['agus'], placa: true,
    titulo: 'Lo que pasó en el Primavera',
    gancho: { texto: 'Lo conocí en el show de The Strokes.', cita: true },
    pasa: 'Ficción corta de romance, grabada en el predio.',
    cierre: { texto: 'El show de esa noche está en Disney+.', cita: true },
  },
];

export const DISTRIBUCION = [
  { id: 'collab', titulo: 'Reels en collab', texto: 'Cada Reel aparece en el perfil del creador y en los de Disney+ y Primavera Sound.', quien: 'Orgánico' },
  { id: 'link', titulo: 'Stories con link', texto: 'Cada story lleva un link con seguimiento a la transmisión.', quien: 'Tráfico' },
  { id: 'ads', titulo: 'Partnership Ads en Meta', texto: 'Concentrada del 26 al 29 de noviembre, sobre los Reels que mejor funcionen. Público propuesto: 18 a 34 años, interés en música en vivo y festivales, fuera del predio.', quien: 'Pauta incluida' },
  { id: 'tiktok', titulo: 'TikTok en dark', texto: 'Entregamos los 7 Reels listos para que Disney+ los paute en dark.', quien: 'A cargo de Disney+' },
];

export const ENTREGABLES = [
  { n: 7, texto: 'Creadores' },
  { n: 7, texto: 'Reels' },
  { n: 7, texto: 'Stories' },
  { n: 1, texto: 'Reporte final' },
];

export const PLAN = [
  { cuando: '24 nov', texto: 'Aprobación de la propuesta.' },
  { cuando: '25 nov', texto: 'Guiones y aprobación de ustedes.' },
  { cuando: '26 y 27 nov', texto: 'Previa y arranque de la pauta.' },
  { cuando: '28 y 29 nov', texto: 'En vivo, con la transmisión.' },
  { cuando: '30 nov al 5 dic', texto: 'Repetición.' },
  { cuando: '12 dic', texto: 'Reporte final.' },
];
