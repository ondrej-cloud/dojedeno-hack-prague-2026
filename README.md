# Dojedeno · Vážíme to vážně

Prototyp pro Hack Prague 2026: měření zbytků jídla ve školních jídelnách pomocí kamery, váhy a AI. Repozitář obsahuje prezentační deck, demo a projektové podklady.

## Spuštění dema

Vyžaduje Python 3.9+, OpenSSL a moderní prohlížeč. Webové rozhraní nevyžaduje build ani instalaci JavaScriptových knihoven.

```sh
cd demo
python3 tools/set_api_key.py
python3 tools/serve.py
```

Na počítači otevřete http://localhost:8080. V prezentaci klikněte na **Mobil** a připojte telefon podle [návodu](demo/PHONE.md). Telefon a počítač musí být ve stejné místní síti; pro kameru telefonu je potřeba důvěryhodné HTTPS. Klíč Claude, certifikáty a párovací tokeny jsou pouze v ignorovaném `demo/.local/` a do repozitáře nepatří.

Po vložení talíře aplikace odešle snímek do Claude API, rozpozná jídlo a přečte čitelný displej váhy. Váhu před každým měřením vytárujte s prázdným talířem. Druhý snímek porovná s referenční porcí. **Hmotnost se neodhaduje ze vzhledu jídla.** Živá analýza vyžaduje API kredit a internet; API chyby nenahrazuje připravenými výsledky.

Podrobnosti: [ovládání a implementace](demo/README.md), [Claude API](demo/CLAUDE.md).

## Prezentace

Otevřete `prezentace/index.html` v Chromu. První šipka doprava nebo mezerník spustí úvodní film; po dohrání sám přejde na titul s 3D modelem. Návrat šipkami úplně na začátek film zastaví a přetočí. Další šipka doprava ho znovu spustí; během přehrávání jej další stisk přeskočí. Mezerník/klikr posouvá, šipka vlevo vrací, F zapíná celou obrazovku, N poznámky a stopky. Lokální vložené demo vyžaduje server na localhost:8080. Samostatné slajdy běží i offline. Hlavní pitch má 12 slajdů, za závěrem je 7 záložních slajdů pro otázky. Klávesa Q otevře zálohu, End vrátí hlavní závěr; běžná šipka ze závěru do zálohy nepokračuje.

```sh
cd prezentace
python3 build.py
```

`index.html` je sestavený soubor; upravujte `slajdy/`, `css/`, `js/` a `index.template.html`. Zdrojové 3D scény jsou v `model3d-src/src/`, sestavené bundly už jsou součástí repozitáře. K jejich změně je potřeba nainstalovat závislosti z `model3d-src/package-lock.json` a postupovat podle [předávky](docs/HANDOFF-codex.md).

## Netlify Drop

Projekt [dojezeno.netlify.app](https://dojezeno.netlify.app) je propojený s GitHub repozitářem `ondrej-cloud/dojedeno-hack-prague-2026`, produkční větev `main`. Soubor `netlify.toml` nastavuje build příkaz a publikování pouze složky `netlify-drop`. Po pushi Netlify sestaví prezentaci, frontend dema a one-pager. K samotnému sestavení není potřeba API klíč ani proměnné prostředí.

```sh
python3 prezentace/build.py
python3 tools/export_netlify.py
```

Do Netlify Drop přetáhněte celou složku `netlify-drop`; připravený je také `netlify-drop.zip` se souborem `index.html` přímo v kořeni. Balíček obsahuje prezentaci, demo a one-pager; ruční Drop nevyžaduje další build. Veřejný návštěvník uvidí ukázkový režim. Chráněný živý režim propojí mobilní kameru s backendem na Macu přes HTTPS tunel. API klíče, certifikáty a serverové soubory se neexportují. Export samotný nic nepublikuje.

Pro otevření připojené prezentace použijte z kořene projektu:

```sh
python3 tools/open_live_demo.py
```

V demu klikněte **Mobil** a naskenujte QR telefonem. Telefon a počítač mohou být na různých sítích. **Mac se serverem, bránou a tunelem musí zůstat zapnutý a online.** Skript otevře přístupový odkaz; sám služby nespouští. Postup včetně restartu je v [LIVE-NETLIFY.md](demo/LIVE-NETLIFY.md). Denní a měsíční data zůstávají ukázková i při živé analýze talíře.

## Pilot a podklady

První pilot navrhujeme v naší škole v Hejčíně v Olomouci (Olomoucký kraj): šest týdnů po souhlasu školy, instalaci a ověření měření. Dva týdny měření výchozího stavu, dva týdny první změna a dva týdny ověření nebo druhá varianta; nejvýše dvě iterace opatření. Rozpočet **16 000 Kč** je pracovní odhad pro jednu jídelnu, včetně vybavení, vymezené práce týmu a rezervy. Není to cenová nabídka ani schválené financování.

Hlavní návrh používá **jeden pás, fotografii talíře před vysypáním a jeden vážený kbelík**. Pořadí lze použít jen při zachování pořadí vysypávání. Souběhy a nejistoty zůstávají společnou dávkou. Hejčín má podle zadání tři patra pásu; možnost vymezit jeden sledovaný tok ještě potřebuje ověření. Třípásová varianta je v záloze. Živé demo rozpoznává talíř a čte displej váhy; produkční párování s kbelíkem zatím nepředvádí.

Hlavní KPI jsou gramy vráceného potravinového gastroodpadu na skutečně vydaný oběd ve stejné sledované části provozu. Návrhový cíl −10 % není dosažený výsledek. Nevydané pokrmy sledujeme odděleně včetně dalšího využití; nemusí všechny skončit jako odpad. Finanční přínos je vedlejší a musí se prokázat zvlášť: 60 000 Kč je modelová hodnota 10 % z odhadovaných surovin ve zbytcích, nikoli automatická úspora nákupů.

- [Obsah, časování, metodika a zdroje](prezentace/OBSAH.md)
- [One-pager v PDF](materialy/onepager/dojedeno-onepager.pdf), [HTML pro tisk](materialy/onepager/index.html)
- [Prezentace online](https://dojezeno.netlify.app), [one-pager online](https://dojezeno.netlify.app/onepager/dojedeno-onepager.pdf)

Dosud není potvrzen souhlas školy, přesný termín, jednopásové místo ani dodavatelské ceny. Podporu Hack Prague mimo Prahu musí potvrdit organizátoři. Kokoza a Zachraň jídlo jsou organizace, které chceme oslovit. Chybí skutečná citace člověka z jídelny a úplná obsahová šablona organizátorů; netvrdíme úplnou shodu se šablonou ani hotovou produkční instalaci.

Denní a měsíční přehledy dema jsou **ukázková data**: 92,5 Kč/kg, ukázkový den 70 kg, bez emisních přepočtů. Zadání těchto oprav je v [codex-oprava-dat.md](docs/codex-oprava-dat.md).

## Testy

```sh
python3 demo/tools/test_demo_data.py
python3 demo/tools/test_claude_client.py
python3 demo/tools/test_claude_server.py
python3 demo/tools/test_live_gateway.py
node demo/tools/test_presence.cjs
```

Browser testy `demo/tools/verify_*.cjs` používají lokální Chrome na macOS a Playwright (balíček lze zadat proměnnou `PLAYWRIGHT_MODULE`). Testy Claude používají náhradní odpovědi, neúčtují API požadavky. **`benchmark_models.py` naopak výslovně volá placené API** nad dodanou fotografií.
