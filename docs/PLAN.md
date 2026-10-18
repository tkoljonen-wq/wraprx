# WrapRx — kompensoidun linssitilauksen laskuri

**Suunnitelma v0.5 · 17.8.2026 · valmis toteutuksen pohjaksi**

Selainsovellus, joka laskee reseptistä ja kehysparametreista sen voimakkuuden, joka linssiin pitää tilata, jotta käyttäjän silmällä toteutuu haluttu korjaus.

> **Muutokset v0.4 → v0.5**
> - **Desentraatio lasketaan kierretyssä linssitasossa, ei boxing-tasossa.** Boxing-kaava (A + DBL − PD)/2 pätee vain suoralle kehykselle; wrap-kehyksessä katselinja lävistää kallistetun linssin eri kohdassa. Tämä on perusgeometriaa eikä valinnainen tarkennus — aina käytössä, ei lipun takana (§3.3).
> - **Toleranssiarvio kahdella standardilla.** Tilattava linssi arvioidaan ISO 8980-1:tä vasten, käytössä toteutuva ISO 21987:ää vasten. Aiempi versio sekoitti nämä; ne ovat eri standardit eri kohteille (§3.6, §9).
> - **Prismakäännöksen varamenetelmä korjattu.** "2D-bisektiota" ei ole olemassa; tilalle vaimennettu Newton ja ruudukkosiemen, nollaprisma erikoistapauksena (§3.5).
> - **Viitekenttä ei serialisoidu URL-hashiin.** Tietosuojalupaus kestää myös käyttäjän virheen (§4, §7).
> - **Referenssitapausten johto dokumentoidaan riippumattomasti.** Aiemmista istunnoista periytyviä lukuja ei hyväksytä referenssiksi ilman uudelleenjohtoa — kehäpäättelyn esto (§5).

> **Muutokset v0.3 → v0.4**
> - **Flat-rakenne monorepon tilalle.** Yksi Vite-projekti, ei workspace-konfiguraatiota. Ydin ja käyttöliittymä eriytetään hakemistorajalla (`src/optics/` ja `src/ui/`), ei pakettirajalla.
> - **Rajatesti korvaa pakettirajan.** Koska hakemistoraja ei estä mitään mekaanisesti, se valvotaan testillä: `src/optics/` ei saa importoida mitään ulkopuoleltaan eikä koskea DOM:iin. Ilman tätä testiä ero monorepoon olisi pelkkä lupaus.
> - Polut ja hyväksymiskriteerit päivitetty (§4, §5, §6, §9).

> **Aiemmin ratkaistut rajaukset**
> Vain yksiteho. Base curve -malli ominaisuuslipun takana, oletuksena pois. Valmistajan referenssidataa ei vielä ole; tilalle sisäinen verifiointi kahdella riippumattomalla toteutuksella.

---

## 1. Mitä ohjelma tekee

Yhdellä lauseella: **käännetään laskenta väärinpäin.** Perinteinen laskuri kertoo, mitä käyttäjä saa, kun linssi on kallellaan. Tämä kertoo, mitä pitää tilata, jotta kallellaan oleva linssi tuottaa oikean tuloksen.

```
Resepti (refraktion pintavälillä)
   │
   ├─ 0. Validointiportti       yksiteho? kulmat järkevät? linssitalo kompensoi itse?
   ├─ 1. Normalisointi          plus/miinussylinteri → päämeridiaanit → voimakkuusmatriisi
   ├─ 2. Pintavälikorjaus       refraktion pintaväli → käytön pintaväli
   ├─ 3. Linssitason geometria  kehyksen wrap/tilt (+ base curve, jos päällä) → τ, μ
   ├─ 4. OCR-käännös            haluttu käytössä → tilattava nimellisvoimakkuus
   ├─ 5. Prismakäännös          haluttu poikkeutus käytössä → tilattava prisma + kanta
   ├─ 6. Desentraatio & OC      desentraatio kierretyssä linssitasossa, OC-korkeus, Prentice
   │
   ├─ 7a. TARKKA TULOS ────────────┐
   └─ 7b. 0,25 D PYÖRISTETTY ──────┤
                                   │
      8. Takaisinlaskenta molemmille: eteenpäin-malli → mitä käyttäjä todella saa
         → residuaalivirhe, toleranssi (8980-1 tilattavalle, 21987 käytössä), hyötyarvio
```

Kohta 8 erottaa tämän tavallisesta laskurista. Ohjelma ei vain tuota lukuja vaan **tarkistaa itsensä**: se simuloi tilatun linssin käytössä ja näyttää jäännösvirheen kummallekin tarkkuudelle erikseen.

**Rajaus: vain yksiteholinssit.** Moniteho ja bifokaali tunnistetaan ja hylätään validointiportissa selkeällä viestillä. Perustelu on optinen, ei laiskuus: monitehossa kompensointi kuuluu valmistajan freeform-pintalaskentaan, jossa huomioidaan myös vyöhykkeiden geometria ja katselinjan muutos etäisyyden mukana. Keskiövoimakkuuden korjaaminen ei riitä eikä ole edes oikea kohta, johon korjaus kuuluisi.

---

## 2. Syöttöparametrit

### 2.1 Pakolliset

