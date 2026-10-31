# Skutečné rozpoznání talíře přes Claude

Živá analýza posílá zachycené fotografie talířů a dnešní menu do **Anthropic přes internet**. Není offline. Den, měsíc a doporučení zůstávají ukázkovým datasetem. Výchozí režim `scale` čte celkovou hmotnost z displeje váhy a odhaduje hmotnostní podíly viditelných složek. Backend je přepočítá na označené odhady gramů se součtem odpovídajícím váze. Gramy složek nejsou samostatná měření; nízká jistota je označená jako velmi hrubý odhad. Režim `relative` nechává gramáž složek prázdnou. Volitelný režim `estimate` znamená pouze odhad gramů z fotografie, nikoli měření.

## Zapnutí

1. V [Claude Console](https://platform.claude.com/) si připravte API účet, dostupný kredit/fakturaci a vytvořte [API klíč](https://platform.claude.com/settings/keys). Aktuální požadavky a odkazy na fakturaci jsou v [oficiálním přehledu API](https://platform.claude.com/docs/en/api/overview).
2. V terminálu spusťte:

   ```sh
   cd ~/Documents/hack-prague-2026/demo
   python3 tools/set_api_key.py
   ```

   Klíč vložte do skrytého vstupu v terminálu. **Nevkládejte ho do chatu ani do config.json.** Uloží se do ignorované `.local/anthropic-api-key` s právy 600. Alternativně může být dostupný v prostředí serveru jako `ANTHROPIC_API_KEY`.
3. Spusťte `python3 tools/serve.py` a otevřete http://127.0.0.1:8080. Pro telefon použijte párovací odkaz a postup v [PHONE.md](PHONE.md). Již běžící server načítá klíč při každém požadavku, takže po jeho uložení není nutný restart.

Nastavení analýzy je v `config.json` pod `analysis`; `quantityMode` je nastavený na `scale`. Režim `relative` lze použít, pokud nechcete zobrazovat odhad rozdělení gramů. Název používaného modelu a stav dostupnosti klíče ukazuje lokální `/api/status`. Samotný stav „nastaveno“ ještě nepotvrzuje platnost klíče ani dostupný kredit; to ověří až první analýza.

## Přenos a opakování

Server dovolí vždy jedinou analýzu. Každý snímek má `requestId`; opakovaný požadavek se stejným ID i obsahem dostane uloženou odpověď bez nového volání API. Jiný obsah pod stejným ID se odmítne. Probíhající snímek vrací 409, jiný souběžný požadavek 429. Automatické opakování placených požadavků není zapnuté. Posledních 128 odpovědí se drží v paměti procesu; po restartu tato ochrana zanikne.

Po chybě zkontrolujte zprávu, připojení, klíč a kredit. Nové zachycení může vytvořit nový placený požadavek. Přesná cena závisí na modelu a počtu tokenů; žádný pevný odhad zde nepředpokládáme. Snímky pro přenos a odpovědi jsou v paměti, nikoli v souborech aplikace. Nakládání se zaslanými snímky na straně Anthropic se řídí podmínkami vašeho API účtu.

HTTP endpoint analýzy je dostupný pouze z lokálního dema na Macu. Telefon přes HTTPS odesílá kamerové snímky do Macu; nemá přímý přístup ke klíči ani k endpointu analýzy. Párovací token telefonu nyní přetrvá restart serveru při stejné IP adrese. Uchovávejte párovací odkaz v týmu.

## Váha v obrazu

Váhu před každým zachycením vytárujte s prázdným talířem. V obrazu musí být talíř i čitelný displej s jednotkou g nebo kg. Claude přečte údaj, server převede kg na gramy a nejasné čtení nahradí neznámou hodnotou. Rozhraní nikdy nezamění odhad gramů podle vzhledu za údaj váhy. Procento snědeného se počítá z první a druhé hmotnosti pouze pro srovnatelný pokrm, pokud zbytek nepřevyšuje první porci. To stále závisí na správném přečtení a tárování váhy.

Připravená jídla a 400/150 g se v živém režimu nepoužívají. Při selhání analýzy nebo nečitelném displeji pořiďte tlačítkem nový snímek. Automatické opakované placené volání není zapnuté. Režim `analysis.mode: "demo"` v config.json lze výslovně použít pro původní offline scénář.

Implementace používá [Vision](https://platform.claude.com/docs/en/build-with-claude/vision) a [strukturované JSON odpovědi](https://platform.claude.com/docs/en/build-with-claude/structured-outputs). Výchozí model pro demo je `claude-haiku-5-5` s `medium` effort; lze jej změnit proměnnou prostředí `ANTHROPIC_MODEL` při spuštění serveru podle [dostupných modelů](https://platform.claude.com/docs/en/models/overview). Volba vychází z [omezeného testu jedné fotografie](../docs/model-test.md), nikoli z ověření přesnosti na různých jídlech nebo displejích vah.

Úroveň effort lze změnit pomocí `ANTHROPIC_EFFORT`. Strop jedné odpovědi je 4 096 tokenů; skutečná spotřeba závisí na snímku a odpovědi.

Při nečitelném displeji se hodnoty nevymýšlejí. Tlačítko Nový snímek pořídí další fotografii; samovolné smyčky placených analýz neběží. Návrat na referenci používá uložený výsledek. Stejný požadavek obsahuje detail displeje ze zachyceného snímku pro lepší OCR. Jedna úspěšně přečtená fotografie neprokazuje spolehlivost OCR ve všech podmínkách.
