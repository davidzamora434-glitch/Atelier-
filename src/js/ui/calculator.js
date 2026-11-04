// calculator.js
// MODULO 1 - Calculadora de costos y precio (UI).
// Conecta la logica PURA de src/js/lib/costs.js a un formulario de marca con un
// panel de desglose en vivo. Exporta montar(contenedor), que app.js invoca con
// el elemento #view-calculadora.

import {
  MAQUINAS,
  FILAMENTOS,
  VIDA_UTIL_HORAS_DEFAULT,
  ENERGIA_COP_KWH,
  MERCADOLIBRE,
  FILAMENTO_PLA_COP_KG_DEFAULT,
  formatearCop,
  formatearNumero,
} from "../lib/config.js";
import { calcularTodo } from "../lib/costs.js";
import storage from "../lib/storage.js";

const CLAVE_STORAGE = "calc";

// Estado por defecto (reproduce el ejemplo real del usuario en Mercado Libre).
function estadoPorDefecto() {
  const maquina = MAQUINAS[0];
  const filamento = FILAMENTOS.find((f) => f.enUso) || FILAMENTOS[0];
  return {
    maquinaId: maquina.id,
    precioCompraCop: maquina.precioCompraCop,
    filamentoId: filamento.id,
    precioKgCop: filamento.precioKgCopDefault,
    gramos: 50,
    horas: 3,
    potenciaW: maquina.potenciaWDefault,
    vidaUtilHoras: VIDA_UTIL_HORAS_DEFAULT,
    energiaCopKwh: ENERGIA_COP_KWH,
    purgaModo: "gramos", // 'gramos' | 'pct'
    purgaGramos: 0,
    purgaPct: 0,
    // Mercado Libre.
    precio: 24900,
    comisionPct: MERCADOLIBRE.comisionPct * 100, // en % para el UI (19)
    envioCop: MERCADOLIBRE.envioGratisCopDefault,
    envioCubiertoPct: MERCADOLIBRE.envioCubiertoPorMlPctDefault * 100, // 0
    icaPct: MERCADOLIBRE.icaPct * 100, // 0.41
    retencionPct: MERCADOLIBRE.retencionFuentePct * 100, // 1.5
  };
}

// Ejemplo real confirmado por el usuario (publicacion 24.900 -> neto ~11.593).
function ejemploRealML() {
  return {
    precio: 24900,
    comisionPct: 19,
    envioCop: 8100,
    envioCubiertoPct: 0,
    icaPct: 0.41,
    retencionPct: 1.5,
  };
}