| Parametri | Yksikkö | Huomiot |
|---|---|---|
| Sfääri, sylinteri, akseli | D, D, ° | Erikseen OD/OS, sylinterimuoto valittavissa |
| Prisma + kanta | pd, ° tai in/out/up/down | Erikseen OD/OS |
| Pantoskooppinen kaltevuus | ° | Yksi arvo, oletetaan sama molemmille |
| Wrap | ° | **Valitsin: kokonais vai per linssi** — yleisin virhelähde |
| PD | mm | Monokulaarinen, erikseen OD/OS |
| Pintaväli, refraktio | mm | Ks. 2.2 |
| Pintaväli, käyttö | mm | Ks. 2.2 |
| Materiaali / taitekerroin | — | Kirjastosta tai käsin |

### 2.2 Ehdotan lisättäväksi

Jokainen näistä muuttaa lopputulosta enemmän kuin base curve.

**1. Pintaväli kahdesti: refraktion ja käytön.**
Yksi pintavälilukema ei riitä. Resepti on mitattu jollain etäisyydellä (foropteri ~12–13,5 mm, koekehys mitattuna) ja käytetään toisella. Kompensointi tarvitsee erotuksen. Ilman tätä ohjelma laskee kolmella desimaalilla väärästä lähtöarvosta.

**2. Sovituskorkeus ja kehysmitat (A, B, DBL, ED).**
Tarvitaan vaakadesentraatioon (A + DBL − PD)/2, OC-korkeuteen, aihion kokoon ja base curve -mallin sagittakorjaukseen.

**3. Silmän kiertokeskiön etäisyys (CRA), oletus 13,5 mm sarveiskalvosta.**
Pantoskooppinen kaltevuus ei ole vain optinen vaan geometrinen ilmiö: silmä kiertää, linssi ei. Tämä tarvitaan siihen, että OC osuu siihen pisteeseen, josta katsotaan — eli että laskettu kompensointi toteutuu oikeassa kohdassa. Nyrkkisääntö "1 mm per 2°" on tämän karkea approksimaatio.

**4. Abbe-luku.**
Ei vaikuta voimakkuuteen mutta on välttämätön prismavaroituksessa. Polykarbonaatti (ν ≈ 30) ja 2 pd kanta ulos → TCA = P/ν ≈ 0,07 pd, jo värireunojen kynnyksellä.

**5. Linssitalon profiili.**
Sylinterimuoto, akselin askel, prisma-askel, valinnainen kolmas pyöristysaskel (0,12 D lasille), **ja tekeekö linssitalo kompensoinnin itse.** Viimeinen on tärkein: jos tilausjärjestelmä ottaa vastaan wrap- ja panto-arvot, tämän ohjelman tuloksia ei saa tilata. Ohjelma näyttää tällöin varoituksen ja alkuperäisen reseptin, ei kompensoitua.

**6. Kanta-suunnan notaatio.**
360°-järjestelmä vai in/out/up/down. Molemmat näytetään rinnakkain väärinymmärrysten estämiseksi.

**7. "Mitattu vai nimellinen" -lippu wrapille ja pantolle.**
Kehysvalmistajan spec vs. kasvoilta mitattu. Kirjautuu tilausdokumenttiin ja vaikuttaa luottamusarvioon.

**8. Base curve (valinnainen, oletuksena pois).** Ks. §3.3.

**9. Vapaa viitekenttä (tilausnumero).** Ei henkilötietoja — ks. §7.

---

## 3. Laskentaydin

`src/optics/`: puhdas TypeScript, **ei importteja hakemiston ulkopuolelta, ei DOM-viittauksia**. Sama koodi toimii selaimessa, Node-skripteissä ja testeissä. Tämä on projektin arvokas osa; käyttöliittymä on vaihdettavissa, ydin ei.

### 3.1 Voimakkuusmatriisi

```
Fxx = S + C·sin²α
Fyy = S + C·cos²α
Fxy = −C·sin α·cos α
```
Takaisin: `C = √((b−a)² + 4c²)`, `2α = atan2(−2c, b−a)`, `S = (a+b−C)/2`.

### 3.2 Pintavälikorjaus

**Päämeridiaaneittain, ei matriisille.** Kaava `F' = F/(1 − Δd·F)` on epälineaarinen, joten matriisikomponenteille sovellettuna se antaa väärän sylinterin. Transponoi päämeridiaaneihin, korjaa erikseen, kokoa takaisin.

### 3.3 Linssitason todellinen kallistuskulma

**Perusmalli** (aina käytössä):
```
cos τ = cos(wrap_per_lens) · cos(panto)
n̂    = (±sin φ, −cos φ·sin θ, cos φ·cos θ)     merkki ± = OD/OS
μ    = atan2(n̂_y, n̂_x)                        tangentiaalimeridiaani, mod 180°
```
μ ei ole 0° eikä 90° kun molempia kallistuksia on — siksi akseli kiertyy vaikka reseptin akseli olisi 180°.

**Base curve -korjaus — ominaisuuslippu, oletuksena POIS.**
Laskee todellisen kallistuksen siinä pisteessä, josta katsotaan: etupinnan säde `r = (1,53 − 1)/BC`, vaakapoikkeama h optiselta akselilta antaa lisäkulman `asin(h/r)`; sama pystysuunnassa sovituskorkeudelle. 8 ds:llä ja 4 mm desentraatiolla noin 3,5° — samaa luokkaa kuin virhe, jota kompensoidaan.

