# Úkol: prototyp dema „Dojedeno“ pro hackathonový pitch

## Kontext
Jsme tým na hackathonu Hack Prague 2026, který pořádá Kokoza. Projekt se jmenuje **„Dojedeno · Vážíme to vážně“**.

- **Problém:** ve školních jídelnách se vyhodí zhruba třetina uvařeného jídla.
- **Naše řešení:** pod kbelík na zbytky dáme váhu a nad něj telefon. U každého talíře AI pozná jídlo a zjistí, kolik ho zbylo. Jídelna pak dostane denní měření, měsíční analýzu a konkrétní opatření.

Pro pitch potřebujeme **prototyp rozhraní**. Na pódiu fyzicky položíme talíř s jídlem pod kameru a na plátně se „živě“ ukáže rozpoznání.

- **Rozpoznání i všechna čísla jsou předem připravená podle scénáře.** V tomhle prototypu se žádná AI nevolá.
- **Kroky řídí prezentující** klávesou nebo klikrem.

## Co postavit
- **Typ aplikace:** statická webová aplikace (HTML + CSS + čistý JavaScript), bez build kroku.
- **Žádné závislosti z internetu, musí běžet offline.** Pokud použiješ knihovnu, ulož ji lokálně do `vendor/`.
- **Složka:** `~/Documents/hack-prague-2026/demo/`
- **Spuštění:** v té složce `python3 -m http.server 8080`, pak `http://localhost:8080` v Chrome přes celou obrazovku.
- **Rozlišení:** cílové je 1920×1080 (projektor). Layout drž v poměru 16:9 a škáluj ho, aby dobře vypadal i na 1280×720.

## Ovládání
| Klávesy | Akce |
|---|---|
| `→`, `mezerník`, `PageDown` (klikr) | další krok |
| `←`, `PageUp` | zpět |
| `R` | reset na začátek |
| `1`–`8` | skok na krok |
| `C` | přepnout zdroj obrazu: živá kamera / statická fotka |
| `H` | ukázat nebo skrýt nápovědu ovládání (výchozí: skrytá) |

- **Stav se vždy vykreslí deterministicky z čísla kroku.** Krok musí jít zopakovat (zpět a znovu vpřed) a skákat se musí dát kamkoli, aniž se rozbijí animace.

## Hlavička na všech scénách
- Vlevo nápis „Dojedeno“.
- Uprostřed „ZŠ {název ze configu} · Oběd {datum ze configu}“.
- Vpravo nahoře malý, ale viditelný štítek **„Prototyp“**.

## Scény a kroky (přesný scénář)

### Scéna 1: Živě z jídelny (kroky 1–4)
**Rozvržení:** vlevo velký panel kamery (poměr 16:10, zaoblené rohy), vpravo panel výsledků.

**Panel kamery:**
- Živý obraz z webkamery přes `getUserMedia`. Na localhostu to funguje i bez HTTPS.
- Zařízení vyber podle `camera.labelContains` z configu (např. „iPhone“ kvůli Kameře v Kontinuitě), jinak vezmi výchozí.
- Když kamera není k dispozici nebo se zmáčkne `C`, ukaž statickou fotku `assets/plate-full.jpg` nebo `assets/plate-leftover.jpg` podle kroku.
- Pod obrazem ukaž „Dnešní menu“ (2 jídla + polévka z configu) a ukazatel váhy „Váha: 0 g“.

**Krok 1 (výchozí):** panel výsledků je prázdný, nápis „Čekám na talíř…“ a jemně pulzující „● měřím“.

**Krok 2: plná porce (vzor ráno):**
1. „Cvaknutí“: krátký bílý záblesk přes panel kamery a zmrazení snímku. Použij aktuální snímek z kamery, nebo statickou fotku.
2. Skenování: světelná linka přejede přes obraz (1,2 s) a kolem středu se objeví jemný obecný kruh „detekovaný talíř“. Žádné přesné rámečky kolem jídla.
3. Stav „Rozpoznávám…“ asi 1,5 s.
4. Postupně (vždy 150 ms po sobě) se objeví složky jídla z configu, např. „Segedínský guláš s knedlíkem: knedlík 4 ks · 180 g, guláš · 220 g“.
5. Nakonec „Plná porce: 400 g · 100 %“ a animovaně se vyplní prstencový graf složek.

