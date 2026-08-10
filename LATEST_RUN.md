
> olavarria-comparador-precios@0.1.0 report /home/runner/work/comparador-precios/comparador-precios
> tsx bin/report.ts --cross-retailer


════════════════════════════════════════════════════════════════════════════
  REPORTE CRUZADO POR EAN — Masonline vs Carrefour
════════════════════════════════════════════════════════════════════════════

  TOTAL DE PRODUCTOS QUE MATCHEAN POR EAN: 2.659
  (ambas cadenas, precio vigente y disponible, price > 0)

──────────────────────────────────────────────────────────────────────────────
  DISTRIBUCIÓN DE DIFERENCIAS DE PRECIO (|diff %|)
──────────────────────────────────────────────────────────────────────────────
  < 5%       1.670 ( 62.8%) ████████████████████████████████████████
  5–10%        184 (  6.9%) ████
  10–25%       242 (  9.1%) ██████
  25–50%       458 ( 17.2%) ███████████
  ≥ 50%        105 (  3.9%) ███

──────────────────────────────────────────────────────────────────────────────
  ¿QUIÉN ES MÁS BARATO? (empate = |diff| ≤ 1%)
──────────────────────────────────────────────────────────────────────────────
  Masonline más barato:     428 (16.1%)
  Carrefour más barato:     848 (31.9%)
  Empate:                 1.383 (52.0%)

──────────────────────────────────────────────────────────────────────────────
  TOP 20 MAYORES DIFERENCIAS (|diff %|) — spot-check manual
──────────────────────────────────────────────────────────────────────────────
  EAN                     Mas $         Car $     diff%  Producto
  7798081285128       53.071,20    214.999,00   305.11% M [Smart Life] Cafetera Smartlife Sl-Cm9402
  7806810201735       13.073,40     33.774,29   158.34% M [Ilko] Molde Ilko Desmontable Redondo 24 Cm
  7806810021609       24.289,00     55.474,30   128.39% M [Ilko] Olla 24 Cm Aluminio Ilko Gris Everyday
  4006000050201        2.649,00      5.879,00   121.93% M [Nivea] Jabón con glicerina Nivea orquídeas para todo tipo de 
  7891132001705        1.059,00      2.339,00   120.87% M [Sazón] Saborizador para arroz Sazón 60 g.
  7790117000590        2.649,00      5.719,00   115.89% M [Separata] Bolsas para freezer Separata  30x40 cm x 20 u.
  7806810025188       17.423,40     37.204,29   113.53% M [Ilko] Molde Ilko Redondo Desmontable Non Stick 28 Cm Negro
  7500435245814       11.729,00     24.849,00   111.86% M [Gillette] Maquina Afeitar Desechable Gillette Prestobarba Car
  7791019175973        1.139,00      2.399,00   110.62% M [3 Arroyos] Copos De Maíz 3 Arroyos Miel 200 G
  7806810025119       17.423,40     35.944,29   106.30% M [Ilko] Molde Ilko Desmontable Redondo Non Stick 26 Cm Negro
  7891132012015        1.409,00      2.899,00   105.75% M [Ají No Moto] Saborizador Ají No Moto 100 G.
  7795513044780          919,00      1.849,00   101.20% M [Filgo] Bolígrafo Filgo stick azul x 4 uni
  26102895139          3.249,00      6.499,00   100.03% M [Mercator] Plato Playo Carine Blanco
  4006000016719       12.854,50     25.709,00   100.00% M [Nivea Sun] Protector Solar Humectante En Loción Nivea Sun Pro
  4006000016740       13.459,50     26.919,00   100.00% M [Nivea Sun] Protector Solar Nivea Sun Babies & Kids Sensitive 
  4005808944385       11.654,50     23.309,00   100.00% M [Nivea Sun] Protector Solar Nivea Swim & Play Kids Fps 60 Ultr
  7790299003662        7.374,50     14.749,00   100.00% M [Ferrini] Crema sapolán light Ferrini en pote 200 cc.
  7702003008504       11.654,50     23.309,00   100.00% M [Nivea] Bronceador y protector solar Nivea Sun Protect & Bronz
  7790299003655        8.189,50     16.379,00   100.00% M [Ferrini] Crema sapolán light Ferrini en pote 200 cc.
  7806810025195    4.421.999,00     21.909,30   -99.50% C [Ilko] Set Mini Tarteras Ilko Non Stick 4 U 12 Cm Negro

──────────────────────────────────────────────────────────────────────────────
  DISTRIBUCIÓN POR MARCA (top 20 en el match cross-retailer)
──────────────────────────────────────────────────────────────────────────────
  Dove                         50  ██████████████████████████████
  Nivea                        43  ██████████████████████████
  La Serenísima                39  ███████████████████████
  Elvive                       39  ███████████████████████
  Colgate                      36  ██████████████████████
  Sedal                        34  ████████████████████
  Milkaut                      29  █████████████████
  Arcor                        26  ████████████████
  Knorr                        26  ████████████████
  Rexona                       26  ████████████████
  Matarazzo                    25  ███████████████
  Lucchetti                    23  ██████████████
  Alicante                     22  █████████████
  Pedigree                     20  ████████████
  Motorola                     19  ███████████
  Pantene                      19  ███████████
  La Virginia                  18  ███████████
  Algabo                       16  ██████████
  Elegante                     15  █████████
  Taragui                      15  █████████

──────────────────────────────────────────────────────────────────────────────
  EXCLUSIVOS POR CADENA (EAN disponible en una, no en la otra)
──────────────────────────────────────────────────────────────────────────────
  Solo en Masonline: 7.766
  Solo en Carrefour: 16.399

════════════════════════════════════════════════════════════════════════════