Oletuksena pois kahdesta syystä: se lisää kaksi parametria, joita ei aina tiedetä, ja mallin oma epävarmuus (missä pisteessä katselinja tarkalleen lävistää pinnan) on samaa kokoluokkaa kuin korjaus, jonka se tuo. Se on siis tarkennus asiantuntijan käyttöön, ei oletusarvo.

**Testattava invariantti:** lipun ollessa pois päältä tulos on identtinen riippumatta `baseCurve`-kentän arvosta. Base curve -kenttä ei myöskään näy käyttöliittymässä ennen kuin lippu kytketään.

**Desentraatio kierretyssä linssitasossa** (aina käytössä, ei lipun takana):
Boxing-kaava (A + DBL − PD)/2 pätee vain suoralle kehykselle. Wrap-kehyksessä katselinja lävistää kallistetun linssin eri kohdassa, joten desentraatio ja OC-korkeus lasketaan projisoimalla katselinja (CRA:n kautta, suoraan eteen katsottaessa) linssin normaalin n̂ määrittämään kierrettyyn tasoon ja mittaamalla poikkeama linssin geometrisesta keskipisteestä siinä koordinaatistossa. Tämä vastaa linssitalojen "kompensoitua PD:tä". Vaikutus on samaa suuruusluokkaa kuin base curve -korjaus, mutta toisin kuin se, tämä ei ole valinnainen tarkennus vaan perusgeometriaa — ilman sitä vaihe 6 kompensoisi voimakkuuden oikein mutta sijoittaisi OC:n väärään kohtaan. Boxing-tason arvo näytetään välitulospaneelissa vertailulukuna, samaan tapaan kuin nyrkkisäännöt (§9.1 kohta 4). Invariantti: wrap = 0 ja panto = 0 → kierretyn tason desentraatio yhtyy boxing-kaavaan.

### 3.4 OCR-kertoimet

Exakti muoto (Coddingtonin yhtälöistä ohuelle linssille), ei sarjakehitelmä:
```
sin τ' = sin τ / n
k_sag   = (n·cos τ' − cos τ)/(n − 1)
k_tan   = k_sag / cos²τ
k_risti = k_sag / cos τ
```
Käännös: kierrä matriisi (t,s)-kantaan, jaa komponentit kertoimilla, kierrä takaisin. Analyyttinen, ei iteraatiota.

Martinin sarjakehitelmä (`1 + sin²τ/(2n)`) toteutetaan rinnalle vertailufunktiona, jotta tuloksia voi verrata OptiCampuksen kaltaisiin työkaluihin. Ero <0,01 D 25°:een asti, kasvaa isoilla kulmilla.

### 3.5 Prisma

Approksimaatiot eivät kelpaa, koska prisman käyttäytyminen riippuu kallistuksen suunnasta kanta–kärki-akseliin nähden.

- Linssi mallinnetaan kiilana: takapinnan normaali + etupinnan normaali kiilakulman verran kierrettynä kannan suuntaan.
- Exakti vektorimuotoinen Snell kahdella pinnalla, tulossuunta (0,0,−1).
- Poikkeutus puretaan vaaka- ja pystykomponenteiksi prismadioptrioina.
- **Käännös:** etsitään kiilakulma ja kanta-suunta, joilla kallistetun linssin poikkeutus vastaa haluttua. 2D-juurenhaku: Newton numeerisella jakobiaanilla ja askelpituuden puolituksella (vaimennettu Newton — bisektio ei yleisty kahteen ulottuvuuteen), alkuarvaus karkeasta ruudukkohausta. Toleranssi 0,001 pd, iteraatiokatto ja epäonnistumisesta selkeä virhe, ei hiljainen huonoin arvaus.
- Nollaprisman lähellä jakobiaani on lähes singulaarinen: |P| < 0,05 pd käsitellään erikoistapauksena ilman iteraatiota (tilattava prisma = kallistuksen indusoiman prisman vastaluku). *Tarkennus 18.10.2026: kiilamallissa kallistus ei indusoi prismaa OC:n kohdalla, joten nollatavoite antaa nollaprisman; ks. OPEN-QUESTIONS 11.2.*

Erikseen: Prentice-prisma desentraatiosta kompensoidulla voimakkuudella, silmien välinen pystyero (varoituskynnys 1,0 pd), TCA = P/ν.

### 3.6 Kaksi tulostarkkuutta

Ohjelma tuottaa **aina molemmat**, rinnakkain, ilman että käyttäjä valitsee.

| | Tarkka | 0,25 D |
|---|---|---|
| Sfääri, sylinteri | 0,01 D | 0,25 D |
| Akseli | 1° | 1° |
| Prisma | 0,01 pd | 0,25 pd |
| Käyttötapaus | freeform-tilaus, järjestelmä joka ottaa tarkat arvot | varastolinssi, perinteinen tilaus |

**0,25 D:n arvo ei ole naiivi komponenttipyöristys.** Sfäärin, sylinterin ja akselin pyöristäminen toisistaan riippumatta ei minimoi virhettä. Sen sijaan haetaan sallitusta ruudukosta se kombinaatio, joka minimoi dioptrisen etäisyyden tavoitteesta:

```
haku: sph ∈ {naiivi ± 0,25}, cyl ∈ {naiivi ± 0,25}, akseli ∈ {naiivi ± 1…5°}
kohde: min ‖M(ehdokas) − M(tavoite)‖_F     (Frobenius, voimakkuusmatriiseille)
```
Muutamia kymmeniä ehdokkaita, mikrosekunteja. Jos tulos poikkeaa naiivista pyöristyksestä, se näytetään erikseen.

