# CLAUDE.md — Comparador de Precios Supermercados

## Contexto rápido

Este proyecto es un **comparador de precios entre supermercados argentinos** (arrancamos con Masonline/Changomas y Carrefour, después escalamos a Coto, Día, Jumbo). El desarrollador (Juan) y su co-arquitecto (Claude en chat) diseñaron la solución. Vos (Claude Code) sos la mano de obra: escribís el código siguiendo las decisiones ya tomadas, no las cuestionás salvo que detectes un error concreto.

**Objetivo del producto:** una base de datos actualizada diariamente con precios de todas las cadenas + un frontend web que permita a un usuario comparar productos entre cadenas, ver historial de precios, y detectar oportunidades.

**Estado actual:** greenfield. Nada escrito todavía.

---

## Descubrimientos técnicos ya validados (NO re-investigar)

Estos puntos ya se verificaron manualmente contra los sitios reales. Son la base de todas las decisiones. **No los cuestiones ni intentes "confirmar" con más requests exploratorios**:

1. **Ambos retailers corren VTEX IO.** Confirmado leyendo respuestas del propio backend (`accountType: "VTEX-IO"` en Masonline; Carrefour documentado como cliente VTEX).
2. **Los endpoints REST del Catalog System son públicos, sin auth, sin cookies, sin headers especiales.** Un fetch simple con User-Agent es suficiente. No hay que tocar el GraphQL de VTEX IO para el discovery ni el detalle.
3. **El campo `items[].ean` viene poblado con EAN-13 reales en ambos retailers.** Verificado:
   - Masonline: `7798316700815` (prefijo 779 = Argentina)
   - Carrefour: `3045380026278` (prefijo 30-37 = Francia)
4. **El EAN es la llave universal para matchear productos entre cadenas.** Marcas nacionales e importadas de terceros van a matchear directo. Marcas propias del retailer NO matchean entre cadenas (esperado — son productos físicamente distintos).
5. **Paginación VTEX tiene un cap de 2500 productos por combinación de filtros** (`_from` no puede pasar de 2500). Si una categoría excede eso, hay que subdividir por marca (`fq=B:{brandId}`) o por subcategoría.
6. **El endpoint GraphQL `getPriceWithoutTax` NO sirve para discovery.** Sirve solo para refresh de precios cuando ya tenés los IDs. Ignoralo por ahora.
7. **`fq=C:{catId}` solo trae productos cuando `catId` es un departamento top-level (nivel 1 del árbol).** Categorías intermedias y hojas devuelven `[]` incluso cuando los productos están asignados a ellas en su `categoriesIds`. Verificado empíricamente en Masonline: `fq=C:200005` (departamento "Aceites") → 518 productos; `fq=C:300020` (intermedia) → 0; `fq=C:500021` (hoja) → 0. **Verificado también en Carrefour** (mismo comportamiento): intermedia `[4] TV y soportes` → 0, hoja `[5] Smart TV` → 0; solo top-level trae productos. **Implicancia arquitectónica:** el scraper itera departamentos top-level, no hojas. El árbol pasa a ser metadata para display, no estructura de traversal.
8. **VTEX Masonline rate-limitea con HTTP 429 bajo ráfaga.** Devuelve header `Retry-After` (formato segundos, en teoría también soporta HTTP-date). Es el único 4xx retryable en nuestro cliente junto con 408 Request Timeout. Cap de espera: 30 segundos, valor original loguea. Si en una corrida se ven >20 hits, revisar concurrencia global antes de la próxima. **Carrefour rate-limitea más que Masonline:** la corrida full (~110 min, 18 deptos, 108.781 EANs) tuvo **19 hits de 429** (Masonline full: 0). Los 19 se retryaron OK honrando `Retry-After`, 0 errores finales. 19 < 20 (umbral de revisión) pero cerca del límite: **NO subir la concurrencia para Carrefour sin re-evaluar**; la paginación secuencial actual (~1 req a la vez) es lo que lo mantiene manejable.

9. **El EAN se normaliza a forma canónica (strip de ceros a la izquierda) en ingesta.** El mismo GTIN físico puede reportarse en distintos formatos GS1: EAN-13, UPC-A (12 dígitos), o GTIN-14 pad-eado con ceros a la izquierda. Un JOIN por string vería `07796962999850` y `7796962999850` como productos distintos. Verificado empíricamente en Carrefour electro (`07796962999850`, 14 dígitos con padding). **Todos los EANs pasan por `pipeline/transform.ts:normalizeEan` antes de tocar la DB**: trim → validar solo dígitos → strip de ceros a la izquierda (via `BigInt`) → validar longitud canónica en [8, 14]. Los que fallan se skipean con warning `bad_ean` (no se cae el pipeline). Canonizamos "sin padding" en vez de "GTIN-14 pad-eado" porque Masonline ya venía en 13 dígitos limpios en su mayoría. **Migración retroactiva** (`bin/normalize-existing-eans.ts`, one-shot idempotente): sobre el catálogo Masonline de Fase 1 (ingerido antes de esta regla) migró 21 EANs con padding, detectó 1 colisión de merge (`0842261100804` ↔ `842261100804`, mismo producto físico duplicado — se deja para revisión manual, no se fusiona a ciegas porque implica fundir cadenas de vigencias SCD-2) y reportó 10 EANs basura pre-existentes (truncados a 4-7 dígitos, placeholders todo-ceros, un par concatenado por coma) que quedan inertes en la DB. `COUNT(*) products` = 12206 intacto post-migración, 0 huérfanos de FK.

10. **Cap de 2500 con brandId `Genérico` es irrecuperable con nuestras herramientas actuales.** Verificado en Carrefour: departamentos Hogar y Juguetería tienen >2500 productos con brandId "Genérico" (marca-catchall de VTEX). Subdividir por brand no ayuda porque la marca sigue siendo la misma. Fix requeriría subdividir por subcategoría, lo cual es complejidad extra en el scraper. **Decisión operativa:** aceptar el gap porque productos `Genérico` no matchean cross-retailer (cada cadena usa la categoría distinto). Documentado como gap conocido; se revisita si aparece un caso de negocio.

11. **`badEan` en Carrefour son códigos internos, NO GTINs mal formados.** Verificado empíricamente: la muestra de `non_numeric` y `wrong_length` son SKUs internos del retailer, no EANs recuperables por heurística GS1. **No se implementa recovery.** La observabilidad vive en `scrape_runs.bad_ean_total`.

12. **Idempotencia real ≠ "DB count no cambia".** El criterio "misma DB count entre corridas" solo se cumple con snapshot congelado de la API. En corridas contra API en vivo con drift real (precios movidos, productos que reingresan de cola muerta), el criterio correcto es: **input idéntico a nivel producto → cero escrituras para ese producto**. Verificable por bucket: productos en `price.unchanged` no disparan writes. Deltas en `price.new`/`price.changed` deben reconciliar con drift observable, no ser bugs.

13. **Los precios en retailers VTEX argentinos pueden cambiar varias veces al día.** El scrape diario captura snapshots correctos al momento de la corrida; el precio real en el sitio puede diferir horas después. Verificado 14/07/2026 con Motorola G67 (EAN `7790894902018`): scrape de las 6AM leyó `Price = 499999`, verificación en la web a las 10AM mostraba `$599.999`, y el payload de VTEX confirmó `Price = 599999` (`ListPrice`, `PriceWithoutDiscount`, `FullSellingPrice` todos coincidían). No es bug del pipeline — es frecuencia de sampleo. **Implicancia arquitectónica**: (a) el frontend debe mostrar timestamp "actualizado hace X" en toda vista de precio; (b) se implementa refresh on-demand con TTL comunitario 60s en Fase B (`POST /products/:ean/refresh`); (c) SSE broadcast comunitario planificado para post-lanzamiento (Fase 3.C). Ver detalles en `docs/NEXT_SESSION.md` → "Arquitectura de refresh de precios".

