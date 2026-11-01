# Živé demo z Netlify

Demo vložené v prezentaci začíná v režimu **Ukázková data**, který lze celý proklikat bez mobilu a bez API. Samostatné demo bez připojeného mobilu také zobrazí ukázku. Tlačítko **Živé měření** přepne na kameru bez přístupového kódu, **Ukázková data** přepne zpět. Tlačítko **Mobil** otevře živý režim rovnou s QR. Denní a měsíční přehledy jsou vždy ukázková data. Živá analýza prvních kroků rozpoznává talíř, čte displej váhy a odhaduje rozdělení celkové hmotnosti mezi složky; nesimuluje produkční párování pásu s kbelíkem.

## Použití

Na Macu musí běžet místní server, brána a Cloudflare tunel. Z kořene projektu otevřete připojenou prezentaci:

```sh
python3 tools/open_live_demo.py
```

Pro samotné demo použijte `python3 tools/open_live_demo.py --demo`. Běžný odkaz se otevře přímo v Chromu; žádný kód se nezadává. V demu klikněte **Mobil**, naskenujte QR na telefonu, povolte kameru a klepněte na **Zapnout zadní kameru**. Obě zařízení potřebují internet, nemusí být na stejné Wi-Fi. Důvěřování místnímu certifikátu v telefonu není v tomto režimu potřeba.

Telefon nechte odemčený a stránku v popředí. Po kalibraci prázdného místa vložte první talíř s viditelným displejem váhy (jídlo i talíř dohromady); po analýze jej odeberte a vložte druhý talíř se zbytky. Automatika po detekci čeká nejméně 3 sekundy a vyžaduje 2 sekundy klidného obrazu; sleduje i malé lokální změny číslic displeje. Pohyb, odebrání talíře nebo výpadek snímků čekání obnoví. Talíř položte a dejte ruce pryč; jde o kontrolu obrazu, nikoli přímý signál ustálení z váhy. Pokud je talíř v záběru už při zapnutí, použijte **Vyfotit teď** (ruční snímek nečeká). Demo odečítá 216 g za talíř; pokud je váha již vytárovaná, vypněte odečet nahoře v nastavení. Nečitelný údaj můžete ručně potvrdit nebo vyfotit znovu přes **Nový snímek**; mezi fotkami se nespouští placená analýza sama opakovaně. **R** začne nové měření a zachová kalibraci, **B** znovu nastaví prázdné místo. Krátký výpadek spojení se obnoví automaticky. Po návratu z pozadí může být potřeba kameru spustit znovu. Tlačítko **Obnovit připojení** načte demo znovu.

## Provozní závislosti

Jde o hackathonové propojení: Netlify hostuje frontend, požadavky vedou přes veřejné HTTPS Cloudflare tunelu k bráně na Macu. Mac musí zůstat zapnutý, neuspaný a online. API klíč zůstává v `demo/.local/anthropic-api-key`; vybrané snímky odešle k analýze existující server do Claude API. Přenos telefonních snímků prochází internetem; není pouze lokální. Brána ani lokální přijímač neskládají archiv videa.

Pro samostatný trvalý provoz bez Macu je potřeba přesunout backend na hosting. Quick Tunnel nemá garantovanou dostupnost a při novém spuštění přidělí jinou adresu. Oficiální podklady: https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/

## Spuštění po vypnutí

Ve třech terminálech z kořene projektu:

```sh
python3 demo/tools/serve.py
python3 demo/tools/live_gateway.py
cloudflared tunnel --url http://127.0.0.1:8081 --no-autoupdate
```

Při již běžících procesech je podruhé nespouštějte. Novou veřejnou adresu `https://….trycloudflare.com` nastavte do `tools/live_backend.json` pod klíč `backendUrl` a nasaďte aktualizovaný export. Tento soubor neobsahuje hesla. Restart samotného lokálního serveru či změna Wi-Fi nemusí vyžadovat nový tunel; existující tunel se snaží připojení obnovit.

```sh
python3 prezentace/build.py
python3 tools/export_netlify.py
```

Push do `main` spustí Netlify build. Export obsahuje pouze povolené soubory frontendu, nikdy `.local`, backend či API klíč. Nastavení `publicAccess: true` v `tools/live_backend.json` umožňuje použití dema, obrazu a analýzy bez přihlášení; API klíč Claude zůstává pouze na Macu. QR kód se generuje v prohlížeči bez externí služby.

## Hmotnost složek

Velké číslo je hmotnost jídla po odečtení talíře (výchozí 216 g). Pod ním je přehledný výpočet displej − talíř = jídlo. Hodnoty u složek s označením ≈ jsou odhady AI podle fotky, normalizované na tuto čistou hmotnost; jednotlivé složky se samostatně neváží. Pokud AI označí rozdělení jako málo jisté, zobrazí se „Velmi hrubý odhad“; neurčitelné složky se násilím nerozdělují. Nejistý číselný odečet je označený ≈. Pokud ani jeden doplňující OCR pokus nevrátí číslo, zadáte údaj z displeje ručně bez nového API volání. Bez hmotnosti nebo při neúplném rozdělení se gramy složek nezobrazí. Neznámý název pokrmu sám o sobě nezablokuje čitelnou váhu. Ke stejnému API požadavku se přidává výřez spodní části zachycené fotografie pro OCR, nikoli druhý snímek z jiného okamžiku.

Přenos posílá nejnovější JPEG maximálně osmkrát za sekundu, bez fronty starých snímků. Skutečná plynulost závisí na připojení. Během analýzy zůstává zachycený snímek velký a živý obraz běží v malém náhledu.

Při nedostupném serveru nebo tunelu se i po volbě živého režimu automaticky otevře ukázka s viditelnou informací o výpadku. Šipky zůstanou funkční; po obnovení spojení zvolte **Živé měření** znovu.

Slajd „Ukázka: dva talíře“ vkládá pouze obraz kamery (`vlozeno=kamera`); výsledky vykresluje přímo prezentace. „Připojit mobil“ otevírá samostatnou stránku `pair.html` s QR, která nečte obraz ani nevolá analýzu. Při odchodu ze slajdu se automatické snímání pozastaví.
