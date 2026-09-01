/**
 * Toleranssiarvion käyttäytyminen tyhjällä, osittaisella ja täydellä datalla
 * (suunnitelma §9.1 kohta 1, §9.3).
 *
 * HUOM: tämän tiedoston toleranssiluvut ovat KEKSITTYJÄ TESTIARVOJA, eivät ISO-lukuja.
 * Ne on valittu pyöreiksi ja epärealistisiksi juuri siksi, ettei niitä voi vahingossa
 * kopioida `data/tolerances.json`:iin oikeina arvoina. Testin kohde on logiikka:
 * vyöhykkeen valinta, verdiktien yhdistäminen ja puuttuvan datan käsittely.
 */
import { describe, expect, it } from 'vitest';

import { assessPower, hasStandard, type ToleranceTable } from '../src/optics/tolerance.js';
import { solve, type SolveInput } from '../src/optics/index.js';
import { D, deg, mm, pd } from '../src/optics/units.js';

/** TESTIDATAA — ei ISO 8980-1. Sfääri ±1 D, sylinteri ±1 D, akseli ±10°. */
const FAKE_ORDERED: ToleranceTable = {
  standards: [
    {
      standard: 'iso8980-1',
      source: 'KEKSITTY TESTIARVO, ei standardia',
      sphere: [{ upTo: null, tolerance: 1 }],
      cylinder: [{ upTo: null, tolerance: 1 }],
      axis: [{ upTo: null, tolerance: 10 }],
    },
  ],
  borderlineFraction: 0.9,
};

/** TESTIDATAA — ei ISO 21987. Tiukemmat rajat vyöhykkeittäin. */
const FAKE_BOTH: ToleranceTable = {
  standards: [
    ...(FAKE_ORDERED.standards ?? []),
    {
      standard: 'iso21987',
      source: 'KEKSITTY TESTIARVO, ei standardia',
      sphere: [
        { upTo: 5, tolerance: 0.1 },
        { upTo: null, tolerance: 0.2 },
      ],
      cylinder: [{ upTo: null, tolerance: 0.1 }],
      axis: [{ upTo: null, tolerance: 5 }],
    },
  ],
  borderlineFraction: 0.9,
};

const target = { sphere: -2, cylinder: 1, axis: 90 };

describe('toleranssiarvio', () => {
  it('tyhjä data -> notAssessed ja syy', () => {
    const assessment = assessPower(undefined, 'iso8980-1', target, target);
    expect(assessment.verdict).toBe('notAssessed');
    expect(assessment.reason).toContain('ei syötetty');
    expect(hasStandard(undefined, 'iso8980-1')).toBe(false);
  });

  it('tyhjä standardilista -> notAssessed', () => {
    expect(assessPower({ standards: [] }, 'iso21987', target, target).verdict).toBe('notAssessed');
  });

  it('osittainen data -> arvioidaan se standardi joka on, toinen jää notAssessed', () => {
    expect(assessPower(FAKE_ORDERED, 'iso8980-1', target, target).verdict).toBe('within');
    expect(assessPower(FAKE_ORDERED, 'iso21987', target, target).verdict).toBe('notAssessed');
  });

  it('puuttuva komponenttitaulukko ei peitä varmaa ulkona-verdiktiä', () => {
    const onlySphere: ToleranceTable = {
      standards: [
        {
          standard: 'iso8980-1',
          source: 'KEKSITTY TESTIARVO',
          sphere: [{ upTo: null, tolerance: 0.1 }],
        },
      ],
    };
    // Sylinterille ei ole taulukkoa -> notAssessed, mutta sfääri on selvästi ulkona.
    const assessment = assessPower(onlySphere, 'iso8980-1', target, {
      sphere: -3,
      cylinder: 1,
      axis: 90,
    });
    expect(assessment.verdict).toBe('outside');
  });

  it('puuttuva komponenttitaulukko estää within-verdiktin', () => {
    const onlySphere: ToleranceTable = {
      standards: [
        {
          standard: 'iso8980-1',
          source: 'KEKSITTY TESTIARVO',
          sphere: [{ upTo: null, tolerance: 1 }],
        },
      ],
    };
    expect(assessPower(onlySphere, 'iso8980-1', target, target).verdict).toBe('notAssessed');
  });

  it('vyöhyke valitaan vahvimman meridiaanin mukaan', () => {
    // Tavoite -2 / +1 -> meridiaanit -2 ja -1 -> vahvin |2| -> vyöhyke upTo 5 -> 0,1 D.
    const near = assessPower(FAKE_BOTH, 'iso21987', target, {
      sphere: -2.09,
      cylinder: 1,
      axis: 90,
    });
    expect(near.verdict).toBe('borderline');
    const over = assessPower(FAKE_BOTH, 'iso21987', target, {
      sphere: -2.15,
      cylinder: 1,
      axis: 90,
    });
    expect(over.verdict).toBe('outside');

    // Vahva tavoite -> toinen vyöhyke -> 0,2 D, sama poikkeama on sisällä.
    const strong = { sphere: -8, cylinder: 1, axis: 90 };
    const strongAssessment = assessPower(FAKE_BOTH, 'iso21987', strong, {
      sphere: -8.15,
      cylinder: 1,
      axis: 90,
    });
    expect(strongAssessment.verdict).toBe('within');
  });

  it('akselia ei arvioida ilman sylinteriä', () => {
    const sphereOnly = { sphere: -2, cylinder: 0, axis: 180 };
    const assessment = assessPower(FAKE_BOTH, 'iso21987', sphereOnly, {
      sphere: -2,
      cylinder: 0,
      axis: 45,
    });
    expect(assessment.components.some((c) => c.component === 'axis')).toBe(false);
    expect(assessment.verdict).toBe('within');
  });
});