14. **VTEX serializa parte del `commertialOffer` con backing fields de C#, y `Teasers` ≠ `DiscountHighLight` en significado.** Dos hechos independientes, ambos verificados contra payloads reales (15/07/2026):

    **(a) Serialización.** `Teasers` y `DiscountHighLight` vienen con las claves internas del compilador de C# (`<Name>k__BackingField`), no con `Name`. `PromotionTeasers` viene con claves limpias y **mismo contenido** que `Teasers` (nombres idénticos en 11/11 ofertas del dump). Leer solo `Name` es lo que dejó `promo_description` en NULL en las 47.358 filas de la tabla durante toda la Fase 1-2, en silencio. **Todo entry con nombre se parsea con `vtexNamedEntrySchema` + `vtexEntryName`, que aceptan ambas formas** — no hay contrato de VTEX que fije cuál usa cada campo. `Teasers` y `PromotionTeasers` se consumen **las dos** (`joinVtexNames` deduplica), para no depender de cuál serializa bien VTEX hoy.

    **(b) Semántica — la regla que importa:** **`DiscountHighLight` = descuento YA aplicado a `Price`. `Teasers` = descuento NO aplicado, disponible en checkout bajo condición.** Por eso el 97,7% de los productos *sin* descuento tienen teasers: es el "Tarjeta Carrefour 15%" que no se aplicó. Confundirlos es exactamente el bug que tuvo `has_promo` hasta el 15/07/2026. `DiscountHighLight` además nombra la condición y la vigencia dentro del string (`"PROMO-25% Off Mi Crf -Reg-1-25-As14 al 20.7"`), y **la vigencia real vive ahí, no en `PriceValidUntil`** (que es un placeholder: hoy+1año en Carrefour, `2050-01-01` en Masonline).

    **Asimetría entre cadenas:** Masonline **no expone nada** — cero `Teasers`, cero `DiscountHighLight`. Sus descuentos (20,1% del catálogo) son `list > price` sin explicación posible con los endpoints actuales. Cualquier feature que dependa de metadata de promo funciona **solo para Carrefour**. Ver `research/precios-descuento/HALLAZGOS.md`.


15. **Los precios de VTEX son regionales, y el catálogo sin regionalizar devuelve un precio que nadie paga.** Verificado el 20/07/2026 sobre 16 ciudades: **14 `regionId` distintos y 13 combinaciones de precio distintas** — no hay "zonas" agrupables, cada región es prácticamente la suya. El default de Carrefour **no coincide con ninguna región real** (es un fantasma del catálogo sin regionalizar); el de Masonline coincide con CABA. Sobre 14 productos comparables: 14/14 con algún precio distinto al de Olavarría, **3/14 cambian de ganador cross-retailer** con la tolerancia del 1% (o sea el veredicto, que es el producto, estaba mal), y 5/14 no se venden en Olavarría pero se mostraban disponibles. **La disponibilidad también es regional**: en el depto Almacén de Carrefour, 51/500 SKUs no se venden en Olavarría contra 2/500 sin regionalizar.

    **El fix es la cookie `vtex_segment`, no un endpoint nuevo.** El query param `?regionId=` NO sirve: `catalog_system` lo ignora. La cookie es base64 de un JSON donde `channel` va como JSON escapado **dentro** del JSON — no es un bug de serialización, es el shape que espera VTEX (ver `buildVtexSegmentCookie`). Cero 429 extra por mandarla (40 requests de prueba, 0 hits). Ver "Regionalización" abajo y `docs/REGIONALIZACION.md` en chango-web.

16. **Un producto no vendido en la región se devuelve igual, marcado no disponible — nunca desaparece del listado.** Pero las cadenas difieren en qué precio dejan: **Masonline pone `Price: 0`**, **Carrefour conserva el precio** (`IsAvailable: false`, `AvailableQuantity: 0`, `Price > 0`). La regla de load "primer avistaje con `IsAvailable:false` o `Price<=0` → skip completo" cubre ambos casos, así que **hoy esos productos simplemente no entran a la DB**. Consecuencia conocida y aceptada: el backend **no distingue** "no se vende en tu zona" de "no está en el catálogo de esa cadena". Habilitar esa distinción requiere permitir `price NULL` en `price_history`, lo que rompe el invariante duro de "toda fila refleja un precio real observado" — se decidió postergarlo a una fase propia (Juan, 20/07/2026).

17. **La data regionalizada es MÁS pareja entre cadenas que la fantasma.** Post-regionalización los empates cross-retailer (|diff| ≤ 1%) subieron de **36,4% a 40,5%**, y las diferencias grandes se achicaron (25-50% bajó de 23,0% a 12,0%). La lectura: parte de las diferencias que veíamos antes eran **artefactos de comparar dos fantasmas distintos** — el default de Masonline es CABA y el de Carrefour no es ninguna región real, así que el "diff" mezclaba diferencia de precio con diferencia de región. Corolario para el producto: la propuesta de valor de Chango depende de la regionalización más de lo que parecía, porque sin ella una fracción del ranking de ofertas era ruido geográfico, no señal.

---

## Regionalización

**Toda oferta y toda vigencia están keyeadas por región.** `price_history` y
`retailer_products` tienen `region_id TEXT NOT NULL` y su PK lo incluye:

```
retailer_products : (retailer_id, ean, region_id)
price_history     : (retailer_id, ean, region_id, valid_from)
```

Hoy se carga **una sola región: `olavarria` (CP 7400)**, definida en
`src/config/regions.ts` junto con `DEFAULT_REGION`. El esquema quedó preparado
para más desde el día uno a propósito: sumar una región tiene que ser
configuración, no otra migración de PK sobre una tabla ya grande.

### Dos identificadores distintos, fácil de confundir

- **`region_id` / `ACTIVE_REGION`**: *nuestra* clave (`'olavarria'`). Es lo que se
  escribe en la columna, lo que filtran las queries y lo que expone la API.
  Estable entre retailers.
- **`vtexRegionId`**: el ID opaco de VTEX para esa región **en ese retailer**
  (cada cadena tiene su propia instancia). Solo se usa para armar la cookie;
  **nunca toca la DB**.

Confundirlos escribe filas con un `region_id` que es un blob base64 por cadena, y
rompe todo JOIN cross-retailer en silencio.

### Cómo agregar una región nueva

1. Obtener el `regionId` de VTEX **de cada retailer** para el CP:
   `curl 'https://{host}/api/checkout/pub/regions?country=ARG&postalCode={cp}'`
   (devuelve `[{ id, sellers }]`; el `id` es el que va).
2. Agregar la entrada a `regions` en `src/config/regions.ts`.
3. Correr el scraper. No hace falta migración.

Los IDs se cachean estáticos: **no** se resuelven en runtime al arrancar. Cambian
muy de vez en cuando y un fetch al arranque agrega un punto de falla a cambio de nada.

### Guard del scraper (defensa en profundidad)

`src/scrapers/region-guard.ts` corre **antes** de escribir una sola fila: pide el
EAN sentinel con cookie y sin cookie, y **exige que difieran**. Si dan igual, la
cookie no está regionalizando y la corrida aborta sin escribir nada.

Corre pre-scrape, no post-scrape, porque el punto es *no llegar a escribir*
precios fantasma; un chequeo posterior detecta el problema con la tabla ya
contaminada. Y compara contra el precio sin cookie en vez de contra un valor
esperado fijo porque **un umbral absoluto se pudre con la inflación**: el margen
se agota en meses y el guard empieza a abortar corridas sanas, que es como
termina apagado.

### API

Los endpoints con precios devuelven `region` en el top-level y filtran por
`ACTIVE_REGION` (`src/api/config/region.ts`) en **toda** query a `price_history` /
`retailer_products`. No hay `?region=` todavía.

