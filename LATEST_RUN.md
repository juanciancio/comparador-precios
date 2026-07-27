
> olavarria-comparador-precios@0.1.0 report /home/runner/work/comparador-precios/comparador-precios
> tsx bin/report.ts --cross-retailer


════════════════════════════════════════════════════════════════════════════
  REPORTE CRUZADO POR EAN — Masonline vs Carrefour
════════════════════════════════════════════════════════════════════════════

  TOTAL DE PRODUCTOS QUE MATCHEAN POR EAN: 2.818
  (ambas cadenas, precio vigente y disponible, price > 0)

──────────────────────────────────────────────────────────────────────────────
  DISTRIBUCIÓN DE DIFERENCIAS DE PRECIO (|diff %|)
──────────────────────────────────────────────────────────────────────────────
  < 5%       1.662 ( 59.0%) ████████████████████████████████████████
  5–10%        230 (  8.2%) ██████
  10–25%       308 ( 10.9%) ███████
  25–50%       478 ( 17.0%) ████████████
  ≥ 50%        140 (  5.0%) ███

──────────────────────────────────────────────────────────────────────────────
  ¿QUIÉN ES MÁS BARATO? (empate = |diff| ≤ 1%)
──────────────────────────────────────────────────────────────────────────────
  Masonline más barato:     869 (30.8%)
  Carrefour más barato:     935 (33.2%)
  Empate:                 1.014 (36.0%)

──────────────────────────────────────────────────────────────────────────────
  TOP 20 MAYORES DIFERENCIAS (|diff %|) — spot-check manual
──────────────────────────────────────────────────────────────────────────────
  EAN                     Mas $         Car $     diff%  Producto
  7798081285128       53.071,20    214.999,00   305.11% M [Smart Life] Cafetera Smartlife Sl-Cm9402
  7798008632066        3.999,75     15.999,00   300.00% M [Doble G] Taza Doble G Línea Universal Adaptable Fiat Palio To
  7806810201735       14.162,85     33.774,29   138.47% M [Ilko] Molde Ilko Desmontable Redondo 24 Cm
  4006000050201        2.649,00      5.879,00   121.93% M [Nivea] Jabón con glicerina Nivea orquídeas para todo tipo de 
  7891132001705        1.059,00      2.339,00   120.87% M [Sazón] Saborizador para arroz Sazón 60 g.
  7891132001682        1.089,00      2.339,00   114.78% M [Sazón] Saborizador para verduras Sazón 60 g.
  7790150425251        3.439,00      7.159,00   108.17% M [Alicante] Azafrán Alicante blister x 2 uni
  7891132012015        1.409,00      2.899,00   105.75% M [Ají No Moto] Saborizador Ají No Moto 100 G.
  7806810025195    4.421.999,00     21.909,30   -99.50% C [Ilko] Set Mini Tarteras Ilko Non Stick 4 U 12 Cm Negro
  7806810025188       18.875,35     37.204,29    97.11% M [Ilko] Molde Ilko Redondo Desmontable Non Stick 28 Cm Negro
  7790894901837      179.999,00    351.599,00    95.33% M [Motorola] Celular Motorola Moto G06 64 Gb 6.88" Azul Pantone 
  7791274198908        9.166,20     17.600,00    92.01% M [Star Wars] Jabón Líquido Star Wars Baby Joda 500 Ml
  7796885457611      899.999,25  1.699.999,00    88.89% M [Bgh] Aire Acondicionado Ventana Bgh 5200w Frio Bc52wfaw
  7790150555446          859,00      1.609,00    87.31% M [Alicante] Pimienta Negra Alicante Molida Sin Tacc 25gr
  7794000006171        3.469,00      6.399,00    84.46% M [Hellmanns] Ketchup Hellmanns Regular Squeeze 400 G
  7791762255205        2.669,00      4.899,00    83.55% M [Avon] Cuaderno Avon Cuadriculado A4 84 Hojas Surtido
  7792410008006        4.439,00      8.079,00    82.00% M [Cusenier] Licor De Dulce De Leche Cusenier 700 Cc
  7792410008105        4.439,00      8.079,00    82.00% M [Cusenier] Licor Cusenier  De Chocolate 700ml
  7791813403012        1.759,45      3.200,00    81.88% M [H20!] Agua Saborizada Sin Gas H2oh Sabor Pomelo 1,5 L
  7793360131448        2.169,00      3.879,00    78.84% M [La Campagnola] Mermelada La Campagnola Damasco 454g

──────────────────────────────────────────────────────────────────────────────
  DISTRIBUCIÓN POR MARCA (top 20 en el match cross-retailer)
──────────────────────────────────────────────────────────────────────────────
  Dove                         53  ██████████████████████████████
  La Serenísima                47  ███████████████████████████
  Nivea                        40  ███████████████████████
  Elvive                       38  ██████████████████████
  Sedal                        37  █████████████████████
  Knorr                        30  █████████████████
  Colgate                      28  ████████████████
  Milkaut                      28  ████████████████
  Rexona                       27  ███████████████
  Arcor                        25  ██████████████
  Alicante                     23  █████████████
  Lucchetti                    23  █████████████
  La Virginia                  20  ███████████
  Matarazzo                    20  ███████████
  Granja Del Sol               19  ███████████
  Electrolux                   19  ███████████
  La Salteña                   18  ██████████
  Taragui                      17  ██████████
  Algabo                       17  ██████████
  Bimbo                        17  ██████████

──────────────────────────────────────────────────────────────────────────────
  EXCLUSIVOS POR CADENA (EAN disponible en una, no en la otra)
──────────────────────────────────────────────────────────────────────────────
  Solo en Masonline: 8.488
  Solo en Carrefour: 16.534

════════════════════════════════════════════════════════════════════════════
