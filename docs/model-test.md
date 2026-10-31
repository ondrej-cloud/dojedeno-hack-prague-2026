# Porovnání modelů na skutečné fotografii

Datum: 31. 10. 2026. Effort: medium. Stejná fotografie a stejný produkční prompt, referenční fáze, relativní režim. Fotografie obsahuje talíř s citrusem, dvěma většími kusy mrkve, ředkvičkou, zelenou částí a drobnými zbytky. Displej váhy není vidět. Fotografie ani lokální raw odpovědi nejsou součástí repozitáře.

| Model | Počet volání | Průměrná doba | Průměrná cena snímku |
|---|---:|---:|---:|
| `claude-opus-5-5` | 1 | 7.94 s | 0.033556 USD |
| `claude-sonnet-5-5` | 3 | 4.54 s | 0.016475 USD |
| `claude-haiku-5-5` | 3 | 4.89 s | 0.000975 USD |

Celková odhadovaná cena sedmi volání: 0.085905 USD. Každé volání mělo 6 004 vstupních tokenů; výstupní tokeny se lišily. Ceny jsou výpočtem z vráceného usage, nikoli potvrzením faktury. Sazby za milion vstupních/výstupních tokenů: Opus 4/20 USD, Sonnet 2/10 USD, Haiku 0,10/0,50 USD, dle [ceníku Anthropic](https://platform.claude.com/docs/en/about-claude/pricing) v den testu. Druhé porovnávací měření obsahuje dva snímky, proto tato cena není cenou celého průchodu demem.

## Výsledek a nastavení

Všech sedm odpovědí rozpoznalo talíř, citrus označený jako mandarinka, dvě mrkve a ředkvičku. Žádný model nevymyslel hmotnost ani údaj neviditelného displeje a nepřiřadil nesouvisející vařené jídlo z nápovědy menu. U zelené části se odpovědi lišily: modely nabízely pórek, jarní cibulku, okurku, lusk nebo list. Přesný druh této části není tímto testem ověřen; Opus není autoritativní správná odpověď. Haiku také přidávalo nejisté detaily o okousání a druhu drobků.

Pro levné hackathonové demo nastavujeme **Haiku 5.5 medium**. Na hlavních zřetelných složkách bylo konzistentní ve třech ze tří pokusů a stálo přibližně 34× méně než jediný pokus Opus. Sonnet byl v tomto malém vzorku v průměru trochu rychlejší než Haiku. Přesnou identifikaci všech položek neprokázal žádný model.

Tři opakování jedné fotky nejsou měřením obecné spolehlivosti. Není ověřeno čtení skutečné váhy, porovnání dvou skutečných porcí, horší světlo ani další jídla. Před ostrou ukázkou je potřeba ověřit sestavu s vaším talířem a čitelným displejem váhy. Přepnutí zpět je možné přes `ANTHROPIC_MODEL=claude-sonnet-5-5 python3 tools/serve.py` ze složky demo.

Placené opakování testu: `python3 demo/tools/benchmark_models.py /cesta/fotografie.jpg`. Výsledky se ukládají do ignorované složky `demo/.local/`.
