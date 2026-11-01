# Zdroje čísel v prezentaci Dojezeno

Ověřeno 1. 11. 2026 přímo ve zdrojích. Na webu je přehled ve slajdu `prezentace/slajdy/87-zdroje-cisel.html`, hned za závěrem v příloze.

Typy čísel:
- **převzato:** stojí ve zdroji
- **výpočet:** náš výpočet z převzatých čísel
- **ukázka:** vymyšlená data dema, ne měření
- **plán:** náš návrh

## Převzatá čísla

| Číslo | Slajd | Typ | Zdroj a přesné místo |
|---|---|---|---|
| 31 % uvařeného jídla skončí v koši | 1 | převzato | TZ Prague Food Waste: „odpad z talířů žáků a nevydané pokrmy … tvoří dohromady 31 % z hmotnosti uvařených pokrmů“. S odpadem z přípravy je to 33,8 %. |
| 48 % odpadu jsou zbytky z talířů | 3 | převzato | TZ: „skoro polovina na talířích žáků (48 % potravinového odpadu), 43 % tvoří nevydané pokrmy ve výdeji a 9 % jsou zbytky z přípravy“ |
| 600 000 Kč ročně jen z talířů (škola s 500 žáky) | 2 | převzato | TZ: „ve škole o 500 žácích děti na talířích vyhodí jídlo v hodnotě asi 600 000 Kč za rok“. Totéž MENDELU s. 9 a 12, Blesk, Echo24. |
| 1 200 Kč na žáka | poznámky | převzato | MENDELU s. 9: „Hodnota zbytků z talířů za školní rok je asi 1200 Kč na žáka.“ Totéž Blesk. |
| 36–38 Kč za suroviny na oběd | výpočet Kč/kg | převzato | TZ a MENDELU s. 12: „pohybovala mezi 36 a 38 Kč za oběd“ |
| 8 891 jídelen, 1,6 milionu dětí | 2, 12 | převzato | MENDELU s. 5: „8 891 školních jídelen, výdejen a vývařoven, které denně připravují jídlo pro 1,6 milionu dětí, žáků a studentů“ |
| Brno: 80 kg → 19 kg | 7 | převzato | MENDELU s. 19: „čočka nakyselo, kdy ji běžně bývá až 80 kg odpadu. Když ale v tento den děti měřily a vážily odpad, zbytků zůstalo pouze 19 kg.“ |
| Špenát: v průměru zbylo 190 g | 5 (výpočet 47 %) | převzato | Echo24: „tohoto jídla nechali v průměru 190 gramů“ |
| Porce asi 400 g | 5 (výpočet 47 %) | převzato | Blesk: „Průměrná porce jídla se pohybuje kolem hmotnosti 400g.“ |
| Polévku jí asi pětina žáků | poznámky, příloha | převzato | Blesk: „přibližně jen jedna pětina“. MENDELU s. 10: „pouze 20 % dotazovaných si k obědu vzalo polévku“. |
| 5–9 % žáků si nevyzvedne zaplacený oběd | poznámky, příloha | převzato | TZ: „5–9 % žáků si oběd nevyzvedne, přestože jim ho rodiče zaplatili“. **Pozor:** MENDELU s. 9 uvádí 8–10 %. |
| IKEA −50 % | 8, 12 | převzato | IKEA ČR, 29. 9. 2022: snížila plýtvání „o více než polovinu“, 54 % do konce roku 2021, s Winnow Vision AI. Zličín je až v reportáži Ekonews z 10. 12. 2022 (kuchyňský odpad −50 % v restauracích IKEA). |
| Winnow: kamera nad košem a váha | 8 | převzato | Winnow Vision: kamera nad košem, váha, AI; partner IKEA |
| Orbisk (NL): kamera a váha | 8 | převzato | FoodInspiration: „a weighing scale underneath and a camera on top … every time something is disposed of, a picture is automatically taken“ |
| Leanpath (USA): váha a tablet, Sodexo | 8 | převzato | Sodexo: „WasteWatch powered by Leanpath“ na 3 000 místech. Stanice Leanpath mají váhu a dotykovou obrazovku. |
| KITRO (CH): váha pod kbelíkem, kamera shora, hotelové školy | 8 | převzato | kitro.ch: „The bin sits on the scale and the camera looks down into it.“ Zákazníci EHL Lausanne, SHL Luzern. |

## Naše výpočty

| Číslo | Slajd | Jak |
|---|---|---|
| 47 % porce špenátu | 5 | 190 g z 400 g (Echo24 a Blesk) = 47,5 % |
| 180 000 Kč | 6 | 30 % z 600 000 Kč, příklad. **V `OBSAH.md` je jako příklad 10 % = 60 000 Kč.** |
| 92,5 Kč/kg, 3 145 Kč, 62 160 Kč | 5 | 37 Kč za oběd / 0,4 kg porce, krát kg z ukázkových dat |

## Ukázková data a náš plán

