/**
 * Ominaisuustestit (suunnitelma §5.2). Satunnaisgeneroidut syötteet, fast-check.
 *
 * Nämä ovat väitteitä, joiden on pädettävä koko syöteavaruudessa. Yksittäinen
 * referenssitapaus kertoo, että yksi luku on oikein; nämä kertovat, että malli on
 * itsensä kanssa sopusoinnussa kaikkialla.
 */
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import {
  dioptricDistance,
  frobeniusNorm,
  matrixFromSpheroCyl,
  rotateToBasis,
  spheroCylFromMatrix,
  subtractMatrix,
} from '../src/optics/matrix.js';
import { decentration, tiltGeometry, wrapPerLens } from '../src/optics/geometry.js';
import { forwardTilt, inverseTilt, ocrCoefficients } from '../src/optics/ocr.js';
import { bestGridRound, naiveRound } from '../src/optics/rounding.js';
import { baseToComponents, componentsToBase } from '../src/optics/format.js';
import { axisDifference } from '../src/optics/units.js';
import { solve, type SolveInput } from '../src/optics/index.js';
import { D, deg, mm, pd } from '../src/optics/units.js';

const RUNS = 500;

const sphereArb = fc.double({ min: -20, max: 20, noNaN: true, noDefaultInfinity: true });
const cylinderArb = fc.double({ min: 0, max: 8, noNaN: true, noDefaultInfinity: true });
const axisArb = fc.double({ min: 0.001, max: 180, noNaN: true, noDefaultInfinity: true });
const tauArb = fc.double({ min: 0, max: 45, noNaN: true, noDefaultInfinity: true });
const indexArb = fc.double({ min: 1.42, max: 1.9, noNaN: true, noDefaultInfinity: true });
const muArb = fc.double({ min: 0.001, max: 180, noNaN: true, noDefaultInfinity: true });
const wrapArb = fc.double({ min: 0, max: 30, noNaN: true, noDefaultInfinity: true });
const pantoArb = fc.double({ min: -10, max: 30, noNaN: true, noDefaultInfinity: true });

function baseInput(overrides: {
  sphere?: number;
  cylinder?: number;
  axis?: number;
  wrap?: number;
  panto?: number;
  baseCurve?: number;
  baseCurveModel?: boolean;
  monoPd?: number;
  box?: boolean;
}): SolveInput {
  const rx = {
    sphere: D(overrides.sphere ?? -2),
    cylinder: D(overrides.cylinder ?? 1),
    axis: deg(overrides.axis ?? 170),
  };
  const eye = {
    rx,
    monoPd: mm(overrides.monoPd ?? 32),
    ...(overrides.baseCurve !== undefined ? { baseCurve: D(overrides.baseCurve) } : {}),
  };
  return {
    eyes: { OD: eye, OS: eye },
    frame: {
      pantoscopicTiltDeg: deg(overrides.panto ?? 10),
      wrapDeg: deg(overrides.wrap ?? 12),
      wrapMode: 'perLens',
      anglesMeasured: true,
      ...(overrides.box === false
        ? {}
        : {
            boxA: mm(52),
            boxB: mm(34),
            dbl: mm(18),
            fittingHeight: mm(20),
          }),
    },
    material: { index: 1.586, abbe: 30 },
    vertexRefraction: mm(12),
    vertexWorn: mm(12),
    cra: mm(13.5),
    lensType: 'singleVision',
    labProfile: {
      compensatesInternally: false,
      axisStep: deg(1),
      prismStep: pd(0.25),
      cylForm: 'minus',
    },
    flags: { baseCurveModel: overrides.baseCurveModel ?? false, ocrMethod: 'exact' },
  };
}