Olvidarse el filtro en una query no da error: con una segunda región cargada,
`only_matched` y `matched_count` cuentan la misma cadena dos veces y marcan como
"matcheado" un producto que existe en una sola.

`GET /products/:ean` pasó de devolver el Product pelado a `{ region, product }`.
`region` describe la respuesta, no al producto: el mismo EAN existe en todas las
regiones con precios distintos, y meterlo en `ProductSchema` lo repetiría en cada
item de `/products` y `/search`.

`/health`, `/categories`, `/brands` y `/search/facets` no llevan `region` — su
contenido no es regional, y decir lo contrario sería afirmar algo falso.

### Productos huérfanos (política)

Un **huérfano** es un producto que existe en `products` pero no tiene ninguna
oferta vigente en la región (`price_history` con `valid_to IS NULL`). El truncate
de la regionalización dejó 11.143 (28% de la tabla): EANs del catálogo fantasma
que no reaparecieron scrapeando Olavarría.

**No se borran.** Un huérfano puede ser un producto que no se vende en la región,
uno que una corrida salteó (transitorio), o uno descontinuado. En los dos primeros
casos vuelve, y `first_seen_at` / `image_url` no son recuperables. Ya se tiró
histórico una vez; no se tira más si se puede evitar.

**Se filtran en los listados**, con el predicado compartido `hasActiveOffer`
(`src/api/common/database/active-offer.ts`):

| Endpoint | Comportamiento |
| --- | --- |
| `GET /products`, `GET /search`, `GET /search/facets` | Filtran (vía `scopeSql`, que es el scope común de los tres — si divergieran, los facets contarían marcas que la grilla no muestra). |
| `GET /brands`, `GET /categories` | Filtran, o el sidebar muestra marcas y categorías muertas. |
| `GET /products/:ean` | **NO filtra.** Un link directo o un EAN copiado tiene que resolver, devolviendo `retailers: []`. El frontend tiene el estado "sin oferta activa". Convertirlo en 404 sería peor información que "no lo tenemos cotizado". |
| `GET /compare`, `GET /products/recent-changes` | Ya filtran solos: parten de un JOIN contra ofertas vigentes. |

El predicado **no exige `is_available`**: un producto no disponible arrastra el
último precio conocido, así que sigue siendo cotizable y tiene que aparecer,
marcado como no disponible.

---

## Endpoints VTEX que usamos (los únicos)

Reemplazá `{host}` por `www.masonline.com.ar` o `www.carrefour.com.ar`.

**Árbol completo de categorías** (una llamada, cachealo por 24hs):
```
GET https://{host}/api/catalog_system/pub/category/tree/5
```
Devuelve JSON anidado con `id`, `name`, `url`, `children[]`. El `5` es la profundidad máxima; para estos retailers alcanza y sobra.

**Búsqueda de productos por categoría** (el workhorse):
```
GET https://{host}/api/catalog_system/pub/products/search/?fq=C:{categoryId}&_from={n}&_to={n+49}
```
Paginación en pasos de 50. `_to` es inclusivo. Cuando el response viene como `[]`, terminó la categoría.

> ⚠️ `{categoryId}` **debe ser un departamento top-level** (nivel 1 del árbol de categorías). Categorías intermedias o hojas devuelven `[]`. Ver punto 7 de "Descubrimientos técnicos ya validados".

**Búsqueda por marca** (para subdividir categorías con más de 2500 productos):
```
GET https://{host}/api/catalog_system/pub/products/search/?fq=C:{catId}&fq=B:{brandId}&_from={n}&_to={n+49}
```

**Producto individual por ID** (para refresh selectivo, no lo usamos en el scraper principal):
```
GET https://{host}/api/catalog_system/pub/products/search/?fq=productId:{id}
```

**Búsqueda por EAN** (útil para debugging y para v2):
```
GET https://{host}/api/catalog_system/pub/products/search/?fq=alternateIds_Ean:{ean}
```

---

## Forma de la respuesta de VTEX (lo relevante)

Cada elemento del array de productos:

```typescript
{
  productId: string,
  productName: string,
  brand: string,
  brandId: number,
  linkText: string,           // para armar la URL pública
  categories: string[],       // paths tipo "/Farmacia/Cuidado Personal/"
  categoryId: string,
  items: Array<{
    itemId: string,           // este es el skuId
    name: string,
    ean: string,              // ← llave universal
    measurementUnit: string,  // "un", "kg", "L", etc.
    unitMultiplier: number,
    images: Array<{ imageUrl: string, imageText: string }>,
    sellers: Array<{
      sellerId: string,
      sellerDefault: boolean,
      commertialOffer: {
        Price: number,               // precio EFECTIVO: descuentos ya aplicados
        ListPrice: number,           // precio de lista (tachado)
        PriceWithoutDiscount: number,
        AvailableQuantity: number,
        IsAvailable: boolean,
        // ⚠️ Serializados con backing fields de C#: la clave es `<Name>k__BackingField`,
        // NO `Name`. Ver punto 14 de "Descubrimientos técnicos ya validados".
        Teasers: Array<{ '<Name>k__BackingField': string, ... }>,        // NO aplicados a Price
        PromotionTeasers: Array<{ Name: string, ... }>,                  // idem, claves limpias
        DiscountHighLight: Array<{ '<Name>k__BackingField': string }>,   // SÍ aplicado a Price
      }
    }>
  }>
}
```

**Reglas de extracción:**
- Un producto puede tener múltiples `items` (variantes). Para el MVP tratamos cada `item` como una fila propia — la comparación se hace a nivel SKU, no a nivel producto.
- De los `sellers`, quedate con el que tenga `sellerDefault: true`. Si no hay ninguno con esa flag, quedate con `sellers[0]`.
- Si `IsAvailable` es `false` o `AvailableQuantity` es 0, el producto se guarda con `is_available = false` y precio arrastrado del último vigente (ver "Lógica de load para price_history"). **No se lo saca de la base** — necesitamos la historia.

---

## Stack técnico (decidido, no cambiar sin acuerdo)

- **Runtime:** Node.js 20+ con TypeScript estricto (`strict: true`, `noUncheckedIndexedAccess: true`).
- **Package manager:** pnpm.
- **HTTP:** `undici` (fetch nativo de Node es fine también, pero undici da mejor control de connection pooling).
- **Concurrencia:** `p-limit` para capar en 3-4 requests simultáneos.
- **Validación de respuestas:** `zod`. Nada de `any`. Todas las respuestas de VTEX pasan por un schema Zod antes de tocarse.
- **DB:** PostgreSQL. En dev, Supabase managed (free tier alcanza). En prod, mismo.
- **Cliente DB:** `postgres` (el driver de porsager, no `pg`). Simple, tipado, rápido.
- **Migrations:** SQL crudo en `src/db/migrations/`. Nada de ORM.
- **Logging:** `pino` con salida JSON estructurada.
- **Retry con backoff exponencial** (100ms → 200ms → 400ms → 800ms → 1600ms, cap en 5 intentos) **en 5xx y errores de red.** No retry en 4xx **excepto 408 (Request Timeout) y 429 (Too Many Requests)**, que son la excepción semántica estándar: indican "reintentá con backoff", no "la request es inválida". Para 429, honrar `Retry-After` con cap de 30 segundos (log warning si el valor pedido excede el cap).
- **Testing:** `vitest`. No es prioridad para el MVP, pero el cliente HTTP y el parser sí tienen tests.
- **CLI:** un `bin/scrape.ts` ejecutable con `tsx`, que recibe `--retailer=masonline|carrefour` como flag.

**Lo que NO usamos** (a menos que Juan lo autorice explícitamente):
- Puppeteer, Playwright, Selenium — no hace falta, todo es JSON.
- Cheerio, jsdom — no hace falta, todo es JSON.
- Prisma, Drizzle, TypeORM — SQL crudo con `postgres` es más simple para este caso.
- Kysely, knex — mismo motivo.
- axios — undici es superior para este workload.

