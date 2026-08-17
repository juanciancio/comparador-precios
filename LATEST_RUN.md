
> olavarria-comparador-precios@0.1.0 report /home/runner/work/comparador-precios/comparador-precios
> tsx bin/report.ts --cross-retailer


════════════════════════════════════════════════════════════════════════════
  REPORTE CRUZADO POR EAN — Masonline vs Carrefour
════════════════════════════════════════════════════════════════════════════

  TOTAL DE PRODUCTOS QUE MATCHEAN POR EAN: 2.924
  (ambas cadenas, precio vigente y disponible, price > 0)

──────────────────────────────────────────────────────────────────────────────
  DISTRIBUCIÓN DE DIFERENCIAS DE PRECIO (|diff %|)
──────────────────────────────────────────────────────────────────────────────
  < 5%       1.648 ( 56.4%) ████████████████████████████████████████
  5–10%        268 (  9.2%) ███████
  10–25%       324 ( 11.1%) ████████
  25–50%       534 ( 18.3%) █████████████
  ≥ 50%        150 (  5.1%) ████

──────────────────────────────────────────────────────────────────────────────
  ¿QUIÉN ES MÁS BARATO? (empate = |diff| ≤ 1%)
──────────────────────────────────────────────────────────────────────────────
  Masonline más barato:   1.052 (36.0%)
  Carrefour más barato:     910 (31.1%)
  Empate:                   962 (32.9%)

──────────────────────────────────────────────────────────────────────────────
  TOP 20 MAYORES DIFERENCIAS (|diff %|) — spot-check manual
──────────────────────────────────────────────────────────────────────────────
  EAN                     Mas $         Car $     diff%  Producto
  7799111695634        8.109,00     38.999,00   380.93% M [Atma Hogar] Escurridor Manual Vegetales Atma Home Gris AAEV10
  7798081285128       53.071,20    214.999,00   305.11% M [Smart Life] Cafetera Smartlife Sl-Cm9402
  7806810021609       24.289,00     55.474,30   128.39% M [Ilko] Olla 24 Cm Aluminio Ilko Gris Everyday
  7792170110575        1.994,30      4.550,00   128.15% M [Gatorade] Bebida Isotónica Gatorade Sabor Manzana 1.25 L
  7792170110568        1.994,30      4.550,00   128.15% M [Gatorade] Bebida Isotónica Gatorade Sabor Frutas Tropicales 1
  7792170110551        1.994,30      4.550,00   128.15% M [Gatorade] Bebida Isotónica Gatorade Sabor Naranja 1.25 L
  4006000050201        2.649,00      5.879,00   121.93% M [Nivea] Jabón con glicerina Nivea orquídeas para todo tipo de 
  7891132001705        1.059,00      2.339,00   120.87% M [Sazón] Saborizador para arroz Sazón 60 g.
  7790117000590        2.649,00      5.719,00   115.89% M [Separata] Bolsas para freezer Separata  30x40 cm x 20 u.
  656750725535         2.229,00      4.809,00   115.75% M [Glow] Esponja  Fibra Parrillera  Glow 1un
  7891132001682        1.089,00      2.339,00   114.78% M [Sazón] Saborizador para verduras Sazón 60 g.
  7791822689797        8.109,00     17.239,00   112.59% M [Rigolleau] Copa Rigolleaus Noruega 250ml X 4un
  7891000345344          579,00      1.209,00   108.81% M [Maggi] Caldo de Gallina Maggi 6 uni
  7891000345399          579,00      1.209,00   108.81% M [Maggi] Caldo Maggi® Verdura 6 U
  7790150425251        3.439,00      7.159,00   108.17% M [Alicante] Azafrán Alicante blister x 2 uni
  4006000016740       12.939,50     26.919,00   108.04% M [Nivea Sun] Protector Solar Nivea Sun Babies & Kids Sensitive 
  4005808944385       11.204,50     23.309,00   108.03% M [Nivea Sun] Protector Solar Nivea Swim & Play Kids Fps 60 Ultr
  7793008017950        5.749,50     11.959,00   108.00% M [Villeneuve] Protector Solar Villeneuve Humecta Y Protege Fps 
  7806810201735       16.302,30     33.774,29   107.17% M [Ilko] Molde Ilko Desmontable Redondo 24 Cm
  7891132012015        1.409,00      2.899,00   105.75% M [Ají No Moto] Saborizador Ají No Moto 100 G.

──────────────────────────────────────────────────────────────────────────────
  DISTRIBUCIÓN POR MARCA (top 20 en el match cross-retailer)
──────────────────────────────────────────────────────────────────────────────
  La Serenísima                52  ██████████████████████████████
  Dove                         49  ████████████████████████████
  Nivea                        43  █████████████████████████
  Sedal                        38  ██████████████████████
  Milkaut                      36  █████████████████████
  Elvive                       36  █████████████████████
  Colgate                      34  ████████████████████
  Alicante                     30  █████████████████
  Knorr                        28  ████████████████
  Lucchetti                    28  ████████████████
  Matarazzo                    27  ████████████████
  Arcor                        27  ████████████████
  Pantene                      21  ████████████
  Rexona                       20  ████████████
  La Virginia                  20  ████████████
  Pedigree                     20  ████████████
  Motorola                     19  ███████████
  Algabo                       19  ███████████
  La Parmesana                 16  █████████
  Tonadita                     16  █████████

──────────────────────────────────────────────────────────────────────────────
  EXCLUSIVOS POR CADENA (EAN disponible en una, no en la otra)
──────────────────────────────────────────────────────────────────────────────
  Solo en Masonline: 8.321
  Solo en Carrefour: 15.800

════════════════════════════════════════════════════════════════════════════
