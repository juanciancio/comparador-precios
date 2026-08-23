
> olavarria-comparador-precios@0.1.0 report /home/runner/work/comparador-precios/comparador-precios
> tsx bin/report.ts --cross-retailer


════════════════════════════════════════════════════════════════════════════
  REPORTE CRUZADO POR EAN — Masonline vs Carrefour
════════════════════════════════════════════════════════════════════════════

  TOTAL DE PRODUCTOS QUE MATCHEAN POR EAN: 3.236
  (ambas cadenas, precio vigente y disponible, price > 0)

──────────────────────────────────────────────────────────────────────────────
  DISTRIBUCIÓN DE DIFERENCIAS DE PRECIO (|diff %|)
──────────────────────────────────────────────────────────────────────────────
  < 5%       1.693 ( 52.3%) ████████████████████████████████████████
  5–10%        277 (  8.6%) ███████
  10–25%       340 ( 10.5%) ████████
  25–50%       737 ( 22.8%) █████████████████
  ≥ 50%        189 (  5.8%) ████

──────────────────────────────────────────────────────────────────────────────
  ¿QUIÉN ES MÁS BARATO? (empate = |diff| ≤ 1%)
──────────────────────────────────────────────────────────────────────────────
  Masonline más barato:   1.505 (46.5%)
  Carrefour más barato:     827 (25.6%)
  Empate:                   904 (27.9%)

──────────────────────────────────────────────────────────────────────────────
  TOP 20 MAYORES DIFERENCIAS (|diff %|) — spot-check manual
──────────────────────────────────────────────────────────────────────────────
  EAN                     Mas $         Car $     diff%  Producto
  7798081285128       53.071,20    214.999,00   305.11% M [Smart Life] Cafetera Smartlife Sl-Cm9402
  7799111696709       23.969,00     91.999,00   283.82% M [Atma Hogar] Exprimidor Blanco Con Usb Atma Home AAEU102P
  7806810021609       24.289,00     55.474,30   128.39% M [Ilko] Olla 24 Cm Aluminio Ilko Gris Everyday
  4006000050201        2.649,00      5.879,00   121.93% M [Nivea] Jabón con glicerina Nivea orquídeas para todo tipo de 
  7891132001705        1.059,00      2.339,00   120.87% M [Sazón] Saborizador para arroz Sazón 60 g.
  7799111696747        7.869,00     16.999,00   116.02% M [Atma Hogar] Mandolina Multifunción 6 En 1 Atma Home AAMM110P
  7790117000590        2.649,00      5.719,00   115.89% M [Separata] Bolsas para freezer Separata  30x40 cm x 20 u.
  7891132001682        1.089,00      2.339,00   114.78% M [Sazón] Saborizador para verduras Sazón 60 g.
  4895038501195       11.899,30     24.990,00   110.01% M [Winfun] Juguete Sonajero Chimpancé
  7798074865917        2.861,66      5.909,00   106.49% M [Portillo] Vino naranjo dulce Portillo en botella 750 ml
  7891132012015        1.409,00      2.899,00   105.75% M [Ají No Moto] Saborizador Ají No Moto 100 G.
  7794626011177       11.319,00     22.999,00   103.19% M [Plenitud] Pañal Para Adulto Plenitud Protect Xg 8un
  7891155040866        2.249,00      4.499,00   100.04% M [NADIR] Copa Nadir Para Agua Barone  490 Ml
  26102895139          3.249,00      6.499,00   100.03% M [Mercator] Plato Playo Carine Blanco
  4006000016719       12.854,50     25.709,00   100.00% M [Nivea Sun] Protector Solar Humectante En Loción Nivea Sun Pro
  7793008017950        5.979,50     11.959,00   100.00% M [Villeneuve] Protector Solar Villeneuve Humecta Y Protege Fps 
  4005808944385       11.654,50     23.309,00   100.00% M [Nivea Sun] Protector Solar Nivea Swim & Play Kids Fps 60 Ultr
  7793008017998        7.799,50     15.599,00   100.00% M [Villeneuve] Protector solar baby Villeneuve FPS 60 120 cc.
  7702003008504       11.654,50     23.309,00   100.00% M [Nivea] Bronceador y protector solar Nivea Sun Protect & Bronz
  4006000016740       13.459,50     26.919,00   100.00% M [Nivea Sun] Protector Solar Nivea Sun Babies & Kids Sensitive 

──────────────────────────────────────────────────────────────────────────────
  DISTRIBUCIÓN POR MARCA (top 20 en el match cross-retailer)
──────────────────────────────────────────────────────────────────────────────
  Dove                         62  ██████████████████████████████
  La Serenísima                55  ███████████████████████████
  Sedal                        52  █████████████████████████
  Nivea                        49  ████████████████████████
  Elvive                       47  ███████████████████████
  Colgate                      38  ██████████████████
  Knorr                        36  █████████████████
  Alicante                     36  █████████████████
  Rexona                       35  █████████████████
  Lucchetti                    29  ██████████████
  Arcor                        27  █████████████
  Matarazzo                    26  █████████████
  La Virginia                  26  █████████████
  Pantene                      25  ████████████
  Algabo                       24  ████████████
  Milkaut                      23  ███████████
  Pedigree                     21  ██████████
  Palmolive                    19  █████████
  Granja Del Sol               19  █████████
  Ayudin                       18  █████████

──────────────────────────────────────────────────────────────────────────────
  EXCLUSIVOS POR CADENA (EAN disponible en una, no en la otra)
──────────────────────────────────────────────────────────────────────────────
  Solo en Masonline: 8.641
  Solo en Carrefour: 16.078

════════════════════════════════════════════════════════════════════════════
