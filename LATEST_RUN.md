
> olavarria-comparador-precios@0.1.0 report /home/runner/work/comparador-precios/comparador-precios
> tsx bin/report.ts --cross-retailer


════════════════════════════════════════════════════════════════════════════
  REPORTE CRUZADO POR EAN — Masonline vs Carrefour
════════════════════════════════════════════════════════════════════════════

  TOTAL DE PRODUCTOS QUE MATCHEAN POR EAN: 3.689
  (ambas cadenas, precio vigente y disponible, price > 0)

──────────────────────────────────────────────────────────────────────────────
  DISTRIBUCIÓN DE DIFERENCIAS DE PRECIO (|diff %|)
──────────────────────────────────────────────────────────────────────────────
  < 5%       1.605 ( 43.5%) ████████████████████████████████████████
  5–10%        972 ( 26.3%) ████████████████████████
  10–25%       444 ( 12.0%) ███████████
  25–50%       537 ( 14.6%) █████████████
  ≥ 50%        131 (  3.6%) ███

──────────────────────────────────────────────────────────────────────────────
  ¿QUIÉN ES MÁS BARATO? (empate = |diff| ≤ 1%)
──────────────────────────────────────────────────────────────────────────────
  Masonline más barato:   1.594 (43.2%)
  Carrefour más barato:   1.159 (31.4%)
  Empate:                   936 (25.4%)

──────────────────────────────────────────────────────────────────────────────
  TOP 20 MAYORES DIFERENCIAS (|diff %|) — spot-check manual
──────────────────────────────────────────────────────────────────────────────
  EAN                     Mas $         Car $     diff%  Producto
  7799111696709       23.969,00     91.999,00   283.82% M [Atma Hogar] Exprimidor Blanco Con Usb Atma Home AAEU102P
  7798122112604       49.999,00    175.859,10   251.73% M [Moulinex] Batidora De Mano Moulinex Facilita Plus 400w Blanco
  8445291082236        6.125,40     13.809,00   125.44% M [Nescafe Dolca] Café Instantáneo Nescafé® Dolca® Original 170g
  8445291082151        6.125,40     13.809,00   125.44% M [Nescafe Dolca] Café Instantáneo Nescafé® Dolca® Suave 170 G
  7796885483382      224.997,00    499.999,00   122.22% M [BGH] Horno Eléctrico Bgh Bhe64m25n 64l 2200w Grill Convección
  7792170110575        2.129,00      4.550,00   113.72% M [Gatorade] Bebida Isotónica Gatorade Sabor Manzana 1.25 L
  7792170110704        2.129,00      4.550,00   113.72% M [Gatorade] Bebida Isotónica Gatorade Sabor Cool Blue 1.25 L
  7798225221425      169.999,00    359.828,07   111.66% M [Lusqtoff] Hidrolavadora Lüsqtoff Hl-120 1200w 7mpa De Presión
  7791293051642        4.064,50      7.410,00    82.31% M [Dove] Desodorante Dove All Body Deo Fig & Suede 150 Ml
  7791293051635        4.064,50      7.410,00    82.31% M [Dove] Desodorante Dove All Body Deo Shea Butter & Cedar 150 M
  7791293051659        4.064,50      7.410,00    82.31% M [Dove] Desodorante Dove All Body Deo Lavander & Camomile 150 M
  7795323775348        1.679,00      3.059,00    82.19% M [Nutrilon Profutura] Leche Infantil 3 Nutrilon Profutura 200 M
  8445291121843        1.559,40      2.840,00    82.12% M [Nesquik] Cacao En Polvo Nesquik® Original 150g
  8445291121904        7.619,40     13.809,00    81.23% M [Nesquik] Cacao En Polvo Nesquik Original 800 G
  7622210745132        2.999,00      5.349,00    78.36% M [Milka] Chocolate Milka Oreo Blanco 55 G
  7622202328947        2.999,00      5.349,00    78.36% M [Milka] Chocolate Milka Con Leche 55 G
  7798081285494       50.999,00     89.999,00    76.47% M [Smart Life] Plancha 1200w Smartlife Sl-Di2386pn
  7791337010499        2.999,00      5.259,00    75.36% M [La Serenísima] Yogur sachet deslactosado sabor frutilla La Se
  75076818            10.619,40     18.599,00    75.14% M [Rexona] Antitranspirante femenino en crema Rexona Clinical Cl
  75076825            10.619,40     18.599,00    75.14% M [Rexona] Antitranspirante en crema Men Rexona Clean 58 grs

──────────────────────────────────────────────────────────────────────────────
  DISTRIBUCIÓN POR MARCA (top 20 en el match cross-retailer)
──────────────────────────────────────────────────────────────────────────────
  La Serenísima                72  ██████████████████████████████
  Dove                         63  ██████████████████████████
  Sedal                        51  █████████████████████
  Nivea                        51  █████████████████████
  Elvive                       49  ████████████████████
  Alicante                     42  ██████████████████
  Knorr                        42  ██████████████████
  Arcor                        35  ███████████████
  Rexona                       34  ██████████████
  Colgate                      31  █████████████
  Lucchetti                    30  █████████████
  La Virginia                  29  ████████████
  Milkaut                      27  ███████████
  Matarazzo                    26  ███████████
  Pantene                      25  ██████████
  Algabo                       25  ██████████
  Cif                          21  █████████
  Granja Del Sol               20  ████████
  Poett                        19  ████████
  Motorola                     19  ████████

──────────────────────────────────────────────────────────────────────────────
  EXCLUSIVOS POR CADENA (EAN disponible en una, no en la otra)
──────────────────────────────────────────────────────────────────────────────
  Solo en Masonline: 10.151
  Solo en Carrefour: 15.261

════════════════════════════════════════════════════════════════════════════
