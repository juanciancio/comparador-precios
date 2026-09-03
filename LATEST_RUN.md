
> olavarria-comparador-precios@0.1.0 report /home/runner/work/comparador-precios/comparador-precios
> tsx bin/report.ts --cross-retailer


════════════════════════════════════════════════════════════════════════════
  REPORTE CRUZADO POR EAN — Masonline vs Carrefour
════════════════════════════════════════════════════════════════════════════

  TOTAL DE PRODUCTOS QUE MATCHEAN POR EAN: 3.227
  (ambas cadenas, precio vigente y disponible, price > 0)

──────────────────────────────────────────────────────────────────────────────
  DISTRIBUCIÓN DE DIFERENCIAS DE PRECIO (|diff %|)
──────────────────────────────────────────────────────────────────────────────
  < 5%       1.932 ( 59.9%) ████████████████████████████████████████
  5–10%        292 (  9.0%) ██████
  10–25%       288 (  8.9%) ██████
  25–50%       563 ( 17.4%) ████████████
  ≥ 50%        152 (  4.7%) ███

──────────────────────────────────────────────────────────────────────────────
  ¿QUIÉN ES MÁS BARATO? (empate = |diff| ≤ 1%)
──────────────────────────────────────────────────────────────────────────────
  Masonline más barato:     840 (26.0%)
  Carrefour más barato:   1.015 (31.5%)
  Empate:                 1.372 (42.5%)

──────────────────────────────────────────────────────────────────────────────
  TOP 20 MAYORES DIFERENCIAS (|diff %|) — spot-check manual
──────────────────────────────────────────────────────────────────────────────
  EAN                     Mas $         Car $     diff%  Producto
  4006000050201        2.649,00      5.879,00   121.93% M [Nivea] Jabón con glicerina Nivea orquídeas para todo tipo de 
  7891132001705        1.059,00      2.339,00   120.87% M [Sazón] Saborizador para arroz Sazón 60 g.
  7790117000590        2.649,00      5.719,00   115.89% M [Separata] Bolsas para freezer Separata  30x40 cm x 20 u.
  7799111696396       10.262,85     21.999,00   114.36% M [Atma Hogar] Picadora Manual Atma Home Blanco AAPM111P
  7798125593875       24.039,00     51.307,20   113.43% M [ASTON] Olla Cacerola Aston  Antiadherente 24 Cm Tapa Vidrio T
  7798225221425      169.999,00    359.828,07   111.66% M [Lusqtoff] Hidrolavadora Lüsqtoff Hl-120 1200w 7mpa De Presión
  8445291106505      108.954,00    227.799,00   109.08% M [Dolce Gusto] Cafetera Nescafe Dolce Gusto Piccolo Xs Negra Ne
  7794626011177       11.319,00     22.999,00   103.19% M [Plenitud] Pañal Para Adulto Plenitud Protect Xg 8un
  7792281613682        2.549,00      5.139,00   101.61% M [Carol] Plato Carol 25 Cm Granito Negro
  7792281063203        4.289,00      8.639,00   101.42% M [Carol] Bowl Recto Carol 2,3 L Granito Negro
  7795513044780          919,00      1.849,00   101.20% M [Filgo] Bolígrafo Filgo stick azul x 4 uni
  7790742326300        1.659,50      3.319,00   100.00% M [La Serenísima] Queso Untable La Serenísima Sabor Salame 180 G
  7790742249906        7.344,50     14.689,00   100.00% M [La Serenísima] Queso Mozzarella La Serenísima Sin Lactosa 500
  7790742326607        1.659,50      3.319,00   100.00% M [La Serenísima] Queso Untable La Serenísima Jamón 180 G
  7794820014967        1.759,50      3.519,00   100.00% M [Milkaut] Queso  Untable Milkaut Clásico 190 G
  7790299003662        7.374,50     14.749,00   100.00% M [Ferrini] Crema sapolán light Ferrini en pote 200 cc.
  7794820015018        1.759,50      3.519,00   100.00% M [Milkaut] Queso Untable Milkaut Clásico Light 190 G
  7790299003655        8.189,50     16.379,00   100.00% M [Ferrini] Crema sapolán light Ferrini en pote 200 cc.
  7790580131746        2.049,00      4.089,00    99.56% M [Godet] Bizcochuelo vainilla Godet caja 480 g.
  7806810025195    4.421.999,00     21.909,30   -99.50% C [Ilko] Set Mini Tarteras Ilko Non Stick 4 U 12 Cm Negro

──────────────────────────────────────────────────────────────────────────────
  DISTRIBUCIÓN POR MARCA (top 20 en el match cross-retailer)
──────────────────────────────────────────────────────────────────────────────
  La Serenísima                69  ██████████████████████████████
  Dove                         64  ████████████████████████████
  Nivea                        50  ██████████████████████
  Elvive                       44  ███████████████████
  Sedal                        43  ███████████████████
  Knorr                        33  ██████████████
  Arcor                        33  ██████████████
  Colgate                      31  █████████████
  Alicante                     30  █████████████
  Lucchetti                    27  ████████████
  Algabo                       26  ███████████
  Rexona                       26  ███████████
  Milkaut                      24  ██████████
  Pantene                      24  ██████████
  Matarazzo                    23  ██████████
  La Virginia                  22  ██████████
  Pedigree                     22  ██████████
  Palmolive                    19  ████████
  Philips                      18  ████████
  Johnson´s Baby               18  ████████

──────────────────────────────────────────────────────────────────────────────
  EXCLUSIVOS POR CADENA (EAN disponible en una, no en la otra)
──────────────────────────────────────────────────────────────────────────────
  Solo en Masonline: 8.607
  Solo en Carrefour: 16.150

════════════════════════════════════════════════════════════════════════════
