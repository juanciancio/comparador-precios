
> olavarria-comparador-precios@0.1.0 report /home/runner/work/comparador-precios/comparador-precios
> tsx bin/report.ts --cross-retailer


════════════════════════════════════════════════════════════════════════════
  REPORTE CRUZADO POR EAN — Masonline vs Carrefour
════════════════════════════════════════════════════════════════════════════

  TOTAL DE PRODUCTOS QUE MATCHEAN POR EAN: 3.136
  (ambas cadenas, precio vigente y disponible, price > 0)

──────────────────────────────────────────────────────────────────────────────
  DISTRIBUCIÓN DE DIFERENCIAS DE PRECIO (|diff %|)
──────────────────────────────────────────────────────────────────────────────
  < 5%       2.024 ( 64.5%) ████████████████████████████████████████
  5–10%        269 (  8.6%) █████
  10–25%       303 (  9.7%) ██████
  25–50%       429 ( 13.7%) ████████
  ≥ 50%        111 (  3.5%) ██

──────────────────────────────────────────────────────────────────────────────
  ¿QUIÉN ES MÁS BARATO? (empate = |diff| ≤ 1%)
──────────────────────────────────────────────────────────────────────────────
  Masonline más barato:     743 (23.7%)
  Carrefour más barato:   1.056 (33.7%)
  Empate:                 1.337 (42.6%)

──────────────────────────────────────────────────────────────────────────────
  TOP 20 MAYORES DIFERENCIAS (|diff %|) — spot-check manual
──────────────────────────────────────────────────────────────────────────────
  EAN                     Mas $         Car $     diff%  Producto
  7798125593875       24.039,00     85.512,00   255.72% M [ASTON] Olla Cacerola Aston  Antiadherente 24 Cm Tapa Vidrio T
  7806810021609       24.289,00     55.474,30   128.39% M [Ilko] Olla 24 Cm Aluminio Ilko Gris Everyday
  4006000050201        2.649,00      5.879,00   121.93% M [Nivea] Jabón con glicerina Nivea orquídeas para todo tipo de 
  7891132001705        1.059,00      2.339,00   120.87% M [Sazón] Saborizador para arroz Sazón 60 g.
  656750725535         2.229,00      4.809,00   115.75% M [Glow] Esponja  Fibra Parrillera  Glow 1un
  7891132001682        1.089,00      2.339,00   114.78% M [Sazón] Saborizador para verduras Sazón 60 g.
  7500435245814       11.729,00     24.849,00   111.86% M [Gillette] Maquina Afeitar Desechable Gillette Prestobarba Car
  7791019175973        1.139,00      2.399,00   110.62% M [3 Arroyos] Copos De Maíz 3 Arroyos Miel 200 G
  8445291106505      108.954,00    227.799,00   109.08% M [Dolce Gusto] Cafetera Nescafe Dolce Gusto Piccolo Xs Negra Ne
  7891000345399          579,00      1.209,00   108.81% M [Maggi] Caldo Maggi® Verdura 6 U
  7891000345344          579,00      1.209,00   108.81% M [Maggi] Caldo de Gallina Maggi 6 uni
  7891132012015        1.409,00      2.899,00   105.75% M [Ají No Moto] Saborizador Ají No Moto 100 G.
  7794626011177       11.319,00     22.999,00   103.19% M [Plenitud] Pañal Para Adulto Plenitud Protect Xg 8un
  7891000365472          678,00      1.369,00   101.92% M [Maggi] Maggi sabor en polvo verduras 5 uni
  7792281063203        4.289,00      8.639,00   101.42% M [Carol] Bowl Recto Carol 2,3 L Granito Negro
  7795513044780          919,00      1.849,00   101.20% M [Filgo] Bolígrafo Filgo stick azul x 4 uni
  26102895139          3.249,00      6.499,00   100.03% M [Mercator] Plato Playo Carine Blanco
  7792281063142        2.169,00      4.329,00    99.59% M [Carol] Bowl Recto Carol 0,85 L Granito Negro
  7790580131746        2.049,00      4.089,00    99.56% M [Godet] Bizcochuelo vainilla Godet caja 480 g.
  7806810025195    4.421.999,00     21.909,30   -99.50% C [Ilko] Set Mini Tarteras Ilko Non Stick 4 U 12 Cm Negro

──────────────────────────────────────────────────────────────────────────────
  DISTRIBUCIÓN POR MARCA (top 20 en el match cross-retailer)
──────────────────────────────────────────────────────────────────────────────
  La Serenísima                66  ██████████████████████████████
  Dove                         62  ████████████████████████████
  Nivea                        48  ██████████████████████
  Elvive                       46  █████████████████████
  Sedal                        44  ████████████████████
  Arcor                        34  ███████████████
  Knorr                        32  ███████████████
  Colgate                      31  ██████████████
  Alicante                     31  ██████████████
  Milkaut                      28  █████████████
  Lucchetti                    26  ████████████
  Algabo                       26  ████████████
  Rexona                       26  ████████████
  La Virginia                  23  ██████████
  Matarazzo                    22  ██████████
  Pantene                      21  ██████████
  Pedigree                     20  █████████
  Palmolive                    18  ████████
  Motorola                     18  ████████
  Cif                          17  ████████

──────────────────────────────────────────────────────────────────────────────
  EXCLUSIVOS POR CADENA (EAN disponible en una, no en la otra)
──────────────────────────────────────────────────────────────────────────────
  Solo en Masonline: 8.464
  Solo en Carrefour: 15.186

════════════════════════════════════════════════════════════════════════════
