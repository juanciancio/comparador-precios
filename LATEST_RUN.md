
> olavarria-comparador-precios@0.1.0 report /home/runner/work/comparador-precios/comparador-precios
> tsx bin/report.ts --cross-retailer


════════════════════════════════════════════════════════════════════════════
  REPORTE CRUZADO POR EAN — Masonline vs Carrefour
════════════════════════════════════════════════════════════════════════════

  TOTAL DE PRODUCTOS QUE MATCHEAN POR EAN: 3.932
  (ambas cadenas, precio vigente y disponible, price > 0)

──────────────────────────────────────────────────────────────────────────────
  DISTRIBUCIÓN DE DIFERENCIAS DE PRECIO (|diff %|)
──────────────────────────────────────────────────────────────────────────────
  < 5%       1.900 ( 48.3%) ████████████████████████████████████████
  5–10%        443 ( 11.3%) █████████
  10–25%       568 ( 14.4%) ████████████
  25–50%       880 ( 22.4%) ███████████████████
  ≥ 50%        141 (  3.6%) ███

──────────────────────────────────────────────────────────────────────────────
  ¿QUIÉN ES MÁS BARATO? (empate = |diff| ≤ 1%)
──────────────────────────────────────────────────────────────────────────────
  Masonline más barato:     954 (24.3%)
  Carrefour más barato:   1.479 (37.6%)
  Empate:                 1.499 (38.1%)

──────────────────────────────────────────────────────────────────────────────
  TOP 20 MAYORES DIFERENCIAS (|diff %|) — spot-check manual
──────────────────────────────────────────────────────────────────────────────
  EAN                     Mas $         Car $     diff%  Producto
  7798160620154        3.999,00     45.592,00  1040.09% M [Iael] Bolso Iael Para Kit De Seguridad
  7798008632066        3.999,75     15.999,00   300.00% M [Doble G] Taza Doble G Línea Universal Adaptable Fiat Palio To
  7796373001463        1.590,00      3.315,00   108.49% M [La Parmesana] Salsa Picante Jalapeño La Parmesana 180 Ml
  7500435178587        7.979,00     16.119,00   102.02% M [Gillette] Afeitadoras Desechables Gillette Para El Cuerpo 4 U
  7806810025195    4.334.999,00     21.909,30   -99.49% C [Ilko] Set Mini Tarteras Ilko Non Stick 4 U 12 Cm Negro
  7896211846727        4.036,45      7.990,00    97.95% M [SIMONAGGIO] Cuchilla Simonaggio Madera Inox
  7798121747159        3.149,25      5.999,00    90.49% M [Silver Shadow] Destornillador Silver Shadow Cr V Plano 4x150
  90415418             1.821,00      3.439,00    88.85% M [Red Bull] Energizante Free Sugar Red Bull 250 Cc
  7791762255205        2.669,00      4.899,00    83.55% M [Avon] Cuaderno Avon Cuadriculado A4 84 Hojas Surtido
  7794903232219        1.639,00      3.000,00    83.04% M [Yuka] Galletitas Yuka Pepitas Sin Tacc 150 G
  7791813000723        1.759,45      3.200,00    81.88% M [H20!] Agua Saborizada H2oh! Sabor Naranja 1,5 L
  7791813405016        1.841,95      3.350,00    81.87% M [H20!] Agua Saborizada H2oh! Still Sabor Pomelo 2 L
  7791813405030        1.841,95      3.350,00    81.87% M [H20!] Agua Saborizada H2oh! Still Sabor Manzana 2 L
  7791813405023        1.841,95      3.350,00    81.87% M [H20!] Agua Saborizada H2oh! Still Sabor Limoneto 2 L
  7794360000277        1.249,00      2.271,20    81.84% M [Faber Castell] Boligrafo Negro Transparente Faber Castell 4 U
  7798125593899       21.999,45     40.002,60    81.83% M [ASTON] Bifera Aston 28 Cm Gris
  7797196932255        5.383,95      9.789,00    81.82% M [Fary Home] Tostador Fary Home Con Difusor Interno
  7794360939072        1.249,00      2.263,20    81.20% M [Faber Castell] Lapiz Corrector Faber Castell 1u
  7702010420320        3.005,40      5.399,00    79.64% M [Protex] Jabón Líquido Protex Aloe 221 Ml
  7796885457611      959.999,19  1.699.999,00    77.08% M [Bgh] Aire Acondicionado Ventana Bgh 5200w Frio Bc52wfaw

──────────────────────────────────────────────────────────────────────────────
  DISTRIBUCIÓN POR MARCA (top 20 en el match cross-retailer)
──────────────────────────────────────────────────────────────────────────────
  La Serenísima                74  ██████████████████████████████
  Sedal                        61  █████████████████████████
  Elvive                       53  █████████████████████
  Dove                         52  █████████████████████
  Colgate                      47  ███████████████████
  Nivea                        44  ██████████████████
  Milkaut                      37  ███████████████
  VERTICE                      35  ██████████████
  Alicante                     34  ██████████████
  Revigal                      31  █████████████
  Pantene                      31  █████████████
  Arcor                        30  ████████████
  Knorr                        29  ████████████
  Granja Del Sol               28  ███████████
  La Virginia                  27  ███████████
  Lucchetti                    26  ███████████
  Bimbo                        26  ███████████
  Cif                          24  ██████████
  Algabo                       24  ██████████
  La Parmesana                 23  █████████

──────────────────────────────────────────────────────────────────────────────
  EXCLUSIVOS POR CADENA (EAN disponible en una, no en la otra)
──────────────────────────────────────────────────────────────────────────────
  Solo en Masonline: 8.222
  Solo en Carrefour: 22.116

════════════════════════════════════════════════════════════════════════════