describe('matriisimuunnokset', () => {
  it('matriisi -> resepti -> matriisi on häviötön kaikilla akseleilla', () => {
    fc.assert(
      fc.property(sphereArb, cylinderArb, axisArb, (sphere, cylinder, axis) => {
        const matrix = matrixFromSpheroCyl({ sphere, cylinder, axis });
        const roundTrip = matrixFromSpheroCyl(spheroCylFromMatrix(matrix));
        expect(dioptricDistance(matrix, roundTrip)).toBeLessThan(1e-9);
      }),
      { numRuns: RUNS },
    );
  });

  it('erikoisakselit 0, 90 ja 180 kestävät kierron', () => {
    for (const axis of [0.0001, 45, 90, 135, 180]) {
      const matrix = matrixFromSpheroCyl({ sphere: -3, cylinder: 2, axis });
      const back = spheroCylFromMatrix(matrix);
      expect(dioptricDistance(matrix, matrixFromSpheroCyl(back))).toBeLessThan(1e-12);
    }
  });

  it('kierto (t,s)-kantaan ja takaisin säilyttää normin', () => {
    fc.assert(
      fc.property(sphereArb, cylinderArb, axisArb, muArb, (sphere, cylinder, axis, mu) => {
        const matrix = matrixFromSpheroCyl({ sphere, cylinder, axis });
        const rotated = rotateToBasis(matrix, mu);
        const norm = Math.sqrt(rotated.tt ** 2 + rotated.ss ** 2 + 2 * rotated.ts ** 2);
        expect(Math.abs(norm - frobeniusNorm(matrix))).toBeLessThan(1e-9);
      }),
      { numRuns: RUNS },
    );
  });
});

describe('OCR-käännös', () => {
  it('forward(inverse(Rx)) = Rx alle 1e-6 D:n tarkkuudella', () => {
    fc.assert(
      fc.property(
        sphereArb,
        cylinderArb,
        axisArb,
        tauArb,
        indexArb,
        muArb,
        (sphere, cylinder, axis, tau, index, mu) => {
          const target = matrixFromSpheroCyl({ sphere, cylinder, axis });
          const coefficients = ocrCoefficients(tau, index, 'exact');
          const ordered = inverseTilt(target, coefficients, mu);
          expect(dioptricDistance(forwardTilt(ordered, coefficients, mu), target)).toBeLessThan(1e-6);
        },
      ),
      { numRuns: RUNS },
    );
  });

  it('τ = 0 -> kompensointi on identiteetti', () => {
    fc.assert(
      fc.property(sphereArb, cylinderArb, axisArb, indexArb, muArb, (sphere, cylinder, axis, index, mu) => {
        const target = matrixFromSpheroCyl({ sphere, cylinder, axis });
        const coefficients = ocrCoefficients(0, index, 'exact');
        expect(dioptricDistance(inverseTilt(target, coefficients, mu), target)).toBeLessThan(1e-12);
      }),
      { numRuns: RUNS },
    );
  });

  it('sylinteri = 0 -> tilattava on sfääri + kallistuksen sylinteri akselilla μ', () => {
    fc.assert(
      fc.property(sphereArb, tauArb, indexArb, muArb, (sphere, tau, index, mu) => {
        const target = matrixFromSpheroCyl({ sphere, cylinder: 0, axis: 180 });
        const coefficients = ocrCoefficients(tau, index, 'exact');
        const ordered = inverseTilt(target, coefficients, mu);
        // Päämeridiaanit ovat täsmälleen (t, s): ristitermi μ:n kannassa on nolla.
        expect(Math.abs(rotateToBasis(ordered, mu).ts)).toBeLessThan(1e-9);
        if (Math.abs(sphere) > 0.05 && tau > 1) {
          const power = spheroCylFromMatrix(ordered);
          // Sylinterin akseli on μ (tangentiaalimeridiaanilla enemmän voimakkuutta
          // miinusvoimakkuuksilla) tai μ + 90 — kumpi tahansa, ristitermi on nolla.
          const alignment = Math.min(
            axisDifference(power.axis, mu),
            axisDifference(power.axis, mu + 90),
          );
          expect(alignment).toBeLessThan(1e-6);
        }
      }),
      { numRuns: RUNS },
    );
  });

  it('kompensoinnin suuruus kasvaa monotonisesti τ:n mukana', () => {
    fc.assert(
      fc.property(sphereArb, cylinderArb, axisArb, indexArb, muArb, (sphere, cylinder, axis, index, mu) => {
        const target = matrixFromSpheroCyl({ sphere, cylinder, axis });
        if (frobeniusNorm(target) < 0.1) return;
        let previous = -1;
        for (const tau of [0, 5, 10, 15, 20, 25, 30, 35, 40]) {
          const ordered = inverseTilt(target, ocrCoefficients(tau, index, 'exact'), mu);
          const magnitude = frobeniusNorm(subtractMatrix(ordered, target));
          expect(magnitude).toBeGreaterThanOrEqual(previous - 1e-12);
          previous = magnitude;
        }
      }),
      { numRuns: 200 },
    );
  });
});

