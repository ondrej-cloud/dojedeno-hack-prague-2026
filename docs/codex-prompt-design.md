# Pro Codex: pokračuj ve stylu prezentace Dojedeno (design + úkoly)

Stav k 31. 10. 2026, 19:45. Pitch je v neděli 1. 11., trvá **5 minut**, porotu tvoří Kokoza a magistrát. Repo `~/Documents/hack-prague-2026`, git `main` → GitHub → Netlify (https://dojezeno.netlify.app).

## 0. Nejdřív si přečti a prohlédni
- `prezentace/OBSAH.md`: závazná čísla a obsah. **Používej JEN čísla odtud**, včetně doplňku „31. 10. večer“.
- `docs/design-council.md`: designová identita.
- `docs/design-ref/*.png`: **referenční snímky slajdů**. Takhle má vypadat všechno, i demo. Otevři je a prohlédni si je.
- `prezentace/css/base.css`: tokeny (barvy, poloměry rohů, stín, pohyb). Nevymýšlej nové hodnoty, používej tyhle.
- `docs/HANDOFF-codex.md`: jak funguje deck. Sestavení přes `python3 build.py`, náhled přes `./shot.sh N k`, události slajdu `vstup`, `krok`, `odchod`, `tisk`.

## 1. Designový styl („hravý, hezký, úderný, interaktivní“). Drž se ho přesně
**Plátno a barvy:**
- Světlé plátno **#f5f5f7**, bílé karty **#fff**, **jeden** poloměr rohů (22 px, menší prvky 14 px) a **jeden** stín (`--stin`).
- Text #1d1d1f, tlumený #6e6e73 a #86868b.

**Barevný význam:**
- **Zelená #248a3d** (světlá #d3f0dc) = snědeno, úspora, „můžeme ovlivnit“.
- **Oranžová #c9601b** (světlá #f8e0cf) = vyhozeno, odpad, riziko.
- Jiné barvy nepřidávej.

**Písmo:** systémové `-apple-system, "SF Pro Display", "Inter"`.
- Nadpis 76 px tučně s velkými písmeny jen na začátku věty, krátký jako tvrzení („Kbelík řekne kolik. Talíř řekne co.“).
- Obří čísla 120–320 px tučně s jednotkou menší a šedou.
- Nejmenší text 22 px při 1920×1080.

**Jedna myšlenka na obrazovku:**
- Nadpis = tvrzení, pak jeden hlavní prvek (číslo, ilustrace, graf) a nejvýš jeden řádek navíc.
- **Žádné odstavce textu**, žádné vnořené karty v kartách, žádné hromady tlačítek.

**Pohyb:**
- Všechno přijíždí plynule: `cubic-bezier(0.16,1,0.3,1)`, 400–900 ms, prvky po sobě se zpožděním 70–150 ms.
- Čísla se počítají nahoru, pruhy rostou zleva, čáry se kreslí.
- Animuj jen `transform` a `opacity`, ať je to 60 fps.
- Respektuj `prefers-reduced-motion`.

**Ilustrace:** vlastní SVG, čára 3 px, zakulacené konce, `currentColor`. Sada symbolů je v `prezentace/index.template.html` (i-talir, i-kbelik, i-vaha, i-telefon, i-ai…). **Žádné emoji, žádné cizí ikony.**

**Skleněné pilulky** (`.veta-sklo`, `.pilulka`) jsou na stav a výzvy. Zelená tečka pulzuje, když je „živě“.

**Interaktivita:**
- Krok = jedno odhalení řízené klikrem (mezerník nebo šipka).
- Klepnutí myší na interaktivní prvek nesmí posunout slajd (`data-interaktivni`).
- Poctivé popisky: „prototyp“, „ukázková data“, „příklad, ne slib“.

**Kontrola:** po každé změně udělej screenshot (Chrome headless se SwiftShaderem, viz `prezentace/shot.sh`), **prohlédni ho** a srovnej s `docs/design-ref`. Hlídej, že nic nepřetéká, nic se nepřekrývá, je dost vzduchu a vše je čitelné z dálky.

## 2. Úkoly (pořadí podle priority)
Zkontroluj nejdřív `git log` a soubory. Claude mohl část už udělat.

### A) Slajd 05 `s-reseni` (na webu `#8`): 3D pás jako v jídelně
Zdroj je v `prezentace/model3d-src/src/model3d.js`, varianta `single`. Sestavení: `cd prezentace/model3d-src && npx esbuild src/model3d.js --bundle --format=iife --minify --target=es2020 --outfile=../js/model3d.js`.

**Jak má pás vypadat:**
- Otočný pás (smyčka, ovál), který jede dokola.
- **Zvenku** pás plní žáci (dávají tácy s talíři), **zevnitř** je odebírají kuchařky.
- Nad úsekem pásu před místem odběru je kamera (Raspberry Pi), vedle stojí kbelík na váze.

**Kroky:**
| Krok | Co se děje |
|---|---|
| 1 | Tác s talířem přijede po pásu (asi 3 s), pod kamerou se vyfotí (záblesk a zelený kužel záběru, štítek „Fotka: co zbylo“), dojede na konec a zastaví se. |
| 2 | Kuchařka (stačí stylizovaná ruka nebo pohyb talíře) ho vezme a vysype do kbelíku. Váha naskočí na +150 g. |
| 3 | Štítek „Spojeno podle pořadí: talíř ↔ +150 g“ a jídlo z menu. |

Skok, návrat a tisk = rovnou konečný stav. Tahem myši jde otáčet.

### B) Demo (`demo/`): kompletní redesign do stylu prezentace
**Současný vzhled je špatný.** Funkce ale zachovej: mobil přes Wi-Fi, automatický snímek, živou analýzu Claude, čtení displeje váhy, odečet talíře a přepínání kroků klikrem. **Logiku v `app.js` neměň víc, než je nutné.** Přepiš hlavně HTML strukturu obrazovek a CSS.

**Plátno a ovládání:**
- Plátno 1920×1080 škálované jako deck, světlé jako prezentace (ne tmavé), stejné tokeny.
- **Jedna obrazovka = jedna věc**, velké a jasné, minimum textu.
- Technické ovládání (párování mobilu, tárování talíře, nápověda, auto) schovej do panelu pod klávesou **S**, na hlavní ploše nic z toho není.

**Kroky:**
1. **Živě z pásu:** velký obraz z kamery (zaoblený), pod ním jedna pilulka „● Čekám na talíř“.
2. **Talíř vyfocen:** zmrazený snímek a vedle velký výsledek AI: jídlo z menu a složky jako barevné výseče talíře (příloha, maso, omáčka).
3. **Váha:** obří číslo „+150 g“, které se počítá nahoru. Pod ním „snědeno 63 %“ jako zelený prstenec.
4. **Den** (ukázková data): tři obří čísla a pruhy.
5. **Měsíc** (ukázková data): graf, který roste zleva.
6. **Opatření:** karty přijíždějí po jedné, každá jedna věta a úspora v Kč.
7. **Obrazovka pro žáky:** hravý žebříček tříd.

**Čísla:** jen z `demo/config.json` a `data/month.json`. Souhrnný řádek vždy jako „příklad, ne slib“.

**Hotovo je, když:**
- snímky všech kroků vypadají jako `docs/design-ref`,
- na hlavní ploše nejsou žádná technická tlačítka,
- demo jde ovládat klikrem,
- v prezentaci `#10` (iframe `s-ukazka`) na konci kroků demo pošle `parent.postMessage({dojedeno:'konec'},'*')`. **Tuhle vazbu zachovej.**

### C) Zkrácení na 5 minut
**Slajdy nepřesouvej, dokud Ondra nerozhodne.** Kandidáty na přesun za konec (oponentura) najdeš v chatu nebo v `docs/kandidati-oponentura.md`, pokud existuje. Přesun se dělá přejmenováním souboru ve `slajdy/` na `9x-…` a slajd dostane atribut `data-zaloha`.

## 3. Pravidla práce
- Commituj jen soubory, které jsi měnil (`git add <cesty>`). Krátká anglická zpráva bez podpisů. Pak `git push`. Před pushem udělej `git fetch` a `git pull --ff-only`.
- `prezentace/index.html` se generuje přes `python3 build.py`, ručně ho needituj.
- Žádná vymyšlená čísla. Odhad vždy označ.
- Po každém kroku udělej snímek, prohlédni ho a dolaď. Teprve pak commit.
