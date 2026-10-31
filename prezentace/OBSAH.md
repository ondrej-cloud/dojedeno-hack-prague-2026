# Dojedeno: obsah prezentace a hranice tvrzení

Stav pro pitch: návrh pilotu, funkční demonstrace analýzy talíře a připravené ukázkové přehledy. Pilot v jídelně ještě neproběhl. Tento soubor sjednocuje prezentaci, one-pager a výklad; návrhy a modelové výpočty se nesmí vydávat za výsledky.

## Příběh řešení

První pilot plánujeme v naší škole v Hejčíně v Olomouci, Olomoucký kraj. Přesný název školy, souhlas provozovatele, datum a vybavení je potřeba potvrdit. Podpora Hack Prague pro Olomouc je otázka na organizátory.

Hlavní varianta: jeden pás, telefon fotografuje zbytky na talíři před vysypáním, jeden kbelík stojí na váze. Fotografie pomáhá určit druh zbytků; váha měří přírůstek jejich celkové hmotnosti. Přiřazení podle pořadí platí pouze tehdy, pokud se zachová i pořadí vysypávání. Prázdný talíř, opakované vyškrábnutí, souběh nebo změna pořadí nesmí posunout přiřazení všech dalších talířů. Nejisté události zůstávají společnou dávkou nebo nepřiřazenou hmotností.

Hejčín má podle zadání tři patra pásu. Možnost oddělit jeden sledovaný tok musíme ověřit na místě. Třípásová varianta se sledováním pohybu je pouze záložní návrh pro otázky. Vizuální poměry jídla nejsou hmotnostní podíly; násobení odhadu z fotografie celkovou váhou neposkytuje naměřené gramy jednotlivých surovin.

Současné živé demo rozpoznává talíř a čte viditelný displej vytárované váhy z fotografie. Produkční propojení pásu s přírůstky kbelíku zatím není implementované. Denní a měsíční přehledy i doporučení jsou ukázkové. Obrazovka pro žáky je možnost do budoucna, nikoli součást prvního pilotu.

## Čísla a jejich význam

| Tvrzení | Význam a omezení | Podklad |
|---|---|---|
| 31 % | Podíl zbytků z talířů a nevydaných pokrmů na hmotnosti uvařeného jídla ve čtyřech sledovaných pražských jídelnách. Bez odpadu z přípravy. Není to celorepublikový výsledek ani náš cíl redukce. | Z1, Z2 |
| 48 % / 43 % / 9 % | Podíly talířů, nevydaných pokrmů a přípravy na celkové hmotnosti zaznamenaného odpadu. Jiný jmenovatel než u 31 %. | Z1, Z2 |
| Přibližně 600 000 Kč ročně | Orientační hodnota surovin ve zbytcích z talířů pro školu s 500 žáky. Nezahrnuje nevydané pokrmy, práci ani energii; není to naměřená ztráta Hejčína nebo dosažitelná čistá úspora. | Z2, s. 9 a 12 |
| 1 200 Kč na žáka | Přepočet uvedeného odhadu 600 000 / 500. | Výpočet |
| 10 % = 60 000 Kč | Modelová hodnota omezených zbytků při stejné průměrné ceně surovin. Méně odpadu samo nezaručuje nižší nákupy. | Modelový výpočet |
| 8 891 zařízení | Jídelny, výdejny a vývařovny ve sborníku From Plate To Waste 2025; nejde o počet vhodných zákazníků našeho řešení. | Zdroj ve slajdu 2 |
| Brno: 80 → 19 kg čočky | Příklad dne se zapojením dětí oproti popisovanému obvyklému zbytku. Není to kontrolovaný důkaz dlouhodobé účinnosti ani výsledek Dojedeno. | Z2, s. 19 |
| 92,5 Kč/kg; 70 kg za den | Parametry ukázkových dat dema, nikoli výsledky pilotu. | `docs/codex-oprava-dat.md` |

Nevydané pokrmy nejsou automaticky odpad. Oddělujeme objednané a nevyzvednuté obědy, pokrmy nevydané na konci výdeje a skutečně vyřazené množství. U nevydaného zaznamenáme další využití, bezpečné darování nebo odstranění. Z historických absencí nevyvozujeme pokyn neuvařit objednaný oběd.

## Pilot, KPI a rozhodnutí

Příprava před šestitýdenním měřením: domluva se školou, prohlídka provozu, bezpečné umístění, ověření váhy a datového výstupu, test záběru a ruční kontrola alespoň 50 událostí. Vzorek musí zahrnout prázdné talíře bez přírůstku váhy, souběhy, změnu pořadí a opakované vyškrábnutí; nejde o důkaz produkční přesnosti. S jídelnou předem stanovíme přijatelné chyby a provozní zátěž.