**Molemmille tarkkuuksille ajetaan takaisinlaskenta ja näytetään:**
- toteutuva voimakkuus silmällä (sfääri/sylinteri/akseli)
- residuaali suhteessa reseptiin, sekä sfäärisylinterinä että yhtenä lukuna
- toleranssiverdikti kahdella standardilla: **tilattava linssi vs. ISO 8980-1** (irtolinssin tilaustoleranssi — se, mitä valmistajalta voi vaatia) ja **käytössä toteutuva vs. ISO 21987** (kehystetyt lasit — se, mitä käyttäjä saa). Verdiktit: sisällä / rajalla / ulkona / ei arvioitu. Taulukot ovat erimuotoiset, joten ne ovat datassa erillisinä standarditunnisteella.
- **hyötyarvio:** jos 0,25 D:n pyöristetyn kompensoinnin residuaali on yhtä suuri tai suurempi kuin kompensoimattoman reseptin residuaali, ohjelma sanoo suoraan: *"kompensointi ei tuo hyötyä tässä silmässä 0,25 D:n askeleella — tilaa alkuperäinen resepti."* Matalilla voimakkuuksilla tämä tilanne on yleinen, ja ilman varoitusta ohjelma tuottaisi turhaa työtä ja väärää varmuuden tunnetta.

### 3.7 Laskentajälki

Ydin palauttaa `CalcResult`-olion, jossa on `trace`-kenttä: jokainen välivaihe nimettynä (τ, μ, k-kertoimet, matriisit ennen ja jälkeen, kiilakulma, juurenhaun iteraatiot). Sama jälki syöttää käyttöliittymän välitulospaneelin ja testien snapshotit. Yksi lähde, kaksi käyttöä — ja MDR-mielessä jäljitettävyys ilman erillistä lokitusta.

---

## 4. Arkkitehtuuri

| Kerros | Valinta | Perustelu |
|---|---|---|
| Kieli | TypeScript, strict | Yksikkövirheet (D vs. mm vs. °) ovat tässä domainissa todellinen riski. Brändätyt tyypit `Dioptre`, `Degree`, `Millimetre`, `PrismDioptre` estävät ne käännösaikana. |
| Rakennus | Vite, yksi projekti | Ei workspace-konfiguraatiota, `base: '/wraprx/'` GitHub Pagesille |
| Käyttöliittymä | Preact + TSX | 3 kB, React-yhteensopiva ajattelutapa, ei ylilyöntejä lomakkeelle |
| Tila | Preact signals | Lomake päivittyy jokaisesta näppäinpainalluksesta, ei "Laske"-nappia |
| Testit | Vitest + fast-check | Yksikkö-, referenssi-, ominaisuus- ja rajatestit samassa ajossa |
| Skriptit | tsx | `scripts/`-hakemiston ajo ilman erillistä buildia |
| Julkaisu | GitHub Actions → Pages | Testit ja tyyppitarkistus porttina; punainen testi ei päädy tuotantoon |
| Offline | vite-plugin-pwa | Toimii liikkeessä ilman verkkoa, asennettavissa tabletin kotinäytölle |

```
wraprx/
├─ src/
│  ├─ optics/                    ydin — ei importteja tämän hakemiston ulkopuolelta
│  │  ├─ units.ts                brändätyt tyypit
│  │  ├─ matrix.ts               voimakkuusmatriisit, transpositiot
│  │  ├─ vertex.ts               pintavälikorjaus
│  │  ├─ geometry.ts             τ, μ, desentraatio, (base curve -sagitta)
│  │  ├─ ocr.ts                  kompensointi ja eteenpäin-malli, exakti + Martin
│  │  ├─ ocr-numeric.ts          riippumaton numeerinen käännös, vain verifiointiin
│  │  ├─ prism.ts                Snell-jäljitys ja käännös (P2)
│  │  ├─ rounding.ts             tarkka + 0,25, ruudukkohaku
│  │  ├─ tolerance.ts            ISO 8980-1 + 21987, toimii tyhjällä datalla
│  │  ├─ validate.ts             validointiportti, mm. yksitehorajaus
│  │  ├─ format.ts               sylinterimuodot, kanta-notaatiot, tekstiulostulo
│  │  ├─ trace.ts                CalcTrace
│  │  └─ index.ts                solve(input) → CalcResult · ainoa julkinen pinta
│  ├─ ui/
│  │  ├─ App.tsx
│  │  ├─ components/             syöttökentät, tuloskortit, varoitukset
│  │  ├─ views/                  laskuri, presetit, tietoja
│  │  ├─ state/                  signals, URL-hash-serialisointi, localStorage
│  │  ├─ flags.ts                ominaisuusliput (baseCurveModel: false)
│  │  └─ i18n/                   fi.ts (vain suomi)
│  └─ main.tsx
├─ data/
│  ├─ materials.json             n, Abbe, tiheys, kauppanimet, lähde per rivi
│  └─ tolerances.json            ISO 8980-1- ja 21987-taulukot standarditunnisteella — tyhjä kunnes täytetty lähteestä
├─ test/
│  ├─ reference.test.ts          tunnetut tapaukset
│  ├─ property.test.ts           fast-check
│  ├─ consistency.test.ts        analyyttinen vs. numeerinen käännös
│  ├─ boundary.test.ts           ydinhakemiston eristys, ks. alla
│  └─ cases/
│     ├─ internal.json           omat referenssitapaukset
│     └─ lab/                    tyhjä — valmistajadatalle, ks. §5
├─ scripts/
│  └─ validate-lab-data.ts       ajaa ytimen valmistajadataa vastaan
├─ index.html
├─ vite.config.ts                alias @optics → src/optics
└─ .github/workflows/ci.yml
```

