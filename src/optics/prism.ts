/**
 * Prisma.
 *
 * ENSIMMÄINEN OSA (P0): prismavektorin ja kantasuunnan muunnokset, Prentice-prisma
 * desentraatiosta sekä TCA.
 *
 * TOINEN OSA (P2): linssin kiilamalli, exakti vektorimuotoinen Snell kahdella pinnalla
 * ja määrätyn poikkeutuksen käännös vaimennetulla Newtonilla (suunnitelma §3.5).
 * Käännöksen saa kytkeä pois lipulla `prismModel: 'passThrough'`, jolloin resepti
 * välitetään sellaisenaan ja `validate.ts` varoittaa `prismNotCompensated`.
 *
 * Prismavektori on esitetty koordinaatistossa +x = tarkastelijan oikea, +y = ylös,
 * ja se osoittaa KANNAN suuntaan (prisma taittaa valoa kantaa kohti).
 */
import { toDeg, toRad } from './units.js';
import { normalizeBaseDirection } from './units.js';
import type { PowerMatrix } from './matrix.js';
import type { Vec3 } from './geometry.js';

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

// ============================================================================
// P2: kiilamalli, exakti Snell ja poikkeutuksen käännös (suunnitelma §3.5)
// ============================================================================
//
// Approksimaatio ei kelpaa, koska prisman käyttäytyminen riippuu kallistuksen
// suunnasta kanta-kärki-akseliin nähden. Linssi mallinnetaan kiilana:
//
//   takapinnan normaali  = linssitason normaali n̂
//   etupinnan normaali   = n̂ kierrettynä kiilakulman α verran KANNASTA POISPÄIN
//
// Etumerkki: prisma taittaa valoa kantaa kohti, ja kiila on paksuin kannan puolella.
// Jos etupinnan normaalia kiertää suuntaan û, linssi ohenee û:n suuntaan ja kanta on
// suunnassa −û. Siksi n̂_etu = cos α · n̂ − sin α · b̂, missä b̂ on kannan suunta
// linssitasossa. Tämä etumerkki on testattu (test/prism.test.ts: kanta 0° poikkeuttaa
// säteen suuntaan +x).
//
// Kiila esitetään SISÄISESTI karteesisena vektorina w = (w_h, w_v) linssitason
// kannassa: kiilakulma on α = |w| ja kannan suunta b̂ = w/|w|. Napakoordinaatit
// (α, kantakulma) olisivat singulaariset nollassa — kantakulma ei ole määritelty,
// kun α = 0, ja juuri siellä jakobiaani hajoaa. Karteesisessa esityksessä F(w) on
// sileä nollan läpi. Ks. docs/OPEN-QUESTIONS.md kohta 11.

/** Kiilan parametri linssitason kannassa: α = |w| radiaaneina, kanta w:n suunnassa. */
export interface WedgeVector {
  /** ê_h-komponentti, radiaaneina. */
  readonly h: number;
  /** ê_v-komponentti, radiaaneina. */
  readonly v: number;
}

/** Linssitason ortonormaali kanta. `geometry.ts`:n `TiltGeometry` kelpaa sellaisenaan. */
export interface LensFrame {
  readonly normal: Vec3;
  readonly eh: Vec3;
  readonly ev: Vec3;
}

/** Kallistamaton linssi: focimetrin geometria, jossa tilattava prisma mitataan. */
export const UNTILTED_FRAME: LensFrame = {
  normal: [0, 0, 1],
  eh: [1, 0, 0],
  ev: [0, 1, 0],
};

const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

function combine(coefficients: readonly number[], vectors: readonly Vec3[]): Vec3 {
  let x = 0;
  let y = 0;
  let z = 0;
  for (let i = 0; i < vectors.length; i++) {
    x += coefficients[i] * vectors[i][0];
    y += coefficients[i] * vectors[i][1];
    z += coefficients[i] * vectors[i][2];
  }
  const length = Math.hypot(x, y, z);
  return length > 0 ? [x / length, y / length, z / length] : [x, y, z];
}

