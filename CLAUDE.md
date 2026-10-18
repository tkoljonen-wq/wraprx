# WrapRx — ohjeet koodaajalle

Kompensoidun linssitilauksen laskuri. Täysi suunnitelma: [docs/PLAN.md](docs/PLAN.md).
Avoimet mallikysymykset: [docs/OPEN-QUESTIONS.md](docs/OPEN-QUESTIONS.md).

Yhdellä lauseella: **laskenta on käännetty väärinpäin.** Ohjelma kertoo, mitä pitää
tilata, jotta kallellaan oleva linssi tuottaa halutun korjauksen käyttäjän silmällä.

## Neljä sääntöä, jotka istunto ilman muistia rikkoo ensimmäisenä

1. **Vain yksiteho.** `lensType` muuta kuin `'singleVision'` → validointivirhe, ei
   tulosta. Monitehossa kompensointi kuuluu valmistajan freeform-pintalaskentaan.
2. **`src/optics/` on eristetty.** Ei importteja hakemiston ulkopuolelta, ei DOM:ia
   (`window`, `document`, `localStorage`, `navigator`), ei tiedostojen lukemista, ei
   `data/`-hakemistoa. Toleranssi- ja materiaalidata annetaan **parametrina**.
   `test/boundary.test.ts` valvoo tätä ja kaatuu heti, jos raja rikkoutuu.
3. **`data/tolerances.json` SAA olla tyhjä.** ISO-toleranssilukuja ei arvata, ei täytetä
   muistista, ei johdeta "tyypillisistä" arvoista eikä käytetä toisen standardin
   taulukkoa toisen paikalla. Tyhjä data on normaali tila → verdikti `'notAssessed'`.
4. **§9.1:n kiellot.** Materiaalien taitekertoimet ja Abbe-luvut kirjataan lähteestä
   (lähde per rivi `data/materials.json`:issa). Kantasuunnan notaatio on yksi
   dokumentoitu funktio `format.ts`:ssä. Nyrkkisäännöt (1 mm/2°, Vogel) esiintyvät
   korkeintaan vertailulukuna välitulospaneelissa, eivät laskennan perustana.
   §3:n kaavat on johdettu ja tarkistettu — jos jokin näyttää väärältä, **kysy**.

## Tila (päivitetty 18.10.2026)

| Vaihe | Sisältö | Tila |
|---|---|---|
| P0 | Laskentaydin, testit, rajatesti, CI, valmistajadatan ajopolku | **valmis** |
| P1 | `src/ui/` (Preact): yksiteho, molemmat silmät, kaksi tuloskorttia | **valmis** |
| P2 | `prism.ts` täydellä Snell-mallilla ja prismakäännöksellä | **valmis** |
| P3 | Presetit, PWA/offline, URL-jakaminen | **valmis** (Android-asennus testaamatta) |
| P4 | ISO-toleranssit lähteestä, base curve -lippu, valmistajadata | ei aloitettu |

`prism.ts` sisältää nyt myös kiilamallin: exakti vektori-Snell kahdella pinnalla ja
poikkeutuksen käännös vaimennetulla Newtonilla. **Reseptin prisma on tavoite silmällä;
tilattava on kiilan poikkeutus kallistamattomana** eli focimetrissä mitattava
nimellisprisma (docs/OPEN-QUESTIONS.md kohta 11.1). Käännöksen saa kytkeä pois lipulla
`prismModel: 'passThrough'`, jolloin `prismNotCompensated` varoittaa.

### P0–P3:n valmistumistila

`npm run typecheck`, `npm test` (133 testiä, 11 tiedostoa) ja `npm run build` menevät läpi.
Kaikki §9.3:n P0-kriteerit on katettu testillä. Rajatesti on koeteltu tarkoituksellisella
rikkomuksella (`window` + ulkopuolinen import ytimeen) ja se kaatui kuten pitää.

P1: käyttöliittymä on Preact + signals, yksi näkymä, elävä laskenta ilman
laskentanappia. `test/ui-model.test.ts` ajaa referenssitapauksen **lomakkeen kautta**
(merkkijonot → `buildSolveInput` → `solve`) samoja käsin johdettuja odotusarvoja vasten,
joten desimaalipilkku, miinusmuodon transpositio ja kenttien kytkentä ovat testattuja
ilman DOM:ia. Ulkoasu on tarkistettu 375 px:n leveydellä: ei vaakavieritystä,
kosketuskohteet ≥ 44 px.