---

## Estructura del proyecto

```
comparador-precios/
├── CLAUDE.md                    # este archivo
├── README.md                    # instrucciones para humanos
├── package.json
├── tsconfig.json
├── .env.example
├── .gitignore
├── bin/
│   └── scrape.ts                # CLI runner
├── src/
│   ├── config/
│   │   └── retailers.ts         # config por retailer (base URL, timeouts, etc.)
│   ├── lib/
│   │   ├── vtex-client.ts       # HTTP client genérico VTEX
│   │   ├── db.ts                # conexión postgres
│   │   ├── logger.ts            # pino config
│   │   └── retry.ts             # backoff exponencial
│   ├── schemas/
│   │   ├── vtex-product.ts      # Zod schemas de respuestas VTEX
│   │   └── vtex-category.ts
│   ├── scrapers/
│   │   ├── base-scraper.ts      # lógica compartida
│   │   ├── masonline.ts         # config y overrides Masonline
│   │   └── carrefour.ts         # config y overrides Carrefour
│   ├── pipeline/
│   │   ├── extract.ts           # de VTEX response a DTOs
│   │   ├── transform.ts         # normalización (marcas, unidades)
│   │   └── load.ts              # upserts a DB
│   └── db/
│       ├── migrations/
│       │   ├── 001_initial.sql
│       │   └── ...
│       └── queries/             # queries reusables
└── tests/
```

---

## Esquema de base de datos

```sql
-- Retailers: cadenas de supermercado
CREATE TABLE retailers (
  id           SMALLSERIAL PRIMARY KEY,
  slug         TEXT NOT NULL UNIQUE,        -- 'masonline', 'carrefour'
  name         TEXT NOT NULL,               -- 'Masonline', 'Carrefour Argentina'
  base_url     TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Productos: llave universal EAN, un producto físico único en el mundo
CREATE TABLE products (
  ean              TEXT PRIMARY KEY,        -- EAN-13 (o EAN-8 en casos raros)
  name_canonical   TEXT NOT NULL,           -- nombre elegido (primer retailer que lo vio)
  brand            TEXT,
  category_path    TEXT,                    -- último path visto
  image_url        TEXT,
  first_seen_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_products_brand ON products(brand);
CREATE INDEX idx_products_last_seen ON products(last_seen_at);

-- Retailer products: mapeo (retailer, EAN) -> catálogo del retailer
CREATE TABLE retailer_products (
  retailer_id          SMALLINT NOT NULL REFERENCES retailers(id),
  ean                  TEXT NOT NULL REFERENCES products(ean),
  region_id            TEXT NOT NULL,       -- clave nuestra ('olavarria'), NO el ID de VTEX
  sku_id_retailer      TEXT NOT NULL,       -- itemId en VTEX
  product_id_retailer  TEXT NOT NULL,       -- productId en VTEX
  product_url          TEXT,
  retailer_name        TEXT,                -- nombre como lo llama esta cadena
  is_available         BOOLEAN NOT NULL DEFAULT true,
  last_seen_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (retailer_id, ean, region_id)
);

CREATE INDEX idx_rp_sku ON retailer_products(retailer_id, sku_id_retailer);

-- Price history: una fila por CAMBIO de precio (modelo de vigencias)
CREATE TABLE price_history (
  retailer_id       SMALLINT NOT NULL REFERENCES retailers(id),
  ean               TEXT NOT NULL REFERENCES products(ean),
  region_id         TEXT NOT NULL,           -- ver seccion Regionalizacion
  valid_from        DATE NOT NULL,           -- primer día que rige este precio
  valid_to          DATE,                    -- último día vigente (NULL = precio actual)
  price             NUMERIC(12, 2) NOT NULL,   -- efectivo: descuentos YA aplicados
  list_price        NUMERIC(12, 2),             -- de lista (tachado). list > price = descuento
  has_promo         BOOLEAN NOT NULL DEFAULT false,  -- derivado: (list_price > price)
  promo_description TEXT,                       -- Teasers: descuentos NO aplicados a price
  discount_highlight TEXT,                      -- DiscountHighLight: nombra el descuento SÍ aplicado
  is_available      BOOLEAN NOT NULL,
  first_seen_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (retailer_id, ean, region_id, valid_from)
);

-- Índice parcial: acelera "cuál es el precio actual de X"
CREATE UNIQUE INDEX idx_ph_current
  ON price_history(retailer_id, ean, region_id)
  WHERE valid_to IS NULL;

-- Índice para queries históricas por producto
CREATE INDEX idx_ph_ean_valid_from
  ON price_history(ean, valid_from DESC);

-- Índice para queries por rango temporal
CREATE INDEX idx_ph_valid_from ON price_history(valid_from);

-- Scrape runs: telemetría de cada corrida
CREATE TABLE scrape_runs (
  id                   SERIAL PRIMARY KEY,
  retailer_id          SMALLINT NOT NULL REFERENCES retailers(id),
  started_at           TIMESTAMPTZ NOT NULL,
  finished_at          TIMESTAMPTZ,
  status               TEXT NOT NULL,        -- 'running' | 'success' | 'failed'
  products_scraped     INTEGER,
  products_new         INTEGER,
  errors_count         INTEGER,
  error_summary        JSONB
);
```

---

## Lógica de load para price_history

Esta tabla usa un modelo de vigencias (SCD Type 2 simplificado). La regla de escritura NO es "insertar una fila por día". Es "insertar una fila SOLO cuando el precio (o cualquier campo relevante) cambia respecto al vigente".

### Algoritmo del upsert de precio

Para cada SKU scrapeado hoy, comparar con el registro vigente (`valid_to IS NULL`):

1. **No existe ningún registro para (retailer_id, ean)** → INSERT nuevo con `valid_from = today, valid_to = NULL`. Es un producto que se ve por primera vez.

2. **Existe registro vigente y TODOS los campos relevantes son iguales** → cero writes a `price_history`. Solo actualizar `last_seen_at = NOW()` en la fila vigente. Precio no cambió, no ensuciamos la tabla.

3. **Existe registro vigente pero al menos un campo relevante cambió** → transacción atómica:
   - `UPDATE price_history SET valid_to = today - 1 WHERE retailer_id = ? AND ean = ? AND valid_to IS NULL`
   - `INSERT INTO price_history (...) VALUES (..., valid_from = today, valid_to = NULL)`

4. **Producto desapareció del scrape de hoy pero tiene registro vigente y ya pasaron 3+ días sin verlo** → `UPDATE price_history SET valid_to = last_seen_at::date WHERE retailer_id = ? AND ean = ? AND valid_to IS NULL`. Marca el fin de vigencia sin crear fila nueva. (El threshold de 3 días es para tolerar que una categoría falle un día puntual, no marcar como "descontinuado" prematuramente).

### Campos relevantes para detectar cambio

Cambio en cualquiera de estos dispara nueva fila:

- `price`
- `list_price`
- `has_promo`
- `promo_description`
- `discount_highlight`
- `is_available`

Cambio en `last_seen_at` NO dispara nueva fila (es solo telemetría).

`discount_highlight` es relevante porque el string nombra el descuento **y su
vigencia** (`"...As14 al 20.7"`): que cambie la campaña sin moverse el número sigue
siendo un cambio de estado del precio, y sin esto la fila vigente iría quedando con
el nombre de una promo ya vencida. Mismo criterio que `promo_description`.

### `has_promo` es derivado, no observado

**`has_promo === (list_price > price)`. Es un invariante de toda fila que escribe el
scraper**, no una convención. Se calcula con `computeHasPromo` (`transform.ts`) dentro
de `load`, sobre los valores **ya redondeados que se están por escribir** — nunca en
`extract` sobre los crudos, o el redondeo podría hacer discrepar el flag de las
columnas que lo definen. Por eso `hasPromo` NO vive en `ExtractedSku`.

