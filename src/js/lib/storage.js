// storage.js
// Envoltura de localStorage con prefijo namespaced ('atelier:') y fallback
// en memoria para contextos sin localStorage (node:test, SSR, modo privado).

import { STORAGE_PREFIX } from "./config.js";

// Fallback en memoria cuando localStorage no esta disponible.
const _memoria = new Map();

function _backend() {
  try {
    if (typeof localStorage !== "undefined" && localStorage) {
      // Prueba de escritura para detectar modos restringidos.
      const prueba = "__atelier_test__";
      localStorage.setItem(prueba, "1");
      localStorage.removeItem(prueba);
      return localStorage;
    }
  } catch (_e) {
    // Cae al fallback en memoria.
  }
  return null;
}

function _key(key) {
  return STORAGE_PREFIX + key;
}

export function get(key, fallback = null) {
  const k = _key(key);
  const ls = _backend();
  try {
    let raw;
    if (ls) raw = ls.getItem(k);
    else raw = _memoria.has(k) ? _memoria.get(k) : null;
    if (raw == null) return fallback;
    return JSON.parse(raw);
  } catch (_e) {
    return fallback;
  }
}

export function set(key, value) {
  const k = _key(key);
  const ls = _backend();
  try {
    const raw = JSON.stringify(value);
    if (ls) ls.setItem(k, raw);
    else _memoria.set(k, raw);
    return true;
  } catch (_e) {
    // Ultimo recurso: guardar en memoria.
    try {
      _memoria.set(k, JSON.stringify(value));
    } catch (_e2) {
      // Ignorar.
    }
    return false;
  }
}

export function remove(key) {
  const k = _key(key);
  const ls = _backend();
  try {
    if (ls) ls.removeItem(k);
    _memoria.delete(k);
    return true;
  } catch (_e) {
    _memoria.delete(k);
    return false;
  }
}

export default { get, set, remove };
