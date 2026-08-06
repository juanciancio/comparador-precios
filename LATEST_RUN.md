
> olavarria-comparador-precios@0.1.0 report /home/runner/work/comparador-precios/comparador-precios
> tsx bin/report.ts --cross-retailer


════════════════════════════════════════════════════════════════════════════
  REPORTE CRUZADO POR EAN — Masonline vs Carrefour
════════════════════════════════════════════════════════════════════════════

  TOTAL DE PRODUCTOS QUE MATCHEAN POR EAN: 2.940
  (ambas cadenas, precio vigente y disponible, price > 0)

──────────────────────────────────────────────────────────────────────────────
  DISTRIBUCIÓN DE DIFERENCIAS DE PRECIO (|diff %|)
──────────────────────────────────────────────────────────────────────────────
  < 5%       1.664 ( 56.6%) ████████████████████████████████████████
  5–10%        268 (  9.1%) ██████
  10–25%       274 (  9.3%) ███████
  25–50%       603 ( 20.5%) ██████████████
  ≥ 50%        131 (  4.5%) ███

──────────────────────────────────────────────────────────────────────────────
  ¿QUIÉN ES MÁS BARATO? (empate = |diff| ≤ 1%)
──────────────────────────────────────────────────────────────────────────────
  Masonline más barato:     886 (30.1%)
  Carrefour más barato:     875 (29.8%)
  Empate:                 1.179 (40.1%)

──────────────────────────────────────────────────────────────────────────────
  TOP 20 MAYORES DIFERENCIAS (|diff %|) — spot-check manual
──────────────────────────────────────────────────────────────────────────────
  EAN                     Mas $         Car $     diff%  Producto
  7798081285128       53.071,20    214.999,00   305.11% M [Smart Life] Cafetera Smartlife Sl-Cm9402
  7806810201735       13.073,40     33.774,29   158.34% M [Ilko] Molde Ilko Desmontable Redondo 24 Cm
  7806810021678       22.239,00     51.099,30   129.77% M [Ilko] Wok 28 Cm Con Tapa Aluminio Ilko Grey Everyday
  7806810021609       24.289,00     55.474,30   128.39% M [Ilko] Olla 24 Cm Aluminio Ilko Gris Everyday
  8445291106505      108.999,00    244.499,00   124.31% M [Dolce Gusto] Cafetera Nescafe Dolce Gusto Piccolo Xs Negra Ne
  4006000050201        2.649,00      5.879,00   121.93% M [Nivea] Jabón con glicerina Nivea orquídeas para todo tipo de 
  7891132001705        1.059,00      2.339,00   120.87% M [Sazón] Saborizador para arroz Sazón 60 g.
  7790117000590        2.649,00      5.719,00   115.89% M [Separata] Bolsas para freezer Separata  30x40 cm x 20 u.
  7806810025188       17.423,40     37.204,29   113.53% M [Ilko] Molde Ilko Redondo Desmontable Non Stick 28 Cm Negro
  7791019175973        1.139,00      2.399,00   110.62% M [3 Arroyos] Copos De Maíz 3 Arroyos Miel 200 G
  192545527583        17.219,00     35.000,00   103.26% M [HP] Botella De Tinta Negra Hp Gt53 Original 1vv22al
  7795513044780          919,00      1.849,00   101.20% M [Filgo] Bolígrafo Filgo stick azul x 4 uni
  4005808944385       11.654,50     23.309,00   100.00% M [Nivea Sun] Protector Solar Nivea Swim & Play Kids Fps 60 Ultr
  7702003008504       11.654,50     23.309,00   100.00% M [Nivea] Bronceador y protector solar Nivea Sun Protect & Bronz
  7792993000992       44.999,50     89.999,00   100.00% M [Iael] Criquet Carrito 2tn 6.3kgs
  4006000016740       13.459,50     26.919,00   100.00% M [Nivea Sun] Protector Solar Nivea Sun Babies & Kids Sensitive 
  4006000016719       12.854,50     25.709,00   100.00% M [Nivea Sun] Protector Solar Humectante En Loción Nivea Sun Pro
  4006000016702       11.654,50     23.309,00   100.00% M [Nivea Sun] Protector Solar Humectante En Loción Nivea Sun Pro
  7806810025195    4.421.999,00     21.909,30   -99.50% C [Ilko] Set Mini Tarteras Ilko Non Stick 4 U 12 Cm Negro
  7798167436673          949,00      1.890,00    99.16% M [Alba] Adhesivo Vinílico Alba Pegalba 40 G Color Surtido

──────────────────────────────────────────────────────────────────────────────
  DISTRIBUCIÓN POR MARCA (top 20 en el match cross-retailer)
──────────────────────────────────────────────────────────────────────────────
  Dove                         61  ██████████████████████████████
  La Serenísima                58  █████████████████████████████
  Nivea                        47  ███████████████████████
  Elvive                       45  ██████████████████████
  Sedal                        39  ███████████████████
  Colgate                      38  ███████████████████
  Rexona                       30  ███████████████
  Knorr                        29  ██████████████
  Arcor                        25  ████████████
  Lucchetti                    25  ████████████
  Matarazzo                    23  ███████████
  Alicante                     23  ███████████
  La Virginia                  22  ███████████
  Granja Del Sol               21  ██████████
  Pedigree                     21  ██████████
  Pantene                      21  ██████████
  Algabo                       20  ██████████
  Milkaut                      20  ██████████
  Motorola                     20  ██████████
  La Salteña                   18  █████████

──────────────────────────────────────────────────────────────────────────────
  EXCLUSIVOS POR CADENA (EAN disponible en una, no en la otra)
──────────────────────────────────────────────────────────────────────────────
  Solo en Masonline: 7.965
  Solo en Carrefour: 16.649

════════════════════════════════════════════════════════════════════════════
