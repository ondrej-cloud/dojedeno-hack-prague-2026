# Oprava dat pro demo „Dojedeno“ (vlož do Codexu jako další zprávu)

**Stav 31. 10. 2026: zapracováno do dema.** Přegenerovaný měsíc má přesně 672 kg z talířů / 62 160 Kč a 602 kg nevydaného / 1 505 ekvivalentních porcí po 400 g. Níže uvedené měsíční hodnoty byly orientační. Částka za 150 g se z 13,875 Kč zaokrouhluje na desetihaléře (13,90 Kč).

Uprav prosím čísla v demu podle ověřených dat. Logiku a design neměň.

1. **Cena:** `config.json` → `cenaZaKg: 92.5` s popiskem „cena surovin: 37 Kč za oběd / porce 400 g“. Dosavadních 37 Kč za kg je chyba.
2. **Krok 4:** zbytek 150 g → „Vyhozeno 150 g · 13,90 Kč“ (počítá se z `cenaZaKg`). Snědeno 63 % zůstává.
3. **Scéna 2 (den):**
   - Talířů: 412
   - Z talířů: 34 kg · 3 145 Kč
   - Nevydané z gastronádob: 30 kg ≈ 75 porcí (kg / 0,4)
   - Příprava: 6 kg
   - Celkem dnes: 70 kg
   - Dojedeno: 38 % talířů
   - U nevydaného jídla ukazuj kg a porce, ne Kč.
4. **Scéna 3 (měsíc, ukázková data):**
   - Generátor nastav na asi 70 kg denně (±20 %), poměr 48 / 43 / 9.
   - Souhrn: „Za měsíc z talířů: ~680 kg · ~63 000 Kč · nevydáno ~1 500 porcí“.
   - **CO₂ úplně odstraň**, včetně configu.
5. **Nejhůř hodnocené jídlo** je teď **Špenát s bramborem a vejcem** (vrací se asi 47 % porce), ne koprovka. Koprovka ať je druhá nejhorší.
6. **Karty řešení (scéna 4):**
   1. „Vařit podle vydaných obědů“: 5–9 % žáků si oběd nevyzvedne. Příklad z dat: rizoto o 35 porcí méně.
   2. „Špenát: upravit recept nebo porci“: vrací se 47 % porce.
   3. „Menší příloha pro 1. stupeň“: podíl příloh ze zbytků na talířích spočítej z dat.
   4. „Polévky: vařit méně a jen oblíbené“: polévku jí jen pětina žáků.
   5. „Nevydané porce darovat přes Zachraň oběd“: Praha 4 do aplikace už zapojila své jídelny.
   6. „Soutěž tříd na obrazovce v jídelně“: Brno, 80 kg → 19 kg.
7. **Souhrnný řádek:** „Příklad: −10 % odpadu z talířů = 60 000 Kč ročně na školu“, se štítkem „příklad, ne slib“. Žádné −20 %, 120 000 Kč ani tuny.