Ojo con el histórico: hasta el 15/07/2026 `has_promo` significaba `Teasers.length > 0`,
que es casi lo contrario (un teaser es un descuento de checkout **no** aplicado a
`price`). Daba 12.450 filas de Carrefour con `has_promo = true` y cero descuento, y 0
filas en Masonline pese a sus 2.518 productos con descuento real. Ver
`research/precios-descuento/HALLAZGOS.md` → P4.

### Manejo de transiciones de disponibilidad

`is_available` es un campo relevante: toda transición dispara nueva fila de vigencia. Qué precio se escribe depende de la dirección de la transición.

**Disponible → no disponible (`is_available: true → false`):** un producto no disponible no expone precio confiable (VTEX suele devolver `Price: 0`). La nueva fila arrastra el último precio conocido de la fila que se está cerrando:

- `price`: se arrastra el `price` de la fila vigente que estamos cerrando (último precio observable).
- `list_price`: idem, se arrastra.
- `has_promo`: **derivado de los precios arrastrados** (`list_price > price`), no `false`. Es función pura de dos columnas de la misma fila: hardcodearlo en `false` dejaría filas que se contradicen a sí mismas. Ver "`has_promo` es derivado, no observado".
- `promo_description`: `NULL`. A diferencia de los precios, la metadata de promo NO se arrastra: no la estamos observando, y arrastrarla afirmaría una promo vigente que no vimos. Un descuento sin metadata es normal (39% de los de Carrefour no traen ninguna).
- `discount_highlight`: `NULL`, por el mismo motivo.
- `is_available`: `false`.
- `valid_from`: today, `valid_to`: `NULL`.

**No disponible → disponible (`is_available: false → true`):** entra por el algoritmo normal. Como `is_available` cambió, siempre se crea nueva fila, sea el precio observado igual o distinto al arrastrado. `price` y `list_price` se toman del scrape actual; `has_promo` y `promo_description` también del scrape actual (nunca arrastrados).

### Casos edge

- **Primer avistaje sin precio observable:** si un SKU se ve por primera vez (no existe todavía en `retailer_products`) y viene con `IsAvailable: false` **o** con `Price <= 0`, se **skipea completo con warning**: NO se inserta en `products`, ni en `retailer_products`, ni en `price_history`. No hay precio real que registrar y no queremos ensuciar el dataset con ceros. **Invariante duro:** toda fila de `price_history` con `price > 0` refleja un precio real observado en algún momento — nunca se guarda `0`/basura. (Si el producto reaparece disponible en una corrida futura, ahí sí entra normalmente por el algoritmo.) El chequeo vive en `load`, que ya tiene precargado el set de EANs conocidos del retailer para distinguir "primer avistaje" de "producto ya conocido que hoy está no disponible" (este último SÍ se guarda, arrastrando el último precio conocido).

- **Retroactividad:** si `today` es igual a `valid_from` del registro vigente (es decir, el precio ya cambió más de una vez el mismo día), NO cerrar la fila vigente. Hacer UPDATE de esa misma fila con los nuevos valores. Evitamos filas con `valid_from = valid_to = today - 1` que no tienen sentido.

- **Reactivación:** si un producto tenía `valid_to` seteado (marcado como desaparecido) y vuelve a aparecer con el mismo precio, INSERT nuevo con `valid_from = today, valid_to = NULL`. No reabrir la fila vieja — la historia queda más clara así.

- **Timezone:** todas las comparaciones de fecha se hacen en zona horaria `America/Argentina/Buenos_Aires`. Postgres funciones: usar `(NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date` para obtener `today`.

### Query canónica para "precio actual"

```sql
SELECT price, list_price, has_promo
FROM price_history
WHERE retailer_id = $1 AND ean = $2 AND region_id = $3 AND valid_to IS NULL;
```

Con el índice parcial, esto es sub-milisegundo incluso con millones de filas históricas.

### Query canónica para "evolución de precio de un producto en una cadena"

```sql
SELECT valid_from, valid_to, price, has_promo
FROM price_history
WHERE retailer_id = $1 AND ean = $2
ORDER BY valid_from DESC;
```

---

## Nota sobre volatilidad de category_path

El campo `category_path` vive en la tabla `products` (única a nivel EAN, no por
retailer). Cuando el load procesa un producto que ya existía por otro retailer,
sobrescribe este campo — no hay COALESCE ni resolución de conflictos.
Consecuencia: la categoría de un producto en la DB refleja "el último retailer que
lo procesó", no un consenso ni el retailer que primero lo vio.

Ojo con el contraste: en el **mismo** `ON CONFLICT` de `load.ts`, `brand` y
`category_path` tienen semánticas opuestas y es fácil asumir mal por analogía.

```sql
ON CONFLICT (ean) DO UPDATE SET
  category_path = EXCLUDED.category_path,               -- último que escribe gana
  brand         = COALESCE(products.brand, EXCLUDED.brand),   -- primero que escribe gana
  image_url     = COALESCE(EXCLUDED.image_url, products.image_url),
  last_seen_at  = NOW()
```

Detectado durante el análisis de top-levels el 14/07/2026, cuando midiendo
compartidos entre las dos taxonomías dio "17 en ambas" contaminado. Recalculado
sobre productos exclusivos de cada cadena dio 1 top-level realmente compartido
(`Congelados`). Ver `docs/analysis/top-levels-2026-07-14.md`.

Impacto actual: bajo. Los filtros de UI funcionan porque siempre se filtra contra
el path efectivamente presente (`?category_top` incluido). Impacto potencial: si
en el futuro se hacen agregaciones o joins que asumen "categoría estable por
producto", esperar comportamiento inconsistente entre corridas del scraper. La
regla práctica para medir algo por cadena: hacerlo sobre productos **exclusivos**
de esa cadena, o el path matcheado te miente.

## Convenciones de código (obligatorias)

- **TypeScript estricto.** Nunca `any`. Si algo se resiste, es `unknown` con narrowing explícito.
- **Todo I/O externo (HTTP, DB) devuelve `Result<T, E>`** — nada de throws no capturados en el nivel de negocio. Podés usar un tipo simple `type Result<T, E> = { ok: true, value: T } | { ok: false, error: E }`. No metas librerías tipo `neverthrow` — es overkill.
- **Zod para todo lo que entra.** Las respuestas de VTEX pasan por `.safeParse()`. Si falla, se loguea con el payload crudo y se skipea el producto (no se cae el pipeline).
- **Idempotencia obligatoria en `load`.** Correr el scraper dos veces en el mismo día no debe crear duplicados ni pisar historial. Con el modelo de vigencias, la idempotencia se logra así: antes de decidir INSERT en `price_history`, siempre se compara contra la fila vigente (`valid_to IS NULL`). Si no hay cambios, no se escribe. Si hay cambios y `valid_from` de la fila vigente es igual a hoy, se hace UPDATE de esa misma fila (no se crea una nueva). Ver sección "Lógica de load para price_history" para el algoritmo completo.
- **Rate limiting cortés.** 3-4 requests simultáneos máximo, con jitter aleatorio de 100-300ms entre requests. Nunca hacer `Promise.all` sobre un array grande de requests.
- **User-Agent honesto:** `ComparadorPrecios/0.1 (+contacto@dominio)`. Nada de fingir ser Chrome.
- **Logging estructurado con contexto.** Cada log tiene al menos `{ retailer, category_id?, ean?, sku?, step }`. Errores con `err` incluyen stack.
- **Nombres en inglés en el código, mensajes al usuario en español.**
- **Sin comentarios obvios.** El código se explica solo. Comentarios solo para explicar el *por qué* de una decisión no evidente (ej: "VTEX capa en 2500, por eso subdividimos por marca").

---

## Anti-patterns (cosas que NUNCA hay que hacer)

