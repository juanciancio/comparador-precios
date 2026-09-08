
> olavarria-comparador-precios@0.1.0 report /home/runner/work/comparador-precios/comparador-precios
> tsx bin/report.ts --cross-retailer


════════════════════════════════════════════════════════════════════════════
  REPORTE CRUZADO POR EAN — Masonline vs Carrefour
════════════════════════════════════════════════════════════════════════════

  TOTAL DE PRODUCTOS QUE MATCHEAN POR EAN: 3.203
  (ambas cadenas, precio vigente y disponible, price > 0)

──────────────────────────────────────────────────────────────────────────────
  DISTRIBUCIÓN DE DIFERENCIAS DE PRECIO (|diff %|)
──────────────────────────────────────────────────────────────────────────────
  < 5%       1.993 ( 62.2%) ████████████████████████████████████████
  5–10%        307 (  9.6%) ██████
  10–25%       286 (  8.9%) ██████
  25–50%       486 ( 15.2%) ██████████
  ≥ 50%        131 (  4.1%) ███

──────────────────────────────────────────────────────────────────────────────
  ¿QUIÉN ES MÁS BARATO? (empate = |diff| ≤ 1%)
──────────────────────────────────────────────────────────────────────────────
  Masonline más barato:     587 (18.3%)
  Carrefour más barato:   1.203 (37.6%)
  Empate:                 1.413 (44.1%)

──────────────────────────────────────────────────────────────────────────────
  TOP 20 MAYORES DIFERENCIAS (|diff %|) — spot-check manual
──────────────────────────────────────────────────────────────────────────────
  EAN                     Mas $         Car $     diff%  Producto
  7799111681491       15.040,35     42.899,00   185.23% M [Philco] Termo Philco de Acero Inoxidable 650ml Blanco con Pic
  7806810201735       15.443,35     34.334,29   122.32% M [Ilko] Molde Ilko Desmontable Redondo 24 Cm
  4006000050201        2.649,00      5.879,00   121.93% M [Nivea] Jabón con glicerina Nivea orquídeas para todo tipo de 
  7891132001705        1.059,00      2.339,00   120.87% M [Sazón] Saborizador para arroz Sazón 60 g.
  7790117000590        2.649,00      5.719,00   115.89% M [Separata] Bolsas para freezer Separata  30x40 cm x 20 u.
  7891132001682        1.089,00      2.339,00   114.78% M [Sazón] Saborizador para verduras Sazón 60 g.
  7792170110704        2.129,00      4.550,00   113.72% M [Gatorade] Bebida Isotónica Gatorade Sabor Cool Blue 1.25 L
  7792170110568        2.129,00      4.550,00   113.72% M [Gatorade] Bebida Isotónica Gatorade Sabor Frutas Tropicales 1
  7798125593875       24.039,00     51.307,20   113.43% M [ASTON] Olla Cacerola Aston  Antiadherente 24 Cm Tapa Vidrio T
  7500435245814       11.729,00     24.849,00   111.86% M [Gillette] Maquina Afeitar Desechable Gillette Prestobarba Car
  7798225221425      169.999,00    359.828,07   111.66% M [Lusqtoff] Hidrolavadora Lüsqtoff Hl-120 1200w 7mpa De Presión
  7791019175973        1.139,00      2.399,00   110.62% M [3 Arroyos] Copos De Maíz 3 Arroyos Miel 200 G
  7794903232219        1.639,00      3.389,00   106.77% M [Yuka] Galletitas Yuka Pepitas Sin Tacc 150 G
  7891132012015        1.409,00      2.899,00   105.75% M [Ají No Moto] Saborizador Ají No Moto 100 G.
  7794626011177       11.319,00     22.999,00   103.19% M [Plenitud] Pañal Para Adulto Plenitud Protect Xg 8un
  7792281063203        4.289,00      8.639,00   101.42% M [Carol] Bowl Recto Carol 2,3 L Granito Negro
  7795513044780          919,00      1.849,00   101.20% M [Filgo] Bolígrafo Filgo stick azul x 4 uni
  7891155040866        2.249,00      4.499,00   100.04% M [NADIR] Copa Nadir Para Agua Barone  490 Ml
  7792798015009        2.479,50      4.960,00   100.04% M [Patagonia] Cerveza Rubia Patagonia Lager Del Sur 473 Ml
  7793913013658        1.604,50      3.209,00   100.00% M [Tregar] Queso untable Tregar cheddar light en pote 190 g.

──────────────────────────────────────────────────────────────────────────────
  DISTRIBUCIÓN POR MARCA (top 20 en el match cross-retailer)
──────────────────────────────────────────────────────────────────────────────
  La Serenísima                67  ██████████████████████████████
  Dove                         61  ███████████████████████████
  Nivea                        48  █████████████████████
  Elvive                       48  █████████████████████
  Sedal                        43  ███████████████████
  Alicante                     40  ██████████████████
  Knorr                        36  ████████████████
  Arcor                        32  ██████████████
  Rexona                       32  ██████████████
  Lucchetti                    28  █████████████
  Colgate                      27  ████████████
  La Virginia                  26  ████████████
  Matarazzo                    26  ████████████
  Milkaut                      25  ███████████
  Algabo                       22  ██████████
  Pedigree                     22  ██████████
  Pantene                      20  █████████
  Tregar                       19  █████████
  Gallo                        19  █████████
  La Campagnola                18  ████████

──────────────────────────────────────────────────────────────────────────────
  EXCLUSIVOS POR CADENA (EAN disponible en una, no en la otra)
──────────────────────────────────────────────────────────────────────────────
  Solo en Masonline: 8.541
  Solo en Carrefour: 15.642

════════════════════════════════════════════════════════════════════════════
