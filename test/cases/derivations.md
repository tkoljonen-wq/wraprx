# Sisäisten referenssitapausten johto

Suunnitelma §5.3 vaatii, että referenssitapausten odotusarvot johdetaan **riippumatta
toteutettavasta koodista**. Aiemmista istunnoista periytyviä lukuja ei hyväksytä
referenssiksi ilman uudelleenjohtoa — muuten testi vain toistaa oletukset, joita sen
pitäisi tarkistaa.

Kaikki alla olevat luvut on laskettu käsin matriisialgebralla ennen kuin
`test/reference.test.ts` ajettiin ensimmäisen kerran. Välivaiheet ovat näkyvissä, joten
jokainen luku on tarkistettavissa laskimella ilman tätä ohjelmaa.

Merkinnät: matriisi on `(xx, yy, xy)`, kulmat asteina, voimakkuudet dioptrioina.
Kanta `(t̂, ŝ)` on `t̂ = (cos μ, sin μ)`, `ŝ = (−sin μ, cos μ)`.

Käytetyt kaavat (suunnitelma §3.1, §3.4):

```
Fxx = S + C·sin²α      C = √((b−a)² + 4c²)      sin τ' = sin τ / n
Fyy = S + C·cos²α      2α = atan2(−2c, b−a)     k_sag  = (n·cos τ' − cos τ)/(n − 1)
Fxy = −C·sin α·cos α   S  = (a+b−C)/2           k_tan  = k_sag/cos²τ
                                                k_risti = k_sag/cos τ
cos τ = cos β · cos θ            n̂ = (sin β, −cos β·sin θ, cos β·cos θ)
β = −wrap (OD) tai +wrap (OS)    μ = atan2(n̂_y, n̂_x) mod 180
```

Käännös: kierrä tavoite `(t, s)`-kantaan, **jaa** komponentit kertoimilla
(`tt/k_tan`, `ss/k_sag`, `ts/k_risti`), kierrä takaisin.

---

## Tapaus 1 — `plan-own-case`

Suunnitelman §5.3 oma tapaus: OD −1,00 +0,50 ax 175 / OS −1,75 +2,00 ax 170,
wrap 15°/linssi, panto 18°, polykarbonaatti n = 1,586. Pintaväli sama refraktiossa ja
käytössä (12 mm), joten pintavälikorjaus on nolla — suunnitelma ei anna tapaukselle
pintavälejä, ja tämä oletus on kirjattava, koska se vaikuttaa lukuihin.

### Kallistus ja kertoimet (yhteiset molemmille silmille)

```
cos τ = cos 15° · cos 18° = 0,9659258 · 0,9510565 = 0,9186501
cos²τ = 0,8439178        sin τ = √(1 − 0,8439178) = 0,3950724      τ = 23,2705°
sin τ' = 0,3950724 / 1,586 = 0,2491000      cos τ' = √(1 − 0,0620508) = 0,9684778
k_sag   = (1,586 · 0,9684778 − 0,9186501)/0,586 = 0,6173557/0,586 = 1,0535080
k_tan   = 1,0535080 / 0,8439178 = 1,2483540
k_risti = 1,0535080 / 0,9186501 = 1,1468000
```

Tarkistus τ:lle toista tietä: `sin τ = 0,3950724` ja `sin 23° = 0,3907311`,
`cos 23° = 0,9205049`, joten `τ ≈ 23° + (0,0043413/0,9205049) rad = 23,2702°`.

### OD (β = −15°)

```
n̂_y = −cos 15°·sin 18° = −0,9659258 · 0,3090170 = −0,2984875
n̂   = (−0,2588190, −0,2984875, 0,9186501)
μ = atan2(−0,2984875, −0,2588190) = 229,0715° → mod 180 = 49,0715°
t̂ = (0,6551171, 0,7555283)      ŝ = (−0,7555283, 0,6551171)
u_x² = 0,4291784   u_y² = 0,5708230   u_x·u_y = 0,4949596
u_x·v_x = −0,4949596   u_y·v_y = +0,4949596   u_x·v_y + u_y·v_x = −0,1416446
```

