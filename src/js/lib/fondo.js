// fondo.js
// Logica PURA del modulo "Fondo de proyectos": matematica de un fondo de ahorro
// por proyectos. Suma aportes, calcula el progreso hacia una meta y el monto
// restante, con guardas para una meta sin objetivo o con objetivo <= 0.
// NO referencia document/window: importable por node:test.

// Convierte un valor a numero finito. Devuelve 0 cuando no es convertible.
// Mismo espiritu que num() en src/js/lib/factibilidad.js y validator.js.
function num(valor) {
  const n = Number(valor);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Suma el monto de una lista de aportes.
 *
 * Tolera entradas faltantes o no numericas: cada aporte.monto pasa por num(),
 * asi que valores ausentes, null, strings no numericos o NaN cuentan como 0.
 * Devuelve 0 para un arreglo vacio o para una entrada que no sea arreglo.
 *
 * @param {Array<{monto?:number|string}>} aportes
 * @returns {number} Suma total en COP.
 */
export function sumarAportes(aportes) {
  if (!Array.isArray(aportes)) return 0;
  let total = 0;
  for (const aporte of aportes) {
    if (aporte == null) continue;
    total += num(aporte.monto);
  }
  return total;
}

/**
 * Normaliza una meta ingresada por el usuario a una forma consistente.
 *
 * Pura y defensiva: recorta el nombre, fuerza objetivoCop a un numero finito y
 * positivo o a null (cualquier valor <= 0, no numerico o ausente cae en null),
 * y garantiza que aportes sea siempre un arreglo. La usan la UI y los tests para
 * compartir una sola ruta de normalizacion.
 *
 * @param {Object} [parcial]
 * @returns {{id:(string|null), nombre:string, objetivoCop:(number|null), nota:string, aportes:Array}}
 */
export function metaDesdeEntrada(parcial = {}) {
  const objetivo = Number(parcial.objetivoCop);
  const objetivoCop = Number.isFinite(objetivo) && objetivo > 0 ? objetivo : null;
  return {
    id: parcial.id != null ? parcial.id : null,
    nombre: String(parcial.nombre || "").trim(),
    objetivoCop,
    nota: String(parcial.nota || "").trim(),
    aportes: Array.isArray(parcial.aportes) ? parcial.aportes : [],
  };
}

/**
 * Calcula el progreso de una meta de ahorro.
 *
 * Una meta luce asi:
 *   { id, nombre, objetivoCop (number|null|undefined), nota,
 *     aportes: [{ id, monto, fecha, nota }] }
 *
 * Guardas (nunca divide por cero, nunca devuelve NaN ni Infinity):
 *  - total = sumarAportes(meta.aportes).
 *  - tieneObjetivo es true solo cuando objetivoCop es un numero finito Y > 0.
 *  - Si NO tiene objetivo: porcentaje = null, porcentajeReal = null,
 *    restante = null, superada = false.
 *  - Si tiene objetivo: superada = total >= objetivo;
 *    restante = Math.max(0, objetivo - total).
 *
 * Decision del tope (cap) de porcentaje, documentada aqui:
 *  - porcentaje se TOPA en 100 para la barra de progreso de la UI: una meta
 *    sobrefinanciada muestra 100%, nunca mas de 100%.
 *  - porcentajeReal expone el valor SIN topar (puede ser > 100), para que la UI
 *    pueda indicar "Meta superada" con el excedente real.
 *  - Ambos se redondean a 1 decimal.
 *
 * @param {Object} [meta]
 * @returns {{
 *   total:number, objetivo:(number|null), tieneObjetivo:boolean,
 *   porcentaje:(number|null), porcentajeReal:(number|null),
 *   restante:(number|null), superada:boolean
 * }}
 */
export function progresoMeta(meta = {}) {
  const total = sumarAportes(meta ? meta.aportes : []);

  const objetivoBruto = Number(meta ? meta.objetivoCop : null);
  const tieneObjetivo = Number.isFinite(objetivoBruto) && objetivoBruto > 0;

  if (!tieneObjetivo) {
    return {
      total,
      objetivo: null,
      tieneObjetivo: false,
      porcentaje: null,
      porcentajeReal: null,
      restante: null,
      superada: false,
    };
  }

  const objetivo = objetivoBruto;
  const porcentajeReal = redondear1(total / objetivo * 100);
  const porcentaje = Math.min(100, porcentajeReal);
  const restante = Math.max(0, objetivo - total);
  const superada = total >= objetivo;

  return {
    total,
    objetivo,
    tieneObjetivo: true,
    porcentaje,
    porcentajeReal,
    restante,
    superada,
  };
}

// Redondea a 1 decimal evitando errores de coma flotante molestos.
function redondear1(valor) {
  return Math.round(num(valor) * 10) / 10;
}
