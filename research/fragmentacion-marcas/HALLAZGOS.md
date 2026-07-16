# Investigación: fragmentación de marcas por acento / caso / puntuación

**Fecha:** 16/07/2026
**Alcance:** tabla `products`, columna `brand`. Análisis en memoria, no implementación.
**Disparador:** el fix de `unaccent` en `/search/facets` (commit `1dfa2f5`) destapó que
tipear "generico" muestra dos entradas separadas en el sidebar: `Genérico` (2.314) y
`Generico` (1.314). Son la misma marca escrita distinto. La deuda técnica documentaba
"116 pares de fragmentación"; había que ver los datos reales de hoy.

**Regla de scope:** nada se persistió. Cero cambios a schema, columnas o endpoints. La
normalización se aplicó solo en memoria (TypeScript) para reportar qué pasaría.

---

## 1. Resumen ejecutivo

1. **Hay 2.752 marcas distintas hoy. Con normalización estándar colapsan en 2.631
   grupos canónicos:** 119 grupos fragmentados que absorben 240 formas crudas. El
   orden de magnitud coincide con los "116 pares" documentados históricamente — la
   deuda técnica sigue vigente y con tamaño estable.
2. **El reparto por tipo de variación es parejo en cantidad de grupos:** 43 acento,
   38 caso, 38 puntuación. **Cero grupos "mezcla":** cada grupo fragmentado difiere en
   una sola dimensión. Esto simplifica la solución — no hay que resolver combinaciones.
3. **Por volumen de productos, un solo grupo domina todo:** `Genérico`/`Generico` son
   3.628 de los 5.759 productos afectados (63%). Sacando ese caso, quedan ~2.100
   productos repartidos parejo en 118 grupos chicos (mediana ~5 productos por grupo).
   **La solución es de "long tail": el 80% del beneficio de usuario está en fusionar
   ~15 grupos** (Genérico, Aston, Oxford, ATMA, BGH, Ayudín, Águila, Dermaglós...).
4. **La hipótesis "todo grupo fragmentado es la misma marca, fusión automática segura"
   se sostiene en 118 de 119 grupos.** Los 29 grupos que un detector ingenuo marca como
   "categorías disjuntas" son **falsos positivos**: son la misma marca, y las
   categorías difieren solo porque `category_path` refleja la taxonomía del último
   retailer que procesó el producto (`Jugueteria` de Masonline vs `Juguetería y
   Librería` de Carrefour; `Lácteos` vs `Lácteos y productos frescos`). Los nombres
   de producto confirman marca idéntica en los 29.
5. **Hay exactamente UN caso que rompe la hipótesis:** el grupo `Boss` fusiona dos
   empresas distintas que difieren solo por caso — **`Boss`** (Hugo Boss, perfume:
   "Perfume De Hombre Boss Signature Prive") vs **`BOSS`** (BOSS Audio Systems,
   autoestéreo: "Autoestéreo Combo BOSS Systems 628BCK"). Una fusión 100% automática
   los uniría mal. **Es 1 de 119 (0,8%), pero prueba que "case-folding" no es
   incondicionalmente seguro.**

---

## 2. Metodología

Todo el análisis vive en `research/fragmentacion-marcas/scripts/`:
- `00-probe.ts` — sanity check (marcas distintas, nulls, `unaccent` instalado).
- `01-analyze.ts` — agrupa las 2.752 marcas bajo 3 niveles de normalización, clasifica
  el tipo de variación de cada grupo y vuelca `dumps/fragmented-n3.json`.
- `02-report.ts` — imprime top-20 por impacto y los grupos con categorías disjuntas.
- `03-table.ts` — genera `dumps/tabla-grupos.md` (los 119 grupos completos).

### Función de normalización experimental

Se probaron tres niveles incrementales. `unaccent` se replica en JS con
`normalize('NFD')` + strip de marcas diacríticas combinantes (equivale a `unaccent` de
Postgres, y colapsa `ñ`→`n`, `é`→`e`, etc.):

| Nivel | Fórmula | Qué colapsa |
|---|---|---|
| **N1** | `lower(trim(unaccent(brand)))` | acento + caso |
| **N2** | N1 + colapsar runs de espacios internos | + espacios redundantes |
| **N3** | N2 + strip de todo carácter no alfanumérico | + puntuación (`-`, `.`, `'`, `´`) |

### Resultado por nivel

