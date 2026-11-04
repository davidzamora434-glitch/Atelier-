// fondo.js
// MODULO 4 - Fondo de proyectos (UI).
// Conecta la logica PURA de src/js/lib/fondo.js (progresoMeta, sumarAportes,
// metaDesdeEntrada) a una interfaz de marca que motiva: aqui apartas una parte
// de las ganancias de las ventas para financiar tus proyectos personales (como
// un poliformer y un mini robot) y ves como avanza cada meta.
// Permite crear metas (con objetivo OPCIONAL), registrar aportes por meta y
// ver el progreso con una barra en el naranja de la marca.
// Exporta montar(contenedor), que app.js invoca con el elemento #view-fondo.

import { formatearNumero, formatearCop } from "../lib/config.js";
import { progresoMeta, metaDesdeEntrada } from "../lib/fondo.js";
import storage from "../lib/storage.js";

const CLAVE_FONDO = "fondo";

function num(v, def = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

// Fecha de hoy en formato YYYY-MM-DD para el valor por defecto del input date.
function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}

function nuevoId(prefijo) {
  return `${prefijo}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

// Metas de ejemplo que se siembran SOLO en la primera carga (cuando no hay nada
// guardado todavia). Sin objetivo (objetivoCop null): no inventamos montos, el
// usuario define su meta cuando quiera. Puede editarlas o eliminarlas.
function metasSemilla() {
  return [
    { id: nuevoId("m"), nombre: "Poliformer", objetivoCop: null, nota: "", aportes: [] },
    { id: nuevoId("m"), nombre: "Mini robot", objetivoCop: null, nota: "", aportes: [] },
  ];
}

// Lee las metas guardadas. Si NO hay nada guardado todavia (primera carga),
// siembra las metas de ejemplo y las persiste. Si el usuario ya tiene datos
// (incluso un arreglo vacio que el mismo dejo), respeta lo que haya.
function leerMetas() {
  const guardado = storage.get(CLAVE_FONDO, null);
  if (!Array.isArray(guardado)) {
    const semilla = metasSemilla();
    guardarMetas(semilla);
    return semilla;
  }
  return guardado;
}

function guardarMetas(lista) {
  storage.set(CLAVE_FONDO, lista);
}

export function montar(contenedor) {
  if (!contenedor) return;

  let metas = leerMetas();

  contenedor.innerHTML = plantilla();

  const campos = {
    nombre: contenedor.querySelector("#fondo-nombre"),
    objetivo: contenedor.querySelector("#fondo-objetivo"),
    nota: contenedor.querySelector("#fondo-nota"),
  };

  const form = contenedor.querySelector("#fondo-form");
  const avisoForm = contenedor.querySelector("#fondo-aviso");
  const panelLista = contenedor.querySelector("#fondo-lista");

  // Crear una meta nueva. Solo validamos que el nombre no este vacio; el
  // objetivo es opcional (una meta sin objetivo igual registra aportes).
  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const nombre = String(campos.nombre.value || "").trim();
    if (!nombre) {
      avisoForm.textContent = "Escribe un nombre para la meta.";
      avisoForm.hidden = false;
      campos.nombre.focus();
      return;
    }
    avisoForm.hidden = true;

    // metaDesdeEntrada normaliza el objetivo a numero positivo o null.
    const normalizada = metaDesdeEntrada({
      nombre,
      objetivoCop: campos.objetivo.value,
      nota: campos.nota.value,
    });

    const meta = {
      id: nuevoId("m"),
      nombre: normalizada.nombre,
      objetivoCop: normalizada.objetivoCop,
      nota: normalizada.nota,
      aportes: [],
    };

    metas.push(meta);
    guardarMetas(metas);
    renderLista();

    campos.nombre.value = "";
    campos.objetivo.value = "";
    campos.nota.value = "";
    campos.nombre.focus();
  });

  // Delegacion de eventos para toda la lista: eliminar meta, agregar aporte y
  // eliminar aporte.
  panelLista.addEventListener("click", (e) => {
    const botonMeta = e.target.closest("[data-eliminar-meta]");
    if (botonMeta) {
      const id = botonMeta.getAttribute("data-eliminar-meta");
      metas = metas.filter((m) => m.id !== id);
      guardarMetas(metas);
      renderLista();
      return;
    }

    const botonAporte = e.target.closest("[data-eliminar-aporte]");
    if (botonAporte) {
      const idMeta = botonAporte.getAttribute("data-meta");
      const idAporte = botonAporte.getAttribute("data-eliminar-aporte");
      const meta = metas.find((m) => m.id === idMeta);
      if (meta && Array.isArray(meta.aportes)) {
        meta.aportes = meta.aportes.filter((a) => a.id !== idAporte);
        guardarMetas(metas);
        renderLista();
      }
      return;
    }
  });

  // Delegacion para el formulario de aportes de cada meta.
  panelLista.addEventListener("submit", (e) => {
    const formAporte = e.target.closest("[data-aporte-form]");
    if (!formAporte) return;
    e.preventDefault();

    const idMeta = formAporte.getAttribute("data-aporte-form");
    const meta = metas.find((m) => m.id === idMeta);
    if (!meta) return;

    const inputMonto = formAporte.querySelector("[data-aporte-monto]");
    const inputFecha = formAporte.querySelector("[data-aporte-fecha]");
    const inputNota = formAporte.querySelector("[data-aporte-nota]");
    const avisoAporte = formAporte.querySelector("[data-aporte-aviso]");

    const monto = num(inputMonto.value, 0);
    if (!(monto > 0)) {
      if (avisoAporte) {
        avisoAporte.textContent = "Escribe un monto mayor que cero.";
        avisoAporte.hidden = false;
      }
      inputMonto.focus();
      return;
    }
    if (avisoAporte) avisoAporte.hidden = true;

    if (!Array.isArray(meta.aportes)) meta.aportes = [];
    meta.aportes.push({
      id: nuevoId("a"),
      monto,
      fecha: String(inputFecha.value || hoyISO()),
      nota: String(inputNota.value || "").trim(),
    });

    guardarMetas(metas);
    renderLista();
  });

  function renderLista() {
    panelLista.innerHTML = renderMetas(metas);
  }

  renderLista();
}

// --- Render helpers (puras de presentacion) ---

// Escapa texto del usuario para evitar inyeccion de HTML.
function esc(texto) {
  return String(texto == null ? "" : texto)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Barra de progreso de la meta. Cuando NO hay objetivo, muestra una barra
// neutral sin relleno y el texto exacto "Aun sin meta definida". Cuando hay
// objetivo, rellena con el naranja de marca hasta el porcentaje (topado a 100)
// y muestra el porcentaje y cuanto falta, o "Meta superada" si ya se cumplio.
function barraProgreso(prog) {
  if (!prog.tieneObjetivo) {
    return `
      <div class="fondo-progreso fondo-progreso--sin-meta">
        <div class="fondo-barra" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">
          <div class="fondo-barra__relleno" style="width: 0%"></div>
        </div>
        <p class="fondo-progreso__texto">Aun sin meta definida</p>
      </div>
    `;
  }

  const porcentaje = num(prog.porcentaje, 0);
  const estado = prog.superada
    ? `<span class="fondo-insignia">Meta superada</span>`
    : `<span class="fondo-progreso__falta">Te falta ${esc(formatearCop(prog.restante))}</span>`;

  return `
    <div class="fondo-progreso">
      <div class="fondo-barra" role="progressbar" aria-valuenow="${porcentaje}" aria-valuemin="0" aria-valuemax="100">
        <div class="fondo-barra__relleno" style="width: ${porcentaje}%"></div>
      </div>
      <p class="fondo-progreso__texto">
        <span class="fondo-progreso__pct">${formatearNumero(porcentaje, 1)}%</span>
        ${estado}
      </p>
    </div>
  `;
}

// Lista de aportes de una meta: tabla en escritorio, tarjetas en movil.
function renderAportes(meta) {
  const aportes = Array.isArray(meta.aportes) ? meta.aportes : [];
  if (!aportes.length) {
    return `<p class="fondo-vacio">Aun no hay aportes en esta meta. Registra el primero arriba.</p>`;
  }

  const filas = aportes
    .map(
      (a) => `
        <tr>
          <td data-col="Fecha">${esc(a.fecha)}</td>
          <td data-col="Monto">${formatearCop(num(a.monto))}</td>
          <td data-col="Nota">${esc(a.nota) || "-"}</td>
          <td data-col="Accion">
            <button class="boton boton--secundario fondo-eliminar" type="button"
              data-meta="${esc(meta.id)}" data-eliminar-aporte="${esc(a.id)}">
              Eliminar
            </button>
          </td>
        </tr>
      `,
    )
    .join("");

  const tabla = `
    <div class="fondo-tabla-envoltura">
      <table class="tabla fondo-tabla">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Monto</th>
            <th>Nota</th>
            <th></th>
          </tr>
        </thead>
        <tbody>${filas}</tbody>
      </table>
    </div>
  `;

  const tarjetas = aportes
    .map(
      (a) => `
        <article class="fondo-aporte-card">
          <div class="fondo-aporte-card__cabecera">
            <span class="fondo-aporte-card__monto">${formatearCop(num(a.monto))}</span>
            <span class="fondo-aporte-card__fecha">${esc(a.fecha)}</span>
          </div>
          <p class="fondo-aporte-card__nota">${esc(a.nota) || "Sin nota"}</p>
          <button class="boton boton--secundario fondo-eliminar" type="button"
            data-meta="${esc(meta.id)}" data-eliminar-aporte="${esc(a.id)}">
            Eliminar
          </button>
        </article>
      `,
    )
    .join("");

  return `
    ${tabla}
    <div class="fondo-aportes-cards">${tarjetas}</div>
  `;
}

function renderMetas(metas) {
  if (!Array.isArray(metas) || !metas.length) {
    return `
      <div class="desglose">
        <p class="fondo-vacio">
          Aun no tienes metas. Crea una arriba (por ejemplo, el poliformer o el
          mini robot) y empieza a registrar tus aportes.
        </p>
      </div>
    `;
  }

  return metas
    .map((meta) => {
      const prog = progresoMeta(meta);
      const objetivoTexto = prog.tieneObjetivo
        ? `Objetivo ${esc(formatearCop(prog.objetivo))}`
        : "Sin objetivo";
      const notaHtml = meta.nota
        ? `<p class="fondo-meta__nota">${esc(meta.nota)}</p>`
        : "";

      return `
        <article class="fondo-meta">
          <div class="fondo-meta__cabecera">
            <h4 class="fondo-meta__titulo">${esc(meta.nombre)}</h4>
            <button class="boton boton--secundario fondo-eliminar" type="button"
              data-eliminar-meta="${esc(meta.id)}">
              Eliminar meta
            </button>
          </div>
          <p class="fondo-meta__resumen">
            <span class="fondo-meta__total">Acumulado ${esc(formatearCop(prog.total))}</span>
            <span class="fondo-meta__objetivo">${objetivoTexto}</span>
          </p>
          ${notaHtml}
          ${barraProgreso(prog)}

          <form class="fondo-aporte-form" data-aporte-form="${esc(meta.id)}">
            <div class="campo">
              <label>Monto del aporte (COP)</label>
              <input type="number" min="0" step="100" inputmode="numeric" placeholder="Ej. 20000" data-aporte-monto />
            </div>
            <div class="campo">
              <label>Fecha</label>
              <input type="date" value="${hoyISO()}" data-aporte-fecha />
            </div>
            <div class="campo">
              <label>Nota (opcional)</label>
              <input type="text" maxlength="80" placeholder="Ej. Venta de 3 organizadores" data-aporte-nota />
            </div>
            <div class="campo fondo-aporte-form__acciones">
              <button class="boton boton--primario" type="submit">Agregar aporte</button>
              <small class="fondo-aviso" data-aporte-aviso hidden></small>
            </div>
          </form>

          <div class="fondo-aportes">
            ${renderAportes(meta)}
          </div>
        </article>
      `;
    })
    .join("");
}

function plantilla() {
  return `
    <div class="fondo">
      <div class="tarjeta fondo__descripcion">
        <h2 class="tarjeta__titulo">Fondo de proyectos</h2>
        <p class="tarjeta__descripcion">
          Aqui apartas una parte de las ganancias de tus ventas para financiar
          tus proyectos personales, como el poliformer y el mini robot. La idea
          es sencilla: cada vez que vendas, guardas un pedacito en la meta que
          elijas y ves como se va llenando. Asi mantienes el impulso y te motivas
          viendo el avance en vez de perder de vista para que estas trabajando.
        </p>
        <p class="tarjeta__descripcion">
          Una meta puede existir SIN objetivo: igual registra aportes y suma el
          total. Cuando quieras ponerle una cifra, le agregas un objetivo y
          aparece la barra de progreso con cuanto te falta.
        </p>
      </div>

      <div class="tarjeta fondo__formulario">
        <h3 class="tarjeta__titulo">Crear una meta</h3>

        <form id="fondo-form" class="formulario">
          <div class="campo">
            <label for="fondo-nombre">Nombre de la meta</label>
            <input id="fondo-nombre" type="text" placeholder="Ej. Poliformer" maxlength="80" />
          </div>
          <div class="campo">
            <label for="fondo-objetivo">Objetivo en COP (opcional)</label>
            <input id="fondo-objetivo" type="number" min="0" step="1000" inputmode="numeric" placeholder="Ej. 800000" />
            <small class="campo__ayuda">
              Puedes dejarlo vacio: la meta igual funciona y suma tus aportes.
            </small>
          </div>
          <div class="campo">
            <label for="fondo-nota">Nota (opcional)</label>
            <input id="fondo-nota" type="text" placeholder="Ej. Para armar mi propio poliformer" maxlength="120" />
          </div>

          <div class="campo fondo__acciones">
            <button class="boton boton--primario" type="submit">Crear meta</button>
            <small id="fondo-aviso" class="fondo-aviso" hidden></small>
          </div>
        </form>
      </div>

      <div class="tarjeta fondo__resultado">
        <h3 class="tarjeta__titulo">Mis metas</h3>
        <p class="tarjeta__descripcion">
          Cada meta muestra lo acumulado y, si tiene objetivo, una barra de
          progreso. Registra aportes y elimina los que no correspondan. Todo se
          guarda en este navegador y reaparece al recargar.
        </p>
        <div id="fondo-lista"></div>
      </div>
    </div>
  `;
}