/** Kiilan etupinnan normaali. Sileä myös w = 0:ssa (sin α / α -> 1). */
export function wedgeFrontNormal(wedge: WedgeVector, frame: LensFrame): Vec3 {
  const alpha = Math.hypot(wedge.h, wedge.v);
  if (alpha < 1e-15) return frame.normal;
  const s = Math.sin(alpha) / alpha;
  return combine(
    [Math.cos(alpha), -s * wedge.h, -s * wedge.v],
    [frame.normal, frame.eh, frame.ev],
  );
}

/**
 * Vektorimuotoinen Snell. `eta` = n_saapumis / n_lähtö (ilma -> lasi: 1/n, lasi ->
 * ilma: n). Normaali käännetään sädettä
 * vastaan, joten kutsujan ei tarvitse tietää kummalta puolelta pintaa tullaan.
 * Palauttaa null kokonaisheijastuksessa.
 */
export function refract(direction: Vec3, surfaceNormal: Vec3, eta: number): Vec3 | null {
  let normal = surfaceNormal;
  let cosIncidence = -dot(direction, normal);
  if (cosIncidence < 0) {
    normal = [-normal[0], -normal[1], -normal[2]];
    cosIncidence = -cosIncidence;
  }
  const k = 1 - eta * eta * (1 - cosIncidence * cosIncidence);
  if (k < 0) return null;
  const factor = eta * cosIncidence - Math.sqrt(k);
  return combine([eta, factor], [direction, normal]);
}

/**
 * Kiilan poikkeutus prismadioptrioina. Tulossuunta on (0, 0, −1): valo tulee
 * edestä silmää kohti (suunnitelma §3.5).
 *
 * Prismadioptria on poikkeama sadan yksikön matkalla, joten komponentit ovat
 * 100·d_x/(−d_z) ja 100·d_y/(−d_z). Tulos osoittaa kannan suuntaan.
 *
 * Palauttaa null, jos säde ei läpäise kiilaa (kokonaisheijastus tai takaisin
 * kääntyvä säde) — epäfysikaalinen syöte ei saa palauttaa lukua.
 */
export function wedgeDeviation(
  wedge: WedgeVector,
  frame: LensFrame,
  refractiveIndex: number,
): PrismVector | null {
  if (!(refractiveIndex > 1)) return null;
  // Mallin määrittelyalue: kiilakulma alle 90°. Sen yli etupinnan normaali kääntyy
  // poispäin tulevasta valosta, eikä kyseessä ole enää linssin pinta. Ilman tätä
  // rajaa juurenhaku voi vaeltaa alueelle, jossa kaava tuottaa lukuja mutta
  // geometria on merkityksetön (havaittu: 250 pd:n tavoite -> 253°:n kiila).
  if (!(Math.hypot(wedge.h, wedge.v) < Math.PI / 2)) return null;
  const incident: Vec3 = [0, 0, -1];
  const inGlass = refract(incident, wedgeFrontNormal(wedge, frame), 1 / refractiveIndex);
  if (!inGlass) return null;
  const outgoing = refract(inGlass, frame.normal, refractiveIndex);
  if (!outgoing) return null;
  const forward = -outgoing[2];
  if (!(forward > 1e-9)) return null;
  return {
    horizontal: (100 * outgoing[0]) / forward,
    vertical: (100 * outgoing[1]) / forward,
  };
}

/** Kiilakulma asteina. */
export const wedgeApexAngleDeg = (wedge: WedgeVector): number =>
  toDeg(Math.hypot(wedge.h, wedge.v));

/** Kannan suunta linssitasossa, asteina ê_h:sta vastapäivään. */
export const wedgeBaseDeg = (wedge: WedgeVector): number =>
  Math.hypot(wedge.h, wedge.v) < 1e-15
    ? 0
    : normalizeBaseDirection(toDeg(Math.atan2(wedge.v, wedge.h)));

export interface WedgeSolveOptions {
  /** Hyväksymisraja, pd (suunnitelma §3.5: 0,001 pd). */
  readonly tolerancePd?: number;
  readonly maxIterations?: number;
  /** |P| tämän alle -> yksi lineaarinen askel ilman iteraatiota. */
  readonly linearThresholdPd?: number;
}

export interface WedgeSolution {
  /** Epätosi = juurenhaku ei supennut. Kutsuja EI saa esittää tulosta prismana. */
  readonly ok: boolean;
  readonly wedge: WedgeVector;
  readonly apexAngleDeg: number;
  readonly baseDeg: number;
  /** |poikkeutus − tavoite|, pd. */
  readonly residualPd: number;
  readonly iterations: number;
  readonly method: 'zero' | 'linear' | 'newton' | 'newtonFromGrid' | 'failed';
}

