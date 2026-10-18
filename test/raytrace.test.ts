/**
 * Riippumaton tarkistus säteenjuoksulla (derivations.md tapaus 10).
 *
 * `test/support/raytrace.ts` laskee kallistetun linssin vaikutuksen silmällä
 * Snellin lailla pinta kerrallaan, ilman OCR-kertoimia ja ilman μ:ta. Jos
 * analyyttinen malli käsittelee linssin kantaa väärin — kuten ennen 18.10.2026,
 * jolloin yhdistetyn kallistuksen tilausakseli oli 2,4° pielessä — nämä kaatuvat.
 */
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { tiltGeometry, type Eye } from '../src/optics/geometry.js';
import { solve, type SolveInput } from '../src/optics/index.js';
import { dioptricDistance, matrixFromSpheroCyl } from '../src/optics/matrix.js';
import { forwardTilt, ocrCoefficients } from '../src/optics/ocr.js';
import { D, deg, mm, pd } from '../src/optics/units.js';
import { tracedPower } from './support/raytrace.js';

/** Säteenjuoksun numeerinen tarkkuus on ~1e-4 D; raja jättää väljyyttä. */
const TRACE_TOLERANCE = 0.002;

const eyeArb = fc.constantFrom<Eye>('OD', 'OS');
const sphereArb = fc.double({ min: -10, max: 10, noNaN: true, noDefaultInfinity: true });
const cylinderArb = fc.double({ min: 0, max: 4, noNaN: true, noDefaultInfinity: true });
const axisArb = fc.double({ min: 0.001, max: 180, noNaN: true, noDefaultInfinity: true });
const pantoArb = fc.double({ min: 0, max: 25, noNaN: true, noDefaultInfinity: true });
const wrapArb = fc.double({ min: 0, max: 30, noNaN: true, noDefaultInfinity: true });
const indexArb = fc.constantFrom(1.5, 1.53, 1.586, 1.6, 1.67, 1.74);

function input(eye: Eye, sphere: number, cylinder: number, axis: number, panto: number, wrap: number, index: number): SolveInput {
  const rx = { sphere: D(sphere), cylinder: D(cylinder), axis: deg(axis) };
  const other = { sphere: D(-1), cylinder: D(0), axis: deg(180) };
  return {
    eyes: {
      OD: { rx: eye === 'OD' ? rx : other, monoPd: mm(32) },
      OS: { rx: eye === 'OS' ? rx : other, monoPd: mm(32) },
    },
    frame: { pantoscopicTiltDeg: deg(panto), wrapDeg: deg(wrap), wrapMode: 'perLens', anglesMeasured: true },
    material: { index, abbe: 40 },
    vertexRefraction: mm(12),
    vertexWorn: mm(12),
    cra: mm(13.5),
    lensType: 'singleVision',
    labProfile: { compensatesInternally: false, axisStep: deg(1), prismStep: pd(0.25), cylForm: 'minus' },
    flags: { baseCurveModel: false, ocrMethod: 'exact', prismModel: 'wedgeSnell' },
  };
}

describe('säteenjuoksu riippumattomana tarkistuksena', () => {
  it('eteenpäin-malli vastaa säteenjuoksua kaikilla kallistuksilla', () => {
    fc.assert(
      fc.property(
        eyeArb, sphereArb, cylinderArb, axisArb, pantoArb, wrapArb, indexArb,
        (eye, sphere, cylinder, axis, panto, wrap, index) => {
          const geometry = tiltGeometry(eye, { wrapPerLensDeg: wrap, pantoDeg: panto });
          const lens = matrixFromSpheroCyl({ sphere, cylinder, axis });
          const coefficients = ocrCoefficients(geometry.tauDeg, index, 'exact');
          const model = forwardTilt(lens, coefficients, geometry.muDeg, geometry.muLensDeg);
          const traced = tracedPower(lens, geometry, index);
          expect(dioptricDistance(model, traced)).toBeLessThan(TRACE_TOLERANCE);
        },
      ),
      { numRuns: 300 },
    );
  });

  it('tarkka tilaus tuottaa säteenjuoksussa reseptin silmällä', () => {
    fc.assert(
      fc.property(
        eyeArb, sphereArb, cylinderArb, axisArb, pantoArb, wrapArb, indexArb,
        (eye, sphere, cylinder, axis, panto, wrap, index) => {
          const outcome = solve(input(eye, sphere, cylinder, axis, panto, wrap, index));
          expect(outcome.ok).toBe(true);
          if (!outcome.ok) return;
          const result = eye === 'OD' ? outcome.od : outcome.os;
          const geometry = tiltGeometry(eye, { wrapPerLensDeg: wrap, pantoDeg: panto });
          const ordered = matrixFromSpheroCyl({
            sphere: result.exact.sphere as number,
            cylinder: result.exact.cylinder as number,
            axis: result.exact.axis as number,
          });
          const atEye = tracedPower(ordered, geometry, index);
          const target = matrixFromSpheroCyl({ sphere, cylinder, axis });
          expect(dioptricDistance(atEye, target)).toBeLessThan(TRACE_TOLERANCE);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('referenssitapaus 1: tilaus toteutuu silmällä', () => {
    const outcome = solve({
      ...input('OD', -1, 0.5, 175, 18, 15, 1.586),
      eyes: {
        OD: { rx: { sphere: D(-1), cylinder: D(0.5), axis: deg(175) }, monoPd: mm(32) },
        OS: { rx: { sphere: D(-1.75), cylinder: D(2), axis: deg(170) }, monoPd: mm(32) },
      },
    });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    for (const [eye, result, rx] of [
      ['OD', outcome.od, { sphere: -1, cylinder: 0.5, axis: 175 }],
      ['OS', outcome.os, { sphere: -1.75, cylinder: 2, axis: 170 }],
    ] as const) {
      const geometry = tiltGeometry(eye, { wrapPerLensDeg: 15, pantoDeg: 18 });
      const ordered = matrixFromSpheroCyl({
        sphere: result.exact.sphere as number,
        cylinder: result.exact.cylinder as number,
        axis: result.exact.axis as number,
      });
      expect(dioptricDistance(tracedPower(ordered, geometry, 1.586), matrixFromSpheroCyl(rx))).toBeLessThan(
        TRACE_TOLERANCE,
      );
    }
  });

  it('testillä on erottelukykyä: vanha malli (μ_L = μ) jää kiinni', () => {
    // −4,00 +3,00 × 180, 18°/15°: vanha malli poikkesi säteenjuoksusta 0,04 D ja 2,4°.
    const geometry = tiltGeometry('OD', { wrapPerLensDeg: 15, pantoDeg: 18 });
    const lens = matrixFromSpheroCyl({ sphere: -4, cylinder: 3, axis: 180 });
    const coefficients = ocrCoefficients(geometry.tauDeg, 1.5, 'exact');
    const traced = tracedPower(lens, geometry, 1.5);
    const oldModel = forwardTilt(lens, coefficients, geometry.muDeg, geometry.muDeg);
    expect(dioptricDistance(oldModel, traced)).toBeGreaterThan(0.05);
  });
});
