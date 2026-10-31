# Telefon jako kamera přes místní Wi-Fi

Na Macu zastavte původní `http.server` a ze složky `demo` spusťte:

```sh
python3 tools/serve.py
```

Vyžaduje Python 3.9+ a příkaz `openssl` s podporou `req -addext`. Žádné balíčky se neinstalují. Server vypíše adresu dema a párovací HTTPS odkaz telefonu. Telefon i Mac musí být ve stejné Wi-Fi bez izolace klientů. Pokud se zvolila špatná síťová adresa, použijte `python3 tools/serve.py --ip 192.168.1.123` s adresou Wi-Fi Macu. Firewall musí povolit příchozí připojení Pythonu na TCP 8443.

Na Macu otevřete http://127.0.0.1:8080. Na telefonu otevřete celý vypsaný odkaz včetně `#token=…`, povolte kameru a stiskněte **Zapnout zadní kameru**. Přenos je přibližně 3 snímky/s, obrázky mají delší stranu nejvýše 1280 px. Nejde o zvuk ani vzdálenou AI. Telefon nezamykejte a stránku ponechte v popředí. Po opuštění stránky je třeba přenos znovu zapnout.

## Důvěra HTTPS certifikátu

Server vytváří vlastní třicetidenní certifikát pro IP adresu Macu. Prohlížeč mu automaticky nevěří. Přeskočení bezpečnostního varování může umožnit otevření stránky, ale **nezaručuje přístup ke kameře**, zejména v Safari na iOS.

Pro spolehlivý provoz je potřeba certifikát, kterému telefon skutečně důvěřuje. Na iOS lze vlastní certifikát předat telefonu lokálně například AirDropem (`demo/.local/Dojedeno-camera.cer`, veřejný certifikát připravený serverem), nainstalovat profil v Nastavení → Obecné → VPN a správa zařízení a následně, pokud jej iOS nabízí, zapnout plnou důvěru v Nastavení → Obecné → Informace → Důvěra certifikátům. Dostupnost těchto položek závisí na verzi iOS a správě zařízení; některé profily vlastní certifikát nepřijmou. V takovém případě použijte certifikát od vlastní důvěryhodné lokální CA nebo zvolte USB/Kameru v Kontinuitě. Samotné přijetí webového varování nepovažujte za hotové nastavení. Po skončení demo certifikát i profil odeberte.

Privátní klíč `key.pem` nikdy nepřenášejte ani nesdílejte. Certifikát a klíč se zachovávají při stejné IP adrese a alespoň jednodenní zbývající platnosti. Změna IP adresy nebo konec platnosti vytvoří nový certifikát; pak je nutné obnovit důvěru na telefonu. Před pitchem tento postup vyzkoušejte na konkrétním telefonu. HTTPS je zde pouze v místní síti; nic se nepublikuje na internet.

## API a data

- Lokální HTTP `GET /api/status`: `{phoneUrl, connected, lastFrameAgeMs}`. Připojeno znamená snímek mladší než tři sekundy.
- Lokální HTTP `GET /api/frame`: nejnovější JPEG, nebo 204 před prvním snímkem či při stáří nad 1,5 sekundy. Hlavička `X-Frame-Id` obsahuje pořadové číslo, které se zvyšuje po každém uploadu; desktop podle něj vynechává opakované čtení téhož snímku.
- HTTPS `POST /api/frame?token=…`: tělo JPEG do 1 MiB, při úspěchu 204. Token se ověřuje s konstantní dobou porovnání. HTTP POST se odmítá.

Pouze nejnovější snímek je v RAM, neukládá se na disk a nový jej nahrazuje. HTTPS neposkytuje desktopové API, projektové soubory, skryté adresáře ani výpisy adresářů. Párovací odkaz je tajný přístupový kód; nesdílejte jej mimo tým. Při restartu na stejné IP adrese zůstává odkaz platný. Server ukončíte Ctrl+C.

Postup ručního povolení důvěry SSL popisuje také [Apple Support](https://support.apple.com/en-gb/102390).

Pro čtení displeje váhy ponechte v záběru talíř i celý displej s jednotkou. Telefon přenáší vyšší rozlišení kvůli čitelnosti číslic. Nezakrývejte displej rukou; před každou porcí vytárujte prázdný talíř.