**Krok 3: talíř po obědě:**
- Panel výsledků ukáže „Talíř se vrací z výdeje…“ a kamera zase živý obraz. Prezentující mezitím fyzicky vymění talíř nebo vyškrábe zbytek do kbelíku.
- Po stisku: záblesk a skenování jako v kroku 2.
- Váha animovaně naskočí z 0 g na +150 g (počítání nahoru 0,8 s). Nejdřív „ustaluji…“, pak „ustáleno ✓“.

**Krok 4: výsledek talíře:**
- „Zbylo: knedlík 2 ks · 90 g, guláš · 60 g, celkem 150 g.“
- „Snědeno 63 %“: spočítej z configu (snědeno / plná porce). Prstencový graf se animovaně přepne z plné porce na snědený podíl.
- „Vyhozeno 150 g · 5,55 Kč“: spočítej jako gramy × cena za kg z configu.
- Řádek se přidá do seznamu „Dnešní záznamy“ i s časem.
- Malá šedá poznámka: „O dojedení rozhoduje váha, ne AI: přírůstek pod 10 g = dojedeno.“

### Scéna 2: Celý den (krok 5)
- **Přechod:** plynulý, panel kamery se zmenší a odjede.
- **Velká čísla, která se počítají nahoru:**
  - „Talířů: 412“
  - „Z talířů: 41 kg“
  - „Nevydané z gastronádob: 37 kg“
  - „Příprava: 7 kg“
  - „Celkem dnes: 85 kg · 3 145 Kč“
  - „Dojedeno: 38 % talířů“
- **Pod nimi:**
  - vodorovné pruhy podle jídel (kolik kg připadá na který pokrm),
  - poměr zbytky z talířů / nevydané / příprava.
- Čísla ber z `config.json` (`day`).

### Scéna 3: Měsíc ve škole (krok 6)
Dobře viditelný štítek **„Ukázková data“**.
- **Hlavní graf:** 20 školních dní, sloupec = kg za den, rozdělený na zbytky z talířů / nevydané / přípravu. Sloupce rostou postupně zleva doprava (asi 1,5 s).
- **Vedle grafu:**
  - „5 nejčastěji vyhazovaných jídel“: kg a kolik procent porce se vrací,
  - „Co se nejí“ podle částí jídla: příloha / maso / omáčka / polévka / dezert.
- **Souhrn:** „Za měsíc: 1,7 t jídla · 63 000 Kč · ~4,3 t CO₂e“. Spočítej z dat, faktor CO₂ ber z configu.

### Scéna 4: Řešení pro školu (krok 7)
**Karty doporučení přijíždějí po jedné** (vždy 400 ms po sobě, jemně zespodu a z průhlednosti). Každá karta má ikonu, název opatření, zdůvodnění z dat a úsporu v Kč i kg za měsíc. **Všechna čísla v kartách spočítej ze stejného měsíčního datasetu, natvrdo jsou jen texty:**
1. „Rizoto: vařte o 35 porcí méně“ (v gastronádobách průměrně zbývá 38 porcí)
2. „Koprovka: upravit nebo nahradit recept“ (vrací se 61 % porce)
3. „Menší příloha pro 1. stupeň“ (přílohy tvoří 44 % zbytků z talířů)
4. „Polévky: vařit jen oblíbené“ (čočková a kulajda se vrací z 55 %)
5. „Přebytky zchladit a darovat“ (přes aplikaci Zachraň jídlo)
6. „Soutěž tříd na obrazovce v jídelně“ (příklad z Brna: 80 kg → 19 kg)

**Na konci velký souhrnný řádek,** jehož čísla se počítají nahoru: „Cíl pilotu: −20 % odpadu = ~120 000 Kč a ~3 t bioodpadu ročně“.