1. **No parsear HTML.** Todo lo que necesitamos está en JSON. Si pensás en Cheerio, parás.
2. **No usar el endpoint `getPriceWithoutTax` GraphQL para discovery.** Solo sirve para refresh de precios, y ni siquiera lo usamos.
3. **No hardcodear IDs de categorías.** Se obtienen del árbol `/category/tree/`. La única constante hardcodeable es el `hostname` de cada retailer.
4. **No ignorar el cap de 2500 en la paginación.** Si `_from` llega a 2500 y todavía hay resultados, es que la categoría tiene más productos: hay que subdividir por brand.
5. **No hacer `Promise.all` sobre requests HTTP masivos.** Siempre por `p-limit` con concurrencia 3-4. VTEX no rate-limitea agresivo, pero somos correctos.
6. **No tirar productos con EAN duplicado dentro de la misma cadena.** Guardar el de mejor calidad (con `IsAvailable: true` y precio no nulo), pero loggear el conflicto como warning con ambos SKUs.
7. **No tirar productos sin EAN.** Loggearlos como warning con nombre y productId, saltear del pipeline principal. Podemos manejarlos en v2 (matching por fuzzy).
8. **No cambiar el esquema de DB sin migración.** Si necesitás un campo nuevo, se agrega una migración `003_...sql` (o el número que siga). Nunca editar `001_initial.sql` ni `002_seed_retailers.sql`. Especial atención al esquema de `price_history`: el modelo de vigencias es una decisión arquitectónica, no lo "simplifiques" a "una fila por día" aunque parezca más natural.
9. **No commitear `.env`.** El `.env.example` sí, con valores placeholder.
10. **No inventar endpoints VTEX que no estén en este documento.** Si necesitás algo distinto, preguntarle a Juan primero.
11. **No hacer INSERT ciego en `price_history`.** Toda escritura pasa por el algoritmo de la sección "Lógica de load para price_history". Si ves código que hace `INSERT INTO price_history` sin haber consultado antes la fila vigente, es un bug. Si querés "guardar el precio de hoy" y ya está guardado el mismo precio, la respuesta correcta es NO ESCRIBIR NADA.

12. **No comparar EANs sin normalizar.** Cualquier lógica que compare EANs entre retailers (matching, JOIN, dedup cross-retailer) opera sobre EANs ya normalizados por `normalizeEan` (ver descubrimiento 9). Si ves código que hace `ean === otherEan` con EANs crudos de fuentes distintas, es un bug: un mismo producto físico puede venir con o sin padding de ceros y el string-compare lo perdería.

13. **No consultar `price_history` ni `retailer_products` sin filtrar por región.** Toda query —del pipeline, de la API o de un script— filtra por `region_id`. Omitirlo no rompe hoy (hay una sola región cargada) y por eso es peligroso: rompe en silencio el día que se cargue la segunda, mezclando ofertas de dos ciudades como si fueran del mismo lugar. Mismo criterio que el punto 12 con los EANs sin normalizar.

---

## API HTTP (NestJS)

La API HTTP (Fase 3.A) vive en **el mismo repo** que el scraper: comparten DB, migrations, `src/lib/`, config y dependencias. Se deployan a targets distintos (scraper → GitHub Actions cron; API → servicio HTTP always-on). El contrato con los frontends (PWA Next.js, luego app Flutter) es **OpenAPI/JSON**, no código compartido.

### Stack decidido (no cambiar sin acuerdo)

- **Framework:** NestJS. Por madurez, `@nestjs/swagger` (OpenAPI auto-generado), y estructura de módulos/guards/interceptors/pipes para escalar superficie de endpoints.
- **Validación:** `nestjs-zod` (Zod, no `class-validator`). Consistencia con el pipeline, que ya usa Zod. Los DTOs son Zod schemas convertidos a class con `createZodDto`; el spec se limpia con `cleanupOpenApiDoc`.
- **Logging:** `nestjs-pino` (base `{ service: 'api' }`). Pretty en dev, JSON crudo en prod.
- **DB:** el **mismo driver `postgres` (porsager)** que el scraper. **Sin ORM.** `DatabaseModule` (global) expone el singleton de `src/lib/db.ts` como injectable vía token `PG_CONNECTION` (`@InjectPg()`). No se abre un segundo pool.

### Runtime: SWC, NO tsx

La API corre TS en runtime con **SWC** (`@swc-node/register`), no con `tsx`. **Por qué:** NestJS necesita metadata de decoradores emitida en tiempo de compilación (`emitDecoratorMetadata`) para su DI y para `nestjs-zod`. `tsx` usa `esbuild` internamente, que **no emite esa metadata** (limitación conocida y verificada empíricamente en Fase A: `design:paramtypes` sale `undefined` → la DI de Nest se rompe). SWC sí la emite. Sigue siendo **TS-at-runtime, sin `dist/`**, consistente con la premisa original de "sin build step". **Env var requerida:** `SWC_NODE_PROJECT=tsconfig.api.json` (apunta a SWC al tsconfig con decoradores; el default `tsconfig.json` los tiene apagados).

### Config asimétrica de TS

`tsconfig.api.json` extiende del base pero:
- **activa** `experimentalDecorators` y `emitDecoratorMetadata` (los necesita la DI de Nest y `nestjs-zod`);
- **desactiva** `verbatimModuleSyntax` (con `emitDecoratorMetadata`, los type-only imports usados en constructores NO deben elidirse, o la DI se rompe);
- **mantiene** `allowImportingTsExtensions` (heredado del base).

Dos ajustes de `include`/`exclude` que van juntos y no hay que "simplificar":
- El **base** (`tsconfig.json`) **excluye** `src/api` y `bin/serve-api.ts`. Si no, `pnpm typecheck` (que corre el base) tiparía los decoradores de la API sin `experimentalDecorators` y fallaría.
- `tsconfig.api.json` **re-declara** `include` (todo `src/**`, `bin/**`, `tests/**`) para no heredar ese exclude y así cubrir `src/api`.

Resultado: `pnpm typecheck` valida el scraper, `pnpm api:build` valida la API. Ambos deben quedar verdes.

**Convención de imports:** `.ts` explícita en **todo** el repo, incluido `src/api`. Es lo que exige `moduleResolution: NodeNext` (imports relativos sin extensión no resuelven) y es consistente con el scraper. *(Nota: el plan original de Fase 3.A anticipaba imports sin extensión al estilo NestJS; se descartó porque no resuelven bajo la config NodeNext del repo y desactivar `allowImportingTsExtensions` rompería los `.ts` compartidos del scraper.)*

### Estructura de módulos

```
src/api/
├── main.ts                 # createApp() (sin listen, para tests) + bootstrap()
├── app.module.ts           # LoggerModule, ThrottlerModule, DatabaseModule, APP_GUARD, APP_PIPE
├── config/
│   └── env.ts              # env de la API validado con Zod (API_PORT, CORS_ORIGINS, RATE_LIMIT_*)
├── common/
│   └── database/           # DatabaseModule global + token PG_CONNECTION + @InjectPg()
└── modules/
    ├── health/             # ✅ Fase A: GET /health (SELECT 1, 200 reachable / 503 down)
    ├── products/           # ✅ Fase B: listado, detalle, price-history, refresh, recent-changes
    ├── search/             # ✅ Fase C: GET /search
    ├── compare/            # ✅ Fase C: GET /compare, GET /compare/stats
    ├── categories/         # ✅ Fase D: GET /categories (cacheado)
    └── brands/             # ✅ Fase D: GET /brands (cacheado)
```

Entry point: `bin/serve-api.ts`. Scripts: `api:dev` (watch), `api:start`, `api:build` (typecheck con `tsc -p tsconfig.api.json`).

### Convenciones de endpoints

