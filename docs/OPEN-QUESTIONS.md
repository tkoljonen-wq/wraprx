# Avoimet mallikysymykset

Suunnitelman §9.1 kohta 5 sanoo: *"Jos jokin kaava näyttää väärältä, kysy — älä korjaa
arvaamalla."* Tämä tiedosto on se kysyminen. Jokainen kohta on toteutettu jollakin
valinnalla, valinta on kirjattu koodin kommenttiin ja se on **muutettavissa yhdessä
paikassa**. Mikään näistä ei estä P0:aa, mutta jokainen vaikuttaa lukuihin.

---

## 1. OC-korkeuden kriteeri — RATKAISTU 1.9.2026 ✅

**Päätös: (A) katselinjan lävistyspiste.** Käyttäjä (optikko) vahvisti kriteerin
1.9.2026 selityksen ja sivukuvan perusteella. Tilauslomakkeelle ja tuloskortin
pääluvuksi menee `ocHeightMm` (esimerkkitapauksessa 22,45 mm). Vaihtoehto (B) jää
vertailuluvuksi laskentajälkeen (`opticalAxisOcHeightMm`), samoin nyrkkisääntö
(`vogelOcHeightMm`). `geometry.ts`:n funktiota `decentration` ei muuteta.

**Yhä auki, ei laskentakysymys vaan tilauskäytäntö:** tekeekö linssitalo panto-pudotuksen
itse annetusta korkeudesta? Jos tekee, pudotus tulisi kahdesti tai kompensaatio menisi
hukkaan. Tämä on varmistettava linssitalolta ennen ensimmäistä oikeaa tilausta ja se
kuuluu tilauslomakkeen saatetekstiin (P3), ei laskentaan.

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

**Ratkaisu vaati** optikon kannan siihen, mitä lukua tilauslomakkeelle halutaan.
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

## 9. Ulkoinen ristiintarkistus

Suunnitelman §5.3 mainitsema ristiintarkistus OptiCampuksen Lens Tilt & Wrap -laskuria
vastaan **Martin-tilassa** on tekemättä. Se on ainoa käytettävissä oleva riippumaton
ulkoinen lähde, ja se kelpaa vain approksimaatiohaaran validointiin.
`test/cases/derivations.md` tapaus 4 on valmis vertailukohta (−4,00 sph, panto 20°:
Martin −3,858 +0,437 ax 180).

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

### 11.2 Kiilan parametrisointi ja nollan lähistö

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
prismaa tyhjästä. **Jos tämä lause tarkoitti jotain muuta, kysy.**

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
