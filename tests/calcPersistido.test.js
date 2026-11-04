// tests/calcPersistido.test.js
// Cubre la reconstruccion del margen que el Validador "trae" de la Calculadora.
// Es justo el camino donde vivia la divergencia por purga multicolor obsoleta.
import { test } from "node:test";
import assert from "node:assert/strict";
import { resultadoGuardadoDeCalculadora } from "../src/js/lib/calcPersistido.js";
import { calcularTodo } from "../src/js/lib/costs.js";

// Estado base equivalente al ejemplo real (Ender-3, un solo color).
function estadoBase(extra = {}) {
  return {
    maquinaId: "ender3-v3se",
    precioCompraCop: 1500000,
    precioKgCop: 80000,
    gramos: 50,
    horas: 3,
    potenciaW: 120,
    vidaUtilHoras: 2500,
    energiaCopKwh: 730,
    purgaModo: "gramos",
    purgaGramos: 0,
    purgaPct: 0,
    precio: 24900,
    comisionPct: 19,
    envioCop: 8100,
    envioCubiertoPct: 0,
    icaPct: 0.41,
    retencionPct: 1.5,
    ...extra,
  };
}

test("estado nulo o invalido devuelve null", () => {
  assert.equal(resultadoGuardadoDeCalculadora(null), null);
  assert.equal(resultadoGuardadoDeCalculadora(undefined), null);
  assert.equal(resultadoGuardadoDeCalculadora("x"), null);
});

test("precio <= 0 devuelve null (no hay calculo util)", () => {
  assert.equal(resultadoGuardadoDeCalculadora(estadoBase({ precio: 0 })), null);
});

test("prefiere el margen/precio persistidos por la Calculadora", () => {
  const estado = estadoBase({
    margenPctCalculado: 22.21,
    precioCalculado: 24900,
  });
  const r = resultadoGuardadoDeCalculadora(estado);
  assert.ok(r);
  assert.equal(r.margenPct, 22.21);
  assert.equal(r.precio, 24900);
});

test("estado antiguo (sin margen persistido): recalcula y coincide con la Calculadora", () => {
  const estado = estadoBase();
  const r = resultadoGuardadoDeCalculadora(estado);
  assert.ok(r);
  // ~22.2% para el ejemplo real.
  assert.ok(Math.abs(r.margenPct - 22.21) < 0.5, `margen=${r.margenPct}`);
  assert.equal(r.precio, 24900);
});

test("regresion: purga obsoleta de maquina multicolor NO se aplica en una de un solo color", () => {
  // Usuario configuro 20g de purga en la Bambu y volvio a la Ender-3.
  // El estado antiguo conserva purgaGramos:20 pero maquinaId ender3-v3se.
  const estado = estadoBase({ purgaGramos: 20 });

  const r = resultadoGuardadoDeCalculadora(estado);
  assert.ok(r);

  // Debe coincidir con lo que la Calculadora muestra: la Ender es de un solo
  // color, asi que la purga se descarta (purga = 0).
  const { venta } = calcularTodo(
    {
      gramos: 50,
      precioKgCop: 80000,
      horas: 3,
      potenciaW: 120,
      precioCompraCop: 1500000,
      vidaUtilHoras: 2500,
      energiaCopKwh: 730,
      purgaGramos: 0, // descartada por maquina de un solo color
      purgaPct: 0,
    },
    {
      precio: 24900,
      envioCop: 8100,
      envioCubiertoPct: 0,
      comisionPct: 0.19,
      icaPct: 0.0041,
      retencionPct: 0.015,
    },
  );

  assert.ok(
    Math.abs(r.margenPct - venta.margenPct) < 0.001,
    `trae=${r.margenPct} calculadora=${venta.margenPct}`,
  );
});

test("maquina multicolor SI aplica la purga guardada", () => {
  const estado = estadoBase({
    maquinaId: "bambu-a1-combo",
    precioCompraCop: 3000000,
    purgaGramos: 20,
  });
  const r = resultadoGuardadoDeCalculadora(estado);
  assert.ok(r);

  const { venta } = calcularTodo(
    {
      gramos: 50,
      precioKgCop: 80000,
      horas: 3,
      potenciaW: 120,
      precioCompraCop: 3000000,
      vidaUtilHoras: 2500,
      energiaCopKwh: 730,
      purgaGramos: 20, // aplicada por maquina multicolor
      purgaPct: 0,
    },
    {
      precio: 24900,
      envioCop: 8100,
      envioCubiertoPct: 0,
      comisionPct: 0.19,
      icaPct: 0.0041,
      retencionPct: 0.015,
    },
  );

  assert.ok(
    Math.abs(r.margenPct - venta.margenPct) < 0.001,
    `trae=${r.margenPct} calculadora=${venta.margenPct}`,
  );
});
