# Investigación: ¿el scraper anónimo captura precio socio o no-socio? (familia Mi Crf)

**Fecha:** 16/07/2026
**Alcance:** Carrefour. Descuentos "familia Mi Crf" (Doble Precio + "X% Off Mi Crf").
Análisis, **no implementación**.
**Disparador:** commit `a312901` dejó abierto si las filas con `discount_highlight`
"Doble Precio" / "Mi Crf" guardan en `price` el precio de socio (mejor) o el de
no-socio (peor). Bloquea el diseño de Fase B4.

---

## 1. Resumen ejecutivo

1. **`price` = precio de SOCIO (Mi Crf) en toda la familia — confirmado, no ambiguo.**
   En las 453 filas Mi Crf (228 "Doble Precio" + 225 "X% Off Mi Crf") vale el
   invariante `Price = PriceWithoutDiscount × (1 − N%)`, con `N` el porcentaje que
   nombra el `discount_highlight` (30/30 Doble Precio muestreados, ±0,5%; verificado
   también en los 7 niveles de % de Doble Precio y los 15 de Reg). El descuento Mi Crf
   está **aplicado a `Price`** (coherente con el descubrimiento #14b de CLAUDE.md:
   `DiscountHighLight` = descuento YA aplicado). No hay ningún campo por debajo de
   `Price`: es el tier más barato = el de socio.

2. **El precio de NO-socio existe en el payload, en un campo que TIRAMOS: `PriceWithoutDiscount`.**
   `extract.ts` guarda `Price` y `ListPrice` pero descarta `PriceWithoutDiscount`
   (el schema Zod ya lo parsea — `vtex-product.ts:31` — solo falta propagarlo). Ese
   campo es la base sobre la que se calcula el descuento Mi Crf, es decir el precio
   que paga quien NO tiene la tarjeta.

3. **`list_price` NO es el precio de socio, y como proxy de no-socio es MIXTO.**
   - En "X% Off Mi Crf" (Reg): `ListPrice == PriceWithoutDiscount` en 15/15 → ahí
     `list_price` **sí** coincide con el precio no-socio.
   - En "Doble Precio": ~83% (25/30) tiene `ListPrice == PriceWithoutDiscount`, pero
     ~17% (5/30) tiene `ListPrice > PriceWithoutDiscount` **inflado 12–54% por encima
     del precio no-socio**. En esas filas `list_price` sobreestima lo que paga el
     no-socio. Extrapolado a las 228 Doble Precio: ~38 filas con `list_price` inflado.

4. **Respuesta directa a la pregunta del brief:** `price` es **socio siempre**.
   `list_price` es **mixto** (= no-socio en la familia Reg y en la mayoría de Doble
   Precio; inflado por encima del no-socio en ~17% de Doble Precio). El verdadero
   precio no-socio vive en `PriceWithoutDiscount`, que no persistimos.

5. **Queda UNA pregunta que la API de catálogo no puede zanjar:** si el checkout
   ANÓNIMO online cobra `Price` (socio) o `PriceWithoutDiscount` (no-socio) para los
   Doble Precio de tres niveles. La evidencia previa (HALLAZGOS de `precios-descuento`,
   punto 8, sobre un producto **Reg**) mostró que VTEX entrega `Price` con descuento a
   cualquiera; si eso generaliza a Doble Precio, el anónimo online paga el precio de
   socio y `price` es fiel a lo que paga. **No verificado para Doble Precio en
   particular.** Zanjarlo requiere una simulación de checkout (endpoint nuevo →
   decisión de Juan, ver §5).

---

## 2. Metodología

Cuatro scripts en `scripts/`, todos read-only sobre la DB, fetch **anónimo** a VTEX
(mismo request que el scraper: sin cookies, sin login, User-Agent honesto). Ninguno
escribe en la DB. Los dumps quedan en `dumps/` (gitignored).