describe('peilisymmetria', () => {
  it('OD ja OS tuottavat peilikuvatulokset, kun resepti peilataan', () => {
    fc.assert(
      fc.property(sphereArb, cylinderArb, axisArb, wrapArb, pantoArb, (sphere, cylinder, axis, wrap, panto) => {
        const mirroredAxis = axis >= 180 ? 180 : 180 - axis;
        const input: SolveInput = {
          ...baseInput({ wrap, panto }),
          eyes: {
            OD: { rx: { sphere: D(sphere), cylinder: D(cylinder), axis: deg(axis) }, monoPd: mm(32) },
            OS: {
              rx: { sphere: D(sphere), cylinder: D(cylinder), axis: deg(mirroredAxis) },
              monoPd: mm(32),
            },
          },
        };
        const outcome = solve(input);
        expect(outcome.ok).toBe(true);
        if (!outcome.ok) return;
        expect(Math.abs((outcome.od.exact.sphere as number) - (outcome.os.exact.sphere as number))).toBeLessThan(1e-9);
        expect(Math.abs((outcome.od.exact.cylinder as number) - (outcome.os.exact.cylinder as number))).toBeLessThan(1e-9);
        if ((outcome.od.exact.cylinder as number) > 1e-6) {
          const odAxis = outcome.od.exact.axis as number;
          const osAxis = outcome.os.exact.axis as number;
          expect(axisDifference(odAxis, 180 - osAxis)).toBeLessThan(1e-6);
        }
      }),
      { numRuns: 200 },
    );
  });
});

describe('pyöristys', () => {
  it('ruudukkohaku on aina yhtä hyvä tai parempi kuin naiivi', () => {
    fc.assert(
      fc.property(sphereArb, cylinderArb, axisArb, (sphere, cylinder, axis) => {
        const exact = { sphere, cylinder, axis };
        const target = matrixFromSpheroCyl(exact);
        const options = { step: 0.25, axisStep: 1 };
        const result = bestGridRound(target, exact, options);
        const naive = naiveRound(exact, options);
        expect(result.distance).toBeLessThanOrEqual(result.naiveDistance + 1e-12);
        expect(dioptricDistance(matrixFromSpheroCyl(naive), target)).toBeGreaterThanOrEqual(
          result.distance - 1e-12,
        );
      }),
      { numRuns: RUNS },
    );
  });

  it('pyöristetty tulos on ruudukossa', () => {
    fc.assert(
      fc.property(sphereArb, cylinderArb, axisArb, (sphere, cylinder, axis) => {
        const exact = { sphere, cylinder, axis };
        const result = bestGridRound(matrixFromSpheroCyl(exact), exact, { step: 0.25, axisStep: 1 });
        expect(Math.abs(result.power.sphere * 4 - Math.round(result.power.sphere * 4))).toBeLessThan(1e-9);
        expect(Math.abs(result.power.cylinder * 4 - Math.round(result.power.cylinder * 4))).toBeLessThan(1e-9);
        expect(Math.abs(result.power.axis - Math.round(result.power.axis))).toBeLessThan(1e-9);
        expect(result.power.cylinder).toBeGreaterThanOrEqual(0);
      }),
      { numRuns: RUNS },
    );
  });
});

describe('kantasuunnan notaatio', () => {
  it('360° -> in/out/up/down -> 360° on häviötön molemmille silmille', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.01, max: 10, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: 0, max: 359.99, noNaN: true, noDefaultInfinity: true }),
        fc.constantFrom('OD' as const, 'OS' as const),
        (magnitude, base, eye) => {
          const spec = { magnitude, base };
          const roundTrip = componentsToBase(eye, baseToComponents(eye, spec));
          expect(Math.abs(roundTrip.magnitude - magnitude)).toBeLessThan(1e-9);
          const difference = Math.abs(roundTrip.base - base);
          expect(Math.min(difference, 360 - difference)).toBeLessThan(1e-6);
        },
      ),
      { numRuns: RUNS },
    );
  });

  it('tunnetut suunnat: OD 0° = sisään, OD 180° = ulos, 90° = ylös', () => {
    expect(baseToComponents('OD', { magnitude: 2, base: 0 }).horizontal.direction).toBe('in');
    expect(baseToComponents('OD', { magnitude: 2, base: 180 }).horizontal.direction).toBe('out');
    expect(baseToComponents('OS', { magnitude: 2, base: 0 }).horizontal.direction).toBe('out');
    expect(baseToComponents('OS', { magnitude: 2, base: 180 }).horizontal.direction).toBe('in');
    expect(baseToComponents('OD', { magnitude: 2, base: 90 }).vertical.direction).toBe('up');
    expect(baseToComponents('OS', { magnitude: 2, base: 270 }).vertical.direction).toBe('down');
  });
});

