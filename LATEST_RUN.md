
> olavarria-comparador-precios@0.1.0 report /home/runner/work/comparador-precios/comparador-precios
> tsx bin/report.ts --cross-retailer


════════════════════════════════════════════════════════════════════════════
  REPORTE CRUZADO POR EAN — Masonline vs Carrefour
════════════════════════════════════════════════════════════════════════════

  TOTAL DE PRODUCTOS QUE MATCHEAN POR EAN: 3.998
  (ambas cadenas, precio vigente y disponible, price > 0)

──────────────────────────────────────────────────────────────────────────────
  DISTRIBUCIÓN DE DIFERENCIAS DE PRECIO (|diff %|)
──────────────────────────────────────────────────────────────────────────────
  < 5%       2.253 ( 56.4%) ████████████████████████████████████████
  5–10%        470 ( 11.8%) ████████
  10–25%       563 ( 14.1%) ██████████
  25–50%       581 ( 14.5%) ██████████
  ≥ 50%        131 (  3.3%) ██

──────────────────────────────────────────────────────────────────────────────
  ¿QUIÉN ES MÁS BARATO? (empate = |diff| ≤ 1%)
──────────────────────────────────────────────────────────────────────────────
  Masonline más barato:     509 (12.7%)
  Carrefour más barato:   1.694 (42.4%)
  Empate:                 1.795 (44.9%)

──────────────────────────────────────────────────────────────────────────────
  TOP 20 MAYORES DIFERENCIAS (|diff %|) — spot-check manual
──────────────────────────────────────────────────────────────────────────────
  EAN                     Mas $         Car $     diff%  Producto
  7798160620154        3.999,00     45.592,00  1040.09% M [Iael] Bolso Iael Para Kit De Seguridad
  7798008632066        3.999,75     15.999,00   300.00% M [Doble G] Taza Doble G Línea Universal Adaptable Fiat Palio To
  7796373001463        1.590,00      3.315,00   108.49% M [La Parmesana] Salsa Picante Jalapeño La Parmesana 180 Ml
  7791540048500        4.999,00     10.100,00   102.04% M [Alma Mora] Vino Tinto Alma Mora Reserva Cabernet Sauvignon 75
  7791540044106        4.999,00     10.100,00   102.04% M [Alma Mora] Vino Tinto Alma Mora Reserva Malbec 750ml
  7500435178587        7.979,00     16.119,00   102.02% M [Gillette] Afeitadoras Desechables Gillette Para El Cuerpo 4 U
  7806810025195    4.334.999,00     21.909,30   -99.49% C [Ilko] Set Mini Tarteras Ilko Non Stick 4 U 12 Cm Negro
  7896211846727        4.036,45      7.990,00    97.95% M [SIMONAGGIO] Cuchilla Simonaggio Madera Inox
  7798121747159        3.149,25      5.999,00    90.49% M [Silver Shadow] Destornillador Silver Shadow Cr V Plano 4x150
  90415418             1.821,00      3.439,00    88.85% M [Red Bull] Energizante Free Sugar Red Bull 250 Cc
  7791762255205        2.669,00      4.899,00    83.55% M [Avon] Cuaderno Avon Cuadriculado A4 84 Hojas Surtido
  7794903232219        1.639,00      3.000,00    83.04% M [Yuka] Galletitas Yuka Pepitas Sin Tacc 150 G
  7791813403012        1.759,45      3.200,00    81.88% M [H20!] Agua Saborizada Sin Gas H2oh Sabor Pomelo 1,5 L
  7791813000723        1.759,45      3.200,00    81.88% M [H20!] Agua Saborizada H2oh! Sabor Naranja 1,5 L
  7791813403029        1.759,45      3.200,00    81.88% M [H20!] Agua Saborizada Sin Gas H2oh Sabor Limón 1,5 L
  7791813403036        1.759,45      3.200,00    81.88% M [H20!] Agua Saborizada Sin Gas H2oh Sabor Manzana 1,5 L
  7791813405016        1.841,95      3.350,00    81.87% M [H20!] Agua Saborizada H2oh! Still Sabor Pomelo 2 L
  7791813405030        1.841,95      3.350,00    81.87% M [H20!] Agua Saborizada H2oh! Still Sabor Manzana 2 L
  7791813405023        1.841,95      3.350,00    81.87% M [H20!] Agua Saborizada H2oh! Still Sabor Limoneto 2 L
  7794360000277        1.249,00      2.271,20    81.84% M [Faber Castell] Boligrafo Negro Transparente Faber Castell 4 U

──────────────────────────────────────────────────────────────────────────────
  DISTRIBUCIÓN POR MARCA (top 20 en el match cross-retailer)
──────────────────────────────────────────────────────────────────────────────
  La Serenísima                76  ██████████████████████████████
  Sedal                        63  █████████████████████████
  Elvive                       54  █████████████████████
  Dove                         51  ████████████████████
  Colgate                      49  ███████████████████
  Nivea                        44  █████████████████
  Milkaut                      38  ███████████████
  VERTICE                      35  ██████████████
  Alicante                     35  ██████████████
  Revigal                      31  ████████████
  Pantene                      31  ████████████
  Arcor                        29  ███████████
  La Virginia                  28  ███████████
  Granja Del Sol               28  ███████████
  Bimbo                        27  ███████████
  Lucchetti                    27  ███████████
  Knorr                        27  ███████████
  Cif                          25  ██████████
  Algabo                       25  ██████████
  La Parmesana                 23  █████████

──────────────────────────────────────────────────────────────────────────────
  EXCLUSIVOS POR CADENA (EAN disponible en una, no en la otra)
──────────────────────────────────────────────────────────────────────────────
  Solo en Masonline: 8.142
  Solo en Carrefour: 22.042

════════════════════════════════════════════════════════════════════════════
