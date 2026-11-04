// calcPersistido.js
// Logica PURA para leer el resultado que la Calculadora dejo guardado en el
// estado 'atelier:calc'. NO referencia document/window: importable por node:test.
//
// Por que existe: el Validador necesita "traer" el margen que vio el usuario en
// la Calculadora. El estado guardado contiene las ENTRADAS, pero reconstruir el
// margen desde ellas era fragil: la Calculadora decide si aplica la purga
// multicolor segun la maquina seleccionada (maxColores > 1), mientras que el
// Validador lo infiere de si quedaron gramos/porcentaje de purga. Al volver de
// una maquina multicolor a una de un solo color quedaban valores de purga en el
// estado y el margen reconstruido NO coincidia con el mostrado.
//
// Solucion: la Calculadora ahora persiste margenPctCalculado y precioCalculado
// (el resultado YA mostrado). Esta funcion los lee directamente. Para estados
// antiguos sin esos campos, recalcula aplicando la MISMA regla de purga que la
// Calculadora (gating por la maquina), de modo que el resultado coincida.

import { MAQUINAS } from "./config.js";
import { calcularTodo } from "./costs.js";

function num(v, def = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

// Determina si la maquina del estado soporta multicolor (purga relevante).
// Misma regla que calculator.js esMulticolor().
export function maquinaEsMulticolor(maquinaId) {
  const m = MAQUINAS.find((x) => x.id === maquinaId);
  return !!m && m.maxColores > 1;
}

/**
 * Devuelve el resultado que la Calculadora mostro, a partir del estado guardado.
 *
 * @param {Object|null} estado  Estado leido de 'atelier:calc'.
 * @returns {{ margenPct: number, precio: number }|null}
 *          null si no hay un calculo previo valido (precio <= 0 o sin datos).
 */
export function resultadoGuardadoDeCalculadora(estado) {
  if (!estado || typeof estado !== "object") return null;

  // Camino preferido: la Calculadora ya persistio el margen y el precio
  // mostrados. Los leemos tal cual para no re-derivar nada.
  if (
    Number.isFinite(Number(estado.margenPctCalculado)) &&
    num(estado.precioCalculado) > 0
  ) {
    return {
      margenPct: num(estado.margenPctCalculado),
      precio: num(estado.precioCalculado),
    };
  }

  // Compatibilidad con estados antiguos sin el resultado persistido:
  // recalculamos aplicando la purga SOLO si la maquina es multicolor, igual que
  // la Calculadora, para que el margen coincida con lo que se mostro.
  const multicolor = maquinaEsMulticolor(estado.maquinaId);
  const purgaGramos =
    multicolor && estado.purgaModo === "gramos" ? num(estado.purgaGramos) : 0;
  const purgaPct =
    multicolor && estado.purgaModo === "pct" ? num(estado.purgaPct) : 0;

  const { venta } = calcularTodo(
    {
      gramos: num(estado.gramos),
      precioKgCop: num(estado.precioKgCop),
      horas: num(estado.horas),
      potenciaW: num(estado.potenciaW),
      precioCompraCop: num(estado.precioCompraCop),
      vidaUtilHoras: num(estado.vidaUtilHoras),
      energiaCopKwh: num(estado.energiaCopKwh),
      purgaGramos,
      purgaPct,
    },
    {
      precio: num(estado.precio),
      envioCop: num(estado.envioCop),
      envioCubiertoPct: num(estado.envioCubiertoPct) / 100,
      comisionPct: num(estado.comisionPct) / 100,
      icaPct: num(estado.icaPct) / 100,
      retencionPct: num(estado.retencionPct) / 100,
    },
  );

  if (!venta || !Number.isFinite(venta.margenPct)) return null;
  if (num(venta.precio) <= 0) return null;
  return { margenPct: venta.margenPct, precio: venta.precio };
}
