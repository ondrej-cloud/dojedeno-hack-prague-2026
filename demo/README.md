# Dojezeno

Offline scénář pro hackathonový pitch. Kamera skutečně detekuje stabilní objekt v obrazu. Výchozí živý režim posílá snímek do Claude API, které rozpozná jídlo a přečte displej váhy. Nastavení klíče a přesný postup: [AI-ANALYZA.md](AI-ANALYZA.md). Denní a měsíční souhrny zůstávají ukázková data. Živá analýza vyžaduje internet. Mobil posílá snímky přes místní Wi-Fi na Mac; poslední snímek je pouze v paměti serveru a prohlížeče.

## Spuštění

```sh
cd ~/Documents/hack-prague-2026/demo
python3 tools/serve.py
```

V Chrome otevřete http://localhost:8080 a zapněte celou obrazovku (na Macu Control–Command–F). Server zastavíte Ctrl+C. Bez buildu a bez instalace knihoven; při prvním připojení telefonu je potřeba nastavit důvěru certifikátu. Pro mobilní přenos je potřeba také místní příkaz OpenSSL. Doporučený projektor 1920 × 1080; plátno 16:9 se automaticky přizpůsobí také 1280 × 720.

## Automatické demo s mobilem

1. Telefon a Mac připojte ke stejné Wi-Fi. Na počítači otevřete demo a klikněte dole na **Mobil**. Odkaz otevřete na telefonu. Pro první nastavení HTTPS certifikátu postupujte podle [PHONE.md](PHONE.md).
2. Na telefonu zapněte zadní kameru. Telefon upevněte nad stanoviště a nechte obraz prázdný. Po dvou sekundách klidu se objeví „Připraveno“.
3. Vložte první talíř doprostřed obrazu a nechte jej asi sekundu v klidu. Spustí se snímek a živá odpověď Claude. Váhu předem vytárujte s prázdným talířem a nechte čitelný displej v záběru. Talíř odeberte; po zobrazení výsledku se demo samo připraví na druhý.
4. Vložte druhý talíř se zbytky. Automaticky se pořídí snímek, přečte váha a spočítá snědený podíl ze skutečných přečtených hodnot.
5. K dennímu a měsíčnímu přehledu pokračujte šipkou nebo klikrem; grafy se samy nepřepínají.

Detektor porovnává centrálních 70 % obrazu s prázdným pozadím. Obrys se odhaduje samostatně z celého obrazu: největší souvislá oblast změny určuje polohu a velikost zeleného kruhu. Obrys zohledňuje ořez obrazu na panel kamery a po pořízení snímku se zmrazí spolu s fotografií. Bez spolehlivě zachycené oblasti se žádné náhradní kolečko uprostřed nekreslí. Průměr kruhu vychází z většího rozměru zachycené oblasti; ruka dotýkající se talíře nebo slabý kontrast mohou obrys zkreslit. Neurčuje, zda jde významově o talíř: stabilní větší ruka či jiný předmět jej také mohou spustit. Použijte pevný držák, kontrastní podložku a po vložení talíře stáhněte ruku. Při kalibraci musí být stanoviště prázdné. Po posunutí kamery stiskněte B. Statické ukázkové fotografie nic automaticky nespouštějí.

**A / tlačítko Auto** vypíná automatiku nebo znovu spouští demo s kalibrací. **B** kalibruje prázdné místo a vrací na začátek. **R / skok na 1** restartuje demo. Ostatní ruční skoky a šipky přepínají do ručního režimu, aby se automatika nepřetahovala s prezentujícím. Výpadek přenosu nezapočítává zmrazený snímek jako nový talíř.

Výchozí `camera.source` je `mobile`. Pro kameru přímo připojenou k počítači změňte na `local`; pak funguje i původní jednoduchý `python3 -m http.server 8080`. Nastavení detektoru je v `config.json` pod `detection`.

## Ovládání

| Klávesa | Akce |
|---|---|
| → / mezerník / PageDown | Další krok |
| ← / PageUp | Předchozí krok |
| 1–8 | Přímý skok |
| R | Zpět na začátek |
| C | Kamera / statická fotka |
| H nebo tlačítko ? | Nápověda |

Dole jsou také tlačítka zpět a vpřed. Krok 3 má dvě fáze: nejprve se vrátí živá kamera a prezentující vymění talíř. Další stisk spustí snímek a vážení; až následující stisk přejde na krok 4. Skok na 3 vždy začne přípravou. Skok přímo na 4 rovnou vykreslí výsledek. R resetuje scénář a zachová zvolený zdroj obrazu. Zpět a skoky ruší účinek všech předchozích animačních časovačů. Projděte scénář před vystoupením; během rozpoznávání vyčkejte zhruba dvě sekundy.

V režimu `local` se kamera ptá na oprávnění při otevření. Nejprve otevře výchozí zařízení, poté hledá název obsahující `camera.labelContains` (bez ohledu na velikost písmen). Není-li preferovaná kamera k dispozici, zůstane výchozí. Odmítnutí oprávnění automaticky použije fotografie. C kameru vypne včetně streamu; dalším C ji zkusíte znovu. Nevyřešené oprávnění neblokuje prezentaci.

## Obsah

