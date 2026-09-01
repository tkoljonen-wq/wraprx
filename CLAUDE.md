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

## Tila (päivitetty 1.9.2026)

| Vaihe | Sisältö | Tila |
|---|---|---|
| P0 | Laskentaydin, testit, rajatesti, CI, valmistajadatan ajopolku | **valmis** |
| P1 | `src/ui/` (Preact): yksiteho, molemmat silmät, kaksi tuloskorttia | **valmis** |
| P2 | `prism.ts` täydellä Snell-mallilla ja prismakäännöksellä | seuraava |
| P3 | Presetit, tilauslomake, PWA/offline, URL-jakaminen, i18n | ei aloitettu |
| P4 | ISO-toleranssit lähteestä, base curve -lippu, valmistajadata | ei aloitettu |

`prism.ts` sisältää P0:ssa vain Prentice-prisman, kantasuuntamuunnokset ja TCA:n.
Reseptin prisma välitetään sellaisenaan ja varoitus `prismNotCompensated` kertoo sen.

### P0:n ja P1:n valmistumistila

`npm run typecheck`, `npm test` (94 testiä, 7 tiedostoa) ja `npm run build` menevät läpi.
Kaikki §9.3:n P0-kriteerit on katettu testillä. Rajatesti on koeteltu tarkoituksellisella
rikkomuksella (`window` + ulkopuolinen import ytimeen) ja se kaatui kuten pitää.

P1: käyttöliittymä on Preact + signals, yksi näkymä, elävä laskenta ilman
laskentanappia. `test/ui-model.test.ts` ajaa referenssitapauksen **lomakkeen kautta**
(merkkijonot → `buildSolveInput` → `solve`) samoja käsin johdettuja odotusarvoja vasten,
joten desimaalipilkku, miinusmuodon transpositio ja kenttien kytkentä ovat testattuja
ilman DOM:ia. Ulkoasu on tarkistettu 375 px:n leveydellä: ei vaakavieritystä,
kosketuskohteet ≥ 44 px.

Referenssitapaus §5.3 on johdettu käsin koodista riippumatta
([test/cases/derivations.md](test/cases/derivations.md)) ja johto vahvisti suunnitelman
ehdolliset luvut: OD −0,9034 +0,4825 ax 168,65 ja OS −1,5035 +1,7248 ax 171,79.
Johto vahvisti myös etumerkkivalinnan `betaDeg < 0` OD:lle.

## Mistä jatketaan

1. **OC-korkeuden kriteeri on päätetty 1.9.2026:** (A) katselinjan lävistyspiste.
   Käyttäjä vahvisti kannan. `decentration`-funktiota ei muuteta; (B) ja nyrkkisääntö
   jäävät vertailuluvuiksi. Ks. [docs/OPEN-QUESTIONS.md](docs/OPEN-QUESTIONS.md) kohta 1.
   Sama kohta sisältää yhä **tilauskäytännön kysymyksen**: tekeekö linssitalo
   panto-pudotuksen itse annetusta korkeudesta? Se on varmistettava linssitalolta ennen
   ensimmäistä oikeaa tilausta ja se kuuluu P3:n tilauslomakkeen saatetekstiin.
2. **P2 seuraavaksi:** `prism.ts` täydellä Snell-mallilla ja prismakäännöksellä. P1:n
   käyttöliittymässä on jo prismakentät ja varoitus `prismNotCompensated`, joten P2
   näkyy suoraan tuloskorteissa ilman uutta kytkentätyötä.
3. **Git on käytössä 1.9.2026 alkaen.** Haara `main`, ensimmäinen commit sisältää P0:n
   ja P1:n. Etäpalvelinta ei ole vielä lisätty, joten CI ja Pages-julkaisu eivät ole
   vielä ajaneet kertaakaan — ne käynnistyvät, kun repo työnnetään GitHubiin.
   `.gitattributes` pakottaa LF:n, jotta Ubuntu-CI ja Windows-työasema eivät tuota
   eroavia diffejä.
4. **Ei kiireellistä velkaa.** Suunnitelma on repossa kahdesti: alkuperäinen
   `wrap-rx-suunnitelma-v0.5.md` juuressa ja kopio `docs/PLAN.md`. Juuren kopio voi
   poistua, kun se ei enää tunnu tarpeelliselta.

## Rakenne

```
src/optics/   ydin, puhdas TS (units, matrix, vertex, geometry, ocr, ocr-numeric,
              prism, rounding, tolerance, validate, format, trace, index)
src/ui/       App.tsx, components/, views/, state/ (model.ts puhdas, store.ts signals),
              flags.ts, i18n/fi.ts, styles.css
src/main.tsx  käynnistys
data/         materials.json (lähde per rivi), tolerances.json (tyhjä)
test/         boundary, reference, property, consistency, trace, ui-model + cases/
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