| Nivel | Grupos totales | Grupos fragmentados | Formas crudas que colapsan |
|---|---|---|---|
| N1 (lower+trim+unaccent) | 2.670 | 82 | 164 |
| N2 (+colapso espacios) | 2.670 | 82 | 164 |
| **N3 (+strip puntuación)** | 2.631 | **119** | **240** |

Lecturas:
- **N2 no aporta nada sobre N1** (0 grupos extra): no hay marcas que difieran solo por
  espacios internos dobles. `trim` + `lower` ya cubren el whitespace de borde.
- **N3 agrega 37 grupos** sobre N1: son los casos de puntuación (`Oral B`/`Oral-B`,
  `Johnson´s`/`Johnson's`, `Pet's Class`/`Pets Class`, `Ga.Ma`/`Gama`).

### Clasificación de variación

Para cada grupo se compara el set de formas crudas a normalizaciones progresivas: si
difieren en crudo pero coinciden al bajar a minúscula → **caso**; si difieren en
minúscula pero coinciden al quitar acentos → **acento**; si difieren con acento pero
coinciden al quitar puntuación/espacios → **puntuación**; si contribuye más de una
dimensión → **mezcla**. Ningún grupo cayó en "mezcla".

### Supuestos y límites
- **`category_path` es ruidoso por diseño.** Documentado en CLAUDE.md: es único por EAN
  y lo pisa el último retailer que procesa el producto. Por eso "categorías disjuntas"
  entre miembros de un grupo **no** implica marcas distintas — hay que mirar los
  nombres de producto, que sí lo hice manualmente para los 29 casos.
- Solo se miró `brand` en `products`. No se investigó fragmentación en nombres de
  producto ni categorías (fuera de scope explícito).
- El análisis es sobre las 2.752 marcas presentes hoy. Marcas nuevas pueden introducir
  formas nuevas; la solución debe ser una función viva, no un mapeo estático.

---

## 3. Hallazgos por pregunta

### P1 — ¿Cuántos pares de fragmentación y de qué tipo?

- **Marcas distintas hoy (sin normalizar):** 2.752 (0 nulls, sobre 35.269 productos).
- **Grupos canónicos tras N3:** 2.631.
- **Diferencia:** 240 formas crudas colapsan en 119 grupos canónicos → 121 marcas
  "de más" que son duplicados de forma. (Con N1, sin tocar puntuación: 164 formas en
  82 grupos.)

La cifra histórica de "116 pares" encaja: está entre los 82 grupos de N1 y los 119 de
N3. Casi todos los grupos son **pares** (2 formas); hay unos pocos tríos (`Villa D Agri`
/ `Villa D´agri` / `Villa Dagri`; `Koh-I-Noor` / `KOH-I-NOOR` / `Kohinoor`).

### P2 — Distribución interna por tipo de variación

| Variación | Grupos | Productos | Ejemplos |
|---|---|---|---|
| **Acento** | 43 | 4.308 | `Genérico`/`Generico`, `Águila`/`Aguila`, `Nestlé`/`Nestle`, `Tresemmé`/`Tresemme`, `Ayudín`/`Ayudin`, `Ñuke`/`Nuke` |
| **Caso** | 38 | 957 | `Aston`/`ASTON`, `Oxford`/`OXFORD`, `ATMA`/`Atma`, `BGH`/`Bgh`, `LG`/`Lg`, `NADIR`/`Nadir` |
| **Puntuación** | 38 | 494 | `Oral B`/`Oral-B`, `Johnson´s Baby`/`Johnson's Baby`, `Pet's Class`/`Pets Class`, `Ga.Ma`/`Gama`, `Smart Life`/`Smartlife` |
| **Mezcla** | 0 | 0 | — |

Los 4.308 productos de "acento" están inflados por el grupo `Genérico` (3.628). Sin
ese outlier, acento cae a 680 productos y el reparto por **volumen** también se empareja
con caso (957) y puntuación (494). En **cantidad de grupos** ya es parejo de entrada.

### P3 — Impacto en productos

**Top 20 grupos por productos afectados:**

