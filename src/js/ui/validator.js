// validator.js
// MODULO 2 - Validador de productos ("vale la pena?") (UI).
// Conecta la logica PURA de src/js/lib/validator.js (puntuarProducto) a un
// formulario de marca, guarda los productos candidatos en localStorage y los
// muestra en una lista comparable (ordenada por puntaje descendente).
// Exporta montar(contenedor), que app.js invoca con el elemento #view-validador.
//
// ARQUITECTURA / EXTENSIBILIDAD
// Este modulo sigue el mismo patron que la Calculadora: la logica pura vive en
// src/js/lib/ (testeable con node:test), la presentacion vive aqui en
// src/js/ui/ y las constantes compartidas en src/js/lib/config.js. Los modulos
// futuros ("Proximamente", ver seccion al pie de esta vista) se enchufan igual:
//   - Radar de tendencias (MANUAL): lib/tendencias.js (registro + orden puro) +
//     ui/tendencias.js (vista) + una pestana nueva en app.js. Sin scraping:
//     Mercado Libre y MakerWorld bloquean el acceso programatico (HTTP 403).
//   - Biblioteca de filamentos y proveedores: ampliar FILAMENTOS en config.js +
//     lib/proveedores.js + ui/proveedores.js.
//   - Fondo de proyectos (acumulador de ganancias hacia una meta): lib/fondo.js
//     (logica de aportes/meta) + ui/fondo.js, reutilizando storage.js.

import { formatearNumero, formatearCop } from "../lib/config.js";
import { puntuarProducto } from "../lib/validator.js";
import { resultadoGuardadoDeCalculadora } from "../lib/calcPersistido.js";
import storage from "../lib/storage.js";

const CLAVE_PRODUCTOS = "productos";
const CLAVE_CALC = "calc";

