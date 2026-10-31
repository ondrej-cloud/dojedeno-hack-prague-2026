# Kamera na zbytky jídla ve školní jídelně: podklad na schůzku s mentorem

## Co chceme ze schůzky odnést
1. Potvrzení, že problém je skutečný, a odpověď, kdo by to v jídelně používal a kdo zaplatí.
2. Kontakt na jídelnu, kde to vyzkoušíme.
3. Jestli můžeme jít s vlastním tématem a co chce vidět porota.

## Jak schůzku vést (asi 10 minut)
1. **1 minuta: problém a řešení** podle scénáře níže. Začni číslem, ne technologií.
2. **1 minuta: obrázek.** Telefon nad kbelíkem, kbelík na váze, vedle přehled pro vedoucí jídelny. Pokud už proběhne test při obědě, ukaž jeho výsledky.
3. **Zbytek: otázky.** Odpovědi si zapisuj. Na konci si řekni o kontakt.
4. **Slabiny řekni sám dřív, než se na ně zeptá.** Hlavně tu, že AI neumí z fotky poznat, kolik jídla zbylo, a proto máme váhu.

## Scénář na úvod (nahlas, asi 60 s)
> V pražských školních jídelnách se vyhodí zhruba třetina uvařeného jídla. Změřil to projekt Zachraň jídlo s Mendelovou univerzitou ve čtyřech pražských jídelnách. Škola s 500 žáky tak jen ze zbytků na talířích vyhodí za rok jídlo asi za 600 tisíc korun, a to počítáme jen suroviny. Skoro polovina jsou zbytky na talířích. 43 % je ale jídlo, které se vůbec nevydalo, protože se ho prostě uvařilo moc. Denně to přitom nikdo neměří. Studie vážila ručně a jen omezenou dobu.
>
> Chceme, aby jídelna každý den věděla, co a kolik vyhodila. Pod kbelík na zbytky dáme obyčejnou váhu, nad něj starý telefon. Po každém talíři telefon vyfotí, co přibylo. Umělá inteligence přečte číslo na váze a pozná, které jídlo z dnešního menu to je. Vedoucí jídelny pak vidí: dnes jsme vyhodili 38 kg, nejvíc knedlíků ze svíčkové, a v hrnci zbylo 40 porcí rizota. Příště jich uvaří méně.
>
> V zahraničí na to restaurace a velké kuchyně používají systémy jako Winnow nebo Orbisk, které fungují také na principu kamery a váhy. My chceme levnou verzi z telefonu a běžné váhy. Pilot chceme spustit v jedné pražské školní jídelně.

## Jak to funguje (na technické dotazy)
- **Ráno:** systém dostane jídelníček dne (2–3 jídla). Zadá ho kuchařka, nebo se převezme z online jídelníčku, pokud ho jídelna má.
- **Při obědě, talíř po talíři:**
  - Telefon visí nad kbelíkem a vidí kbelík i displej váhy. Kuchařka škrábe vždycky jeden talíř, takže u kbelíku je pořadí jisté. Na pásu by nebylo, protože kuchařka bere talíře ze tří pater na přeskáčku.
  - Talíř se objeví nad kbelíkem a telefon ho vyfotí, jídlo spadne, váha se ustálí a telefon vyfotí displej. Rozdíl na váze je počet gramů z tohoto talíře.
  - Na telefonu běží jen jednoduché hlídání dvou míst v obraze (kbelík a displej). Claude dostane dvě fotky na talíř, pozná jídlo a přečte číslo.
  - **O tom, jestli je talíř dojedený, rozhoduje váha, ne AI.** Když přibude méně než asi 10 g, jsou to drobky a talíř se počítá jako dojedený. Talíře, které jdou rovnou do myčky, dopočítáme z počtu vydaných obědů.
  - Jak se zbytek dělí mezi přílohu a maso, odhadne Claude z fotky. Váha dá za talíř jen jedno číslo.
- **Přesnost:**
  - Velká váha ukazuje po 10–20 g, což je na jeden talíř hrubé. Potřebujeme menší váhu s krokem 1–5 g a menší kbelík, který se častěji vymění.
  - Na pilot by byla nejlepší váha, která posílá data do mobilu nebo počítače. Odpadne čtení displeje a časová shoda bude přesná.
  - Při testu zvážíme asi 50 talířů ručně a porovnáme je se systémem, takže budeme znát skutečnou chybu.
- **Nevydané jídlo bez práce navíc:** zbytky z gastronádob stejně končí v odpadu. Když je kuchařka vyklopí do kbelíku na váze (nebo dáme druhou sadu tam, kam je vyklápí), systém pozná velký přírůstek a nerezovou nádobu na fotce a zapíše to jako nevydané jídlo. Kuchařka nedělá nic jiného než dnes.
- **Výstup:**
  - denní přehled pro vedoucí jídelny: kg, Kč, která jídla a jaký je vývoj,
  - doporučení, kolik které jídlo příště vařit.