| Období | Činnost | Výstup |
|---|---|---|
| 1.–2. týden | Měření bez změny porcí nebo receptur | Výchozí KPI a první přehled opakujících se zbytků |
| 3.–4. týden | Jedno opatření dohodnuté s personálem | První srovnání a zpětná vazba strávníků |
| 5.–6. týden | Ověření stejné změny, případně druhá varianta | Vyhodnocení a rozhodnutí pokračovat / upravit / zastavit |

Nejvýše dvě varianty opatření. Šest týdnů není slib hotového produkčního řešení. Pokud se srovnatelná jídla neopakují dostatečně nebo chybí měření, výsledek označíme za neprůkazný a případné prodloužení dohodneme zvlášť.

**Hlavní KPI:** gramy vráceného potravinového gastroodpadu / skutečně vydané obědy za den ve stejné sledované části provozu. Jmenovatel nesmí být počet všech obědů školy, pokud vážíme jen část. Výchozí hodnotu neznáme; získáme ji v prvních dvou týdnech. Návrhový cíl je −10 %, nikoli dosažený výsledek.

Za fázi počítáme součet gramů / součet odpovídajících vydaných obědů. Výpadek se nezapisuje jako nulový odpad. Uvádíme pokrytí a platné dny, srovnáváme obdobná menu, docházku a změny provozu. Bez kontrolní skupiny nepřipisujeme automaticky celý rozdíl opatření.

**Doplňková evidence:** počet nevyzvednutých objednaných obědů a množství nevydaných pokrmů včetně jejich dalšího osudu. Patří do jiné kategorie než hlavní KPI; nezapočítávat dvakrát.

**Vedlejší dopad:** změna nákupů a provozních nákladů po odečtení nákladů systému a opatření. Samostatně evidujeme čas personálu, servis a poplatky za odstranění odpadu. Menší hmotnost odpadu nemusí snížit paušální poplatek.

První analýza po dvou týdnech je orientační podklad pro výběr změny. Může doporučit upravit recepturu, nabídnout volitelnou menší přílohu s možností přidání nebo lépe zpřístupnit polévku. Konkrétní porce a recepty schvaluje jídelna v souladu s použitelnými výživovými normami; sledujeme hlad, spokojenost a dostupnost přidání. Soutěže tříd a další interakce žáků patří až do možného rozšíření.

## Pracovní rozpočet jedné jídelny

Všechny ceny jsou **odhady**, bez potvrzených nabídek. Před nákupem ověřit parametry, kompatibilitu, DPH a financování.

| Položka | Množství | Cena za jednotku | Celkem | Stav |
|---|---:|---:|---:|---|
| Telefon | 1 ks | 2 500 Kč | 2 500 Kč | Odhad |
| Váha s datovým výstupem | 1 ks | 5 000 Kč | 5 000 Kč | Odhad |
| Držák a kryt | 1 sada | 1 000 Kč | 1 000 Kč | Odhad |
| AI a internet na šest týdnů | 1 balíček | 1 000 Kč | 1 000 Kč | Odhad |
| Práce týmu | 16 hodin | 250 Kč/h | 4 000 Kč | Odhad |
| Doprava | 1 paušál | 500 Kč | 500 Kč | Odhad |
| Rezerva | 1 paušál | 2 000 Kč | 2 000 Kč | Odhad |
| **Celkem** | | | **16 000 Kč** | **Odhad** |

Dosavadní vývoj prototypu není v částce účtován. Produkční vývoj, dlouhodobý servis a neznámý čas školy potřebují samostatné vyčíslení. Není to konečná prodejní cena produktu nebo předplatného.

## Hlavní pitch: 12 slajdů, návrh 5 minut

| # / hash | Čas | Obsah |
|---|---|---|
| 1 / `#1` | 0:00–0:25 | Lokalita pilotu, film, titul a jednopásový model; 31 % s uvedením vzorku |
| 2 / `#2` | 0:25–0:45 | Hodnota surovin ve zbytcích, rozsah problému |
| 3 / `#3` | 0:45–1:10 | Talíře, nevydané pokrmy, příprava; různé jmenovatele procent |
| 4 / `#4` | 1:10–1:30 | Měření ukáže co a kolik; příčinu ověříme s jídelnou |
| 5 / `#5` | 1:30–1:55 | Jeden pás, kamera, jeden vážený kbelík |
| 6 / `#6` | 1:55–2:20 | Podmínky párování fotografie a přírůstku hmotnosti |
| 7 / `#7` | 2:20–3:10 | Demo talíře a displeje váhy, následně ukázková data |
| 8 / `#8` | 3:10–3:35 | První analýza, opatření, hlavní KPI a modelový finanční dopad |
| 9 / `#9` | 3:35–3:45 | Přínos pro vedoucí, ředitele a kuchařky |
| 10 / `#10` | 3:45–4:05 | Provozní zátěž, výživa, hygiena a soukromí |
| 11 / `#11` | 4:05–4:45 | Šest týdnů, dvě varianty, odhad 16 000 Kč, rozhodnutí na konci |
| 12 / `#12` | 4:45–5:00 | Závěr a výzva k podpoře prvního ověření |

