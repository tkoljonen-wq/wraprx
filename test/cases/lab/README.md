# Valmistajan referenssidata

Tämä kansio on **tarkoituksella tyhjä** (suunnitelma §5.4). Paikka ja ajopolku ovat
valmiit, jotta dataa ei tarvitse odottaa refaktoroinnin takia: kun saat esimerkiksi
kaksikymmentä paria tilausjärjestelmästä, pudota CSV-tiedostot tähän kansioon ja aja

```bash
npm run validate:lab
```

Skripti raportoi eron per tapaus ja hajonnan, ja kertoo mikä oletusjoukko selittää
datan parhaiten: tulkitseeko valmistaja wrapin **per linssi vai kokonaisarvona** ja
käyttääkö se **exaktia vai approksimoitua** kerrointa. Tämä on projektin tärkein avoin
epävarmuus.

## CSV-skeema

Ensimmäinen rivi on otsikko. Sarakkeiden järjestys ei ratkaise, nimet ratkaisevat.
Rivit, jotka alkavat `#`, ohitetaan.

```csv
lab,lens,index,rxSph,rxCyl,rxAxis,rxPrism,rxBase,panto,wrap,wrapMode,vertexRef,vertexWorn,pd,eye,retSph,retCyl,retAxis,retPrism,retBase
```

| Sarake | Selitys |
|---|---|
| `lab` | Linssitalon tunnus |
| `lens` | Linssituotteen nimi |
| `index` | Taitekerroin |
| `rxSph`, `rxCyl`, `rxAxis` | Alkuperäinen resepti (kumpi tahansa sylinterimuoto) |
| `rxPrism`, `rxBase` | Määrätty prisma, 0 jos ei prismaa |
| `panto` | Pantoskooppinen kaltevuus, astetta |
| `wrap` | Wrap-kulma astetta **siinä muodossa, jossa se tilaukseen syötettiin** |
| `wrapMode` | `total` tai `perLens` — tilausjärjestelmän oma tulkinta, jos tiedossa |
| `vertexRef`, `vertexWorn` | Pintaväli refraktiossa ja käytössä, mm |
| `pd` | Monokulaarinen PD, mm |
| `eye` | `OD` tai `OS` |
| `retSph`, `retCyl`, `retAxis` | Valmistajan palauttama kompensoitu voimakkuus |
| `retPrism`, `retBase` | Valmistajan palauttama prisma |

## Tietosuoja

Riveillä ei saa olla asiakkaan tunnistetietoja: ei nimeä, ei syntymäaikaa, ei
tilausnumeroa joka yhdistyy henkilöön. `lens`-sarake on tuotteen nimi, ei asiakkaan.
CSV-tiedostot on jätetty pois versionhallinnasta (`.gitignore`), koska ne ovat
liikkeen tilausdataa.