Resepti matriisiksi (S = −1, C = 0,5, α = 175°; sin α = 0,0871557, cos α = −0,9961947):

```
Fxx = −1 + 0,5·0,00759612 = −0,99620194
Fyy = −1 + 0,5·0,99240388 = −0,50379806
Fxy = −0,5·0,0871557·(−0,9961947) = +0,04341203
```

Kierto `(t, s)`-kantaan:

```
tt = Fxx·u_x² + 2·Fxy·u_x·u_y + Fyy·u_y²
   = −0,4275484 + 0,0429745 − 0,2875795 = −0,6721534
ss = Fxx·u_y² − 2·Fxy·u_x·u_y + Fyy·u_x²
   = −0,5686549 − 0,0429745 − 0,2162192 = −0,8278486
ts = (Fyy − Fxx)·u_x·u_y + Fxy·(u_x² − u_y²)
   = 0,4924038·0,4949596 + 0,0434121·(−0,1416446) = 0,2437199 − 0,0061491 = 0,2375708
```

Tarkistus: `tt + ss = −1,500002 ≈ Fxx + Fyy = −1,5` (jäännös on pyöristystä).

Jako kertoimilla:

```
tt' = −0,6721534 / 1,2483540 = −0,5384317
ss' = −0,8278486 / 1,0535080 = −0,7858019
ts' =  0,2375708 / 1,1468000 =  0,2071598
```

Takaisin `(x, y)`-kantaan (`v_x² = u_y²`, `v_y² = u_x²`, `v_x·v_y = −0,4949596`):

```
Fxx = tt'·u_x² + 2·ts'·u_x·v_x + ss'·v_x²
    = −0,2310832 − 0,2050715 − 0,4485544 = −0,8847091
Fyy = tt'·u_y² + 2·ts'·u_y·v_y + ss'·v_y²
    = −0,3073490 + 0,2050715 − 0,3372488 = −0,4395263
Fxy = tt'·u_x·u_y + ts'·(u_x·v_y + u_y·v_x) + ss'·v_x·v_y
    = −0,2665020 − 0,0293433 + 0,3889393 = +0,0930940
```

Etumerkkihuomio: `u_x·v_x = −0,4949596` mutta `u_y·v_y = +0,4949596`, joten `Fxx`- ja
`Fyy`-rivien ristitermit tulevat eri merkkisinä. Tämä on juuri se kohta, jossa
merkkivirhe menisi huomaamatta ilman riippumatonta numeerista käännöstä (§5.1).

Matriisi takaisin sfäärisylinteriksi (`a = −0,8847091`, `b = −0,4395263`,
`c = 0,0930940`):

```
b − a  = 0,4451828        −2c = −0,1861880
C = √(0,4451828² + 0,1861880²) = √(0,1981877 + 0,0346660) = √0,2328537 = 0,4825492
2α = atan2(−0,1861880, 0,4451828) = −22,6987°  →  α = −11,3493° → 168,6507°
S = (−0,8847091 − 0,4395263 − 0,4825492)/2 = −0,9033923
```

**OD tarkka: −0,9034 +0,4825 ax 168,65** (suunnitelman ehdollinen arvo oli
−0,90 +0,48 ax 169 → täsmää).

### OS (β = +15°)

```
n̂ = (+0,2588190, −0,2984875, 0,9186501)
μ = atan2(−0,2984875, +0,2588190) = −49,0715° → mod 180 = 130,9285°
t̂ = (−0,6551171, 0,7555283)      ŝ = (−0,7555283, −0,6551171)
u_x² = 0,4291784   u_y² = 0,5708230   u_x·u_y = −0,4949596
u_x·v_x = +0,4949596   u_y·v_y = −0,4949596   v_x·v_y = +0,4949596
u_x·v_y + u_y·v_x = −0,1416446
```

Resepti (S = −1,75, C = 2, α = 170°; sin α = 0,1736482, cos α = −0,9848078):

