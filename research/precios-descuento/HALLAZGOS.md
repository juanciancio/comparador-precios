# Investigación: precios de lista y descuentos condicionales

**Fecha:** 15/07/2026
**Alcance:** Carrefour y Masonline (ambos VTEX). Análisis, no implementación.
**Disparador:** EAN `7896009419294` — Chango muestra $4.725; la web de Carrefour muestra $6.300 de lista y $4.725 con "Mi Crf".

---

## 1. Resumen ejecutivo

1. **`list_price` YA está en la DB y 100% poblado en ambos retailers.** No hubo que
   instrumentar nada para la pregunta 2: `extract.ts:90` ya guarda `ListPrice`. El
   dato para medir la brecha estaba disponible desde el día uno; nunca se usó.
2. **La brecha es sistémica, no de nicho.** Carrefour: **44,7%** de los productos
   vigentes (11.958/26.756) tienen `list_price > price`. Masonline: **20,1%**
   (2.518/12.510). El precio que Chango muestra es el efectivo con descuento
   aplicado; el de lista se guarda pero no se muestra.
3. **Pero "descuento" ≠ "condicional".** La mayoría de los descuentos NO están
   gated por fidelidad. En la muestra, solo **10,2%** de los descuentos de
   Carrefour traen metadata que nombra una tarjeta/fidelidad ("Mi Crf"). El caso
   testigo es real pero **no es el patrón dominante**.
4. **VTEX sí nombra la condición, en un campo que no capturamos: `DiscountHighLight`.**
   Para el testigo dice `"PROMO-25% Off Mi Crf -Reg-1-25-As14 al 20.7"` — nombra el
   descuento, la condición (Mi Crf) y la vigencia (14 al 20/7). Está en el response
   y lo tiramos.
5. **Bug confirmado: `promo_description` es NULL en las 47.358 filas de la tabla**,
   incluidas las **20.480** con `has_promo = true`. VTEX serializa los `Teasers` con
   backing fields de C# (`<Name>k__BackingField`), no `Name`; el schema Zod busca
   `Name`, no matchea nunca y el nombre se pierde. Verificado corriendo el `extract`
   de producción contra el payload crudo (script 07).
6. **`has_promo` significa casi lo contrario de lo que parece.** En Carrefour,
   12.450 filas tienen `has_promo = true` **y ningún descuento aplicado**: el teaser
   dominante es `"Tarjeta Carrefour 15%"` (508 de 609 SKUs muestreados), un descuento
   de tarjeta que **no** está en `Price`. `has_promo=true` hoy suele significar
   "existe un descuento que NO estás viendo en el precio".
7. **Masonline no expone metadata de promo: cero `Teasers`, cero `DiscountHighLight`.**
   Sus descuentos (20,1% del catálogo) son "pelados": `list > price` sin ninguna
   explicación. Para Masonline, saber si un descuento es condicional es **imposible**
   con los endpoints actuales.
8. **El scraper anónimo recibe el precio con descuento.** El response no cambia por
   User-Agent ni sales channel (`sc=1/3` idénticos). VTEX entrega `Price=4725` a
   cualquiera; es la **web** la que lo presenta como condicional. La comparación no
   está "rota" por un error de scraping: refleja fielmente lo que la API publica.

**Gravedad:** alta en cuanto a exactitud de la propuesta de valor, pero el problema
real es **más chico y más matizado** que "44% del catálogo miente". La cifra
accionable es: ~10% de los descuentos de Carrefour son demostrablemente
condicionales, ~39% son indeterminables por falta de metadata, y en Masonline el
100% es indeterminable.

---

## 2. Metodología

Cinco scripts en `scripts/`, todos reproducibles. Ninguno escribe en la DB.

| # | Script | Responde | Método |
|---|--------|----------|--------|
| 01 | `01-listprice-coverage.ts` | P2 | SQL sobre filas vigentes (`valid_to IS NULL`) |
| 02 | `02-dump-raw-vtex.ts` | P1, P4, P5 | Dump crudo por EAN, sin Zod. 25 EANs Carrefour + 17 Masonline |
| 03 | `03-analyze-dumps.ts` | P1, P4, P5 | Desenrolla backing fields de C# y cataloga campos |
| 04 | `04-discount-metadata-prevalence.ts` | P4 (escala) | 6 departamentos × 2 páginas × 50 por retailer |
| 05 | `05-discount-stability.ts` | P3 | Historial de `price_history` |
| 06 | `06-validuntil-and-headers.ts` | P1, P4 | `PriceValidUntil` + sondeo de headers/sales-channel |
| 07 | `07-verify-teaser-bug.ts` | P1 | Corre el `extract` **de producción** sobre el payload crudo |

