// costs.js
// Logica PURA de calculo de costos de produccion y ganancia neta en Mercado Libre.
// NO referencia document/window: importable por node:test y reutilizable.
// Todo el dinero se maneja en COP (numeros).

import {
  ENERGIA_COP_KWH,
  VIDA_UTIL_HORAS_DEFAULT,
  MERCADOLIBRE,
} from "./config.js";

function num(v, def = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

/**
 * Calcula el costo real de produccion de una pieza.
 *
 * @param {Object} input
 * @param {number} input.gramos            Gramos de filamento (entrada en GRAMOS).
 * @param {number} input.precioKgCop       Precio del filamento por kg en COP (ej. 80000).
 * @param {number} input.horas             Horas de impresion.
 * @param {number} input.potenciaW         Potencia de la maquina en vatios (W).
 * @param {number} input.precioCompraCop   Precio de compra de la maquina en COP.
 * @param {number} [input.vidaUtilHoras]   Vida util en horas (default 2500).
 * @param {number} [input.energiaCopKwh]   COP por kWh (default 730).
 * @param {number} [input.purgaGramos]     Gramos extra de purga/desperdicio multicolor.
 * @param {number} [input.purgaPct]        % extra de desperdicio sobre los gramos base (0-1 o 0-100).
 * @returns {Object} desglose de costos de produccion.
 */
export function calcularCostos(input = {}) {
  const gramos = num(input.gramos);
  const precioKgCop = num(input.precioKgCop);
  const horas = num(input.horas);
  const potenciaW = num(input.potenciaW);
  const precioCompraCop = num(input.precioCompraCop);
  const vidaUtilHoras =
    num(input.vidaUtilHoras, VIDA_UTIL_HORAS_DEFAULT) ||
    VIDA_UTIL_HORAS_DEFAULT;
  const energiaCopKwh = num(input.energiaCopKwh, ENERGIA_COP_KWH);

  // Desperdicio multicolor: gramos directos + un porcentaje sobre los gramos base.
  const purgaGramos = num(input.purgaGramos);
  let purgaPct = num(input.purgaPct);
  // Aceptar tanto fraccion (0.1) como porcentaje (10).
  if (purgaPct > 1) purgaPct = purgaPct / 100;
  const gramosPurgaPorPct = gramos * purgaPct;
  const gramosTotales = gramos + purgaGramos + gramosPurgaPorPct;

  // (a) costo filamento = gramos * (precio_kg / 1000)
  const costoFilamento = gramosTotales * (precioKgCop / 1000);

  // (b) costo energia = (potencia_w / 1000) * horas * energia_cop_kwh
  const costoEnergia = (potenciaW / 1000) * horas * energiaCopKwh;

  // (c) desgaste maquina = (precio_compra / vida_util_horas) * horas
  const desgasteMaquina =
    vidaUtilHoras > 0 ? (precioCompraCop / vidaUtilHoras) * horas : 0;

  // (d) costo total de produccion
  const costoTotal = costoFilamento + costoEnergia + desgasteMaquina;

  return {
    gramosBase: gramos,
    gramosPurga: purgaGramos + gramosPurgaPorPct,
    gramosTotales,
    costoFilamento,
    costoEnergia,
    desgasteMaquina,
    costoTotal,
  };
}

/**
 * Calcula el desglose de venta en Mercado Libre y la ganancia neta final.
 *
 * @param {Object} input
 * @param {number} input.precio             Precio de publicacion en COP.
 * @param {number} [input.costoProduccion]  Costo total de produccion en COP.
 * @param {number} [input.envioCop]         Costo del envio gratis (default 8100).
 * @param {number} [input.envioCubiertoPct] % del envio cubierto por ML (0-1 o 0-100, default 0).
 * @param {number} [input.comisionPct]      % comision (default 0.19).
 * @param {number} [input.icaPct]           % ICA (default 0.0041).
 * @param {number} [input.retencionPct]     % retencion en la fuente (default 0.015).
 * @returns {Object} desglose Mercado Libre + ganancia neta final + margen %.
 */
export function calcularVentaML(input = {}) {
  const precio = num(input.precio);
  const costoProduccion = num(input.costoProduccion);
  const envioCop = num(input.envioCop, MERCADOLIBRE.envioGratisCopDefault);

  let envioCubiertoPct = num(
    input.envioCubiertoPct,
    MERCADOLIBRE.envioCubiertoPorMlPctDefault,
  );
  if (envioCubiertoPct > 1) envioCubiertoPct = envioCubiertoPct / 100;

  const comisionPct = num(input.comisionPct, MERCADOLIBRE.comisionPct);
  const icaPct = num(input.icaPct, MERCADOLIBRE.icaPct);
  const retencionPct = num(input.retencionPct, MERCADOLIBRE.retencionFuentePct);

  // Desglose Mercado Libre.
  const comision = precio * comisionPct;
  const ica = precio * icaPct;
  const retencion = precio * retencionPct;
  const impuestos = ica + retencion;

  // Envio descontado al vendedor = envio * (1 - % cubierto por ML).
  const envioDescontado = envioCop * (1 - envioCubiertoPct);

  // Neto que recibe el vendedor.
  const neto = precio - comision - impuestos - envioDescontado;

  // Ganancia neta final = neto - costo de produccion.
  const gananciaNetaFinal = neto - costoProduccion;

  // Margen % = ganancia neta final / precio * 100.
  const margenPct = precio > 0 ? (gananciaNetaFinal / precio) * 100 : 0;

  return {
    precio,
    comision,
    ica,
    retencion,
    impuestos,
    envioCop,
    envioCubiertoPct,
    envioDescontado,
    neto,
    costoProduccion,
    gananciaNetaFinal,
    margenPct,
  };
}

/**
 * Conveniencia: calcula costos de produccion y luego la venta ML en un solo paso.
 * @param {Object} costosInput  Entrada para calcularCostos.
 * @param {Object} ventaInput   Entrada para calcularVentaML (sin costoProduccion).
 * @returns {Object} { costos, venta }
 */
export function calcularTodo(costosInput = {}, ventaInput = {}) {
  const costos = calcularCostos(costosInput);
  const venta = calcularVentaML({
    ...ventaInput,
    costoProduccion: costos.costoTotal,
  });
  return { costos, venta };
}