```
Fxx = −1,75 + 2·0,03015369 = −1,68969262
Fyy = −1,75 + 2·0,96984631 = +0,18969262
Fxy = −2·0,1736482·(−0,9848078) = +0,34202014
```

Kierto:

```
tt = −0,7251792 − 0,3385723 + 0,1082810 = −0,9554705
ss = −0,9645145 + 0,3385723 + 0,0814116 = −0,5445306
ts = 1,87938524·(−0,4949596) + 0,34202014·(−0,1416446) = −0,9302197 − 0,0484462 = −0,9786659
```

Tarkistus: `tt + ss = −1,500001 ≈ −1,5` ✓.

Jako ja palautus:

```
tt' = −0,9554705 / 1,2483540 = −0,7653842
ss' = −0,5445306 / 1,0535080 = −0,5168737
ts' = −0,9786659 / 1,1468000 = −0,8533885

Fxx = −0,3284870 − 0,8447846 − 0,2950436 = −1,4683152
Fyy = −0,4369089 + 0,8447846 − 0,2218311 = +0,1860446
Fxy = +0,3788333 + 0,1208779 − 0,2558316 = +0,2438796
```

Sfäärisylinteriksi (`a = −1,4683152`, `b = 0,1860446`, `c = 0,2438796`):

```
b − a = 1,6543598        −2c = −0,4877592
C = √(2,7369063 + 0,2379091) = √2,9748154 = 1,7247653
2α = atan2(−0,4877592, 1,6543598) = −16,4282°  →  α = −8,2141° → 171,7859°
S = (−1,4683152 + 0,1860446 − 1,7247653)/2 = −1,5035180
```

**OS tarkka: −1,5035 +1,7248 ax 171,79.**

> **Suunnitelman lukuihin verrattuna.** §5.3:n ehdolliset arvot olivat OD
> −0,90 +0,48 ax 169 ja OS −1,50 +1,72 ax 172. Riippumaton johto antaa
> OD −0,9034 +0,4825 ax 168,65 ja OS −1,5035 +1,7248 ax 171,79 — molemmat pyöristyvät
> täsmälleen suunnitelman lukuihin. Odotusarvot eivät siis enää ole ehdollisia.
>
> **Käsinlaskennan tarkkuus.** Välivaiheet on pyöristetty seitsemään desimaaliin, joten
> lopputulosten epävarmuus on luokkaa 1e-4 D. Testin hyväksymisraja on ±0,005 D (§9.3),
> eli mittaluokkaa suurempi kuin käsinlaskennan oma virhe.

### Naiivi 0,25 D:n pyöristys

```
OD: −0,9033923 → −1,00   0,4825492 → 0,50   168,6507 → 169
OS: −1,5035180 → −1,50   1,7247653 → 1,75   171,7859 → 172
```

Täsmää suunnitelman §5.3 odotukseen (OD −1,00 +0,50 ax 169, OS −1,50 +1,75 ax 172).
Ruudukkohaun tulos voi poiketa naiivista; testi vaatii vain, ettei se ole koskaan
huonompi (§5.2).

---

## Tapaus 2 — `tau-zero-identity`

Wrap 0°, panto 0°, pintaväli sama. Tällöin `cos τ = 1`, `k_sag = k_tan = k_risti = 1` ja
käännös on identiteetti. Tilattava = resepti täsmälleen. Tämä on nollatesti koko
ketjulle: jos tämä ei mene läpi, jokin vaihe lisää virhettä tyhjästä.

Odotus: OD −2,25 +1,00 ax 90 → tilattava −2,25 +1,00 ax 90.

---

## Tapaus 3 — `vertex-only`

Vain pintavälikorjaus, ei kallistusta: −8,00 sph, refraktio 13,5 mm, käyttö 10,0 mm.

```
Δd = (13,5 − 10,0)/1000 = 0,0035 m
F' = −8 / (1 − 0,0035·(−8)) = −8 / 1,028 = −7,782101
```

