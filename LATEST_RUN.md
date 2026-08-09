
> olavarria-comparador-precios@0.1.0 report /home/runner/work/comparador-precios/comparador-precios
> tsx bin/report.ts --cross-retailer


════════════════════════════════════════════════════════════════════════════
  REPORTE CRUZADO POR EAN — Masonline vs Carrefour
════════════════════════════════════════════════════════════════════════════

  TOTAL DE PRODUCTOS QUE MATCHEAN POR EAN: 3.006
  (ambas cadenas, precio vigente y disponible, price > 0)

──────────────────────────────────────────────────────────────────────────────
  DISTRIBUCIÓN DE DIFERENCIAS DE PRECIO (|diff %|)
──────────────────────────────────────────────────────────────────────────────
  < 5%       1.688 ( 56.2%) ████████████████████████████████████████
  5–10%        282 (  9.4%) ███████
  10–25%       312 ( 10.4%) ███████
  25–50%       607 ( 20.2%) ██████████████
  ≥ 50%        117 (  3.9%) ███

──────────────────────────────────────────────────────────────────────────────
  ¿QUIÉN ES MÁS BARATO? (empate = |diff| ≤ 1%)
──────────────────────────────────────────────────────────────────────────────
  Masonline más barato:     992 (33.0%)
  Carrefour más barato:     916 (30.5%)
  Empate:                 1.098 (36.5%)

──────────────────────────────────────────────────────────────────────────────
  TOP 20 MAYORES DIFERENCIAS (|diff %|) — spot-check manual
──────────────────────────────────────────────────────────────────────────────
  EAN                     Mas $         Car $     diff%  Producto
  7798008632066        3.199,80     15.999,00   400.00% M [Doble G] Taza Doble G Línea Universal Adaptable Fiat Palio To
  7798081285128       53.071,20    214.999,00   305.11% M [Smart Life] Cafetera Smartlife Sl-Cm9402
  7806810201735       13.073,40     33.774,29   158.34% M [Ilko] Molde Ilko Desmontable Redondo 24 Cm
  7806810021678       22.239,00     51.099,30   129.77% M [Ilko] Wok 28 Cm Con Tapa Aluminio Ilko Grey Everyday
  7806810021609       24.289,00     55.474,30   128.39% M [Ilko] Olla 24 Cm Aluminio Ilko Gris Everyday
  8445291106505      108.999,00    244.499,00   124.31% M [Dolce Gusto] Cafetera Nescafe Dolce Gusto Piccolo Xs Negra Ne
  7891132001705        1.059,00      2.339,00   120.87% M [Sazón] Saborizador para arroz Sazón 60 g.
  7793890262124        4.453,50      9.620,00   116.01% M [Bimbo] Pan Bimbo Integral 620 G
  7793890262162        4.048,50      8.745,00   116.01% M [Fargo] Pan Fargo Salvado 600 G
  7793890261233        3.010,50      6.499,00   115.88% M [Bimbo] Pan Blanco Bimbo Chico 400 G
  7793890261479        2.709,50      5.849,00   115.87% M [Fargo] Pan Fargo Lacteado 370 G
  7806810025188       17.423,40     37.204,29   113.53% M [Ilko] Molde Ilko Redondo Desmontable Non Stick 28 Cm Negro
  7791019175973        1.139,00      2.399,00   110.62% M [3 Arroyos] Copos De Maíz 3 Arroyos Miel 200 G
  7891132012015        1.409,00      2.899,00   105.75% M [Ají No Moto] Saborizador Ají No Moto 100 G.
  7795513044780          919,00      1.849,00   101.20% M [Filgo] Bolígrafo Filgo stick azul x 4 uni
  7794360000277        1.249,00      2.499,00   100.08% M [Faber Castell] Boligrafo Negro Transparente Faber Castell 4 U
  7702003008504       11.654,50     23.309,00   100.00% M [Nivea] Bronceador y protector solar Nivea Sun Protect & Bronz
  4006000016740       13.459,50     26.919,00   100.00% M [Nivea Sun] Protector Solar Nivea Sun Babies & Kids Sensitive 
  7790299003655        8.189,50     16.379,00   100.00% M [Ferrini] Crema sapolán light Ferrini en pote 200 cc.
  4006000016719       12.854,50     25.709,00   100.00% M [Nivea Sun] Protector Solar Humectante En Loción Nivea Sun Pro

──────────────────────────────────────────────────────────────────────────────
  DISTRIBUCIÓN POR MARCA (top 20 en el match cross-retailer)
──────────────────────────────────────────────────────────────────────────────
  Dove                         59  ██████████████████████████████
  La Serenísima                49  █████████████████████████
  Elvive                       46  ███████████████████████
  Nivea                        44  ██████████████████████
  Sedal                        41  █████████████████████
  Colgate                      40  ████████████████████
  Rexona                       30  ███████████████
  Arcor                        29  ███████████████
  Milkaut                      29  ███████████████
  Knorr                        27  ██████████████
  Matarazzo                    26  █████████████
  Lucchetti                    24  ████████████
  Alicante                     24  ████████████
  Pantene                      24  ████████████
  Algabo                       21  ███████████
  Granja Del Sol               20  ██████████
  La Virginia                  20  ██████████
  Motorola                     20  ██████████
  Pedigree                     20  ██████████
  Tonadita                     17  █████████

──────────────────────────────────────────────────────────────────────────────
  EXCLUSIVOS POR CADENA (EAN disponible en una, no en la otra)
──────────────────────────────────────────────────────────────────────────────
  Solo en Masonline: 8.471
  Solo en Carrefour: 16.159

════════════════════════════════════════════════════════════════════════════
