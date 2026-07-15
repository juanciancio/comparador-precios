# Distribución de departamentos top-level — 2026-07-14

> Snapshot generado el 14/07/2026 sobre `products` (34.426 productos con
> `category_path`, 0 con NULL). Fuente de la decisión de agregar `?category_top`
> al endpoint `/products`. Regenerable con la query de abajo — no se mantiene
> actualizado a mano.

```sql
SELECT split_part(category_path, '/', 2) AS top_level,
       COUNT(*)::int AS total_products,
       COUNT(DISTINCT category_path)::int AS distinct_paths
FROM products
WHERE category_path IS NOT NULL AND split_part(category_path, '/', 2) <> ''
GROUP BY 1
ORDER BY total_products DESC, top_level ASC;
```

**117 departamentos top-level** distintos.

| top_level | total_products | distinct_paths |
| --- | ---: | ---: |
| Hogar | 5217 | 40 |
| Electro y tecnología | 4393 | 65 |
| Juguetería y Librería | 2119 | 26 |
| Perfumería y farmacia | 2112 | 44 |
| Desayuno y merienda | 2007 | 30 |
| Almacén | 1837 | 41 |
| Bebidas | 1623 | 29 |
| Aire Libre y Ocio | 1295 | 25 |
| Limpieza | 1277 | 31 |
| Indumentaria | 1151 | 25 |
| Bazar y Cocina | 1046 | 66 |
| Lácteos y productos frescos | 921 | 23 |
| Jugueteria | 526 | 25 |
| Mundo Bebé | 501 | 15 |
| Mascotas | 462 | 10 |
| Congelados | 412 | 24 |
| Automotor | 388 | 9 |
| Librería y Arte | 307 | 32 |
| Desayunos Y Meriendas | 295 | 41 |
| Cuidado Del Cabello | 278 | 15 |
| Panadería | 277 | 8 |
| Accesorios De Limpieza | 241 | 13 |
| Kiosco | 235 | 14 |
| Niños | 234 | 10 |
| Herramientas, Pinturería y Refacciones | 222 | 24 |
| Frutas y verduras | 218 | 4 |
| Cuidado Personal | 212 | 15 |
| Limpieza Automotor | 199 | 5 |
| Carnes y pescados | 154 | 7 |
| Cuidado De La Piel | 151 | 20 |
| Maquillaje | 150 | 17 |
| Vinos Y Espumantes | 140 | 26 |
| Organización | 135 | 15 |
| Accesorios para Auto | 128 | 3 |
| Hombres | 128 | 7 |
| Fragancias | 126 | 8 |
| Mujer | 110 | 3 |
| Lácteos | 108 | 20 |
| Patio y Jardín | 103 | 23 |
| Nutricion | 102 | 1 |
| Arroz, Legumbres Y Pastas | 99 | 18 |
| Dermocosmetica | 97 | 17 |
| Cuidado Oral | 94 | 4 |
| Conservas Y Enlatados | 89 | 12 |
| Jugos | 77 | 4 |
| Perros | 76 | 12 |
| Pañales e Higiene | 75 | 15 |
| Audio | 73 | 7 |
| Deportes | 72 | 17 |
| Pequeños electrodomésticos | 69 | 23 |
| Cotillón | 66 | 4 |
| Carnicería | 65 | 7 |
| Papeles, Bolsas Y Films | 65 | 9 |
| Aceites, Vinagres Y Aderezos | 61 | 13 |
| Decoración | 61 | 7 |
| Farmacia | 61 | 2 |
| Celulares y Telefonía | 60 | 7 |
| Lubricantes, Filtros y Aditivos | 59 | 4 |
| Snacks | 59 | 7 |
| Ropa | 58 | 7 |
| Cuidado Del Adulto | 55 | 4 |
| Alfombras y fundas | 54 | 3 |
| Condimentos Y Especias | 53 | 4 |
| Pisos Y Muebles | 49 | 7 |
| Seguridad Automotor | 48 | 4 |
| Aguas | 46 | 4 |
| Marroquinería y Accesorios | 45 | 5 |
| Navidad | 45 | 3 |
| Protección Femenina | 45 | 4 |
| Quesos | 42 | 10 |
| Verduras | 41 | 9 |
| Climatización | 38 | 6 |
| Lactancia Y Alimentación | 36 | 8 |
| Gaseosas | 35 | 6 |
| Muebles | 35 | 6 |
| Dormitorio | 34 | 6 |
| Lavado de la Ropa | 33 | 7 |
| Panificados | 33 | 10 |
| Baterias e Iluminación | 32 | 4 |
| Gatos | 32 | 7 |
| Reposteria | 32 | 5 |
| Informática | 31 | 11 |
| Desodorante De Ambientes | 30 | 5 |
| Cocina | 29 | 6 |
| Electro Belleza | 28 | 7 |
| Baño | 27 | 4 |
| Cervezas | 27 | 8 |
| Insecticidas | 27 | 4 |
| TV y Video | 27 | 4 |
| Bebidas Blancas, Licores Y Whiskys | 24 | 5 |
| Camping | 23 | 6 |
| Fiambres Y Embutidos | 23 | 8 |
| Panaderia | 22 | 10 |
| Limpieza de Baño | 21 | 3 |
| Neumáticos | 21 | 2 |
| Pastas Y Tapas | 19 | 3 |
| Cocinas, Hornos y Extractores | 17 | 4 |
| Fernet Y Aperitivos | 17 | 3 |
| Lavandinas | 16 | 2 |
| Pescaderia | 16 | 4 |
| Bebés | 15 | 5 |
| Caldos, Sopas Y Pure | 14 | 3 |
| Viaje | 14 | 5 |
| Frutas | 13 | 2 |
| Motos | 13 | 1 |
| Harinas | 10 | 4 |
| A Base De Hierbas | 9 | 1 |
| Gaming | 8 | 3 |
| Herramientas Automotor | 8 | 1 |
| Huevos | 7 | 1 |
| Bebidas Isotonicas Y Energizantes | 6 | 1 |
| Calefones y Termotanques | 6 | 3 |
| Heladeras y Freezers | 6 | 4 |
| Limpieza del Hogar | 6 | 5 |
| Calzado | 5 | 2 |
| Cuidado De La Mamá | 1 | 1 |
| Paseo Y Viaje | 1 | 1 |

