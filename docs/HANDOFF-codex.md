# Předávka pro Codex: kde pokračovat (Dojedeno, Hack Prague 2026)

Stav k sobotě 31. 10. 2026, 15:40. Pitch je v neděli 1. 11. odpoledne, trvá asi 5 minut a porotu tvoří Kokoza a magistrát.

## Projekt
- **Dojedeno · Vážíme to vážně:** automatické měření zbytků jídla ve školních jídelnách.
- **Jak to funguje:**
  - Pod kbelíkem na zbytky je váha, nad ním telefon.
  - AI pozná jídlo z dnešního menu, váha změří gramy.
  - Jídelna dostane denní měření, měsíční analýzu a opatření.
- **První pilot** proběhne u nás ve škole (pás vracení nádobí ve třech patrech), pak 3 jídelny za asi 50 000 Kč.

## Závazná čísla: používat JEN tato
Celý soubor je v `prezentace/OBSAH.md` (ověřené zdroje Z1–Z8):
- **31 %** uvařeného jídla se vyhodí (zbytky z talířů a nevydané pokrmy).
- **Rozdělení odpadu:** talíře 48 %, nevydané 43 %, příprava 9 %.
- **600 000 Kč ročně** u školy s 500 žáky, ale **jen ze zbytků na talířích**, tedy 1 200 Kč na žáka. Počítá se jen cena surovin 36–38 Kč za oběd.
- **Špenát s bramborem a vejcem:** zbyde 190 g z porce asi 400 g, tedy přibližně 47 %. Je to výpočet.
- **5–9 % žáků** si zaplacený oběd nevyzvedne. **Polévku jí jen pětina žáků.**
- **V ČR je 8 891 jídelen** a denně vaří pro 1,6 milionu dětí.
- **Úspora 10 % = 60 000 Kč** ročně. Jen jako příklad, ne slib.
- **Pilot ve 3 jídelnách za asi 50 000 Kč.** Je to náš odhad, ceny ověřujeme.
- **IKEA Česko včetně Zličína** snížila kuchyňský odpad s Winnow o polovinu.
- **Brno:** čočka nakyselo, běžně až 80 kg odpadu, při vážení s dětmi 19 kg.
- **NEPOUŽÍVAT:**
  - celkový odpad za 600 000 Kč (platí jen pro talíře),
  - vlastní přepočty na tuny, CO₂ nebo denní kilogramy,
  - tvrzení „v Česku to nikdo nedělá“ (správně: ve školních jídelnách jsme automatické měření nenašli).

## Složky
| Co | Kde |
|---|---|
| Prezentace (HTML deck) | `~/Documents/hack-prague-2026/prezentace/` |
| Demo (prototyp, postavil Codex) | `~/Documents/hack-prague-2026/demo/` |
| Podklady | `~/Documents/hack-prague-2026/docs/` (`kontext-projektu.md`, `mentor-kamera-jidlo.md`, `design-council.md`, `codex-prompt-demo.md`, `codex-oprava-dat.md`) |

## Prezentace: jak funguje
- **Otevření:** `open prezentace/index.html` v Chromu. Funguje offline přes file://.
- **Ovládání:**
  - mezerník nebo klikr = další, ← = zpět,
  - F = celá obrazovka, N = poznámky řečníka se stopkami, B = černá obrazovka,
  - Cmd+P = PDF, adresa `#slajd.krok` (např. `#5.2`).
- **Sestavení:**
  - `index.html` se generuje, needitovat ručně.
  - `python3 build.py` složí šablonu `index.template.html` se slajdy `slajdy/NN-*.html` (v abecedním pořadí), styly `css/sNN*.css` a skripty `js/sNN*.js`.
- **Náhled:** `./shot.sh N k` uloží PNG `/tmp/dojedeno/sN.k.png` (headless Chrome se SwiftShaderem, takže funguje i WebGL).
- **Sdílené soubory:**
  - `js/deck.js` = engine: kroky `data-krok`, `data-jen-krok`, počítadla `data-pocitej`, události `vstup`, `krok`, `odchod`, `tisk` na sekci, ukazatel průběhu ve tvaru talíře, poznámky. Klepnutí na `[data-interaktivni]`, `input` nebo `iframe` slajd neposune. Zpráva `postMessage {dojedeno:'konec'|'zacatek'}` z vloženého dema posune deck.
  - `css/base.css` = barevné a rozměrové tokeny (zelená = snědeno, oranžová = vyhozeno), nadpis v pruhu 164 px.
- **Každý slajd** je jedna `<section class="slajd" id="s-…" data-kroky="n">` a na jejím konci `<script type="application/json" class="poznamky-data">` s poznámkami řečníka. Styly slajdu jsou vždy vnořené pod `#s-…`.
- **3D:**
  - Zdroj je v `model3d-src/src/`: `model3d.js` (sestava kbelík + váha + telefon) a `uvod3d.js` (filmové otevření).
  - Sestavení: `cd model3d-src && npx esbuild src/X.js --bundle --format=iife --minify --target=es2020 --outfile=../js/X.js`.
  - `three@0.170` je v `model3d-src/node_modules`.
  - `data-model3d` = krokovaný model (slajd 05: krok 1 váha + vyklopení talíře na 150 g, krok 2 záběr telefonu, krok 3 štítek AI).
  - `data-model3d="otocny"` = točna, tahem myši se otáčí.

