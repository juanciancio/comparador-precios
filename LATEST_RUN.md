
> olavarria-comparador-precios@0.1.0 report /home/runner/work/comparador-precios/comparador-precios
> tsx bin/report.ts --cross-retailer


════════════════════════════════════════════════════════════════════════════
  REPORTE CRUZADO POR EAN — Masonline vs Carrefour
════════════════════════════════════════════════════════════════════════════

  TOTAL DE PRODUCTOS QUE MATCHEAN POR EAN: 2.911
  (ambas cadenas, precio vigente y disponible, price > 0)

──────────────────────────────────────────────────────────────────────────────
  DISTRIBUCIÓN DE DIFERENCIAS DE PRECIO (|diff %|)
──────────────────────────────────────────────────────────────────────────────
  < 5%       1.672 ( 57.4%) ████████████████████████████████████████
  5–10%        252 (  8.7%) ██████
  10–25%       307 ( 10.5%) ███████
  25–50%       569 ( 19.5%) ██████████████
  ≥ 50%        111 (  3.8%) ███

──────────────────────────────────────────────────────────────────────────────
  ¿QUIÉN ES MÁS BARATO? (empate = |diff| ≤ 1%)
──────────────────────────────────────────────────────────────────────────────
  Masonline más barato:     929 (31.9%)
  Carrefour más barato:     856 (29.4%)
  Empate:                 1.126 (38.7%)

──────────────────────────────────────────────────────────────────────────────
  TOP 20 MAYORES DIFERENCIAS (|diff %|) — spot-check manual
──────────────────────────────────────────────────────────────────────────────
  EAN                     Mas $         Car $     diff%  Producto
  7798081285128       53.071,20    214.999,00   305.11% M [Smart Life] Cafetera Smartlife Sl-Cm9402
  7806810201735       12.815,40     33.774,29   163.54% M [Ilko] Molde Ilko Desmontable Redondo 24 Cm
  7795513075104        1.079,00      2.490,00   130.77% M [Filgo] Marcadores Escolares Pinto 2210 X 10un
  7806810021678       22.239,00     51.099,30   129.77% M [Ilko] Wok 28 Cm Con Tapa Aluminio Ilko Grey Everyday
  7806810021609       24.289,00     55.474,30   128.39% M [Ilko] Olla 24 Cm Aluminio Ilko Gris Everyday
  8445291106505      108.999,00    244.499,00   124.31% M [Dolce Gusto] Cafetera Nescafe Dolce Gusto Piccolo Xs Negra Ne
  4006000050201        2.649,00      5.879,00   121.93% M [Nivea] Jabón con glicerina Nivea orquídeas para todo tipo de 
  7891132001705        1.059,00      2.339,00   120.87% M [Sazón] Saborizador para arroz Sazón 60 g.
  7790117000590        2.649,00      5.719,00   115.89% M [Separata] Bolsas para freezer Separata  30x40 cm x 20 u.
  656750725535         2.229,00      4.809,00   115.75% M [Glow] Esponja  Fibra Parrillera  Glow 1un
  7806810025188       17.423,40     37.204,29   113.53% M [Ilko] Molde Ilko Redondo Desmontable Non Stick 28 Cm Negro
  26102895139          3.249,00      6.499,00   100.03% M [Mercator] Plato Playo Carine Blanco
  4006000016740       13.459,50     26.919,00   100.00% M [Nivea Sun] Protector Solar Nivea Sun Babies & Kids Sensitive 
  7702003008504       11.654,50     23.309,00   100.00% M [Nivea] Bronceador y protector solar Nivea Sun Protect & Bronz
  4006000016719       12.854,50     25.709,00   100.00% M [Nivea Sun] Protector Solar Humectante En Loción Nivea Sun Pro
  4005808944385       11.654,50     23.309,00   100.00% M [Nivea Sun] Protector Solar Nivea Swim & Play Kids Fps 60 Ultr
  7806810025195    4.421.999,00     21.909,30   -99.50% C [Ilko] Set Mini Tarteras Ilko Non Stick 4 U 12 Cm Negro
  7798167436673          949,00      1.890,00    99.16% M [Alba] Adhesivo Vinílico Alba Pegalba 40 G Color Surtido
  7798104180928          769,00      1.529,00    98.83% M [Megaprice] Camioncito Bombero Megaprice
  70177197292          3.966,00      7.859,00    98.16% M [Twinings] Té Twinings Earl Grey 10 Saquitos

──────────────────────────────────────────────────────────────────────────────
  DISTRIBUCIÓN POR MARCA (top 20 en el match cross-retailer)
──────────────────────────────────────────────────────────────────────────────
  Dove                         56  ██████████████████████████████
  Nivea                        46  █████████████████████████
  La Serenísima                44  ████████████████████████
  Elvive                       44  ████████████████████████
  Colgate                      37  ████████████████████
  Sedal                        36  ███████████████████
  Milkaut                      31  █████████████████
  Knorr                        27  ██████████████
  Arcor                        27  ██████████████
  Rexona                       26  ██████████████
  Lucchetti                    23  ████████████
  Pantene                      23  ████████████
  Alicante                     23  ████████████
  Matarazzo                    22  ████████████
  Algabo                       21  ███████████
  Motorola                     21  ███████████
  La Virginia                  20  ███████████
  Pedigree                     20  ███████████
  Tonadita                     18  ██████████
  Granja Del Sol               17  █████████

──────────────────────────────────────────────────────────────────────────────
  EXCLUSIVOS POR CADENA (EAN disponible en una, no en la otra)
──────────────────────────────────────────────────────────────────────────────
  Solo en Masonline: 8.560
  Solo en Carrefour: 16.517

════════════════════════════════════════════════════════════════════════════