**Muestras.** Script 02: 25 EANs Carrefour / 17 Masonline, elegidos de la DB por
bucket (con descuento, sin descuento, con `has_promo`). Script 04: 609 SKUs
Carrefour y 485 Masonline, de 6 departamentos top-level con catálogo real.

**Supuestos y decisiones.**
- Se usó el seller `sellerDefault` (o `sellers[0]`), igual que producción.
- `disc_pct = (ListPrice - Price) / ListPrice * 100`.
- "Condición de fidelidad" se detectó por heurística sobre el **nombre** de la promo
  (`/mi crf|mi carrefour|tarjeta|socio|club/i`). Es un proxy textual, no un campo
  estructurado — VTEX no expone un flag booleano de "requiere fidelidad".
- **No se hizo login ni se intentó bypass.** El sondeo de headers solo varió
  User-Agent y `sc` (parámetros públicos).
- El script 04 pide más productos que el límite de "10-20" del brief, pero con
  **menos requests** (~14 por retailer) que el dump por EAN del script 02 (25/17
  requests). Se eligió así porque la prevalencia no es medible con n=17: el dump
  inicial dio 1/17 con `DiscountHighLight` y ese n no distingue 5% de 30%.

**Cambio de plan respecto del brief.** El brief contemplaba instrumentar el scraper
para capturar `ListPrice` a un archivo. Fue innecesario: ya se persiste. La pregunta
2 se respondió con SQL.

---

## 3. Hallazgos por pregunta

### P1 — ¿Qué captura el scraper hoy?

**Lo que se guarda** (`extract.ts:80-94` → `price_history`):

| Campo VTEX | Columna DB | Estado |
|---|---|---|
| `commertialOffer.Price` | `price` | ✅ Es **el precio efectivo con descuentos aplicados** |
| `commertialOffer.ListPrice` | `list_price` | ✅ Poblado 100%, **nunca expuesto por la API ni la UI** |
| `Teasers.length > 0` | `has_promo` | ⚠️ Poblado pero semánticamente engañoso (ver P4) |
| `Teasers[].Name` | `promo_description` | ❌ **NULL en 47.358/47.358 filas** — bug |
| `IsAvailable && AvailableQuantity>0` | `is_available` | ✅ |

**Lo que VTEX manda y tiramos** (`commertialOffer`):

| Campo | Qué contiene | Por qué importa |
|---|---|---|
| **`DiscountHighLight`** | `[{Name: "PROMO-25% Off Mi Crf -Reg-1-25-As14 al 20.7"}]` | **Nombra el descuento aplicado a `Price`, su condición y su vigencia.** Es el campo que responde "¿por qué este precio?" |
| `PromotionTeasers` | Idem `Teasers` pero **con claves limpias** (`Name`, no `<Name>k__BackingField`) | Mismo contenido, sin el bug de serialización |
| `Installments` | Cuotas por tarjeta, con `InterestRate`, `PaymentSystemName` | Precio financiado |
| `PriceWithoutDiscount` | Igual a `ListPrice` en toda la muestra | Redundante |
| `FullSellingPrice` | Igual a `Price` en toda la muestra | Redundante |
| `PriceValidUntil` | Fecha — **no confiable** (ver P4) | |
| `PaymentOptions`, `RewardValue`, `Tax`, `GiftSkuIds`, `BuyTogether` | | Sin uso hoy |