P2: prisman käännös on kiilamalli + exakti vektori-Snell + vaimennettu Newton.
Kiilan poikkeutus on tarkistettu **käsin johdettua skalaarista prismakaavaa** vasten
kahdessa geometriassa (derivations.md tapaukset 8 ja 9); ero on alle 4e-5 pd. Molemmat
johdot ovat eri muotoilu kuin koodin vektori-Snell, joten yhtäpitävyys on todellinen
tarkistus. Kallistettu tapaus 9 paljasti kaksi asiaa: käsinlaskun etumerkkivirheen
(kirjattu johtoon) ja aidon robustisuusvian, jossa juurenhaku vaelsi 253°:n kiilaan —
siitä syntyi mallin määrittelyalue (kiilakulma < 90°).

Referenssitapaus §5.3 on johdettu käsin koodista riippumatta
([test/cases/derivations.md](test/cases/derivations.md)) ja johto vahvisti suunnitelman
ehdolliset luvut: OD −0,9034 +0,4825 ax 168,65 ja OS −1,5035 +1,7248 ax 171,79.
Johto vahvisti myös etumerkkivalinnan `betaDeg < 0` OD:lle.

**Korjattu 18.10.2026: linssin kanta.** Tilauksen akseli luetaan linssin omasta
180-linjasta ê_h, ja yhdistetyssä kallistuksessa sen tangentiaalimeridiaani μ_L eroaa
silmän frontaalitason μ:stä (18°/15°: 2,39°). `inverseTilt`/`forwardTilt` saavat
nyt molemmat kulmat (`geometry.muDeg`, `geometry.muLensDeg`). Referenssitapaus 1 on
johdettu uudelleen: **OD −0,9034 +0,4825 ax 171,04 ja OS −1,5035 +1,7248 ax 169,40**.
Riippumaton tarkistus on `test/raytrace.test.ts`: 3D-säteenjuoksu Snellin lailla ilman
OCR-kertoimia (`test/support/raytrace.ts`). Se kaatuu, jos kanta käsitellään väärin.
OptiCampuksen laskuri poikkeaa tästä 2–5° yhdistetyssä kallistuksessa; säteenjuoksun
mukaan sen tilaus jättää silmälle 0,1–0,3 D virheen (docs/OPEN-QUESTIONS.md kohta 9).

## Mistä jatketaan

0. **§3.5:n nollaprismalause on ratkaistu 18.10.2026:** nollatavoite = nollaprisma.
   Kallistus ei indusoi prismaa OC:n kohdalla (kriteeri A), joten mitään ei kumota.
   Käyttäjä hylkäsi desentraation Prentice-prisman kompensoinnin tarpeettomana.
   Mallia ei muuteta. Ks. [docs/OPEN-QUESTIONS.md](docs/OPEN-QUESTIONS.md) kohta 11.2.

1. **OC-korkeuden kriteeri on päätetty 1.9.2026:** (A) katselinjan lävistyspiste.
   Käyttäjä vahvisti kannan. `decentration`-funktiota ei muuteta; (B) ja nyrkkisääntö
   jäävät vertailuluvuiksi. Ks. [docs/OPEN-QUESTIONS.md](docs/OPEN-QUESTIONS.md) kohta 1.
   Sama kohta sisältää yhä **tilauskäytännön kysymyksen**: tekeekö linssitalo
   panto-pudotuksen itse annetusta korkeudesta? Se on varmistettava linssitalolta ennen
   ensimmäistä oikeaa tilausta. Sama koskee prisman mittausasentoa (kohta 11.1).
2. **P3 valmis 18.10.2026.** **Rajattu pois käyttäjän päätöksellä:** tulostettava
   tilauslomake (tulos riittää näytöllä) ja kieliversiot (vain suomi; `i18n/fi.ts` on
   pelkkä merkkijonotiedosto). Toteutus:
   - **Jakolinkki** (`state/share.ts`, puhdas): lomake URL-hashiin sallittujen avainten
     listalla. Vapaa viitekenttä EI saa koskaan tulla listaan (§4) — `test/share.test.ts`
     valvoo. Hash luetaan käynnistyksessä ja poistetaan osoiteriviltä. Android käyttää
     `navigator.share`:a, muualla leikepöytä tai näkyvä linkkikenttä.
   - **Presetit** (`state/presets.ts`, puhdas): kehykset (kulmat, kulmatapa, kehysmitat;
     EI sovituskorkeutta) ja linssitaloprofiilit. Kehyspresetin käyttö poistaa ruksin
     «kulmat mitattu». Materiaaleja ei presetoida: ne tulevat lähteistetystä datasta.
   - **localStorage** (`state/store.ts`): avaimet `wraprx-form` ja `wraprx-presets`.
     Origin on jaettu muiden GitHub Pages -sovellusten kanssa: älä koskaan tyhjennä
     koko localStoragea.
   - **PWA** käyttäjän globaalin ohjeen mukaan: `public/manifest.json` (`id: "wraprx"`,
     `start_url: "."`), PNG-ikonit `public/icons/` (+ SVG-favicon), head-skripti ottaa
     `beforeinstallprompt`:n talteen ja Asenna-painike (`state/install.ts`). Service
     worker on `pwa/sw.js`-pohja, jonka `vite.config.ts`:n lisäosa täydentää buildin
     tiedostolistalla ja build-tunnisteella (ei vite-plugin-pwa:ta). Network first,
     välimuistietuliite `wraprx-`, activate poistaa vain omat vanhat välimuistit.
     Devissä SW:tä ei rekisteröidä; tuotantobuildia voi kokeilla `wraprx-preview`-
     konfiguraatiolla (`.claude/launch.json`).
   - **Tarkistamatta:** asennus oikealla Android-puhelimella ja offline-käyttö siellä.
