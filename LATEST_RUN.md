
> olavarria-comparador-precios@0.1.0 report /home/runner/work/comparador-precios/comparador-precios
> tsx bin/report.ts --cross-retailer


════════════════════════════════════════════════════════════════════════════
  REPORTE CRUZADO POR EAN — Masonline vs Carrefour
════════════════════════════════════════════════════════════════════════════

  TOTAL DE PRODUCTOS QUE MATCHEAN POR EAN: 3.571
  (ambas cadenas, precio vigente y disponible, price > 0)

──────────────────────────────────────────────────────────────────────────────
  DISTRIBUCIÓN DE DIFERENCIAS DE PRECIO (|diff %|)
──────────────────────────────────────────────────────────────────────────────
  < 5%       1.604 ( 44.9%) ████████████████████████████████████████
  5–10%        884 ( 24.8%) ██████████████████████
  10–25%       421 ( 11.8%) ██████████
  25–50%       481 ( 13.5%) ████████████
  ≥ 50%        181 (  5.1%) █████

──────────────────────────────────────────────────────────────────────────────
  ¿QUIÉN ES MÁS BARATO? (empate = |diff| ≤ 1%)
──────────────────────────────────────────────────────────────────────────────
  Masonline más barato:   1.687 (47.2%)
  Carrefour más barato:   1.029 (28.8%)
  Empate:                   855 (23.9%)

──────────────────────────────────────────────────────────────────────────────
  TOP 20 MAYORES DIFERENCIAS (|diff %|) — spot-check manual
──────────────────────────────────────────────────────────────────────────────
  EAN                     Mas $         Car $     diff%  Producto
  7799111696709       23.969,00     91.999,00   283.82% M [Atma Hogar] Exprimidor Blanco Con Usb Atma Home AAEU102P
  7806810021609       24.289,00     56.279,30   131.71% M [Ilko] Olla 24 Cm Aluminio Ilko Gris Everyday
  7806810201735       15.137,85     34.334,29   126.81% M [Ilko] Molde Ilko Desmontable Redondo 24 Cm
  4006000050201        2.649,00      5.879,00   121.93% M [Nivea] Jabón con glicerina Nivea orquídeas para todo tipo de 
  7891132001705        1.059,00      2.339,00   120.87% M [Sazón] Saborizador para arroz Sazón 60 g.
  8445291082236        6.125,40     13.500,00   120.39% M [Nescafe Dolca] Café Instantáneo Nescafé® Dolca® Original 170g
  8445291082151        6.125,40     13.500,00   120.39% M [Nescafe Dolca] Café Instantáneo Nescafé® Dolca® Suave 170 G
  7799111696747        7.869,00     16.999,00   116.02% M [Atma Hogar] Mandolina Multifunción 6 En 1 Atma Home AAMM110P
  7790117000590        2.649,00      5.719,00   115.89% M [Separata] Bolsas para freezer Separata  30x40 cm x 20 u.
  656750725535         2.229,00      4.809,00   115.75% M [Glow] Esponja  Fibra Parrillera  Glow 1un
  7891132001682        1.089,00      2.339,00   114.78% M [Sazón] Saborizador para verduras Sazón 60 g.
  7792170110704        2.129,00      4.550,00   113.72% M [Gatorade] Bebida Isotónica Gatorade Sabor Cool Blue 1.25 L
  7792170110568        2.129,00      4.550,00   113.72% M [Gatorade] Bebida Isotónica Gatorade Sabor Frutas Tropicales 1
  7792170110575        2.129,00      4.550,00   113.72% M [Gatorade] Bebida Isotónica Gatorade Sabor Manzana 1.25 L
  7798125593875       24.039,00     51.307,20   113.43% M [ASTON] Olla Cacerola Aston  Antiadherente 24 Cm Tapa Vidrio T
  7500435245814       11.729,00     24.849,00   111.86% M [Gillette] Maquina Afeitar Desechable Gillette Prestobarba Car
  7798225221425      169.999,00    359.828,07   111.66% M [Lusqtoff] Hidrolavadora Lüsqtoff Hl-120 1200w 7mpa De Presión
  7891000345344          579,00      1.209,00   108.81% M [Maggi] Caldo de Gallina Maggi 6 uni
  7891132012015        1.409,00      2.899,00   105.75% M [Ají No Moto] Saborizador Ají No Moto 100 G.
  7793890261530          609,00      1.249,00   105.09% M [Sabe Bien] Brownie Braunichoc Sabe Bien 35 G

──────────────────────────────────────────────────────────────────────────────
  DISTRIBUCIÓN POR MARCA (top 20 en el match cross-retailer)
──────────────────────────────────────────────────────────────────────────────
  La Serenísima                71  ██████████████████████████████
  Dove                         63  ███████████████████████████
  Sedal                        52  ██████████████████████
  Nivea                        49  █████████████████████
  Elvive                       48  ████████████████████
  Alicante                     41  █████████████████
  Knorr                        39  ████████████████
  Arcor                        36  ███████████████
  Rexona                       34  ██████████████
  Lucchetti                    29  ████████████
  La Virginia                  27  ███████████
  Colgate                      27  ███████████
  Matarazzo                    27  ███████████
  Milkaut                      26  ███████████
  Pantene                      22  █████████
  Algabo                       22  █████████
  Pedigree                     22  █████████
  Cif                          21  █████████
  Gallo                        19  ████████
  La Campagnola                18  ████████

──────────────────────────────────────────────────────────────────────────────
  EXCLUSIVOS POR CADENA (EAN disponible en una, no en la otra)
──────────────────────────────────────────────────────────────────────────────
  Solo en Masonline: 9.753
  Solo en Carrefour: 15.160

════════════════════════════════════════════════════════════════════════════