### Scéna 5: Obrazovka pro žáky (krok 8)
- „Dnes dojedeno 82 % talířů“.
- Animovaný žebříček tříd: 7.B 91 %, 6.A 84 %, 8.C 79 %, 9.A 71 %.
- Hravější styl, ale ve stejném designu.

## Data a konfigurace
### `config.json`
Obsahuje:
- název školy a datum,
- dnešní menu,
- scénář plné porce a zbytku (části jídla, kusy, gramy),
- cenu 37 Kč za kg,
- faktor 2,5 kg CO₂e na kg jídla (popisek „orientační odhad“),
- práh dojedení 10 g,
- nastavení kamery,
- čísla pro scénu 2 (`day`).

### `data/month.json`
Vygeneruj ho skriptem `tools/generate_month.py`: deterministicky (pevný seed) a výsledek ulož do souboru.

**Parametry:**
- 20 školních dní, asi 450 obědů denně,
- každý den 2 hlavní jídla a polévka, občas dezert nebo salát.

**Odpad:**
- asi 85 kg denně (rozptyl ±20 %),
- rozdělení: zbytky z talířů 48 %, nevydané 43 %, příprava 9 %,
- zbytky z talířů: hlavní jídlo 83 %, polévka 13 %, dezert/salát 4 %.

**Jídla:** české školní klasiky s různou oblíbeností, ať jsou rozdíly výrazné.
- Koprová omáčka s vejcem a bramborem (nejhorší)
- Čočka na kyselo s vejcem
- Kuřecí rizoto se zeleninou (hodně nevydaného)
- Svíčková na smetaně s knedlíkem
- Segedínský guláš s knedlíkem
- Rajská omáčka s těstovinami
- Kuře na paprice s rýží
- Rybí filé s bramborovou kaší
- Špagety s boloňskou omáčkou
- Smažený sýr s bramborem (nejlepší)
- Buchtičky se šodó

**Polévky:** hovězí vývar s nudlemi, čočková, kulajda, bramboračka, zeleninová, rajská.

**Kontrola součtů:**
- Měsíc musí dohromady dát asi 1,7 t a asi 63 000 Kč.
- Data musí obsahovat vzorce, ze kterých vyjdou doporučení ve scéně 4.

### Statické fotky
`assets/plate-full.jpg` a `assets/plate-leftover.jpg` vytvoř jako neutrální zástupné obrázky. Nahradíme je vlastními fotkami.

## Design
- **Styl Apple keynote:** tmavé pozadí (#0b0b0f až černá), hodně volného místa, velké písmo.
- **Písmo:** `-apple-system, "SF Pro Display", "Inter", system-ui`.
- **Panely:** jemně průhledné s rozostřením pozadí, zaoblení 24 px.
- **Barvy:**
  - zelená #30d158 pro „dojedeno“ a „úspora“,
  - oranžová #ff9f0a pro „vyhozeno“,
  - šedé pro vedlejší informace.
- **Animace:** plynulé 60 fps, jen přes transform a opacity, náběh `cubic-bezier(.2,.8,.2,1)`.
- **Počítání čísel nahoru** v českém formátu: mezera mezi tisíci, desetinná čárka.
- **Grafy:** vlastní SVG bez těžké knihovny, čisté, popisky přímo u dat.
- **Texty:** všechny česky s diakritikou.
- **Čitelnost z dálky:** nejmenší písmo 22 px při 1080p.

## Akceptační kritéria
1. Běží offline přes `python3 -m http.server` a v konzoli nejsou žádné chyby.
2. Celý scénář jde projít z kroku 1 do 8 a zpátky bez chyb. `R` funguje kdykoli.
3. Bez kamery (odmítnuté oprávnění) všechno funguje se statickými fotkami.
4. Čísla ve scénách 3 a 4 sedí s `data/month.json`.
5. `README.md` popisuje spuštění, ovládání, výměnu fotek a menu a úpravu čísel.
6. Nakonec ulož screenshot každého kroku do `screenshots/` (headless Chrome nebo Playwright).


## OPRAVA DAT (má přednost před čísly výše)

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
