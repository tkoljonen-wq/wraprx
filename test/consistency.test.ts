/**
 * Analyyttinen vs. numeerinen käännös (suunnitelma §5.1, §9.3).
 *
 * Kaksi riippumatonta toteutusta samaan lukuun. `ocr-numeric.ts` ei tiedä mitään
 * kertoimien jakamisesta: se kohtelee eteenpäin-mallia mustana laatikkona ja iteroi.
 * Jos analyyttisessä johdossa on merkkivirhe tai ristitermin kerroin on väärin, tämä
 * testi kaatuu — vaikkei kukaan tietäisi oikeaa vastausta.
 *
 * Vaatimus (§9.3): yhtäpitävyys 1e-6 D:n tarkkuudella tuhannella satunnaissyötteellä.
 */
import { describe, expect, it } from 'vitest';

import { dioptricDistance, matrixFromSpheroCyl } from '../src/optics/matrix.js';
import { forwardTilt, inverseTilt, ocrCoefficients, type OcrMethod } from '../src/optics/ocr.js';
import { inverseTiltNumeric } from '../src/optics/ocr-numeric.js';

/** Deterministinen PRNG (mulberry32), jotta epäonnistuminen on toistettavissa. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SAMPLE_COUNT = 1000;
const METHODS: readonly OcrMethod[] = ['exact', 'martin'];

describe('analyyttinen ja numeerinen käännös', () => {
  it(`ovat yhtäpitäviä 1e-6 D:n tarkkuudella ${SAMPLE_COUNT} satunnaissyötteellä`, () => {
    const random = mulberry32(20260817);
    let worstDifference = 0;
    let worstCase = '';
    let nonConverged = 0;

    for (let i = 0; i < SAMPLE_COUNT; i++) {
      const method = METHODS[i % METHODS.length];
      const sphere = -12 + random() * 24;
      const cylinder = random() * 6;
      const axis = 0.5 + random() * 179.5;
      const tau = random() * 40;
      const index = 1.45 + random() * 0.35;
      const mu = 0.5 + random() * 179.5;

      const target = matrixFromSpheroCyl({ sphere, cylinder, axis });
      const coefficients = ocrCoefficients(tau, index, method);

      const analytic = inverseTilt(target, coefficients, mu);
      const numeric = inverseTiltNumeric(target, coefficients, mu);
      if (!numeric.converged) nonConverged++;

      const difference = dioptricDistance(analytic, numeric.matrix);
      if (difference > worstDifference) {
        worstDifference = difference;
        worstCase = `sph ${sphere.toFixed(3)} cyl ${cylinder.toFixed(3)} ax ${axis.toFixed(1)} τ ${tau.toFixed(2)} n ${index.toFixed(3)} μ ${mu.toFixed(1)} (${method})`;
      }
    }

    expect(nonConverged, 'numeerinen käännös ei suppeni kaikilla syötteillä').toBe(0);
    expect(worstDifference, `pahin ero: ${worstCase}`).toBeLessThan(1e-6);
  });

  it('eteenpäin-malli palauttaa tavoitteen käännöksen jälkeen (1e-9 D)', () => {
    const random = mulberry32(4242);
    let worst = 0;
    for (let i = 0; i < SAMPLE_COUNT; i++) {
      const target = matrixFromSpheroCyl({
        sphere: -10 + random() * 20,
        cylinder: random() * 5,
        axis: 0.5 + random() * 179.5,
      });
      const coefficients = ocrCoefficients(random() * 35, 1.45 + random() * 0.35, 'exact');
      const mu = random() * 180;
      const ordered = inverseTilt(target, coefficients, mu);
      worst = Math.max(worst, dioptricDistance(forwardTilt(ordered, coefficients, mu), target));
    }
    expect(worst).toBeLessThan(1e-9);
  });
});
