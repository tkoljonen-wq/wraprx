/**
 * Sisäiset referenssitapaukset (suunnitelma §5.3, §9.3).
 *
 * Odotusarvot tulevat tiedostosta test/cases/internal.json ja niiden johto on
 * kirjattu tiedostoon test/cases/derivations.md. Johto on tehty käsin, riippumatta
 * tästä koodista. Hyväksymisraja on ±0,005 D (§9.3).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { solve, type EyeResult, type SolveInput } from '../src/optics/index.js';
import { traceScalar } from '../src/optics/trace.js';
import { D, deg, mm, pd, type Degree, type Dioptre, type Millimetre } from '../src/optics/units.js';

interface CasePower {
  sphere: number;
  cylinder: number;
  axis: number;
}

interface CaseEyeExpectation {
  exact?: CasePower;
  rounded025?: CasePower;
  naiveRounded025?: CasePower;
  asWornExact?: CasePower;
  tau?: number;
  mu?: number;
  compensationWorthwhile?: boolean;
}

interface CaseDefinition {
  id: string;
  derivation: string;
  description: string;
  input: {
    od: CasePower & { monoPd: number };
    os: CasePower & { monoPd: number };
    frame: {
      panto: number;
      wrap: number;
      wrapMode: 'total' | 'perLens';
      anglesMeasured: boolean;
      boxA?: number;
      boxB?: number;
      dbl?: number;
      fittingHeight?: number;
    };
    material: { index: number; abbe: number };
    vertexRefraction: number;
    vertexWorn: number;
    cra?: number;
    ocrMethod: 'exact' | 'martin';
    axisStep?: number;
  };
  expected: { od?: CaseEyeExpectation; os?: CaseEyeExpectation };
}

interface CaseFile {
  defaultTolerance: { power: number; axis: number; mm: number };
  cases: CaseDefinition[];
}

const caseFile: CaseFile = JSON.parse(
  readFileSync(join(import.meta.dirname, 'cases', 'internal.json'), 'utf8'),
) as CaseFile;

function buildInput(definition: CaseDefinition): SolveInput {
  const { input } = definition;
  const eye = (source: CasePower & { monoPd: number }) => ({
    rx: {
      sphere: D(source.sphere),
      cylinder: D(source.cylinder),
      axis: deg(source.axis),
    },
    monoPd: mm(source.monoPd),
  });

  const frame: SolveInput['frame'] = {
    pantoscopicTiltDeg: deg(input.frame.panto),
    wrapDeg: deg(input.frame.wrap),
    wrapMode: input.frame.wrapMode,
    anglesMeasured: input.frame.anglesMeasured,
    ...(input.frame.boxA !== undefined ? { boxA: mm(input.frame.boxA) as Millimetre } : {}),
    ...(input.frame.boxB !== undefined ? { boxB: mm(input.frame.boxB) as Millimetre } : {}),
    ...(input.frame.dbl !== undefined ? { dbl: mm(input.frame.dbl) as Millimetre } : {}),
    ...(input.frame.fittingHeight !== undefined
      ? { fittingHeight: mm(input.frame.fittingHeight) as Millimetre }
      : {}),
  };

  return {
    eyes: { OD: eye(input.od), OS: eye(input.os) },
    frame,
    material: { index: input.material.index, abbe: input.material.abbe },
    vertexRefraction: mm(input.vertexRefraction),
    vertexWorn: mm(input.vertexWorn),
    cra: mm(input.cra ?? 13.5),
    lensType: 'singleVision',
    labProfile: {
      compensatesInternally: false,
      axisStep: deg(input.axisStep ?? 1) as Degree,
      prismStep: pd(0.25),
      cylForm: 'minus',
    },
    flags: { baseCurveModel: false, ocrMethod: input.ocrMethod, prismModel: 'wedgeSnell' },
  };
}

function expectPower(
  actual: { sphere: Dioptre; cylinder: Dioptre; axis: Degree },
  expected: CasePower,
  tolerance: { power: number; axis: number },
  label: string,
): void {
  expect(
    Math.abs((actual.sphere as number) - expected.sphere),
    `${label}: sfääri ${actual.sphere} vs odotus ${expected.sphere}`,
  ).toBeLessThanOrEqual(tolerance.power);
  expect(
    Math.abs((actual.cylinder as number) - expected.cylinder),
    `${label}: sylinteri ${actual.cylinder} vs odotus ${expected.cylinder}`,
  ).toBeLessThanOrEqual(tolerance.power);
  // Akselia verrataan vain, jos sylinteriä on: nollasylinterillä akseli on merkityksetön.
  if (expected.cylinder > 0.01) {
    const difference = Math.abs((actual.axis as number) - expected.axis);
    const circular = Math.min(difference, 180 - difference);
    expect(circular, `${label}: akseli ${actual.axis} vs odotus ${expected.axis}`).toBeLessThanOrEqual(
      tolerance.axis,
    );
  }
}

describe('sisäiset referenssitapaukset', () => {
  for (const definition of caseFile.cases) {
    describe(`${definition.id} — ${definition.description}`, () => {
      const outcome = solve(buildInput(definition));

      it('laskenta onnistuu', () => {
        expect(outcome.ok, `johto: ${definition.derivation}`).toBe(true);
      });

      for (const eyeKey of ['od', 'os'] as const) {
        const expectation = definition.expected[eyeKey];
        if (!expectation) continue;

        it(`${eyeKey.toUpperCase()} vastaa käsin johdettuja arvoja`, () => {
          expect(outcome.ok).toBe(true);
          if (!outcome.ok) return;
          const result: EyeResult = outcome[eyeKey];
          const tolerance = caseFile.defaultTolerance;

          if (expectation.exact) {
            expectPower(result.exact, expectation.exact, tolerance, 'tarkka');
          }
          if (expectation.rounded025) {
            expectPower(result.rounded025, expectation.rounded025, tolerance, '0,25 D');
          }
          if (expectation.naiveRounded025) {
            expectPower(result.naiveRounded025, expectation.naiveRounded025, tolerance, 'naiivi');
          }
          if (expectation.asWornExact) {
            expectPower(result.asWorn.exact, expectation.asWornExact, tolerance, 'toteutuva');
          }
          // Kulmien odotusarvot ovat käsin laskettuja; 0,05°:n raja on käsinlaskennan
          // tarkkuutta vastaava, ei koodin tarkkuutta.
          if (expectation.tau !== undefined) {
            expect(traceScalar(result.trace, 'tau')).toBeCloseTo(expectation.tau, 1);
          }
          if (expectation.mu !== undefined) {
            expect(traceScalar(result.trace, 'mu')).toBeCloseTo(expectation.mu, 1);
          }
          if (expectation.compensationWorthwhile !== undefined) {
            expect(result.compensationWorthwhile).toBe(expectation.compensationWorthwhile);
          }
        });
      }
    });
  }
});
