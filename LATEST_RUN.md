
> olavarria-comparador-precios@0.1.0 report /home/runner/work/comparador-precios/comparador-precios
> tsx bin/report.ts --cross-retailer


════════════════════════════════════════════════════════════════════════════
  REPORTE CRUZADO POR EAN — Masonline vs Carrefour
════════════════════════════════════════════════════════════════════════════

  TOTAL DE PRODUCTOS QUE MATCHEAN POR EAN: 2.618
  (ambas cadenas, precio vigente y disponible, price > 0)

──────────────────────────────────────────────────────────────────────────────
  DISTRIBUCIÓN DE DIFERENCIAS DE PRECIO (|diff %|)
──────────────────────────────────────────────────────────────────────────────
  < 5%       1.722 ( 65.8%) ████████████████████████████████████████
  5–10%        193 (  7.4%) ████
  10–25%       257 (  9.8%) ██████
  25–50%       349 ( 13.3%) ████████
  ≥ 50%         97 (  3.7%) ██

──────────────────────────────────────────────────────────────────────────────
  ¿QUIÉN ES MÁS BARATO? (empate = |diff| ≤ 1%)
──────────────────────────────────────────────────────────────────────────────
  Masonline más barato:     385 (14.7%)
  Carrefour más barato:     842 (32.2%)
  Empate:                 1.391 (53.1%)

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
  7891000345344          579,00      1.209,00   108.81% M [Maggi] Caldo de Gallina Maggi 6 uni
  7891000345399          579,00      1.209,00   108.81% M [Maggi] Caldo Maggi® Verdura 6 U
  7891132012015        1.409,00      2.899,00   105.75% M [Ají No Moto] Saborizador Ají No Moto 100 G.
  7806810201735       16.631,30     33.774,29   103.08% M [Ilko] Molde Ilko Desmontable Redondo 24 Cm
  7702003008504       11.654,50     23.309,00   100.00% M [Nivea] Bronceador y protector solar Nivea Sun Protect & Bronz
  4005808944385       11.654,50     23.309,00   100.00% M [Nivea Sun] Protector Solar Nivea Swim & Play Kids Fps 60 Ultr
  4006000016719       12.854,50     25.709,00   100.00% M [Nivea Sun] Protector Solar Humectante En Loción Nivea Sun Pro
  4006000016740       13.459,50     26.919,00   100.00% M [Nivea Sun] Protector Solar Nivea Sun Babies & Kids Sensitive 
  7790299003662        7.374,50     14.749,00   100.00% M [Ferrini] Crema sapolán light Ferrini en pote 200 cc.
  7790299003655        8.189,50     16.379,00   100.00% M [Ferrini] Crema sapolán light Ferrini en pote 200 cc.
  7806810025195    4.421.999,00     21.909,30   -99.50% C [Ilko] Set Mini Tarteras Ilko Non Stick 4 U 12 Cm Negro
  7798167436673          949,00      1.890,00    99.16% M [Alba] Adhesivo Vinílico Alba Pegalba 40 G Color Surtido
  7798104180928          769,00      1.529,00    98.83% M [Megaprice] Camioncito Bombero Megaprice

──────────────────────────────────────────────────────────────────────────────
  DISTRIBUCIÓN POR MARCA (top 20 en el match cross-retailer)
──────────────────────────────────────────────────────────────────────────────
  Dove                         49  ██████████████████████████████
  La Serenísima                45  ████████████████████████████
  Nivea                        43  ██████████████████████████
  Elvive                       39  ████████████████████████
  Colgate                      35  █████████████████████
  Sedal                        33  ████████████████████
  Milkaut                      28  █████████████████
  Arcor                        26  ████████████████
  Knorr                        26  ████████████████
  Rexona                       25  ███████████████
  Matarazzo                    25  ███████████████
  Lucchetti                    23  ██████████████
  Alicante                     22  █████████████
  Motorola                     21  █████████████
  Pedigree                     20  ████████████
  Pantene                      18  ███████████
  La Virginia                  16  ██████████
  Taragui                      15  █████████
  Tonadita                     15  █████████
  Whiskas                      15  █████████

──────────────────────────────────────────────────────────────────────────────
  EXCLUSIVOS POR CADENA (EAN disponible en una, no en la otra)
──────────────────────────────────────────────────────────────────────────────
  Solo en Masonline: 7.692
  Solo en Carrefour: 16.564

════════════════════════════════════════════════════════════════════════════
