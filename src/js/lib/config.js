// config.js
// Constantes de dominio compartidas para Consola Atelier.
// Modulo puro: NO debe referenciar document/window para poder importarse en node:test.

// Maquinas disponibles. precio_compra en COP, potencia en vatios (W).
export const MAQUINAS = [
  {
    id: "ender3-v3se",
    nombre: "Creality Ender-3 V3 SE",
    precioCompraCop: 1500000,
    potenciaWDefault: 120,
    maxColores: 1,
  },
  {
    id: "bambu-a1-combo",
    nombre: "Bambu Lab A1 Combo (AMS)",
    precioCompraCop: 3000000,
    potenciaWDefault: 120,
    maxColores: 4,
  },
];

// Vida util por defecto en horas (editable). Se usa para amortizacion/desgaste.
export const VIDA_UTIL_HORAS_DEFAULT = 2500;

// Energia electrica en COP por kWh.
export const ENERGIA_COP_KWH = 730;

// Biblioteca de filamentos. Extensible: por ahora PLA en uso; PETG y otros como
// placeholders para el futuro (el usuario aun no los ha usado).
export const FILAMENTOS = [
  {
    id: "pla",
    nombre: "PLA",
    precioKgCopDefault: 80000,
    precioKgCopRango: [75000, 90000],
    enUso: true,
  },
  // Placeholders para mas adelante (no usados todavia):
  {
    id: "petg",
    nombre: "PETG",
    precioKgCopDefault: 90000,
    precioKgCopRango: [85000, 110000],
    enUso: false,
  },
  {
    id: "tpu",
    nombre: "TPU (flexible)",
    precioKgCopDefault: 120000,
    precioKgCopRango: [100000, 150000],
    enUso: false,
  },
];

export const FILAMENTO_PLA_COP_KG_DEFAULT = 80000;
export const FILAMENTO_PLA_COP_KG_RANGO = [75000, 90000];

// Tarifas y descuentos de Mercado Libre.
export const MERCADOLIBRE = {
  comisionPct: 0.19,
  icaPct: 0.0041,
  retencionFuentePct: 0.015,
  envioGratisCopDefault: 8100,
  // % del envio que cubre Mercado Libre. Por defecto 0% para reproducir el
  // ejemplo real del usuario (publicacion 24.900 COP -> neto ~11.593 COP).
  // Editable; 50% es un escenario alternativo mencionado en el briefing.
  envioCubiertoPorMlPctDefault: 0.0,
};

// Claves y prefijo para persistencia en localStorage.
export const STORAGE_PREFIX = "atelier:";

// Formateador de moneda COP (es-CO). Devuelve string tipo "$ 24.900".
const _formatoCop = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

export function formatearCop(valor) {
  const n = Number(valor);
  if (!Number.isFinite(n)) return "$ 0";
  return _formatoCop.format(Math.round(n));
}

// Formateador numerico simple con decimales opcionales (es-CO).
export function formatearNumero(valor, decimales = 0) {
  const n = Number(valor);
  if (!Number.isFinite(n)) return "0";
  return new Intl.NumberFormat("es-CO", {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  }).format(n);
}
