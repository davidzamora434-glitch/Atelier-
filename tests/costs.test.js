// tests/costs.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  calcularCostos,
  calcularVentaML,
  calcularTodo,
} from "../src/js/lib/costs.js";

// Tolerancia de +-1.5 COP por redondeo (el usuario reporto 11.592,41).
const TOL = 1.5;

test("ejemplo real Mercado Libre: publicacion 24.900 COP -> neto ~11.593 COP", () => {
  const r = calcularVentaML({
    precio: 24900,
    costoProduccion: 0,
    envioCop: 8100,
    envioCubiertoPct: 0, // 0% cubierto por ML
  });

  assert.ok(Math.abs(r.comision - 4731) <= TOL, `comision=${r.comision}`);
  assert.ok(Math.abs(r.ica - 102.09) <= TOL, `ica=${r.ica}`);
  assert.ok(Math.abs(r.retencion - 373.5) <= TOL, `retencion=${r.retencion}`);
  assert.ok(Math.abs(r.impuestos - 475.59) <= TOL, `impuestos=${r.impuestos}`);
  assert.equal(r.envioDescontado, 8100);
  assert.ok(Math.abs(r.neto - 11593.41) <= TOL, `neto=${r.neto}`);
});

test("ejemplo real con % envio cubierto por ML (50%) aumenta el neto", () => {
  const base = calcularVentaML({
    precio: 24900,
    envioCop: 8100,
    envioCubiertoPct: 0,
  });
  const cubierto = calcularVentaML({
    precio: 24900,
    envioCop: 8100,
    envioCubiertoPct: 0.5,
  });
  assert.equal(cubierto.envioDescontado, 4050);
  assert.ok(cubierto.neto > base.neto);
  assert.ok(Math.abs(cubierto.neto - (base.neto + 4050)) <= TOL);
});

test("costo de produccion: 50g PLA a 80.000 COP/kg en Ender-3, 2h a 120W", () => {
  const c = calcularCostos({
    gramos: 50,
    precioKgCop: 80000,
    horas: 2,
    potenciaW: 120,
    precioCompraCop: 1500000,
    vidaUtilHoras: 2500,
    energiaCopKwh: 730,
  });

  // filamento = 50 * (80000/1000) = 50 * 80 = 4000
  assert.ok(
    Math.abs(c.costoFilamento - 4000) <= 0.01,
    `filamento=${c.costoFilamento}`,
  );
  // energia = (120/1000) * 2 * 730 = 0.12 * 1460 = 175.2
  assert.ok(
    Math.abs(c.costoEnergia - 175.2) <= 0.01,
    `energia=${c.costoEnergia}`,
  );
  // desgaste = (1500000/2500) * 2 = 600 * 2 = 1200
  assert.ok(
    Math.abs(c.desgasteMaquina - 1200) <= 0.01,
    `desgaste=${c.desgasteMaquina}`,
  );
  // total = 4000 + 175.2 + 1200 = 5375.2
  assert.ok(Math.abs(c.costoTotal - 5375.2) <= 0.01, `total=${c.costoTotal}`);
});

test("multicolor: gramos de purga directos y porcentaje extra se suman", () => {
  const c = calcularCostos({
    gramos: 100,
    precioKgCop: 80000,
    horas: 0,
    potenciaW: 0,
    precioCompraCop: 0,
    purgaGramos: 10,
    purgaPct: 10, // 10% de 100 = 10g
  });
  // total gramos = 100 + 10 + 10 = 120
  assert.equal(c.gramosTotales, 120);
  // filamento = 120 * 80 = 9600
  assert.ok(
    Math.abs(c.costoFilamento - 9600) <= 0.01,
    `filamento=${c.costoFilamento}`,
  );
});

test("calcularTodo encadena costos y venta; margen con signo correcto", () => {
  const { costos, venta } = calcularTodo(
    {
      gramos: 50,
      precioKgCop: 80000,
      horas: 2,
      potenciaW: 120,
      precioCompraCop: 1500000,
      vidaUtilHoras: 2500,
    },
    { precio: 24900, envioCop: 8100, envioCubiertoPct: 0 },
  );
  assert.equal(venta.costoProduccion, costos.costoTotal);
  // neto ~11593.41, costo ~5375.2 -> ganancia positiva
  assert.ok(venta.gananciaNetaFinal > 0, `ganancia=${venta.gananciaNetaFinal}`);
  assert.ok(venta.margenPct > 0, `margen=${venta.margenPct}`);
  // ganancia = neto - costo
  assert.ok(
    Math.abs(venta.gananciaNetaFinal - (venta.neto - costos.costoTotal)) <=
      0.01,
  );
});

test("precio muy bajo produce ganancia neta negativa (margen negativo)", () => {
  const { venta } = calcularTodo(
    {
      gramos: 50,
      precioKgCop: 80000,
      horas: 2,
      potenciaW: 120,
      precioCompraCop: 1500000,
    },
    { precio: 10000, envioCop: 8100 },
  );
  assert.ok(venta.gananciaNetaFinal < 0, `ganancia=${venta.gananciaNetaFinal}`);
  assert.ok(venta.margenPct < 0, `margen=${venta.margenPct}`);
});
