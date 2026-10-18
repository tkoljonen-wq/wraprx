# Avoimet mallikysymykset

Suunnitelman §9.1 kohta 5 sanoo: *"Jos jokin kaava näyttää väärältä, kysy — älä korjaa
arvaamalla."* Tämä tiedosto on se kysyminen. Jokainen kohta on toteutettu jollakin
valinnalla, valinta on kirjattu koodin kommenttiin ja se on **muutettavissa yhdessä
paikassa**. Mikään näistä ei estä P0:aa, mutta jokainen vaikuttaa lukuihin.

---

## 1. OC-korkeuden kriteeri — RATKAISTU 1.9.2026 ✅

**Päätös: (A) katselinjan lävistyspiste.** Käyttäjä (optikko) vahvisti kriteerin
1.9.2026 selityksen ja sivukuvan perusteella. Tuloskortin
pääluvuksi menee `ocHeightMm` (esimerkkitapauksessa 22,45 mm). Vaihtoehto (B) jää
vertailuluvuksi laskentajälkeen (`opticalAxisOcHeightMm`), samoin nyrkkisääntö
(`vogelOcHeightMm`). `geometry.ts`:n funktiota `decentration` ei muuteta.

**Yhä auki, ei laskentakysymys vaan tilauskäytäntö:** tekeekö linssitalo panto-pudotuksen
itse annetusta korkeudesta? Jos tekee, pudotus tulisi kahdesti tai kompensaatio menisi
hukkaan. Tämä on varmistettava linssitalolta ennen ensimmäistä oikeaa tilausta. Se on
tilauskäytäntö, ei laskentaa. (Sovellukseen ei tehdä tilauslomaketta, 18.10.2026.)

Alkuperäinen kysymys ja perustelut säilytetään alla, koska ne dokumentoivat sen, mitä
valittiin ja mitä ei.

**Kysymys:** kumpaa OC-korkeutta tilauksessa halutaan?

- **(A) Katselinjan lävistyspiste** — "OC siihen pisteeseen, josta katsotaan".
  Suoraan eteen katsottaessa katselinja on vaakasuora, joten se lävistää kallistetun
  linssitason **sovituskorkeuden yläpuolella**, ei alapuolella. Esimerkillä (panto 18°,
  sovituskorkeus 22 mm, B = 36 mm): **22,45 mm**.
- **(B) Optinen akseli silmän kiertokeskiöön** — klassinen sovitussääntö, josta
  nyrkkisääntö "1 mm per 2°" on johdettu. Samalla esimerkillä: **14,57 mm**
  (nyrkkisääntö antaisi 13,0 mm — sama kokoluokka, kuten pitääkin).

**Ero on noin 8 mm.** Se ei ole pyöristysero vaan kahden eri kriteerin ero.

**Toteutettu valinta: (A).** Perustelu: suunnitelma §3.3 sanoo eksplisiittisesti
"projisoimalla katselinja linssin normaalin määrittämään kierrettyyn tasoon" ja §2.2
kohta 3 "että OC osuu siihen pisteeseen, josta katsotaan". Kriteeri (A) on myös ainoa
johdonmukainen valinta kompensoidulle linssille: jos voimakkuus kompensoidaan
kallistukselle ja OC lisäksi lasketaan 9 mm alas, katselinja kulkee 9 mm OC:n
yläpuolelta ja saa Prentice-prisman, jota kukaan ei tilannut. Kriteeri (B) on
vaihtoehto, joka *välttää* kallistuksen vaikutusta eikä kompensoi sitä — samaa asiaa
kahdella tavalla ei voi tehdä yhtä aikaa.

**(B) näkyy laskentajäljessä** (`ocHeightOpticalAxis`) ja nyrkkisääntö samoin
(`ocHeightVogel`), joten molemmat ovat vertailtavissa.

