
> olavarria-comparador-precios@0.1.0 report /home/runner/work/comparador-precios/comparador-precios
> tsx bin/report.ts --cross-retailer


════════════════════════════════════════════════════════════════════════════
  REPORTE CRUZADO POR EAN — Masonline vs Carrefour
════════════════════════════════════════════════════════════════════════════

  TOTAL DE PRODUCTOS QUE MATCHEAN POR EAN: 4.096
  (ambas cadenas, precio vigente y disponible, price > 0)

──────────────────────────────────────────────────────────────────────────────
  DISTRIBUCIÓN DE DIFERENCIAS DE PRECIO (|diff %|)
──────────────────────────────────────────────────────────────────────────────
  < 5%       1.720 ( 42.0%) ████████████████████████████████████████
  5–10%        811 ( 19.8%) ███████████████████
  10–25%       505 ( 12.3%) ████████████
  25–50%       734 ( 17.9%) █████████████████
  ≥ 50%        326 (  8.0%) ████████

──────────────────────────────────────────────────────────────────────────────
  ¿QUIÉN ES MÁS BARATO? (empate = |diff| ≤ 1%)
──────────────────────────────────────────────────────────────────────────────
  Masonline más barato:   2.042 (49.9%)
  Carrefour más barato:   1.207 (29.5%)
  Empate:                   847 (20.7%)

──────────────────────────────────────────────────────────────────────────────
  TOP 20 MAYORES DIFERENCIAS (|diff %|) — spot-check manual
──────────────────────────────────────────────────────────────────────────────
  EAN                     Mas $         Car $     diff%  Producto
  7793015000426       10.646,35    499.486,00  4591.62% M [Sirena] Termotanque Sirena 90 Lts Eléctrico De Colgar
  7799111696709       23.969,00     91.999,00   283.82% M [Atma Hogar] Exprimidor Blanco Con Usb Atma Home AAEU102P
  7798122112604       49.999,00    175.859,10   251.73% M [Moulinex] Batidora De Mano Moulinex Facilita Plus 400w Blanco
  7799111681491       15.794,35     42.899,00   171.61% M [Philco] Termo Philco de Acero Inoxidable 650ml Blanco con Pic
  7799111682498       16.112,85     42.899,00   166.24% M [Philco] Botella Térmica Infantil De Acero Inoxidable 550ml Ce
  7806810201735       15.137,85     34.334,29   126.81% M [Ilko] Molde Ilko Desmontable Redondo 24 Cm
  7799111696747        7.869,00     16.999,00   116.02% M [Atma Hogar] Mandolina Multifunción 6 En 1 Atma Home AAMM110P
  7792170110704        2.129,00      4.550,00   113.72% M [Gatorade] Bebida Isotónica Gatorade Sabor Cool Blue 1.25 L
  7792170110568        2.129,00      4.550,00   113.72% M [Gatorade] Bebida Isotónica Gatorade Sabor Frutas Tropicales 1
  7792170110575        2.129,00      4.550,00   113.72% M [Gatorade] Bebida Isotónica Gatorade Sabor Manzana 1.25 L
  7798225221425      169.999,00    359.828,07   111.66% M [Lusqtoff] Hidrolavadora Lüsqtoff Hl-120 1200w 7mpa De Presión
  7793913014266        1.125,00      2.250,00   100.00% M [Tregar] Yogur Descremado Tregar Durazno 150g
  70177197292          3.966,00      7.859,00    98.16% M [Twinings] Té Twinings Earl Grey 10 Saquitos
  7622201806552        1.469,40      2.889,00    96.61% M [Oreo] Galletitas Oreo Golden Vainilla Rellenas Con Crema 118 
  7796885483382      269.999,00    499.999,00    85.19% M [BGH] Horno Eléctrico Bgh Bhe64m25n 64l 2200w Grill Convección
  7806810025188       20.168,85     37.169,29    84.29% M [Ilko] Molde Ilko Redondo Desmontable Non Stick 28 Cm Negro
  7791813405016        1.839,00      3.349,00    82.11% M [H20!] Agua Saborizada H2oh! Still Sabor Pomelo 2 L
  7791813405023        1.839,00      3.349,00    82.11% M [H20!] Agua Saborizada H2oh! Still Sabor Limoneto 2 L
  7791813403012        1.759,00      3.200,00    81.92% M [H20!] Agua Saborizada Sin Gas H2oh Sabor Pomelo 1,5 L
  7791813403029        1.759,00      3.200,00    81.92% M [H20!] Agua Saborizada Sin Gas H2oh Sabor Limón 1,5 L

──────────────────────────────────────────────────────────────────────────────
  DISTRIBUCIÓN POR MARCA (top 20 en el match cross-retailer)
──────────────────────────────────────────────────────────────────────────────
  La Serenísima                72  ██████████████████████████████
  Dove                         66  ████████████████████████████
  Sedal                        54  ███████████████████████
  Elvive                       52  ██████████████████████
  Nivea                        52  ██████████████████████
  Knorr                        48  ████████████████████
  Alicante                     41  █████████████████
  Arcor                        37  ███████████████
  Rexona                       37  ███████████████
  Colgate                      34  ██████████████
  Milkaut                      32  █████████████
  Algabo                       30  █████████████
  Lucchetti                    30  █████████████
  Matarazzo                    29  ████████████
  La Virginia                  27  ███████████
  Pantene                      24  ██████████
  Ayudin                       23  ██████████
  Poett                        22  █████████
  Cif                          22  █████████
  Pedigree                     22  █████████

──────────────────────────────────────────────────────────────────────────────
  EXCLUSIVOS POR CADENA (EAN disponible en una, no en la otra)
──────────────────────────────────────────────────────────────────────────────
  Solo en Masonline: 13.176
  Solo en Carrefour: 14.867

════════════════════════════════════════════════════════════════════════════
