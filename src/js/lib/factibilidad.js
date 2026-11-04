// factibilidad.js
// Logica PURA de puntuacion de factibilidad de un video/producto a partir de
// una tendencia de cultura pop. NO referencia document/window: importable por
// node:test.

// Normaliza etiquetas de nivel a minusculas, sin espacios y sin acentos.
// Mismo espiritu que nivel() en src/js/lib/validator.js.
function nivel(valor) {
  if (valor == null) return "";
  return String(valor)
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Puntua la factibilidad de una idea (video o producto) nacida de una tendencia.
 *
 * Pesos (documentados):
 *  - tendencia (que tan "caliente" esta la tendencia):
 *      alta = +3, media = +1, baja = -2
 *  - potencialVideo (que tan bueno es como Reel/video corto):
 *      alta = +3, media = +1, baja = -1
 *  - esfuerzo (produccion; mas esfuerzo resta):
 *      bajo = +2, medio = 0, alto = -2
 *  - margen: acepta un nivel (alta/media/baja) O un numero margenPct.
 *      Si margenPct es un numero finito, se usan los MISMOS cortes que
 *      src/js/lib/validator.js: >= 40 = +3, >= 25 = +2, >= 15 = 0, < 15 = -3.
 *      Si no hay numero, se mapea el nivel: alta = +3, media = +1, baja = -3.
 *      Un numero margenPct TIENE PRECEDENCIA sobre el nivel de margen.
 *  - riesgoLegal (derechos de autor; el alto penaliza FUERTE):
 *      bajo = +2, medio = -2, alto = -6
 *  - ventana (cuanto dura la tendencia antes de enfriarse):
 *      amplia = +2, media = 0, corta = -2
 *
 * Mapeo de puntaje a recomendacion (exactamente tres opciones en espanol):
 *  - puntaje >= 7            -> 'Hazlo ya'
 *  - puntaje entre 0 y 6     -> 'Hazlo pero cuida los detalles'
 *  - puntaje < 0             -> 'No vale la pena'
 *
 * Los niveles desconocidos o ausentes caen al caso neutral (media/medio), igual
 * que en validator.js.
 *
 * @param {Object} idea
 * @param {string} idea.nombre
 * @param {string} idea.tendencia        'alta' | 'media' | 'baja'
 * @param {string} idea.potencialVideo   'alta' | 'media' | 'baja'
 * @param {string} idea.esfuerzo         'bajo' | 'medio' | 'alto'
 * @param {string} [idea.margen]         'alta' | 'media' | 'baja'
 * @param {number} [idea.margenPct]      Margen en porcentaje (ej. 42 = 42%). Tiene precedencia.
 * @param {string} idea.riesgoLegal      'bajo' | 'medio' | 'alto'
 * @param {string} idea.ventana          'amplia' | 'media' | 'corta'
 * @returns {{nombre:string, puntaje:number, recomendacion:string, detalle:Object}}
 */
export function puntuarFactibilidad(idea = {}) {
  const tendencia = nivel(idea.tendencia);
  const potencialVideo = nivel(idea.potencialVideo);
  const esfuerzo = nivel(idea.esfuerzo);
  const margenNivel = nivel(idea.margen);
  const margenPct = Number(idea.margenPct);
  const riesgoLegal = nivel(idea.riesgoLegal);
  const ventana = nivel(idea.ventana);

  const detalle = {};

  // Tendencia.
  if (tendencia === "alta") detalle.tendencia = 3;
  else if (tendencia === "baja") detalle.tendencia = -2;
  else detalle.tendencia = 1; // media (o desconocida)

  // Potencial como video.
  if (potencialVideo === "alta") detalle.potencialVideo = 3;
  else if (potencialVideo === "baja") detalle.potencialVideo = -1;
  else detalle.potencialVideo = 1; // media (o desconocida)

  // Esfuerzo de produccion (mas esfuerzo resta).
  if (esfuerzo === "bajo") detalle.esfuerzo = 2;
  else if (esfuerzo === "alto") detalle.esfuerzo = -2;
  else detalle.esfuerzo = 0; // medio (o desconocido)

  // Margen: el numero tiene precedencia sobre el nivel.
  if (Number.isFinite(margenPct)) {
    if (margenPct >= 40) detalle.margen = 3;
    else if (margenPct >= 25) detalle.margen = 2;
    else if (margenPct >= 15) detalle.margen = 0;
    else detalle.margen = -3;
  } else if (margenNivel === "alta") {
    detalle.margen = 3;
  } else if (margenNivel === "baja") {
    detalle.margen = -3;
  } else {
    detalle.margen = 1; // media (o desconocida)
  }

  // Riesgo legal (derechos de autor): el alto penaliza fuerte.
  if (riesgoLegal === "bajo") detalle.riesgoLegal = 2;
  else if (riesgoLegal === "alto") detalle.riesgoLegal = -6;
  else detalle.riesgoLegal = -2; // medio (o desconocido)

  // Ventana de la tendencia.
  if (ventana === "amplia") detalle.ventana = 2;
  else if (ventana === "corta") detalle.ventana = -2;
  else detalle.ventana = 0; // media (o desconocida)

  const puntaje =
    detalle.tendencia +
    detalle.potencialVideo +
    detalle.esfuerzo +
    detalle.margen +
    detalle.riesgoLegal +
    detalle.ventana;

  let recomendacion;
  if (puntaje >= 7) recomendacion = "Hazlo ya";
  else if (puntaje >= 0) recomendacion = "Hazlo pero cuida los detalles";
  else recomendacion = "No vale la pena";

  return {
    nombre: idea.nombre || "",
    puntaje,
    recomendacion,
    detalle,
  };
}
