// tests/fondo.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  sumarAportes,
  progresoMeta,
  metaDesdeEntrada,
} from "../src/js/lib/fondo.js";

test("sumarAportes suma varios montos correctamente", () => {
  const aportes = [{ monto: 10000 }, { monto: 25000 }, { monto: 15000 }];
  assert.equal(sumarAportes(aportes), 50000);
});

test("sumarAportes devuelve 0 para vacio o entrada invalida", () => {
  assert.equal(sumarAportes([]), 0);
  assert.equal(sumarAportes(null), 0);
  assert.equal(sumarAportes(undefined), 0);
  assert.equal(sumarAportes("no es un arreglo"), 0);
});

test("sumarAportes tolera montos faltantes o no numericos (cuentan como 0)", () => {
  const aportes = [
    { monto: 20000 },
    { monto: "abc" },
    { monto: null },
    {}, // sin monto
    null, // aporte nulo
    { monto: "5000" }, // string numerico
  ];
  assert.equal(sumarAportes(aportes), 25000);
});

test("progresoMeta con objetivo positivo calcula porcentaje y restante", () => {
  const meta = {
    id: "m1",
    nombre: "Impresora nueva",
    objetivoCop: 200000,
    aportes: [{ monto: 30000 }, { monto: 20000 }],
  };
  const r = progresoMeta(meta);
  assert.equal(r.total, 50000);
  assert.equal(r.objetivo, 200000);
  assert.equal(r.tieneObjetivo, true);
  assert.equal(r.porcentaje, 25);
  assert.equal(r.porcentajeReal, 25);
  assert.equal(r.restante, 150000);
  assert.equal(r.superada, false);
  // Donde se espera numero, debe ser finito (ni NaN ni Infinity).
  assert.ok(Number.isFinite(r.total));
  assert.ok(Number.isFinite(r.porcentaje));
  assert.ok(Number.isFinite(r.restante));
});

test("progresoMeta sin objetivo: null (no NaN, no Infinity) para null, undefined, 0 y negativo", () => {
  const casos = [
    { objetivoCop: null },
    { objetivoCop: undefined },
    { objetivoCop: 0 },
    { objetivoCop: -5000 },
    {}, // objetivoCop ausente
  ];
  for (const parcial of casos) {
    const meta = { aportes: [{ monto: 40000 }], ...parcial };
    const r = progresoMeta(meta);
    assert.equal(r.tieneObjetivo, false, JSON.stringify(parcial));
    assert.equal(r.porcentaje, null, JSON.stringify(parcial));
    assert.equal(r.porcentajeReal, null, JSON.stringify(parcial));
    assert.equal(r.restante, null, JSON.stringify(parcial));
    assert.equal(r.objetivo, null, JSON.stringify(parcial));
    assert.equal(r.superada, false, JSON.stringify(parcial));
    // El total si debe ser un numero finito.
    assert.equal(r.total, 40000, JSON.stringify(parcial));
    assert.ok(Number.isFinite(r.total));
    // Nunca NaN ni Infinity.
    assert.ok(!Number.isNaN(r.porcentaje));
    assert.ok(r.porcentaje !== Infinity && r.porcentaje !== -Infinity);
  }
});

test("progresoMeta con meta superada topa porcentaje en 100 y marca superada", () => {
  const meta = {
    nombre: "Fondo cumplido",
    objetivoCop: 100000,
    aportes: [{ monto: 80000 }, { monto: 70000 }], // 150000, 150% del objetivo
  };
  const r = progresoMeta(meta);
  assert.equal(r.total, 150000);
  assert.equal(r.porcentaje, 100); // topado para la barra de progreso
  assert.equal(r.porcentajeReal, 150); // sin topar, para "Meta superada"
  assert.ok(r.porcentajeReal > 100);
  assert.equal(r.restante, 0);
  assert.equal(r.superada, true);
});

test("progresoMeta marca superada cuando el total iguala exactamente el objetivo", () => {
  const meta = { objetivoCop: 100000, aportes: [{ monto: 100000 }] };
  const r = progresoMeta(meta);
  assert.equal(r.porcentaje, 100);
  assert.equal(r.porcentajeReal, 100);
  assert.equal(r.restante, 0);
  assert.equal(r.superada, true);
});

test("progresoMeta redondea porcentaje a 1 decimal", () => {
  const meta = { objetivoCop: 30000, aportes: [{ monto: 10000 }] };
  const r = progresoMeta(meta);
  // 10000 / 30000 * 100 = 33.333... -> 33.3
  assert.equal(r.porcentaje, 33.3);
  assert.equal(r.porcentajeReal, 33.3);
  assert.equal(r.restante, 20000);
});

test("progresoMeta sin aportes devuelve total 0", () => {
  const r = progresoMeta({ objetivoCop: 50000 });
  assert.equal(r.total, 0);
  assert.equal(r.porcentaje, 0);
  assert.equal(r.restante, 50000);
  assert.equal(r.superada, false);
});

test("metaDesdeEntrada normaliza nombre, objetivo y aportes", () => {
  const r = metaDesdeEntrada({
    id: "m9",
    nombre: "  Nueva boquilla  ",
    objetivoCop: "120000",
    nota: "  ahorrar ",
    aportes: [{ monto: 1000 }],
  });
  assert.equal(r.id, "m9");
  assert.equal(r.nombre, "Nueva boquilla");
  assert.equal(r.objetivoCop, 120000);
  assert.equal(r.nota, "ahorrar");
  assert.deepEqual(r.aportes, [{ monto: 1000 }]);
});

test("metaDesdeEntrada fuerza objetivo invalido o <= 0 a null y aportes a arreglo", () => {
  assert.equal(metaDesdeEntrada({ objetivoCop: 0 }).objetivoCop, null);
  assert.equal(metaDesdeEntrada({ objetivoCop: -10 }).objetivoCop, null);
  assert.equal(metaDesdeEntrada({ objetivoCop: "abc" }).objetivoCop, null);
  assert.equal(metaDesdeEntrada({}).objetivoCop, null);
  assert.deepEqual(metaDesdeEntrada({}).aportes, []);
  assert.deepEqual(metaDesdeEntrada({ aportes: "x" }).aportes, []);
  assert.equal(metaDesdeEntrada({}).nombre, "");
  assert.equal(metaDesdeEntrada({}).id, null);
});
