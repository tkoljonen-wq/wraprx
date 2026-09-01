/**
 * Snapshot-testit laskentajäljelle (suunnitelma §5.6).
 *
 * Jos jokin välivaihe muuttuu vahingossa, tämä huomaa sen vaikka lopputulos
 * pyöristyisi samaksi. Snapshotin päivittäminen on tarkoituksellinen teko:
 * `npm test -- -u` ja diff luetaan.
 */
import { describe, expect, it } from 'vitest';

import { solve, type SolveInput } from '../src/optics/index.js';
import { traceScalar, traceStep } from '../src/optics/trace.js';
import { D, deg, mm, pd } from '../src/optics/units.js';

const input: SolveInput = {
  eyes: {
    OD: { rx: { sphere: D(-1), cylinder: D(0.5), axis: deg(175) }, monoPd: mm(31.5) },
    OS: { rx: { sphere: D(-1.75), cylinder: D(2), axis: deg(170) }, monoPd: mm(32.5) },
  },
  frame: {
    pantoscopicTiltDeg: deg(18),
    wrapDeg: deg(30),
    wrapMode: 'total',
    anglesMeasured: true,
    boxA: mm(54),
    boxB: mm(36),
    dbl: mm(17),
    fittingHeight: mm(22),
  },
  material: { index: 1.586, abbe: 30, name: 'Polykarbonaatti' },
  vertexRefraction: mm(13.5),
  vertexWorn: mm(11),
  cra: mm(13.5),
  lensType: 'singleVision',
  labProfile: {
    compensatesInternally: false,
    axisStep: deg(1),
    prismStep: pd(0.25),
    cylForm: 'minus',
  },
  flags: { baseCurveModel: false, ocrMethod: 'exact' },
};

describe('laskentajälki', () => {
  const outcome = solve(input);

  it('laskenta onnistuu', () => {
    expect(outcome.ok).toBe(true);
  });

  it('OD:n jälki vastaa snapshotia', () => {
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.od.trace).toMatchSnapshot();
  });

  it('OS:n jälki vastaa snapshotia', () => {
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.os.trace).toMatchSnapshot();
  });

  it('jälki sisältää kaikki nimetyt välivaiheet', () => {
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    const required = [
      'rx',
      'target',
      'tau',
      'mu',
      'normal',
      'kSag',
      'kTan',
      'kCross',
      'orderedExact',
      'orderedRounded',
      'orderedNaive',
      'asWornExact',
      'asWornRounded',
      'asWornUncompensated',
      'residualExact',
      'residualRounded',
      'residualUncompensated',
      'decentrationHorizontal',
      'decentrationBoxing',
      'ocHeight',
      'ocHeightBoxing',
      'ocHeightVogel',
      'inducedPrismMagnitude',
    ];
    for (const name of required) {
      expect(traceStep(outcome.od.trace, name), `puuttuva vaihe: ${name}`).toBeDefined();
    }
  });

  it('base curve -kenttää ei kirjata jälkeen, kun lippu on pois', () => {
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(traceStep(outcome.od.trace, 'baseCurveExtraBeta')).toBeUndefined();
    expect(Number.isNaN(traceScalar(outcome.od.trace, 'baseCurveExtraPanto'))).toBe(true);
  });
});
