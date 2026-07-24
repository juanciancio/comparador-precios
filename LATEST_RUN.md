
> olavarria-comparador-precios@0.1.0 report /home/runner/work/comparador-precios/comparador-precios
> tsx bin/report.ts --cross-retailer


════════════════════════════════════════════════════════════════════════════
  REPORTE CRUZADO POR EAN — Masonline vs Carrefour
════════════════════════════════════════════════════════════════════════════

  TOTAL DE PRODUCTOS QUE MATCHEAN POR EAN: 2.841
  (ambas cadenas, precio vigente y disponible, price > 0)

──────────────────────────────────────────────────────────────────────────────
  DISTRIBUCIÓN DE DIFERENCIAS DE PRECIO (|diff %|)
──────────────────────────────────────────────────────────────────────────────
  < 5%       1.535 ( 54.0%) ████████████████████████████████████████
  5–10%        273 (  9.6%) ███████
  10–25%       273 (  9.6%) ███████
  25–50%       597 ( 21.0%) ████████████████
  ≥ 50%        163 (  5.7%) ████

──────────────────────────────────────────────────────────────────────────────
  ¿QUIÉN ES MÁS BARATO? (empate = |diff| ≤ 1%)
──────────────────────────────────────────────────────────────────────────────
  Masonline más barato:     995 (35.0%)
  Carrefour más barato:     874 (30.8%)
  Empate:                   972 (34.2%)

──────────────────────────────────────────────────────────────────────────────
  TOP 20 MAYORES DIFERENCIAS (|diff %|) — spot-check manual
──────────────────────────────────────────────────────────────────────────────
  EAN                     Mas $         Car $     diff%  Producto
  7798008632066        3.999,75     15.999,00   300.00% M [Doble G] Taza Doble G Línea Universal Adaptable Fiat Palio To
  7806810201735       13.883,35     33.774,29   143.27% M [Ilko] Molde Ilko Desmontable Redondo 24 Cm
  656750725535         2.229,00      4.809,00   115.75% M [Glow] Esponja  Fibra Parrillera  Glow 1un
  7891132001705        1.059,00      2.209,00   108.59% M [Sazón] Saborizador para arroz Sazón 60 g.
  7806810025195    4.421.999,00     21.909,30   -99.50% C [Ilko] Set Mini Tarteras Ilko Non Stick 4 U 12 Cm Negro
  7806810025188       18.875,35     37.204,29    97.11% M [Ilko] Molde Ilko Redondo Desmontable Non Stick 28 Cm Negro
  7794903232219        1.639,00      3.229,00    97.01% M [Yuka] Galletitas Yuka Pepitas Sin Tacc 150 G
  90415418             1.821,00      3.579,00    96.54% M [Red Bull] Energizante Free Sugar Red Bull 250 Cc
  7790894901837      179.999,00    351.599,00    95.33% M [Motorola] Celular Motorola Moto G06 64 Gb 6.88" Azul Pantone 
  7806810025119       18.875,35     35.944,29    90.43% M [Ilko] Molde Ilko Desmontable Redondo Non Stick 26 Cm Negro
  7796885457611      899.999,25  1.699.999,00    88.89% M [Bgh] Aire Acondicionado Ventana Bgh 5200w Frio Bc52wfaw
  7896004005010        2.479,00      4.609,00    85.92% M [Kelloggs] Cereal de manzana y pasas Kellogs Muesli 255 g.
  7500435154741        4.805,40      8.919,00    85.60% M [Oral-B] Cepillo Dental Oral-B Suave Ultrafino
  7791762255205        2.669,00      4.899,00    83.55% M [Avon] Cuaderno Avon Cuadriculado A4 84 Hojas Surtido
  7791813403012        1.759,45      3.200,00    81.88% M [H20!] Agua Saborizada Sin Gas H2oh Sabor Pomelo 1,5 L
  7806810021678       28.241,85     51.099,30    80.93% M [Ilko] Wok 28 Cm Con Tapa Aluminio Ilko Grey Everyday
  7806810021609       31.160,35     55.474,30    78.03% M [Ilko] Olla 24 Cm Aluminio Ilko Gris Everyday
  7891024034781          849,00      1.495,00    76.09% M [Palmolive] Jabón De Tocador Palmolive Naturals Karite 85 G
  7891024034767          849,00      1.495,00    76.09% M [Palmolive] Jabón Barra Karite Palmolive 85 Gr
  7799111679054       41.999,30     73.699,00    75.48% M [Philco] Cortadora De Pelo Inalámbrica Philco Grooming Kit 5 E

──────────────────────────────────────────────────────────────────────────────
  DISTRIBUCIÓN POR MARCA (top 20 en el match cross-retailer)
──────────────────────────────────────────────────────────────────────────────
  Dove                         55  ██████████████████████████████
  La Serenísima                50  ███████████████████████████
  Elvive                       42  ███████████████████████
  Nivea                        39  █████████████████████
  Sedal                        38  █████████████████████
  Rexona                       29  ████████████████
  Knorr                        28  ███████████████
  Colgate                      28  ███████████████
  Lucchetti                    24  █████████████
  Matarazzo                    23  █████████████
  Alicante                     21  ███████████
  La Salteña                   20  ███████████
  Electrolux                   20  ███████████
  Milkaut                      19  ██████████
  Algabo                       18  ██████████
  Arcor                        18  ██████████
  La Virginia                  17  █████████
  Tonadita                     17  █████████
  Cif                          16  █████████
  Royal                        16  █████████

──────────────────────────────────────────────────────────────────────────────
  EXCLUSIVOS POR CADENA (EAN disponible en una, no en la otra)
──────────────────────────────────────────────────────────────────────────────
  Solo en Masonline: 8.923
  Solo en Carrefour: 16.464

════════════════════════════════════════════════════════════════════════════
