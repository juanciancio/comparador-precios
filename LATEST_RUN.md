
> olavarria-comparador-precios@0.1.0 report /home/runner/work/comparador-precios/comparador-precios
> tsx bin/report.ts --cross-retailer


════════════════════════════════════════════════════════════════════════════
  REPORTE CRUZADO POR EAN — Masonline vs Carrefour
════════════════════════════════════════════════════════════════════════════

  TOTAL DE PRODUCTOS QUE MATCHEAN POR EAN: 3.760
  (ambas cadenas, precio vigente y disponible, price > 0)

──────────────────────────────────────────────────────────────────────────────
  DISTRIBUCIÓN DE DIFERENCIAS DE PRECIO (|diff %|)
──────────────────────────────────────────────────────────────────────────────
  < 5%       1.482 ( 39.4%) ████████████████████████████████████████
  5–10%        871 ( 23.2%) ████████████████████████
  10–25%       420 ( 11.2%) ███████████
  25–50%       663 ( 17.6%) ██████████████████
  ≥ 50%        324 (  8.6%) █████████

──────────────────────────────────────────────────────────────────────────────
  ¿QUIÉN ES MÁS BARATO? (empate = |diff| ≤ 1%)
──────────────────────────────────────────────────────────────────────────────
  Masonline más barato:   1.919 (51.0%)
  Carrefour más barato:     976 (26.0%)
  Empate:                   865 (23.0%)

──────────────────────────────────────────────────────────────────────────────
  TOP 20 MAYORES DIFERENCIAS (|diff %|) — spot-check manual
──────────────────────────────────────────────────────────────────────────────
  EAN                     Mas $         Car $     diff%  Producto
  7799111696709       23.969,00     91.999,00   283.82% M [Atma Hogar] Exprimidor Blanco Con Usb Atma Home AAEU102P
  7798122112604       49.999,00    175.859,10   251.73% M [Moulinex] Batidora De Mano Moulinex Facilita Plus 400w Blanco
  7806810201735       15.137,85     34.334,29   126.81% M [Ilko] Molde Ilko Desmontable Redondo 24 Cm
  8445291082151        6.125,40     13.809,00   125.44% M [Nescafe Dolca] Café Instantáneo Nescafé® Dolca® Suave 170 G
  8445291082236        6.125,40     13.809,00   125.44% M [Nescafe Dolca] Café Instantáneo Nescafé® Dolca® Original 170g
  7799111696747        7.869,00     16.999,00   116.02% M [Atma Hogar] Mandolina Multifunción 6 En 1 Atma Home AAMM110P
  7792170110704        2.129,00      4.550,00   113.72% M [Gatorade] Bebida Isotónica Gatorade Sabor Cool Blue 1.25 L
  7792170110575        2.129,00      4.550,00   113.72% M [Gatorade] Bebida Isotónica Gatorade Sabor Manzana 1.25 L
  7798225221425      169.999,00    359.828,07   111.66% M [Lusqtoff] Hidrolavadora Lüsqtoff Hl-120 1200w 7mpa De Presión
  7798060850026        2.049,50      4.093,33    99.72% M [Tonadita] Manteca Tonadita Clásica 200 G
  7622201806552        1.469,40      2.889,00    96.61% M [Oreo] Galletitas Oreo Golden Vainilla Rellenas Con Crema 118 
  7891132001682        1.259,25      2.339,00    85.75% M [Sazón] Saborizador para verduras Sazón 60 g.
  7796885483382      269.999,00    499.999,00    85.19% M [BGH] Horno Eléctrico Bgh Bhe64m25n 64l 2200w Grill Convección
  7806810025188       20.168,85     37.169,29    84.29% M [Ilko] Molde Ilko Redondo Desmontable Non Stick 28 Cm Negro
  8445291121843        1.559,40      2.840,00    82.12% M [Nesquik] Cacao En Polvo Nesquik® Original 150g
  7791813405023        1.839,00      3.349,00    82.11% M [H20!] Agua Saborizada H2oh! Still Sabor Limoneto 2 L
  7791813403012        1.759,00      3.200,00    81.92% M [H20!] Agua Saborizada Sin Gas H2oh Sabor Pomelo 1,5 L
  7791813403036        1.759,00      3.200,00    81.92% M [H20!] Agua Saborizada Sin Gas H2oh Sabor Manzana 1,5 L
  8445291121904        7.619,40     13.809,00    81.23% M [Nesquik] Cacao En Polvo Nesquik Original 800 G
  7806810025119       20.168,85     36.469,29    80.82% M [Ilko] Molde Ilko Desmontable Redondo Non Stick 26 Cm Negro

──────────────────────────────────────────────────────────────────────────────
  DISTRIBUCIÓN POR MARCA (top 20 en el match cross-retailer)
──────────────────────────────────────────────────────────────────────────────
  La Serenísima                66  ██████████████████████████████
  Dove                         63  █████████████████████████████
  Nivea                        52  ████████████████████████
  Sedal                        51  ███████████████████████
  Elvive                       49  ██████████████████████
  Knorr                        46  █████████████████████
  Alicante                     42  ███████████████████
  Arcor                        36  ████████████████
  Rexona                       36  ████████████████
  Colgate                      32  ███████████████
  La Virginia                  30  ██████████████
  Milkaut                      30  ██████████████
  Lucchetti                    30  ██████████████
  Matarazzo                    27  ████████████
  Algabo                       25  ███████████
  Pantene                      24  ███████████
  Cif                          21  ██████████
  Granja Del Sol               20  █████████
  Ayudin                       20  █████████
  Poett                        19  █████████

──────────────────────────────────────────────────────────────────────────────
  EXCLUSIVOS POR CADENA (EAN disponible en una, no en la otra)
──────────────────────────────────────────────────────────────────────────────
  Solo en Masonline: 10.211
  Solo en Carrefour: 15.384

════════════════════════════════════════════════════════════════════════════