- **Paths:** kebab-case (`/price-history`).
- **Query params:** snake_case (`only_matched`, `sort_by`, `min_diff_pct`).
- **Response bodies:** camelCase en las keys de JS/JSON... **excepto** donde el contrato ya fijó snake_case (ej. `uptime_seconds` del health, `masonline_price`/`carrefour_price`/`diff_pct` del compare). Regla práctica: seguir el shape exacto acordado por endpoint en el prompt de la fase; no "normalizar" a mano.
- **Timezone:** fechas de presentación en `America/Argentina/Buenos_Aires`, no UTC crudo.
- **API sin writes de usuario en esta fase.** Cero endpoints CRUD sobre estado de usuario (favoritos, alertas, cuentas). Auth y writes de usuario vienen en **Fase 4**.
- **Endpoints que disparan el pipeline de scraping (refresh on-demand) sí son válidos y no requieren auth.** Son operaciones sobre datos del retailer, no sobre estado del usuario. Ejemplo: `POST /products/:ean/refresh` reusa `extract` + `transform` + `load` sobre un producto puntual, con TTL comunitario para gate el costo. Ver "Arquitectura de refresh de precios" en `docs/NEXT_SESSION.md`.
- **Puerto default de dev = `3100`, no `3000`** (el 3000 colisiona con frameworks frontend y, en la máquina de Juan, con un túnel SSH).

### Reglas de recent-changes

