
> olavarria-comparador-precios@0.1.0 report /home/runner/work/comparador-precios/comparador-precios
> tsx bin/report.ts --cross-retailer


════════════════════════════════════════════════════════════════════════════
  REPORTE CRUZADO POR EAN — Masonline vs Carrefour
════════════════════════════════════════════════════════════════════════════

  TOTAL DE PRODUCTOS QUE MATCHEAN POR EAN: 3.738
  (ambas cadenas, precio vigente y disponible, price > 0)

──────────────────────────────────────────────────────────────────────────────
  DISTRIBUCIÓN DE DIFERENCIAS DE PRECIO (|diff %|)
──────────────────────────────────────────────────────────────────────────────
  < 5%       1.657 ( 44.3%) ████████████████████████████████████████
  5–10%        645 ( 17.3%) ████████████████
  10–25%       426 ( 11.4%) ██████████
  25–50%       649 ( 17.4%) ████████████████
  ≥ 50%        361 (  9.7%) █████████

──────────────────────────────────────────────────────────────────────────────
  ¿QUIÉN ES MÁS BARATO? (empate = |diff| ≤ 1%)
──────────────────────────────────────────────────────────────────────────────
  Masonline más barato:   1.956 (52.3%)
  Carrefour más barato:   1.025 (27.4%)
  Empate:                   757 (20.3%)

──────────────────────────────────────────────────────────────────────────────
  TOP 20 MAYORES DIFERENCIAS (|diff %|) — spot-check manual
──────────────────────────────────────────────────────────────────────────────
  EAN                     Mas $         Car $     diff%  Producto
  7799111696709       23.969,00     91.999,00   283.82% M [Atma Hogar] Exprimidor Blanco Con Usb Atma Home AAEU102P
  7798122112604       49.999,00    175.859,10   251.73% M [Moulinex] Batidora De Mano Moulinex Facilita Plus 400w Blanco
  7806810021609       24.289,00     56.279,30   131.71% M [Ilko] Olla 24 Cm Aluminio Ilko Gris Everyday
  7806810201735       15.137,85     34.334,29   126.81% M [Ilko] Molde Ilko Desmontable Redondo 24 Cm
  7891132001705        1.059,00      2.339,00   120.87% M [Sazón] Saborizador para arroz Sazón 60 g.
  7798081285494       40.799,20     89.999,00   120.59% M [Smart Life] Plancha 1200w Smartlife Sl-Di2386pn
  7799111696747        7.869,00     16.999,00   116.02% M [Atma Hogar] Mandolina Multifunción 6 En 1 Atma Home AAMM110P
  7790117000590        2.649,00      5.719,00   115.89% M [Separata] Bolsas para freezer Separata  30x40 cm x 20 u.
  656750725535         2.229,00      4.809,00   115.75% M [Glow] Esponja  Fibra Parrillera  Glow 1un
  7792170110568        2.129,00      4.550,00   113.72% M [Gatorade] Bebida Isotónica Gatorade Sabor Frutas Tropicales 1
  7792170110704        2.129,00      4.550,00   113.72% M [Gatorade] Bebida Isotónica Gatorade Sabor Cool Blue 1.25 L
  7792170110575        2.129,00      4.550,00   113.72% M [Gatorade] Bebida Isotónica Gatorade Sabor Manzana 1.25 L
  7798125593875       24.039,00     51.307,20   113.43% M [ASTON] Olla Cacerola Aston  Antiadherente 24 Cm Tapa Vidrio T
  7798225221425      169.999,00    359.828,07   111.66% M [Lusqtoff] Hidrolavadora Lüsqtoff Hl-120 1200w 7mpa De Presión
  7793890261530          609,00      1.249,00   105.09% M [Sabe Bien] Brownie Braunichoc Sabe Bien 35 G
  7790290007195        6.059,00     12.359,00   103.98% M [Carpano Punt E Mes] Aperitivo con alcohol Carpano Punt E Mes 
  7794626011177       11.319,00     22.999,00   103.19% M [Plenitud] Pañal Para Adulto Plenitud Protect Xg 8un
  8906038786416        3.689,50      7.459,00   102.17% M [SRI SRI TATTVA] Crema Dental Sri Sri Tattva  Ayurvédica Libre
  7792281613682        2.549,00      5.139,00   101.61% M [Carol] Plato Carol 25 Cm Granito Negro
  7792281063203        4.289,00      8.639,00   101.42% M [Carol] Bowl Recto Carol 2,3 L Granito Negro

──────────────────────────────────────────────────────────────────────────────
  DISTRIBUCIÓN POR MARCA (top 20 en el match cross-retailer)
──────────────────────────────────────────────────────────────────────────────
  La Serenísima                73  ██████████████████████████████
  Dove                         63  ██████████████████████████
  Elvive                       49  ████████████████████
  Nivea                        49  ████████████████████
  Knorr                        47  ███████████████████
  Sedal                        44  ██████████████████
  Alicante                     39  ████████████████
  Arcor                        37  ███████████████
  Rexona                       35  ██████████████
  Colgate                      32  █████████████
  Milkaut                      32  █████████████
  Lucchetti                    28  ████████████
  Matarazzo                    28  ████████████
  La Virginia                  26  ███████████
  Algabo                       26  ███████████
  Tregar                       23  █████████
  Granja Del Sol               22  █████████
  Pedigree                     22  █████████
  Pantene                      21  █████████
  Cif                          21  █████████

──────────────────────────────────────────────────────────────────────────────
  EXCLUSIVOS POR CADENA (EAN disponible en una, no en la otra)
──────────────────────────────────────────────────────────────────────────────
  Solo en Masonline: 9.965
  Solo en Carrefour: 15.385

════════════════════════════════════════════════════════════════════════════