**Miksi flat eikä monorepo.** Ydin ja käyttöliittymä on syytä pitää erillään, mutta workspace-mekanismi ei ole se, mikä ne erillään pitää — sääntö on. Flat-rakenne antaa saman erottelun ilman `package.json`-puuta, workspace-resoluutiota ja kahta riippuvuuslistaa, ja se on Claude Codelle huomattavasti vähemmän kitkaa ensimmäisessä istunnossa. Jos ydin joskus tarvitaan toiseen projektiin, `src/optics/` on itsenäinen hakemisto ilman ulkoisia importteja: se kopioidaan tai irrotetaan omaksi paketiksi silloin, ei nyt.

**Rajatesti (`test/boundary.test.ts`) on tämän päätöksen hinta ja ehto.** Hakemistoraja ei estä mitään mekaanisesti, joten se valvotaan testillä, joka skannaa `src/optics/**/*.ts`:
- ei importteja hakemiston ulkopuolelta, ei `@ui`, ei `preact`, ei relatiivisia polkuja ylös
- ei viittauksia `window`, `document`, `localStorage`, `navigator`
- ei importteja `data/`-hakemistosta — toleranssi- ja materiaalidata annetaan parametrina, ei luetaan tiedostosta

Ilman tätä testiä flat-rakenteen ero monorepoon on pelkkä lupaus, ja ensimmäinen kiireinen commit rikkoo sen. Testi on lyhyt ja ajetaan CI:ssä.

**Tilan säilytys.** `localStorage` presetteihin (kehykset, materiaalit, linssitaloprofiilit) ja viimeiseen laskentaan. URL-hash laskennan tilalle → laskennan voi lähettää linkkinä kollegalle tai linssitalolle ilman että data kulkee palvelimen kautta. **Poikkeus: vapaa viitekenttä (§2.2 kohta 9) ei serialisoidu URL-hashiin.** Jos joku ohjeista huolimatta kirjoittaa kenttään nimen, se ei saa päätyä jaettavaan linkkiin ja selainhistorioihin. Viite säilyy vain localStoragessa laitteella.

**Käyttöliittymä.** Kaksi palstaa: vasemmalla syöttö, oikealla tulos, joka päivittyy elävästi. Tulos kolmena tasona:

1. **Tilattava** — kaksi korttia rinnakkain, *Tarkka* ja *0,25 D*. Arvo isolla, kopiointinappi, molemmat sylinterimuodot, prisma molemmissa notaatioissa.
2. **Tarkistus** — kummankin kortin alla toteutuva voimakkuus, residuaali, toleranssiverdikti, hyötyarvio.
3. **Välitulokset** — τ, μ, kertoimet, kiilakulma, laskentajälki. Kokoontaitettu. Tämä on se osa, jolla tarkistat ettei ohjelma valehtele.

Käyttö tapahtuu liikkeessä, mahdollisesti tabletilla, mahdollisesti asiakas vieressä: isot kosketuskohteet, numeronäppäimistö numeerisille kentille, ei modaaleja, näppäimistöfokus näkyvissä.

**Versionäkyvyys.** Build upottaa versionumeron ja git-SHA:n. Ne näkyvät käyttöliittymän alalaidassa tuloksen yhteydessä. Laskurin tulos on jäljitettävissä tiettyyn koodiversioon.

---

## 5. Testaus ilman ulkoista referenssiä

Linssitalon kompensoituja arvoja ei ole vielä käytettävissä. Se muuttaa testistrategiaa mutta ei estä P0:aa: ulkoinen referenssi vahvistaisi, että **oletukset** ovat oikeat, ja sisäinen verifiointi vahvistaa, että **toteutus** vastaa oletuksia. Jälkimmäinen on se, mikä koodissa yleensä menee rikki.

**1. Kaksi riippumatonta toteutusta.** Tämä on tärkein korvike ulkoiselle datalle.
Analyyttinen käännös (`ocr.ts`, §3.4) toteutetaan normaalisti. Sen rinnalle `ocr-numeric.ts`: tyhmä numeerinen käännös, joka iteroi eteenpäin-mallia kunnes tulos vastaa reseptiä. Kaksi eri tietä samaan lukuun. Testi vaatii yhtäpitävyyttä 1e-6 D:n tarkkuudella satunnaisilla syötteillä. Jos analyyttisessä johdossa on merkkivirhe tai ristitermin kerroin väärin, tämä testi kaatuu — vaikkei kukaan tietäisi oikeaa vastausta. `ocr-numeric.ts` jää pysyvästi repoon verifiointityökaluna, ei tuotantopolulle.

