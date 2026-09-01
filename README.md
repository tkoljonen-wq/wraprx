# WrapRx

Kompensoidun linssitilauksen laskuri. Laskee reseptistä ja kehysparametreista sen
voimakkuuden, joka linssiin pitää **tilata**, jotta käyttäjän silmällä toteutuu haluttu
korjaus, kun linssi on kehyksessä kallellaan (wrap + pantoskooppinen kaltevuus).

Tavallinen laskuri kertoo, mitä käyttäjä saa. Tämä kertoo, mitä pitää tilata — ja
tarkistaa itsensä ajamalla tuloksen takaisin eteenpäin-mallin läpi.

**Tila: vaiheet P0, P1 ja P2 valmiit** — laskentaydin, testit, käyttöliittymä ja
prisman käännös. Seuraava on P3: presetit, tulostettava tilauslomake, PWA/offline ja
URL-jakaminen.

- **Sovellus:** https://tkoljonen-wq.github.io/wraprx/
- Suunnitelma: [docs/PLAN.md](docs/PLAN.md)
- Ohjeet koodaajalle: [CLAUDE.md](CLAUDE.md)
- Avoimet mallikysymykset: [docs/OPEN-QUESTIONS.md](docs/OPEN-QUESTIONS.md)

## Mitä ohjelma tekee

```
Resepti (refraktion pintavälillä)
  → validointiportti (yksiteho? kulmat järkevät? kompensoiko linssitalo itse?)
  → normalisointi ja voimakkuusmatriisi
  → pintavälikorjaus (refraktio → käyttö)
  → linssitason geometria (τ, μ)
  → OCR-käännös: haluttu käytössä → tilattava nimellisvoimakkuus
  → desentraatio ja OC-korkeus kierretyssä linssitasossa
  → prisman käännös: kiila + exakti Snell, tilattava = poikkeutus kallistamattomana
  → kaksi tulostarkkuutta: tarkka (0,01 D) ja 0,25 D
  → takaisinlaskenta molemmille: residuaali, toleranssiverdikti, hyötyarvio
```

**Hyötyarvio** on olennainen osa: jos 0,25 D:n askeleella pyöristetty kompensointi ei
päihitä kompensoimatonta reseptiä, ohjelma sanoo sen suoraan. Matalilla voimakkuuksilla
tilanne on yleinen, ja ilman varoitusta ohjelma tuottaisi turhaa työtä ja väärää
varmuuden tunnetta.

## Mitä ohjelma EI tee

- **Ei monitehoa.** Vain yksiteho. Monitehossa kompensointi kuuluu valmistajan
  freeform-pintalaskentaan; keskiövoimakkuuden korjaaminen ei riitä eikä ole oikea kohta.
- **Ei perifeeristä optimointia eikä freeform-pintalaskentaa.** Isoilla kulmilla
  keskiövoimakkuuden kompensointi on välttämätön mutta ei riittävä, ja ohjelma sanoo sen.
- **Ei perspektiiviä muuhun kuin suoraan eteen katsomiseen.** Sekä voimakkuus- että
  prismalaskenta olettaa vaakasuoran katselinjan. Sivukatseen optiikka on eri tehtävä.
- **Ei ISO-toleranssiverdiktiä ennen kuin taulukot on syötetty lähteestä.** Ilman dataa
  verdikti on "ei arvioitu" — ei arvattua lukua.

**Verifiointi ≠ validointi.** Laskenta on verifioitu sisäisesti: analyyttinen ja
riippumaton numeerinen käännös ovat yhtäpitäviä 1e-6 D:n tarkkuudella, ja
referenssitapaukset on johdettu käsin koodista riippumatta. Sitä **ei ole validoitu
valmistajan kompensointia vastaan**, koska sellaista dataa ei vielä ole. Ero on
olennainen ja se kuuluu käyttäjälle näkyviin.

## Tietosuoja

Ohjelma ei tarvitse eikä pyydä potilastietoja — vain numeroita ja vapaan viitekentän
(tilausnumero, ei nimi). Kaikki laskenta tapahtuu selaimessa. Mitään ei lähetetä
minnekään, ja GitHub Pages ei näe syötteitä. Viitekenttä **ei serialisoidu** jaettavaan
URL-hashiin, joten lupaus kestää myös käyttäjän virheen. GDPR-mielessä käsittelyä ei
synny.

## Vastuu

Laskenta-apuväline ammattilaisen käyttöön. Ei diagnostiikkaa, ei automaattista päätöstä.
**Optikko vastaa tuloksesta.** Jokaisessa tulosteessa näkyy versionumero ja git-SHA,
joten tulos on jäljitettävissä tiettyyn koodiversioon.

## Kehitys

```bash
npm install
npm test            # 114 testiä: rajatesti, referenssi, ominaisuus, konsistenssi, jälki, prisma, lomake
npm run typecheck
npm run demo        # tulostaa referenssitapauksen tuloksen ja laskentajäljen
npm run validate:lab
npm run dev
npm run build
```

### Rakenne

`src/optics/` on eristetty ydin: puhdas TypeScript, ei importteja ulkopuolelta, ei
DOM:ia, ei tiedostojen lukemista. `test/boundary.test.ts` valvoo rajaa — ilman sitä
hakemistoraja olisi pelkkä lupaus. Ydin on siirrettävissä toiseen projektiin
kopioimalla hakemisto.

`src/ui/` on Preact + signals. Tulos päivittyy jokaisesta muutoksesta, laskentanappia ei
ole. Käyttöliittymä ei validoi optiikkaa itse: kentät ovat merkkijonoja, ja ytimen
validointiportti kertoo mikä on pielessä.

### Testaus

| Testi | Mitä varmistaa |
|---|---|
| `boundary.test.ts` | Ytimen eristys (importit, DOM, tiedostot) |
| `reference.test.ts` | Käsin johdetut referenssitapaukset, ±0,005 D |
| `consistency.test.ts` | Analyyttinen vs. numeerinen käännös, 1000 satunnaissyötettä |
| `property.test.ts` | Invariantit: peilisymmetria, τ=0, monotonisuus, pyöristys, notaatiot |
| `trace.test.ts` | Laskentajäljen snapshot — hiljainen muutos välivaiheessa huomataan |
| `tolerance.test.ts` | Tyhjä, osittainen ja täysi toleranssidata; vyöhykelogiikka |
| `prism.test.ts` | Kiilamalli ja käännös: käsin johdettu Snell, juurenhaku, etumerkit |
| `ui-model.test.ts` | Lomakkeen syöttöpolku: pilkku, miinusmuoto, kenttien kytkentä |