**Sivuseuraus:** suunnitelma perustelee CRA-parametrin tarpeen OC-korkeudella (§2.2
kohta 3). Kriteerissä (A) **CRA ei vaikuta lopputulokseen lainkaan**: vaakasuora
katselinja lävistää tason samassa pisteessä riippumatta siitä, kuinka kaukaa se tulee.
CRA:ta käytetään vain vertailulukuun (B) ja se jää syötteeseen, koska P2:n
prismalaskenta ja tulevat gaze-suuntien tarkennukset tarvitsevat sen.

**Ratkaisu vaati** optikon kannan siihen, mitä lukua linssitalolle tilataan.
Kanta saatiin 1.9.2026: (A). Ks. tämän kohdan alku.

---

## 2. Sovituskorkeuden mittaustapa

Sovituskorkeus tulkitaan **pupillin korkeudeksi frontaalitasossa** (pupillometri,
heijastusmenetelmä). Jos korkeus on merkitty demolinssiin lasien ollessa kasvoilla,
merkki **on jo** lävistyspiste eikä pystykorjausta tarvita — silloin OC-korkeus on
sovituskorkeus sellaisenaan.

Ero esimerkkitapauksessa on 0,45 mm, eli pieni mutta ei nolla. Ratkaisu olisi
`fittingHeightMethod: 'frontal' | 'markedOnLens'` -kenttä; sitä ei ole vielä lisätty,
koska se on käyttöliittymäkysymys (P1) eikä laskentakysymys.

---

## 3. Linssitason kanta vs. frontaalitason kanta

OCR-käännöksessä μ määritellään frontaalitasossa (`atan2(n̂_y, n̂_x)`, suunnitelma §3.4)
ja sitä käytetään symmetrisesti sekä tilattavan linssin että silmällä toteutuvan
voimakkuuden kiertoon. Tarkasti ottaen linssin oma kanta (ê_h, ê_v) on frontaalitasoon
projisoituna kiertynyt kulman `atan(tan β · sin θ)` verran — 15°/18°:lla noin 4,7°.

Suunnitelman kaava on toteutettu sellaisenaan ja §5.3:n referenssitapaus toistuu sillä
tarkalleen, joten tämä on mallin määrittelyä eikä virhe. Tarkennus (erilliset μ:t
linssitasolle ja silmälle) kuuluu samaan luokkaan kuin base curve -malli: se on P4:n
kysymys, ja sen kokoluokka on syytä mitata valmistajadataa vasten ennen kuin sitä
muutetaan.

**RATKAISTU JOHDOLLA 18.10.2026, KOODI EI VIELÄ MUUTETTU.** Johto ja säteenjuoksu ovat
tiedostossa `test/cases/derivations.md`, tapaus 10. Tulos: linssin tangentiaalimeridiaani
omassa kannassaan on μ_L = atan2(sin β·cos θ, sin θ) − 90°, kun silmän frontaalitasossa
se on μ_F = atan2(sin β, cos β·sin θ) − 90°. 18°/15°:lla ero on 2,39° (ei 4,7°, joka oli
datumlinjan projektiokulma). Oikea tilaus on nykyinen tilaus kierrettynä Δ = μ_L − μ_F:n
verran; voimakkuudet eivät muutu. Riippumaton 3D-säteenjuoksu täsmää uuteen malliin
0,001 D:n tarkkuudella, ja nykyinen malli jättää silmälle jopa 0,1–0,2 D:n virheen
yhdistetyllä kallistuksella. Koodimuutos odottaa käyttäjän lupaa. Muutos muuttaa myös
referenssitapauksen 1 akseleita, joten tapaus on johdettava uudelleen käsin.

---

## 4. Base curve -korjauksen vertailupiste

`baseCurveExtraAngles` mittaa poikkeaman **linssiaukon geometrisesta keskiöstä**
(puolivalmisteen etupinnan huippu). Jos OC desentroidaan, valmiin linssin etupinnan
huippu on eri paikassa. Juuri tämä epävarmuus on suunnitelman §3.3:n peruste sille,
että korjaus on ominaisuuslipun takana ja oletuksena pois.

