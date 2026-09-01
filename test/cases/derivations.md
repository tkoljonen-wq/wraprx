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
