/**
 * Prisma.
 *
 * P0 SISÄLTÄÄ VAIN: prismavektorin ja kantasuunnan muunnokset, Prentice-prisman
 * desentraatiosta sekä TCA:n. Nämä tarvitaan tulokseen jo P0:ssa.
 *
 * P2 TÄYDENTÄÄ: linssin kiilamalli, exakti vektorimuotoinen Snell kahdella pinnalla
 * ja määrätyn poikkeutuksen käännös vaimennetulla Newtonilla (suunnitelma §3.5).
 * Siihen asti reseptin prisma välitetään sellaisenaan ja `validate.ts` antaa
 * varoituksen `prismNotCompensated`.
 *
 * Prismavektori on esitetty koordinaatistossa +x = tarkastelijan oikea, +y = ylös,
 * ja se osoittaa KANNAN suuntaan (prisma taittaa valoa kantaa kohti).
 */
import { toDeg, toRad } from './units.js';
import { normalizeBaseDirection } from './units.js';
import type { PowerMatrix } from './matrix.js';

export interface PrismVector {
  /** Vaakakomponentti prismadioptrioina, positiivinen = kanta +x (tarkastelijan oikea). */
  readonly horizontal: number;
  /** Pystykomponentti prismadioptrioina, positiivinen = kanta ylös. */
  readonly vertical: number;
}

export interface PrismSpec {
  readonly magnitude: number;
  /** Kantasuunta 360°-notaatiossa, ks. format.ts. */
  readonly base: number;
}

export function prismSpecToVector(spec: PrismSpec): PrismVector {
  const a = toRad(spec.base);
  return {
    horizontal: spec.magnitude * Math.cos(a),
    vertical: spec.magnitude * Math.sin(a),
  };
}

export function prismVectorToSpec(vector: PrismVector): PrismSpec {
  const magnitude = Math.hypot(vector.horizontal, vector.vertical);
  if (magnitude < 1e-12) return { magnitude: 0, base: 0 };
  return {
    magnitude,
    base: normalizeBaseDirection(toDeg(Math.atan2(vector.vertical, vector.horizontal))),
  };
}

export function addPrismVectors(a: PrismVector, b: PrismVector): PrismVector {
  return { horizontal: a.horizontal + b.horizontal, vertical: a.vertical + b.vertical };
}

export function negatePrismVector(a: PrismVector): PrismVector {
  return { horizontal: -a.horizontal, vertical: -a.vertical };
}

/**
 * Prentice-prisma: mikä prisma syntyy, jos katselinja kulkee OC:n ohi.
 *
 * p = −M·c, missä c on siirtymä senttimetreinä OC:sta katselupisteeseen ja M
 * voimakkuusmatriisi dioptrioina. Etumerkki: plus-linssin katselupisteessä, joka on
 * OC:n yläpuolella, linssi on paksumpi alaspäin -> kanta alas, siis kanta osoittaa
 * OC:ta kohti. Miinuslinssillä päinvastoin. Tarkistus: +5,00 D ja 4 mm ylöspäin
 * antaa 2,0 pd kanta alas.
 *
 * Matriisi kerrotaan täydellä muodolla, joten sylinterin akselin aiheuttama
 * vinoprisma tulee mukaan automaattisesti.
 */
export function prenticePrism(
  lensPower: PowerMatrix,
  offsetMm: { readonly h: number; readonly v: number },
): PrismVector {
  const cx = offsetMm.h / 10;
  const cy = offsetMm.v / 10;
  return {
    horizontal: -(lensPower.xx * cx + lensPower.xy * cy),
    vertical: -(lensPower.xy * cx + lensPower.yy * cy),
  };
}

/**
 * Poikittainen kromaattinen aberraatio TCA = P/ν (suunnitelma §2.2 kohta 4).
 * Esim. polykarbonaatti (ν ≈ 30) ja 2 pd -> 0,07 pd, jo värireunojen kynnyksellä.
 */
export function transverseChromaticAberration(prismDioptres: number, abbe: number): number {
  if (!(abbe > 0)) return Number.NaN;
  return Math.abs(prismDioptres) / abbe;
}