const DEFAULT_TOLERANCE_PD = 0.001;
const DEFAULT_MAX_ITERATIONS = 40;
const DEFAULT_LINEAR_THRESHOLD_PD = 0.05;
const JACOBIAN_STEP_RAD = 1e-6;
const MAX_HALVINGS = 12;

const prismNorm = (p: PrismVector): number => Math.hypot(p.horizontal, p.vertical);

const prismDifference = (a: PrismVector, b: PrismVector): PrismVector => ({
  horizontal: a.horizontal - b.horizontal,
  vertical: a.vertical - b.vertical,
});

/**
 * Jakobiaani ∂P/∂w keskeisdifferensseillä. Analyyttinen derivaatta kahden Snellin
 * läpi olisi pitkä ja virhealtis; numeerinen on tässä sekä riittävä että
 * tarkistettavissa (askel 1e-6 rad).
 */
function jacobian(
  wedge: WedgeVector,
  frame: LensFrame,
  refractiveIndex: number,
): readonly [PrismVector, PrismVector] | null {
  const h = JACOBIAN_STEP_RAD;
  const hPlus = wedgeDeviation({ h: wedge.h + h, v: wedge.v }, frame, refractiveIndex);
  const hMinus = wedgeDeviation({ h: wedge.h - h, v: wedge.v }, frame, refractiveIndex);
  const vPlus = wedgeDeviation({ h: wedge.h, v: wedge.v + h }, frame, refractiveIndex);
  const vMinus = wedgeDeviation({ h: wedge.h, v: wedge.v - h }, frame, refractiveIndex);
  if (!hPlus || !hMinus || !vPlus || !vMinus) return null;
  const scale = 1 / (2 * h);
  return [
    {
      horizontal: (hPlus.horizontal - hMinus.horizontal) * scale,
      vertical: (hPlus.vertical - hMinus.vertical) * scale,
    },
    {
      horizontal: (vPlus.horizontal - vMinus.horizontal) * scale,
      vertical: (vPlus.vertical - vMinus.vertical) * scale,
    },
  ];
}

/** Ratkaisee J·x = rhs. Palauttaa null, jos jakobiaani on käytännössä singulaarinen. */
function solve2x2(
  columns: readonly [PrismVector, PrismVector],
  rhs: PrismVector,
): WedgeVector | null {
  const [first, second] = columns;
  const determinant = first.horizontal * second.vertical - second.horizontal * first.vertical;
  if (Math.abs(determinant) < 1e-12) return null;
  return {
    h: (rhs.horizontal * second.vertical - second.horizontal * rhs.vertical) / determinant,
    v: (first.horizontal * rhs.vertical - rhs.horizontal * first.vertical) / determinant,
  };
}

/** Karkea ruudukkohaku varasuunnitelmana, jos lineaarinen alkuarvaus ei riitä. */
function gridSearch(target: PrismVector, frame: LensFrame, refractiveIndex: number): WedgeVector {
  let best: WedgeVector = { h: 0, v: 0 };
  let bestError = Number.POSITIVE_INFINITY;
  for (let apexDeg = 0; apexDeg <= 20; apexDeg += 0.5) {
    const alpha = toRad(apexDeg);
    for (let baseDeg = 0; baseDeg < 360; baseDeg += 10) {
      const angle = toRad(baseDeg);
      const candidate: WedgeVector = { h: alpha * Math.cos(angle), v: alpha * Math.sin(angle) };
      const deviation = wedgeDeviation(candidate, frame, refractiveIndex);
      if (!deviation) continue;
      const error = prismNorm(prismDifference(deviation, target));
      if (error < bestError) {
        bestError = error;
        best = candidate;
      }
    }
  }
  return best;
}

