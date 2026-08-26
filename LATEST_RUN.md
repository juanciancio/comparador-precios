
> olavarria-comparador-precios@0.1.0 report /home/runner/work/comparador-precios/comparador-precios
> tsx bin/report.ts --cross-retailer


════════════════════════════════════════════════════════════════════════════
  REPORTE CRUZADO POR EAN — Masonline vs Carrefour
════════════════════════════════════════════════════════════════════════════

  TOTAL DE PRODUCTOS QUE MATCHEAN POR EAN: 2.975
  (ambas cadenas, precio vigente y disponible, price > 0)

──────────────────────────────────────────────────────────────────────────────
  DISTRIBUCIÓN DE DIFERENCIAS DE PRECIO (|diff %|)
──────────────────────────────────────────────────────────────────────────────
  < 5%       1.748 ( 58.8%) ████████████████████████████████████████
  5–10%        278 (  9.3%) ██████
  10–25%       324 ( 10.9%) ███████
  25–50%       512 ( 17.2%) ████████████
  ≥ 50%        113 (  3.8%) ███

──────────────────────────────────────────────────────────────────────────────
  ¿QUIÉN ES MÁS BARATO? (empate = |diff| ≤ 1%)
──────────────────────────────────────────────────────────────────────────────
  Masonline más barato:     473 (15.9%)
  Carrefour más barato:   1.127 (37.9%)
  Empate:                 1.375 (46.2%)

──────────────────────────────────────────────────────────────────────────────
  TOP 20 MAYORES DIFERENCIAS (|diff %|) — spot-check manual
──────────────────────────────────────────────────────────────────────────────
  EAN                     Mas $         Car $     diff%  Producto
  7798081285128       59.705,10    214.999,00   260.10% M [Smart Life] Cafetera Smartlife Sl-Cm9402
  7790150425251        3.439,00      7.869,00   128.82% M [Alicante] Azafrán Alicante blister x 2 uni
  7806810021609       24.289,00     55.474,30   128.39% M [Ilko] Olla 24 Cm Aluminio Ilko Gris Everyday
  4006000050201        2.649,00      5.879,00   121.93% M [Nivea] Jabón con glicerina Nivea orquídeas para todo tipo de 
  7790117000590        2.649,00      5.719,00   115.89% M [Separata] Bolsas para freezer Separata  30x40 cm x 20 u.
  7891132001682        1.089,00      2.339,00   114.78% M [Sazón] Saborizador para verduras Sazón 60 g.
  7792170110575        2.129,00      4.550,00   113.72% M [Gatorade] Bebida Isotónica Gatorade Sabor Manzana 1.25 L
  7500435245814       11.729,00     24.849,00   111.86% M [Gillette] Maquina Afeitar Desechable Gillette Prestobarba Car
  7791019175973        1.139,00      2.399,00   110.62% M [3 Arroyos] Copos De Maíz 3 Arroyos Miel 200 G
  7891000345344          579,00      1.209,00   108.81% M [Maggi] Caldo de Gallina Maggi 6 uni
  7891000345399          579,00      1.209,00   108.81% M [Maggi] Caldo Maggi® Verdura 6 U
  7891132012015        1.409,00      2.899,00   105.75% M [Ají No Moto] Saborizador Ají No Moto 100 G.
  7798304841254        6.339,00     12.959,00   104.43% M [Nesquik] Helado De Palito Nesquik 6 U 204 G
  7794626011177       11.319,00     22.999,00   103.19% M [Plenitud] Pañal Para Adulto Plenitud Protect Xg 8un
  7891000365472          678,00      1.369,00   101.92% M [Maggi] Maggi sabor en polvo verduras 5 uni
  7795513044780          919,00      1.849,00   101.20% M [Filgo] Bolígrafo Filgo stick azul x 4 uni
  7891155040866        2.249,00      4.499,00   100.04% M [NADIR] Copa Nadir Para Agua Barone  490 Ml
  26102895139          3.249,00      6.499,00   100.03% M [Mercator] Plato Playo Carine Blanco
  4006000016719       12.854,50     25.709,00   100.00% M [Nivea Sun] Protector Solar Humectante En Loción Nivea Sun Pro
  7793008018131        7.074,50     14.149,00   100.00% M [Villeneuve] Gel post solar Villeneuve con aloe 150 g.

──────────────────────────────────────────────────────────────────────────────
  DISTRIBUCIÓN POR MARCA (top 20 en el match cross-retailer)
──────────────────────────────────────────────────────────────────────────────
  Dove                         55  ██████████████████████████████
  Nivea                        48  ██████████████████████████
  La Serenísima                46  █████████████████████████
  Sedal                        43  ███████████████████████
  Elvive                       42  ███████████████████████
  Colgate                      36  ████████████████████
  Alicante                     33  ██████████████████
  Knorr                        26  ██████████████
  Arcor                        25  ██████████████
  Matarazzo                    25  ██████████████
  Lucchetti                    25  ██████████████
  Algabo                       24  █████████████
  Rexona                       23  █████████████
  Pantene                      21  ███████████
  Pedigree                     21  ███████████
  Milkaut                      20  ███████████
  La Virginia                  19  ██████████
  Palmolive                    19  ██████████
  Taragui                      16  █████████
  Gallo                        16  █████████

──────────────────────────────────────────────────────────────────────────────
  EXCLUSIVOS POR CADENA (EAN disponible en una, no en la otra)
──────────────────────────────────────────────────────────────────────────────
  Solo en Masonline: 7.756
  Solo en Carrefour: 16.838

════════════════════════════════════════════════════════════════════════════
