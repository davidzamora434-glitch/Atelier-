// factibilidad.js
// MODULO 3 - Factibilidad de video o producto a partir de una tendencia (UI).
// Conecta la logica PURA de src/js/lib/factibilidad.js (puntuarFactibilidad) a
// un formulario de marca, guarda las ideas evaluadas en localStorage y las
// muestra en una lista comparable (ordenada por puntaje descendente). Incluye
// una descripcion arriba y una seccion "Fuentes de tendencias" con enlaces
// informativos que el usuario abre MANUALMENTE (sin scraping ni red).
// Exporta montar(contenedor), que app.js invoca con el elemento
// #view-factibilidad.

import { formatearNumero, formatearCop } from "../lib/config.js";
import { puntuarFactibilidad } from "../lib/factibilidad.js";
import { resultadoGuardadoDeCalculadora } from "../lib/calcPersistido.js";
import storage from "../lib/storage.js";

const CLAVE_IDEAS = "factibilidad";
const CLAVE_CALC = "calc";

function num(v, def = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

// Lee las ideas guardadas y las devuelve siempre como arreglo.
function leerIdeas() {
  const lista = storage.get(CLAVE_IDEAS, []);
  return Array.isArray(lista) ? lista : [];
}

function guardarIdeas(lista) {
  storage.set(CLAVE_IDEAS, lista);
}

// Ordena por puntaje descendente para facilitar la comparacion.
function ordenarPorPuntaje(lista) {
  return [...lista].sort((a, b) => num(b.puntaje) - num(a.puntaje));
}

// Mapea la recomendacion exacta a la clase de distintivo ya existente en el CSS.
function claseDistintivo(recomendacion) {
  if (recomendacion === "Hazlo ya") return "distintivo--vender";
  if (recomendacion === "Hazlo pero cuida los detalles")
    return "distintivo--personaliza";
  return "distintivo--descartar";
}

// Recupera el margen % y el precio del ultimo calculo guardado por la
// Calculadora (misma logica pura que usa el Validador). Devuelve null si no hay
// un calculo previo valido.
function resultadoDesdeCalculadora() {
  const estado = storage.get(CLAVE_CALC, null);
  return resultadoGuardadoDeCalculadora(estado);
}

export function montar(contenedor) {
  if (!contenedor) return;

  let ideas = leerIdeas();

  contenedor.innerHTML = plantilla();

  const campos = {
    nombre: contenedor.querySelector("#fac-nombre"),
    tendencia: contenedor.querySelector("#fac-tendencia"),
    potencialVideo: contenedor.querySelector("#fac-potencial"),
    esfuerzo: contenedor.querySelector("#fac-esfuerzo"),
    margenPct: contenedor.querySelector("#fac-margen"),
    riesgoLegal: contenedor.querySelector("#fac-riesgo"),
    ventana: contenedor.querySelector("#fac-ventana"),
  };

  const form = contenedor.querySelector("#fac-form");
  const botonMargen = contenedor.querySelector("#fac-traer-margen");
  const notaMargen = contenedor.querySelector("#fac-nota-margen");
  const avisoForm = contenedor.querySelector("#fac-aviso");
  const panelLista = contenedor.querySelector("#fac-lista");

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
    notaMargen.textContent = `Margen traido de la Calculadora (precio de publicacion ${formatearCop(resultado.precio)}): ${formatearNumero(redondeado, 1)}%.`;
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const nombre = String(campos.nombre.value || "").trim();
    if (!nombre) {
      avisoForm.textContent = "Escribe un nombre para la idea.";
      avisoForm.hidden = false;
      campos.nombre.focus();
      return;
    }
    avisoForm.hidden = true;

    // El margen es opcional: solo lo pasamos como numero si el usuario escribio
    // algo, para dejar que la logica use su caso neutral cuando esta vacio.
    const margenTexto = String(campos.margenPct.value || "").trim();
    const margenPct = margenTexto === "" ? undefined : num(margenTexto);

    const entrada = {
      nombre,
      tendencia: campos.tendencia.value,
      potencialVideo: campos.potencialVideo.value,
      esfuerzo: campos.esfuerzo.value,
      margenPct,
      riesgoLegal: campos.riesgoLegal.value,
      ventana: campos.ventana.value,
    };

    const resultado = puntuarFactibilidad(entrada);

    // Guardamos las entradas junto con el puntaje y la recomendacion calculados
    // para poder mostrarlos y compararlos sin recalcular en cada render.
    const idea = {
      id: `f-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      nombre,
      tendencia: entrada.tendencia,
      potencialVideo: entrada.potencialVideo,
      esfuerzo: entrada.esfuerzo,
      margenPct: margenPct === undefined ? null : margenPct,
      riesgoLegal: entrada.riesgoLegal,
      ventana: entrada.ventana,
      puntaje: resultado.puntaje,
      recomendacion: resultado.recomendacion,
    };

    ideas.push(idea);
    guardarIdeas(ideas);
    renderLista();

    // Reinicia los campos de texto/numero pero conserva los select en su valor.
    campos.nombre.value = "";
    campos.margenPct.value = "";
    notaMargen.textContent = "";
    campos.nombre.focus();
  });

  // Delegacion de eventos para el boton "Eliminar" de cada idea.
  panelLista.addEventListener("click", (e) => {
    const boton = e.target.closest("[data-eliminar]");
    if (!boton) return;
    const id = boton.getAttribute("data-eliminar");
    ideas = ideas.filter((i) => i.id !== id);
    guardarIdeas(ideas);
    renderLista();
  });

  function renderLista() {
    panelLista.innerHTML = renderIdeas(ordenarPorPuntaje(ideas));
  }

  renderLista();
}

// --- Render helpers (puras de presentacion) ---

function etiquetaNivel(valor) {
  const v = String(valor || "").toLowerCase();
  if (v === "alta") return "Alta";
  if (v === "media") return "Media";
  if (v === "baja") return "Baja";
  if (v === "alto") return "Alto";
  if (v === "medio") return "Medio";
  if (v === "bajo") return "Bajo";
  if (v === "amplia") return "Amplia";
  if (v === "corta") return "Corta";
  return valor || "";
}

function etiquetaMargen(valor) {
  const n = Number(valor);
  if (!Number.isFinite(n)) return "Sin dato";
  return `${formatearNumero(n, 1)}%`;
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

function renderIdeas(lista) {
  if (!lista.length) {
    return `
      <div class="desglose">
        <p class="val-vacio">
          Aun no has evaluado ideas. Completa el formulario para saber si vale la
          pena hacer un video o producto de una tendencia.
        </p>
      </div>
    `;
  }

  // Tabla para escritorio (se oculta en movil por CSS).
  const filas = lista
    .map(
      (i) => `
        <tr>
          <td data-col="Idea">${esc(i.nombre)}</td>
          <td data-col="Tendencia">${etiquetaNivel(i.tendencia)}</td>
          <td data-col="Video">${etiquetaNivel(i.potencialVideo)}</td>
          <td data-col="Esfuerzo">${etiquetaNivel(i.esfuerzo)}</td>
          <td data-col="Margen">${etiquetaMargen(i.margenPct)}</td>
          <td data-col="Riesgo legal">${etiquetaNivel(i.riesgoLegal)}</td>
          <td data-col="Ventana">${etiquetaNivel(i.ventana)}</td>
          <td data-col="Puntaje">${num(i.puntaje)}</td>
          <td data-col="Recomendacion">${distintivoHtml(i.recomendacion)}</td>
          <td data-col="Accion">
            <button class="boton boton--secundario fac-eliminar" type="button" data-eliminar="${esc(i.id)}">
              Eliminar
            </button>
          </td>
        </tr>
      `,
    )
    .join("");

  const tabla = `
    <div class="fac-tabla-envoltura">
      <table class="tabla fac-tabla">
        <thead>
          <tr>
            <th>Idea</th>
            <th>Tendencia</th>
            <th>Video</th>
            <th>Esfuerzo</th>
            <th>Margen</th>
            <th>Riesgo legal</th>
            <th>Ventana</th>
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
      (i) => `
        <article class="fac-card">
          <div class="fac-card__cabecera">
            <h4 class="fac-card__titulo">${esc(i.nombre)}</h4>
            ${distintivoHtml(i.recomendacion)}
          </div>
          <dl class="fac-card__datos">
            <div><dt>Tendencia</dt><dd>${etiquetaNivel(i.tendencia)}</dd></div>
            <div><dt>Video</dt><dd>${etiquetaNivel(i.potencialVideo)}</dd></div>
            <div><dt>Esfuerzo</dt><dd>${etiquetaNivel(i.esfuerzo)}</dd></div>
            <div><dt>Margen</dt><dd>${etiquetaMargen(i.margenPct)}</dd></div>
            <div><dt>Riesgo legal</dt><dd>${etiquetaNivel(i.riesgoLegal)}</dd></div>
            <div><dt>Ventana</dt><dd>${etiquetaNivel(i.ventana)}</dd></div>
            <div><dt>Puntaje</dt><dd>${num(i.puntaje)}</dd></div>
          </dl>
          <button class="boton boton--secundario fac-eliminar" type="button" data-eliminar="${esc(i.id)}">
            Eliminar
          </button>
        </article>
      `,
    )
    .join("");

  return `
    ${tabla}
    <div class="fac-cards">${tarjetas}</div>
  `;
}

function plantilla() {
  return `
    <div class="fac">
      <div class="tarjeta fac__descripcion">
        <h2 class="tarjeta__titulo">Factibilidad de video o producto</h2>
        <p class="tarjeta__descripcion">
          Este modulo te ayuda a decidir si vale la pena hacer un video o un
          producto a partir de una tendencia de cultura pop (lo que esta de moda
          en redes, series, juegos o memes). La idea es que no gastes tiempo e
          impresiones en algo que no va a funcionar.
        </p>
        <p class="tarjeta__descripcion">
          Como se usa: registras una idea, respondes unos campos (que tan fuerte
          esta la tendencia, que tan bueno es como video, cuanto esfuerzo lleva,
          que margen deja, que tan riesgoso es por derechos de autor y cuanto le
          queda de vida a la tendencia) y la app te da un puntaje y una
          recomendacion. Mas abajo encuentras fuentes para descubrir tendencias.
        </p>
      </div>

      <div class="tarjeta fac__formulario">
        <h3 class="tarjeta__titulo">Evaluar una idea</h3>

        <form id="fac-form" class="formulario">
          <div class="campo">
            <label for="fac-nombre">Nombre de la idea</label>
            <input id="fac-nombre" type="text" placeholder="Ej. Llavero del meme del momento" maxlength="80" />
          </div>
          <div class="campo">
            <label for="fac-tendencia">Que tan caliente esta la tendencia</label>
            <select id="fac-tendencia">
              <option value="alta">Alta</option>
              <option value="media" selected>Media</option>
              <option value="baja">Baja</option>
            </select>
          </div>
          <div class="campo">
            <label for="fac-potencial">Potencial como video (Reel)</label>
            <select id="fac-potencial">
              <option value="alta">Alta</option>
              <option value="media" selected>Media</option>
              <option value="baja">Baja</option>
            </select>
          </div>
          <div class="campo">
            <label for="fac-esfuerzo">Esfuerzo de produccion</label>
            <select id="fac-esfuerzo">
              <option value="bajo">Bajo</option>
              <option value="medio" selected>Medio</option>
              <option value="alto">Alto</option>
            </select>
          </div>
          <div class="campo">
            <label for="fac-margen">Margen (%) (opcional)</label>
            <input id="fac-margen" type="number" step="0.1" inputmode="decimal" placeholder="Ej. 42" />
            <small class="campo__ayuda">Puedes tomarlo de la Calculadora. Si lo dejas vacio se asume un margen medio.</small>
            <button id="fac-traer-margen" class="boton boton--secundario fac__traer" type="button">
              Traer margen de la Calculadora
            </button>
            <small id="fac-nota-margen" class="campo__ayuda"></small>
          </div>
          <div class="campo">
            <label for="fac-riesgo">Riesgo legal (derechos de autor)</label>
            <select id="fac-riesgo">
              <option value="bajo">Bajo</option>
              <option value="medio" selected>Medio</option>
              <option value="alto">Alto</option>
            </select>
            <small class="campo__ayuda">
              Personajes de marcas registradas (Pokemon, Marvel, Disney, etc.)
              son riesgo alto. Un diseno original es riesgo bajo.
            </small>
          </div>
          <div class="campo">
            <label for="fac-ventana">Ventana de la tendencia</label>
            <select id="fac-ventana">
              <option value="amplia">Amplia</option>
              <option value="media" selected>Media</option>
              <option value="corta">Corta</option>
            </select>
          </div>

          <div class="campo fac__acciones">
            <button class="boton boton--primario" type="submit">
              Evaluar y guardar
            </button>
            <small id="fac-aviso" class="val-aviso" hidden></small>
          </div>
        </form>
      </div>

      <div class="tarjeta fac__resultado">
        <h3 class="tarjeta__titulo">Ideas evaluadas</h3>
        <p class="tarjeta__descripcion">
          Ordenadas por puntaje (de mayor a menor) para comparar de un vistazo.
          Se guardan en este navegador y reaparecen al recargar.
        </p>
        <div id="fac-lista"></div>
      </div>

      <div class="tarjeta fac__fuentes">
        <h3 class="tarjeta__titulo">Fuentes de tendencias</h3>
        <p class="tarjeta__descripcion">
          Paginas donde puedes mirar que esta en tendencia para la impresion 3D
          y la cultura pop. Abre cada enlace, explora y anota aqui las ideas que
          veas con potencial. No hay busqueda automatica: estas paginas se
          revisan a mano.
        </p>
        <ul class="fac-fuentes">
          <li>
            <a href="https://makerworld.com" target="_blank" rel="noopener">MakerWorld</a>:
            modelos 3D en tendencia, mira la seccion popular o trending.
          </li>
          <li>
            <a href="https://www.printables.com" target="_blank" rel="noopener">Printables</a>:
            modelos 3D populares de la comunidad.
          </li>
          <li>
            <a href="https://www.thingiverse.com" target="_blank" rel="noopener">Thingiverse</a>:
            repositorio grande de modelos para imprimir.
          </li>
          <li>
            <a href="https://cults3d.com" target="_blank" rel="noopener">Cults3D</a>:
            modelos 3D, muchos de cultura pop.
          </li>
          <li>
            <a href="https://www.tiktok.com" target="_blank" rel="noopener">TikTok</a>:
            busca #3dprint y #3dprinting para ver que productos se vuelven virales.
          </li>
          <li>
            <a href="https://trends.google.com" target="_blank" rel="noopener">Google Trends</a>:
            mira que terminos estan subiendo en las busquedas.
          </li>
          <li>
            <a href="https://www.pinterest.com" target="_blank" rel="noopener">Pinterest</a>:
            inspiracion visual y tendencias de diseno.
          </li>
        </ul>
        <p class="fac-aviso-legal">
          Ojo con los derechos de autor: vender figuras de personajes de marcas
          registradas (Pokemon, Marvel, Disney, etc.) puede traerte problemas o
          baneos en Mercado Libre. Lo mas seguro es inspirarte en el estilo o el
          tema sin copiar el personaje exacto, o usar disenos originales.
        </p>
      </div>
    </div>
  `;
}