Poznámky obsahují i podrobné odpovědi pro otázky; při pětiminutovém pitchi se nečtou celé. Časování je návrh k nácviku, nikoli změřená délka řeči. Šipka doprava ze závěru neotevírá zálohu. Q otevře první záložní slajd, End vrátí hlavní závěr.

Záloha za závěrem: **#13** tři pásy, **#14** položkový rozpočet, **#15** rizika a pravidla, **#16** primární zdroje, **#17** další rozvoj, **#18** konkurence, **#19** příklad z Brna. Odkaz na one-pager je na závěru.

## Rizika a neuzavřené body

- **Provoz:** místo instalace, čištění, střídání kbelíků, výpadky a čas personálu. Cílem je minimum práce navíc; skutečný čas změří pilot.
- **Přiřazení a AI:** zakrytí talíře, změna pořadí, více vysypání, nejisté rozpoznání směsi. Naměřenou hmotnost nezaměňovat za odhad složení.
- **Výživa:** změny s vedoucí, bez hladu a tlaku na dojídání. Menší porce není univerzální doporučení.
- **Soukromí:** ověřit skutečný záběr, účel, uchování a cloud se školou a pověřencem. Pouhý záměr nefotit obličeje neuzavírá posouzení ochrany osobních údajů.
- **Hygiena a gastroodpad:** vhodné uchycení a údržba, soulad s provozem a oprávněným předáním odpadu. Gastroodpad může být biologicky rozložitelný; neříkat „není bio“. Není automaticky vhodný pro školní kompost.
- **Ekonomika:** žádný slib cenové převahy nebo návratnosti bez nabídek a měření. Konkurence existuje i mimo hotely; lokalita a jednoduchá instalace jsou naše hypotézy k ověření.
- **Darování:** jen bezpečné nevydané pokrmy podle dohodnutého postupu, nikdy zbytky z talířů. Kokoza a Zachraň jídlo jsou „chceme oslovit“, nikoli partneři.

Podle sdělených požadavků organizátorů je připravena lokalita, položkový rozpočet, měřitelný KPI s plánem výchozího měření a označení zamýšlených partnerů. **Skutečnou citaci člověka z jídelny nemáme a nevymýšlíme ji.** Úplnou obsahovou šablonu nemáme k dispozici, proto netvrdíme úplnou shodu. Zbývá potvrdit školu, datum, místo, vybavení, rozpočet a způsobilost podpory mimo Prahu.

## Primární podklady

- **Z1:** [Prague Food Waste, tisková zpráva 25. 6. 2024](https://pef.mendelu.cz/wp-content/uploads/2024/06/06_2024_TACR.pdf).
- **Z2:** [Jak šetřit jídlem ve školních jídelnách, MENDELU 2025](https://mzp.gov.cz/cz/system/files?file=2026-06/OCEO-Jak_setrit_jidlem_ve_skolnich_jidelnach-20260608.pdf). Rok 2026 v adrese je rok umístění souboru, nikoli vydání brožury.
- [MŠMT: informativní konsolidace vyhlášky 107/2005 Sb. k 1. 7. 2026](https://msmt.gov.cz/media/wp-content/uploads/2026/07/107-2005-1.7.2026.pdf). Konkrétní režim a normování ověří vedoucí jídelny.
- [SVS: kuchyňský odpad](https://svs.gov.cz/krmiva-vzp-asanace/kuchynsky-odpad/).
- [ÚOOÚ: doporučení ke kamerovým systémům ve školách](https://uoou.gov.cz/doporuceni-ke-kamerovym-systemum-ve-skolach).
- [SZPI: darování pokrmů](https://www.szpi.gov.cz/docDetail.aspx?chnum=12&docid=2509173&doctype=ART).

Neuvádět vlastní nepodložené tuny, CO₂, univerzální procento úspor, odhad přesnosti AI ani cenu konkurence bez nabídky. Původní představa více jídelnami a delším pilotem byla nahrazena výše uvedeným návrhem šesti týdnů v jedné jídelně.
