// tests/factibilidad.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { puntuarFactibilidad } from "../src/js/lib/factibilidad.js";

test("idea fuerte (todo a favor, margen alto) -> puntaje 15, 'Hazlo ya'", () => {
  // tendencia alta +3, potencialVideo alta +3, esfuerzo bajo +2,
  // margen 50 (>=40) +3, riesgoLegal bajo +2, ventana amplia +2 = 15.
  const r = puntuarFactibilidad({
    nombre: "Figura trend original",
    tendencia: "alta",
    potencialVideo: "alta",
    esfuerzo: "bajo",
    margenPct: 50,
    riesgoLegal: "bajo",
    ventana: "amplia",
  });
  assert.equal(r.puntaje, 15);
  assert.equal(r.recomendacion, "Hazlo ya");
});

test("idea intermedia (todo medio, margen 20, riesgo medio) -> puntaje 0, 'Hazlo pero cuida los detalles'", () => {
  // tendencia media +1, potencialVideo media +1, esfuerzo medio 0,
  // margen 20 (>=15) 0, riesgoLegal medio -2, ventana media 0 = 0.
  const r = puntuarFactibilidad({
    nombre: "Idea promedio",
    tendencia: "media",
    potencialVideo: "media",
    esfuerzo: "medio",
    margenPct: 20,
    riesgoLegal: "medio",
    ventana: "media",
  });
  assert.equal(r.puntaje, 0);
  assert.equal(r.recomendacion, "Hazlo pero cuida los detalles");
});

test("el riesgo legal alto penaliza fuerte y baja el puntaje frente a riesgo bajo", () => {
  // Base: tendencia alta +3, potencialVideo alta +3, esfuerzo medio 0,
  // margen alta +3, ventana media 0.
  const base = {
    tendencia: "alta",
    potencialVideo: "alta",
    esfuerzo: "medio",
    margen: "alta",
    ventana: "media",
  };
  const riesgoso = puntuarFactibilidad({ ...base, riesgoLegal: "alto" });
  const seguro = puntuarFactibilidad({ ...base, riesgoLegal: "bajo" });
  // riesgoso: 3+3+0+3+0-6 = 3 ; seguro: 3+3+0+3+0+2 = 11.
  assert.equal(riesgoso.puntaje, 3);
  assert.equal(seguro.puntaje, 11);
  assert.ok(
    riesgoso.puntaje < seguro.puntaje,
    `riesgoso=${riesgoso.puntaje} seguro=${seguro.puntaje}`,
  );
});

test("idea debil (todo en contra) -> puntaje < 0, 'No vale la pena'", () => {
  // tendencia baja -2, potencialVideo baja -1, esfuerzo alto -2,
  // margen baja -3, riesgoLegal alto -6, ventana corta -2 = -16.
  const r = puntuarFactibilidad({
    nombre: "Idea sin futuro",
    tendencia: "baja",
    potencialVideo: "baja",
    esfuerzo: "alto",
    margen: "baja",
    riesgoLegal: "alto",
    ventana: "corta",
  });
  assert.equal(r.puntaje, -16);
  assert.ok(r.puntaje < 0, `puntaje=${r.puntaje}`);
  assert.equal(r.recomendacion, "No vale la pena");
});

test("margenPct numerico: 45 da el tramo +3 y 10 da -3", () => {
  const base = {
    tendencia: "media",
    potencialVideo: "media",
    esfuerzo: "medio",
    riesgoLegal: "medio",
    ventana: "media",
  };
  const alto = puntuarFactibilidad({ ...base, margenPct: 45 });
  const bajo = puntuarFactibilidad({ ...base, margenPct: 10 });
  assert.equal(alto.detalle.margen, 3);
  assert.equal(bajo.detalle.margen, -3);
  // Diferencia de 6 puntos solo por el margen.
  assert.equal(alto.puntaje - bajo.puntaje, 6);
});

test("un margenPct numerico tiene precedencia sobre el nivel de margen", () => {
  // Aunque el nivel sea 'baja' (-3), el numero 45 debe mandar (+3).
  const r = puntuarFactibilidad({
    tendencia: "media",
    potencialVideo: "media",
    esfuerzo: "medio",
    margen: "baja",
    margenPct: 45,
    riesgoLegal: "medio",
    ventana: "media",
  });
  assert.equal(r.detalle.margen, 3);
});

test("corte 6 vs 7: 'Hazlo pero cuida los detalles' vs 'Hazlo ya'", () => {
  // Base comun: tendencia alta +3, potencialVideo alta +3, esfuerzo medio 0,
  // riesgoLegal medio -2, ventana media 0 = 4.
  const base = {
    tendencia: "alta",
    potencialVideo: "alta",
    esfuerzo: "medio",
    riesgoLegal: "medio",
    ventana: "media",
  };
  // margen +2 (margenPct 30) -> 6.
  const seis = puntuarFactibilidad({ ...base, margenPct: 30 });
  assert.equal(seis.puntaje, 6);
  assert.equal(seis.recomendacion, "Hazlo pero cuida los detalles");
  // margen +3 (margenPct 40) -> 7.
  const siete = puntuarFactibilidad({ ...base, margenPct: 40 });
  assert.equal(siete.puntaje, 7);
  assert.equal(siete.recomendacion, "Hazlo ya");
});

test("corte 0 vs -1: 'Hazlo pero cuida los detalles' vs 'No vale la pena'", () => {
  // Base comun: tendencia media +1, potencialVideo media +1, esfuerzo medio 0,
  // margen 20 (0), ventana media 0 = 2.
  const base = {
    tendencia: "media",
    potencialVideo: "media",
    esfuerzo: "medio",
    margenPct: 20,
    ventana: "media",
  };
  // riesgoLegal medio -2 -> 0.
  const cero = puntuarFactibilidad({ ...base, riesgoLegal: "medio" });
  assert.equal(cero.puntaje, 0);
  assert.equal(cero.recomendacion, "Hazlo pero cuida los detalles");
  // Otra combinacion que da exactamente -1: tendencia baja -2,
  // potencialVideo alta +3, esfuerzo medio 0, margen 20 (0), riesgoLegal medio
  // -2, ventana media 0 = -1.
  const menosUno = puntuarFactibilidad({
    tendencia: "baja",
    potencialVideo: "alta",
    esfuerzo: "medio",
    margenPct: 20,
    riesgoLegal: "medio",
    ventana: "media",
  });
  assert.equal(menosUno.puntaje, -1);
  assert.equal(menosUno.recomendacion, "No vale la pena");
});