| Grupo | Miembros (conteo) | Var. | Prod. | Split |
|---|---|---|---|---|
| `Genérico` | Genérico (2314) + Generico (1314) | acento | 3628 | 64/36 |
| `Aston` | Aston (184) + ASTON (11) | caso | 195 | 94/6 |
| `Oxford` | Oxford (172) + OXFORD (5) | caso | 177 | 97/3 |
| `ATMA` | ATMA (92) + Atma (20) | caso | 112 | 82/18 |
| `BGH` | BGH (46) + Bgh (17) | caso | 63 | 73/27 |
| `Ayudin` | Ayudin (39) + Ayudín (22) | acento | 61 | 64/36 |
| `Pets Class` | Pets Class (39) + Pet's Class (16) | punt | 55 | 71/29 |
| `Aguila` | Aguila (42) + Águila (7) | acento | 49 | 86/14 |
| `Dermaglos` | Dermaglos (41) + Dermaglós (6) | acento | 47 | 87/13 |
| `La Gauchita` | La Gauchita (32) + La gauchita (13) | caso | 45 | 71/29 |
| `Nuke` | Nuke (42) + Ñuke (2) | acento | 44 | 95/5 |
| `Smart Life` | Smart Life (20) + Smartlife (20) | punt | 40 | 50/50 |
| `Pelikan` | Pelikan (38) + PELIKAN (1) | caso | 39 | 97/3 |
| `Tresemme` | Tresemme (29) + Tresemmé (9) | acento | 38 | 76/24 |
| `Johnson´s Baby` | Johnson´s Baby (25) + Johnson's Baby (13) | punt | 38 | 66/34 |
| `LG` | LG (31) + Lg (6) | caso | 37 | 84/16 |
| `Nestle` | Nestle (30) + Nestlé (6) | acento | 36 | 83/17 |
| `San Remo` | San Remo (32) + Sanremo (3) | punt | 35 | 91/9 |
| `Gama` | Gama (24) + Ga.Ma (11) | punt | 35 | 69/31 |
| `Levité` | Levité (22) + Levite (12) | acento | 34 | 65/35 |

**Sobre el reparto (skew):** es muy variable. Casos parejos (`Smart Life` 50/50,
`Genérico` 64/36, `Ayudín` 64/36) conviven con casos desbalanceadísimos (`Pelikan`
97/3, `Oxford` 97/3, `Aston` 94/6). El patrón típico del desbalance: una forma "buena"
mayoritaria + un puñado de productos con la variante (una tanda cargada distinto, a
veces por el otro retailer). **Implicancia para priorización:** el problema NO está
concentrado en 10 pares parejos — está en una cabeza (Genérico) + una cola larga. Pero
como el sidebar de facets muestra *cada forma como entrada separada*, hasta los grupos
de 2 productos ensucian la UX. La fusión conviene hacerla completa, no solo del top-N.

### P4 — Casos raros o dudosos (el hallazgo que desafía la hipótesis)

Se revisaron manualmente los **30 grupos** que un detector de "categorías disjuntas"
marca como sospechosos. Resultado:

- **29 de 30 son falsos positivos por taxonomía.** Misma marca, mismo tipo de producto;
  las categorías difieren solo porque cada cadena nombra distinto su árbol y
  `category_path` guarda la del último retailer. Ejemplos:
  - `Suka` (Hogar) / `SUKA` (Bazar y Cocina) → ambos son bazar/cocina (canastos,
    cacerolas). Misma marca.
  - `Juliana` (Juguetería y Librería) / `JULIANA` (Jugueteria) → valijas de juguete.
  - `Gfast` (Electro y tecnología) / `GFAST` (Informática) → monitores. Misma marca.
  - `García` (Lácteos y productos frescos) / `Garcia` (Quesos) → ricota. Misma marca.
  - `Tío Nacho`, `Oral B`, `Purísima`, `Fisher Price`, `Directv`... todos idénticos.

- **1 de 30 es una colisión genuina de marcas distintas:**

  > **`Boss` 🔴** — `Boss` (1 producto, categoría Fragancias: *"Perfume De Hombre Boss
  > Signature Prive Eau De Parfum"* → **Hugo Boss**) vs `BOSS` (1 producto, categoría
  > Automotor: *"Autoestéreo Combo BOSS Systems 628BCK"* → **BOSS Audio Systems**). Son
  > dos empresas sin relación que difieren solo por caso. Una fusión case-insensitive
  > automática los uniría mal.

**Conclusión de P4:** la hipótesis "fusión automática" es correcta para el 99,2% de los
grupos, **pero no es incondicionalmente segura**. El caso `Boss` demuestra que
case-folding puro puede fusionar marcas legítimamente distintas. La solución necesita,
como mínimo, una lista chica de excepciones (o un paso de revisión manual antes de
confirmar fusiones), no un colapso ciego. No es un bloqueante — es un guardarraíl.