- **Proč nepoužíváme vlastní model:**
  - Nemáme data, na kterých bychom ho naučili.
  - AI tu vybírá jen ze 2–3 jídel dne.
  - Množství měří váha, ne AI. Při odhadu váhy jídla z fotky se AI ve studiích pletly asi o 37 %.

## Co máme ověřené a co ne
- **Ověřené:**
  - čísla z pražské studie (31 % uvařeného jídla, 48 % zbytky z talířů, 43 % nevydané jídlo, 600 tis. Kč ročně na školu s 500 žáky),
  - princip kamery s váhou (Winnow, Orbisk),
  - chyba AI při odhadu váhy z fotky,
  - cena AI.
- **Zatím neověřené:**
  - jak spolehlivě Claude přečte displej a pozná jídlo (otestujeme při obědě),
  - kdo v jídelnách škrábe talíře,
  - jestli by jídelna chtěla,
  - o kolik se odpad sníží (to změří až pilot).
## Konkurence
**V zahraničí to funguje, stejným principem jako my (váha pod kbelíkem a kamera nad ním):**
- **Kitro** (Švýcarsko): prakticky stejný princip jako náš. Podle firmy ho používá přes 500 kuchyní ve 40 zemích: hotely, nemocnice, univerzity, jídelny. Funguje jako předplatné, ceny nezveřejňují. Uvádějí snížení zbytečného odpadu o 30 %.
- **Winnow** (Velká Británie): IKEA, Hilton, Marriott, Accor.
- **Orbisk** (Nizozemsko): přes 1 000 kuchyní, Accor.
- **Leanpath** (USA): Sodexo ho podle starších údajů nasadilo asi ve 2 000 provozech ve 30 zemích. Sodexo uvádí v průměru o 50 % méně odpadu.

**V Česku to existuje, ale jen v komerčních kuchyních:**
- **IKEA Česko, včetně Zličína,** používá Winnow (kamera + váha) zhruba od roku 2018. Uvádí, že odpad v kuchyni snížila o víc než polovinu a ušetřila přibližně 240 tisíc porcí.
- **KITRO má od roku 2026 v Praze hotel Andaz.** Podle firmy jde o její první české zákazníky.
- **Sodexo** podle titulku článku začalo v Česku a na Slovensku měřit plýtvání ve firemních restauracích. Podrobnosti jsme neověřili, stránka nešla otevřít.

**Ve školních jídelnách jsme automatické měření nenašli.** Hledali jsme články, studentské a hackathonové projekty, diplomové práce i české startupy. Nejblíž je studentská aplikace Chytrý jídelníček (Brno, 2025), která ale jen plánuje jídelníček, nic neměří. Jistotu nemáme: neveřejný pilot by naše hledání nenašlo. Proto se ptáme mentora a Zachraň jídlo.

V Česku dál existuje:
- **Výzkum Prague Food Waste:** brigádníci ručně vážili ve čtyřech školách vždy jeden týden, dohromady 1 705 kg odpadu.
- **Příručka Mendelovy univerzity (2025)** doporučuje jídelnám pravidelně vážit odpad, i ve zjednodušené podobě několikrát ročně. Děti mají vést tabuli s denní statistikou. My to chceme automatizovat a dělat každý den.
- **Ministerstvo životního prostředí** vydalo v červnu 2026 podobné příručky pro domovy seniorů a nemocnice.
- **Aplikace jako Nesnězeno** řeší prodej přebytků, ne měření.

**V čem jsme jiní:** zaměření na české školní jídelny, levné vybavení (telefon a obyčejná váha) a stejné kategorie jako ve výzkumu Mendelovy univerzity, takže se výsledky dají srovnat se studií. Příklad, proč měření funguje: v jedné brněnské škole běžně zbývá z čočky nakyselo až 80 kg. V den, kdy děti samy vážily a soutěžily, zbylo 19 kg.

## Rozpočet pilotu (odhad)
- **Pilot ve 3 jídelnách za asi 50 000 Kč:** mobily, držáky, váhy, provoz včetně AI, validační dny a rezerva. Ceny ještě ověřujeme.
- **Příklad úspory:** když ušetříme 10 % zbytků z talířů, škola ušetří 60 000 Kč ročně. Je to příklad, ne slib.

## Otázky na mentora
**Pro každého mentora:**
1. Dává vám to smysl? Slyšel jste od jídelen, že je tohle trápí?
2. Kdo by v jídelně rozhodl, že to chce, a kdo by to zaplatil: vedoucí jídelny, ředitel, nebo městská část jako zřizovatel?
3. Neznáte jídelnu, kde bychom to mohli vyzkoušet? Nebo koho se zeptat?
4. Můžeme jít s vlastním tématem mimo vypsané výzvy? Do jaké kategorie by patřilo?
5. Co porotu přesvědčí nejvíc: kila, koruny, nebo CO₂?

