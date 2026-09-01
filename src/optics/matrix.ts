/**
 * Voimakkuusmatriisit (suunnitelma §3.1).
 *
 * KOORDINAATISTO — yksi konventio koko ytimessä:
 *   +x = tarkastelijan oikea (= käyttäjän vasen puoli), potilasta kasvoista katsottuna
 *   +y = ylös
 *   +z = tarkastelijaa/kohdetta kohti, eli valon tulosuunta on (0, 0, −1)
 * Kulmat mitataan +x-akselilta vastapäivään tarkastelijan näkymässä. Tämä on sama
 * konventio kuin TABO-akselijärjestelmässä (0° on tarkastelijan oikealla kummallakin
 * lasilla) ja sama kuin prisman kantasuunnan 360°-notaatiossa (ks. format.ts).
 *
 * Voimakkuusmatriisi on symmetrinen 2x2: [[xx, xy], [xy, yy]] dioptrioina.
 * Voimakkuus meridiaanin suunnassa û on ûᵀ M û.
 */
import { normalizeAxis, toDeg, toRad } from './units.js';

export interface PowerMatrix {
  /** Voimakkuus vaakameridiaanilla (x). */
  readonly xx: number;
  /** Voimakkuus pystymeridiaanilla (y). */
  readonly yy: number;
  /** Ristitermi. */
  readonly xy: number;
}

/** Sfäärisylinteri plus-sylinterimuodossa; akseli 0 < axis <= 180. */
export interface SpheroCyl {
  readonly sphere: number;
  readonly cylinder: number;
  readonly axis: number;
}

/** Matriisi (t, s)-kannassa: t = tangentiaalinen, s = sagittaalinen, ts = ristitermi. */
export interface RotatedMatrix {
  readonly tt: number;
  readonly ss: number;
  readonly ts: number;
}

/**
 * Sfäärisylinteri -> matriisi:
 *   Fxx = S + C·sin²α, Fyy = S + C·cos²α, Fxy = −C·sin α·cos α
 * Toimii myös miinussylinterimuodolle (C < 0); tulos on sama matriisi.
 */
export function matrixFromSpheroCyl(power: SpheroCyl): PowerMatrix {
  const a = toRad(power.axis);
  const sin = Math.sin(a);
  const cos = Math.cos(a);
  return {
    xx: power.sphere + power.cylinder * sin * sin,
    yy: power.sphere + power.cylinder * cos * cos,
    xy: -power.cylinder * sin * cos,
  };
}

/**
 * Matriisi -> sfäärisylinteri PLUS-muodossa (C >= 0):
 *   C = √((b−a)² + 4c²), 2α = atan2(−2c, b−a), S = (a+b−C)/2
 */
export function spheroCylFromMatrix(m: PowerMatrix): SpheroCyl {
  const cylinder = Math.hypot(m.yy - m.xx, 2 * m.xy);
  const axis = normalizeAxis(toDeg(Math.atan2(-2 * m.xy, m.yy - m.xx)) / 2);
  const sphere = (m.xx + m.yy - cylinder) / 2;
  return { sphere, cylinder, axis };
}

/** Voimakkuus meridiaanilla, joka on kulmassa `angleDeg` +x-akselista. */
export function powerAlongMeridian(m: PowerMatrix, angleDeg: number): number {
  const a = toRad(angleDeg);
  const c = Math.cos(a);
  const s = Math.sin(a);
  return m.xx * c * c + 2 * m.xy * c * s + m.yy * s * s;
}

/**
 * Kierto (t, s)-kantaan: t on suunnassa `angleDeg`, s kohtisuorassa sitä vastaan.
 * M' = Rᵀ M R, missä R:n sarakkeet ovat (t̂, ŝ).
 */
export function rotateToBasis(m: PowerMatrix, angleDeg: number): RotatedMatrix {
  const a = toRad(angleDeg);
  const c = Math.cos(a);
  const s = Math.sin(a);
  // t̂ = (c, s), ŝ = (−s, c)
  return {
    tt: m.xx * c * c + 2 * m.xy * c * s + m.yy * s * s,
    ss: m.xx * s * s - 2 * m.xy * c * s + m.yy * c * c,
    ts: (m.yy - m.xx) * c * s + m.xy * (c * c - s * s),
  };
}

/** Käänteinen kierto: M = R M' Rᵀ. */
export function rotateFromBasis(r: RotatedMatrix, angleDeg: number): PowerMatrix {
  const a = toRad(angleDeg);
  const c = Math.cos(a);
  const s = Math.sin(a);
  return {
    xx: r.tt * c * c - 2 * r.ts * c * s + r.ss * s * s,
    yy: r.tt * s * s + 2 * r.ts * c * s + r.ss * c * c,
    xy: r.tt * c * s + r.ts * (c * c - s * s) - r.ss * c * s,
  };
}

export function addMatrix(a: PowerMatrix, b: PowerMatrix): PowerMatrix {
  return { xx: a.xx + b.xx, yy: a.yy + b.yy, xy: a.xy + b.xy };
}

export function subtractMatrix(a: PowerMatrix, b: PowerMatrix): PowerMatrix {
  return { xx: a.xx - b.xx, yy: a.yy - b.yy, xy: a.xy - b.xy };
}

export function scaleMatrix(m: PowerMatrix, factor: number): PowerMatrix {
  return { xx: m.xx * factor, yy: m.yy * factor, xy: m.xy * factor };
}

/**
 * Frobenius-normi. Symmetriselle matriisille ristitermi lasketaan kahdesti:
 * ‖M‖_F = √(xx² + yy² + 2·xy²). Tätä käytetään dioptrisena etäisyytenä
 * (§3.6) sekä pyöristysruudukon kohdefunktiona.
 */
export function frobeniusNorm(m: PowerMatrix): number {
  return Math.sqrt(m.xx * m.xx + m.yy * m.yy + 2 * m.xy * m.xy);
}

/** Dioptrinen etäisyys kahden voimakkuuden välillä. */
export function dioptricDistance(a: PowerMatrix, b: PowerMatrix): number {
  return frobeniusNorm(subtractMatrix(a, b));
}

/** Sfäärinen ekvivalentti M = (xx + yy)/2. */
export function sphericalEquivalent(m: PowerMatrix): number {
  return (m.xx + m.yy) / 2;
}

/** Onko matriisi käytännössä nolla (plano). */
export function isPlano(m: PowerMatrix, epsilon = 1e-9): boolean {
  return frobeniusNorm(m) < epsilon;
}

/**
 * Päämeridiaanit: [heikompi, vahvempi] voimakkuus ja heikomman meridiaanin kulma.
 * Plus-muodossa sfääri on akselin suuntainen meridiaani ja sfääri+sylinteri sitä
 * vastaan kohtisuora.
 */
export function principalMeridians(m: PowerMatrix): {
  axisDeg: number;
  alongAxis: number;
  acrossAxis: number;
} {
  const sc = spheroCylFromMatrix(m);
  return {
    axisDeg: sc.axis,
    alongAxis: sc.sphere,
    acrossAxis: sc.sphere + sc.cylinder,
  };
}
