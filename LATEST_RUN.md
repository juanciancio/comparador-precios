
> olavarria-comparador-precios@0.1.0 report /home/runner/work/comparador-precios/comparador-precios
> tsx bin/report.ts --cross-retailer


════════════════════════════════════════════════════════════════════════════
  REPORTE CRUZADO POR EAN — Masonline vs Carrefour
════════════════════════════════════════════════════════════════════════════

  TOTAL DE PRODUCTOS QUE MATCHEAN POR EAN: 2.731
  (ambas cadenas, precio vigente y disponible, price > 0)

──────────────────────────────────────────────────────────────────────────────
  DISTRIBUCIÓN DE DIFERENCIAS DE PRECIO (|diff %|)
──────────────────────────────────────────────────────────────────────────────
  < 5%       1.587 ( 58.1%) ████████████████████████████████████████
  5–10%        211 (  7.7%) █████
  10–25%       278 ( 10.2%) ███████
  25–50%       521 ( 19.1%) █████████████
  ≥ 50%        134 (  4.9%) ███

──────────────────────────────────────────────────────────────────────────────
  ¿QUIÉN ES MÁS BARATO? (empate = |diff| ≤ 1%)
──────────────────────────────────────────────────────────────────────────────
  Masonline más barato:     622 (22.8%)
  Carrefour más barato:     839 (30.7%)
  Empate:                 1.270 (46.5%)

──────────────────────────────────────────────────────────────────────────────
  TOP 20 MAYORES DIFERENCIAS (|diff %|) — spot-check manual
──────────────────────────────────────────────────────────────────────────────
  EAN                     Mas $         Car $     diff%  Producto
  7798081285128       53.071,20    214.999,00   305.11% M [Smart Life] Cafetera Smartlife Sl-Cm9402
  7806810021609       24.289,00     55.474,30   128.39% M [Ilko] Olla 24 Cm Aluminio Ilko Gris Everyday
  4006000050201        2.649,00      5.879,00   121.93% M [Nivea] Jabón con glicerina Nivea orquídeas para todo tipo de 
  7891132001705        1.059,00      2.339,00   120.87% M [Sazón] Saborizador para arroz Sazón 60 g.
  7790117000590        2.649,00      5.719,00   115.89% M [Separata] Bolsas para freezer Separata  30x40 cm x 20 u.
  7500435245814       11.729,00     24.849,00   111.86% M [Gillette] Maquina Afeitar Desechable Gillette Prestobarba Car
  7791019175973        1.139,00      2.399,00   110.62% M [3 Arroyos] Copos De Maíz 3 Arroyos Miel 200 G
  7891000345399          579,00      1.209,00   108.81% M [Maggi] Caldo Maggi® Verdura 6 U
  7790150425251        3.439,00      7.159,00   108.17% M [Alicante] Azafrán Alicante blister x 2 uni
  7891132012015        1.409,00      2.899,00   105.75% M [Ají No Moto] Saborizador Ají No Moto 100 G.
  7806810201735       16.631,30     33.774,29   103.08% M [Ilko] Molde Ilko Desmontable Redondo 24 Cm
  7891000365472          678,00      1.369,00   101.92% M [Maggi] Maggi sabor en polvo verduras 5 uni
  7891155040866        2.249,00      4.499,00   100.04% M [NADIR] Copa Nadir Para Agua Barone  490 Ml
  7702003008504       11.654,50     23.309,00   100.00% M [Nivea] Bronceador y protector solar Nivea Sun Protect & Bronz
  7790299003655        8.189,50     16.379,00   100.00% M [Ferrini] Crema sapolán light Ferrini en pote 200 cc.
  7790299003662        7.374,50     14.749,00   100.00% M [Ferrini] Crema sapolán light Ferrini en pote 200 cc.
  4006000016740       13.459,50     26.919,00   100.00% M [Nivea Sun] Protector Solar Nivea Sun Babies & Kids Sensitive 
  4005808944385       11.654,50     23.309,00   100.00% M [Nivea Sun] Protector Solar Nivea Swim & Play Kids Fps 60 Ultr
  4006000016719       12.854,50     25.709,00   100.00% M [Nivea Sun] Protector Solar Humectante En Loción Nivea Sun Pro
  7806810025195    4.421.999,00     21.909,30   -99.50% C [Ilko] Set Mini Tarteras Ilko Non Stick 4 U 12 Cm Negro

──────────────────────────────────────────────────────────────────────────────
  DISTRIBUCIÓN POR MARCA (top 20 en el match cross-retailer)
──────────────────────────────────────────────────────────────────────────────
  La Serenísima                52  ██████████████████████████████
  Nivea                        47  ███████████████████████████
  Dove                         46  ███████████████████████████
  Colgate                      40  ███████████████████████
  Elvive                       37  █████████████████████
  Sedal                        32  ██████████████████
  Arcor                        27  ████████████████
  Knorr                        26  ███████████████
  Alicante                     25  ██████████████
  Matarazzo                    25  ██████████████
  Milkaut                      24  ██████████████
  Rexona                       24  ██████████████
  Lucchetti                    23  █████████████
  Motorola                     21  ████████████
  Pantene                      20  ████████████
  La Virginia                  19  ███████████
  Pedigree                     19  ███████████
  Elegante                     18  ██████████
  Algabo                       16  █████████
  Electrolux                   15  █████████

──────────────────────────────────────────────────────────────────────────────
  EXCLUSIVOS POR CADENA (EAN disponible en una, no en la otra)
──────────────────────────────────────────────────────────────────────────────
  Solo en Masonline: 7.827
  Solo en Carrefour: 16.025

════════════════════════════════════════════════════════════════════════════
