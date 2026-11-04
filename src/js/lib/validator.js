// validator.js
// Logica PURA de puntuacion y recomendacion de productos candidatos.
// NO referencia document/window: importable por node:test.

// Normaliza etiquetas de nivel (alta/media/baja) a minusculas sin acentos.
function nivel(valor) {
  if (valor == null) return "";
  return String(valor)
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// Interpreta un campo "potencial de contenido" que puede venir como
// alta/media/baja o como si/no.
function nivelPotencial(valor) {
  const v = nivel(valor);
  if (v === "si" || v === "alta" || v === "alto") return "alta";
  if (v === "no" || v === "baja" || v === "bajo") return "baja";
  if (v === "media" || v === "medio") return "media";
  return "media";
}

/**
 * Puntua un producto candidato y devuelve una recomendacion.
 *
 * Pesos (documentados):
 *  - demanda:      alta = +3, media = +1, baja = -3
 *  - competencia:  alta = -3, media = -1, baja = +2
 *                  (si el modelo es 'propio', la competencia alta penaliza menos:
 *                   -3 pasa a -1 por diferenciacion)
 *  - margenPct:    >= 40% = +3 ; >= 25% = +2 ; >= 15% = 0 ; < 15% = -3
 *  - potencial de contenido: alta = +2, media = 0, baja = -1
 *  - origen del modelo: 'propio' = +2 (producto diferenciado y defendible)
 *
 * Mapeo de puntaje a recomendacion (exactamente tres opciones en espanol):
 *  - puntaje >= 5           -> 'Vender ya'
 *  - puntaje entre 0 y 4    -> 'Solo si lo personalizas'
 *  - puntaje < 0            -> 'Descartar'
 *
 * @param {Object} producto
 * @param {string} producto.nombre
 * @param {string} producto.demanda            'alta' | 'media' | 'baja'
 * @param {string} producto.competencia        'alta' | 'media' | 'baja'
 * @param {number} producto.margenPct          Margen en porcentaje (ej. 42 = 42%).
 * @param {string} producto.potencialContenido 'alta' | 'media' | 'baja' | 'si' | 'no'
 * @param {string} producto.origenModelo       'descargado' | 'propio'
 * @returns {{puntaje:number, recomendacion:string, detalle:Object}}
 */
export function puntuarProducto(producto = {}) {
  const demanda = nivel(producto.demanda);
  const competencia = nivel(producto.competencia);
  const margenPct = Number(producto.margenPct);
  const potencial = nivelPotencial(producto.potencialContenido);
  const origen = nivel(producto.origenModelo);
  const esPropio = origen === "propio";

  const detalle = {};

  // Demanda.
  if (demanda === "alta") detalle.demanda = 3;
  else if (demanda === "baja") detalle.demanda = -3;
  else detalle.demanda = 1; // media (o desconocida)

  // Competencia (con atenuacion si el modelo es propio).
  if (competencia === "alta") detalle.competencia = esPropio ? -1 : -3;
  else if (competencia === "baja") detalle.competencia = 2;
  else detalle.competencia = -1; // media

  // Margen.
  if (Number.isFinite(margenPct)) {
    if (margenPct >= 40) detalle.margen = 3;
    else if (margenPct >= 25) detalle.margen = 2;
    else if (margenPct >= 15) detalle.margen = 0;
    else detalle.margen = -3;
  } else {
    detalle.margen = 0;
  }

  // Potencial de contenido.
  if (potencial === "alta") detalle.potencialContenido = 2;
  else if (potencial === "baja") detalle.potencialContenido = -1;
  else detalle.potencialContenido = 0;

  // Origen del modelo.
  detalle.origenModelo = esPropio ? 2 : 0;

  const puntaje =
    detalle.demanda +
    detalle.competencia +
    detalle.margen +
    detalle.potencialContenido +
    detalle.origenModelo;

  let recomendacion;
  if (puntaje >= 5) recomendacion = "Vender ya";
  else if (puntaje >= 0) recomendacion = "Solo si lo personalizas";
  else recomendacion = "Descartar";

  return {
    nombre: producto.nombre || "",
    puntaje,
    recomendacion,
    detalle,
  };
}