function num(v, def = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

// Determina si la maquina seleccionada soporta multicolor (purga relevante).
function esMulticolor(maquinaId) {
  const m = MAQUINAS.find((x) => x.id === maquinaId);
  return !!m && m.maxColores > 1;
}

export function montar(contenedor) {
  if (!contenedor) return;

  const guardado = storage.get(CLAVE_STORAGE, null);
  const estado = { ...estadoPorDefecto(), ...(guardado || {}) };

  contenedor.innerHTML = plantilla();

  // Referencias a los campos del formulario.
  const campos = {
    maquinaId: contenedor.querySelector("#calc-maquina"),
    precioCompraCop: contenedor.querySelector("#calc-precio-compra"),
    filamentoId: contenedor.querySelector("#calc-filamento"),
    precioKgCop: contenedor.querySelector("#calc-precio-kg"),
    gramos: contenedor.querySelector("#calc-gramos"),
    horas: contenedor.querySelector("#calc-horas"),
    potenciaW: contenedor.querySelector("#calc-potencia"),
    vidaUtilHoras: contenedor.querySelector("#calc-vida-util"),
    energiaCopKwh: contenedor.querySelector("#calc-energia"),
    purgaModo: contenedor.querySelector("#calc-purga-modo"),
    purgaGramos: contenedor.querySelector("#calc-purga-gramos"),
    purgaPct: contenedor.querySelector("#calc-purga-pct"),
    precio: contenedor.querySelector("#calc-precio"),
    comisionPct: contenedor.querySelector("#calc-comision"),
    envioCop: contenedor.querySelector("#calc-envio"),
    envioCubiertoPct: contenedor.querySelector("#calc-envio-cubierto"),
    icaPct: contenedor.querySelector("#calc-ica"),
    retencionPct: contenedor.querySelector("#calc-retencion"),
  };

  const seccionMulticolor = contenedor.querySelector("#calc-multicolor");
  const purgaGramosCampo = contenedor.querySelector("#campo-purga-gramos");
  const purgaPctCampo = contenedor.querySelector("#campo-purga-pct");
  const botonEjemplo = contenedor.querySelector("#calc-ejemplo");
  const botonReset = contenedor.querySelector("#calc-reset");
  const panel = contenedor.querySelector("#calc-desglose");

  // Rellena el <select> de maquinas y filamentos.
  llenarSelect(
    campos.maquinaId,
    MAQUINAS,
    (m) => m.id,
    (m) => m.nombre,
  );
  llenarSelect(
    campos.filamentoId,
    FILAMENTOS,
    (f) => f.id,
    (f) => (f.enUso ? f.nombre : `${f.nombre} (proximamente)`),
  );

  // Escribe el estado inicial en los campos.
  escribirEstadoEnCampos();

  // --- Helpers de sincronizacion estado <-> UI ---

  function escribirEstadoEnCampos() {
    for (const [clave, el] of Object.entries(campos)) {
      if (!el) continue;
      el.value = estado[clave];
    }
    actualizarVisibilidadPurga();
    actualizarVisibilidadMulticolor();
    recalcular();
  }

  function leerCamposEnEstado() {
    estado.maquinaId = campos.maquinaId.value;
    estado.filamentoId = campos.filamentoId.value;
    estado.purgaModo = campos.purgaModo.value;
    const numericos = [
      "precioCompraCop",
      "precioKgCop",
      "gramos",
      "horas",
      "potenciaW",
      "vidaUtilHoras",
      "energiaCopKwh",
      "purgaGramos",
      "purgaPct",
      "precio",
      "comisionPct",
      "envioCop",
      "envioCubiertoPct",
      "icaPct",
      "retencionPct",
    ];
    for (const clave of numericos) {
      estado[clave] = num(campos[clave].value);
    }
  }

  function actualizarVisibilidadMulticolor() {
    const multicolor = esMulticolor(estado.maquinaId);
    seccionMulticolor.hidden = !multicolor;
  }

  function actualizarVisibilidadPurga() {
    const porPct = campos.purgaModo.value === "pct";
    purgaPctCampo.hidden = !porPct;
    purgaGramosCampo.hidden = porPct;
  }

  function recalcular() {
    // Si no es multicolor, la purga no aplica.
    const multicolor = esMulticolor(estado.maquinaId);
    const purgaGramos =
      multicolor && estado.purgaModo === "gramos" ? estado.purgaGramos : 0;
    const purgaPct =
      multicolor && estado.purgaModo === "pct" ? estado.purgaPct : 0;

    const { costos, venta } = calcularTodo(
      {
        gramos: estado.gramos,
        precioKgCop: estado.precioKgCop,
        horas: estado.horas,
        potenciaW: estado.potenciaW,
        precioCompraCop: estado.precioCompraCop,
        vidaUtilHoras: estado.vidaUtilHoras,
        energiaCopKwh: estado.energiaCopKwh,
        purgaGramos,
        purgaPct,
      },
      {
        precio: estado.precio,
        envioCop: estado.envioCop,
        // La logica pura espera fracciones (0.19), no porcentajes (19).
        // El estado/UI guarda porcentajes para mostrarlos; se convierten aqui.
        envioCubiertoPct: estado.envioCubiertoPct / 100,
        comisionPct: estado.comisionPct / 100,
        icaPct: estado.icaPct / 100,
        retencionPct: estado.retencionPct / 100,
      },
    );

    panel.innerHTML = renderDesglose(costos, venta, multicolor);
    // Persistimos tambien el margen y el precio YA mostrados para que el
    // Validador lea exactamente lo que vio el usuario, sin re-derivarlo (lo que
    // divergia cuando quedaban valores de purga de una maquina multicolor tras
    // volver a una de un solo color). Ver resultadoGuardadoDeCalculadora() en
    // src/js/lib/calcPersistido.js, que lee estos campos desde el Validador.
    estado.margenPctCalculado = venta.margenPct;
    estado.precioCalculado = venta.precio;
    storage.set(CLAVE_STORAGE, estado);
  }

  // --- Listeners ---

  function alCambiar(e) {
    const el = e.target;

    // Al cambiar de maquina: autocompletar precio_compra y potencia (editables).
    if (el === campos.maquinaId) {
      const m = MAQUINAS.find((x) => x.id === el.value);
      if (m) {
        campos.precioCompraCop.value = m.precioCompraCop;
        campos.potenciaW.value = m.potenciaWDefault;
      }
    }

    // Al cambiar de filamento: autocompletar precio por kg sugerido.
    if (el === campos.filamentoId) {
      const f = FILAMENTOS.find((x) => x.id === el.value);
      if (f) campos.precioKgCop.value = f.precioKgCopDefault;
    }

    if (el === campos.purgaModo) actualizarVisibilidadPurga();

    leerCamposEnEstado();

    if (el === campos.maquinaId) actualizarVisibilidadMulticolor();

    recalcular();
  }

  for (const el of Object.values(campos)) {
    if (!el) continue;
    el.addEventListener("input", alCambiar);
    el.addEventListener("change", alCambiar);
  }

  botonEjemplo.addEventListener("click", () => {
    Object.assign(estado, ejemploRealML());
    // Reflejar en los campos ML.
    campos.precio.value = estado.precio;
    campos.comisionPct.value = estado.comisionPct;
    campos.envioCop.value = estado.envioCop;
    campos.envioCubiertoPct.value = estado.envioCubiertoPct;
    campos.icaPct.value = estado.icaPct;
    campos.retencionPct.value = estado.retencionPct;
    recalcular();
  });

  botonReset.addEventListener("click", () => {
    const def = estadoPorDefecto();
    Object.assign(estado, def);
    escribirEstadoEnCampos();
  });
}

// --- Render helpers (puras de presentacion) ---

function llenarSelect(select, lista, valorFn, textoFn) {
  if (!select) return;
  select.innerHTML = "";
  for (const item of lista) {
    const opt = document.createElement("option");
    opt.value = valorFn(item);
    opt.textContent = textoFn(item);
    select.appendChild(opt);
  }
}

function renderDesglose(costos, venta, multicolor) {
  const gananciaClase =
    venta.gananciaNetaFinal >= 0 ? "valor-positivo" : "valor-negativo";
  const margenClase =
    venta.margenPct >= 0 ? "valor-positivo" : "valor-negativo";

  const filaPurga = multicolor
    ? `<div class="desglose__fila">
         <span>Purga / desperdicio (${formatearNumero(costos.gramosPurga, 1)} g)</span>
         <span>incluido arriba</span>
       </div>`
    : "";

  return `
    <h4 class="desglose__subtitulo">Costo de produccion</h4>
    <div class="desglose__fila">
      <span>Filamento (${formatearNumero(costos.gramosTotales, 1)} g)</span>
      <span>${formatearCop(costos.costoFilamento)}</span>
    </div>
    <div class="desglose__fila">
      <span>Energia</span>
      <span>${formatearCop(costos.costoEnergia)}</span>
    </div>
    <div class="desglose__fila">
      <span>Desgaste de maquina</span>
      <span>${formatearCop(costos.desgasteMaquina)}</span>
    </div>
    ${filaPurga}
    <div class="desglose__fila desglose__fila--total">
      <span>Costo total de produccion</span>
      <span>${formatearCop(costos.costoTotal)}</span>
    </div>

    <h4 class="desglose__subtitulo">Venta en Mercado Libre</h4>
    <div class="desglose__fila">
      <span>Precio de publicacion</span>
      <span>${formatearCop(venta.precio)}</span>
    </div>
    <div class="desglose__fila">
      <span>Comision (${formatearNumero((venta.comision / (venta.precio || 1)) * 100, 2)}%)</span>
      <span>- ${formatearCop(venta.comision)}</span>
    </div>
    <div class="desglose__fila">
      <span>Envio descontado</span>
      <span>- ${formatearCop(venta.envioDescontado)}</span>
    </div>
    <div class="desglose__fila">
      <span>Impuestos (ICA + retencion)</span>
      <span>- ${formatearCop(venta.impuestos)}</span>
    </div>
    <div class="desglose__fila desglose__fila--total">
      <span>Neto recibido de ML</span>
      <span>${formatearCop(venta.neto)}</span>
    </div>

    <h4 class="desglose__subtitulo">Resultado</h4>
    <div class="desglose__fila desglose__fila--total">
      <span>Ganancia neta final</span>
      <span class="${gananciaClase}">${formatearCop(venta.gananciaNetaFinal)}</span>
    </div>
    <div class="desglose__fila">
      <span>Margen</span>
      <span class="${margenClase}">${formatearNumero(venta.margenPct, 1)}%</span>
    </div>
  `;
}

function plantilla() {
  return `
    <div class="calc">
      <div class="tarjeta calc__formulario">
        <h2 class="tarjeta__titulo">Calculadora de costos y precio</h2>
        <p class="tarjeta__descripcion">
          Calcula el costo real de produccion y la ganancia neta despues de los
          descuentos de Mercado Libre. Los valores se guardan automaticamente.
        </p>

        <h3 class="calc__seccion-titulo">Maquina y material</h3>
        <div class="formulario">
          <div class="campo">
            <label for="calc-maquina">Maquina</label>
            <select id="calc-maquina"></select>
          </div>
          <div class="campo">
            <label for="calc-precio-compra">Precio de compra (COP)</label>
            <input id="calc-precio-compra" type="number" min="0" step="1000" inputmode="numeric" />
          </div>
          <div class="campo">
            <label for="calc-filamento">Tipo de filamento</label>
            <select id="calc-filamento"></select>
          </div>
          <div class="campo">
            <label for="calc-precio-kg">Precio por kg (COP)</label>
            <input id="calc-precio-kg" type="number" min="0" step="1000" inputmode="numeric" />
            <small class="campo__ayuda">75.000 - 90.000 COP/kg</small>
          </div>
        </div>

        <h3 class="calc__seccion-titulo">Pieza e impresion</h3>
        <div class="formulario">
          <div class="campo">
            <label for="calc-gramos">Peso de la pieza (gramos)</label>
            <input id="calc-gramos" type="number" min="0" step="0.1" inputmode="decimal" />
          </div>
          <div class="campo">
            <label for="calc-horas">Horas de impresion</label>
            <input id="calc-horas" type="number" min="0" step="0.1" inputmode="decimal" />
          </div>
          <div class="campo">
            <label for="calc-potencia">Potencia media (W)</label>
            <input id="calc-potencia" type="number" min="0" step="1" inputmode="numeric" />
          </div>
          <div class="campo">
            <label for="calc-vida-util">Vida util (horas)</label>
            <input id="calc-vida-util" type="number" min="1" step="1" inputmode="numeric" />
          </div>
          <div class="campo">
            <label for="calc-energia">Energia (COP/kWh)</label>
            <input id="calc-energia" type="number" min="0" step="1" inputmode="numeric" />
          </div>
        </div>

        <div id="calc-multicolor" hidden>
          <h3 class="calc__seccion-titulo">Multicolor (purga / desperdicio)</h3>
          <p class="calc__nota">
            La Bambu Lab A1 cambia de color purgando filamento. Agrega ese
            desperdicio como gramos extra o como un porcentaje del peso base.
          </p>
          <div class="formulario">
            <div class="campo">
              <label for="calc-purga-modo">Modo de purga</label>
              <select id="calc-purga-modo">
                <option value="gramos">Gramos extra</option>
                <option value="pct">% extra sobre el peso</option>
              </select>
            </div>
            <div class="campo" id="campo-purga-gramos">
              <label for="calc-purga-gramos">Purga (gramos)</label>
              <input id="calc-purga-gramos" type="number" min="0" step="0.1" inputmode="decimal" />
            </div>
            <div class="campo" id="campo-purga-pct" hidden>
              <label for="calc-purga-pct">Purga (% extra)</label>
              <input id="calc-purga-pct" type="number" min="0" step="1" inputmode="numeric" />
            </div>
          </div>
        </div>

        <h3 class="calc__seccion-titulo">Mercado Libre</h3>
        <div class="formulario">
          <div class="campo">
            <label for="calc-precio">Precio de publicacion (COP)</label>
            <input id="calc-precio" type="number" min="0" step="100" inputmode="numeric" />
          </div>
          <div class="campo">
            <label for="calc-comision">Comision (%)</label>
            <input id="calc-comision" type="number" min="0" step="0.1" inputmode="decimal" />
          </div>
          <div class="campo">
            <label for="calc-envio">Envio gratis (COP)</label>
            <input id="calc-envio" type="number" min="0" step="100" inputmode="numeric" />
          </div>
          <div class="campo">
            <label for="calc-envio-cubierto">Envio cubierto por ML (%)</label>
            <input id="calc-envio-cubierto" type="number" min="0" max="100" step="1" inputmode="numeric" />
            <small class="campo__ayuda">El ejemplo real usa 0% (el vendedor paga 8.100).</small>
          </div>
          <div class="campo">
            <label for="calc-ica">ICA (%)</label>
            <input id="calc-ica" type="number" min="0" step="0.01" inputmode="decimal" />
          </div>
          <div class="campo">
            <label for="calc-retencion">Retencion en la fuente (%)</label>
            <input id="calc-retencion" type="number" min="0" step="0.01" inputmode="decimal" />
          </div>
        </div>

        <div class="calc__acciones">
          <button id="calc-ejemplo" class="boton boton--primario" type="button">
            Cargar ejemplo real
          </button>
          <button id="calc-reset" class="boton boton--secundario" type="button">
            Restablecer
          </button>
        </div>
      </div>

      <div class="tarjeta calc__resultado">
        <h3 class="tarjeta__titulo">Desglose</h3>
        <div id="calc-desglose" class="desglose"></div>
      </div>
    </div>
  `;
}