Odotus: tilattava −7,782 sph. Miinusvoimakkuus lähemmäs silmää → vähemmän miinusta,
kuten pitää.

---

## Tapaus 4 — `panto-only-exact` ja `panto-only-martin`

−4,00 sph, panto 20°, wrap 0°, n = 1,586. Pelkkä panto → μ = 90° (tangentiaalimeridiaani
pysty), joten tulos pysyy akselilla 180/90 eikä ristitermiä synny.

```
sin τ = 0,3420201   cos τ = 0,9396926   cos²τ = 0,88302222   tan²τ = 0,13247433
```

**Exakti:**

```
sin τ' = 0,3420201/1,586 = 0,2156494      cos τ' = √(1 − 0,04650466) = 0,9764709
k_sag = (1,586·0,9764709 − 0,9396926)/0,586 = 0,6089902/0,586 = 1,0392324
k_tan = 1,0392324/0,88302222 = 1,1768591
tt = −4/1,1768591 = −3,399893      ss = −4/1,0392324 = −3,848975
```

μ = 90° → `t̂ = (0, 1)`, `ŝ = (−1, 0)`, joten `Fxx = ss = −3,848975`,
`Fyy = tt = −3,399893` ja `Fxy = 0`. Siis `b − a = Fyy − Fxx = +0,449082` ja `c = 0`:

```
C  = √(0,449082²) = 0,449082
2α = atan2(0, +0,449082) = 0°  →  α = 0° → normalisoitu 180°
S  = (−3,848975 − 3,399893 − 0,449082)/2 = −3,848975
```

**Odotus (exakti): −3,849 +0,449 ax 180** (= −3,40 −0,45 ax 90 miinusmuodossa).

**Martin (sarjakehitelmä, vertailuhaara):**

```
k_sag = 1 + sin²τ/(2n) = 1 + 0,11697778/3,172 = 1,0368845
k_tan = k_sag + tan²τ = 1,0368845 + 0,13247433 = 1,1693588
tt = −4/1,1693588 = −3,420690      ss = −4/1,0368845 = −3,857724
```

**Odotus (Martin): −3,858 +0,437 ax 180.**

Ero exaktiin on 0,009 D sfäärissä ja 0,012 D sylinterissä 20°:n kallistuksella — samaa
kokoluokkaa kuin suunnitelman §3.4 lupaa (<0,01 D 25°:een asti).

> **Avoin:** ristiintarkistus OptiCampuksen Lens Tilt & Wrap -laskuria vastaan
> Martin-tilassa (§5.3) on vielä tekemättä. Se on ainoa käytettävissä oleva riippumaton
> ulkoinen lähde ja se kelpaa vain approksimaatiohaaran validointiin.

---

## Tapaus 5 — `plano-stays-plano`

Plano (0,00 sph) kallistuksella wrap 15°, panto 18°. Nollamatriisi jaettuna millä
tahansa positiivisilla kertoimilla on nollamatriisi. Odotus: tilattava plano, residuaali
nolla, ja hyötyarvio **epätosi** — kompensointi ei voi voittaa kompensoimatonta, kun
kumpikin osuu täsmälleen tavoitteeseen.

---

## Tapaus 6 — `pure-cylinder-on-tilt-meridian`

0,00 +2,00 ax 90, panto 20°, wrap 0°, n = 1,586. Reseptin matriisi on `(2, 0, 0)`;
μ = 90°, joten `tt = 0` (pystymeridiaani), `ss = 2`, `ts = 0`.

```
tt' = 0/1,1768591 = 0        ss' = 2/1,0392324 = 1,924487
Fxx = ss' = 1,924487    Fyy = tt' = 0    Fxy = 0
C = 1,924487    2α = atan2(0, −1,924487) = 180° → α = 90°    S = 0
```

**Odotus: 0,00 +1,924 ax 90.** Puhdas sylinteri tilausmeridiaanilla pysyy puhtaana
sylinterinä: jos ristitermiä syntyy, kierto on väärään suuntaan.

---

## Tapaus 7 — `no-benefit-low-power`