**2. Ominaisuustestit (fast-check, satunnaisgeneroidut syötteet):**
- `forward(inverse(Rx)) ≈ Rx` alle 1e-6 D:n tarkkuudella.
- τ = 0 → kompensointi on identiteetti.
- Peilisymmetria: OD ja OS tuottavat peilikuvatulokset, kun resepti peilataan (akseli 180−α).
- Sylinteri = 0 → tulos on puhdas sfääri + kallistuksen indusoima sylinteri akselilla μ.
- Monotonisuus: kompensoinnin suuruus kasvaa monotonisesti τ:n mukana.
- Matriisi → resepti → matriisi häviötön kaikilla akseleilla, myös 0° ja 90°.
- Prisma: τ = 0 → tilattava = määrätty; kallistus kanta–kärki-akselin ympäri ei muuta magnitudia.
- Pyöristys: ruudukkohaun tulos on aina yhtä hyvä tai parempi kuin naiivi, koskaan huonompi.
- Base curve -lippu pois → tulos identtinen riippumatta `baseCurve`-kentän arvosta.
- Desentraatio: wrap = 0 ja panto = 0 → kierretyn tason desentraatio yhtyy boxing-kaavaan; kulmien kasvaessa ero kasvaa monotonisesti.

**3. Sisäiset referenssitapaukset** (`test/cases/internal.json`) — käsin lasketut, dokumentoidulla johdolla. **Johdon on oltava riippumaton toteutettavasta koodista:** jokaiselle tapaukselle kirjataan `test/cases/derivations.md`:hen laskureitti (esim. Martin käsin, exaktin ero eriteltynä, välivaiheet näkyvissä). Aiemmista istunnoista tai samasta koodista peräisin olevia lukuja ei hyväksytä referenssiksi ilman uudelleenjohtoa — muuten testi vain toistaa oletukset, joita sen pitäisi tarkistaa. Alla olevat odotusarvot ovat ehdollisia kunnes johto on kirjattu:
- Oma tapauksesi: OD −1,00 +0,50 ax 175 / OS −1,75 +2,00 ax 170, wrap 15°/linssi, panto 18°, PC → tarkka OD −0,90 +0,48 ax 169 / OS −1,50 +1,72 ax 172; 0,25 D → OD −1,00 +0,50 ax 169 / OS −1,50 +1,75 ax 172.
- Ristiintarkistus OptiCampuksen Lens Tilt & Wrap -laskuria vastaan Martin-tilassa (±0,01 D). Tämä on ainoa käytettävissä oleva riippumaton ulkoinen lähde, ja se kelpaa vain approksimaatiohaaran validointiin.
- Degeneroituneet tapaukset: plano, puhdas sylinteri, akseli 0/90/180, τ = 0, prisma = 0.

**4. Paikka valmistajadatalle heti.**
`test/cases/lab/` ja `scripts/validate-lab-data.ts` toteutetaan P0:ssa vaikka kansio on tyhjä, dokumentoidulla CSV-skeemalla:

```csv
lab,lens,index,rxSph,rxCyl,rxAxis,rxPrism,rxBase,panto,wrap,wrapMode,vertexRef,vertexWorn,pd,eye,retSph,retCyl,retAxis,retPrism,retBase
```

Kun saat myöhemmin kaksikymmentä paria tilausjärjestelmästä, ne pudotetaan kansioon eikä mitään tarvitse refaktoroida. Skripti raportoi eron per tapaus ja hajonnan, ja siitä näkee suoraan, tekeekö valmistaja samat oletukset — erityisesti sen, tulkitseeko se wrapin per linssi ja käyttääkö exaktia vai approksimoitua kerrointa. Tämä on projektin tärkein avoin epävarmuus, ja se on eristetty yhteen skriptiin.

**5. Rajatesti** (`test/boundary.test.ts`) — ks. §4.

**6. Snapshot-testit laskentajäljelle:** jos jokin välivaihe muuttuu vahingossa, testi huomaa vaikka lopputulos pyöristyisi samaksi.

**Rehellisyys tuloksesta.** Kunnes valmistajadataa on, käyttöliittymän Tietoja-näkymässä sanotaan suoraan: laskenta on verifioitu sisäisesti mutta ei validoitu valmistajan kompensointia vastaan. Ero on olennainen, ja se kuuluu käyttäjälle näkyviin.

---

## 6. Vaiheet

| Vaihe | Sisältö | Valmis kun |
|---|---|---|
| **P0** | `src/optics/`: units, matrix, vertex, geometry, ocr, ocr-numeric, rounding, validate, format, trace. Testit + rajatesti + CI. `validate-lab-data.ts` rakenne. | Kaikki §5:n testit vihreinä, ei käyttöliittymää |
| **P1** | `src/ui/`: yksiteho, molemmat silmät, kaksi tuloskorttia, residuaali, varoitukset | Voit tehdä yhden oikean tilauksen ohjelmalla |
| **P2** | `prism.ts` täydellä Snell-mallilla, desentraatio, OC-korkeus, Prentice, TCA | Prismaresepti menee läpi ilman käsilaskuja |
| **P3** | Presetit, PWA/offline, URL-jakaminen | Toimii liikkeessä ilman verkkoa |
| **P4** | ISO-toleranssit oikeasta lähteestä, base curve -lippu, valmistajadatan validointi | Ohjelma osaa kertoa milloin se on väärä työkalu |

P0 ja P1 ovat pieni urakka. P2:n juurenhaku on ainoa kohta, jossa voi mennä aikaa.

---

## 7. Tietosuoja, sääntely, vastuu

