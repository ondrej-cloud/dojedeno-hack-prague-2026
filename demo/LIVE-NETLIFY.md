# Živé demo z Netlify

Web `https://dojezeno.netlify.app` nabízí ukázkový režim návštěvníkům a chráněný živý režim prezentujícímu. Denní a měsíční přehledy jsou vždy ukázková data. Živá analýza prvních kroků dál rozpoznává talíř a čte displej váhy; nesimuluje produkční párování pásu s kbelíkem.

## Použití

Na Macu musí běžet místní server, brána a Cloudflare tunel. Z kořene projektu otevřete připojenou prezentaci:

```sh
python3 tools/open_live_demo.py
```

Pro samotné demo použijte `python3 tools/open_live_demo.py --demo`. Přístupový odkaz se otevře přímo v Chromu; kód se nevypisuje do terminálu. V demu klikněte **Mobil**, naskenujte QR na telefonu, povolte kameru a klepněte na **Zapnout zadní kameru**. Obě zařízení potřebují internet, nemusí být na stejné Wi-Fi. Důvěřování místnímu certifikátu v telefonu není v tomto režimu potřeba.

Telefon nechte odemčený a stránku v popředí. Po kalibraci prázdného místa vložte první talíř s viditelným displejem vytárované váhy; po analýze jej odeberte a vložte druhý talíř se zbytky. Po návratu z pozadí může být potřeba kameru spustit znovu. Tlačítko **Odpojit živé demo** na počítači odstraní přístup z relace prohlížeče.

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
