
> olavarria-comparador-precios@0.1.0 report /home/runner/work/comparador-precios/comparador-precios
> tsx bin/report.ts --cross-retailer


════════════════════════════════════════════════════════════════════════════
  REPORTE CRUZADO POR EAN — Masonline vs Carrefour
════════════════════════════════════════════════════════════════════════════

  TOTAL DE PRODUCTOS QUE MATCHEAN POR EAN: 2.876
  (ambas cadenas, precio vigente y disponible, price > 0)

──────────────────────────────────────────────────────────────────────────────
  DISTRIBUCIÓN DE DIFERENCIAS DE PRECIO (|diff %|)
──────────────────────────────────────────────────────────────────────────────
  < 5%       1.604 ( 55.8%) ████████████████████████████████████████
  5–10%        238 (  8.3%) ██████
  10–25%       279 (  9.7%) ███████
  25–50%       588 ( 20.4%) ███████████████
  ≥ 50%        167 (  5.8%) ████

──────────────────────────────────────────────────────────────────────────────
  ¿QUIÉN ES MÁS BARATO? (empate = |diff| ≤ 1%)
──────────────────────────────────────────────────────────────────────────────
  Masonline más barato:     894 (31.1%)
  Carrefour más barato:     875 (30.4%)
  Empate:                 1.107 (38.5%)

──────────────────────────────────────────────────────────────────────────────
  TOP 20 MAYORES DIFERENCIAS (|diff %|) — spot-check manual
──────────────────────────────────────────────────────────────────────────────
  EAN                     Mas $         Car $     diff%  Producto
  7798008632066        3.999,75     15.999,00   300.00% M [Doble G] Taza Doble G Línea Universal Adaptable Fiat Palio To
  7806810201735       14.162,85     33.774,29   138.47% M [Ilko] Molde Ilko Desmontable Redondo 24 Cm
  7891132001705        1.059,00      2.339,00   120.87% M [Sazón] Saborizador para arroz Sazón 60 g.
  7891132001682        1.089,00      2.339,00   114.78% M [Sazón] Saborizador para verduras Sazón 60 g.
  7891132012015        1.409,00      2.899,00   105.75% M [Ají No Moto] Saborizador Ají No Moto 100 G.
  7798181511240        1.300,00      2.669,00   105.31% M [Smams] Galletitas Smams Rellenas Mouse Chocolate  105g
  7806810025195    4.421.999,00     21.909,30   -99.50% C [Ilko] Set Mini Tarteras Ilko Non Stick 4 U 12 Cm Negro
  7806810025188       18.875,35     37.204,29    97.11% M [Ilko] Molde Ilko Redondo Desmontable Non Stick 28 Cm Negro
  7794903232219        1.639,00      3.229,00    97.01% M [Yuka] Galletitas Yuka Pepitas Sin Tacc 150 G
  7790894901837      179.999,00    351.599,00    95.33% M [Motorola] Celular Motorola Moto G06 64 Gb 6.88" Azul Pantone 
  7791274198908        9.166,20     17.600,00    92.01% M [Star Wars] Jabón Líquido Star Wars Baby Joda 500 Ml
  7806810025119       18.875,35     35.944,29    90.43% M [Ilko] Molde Ilko Desmontable Redondo Non Stick 26 Cm Negro
  7796885457611      899.999,25  1.699.999,00    88.89% M [Bgh] Aire Acondicionado Ventana Bgh 5200w Frio Bc52wfaw
  7500435154741        4.805,40      8.919,00    85.60% M [Oral-B] Cepillo Dental Oral-B Suave Ultrafino
  7794000006171        3.469,00      6.399,00    84.46% M [Hellmanns] Ketchup Hellmanns Regular Squeeze 400 G
  7791762255205        2.669,00      4.899,00    83.55% M [Avon] Cuaderno Avon Cuadriculado A4 84 Hojas Surtido
  7792410008105        4.439,00      8.079,00    82.00% M [Cusenier] Licor Cusenier  De Chocolate 700ml
  7792410008006        4.439,00      8.079,00    82.00% M [Cusenier] Licor De Dulce De Leche Cusenier 700 Cc
  7791813403012        1.759,45      3.200,00    81.88% M [H20!] Agua Saborizada Sin Gas H2oh Sabor Pomelo 1,5 L
  7806810021678       28.241,85     51.099,30    80.93% M [Ilko] Wok 28 Cm Con Tapa Aluminio Ilko Grey Everyday

──────────────────────────────────────────────────────────────────────────────
  DISTRIBUCIÓN POR MARCA (top 20 en el match cross-retailer)
──────────────────────────────────────────────────────────────────────────────
  Dove                         55  ██████████████████████████████
  La Serenísima                47  ██████████████████████████
  Sedal                        43  ███████████████████████
  Elvive                       39  █████████████████████
  Nivea                        38  █████████████████████
  Milkaut                      30  ████████████████
  Rexona                       29  ████████████████
  Knorr                        28  ███████████████
  Arcor                        27  ███████████████
  Colgate                      26  ██████████████
  Lucchetti                    23  █████████████
  La Virginia                  21  ███████████
  Matarazzo                    20  ███████████
  Electrolux                   20  ███████████
  Algabo                       20  ███████████
  La Salteña                   19  ██████████
  Alicante                     19  ██████████
  Taragui                      17  █████████
  Granja Del Sol               17  █████████
  Elegante                     16  █████████

──────────────────────────────────────────────────────────────────────────────
  EXCLUSIVOS POR CADENA (EAN disponible en una, no en la otra)
──────────────────────────────────────────────────────────────────────────────
  Solo en Masonline: 8.451
  Solo en Carrefour: 16.587

════════════════════════════════════════════════════════════════════════════