| Číslo | Slajd | Co to je |
|---|---|---|
| 150 g (ukázkový talíř s knedlíkem) | 3, 6 | Ilustrační příklad |
| 152 g zbytků (talíř 1), 1 g (talíř 2) | 5 | **Náš záznam** z 1. 11. 2026: váha 352 g a 201 g, talíř 200 g. Natočeno ve Spaces (Hack Prague), ne v naší jídelně. Složky (jablko ≈ 84 g, mrkev ≈ 42 g, croissant ≈ 26 g) jsou podle analýzy Claude Opus 5.5, kterou tým ručně doladil (model navrhl 69 / 50 / 33 g) (`prezentace/assets/analyza-opus.json`). |
| Přehled pro jídelnu: 672 kg za měsíc, 38 % dojedených talířů, 82 g na strávníka a den, 62 160 Kč, návrhy (≈ 2 500 Kč za špenát, −60 kg polévky, ≈ 25 porcí denně) | 5 | Vymyšlený měsíc pro demo (`demo/data/month.json`, `synthetic: true`), 412 talířů denně, 92,5 Kč/kg. Na slajdu je štítek „Ukázková data“ a u návrhů „odhad“. |
| 34 000 Kč | 9 | Náš rozpočet. Ceny s odkazem na e-shopy (OVĚŘENO), zbytek odhad. Položky jsou v `prezentace/OBSAH.md` a ve slajdu 99. |
| 6 týdnů, leden 2027, 30. 3. 2027, 10. 5. 2027 | 10 | Náš harmonogram pilotu |

## Nesrovnalosti, které jsme našli

1. **Orbisk na slajdu 8 (konkurence):** slajd říká „personál drží jídlo pod kamerou“. Dnešní popis Orbisku (FoodInspiration) je ale kamera nad košem a váha pod ním, fotí automaticky. Starší popisy z doby uvedení měly ruční držení. Doporučení: „kamera nad košem, váha pod ním“.
2. **IKEA na slajdu 12 (závěr):** slajd říká „IKEA na Zličíně snížila odpad o polovinu“. −50 % (54 %) platí pro IKEA Česko celkem a Zličín je jen místo reportáže. Doporučení: „IKEA v Česku snížila odpad o polovinu“. Slajd 8 to má správně.
3. **Slajd 6 (opatření):** příklad 30 % = 180 000 Kč je správně spočítaný, ale v `OBSAH.md` máme konzervativnější 10 % = 60 000 Kč.
4. **Nevyzvednuté obědy:** tisková zpráva uvádí 5–9 %, metodika MENDELU z roku 2025 uvádí 8–10 %. Na hlavních slajdech to číslo není.
5. **Počet jídelen:** tisková zpráva z roku 2024 uvádí „cca 9 000 jídelen, téměř 2 miliony dětí“ (podle NZIP), metodika z roku 2025 uvádí 8 891 a 1,6 milionu. Používáme novější a přesnější čísla.

## Odkazy

- **TZ Prague Food Waste, 25. 6. 2024:** https://pef.mendelu.cz/wp-content/uploads/2024/06/06_2024_TACR.pdf (projekt: https://zachranjidlo.cz/projekt/prague-food-waste)
- **MENDELU, Strejcová a kol.: Jak šetřit jídlem ve školních jídelnách (2025):** https://doi.org/10.11118/978-80-7701-037-5 (PDF: https://doi.mendelu.cz/pdfs/doi/9900/08/8000.pdf). Strany jsou tištěná čísla stran.
- **Echo24, 26. 6. 2024:** https://echo24.cz/a/HMbku/zpravy-svet-ve-skolnich-jidelnach-se-vyhodi-tretina-jidla
- **Blesk, 25. 6. 2024:** https://www.blesk.cz/clanek/regiony-praha-praha-zpravy/788923/tretina-skolnich-obedu-v-praze-skonci-v-popelnici-zakum-jede-krupicova-kase-vyhazuji-spenat.html
- **IKEA ČR, 29. 9. 2022:** https://www.ikea.com/cz/cs/newsroom/corporate-news/ikea-v-cesku-za-posledni-ctyri-roky-snizila-plytvani-jidlem-o-vice-nez-polovinu-usetrila-240-tisic-porci-pub8d794ee0
- **Ekonews, 10. 12. 2022 (Zličín):** https://www.ekonews.cz/chytra-vaha-v-restauraci-pozna-kazde-vyhozene-jidlo-a-brani-tak-plytvani-z-jedne-porce-jde-do-kose-13-gramu/
- **Orbisk:** https://www.foodinspiration.com/us/fighting-food-waste-from-your-own-trash
- **Leanpath u Sodexo:** https://www.sodexo.com/en/media/sodexo-against-food-waste.html
- **KITRO:**
  - https://www.kitro.ch/industries/universities-schools
  - https://www.kitro.ch/resources/automated-food-waste-tracking-guide
- **Poznámka:** sborník From Plate To Waste (dřívější zdroj Z4) už na původní adrese není (404). Čísla 8 891 a 1,6 milionu proto citujeme z metodiky MENDELU, s. 5.
