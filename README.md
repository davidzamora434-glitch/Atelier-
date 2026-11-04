# Consola Atelier

Aplicacion web (SPA) en espanol para un negocio de impresion 3D (marca
**Atelier**). Esta hecha con JavaScript vanilla (modulos ES), HTML y CSS,
**sin dependencias externas ni paso de build**, porque el entorno no tiene
acceso a la red de npm ni a CDNs. Todo corre directamente en el navegador y los
datos se guardan en el `localStorage` del propio equipo.

## Que es

Consola Atelier es una consola de apoyo para decidir **que imprimir y a que
precio**. Reune en un solo lugar dos tareas del dia a dia: calcular cuanto
cuesta de verdad producir una pieza (y cuanto queda despues de Mercado Libre) y
decidir si vale la pena agregar un producto nuevo al catalogo.

## Modulos

1. **Calculadora de costos y precio**: calcula el costo real de produccion
   (filamento en gramos, energia, desgaste de la maquina y desperdicio
   multicolor en la Bambu Lab A1) y la ganancia neta tras el desglose de
   Mercado Libre (comision, ICA, retencion en la fuente y envio). Reproduce el
   ejemplo real del usuario: una publicacion de 24.900 COP deja un neto de
   ~11.593 COP.

2. **Validador de productos ("vale la pena?")**: registra un producto candidato
   (demanda, competencia, margen %, potencial de contenido para redes y origen
   del modelo), calcula un **puntaje** y entrega una de tres recomendaciones
   exactas: **Vender ya**, **Solo si lo personalizas** o **Descartar**. Los
   productos se guardan y se listan ordenados por puntaje (de mayor a menor)
   para compararlos de un vistazo, con un distintivo de color por
   recomendacion. Cada producto se puede eliminar. El margen % se puede traer
   automaticamente desde el ultimo calculo de la Calculadora.

3. **Factibilidad de video/producto**: ayuda a decidir si vale la pena hacer
   un video o un producto a partir de una **tendencia de cultura pop** (lo que
   esta de moda en redes, series, juegos o memes), para no gastar tiempo e
   impresiones en algo que no va a funcionar. Evalua seis campos: **nivel de
   tendencia** (que tan caliente esta), **potencial de video/Reel**, **esfuerzo
   de produccion**, **margen o rentabilidad** (en %, opcional), **riesgo legal
   por derechos de autor** y **ventana de oportunidad** (cuanto le queda de
   vida a la tendencia). El **riesgo legal alto penaliza fuerte** el puntaje,
   porque copiar marcas registradas puede traer baneos o problemas legales. Con
   esos campos calcula un **puntaje** y entrega una de tres recomendaciones
   exactas: **Hazlo ya**, **Hazlo pero cuida los detalles** o **No vale la
   pena**. Las ideas evaluadas se **guardan** y se **listan ordenadas por
   puntaje** (de mayor a menor) con opcion de **eliminar** cada una. El margen %
   se puede traer del ultimo calculo de la Calculadora.

   Este modulo incluye una seccion **"Fuentes de tendencias"** con enlaces
   reales a sitios donde mirar que esta en tendencia (**MakerWorld**,
   **Printables**, **Thingiverse**, **Cults3D**, **TikTok**, **Google Trends** y
   **Pinterest**). El usuario los visita **MANUALMENTE**: la app no raspa ni
   hace peticiones de red a esos sitios, solo son enlaces informativos que se
   abren en otra pestana. Ademas muestra una **advertencia de derechos de
   autor**: vender figuras de personajes de marcas registradas (Pokemon,
   Marvel, Disney, etc.) puede traer problemas; lo mas seguro es inspirarse en
   el estilo sin copiar el personaje exacto o usar disenos originales.

4. **Fondo de proyectos**: un motivador visual para financiar tus proyectos
   personales (como un **poliformer** y un **mini robot**) apartando una parte
   de las ganancias de las ventas. Creas **metas** con un nombre, un
   **objetivo en COP opcional** (una meta puede existir **sin objetivo** y aun
   asi registrar aportes) y una nota opcional. En cada meta registras
   **aportes** con monto, fecha (por defecto hoy) y una nota (por ejemplo
   "Venta de 3 organizadores"). El modulo suma lo acumulado y, cuando la meta
   tiene objetivo, muestra una **barra de progreso en el naranja de la marca**
   con el porcentaje y cuanto te falta, o la marca como **"Meta superada"**
   cuando ya la cumpliste. Si la meta no tiene objetivo, muestra solo el total
   acumulado con el texto "Aun sin meta definida". En la primera carga se
   siembran dos metas de ejemplo (**Poliformer** y **Mini robot**) sin objetivo,
   que puedes editar o eliminar. Todo se guarda en este navegador bajo la clave
   `atelier:fondo`.

## Como ejecutar la aplicacion