| # | Script | Qué hace |
|---|--------|----------|
| 00 | `00-distribution.ts` | Distribución de `discount_highlight` vigente en Carrefour |
| 01 | `01-sample-and-dump.ts` | Muestra dirigida (14 EANs, precio alto) + dump crudo del `commertialOffer` del seller default |
| 03 | `03-verify-pct-base.ts` | Sobre cada nivel de % distinto: ¿el N% sale de `PriceWithoutDiscount` o de `ListPrice`? |
| 04 | `04-impact.ts` | Conteo por sub-familia + tres-niveles vs dos-niveles en muestra de 30 Doble Precio |

**Selección de muestra.** Dirigida por `discount_highlight LIKE`, priorizando precio
alto para que la brecha sea visualmente inequívoca. Cobertura: los 7 niveles de % de
Doble Precio (4/8/13/15/16/17/26%) y los principales de Reg (15–40%).

**Por qué no hubo verificación visual del sitio.** El front de Carrefour es una SPA
VTEX IO: el precio se renderiza por JS y `WebFetch` (que convierte HTML estático a
markdown) devuelve la página sin precios. **Pero la API pública anónima que usamos ES
la misma fuente que consume el front para pintar el precio** — `commertialOffer.Price`,
`ListPrice`, `PriceWithoutDiscount` son exactamente los campos que el componente de
precio de VTEX lee. La verdad de campo del "qué muestra el sitio al anónimo" está en
esos campos, no en un scrap del DOM.

**Supuestos.** Seller `sellerDefault` (o `sellers[0]`), igual que producción.
`N%` parseado del texto del `discount_highlight`. Sin login, sin bypass, sin tocar el
scraper.

---

## 3. Tabla de comparación

Precios en pesos. `socio` = `Price` (lo que hoy guardamos en `price` y muestra Chango).
`no-socio` = `PriceWithoutDiscount` (no lo guardamos). `list` = `ListPrice` (= `list_price`).

| EAN | Producto | Familia | list (DB `list_price`) | no-socio (`PWD`, no guardado) | socio (`Price`, DB `price`) | N% | Estructura |
|---|---|---|---|---|---|---|---|
| 8006063002366 | Licor Amaretto Polini | Doble Precio | 26.990 | **19.990** | 18.390,80 | 8% | 3 niveles (list inflado) |
| 7791720043332 | Aceite oliva Carrefour lata 1L | Doble Precio | 32.150 | **19.990** | 18.390,80 | 8% | 3 niveles (list inflado) |
| 7793281492819 | Hamburguesa Carrefour Classic | Doble Precio | 21.390 | **17.890** | 16.458,80 | 8% | 3 niveles (list inflado) |
| 7798108345767 | (Doble Precio 26%) | Doble Precio | — | **PWD** | Price | 26% | 3 niveles (list +41,9% s/ price) |
| 7798108348997 | Aceite oliva Carrefour virgen | Doble Precio | 29.190 | 29.190 | 26.854,80 | 8% | 2 niveles (list = no-socio) |
| 7791720044797 | Café gourmet Carrefour | Doble Precio | 17.490 | 17.490 | 16.790,40 | 4% | 2 niveles |
| 7790070231864 | Aceite oliva Cocinero | Doble Precio | 13.650 | 13.650 | 12.558,00 | 8% | 2 niveles |
| 5000267116419 | Whisky JW Double Black 750 | X% Off Mi Crf | 90.269 | 90.269 | 67.701,75 | 25% | 2 niveles (list = no-socio) |
| 813497003047 | Whisky The Deacon 700 | X% Off Mi Crf | 72.000 | 72.000 | 54.000,00 | 25% | 2 niveles |
| 7501027232311 | Crema Revitalift L'Oréal | X% Off Mi Crf | 43.989 | 43.989 | 30.792,30 | 30% | 2 niveles |
| 7896009419294 | (testigo Fase previa) | X% Off Mi Crf | 6.300 | 6.300 | 4.725,00 | 25% | 2 niveles |

**Lectura de la tabla:** en TODAS las filas `socio = no-socio × (1 − N%)`. `list` es
`≥ no-socio`: iguala al no-socio en la familia Reg y en la mayoría de Doble Precio, y
lo supera (inflado) en un subconjunto de Doble Precio. En ninguna fila `list` es el
precio de socio.

---