OD −0,50 sph, wrap 5°/linssi, panto 8°, n = 1,586.

```
cos τ = cos 5°·cos 8° = 0,9961947·0,9902681 = 0,9865002
cos²τ = 0,9731824    sin τ = 0,1637608
sin τ' = 0,1637608/1,586 = 0,1032287     cos τ' = √(1 − 0,0106562) = 0,9946577
k_sag = (1,586·0,9946577 − 0,9865002)/0,586 = 0,5910269/0,586 = 1,0085783
k_tan = 1,0085783/0,9731824 = 1,0363712
tt = −0,5/1,0363712 = −0,4824542      ss = −0,5/1,0085783 = −0,4957467
n̂ = (−0,0871557, −0,1386436, 0,9865002)   →   μ = 57,845°, sylinterin akseli μ+90 = 147,845°
```

Tilattava tarkka on siis **−0,4957 +0,0133 ax 147,85**: sylinteriä vain 0,013 D.
Naiivi 0,25 D:n pyöristys antaa
sylinteriksi nollan ja sfääriksi −0,50 — **täsmälleen alkuperäisen reseptin**. Silloin
pyöristetyn kompensoinnin residuaali on yhtä suuri kuin kompensoimattoman, ja
hyötyarvion on oltava **epätosi**: *"kompensointi ei tuo hyötyä tässä silmässä 0,25 D:n
askeleella — tilaa alkuperäinen resepti."*

Tämä tapaus on ohjelman rehellisyystesti, ei tarkkuustesti.

---

## Tapaus 8 — `wedge-untilted` (prisma, vaihe P2)

Kiilan poikkeutus ilman kallistusta. Tämä johto käyttää **skalaarista prismakaavaa**,
joka on eri muotoilu kuin koodin vektorimuotoinen Snell — siksi yhtäpitävyys on
todellinen tarkistus eikä saman laskun toisto.

Kiila: kiilakulma A = 5°, n = 1,586, kanta ê_h:n suuntaan, linssitaso kallistamaton
(n̂ = ẑ). Tulossuunta (0, 0, −1). Etupinnan normaali on n̂ kierrettynä 5° kannasta
poispäin, joten se muodostaa 5°:n kulman tulosuunnan kanssa: **i₁ = 5°**.

Skalaarinen prismakaava (tulokulma i₁, taitekulmat r₁ ja r₂ = A − r₁, lähtökulma i₂):

```
sin i₁ = 0,0871557427
sin r₁ = 0,0871557427 / 1,586 = 0,05495318
r₁     = asin(0,05495318) = 0,05498088 rad = 3,150175°
r₂     = A − r₁ = 5° − 3,150175° = 1,849825° = 0,03228586 rad
sin r₂ = 0,03228025
sin i₂ = 1,586 · 0,03228025 = 0,05119648
i₂     = asin(0,05119648) = 0,05121887 rad = 2,934625°
δ      = i₁ + i₂ − A = 5° + 2,934625° − 5° = 2,934625° = 0,05121887 rad
P      = 100 · tan δ = 100 · 0,05126365
```

**Odotusarvo: P = 5,1264 pd, suunta +x (kanta).**

Vertailu ohuen prisman nyrkkisääntöön 100·(n−1)·A = 100·0,586·0,0872665 = 5,1138 pd.
Ero exaktiin on 0,013 pd, eli nyrkkisääntö on oikeassa kokoluokassa muttei riittävä
0,001 pd:n toleranssiin — juuri siksi §3.5 vaatii exaktin Snellin.

**Suunta on osa odotusarvoa.** Kiila, jonka kanta osoittaa suuntaan +x, poikkeuttaa
säteen suuntaan +x: prisma taittaa valoa kantaa kohti. Jos etumerkki kääntyisi, koko
kantasuuntanotaatio kääntyisi peilikuvaksi (§9.1 kohta 3: hiljainen ja tuhoisa virhe).

---

## Tapaus 9 — `wedge-tilted-wrap` (prisma kallistettuna, vaihe P2)