describe('base curve -lippu', () => {
  it('lippu pois -> tulos on identtinen riippumatta baseCurve-kentän arvosta', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.5, max: 12, noNaN: true, noDefaultInfinity: true }),
        sphereArb,
        cylinderArb,
        (baseCurve, sphere, cylinder) => {
          const without = solve(baseInput({ sphere, cylinder, baseCurveModel: false }));
          const with_ = solve(baseInput({ sphere, cylinder, baseCurve, baseCurveModel: false }));
          expect(without.ok && with_.ok).toBe(true);
          if (!without.ok || !with_.ok) return;
          expect(JSON.stringify(with_.od)).toBe(JSON.stringify(without.od));
          expect(JSON.stringify(with_.os)).toBe(JSON.stringify(without.os));
        },
      ),
      { numRuns: 100 },
    );
  });

  it('lippu päällä -> tulos muuttuu, kun base curve annetaan', () => {
    const without = solve(baseInput({ baseCurveModel: true }));
    const with_ = solve(baseInput({ baseCurve: 8, baseCurveModel: true }));
    expect(without.ok && with_.ok).toBe(true);
    if (!without.ok || !with_.ok) return;
    expect(JSON.stringify(with_.od)).not.toBe(JSON.stringify(without.od));
  });
});

describe('desentraatio kierretyssä linssitasossa', () => {
  const box = { boxA: 52, boxB: 34, dbl: 18, fittingHeight: 20 };

  it('wrap = 0 ja panto = 0 -> yhtyy boxing-kaavaan koneellisella tarkkuudella', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 25, max: 36, noNaN: true, noDefaultInfinity: true }),
        (monoPd) => {
          for (const eye of ['OD', 'OS'] as const) {
            const geometry = tiltGeometry(eye, { wrapPerLensDeg: 0, pantoDeg: 0 });
            const result = decentration(geometry, box, monoPd, 12, 13.5);
            expect(Math.abs(result.horizontalMm - ((box.boxA + box.dbl) / 2 - monoPd))).toBeLessThan(1e-12);
            expect(Math.abs(result.ocHeightMm - box.fittingHeight)).toBeLessThan(1e-12);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('ero boxing-tasoon kasvaa monotonisesti wrapin mukana', () => {
    let previous = -1;
    for (const wrap of [0, 2, 5, 10, 15, 20, 25, 30]) {
      const geometry = tiltGeometry('OD', { wrapPerLensDeg: wrap, pantoDeg: 8 });
      const result = decentration(geometry, box, 32, 12, 13.5);
      const difference = Math.abs(result.horizontalMm - result.comparison.boxingHorizontalMm);
      expect(difference).toBeGreaterThanOrEqual(previous - 1e-12);
      previous = difference;
    }
  });

  it('kokonais-wrap on puolet per linssi', () => {
    expect(wrapPerLens(20, 'total')).toBe(10);
    expect(wrapPerLens(20, 'perLens')).toBe(20);
  });
});

describe('validointiportti', () => {
  it('moniteho tuottaa validointivirheen, ei tulosta', () => {
    const input = { ...baseInput({}), lensType: 'progressive' } as unknown as SolveInput;
    const outcome = solve(input);
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.issues.some((issue) => issue.code === 'notSingleVision')).toBe(true);
  });

  it('toleranssidata puuttuu -> verdikti on notAssessed, ei kaatumista', () => {
    const outcome = solve(baseInput({}));
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.od.tolerance.ordered.exact).toBe('notAssessed');
    expect(outcome.od.tolerance.asWorn.rounded).toBe('notAssessed');
    expect(outcome.global.some((w) => w.code === 'toleranceDataMissing')).toBe(true);
  });
});