function num(v, def = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

// Lee los productos guardados y los devuelve siempre como arreglo.
function leerProductos() {
  const lista = storage.get(CLAVE_PRODUCTOS, []);
  return Array.isArray(lista) ? lista : [];
}

function guardarProductos(lista) {
  storage.set(CLAVE_PRODUCTOS, lista);
}

// Ordena por puntaje descendente para facilitar la comparacion.
function ordenarPorPuntaje(lista) {
  return [...lista].sort((a, b) => num(b.puntaje) - num(a.puntaje));
}

// Mapea la recomendacion exacta a la clase de distintivo ya existente en el CSS.
function claseDistintivo(recomendacion) {
  if (recomendacion === "Vender ya") return "distintivo--vender";
  if (recomendacion === "Solo si lo personalizas")
    return "distintivo--personaliza";
  return "distintivo--descartar";
}

// Recupera el margen % y el precio del ultimo calculo guardado por la
// Calculadora. La logica vive en lib/calcPersistido.js (pura y testeable): lee
// el margen que la Calculadora YA mostro y persistio, de modo que el valor
// importado siempre coincide con lo que vio el usuario (antes se re-derivaba e
// infiriendo mal la purga multicolor podia diverger). Devuelve null si no hay
// un calculo previo valido.
function resultadoDesdeCalculadora() {
  const estado = storage.get(CLAVE_CALC, null);
  return resultadoGuardadoDeCalculadora(estado);
}

export function montar(contenedor) {
  if (!contenedor) return;

  let productos = leerProductos();

  contenedor.innerHTML = plantilla();

  const campos = {
    nombre: contenedor.querySelector("#val-nombre"),
    demanda: contenedor.querySelector("#val-demanda"),
    competencia: contenedor.querySelector("#val-competencia"),
    margenPct: contenedor.querySelector("#val-margen"),
    potencialContenido: contenedor.querySelector("#val-potencial"),
    origenModelo: contenedor.querySelector("#val-origen"),
  };

  const form = contenedor.querySelector("#val-form");
  const botonMargen = contenedor.querySelector("#val-traer-margen");
  const notaMargen = contenedor.querySelector("#val-nota-margen");
  const avisoForm = contenedor.querySelector("#val-aviso");
  const panelLista = contenedor.querySelector("#val-lista");

  // Trae el margen % mostrado en el ultimo calculo de la Calculadora.
  botonMargen.addEventListener("click", () => {
    const resultado = resultadoDesdeCalculadora();
    if (resultado == null) {
      notaMargen.textContent =
        "No hay un calculo previo. Abre la Calculadora, calcula un producto y vuelve.";
      return;
    }
    const redondeado = Math.round(resultado.margenPct * 10) / 10;
    campos.margenPct.value = redondeado;
    // Mostramos el precio de publicacion de origen para que el usuario confirme
    // que el margen corresponde al producto que esta validando (el estado de la
    // Calculadora refleja su ultimo uso, que puede ser de otro producto).
    notaMargen.textContent = `Margen traido de la Calculadora (precio de publicacion ${formatearCop(resultado.precio)}): ${formatearNumero(redondeado, 1)}%.`;
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const nombre = String(campos.nombre.value || "").trim();
    if (!nombre) {
      avisoForm.textContent = "Escribe un nombre para el producto.";
      avisoForm.hidden = false;
      campos.nombre.focus();
      return;
    }
    avisoForm.hidden = true;

    const entrada = {
      nombre,
      demanda: campos.demanda.value,
      competencia: campos.competencia.value,
      margenPct: num(campos.margenPct.value),
      potencialContenido: campos.potencialContenido.value,
      origenModelo: campos.origenModelo.value,
    };

    const resultado = puntuarProducto(entrada);

    // Guardamos las entradas junto con el puntaje y la recomendacion calculados
    // para poder mostrarlos y compararlos sin recalcular en cada render.
    const producto = {
      id: `p-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      nombre,
      demanda: entrada.demanda,
      competencia: entrada.competencia,
      margenPct: entrada.margenPct,
      potencialContenido: entrada.potencialContenido,
      origenModelo: entrada.origenModelo,
      puntaje: resultado.puntaje,
      recomendacion: resultado.recomendacion,
    };

    productos.push(producto);
    guardarProductos(productos);
    renderLista();

    // Reinicia los campos de texto/numero pero conserva los select en su valor.
    campos.nombre.value = "";
    campos.margenPct.value = "";
    notaMargen.textContent = "";
    campos.nombre.focus();
  });

  // Delegacion de eventos para el boton "Eliminar" de cada producto.
  panelLista.addEventListener("click", (e) => {
    const boton = e.target.closest("[data-eliminar]");
    if (!boton) return;
    const id = boton.getAttribute("data-eliminar");
    productos = productos.filter((p) => p.id !== id);
    guardarProductos(productos);
    renderLista();
  });

  function renderLista() {
    panelLista.innerHTML = renderProductos(ordenarPorPuntaje(productos));
  }

  renderLista();
}

// --- Render helpers (puras de presentacion) ---

function etiquetaNivel(valor) {
  const v = String(valor || "").toLowerCase();
  if (v === "alta") return "Alta";
  if (v === "media") return "Media";
  if (v === "baja") return "Baja";
  if (v === "si") return "Si";
  if (v === "no") return "No";
  return valor || "";
}

function etiquetaOrigen(valor) {
  if (valor === "propio") return "Diseno propio";
  if (valor === "descargado") return "Descargado de internet";
  return valor || "";
}

// Escapa texto del usuario para evitar inyeccion de HTML.
function esc(texto) {
  return String(texto == null ? "" : texto)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function distintivoHtml(recomendacion) {
  return `<span class="distintivo ${claseDistintivo(recomendacion)}">${esc(recomendacion)}</span>`;
}

function renderProductos(lista) {
  if (!lista.length) {
    return `
      <div class="desglose">
        <p class="val-vacio">
          Aun no has registrado productos. Completa el formulario para evaluar
          si vale la pena vender un producto.
        </p>
      </div>
    `;
  }

  // Tabla para escritorio (se oculta en movil por CSS).
  const filas = lista
    .map(
      (p) => `
        <tr>
          <td data-col="Producto">${esc(p.nombre)}</td>
          <td data-col="Demanda">${etiquetaNivel(p.demanda)}</td>
          <td data-col="Competencia">${etiquetaNivel(p.competencia)}</td>
          <td data-col="Margen">${formatearNumero(num(p.margenPct), 1)}%</td>
          <td data-col="Puntaje">${num(p.puntaje)}</td>
          <td data-col="Recomendacion">${distintivoHtml(p.recomendacion)}</td>
          <td data-col="Accion">
            <button class="boton boton--secundario val-eliminar" type="button" data-eliminar="${esc(p.id)}">
              Eliminar
            </button>
          </td>
        </tr>
      `,
    )
    .join("");

  const tabla = `
    <div class="val-tabla-envoltura">
      <table class="tabla val-tabla">
        <thead>
          <tr>
            <th>Producto</th>
            <th>Demanda</th>
            <th>Competencia</th>
            <th>Margen %</th>
            <th>Puntaje</th>
            <th>Recomendacion</th>
            <th></th>
          </tr>
        </thead>
        <tbody>${filas}</tbody>
      </table>
    </div>
  `;

  // Tarjetas para movil (se ocultan en escritorio por CSS).
  const tarjetas = lista
    .map(
      (p) => `
        <article class="val-card">
          <div class="val-card__cabecera">
            <h4 class="val-card__titulo">${esc(p.nombre)}</h4>
            ${distintivoHtml(p.recomendacion)}
          </div>
          <dl class="val-card__datos">
            <div><dt>Demanda</dt><dd>${etiquetaNivel(p.demanda)}</dd></div>
            <div><dt>Competencia</dt><dd>${etiquetaNivel(p.competencia)}</dd></div>
            <div><dt>Margen %</dt><dd>${formatearNumero(num(p.margenPct), 1)}%</dd></div>
            <div><dt>Puntaje</dt><dd>${num(p.puntaje)}</dd></div>
            <div><dt>Contenido</dt><dd>${etiquetaNivel(p.potencialContenido)}</dd></div>
            <div><dt>Origen</dt><dd>${esc(etiquetaOrigen(p.origenModelo))}</dd></div>
          </dl>
          <button class="boton boton--secundario val-eliminar" type="button" data-eliminar="${esc(p.id)}">
            Eliminar
          </button>
        </article>
      `,
    )
    .join("");

  return `
    ${tabla}
    <div class="val-cards">${tarjetas}</div>
  `;
}

function plantilla() {
  return `
    <div class="val">
      <div class="tarjeta val__formulario">
        <h2 class="tarjeta__titulo">Validador de productos (vale la pena?)</h2>
        <p class="tarjeta__descripcion">
          Evalua un producto candidato segun su demanda, competencia, margen y
          potencial. El validador calcula un puntaje y recomienda si deberias
          venderlo ya, solo si lo personalizas, o descartarlo.
        </p>

        <form id="val-form" class="formulario">
          <div class="campo">
            <label for="val-nombre">Nombre del producto</label>
            <input id="val-nombre" type="text" placeholder="Ej. Lampara gato" maxlength="80" />
          </div>
          <div class="campo">
            <label for="val-demanda">Demanda estimada</label>
            <select id="val-demanda">
              <option value="alta">Alta</option>
              <option value="media" selected>Media</option>
              <option value="baja">Baja</option>
            </select>
          </div>
          <div class="campo">
            <label for="val-competencia">Nivel de competencia</label>
            <select id="val-competencia">
              <option value="alta">Alta</option>
              <option value="media" selected>Media</option>
              <option value="baja">Baja</option>
            </select>
          </div>
          <div class="campo">
            <label for="val-margen">Margen (%)</label>
            <input id="val-margen" type="number" step="0.1" inputmode="decimal" placeholder="Ej. 42" />
            <small class="campo__ayuda">Puedes tomarlo de la Calculadora.</small>
            <button id="val-traer-margen" class="boton boton--secundario val__traer" type="button">
              Traer margen de la Calculadora
            </button>
            <small id="val-nota-margen" class="campo__ayuda"></small>
          </div>
          <div class="campo">
            <label for="val-potencial">Potencial de contenido para redes</label>
            <select id="val-potencial">
              <option value="alta">Alta</option>
              <option value="media" selected>Media</option>
              <option value="baja">Baja</option>
            </select>
          </div>
          <div class="campo">
            <label for="val-origen">Origen del modelo</label>
            <select id="val-origen">
              <option value="descargado" selected>Descargado de internet</option>
              <option value="propio">Diseno propio</option>
            </select>
          </div>

          <div class="campo val__acciones">
            <button class="boton boton--primario" type="submit">
              Evaluar y guardar
            </button>
            <small id="val-aviso" class="val-aviso" hidden></small>
          </div>
        </form>
      </div>

      <div class="tarjeta val__resultado">
        <h3 class="tarjeta__titulo">Productos guardados</h3>
        <p class="tarjeta__descripcion">
          Ordenados por puntaje (de mayor a menor) para comparar de un vistazo.
          Se guardan en este navegador y reaparecen al recargar.
        </p>
        <div id="val-lista"></div>
      </div>

      <div class="tarjeta val__proximamente">
        <h3 class="tarjeta__titulo">Proximamente</h3>
        <p class="tarjeta__descripcion">
          Modulos planeados para las siguientes versiones de Consola Atelier.
        </p>
        <ul class="val-proximamente">
          <li>
            <strong>Radar de tendencias (registro MANUAL)</strong>: un lugar
            para anotar a mano los productos que ves en tendencia. No hay
            busqueda automatica: Mercado Libre y MakerWorld bloquean el acceso
            programatico (HTTP 403), asi que el radar sera manual.
          </li>
          <li>
            <strong>Biblioteca de filamentos y proveedores</strong>: catalogo de
            materiales (PLA, PETG, TPU y mas) con precios por kg y proveedores.
          </li>
          <li>
            <strong>Fondo de proyectos</strong>: un acumulador de ganancias que
            suma tus ventas hacia una meta (por ejemplo, una nueva impresora).
          </li>
        </ul>
      </div>
    </div>
  `;
}