Sama kiila (A = 5°, n = 1,586, kanta ê_h:n suuntaan), mutta linssi on kallistettu:
OS, wrap β = +15°, panto 0°. Kallistus on **kanta–kärki-tasossa**, joten koko kulku
pysyy xz-tasossa ja johto voidaan tehdä käsin tasogeometriana.

```
n̂     = ( sin 15°, 0,  cos 15°)                          takapinnan normaali, +15° z-akselista
ê_h   = ( cos 15°, 0, −sin 15°)
n̂_etu = cos A · n̂ − sin A · ê_h = ( sin 10°, 0, cos 10° )  etupinnan normaali, +10°
```

Pintojen välinen kulma on 15° − 10° = 5° = A, kuten pitääkin.

**Etumerkit on pakko pitää mukana.** Kun kallistus (15°) on suurempi kuin kiilakulma
(5°), tuleva säde osuu etupintaan normaalin *toiselta* puolelta kuin kallistamattomassa
tapauksessa. Silloin klassinen r₂ = A − r₁ EI päde: se olettaa kiilan perusasennon.
Yleinen etumerkillinen muoto, kun θ₁ ja θ₂ ovat etu- ja takapinnan normaalien kulmat
z-akselista (positiivinen +x:ää kohti) ja kulmat mitataan kulkusuunnasta:

```
sisäinen säde   = −θ₁ + asin(sin θ₁ / n)
sisäinen tulokulma takapinnalla  u₂ = θ₂ − θ₁ + asin(sin θ₁ / n)
lähtökulma      = −θ₂ + asin(n · sin u₂)
δ               = lähtökulma
```

Tapaus 8 on tämän erikoistapaus: θ₁ = −5°, θ₂ = 0° antaa u₂ = A − r₁ = 1,849825°.

Tapaus 9, θ₁ = +10°, θ₂ = +15°:

```
asin(sin 10° / 1,586) = asin(0,10948813) = 0,10970807 rad = 6,285809°
sisäinen säde = −10° + 6,285809° = −3,714191°
u₂            = 15° − 10° + 6,285809° = 11,285809°
sin u₂        = 0,19570331
n · sin u₂    = 1,586 · 0,19570331 = 0,31038545
asin(0,31038545) = 0,3155980 rad = 18,082439°
lähtökulma    = −15° + 18,082439° = 3,082439° = 0,05379871 rad
P             = 100 · tan δ = 100 · 0,05385069
```

**Odotusarvo: P = 5,3851 pd, vaakakomponentti positiivinen.**

Sama kiila tuottaa siis kallistettuna **0,26 pd enemmän** prismaa kuin suorassa
(5,3851 vs. 5,1264) — 5 % lisää. Jos kanta olisi kohtisuorassa kallistustasoon nähden,
muutos olisi eri. Tämä on §3.5:n perustelu numeroina: approksimaatio ei kelpaa, koska
vaikutus riippuu kallistuksen suunnasta kanta–kärki-akseliin nähden.

### Johtovirhe, joka jäi kiinni

Tämän tapauksen ensimmäinen johto käytti kaavaa r₂ = A − r₁ tarkistamatta etumerkkejä
ja antoi 5,1715 pd. Testi kaatui, ja tarkistus osoitti johdon vääräksi, ei koodia.
Virhe on kirjattu tähän, koska se on juuri se virhe, jonka tämä geometria houkuttelee
tekemään: kallistus on suurempi kuin kiilakulma, jolloin sisäinen säde kulkee
takapinnan normaalin toisella puolella ja etumerkki kääntyy.

---

## Tapaus 10 — linssitason kanta yhdistetyssä kallistuksessa (18.10.2026)

**Kysymys** (OPEN-QUESTIONS kohta 3): `ocr.ts` kiertää reseptin tangentiaali–
sagittaalikantaan samalla kulmalla μ sekä silmän frontaalitasossa että linssin omassa
tasossa. Tilauksen akseli luetaan kuitenkin linssin omasta 180-linjasta ê_h (kehyksen
datumlinja), ja linssin tangentiaalimeridiaani on oma kulmansa siinä kannassa. Onko
ero todellinen ja kuinka suuri?

