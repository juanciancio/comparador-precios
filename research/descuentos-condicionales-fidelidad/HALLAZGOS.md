# Hallazgos — Descuentos cantidad-condicionales y programas de fidelidad

**Fecha:** 2026-07-16
**Alcance:** investigación, no implementación. No se tocó schema, endpoints ni el
scraper de producción. Muestreo chico contra VTEX en vivo + queries de análisis
sobre la DB + navegación web anónima de los sitios de fidelidad.
**Retailers:** Masonline y Carrefour únicamente.

---

## 1. Resumen ejecutivo

1. **Los descuentos cantidad-condicionales ("2da al 50%", "2x1", "3x2") NO se
   reflejan en el `Price` del catálogo VTEX.** Se computan en el carrito según
   cantidad y dejan `Price = ListPrice`. Prueba empírica en ambas cadenas: el
   testigo leche La Serenísima (Masonline) está tagueado "2da al 50%" y tiene
   `price = list = 2809`; en Carrefour, de 1.245 productos con promo
   cantidad-condicional en `promo_description`, **1.176 (94,5%) tienen
   `price = list`**. Corolario: la premisa del Hallazgo A del prompt —"una parte
   grande de los 3.266 descuentos de Masonline son cantidad-condicionales"— es
   **muy probablemente incorrecta**. Esos 3.266 son descuentos **flat/regulares**
   (25/30/40/50% de campañas por categoría).

2. **Masonline SÍ nombra sus promos, pero en `productClusters`, no en
   `commertialOffer`.** El `commertialOffer` viene totalmente vacío para Masonline
   (Teasers, PromotionTeasers y DiscountHighLight = `[]` en 30/30 ofertas — se
   confirma CLAUDE.md). En cambio `productClusters` (a nivel producto, un campo que
   hoy **no capturamos**) lista nombres de promo como "2do al 50%- Lácteos",
   "Juguetes 2x1- OP", "Muebles 50%- OP". **Pero son inusables como señal
   per-producto:** 14–44 clusters por producto, muchos stale (campañas de 2024),
   algunos casi universales. No hay campo que diga "este `Price` viene de la promo X".