## Dos taxonomías conviviendo

El catálogo unificado no tiene una taxonomía sino dos, una por cadena, y no se
mezclan: **Carrefour aporta 18 top-levels en sentence case** (mayúscula inicial y
conectores en minúscula: `Perfumería y farmacia`, `Lácteos y productos frescos`),
mientras **Masonline aporta 100, predominantemente en Title Case** (conectores
capitalizados: `Desayunos Y Meriendas`, `Accesorios De Limpieza`). Suman 118
contra 117 distintos porque comparten exactamente uno: `Congelados`. Masonline
además es internamente inconsistente — convive `Pisos Y Muebles` con
`Limpieza de Baño`. La implicancia práctica es que **el nombre del top-level no es
un enum estable ni comparable cross-retailer**: es la etiqueta cruda del
departamento de cada cadena, y filtrar por él filtra dentro de una taxonomía, no
sobre un concepto unificado.

## Substring collisions: por qué `?category=` no alcanza

`?category=` hace `ILIKE '%valor%'` sobre el path completo, así que un top-level
cuyo nombre está contenido en otro top-level arrastra falsos positivos.
**13 de los 117 top-levels colisionan** de esta forma: `Hogar`, `Bebidas`,
`Limpieza`, `Automotor`, `Lácteos`, `Farmacia`, `Ropa`, `Verduras`, `Muebles`,
`Cocina`, `Baño`, `Viaje` y `Frutas` (20 pares en total; `Limpieza` sola está
contenida en 4 top-levels distintos).

El peor caso es `Limpieza`: `?category=Limpieza` trae 867 productos que **no** son
del departamento `/Limpieza/` — se cuelan `/Accesorios De Limpieza/`,
`/Limpieza Automotor/`, `/Limpieza de Baño/` y `/Limpieza del Hogar/`. Contando
cualquier path que matchee el substring (no solo otro top-level), 56 de los 117
tienen al menos un falso positivo.

`?category_top=` matchea exacto contra `split_part(category_path, '/', 2)` y
resuelve las 13.