**Geometria** (`geometry.ts`, ei muutettu): ê_h = (cos β, sin β·sin θ, −sin β·cos θ),
ê_v = (0, cos θ, sin θ), n̂ = (sin β, −cos β·sin θ, cos β·cos θ).

Sagittaalisuunta on kohtisuorassa sekä katselinjaa ẑ että normaalia n̂ vastaan, joten
se on **sama 3D-vektori kummassakin tasossa**:

```
ŝ = ẑ × n̂ = (−n_y, n_x, 0) = (cos β·sin θ, sin β, 0)
```

Sen komponentit:

```
frontaalikannassa (x̂, ŷ):   (cos β·sin θ,  sin β)
linssin kannassa (ê_h, ê_v): ŝ·ê_h = cos²β·sin θ + sin²β·sin θ = sin θ
                             ŝ·ê_v = sin β·cos θ
```

Tangentiaalimeridiaani on 90° sagittaalisesta:

```
μ_F = atan2(sin β, cos β·sin θ) − 90°        (silmän frontaalitaso; = koodin μ)
μ_L = atan2(sin β·cos θ, sin θ) − 90°        (linssin oma taso)
```

Erikoistapaukset: pelkkä panto (β = 0) → molemmat 0 − 90 ≡ 90°. Pelkkä wrap (θ = 0) →
molemmat ±90 − 90. **Ero syntyy vain, kun molemmat kulmat ovat nollasta poikkeavia.**
Tämä selittää, miksi kaikki yksittäisen kallistuksen tapaukset täsmäsivät
OptiCampuksen kanssa.

### Numerot, OD, wrap 15°, panto 18° (β = −15°, θ = 18°)

```
sin β = −0,25881905   cos β = 0,96592583
sin θ =  0,30901699   cos θ = 0,95105652

frontaali: atan2(−0,25881905, 0,96592583·0,30901699 = 0,29848749) = −40,9293°
           μ_F = −130,9293° ≡ 49,0707°        (koodin μ = 49,0715 ✓)
linssi:    atan2(−0,25881905·0,95105652 = −0,24615154, 0,30901699) = −38,5427°
           μ_L = −128,5427° ≡ 51,4573°

Δ = μ_L − μ_F = +2,387°   (OS: −2,387°, peilikuva)
```

(OPEN-QUESTIONS kohdan 3 aiempi arvio 4,7° oli datumlinjan ê_h oma projektiokulma
atan(tan β·sin θ). Tangentiaalimeridiaanin ero on eri suure, ja se on 2,39°.)

### Oikea käännös

Silmällä toteutuva voimakkuus F lasketaan frontaalikannassa, tilattava linssi P_L
linssin kannassa. Kerroinjako (k_tan, k_sag, k_risti) tehdään tangentiaali–
sagittaalikannassa, joka on fyysisesti sama molemmissa tasoissa. Siis:

```
eteenpäin:  F   = R(μ_F) · K∘[R(μ_L)ᵀ · P_L · R(μ_L)] · R(μ_F)ᵀ
käännös:    P_L = R(μ_L) · K⁻¹∘[R(μ_F)ᵀ · F · R(μ_F)] · R(μ_L)ᵀ
```

Nykyinen koodi käyttää μ_F:ää molemmissa. Koska K⁻¹∘[…] on sama, **oikea tilaus on
nykyinen tilaus kierrettynä Δ:n verran**: voimakkuudet eivät muutu, vain akseli.

### Käsin: −10,00 DS, OD, 18°/15°, n = 1,5

```
cos τ = cos β·cos θ = 0,96592583·0,95105652 = 0,91865005   τ = 23,2705°
sin τ = √(1 − 0,84391790) = 0,39507228
sin τ' = 0,39507228/1,5 = 0,26338152    cos τ' = √(1 − 0,06936983) = 0,96469195
k_sag = (1,5·0,96469195 − 0,91865005)/0,5 = 1,05677577
k_tan = 1,05677577/0,84391790 = 1,25222527
tt = −10/1,25222527 = −7,98578     ss = −10/1,05677577 = −9,46275
```