**Petr Jermář (bioodpad, Kokoza), pro tenhle nápad nejlepší:**
- Kam dnes odpad ze školních jídelen v Praze jde a kolik jídelnu stojí odvoz? Přidali bychom to do úspor.
- Kdo v jídelnách obvykle škrábe talíře, děti, nebo kuchařky? Je tam jeden kbelík, nebo jich je víc?
- Jaké hygienické předpisy musíme pohlídat, když bude telefon a váha u odpadu v kuchyni?
- Znáte někoho ze Zachraň jídlo nebo z projektu Prague Food Waste?

**Jan Richter (magistrát):**
- Má město nebo městská část program, ze kterého by se to po pilotu dalo platit?
- Komu na magistrátu nebo městské části to ukázat?

**Petr Vondruš (řízení projektů):**
- Jsou plán a rozpočet pilotu realistické? Jaká rizika vidíte?
- Jak úspěch pilotu změřit? Napadá nás měsíc měření bez zásahu a pak měsíc s doporučeními.

## Na co se mentor asi zeptá
- **„Tohle už existuje.“** Ano, i v Praze. IKEA na Zličíně s tím odpad snížila o polovinu. Fungování tedy dokazovat nemusíme. Je to ale drahá věc pro komerční kuchyně. Ve školních jídelnách se váží ručně, nanejvýš pár týdnů v roce. My chceme levnou verzi pro školy. Otázka na mentora: nevíte o pokusu v nějaké škole?
- **„Pozná AI, kolik toho zbylo?“** Spolehlivě ne, ve studiích se pletla asi o 37 %. Proto máme váhu. AI jen přečte číslo a pozná jídlo.
- **„Co když někdo vyklopí víc talířů najednou?“** Celková váha sedí, jen rozdělení podle jídel bude hrubší.
- **„Co soukromí?“** Kamera míří jen do kbelíku, obličeje nezabírá.
- **„Co se změní, až to budou vědět?“** Kuchyně upraví, kolik vaří a jak velké jsou porce. O kolik to sníží odpad, změří pilot.
- **„Při výdeji jde talíř každých pár sekund, jak to stihnete?“** Kuchařka škrábe vždycky jeden talíř, v průměru jeden za 7 s (300 talířů za 35 minut). Telefon nad kbelíkem spáruje fotku talíře s přírůstkem na váze. Když se dva talíře slijí, vidíme to na fotce a dostanou společnou váhu.
- **„Bude to kuchařky zdržovat?“** Ne. Škrábe se jako vždycky a zbytky z gastronádob se vyklápí do stejného kbelíku na váze.

## Zdroje
- [Echo24: ve školních jídelnách se vyhodí třetina jídla (Zachraň jídlo, Mendelu, INESAN)](https://echo24.cz/a/HMbku/zpravy-svet-ve-skolnich-jidelnach-se-vyhodi-tretina-jidla)
- [Winnow: kamera + váha (The Spoon)](https://thespoon.tech/winnow-launches-computer-vision-ai-tool-to-help-commercial-kitchens-fight-food-waste/)
- [Orbisk: kamera rozpozná, váha zváží (ioplus)](https://ioplus.nl/archive/en/ai-smart-food-monitor-is-at-your-service/)
- [Odhad váhy jídla z fotky: GPT-4o a Claude, chyba ~37 % (PMC)](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12513282/)
- [Mendelu: Jak šetřit jídlem ve školních jídelnách (2025), vážení s. 19, Brno s. 19](https://doi.mendelu.cz/artkey/doi-990008-8000_jak-setrit-jidlem-ve-skolnich-jidelnach.php)
- [Kitro: váha + kamera, zákazníci, výsledky (SATW)](https://technology-outlook.satw.ch/en/showcases/less-food-waste-thanks-to-automatic-image-recognition)
- [Winnow: zákazníci (KI-Syndikat)](https://www.ki-syndikat.de/tools/winnow/)
- [Sodexo + Leanpath](https://www.sodexo.com/en/media/sodexo-against-food-waste.html)
- [IKEA Česko: plýtvání jídlem o víc než polovinu méně (Winnow)](https://www.ikea.com/cz/cs/newsroom/corporate-news/ikea-v-cesku-za-posledni-ctyri-roky-snizila-plytvani-jidlem-o-vice-nez-polovinu-usetrila-240-tisic-porci-pub8d794ee0)
- [Ekonews: chytrá váha v IKEA Zličín, 13 g na porci](https://www.ekonews.cz/chytra-vaha-v-restauraci-pozna-kazde-vyhozene-jidlo-a-brani-tak-plytvani-z-jedne-porce-jde-do-kose-13-gramu/)
- [EnviWeb: KITRO v Česku, hotel Andaz Prague (2026)](https://www.enviweb.cz/134041)
- [MŽP: Jak šetřit jídlem v domovech pro seniory (2026)](https://mzp.gov.cz/system/files/2026-06/OCEO-Jak_setrit_jidlem_v_domovech_pro_seniory-20260608.pdf)
