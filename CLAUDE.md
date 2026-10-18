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
| P4 | ISO-toleranssit, base curve, valmistajadata | **odottaa lähdeaineistoa, jota ei ole saatavilla** |

`npm run typecheck`, `npm test` (133 testiä, 11 tiedostoa) ja `npm run build` menevät
läpi. Sovellus on verkossa osoitteessa `https://tkoljonen-wq.github.io/wraprx/`
(julkinen repo `github.com/tkoljonen-wq/wraprx`, haara `main`; CI ja Pages ajavat joka
pushilla). `.gitattributes` pakottaa LF:n.

### Laskennan varmennus

- **Referenssitapaus 1** (§5.3) on johdettu käsin koodista riippumatta
  ([test/cases/derivations.md](test/cases/derivations.md)): **OD −0,9034 +0,4825 ax
  171,04 ja OS −1,5035 +1,7248 ax 169,40**. OD:n wrap on negatiivinen (`betaDeg < 0`).
- **Linssin kanta (korjattu 18.10.2026):** tilauksen akseli luetaan linssin omasta
  180-linjasta ê_h. Yhdistetyssä kallistuksessa tangentiaalimeridiaanilla on eri kulma
  linssin tasossa (μ_L) kuin silmän frontaalitasossa (μ); 18°/15°:lla ero on 2,39°.
  `inverseTilt`/`forwardTilt` saavat molemmat (`geometry.muDeg`, `geometry.muLensDeg`).
  Johto: derivations.md tapaus 10.
- **Säteenjuoksu** (`test/raytrace.test.ts`, `test/support/raytrace.ts`): riippumaton
  3D-tarkistus Snellin lailla ilman OCR-kertoimia. Kaatuu, jos kanta käsitellään väärin.
  Se jakaa kehysgeometrian koodin kanssa, joten kiertojärjestys kasvoilla (ensin wrap,
  sitten koko kehyksen panto) on yhä oletus (OPEN-QUESTIONS kohta 5).
- **Prisma:** kiilamalli + exakti vektori-Snell + vaimennettu Newton, tarkistettu käsin
  johdettua skalaarikaavaa vasten (tapaukset 8 ja 9; määrittelyalue kiilakulma < 90°).
  Reseptin prisma on tavoite silmällä, tilattava on kiilan poikkeutus kallistamattomana
  (focimetri). Nollatavoite = nollaprisma (päätös 18.10.2026, OPEN-QUESTIONS 11.2).
- **OptiCampus-vertailu** (18.10.2026, OPEN-QUESTIONS kohta 9): yksittäinen kallistus
  täsmää ±0,01 D. Yhdistetyssä kallistuksessa OptiCampus poikkeaa 1–6° akselissa, ja
  säteenjuoksun mukaan sen tilaus jättää silmälle jopa 0,3 D:n virheen.

### Käyttäjän päätökset

- OC-korkeus: (A) katselinjan lävistyspiste (1.9.2026). (B) ja nyrkkisääntö ovat
  vertailulukuja.
- Ei tulostettavaa tilauslomaketta (tulos luetaan näytöltä) eikä kieliversioita (vain
  suomi; `i18n/fi.ts` on pelkkä merkkijonotiedosto). 18.10.2026.
- Desentraation Prentice-prismaa ei kompensoida. 18.10.2026.
- P4:n lähdeaineistoa (ISO-taulukot, linssitalon kompensoidut tilaukset, base curve
  -taulukot) ei ole saatavilla. `data/tolerances.json` pysyy tyhjänä, verdikti
  `'notAssessed'`. Älä täytä arvaamalla. 18.10.2026.

## Mistä jatketaan

1. **Android-testi:** asennus Chromella, offline (lentotila) ja Jaa linkkinä -valikko
   oikealla puhelimella. Ei vielä tehty.
2. **Linssitalolta varmistettavat ennen ensimmäistä oikeaa tilausta** (ei laskentaa):
   tekeekö talo panto-pudotuksen itse annetusta korkeudesta (OPEN-QUESTIONS kohta 1) ja
   missä asennossa prisma mitataan (kohta 11.1).
3. Muut jatkot syntyvät käytöstä. P4 jatkuu vain, jos lähdeaineistoa tulee.

### P3:n toteutus lyhyesti

- **Jakolinkki** (`state/share.ts`, puhdas): lomake URL-hashiin sallittujen avainten
  listalla. Vapaa viitekenttä EI saa koskaan tulla listaan (§4) — `test/share.test.ts`
  valvoo. Hash luetaan käynnistyksessä ja poistetaan osoiteriviltä.
- **Presetit** (`state/presets.ts`, puhdas): kehykset (ilman sovituskorkeutta) ja
  linssitaloprofiilit. Kehyspresetin käyttö poistaa ruksin «kulmat mitattu».
  Materiaaleja ei presetoida.
- **localStorage**: avaimet `wraprx-form` ja `wraprx-presets`. Origin on jaettu muiden
  GitHub Pages -sovellusten kanssa: älä koskaan tyhjennä koko localStoragea.
- **PWA**: `public/manifest.json` (`id: "wraprx"`, `start_url: "."`), PNG-ikonit,
  Asenna-painike (`state/install.ts`). Service worker on `pwa/sw.js`-pohja, jonka
  `vite.config.ts` täydentää buildin tiedostolistalla. Network first, välimuistietuliite
  `wraprx-`. Devissä SW:tä ei rekisteröidä; tuotantobuildia voi kokeilla
  `wraprx-preview`-konfiguraatiolla (`.claude/launch.json`).

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
test/         boundary, reference, property, consistency, trace, prism, ui-model, share,
              presets, raytrace + cases/ ja support/raytrace.ts (vain testeihin)
scripts/      demo.ts, validate-lab-data.ts
docs/         PLAN.md (suunnitelma, alkuperäinen v0.5 + päivitykset), OPEN-QUESTIONS.md
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