---

## 5. Kallistusten kiertoakselit

Wrap kiertää linssitasoa **sillan keskikohdan kautta kulkevan pystyakselin** ympäri ja
panto **datumlinjan (linssiaukon pystykeskikohdan) kautta kulkevan vaaka-akselin**
ympäri. Kehyksen etuosa on todellisuudessa jatkuvasti kaareva; tämä on tavanomainen
tasoapproksimaatio. Vaikutus näkyy ensisijaisesti desentraatiossa, ei voimakkuudessa.

---

## 6. Toleranssitaulukoiden vyöhykeavaimet

`tolerance.ts` valitsee vyöhykkeen näin: sfääri vahvimman meridiaanin |voimakkuudella|,
sylinteri ja akseli |sylinterillä|, prisma |prisman| määrällä. **Tämä on skeeman oletus,
ei standardin lainaus.** Kun `data/tolerances.json` täytetään, avaimet on tarkistettava
standardin tekstistä; jos standardi toleroi päämeridiaanien voimakkuuksia sfäärin ja
sylinterin sijaan, skeema muutetaan — lukuja ei väännetä väärään muottiin.

Myös `borderlineFraction` (oletus 0,9 → "rajalla") on ohjelman oma esitysheuristiikka,
ei standardin luku.

---

## 7. Pyöristyksen kohdefunktio

0,25 D:n ruudukkohaku minimoi etäisyyden **tilattavaan tarkkaan voimakkuuteen**
(suunnitelma §3.6). Vaihtoehto olisi minimoida residuaali **silmällä**, eli ajaa jokainen
ehdokas eteenpäin-mallin läpi. Koska eteenpäin-malli on lineaarinen ja lähellä
identiteettiä, järjestys on lähes sama, mutta ei täsmälleen: anisotropia painottaa
tangentiaalimeridiaania. Suunnitelman kaavaa on noudatettu; vaihtoehto on halpa
lisätä, jos sitä halutaan verrata.

---

## 8. Kantasuunnan 360°-konventio

Toteutettu: 0° tarkastelijan oikealla kummallakin lasilla, kulmat vastapäivään
(sama nollasuunta kuin TABO-akselilla). Siis OD 0° = kanta sisään, OD 180° = kanta ulos;
OS päinvastoin; 90° = ylös molemmilla.

**Tarkistettava linssitalon tilausjärjestelmää vasten ennen käyttöä.** Jos talo käyttää
toista nollasuuntaa, muutos tehdään vain `format.ts`:ään. Väärä etumerkki tässä on
hiljainen ja tuhoisa virhe (§9.1 kohta 3).

---

## 9. Ulkoinen ristiintarkistus — TEHTY 18.10.2026