3. **MasClub es parcialmente visible al scraper anónimo — contradice el supuesto
   del Hallazgo B.** El programa aparece nominalmente en `productClusters`
   ("Mas Club Lunes 15%" en 66/76 productos muestreados, más "Excluidos Mas Club
   Lunes", "Liquidaciones - Mas Club"). Lo que **no** es visible es el *precio de
   socio*: el `Price` scrapeado nunca incluye el 15% MasClub (el testigo leche está
   en el cluster MasClub y su `price = list`). Es decir: la **existencia** del
   programa se filtra, el **descuento** no. `list_price` de Masonline sigue siendo
   honesto respecto de MasClub.

4. **Asimetría entre cadenas (la que importa para B4):** Carrefour expone sus
   promos —incluidas las cantidad-condicionales y Mi Crf— en `commertialOffer` de
   forma legible por máquina (`promo_description` = "2do al 70% Max 24 Combinable";
   `discount_highlight` = "PROMO-Mi CRF ... 8% Doble Precio", 453 filas). Masonline
   solo las tiene en clusters ruidosos. Cualquier feature que muestre "por qué está
   este precio" o "condición de la promo" tiene datos de calidad para Carrefour y
   datos pobres/ausentes para Masonline.

---

## 2. Metodología

Todo el análisis vive en `research/descuentos-condicionales-fidelidad/scripts/`.
Los dumps crudos de VTEX (~1,7 MB) están gitignoreados en `dumps/`.

| # | Script | Qué hace |
|---|--------|----------|
| 01 | `01-discount-coverage.ts` | Cuenta descuentos vigentes por retailer y la distribución del ratio `price/list` en Masonline. Solo lectura DB. |
| 02 | `02-dump-raw-masonline.ts` | Dumpea el JSON VTEX **completo** (sin Zod) de 17 productos de Masonline elegidos por bucket de ratio + 4 testigos. |
| 03 | `03-analyze-masonline-dump.ts` | Enumera claves de `commertialOffer`, imprime promo-fields por producto y busca recursivamente rastros de condición de cantidad / fidelidad. |
| 04 | `04-cluster-correlation.ts` | Scrapea ~76 productos de Masonline por bucket de ratio, extrae `productClusters` y mide correlación ratio↔tipo-de-cluster. |
| 05 | `05-dump-raw-carrefour.ts` | Dumpea 14 productos de Carrefour con `discount_highlight`/`promo_description` para confirmar el fix de Teasers y la metadata Mi Crf. |

**Muestreo:** deliberadamente representativo, no aleatorio. Para el punto 1 se
eligieron productos por bucket de ratio (0.50, 0.60, 0.65, 0.70, 0.75, 0.80, 0.90,
1.00) porque el ratio es la única señal que teníamos a priori sobre el mecanismo.
Testigos conocidos: leche/manteca/crema La Serenísima (el prompt citó "2da al 50%"
en leche).

**Web:** navegación anónima de `masonline.com.ar/masclub`, `masclub.com.ar`,
`micarrefour.com.ar/preguntas-frecuentes` + búsqueda web. Sin login, sin captcha,
sin bot detection observado.

**Supuestos:** (a) el ratio `price/list` es proxy del descuento efectivo baked-in;
(b) un producto con `price = list` no tiene descuento aplicado al precio unitario;
(c) la arquitectura de promociones de VTEX (unit-price vs cart-computed) es la misma
para ambos retailers. (c) queda confirmado empíricamente por los datos de Carrefour.

---

## 3. Hallazgos por pregunta

### Pregunta 1 — Descuentos "Llevando N" en Masonline

**Cobertura de descuentos (filas vigentes, disponibles, `price>0`):**

| Retailer | Total | Con descuento (`list>price`) | `promo_description` | `discount_highlight` |
|----------|-------|------------------------------|---------------------|----------------------|
| masonline | 12.307 | **3.266 (26,5%)** | **0** | **0** |
| carrefour | 26.201 | 11.845 (45,2%) | 1.693 | 2.984 |

(El prompt hablaba de 3.327; hoy son 3.266 — drift normal del catálogo. Mismo orden.)

**Lo que expone VTEX (Masonline).** El `commertialOffer` de Masonline no trae NADA
de metadata de promo. Sobre 30 ofertas muestreadas:

```
Teasers            present=30  nonEmpty=0
PromotionTeasers   present=30  nonEmpty=0
DiscountHighLight  present=30  nonEmpty=0
RewardValue        present=30  nonEmpty=0   (todo 0)
```

`Installments` viene poblado pero es cuotas, no descuento. No hay campo de condición
de cantidad en el offer.

**El canal oculto: `productClusters`.** Fuera del `commertialOffer`, a nivel
producto, VTEX sí lista nombres de promo. Ejemplos reales (testigo leche
`7790742363008` y otros):

```
"2do al 50%- Lácteos"              "3x2 Leches y Capsulas- OP"
"2x1 y 3x2- OP"                    "Super - TODO 2da al 50%"
"Juguetes 2x1- OP"                 "Muebles 50%- OP"
"Maraton - Todo 25%"              "40% - HOTSALE (GM)"
"Mas Club Lunes 15%"              "Liquidaciones - Mas Club"
```

**Por qué los clusters NO resuelven la pregunta:** son promiscuos e inatribuibles.

- **14 a 44 clusters por producto** (promedio por bucket de ratio: 15–44).
- Muchos **stale**: p.ej. `"20240301 a 20240310 Changazo Super - 2da al 80%"`
  (marzo 2024) sigue colgado de un producto en 2026.
- Casi universales: `"Mas Club Lunes 15%"` aparece en ~87% de los productos.
- Solo **17/70** productos con descuento tienen un cluster flat-% cuyo número
  matchea (±2pp) el descuento baked-in. El ratio no se deja atribuir a un cluster.

**El hallazgo central — las cantidad-condicionales NO están en `Price`.** Testigo
`7790742363008` (Leche Entera La Serenísima 1L):

```
DB:   price = 2809.00   list_price = 2809.00   (ratio 1.000, sin descuento)
VTEX: Price = 2809      ListPrice = 2809
Clusters: "2do al 50%- Lácteos", "3x2 Leches...", "Super - TODO 2da al 50%"
```

El "2da al 50%" que el sitio muestra (precio $2.106,75) **no está en el `Price` del
catálogo** — es el precio promedio de 2 unidades que el frontend de Masonline
calcula y exhibe como marketing. Nuestro scrape captura correctamente $2.809, que es
lo que paga quien compra **1 unidad**.

> ⚠️ **Corrección a la premisa del prompt.** El Hallazgo A afirmaba "Precio scrapeado
> como price: $2.106,75" para la leche. Empíricamente, ese EAN tiene `price = 2809`
> en nuestra DB — ninguna variante de Leche La Serenísima 1L está a 2.106,75. El
> $2.106,75 es display del sitio, no dato scrapeado. Nuestro `price` es honesto: es
> el precio unitario (comprar 1).

**Confirmación cruzada en Carrefour (donde SÍ hay metadata legible).** De 1.245
productos con promo cantidad-condicional en `promo_description`:

```
total = 1245   baked_in (list>price) = 69   price = list = 1176 (94,5%)
```

O sea: en Carrefour también, las promos "2do al 70%", "3x2", etc. dejan
`price = list` en el 94,5% de los casos. **Regla arquitectónica confirmada en ambas
cadenas: las promos por cantidad se computan en carrito, no se bakean en el precio
unitario del catálogo.**

**Distribución del ratio `price/list` en Masonline (los 3.266 con descuento):**

| ratio exacto | n | interpretación |
|--------------|-----|----------------|
| 0.750 | 699 | 25% off flat |
| 0.500 | 463 | 50% off flat |
| 0.600 | 460 | 40% off flat |
| 0.700 | 451 | 30% off flat |
| 0.650 | 283 | 35% off flat |
| 0.550 | 250 | 45% off flat |
| 0.800 | 173 | 20% off flat |

La concentración en ratios redondos es exactamente lo esperable de descuentos
**flat de porcentaje redondo** (campañas por categoría: "Maraton Todo 25%",
"Muebles 50%", "HOTSALE 40%", "Liquidaciones"). El testigo manteca La Serenísima
(ratio 0.750) está en el cluster "Maraton - Todo 25%": es un 25% flat, no un
"2da al 50%".

**Respuesta a "¿el price es el unitario efectivo bajo la condición?":** **No.** El
`price` scrapeado es el precio de comprar **1 unidad**. No promedia la condición
"2da al 50%". Para productos solo-cantidad-condicional, `price = list`.

**Síntesis Pregunta 1:**
- % de los 3.266 que son cantidad-condicionales: **≈0% de forma baked-in.** Las
  cantidad-condicionales no mueven el `Price`; están casi todas fuera de esos 3.266.
- Los 3.266 son **descuentos flat/regulares** de campañas por categoría.
- Campo VTEX que contiene la condición: **ninguno confiable** en Masonline (offer
  vacío; clusters ruidosos e inatribuibles). En Carrefour: `promo_description`.

---

### Pregunta 2 — MasClub (fidelidad Masonline)

**Datos factuales del sitio (navegación anónima, sin login):**

- **Nombre exacto:** *MasClub* (estilizado "MâsClub"). Club de beneficios de
  ChangoMás y MasOnline (mismo grupo, GDN).
- **Acceso:** **gratuito**, registro online en `masclub.com.ar`. Se usa presentando
  **DNI en la línea de cajas** (físico) o asociado a la cuenta (online). No requiere
  tarjeta física ni pago.
- **Beneficio central:** **15% de descuento SIN TOPE** en la compra, ciertos días de
  la semana. ⚠️ *El día exacto varía por fuente y período*: el sitio `masclub.com.ar`
  al 16/07/2026 anuncia "15% todos los **miércoles y jueves** de julio"; búsquedas
  recientes citan "**lunes y jueves** sin tope"; el cluster VTEX se llama "Mas Club
  Lunes **15%**". Consistente: **15%, algunos días fijos por semana, sin tope de
  reintegro.** El día puntual es rotativo/campaña, no lo tomes como fijo.
- **Puntos:** 1 punto por cada $100 gastados, canjeables por cupones; expiran a los
  4 meses sin compras. (Secundario al 15%.)
- **Otros beneficios:** descuentos en gastronomía, entretenimiento, farmacias y
  autocenters de la red; promos exclusivas en sucursales.
- **Alcance/aplicación:** **tienda física y e-commerce** (MasOnline). "Toda la
  compra" con exclusiones vía cluster "Excluidos Mas Club Lunes" (ej.: la impresora
  Epson del muestreo estaba excluida).