## Slajdy (12)
1. **01 `s-uvod`:** filmové 3D otevření (rozpracované, viz níže). Pak titul Dojedeno, 31 % a 3D točna.
2. **02 `s-problem`:** 600 000 Kč, 1 200 Kč na žáka, 8 891 jídelen jako pole teček.
3. **03 `s-zdroje`:** pruh 43 / 48 / 9, nevyzvednuté obědy, talíř špenátu 47 %, polévka.
4. **04 `s-mereni`:** kalendář s jediným týdnem ručního vážení, Brno 80 → 19 kg.
5. **05 `s-reseni`:** 3D sestava, jde otáčet myší, 3 kroky. Když WebGL nefunguje, ukáže se SVG.
6. **06 `s-jak`:** čtyři kroky jednoho talíře a pilulka „Živá ukázka prototypu“.
7. **06b `s-ukazka`:** demo z `http://localhost:8080` vložené přes celou plochu v iframu.
   - Klikr ovládá demo. Po 8. kroku demo pošle `konec` a deck jde dál.
   - Když server neběží, ukáže se návod. Do tisku jde náhled `../demo/screenshots/step-4.png`.
8. **07 `s-dostane`:** měření → analýza → opatření. Krok 3 je příklad 60 000 Kč s interaktivním posuvníkem 1–30 % (`js/s07.js`).
9. **08 `s-kdo`:** kdo z toho co má. Městská část je budoucí plátce.
10. **09 `s-konkurence`:** Winnow (IKEA Zličín), Orbisk, Leanpath, KITRO a náš zvýrazněný řádek.
11. **10 `s-pilot`:** pilot ve 3 jídelnách za 50 000 Kč, časová osa, rizika, koho zapojíme.
12. **11 `s-zaver`:** 8 891 jídelen, 1,6 milionu dětí, schody rozšíření, závěrečná věta a Děkujeme.

## Rozpracované (může být nedokončené)
**Filmové otevření slajdu 01** v souboru `model3d-src/src/uvod3d.js` → `js/uvod3d.js`, plus `slajdy/01-uvod.html`, `css/s01.css`, `js/s01.js`. Zadání:
- **Krok 0 se přehrává sám asi 12–14 s:**
  1. Tma, reflektor na jeden talíř s gulášem a knedlíky, kamera pomalu najíždí. Titulek „Tohle je jeden školní oběd.“
  2. Kamera odjede a odhalí jídelnu, asi 60 talířů na stolech. Titulek „Jídelna jich denně vydá stovky.“
  3. Zbytky ze třetiny talířů odletí do bílého kbelíku vepředu a počítadlo jede 0 → 31 %. Titulek „Téměř třetina uvařeného jídla skončí v koši.“
- **Krok 1:** prolnutí do světla. Vlevo „Dojedeno“, „Vážíme to vážně.“ a 31 %, vpravo `<div data-model3d="otocny">`.
- **Musí platit:**
  - spouštění při `vstup`, zastavení při `odchod`,
  - skok nebo tisk = rovnou konečný stav,
  - `prefers-reduced-motion` respektovat,
  - bez WebGL zůstane původní 2D SVG otevření (gastronádoba → kbelík).
- **Zkontrolovat:** `python3 build.py && ./shot.sh 1 0 && ./shot.sh 1 1`, plynulost v Chromu na MacBooku M1 a že konzole nehlásí chyby.

## Demo (`demo/`): co zbývá
- **Spuštění:** `cd demo && python3 tools/serve.py`, pak http://localhost:8080. README a PHONE.md popisují mobil přes Wi-Fi a režim Auto.
- **NUTNÉ: demo pořád používá stará čísla:** `pricePerKg: 37`, `co2Factor: 2.5`, `pilotReduction: 0.2`, měsíc 1 700 kg / 62 900 Kč / CO₂ a cíl ~120 000 Kč. Oprav podle `docs/codex-oprava-dat.md`:
  - 92,5 Kč za kg (37 Kč za oběd o 400 g),
  - talíř 150 g = 13,90 Kč,
  - den: talíře 34 kg, nevydané 30 kg ≈ 75 porcí, příprava 6 kg,
  - měsíc kolem 70 kg denně, bez CO₂,
  - nejhorší jídlo je špenát (47 %),
  - karty řešení: nevyzvednuté obědy 5–9 %, polévka pětina, Zachraň oběd / Praha 4, Brno,
  - souhrn „−10 % z talířů = 60 000 Kč ročně, příklad“.
  - Pak přegeneruj `data/month.json` (`python3 tools/generate_month.py`) a obnov `screenshots/`.
- **Úprava kvůli prezentaci, NEODSTRAŇOVAT** (v `demo/app.js`):
  - `next()` na kroku 8 uvnitř iframu pošle `parent.postMessage({dojedeno:'konec'},'*')`,
  - šipka zpět na kroku 1 pošle `{dojedeno:'zacatek'}`.
  - Záloha před úpravou je v `/tmp/app.js.bak`.

## Další nápady (nejsou nutné)
- 3D mapa jídelen (data z rejstříku škol MŠMT, data.msmt.cz dnes neodpovídal).
- Záložní slajdy pro otázky poroty (proč ne vlastní model, přesnost, soukromí a hygiena, cena AI, konkurence).
- Zkrátit poznámky slajdů 07–11 (jsou o pár sekund delší než vyhrazený čas).
- Natočit záložní video dema pro případ, že na místě selže Wi-Fi.