Vertailu OptiCampuksen laskuria vastaan (https://opticampus.opti.vision/tools/tilt.php),
24 tapausta. OptiCampus ilmoittaa kulmat linssin kallistuksena katselinjaan nähden eikä
korjaa pintaväliä; WrapRx ajettiin samoin (pintaväli 12/12, wrap per linssi, kulmat
mitattu). OptiCampus antaa tuloksen 0,01 D:n ja 1°:n tarkkuudella ja kutsuu sitä
likiarvoksi.

**Yhtäpitävää:**
- Pelkkä panto tai pelkkä wrap, myös vino sylinteri: sfääri ja sylinteri ±0,01 D,
  akseli sama asteen tarkkuudella. Esim. −1,00 −2,00 × 45, wrap 15° → molemmat
  −0,94 −1,89 × 43.
- Yhdistetty panto + wrap ilman sylinteriä: indusoidun sylinterin akseli sama
  (18/15 → 49 vs 49,1; 15/18 → 39 vs 38,5; 20/20 → 43 vs 43,2). Kallistusten
  yhdistäminen (kiertojärjestys, τ ja μ) on siis sama malli.
- Oikea ja vasen silmä peilautuvat samoin, eli wrapin etumerkki on yhteneväinen.
- Johto `derivations.md` tapaus 4 (−4,00, panto 20°, n 1,586): OptiCampus −3,41 −0,45 × 90,
  WrapRx exakti −3,40 −0,45 × 90, Martin −3,42 −0,44 × 90.

**Eroavaa:**
1. **Suuri kallistus ja vahva linssi:** ero 0,03–0,07 D. Esim. −8,00, wrap 30°:
   OptiCampus −5,56 −1,85, WrapRx exakti −5,50 −1,83, Martin −5,67 −1,75.
   OptiCampuksen tulos on exaktin ja Martinin välissä, mikä sopii sen omaan
   ilmoitukseen likiarvosta. WrapRx:n exakti haara on tarkistettu käsinjohdolla ja
   riippumattomalla numeerisella toteutuksella, joten tämä ero ei ole merkki virheestä.
2. **Yhdistetty panto + wrap ja vino sylinteri:** akseliero 1,7–3,1°. Esim. 18°/15°:
   −3,00 −2,00 × 120 → OptiCampus × 109, WrapRx × 112,1; −1,00 −3,00 × 90 →
   × 84 vs × 86,1. Ero kasvaa sylinterin mukana: 3 D:n sylinterillä 2° vastaa noin
   0,2 D:n jäännössylinteriä. Tämä on kohdan 3 mallirajaus (linssitason kannan kierto),
   ks. sieltä.

Johtopäätös: perusmalli (kertoimet, kallistusten yhdistäminen, etumerkit) on sama.
Ainoa kliinisesti merkittävä ero on kohdan 3 kysymys. Johto (derivations.md tapaus 10)
osoitti, että **kumpikaan ei ole oikein yhdistetyssä kallistuksessa**: oikea tilausakseli
on nykyisestä 2,4° (18°/15°) toiseen suuntaan kuin OptiCampus. Säteenjuoksulla
OptiCampuksen tilauksen jäännösvirhe on noin kaksinkertainen WrapRx:n nykyiseen nähden.

Valmistajan kompensoitua dataa ei ole. `npm run validate:lab` on valmis ottamaan sen
vastaan, ja se raportoi suoraan, tulkitseeko valmistaja wrapin per linssi vai
kokonaisarvona ja käyttääkö exaktia vai approksimoitua kerrointa.

---

## 10. Martinin ristitermin kerroin

Martinin sarjakehitelmä antaa arvot vain sagittaali- ja tangentiaalisuunnalle. Vinolle
sylinterille tarvitaan myös ristitermin kerroin; toteutus käyttää geometrista keskiarvoa
`√(k_tan · k_sag)`, joka yhtyy exaktiin muotoon toiseen kertalukuun asti. Vertailu
ulkoisiin työkaluihin ei koskaan koettele tätä, koska ne käsittelevät vain
kallistusmeridiaanille asettuvia sylintereitä.

## 11. Prisman käännös: kaksi valintaa, jotka suunnitelma jättää auki (P2)

### 11.1 Mitä "tilattava prisma" tarkoittaa

Suunnitelman §3.5 pysähtyy kiilaan: *"etsitään kiilakulma ja kanta-suunta, joilla
kallistetun linssin poikkeutus vastaa haluttua."* Se ei sano, missä muodossa tulos
ilmoitetaan linssitalolle. Kiilakulmaa ei tilata — tilataan prisma.

**Toteutettu valinta:** tilattava prisma on saman kiilan poikkeutus **kallistamattomana**
eli focimetrin geometriassa. Perustelu: juuri sen linssitalo mittaa ja siihen se sitoutuu.
Kiila on välimuuttuja, joka ei näy tilausrivillä.

Ketju on siis:

```
resepti (tavoite silmällä)
  -> kiila, jonka poikkeutus KALLISTETUSSA kehyksessä on tavoite
  -> saman kiilan poikkeutus KALLISTAMATTOMANA = tilattava nimellisprisma
  -> pyöristys linssitalon askeleeseen
  -> pyöristetystä nimellisarvosta takaisin kiilaksi ja eteenpäin kallistettuun
     kehykseen = mitä pyöristetyllä tilauksella oikeasti toteutuu
```

**Tarkistettava linssitalolta**, samaan tapaan kuin kantasuunnan nollasuunta (kohta 8):
mittaako talo prisman focimetrillä linssi suorassa (oletus tässä) vai ilmoittaako se
prisman jossakin muussa asennossa? Jos jälkimmäinen, muutos osuu tähän yhteen kohtaan.

### 11.2 Kiilan parametrisointi ja nollan lähistö — RATKAISTU 18.10.2026 ✅

Suunnitelma määrää 2D-juurenhaun napakoordinaateissa (kiilakulma, kantasuunta) ja
erikoistapauksen |P| < 0,05 pd, koska *"nollaprisman lähellä jakobiaani on lähes
singulaarinen"*.

**Toteutettu valinta:** kiila esitetään sisäisesti **karteesisena** vektorina
w = (w_h, w_v) linssitason kannassa. Silloin kiilakulma on |w| ja kanta w:n suunta, ja
poikkeutus on w:n sileä funktio myös nollan läpi. Singulariteetti oli parametrisoinnissa,
ei tehtävässä: napakoordinaateissa kantasuunta ei ole määritelty, kun kiilakulma on nolla.

Suunnitelman erikoistapaus on silti toteutettu — nollan lähellä otetaan yksi lineaarinen
askel ilman iteraatiota — mutta se on nyt nopeutus, ei singulariteetin kiertäminen.

Suunnitelman lause *"tilattava prisma = kallistuksen indusoiman prisman vastaluku"*
ei sovellu tähän malliin: kiilamallissa tasopaksu levy (kiilakulma 0) ei poikkeuta
sädettä millään kallistuksella, joten kallistus ei sinänsä indusoi prismaa. Nolla-
tavoite antaa nollakiilan. Kallistuksen vaikutus näkyy siinä, että sama kiila
poikkeuttaa kallellaan eri määrän kuin suorassa — ei siinä, että kallistus tuottaisi
prismaa tyhjästä.

**Päätös 18.10.2026:** käyttäjä (optikko) vahvisti tulkinnan, että suunnitelman lause oli
epätarkka ja nollatavoite = nollaprisma tilaukseen. Perustelu tilaustermein: kriteerin
(A) mukaan OC on katselinjan lävistyspisteessä, jossa pinnat ovat yhdensuuntaiset;
kallistus siirtää sädettä mutta ei käännä sitä. Vaihtoehto — desentraation
Prentice-prisman kompensointi tilanteessa, jossa OC jää katselinjan ohi — hylättiin
tarpeettomana. Mallia ei muuteta.

Alkuarvaus on lineaarinen askel nollasta (J(0)⁻¹·tavoite) eikä suunnitelman karkea
ruudukkohaku; ruudukko on jäljellä varasuunnitelmana, jos Newton ei suppene
lineaarisesta arvauksesta. Syy: tehtävä on lähes lineaarinen, ja lineaarinen arvaus on
tarkempi kuin 0,5°:n ruudukko.

### 11.3 Mallin määrittelyalue

`wedgeDeviation` palauttaa `null`, jos kiilakulma on 90° tai enemmän: sen yli etupinnan
normaali kääntyy poispäin tulevasta valosta eikä kyseessä ole enää linssin pinta. Raja
löytyi testatessa — ilman sitä juurenhaku vaelsi 253°:n "kiilaan", joka on matematiikkaa
muttei geometriaa.

Huom: prisman **suuruus** ei ole tässä mallissa rajoite. Poikkeutus kasvaa rajatta, kun
lähtevä säde lähestyy takapinnan sivuamista, joten mikä tahansa prisma on periaatteessa
saavutettavissa — järjettömän suurella kiilakulmalla. Käytännön raja tulee
`validate.ts`:stä, joka rajaa reseptin prisman 20 pd:hen.
