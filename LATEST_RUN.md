
> olavarria-comparador-precios@0.1.0 report /home/runner/work/comparador-precios/comparador-precios
> tsx bin/report.ts --cross-retailer


════════════════════════════════════════════════════════════════════════════
  REPORTE CRUZADO POR EAN — Masonline vs Carrefour
════════════════════════════════════════════════════════════════════════════

  TOTAL DE PRODUCTOS QUE MATCHEAN POR EAN: 3.973
  (ambas cadenas, precio vigente y disponible, price > 0)

──────────────────────────────────────────────────────────────────────────────
  DISTRIBUCIÓN DE DIFERENCIAS DE PRECIO (|diff %|)
──────────────────────────────────────────────────────────────────────────────
  < 5%       2.239 ( 56.4%) ████████████████████████████████████████
  5–10%        560 ( 14.1%) ██████████
  10–25%       428 ( 10.8%) ████████
  25–50%       635 ( 16.0%) ███████████
  ≥ 50%        111 (  2.8%) ██

──────────────────────────────────────────────────────────────────────────────
  ¿QUIÉN ES MÁS BARATO? (empate = |diff| ≤ 1%)
──────────────────────────────────────────────────────────────────────────────
  Masonline más barato:     582 (14.6%)
  Carrefour más barato:   1.559 (39.2%)
  Empate:                 1.832 (46.1%)

──────────────────────────────────────────────────────────────────────────────
  TOP 20 MAYORES DIFERENCIAS (|diff %|) — spot-check manual
──────────────────────────────────────────────────────────────────────────────
  EAN                     Mas $         Car $     diff%  Producto
  7798160620154        3.999,00     56.990,00  1325.11% M [Iael] Bolso Iael Para Kit De Seguridad
  7798008632066        3.999,75     15.999,00   300.00% M [Doble G] Taza Doble G Línea Universal Adaptable Fiat Palio To
  7794360000277        1.249,00      2.839,00   127.30% M [Faber Castell] Boligrafo Negro Transparente Faber Castell 4 U
  7794360939072        1.249,00      2.829,00   126.50% M [Faber Castell] Lapiz Corrector Faber Castell 1u
  7790033342170        3.759,20      7.990,00   112.55% M [Fructis] Acondicionador Fructis Goodbye Daños 350ml
  7796373001463        1.590,00      3.315,00   108.49% M [La Parmesana] Salsa Picante Jalapeño La Parmesana 180 Ml
  7500435178587        7.979,00     16.119,00   102.02% M [Gillette] Afeitadoras Desechables Gillette Para El Cuerpo 4 U
  7795513075104        1.079,00      2.159,00   100.09% M [Filgo] Marcadores Escolares Pinto 2210 X 10un
  7806810025195    4.334.999,00     21.909,30   -99.49% C [Ilko] Set Mini Tarteras Ilko Non Stick 4 U 12 Cm Negro
  40000002666          2.339,40      4.485,00    91.72% M [Skittles] Caramelos Masticables Skittles Sour 51 G
  90415418             1.821,00      3.439,00    88.85% M [Red Bull] Energizante Free Sugar Red Bull 250 Cc
  195166233734        13.199,40     24.649,00    86.74% M [Hasbro] Juego De Plastilina Hasbro Playdoh Mini Surtido
  7798181511240        1.300,00      2.395,00    84.23% M [Smams] Galletitas Smams Rellenas Mouse Chocolate  105g
  7791762255205        2.669,00      4.899,00    83.55% M [Avon] Cuaderno Avon Cuadriculado A4 84 Hojas Surtido
  7790894902018      499.999,00    916.799,00    83.36% M [Motorola] Celular Motorola Moto G67 256gb Arctic Seal
  7790894901943      499.999,00    916.799,00    83.36% M [Motorola] Celular Motorola Moto G67 256gb Neal Green
  7791813403012        1.759,45      3.200,00    81.88% M [H20!] Agua Saborizada Sin Gas H2oh Sabor Pomelo 1,5 L
  7791813000723        1.759,45      3.200,00    81.88% M [H20!] Agua Saborizada H2oh! Sabor Naranja 1,5 L
  7791813403029        1.759,45      3.200,00    81.88% M [H20!] Agua Saborizada Sin Gas H2oh Sabor Limón 1,5 L
  7791813403036        1.759,45      3.200,00    81.88% M [H20!] Agua Saborizada Sin Gas H2oh Sabor Manzana 1,5 L

──────────────────────────────────────────────────────────────────────────────
  DISTRIBUCIÓN POR MARCA (top 20 en el match cross-retailer)
──────────────────────────────────────────────────────────────────────────────
  La Serenísima                75  ██████████████████████████████
  Sedal                        61  ████████████████████████
  Dove                         51  ████████████████████
  Elvive                       49  ████████████████████
  Colgate                      49  ████████████████████
  Nivea                        40  ████████████████
  Milkaut                      38  ███████████████
  Alicante                     36  ██████████████
  VERTICE                      35  ██████████████
  Revigal                      31  ████████████
  Pantene                      30  ████████████
  La Virginia                  29  ████████████
  Arcor                        28  ███████████
  Bimbo                        27  ███████████
  Granja Del Sol               27  ███████████
  Lucchetti                    27  ███████████
  Knorr                        27  ███████████
  Cif                          25  ██████████
  Algabo                       25  ██████████
  La Parmesana                 23  █████████

──────────────────────────────────────────────────────────────────────────────
  EXCLUSIVOS POR CADENA (EAN disponible en una, no en la otra)
──────────────────────────────────────────────────────────────────────────────
  Solo en Masonline: 8.091
  Solo en Carrefour: 22.048

════════════════════════════════════════════════════════════════════════════