A nivel producto (fuera de `commertialOffer`) también hay `productClusters` — que
en el testigo lista ~30 campañas con texto legible ("Hasta 40% de descuento en
seleccionados…") — más `Precio Cuidado`, `Ahora 12` y `Cucardas`.

**Logueado vs no-logueado:** el response **no cambia**. Baseline, User-Agent de
Chrome, `sc=1` y `sc=3` devuelven idénticos `Price=4725 ListPrice=6300`. (`sc=2`
da HTTP 400.) El scraper anónimo ya recibe el precio con el descuento de fidelidad
aplicado.

### P2 — ¿Cuántos productos tienen ListPrice ≠ Price?

Filas vigentes (`valid_to IS NULL`). **`list_price` está poblado al 100% y nunca es
menor que `price`** en ninguna fila:

| Retailer | Total | `list > price` | % | `list = price` | NULL |
|---|---|---|---|---|---|
| Carrefour | 26.756 | **11.958** | **44,7%** | 14.798 | 0 |
| Masonline | 12.510 | **2.518** | **20,1%** | 9.992 | 0 |

**Distribución del descuento** (disponibles, `price > 0`):

| Bucket | Carrefour | Masonline |
|---|---|---|
| 0–5% | 107 | 1 |
| 5–10% | 2.462 | 155 |
| 10–25% | **5.162** | 433 |
| 25–50% | 3.221 | **1.782** |
| >50% | 747 (máx 83,4%) | 96 (máx 80,0%) |

Carrefour se concentra en 10–25%; Masonline en 25–50% pero sobre un catálogo mucho
más chico de descuentos.

**Top categorías por frecuencia de descuento** (Carrefour, ≥50 productos):

| Categoría | Total | Con desc. | % |
|---|---|---|---|
| Electro y tecnología | 4.319 | 3.308 | **76,6%** |
| Aire Libre y Ocio | 1.296 | 910 | 70,2% |
| Automotor | 387 | 251 | 64,9% |
| Hogar | 5.169 | 3.048 | 59,0% |
| Juguetería y Librería | 2.199 | 1.167 | 53,1% |
| … | | | |
| Carnes y pescados | 148 | 6 | 4,1% |
| Frutas y verduras | 208 | 8 | 3,8% |

Masonline: Niños 89,1%, Hombres 88,9%, Decoración 72,1%, Jugueteria 65,3%.

**El gradiente es nítido: non-food descuenta masivamente, fresco casi nada.**

**Top marcas** (Carrefour, ≥30 productos): 24 marcas con **100%** de sus productos
en descuento — Gadnic (1.780 productos), Dehuka (365), Sinteplast (244), Zafiro
(167), Caldén (164), Randers, Electrolux, Hisense… Todas non-food. Un descuento que
aplica al 100% de una marca todo el tiempo no es una promo: es la política de
pricing de esa marca.

⚠️ Las cifras por categoría salen de `products.category_path`, que es volátil
(gana el último retailer que escribe — ver CLAUDE.md). Tomar como orden de
magnitud, no como medición exacta.

### P3 — ¿Estructurales o temporales?

**No se puede responder como pedía el brief: solo hay 3 días de historial**
(13/07 → 15/07/2026). Las ventanas de "hace 7 días" y "hace 30 días" no existen.
La mayoría de los productos tiene una sola vigencia:

| Retailer | 1 vigencia | 2 | 3 |
|---|---|---|---|
| Carrefour | 21.449 | 5.044 | 263 |
| Masonline | 10.072 | 2.354 | 84 |

Lo que **sí** se puede medir, comparando la vigencia actual contra la anterior:

| | Carrefour | Masonline |
|---|---|---|
| Pares comparables | 5.307 | 2.438 |
| Ambas con descuento | 1.441 | 388 |
| …y **mismo % (±2)** | **1.229 (85,3%)** | **69 (17,8%)** |
| Descuento apareció | 1.963 | 1.047 |
| Descuento desapareció | 1.117 | 636 |

**Interpretación (preliminar, n=3 días):**
- **Carrefour: cuando un descuento persiste, su magnitud es estable** (85,3% mantiene
  el mismo %). Se ven repricings donde `price` y `list` se mueven juntos ~1%
  manteniendo el ratio exacto — consistente con un descuento estructural sobre una
  lista que flota.
- **Masonline: lo contrario** — solo 17,8% mantiene la magnitud. Sus descuentos
  parecen promos de magnitud variable.
- **Hay churn alto en ambos**: ~2.000 descuentos aparecieron y ~1.100 desaparecieron
  en Carrefour en 3 días.

**Frecuencia de cambio** (vigencias promedio por producto):

| Retailer | Sin descuento | Con descuento |
|---|---|---|
| Carrefour | 1,133 | 1,302 (+15%) |
| Masonline | 1,102 | **1,598 (+45%)** |

Los productos con descuento cambian más seguido en ambos, y **mucho** más en
Masonline. Refuerza: Masonline = promocional, Carrefour = más estructural.

**El testigo ilustra el riesgo mejor que cualquier agregado:**

| Retailer | 13/07 | 14/07 | 15/07 |
|---|---|---|---|
| Carrefour | 4.725 (list 6.300) | = | = |
| Masonline | 3.785,40 (list 6.309) | **6.309** (list 6.309) | = |

El 13/07 Masonline era **más barato** ($3.785 vs $4.725). El 14/07 su descuento
desapareció y pasó a ser **33% más caro**. **La comparación se dio vuelta en un
día.** Y el precio de Carrefour que gana hoy es justamente el que requiere Mi Crf.

⚠️ El nombre de la promo del testigo (`As14 al 20.7`) indica vigencia 14–20/07:
es un descuento **semanal**, no permanente. La observación de que "está estable
hace 2 días" es consistente con una promo semanal, no con un descuento estructural.

### P4 — ¿Qué expone VTEX sobre las condiciones?

**Prevalencia** (609 SKUs Carrefour disponibles con precio):

| | n | % |
|---|---|---|
| Con descuento (`list>price`) | 177 | 29,1% |
| — con `DiscountHighLight` | 48 | 27,1% de los descuentos |
| — con `Teasers` | 108 | 61,0% |
| — **sin metadata alguna** | **69** | **39,0%** |
| — highlight que alude a fidelidad/tarjeta | **18** | **10,2%** |
| Sin descuento pero **con** `Teasers` | **422** | **97,7% de los sin descuento** |

**El corte por departamento cambia la lectura por completo:**

| Departamento | n | disc | disc% | c/highlight | fidelidad | **sin metadata** |
|---|---|---|---|---|---|---|
| Electro y tecnología | 100 | 70 | 70,0% | 0 | 0 | **69** |
| Hogar | 109 | 7 | 6,4% | 6 | 0 | 0 |
| Almacén | 100 | 28 | 28,0% | 8 | 5 | 0 |
| Desayuno y merienda | 100 | 25 | 25,0% | 12 | 2 | 0 |
| Bebidas | 100 | 20 | 20,0% | 11 | 4 | 0 |
| Lácteos y frescos | 100 | 27 | 27,0% | 11 | 7 | 0 |

**Los descuentos sin metadata están casi enteramente en Electro (69 de 69).** En
alimentos, **todos** los descuentos traen alguna metadata, y ~18% de ellos nombran
fidelidad. Es decir: donde el comparador de supermercado importa (alimentos), VTEX
sí comunica algo. Donde no comunica nada (Electro), los descuentos parecen rebajas
de lista comunes y sin condición.

**Catálogo de tipos de descuento observados:**

| Tipo | Dónde | Ejemplo | ¿Aplicado a `Price`? |
|---|---|---|---|
| **Fidelidad (Mi Crf)** | `DiscountHighLight` | `PROMO-25% Off Mi Crf -Reg-1-25-As14 al 20.7` | ✅ **Sí** ← el problema |
| Doble precio Mi CRF | `DiscountHighLight` | `PROMO-Mi CRF -mfl-1-8-Dto de 8% Doble Precio` | ✅ Sí |
| Descuento simple con tope | `DiscountHighLight` | `PROMO-25% Off Max 8 unidades -Reg-1-25-As14 al 20.7` | ✅ Sí |
| Exclusivo online | `DiscountHighLight` | `PROMO-Exclusivo online 40% Off -Reg-1-40-Quilmes6/7 al 2/8` | ✅ Sí |
| Regalo | `DiscountHighLight` | `Exclusivo online Gratis Bolsa Carrefour` | n/a |
| **Tarjeta de crédito** | `Teasers` | `Tarjeta Carrefour 15%` (**508x**) | ❌ **No** |
| Cantidad (2do al 50/70%, 3x2, 4x3) | `Teasers` | `PROMO-2do al 50% Mi Crf Max 72 unidades Combinable CLIGHT` | ❌ No |
| Adicional en 1 pago | `Teasers` | `PROMO-Adicional 15% Off en 1 pago-Reg-1-0-AsElectro` | ❌ No |

**Regla que emerge: `DiscountHighLight` = ya aplicado a `Price`. `Teasers` = NO
aplicado, disponible en checkout bajo condición.** Por eso 97,7% de los productos
*sin* descuento tienen teasers: es el "Tarjeta Carrefour 15%" que no se aplicó.

**Condiciones estructuradas disponibles** (dentro de cada teaser):
- `Conditions.Parameters[{Name: "RestrictionsBins", Value: "507858,858110,…"}]` —
  **los BINs de tarjeta habilitados**. Es la condición en forma estructurada.
- `Conditions.MinimumQuantity` — condición de cantidad.
- `Effects.Parameters[{Name: "PercentualDiscount", Value: "15"}]` — la magnitud.

Es decir: para los `Teasers` **hay** condición estructurada. Para el
`DiscountHighLight` (el que sí afecta el precio) **solo hay un string de nombre**,
con convención interna del retailer: `PROMO-{qué} -{tipo}-{n}-{pct}-{campaña/vigencia}`.

**`PriceValidUntil` no sirve como vencimiento de promo:**

| Retailer | Valores |
|---|---|
| Carrefour | `2027-07-15` (9x — exactamente hoy+1 año = placeholder), `2026-08-26` (8x), `2026-08-01` (2x), null (4x) |
| Masonline | `2050-01-01` (14x — placeholder), null (13x) |

El testigo tiene `PriceValidUntil = 2027-07-15` (placeholder) mientras su promo
vence el 20/07 según su propio nombre. **La vigencia real está en el string del
nombre, no en el campo de fecha.**

### P5 — ¿Coincide Masonline con Carrefour?

**No. La diferencia es cualitativa, no de matiz.**

| | Carrefour | Masonline |
|---|---|---|
| `ListPrice` poblado | 100% | 100% |
| Catálogo con descuento | 44,7% | 20,1% |
| `DiscountHighLight` | 17 nombres distintos | **0 — nunca** |
| `Teasers` | 41 nombres distintos, 61% de los descuentos | **0 — nunca** |
| Serialización de Teasers | backing fields C# (11/11) | n/a (no hay) |
| `PriceValidUntil` | Fechas reales + placeholder hoy+1año | Siempre `2050-01-01` o null |
| Estabilidad del descuento | 85,3% mantiene magnitud | 17,8% |
| `has_promo=true` en DB | 20.480 filas | **0 filas** |

**Consecuencia:** cualquier solución basada en leer metadata de promo funciona
**solo para Carrefour**. Para Masonline, un descuento del 40% (como el que tenía el
testigo el 13/07) es indistinguible de un precio de lista bajo: `list > price` y
nada más. No hay campo que consultar, y el binding anónimo no expone otro.

---

## 4. Riesgos y sesgos del análisis

1. **Historial de 3 días.** Es la limitación más grave. Todo P3 es preliminar. La
   distinción estructural/temporal necesita ≥30 días. Lo que hoy parece "estable"
   puede ser una promo semanal — de hecho el testigo **es** una promo semanal
   (`As14 al 20.7`) que a 3 días de historia parecía estructural.
2. **El muestreo del script 04 no es aleatorio.** Toma las 2 primeras páginas de
   cada departamento, y VTEX ordena por relevancia. Los productos destacados
   plausiblemente tienen más promos que la cola del catálogo. **Evidencia directa
   del sesgo:** la muestra dio Hogar 6,4% con descuento, pero la DB completa da
   59,0%. Un muestreo aleatorio real (offsets al azar dentro del cap de 2500)
   corregiría esto.
3. **Solo 6 departamentos de ~18 (Carrefour) y de los que traen catálogo (Masonline).**
   Los de Masonline muestreados fueron todos de alimentos secos, justo la franja de
   menor descuento — por eso 4,3% en la muestra vs 20,1% en la DB.
4. **"Fidelidad" se detecta por regex sobre un string.** `/mi crf|tarjeta|socio|club/i`
   sobre nombres escritos a mano por el equipo de marketing del retailer. Hay
   variantes seguro no cubiertas, y la convención puede cambiar sin aviso. **El 10,2%
   es un piso, no una medición.**
5. **`sin metadata` ≠ `sin condición`.** Para el 39% de los descuentos de Carrefour
   sin metadata y el 100% de Masonline, no sabemos si son condicionales. El análisis
   **no puede** descartar que lo sean. La afirmación "solo 10% es condicional" es en
   rigor "al menos 10% es demostrablemente condicional".
6. **Un solo caso verificado contra la web.** El testigo es el único donde
   contrastamos API vs render. La regla "`DiscountHighLight` = aplicado / `Teasers`
   = no aplicado" está inferida de la aritmética (`Price` vs `ListPrice`) en la
   muestra, no verificada producto por producto en el navegador.
7. **Cifras por categoría contaminadas** por la volatilidad conocida de
   `category_path` (ver CLAUDE.md).
8. **Ventana temporal única.** Todo se corrió el 15/07 a la tarde. Los precios VTEX
   se mueven varias veces al día (descubrimiento 13). Otra hora podría dar otros
   números.

---

## 5. Preguntas abiertas para la sesión de diseño

1. **¿Qué precio "debe" mostrar un comparador?** El de lista (lo que paga cualquiera)
   o el efectivo (lo que paga un usuario típico con la tarjeta de la cadena)? No es
   una pregunta técnica. Nota: Carrefour tiene tarjeta propia con descuento
   estructural del 15% y Masonline **no expone ninguna** — mostrar el efectivo
   favorece sistemáticamente a Carrefour en la comparación.
2. **¿Qué se hace con lo indeterminable?** El 39% de Carrefour sin metadata y el
   100% de Masonline no se pueden clasificar. ¿Se asume no-condicional (arriesga
   mentir) o se marca "puede requerir condiciones" (arriesga ruido en casi todo)?
3. **La asimetría Carrefour/Masonline, ¿es un bloqueante de producto?** Una
   comparación donde un lado tiene metadata y el otro no es estructuralmente
   despareja, independientemente de lo que implementemos.
4. **¿Se parsea el string de `DiscountHighLight`?** Contiene condición y vigencia
   pero es una convención interna sin contrato, escrita a mano. Parsearlo es frágil;
   no parsearlo deja el dato inservible para filtrar. ¿Guardarlo crudo y mostrarlo
   tal cual?
5. **¿Qué hacer con `has_promo`?** Hoy significa mayormente "hay un descuento de
   tarjeta que NO está en el precio". Si algún consumidor lo interpreta como "está
   en oferta", está mal. ¿Se corrige la semántica, se renombra, se parte en dos
   campos?
6. **El bug de `Teasers` se arregla igual, ¿sí o no?** `promo_description` está
   muerto en 47.358 filas. El fix es chico (usar `PromotionTeasers`, que ya viene
   con claves limpias, o desenrollar los backing fields). Es independiente de las
   decisiones de producto. **No lo apliqué** — el brief prohíbe tocar el scraper.
7. **¿Se captura `DiscountHighLight` antes de acumular historia?** Cada día que pasa
   sin capturarlo es un día de historial sin la información que explica el precio.
   Hay costo de oportunidad en esperar.
8. **¿Alcanza el historial para decidir?** Con 3 días no se puede separar estructural
   de temporal. Quizá convenga esperar 2-4 semanas de acumulación antes de decidir
   la parte que depende de esa distinción.

---

## Apéndice: cómo reproducir

```bash
pnpm tsx research/precios-descuento/scripts/01-listprice-coverage.ts
pnpm tsx research/precios-descuento/scripts/02-dump-raw-vtex.ts          # escribe dumps/
pnpm tsx research/precios-descuento/scripts/03-analyze-dumps.ts          # requiere 02
pnpm tsx research/precios-descuento/scripts/04-discount-metadata-prevalence.ts
pnpm tsx research/precios-descuento/scripts/05-discount-stability.ts
pnpm tsx research/precios-descuento/scripts/06-validuntil-and-headers.ts # requiere 02
pnpm tsx research/precios-descuento/scripts/07-verify-teaser-bug.ts      # requiere 02
```

Los dumps (`dumps/*.json`, ~2MB) están gitignoreados: los scripts los regeneran.
