
> olavarria-comparador-precios@0.1.0 report /home/runner/work/comparador-precios/comparador-precios
> tsx bin/report.ts --cross-retailer


════════════════════════════════════════════════════════════════════════════
  REPORTE CRUZADO POR EAN — Masonline vs Carrefour
════════════════════════════════════════════════════════════════════════════

  TOTAL DE PRODUCTOS QUE MATCHEAN POR EAN: 4.142
  (ambas cadenas, precio vigente y disponible, price > 0)

──────────────────────────────────────────────────────────────────────────────
  DISTRIBUCIÓN DE DIFERENCIAS DE PRECIO (|diff %|)
──────────────────────────────────────────────────────────────────────────────
  < 5%       1.730 ( 41.8%) ████████████████████████████████████████
  5–10%        838 ( 20.2%) ███████████████████
  10–25%       511 ( 12.3%) ████████████
  25–50%       729 ( 17.6%) █████████████████
  ≥ 50%        334 (  8.1%) ████████

──────────────────────────────────────────────────────────────────────────────
  ¿QUIÉN ES MÁS BARATO? (empate = |diff| ≤ 1%)
──────────────────────────────────────────────────────────────────────────────
  Masonline más barato:   2.041 (49.3%)
  Carrefour más barato:   1.215 (29.3%)
  Empate:                   886 (21.4%)

──────────────────────────────────────────────────────────────────────────────
  TOP 20 MAYORES DIFERENCIAS (|diff %|) — spot-check manual
──────────────────────────────────────────────────────────────────────────────
  EAN                     Mas $         Car $     diff%  Producto
  7799111696709       23.969,00     91.999,00   283.82% M [Atma Hogar] Exprimidor Blanco Con Usb Atma Home AAEU102P
  7798122112604       49.999,00    175.859,10   251.73% M [Moulinex] Batidora De Mano Moulinex Facilita Plus 400w Blanco
  7806810201735       15.137,85     34.334,29   126.81% M [Ilko] Molde Ilko Desmontable Redondo 24 Cm
  8445291082236        6.125,40     13.809,00   125.44% M [Nescafe Dolca] Café Instantáneo Nescafé® Dolca® Original 170g
  8445291082151        6.125,40     13.809,00   125.44% M [Nescafe Dolca] Café Instantáneo Nescafé® Dolca® Suave 170 G
  7799111696747        7.869,00     16.999,00   116.02% M [Atma Hogar] Mandolina Multifunción 6 En 1 Atma Home AAMM110P
  7792170110568        2.129,00      4.550,00   113.72% M [Gatorade] Bebida Isotónica Gatorade Sabor Frutas Tropicales 1
  7792170110704        2.129,00      4.550,00   113.72% M [Gatorade] Bebida Isotónica Gatorade Sabor Cool Blue 1.25 L
  7792170110575        2.129,00      4.550,00   113.72% M [Gatorade] Bebida Isotónica Gatorade Sabor Manzana 1.25 L
  7792170110551        2.129,00      4.550,00   113.72% M [Gatorade] Bebida Isotónica Gatorade Sabor Naranja 1.25 L
  7798225221425      169.999,00    359.828,07   111.66% M [Lusqtoff] Hidrolavadora Lüsqtoff Hl-120 1200w 7mpa De Presión
  7806810025195    4.768.999,00     21.909,30   -99.54% C [Ilko] Set Mini Tarteras Ilko Non Stick 4 U 12 Cm Negro
  7794820903254        1.024,50      2.040,00    99.12% M [Milkaut] Yogur Firme Milkaut Frutilla 180 G
  7622201806552        1.469,40      2.889,00    96.61% M [Oreo] Galletitas Oreo Golden Vainilla Rellenas Con Crema 118 
  7792798010615        2.134,50      4.025,00    88.57% M [Stella Artois] Cerveza Rubia Stella Artois Pura Malta 473 Cc
  7891132001682        1.259,25      2.339,00    85.75% M [Sazón] Saborizador para verduras Sazón 60 g.
  7796885483382      269.999,00    499.999,00    85.19% M [BGH] Horno Eléctrico Bgh Bhe64m25n 64l 2200w Grill Convección
  7453077243161        4.703,20        700,00   -85.12% C [Go Speed] Auto Go Speed construcción metálico (Modelos Surtid
  7790895649806        3.199,00      5.890,00    84.12% M [Ades] Bebida A Base De Almendras Ades Almendras 1 L
  8445291121843        1.559,40      2.840,00    82.12% M [Nesquik] Cacao En Polvo Nesquik® Original 150g

──────────────────────────────────────────────────────────────────────────────
  DISTRIBUCIÓN POR MARCA (top 20 en el match cross-retailer)
──────────────────────────────────────────────────────────────────────────────
  La Serenísima                72  ██████████████████████████████
  Dove                         64  ███████████████████████████
  Nivea                        52  ██████████████████████
  Sedal                        51  █████████████████████
  Elvive                       50  █████████████████████
  Knorr                        47  ████████████████████
  Alicante                     42  ██████████████████
  Rexona                       40  █████████████████
  La Virginia                  37  ███████████████
  Arcor                        36  ███████████████
  Milkaut                      33  ██████████████
  Colgate                      33  ██████████████
  Lucchetti                    30  █████████████
  Tregar                       29  ████████████
  Algabo                       28  ████████████
  Matarazzo                    27  ███████████
  Pantene                      24  ██████████
  Cif                          23  ██████████
  Pedigree                     22  █████████
  Granja Del Sol               21  █████████

──────────────────────────────────────────────────────────────────────────────
  EXCLUSIVOS POR CADENA (EAN disponible en una, no en la otra)
──────────────────────────────────────────────────────────────────────────────
  Solo en Masonline: 13.784
  Solo en Carrefour: 15.051

════════════════════════════════════════════════════════════════════════════
