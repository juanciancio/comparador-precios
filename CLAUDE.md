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
        Price: number,               // precio final que paga el cliente
        ListPrice: number,           // precio de lista (tachado)
        PriceWithoutDiscount: number,
        AvailableQuantity: number,
        IsAvailable: boolean,
        Teasers: Array<{ Name: string, ... }>   // promos activas
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
  sku_id_retailer      TEXT NOT NULL,       -- itemId en VTEX
  product_id_retailer  TEXT NOT NULL,       -- productId en VTEX
  product_url          TEXT,
  retailer_name        TEXT,                -- nombre como lo llama esta cadena
  is_available         BOOLEAN NOT NULL DEFAULT true,
  last_seen_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (retailer_id, ean)
);

CREATE INDEX idx_rp_sku ON retailer_products(retailer_id, sku_id_retailer);

-- Price history: una fila por CAMBIO de precio (modelo de vigencias)
CREATE TABLE price_history (
  retailer_id       SMALLINT NOT NULL REFERENCES retailers(id),
  ean               TEXT NOT NULL REFERENCES products(ean),
  valid_from        DATE NOT NULL,           -- primer día que rige este precio
  valid_to          DATE,                    -- último día vigente (NULL = precio actual)
  price             NUMERIC(12, 2) NOT NULL,
  list_price        NUMERIC(12, 2),
  has_promo         BOOLEAN NOT NULL DEFAULT false,
  promo_description TEXT,
  is_available      BOOLEAN NOT NULL,
  first_seen_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (retailer_id, ean, valid_from)
);

-- Índice parcial: acelera "cuál es el precio actual de X"
CREATE UNIQUE INDEX idx_ph_current
  ON price_history(retailer_id, ean)
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
- `is_available`

Cambio en `last_seen_at` NO dispara nueva fila (es solo telemetría).

### Manejo de transiciones de disponibilidad

`is_available` es un campo relevante: toda transición dispara nueva fila de vigencia. Qué precio se escribe depende de la dirección de la transición.

**Disponible → no disponible (`is_available: true → false`):** un producto no disponible no expone precio confiable (VTEX suele devolver `Price: 0`). La nueva fila arrastra el último precio conocido de la fila que se está cerrando:

- `price`: se arrastra el `price` de la fila vigente que estamos cerrando (último precio observable).
- `list_price`: idem, se arrastra.
- `has_promo`: `false` (un producto no disponible no tiene promo activa).
- `promo_description`: `NULL`.
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
WHERE retailer_id = $1 AND ean = $2 AND valid_to IS NULL;
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
    ├── products/           # ⏳ Fase B
    ├── search/             # ⏳ Fase C
    ├── compare/            # ⏳ Fase C
    ├── categories/         # ⏳ Fase D
    └── brands/             # ⏳ Fase D
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

**Fase 3.A completa (14/07/2026). API lista para deploy.** 10 endpoints, 39 tests
de integración, OpenAPI spec pulida, Docker image ~377MB (node:20-alpine, runtime
SWC sin build step; el objetivo de <300MB no se alcanza sin abandonar SWC-at-runtime,
así que se mantuvo la arquitectura de Fase A). Falta elegir target de deploy
(decisión abierta #7) y consumir desde la PWA (Fase 3.B).

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
7. **Target de deploy de la API.** Fly.io vs Railway vs Render. Pendiente para una sesión futura dedicada. El Dockerfile multi-stage queda listo en Fase E de 3.A.
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