**Henkilötiedot.** Ohjelma ei tarvitse eikä pyydä potilastietoja — vain numeroita ja vapaan viitekentän. Kaikki laskenta selaimessa, mitään ei lähetetä minnekään, GitHub Pages ei näe syötteitä. Viitekenttä ohjeistetaan tilausnumerolle, ei nimelle, **eikä se serialisoidu jaettavaan URL-hashiin (§4)** — lupaus kestää siis myös käyttäjän virheen. Näin GDPR-käsittely jää olemattomaksi. Kirjataan README:hen selvästi; se on myös myyntiargumentti sisäisessä käytössä.

**MDR.** En ole juristi eikä tämä ole oikeudellinen arvio, mutta suunnittelun kannalta olennaiset kysymykset kannattaa kirjata alusta:
- Onko työkalu laskuri ammattilaisen käyttöön vai osa laitteen määrittelyä? Rajanveto ratkaisee luokituksen.
- Positiointi: laskenta-apuväline, ei diagnostiikkaa, ei automaattista päätöstä. Optikko vastaa tuloksesta.
- Dokumentoi algoritmi, sen lähteet ja verifiointitulokset. `CalcTrace` + testiraportti + versionumero antavat tämän lähes ilmaiseksi.
- Näkyvä versionumero ja muutosloki tulosnäkymässä.

Jos tämä leviää Silmäaseman muihin liikkeisiin, kysymys on ratkaistava ennen sitä.

**Rajaus.** Ohjelma näyttää selvästi, mitä se **ei** tee: ei monitehoa, ei perifeeristä optimointia, ei freeform-pintalaskentaa. Isoilla kulmilla keskiövoimakkuuden kompensointi on välttämätön mutta ei riittävä, ja ohjelman pitää sanoa se ääneen.

---

## 8. Avoimet kysymykset

| Kysymys | Tila |
|---|---|
| Moniteho mukaan? | **Ratkaistu:** ei, vain yksiteho |
| Base curve -malli oletuksena? | **Ratkaistu:** pois, ominaisuuslipun taakse |
| Valmistajan referenssidata? | **Ratkaistu toistaiseksi:** ei vielä, sisäinen verifiointi tilalle, paikka valmis |
| Monorepo vai flat? | **Ratkaistu:** flat, rajatesti valvoo eristystä |
| Toleranssistandardi: 8980-1 vai 21987? | **Ratkaistu:** molemmat, eri kohteille — 8980-1 tilattavalle linssille, 21987 käytössä toteutuvalle |
| Kenelle ohjelma on? | Avoin. Vain sinulle vai muille optikoille? Jälkimmäinen vaatii lukitut oletukset ja tiukemmat varoitukset |
| Kaksikielisyys | **Ratkaistu 18.10.2026:** vain suomi |
| Tulostettava tilauslomake | **Ratkaistu 18.10.2026:** ei tehdä, tulos riittää näytöllä |
| Ytimen uudelleenkäyttö muissa työkaluissa | Avoin. `src/optics/` on irrotettavissa milloin vain, ei tarvitse päättää nyt |

---

## 9. Toteutusohje

Tämä luku on kirjoitettu koodaajalle — myös silloin kun koodaaja on Claude Code. Suunnitelma tallennetaan repoon (`docs/PLAN.md`) ja tiivistelmä `CLAUDE.md`:hen, jotta ohjeet kulkevat istuntojen välillä.

`CLAUDE.md`:hen vähintään: yksitehorajaus, ydinhakemiston eristyssääntö (§4), §9.1:n kiellot ja se, että `data/tolerances.json` saa olla tyhjä. Nämä neljä ovat asioita, jotka istunto ilman muistia rikkoo ensimmäisenä.

### 9.1 Mitä koodaaja EI saa keksiä itse

Nämä ovat kohtia, joissa uskottava mutta väärä luku on pahempi kuin puuttuva luku. Kielto on tarkoituksellisen jyrkkä.

1. **ISO-toleranssitaulukot (8980-1 ja 21987).** Ei saa arvata, ei täyttää muistista, ei johtaa "tyypillisistä" arvoista, eikä käyttää toisen standardin taulukkoa toisen paikalla. Nämä kopioidaan standardeista tai jätetään toteuttamatta. Jos `data/tolerances.json` on tyhjä tai vain toinen standardi on syötetty, puuttuvan verdikti on `'notAssessed'` ja käyttöliittymä näyttää *"ei arvioitu — toleranssidataa ei syötetty"*. `tolerance.ts` toteutetaan siten, että tyhjä tai osittainen data on normaali tila, ei virhe.
2. **Materiaalien taitekertoimet ja Abbe-luvut.** Kirjataan valmistajan tiedoista. Yleisimmät (PC 1,586/30, CR-39 1,498/58, Trivex 1,532/43) ovat vakiintuneita, mutta korkeaindeksisten tarkat arvot vaihtelevat tuotteittain — lähde merkitään jokaiselle riville `materials.json`:issa.
3. **Kanta-suunnan notaatiokonventio.** Toteutetaan yhtenä, testatusti dokumentoituna funktiona `format.ts`:ssä, jossa konventio on kirjoitettu kommenttiin auki. Ei saa olettaa hiljaisesti. Väärä merkki tässä on hiljainen ja tuhoisa virhe.
4. **Nyrkkisäännöt.** "1 mm per 2°" ja Vogelin sääntö eivät ole laskennan perustaa. OC-korkeus lasketaan geometrisesti CRA:sta. Nyrkkisääntö saa esiintyä korkeintaan vertailulukuna välitulospaneelissa.
5. **Kaavat §3:sta.** Ne on johdettu ja tarkistettu. Jos jokin niistä näyttää väärältä, kysy — älä korjaa arvaamalla.