3. **Julkaistu 1.9.2026.** Julkinen repo `github.com/tkoljonen-wq/wraprx`, haara `main`.
   CI ja GitHub Pages ajavat joka pushilla; sovellus on osoitteessa
   `https://tkoljonen-wq.github.io/wraprx/`. `.gitattributes` pakottaa LF:n, jotta
   Ubuntu-CI ja Windows-työasema eivät tuota eroavia diffejä.
4. **Ei kiireellistä velkaa.** Suunnitelma on repossa kahdesti: alkuperäinen
   `wrap-rx-suunnitelma-v0.5.md` juuressa ja kopio `docs/PLAN.md`. Juuren kopio voi
   poistua, kun se ei enää tunnu tarpeelliselta.

## Rakenne

```
src/optics/   ydin, puhdas TS (units, matrix, vertex, geometry, ocr, ocr-numeric,
              prism, rounding, tolerance, validate, format, trace, index)
src/ui/       App.tsx, components/, views/, state/ (model.ts, share.ts ja presets.ts
              puhtaita; store.ts signals + localStorage; install.ts), flags.ts,
              i18n/fi.ts, styles.css
public/       manifest.json, icons/ (PNG 192/512/maskable + SVG)
pwa/          sw.js-pohja (build täydentää)
src/main.tsx  käynnistys
data/         materials.json (lähde per rivi), tolerances.json (tyhjä)
test/         boundary, reference, property, consistency, trace, prism, ui-model + cases/
scripts/      demo.ts, validate-lab-data.ts
docs/         PLAN.md, OPEN-QUESTIONS.md
```

`src/ui/state/model.ts` on tarkoituksella puhdas (ei signaaleja, ei DOM:ia): lomakkeen
kenttä on merkkijono, ja `buildSolveInput` kääntää sen `SolveInput`:iksi NaN:eineen
päivineen. Käyttöliittymä **ei tee omaa optiikkavalidointia** — kelpaamaton arvo menee
ytimen validointiportille, joka on ainoa paikka, jossa virheilmoitukset määritellään.

`ocr-numeric.ts` on riippumaton numeerinen käännös **vain verifiointiin**. Se ei ole
tuotantopolulla eikä sitä pidä kutsua `index.ts`:stä. Sen tehtävä on kaatua, jos
analyyttisessä johdossa on merkkivirhe.

## Konventiot

- **Koordinaatisto:** +x tarkastelijan oikea, +y ylös, +z tarkastelijaa kohti. Kulmat
  vastapäivään +x:stä (sama kuin TABO ja prisman 360°-notaatio).
- **Sylinteri:** plus-muoto aina sisäisesti. Miinusmuoto vain esityksessä
  (`format.ts`).
- **Akseli:** `0 < axis <= 180`. Nollasylinterillä akseli normalisoidaan 180:een.
- **Wrap:** `betaDeg` on etumerkillinen: **OD negatiivinen**, OS positiivinen. Tämä
  etumerkki on verifioitu referenssitapausta vastaan; sen kääntäminen peilaisi akselin
  kierron. Ks. `geometry.ts`.
- **Yksiköt:** brändätyt tyypit (`Dioptre`, `Degree`, `Millimetre`, `PrismDioptre`)
  rajapinnoilla, paljaat `number`:it moduulien sisällä.

## Komennot

```bash
npm test            # kaikki testit
npm run typecheck   # tsc --noEmit
npm run demo        # tulostaa referenssitapauksen ja laskentajäljen
npm run validate:lab
npm run dev
npm run build
```

## Testien lisääminen

Referenssitapauksen odotusarvot johdetaan **käsin ja riippumatta koodista**, ja johto
kirjataan `test/cases/derivations.md`:hen välivaiheineen. Koodin tuottamaa lukua ei
kopioida odotusarvoksi — se tekisi testistä kehäpäättelyn. Hyväksymisraja on ±0,005 D.
