
> olavarria-comparador-precios@0.1.0 report /home/runner/work/comparador-precios/comparador-precios
> tsx bin/report.ts --cross-retailer


════════════════════════════════════════════════════════════════════════════
  REPORTE CRUZADO POR EAN — Masonline vs Carrefour
════════════════════════════════════════════════════════════════════════════

  TOTAL DE PRODUCTOS QUE MATCHEAN POR EAN: 2.847
  (ambas cadenas, precio vigente y disponible, price > 0)

──────────────────────────────────────────────────────────────────────────────
  DISTRIBUCIÓN DE DIFERENCIAS DE PRECIO (|diff %|)
──────────────────────────────────────────────────────────────────────────────
  < 5%       1.619 ( 56.9%) ████████████████████████████████████████
  5–10%        276 (  9.7%) ███████
  10–25%       316 ( 11.1%) ████████
  25–50%       513 ( 18.0%) █████████████
  ≥ 50%        123 (  4.3%) ███

──────────────────────────────────────────────────────────────────────────────
  ¿QUIÉN ES MÁS BARATO? (empate = |diff| ≤ 1%)
──────────────────────────────────────────────────────────────────────────────
  Masonline más barato:     714 (25.1%)
  Carrefour más barato:   1.109 (39.0%)
  Empate:                 1.024 (36.0%)

──────────────────────────────────────────────────────────────────────────────
  TOP 20 MAYORES DIFERENCIAS (|diff %|) — spot-check manual
──────────────────────────────────────────────────────────────────────────────
  EAN                     Mas $         Car $     diff%  Producto
  7798008632066        3.999,75     15.999,00   300.00% M [Doble G] Taza Doble G Línea Universal Adaptable Fiat Palio To
  7806810201735       14.162,85     33.774,29   138.47% M [Ilko] Molde Ilko Desmontable Redondo 24 Cm
  7790117000590        2.649,00      5.719,00   115.89% M [Separata] Bolsas para freezer Separata  30x40 cm x 20 u.
  7891132001705        1.059,00      2.209,00   108.59% M [Sazón] Saborizador para arroz Sazón 60 g.
  7790150425251        3.439,00      7.159,00   108.17% M [Alicante] Azafrán Alicante blister x 2 uni
  8906038786416        3.514,50      7.309,00   107.97% M [SRI SRI TATTVA] Crema Dental Sri Sri Tattva  Ayurvédica Libre
  7891024034767          849,00      1.759,00   107.18% M [Palmolive] Jabón Barra Karite Palmolive 85 Gr
  7891024034781          849,00      1.759,00   107.18% M [Palmolive] Jabón De Tocador Palmolive Naturals Karite 85 G
  7790299003662        7.374,50     14.749,00   100.00% M [Ferrini] Crema sapolán light Ferrini en pote 200 cc.
  7790299003655        8.189,50     16.379,00   100.00% M [Ferrini] Crema sapolán light Ferrini en pote 200 cc.
  7806810025195    4.421.999,00     21.909,30   -99.50% C [Ilko] Set Mini Tarteras Ilko Non Stick 4 U 12 Cm Negro
  7806810025188       18.875,35     37.204,29    97.11% M [Ilko] Molde Ilko Redondo Desmontable Non Stick 28 Cm Negro
  7790290007195        6.059,00     11.549,00    90.61% M [Carpano Punt E Mes] Aperitivo con alcohol Carpano Punt E Mes 
  7806810025119       18.875,35     35.944,29    90.43% M [Ilko] Molde Ilko Desmontable Redondo Non Stick 26 Cm Negro
  7796885457611      899.999,25  1.699.999,00    88.89% M [Bgh] Aire Acondicionado Ventana Bgh 5200w Frio Bc52wfaw
  90415418             1.821,00      3.439,00    88.85% M [Red Bull] Energizante Free Sugar Red Bull 250 Cc
  7791762255205        2.669,00      4.899,00    83.55% M [Avon] Cuaderno Avon Cuadriculado A4 84 Hojas Surtido
  7791813403036        1.759,45      3.200,00    81.88% M [H20!] Agua Saborizada Sin Gas H2oh Sabor Manzana 1,5 L
  7791813403012        1.759,45      3.200,00    81.88% M [H20!] Agua Saborizada Sin Gas H2oh Sabor Pomelo 1,5 L
  7791813403029        1.759,45      3.200,00    81.88% M [H20!] Agua Saborizada Sin Gas H2oh Sabor Limón 1,5 L

──────────────────────────────────────────────────────────────────────────────
  DISTRIBUCIÓN POR MARCA (top 20 en el match cross-retailer)
──────────────────────────────────────────────────────────────────────────────
  Dove                         60  ██████████████████████████████
  La Serenísima                56  ████████████████████████████
  Sedal                        43  ██████████████████████
  Elvive                       43  ██████████████████████
  Nivea                        38  ███████████████████
  Colgate                      32  ████████████████
  Knorr                        28  ██████████████
  Alicante                     27  ██████████████
  Granja Del Sol               24  ████████████
  Rexona                       23  ████████████
  Matarazzo                    22  ███████████
  Lucchetti                    22  ███████████
  Milkaut                      22  ███████████
  Electrolux                   20  ██████████
  Algabo                       19  ██████████
  Yogurisimo                   19  ██████████
  Pedigree                     17  █████████
  Johnson´s Baby               17  █████████
  Royal                        17  █████████
  Arcor                        16  ████████

──────────────────────────────────────────────────────────────────────────────
  EXCLUSIVOS POR CADENA (EAN disponible en una, no en la otra)
──────────────────────────────────────────────────────────────────────────────
  Solo en Masonline: 8.588
  Solo en Carrefour: 16.755

════════════════════════════════════════════════════════════════════════════
