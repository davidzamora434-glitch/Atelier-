// tests/validator.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { puntuarProducto } from "../src/js/lib/validator.js";

test("producto fuerte (demanda alta, competencia baja, margen alto) -> 'Vender ya'", () => {
  const r = puntuarProducto({
    nombre: "Lampara gato",
    demanda: "alta",
    competencia: "baja",
    margenPct: 45,
    potencialContenido: "alta",
    origenModelo: "propio",
  });
  assert.equal(r.recomendacion, "Vender ya");
  assert.ok(r.puntaje >= 5, `puntaje=${r.puntaje}`);
});

test("producto debil (demanda baja, competencia alta, margen bajo) -> 'Descartar'", () => {
  const r = puntuarProducto({
    nombre: "Llavero generico",
    demanda: "baja",
    competencia: "alta",
    margenPct: 8,
    potencialContenido: "baja",
    origenModelo: "descargado",
  });
  assert.equal(r.recomendacion, "Descartar");
  assert.ok(r.puntaje < 0, `puntaje=${r.puntaje}`);
});

test("producto intermedio -> 'Solo si lo personalizas'", () => {
  const r = puntuarProducto({
    nombre: "Maceta media",
    demanda: "media",
    competencia: "media",
    margenPct: 20,
    potencialContenido: "media",
    origenModelo: "descargado",
  });
  assert.equal(r.recomendacion, "Solo si lo personalizas");
  assert.ok(r.puntaje >= 0 && r.puntaje < 5, `puntaje=${r.puntaje}`);
});

test("el origen 'propio' atenua la penalizacion de competencia alta", () => {
  const base = {
    demanda: "media",
    competencia: "alta",
    margenPct: 20,
    potencialContenido: "media",
  };
  const descargado = puntuarProducto({ ...base, origenModelo: "descargado" });
  const propio = puntuarProducto({ ...base, origenModelo: "propio" });
  assert.ok(
    propio.puntaje > descargado.puntaje,
    `propio=${propio.puntaje} descargado=${descargado.puntaje}`,
  );
});

test("el puntaje es monotono: mejores entradas no bajan el puntaje", () => {
  const peor = puntuarProducto({
    demanda: "baja",
    competencia: "alta",
    margenPct: 5,
    potencialContenido: "baja",
    origenModelo: "descargado",
  });
  const medio = puntuarProducto({
    demanda: "media",
    competencia: "media",
    margenPct: 20,
    potencialContenido: "media",
    origenModelo: "descargado",
  });
  const mejor = puntuarProducto({
    demanda: "alta",
    competencia: "baja",
    margenPct: 50,
    potencialContenido: "alta",
    origenModelo: "propio",
  });
  assert.ok(
    peor.puntaje < medio.puntaje,
    `peor=${peor.puntaje} medio=${medio.puntaje}`,
  );
  assert.ok(
    medio.puntaje < mejor.puntaje,
    `medio=${medio.puntaje} mejor=${mejor.puntaje}`,
  );
});

test("acepta 'si'/'no' como potencial de contenido", () => {
  const si = puntuarProducto({
    demanda: "media",
    competencia: "media",
    margenPct: 20,
    potencialContenido: "si",
    origenModelo: "descargado",
  });
  const no = puntuarProducto({
    demanda: "media",
    competencia: "media",
    margenPct: 20,
    potencialContenido: "no",
    origenModelo: "descargado",
  });
  assert.ok(si.puntaje > no.puntaje, `si=${si.puntaje} no=${no.puntaje}`);
});
