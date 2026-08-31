
> olavarria-comparador-precios@0.1.0 report /home/runner/work/comparador-precios/comparador-precios
> tsx bin/report.ts --cross-retailer


════════════════════════════════════════════════════════════════════════════
  REPORTE CRUZADO POR EAN — Masonline vs Carrefour
════════════════════════════════════════════════════════════════════════════

  TOTAL DE PRODUCTOS QUE MATCHEAN POR EAN: 3.183
  (ambas cadenas, precio vigente y disponible, price > 0)

──────────────────────────────────────────────────────────────────────────────
  DISTRIBUCIÓN DE DIFERENCIAS DE PRECIO (|diff %|)
──────────────────────────────────────────────────────────────────────────────
  < 5%       1.940 ( 60.9%) ████████████████████████████████████████
  5–10%        266 (  8.4%) █████
  10–25%       280 (  8.8%) ██████
  25–50%       555 ( 17.4%) ███████████
  ≥ 50%        142 (  4.5%) ███

──────────────────────────────────────────────────────────────────────────────
  ¿QUIÉN ES MÁS BARATO? (empate = |diff| ≤ 1%)
──────────────────────────────────────────────────────────────────────────────
  Masonline más barato:     511 (16.1%)
  Carrefour más barato:   1.132 (35.6%)
  Empate:                 1.540 (48.4%)

──────────────────────────────────────────────────────────────────────────────
  TOP 20 MAYORES DIFERENCIAS (|diff %|) — spot-check manual
──────────────────────────────────────────────────────────────────────────────
  EAN                     Mas $         Car $     diff%  Producto
  7798125593875       24.039,00     85.512,00   255.72% M [ASTON] Olla Cacerola Aston  Antiadherente 24 Cm Tapa Vidrio T
  7790150425251        3.439,00      7.869,00   128.82% M [Alicante] Azafrán Alicante blister x 2 uni
  7806810021609       24.289,00     55.474,30   128.39% M [Ilko] Olla 24 Cm Aluminio Ilko Gris Everyday
  4006000050201        2.649,00      5.879,00   121.93% M [Nivea] Jabón con glicerina Nivea orquídeas para todo tipo de 
  7891132001705        1.059,00      2.339,00   120.87% M [Sazón] Saborizador para arroz Sazón 60 g.
  7790117000590        2.649,00      5.719,00   115.89% M [Separata] Bolsas para freezer Separata  30x40 cm x 20 u.
  7891132001682        1.089,00      2.339,00   114.78% M [Sazón] Saborizador para verduras Sazón 60 g.
  7792170110704        2.129,00      4.550,00   113.72% M [Gatorade] Bebida Isotónica Gatorade Sabor Cool Blue 1.25 L
  7792170110568        2.129,00      4.550,00   113.72% M [Gatorade] Bebida Isotónica Gatorade Sabor Frutas Tropicales 1
  7500435245814       11.729,00     24.849,00   111.86% M [Gillette] Maquina Afeitar Desechable Gillette Prestobarba Car
  7791019175973        1.139,00      2.399,00   110.62% M [3 Arroyos] Copos De Maíz 3 Arroyos Miel 200 G
  7891000345344          579,00      1.209,00   108.81% M [Maggi] Caldo de Gallina Maggi 6 uni
  7891000345399          579,00      1.209,00   108.81% M [Maggi] Caldo Maggi® Verdura 6 U
  7794000006065          839,00      1.749,00   108.46% M [Hellmanns] Mayonesa Hellmanns Clásica 237 G
  7891132012015        1.409,00      2.899,00   105.75% M [Ají No Moto] Saborizador Ají No Moto 100 G.
  7794626011177       11.319,00     22.999,00   103.19% M [Plenitud] Pañal Para Adulto Plenitud Protect Xg 8un
  7891000365472          678,00      1.369,00   101.92% M [Maggi] Maggi sabor en polvo verduras 5 uni
  7792281063203        4.289,00      8.639,00   101.42% M [Carol] Bowl Recto Carol 2,3 L Granito Negro
  7795513044780          919,00      1.849,00   101.20% M [Filgo] Bolígrafo Filgo stick azul x 4 uni
  7702026147914        8.939,00     17.890,00   100.13% M [Tena] Toalla Tena discreet maxi nocturnas 10 uni

──────────────────────────────────────────────────────────────────────────────
  DISTRIBUCIÓN POR MARCA (top 20 en el match cross-retailer)
──────────────────────────────────────────────────────────────────────────────
  La Serenísima                68  ██████████████████████████████
  Dove                         64  ████████████████████████████
  Nivea                        50  ██████████████████████
  Elvive                       46  ████████████████████
  Sedal                        44  ███████████████████
  Colgate                      34  ███████████████
  Knorr                        32  ██████████████
  Alicante                     31  ██████████████
  Arcor                        31  ██████████████
  Milkaut                      29  █████████████
  Rexona                       28  ████████████
  Lucchetti                    26  ███████████
  Algabo                       26  ███████████
  Pantene                      24  ███████████
  La Virginia                  23  ██████████
  Matarazzo                    23  ██████████
  Tregar                       20  █████████
  Pedigree                     20  █████████
  Motorola                     20  █████████
  Palmolive                    19  ████████

──────────────────────────────────────────────────────────────────────────────
  EXCLUSIVOS POR CADENA (EAN disponible en una, no en la otra)
──────────────────────────────────────────────────────────────────────────────
  Solo en Masonline: 8.280
  Solo en Carrefour: 16.347

════════════════════════════════════════════════════════════════════════════