/**
 * Käännös: etsii kiilan, jonka poikkeutus annetussa kehyksessä on `target`
 * (suunnitelma §3.5).
 *
 * Vaimennettu Newton numeerisella jakobiaanilla ja askelpituuden puolituksella;
 * bisektio ei yleisty kahteen ulottuvuuteen. Alkuarvaus on yksi lineaarinen askel
 * nollasta, J(0)^-1 · target — se on tälle lähes lineaariselle tehtävälle tarkempi
 * kuin karkea ruudukko, joka jää varasuunnitelmaksi jos Newton ei suppene.
 *
 * Epäonnistuminen palautetaan lippuna, ei huonoimpana arvauksena: kutsuja on
 * velvollinen näyttämään virheen eikä lukua.
 */
export function solveWedgeForPrism(
  target: PrismVector,
  frame: LensFrame,
  refractiveIndex: number,
  options: WedgeSolveOptions = {},
): WedgeSolution {
  const tolerance = options.tolerancePd ?? DEFAULT_TOLERANCE_PD;
  const maxIterations = options.maxIterations ?? DEFAULT_MAX_ITERATIONS;
  const linearThreshold = options.linearThresholdPd ?? DEFAULT_LINEAR_THRESHOLD_PD;

  const describe = (
    wedge: WedgeVector,
    residualPd: number,
    iterations: number,
    method: WedgeSolution['method'],
    ok: boolean,
  ): WedgeSolution => ({
    ok,
    wedge,
    apexAngleDeg: wedgeApexAngleDeg(wedge),
    baseDeg: wedgeBaseDeg(wedge),
    residualPd,
    iterations,
    method,
  });

  const zero: WedgeVector = { h: 0, v: 0 };
  if (prismNorm(target) < 1e-12) return describe(zero, 0, 0, 'zero', true);

  const errorAt = (wedge: WedgeVector): { value: PrismVector; norm: number } | null => {
    const deviation = wedgeDeviation(wedge, frame, refractiveIndex);
    if (!deviation) return null;
    const value = prismDifference(deviation, target);
    return { value, norm: prismNorm(value) };
  };

  const startJacobian = jacobian(zero, frame, refractiveIndex);
  const linearGuess = startJacobian ? solve2x2(startJacobian, target) : null;

  // Nollan lähellä yksi lineaarinen askel riittää (§3.5): iteraatio ei paranna
  // tulosta mitattavasti, ja se on juuri se alue, jossa napakoordinaatit hajoaisivat.
  if (linearGuess && prismNorm(target) < linearThreshold) {
    const linearError = errorAt(linearGuess);
    if (linearError && linearError.norm <= tolerance) {
      return describe(linearGuess, linearError.norm, 1, 'linear', true);
    }
  }

  const attempt = (
    start: WedgeVector,
    method: 'newton' | 'newtonFromGrid',
  ): WedgeSolution | null => {
    let wedge = start;
    let current = errorAt(wedge);
    if (!current) return null;

    for (let iteration = 1; iteration <= maxIterations; iteration++) {
      if (current.norm <= tolerance) {
        return describe(wedge, current.norm, iteration - 1, method, true);
      }
      const columns = jacobian(wedge, frame, refractiveIndex);
      if (!columns) return null;
      const step = solve2x2(columns, {
        horizontal: -current.value.horizontal,
        vertical: -current.value.vertical,
      });
      if (!step) return null;

      let damping = 1;
      let improved = false;
      for (let halving = 0; halving <= MAX_HALVINGS; halving++) {
        const candidate: WedgeVector = {
          h: wedge.h + damping * step.h,
          v: wedge.v + damping * step.v,
        };
        const candidateError = errorAt(candidate);
        if (candidateError && candidateError.norm < current.norm) {
          wedge = candidate;
          current = candidateError;
          improved = true;
          break;
        }
        damping /= 2;
      }
      if (!improved) {
        return current.norm <= tolerance
          ? describe(wedge, current.norm, iteration, method, true)
          : null;
      }
    }
    return current.norm <= tolerance
      ? describe(wedge, current.norm, maxIterations, method, true)
      : null;
  };

  const fromLinear = linearGuess ? attempt(linearGuess, 'newton') : null;
  if (fromLinear) return fromLinear;

  const fromGrid = attempt(gridSearch(target, frame, refractiveIndex), 'newtonFromGrid');
  if (fromGrid) return fromGrid;

  const fallback = linearGuess ?? zero;
  const fallbackError = errorAt(fallback);
  return describe(fallback, fallbackError?.norm ?? Number.NaN, maxIterations, 'failed', false);
}