---

## 4. Lista completa de grupos fragmentados

Los 119 grupos ordenados por impacto. Flags: `🔴 marcas distintas` = colisión genuina
(solo `Boss`); `⚠️ taxonomía` = categorías disjuntas por artefacto de `category_path`
(misma marca, revisado, seguro fusionar). Regenerable con `scripts/03-table.ts` (el
dump `dumps/tabla-grupos.md` está gitignoreado por la convención `research/**/dumps/`).

| # | Forma canónica sugerida | Miembros (conteo) | Variación | Productos | Revisar |
|---|---|---|---|---|---|
| 1 | `Genérico` | `Genérico` (2314) + `Generico` (1314) | accent | 3628 |  |
| 2 | `Aston` | `Aston` (184) + `ASTON` (11) | case | 195 |  |
| 3 | `Oxford` | `Oxford` (172) + `OXFORD` (5) | case | 177 |  |
| 4 | `ATMA` | `ATMA` (92) + `Atma` (20) | case | 112 |  |
| 5 | `BGH` | `BGH` (46) + `Bgh` (17) | case | 63 |  |
| 6 | `Ayudin` | `Ayudin` (39) + `Ayudín` (22) | accent | 61 |  |
| 7 | `Pets Class` | `Pets Class` (39) + `Pet's Class` (16) | punct | 55 |  |
| 8 | `Aguila` | `Aguila` (42) + `Águila` (7) | accent | 49 |  |
| 9 | `Dermaglos` | `Dermaglos` (41) + `Dermaglós` (6) | accent | 47 |  |
| 10 | `La Gauchita` | `La Gauchita` (32) + `La gauchita` (13) | case | 45 |  |
| 11 | `Nuke` | `Nuke` (42) + `Ñuke` (2) | accent | 44 |  |
| 12 | `Smart Life` | `Smart Life` (20) + `Smartlife` (20) | punct | 40 |  |
| 13 | `Pelikan` | `Pelikan` (38) + `PELIKAN` (1) | case | 39 |  |
| 14 | `Tresemme` | `Tresemme` (29) + `Tresemmé` (9) | accent | 38 |  |
| 15 | `Johnson´s Baby` | `Johnson´s Baby` (25) + `Johnson's Baby` (13) | punct | 38 |  |
| 16 | `LG` | `LG` (31) + `Lg` (6) | case | 37 |  |
| 17 | `Nestle` | `Nestle` (30) + `Nestlé` (6) | accent | 36 |  |
| 18 | `San Remo` | `San Remo` (32) + `Sanremo` (3) | punct | 35 |  |
| 19 | `Gama` | `Gama` (24) + `Ga.Ma` (11) | punct | 35 |  |
| 20 | `Levité` | `Levité` (22) + `Levite` (12) | accent | 34 |  |
| 21 | `Tcl` | `Tcl` (17) + `TCL` (17) | case | 34 |  |
| 22 | `NADIR` | `NADIR` (20) + `Nadir` (11) | case | 31 |  |
| 23 | `Simonaggio` | `Simonaggio` (24) + `SIMONAGGIO` (5) | case | 29 |  |
| 24 | `Bc` | `Bc` (20) + `BC` (9) | case | 29 |  |
| 25 | `Mamá Cocina` | `Mamá Cocina` (17) + `Mama Cocina` (10) | accent | 27 |  |
| 26 | `Suka` | `Suka` (15) + `SUKA` (10) | case | 25 | ⚠️ taxonomía |
| 27 | `Nescafé` | `Nescafé` (17) + `Nescafe` (7) | accent | 24 |  |
| 28 | `Bel Gioco` | `Bel Gioco` (15) + `Belgioco` (8) | punct | 23 |  |
| 29 | `Asurín` | `Asurín` (19) + `Asurin` (3) | accent | 22 |  |
| 30 | `Yogurisimo` | `Yogurisimo` (20) + `Yogurísimo` (2) | accent | 22 |  |
| 31 | `Zafrán` | `Zafrán` (15) + `Zafran` (5) | accent | 20 |  |
| 32 | `América` | `América` (17) + `America` (3) | accent | 20 |  |
| 33 | `Tío Nacho` | `Tío Nacho` (17) + `Tio Nacho` (2) | accent | 19 | ⚠️ taxonomía |
| 34 | `DONA CLARA` | `DONA CLARA` (12) + `Doña Clara` (5) | accent | 17 |  |
| 35 | `Q-Soft` | `Q-Soft` (14) + `Q Soft` (3) | punct | 17 |  |
| 36 | `Loreal` | `Loreal` (11) + `L'Oréal` (5) | punct | 16 |  |
| 37 | `BBQ Grill` | `BBQ Grill` (15) + `BBQ-Grill` (1) | punct | 16 |  |
| 38 | `CBSé` | `CBSé` (12) + `Cbse` (4) | accent | 16 |  |
| 39 | `Véritas` | `Véritas` (10) + `Veritas` (5) | accent | 15 |  |
| 40 | `Dánica` | `Dánica` (8) + `Danica` (6) | accent | 14 |  |
| 41 | `Schär` | `Schär` (8) + `Schar` (6) | accent | 14 |  |
| 42 | `Oral B` | `Oral B` (13) + `Oral-B` (1) | punct | 14 | ⚠️ taxonomía |
| 43 | `Mani King` | `Mani King` (12) + `Maní King` (2) | accent | 14 |  |
| 44 | `Dr Lemon` | `Dr Lemon` (12) + `Dr. Lemon` (2) | punct | 14 |  |
| 45 | `Dr. Zoo` | `Dr. Zoo` (12) + `Dr Zoo` (2) | punct | 14 |  |
| 46 | `Mr. Músculo` | `Mr. Músculo` (7) + `Mr Musculo` (6) | punct | 13 |  |
| 47 | `Villa D Agri` | `Villa D Agri` (9) + `Villa D´agri` (3) + `Villa Dagri` (1) | punct | 13 |  |
| 48 | `7up` | `7up` (11) + `7 Up` (2) | punct | 13 |  |
| 49 | `Dada` | `Dada` (10) + `Dadá` (2) | accent | 12 |  |
| 50 | `St. Ives` | `St. Ives` (6) + `St Ives` (5) | punct | 11 |  |
| 51 | `Nutrifoods` | `Nutrifoods` (8) + `Nutri Foods` (3) | punct | 11 |  |
| 52 | `Querubín` | `Querubín` (9) + `Querubin` (2) | accent | 11 |  |
| 53 | `JULIANA` | `JULIANA` (9) + `Juliana` (2) | case | 11 | ⚠️ taxonomía |
| 54 | `TODDLER` | `TODDLER` (10) + `Toddler` (1) | case | 11 |  |
| 55 | `Maná` | `Maná` (6) + `Mana` (4) | accent | 10 |  |
| 56 | `Play School` | `Play School` (7) + `Playschool` (3) | punct | 10 |  |
| 57 | `Félix` | `Félix` (6) + `Felix` (4) | accent | 10 |  |
| 58 | `Johnson's` | `Johnson's` (7) + `Johnson´s` (3) | punct | 10 |  |
| 59 | `SRI SRI TATTVA` | `SRI SRI TATTVA` (8) + `Sri Sri Tattva` (1) | case | 9 |  |
| 60 | `New Toys` | `New Toys` (5) + `New Toy's` (3) | punct | 8 | ⚠️ taxonomía |
| 61 | `Mia Casa` | `Mia Casa` (5) + `MIA CASA` (3) | case | 8 |  |
| 62 | `KOH-I-NOOR` | `KOH-I-NOOR` (6) + `Kohinoor` (1) + `Koh-I-Noor` (1) | punct | 8 |  |
| 63 | `Cordero con Piel de Lobo` | `Cordero con Piel de Lobo` (4) + `Cordero con piel de Lobo` (4) | case | 8 |  |
| 64 | `Colón` | `Colón` (4) + `Colon` (4) | accent | 8 |  |
| 65 | `NUK` | `NUK` (4) + `Nuk` (4) | case | 8 |  |
| 66 | `Golocan` | `Golocan` (6) + `GoloCan` (2) | case | 8 |  |
| 67 | `Benjamin` | `Benjamin` (4) + `Benjamín` (4) | accent | 8 |  |
| 68 | `Fresh line` | `Fresh line` (4) + `Freshline` (4) | punct | 8 |  |
| 69 | `Colorín` | `Colorín` (4) + `Colorin` (3) | accent | 7 | ⚠️ taxonomía |
| 70 | `STAR COMPANY` | `STAR COMPANY` (6) + `Star Company` (1) | case | 7 |  |
| 71 | `Tulipan` | `Tulipan` (4) + `Tulipán` (3) | accent | 7 |  |
| 72 | `Auto Polish` | `Auto Polish` (6) + `Autopolish` (1) | punct | 7 |  |
| 73 | `ARM & Hammer` | `ARM & Hammer` (5) + `Arm & Hammer` (2) | case | 7 |  |
| 74 | `Playdoh` | `Playdoh` (6) + `Play Doh` (1) | punct | 7 |  |
| 75 | `Vimar` | `Vimar` (6) + `VIMAR` (1) | case | 7 | ⚠️ taxonomía |
| 76 | `Union` | `Union` (5) + `Unión` (2) | accent | 7 |  |
| 77 | `Vinas De Balbo` | `Vinas De Balbo` (3) + `Viñas De Balbo` (3) | accent | 6 |  |
| 78 | `Bimbi` | `Bimbi` (5) + `BIMBI` (1) | case | 6 | ⚠️ taxonomía |
| 79 | `RCA` | `RCA` (3) + `Rca` (3) | case | 6 |  |
| 80 | `Escorihuela Gascon` | `Escorihuela Gascon` (4) + `Escorihuela Gascón` (2) | accent | 6 |  |
| 81 | `Puyehué` | `Puyehué` (5) + `Puyehue` (1) | accent | 6 |  |
| 82 | `Dv Catena` | `Dv Catena` (4) + `D.V.Catena` (2) | punct | 6 |  |
| 83 | `Buy & Eat` | `Buy & Eat` (5) + `Buy Eat` (1) | punct | 6 |  |
| 84 | `King Food` | `King Food` (3) + `Kingfood` (2) | punct | 5 |  |
| 85 | `Gordons` | `Gordons` (4) + `Gordon's` (1) | punct | 5 |  |
| 86 | `Gfast` | `Gfast` (3) + `GFAST` (2) | case | 5 | ⚠️ taxonomía |
| 87 | `DRF` | `DRF` (3) + `D.R.F` (2) | punct | 5 |  |
| 88 | `Ena` | `Ena` (3) + `ENA` (2) | case | 5 |  |
| 89 | `Elmers` | `Elmers` (4) + `ELMERS` (1) | case | 5 | ⚠️ taxonomía |
| 90 | `Sazón` | `Sazón` (3) + `Sazon` (1) | accent | 4 |  |
| 91 | `Spider Man` | `Spider Man` (3) + `Spiderman` (1) | punct | 4 | ⚠️ taxonomía |
| 92 | `Post It` | `Post It` (3) + `Post-it` (1) | punct | 4 |  |
| 93 | `Purísima` | `Purísima` (3) + `Purisima` (1) | accent | 4 | ⚠️ taxonomía |
| 94 | `Espuna` | `Espuna` (3) + `Espuña` (1) | accent | 4 | ⚠️ taxonomía |
| 95 | `Ají No Moto` | `Ají No Moto` (3) + `Ajinomoto` (1) | punct | 4 |  |
| 96 | `Kit Kat` | `Kit Kat` (2) + `Kitkat` (2) | punct | 4 |  |
| 97 | `Delverde` | `Delverde` (3) + `Del Verde` (1) | punct | 4 |  |
| 98 | `BONALMA` | `BONALMA` (2) + `Bonalma` (2) | case | 4 | ⚠️ taxonomía |
| 99 | `GO SPEED` | `GO SPEED` (2) + `Go Speed` (1) | case | 3 | ⚠️ taxonomía |
| 100 | `PinyPon` | `PinyPon` (2) + `Pinypon` (1) | case | 3 | ⚠️ taxonomía |
| 101 | `Hermosura` | `Hermosura` (2) + `HERMOSURA` (1) | case | 3 | ⚠️ taxonomía |
| 102 | `Fisher Price` | `Fisher Price` (2) + `Fisher-Price` (1) | punct | 3 | ⚠️ taxonomía |
| 103 | `Directv` | `Directv` (2) + `DirecTV` (1) | case | 3 | ⚠️ taxonomía |
| 104 | `García` | `García` (2) + `Garcia` (1) | accent | 3 | ⚠️ taxonomía |
| 105 | `Nugaton` | `Nugaton` (2) + `Nugatón` (1) | accent | 3 | ⚠️ taxonomía |
| 106 | `Tía María` | `Tía María` (2) + `Tia Maria` (1) | accent | 3 | ⚠️ taxonomía |
| 107 | `Cruz de Malta` | `Cruz de Malta` (2) + `Cruz De Malta` (1) | case | 3 |  |
| 108 | `Porto Bello` | `Porto Bello` (2) + `Portobello` (1) | punct | 3 | ⚠️ taxonomía |
| 109 | `3D` | `3D` (2) + `3d` (1) | case | 3 |  |
| 110 | `Par-nor` | `Par-nor` (2) + `PARNOR` (1) | punct | 3 | ⚠️ taxonomía |
| 111 | `GoloMiau` | `GoloMiau` (1) + `Golomiau` (1) | case | 2 | ⚠️ taxonomía |
| 112 | `Don Valentin` | `Don Valentin` (1) + `Don Valentín` (1) | accent | 2 | ⚠️ taxonomía |
| 113 | `Máximo` | `Máximo` (1) + `Maximo` (1) | accent | 2 |  |
| 114 | `Le Fit` | `Le Fit` (1) + `Le-Fit` (1) | punct | 2 | ⚠️ taxonomía |
| 115 | `Rincón Famoso` | `Rincón Famoso` (1) + `Rincon Famoso` (1) | accent | 2 |  |
| 116 | `Boss` | `Boss` (1) + `BOSS` (1) | case | 2 | 🔴 marcas distintas |
| 117 | `Spin Master` | `Spin Master` (1) + `SPIN MASTER` (1) | case | 2 | ⚠️ taxonomía |
| 118 | `Cada Día` | `Cada Día` (1) + `Cada Dia` (1) | accent | 2 |  |
| 119 | `K-Othrina` | `K-Othrina` (1) + `K-othrina` (1) | case | 2 | ⚠️ taxonomía |