- `config.json`: škola, datum, menu, vzor a zbytek, cena/kg, kamera, denní souhrn, žákovská obrazovka a samostatný příklad roční úspory.
- `assets/plate-full.jpg` a `assets/plate-leftover.jpg`: neutrální ilustrace. Nahraďte vlastními fotkami se stejnými názvy; ideálně 1600 × 1000. Stránku poté obnovte. Fotografie se ořízne na panel kamery.
- `data/month.json`: 20 deterministicky vygenerovaných ukázkových dní. Každý den obsahuje hlavní jídla, polévku a doplněk, rozpad původu odpadu, vydané hmotnosti a části jídla.
- `tools/generate_month.py`: generátor, standardní Python bez závislostí. Spusťte `python3 tools/generate_month.py` po změně receptů, poměrů nebo seedu.
- `screenshots/`: snímky všech osmi kroků.

Měsíc má přesně 1 400 kg (48 % talíře, 43 % nevydané, 9 % příprava), tedy průměrně 70 kg denně. Ze zbytků na talířích je 672 kg, při modelové ceně surovin 92,5 Kč/kg je to 62 160 Kč. Cena odpovídá 37 Kč za oběd o 400 g; jde o jednotný orientační přepočet, ne receptové kalkulace. Nevydaných 602 kg odpovídá 1 505 standardním porcím po 400 g. Jde o ekvivalent porcí, ne skutečný počet talířů. Denní ukázka má 34 kg z talířů (3 145 Kč), 30 kg nevydaného (75 referenčních porcí), 6 kg přípravy a celkem 70 kg. Nevydané jídlo ani přípravu finančně nesčítáme s talíři.

Částka za jednotlivý talíř se zaokrouhluje na desetihaléře: 150 g × 92,5 Kč/kg = 13,875 Kč, zobrazeno 13,90 Kč. Měsíční i denní souhrny se počítají z celé příslušné hmotnosti. Emisní přepočty se nepoužívají. Složky z talířů jsou 44 % příloha, 20 % maso, 19 % omáčka, 13 % polévka a 4 % doplněk. Dataset je syntetický a není měřením školy v Hejčíně.

U hlavních jídel se počet vydaných porcí `servings` sčítá přesně na denní počet obědů `lunches`. Skutečná průměrná hmotnost vydané porce je `servedPortionKg = servedKg / servings`; zahrnuje různé velikosti porcí žáků. Samostatné `portionKg` označuje standardní referenční porci pro přepočet **nevydaného** jídla (400 g u hlavního jídla, 200 g u polévky), nikoli průměrnou porci každého žáka.

Pořadí jídel se řadí podle podílu vrácené a vydané hmotnosti: špenát 47 %, koprovka 43 %. Uvedené kilogramy v žebříčku patří jen zbytkům z talířů. Doporučení pro rizoto vychází z průměrných 38 nevydaných referenčních porcí a scénářového snížení na 3, tedy vařit o 35 porcí méně. Podíl příloh se počítá z měsíčních dat. Ostatní doporučení navazují na podklady prezentace (5–9 % nevyzvednutých obědů, polévku jí pětina žáků, Zachraň oběd, Brno 80 → 19 kg); nejsou výsledkem našeho pilotu. Karty neslibují individuální úspory ani je nesčítají.

Roční příklad je samostatný: 600 000 Kč za suroviny ve zbytcích na talířích u školy s 500 žáky × 10 % = 60 000 Kč. Není extrapolací ukázkového měsíce ani dosaženým výsledkem nebo slibem. Žákovská obrazovka je samostatný ukázkový den se zlepšením (82 %), nikoli tentýž den jako 38 % v denním přehledu.

Hmotnost plné porce i zbytku a snědené procento se odvozují ze složek `plate` v configu. U denního přehledu musí součet `day.dishes[].kg` souhlasit se součtem tří původů odpadu. Po úpravě konfigurace obnovte stránku.

## Ověření

Ověřeno v headless Google Chrome přes Playwright: všech osm kroků a návrat zpět, číselné skoky, klikr, reset během rozpoznávání, nápověda, součty dat, rozlišení 1920 × 1080 a 1280 × 720, odmítnuté oprávnění i simulovaná kamera včetně zmrazení při přímém skoku. Bez chyb konzole a bez externích požadavků aplikace. Fyzickou kameru / iPhone je potřeba vyzkoušet na místě.

Opakování automatické kontroly (volitelný vývojářský nástroj, není potřeba pro běh dema): při spuštěném lokálním serveru a dostupném balíčku Playwright spusťte `node tools/verify.cjs`. Pokud Playwright není v běžné cestě Node, nastavte `PLAYWRIGHT_MODULE` na jeho lokální adresář. Test používá Chrome v `/Applications/Google Chrome.app` a přepíše screenshoty. Neinstaluje závislosti ani nic nestahuje.

Automatiku ověřují `node tools/test_presence.cjs` (detekce), `node tools/verify_auto.cjs` (syntetická kamera) a `node tools/verify_phone.cjs` (celý přenos přes HTTPS mezi dvěma prohlížeči). Browser testy vyžadují lokální Playwright stejně jako výše. Ověření fyzického telefonu, důvěry HTTPS certifikátu a světla na pódiu je nutné udělat na místě.
