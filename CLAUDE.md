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
- **Retry:** implementado a mano en el cliente HTTP con backoff exponencial (100ms → 200ms → 400ms → 800ms → 1600ms, cap en 5 intentos).
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
4. **Dónde correr los cronjobs.** VPS propio, GitHub Actions, o cron de Supabase edge functions. Se decide en Fase 2.
5. **Estrategia de bloqueos futuros.** Si Carrefour empieza a bloquear con Cloudflare, se evalúa proxies residenciales. No es problema hoy.

---

## Cómo trabajar con Juan

- **Juan es el arquitecto.** Vos ejecutás las decisiones ya tomadas. Si detectás un error técnico concreto (bug lógico, race condition, security issue), lo señalás con evidencia. No cuestiones decisiones de stack o arquitectura salvo que tengas un caso muy fuerte.
- **Preguntá antes de asumir.** Si un requerimiento no está en este archivo y no es obvio, preguntá. Mejor una pregunta corta que una hora de código en la dirección equivocada.
- **Trabajá en pasos verificables.** Después de cada milestone (setup, schema, cliente HTTP, scraper end-to-end), pausá y mostrá lo que hiciste. No hagas una PR gigante de 15 archivos sin checkpoint.
- **Smoke test antes de correr en volumen.** Antes del primer scraping full, probá con una categoría chica (~10 productos) end-to-end. Verificá la DB manualmente. Recién ahí corré full.
- **Idioma:** conversación en español rioplatense. Código, nombres de variables, mensajes de log, commits en inglés.