## 4. Interpretación (las 4 preguntas del brief)

**¿`list_price` corresponde al precio no-socio en todos los casos?**
No en todos. Sí en "X% Off Mi Crf" (Reg): `ListPrice == PriceWithoutDiscount`, 15/15.
En "Doble Precio", sí en ~83% pero NO en ~17%, donde `ListPrice` está inflado 12–54%
por encima del precio no-socio real (`PriceWithoutDiscount`).

**¿`list_price` a veces corresponde al precio socio?**
Nunca. `list_price` siempre es `≥ no-socio > socio`. El precio de socio es `price`,
nunca `list_price`.

**¿Hay casos donde ninguno de los dos precios de la DB matchea con el sitio?**
El precio de socio (`price`) matchea siempre el `Price` que la API anónima sirve. El
que **no** está en la DB es el precio no-socio: vive en `PriceWithoutDiscount`, campo
que hoy descartamos. No es una anomalía, es un campo no capturado.

**¿El comportamiento difiere por tipo de descuento?**
Sí, en un punto: la relación `list ↔ no-socio`. En Reg, `list == no-socio`. En Doble
Precio, `list` a veces se infla sobre el no-socio (tres niveles). El comportamiento de
`price` (= socio) es idéntico en las dos familias.

---

## 5. Implicaciones prácticas

**Hay un sesgo real, acotado y caracterizado.** Chango muestra `price`, que es el
precio de **socio Mi Crf**. Un usuario sin la tarjeta paga `PriceWithoutDiscount`
(≥ `price`), que no guardamos. Afecta a **453 filas** (228 Doble Precio + 225 Reg). Es
exactamente el sesgo que la migración a `list_price` buscó evitar, activo en un campo
que ni siquiera capturamos.

**Matiz que decide si el sesgo también aplica ONLINE:** si el checkout anónimo online
cobra `Price` (socio) a cualquiera —como sugiere la evidencia previa sobre productos
Reg— entonces online no hay brecha y `price` es fiel a lo que paga un anónimo. Ese
matiz **no está verificado para Doble Precio de tres niveles**, que es justo donde la
brecha `no-socio` vs `socio` convive con un `list` inflado.

### Fix propuesto al scraper (NO implementar en esta sesión)

**Capturar `PriceWithoutDiscount`.** Es el precio no-socio y hoy se tira.

- El schema Zod ya lo valida: `src/schemas/vtex-product.ts:31`
  (`PriceWithoutDiscount: z.number().nullable().optional()`). No hay que tocar el schema.
- Falta: (a) propagarlo en `src/pipeline/extract.ts` (junto a `price`/`listPrice`,
  ~línea 94); (b) agregar una columna `price_without_discount NUMERIC(12,2)` a
  `price_history` vía migración nueva (no editar migraciones existentes — anti-pattern
  #8); (c) sumarlo a los "campos relevantes" del algoritmo de vigencias en
  `load.ts` para que un cambio del no-socio dispare fila nueva.
- Con eso, para cada fila Mi Crf tendríamos los tres números (list / no-socio / socio)
  y B4 podría decidir cuál mostrar sin re-scrapear.

Es un fix de bajo riesgo que **de-risca B4 sea cual sea** la respuesta a la pregunta
abierta del checkout: si guardamos el no-socio, después decidimos cómo presentarlo.

### Test definitivo pendiente de aprobación (NO ejecutado)

Para zanjar "¿qué paga el anónimo online en un Doble Precio de tres niveles?" haría
falta una **simulación de checkout anónima** (`/api/checkout/pub/orderForms/simulation`
u equivalente) sobre 2–3 SKUs Doble Precio. Es un endpoint que **no está en CLAUDE.md**;
por el anti-pattern #10 ("no inventar endpoints VTEX sin preguntar a Juan") **no se
ejecutó**. Se propone como paso siguiente si se quiere certeza antes de B4.

### Qué NO hay que hacer

No "corregir" `list_price` inflado ni pisar `price` con el no-socio. Regla de oro:
nunca modificar precios crudos scrapeados. El fix es **sumar** el campo no-socio, no
alterar los existentes.
