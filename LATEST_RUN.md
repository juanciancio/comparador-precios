
> olavarria-comparador-precios@0.1.0 report /home/runner/work/comparador-precios/comparador-precios
> tsx bin/report.ts --cross-retailer


════════════════════════════════════════════════════════════════════════════
  REPORTE CRUZADO POR EAN — Masonline vs Carrefour
════════════════════════════════════════════════════════════════════════════

  TOTAL DE PRODUCTOS QUE MATCHEAN POR EAN: 2.839
  (ambas cadenas, precio vigente y disponible, price > 0)

──────────────────────────────────────────────────────────────────────────────
  DISTRIBUCIÓN DE DIFERENCIAS DE PRECIO (|diff %|)
──────────────────────────────────────────────────────────────────────────────
  < 5%       1.669 ( 58.8%) ████████████████████████████████████████
  5–10%        278 (  9.8%) ███████
  10–25%       271 (  9.5%) ██████
  25–50%       516 ( 18.2%) ████████████
  ≥ 50%        105 (  3.7%) ███

──────────────────────────────────────────────────────────────────────────────
  ¿QUIÉN ES MÁS BARATO? (empate = |diff| ≤ 1%)
──────────────────────────────────────────────────────────────────────────────
  Masonline más barato:     748 (26.3%)
  Carrefour más barato:     966 (34.0%)
  Empate:                 1.125 (39.6%)

──────────────────────────────────────────────────────────────────────────────
  TOP 20 MAYORES DIFERENCIAS (|diff %|) — spot-check manual
──────────────────────────────────────────────────────────────────────────────
  EAN                     Mas $         Car $     diff%  Producto
  7798008632066        3.199,80     15.999,00   400.00% M [Doble G] Taza Doble G Línea Universal Adaptable Fiat Palio To
  7798081285128       53.071,20    214.999,00   305.11% M [Smart Life] Cafetera Smartlife Sl-Cm9402
  7806810201735       13.073,40     33.774,29   158.34% M [Ilko] Molde Ilko Desmontable Redondo 24 Cm
  7806810021678       22.239,00     51.099,30   129.77% M [Ilko] Wok 28 Cm Con Tapa Aluminio Ilko Grey Everyday
  190780132548        15.689,00     35.000,00   123.09% M [HP] Botella De Tinta Magenta Hp Gt52 M
  7891132001705        1.059,00      2.339,00   120.87% M [Sazón] Saborizador para arroz Sazón 60 g.
  190780132524        15.939,00     35.000,00   119.59% M [HP] Botella De Tinta Cian Hp Gt52 Original M0h54al
  656750725535         2.229,00      4.809,00   115.75% M [Glow] Esponja  Fibra Parrillera  Glow 1un
  7891132001682        1.089,00      2.339,00   114.78% M [Sazón] Saborizador para verduras Sazón 60 g.
  7806810025188       17.423,40     37.204,29   113.53% M [Ilko] Molde Ilko Redondo Desmontable Non Stick 28 Cm Negro
  7790895649837        1.664,50      3.520,00   111.47% M [Ades] Jugo Ades Soja 1 L
  7791019175973        1.139,00      2.399,00   110.62% M [3 Arroyos] Copos De Maíz 3 Arroyos Miel 200 G
  4006000016740       12.939,50     26.919,00   108.04% M [Nivea Sun] Protector Solar Nivea Sun Babies & Kids Sensitive 
  4005808944385       11.204,50     23.309,00   108.03% M [Nivea Sun] Protector Solar Nivea Swim & Play Kids Fps 60 Ultr
  4006000016702       11.204,50     23.309,00   108.03% M [Nivea Sun] Protector Solar Humectante En Loción Nivea Sun Pro
  4006000016719       12.359,50     25.709,00   108.01% M [Nivea Sun] Protector Solar Humectante En Loción Nivea Sun Pro
  7798125594018       14.259,00     29.562,60   107.33% M [Aston] Wok Sarten 28 Cm Cocinar Antiadherente Aston Plata
  7891132012015        1.409,00      2.899,00   105.75% M [Ají No Moto] Saborizador Ají No Moto 100 G.
  192545527583        17.219,00     35.000,00   103.26% M [HP] Botella De Tinta Negra Hp Gt53 Original 1vv22al
  7794360000277        1.249,00      2.499,00   100.08% M [Faber Castell] Boligrafo Negro Transparente Faber Castell 4 U

──────────────────────────────────────────────────────────────────────────────
  DISTRIBUCIÓN POR MARCA (top 20 en el match cross-retailer)
──────────────────────────────────────────────────────────────────────────────
  Nivea                        43  ██████████████████████████████
  La Serenísima                43  ██████████████████████████████
  Dove                         42  █████████████████████████████
  Colgate                      40  ████████████████████████████
  Elvive                       39  ███████████████████████████
  Sedal                        33  ███████████████████████
  Milkaut                      29  ████████████████████
  Knorr                        28  ████████████████████
  Arcor                        27  ███████████████████
  Rexona                       27  ███████████████████
  Matarazzo                    25  █████████████████
  Lucchetti                    24  █████████████████
  Motorola                     21  ███████████████
  La Salteña                   21  ███████████████
  Electrolux                   20  ██████████████
  Pantene                      20  ██████████████
  La Virginia                  19  █████████████
  Granja Del Sol               19  █████████████
  Pedigree                     19  █████████████
  Algabo                       18  █████████████

──────────────────────────────────────────────────────────────────────────────
  EXCLUSIVOS POR CADENA (EAN disponible en una, no en la otra)
──────────────────────────────────────────────────────────────────────────────
  Solo en Masonline: 8.099
  Solo en Carrefour: 16.095

════════════════════════════════════════════════════════════════════════════