describe('solve toleranssidatan kanssa', () => {
  const input = (toleranceData?: ToleranceTable): SolveInput => ({
    eyes: {
      OD: { rx: { sphere: D(-3), cylinder: D(1), axis: deg(180) }, monoPd: mm(32) },
      OS: { rx: { sphere: D(-3), cylinder: D(1), axis: deg(180) }, monoPd: mm(32) },
    },
    frame: {
      pantoscopicTiltDeg: deg(12),
      wrapDeg: deg(20),
      wrapMode: 'total',
      anglesMeasured: true,
    },
    material: { index: 1.586, abbe: 30 },
    vertexRefraction: mm(13),
    vertexWorn: mm(11),
    cra: mm(13.5),
    lensType: 'singleVision',
    labProfile: {
      compensatesInternally: false,
      axisStep: deg(1),
      prismStep: pd(0.25),
      cylForm: 'minus',
    },
    flags: { baseCurveModel: false, ocrMethod: 'exact', prismModel: 'wedgeSnell' },
    ...(toleranceData ? { toleranceData } : {}),
  });

  it('osittainen data: tilattava arvioidaan, käytössä toteutuva ei', () => {
    const outcome = solve(input(FAKE_ORDERED));
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.od.tolerance.ordered.rounded).not.toBe('notAssessed');
    expect(outcome.od.tolerance.asWorn.rounded).toBe('notAssessed');
    expect(outcome.global.some((w) => w.code === 'toleranceDataMissing')).toBe(true);
  });

  it('täysi data: kumpikin standardi antaa verdiktin eikä varoitusta tule', () => {
    const outcome = solve(input(FAKE_BOTH));
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    for (const verdict of [
      outcome.od.tolerance.ordered.exact,
      outcome.od.tolerance.ordered.rounded,
      outcome.od.tolerance.asWorn.exact,
      outcome.od.tolerance.asWorn.rounded,
    ]) {
      expect(verdict).not.toBe('notAssessed');
    }
    expect(outcome.global.some((w) => w.code === 'toleranceDataMissing')).toBe(false);
  });

  it('tarkka tilattava on aina tavoitteessaan: ordered.exact on within', () => {
    const outcome = solve(input(FAKE_BOTH));
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.od.tolerance.ordered.exact).toBe('within');
  });
});
