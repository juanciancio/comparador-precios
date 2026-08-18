
> olavarria-comparador-precios@0.1.0 report /home/runner/work/comparador-precios/comparador-precios
> tsx bin/report.ts --cross-retailer


════════════════════════════════════════════════════════════════════════════
  REPORTE CRUZADO POR EAN — Masonline vs Carrefour
════════════════════════════════════════════════════════════════════════════

  TOTAL DE PRODUCTOS QUE MATCHEAN POR EAN: 2.824
  (ambas cadenas, precio vigente y disponible, price > 0)

──────────────────────────────────────────────────────────────────────────────
  DISTRIBUCIÓN DE DIFERENCIAS DE PRECIO (|diff %|)
──────────────────────────────────────────────────────────────────────────────
  < 5%       1.693 ( 60.0%) ████████████████████████████████████████
  5–10%        258 (  9.1%) ██████
  10–25%       345 ( 12.2%) ████████
  25–50%       406 ( 14.4%) ██████████
  ≥ 50%        122 (  4.3%) ███

──────────────────────────────────────────────────────────────────────────────
  ¿QUIÉN ES MÁS BARATO? (empate = |diff| ≤ 1%)
──────────────────────────────────────────────────────────────────────────────
  Masonline más barato:     915 (32.4%)
  Carrefour más barato:     935 (33.1%)
  Empate:                   974 (34.5%)

──────────────────────────────────────────────────────────────────────────────
  TOP 20 MAYORES DIFERENCIAS (|diff %|) — spot-check manual
──────────────────────────────────────────────────────────────────────────────
  EAN                     Mas $         Car $     diff%  Producto
  7798081285128       53.071,20    214.999,00   305.11% M [Smart Life] Cafetera Smartlife Sl-Cm9402
  7806810021609       24.289,00     55.474,30   128.39% M [Ilko] Olla 24 Cm Aluminio Ilko Gris Everyday
  7794360000277        1.249,00      2.839,00   127.30% M [Faber Castell] Boligrafo Negro Transparente Faber Castell 4 U
  4006000050201        2.649,00      5.879,00   121.93% M [Nivea] Jabón con glicerina Nivea orquídeas para todo tipo de 
  7891132001705        1.059,00      2.339,00   120.87% M [Sazón] Saborizador para arroz Sazón 60 g.
  7790117000590        2.649,00      5.719,00   115.89% M [Separata] Bolsas para freezer Separata  30x40 cm x 20 u.
  656750725535         2.229,00      4.809,00   115.75% M [Glow] Esponja  Fibra Parrillera  Glow 1un
  7891132001682        1.089,00      2.339,00   114.78% M [Sazón] Saborizador para verduras Sazón 60 g.
  7792170110575        2.136,75      4.550,00   112.94% M [Gatorade] Bebida Isotónica Gatorade Sabor Manzana 1.25 L
  7792170110551        2.136,75      4.550,00   112.94% M [Gatorade] Bebida Isotónica Gatorade Sabor Naranja 1.25 L
  7792170110568        2.136,75      4.550,00   112.94% M [Gatorade] Bebida Isotónica Gatorade Sabor Frutas Tropicales 1
  7791822689797        8.109,00     17.239,00   112.59% M [Rigolleau] Copa Rigolleaus Noruega 250ml X 4un
  7500435245814       11.729,00     24.849,00   111.86% M [Gillette] Maquina Afeitar Desechable Gillette Prestobarba Car
  7791019175973        1.139,00      2.399,00   110.62% M [3 Arroyos] Copos De Maíz 3 Arroyos Miel 200 G
  7891000345344          579,00      1.209,00   108.81% M [Maggi] Caldo de Gallina Maggi 6 uni
  7891000345399          579,00      1.209,00   108.81% M [Maggi] Caldo Maggi® Verdura 6 U
  4006000016719       12.359,50     25.709,00   108.01% M [Nivea Sun] Protector Solar Humectante En Loción Nivea Sun Pro
  7891132012015        1.409,00      2.899,00   105.75% M [Ají No Moto] Saborizador Ají No Moto 100 G.
  7806810201735       16.631,30     33.774,29   103.08% M [Ilko] Molde Ilko Desmontable Redondo 24 Cm
  7891000365472          678,00      1.369,00   101.92% M [Maggi] Maggi sabor en polvo verduras 5 uni

──────────────────────────────────────────────────────────────────────────────
  DISTRIBUCIÓN POR MARCA (top 20 en el match cross-retailer)
──────────────────────────────────────────────────────────────────────────────
  Dove                         60  ██████████████████████████████
  La Serenísima                50  █████████████████████████
  Nivea                        47  ████████████████████████
  Sedal                        45  ███████████████████████
  Colgate                      41  █████████████████████
  Elvive                       41  █████████████████████
  Arcor                        29  ███████████████
  Rexona                       29  ███████████████
  Lucchetti                    28  ██████████████
  Algabo                       25  █████████████
  Alicante                     25  █████████████
  Knorr                        24  ████████████
  Milkaut                      24  ████████████
  Matarazzo                    24  ████████████
  Pantene                      22  ███████████
  La Virginia                  19  ██████████
  Pedigree                     19  ██████████
  Motorola                     18  █████████
  Gallo                        17  █████████
  Palmolive                    16  ████████

──────────────────────────────────────────────────────────────────────────────
  EXCLUSIVOS POR CADENA (EAN disponible en una, no en la otra)
──────────────────────────────────────────────────────────────────────────────
  Solo en Masonline: 7.928
  Solo en Carrefour: 15.799

════════════════════════════════════════════════════════════════════════════
