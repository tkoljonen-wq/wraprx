/**
 * Riippumaton numeerinen käännös — VAIN VERIFIOINTIIN (suunnitelma §5.1).
 *
 * Tämä moduuli ei ole tuotantopolulla. Se ratkaisee saman ongelman kuin
 * `inverseTilt`, mutta täysin eri tietä: se ei tiedä mitään kertoimien jakamisesta
 * eikä (t, s)-kannasta, vaan kohtelee eteenpäin-mallia mustana laatikkona ja
 * iteroi, kunnes tulos vastaa reseptiä.
 *
 * Jos analyyttisessä johdossa on merkkivirhe tai ristitermin kerroin on väärin,
 * consistency.test.ts kaatuu — vaikkei kukaan tietäisi oikeaa vastausta.
 *
 * Menetelmä: vaimennettu Newton numeerisella jakobiaanilla kolmelle
 * matriisikomponentille (xx, yy, xy). Askelpituutta puolitetaan kunnes residuaali
 * pienenee; bisektio ei yleisty useampaan ulottuvuuteen (vrt. §3.5).
 */
import { frobeniusNorm, subtractMatrix, type PowerMatrix } from './matrix.js';
import { forwardTilt, type OcrCoefficients } from './ocr.js';

export interface NumericInverseOptions {
  /** Suppenemisraja residuaalin Frobenius-normille, dioptrioina. */
  readonly tolerance?: number;
  readonly maxIterations?: number;
  /** Differenssiaskel jakobiaanille, dioptrioina. */
  readonly jacobianStep?: number;
  readonly maxHalvings?: number;
}

export interface NumericInverseIteration {
  readonly iteration: number;
  readonly residualNorm: number;
  readonly stepScale: number;
}

export interface NumericInverseResult {
  readonly matrix: PowerMatrix;
  readonly converged: boolean;
  readonly residualNorm: number;
  readonly iterations: readonly NumericInverseIteration[];
}

type Vec = [number, number, number];

const toMatrix = (v: Vec): PowerMatrix => ({ xx: v[0], yy: v[1], xy: v[2] });

/** Ratkaisee 3x3-järjestelmän A·x = b Gaussin eliminoinnilla osittaispivotoinnilla. */
function solve3(a: number[][], b: Vec): Vec | null {
  const m: number[][] = [
    [a[0][0], a[0][1], a[0][2], b[0]],
    [a[1][0], a[1][1], a[1][2], b[1]],
    [a[2][0], a[2][1], a[2][2], b[2]],
  ];
  for (let col = 0; col < 3; col++) {
    let pivot = col;
    for (let row = col + 1; row < 3; row++) {
      if (Math.abs(m[row][col]) > Math.abs(m[pivot][col])) pivot = row;
    }
    if (Math.abs(m[pivot][col]) < 1e-14) return null;
    if (pivot !== col) {
      const tmp = m[pivot];
      m[pivot] = m[col];
      m[col] = tmp;
    }
    const pivotValue = m[col][col];
    for (let row = col + 1; row < 3; row++) {
      const factor = m[row][col] / pivotValue;
      if (factor === 0) continue;
      for (let k = col; k < 4; k++) {
        m[row][k] -= factor * m[col][k];
      }
    }
  }
  const x: Vec = [0, 0, 0];
  for (let row = 2; row >= 0; row--) {
    let sum = m[row][3];
    for (let k = row + 1; k < 3; k++) sum -= m[row][k] * x[k];
    x[row] = sum / m[row][row];
  }
  return x;
}

export function inverseTiltNumeric(
  target: PowerMatrix,
  coefficients: OcrCoefficients,
  muDeg: number,
  options: NumericInverseOptions = {},
): NumericInverseResult {
  const tolerance = options.tolerance ?? 1e-12;
  const maxIterations = options.maxIterations ?? 60;
  const step = options.jacobianStep ?? 1e-4;
  const maxHalvings = options.maxHalvings ?? 30;

  const errorOf = (v: Vec): PowerMatrix =>
    subtractMatrix(forwardTilt(toMatrix(v), coefficients, muDeg), target);

  // Alkuarvaus: tilattava = haluttu. Kallistus on pieni häiriö, joten tämä on lähellä.
  let x: Vec = [target.xx, target.yy, target.xy];
  let error = errorOf(x);
  let norm = frobeniusNorm(error);
  const iterations: NumericInverseIteration[] = [{ iteration: 0, residualNorm: norm, stepScale: 0 }];

  for (let iteration = 1; iteration <= maxIterations && norm > tolerance; iteration++) {
    // Numeerinen jakobiaani keskeisdifferensseillä.
    const jacobian: number[][] = [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ];
    for (let col = 0; col < 3; col++) {
      const plus: Vec = [x[0], x[1], x[2]];
      const minus: Vec = [x[0], x[1], x[2]];
      plus[col] += step;
      minus[col] -= step;
      const ep = errorOf(plus);
      const em = errorOf(minus);
      jacobian[0][col] = (ep.xx - em.xx) / (2 * step);
      jacobian[1][col] = (ep.yy - em.yy) / (2 * step);
      jacobian[2][col] = (ep.xy - em.xy) / (2 * step);
    }

    const delta = solve3(jacobian, [-error.xx, -error.yy, -error.xy]);
    if (!delta) break;

    let scale = 1;
    let accepted = false;
    for (let halving = 0; halving <= maxHalvings; halving++) {
      const candidate: Vec = [x[0] + scale * delta[0], x[1] + scale * delta[1], x[2] + scale * delta[2]];
      const candidateError = errorOf(candidate);
      const candidateNorm = frobeniusNorm(candidateError);
      if (candidateNorm < norm || candidateNorm <= tolerance) {
        x = candidate;
        error = candidateError;
        norm = candidateNorm;
        accepted = true;
        iterations.push({ iteration, residualNorm: norm, stepScale: scale });
        break;
      }
      scale /= 2;
    }
    if (!accepted) break;
  }

  return {
    matrix: toMatrix(x),
    converged: norm <= tolerance,
    residualNorm: norm,
    iterations,
  };
}