- **Letra chica no verificable sin login:** el detalle de exclusiones por categoría
  y el tope real por medio de pago combinado no se pueden confirmar sin cuenta.

**Confirmación empírica de visibilidad al scraper (revisión de dumps):**

> ⚠️ **Contradice el supuesto del Hallazgo B.** MasClub **SÍ aparece** en la
> metadata VTEX anónima, pero solo como **nombre de cluster**, no como precio.

| Aspecto | ¿Visible al scraper anónimo? |
|---------|------------------------------|
| Existencia del programa (nombre) | **Sí** — clusters "Mas Club Lunes 15%" (66/76 productos), "MAS CLUB 2 - EVENTOS", "Liquidaciones - Mas Club", "Excluidos Mas Club Lunes" |
| Precio de socio (15% aplicado) | **No** — el `Price` nunca incluye el 15%. Testigo leche: en cluster MasClub y `price = list = 2809` |
| Campo `commertialOffer` con "member price" | **No** — cero campos que discriminen socio/no-socio |

Campos revisados sin rastro de precio de socio: `Price`, `ListPrice`,
`PriceWithoutDiscount`, `FullSellingPrice`, `Teasers`, `DiscountHighLight`,
`RewardValue`, `PriceValidUntil`. La conclusión práctica del prompt se sostiene:
**`list_price` de Masonline es honesto respecto de MasClub** (no está contaminado
con el precio de socio). Lo único que cambia es que la *existencia* del programa es
detectable vía clusters, si algún día se quisiera.

