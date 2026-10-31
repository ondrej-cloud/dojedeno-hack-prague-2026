# Živé demo z Netlify

Web `https://dojezeno.netlify.app` nabízí ukázkový režim návštěvníkům a chráněný živý režim prezentujícímu. Denní a měsíční přehledy jsou vždy ukázková data. Živá analýza prvních kroků rozpoznává talíř, čte displej váhy a odhaduje rozdělení celkové hmotnosti mezi složky; nesimuluje produkční párování pásu s kbelíkem.

## Použití

Na Macu musí běžet místní server, brána a Cloudflare tunel. Z kořene projektu otevřete připojenou prezentaci:

```sh
python3 tools/open_live_demo.py
```

Pro samotné demo použijte `python3 tools/open_live_demo.py --demo`. Přístupový odkaz se otevře přímo v Chromu; kód se nevypisuje do terminálu. V demu klikněte **Mobil**, naskenujte QR na telefonu, povolte kameru a klepněte na **Zapnout zadní kameru**. Obě zařízení potřebují internet, nemusí být na stejné Wi-Fi. Důvěřování místnímu certifikátu v telefonu není v tomto režimu potřeba.

Telefon nechte odemčený a stránku v popředí. Po kalibraci prázdného místa vložte první talíř s viditelným displejem vytárované váhy; po analýze jej odeberte a vložte druhý talíř se zbytky. Pokud je talíř v záběru už při zapnutí, použijte **Vyfotit teď**. Nečitelnou váhu lze opakovat přes **Nový snímek**; mezi fotkami se nespouští placená analýza sama opakovaně. **R** začne nové měření a zachová kalibraci, **B** znovu nastaví prázdné místo. Krátký výpadek spojení se obnoví automaticky. Po návratu z pozadí může být potřeba kameru spustit znovu. Tlačítko **Odpojit živé demo** na počítači odstraní přístup z relace prohlížeče.

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

Push do `main` spustí Netlify build. Export obsahuje pouze povolené soubory frontendu, nikdy `.local`, backend či API klíč. Token telefonu umožňuje pouze posílání snímků; přístup k obrazu a placené analýze vyžaduje samostatný token prezentujícího. QR kód se generuje v prohlížeči bez externí služby.

## Hmotnost složek

Velké číslo je odečet displeje váhy. Hodnoty u složek s označením ≈ jsou odhady AI podle fotky, normalizované na tento celkový odečet; jednotlivé složky se samostatně neváží. Pokud AI označí rozdělení jako málo jisté, zobrazí se „Velmi hrubý odhad“; neurčitelné složky se násilím nerozdělují. Při nečitelném displeji nebo neúplném či nerozlišitelném rozdělení se gramy složek nezobrazí. Neznámý název pokrmu sám o sobě nezablokuje čitelnou váhu. Ke stejnému API požadavku se přidává výřez spodní části zachycené fotografie pro OCR, nikoli druhý snímek z jiného okamžiku.

Přenos posílá nejnovější JPEG maximálně osmkrát za sekundu, bez fronty starých snímků. Skutečná plynulost závisí na připojení. Během analýzy zůstává zachycený snímek velký a živý obraz běží v malém náhledu.
