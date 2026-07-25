
> olavarria-comparador-precios@0.1.0 report /home/runner/work/comparador-precios/comparador-precios
> tsx bin/report.ts --cross-retailer


════════════════════════════════════════════════════════════════════════════
  REPORTE CRUZADO POR EAN — Masonline vs Carrefour
════════════════════════════════════════════════════════════════════════════

  TOTAL DE PRODUCTOS QUE MATCHEAN POR EAN: 2.843
  (ambas cadenas, precio vigente y disponible, price > 0)

──────────────────────────────────────────────────────────────────────────────
  DISTRIBUCIÓN DE DIFERENCIAS DE PRECIO (|diff %|)
──────────────────────────────────────────────────────────────────────────────
  < 5%       1.603 ( 56.4%) ████████████████████████████████████████
  5–10%        220 (  7.7%) █████
  10–25%       242 (  8.5%) ██████
  25–50%       604 ( 21.2%) ███████████████
  ≥ 50%        174 (  6.1%) ████

──────────────────────────────────────────────────────────────────────────────
  ¿QUIÉN ES MÁS BARATO? (empate = |diff| ≤ 1%)
──────────────────────────────────────────────────────────────────────────────
  Masonline más barato:     649 (22.8%)
  Carrefour más barato:     858 (30.2%)
  Empate:                 1.336 (47.0%)

──────────────────────────────────────────────────────────────────────────────
  TOP 20 MAYORES DIFERENCIAS (|diff %|) — spot-check manual
──────────────────────────────────────────────────────────────────────────────
  EAN                     Mas $         Car $     diff%  Producto
  7798008632066        3.999,75     15.999,00   300.00% M [Doble G] Taza Doble G Línea Universal Adaptable Fiat Palio To
  7806810201735       14.162,85     33.774,29   138.47% M [Ilko] Molde Ilko Desmontable Redondo 24 Cm
  4006000050201        2.649,00      5.879,00   121.93% M [Nivea] Jabón con glicerina Nivea orquídeas para todo tipo de 
  7891132001705        1.059,00      2.339,00   120.87% M [Sazón] Saborizador para arroz Sazón 60 g.
  7891132001682        1.089,00      2.339,00   114.78% M [Sazón] Saborizador para verduras Sazón 60 g.
  4895038501195       11.899,30     24.990,00   110.01% M [Winfun] Juguete Sonajero Chimpancé
  4895038501171       11.899,30     24.990,00   110.01% M [Winfun] Juguete Sonajero Girafa
  7891132012015        1.409,00      2.899,00   105.75% M [Ají No Moto] Saborizador Ají No Moto 100 G.
  7790299003662        7.374,50     14.749,00   100.00% M [Ferrini] Crema sapolán light Ferrini en pote 200 cc.
  7790299003655        8.189,50     16.379,00   100.00% M [Ferrini] Crema sapolán light Ferrini en pote 200 cc.
  7806810025195    4.421.999,00     21.909,30   -99.50% C [Ilko] Set Mini Tarteras Ilko Non Stick 4 U 12 Cm Negro
  7806810025188       18.875,35     37.204,29    97.11% M [Ilko] Molde Ilko Redondo Desmontable Non Stick 28 Cm Negro
  90415418             1.821,00      3.579,00    96.54% M [Red Bull] Energizante Free Sugar Red Bull 250 Cc
  7790894901837      179.999,00    351.599,00    95.33% M [Motorola] Celular Motorola Moto G06 64 Gb 6.88" Azul Pantone 
  7791274198908        9.166,20     17.600,00    92.01% M [Star Wars] Jabón Líquido Star Wars Baby Joda 500 Ml
  7806810025119       18.875,35     35.944,29    90.43% M [Ilko] Molde Ilko Desmontable Redondo Non Stick 26 Cm Negro
  7796885457611      899.999,25  1.699.999,00    88.89% M [Bgh] Aire Acondicionado Ventana Bgh 5200w Frio Bc52wfaw
  7896004005010        2.479,00      4.609,00    85.92% M [Kelloggs] Cereal de manzana y pasas Kellogs Muesli 255 g.
  7794000006171        3.469,00      6.399,00    84.46% M [Hellmanns] Ketchup Hellmanns Regular Squeeze 400 G
  7791762255205        2.669,00      4.899,00    83.55% M [Avon] Cuaderno Avon Cuadriculado A4 84 Hojas Surtido

──────────────────────────────────────────────────────────────────────────────
  DISTRIBUCIÓN POR MARCA (top 20 en el match cross-retailer)
──────────────────────────────────────────────────────────────────────────────
  Dove                         58  ██████████████████████████████
  La Serenísima                51  ██████████████████████████
  Sedal                        40  █████████████████████
  Nivea                        39  ████████████████████
  Elvive                       39  ████████████████████
  Knorr                        29  ███████████████
  Milkaut                      29  ███████████████
  Rexona                       29  ███████████████
  Colgate                      27  ██████████████
  Arcor                        26  █████████████
  Lucchetti                    25  █████████████
  Alicante                     24  ████████████
  Algabo                       22  ███████████
  Matarazzo                    21  ███████████
  Electrolux                   20  ██████████
  La Salteña                   19  ██████████
  La Virginia                  19  ██████████
  Taragui                      16  ████████
  Pantene                      16  ████████
  Whiskas                      15  ████████

──────────────────────────────────────────────────────────────────────────────
  EXCLUSIVOS POR CADENA (EAN disponible en una, no en la otra)
──────────────────────────────────────────────────────────────────────────────
  Solo en Masonline: 8.205
  Solo en Carrefour: 16.768

════════════════════════════════════════════════════════════════════════════