`GET /products/recent-changes` alimenta la home de la PWA ("Ofertas destacadas de
hoy"). Devuelve el **mismo envelope que `GET /products`** (`data` + `pagination`)
para que el frontend reuse el cliente tipado sin mapeo; `pagination.offset` es
siempre 0 (es un top-N, no una página).

- **Un producto "cambió de precio" solo si hay fila previa y el precio difiere.**
  No alcanza con tener una fila de `valid_from` reciente: un primer avistaje
  también estrena fila, y una fila nueva por promo/disponibilidad puede repetir
  precio. Se exige `prev.price > 0` y `cur.price <> prev.price`. Esto además
  descarta discontinuaciones (cierran `valid_to` sin abrir fila nueva).
- **Ventana temporal medida sobre `first_seen_at`, no `valid_from`.** `valid_from`
  es DATE sin resolución horaria; `first_seen_at` es TIMESTAMPTZ y captura cuándo
  la fila entró a nuestra observación. Para el caso de uso "cambios recientes
  desde nuestra perspectiva observacional" es la métrica correcta. Si en el futuro
  corremos múltiples scrapes por día y necesitamos distinguir "el precio cambió en
  el mundo real" vs "cuándo lo detectamos", revisitar.
- **Techos de outliers, configurables por env:** `RECENT_CHANGES_MAX_PRICE`
  (default 500000) descarta el producto si el precio vigente de **cualquier**
  cadena lo supera; `RECENT_CHANGES_MAX_DIFF_PCT` (default 200) descarta por
  |diff_pct| cross-retailer. No son cosmética: sin ellos se cuelan los casos de
  "Data quality signals conocidas" (Set Ilko $4.3M, packs con EAN de unidad) en
  el lugar donde el usuario espera ofertas. Un producto en una sola cadena no
  tiene diff que medir y pasa el segundo techo.
- **No invertir el driver de la query.** Ver el comentario en
  `products.repository.ts:recentChanges`: arrancar desde las filas vigentes en vez
  de las cerradas da el mismo resultado 13x más lento (1785ms vs 131ms).
- **El orden (magnitud de cambio DESC) no filtra por comparabilidad**, así que el
  top-N queda dominado por productos de una sola cadena. Es correcto: qué mostrar
  es responsabilidad del consumidor, no del endpoint. El frontend pasa
  `min_diff_pct=N` (que ya exige ambas cadenas) cuando quiere solo comparables.

**Nota operativa:** con la data actual del proyecto (batch diario, catálogo
iniciado 13/07/2026), la ventana temporal no ejerce filtro efectivo — todas las
filas caen dentro. El filtro efectivo viene de exigir una fila previa con precio
distinto. Cuando el proyecto acumule más historia, la ventana comenzará a filtrar
activamente.

### Reglas de productos similares

`GET /products/:ean/similar` alimenta la sección "productos similares" del pie de
la ficha de producto (Fase B4.3). Devuelve el **mismo envelope que
`GET /products`** para que el frontend reuse el cliente tipado; `pagination.offset`
es siempre 0 y **`pagination.total` es la cantidad devuelta**, no el total de
similares que existen — no hay paginación, así que no hay página siguiente que
ofrecer y contar el universo costaría una query extra para un número que nadie usa.

Un producto B es similar a A si cumple **todas**:

1. **Misma hoja de `category_path`** (último segmento).
2. `B.ean ≠ A.ean`.
3. B tiene ≥1 oferta vigente en la región (mismo predicado `hasActiveOffer` que
   los listados: nada de huérfanos regionales en una sección de recomendaciones).
4. **Si A tiene oferta vigente en una sola cadena, B también tiene que tenerla en
   esa cadena.** Con 0 (A es huérfano) o ≥2 cadenas, este filtro no aplica. La
   sección sugiere alternativas comprables en el mismo lugar; ofrecerle a alguien
   que mira un producto de Masonline un similar que solo está en Carrefour es
   mandarlo a otra góndola.

Orden: `MIN(list_price)` entre las ofertas vigentes de B, ASC, desempate por `ean`.
El desempate no es cosmético: sin él la elección entre precios iguales queda a
merced del plan y los similares bailan entre requests.

**El match es por hoja pelada, no por path completo.** `category_path` es volátil
(lo pisa el último retailer que procesó el producto, ver "Nota sobre volatilidad
de category_path") y las dos cadenas cuelgan la misma sub-categoría de
departamentos distintos: `Fernet` vive bajo `/Bebidas/` en una y bajo
`/Fernet Y Aperitivos/` en la otra. Matchear el path completo partiría en dos lo
que el usuario ve como una sola góndola. 74 hojas aparecen en más de un path;
ninguna con significados distintos. Corolario aceptado: **los similares pueden
variar entre corridas del scraper**, porque la hoja de un producto compartido
depende de qué cadena scrapeó última. No es fatal para una sección de
descubrimiento.

**Un path de un solo nivel no tiene hoja** y devuelve `data: []` con **200**, no
404 ni 500: `/Huevos/` es un departamento, no una sub-categoría, y devolver todo
el departamento no es la relación que se quiere. Son 15 productos del catálogo, de
la taxonomía plana de una de las cadenas. `category_path` NULL o vacío no existe
hoy (0 filas), pero el helper `categoryLeaf` lo cubre igual. Sólo un EAN
inexistente da 404.

**La marca "Genérico" no se excluye acá.** La regla de CLAUDE.md aplica a
comparaciones de precio cross-retailer (`/compare`, `recent-changes`); dos
productos Genérico de la misma sub-categoría son perfectamente sustituibles.

**Costo:** ~65ms la query (~118ms el request completo, que hace además el fetch del
producto original). El pre-filtro `LIKE '%/Hoja/'` sobre el `regexp_replace` es lo
que la baja de ~135ms: es redundante en semántica pero evita correr el regexp
sobre las 39k filas de `products`. Sin índice ni columna precomputada; si el
catálogo crece mucho, la salida es un índice de expresión sobre la hoja.

### Anti-patterns de la API (además de los generales)

1. **No inventar endpoints fuera de la lista de la fase.** Si aparece "sería útil también...", se para y se consulta. Superficie mínima que responde al MVP.
2. **No usar ORMs** (TypeORM, Prisma, MikroORM, Drizzle). El driver `postgres` compartido es la única fuente de acceso a DB.
3. **No exponer detalle de implementación en responses.** Los tipos de respuesta son un contrato para consumidores, no un mirror de tablas. Ej: `retailer_products.sku_id_retailer` es interno, no va en la respuesta.
4. **No hacer queries N+1.** Combinar datos de varias tablas es UN join o UNA subquery, no N queries en loop. Monitor: si un request dispara 20 queries en los logs, es bug.

### Testing conventions

- Integration tests únicamente (no unit). El framework es Vitest + supertest.
- Los tests corren contra la DB real de Supabase, cero mocks.
- Un test file por módulo en `tests/api/`.
- Tests cubren happy paths + casos sutiles conocidos (normalización EAN, TTL comunitario, exclusión Genérico, tolerancia de tie 1%, bucketing de diff).
- El TTL comunitario del refresh se controla vía env var `REFRESH_TTL_SECONDS` para poder bajarlo en el suite de tests.
- Ejecutar: `pnpm test:api`.

### Estado

**Fase 3.A completa (14/07/2026). API lista para deploy.** 11 endpoints, 49 tests
de integración, OpenAPI spec pulida, Docker image ~377MB (node:20-alpine, runtime
SWC sin build step; el objetivo de <300MB no se alcanza sin abandonar SWC-at-runtime,
así que se mantuvo la arquitectura de Fase A). Falta elegir target de deploy
(decisión abierta #7) y consumir desde la PWA (Fase 3.B).

`GET /products/recent-changes` (14/07/2026) se agregó después del cierre de 3.A,
pedido por la home de la PWA. Ver "Reglas de recent-changes" abajo.

`GET /products/:ean/similar` (21/07/2026, Fase B4.3) se agregó para la sección de
productos similares del pie de la ficha. El frontend lo consume en una fase
aparte. Ver "Reglas de productos similares" abajo.

---

## Roadmap

**Fase 1 — MVP Scraper Masonline** *(sesión actual)*
- Setup del proyecto
- Schema SQL + migrations
- Cliente HTTP VTEX genérico con retry y rate limit
- Zod schemas de respuestas VTEX
- Scraper Masonline end-to-end
- CLI runner
- Criterio de éxito: `pnpm scrape --retailer=masonline` corre y llena la DB con todos los productos y sus precios vigentes sin errores. Corrido dos veces seguidas el mismo día, la segunda corrida debe hacer cero INSERTs en `price_history` (verificable comparando `SELECT COUNT(*) FROM price_history` antes y después). Idempotencia real, no solo "no crashea".

**Fase 2 — Carrefour + primer análisis**
- Scraper Carrefour reusando el 90% de la infra
- Query cruzada (modelo de vigencias, precio actual = `valid_to IS NULL`):
  ```sql
  SELECT
    p.ean,
    p.name_canonical,
    m.price AS masonline_price,
    c.price AS carrefour_price,
    ROUND(((c.price - m.price) / m.price * 100)::numeric, 2) AS diff_pct
  FROM products p
  JOIN price_history m ON m.ean = p.ean AND m.retailer_id = (SELECT id FROM retailers WHERE slug = 'masonline') AND m.valid_to IS NULL AND m.is_available
  JOIN price_history c ON c.ean = p.ean AND c.retailer_id = (SELECT id FROM retailers WHERE slug = 'carrefour') AND c.valid_to IS NULL AND c.is_available
  ORDER BY diff_pct DESC;
  ```
- Reporte inicial: cuántos productos matchean por EAN, distribución de diferencias de precio.

**Fase 3 — Frontend web**
- Next.js 15 (App Router) + Supabase client + Tailwind
- Vista de productos con precios de ambas cadenas ordenables por diferencia
- Ficha individual de producto con gráfico histórico
- Búsqueda por nombre y filtro por categoría

**Fase 4+ — Más cadenas, más features**
- Coto, Día, Jumbo (todos son VTEX o similar)
- Matching de marca propia con embeddings (Voyage AI o OpenAI)
- Multi-sucursal via `bindingId`
- Alertas de bajada de precio por email/Telegram
- API pública

---

## Decisiones abiertas (que requieren consulta a Juan antes de codear)

Estas son decisiones que **NO** debe tomar Claude Code solo. Si el trabajo requiere resolverlas, hay que preguntar:

1. **Frontend framework definitivo.** Se planea Next.js pero puede ser Tauri desktop o incluso ambas.
2. **Manejo de multi-sucursal (bindingId).** Postponed a v2. Por ahora usamos el binding default de cada retailer (el que devuelve el servidor sin parámetros).
3. **Cadena de scraping para Carrefour.** No hemos verificado el árbol de categorías todavía. Sesión 2 arranca con exploración.
4. **Dónde correr los cronjobs.** Decidido en post-Fase 2: **GitHub Actions** con schedule diario. Motivos: gratis, versionado con el código, notificación por email automática al owner en fallos, no requiere infra propia. Alternativas descartadas por complejidad (VPS propio, Supabase edge functions con time triggers). Se revisita solo si GitHub Actions da problemas de rate-limiting con VTEX (los runners están en US-East).
5. **Estrategia de bloqueos futuros.** Si Carrefour empieza a bloquear con Cloudflare, se evalúa proxies residenciales. No es problema hoy.
6. **Estrategia de outliers en el frontend/app.** En Fase 3 hay que implementar `suspicion_score` calculado por producto matcheado (reglas: `diff_pct > 200%`, `precio absoluto > $500k`, mismatch de palabras clave pack/unidad). Por default, ocultar `suspicion_score` alto; toggle para power users.
7. **Target de deploy de la API.** ~~Fly.io vs Railway vs Render.~~ **CERRADA 14/07/2026: Fly.io, región `gru`** (São Paulo, la más cercana a AR). El Dockerfile multi-stage quedó listo en Fase E de 3.A. Falta ejecutar el deploy; envs mínimas en `docs/API.md`.
8. **Índices adicionales para la API.** Si Fase B (Products) revela queries frecuentes sin índice (especialmente `only_matched` con JOIN a `price_history` de ambos retailers), se agrega migración `006_indices_for_api.sql`. Postponed hasta ver el patrón real de queries con `EXPLAIN ANALYZE`.

---

## Data quality signals conocidas

Estas son características de la data cruda que retailers publican, que impactan el matching pero **NO son bugs nuestros**. Se manejan con flags en el reporte cross-retailer y filtros en el frontend, no con limpieza retroactiva.

- **Mismo EAN reutilizado para unidad vs pack.** Ejemplo Carrefour Fase 2: EANs de "Genérico" (vasos, copas) donde el retailer usa el mismo código para el producto individual y para el pack de 12. Diferencia de precio 10-15x. Detección: `diff_pct > 500%` es señal fuerte de pack mismatch.
- **Precios extremos ocasionales del retailer.** Ejemplo Masonline: Set Tarteras Ilko cargado a $4.3M (verificado como data real del retailer, no bug de parseo). El sistema NO modifica estos precios; los flaggea en el reporte cross-retailer con `suspicion_score`.
- **Marca "Genérico" no comparable cross-retailer.** Cada cadena usa el catchall distinto. Los productos con `brand = 'Genérico'` se scrapean y persisten normalmente, pero se excluyen del reporte cross-retailer por default.

Regla de oro: **nunca modificar precios crudos scrapeados.** El comparador es fiel al retailer; los outliers se señalizan, no se "corrigen".

---

## Cómo trabajar con Juan

- **Juan es el arquitecto.** Vos ejecutás las decisiones ya tomadas. Si detectás un error técnico concreto (bug lógico, race condition, security issue), lo señalás con evidencia. No cuestiones decisiones de stack o arquitectura salvo que tengas un caso muy fuerte.
- **Preguntá antes de asumir.** Si un requerimiento no está en este archivo y no es obvio, preguntá. Mejor una pregunta corta que una hora de código en la dirección equivocada.
- **Trabajá en pasos verificables.** Después de cada milestone (setup, schema, cliente HTTP, scraper end-to-end), pausá y mostrá lo que hiciste. No hagas una PR gigante de 15 archivos sin checkpoint.
- **Smoke test antes de correr en volumen.** Antes del primer scraping full, probá con una categoría chica (~10 productos) end-to-end. Verificá la DB manualmente. Recién ahí corré full.
- **Idioma:** conversación en español rioplatense. Código, nombres de variables, mensajes de log, commits en inglés.
