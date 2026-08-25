
> olavarria-comparador-precios@0.1.0 report /home/runner/work/comparador-precios/comparador-precios
> tsx bin/report.ts --cross-retailer


════════════════════════════════════════════════════════════════════════════
  REPORTE CRUZADO POR EAN — Masonline vs Carrefour
════════════════════════════════════════════════════════════════════════════

  TOTAL DE PRODUCTOS QUE MATCHEAN POR EAN: 3.096
  (ambas cadenas, precio vigente y disponible, price > 0)

──────────────────────────────────────────────────────────────────────────────
  DISTRIBUCIÓN DE DIFERENCIAS DE PRECIO (|diff %|)
──────────────────────────────────────────────────────────────────────────────
  < 5%       1.867 ( 60.3%) ████████████████████████████████████████
  5–10%        257 (  8.3%) ██████
  10–25%       335 ( 10.8%) ███████
  25–50%       506 ( 16.3%) ███████████
  ≥ 50%        131 (  4.2%) ███

──────────────────────────────────────────────────────────────────────────────
  ¿QUIÉN ES MÁS BARATO? (empate = |diff| ≤ 1%)
──────────────────────────────────────────────────────────────────────────────
  Masonline más barato:     942 (30.4%)
  Carrefour más barato:   1.051 (33.9%)
  Empate:                 1.103 (35.6%)

──────────────────────────────────────────────────────────────────────────────
  TOP 20 MAYORES DIFERENCIAS (|diff %|) — spot-check manual
──────────────────────────────────────────────────────────────────────────────
  EAN                     Mas $         Car $     diff%  Producto
  7799111695634        5.676,30     38.999,00   587.05% M [Atma Hogar] Escurridor Manual Vegetales Atma Home Gris AAEV10
  7798081285128       53.071,20    214.999,00   305.11% M [Smart Life] Cafetera Smartlife Sl-Cm9402
  7790150425251        3.439,00      7.869,00   128.82% M [Alicante] Azafrán Alicante blister x 2 uni
  7806810021609       24.289,00     55.474,30   128.39% M [Ilko] Olla 24 Cm Aluminio Ilko Gris Everyday
  4006000050201        2.649,00      5.879,00   121.93% M [Nivea] Jabón con glicerina Nivea orquídeas para todo tipo de 
  7790117000590        2.649,00      5.719,00   115.89% M [Separata] Bolsas para freezer Separata  30x40 cm x 20 u.
  7792170110568        2.129,00      4.550,00   113.72% M [Gatorade] Bebida Isotónica Gatorade Sabor Frutas Tropicales 1
  7792170110551        2.129,00      4.550,00   113.72% M [Gatorade] Bebida Isotónica Gatorade Sabor Naranja 1.25 L
  7792170110575        2.129,00      4.550,00   113.72% M [Gatorade] Bebida Isotónica Gatorade Sabor Manzana 1.25 L
  7792170110704        2.129,00      4.550,00   113.72% M [Gatorade] Bebida Isotónica Gatorade Sabor Cool Blue 1.25 L
  7791822689797        8.109,00     17.239,00   112.59% M [Rigolleau] Copa Rigolleaus Noruega 250ml X 4un
  7500435245814       11.729,00     24.849,00   111.86% M [Gillette] Maquina Afeitar Desechable Gillette Prestobarba Car
  7791019175973        1.139,00      2.399,00   110.62% M [3 Arroyos] Copos De Maíz 3 Arroyos Miel 200 G
  4005808944385       11.204,50     23.309,00   108.03% M [Nivea Sun] Protector Solar Nivea Swim & Play Kids Fps 60 Ultr
  4006000016719       12.359,50     25.709,00   108.01% M [Nivea Sun] Protector Solar Humectante En Loción Nivea Sun Pro
  7891132012015        1.409,00      2.899,00   105.75% M [Ají No Moto] Saborizador Ají No Moto 100 G.
  7798304841254        6.339,00     12.959,00   104.43% M [Nesquik] Helado De Palito Nesquik 6 U 204 G
  7794626011177       11.319,00     22.999,00   103.19% M [Plenitud] Pañal Para Adulto Plenitud Protect Xg 8un
  7795513044780          919,00      1.849,00   101.20% M [Filgo] Bolígrafo Filgo stick azul x 4 uni
  7891155040866        2.249,00      4.499,00   100.04% M [NADIR] Copa Nadir Para Agua Barone  490 Ml

──────────────────────────────────────────────────────────────────────────────
  DISTRIBUCIÓN POR MARCA (top 20 en el match cross-retailer)
──────────────────────────────────────────────────────────────────────────────
  Dove                         57  ██████████████████████████████
  La Serenísima                53  ████████████████████████████
  Nivea                        50  ██████████████████████████
  Sedal                        44  ███████████████████████
  Elvive                       43  ███████████████████████
  Colgate                      38  ████████████████████
  Alicante                     35  ██████████████████
  Lucchetti                    28  ███████████████
  Rexona                       28  ███████████████
  Knorr                        27  ██████████████
  Milkaut                      26  ██████████████
  Algabo                       25  █████████████
  Matarazzo                    24  █████████████
  Arcor                        22  ████████████
  Palmolive                    20  ███████████
  Pantene                      20  ███████████
  La Virginia                  19  ██████████
  Pedigree                     19  ██████████
  Ayudin                       18  █████████
  La Parmesana                 17  █████████

──────────────────────────────────────────────────────────────────────────────
  EXCLUSIVOS POR CADENA (EAN disponible en una, no en la otra)
──────────────────────────────────────────────────────────────────────────────
  Solo en Masonline: 8.594
  Solo en Carrefour: 16.082

════════════════════════════════════════════════════════════════════════════