No necesita instalacion. Basta con servir la carpeta del proyecto con cualquier
servidor estatico. La forma mas simple, con Python 3 ya instalado:

```bash
python3 -m http.server 8080
```

Luego abre http://localhost:8080 en el navegador.

Alternativa con Node (si tienes acceso a la red de npm):

```bash
npx serve .
```

Tambien sirve cualquier otro servidor estatico apuntando a la raiz del
proyecto (donde esta `index.html`). No abras `index.html` con doble clic
(`file://`): los modulos ES necesitan servirse por HTTP.

## Como ejecutar las pruebas

```bash
node --test 'tests/*.test.js'
```

> Nota: en Node 22 la forma `node --test tests/` interpreta `tests/` como una
> ruta de modulo en lugar de un directorio de pruebas. Usa el patron con
> comillas `'tests/*.test.js'`.

### Validar la sintaxis de todos los archivos JS

```bash
for f in $(find src tests -name '*.js'); do node --check "$f" || echo FAIL $f; done
```

## Identidad de marca

- **Nombre**: Atelier (consola interna "Consola Atelier").
- **Lema**: Diseno e impresion 3D.
- **Color principal**: naranja `#F08020` sobre gris oscuro `#2E2E2E` / `#333`.
- **Distintivos** de recomendacion: verde (Vender ya), amarillo (Solo si lo
  personalizas) y rojo (Descartar).
- **Idioma**: todo en espanol.

## Busqueda de tendencias: por que es MANUAL

La busqueda de tendencias contra Mercado Libre, MakerWorld u otros sitios **no
esta automatizada**. Esos sitios bloquean el acceso programatico (responden con
HTTP 403 a peticiones automaticas), asi que un scraper no es viable ni
confiable. Por eso el enfoque es **MANUAL**: el modulo de **Factibilidad de
video/producto** incluye una seccion "Fuentes de tendencias" con enlaces reales
que el usuario abre a mano para explorar, y un formulario donde registra y
puntua las ideas que ve con potencial. La app nunca raspa ni hace peticiones de
red a esos sitios.

## Proximamente (modulos futuros)

Estos modulos estan reconocidos en la interfaz (seccion "Proximamente" dentro
del Validador) y se enchufan siguiendo la misma arquitectura (modulo puro en
`lib/`, vista en `ui/`, constantes en `config.js`):

- **Biblioteca de filamentos y proveedores**: ampliar `FILAMENTOS` en
  `src/js/lib/config.js` + `src/js/lib/proveedores.js` +
  `src/js/ui/proveedores.js`.

## Estructura de carpetas

```
index.html              Shell de la SPA (carga src/js/app.js como modulo)
assets/logo.svg         Marca (silueta de gato naranja), autocontenida
src/css/styles.css      Tema de marca (naranja #F08020, gris oscuro), responsivo
src/js/app.js           Navegacion por pestanas + montaje de vistas
src/js/lib/config.js    Constantes de dominio (maquinas, filamentos, tarifas ML)
src/js/lib/costs.js     Logica PURA de costos y ganancia neta en Mercado Libre
src/js/lib/validator.js Logica PURA de puntuacion de productos
src/js/lib/factibilidad.js Logica PURA de puntuacion de factibilidad
src/js/lib/fondo.js     Logica PURA del fondo (aportes, meta, progreso)
src/js/lib/storage.js   Envoltura de localStorage con fallback en memoria
src/js/ui/calculator.js Interfaz del MODULO 1 (Calculadora)
src/js/ui/validator.js  Interfaz del MODULO 2 (Validador) + seccion Proximamente
src/js/ui/factibilidad.js Interfaz del MODULO 3 (Factibilidad)
src/js/ui/fondo.js      Interfaz del MODULO 4 (Fondo de proyectos)
tests/*.test.js         Pruebas con node:test
```

## Datos de dominio

- **Maquinas**: Creality Ender-3 V3 SE (1.500.000 COP, 120 W, 1 color) y
  Bambu Lab A1 Combo con AMS (3.000.000 COP, 120 W, hasta 4 colores).
- **Vida util** por defecto: 2500 horas (editable) para amortizacion.
- **Energia**: 730 COP por kWh.
- **Filamento PLA**: 80.000 COP/kg por defecto (rango 75.000 a 90.000). La
  entrada se hace en gramos. Otros filamentos (PETG, TPU) quedan como
  placeholders para mas adelante.
- **Mercado Libre**: comision 19%, ICA 0.41%, retencion en la fuente 1.5%,
  envio gratis 8.100 COP, % cubierto por ML 0% por defecto (editable).

### Ejemplo real confirmado

Publicacion de **24.900 COP**: comision 4.731, ICA ~102,09, retencion 373,5,
impuestos ~475,59, envio 8.100 (0% cubierto) y **neto ~11.593,41 COP**. Las
pruebas lo verifican con tolerancia de +-1,5 COP.
