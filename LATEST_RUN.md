
> olavarria-comparador-precios@0.1.0 report /home/runner/work/comparador-precios/comparador-precios
> tsx bin/report.ts --cross-retailer


════════════════════════════════════════════════════════════════════════════
  REPORTE CRUZADO POR EAN — Masonline vs Carrefour
════════════════════════════════════════════════════════════════════════════

  TOTAL DE PRODUCTOS QUE MATCHEAN POR EAN: 2.909
  (ambas cadenas, precio vigente y disponible, price > 0)

──────────────────────────────────────────────────────────────────────────────
  DISTRIBUCIÓN DE DIFERENCIAS DE PRECIO (|diff %|)
──────────────────────────────────────────────────────────────────────────────
  < 5%       1.655 ( 56.9%) ████████████████████████████████████████
  5–10%        298 ( 10.2%) ███████
  10–25%       281 (  9.7%) ███████
  25–50%       533 ( 18.3%) █████████████
  ≥ 50%        142 (  4.9%) ███

──────────────────────────────────────────────────────────────────────────────
  ¿QUIÉN ES MÁS BARATO? (empate = |diff| ≤ 1%)
──────────────────────────────────────────────────────────────────────────────
  Masonline más barato:     813 (27.9%)
  Carrefour más barato:   1.097 (37.7%)
  Empate:                   999 (34.3%)

──────────────────────────────────────────────────────────────────────────────
  TOP 20 MAYORES DIFERENCIAS (|diff %|) — spot-check manual
──────────────────────────────────────────────────────────────────────────────
  EAN                     Mas $         Car $     diff%  Producto
  7798008632066        3.999,75     15.999,00   300.00% M [Doble G] Taza Doble G Línea Universal Adaptable Fiat Palio To
  7806810201735       14.162,85     33.774,29   138.47% M [Ilko] Molde Ilko Desmontable Redondo 24 Cm
  4006000050201        2.649,00      5.879,00   121.93% M [Nivea] Jabón con glicerina Nivea orquídeas para todo tipo de 
  7891132001705        1.059,00      2.209,00   108.59% M [Sazón] Saborizador para arroz Sazón 60 g.
  7891024034767          849,00      1.759,00   107.18% M [Palmolive] Jabón Barra Karite Palmolive 85 Gr
  7891024034781          849,00      1.759,00   107.18% M [Palmolive] Jabón De Tocador Palmolive Naturals Karite 85 G
  7891132012015        1.409,00      2.899,00   105.75% M [Ají No Moto] Saborizador Ají No Moto 100 G.
  7891132001682        1.089,00      2.209,00   102.85% M [Sazón] Saborizador para verduras Sazón 60 g.
  7806810025188       18.504,85     37.204,29   101.05% M [Ilko] Molde Ilko Redondo Desmontable Non Stick 28 Cm Negro
  8906038786416        3.654,50      7.309,00   100.00% M [SRI SRI TATTVA] Crema Dental Sri Sri Tattva  Ayurvédica Libre
  7790299003655        8.189,50     16.379,00   100.00% M [Ferrini] Crema sapolán light Ferrini en pote 200 cc.
  7790299003662        7.374,50     14.749,00   100.00% M [Ferrini] Crema sapolán light Ferrini en pote 200 cc.
  7806810025195    4.334.999,00     21.909,30   -99.49% C [Ilko] Set Mini Tarteras Ilko Non Stick 4 U 12 Cm Negro
  7806810025119       18.504,85     35.944,29    94.24% M [Ilko] Molde Ilko Desmontable Redondo Non Stick 26 Cm Negro
  7796885457611      899.999,25  1.699.999,00    88.89% M [Bgh] Aire Acondicionado Ventana Bgh 5200w Frio Bc52wfaw
  90415418             1.821,00      3.439,00    88.85% M [Red Bull] Energizante Free Sugar Red Bull 250 Cc
  7896004005010        2.479,00      4.609,00    85.92% M [Kelloggs] Cereal de manzana y pasas Kellogs Muesli 255 g.
  7500435154741        4.805,40      8.919,00    85.60% M [Oral-B] Cepillo Dental Oral-B Suave Ultrafino
  7791762255205        2.669,00      4.899,00    83.55% M [Avon] Cuaderno Avon Cuadriculado A4 84 Hojas Surtido
  7792410008105        4.439,00      8.079,00    82.00% M [Cusenier] Licor Cusenier  De Chocolate 700ml

──────────────────────────────────────────────────────────────────────────────
  DISTRIBUCIÓN POR MARCA (top 20 en el match cross-retailer)
──────────────────────────────────────────────────────────────────────────────
  Dove                         57  ██████████████████████████████
  La Serenísima                48  █████████████████████████
  Sedal                        42  ██████████████████████
  Nivea                        41  ██████████████████████
  Elvive                       40  █████████████████████
  Rexona                       33  █████████████████
  Colgate                      32  █████████████████
  Knorr                        29  ███████████████
  Alicante                     25  █████████████
  Arcor                        24  █████████████
  Matarazzo                    24  █████████████
  Lucchetti                    24  █████████████
  Milkaut                      23  ████████████
  Algabo                       22  ████████████
  La Virginia                  21  ███████████
  Pantene                      20  ███████████
  Pedigree                     19  ██████████
  Granja Del Sol               19  ██████████
  Electrolux                   19  ██████████
  Tregar                       17  █████████

──────────────────────────────────────────────────────────────────────────────
  EXCLUSIVOS POR CADENA (EAN disponible en una, no en la otra)
──────────────────────────────────────────────────────────────────────────────
  Solo en Masonline: 9.062
  Solo en Carrefour: 16.356

════════════════════════════════════════════════════════════════════════════
