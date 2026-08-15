
> olavarria-comparador-precios@0.1.0 report /home/runner/work/comparador-precios/comparador-precios
> tsx bin/report.ts --cross-retailer


════════════════════════════════════════════════════════════════════════════
  REPORTE CRUZADO POR EAN — Masonline vs Carrefour
════════════════════════════════════════════════════════════════════════════

  TOTAL DE PRODUCTOS QUE MATCHEAN POR EAN: 2.989
  (ambas cadenas, precio vigente y disponible, price > 0)

──────────────────────────────────────────────────────────────────────────────
  DISTRIBUCIÓN DE DIFERENCIAS DE PRECIO (|diff %|)
──────────────────────────────────────────────────────────────────────────────
  < 5%       1.721 ( 57.6%) ████████████████████████████████████████
  5–10%        233 (  7.8%) █████
  10–25%       306 ( 10.2%) ███████
  25–50%       579 ( 19.4%) █████████████
  ≥ 50%        150 (  5.0%) ███

──────────────────────────────────────────────────────────────────────────────
  ¿QUIÉN ES MÁS BARATO? (empate = |diff| ≤ 1%)
──────────────────────────────────────────────────────────────────────────────
  Masonline más barato:     998 (33.4%)
  Carrefour más barato:     838 (28.0%)
  Empate:                 1.153 (38.6%)

──────────────────────────────────────────────────────────────────────────────
  TOP 20 MAYORES DIFERENCIAS (|diff %|) — spot-check manual
──────────────────────────────────────────────────────────────────────────────
  EAN                     Mas $         Car $     diff%  Producto
  7798081285128       53.071,20    214.999,00   305.11% M [Smart Life] Cafetera Smartlife Sl-Cm9402
  7799111696709       23.969,00     91.999,00   283.82% M [Atma Hogar] Exprimidor Blanco Con Usb Atma Home AAEU102P
  7806810021609       24.289,00     55.474,30   128.39% M [Ilko] Olla 24 Cm Aluminio Ilko Gris Everyday
  7792170110704        1.994,30      4.550,00   128.15% M [Gatorade] Bebida Isotónica Gatorade Sabor Cool Blue 1.25 L
  7792170110568        1.994,30      4.550,00   128.15% M [Gatorade] Bebida Isotónica Gatorade Sabor Frutas Tropicales 1
  7792170110575        1.994,30      4.550,00   128.15% M [Gatorade] Bebida Isotónica Gatorade Sabor Manzana 1.25 L
  7792170110551        1.994,30      4.550,00   128.15% M [Gatorade] Bebida Isotónica Gatorade Sabor Naranja 1.25 L
  7794360000277        1.249,00      2.839,00   127.30% M [Faber Castell] Boligrafo Negro Transparente Faber Castell 4 U
  4006000050201        2.649,00      5.879,00   121.93% M [Nivea] Jabón con glicerina Nivea orquídeas para todo tipo de 
  7891132001705        1.059,00      2.339,00   120.87% M [Sazón] Saborizador para arroz Sazón 60 g.
  7799111696747        7.869,00     16.999,00   116.02% M [Atma Hogar] Mandolina Multifunción 6 En 1 Atma Home AAMM110P
  7790117000590        2.649,00      5.719,00   115.89% M [Separata] Bolsas para freezer Separata  30x40 cm x 20 u.
  656750725535         2.229,00      4.809,00   115.75% M [Glow] Esponja  Fibra Parrillera  Glow 1un
  7798225221425      118.999,30    251.879,65   111.66% M [Lusqtoff] Hidrolavadora Lüsqtoff Hl-120 1200w 7mpa De Presión
  7891000345399          579,00      1.209,00   108.81% M [Maggi] Caldo Maggi® Verdura 6 U
  7790150425251        3.439,00      7.159,00   108.17% M [Alicante] Azafrán Alicante blister x 2 uni
  7891132012015        1.409,00      2.899,00   105.75% M [Ají No Moto] Saborizador Ají No Moto 100 G.
  7806810201735       16.631,30     33.774,29   103.08% M [Ilko] Molde Ilko Desmontable Redondo 24 Cm
  7891000365472          678,00      1.369,00   101.92% M [Maggi] Maggi sabor en polvo verduras 5 uni
  7891155040866        2.249,00      4.499,00   100.04% M [NADIR] Copa Nadir Para Agua Barone  490 Ml

──────────────────────────────────────────────────────────────────────────────
  DISTRIBUCIÓN POR MARCA (top 20 en el match cross-retailer)
──────────────────────────────────────────────────────────────────────────────
  La Serenísima                55  ██████████████████████████████
  Nivea                        46  █████████████████████████
  Dove                         46  █████████████████████████
  Colgate                      39  █████████████████████
  Elvive                       39  █████████████████████
  Sedal                        36  ████████████████████
  Alicante                     29  ████████████████
  Milkaut                      29  ████████████████
  Arcor                        27  ███████████████
  Knorr                        27  ███████████████
  Lucchetti                    24  █████████████
  Matarazzo                    24  █████████████
  Pantene                      23  █████████████
  La Virginia                  22  ████████████
  Motorola                     21  ███████████
  Pedigree                     21  ███████████
  Rexona                       20  ███████████
  Algabo                       18  ██████████
  Bimbo                        18  ██████████
  Elegante                     18  ██████████

──────────────────────────────────────────────────────────────────────────────
  EXCLUSIVOS POR CADENA (EAN disponible en una, no en la otra)
──────────────────────────────────────────────────────────────────────────────
  Solo en Masonline: 8.541
  Solo en Carrefour: 15.998

════════════════════════════════════════════════════════════════════════════