### 9.2 Rajapinnat P0:aan

Ydin altistaa yhden funktion `src/optics/index.ts`:stä. Tyypit ovat sitovia; nimet saa muuttaa, rakenteen ei.

```ts
type Eye = 'OD' | 'OS';

interface LensPower {
  sphere: Dioptre;
  cylinder: Dioptre;          // plus-sylinterimuoto sisäisesti, aina
  axis: Degree;               // 0 < axis <= 180
  prism?: { magnitude: PrismDioptre; base: Degree };   // 360°-notaatio sisäisesti
}

interface FrameParams {
  pantoscopicTiltDeg: Degree;
  wrapDeg: Degree;
  wrapMode: 'total' | 'perLens';
  anglesMeasured: boolean;
  boxA?: Millimetre; boxB?: Millimetre; dbl?: Millimetre; ed?: Millimetre;
  fittingHeight?: Millimetre;
}

interface SolveInput {
  eyes: Record<Eye, { rx: LensPower; monoPd: Millimetre; baseCurve?: Dioptre }>;
  frame: FrameParams;
  material: { index: number; abbe: number; name?: string };
  vertexRefraction: Millimetre;
  vertexWorn: Millimetre;
  cra: Millimetre;                     // oletus 13.5
  lensType: 'singleVision';            // muut arvot → validointivirhe
  labProfile: { compensatesInternally: boolean; axisStep: Degree; prismStep: PrismDioptre; cylForm: 'plus' | 'minus'; extraStep?: Dioptre };
  flags: { baseCurveModel: boolean; ocrMethod: 'exact' | 'martin' };
  toleranceData?: ToleranceTable;       // annetaan parametrina, ei lueta tiedostosta; sisältää standarditunnisteen ('iso8980-1' | 'iso21987') per taulukko, kumpikin valinnainen
}

interface EyeResult {
  exact: LensPower;
  rounded025: LensPower;
  naiveRounded025: LensPower;          // vertailua varten
  asWorn: { exact: LensPower; rounded: LensPower; uncompensated: LensPower };
  residual: { exact: Residual; rounded: Residual; uncompensated: Residual };
  tolerance: {
    ordered: { exact: Verdict; rounded: Verdict };   // ISO 8980-1, tilattava linssi
    asWorn:  { exact: Verdict; rounded: Verdict };   // ISO 21987, käytössä toteutuva
  };                                                 // Verdict sisältää 'notAssessed'
  compensationWorthwhile: boolean;
  decentration: { horizontal: Millimetre; ocHeight: Millimetre; inducedPrism: {...} };  // kierretyssä linssitasossa (§3.3); boxing-tason vertailuarvo trace:ssa
  warnings: Warning[];
  trace: CalcTrace;
}

interface Residual { sphere: Dioptre; cylinder: Dioptre; axis: Degree; dioptricDistance: number }

function solve(input: SolveInput): { od: EyeResult; os: EyeResult; global: Warning[] } | ValidationError;
```

### 9.3 Hyväksymiskriteerit

**P0 on valmis kun:**
- `solve()` palauttaa oikean tuloksen `test/cases/internal.json`:in kaikille tapauksille, ±0,005 D.
- Analyyttinen ja numeerinen käännös yhtäpitäviä 1e-6 D:n tarkkuudella tuhannella satunnaissyötteellä.
- Kaikki §5:n ominaisuustestit vihreinä.
- `lensType: 'progressive'` tuottaa validointivirheen, ei tulosta.
- `flags.baseCurveModel: false` → tulos identtinen riippumatta `baseCurve`-kentän arvosta.
- `toleranceData` puuttuu tai on osittainen → puuttuvan standardin verdikti `'notAssessed'`, ei kaatumista eikä arviota.
- Wrap = 0 ja panto = 0 → kierretyn tason desentraatio yhtyy boxing-kaavaan koneellisella tarkkuudella.
- Rajatesti vihreä: `src/optics/` ei importoi mitään ulkopuoleltaan, ei koske DOM:iin, ei lue `data/`-hakemistoa.
- CI vihreä: tyyppitarkistus, testit, build.

**P1 on valmis kun:** eiliset kaksi silmää voi syöttää käyttöliittymään ja tulos vastaa `internal.json`:ia, molemmat tuloskortit näkyvät, ja hyötyarvio varoittaa oikeasta silmästä.

### 9.4 Työjärjestys

`units.ts` → `matrix.ts` → `vertex.ts` → `geometry.ts` → `ocr.ts` + `ocr-numeric.ts` → testit → `rounding.ts` → `validate.ts` → `format.ts` → `trace.ts` → `index.ts`.

Testit kirjoitetaan `ocr.ts`:n jälkeen ennen kuin edetään, koska siihen asti kaikki on verifioitavissa ja sen jälkeen virheet alkavat kasautua. Rajatesti kirjoitetaan ensimmäisenä, ennen kuin `src/optics/`:issa on yhtään tiedostoa — silloin se ohjaa rakennetta sen sijaan että kritisoisi sitä jälkikäteen.

Prisma (`prism.ts`) vasta P2:ssa, omana kokonaisuutenaan. Sen juurenhaku on projektin ainoa numeerisesti hankala osa, eikä sitä pidä sotkea P0:n kanssa samaan istuntoon.
