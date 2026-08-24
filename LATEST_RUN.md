
> olavarria-comparador-precios@0.1.0 report /home/runner/work/comparador-precios/comparador-precios
> tsx bin/report.ts --cross-retailer


════════════════════════════════════════════════════════════════════════════
  REPORTE CRUZADO POR EAN — Masonline vs Carrefour
════════════════════════════════════════════════════════════════════════════

  TOTAL DE PRODUCTOS QUE MATCHEAN POR EAN: 3.193
  (ambas cadenas, precio vigente y disponible, price > 0)

──────────────────────────────────────────────────────────────────────────────
  DISTRIBUCIÓN DE DIFERENCIAS DE PRECIO (|diff %|)
──────────────────────────────────────────────────────────────────────────────
  < 5%       1.909 ( 59.8%) ████████████████████████████████████████
  5–10%        281 (  8.8%) ██████
  10–25%       354 ( 11.1%) ███████
  25–50%       528 ( 16.5%) ███████████
  ≥ 50%        121 (  3.8%) ███

──────────────────────────────────────────────────────────────────────────────
  ¿QUIÉN ES MÁS BARATO? (empate = |diff| ≤ 1%)
──────────────────────────────────────────────────────────────────────────────
  Masonline más barato:   1.074 (33.6%)
  Carrefour más barato:   1.098 (34.4%)
  Empate:                 1.021 (32.0%)

──────────────────────────────────────────────────────────────────────────────
  TOP 20 MAYORES DIFERENCIAS (|diff %|) — spot-check manual
──────────────────────────────────────────────────────────────────────────────
  EAN                     Mas $         Car $     diff%  Producto
  7798081285128       53.071,20    214.999,00   305.11% M [Smart Life] Cafetera Smartlife Sl-Cm9402
  7806810021609       24.289,00     55.474,30   128.39% M [Ilko] Olla 24 Cm Aluminio Ilko Gris Everyday
  7891132001705        1.059,00      2.339,00   120.87% M [Sazón] Saborizador para arroz Sazón 60 g.
  656750725535         2.229,00      4.809,00   115.75% M [Glow] Esponja  Fibra Parrillera  Glow 1un
  7791019175973        1.139,00      2.399,00   110.62% M [3 Arroyos] Copos De Maíz 3 Arroyos Miel 200 G
  4006000016740       12.939,50     26.919,00   108.04% M [Nivea Sun] Protector Solar Nivea Sun Babies & Kids Sensitive 
  4006000016719       12.359,50     25.709,00   108.01% M [Nivea Sun] Protector Solar Humectante En Loción Nivea Sun Pro
  7793008017950        5.749,50     11.959,00   108.00% M [Villeneuve] Protector Solar Villeneuve Humecta Y Protege Fps 
  7795513044780          919,00      1.849,00   101.20% M [Filgo] Bolígrafo Filgo stick azul x 4 uni
  7793008018131        7.074,50     14.149,00   100.00% M [Villeneuve] Gel post solar Villeneuve con aloe 150 g.
  7790299003662        7.374,50     14.749,00   100.00% M [Ferrini] Crema sapolán light Ferrini en pote 200 cc.
  7790299003655        8.189,50     16.379,00   100.00% M [Ferrini] Crema sapolán light Ferrini en pote 200 cc.
  7793008017998        7.799,50     15.599,00   100.00% M [Villeneuve] Protector solar baby Villeneuve FPS 60 120 cc.
  7806810025195    4.334.999,00     21.909,30   -99.49% C [Ilko] Set Mini Tarteras Ilko Non Stick 4 U 12 Cm Negro
  7798167436673          949,00      1.890,00    99.16% M [Alba] Adhesivo Vinílico Alba Pegalba 40 G Color Surtido
  7798104180928          769,00      1.529,00    98.83% M [Megaprice] Camioncito Bombero Megaprice
  70177197292          3.966,00      7.859,00    98.16% M [Twinings] Té Twinings Earl Grey 10 Saquitos
  8906038786416        3.874,50      7.459,00    92.52% M [SRI SRI TATTVA] Crema Dental Sri Sri Tattva  Ayurvédica Libre
  7790290007195        6.059,00     11.549,00    90.61% M [Carpano Punt E Mes] Aperitivo con alcohol Carpano Punt E Mes 
  7798350082328        8.329,00     15.849,00    90.29% M [Duffy] Pañales talle G Duffy hiperpack 32 uni

──────────────────────────────────────────────────────────────────────────────
  DISTRIBUCIÓN POR MARCA (top 20 en el match cross-retailer)
──────────────────────────────────────────────────────────────────────────────
  La Serenísima                62  ██████████████████████████████
  Dove                         56  ███████████████████████████
  Nivea                        45  ██████████████████████
  Elvive                       45  ██████████████████████
  Sedal                        43  █████████████████████
  Alicante                     34  ████████████████
  Colgate                      34  ████████████████
  Arcor                        29  ██████████████
  Rexona                       29  ██████████████
  Lucchetti                    27  █████████████
  Knorr                        26  █████████████
  Milkaut                      26  █████████████
  Matarazzo                    24  ████████████
  Algabo                       23  ███████████
  La Virginia                  22  ███████████
  Granja Del Sol               21  ██████████
  Pedigree                     21  ██████████
  Palmolive                    19  █████████
  Pantene                      19  █████████
  Terma                        18  █████████

──────────────────────────────────────────────────────────────────────────────
  EXCLUSIVOS POR CADENA (EAN disponible en una, no en la otra)
──────────────────────────────────────────────────────────────────────────────
  Solo en Masonline: 8.370
  Solo en Carrefour: 16.139

════════════════════════════════════════════════════════════════════════════