---

### Pregunta 3 — Mi Carrefour / Mi Crf (fidelidad Carrefour)

**Datos factuales del sitio (navegación anónima):**

- **Nombre exacto:** *Mi Carrefour*. En la metadata VTEX aparece como **"Mi Crf"** /
  **"Mi CRF"**.
- **Acceso:** **gratuito** el nivel base (*Mi Carrefour Clásico*, funciona solo con
  DNI). Registro en `micarrefour.com.ar`, activo a las 24 hs. Mayores de 16 años,
  documento argentino. Hay **3 niveles**: Clásico (gratis) → Prepaga → Crédito
  (tarjetas del banco Carrefour, descuentos progresivos).
- **Mecánica del descuento:** **etiqueta de doble precio** en góndola (uno para
  socios, otro para no-socios). Se identifica con **N° de DNI en caja** y el
  beneficio se aplica automáticamente, reflejado en el ticket.
- **Aplicación:** **todos los días**, en Carrefour, Carrefour Express y compra
  online (a diferencia del "día fijo" de MasClub).
- **Porcentajes:** **varían por producto**, no es un % único. En la metadata VTEX
  vimos "Mi CRF 8% Doble Precio", "25% Off Mi Crf", "35% Off Mi Crf". Sobre productos
  seleccionados, no todo el catálogo.
- **Letra chica no verificable sin login:** tope máximo global y lista completa de
  exclusiones no confirmables sin cuenta.

**Confirmación de visibilidad al scraper (el fix de Teasers sigue vigente):**

El `discount_highlight` de Carrefour sigue poblándose correctamente post-fix.
Muestras reales:

```
495  PROMO-10% Off -Reg-1-10-AsLibros
398  PROMO-30% Off -Reg-1-30-AsByT
195  PROMO-25% Off Max 8 unidades -Reg-1-25-As14 al 20.7
179  PROMO-Mi CRF -mfl-1-8-Dto de 8% Doble Precio   ← Mi Crf
 93  PROMO-25% Off Mi Crf Max 8 unidades ...        ← Mi Crf
 30  PROMO-25% Off Mi Crf -Reg-1-25-As14 al 20.7    ← Mi Crf
```

**453 filas vigentes** de Carrefour mencionan "Mi Crf" en `discount_highlight`. Y
`promo_description` (Teasers) captura las cantidad-condicionales legibles:
"2do al 70% Max 24 Combinable", "3x2 Max 24 Combinable", "2do al 50% ... SEDAL".

**Diferencia clave MasClub vs Mi Crf para nuestra data:**

