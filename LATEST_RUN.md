
> olavarria-comparador-precios@0.1.0 report /home/runner/work/comparador-precios/comparador-precios
> tsx bin/report.ts --cross-retailer


════════════════════════════════════════════════════════════════════════════
  REPORTE CRUZADO POR EAN — Masonline vs Carrefour
════════════════════════════════════════════════════════════════════════════

  TOTAL DE PRODUCTOS QUE MATCHEAN POR EAN: 3.042
  (ambas cadenas, precio vigente y disponible, price > 0)

──────────────────────────────────────────────────────────────────────────────
  DISTRIBUCIÓN DE DIFERENCIAS DE PRECIO (|diff %|)
──────────────────────────────────────────────────────────────────────────────
  < 5%       1.690 ( 55.6%) ████████████████████████████████████████
  5–10%        239 (  7.9%) ██████
  10–25%       323 ( 10.6%) ████████
  25–50%       646 ( 21.2%) ███████████████
  ≥ 50%        144 (  4.7%) ███

──────────────────────────────────────────────────────────────────────────────
  ¿QUIÉN ES MÁS BARATO? (empate = |diff| ≤ 1%)
──────────────────────────────────────────────────────────────────────────────
  Masonline más barato:     784 (25.8%)
  Carrefour más barato:     926 (30.4%)
  Empate:                 1.332 (43.8%)

──────────────────────────────────────────────────────────────────────────────
  TOP 20 MAYORES DIFERENCIAS (|diff %|) — spot-check manual
──────────────────────────────────────────────────────────────────────────────
  EAN                     Mas $         Car $     diff%  Producto
  7798081285128       59.705,10    214.999,00   260.10% M [Smart Life] Cafetera Smartlife Sl-Cm9402
  7806810021609       24.289,00     55.474,30   128.39% M [Ilko] Olla 24 Cm Aluminio Ilko Gris Everyday
  4006000050201        2.649,00      5.879,00   121.93% M [Nivea] Jabón con glicerina Nivea orquídeas para todo tipo de 
  7891132001705        1.059,00      2.339,00   120.87% M [Sazón] Saborizador para arroz Sazón 60 g.
  7790117000590        2.649,00      5.719,00   115.89% M [Separata] Bolsas para freezer Separata  30x40 cm x 20 u.
  7891132001682        1.089,00      2.339,00   114.78% M [Sazón] Saborizador para verduras Sazón 60 g.
  7792170110704        2.129,00      4.550,00   113.72% M [Gatorade] Bebida Isotónica Gatorade Sabor Cool Blue 1.25 L
  7792170110568        2.129,00      4.550,00   113.72% M [Gatorade] Bebida Isotónica Gatorade Sabor Frutas Tropicales 1
  7792170110575        2.129,00      4.550,00   113.72% M [Gatorade] Bebida Isotónica Gatorade Sabor Manzana 1.25 L
  7500435245814       11.729,00     24.849,00   111.86% M [Gillette] Maquina Afeitar Desechable Gillette Prestobarba Car
  7791019175973        1.139,00      2.399,00   110.62% M [3 Arroyos] Copos De Maíz 3 Arroyos Miel 200 G
  7891000345344          579,00      1.209,00   108.81% M [Maggi] Caldo de Gallina Maggi 6 uni
  7891000345399          579,00      1.209,00   108.81% M [Maggi] Caldo Maggi® Verdura 6 U
  7794000006065          839,00      1.749,00   108.46% M [Hellmanns] Mayonesa Hellmanns Clásica 237 G
  7798125593875       24.039,00     49.597,20   106.32% M [ASTON] Olla Cacerola Aston  Antiadherente 24 Cm Tapa Vidrio T
  7891132012015        1.409,00      2.899,00   105.75% M [Ají No Moto] Saborizador Ají No Moto 100 G.
  7798304841254        6.339,00     12.959,00   104.43% M [Nesquik] Helado De Palito Nesquik 6 U 204 G
  7794626011177       11.319,00     22.999,00   103.19% M [Plenitud] Pañal Para Adulto Plenitud Protect Xg 8un
  7806810201735       16.631,30     33.774,29   103.08% M [Ilko] Molde Ilko Desmontable Redondo 24 Cm
  7891000365472          678,00      1.369,00   101.92% M [Maggi] Maggi sabor en polvo verduras 5 uni

──────────────────────────────────────────────────────────────────────────────
  DISTRIBUCIÓN POR MARCA (top 20 en el match cross-retailer)
──────────────────────────────────────────────────────────────────────────────
  La Serenísima                63  ██████████████████████████████
  Dove                         62  ██████████████████████████████
  Nivea                        49  ███████████████████████
  Elvive                       48  ███████████████████████
  Sedal                        43  ████████████████████
  Colgate                      36  █████████████████
  Alicante                     33  ████████████████
  Matarazzo                    27  █████████████
  Knorr                        26  ████████████
  Lucchetti                    26  ████████████
  Pantene                      24  ███████████
  Arcor                        24  ███████████
  La Virginia                  23  ███████████
  Algabo                       23  ███████████
  Rexona                       23  ███████████
  Pedigree                     20  ██████████
  Motorola                     20  ██████████
  Milkaut                      19  █████████
  Palmolive                    19  █████████
  Tonadita                     18  █████████

──────────────────────────────────────────────────────────────────────────────
  EXCLUSIVOS POR CADENA (EAN disponible en una, no en la otra)
──────────────────────────────────────────────────────────────────────────────
  Solo en Masonline: 7.934
  Solo en Carrefour: 16.805

════════════════════════════════════════════════════════════════════════════
