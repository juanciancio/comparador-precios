
> olavarria-comparador-precios@0.1.0 report /home/runner/work/comparador-precios/comparador-precios
> tsx bin/report.ts --cross-retailer


════════════════════════════════════════════════════════════════════════════
  REPORTE CRUZADO POR EAN — Masonline vs Carrefour
════════════════════════════════════════════════════════════════════════════

  TOTAL DE PRODUCTOS QUE MATCHEAN POR EAN: 2.986
  (ambas cadenas, precio vigente y disponible, price > 0)

──────────────────────────────────────────────────────────────────────────────
  DISTRIBUCIÓN DE DIFERENCIAS DE PRECIO (|diff %|)
──────────────────────────────────────────────────────────────────────────────
  < 5%       1.614 ( 54.1%) ████████████████████████████████████████
  5–10%        258 (  8.6%) ██████
  10–25%       323 ( 10.8%) ████████
  25–50%       603 ( 20.2%) ███████████████
  ≥ 50%        188 (  6.3%) █████

──────────────────────────────────────────────────────────────────────────────
  ¿QUIÉN ES MÁS BARATO? (empate = |diff| ≤ 1%)
──────────────────────────────────────────────────────────────────────────────
  Masonline más barato:     985 (33.0%)
  Carrefour más barato:     859 (28.8%)
  Empate:                 1.142 (38.2%)

──────────────────────────────────────────────────────────────────────────────
  TOP 20 MAYORES DIFERENCIAS (|diff %|) — spot-check manual
──────────────────────────────────────────────────────────────────────────────
  EAN                     Mas $         Car $     diff%  Producto
  7799111695634        8.109,00     38.999,00   380.93% M [Atma Hogar] Escurridor Manual Vegetales Atma Home Gris AAEV10
  7798081285128       53.071,20    214.999,00   305.11% M [Smart Life] Cafetera Smartlife Sl-Cm9402
  7794360939072        1.249,00      2.829,00   126.50% M [Faber Castell] Lapiz Corrector Faber Castell 1u
  4006000050201        2.649,00      5.879,00   121.93% M [Nivea] Jabón con glicerina Nivea orquídeas para todo tipo de 
  7891132001705        1.059,00      2.339,00   120.87% M [Sazón] Saborizador para arroz Sazón 60 g.
  656750725535         2.229,00      4.809,00   115.75% M [Glow] Esponja  Fibra Parrillera  Glow 1un
  7891132001682        1.089,00      2.339,00   114.78% M [Sazón] Saborizador para verduras Sazón 60 g.
  7500435245814       11.729,00     24.849,00   111.86% M [Gillette] Maquina Afeitar Desechable Gillette Prestobarba Car
  7891132012015        1.409,00      2.899,00   105.75% M [Ají No Moto] Saborizador Ají No Moto 100 G.
  7794626011177       11.319,00     22.999,00   103.19% M [Plenitud] Pañal Para Adulto Plenitud Protect Xg 8un
  7795513044780          919,00      1.849,00   101.20% M [Filgo] Bolígrafo Filgo stick azul x 4 uni
  26102895139          3.249,00      6.499,00   100.03% M [Mercator] Plato Playo Carine Blanco
  7790299003662        7.374,50     14.749,00   100.00% M [Ferrini] Crema sapolán light Ferrini en pote 200 cc.
  7790299003655        8.189,50     16.379,00   100.00% M [Ferrini] Crema sapolán light Ferrini en pote 200 cc.
  7793008017998        7.799,50     15.599,00   100.00% M [Villeneuve] Protector solar baby Villeneuve FPS 60 120 cc.
  7793008018131        7.074,50     14.149,00   100.00% M [Villeneuve] Gel post solar Villeneuve con aloe 150 g.
  7702003008504       11.654,50     23.309,00   100.00% M [Nivea] Bronceador y protector solar Nivea Sun Protect & Bronz
  4006000016740       13.459,50     26.919,00   100.00% M [Nivea Sun] Protector Solar Nivea Sun Babies & Kids Sensitive 
  4006000016719       12.854,50     25.709,00   100.00% M [Nivea Sun] Protector Solar Humectante En Loción Nivea Sun Pro
  4005808944385       11.654,50     23.309,00   100.00% M [Nivea Sun] Protector Solar Nivea Swim & Play Kids Fps 60 Ultr

──────────────────────────────────────────────────────────────────────────────
  DISTRIBUCIÓN POR MARCA (top 20 en el match cross-retailer)
──────────────────────────────────────────────────────────────────────────────
  Dove                         58  ██████████████████████████████
  La Serenísima                52  ███████████████████████████
  Nivea                        47  ████████████████████████
  Elvive                       38  ████████████████████
  Sedal                        37  ███████████████████
  Colgate                      33  █████████████████
  Alicante                     31  ████████████████
  Pedigree                     27  ██████████████
  Arcor                        26  █████████████
  Milkaut                      26  █████████████
  Lucchetti                    26  █████████████
  Knorr                        25  █████████████
  Matarazzo                    25  █████████████
  Whiskas                      24  ████████████
  Algabo                       22  ███████████
  Rexona                       22  ███████████
  Pampers                      19  ██████████
  Cif                          18  █████████
  Motorola                     17  █████████
  Gallo                        17  █████████

──────────────────────────────────────────────────────────────────────────────
  EXCLUSIVOS POR CADENA (EAN disponible en una, no en la otra)
──────────────────────────────────────────────────────────────────────────────
  Solo en Masonline: 7.633
  Solo en Carrefour: 18.036

════════════════════════════════════════════════════════════════════════════