| | MasClub (Masonline) | Mi Crf (Carrefour) |
|--|---------------------|--------------------|
| Visibilidad en metadata VTEX | Solo nombre, en `productClusters` (ruidoso) | Nombre + %, en `discount_highlight` (legible, 453 filas) |
| ¿Precio de socio en `Price`? | **No** (honesto) | **Parcial** — el "Mi Crf 8% Doble Precio" nombra el precio socio; hay que verificar si el `Price` scrapeado ya es el de socio o el de no-socio |
| Día/alcance | Días fijos por semana, 15% sin tope | Todos los días, % variable por producto |

> ⚠️ **Señal para B4, no resuelta acá:** en Carrefour "Doble Precio" implica que
> existe precio socio y no-socio. Queda **abierto** verificar cuál de los dos captura
> nuestro `Price` (Pregunta fuera del scope de esta sesión). Para Masonline no hay
> ambigüedad: capturamos siempre el no-socio.

---

## 4. Riesgos y sesgos del análisis

- **Muestra chica y dirigida.** 17 + 76 + 14 productos, elegidos por bucket de ratio
  y testigos conocidos, no aleatorios. La distribución de ratios (3.266 productos)
  sí es poblacional; la interpretación mecánica se apoya en pocos testigos + la regla
  arquitectónica confirmada en Carrefour.
- **La atribución "ratio → tipo de promo" es inferencia, no lectura directa.** Un
  ratio 0.75 es consistente tanto con "25% flat" como con un "2da al 50%" baked-in.
  El peso de la evidencia (offer vacío, clusters "Maraton 25%", testigo leche con
  price=list, 94,5% de Carrefour con price=list) apunta a flat, pero no podemos
  etiquetar producto-por-producto con certeza. **No sabemos con certeza** qué
  fracción exacta de los 3.266 podría ser una cantidad-condicional excepcionalmente
  baked-in.
- **Clusters como fuente:** son marketing tags acumulativos, con entradas de 2024
  todavía colgadas. Cualquier uso futuro de clusters debe asumir ruido alto y
  contaminación temporal. No representan "promo activa hoy".
- **Fidelidad sin login:** días exactos, topes por medio de pago y exclusiones
  completas de MasClub y Mi Crf **no son verificables sin cuenta**. Los porcentajes
  y días citados son los publicados en el sitio anónimo al 16/07/2026 y pueden rotar
  por campaña.
- **Mi Crf "Doble Precio":** no verificamos en esta sesión si el `Price` de Carrefour
  para esos productos es el de socio o el de no-socio. Es una ambigüedad real de la
  data cruda, no resuelta.

---

## 5. Implicaciones para Fase B4

- **No prometer distinguir "Llevando N" en Masonline a partir de nuestra data.** El
  `price` de Masonline es el precio de comprar 1; las promos por cantidad no están en
  la DB (dejan `price = list` y solo se nombran en clusters ruidosos). Si B4 quiere
  mostrar "2da al 50%" para Masonline, necesita **otra fuente** (los `productClusters`
  con fuerte filtrado de stale, o el endpoint de intelligent-search del sitio) — es
  captura nueva, no está hoy.
- **Los 3.266 "descuentos" de Masonline son flat.** Comunicarlos como "X% off" es
  correcto; comunicarlos como "precio con 2da unidad" sería incorrecto.
- **Asimetría de calidad de metadata:** para Carrefour hay condición legible
  (`promo_description`, `discount_highlight` con Mi Crf); para Masonline no. Cualquier
  UI que explique "por qué este precio" tendrá cobertura desigual entre cadenas. B4
  debe decidir si muestra la condición solo cuando existe (Carrefour) o unifica a un
  mensaje genérico.
- **Fidelidad:** MasClub (15%, días fijos, DNI, no baked en price) y Mi Crf (%
  variable, todos los días, DNI, doble precio) son **estructuralmente distintos**.
  Un badge unificado "hay beneficio de socio" es defendible; equipararlos numéricamente
  no. Nuestro `list_price`/`price` es precio **no-socio** en Masonline (confirmado);
  en Carrefour queda por confirmar si es socio o no-socio (crítico si B4 compara
  precios entre cadenas — un lado podría estar mostrando precio socio y el otro no).
- **Dato crítico a resolver antes de comparar precios cross-retailer en B4:** ¿el
  `Price` de Carrefour para productos "Mi Crf Doble Precio" es socio o no-socio? Si es
  socio, la comparación con Masonline (no-socio) tiene un sesgo sistemático a favor de
  Carrefour.
