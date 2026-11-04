// app.js
// Punto de entrada de la SPA: configura la navegacion por pestanas entre las
// dos vistas (#view-calculadora y #view-validador). Para FEAT-001 renderiza
// placeholders; FEAT-002 y FEAT-003 montaran las interfaces reales mediante
// importaciones dinamicas de src/js/ui/.

const VISTAS = {
  calculadora: {
    mount: "#view-calculadora",
    modulo: "./ui/calculator.js",
    placeholder:
      "Aqui ira la Calculadora de costos y precio. Disponible proximamente.",
  },
  validador: {
    mount: "#view-validador",
    modulo: "./ui/validator.js",
    placeholder: "Aqui ira el Validador de productos. Disponible proximamente.",
  },
  factibilidad: {
    mount: "#view-factibilidad",
    modulo: "./ui/factibilidad.js",
    placeholder:
      "Aqui ira la Factibilidad de video o producto. Disponible proximamente.",
  },
};

const tabs = Array.from(document.querySelectorAll(".nav__tab"));

function renderPlaceholder(contenedor, texto) {
  contenedor.innerHTML = "";
  const card = document.createElement("div");
  card.className = "tarjeta";
  const p = document.createElement("p");
  p.className = "placeholder";
  p.textContent = texto;
  card.appendChild(p);
  contenedor.appendChild(card);
}

// Intenta montar el modulo de UI; si aun no existe (FEAT-002/003), muestra el
// placeholder sin romper la consola.
async function montarVista(nombre) {
  const info = VISTAS[nombre];
  if (!info) return;
  const contenedor = document.querySelector(info.mount);
  if (!contenedor) return;
  if (contenedor.dataset.montado === "si") return;

  try {
    const mod = await import(info.modulo);
    if (mod && typeof mod.montar === "function") {
      mod.montar(contenedor);
      contenedor.dataset.montado = "si";
      return;
    }
    renderPlaceholder(contenedor, info.placeholder);
  } catch (_e) {
    // El modulo de UI todavia no esta implementado: placeholder amistoso.
    renderPlaceholder(contenedor, info.placeholder);
  }
}

function activarVista(nombre) {
  for (const tab of tabs) {
    const activa = tab.dataset.vista === nombre;
    if (activa) tab.setAttribute("aria-current", "page");
    else tab.removeAttribute("aria-current");
  }
  for (const [clave, info] of Object.entries(VISTAS)) {
    const seccion = document.querySelector(info.mount);
    if (!seccion) continue;
    seccion.hidden = clave !== nombre;
  }
  montarVista(nombre);
}

for (const tab of tabs) {
  tab.addEventListener("click", () => activarVista(tab.dataset.vista));
}

// Vista inicial.
activarVista("calculadora");