> Nota sobre "forma canónica sugerida": el script elige la forma con más productos, que
> para grupos de puro caso a veces es el ALL-CAPS (`ATMA`, `BGH`, `NADIR`, `SIMONAGGIO`).
> Elegir la forma de *display* (Title Case vs mayúsculas reales de la marca) es decisión
> de diseño de la solución, fuera de este scope.

---

## 5. Recomendación de función de normalización

**Para la clave de agrupamiento/matching interno:** `lower(trim(unaccent(brand)))` (N1)
resuelve los dos tercios del problema por cantidad de grupos (81 de 119: acento + caso)
y es la más conservadora. Agregar strip de puntuación (N3) suma 38 grupos reales y
válidos (`Oral B`/`Oral-B`, `Johnson's`, `Pet's Class`, `Ga.Ma`) sin ningún falso
positivo observado en esta data. **Recomiendo N3 como clave de colapso**, con dos
salvedades:

1. **N3 es la CLAVE de agrupamiento, no la etiqueta de display.** `oralb` sirve para
   agrupar; al usuario se le muestra `Oral-B`. La función de normalización produce una
   clave canónica; hay que mantener por separado qué forma cruda se muestra (candidata
   natural: la de más productos, con posible override manual).

2. **El case-folding necesita una excepción para colisiones genuinas.** El caso `Boss`
   (Hugo Boss vs BOSS Audio) exige, o bien una allowlist de "no fusionar", o un paso de
   confirmación humana antes de aplicar fusiones. Es 1 caso hoy, pero marcas nuevas
   pueden traer más; la función debe ser fusión-*sugerida*, no fusión-*ciega*.

**Casos que ninguna función razonable resuelve bien:**
- **`Boss` / `BOSS`:** la única señal de que son distintos es semántica (perfume vs
  audio), no ortográfica. Ninguna normalización de string los separa; solo contexto de
  categoría/producto o curación manual.
- **`Villa D Agri` / `Villa D´agri` / `Villa Dagri`** y similares con apóstrofe: N3 los
  fusiona bien, pero muestran que la puntuación en marcas es ruido puro del retailer —
  refuerza usar N3 para la clave.

**Qué NO recomiendo:** normalización agresiva más allá de N3 (ej. quitar sufijos tipo
"Baby", stemming, colapsar espacios entre palabras como `SmartLife`→ya lo hace N3). El
riesgo de sobre-fusión supera el beneficio marginal.

> Fuera de scope de esta sesión: **dónde** se aplica esta función (endpoint, columna
> derivada, tabla de mapeo) y **cómo** se resuelve la forma de display. Eso es la sesión
> de diseño pendiente con Juan.
