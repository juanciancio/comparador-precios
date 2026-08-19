
> olavarria-comparador-precios@0.1.0 report /home/runner/work/comparador-precios/comparador-precios
> tsx bin/report.ts --cross-retailer


════════════════════════════════════════════════════════════════════════════
  REPORTE CRUZADO POR EAN — Masonline vs Carrefour
════════════════════════════════════════════════════════════════════════════

  TOTAL DE PRODUCTOS QUE MATCHEAN POR EAN: 2.862
  (ambas cadenas, precio vigente y disponible, price > 0)

──────────────────────────────────────────────────────────────────────────────
  DISTRIBUCIÓN DE DIFERENCIAS DE PRECIO (|diff %|)
──────────────────────────────────────────────────────────────────────────────
  < 5%       1.772 ( 61.9%) ████████████████████████████████████████
  5–10%        253 (  8.8%) ██████
  10–25%       339 ( 11.8%) ████████
  25–50%       379 ( 13.2%) █████████
  ≥ 50%        119 (  4.2%) ███

──────────────────────────────────────────────────────────────────────────────
  ¿QUIÉN ES MÁS BARATO? (empate = |diff| ≤ 1%)
──────────────────────────────────────────────────────────────────────────────
  Masonline más barato:     882 (30.8%)
  Carrefour más barato:     942 (32.9%)
  Empate:                 1.038 (36.3%)

──────────────────────────────────────────────────────────────────────────────
  TOP 20 MAYORES DIFERENCIAS (|diff %|) — spot-check manual
──────────────────────────────────────────────────────────────────────────────
  EAN                     Mas $         Car $     diff%  Producto
  7798081285128       53.071,20    214.999,00   305.11% M [Smart Life] Cafetera Smartlife Sl-Cm9402
  7799111696709       23.969,00     91.999,00   283.82% M [Atma Hogar] Exprimidor Blanco Con Usb Atma Home AAEU102P
  7798122112604       49.999,00    174.464,10   248.94% M [Moulinex] Batidora De Mano Moulinex Facilita Plus 400w Blanco
  7806810021609       24.289,00     55.474,30   128.39% M [Ilko] Olla 24 Cm Aluminio Ilko Gris Everyday
  7794360000277        1.249,00      2.839,00   127.30% M [Faber Castell] Boligrafo Negro Transparente Faber Castell 4 U
  4006000050201        2.649,00      5.879,00   121.93% M [Nivea] Jabón con glicerina Nivea orquídeas para todo tipo de 
  7891132001705        1.059,00      2.339,00   120.87% M [Sazón] Saborizador para arroz Sazón 60 g.
  7799111696747        7.869,00     16.999,00   116.02% M [Atma Hogar] Mandolina Multifunción 6 En 1 Atma Home AAMM110P
  7790117000590        2.649,00      5.719,00   115.89% M [Separata] Bolsas para freezer Separata  30x40 cm x 20 u.
  656750725535         2.229,00      4.809,00   115.75% M [Glow] Esponja  Fibra Parrillera  Glow 1un
  7791019175973        1.139,00      2.399,00   110.62% M [3 Arroyos] Copos De Maíz 3 Arroyos Miel 200 G
  7790150425251        3.439,00      7.159,00   108.17% M [Alicante] Azafrán Alicante blister x 2 uni
  7891155040866        2.249,00      4.499,00   100.04% M [NADIR] Copa Nadir Para Agua Barone  490 Ml
  26102895139          3.249,00      6.499,00   100.03% M [Mercator] Plato Playo Carine Blanco
  7790299003655        8.189,50     16.379,00   100.00% M [Ferrini] Crema sapolán light Ferrini en pote 200 cc.
  7790299003662        7.374,50     14.749,00   100.00% M [Ferrini] Crema sapolán light Ferrini en pote 200 cc.
  4005808944385       11.654,50     23.309,00   100.00% M [Nivea Sun] Protector Solar Nivea Swim & Play Kids Fps 60 Ultr
  7702003008504       11.654,50     23.309,00   100.00% M [Nivea] Bronceador y protector solar Nivea Sun Protect & Bronz
  7793008017950        5.979,50     11.959,00   100.00% M [Villeneuve] Protector Solar Villeneuve Humecta Y Protege Fps 
  4006000016740       13.459,50     26.919,00   100.00% M [Nivea Sun] Protector Solar Nivea Sun Babies & Kids Sensitive 

──────────────────────────────────────────────────────────────────────────────
  DISTRIBUCIÓN POR MARCA (top 20 en el match cross-retailer)
──────────────────────────────────────────────────────────────────────────────
  La Serenísima                61  ██████████████████████████████
  Dove                         45  ██████████████████████
  Nivea                        42  █████████████████████
  Colgate                      37  ██████████████████
  Sedal                        33  ████████████████
  Alicante                     32  ████████████████
  Arcor                        30  ███████████████
  Milkaut                      30  ███████████████
  Elvive                       29  ██████████████
  Lucchetti                    28  ██████████████
  Knorr                        26  █████████████
  Matarazzo                    26  █████████████
  Pedigree                     19  █████████
  Granja Del Sol               19  █████████
  Royal                        19  █████████
  Algabo                       18  █████████
  Motorola                     18  █████████
  Gallo                        18  █████████
  Philco                       17  ████████
  Tonadita                     17  ████████

──────────────────────────────────────────────────────────────────────────────
  EXCLUSIVOS POR CADENA (EAN disponible en una, no en la otra)
──────────────────────────────────────────────────────────────────────────────
  Solo en Masonline: 8.612
  Solo en Carrefour: 15.814

════════════════════════════════════════════════════════════════════════════