Tilattava: tangentiaalimeridiaanissa −7,986, sagittaalisessa −9,463, eli miinusmuodossa
**−7,99 −1,48 × 51,46** linssin omasta 180-linjasta. Nykyinen koodi antaa saman
voimakkuuden akselilla × 49,07.

### Riippumaton tarkistus: 3D-säteenjuoksu

Ohut linssi (toorinen etupinta kaarevuusmatriisilla P_L/(n−1) **linssin kannassa**,
tasainen takapinta), säteet tulevat suuntaan −ẑ, pinnoilla vektorimuotoinen Snellin
laki, vergenssi frontaalitasossa keskusdifferensseillä. Ei käytä OCR-kertoimia eikä
μ:ta. Tulos eteenpäin-mallille (P_L → silmällä):

| Tapaus (P_L, OD ellei toisin) | Säteenjuoksu | Uusi malli (μ_L, μ_F) | Nykyinen (μ_F, μ_F) |
|---|---|---|---|
| −4,00, panto 20° | −4,157 −0,551 × 180 | sama | sama |
| −3,00 +2,00 × 135, wrap 15° | −1,058 −2,124 × 46,98 | sama | sama |
| −10,00, 18°/15° | −10,568 −1,955 × 139,07 | −10,568 −1,954 × 139,07 | sama |
| −5,00 +2,00 × 120, 18°/15° | −3,641 −1,811 × 19,13 | −3,641 −1,811 × 19,13 | −3,662 −1,757 × 22,09 |
| sama OS | −3,179 −3,064 × 34,56 | −3,179 −3,064 × 34,56 | −3,185 −3,048 × 32,77 |
| −4,00 +3,00 × 180, 18°/15° | −1,166 −3,376 × 91,64 | −1,166 −3,376 × 91,64 | −1,157 −3,416 × 94,06 |
| +2,00 +2,50 × 30, 20°/25°, n 1,6 | 5,041 −2,062 × 108,77 | 5,041 −2,062 × 108,77 | 4,982 −1,968 × 115,84 |

Uusi malli täsmää säteenjuoksuun 0,001 D:n ja 0,01°:n tarkkuudella kaikissa
tapauksissa. Nykyinen malli täsmää vain, kun yksi kulmista on nolla tai linssi on
pallopinta. (Pallomaisella linssillä kanta ei vaikuta eteenpäin, mutta käännöksessä
syntyy sylinteri, jonka akseli on kannasta riippuvainen. Siksi nykyinen tilaus
−10,00:lle on väärä.)

### Mitä se tarkoittaa tilauksessa

Kun nykyisen koodin ja OptiCampuksen tilaukset viedään säteenjuoksun läpi, saadaan
jäännösvirhe silmällä. Esimerkkejä 18°/15°:lla:

| Resepti | Ei kompensointia | OptiCampus | Nykyinen | Uusi |
|---|---|---|---|---|
| −10,00 DS | 2,59 D | 0,12 D | 0,10 D | 0,000 |
| −3,00 −2,00 × 30 | 0,93 D | 0,26 D | 0,15 D | 0,000 |
| −1,00 −3,00 × 90 | 0,58 D | 0,34 D | 0,18 D | 0,000 |
| −1,75 +2,00 × 170 (OS) | 0,29 D | 0,23 D | 0,12 D | 0,000 |

Luku on matriisierotuksen Frobenius-normi (sama mittari kuin residuaalissa).

**Rajaus:** säteenjuoksu käyttää samaa kehysgeometriaa (`geometry.ts`: ensin wrap,
sitten koko kehyksen panto). Se tarkistaa optiikan ja kannan käsittelyn, ei sitä, onko
kiertojärjestys kasvoilla juuri tämä (OPEN-QUESTIONS kohta 5).
